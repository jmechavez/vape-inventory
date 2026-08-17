package inventory

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
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

// Receive adds stock to a product.
func (r *Repository) Receive(
	ctx context.Context,
	request ReceiveStockRequest,
) (StockMovement, error) {
	if request.ProductID <= 0 {
		return StockMovement{}, fmt.Errorf(
			"product_id is required",
		)
	}

	if request.Quantity <= 0 {
		return StockMovement{}, fmt.Errorf(
			"quantity must be greater than zero",
		)
	}

	if request.UnitCost != nil && *request.UnitCost < 0 {
		return StockMovement{}, fmt.Errorf(
			"unit_cost cannot be negative",
		)
	}

	tx, err := r.db.Begin(ctx)
	if err != nil {
		return StockMovement{}, fmt.Errorf(
			"begin receive transaction: %w",
			err,
		)
	}

	defer tx.Rollback(ctx)

	var (
		productID int64
		sku       string
		name      string
	)

	err = tx.QueryRow(
		ctx,
		`
		SELECT
			id,
			sku,
			name
		FROM products
		WHERE
			id = $1
			AND active = true
		FOR UPDATE
		`,
		request.ProductID,
	).Scan(
		&productID,
		&sku,
		&name,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return StockMovement{}, fmt.Errorf(
				"product not found",
			)
		}

		return StockMovement{}, fmt.Errorf(
			"find product: %w",
			err,
		)
	}

	// Validate supplier when supplied.
	if request.SupplierID != nil {
		var supplierExists bool

		err = tx.QueryRow(
			ctx,
			`
			SELECT EXISTS (
				SELECT 1
				FROM suppliers
				WHERE id = $1
			)
			`,
			*request.SupplierID,
		).Scan(&supplierExists)
		if err != nil {
			return StockMovement{}, fmt.Errorf(
				"check supplier: %w",
				err,
			)
		}

		if !supplierExists {
			return StockMovement{}, fmt.Errorf(
				"supplier not found",
			)
		}
	}

	movementDate := time.Now()

	if request.MovementDate != nil {
		movementDate = request.MovementDate.UTC()
	}

	var movement StockMovement

	err = tx.QueryRow(
		ctx,
		`
		INSERT INTO stock_movements (
			product_id,
			supplier_id,
			type,
			quantity,
			unit_cost,
			reference,
			notes,
			movement_date
		)
		VALUES (
			$1,
			$2,
			'RECEIVE',
			$3,
			$4,
			$5,
			$6,
			$7
		)
		RETURNING
			id,
			product_id,
			supplier_id,
			quantity,
			unit_cost,
			reference,
			notes,
			created_at,
			movement_date
		`,
		productID,
		request.SupplierID,
		request.Quantity,
		request.UnitCost,
		request.Reference,
		request.Notes,
		movementDate,
	).Scan(
		&movement.ID,
		&movement.ProductID,
		&movement.SupplierID,
		&movement.Quantity,
		&movement.UnitCost,
		&movement.Reference,
		&movement.Notes,
		&movement.CreatedAt,
		&movement.MovementDate,
	)
	if err != nil {
		var pgErr *pgconn.PgError

		if errors.As(err, &pgErr) &&
			pgErr.Code == "23503" {
			return StockMovement{}, fmt.Errorf(
				"invalid product or supplier",
			)
		}

		return StockMovement{}, fmt.Errorf(
			"receive stock: %w",
			err,
		)
	}

	movement.SKU = sku
	movement.ProductName = name
	movement.Type = "RECEIVE"

	if err := tx.Commit(ctx); err != nil {
		return StockMovement{}, fmt.Errorf(
			"commit receive transaction: %w",
			err,
		)
	}

	return movement, nil
}

