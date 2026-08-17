package inventory

import "time"

type ReceiveStockRequest struct {
	ProductID    int64      `json:"product_id"`
	SupplierID   *int64     `json:"supplier_id,omitempty"`
	Quantity     int        `json:"quantity"`
	UnitCost     *float64   `json:"unit_cost,omitempty"`
	Reference    string     `json:"reference,omitempty"`
	Notes        string     `json:"notes,omitempty"`
	MovementDate *time.Time `json:"movement_date,omitempty"`
}

type SaleStockRequest struct {
	ProductID int64  `json:"product_id"`
	Quantity  int    `json:"quantity"`
	Reference string `json:"reference,omitempty"`
	Notes     string `json:"notes,omitempty"`
}

type DamageStockRequest struct {
	ProductID    int64      `json:"product_id"`
	Quantity     int        `json:"quantity"`
	Reference    string     `json:"reference,omitempty"`
	Notes        string     `json:"notes,omitempty"`
	MovementDate *time.Time `json:"movement_date,omitempty"`
}

type ReturnStockRequest struct {
	ProductID    int64      `json:"product_id"`
	Quantity     int        `json:"quantity"`
	Reference    string     `json:"reference,omitempty"`
	Notes        string     `json:"notes,omitempty"`
	MovementDate *time.Time `json:"movement_date,omitempty"`
}

type AdjustmentStockRequest struct {
	ProductID    int64      `json:"product_id"`
	Quantity     int        `json:"quantity"`
	Reference    string     `json:"reference,omitempty"`
	Notes        string     `json:"notes,omitempty"`
	MovementDate *time.Time `json:"movement_date,omitempty"`
}

type ListMovementsRequest struct {
	Type   string
	Page   int
	Limit  int
	Offset int
}

type InventoryItem struct {
	ProductID    int64   `json:"product_id"`
	SKU          string  `json:"sku"`
	Name         string  `json:"name"`
	Brand        *string `json:"brand,omitempty"`
	Version      *string `json:"version,omitempty"`
	Flavor       *string `json:"flavor,omitempty"`
	CurrentStock int     `json:"current_stock"`
	MinimumStock int     `json:"minimum_stock"`
}

type StockMovement struct {
	ID         int64  `json:"id"`
	ProductID  int64  `json:"product_id"`
	SupplierID *int64 `json:"supplier_id,omitempty"`

	SKU         string  `json:"sku"`
	ProductName string  `json:"product_name"`
	Brand       *string `json:"brand,omitempty"`
	Version     *string `json:"version,omitempty"`
	Flavor      *string `json:"flavor,omitempty"`

	Type      string   `json:"type"`
	Quantity  int      `json:"quantity"`
	UnitCost  *float64 `json:"unit_cost,omitempty"`
	Reference *string  `json:"reference,omitempty"`
	Notes     *string  `json:"notes,omitempty"`

	CreatedAt    time.Time `json:"created_at"`
	MovementDate time.Time `json:"movement_date"`
}

type MovementListResponse struct {
	Items      []StockMovement `json:"items"`
	Page       int             `json:"page"`
	Limit      int             `json:"limit"`
	Total      int             `json:"total"`
	TotalPages int             `json:"total_pages"`
}
