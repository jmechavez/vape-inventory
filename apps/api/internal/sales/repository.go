package sales

import (
	"context"
	"fmt"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type Repository struct {
	db *pgxpool.Pool
}

func NewRepository(db *pgxpool.Pool) *Repository {
	return &Repository{
		db: db,
	}
}

type preparedItem struct {
	productID int64
	quantity  int
	unitPrice float64
	subtotal  float64
	sku       string
	name      string
}

func (r *Repository) Create(
	ctx context.Context,
	request CreateSaleRequest,
) (Sale, error) {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return Sale{}, err
	}

	defer tx.Rollback(ctx)

	if len(request.Items) == 0 {
		return Sale{}, fmt.Errorf(
			"sale must contain at least one item",
		)
	}

	if request.Discount < 0 {
		return Sale{}, fmt.Errorf(
			"discount cannot be negative",
		)
	}

	if request.PaymentMethod == "" {
		return Sale{}, fmt.Errorf(
			"payment_method is required",
		)
	}

	var subtotal float64

	items := make([]preparedItem, 0, len(request.Items))

	for _, item := range request.Items {
		if item.ProductID <= 0 {
			return Sale{}, fmt.Errorf(
				"invalid product id",
			)
		}

		if item.Quantity <= 0 {
			return Sale{}, fmt.Errorf(
				"quantity must be greater than zero",
			)
		}

		var (
			sku          string
			name         string
			sellingPrice float64
			currentStock int
		)

		err := tx.QueryRow(
			ctx,
			`
			SELECT
				p.sku,
				p.name,
				p.selling_price,
				COALESCE(
					SUM(
						CASE
							WHEN sm.type IN ('RECEIVE', 'RETURN')
								THEN sm.quantity

							WHEN sm.type IN ('SALE', 'DAMAGE', 'LOSS')
								THEN sm.quantity

							WHEN sm.type = 'ADJUSTMENT'
								THEN sm.quantity

							ELSE 0
						END
					),
					0
				)::int AS current_stock
			FROM products p
			LEFT JOIN stock_movements sm
				ON sm.product_id = p.id
			WHERE
				p.id = $1
				AND p.active = true
			GROUP BY
				p.id,
				p.sku,
				p.name,
				p.selling_price
			`,
			item.ProductID,
		).Scan(
			&sku,
			&name,
			&sellingPrice,
			&currentStock,
		)
		if err != nil {
			if err == pgx.ErrNoRows {
				return Sale{}, fmt.Errorf(
					"product %d not found or inactive",
					item.ProductID,
				)
			}

			return Sale{}, fmt.Errorf(
				"failed to load product %d: %w",
				item.ProductID,
				err,
			)
		}

		if currentStock < item.Quantity {
			return Sale{}, fmt.Errorf(
				"insufficient stock for %s: available %d, requested %d",
				name,
				currentStock,
				item.Quantity,
			)
		}

		itemSubtotal := sellingPrice * float64(item.Quantity)

		subtotal += itemSubtotal

		items = append(
			items,
			preparedItem{
				productID: item.ProductID,
				quantity:  item.Quantity,
				unitPrice: sellingPrice,
				subtotal:  itemSubtotal,
				sku:       sku,
				name:      name,
			},
		)
	}

	if request.Discount > subtotal {
		return Sale{}, fmt.Errorf(
			"discount cannot be greater than subtotal",
		)
	}

	total := subtotal - request.Discount

	var sale Sale

	/*
		Insert the sale first.

		The ID comes from PostgreSQL's sequence.

		Reference is generated after receiving the ID:

		SALE-000001
		SALE-000002
		SALE-000003
	*/
	err = tx.QueryRow(
		ctx,
		`
		INSERT INTO sales (
			sale_date,
			subtotal,
			discount,
			total,
			payment_method,
			status
		)
		VALUES (
			COALESCE($1, now()),
			$2,
			$3,
			$4,
			$5,
			'COMPLETED'
		)
		RETURNING
			id,
			user_id,
			sale_date,
			subtotal,
			discount,
			total,
			payment_method,
			status,
			created_at
		`,
		request.SaleDate,
		subtotal,
		request.Discount,
		total,
		request.PaymentMethod,
	).Scan(
		&sale.ID,
		&sale.UserID,
		&sale.SaleDate,
		&sale.Subtotal,
		&sale.Discount,
		&sale.Total,
		&sale.PaymentMethod,
		&sale.Status,
		&sale.CreatedAt,
	)
	if err != nil {
		return Sale{}, err
	}

	reference := fmt.Sprintf(
		"SALE-%06d",
		sale.ID,
	)

	_, err = tx.Exec(
		ctx,
		`
		UPDATE sales
		SET reference = $1
		WHERE id = $2
		`,
		reference,
		sale.ID,
	)
	if err != nil {
		return Sale{}, err
	}

	sale.Reference = &reference

	sale.Items = make(
		[]SaleItem,
		0,
		len(items),
	)

	for _, item := range items {
		var saleItem SaleItem

		err := tx.QueryRow(
			ctx,
			`
			INSERT INTO sale_items (
				sale_id,
				product_id,
				quantity,
				unit_price,
				subtotal
			)
			VALUES (
				$1,
				$2,
				$3,
				$4,
				$5
			)
			RETURNING
				id,
				sale_id,
				product_id,
				quantity,
				unit_price,
				subtotal
			`,
			sale.ID,
			item.productID,
			item.quantity,
			item.unitPrice,
			item.subtotal,
		).Scan(
			&saleItem.ID,
			&saleItem.SaleID,
			&saleItem.ProductID,
			&saleItem.Quantity,
			&saleItem.UnitPrice,
			&saleItem.Subtotal,
		)
		if err != nil {
			return Sale{}, err
		}

		saleItem.SKU = item.sku
		saleItem.ProductName = item.name

		sale.Items = append(
			sale.Items,
			saleItem,
		)

		/*
			SALE movements use negative quantities.

			Example:

			Current stock = 20
			Sold         = 2

			SALE movement = -2

			Inventory becomes 18.
		*/
		_, err = tx.Exec(
			ctx,
			`
			INSERT INTO stock_movements (
				product_id,
				type,
				quantity,
				reference,
				notes,
				movement_date
			)
			VALUES (
				$1,
				'SALE',
				$2,
				$3,
				$4,
				$5
			)
			`,
			item.productID,
			-item.quantity,
			reference,
			fmt.Sprintf(
				"Sale %s - %s",
				reference,
				item.name,
			),
			sale.SaleDate,
		)
		if err != nil {
			return Sale{}, err
		}
	}

	if err := tx.Commit(ctx); err != nil {
		return Sale{}, err
	}

	return sale, nil
}

