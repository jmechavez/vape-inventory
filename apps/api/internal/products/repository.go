package products

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

func (r *Repository) Create(ctx context.Context, p Product) (Product, error) {
	err := r.db.QueryRow(ctx, `
		INSERT INTO products (
			sku,
			barcode,
			name,
			category_id,
			brand,
			version,
			flavor,
			cost_price,
			selling_price,
			minimum_stock,
			active
		)
		VALUES (
			$1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11
		)
		RETURNING
			id,
			sku,
			barcode,
			name,
			category_id,
			brand,
			version,
			flavor,
			cost_price,
			selling_price,
			minimum_stock,
			active
	`,
		p.SKU,
		p.Barcode,
		p.Name,
		p.CategoryID,
		p.Brand,
		p.Version,
		p.Flavor,
		p.CostPrice,
		p.SellingPrice,
		p.MinimumStock,
		p.Active,
	).Scan(
		&p.ID,
		&p.SKU,
		&p.Barcode,
		&p.Name,
		&p.CategoryID,
		&p.Brand,
		&p.Version,
		&p.Flavor,
		&p.CostPrice,
		&p.SellingPrice,
		&p.MinimumStock,
		&p.Active,
	)
	if err != nil {
		return Product{}, err
	}

	return p, nil
}

func (r *Repository) List(ctx context.Context) ([]Product, error) {
	rows, err := r.db.Query(ctx, `
		SELECT
			id,
			sku,
			barcode,
			name,
			category_id,
			brand,
			version,
			flavor,
			cost_price,
			selling_price,
			minimum_stock,
			active
		FROM products
		WHERE active = true
		ORDER BY name
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var products []Product

	for rows.Next() {
		var p Product

		if err := rows.Scan(
			&p.ID,
			&p.SKU,
			&p.Barcode,
			&p.Name,
			&p.CategoryID,
			&p.Brand,
			&p.Version,
			&p.Flavor,
			&p.CostPrice,
			&p.SellingPrice,
			&p.MinimumStock,
			&p.Active,
		); err != nil {
			return nil, err
		}

		products = append(products, p)
	}

	if err := rows.Err(); err != nil {
		return nil, err
	}

	return products, nil
}

func (r *Repository) Update(ctx context.Context, p Product) (Product, error) {
	err := r.db.QueryRow(ctx, `
		UPDATE products
		SET
			sku = $1,
			barcode = $2,
			name = $3,
			category_id = $4,
			brand = $5,
			version = $6,
			flavor = $7,
			cost_price = $8,
			selling_price = $9,
			minimum_stock = $10
		WHERE id = $11
		RETURNING
			id,
			sku,
			barcode,
			name,
			category_id,
			brand,
			version,
			flavor,
			cost_price,
			selling_price,
			minimum_stock,
			active
	`,
		p.SKU,
		p.Barcode,
		p.Name,
		p.CategoryID,
		p.Brand,
		p.Version,
		p.Flavor,
		p.CostPrice,
		p.SellingPrice,
		p.MinimumStock,
		p.ID,
	).Scan(
		&p.ID,
		&p.SKU,
		&p.Barcode,
		&p.Name,
		&p.CategoryID,
		&p.Brand,
		&p.Version,
		&p.Flavor,
		&p.CostPrice,
		&p.SellingPrice,
		&p.MinimumStock,
		&p.Active,
	)
	if err != nil {
		return Product{}, err
	}

	return p, nil
}

func (r *Repository) Archive(ctx context.Context, id int64) error {
	_, err := r.db.Exec(ctx, `
		UPDATE products
		SET active = false
		WHERE id = $1
	`, id)

	return err
}

func (r *Repository) ListArchived(ctx context.Context) ([]Product, error) {
	rows, err := r.db.Query(ctx, `
		SELECT
			id,
			sku,
			barcode,
			name,
			category_id,
			brand,
			version,
			flavor,
			cost_price,
			selling_price,
			minimum_stock,
			active
		FROM products
		WHERE active = false
		ORDER BY name
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var products []Product

	for rows.Next() {
		var p Product

		if err := rows.Scan(
			&p.ID,
			&p.SKU,
			&p.Barcode,
			&p.Name,
			&p.CategoryID,
			&p.Brand,
			&p.Version,
			&p.Flavor,
			&p.CostPrice,
			&p.SellingPrice,
			&p.MinimumStock,
			&p.Active,
		); err != nil {
			return nil, err
		}

		products = append(products, p)
	}

	if err := rows.Err(); err != nil {
		return nil, err
	}

	return products, nil
}

func (r *Repository) Restore(ctx context.Context, id int64) (Product, error) {
	var p Product

	err := r.db.QueryRow(ctx, `
		UPDATE products
		SET active = true
		WHERE id = $1
		  AND active = false
		RETURNING
			id,
			sku,
			barcode,
			name,
			category_id,
			brand,
			version,
			flavor,
			cost_price,
			selling_price,
			minimum_stock,
			active
	`,
		id,
	).Scan(
		&p.ID,
		&p.SKU,
		&p.Barcode,
		&p.Name,
		&p.CategoryID,
		&p.Brand,
		&p.Version,
		&p.Flavor,
		&p.CostPrice,
		&p.SellingPrice,
		&p.MinimumStock,
		&p.Active,
	)
	if err != nil {
		return Product{}, err
	}

	return p, nil
}

// Import inserts multiple products in a single transaction.
//
// If any product fails, the entire import is rolled back.
func (r *Repository) Import(
	ctx context.Context,
	products []Product,
) (int, error) {
	if len(products) == 0 {
		return 0, nil
	}

	tx, err := r.db.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return 0, err
	}

	defer func() {
		_ = tx.Rollback(ctx)
	}()

	for _, p := range products {
		_, err := tx.Exec(ctx, `
			INSERT INTO products (
				sku,
				barcode,
				name,
				category_id,
				brand,
				version,
				flavor,
				cost_price,
				selling_price,
				minimum_stock,
				active
			)
			VALUES (
				$1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11
			)
		`,
			p.SKU,
			p.Barcode,
			p.Name,
			p.CategoryID,
			p.Brand,
			p.Version,
			p.Flavor,
			p.CostPrice,
			p.SellingPrice,
			p.MinimumStock,
			p.Active,
		)
		if err != nil {
			return 0, fmt.Errorf(
				"failed to import SKU %q: %w",
				p.SKU,
				err,
			)
		}
	}

	if err := tx.Commit(ctx); err != nil {
		return 0, err
	}

	return len(products), nil
}
