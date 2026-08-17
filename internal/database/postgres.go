package database

import (
	"context"
	"fmt"
	"os"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

func Connect(ctx context.Context) (*pgxpool.Pool, error) {
	host := os.Getenv("PGHOST")
	port := os.Getenv("PGPORT")
	user := os.Getenv("PGUSER")
	database := os.Getenv("PGDATABASE")

	if host == "" {
		host = "localhost"
	}

	if port == "" {
		port = "5432"
	}

	if user == "" {
		user = os.Getenv("USER")
	}

	if database == "" {
		database = "vape_inventory"
	}

	databaseURL := fmt.Sprintf(
		"postgres://%s@%s:%s/%s",
		user,
		host,
		port,
		database,
	)

	config, err := pgxpool.ParseConfig(databaseURL)
	if err != nil {
		return nil, fmt.Errorf("parse database config: %w", err)
	}

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