// Sale removes stock from a product.
func (r *Repository) Sale(
	ctx context.Context,
	request SaleStockRequest,
) error {
	if request.ProductID <= 0 {
		return fmt.Errorf(
			"product_id is required",
		)
	}

	if request.Quantity <= 0 {
		return fmt.Errorf(
			"quantity must be greater than zero",
		)
	}

	tx, err := r.db.Begin(ctx)
	if err != nil {
		return fmt.Errorf(
			"begin sale transaction: %w",
			err,
		)
	}

	defer tx.Rollback(ctx)

	var productID int64

	err = tx.QueryRow(
		ctx,
		`
		SELECT
			id
		FROM products
		WHERE
			id = $1
			AND active = true
		FOR UPDATE
		`,
		request.ProductID,
	).Scan(&productID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return fmt.Errorf(
				"product not found",
			)
		}

		return fmt.Errorf(
			"find product: %w",
			err,
		)
	}

	var currentStock int

	err = tx.QueryRow(
		ctx,
		`
		SELECT COALESCE(
			SUM(
				CASE
					WHEN type IN ('RECEIVE', 'RETURN')
						THEN quantity

					WHEN type IN (
						'SALE',
						'DAMAGE',
						'LOSS'
					)
						THEN quantity

					WHEN type = 'ADJUSTMENT'
						THEN quantity

					ELSE 0
				END
			),
			0
		)::integer
		FROM stock_movements
		WHERE product_id = $1
		`,
		productID,
	).Scan(&currentStock)
	if err != nil {
		return fmt.Errorf(
			"check stock: %w",
			err,
		)
	}

	if currentStock < request.Quantity {
		return fmt.Errorf(
			"insufficient stock: have %d, need %d",
			currentStock,
			request.Quantity,
		)
	}

	// SALE quantities are stored as negative values.
	//
	// Example:
	//
	// RECEIVE +10
	// SALE     -2
	// ----------------
	// STOCK    +8
	_, err = tx.Exec(
		ctx,
		`
		INSERT INTO stock_movements (
			product_id,
			type,
			quantity,
			reference,
			notes
		)
		VALUES (
			$1,
			'SALE',
			$2,
			$3,
			$4
		)
		`,
		productID,
		-request.Quantity,
		request.Reference,
		request.Notes,
	)
	if err != nil {
		return fmt.Errorf(
			"record sale: %w",
			err,
		)
	}

	if err := tx.Commit(ctx); err != nil {
		return fmt.Errorf(
			"commit sale transaction: %w",
			err,
		)
	}

	return nil
}

// Damage removes damaged stock from a product.
func (r *Repository) Damage(
	ctx context.Context,
	request DamageStockRequest,
) error {
	if request.ProductID <= 0 {
		return fmt.Errorf("product_id is required")
	}

	if request.Quantity <= 0 {
		return fmt.Errorf("quantity must be greater than zero")
	}

	tx, err := r.db.Begin(ctx)
	if err != nil {
		return fmt.Errorf(
			"begin damage transaction: %w",
			err,
		)
	}

	defer tx.Rollback(ctx)

	var productID int64

	err = tx.QueryRow(
		ctx,
		`
		SELECT id
		FROM products
		WHERE id = $1
		  AND active = true
		FOR UPDATE
		`,
		request.ProductID,
	).Scan(&productID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return fmt.Errorf("product not found")
		}

		return fmt.Errorf(
			"find product: %w",
			err,
		)
	}

	var currentStock int

	err = tx.QueryRow(
		ctx,
		`
		SELECT COALESCE(
			SUM(
				CASE
					WHEN type IN ('RECEIVE', 'RETURN')
						THEN quantity

					WHEN type IN (
						'SALE',
						'DAMAGE',
						'LOSS'
					)
						THEN quantity

					WHEN type = 'ADJUSTMENT'
						THEN quantity

					ELSE 0
				END
			),
			0
		)::integer
		FROM stock_movements
		WHERE product_id = $1
		`,
		productID,
	).Scan(&currentStock)
	if err != nil {
		return fmt.Errorf(
			"check stock: %w",
			err,
		)
	}

	if currentStock < request.Quantity {
		return fmt.Errorf(
			"insufficient stock: have %d, need %d",
			currentStock,
			request.Quantity,
		)
	}

	movementDate := time.Now()

	if request.MovementDate != nil {
		movementDate = request.MovementDate.UTC()
	}

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
			'DAMAGE',
			$2,
			$3,
			$4,
			$5
		)
		`,
		productID,
		-request.Quantity,
		request.Reference,
		request.Notes,
		movementDate,
	)
	if err != nil {
		return fmt.Errorf(
			"record damaged stock: %w",
			err,
		)
	}

	if err := tx.Commit(ctx); err != nil {
		return fmt.Errorf(
			"commit damage transaction: %w",
			err,
		)
	}

	return nil
}

// Return adds returned stock back into inventory.
func (r *Repository) Return(
	ctx context.Context,
	request ReturnStockRequest,
) error {
	if request.ProductID <= 0 {
		return fmt.Errorf("product_id is required")
	}

	if request.Quantity <= 0 {
		return fmt.Errorf("quantity must be greater than zero")
	}

	tx, err := r.db.Begin(ctx)
	if err != nil {
		return fmt.Errorf(
			"begin return transaction: %w",
			err,
		)
	}

	defer tx.Rollback(ctx)

	var productID int64

	err = tx.QueryRow(
		ctx,
		`
		SELECT id
		FROM products
		WHERE id = $1
		  AND active = true
		FOR UPDATE
		`,
		request.ProductID,
	).Scan(&productID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return fmt.Errorf("product not found")
		}

		return fmt.Errorf(
			"find product: %w",
			err,
		)
	}

	movementDate := time.Now()

	if request.MovementDate != nil {
		movementDate = request.MovementDate.UTC()
	}

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
			'RETURN',
			$2,
			$3,
			$4,
			$5
		)
		`,
		productID,
		request.Quantity,
		request.Reference,
		request.Notes,
		movementDate,
	)
	if err != nil {
		return fmt.Errorf(
			"record returned stock: %w",
			err,
		)
	}

	if err := tx.Commit(ctx); err != nil {
		return fmt.Errorf(
			"commit return transaction: %w",
			err,
		)
	}

	return nil
}