func (r *Repository) List(
	ctx context.Context,
) ([]Sale, error) {
	rows, err := r.db.Query(
		ctx,
		`
		SELECT
			id,
			user_id,
			reference,
			sale_date,
			subtotal,
			discount,
			total,
			payment_method,
			status,
			created_at
		FROM sales
		ORDER BY
			sale_date DESC,
			id DESC
		`,
	)
	if err != nil {
		return nil, err
	}

	defer rows.Close()

	salesList := []Sale{}

	for rows.Next() {
		var sale Sale

		err := rows.Scan(
			&sale.ID,
			&sale.UserID,
			&sale.Reference,
			&sale.SaleDate,
			&sale.Subtotal,
			&sale.Discount,
			&sale.Total,
			&sale.PaymentMethod,
			&sale.Status,
			&sale.CreatedAt,
		)
		if err != nil {
			return nil, err
		}

		sale.Items, err = r.listItems(
			ctx,
			sale.ID,
		)
		if err != nil {
			return nil, err
		}

		salesList = append(
			salesList,
			sale,
		)
	}

	if err := rows.Err(); err != nil {
		return nil, err
	}

	return salesList, nil
}

func (r *Repository) Get(
	ctx context.Context,
	id int64,
) (Sale, error) {
	var sale Sale

	err := r.db.QueryRow(
		ctx,
		`
		SELECT
			id,
			user_id,
			reference,
			sale_date,
			subtotal,
			discount,
			total,
			payment_method,
			status,
			created_at
		FROM sales
		WHERE id = $1
		`,
		id,
	).Scan(
		&sale.ID,
		&sale.UserID,
		&sale.Reference,
		&sale.SaleDate,
		&sale.Subtotal,
		&sale.Discount,
		&sale.Total,
		&sale.PaymentMethod,
		&sale.Status,
		&sale.CreatedAt,
	)
	if err != nil {
		return Sale{}, err
	}

	sale.Items, err = r.listItems(
		ctx,
		id,
	)
	if err != nil {
		return Sale{}, err
	}

	return sale, nil
}

func (r *Repository) listItems(
	ctx context.Context,
	saleID int64,
) ([]SaleItem, error) {
	rows, err := r.db.Query(
		ctx,
		`
		SELECT
			si.id,
			si.sale_id,
			si.product_id,
			p.sku,
			p.name,
			si.quantity,
			si.unit_price,
			si.subtotal
		FROM sale_items si
		JOIN products p
			ON p.id = si.product_id
		WHERE si.sale_id = $1
		ORDER BY si.id
		`,
		saleID,
	)
	if err != nil {
		return nil, err
	}

	defer rows.Close()

	items := []SaleItem{}

	for rows.Next() {
		var item SaleItem

		err := rows.Scan(
			&item.ID,
			&item.SaleID,
			&item.ProductID,
			&item.SKU,
			&item.ProductName,
			&item.Quantity,
			&item.UnitPrice,
			&item.Subtotal,
		)
		if err != nil {
			return nil, err
		}

		items = append(
			items,
			item,
		)
	}

	if err := rows.Err(); err != nil {
		return nil, err
	}

	return items, nil
}
