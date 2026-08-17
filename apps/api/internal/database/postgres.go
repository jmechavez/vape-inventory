package database

import (
	"context"
	"fmt"
	"os"
	"os/user"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

func Connect(ctx context.Context) (*pgxpool.Pool, error) {
	currentUser, err := user.Current()
	if err != nil {
		return nil, fmt.Errorf("get current user: %w", err)
	}

	config, err := pgxpool.ParseConfig("")
	if err != nil {
		return nil, fmt.Errorf("parse database config: %w", err)
	}

	config.ConnConfig.Host = os.Getenv("PGHOST")
	config.ConnConfig.Port = 5432
	config.ConnConfig.User = currentUser.Username
	config.ConnConfig.Database = "vape_inventory"

	config.MaxConns = 10
	config.MinConns = 2
	config.MaxConnLifetime = time.Hour

	pool, err := pgxpool.NewWithConfig(ctx, config)
	if err != nil {
		return nil, fmt.Errorf("create database pool: %w", err)
	}

	if err := pool.Ping(ctx); err != nil {
		pool.Close()
		return nil, fmt.Errorf("ping database: %w", err)
	}

	return pool, nil
}
