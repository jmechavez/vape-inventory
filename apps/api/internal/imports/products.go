package imports

import (
	"context"
	"encoding/csv"
	"fmt"
	"io"
	"strconv"
	"strings"

	"github.com/jackc/pgx/v5/pgxpool"
)

type ProductImporter struct {
	db *pgxpool.Pool
}

func NewProductImporter(db *pgxpool.Pool) *ProductImporter {
	return &ProductImporter{db: db}
}

func (i *ProductImporter) Import(
	ctx context.Context,
	reader io.Reader,
) (int, error) {
	csvReader := csv.NewReader(reader)

	header, err := csvReader.Read()
	if err != nil {
		return 0, fmt.Errorf("read header: %w", err)
	}

	expected := []string{
		"sku",
		"name",
		"brand",
		"version",
		"flavor",
		"barcode",
		"minimum_stock",
	}

	if len(header) != len(expected) {
		return 0, fmt.Errorf("invalid CSV header")
	}

	for index := range header {
		if strings.TrimSpace(strings.ToLower(header[index])) != expected[index] {
			return 0, fmt.Errorf(
				"invalid CSV header: column %d must be %q",
				index+1,
				expected[index],
			)
		}
	}

	tx, err := i.db.Begin(ctx)
	if err != nil {
		return 0, fmt.Errorf("begin transaction: %w", err)
	}
	defer tx.Rollback(ctx)

	count := 0

	for {
		record, err := csvReader.Read()

		if err == io.EOF {
			break
		}

		if err != nil {
			return 0, fmt.Errorf("read CSV row: %w", err)
		}

		if len(record) != 7 {
			return 0, fmt.Errorf(
				"row %d: expected 7 columns",
				count+2,
			)
		}

		sku := strings.TrimSpace(record[0])
		name := strings.TrimSpace(record[1])
		brand := strings.TrimSpace(record[2])
		version := strings.TrimSpace(record[3])
		flavor := strings.TrimSpace(record[4])
		barcode := strings.TrimSpace(record[5])

		if sku == "" {
			return 0, fmt.Errorf(
				"row %d: SKU is required",
				count+2,
			)
		}

		if name == "" {
			return 0, fmt.Errorf(
				"row %d: product name is required",
				count+2,
			)
		}

		minimumStock, err := strconv.Atoi(
			strings.TrimSpace(record[6]),
		)
		if err != nil || minimumStock < 0 {
			return 0, fmt.Errorf(
				"row %d: invalid minimum_stock",
				count+2,
			)
		}

		_, err = tx.Exec(ctx, `
			INSERT INTO products (
				sku,
				name,
				brand,
				version,
				flavor,
				barcode,
				minimum_stock
			)
			VALUES ($1, $2, NULLIF($3, ''), NULLIF($4, ''),
			        NULLIF($5, ''), NULLIF($6, ''), $7)
			ON CONFLICT (sku)
			DO UPDATE SET
				name = EXCLUDED.name,
				brand = EXCLUDED.brand,
				version = EXCLUDED.version,
				flavor = EXCLUDED.flavor,
				barcode = EXCLUDED.barcode,
				minimum_stock = EXCLUDED.minimum_stock
		`,
			sku,
			name,
			brand,
			version,
			flavor,
			barcode,
			minimumStock,
		)
		if err != nil {
			return 0, fmt.Errorf(
				"row %d: import product %q: %w",
				count+2,
				sku,
				err,
			)
		}

		count++
	}

	if err := tx.Commit(ctx); err != nil {
		return 0, fmt.Errorf("commit import: %w", err)
	}

	return count, nil
}
