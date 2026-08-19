package database

import (
	"context"
	"fmt"
	"os"
	"strconv"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

func Connect(ctx context.Context) (*pgxpool.Pool, error) {
	host := os.Getenv("PGHOST")
	portString := os.Getenv("PGPORT")
	user := os.Getenv("PGUSER")
	password := os.Getenv("PGPASSWORD")
	database := os.Getenv("PGDATABASE")

	if host == "" {
		host = "localhost"
	}

	port := uint16(5432)

	if portString != "" {
		parsedPort, err := strconv.ParseUint(portString, 10, 16)
		if err != nil {
			return nil, fmt.Errorf("invalid PGPORT: %w", err)
		}

		port = uint16(parsedPort)
	}

	if user == "" {
		return nil, fmt.Errorf("PGUSER is required")
	}

	if database == "" {
		database = "vape_inventory"
	}

	config, err := pgxpool.ParseConfig("")
	if err != nil {
		return nil, fmt.Errorf("parse database config: %w", err)
	}

	config.ConnConfig.Host = host
	config.ConnConfig.Port = port
	config.ConnConfig.User = user
	config.ConnConfig.Password = password
	config.ConnConfig.Database = database

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
