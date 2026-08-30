package auth

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
	return &Repository{db: db}
}

func (r *Repository) Authenticate(ctx context.Context, username, password string) (User, error) {
	var user User

	err := r.db.QueryRow(ctx, `
        SELECT id, username, role 
        FROM users 
        WHERE username = $1 AND password_hash = $2
    `, username, password).Scan(&user.ID, &user.Username, &user.Role)
	if err != nil {
		if err == pgx.ErrNoRows {
			return User{}, fmt.Errorf("invalid credentials")
		}
		return User{}, err
	}

	return user, nil
}

func (r *Repository) GetUserByID(ctx context.Context, id int64) (User, error) {
	var user User
	err := r.db.QueryRow(ctx, `
        SELECT id, username, role 
        FROM users 
        WHERE id = $1
    `, id).Scan(&user.ID, &user.Username, &user.Role)
	return user, err
}
