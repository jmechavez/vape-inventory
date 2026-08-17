package products

type Product struct {
	ID           int64   `json:"id"`
	SKU          string  `json:"sku"`
	Barcode      *string `json:"barcode,omitempty"`
	Name         string  `json:"name"`
	CategoryID   *int64  `json:"category_id,omitempty"`
	Brand        *string `json:"brand,omitempty"`
	Version      *string `json:"version,omitempty"`
	Flavor       *string `json:"flavor,omitempty"`
	CostPrice    float64 `json:"cost_price"`
	SellingPrice float64 `json:"selling_price"`
	MinimumStock int     `json:"minimum_stock"`
	Active       bool    `json:"active"`
}

type ImportResult struct {
	Imported int `json:"imported"`
}
