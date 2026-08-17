package suppliers

import (
	"context"

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

func (r *Repository) List(ctx context.Context) ([]Supplier, error) {
	rows, err := r.db.Query(
		ctx,
		`
		SELECT
			id,
			name,
			contact_person,
			phone,
			email,
			address
		FROM suppliers
		ORDER BY name ASC
		`,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	suppliers := make([]Supplier, 0)

	for rows.Next() {
		var supplier Supplier

		if err := rows.Scan(
			&supplier.ID,
			&supplier.Name,
			&supplier.ContactPerson,
			&supplier.Phone,
			&supplier.Email,
			&supplier.Address,
		); err != nil {
			return nil, err
		}

		suppliers = append(suppliers, supplier)
	}

	if err := rows.Err(); err != nil {
		return nil, err
	}

	return suppliers, nil
}

func (r *Repository) GetByID(
	ctx context.Context,
	id int64,
) (Supplier, error) {
	var supplier Supplier

	err := r.db.QueryRow(
		ctx,
		`
		SELECT
			id,
			name,
			contact_person,
			phone,
			email,
			address
		FROM suppliers
		WHERE id = $1
		`,
		id,
	).Scan(
		&supplier.ID,
		&supplier.Name,
		&supplier.ContactPerson,
		&supplier.Phone,
		&supplier.Email,
		&supplier.Address,
	)
	if err != nil {
		return Supplier{}, err
	}

	return supplier, nil
}

func (r *Repository) Create(
	ctx context.Context,
	supplier Supplier,
) (Supplier, error) {
	var created Supplier

	err := r.db.QueryRow(
		ctx,
		`
		INSERT INTO suppliers (
			name,
			contact_person,
			phone,
			email,
			address
		)
		VALUES ($1, $2, $3, $4, $5)
		RETURNING
			id,
			name,
			contact_person,
			phone,
			email,
			address
		`,
		supplier.Name,
		supplier.ContactPerson,
		supplier.Phone,
		supplier.Email,
		supplier.Address,
	).Scan(
		&created.ID,
		&created.Name,
		&created.ContactPerson,
		&created.Phone,
		&created.Email,
		&created.Address,
	)
	if err != nil {
		return Supplier{}, err
	}

	return created, nil
}

func (r *Repository) Update(
	ctx context.Context,
	id int64,
	supplier Supplier,
) (Supplier, error) {
	var updated Supplier

	err := r.db.QueryRow(
		ctx,
		`
		UPDATE suppliers
		SET
			name = $1,
			contact_person = $2,
			phone = $3,
			email = $4,
			address = $5
		WHERE id = $6
		RETURNING
			id,
			name,
			contact_person,
			phone,
			email,
			address
		`,
		supplier.Name,
		supplier.ContactPerson,
		supplier.Phone,
		supplier.Email,
		supplier.Address,
		id,
	).Scan(
		&updated.ID,
		&updated.Name,
		&updated.ContactPerson,
		&updated.Phone,
		&updated.Email,
		&updated.Address,
	)
	if err != nil {
		return Supplier{}, err
	}

	return updated, nil
}

func (r *Repository) Delete(
	ctx context.Context,
	id int64,
) error {
	commandTag, err := r.db.Exec(
		ctx,
		`
		DELETE FROM suppliers
		WHERE id = $1
		`,
		id,
	)
	if err != nil {
		return err
	}

	if commandTag.RowsAffected() == 0 {
		return pgx.ErrNoRows
	}

	return nil
}
