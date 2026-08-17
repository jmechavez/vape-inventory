package sales

import "time"

type SaleItem struct {
	ID          int64   `json:"id"`
	SaleID      int64   `json:"sale_id"`
	ProductID   int64   `json:"product_id"`
	SKU         string  `json:"sku"`
	ProductName string  `json:"product_name"`
	Quantity    int     `json:"quantity"`
	UnitPrice   float64 `json:"unit_price"`
	Subtotal    float64 `json:"subtotal"`
}

type Sale struct {
	ID            int64      `json:"id"`
	UserID        *int64     `json:"user_id,omitempty"`
	Reference     *string    `json:"reference,omitempty"`
	SaleDate      time.Time  `json:"sale_date"`
	Subtotal      float64    `json:"subtotal"`
	Discount      float64    `json:"discount"`
	Total         float64    `json:"total"`
	PaymentMethod string     `json:"payment_method"`
	Status        string     `json:"status"`
	CreatedAt     time.Time  `json:"created_at"`
	Items         []SaleItem `json:"items"`
}

type CreateSaleItemRequest struct {
	ProductID int64 `json:"product_id"`
	Quantity  int   `json:"quantity"`
}

type CreateSaleRequest struct {
	Items         []CreateSaleItemRequest `json:"items"`
	SaleDate      *time.Time              `json:"sale_date,omitempty"`
	PaymentMethod string                  `json:"payment_method"`
	Discount      float64                 `json:"discount"`
}