// Adjustment changes stock by a positive or negative quantity.
//
// Positive:
//
//	+5 = add 5 units
//
// Negative:
//
//	-3 = remove 3 units
//
// The resulting stock can never become negative.
func (r *Repository) Adjustment(
	ctx context.Context,
	request AdjustmentStockRequest,
) error {
	if request.ProductID <= 0 {
		return fmt.Errorf(
			"product_id is required",
		)
	}

	if request.Quantity == 0 {
		return fmt.Errorf(
			"quantity cannot be zero",
		)
	}

	tx, err := r.db.Begin(ctx)
	if err != nil {
		return fmt.Errorf(
			"begin adjustment transaction: %w",
			err,
		)
	}

	defer tx.Rollback(ctx)

	var productID int64

	err = tx.QueryRow(
		ctx,
		`
		SELECT
			id
		FROM products
		WHERE
			id = $1
			AND active = true
		FOR UPDATE
		`,
		request.ProductID,
	).Scan(&productID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return fmt.Errorf(
				"product not found",
			)
		}

		return fmt.Errorf(
			"find product: %w",
			err,
		)
	}

	var currentStock int

	err = tx.QueryRow(
		ctx,
		`
		SELECT COALESCE(
			SUM(
				CASE
					WHEN type IN ('RECEIVE', 'RETURN')
						THEN quantity

					WHEN type IN (
						'SALE',
						'DAMAGE',
						'LOSS'
					)
						THEN quantity

					WHEN type = 'ADJUSTMENT'
						THEN quantity

					ELSE 0
				END
			),
			0
		)::integer
		FROM stock_movements
		WHERE product_id = $1
		`,
		productID,
	).Scan(&currentStock)
	if err != nil {
		return fmt.Errorf(
			"check stock: %w",
			err,
		)
	}

	newStock := currentStock + request.Quantity

	if newStock < 0 {
		return fmt.Errorf(
			"adjustment would make stock negative: current stock is %d, adjustment is %d",
			currentStock,
			request.Quantity,
		)
	}

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
			'ADJUSTMENT',
			$2,
			$3,
			$4,
			COALESCE($5, now())
		)
		`,
		productID,
		request.Quantity,
		request.Reference,
		request.Notes,
		request.MovementDate,
	)
	if err != nil {
		return fmt.Errorf(
			"record stock adjustment: %w",
			err,
		)
	}

	if err := tx.Commit(ctx); err != nil {
		return fmt.Errorf(
			"commit stock adjustment: %w",
			err,
		)
	}

	return nil
}

// List returns the current stock for every active product.
func (r *Repository) List(
	ctx context.Context,
) ([]InventoryItem, error) {
	rows, err := r.db.Query(
		ctx,
		`
		SELECT
			p.id,
			p.sku,
			p.name,
			p.brand,
			p.version,
			p.flavor,

			COALESCE(
				SUM(
					CASE
						WHEN sm.type IN ('RECEIVE', 'RETURN')
							THEN sm.quantity

						WHEN sm.type IN (
							'SALE',
							'DAMAGE',
							'LOSS'
						)
							THEN sm.quantity

						WHEN sm.type = 'ADJUSTMENT'
							THEN sm.quantity

						ELSE 0
					END
				),
				0
			)::integer AS current_stock,

			p.minimum_stock

		FROM products p

		LEFT JOIN stock_movements sm
			ON sm.product_id = p.id

		WHERE
			p.active = true

		GROUP BY
			p.id,
			p.sku,
			p.name,
			p.brand,
			p.version,
			p.flavor,
			p.minimum_stock

		ORDER BY
			p.name,
			p.id
		`,
	)
	if err != nil {
		return nil, fmt.Errorf(
			"list inventory: %w",
			err,
		)
	}

	defer rows.Close()

	var items []InventoryItem

	for rows.Next() {
		var item InventoryItem

		err := rows.Scan(
			&item.ProductID,
			&item.SKU,
			&item.Name,
			&item.Brand,
			&item.Version,
			&item.Flavor,
			&item.CurrentStock,
			&item.MinimumStock,
		)
		if err != nil {
			return nil, fmt.Errorf(
				"scan inventory item: %w",
				err,
			)
		}

		items = append(
			items,
			item,
		)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf(
			"iterate inventory: %w",
			err,
		)
	}

	return items, nil
}

// ListMovements returns inventory movements
// with filtering and pagination.
func (r *Repository) ListMovements(
	ctx context.Context,
	request ListMovementsRequest,
) ([]StockMovement, int, error) {
	var total int

	err := r.db.QueryRow(
		ctx,
		`
		SELECT
			COUNT(*)
		FROM stock_movements sm
		INNER JOIN products p
			ON p.id = sm.product_id
		WHERE
			(
				$1 = ''
				OR sm.type = $1
			)
		`,
		request.Type,
	).Scan(&total)
	if err != nil {
		return nil, 0, fmt.Errorf(
			"count inventory movements: %w",
			err,
		)
	}

	rows, err := r.db.Query(
		ctx,
		`
		SELECT
			sm.id,
			sm.product_id,
			sm.supplier_id,

			p.sku,
			p.name,
			p.brand,
			p.version,
			p.flavor,

			sm.type,
			sm.quantity,
			sm.unit_cost,
			sm.reference,
			sm.notes,
			sm.created_at,
			sm.movement_date

		FROM stock_movements sm

		INNER JOIN products p
			ON p.id = sm.product_id

		WHERE
			(
				$1 = ''
				OR sm.type = $1
			)

		ORDER BY
			sm.created_at DESC,
			sm.id DESC

		LIMIT $2
		OFFSET $3
		`,
		request.Type,
		request.Limit,
		request.Offset,
	)
	if err != nil {
		return nil, 0, fmt.Errorf(
			"list inventory movements: %w",
			err,
		)
	}

	defer rows.Close()

	var movements []StockMovement

	for rows.Next() {
		var movement StockMovement

		err := rows.Scan(
			&movement.ID,
			&movement.ProductID,
			&movement.SupplierID,

			&movement.SKU,
			&movement.ProductName,
			&movement.Brand,
			&movement.Version,
			&movement.Flavor,

			&movement.Type,
			&movement.Quantity,
			&movement.UnitCost,
			&movement.Reference,
			&movement.Notes,
			&movement.CreatedAt,
			&movement.MovementDate,
		)
		if err != nil {
			return nil, 0, fmt.Errorf(
				"scan inventory movement: %w",
				err,
			)
		}

		movements = append(
			movements,
			movement,
		)
	}

	if err := rows.Err(); err != nil {
		return nil, 0, fmt.Errorf(
			"iterate inventory movements: %w",
			err,
		)
	}

	return movements, total, nil
}
