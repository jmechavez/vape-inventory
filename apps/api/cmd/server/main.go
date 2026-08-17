package main

import (
	"context"
	"log"
	"net/http"
	"time"

	"github.com/jmechavez/vape-inventory/internal/database"
	"github.com/jmechavez/vape-inventory/internal/imports"
	"github.com/jmechavez/vape-inventory/internal/inventory"
	"github.com/jmechavez/vape-inventory/internal/products"
	"github.com/jmechavez/vape-inventory/internal/sales"
	"github.com/jmechavez/vape-inventory/internal/suppliers"
)

func main() {
	ctx := context.Background()

	db, err := database.Connect(ctx)
	if err != nil {
		log.Fatalf(
			"database connection failed: %v",
			err,
		)
	}

	defer db.Close()

	// Repositories
	productRepository := products.NewRepository(db)
	inventoryRepository := inventory.NewRepository(db)
	supplierRepository := suppliers.NewRepository(db)
	salesRepository := sales.NewRepository(db)

	// Handlers
	productHandler := products.NewHandler(
		productRepository,
	)

	inventoryHandler := inventory.NewHandler(
		inventoryRepository,
	)

	supplierHandler := suppliers.NewHandler(
		supplierRepository,
	)

	salesHandler := sales.NewHandler(
		salesRepository,
	)

	// Product importer
	productImporter := imports.NewProductImporter(
		db,
	)

	importHandler := imports.NewHandler(
		productImporter,
	)

	mux := http.NewServeMux()

	// =========================================================
	// PRODUCTS
	// =========================================================

	mux.HandleFunc(
		"GET /api/products",
		productHandler.List,
	)

	mux.HandleFunc(
		"POST /api/products/import",
		productHandler.ImportCSV,
	)

	mux.HandleFunc(
		"POST /api/products",
		productHandler.Create,
	)

	mux.HandleFunc(
		"PUT /api/products/{id}",
		productHandler.Update,
	)

	mux.HandleFunc(
		"DELETE /api/products/{id}",
		productHandler.Archive,
	)

	mux.HandleFunc(
		"GET /api/products/archived",
		productHandler.ListArchived,
	)

	mux.HandleFunc(
		"PATCH /api/products/{id}/restore",
		productHandler.Restore,
	)
	// =========================================================
	// PRODUCT IMPORT
	// =========================================================

	mux.HandleFunc(
		"POST /api/import/products",
		importHandler.Products,
	)

	// =========================================================
	// INVENTORY
	// =========================================================

	mux.HandleFunc(
		"GET /api/inventory",
		inventoryHandler.List,
	)

	mux.HandleFunc(
		"GET /api/inventory/movements",
		inventoryHandler.ListMovements,
	)

	mux.HandleFunc(
		"POST /api/inventory/receive",
		inventoryHandler.Receive,
	)

	mux.HandleFunc(
		"POST /api/inventory/sale",
		inventoryHandler.Sale,
	)

	mux.HandleFunc(
		"POST /api/inventory/damage",
		inventoryHandler.Damage,
	)

	mux.HandleFunc(
		"POST /api/inventory/return",
		inventoryHandler.Return,
	)

	mux.HandleFunc(
		"POST /api/inventory/adjustment",
		inventoryHandler.Adjustment,
	)

	// =========================================================
	// SUPPLIERS
	// =========================================================

	mux.HandleFunc(
		"GET /api/suppliers",
		supplierHandler.List,
	)

	mux.HandleFunc(
		"POST /api/suppliers",
		supplierHandler.Create,
	)

	// =========================================================
	// SALES
	// =========================================================

	mux.HandleFunc(
		"GET /api/sales",
		salesHandler.List,
	)

	mux.HandleFunc(
		"GET /api/sales/{id}",
		salesHandler.Get,
	)

	mux.HandleFunc(
		"POST /api/sales",
		salesHandler.Create,
	)

	// =========================================================
	// HEALTH CHECK
	// =========================================================

	mux.HandleFunc(
		"GET /health",
		func(w http.ResponseWriter, r *http.Request) {
			w.Header().Set(
				"Content-Type",
				"application/json",
			)

			w.WriteHeader(
				http.StatusOK,
			)

			_, _ = w.Write(
				[]byte(`{"status":"ok"}`),
			)
		},
	)

	// =========================================================
	// SERVER
	// =========================================================

	server := &http.Server{
		Addr:              ":8080",
		Handler:           corsMiddleware(mux),
		ReadHeaderTimeout: 5 * time.Second,
	}

	log.Printf(
		"vape-inventory API listening on %s",
		server.Addr,
	)

	if err := server.ListenAndServe(); err != nil &&
		err != http.ErrServerClosed {
		log.Fatal(err)
	}
}

func corsMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(
		func(w http.ResponseWriter, r *http.Request) {
			w.Header().Set(
				"Access-Control-Allow-Origin",
				"http://localhost:5173",
			)

			w.Header().Set(
				"Access-Control-Allow-Methods",
				"GET, POST, PUT, PATCH, DELETE, OPTIONS",
			)

			w.Header().Set(
				"Access-Control-Allow-Headers",
				"Content-Type, Authorization",
			)

			if r.Method == http.MethodOptions {
				w.WriteHeader(
					http.StatusNoContent,
				)
				return
			}

			next.ServeHTTP(w, r)
		},
	)
}
