// /home/jmechavez/Projects/vape-inventory/apps/api/cmd/server/main.go
package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"time"

	"github.com/jmechavez/vape-inventory/internal/database"
	"github.com/jmechavez/vape-inventory/internal/imports"
	"github.com/jmechavez/vape-inventory/internal/inventory"
	"github.com/jmechavez/vape-inventory/internal/products"
	"github.com/jmechavez/vape-inventory/internal/sales"
	"github.com/jmechavez/vape-inventory/internal/suppliers"
	"github.com/jmechavez/vape-inventory/internal/sync"
)

func main() {
	ctx := context.Background()

	// Connect to database
	db, err := database.Connect(ctx)
	if err != nil {
		log.Fatalf("database connection failed: %v", err)
	}
	defer db.Close()

	// Initialize repositories
	productRepository := products.NewRepository(db)
	inventoryRepository := inventory.NewRepository(db)
	supplierRepository := suppliers.NewRepository(db)
	salesRepository := sales.NewRepository(db)
	syncRepository := sync.NewRepository(db)

	// Initialize handlers
	productHandler := products.NewHandler(productRepository)
	inventoryHandler := inventory.NewHandler(inventoryRepository)
	supplierHandler := suppliers.NewHandler(supplierRepository)
	salesHandler := sales.NewHandler(salesRepository)
	syncHandler := sync.NewHandler(syncRepository)

	productImporter := imports.NewProductImporter(db)
	importHandler := imports.NewHandler(productImporter)

	// Create router
	mux := http.NewServeMux()

	// =========================================================
	// STATIC FILES (Web App) - WITH SPA FALLBACK
	// =========================================================
	mux.Handle("/", http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Skip API routes
		if len(r.URL.Path) >= 4 && r.URL.Path[:4] == "/api" {
			http.NotFound(w, r)
			return
		}
		if r.URL.Path == "/health" {
			http.NotFound(w, r)
			return
		}

		// Check if the file exists
		filePath := "./static" + r.URL.Path
		if _, err := os.Stat(filePath); err == nil {
			// File exists, serve it
			http.ServeFile(w, r, filePath)
			return
		}

		// Otherwise, serve index.html (for React Router)
		http.ServeFile(w, r, "./static/index.html")
	}))

	// =========================================================
	// SYNC ROUTES
	// =========================================================
	mux.HandleFunc("POST /api/sync", syncHandler.Sync)
	mux.HandleFunc("GET /api/sync/devices", syncHandler.ListDevices)
	mux.HandleFunc("DELETE /api/sync/devices/{device_id}", syncHandler.DeleteDevice)

	// =========================================================
	// PRODUCT ROUTES
	// =========================================================
	mux.HandleFunc("GET /api/products", productHandler.List)
	mux.HandleFunc("POST /api/products/import", productHandler.ImportCSV)
	mux.HandleFunc("POST /api/products", productHandler.Create)
	mux.HandleFunc("PUT /api/products/{id}", productHandler.Update)
	mux.HandleFunc("DELETE /api/products/{id}", productHandler.Archive)
	mux.HandleFunc("GET /api/products/archived", productHandler.ListArchived)
	mux.HandleFunc("PATCH /api/products/{id}/restore", productHandler.Restore)

	// =========================================================
	// IMPORT ROUTES
	// =========================================================
	mux.HandleFunc("POST /api/import/products", importHandler.Products)

	// =========================================================
	// INVENTORY ROUTES
	// =========================================================
	mux.HandleFunc("GET /api/inventory", inventoryHandler.List)
	mux.HandleFunc("GET /api/inventory/movements", inventoryHandler.ListMovements)
	mux.HandleFunc("POST /api/inventory/receive", inventoryHandler.Receive)
	mux.HandleFunc("POST /api/inventory/sale", inventoryHandler.Sale)
	mux.HandleFunc("POST /api/inventory/damage", inventoryHandler.Damage)
	mux.HandleFunc("POST /api/inventory/return", inventoryHandler.Return)
	mux.HandleFunc("POST /api/inventory/adjustment", inventoryHandler.Adjustment)

	// =========================================================
	// SUPPLIER ROUTES
	// =========================================================
	mux.HandleFunc("GET /api/suppliers", supplierHandler.List)
	mux.HandleFunc("POST /api/suppliers", supplierHandler.Create)

	// =========================================================
	// SALE ROUTES
	// =========================================================
	mux.HandleFunc("GET /api/sales", salesHandler.List)
	mux.HandleFunc("GET /api/sales/{id}", salesHandler.Get)
	mux.HandleFunc("POST /api/sales", salesHandler.Create)

	// =========================================================
	// HEALTH CHECK
	// =========================================================
	mux.HandleFunc("GET /health", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte(`{"status":"ok"}`))
	})

	// =========================================================
	// SERVER CONFIG
	// =========================================================
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	corsOrigin := os.Getenv("CORS_ORIGIN")
	if corsOrigin == "" {
		corsOrigin = "http://localhost:5173"
	}

	server := &http.Server{
		Addr:              ":" + port,
		Handler:           corsMiddleware(mux, corsOrigin),
		ReadHeaderTimeout: 5 * time.Second,
	}

	log.Printf("vape-inventory API listening on %s", server.Addr)

	if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
		log.Fatal(err)
	}
}

// CORS middleware
func corsMiddleware(next http.Handler, allowedOrigin string) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", allowedOrigin)
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")

		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}

		next.ServeHTTP(w, r)
	})
}
