package products

import (
	"encoding/csv"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strconv"
	"strings"

	// Keep your existing httpresponse import.
	// Change this import to your actual project path.
	// "github.com/yourname/vape-inventory/apps/api/internal/httpresponse"

	"github.com/jmechavez/vape-inventory/internal/httpresponse"
)

type Handler struct {
	repository *Repository
}

func NewHandler(repository *Repository) *Handler {
	return &Handler{
		repository: repository,
	}
}

func (h *Handler) Create(
	w http.ResponseWriter,
	r *http.Request,
) {
	var product Product

	if err := json.NewDecoder(r.Body).Decode(&product); err != nil {
		httpresponse.Error(
			w,
			http.StatusBadRequest,
			"invalid request body",
		)
		return
	}

	if product.SKU == "" {
		httpresponse.Error(
			w,
			http.StatusBadRequest,
			"sku is required",
		)
		return
	}

	if product.Name == "" {
		httpresponse.Error(
			w,
			http.StatusBadRequest,
			"name is required",
		)
		return
	}

	if product.SellingPrice < 0 {
		httpresponse.Error(
			w,
			http.StatusBadRequest,
			"selling_price cannot be negative",
		)
		return
	}

	if product.CostPrice < 0 {
		httpresponse.Error(
			w,
			http.StatusBadRequest,
			"cost_price cannot be negative",
		)
		return
	}

	if product.MinimumStock < 0 {
		httpresponse.Error(
			w,
			http.StatusBadRequest,
			"minimum_stock cannot be negative",
		)
		return
	}

	// New products are active by default.
	product.Active = true

	created, err := h.repository.Create(
		r.Context(),
		product,
	)
	if err != nil {
		httpresponse.Error(
			w,
			http.StatusInternalServerError,
			err.Error(),
		)
		return
	}

	httpresponse.JSON(
		w,
		http.StatusCreated,
		created,
	)
}

func (h *Handler) Update(
	w http.ResponseWriter,
	r *http.Request,
) {
	idString := r.PathValue("id")

	id, err := strconv.ParseInt(
		idString,
		10,
		64,
	)
	if err != nil || id <= 0 {
		httpresponse.Error(
			w,
			http.StatusBadRequest,
			"invalid product id",
		)
		return
	}

	var product Product

	if err := json.NewDecoder(
		r.Body,
	).Decode(&product); err != nil {
		httpresponse.Error(
			w,
			http.StatusBadRequest,
			"invalid request body",
		)
		return
	}

	product.ID = id

	if product.SKU == "" {
		httpresponse.Error(
			w,
			http.StatusBadRequest,
			"sku is required",
		)
		return
	}

	if product.Name == "" {
		httpresponse.Error(
			w,
			http.StatusBadRequest,
			"name is required",
		)
		return
	}

	if product.CostPrice < 0 {
		httpresponse.Error(
			w,
			http.StatusBadRequest,
			"cost_price cannot be negative",
		)
		return
	}

	if product.SellingPrice < 0 {
		httpresponse.Error(
			w,
			http.StatusBadRequest,
			"selling_price cannot be negative",
		)
		return
	}

	if product.MinimumStock < 0 {
		httpresponse.Error(
			w,
			http.StatusBadRequest,
			"minimum_stock cannot be negative",
		)
		return
	}

	updated, err := h.repository.Update(
		r.Context(),
		product,
	)
	if err != nil {
		httpresponse.Error(
			w,
			http.StatusInternalServerError,
			err.Error(),
		)
		return
	}

	httpresponse.JSON(
		w,
		http.StatusOK,
		updated,
	)
}

func (h *Handler) Archive(
	w http.ResponseWriter,
	r *http.Request,
) {
	idString := r.PathValue("id")

	id, err := strconv.ParseInt(
		idString,
		10,
		64,
	)
	if err != nil || id <= 0 {
		httpresponse.Error(
			w,
			http.StatusBadRequest,
			"invalid product id",
		)
		return
	}

	if err := h.repository.Archive(
		r.Context(),
		id,
	); err != nil {
		httpresponse.Error(
			w,
			http.StatusInternalServerError,
			err.Error(),
		)
		return
	}

	httpresponse.Message(
		w,
		http.StatusOK,
		"product archived",
	)
}

func (h *Handler) List(
	w http.ResponseWriter,
	r *http.Request,
) {
	products, err := h.repository.List(
		r.Context(),
	)
	if err != nil {
		httpresponse.Error(
			w,
			http.StatusInternalServerError,
			err.Error(),
		)
		return
	}

	if products == nil {
		products = []Product{}
	}

	httpresponse.JSON(
		w,
		http.StatusOK,
		products,
	)
}

func (h *Handler) ListArchived(
	w http.ResponseWriter,
	r *http.Request,
) {
	products, err := h.repository.ListArchived(
		r.Context(),
	)
	if err != nil {
		httpresponse.Error(
			w,
			http.StatusInternalServerError,
			err.Error(),
		)
		return
	}

	if products == nil {
		products = []Product{}
	}

	httpresponse.JSON(
		w,
		http.StatusOK,
		products,
	)
}

func (h *Handler) Restore(
	w http.ResponseWriter,
	r *http.Request,
) {
	idString := r.PathValue("id")

	id, err := strconv.ParseInt(
		idString,
		10,
		64,
	)
	if err != nil || id <= 0 {
		httpresponse.Error(
			w,
			http.StatusBadRequest,
			"invalid product id",
		)
		return
	}

	product, err := h.repository.Restore(
		r.Context(),
		id,
	)
	if err != nil {
		httpresponse.Error(
			w,
			http.StatusNotFound,
			"archived product not found",
		)
		return
	}

	httpresponse.JSON(
		w,
		http.StatusOK,
		product,
	)
}

// ImportCSV imports products from a CSV file.
//
// Expected CSV:
//
// sku,barcode,name,category_id,brand,version,flavor,cost_price,selling_price,minimum_stock
//
// Example:
//
// VAPE-001,480000000001,Juice Box,,Brand A,V2,Strawberry,300,500,5
func (h *Handler) ImportCSV(
	w http.ResponseWriter,
	r *http.Request,
) {
	// Limit upload size to 10 MB.
	r.Body = http.MaxBytesReader(
		w,
		r.Body,
		10<<20,
	)

	if err := r.ParseMultipartForm(10 << 20); err != nil {
		httpresponse.Error(
			w,
			http.StatusBadRequest,
			"invalid multipart form",
		)
		return
	}

	file, _, err := r.FormFile("file")
	if err != nil {
		httpresponse.Error(
			w,
			http.StatusBadRequest,
			"csv file is required",
		)
		return
	}
	defer file.Close()

	reader := csv.NewReader(file)

	reader.TrimLeadingSpace = true
	reader.FieldsPerRecord = -1

	header, err := reader.Read()
	if err != nil {
		httpresponse.Error(
			w,
			http.StatusBadRequest,
			"failed to read csv header",
		)
		return
	}

	columns := make(map[string]int)

	for i, column := range header {
		column = strings.ToLower(strings.TrimSpace(column))
		columns[column] = i
	}

	requiredColumns := []string{
		"sku",
		"name",
		"selling_price",
		"minimum_stock",
	}

	for _, column := range requiredColumns {
		if _, ok := columns[column]; !ok {
			httpresponse.Error(
				w,
				http.StatusBadRequest,
				fmt.Sprintf(
					"missing required csv column: %s",
					column,
				),
			)
			return
		}
	}

	var products []Product

	seenSKUs := make(map[string]struct{})

	rowNumber := 1

	for {
		rowNumber++

		record, err := reader.Read()

		if err == io.EOF {
			break
		}

		if err != nil {
			httpresponse.Error(
				w,
				http.StatusBadRequest,
				fmt.Sprintf(
					"invalid csv at row %d: %v",
					rowNumber,
					err,
				),
			)
			return
		}

		// Skip completely empty rows.
		if isEmptyCSVRow(record) {
			continue
		}

		product, err := parseCSVProduct(
			record,
			columns,
		)
		if err != nil {
			httpresponse.Error(
				w,
				http.StatusBadRequest,
				fmt.Sprintf(
					"row %d: %v",
					rowNumber,
					err,
				),
			)
			return
		}

		sku := strings.TrimSpace(product.SKU)

		if _, exists := seenSKUs[sku]; exists {
			httpresponse.Error(
				w,
				http.StatusBadRequest,
				fmt.Sprintf(
					"row %d: duplicate sku %q in csv",
					rowNumber,
					sku,
				),
			)
			return
		}

		seenSKUs[sku] = struct{}{}

		products = append(
			products,
			product,
		)
	}

	if len(products) == 0 {
		httpresponse.Error(
			w,
			http.StatusBadRequest,
			"csv contains no products",
		)
		return
	}

	imported, err := h.repository.Import(
		r.Context(),
		products,
	)
	if err != nil {
		httpresponse.Error(
			w,
			http.StatusInternalServerError,
			err.Error(),
		)
		return
	}

	httpresponse.JSON(
		w,
		http.StatusCreated,
		ImportResult{
			Imported: imported,
		},
	)
}

func parseCSVProduct(
	record []string,
	columns map[string]int,
) (Product, error) {
	get := func(column string) string {
		index, ok := columns[column]

		if !ok || index >= len(record) {
			return ""
		}

		return strings.TrimSpace(record[index])
	}

	sku := get("sku")

	if sku == "" {
		return Product{}, fmt.Errorf(
			"sku is required",
		)
	}

	name := get("name")

	if name == "" {
		return Product{}, fmt.Errorf(
			"name is required",
		)
	}

	costPrice, err := parseCSVFloat(
		get("cost_price"),
		"cost_price",
	)
	if err != nil {
		return Product{}, err
	}

	sellingPrice, err := parseCSVFloat(
		get("selling_price"),
		"selling_price",
	)
	if err != nil {
		return Product{}, err
	}

	minimumStock, err := parseCSVInt(
		get("minimum_stock"),
		"minimum_stock",
	)
	if err != nil {
		return Product{}, err
	}

	if costPrice < 0 {
		return Product{}, fmt.Errorf(
			"cost_price cannot be negative",
		)
	}

	if sellingPrice < 0 {
		return Product{}, fmt.Errorf(
			"selling_price cannot be negative",
		)
	}

	if minimumStock < 0 {
		return Product{}, fmt.Errorf(
			"minimum_stock cannot be negative",
		)
	}

	product := Product{
		SKU:          sku,
		Name:         name,
		CostPrice:    costPrice,
		SellingPrice: sellingPrice,
		MinimumStock: minimumStock,
		Active:       true,
	}

	if value := get("barcode"); value != "" {
		product.Barcode = stringPtr(value)
	}

	if value := get("category_id"); value != "" {
		categoryID, err := strconv.ParseInt(
			value,
			10,
			64,
		)
		if err != nil || categoryID <= 0 {
			return Product{}, fmt.Errorf(
				"invalid category_id %q",
				value,
			)
		}

		product.CategoryID = int64Ptr(categoryID)
	}

	if value := get("brand"); value != "" {
		product.Brand = stringPtr(value)
	}

	if value := get("version"); value != "" {
		product.Version = stringPtr(value)
	}

	if value := get("flavor"); value != "" {
		product.Flavor = stringPtr(value)
	}

	return product, nil
}

func parseCSVFloat(
	value string,
	field string,
) (float64, error) {
	if value == "" {
		return 0, nil
	}

	result, err := strconv.ParseFloat(
		value,
		64,
	)
	if err != nil {
		return 0, fmt.Errorf(
			"invalid %s %q",
			field,
			value,
		)
	}

	return result, nil
}

func parseCSVInt(
	value string,
	field string,
) (int, error) {
	if value == "" {
		return 0, nil
	}

	result, err := strconv.Atoi(value)
	if err != nil {
		return 0, fmt.Errorf(
			"invalid %s %q",
			field,
			value,
		)
	}

	return result, nil
}

func isEmptyCSVRow(record []string) bool {
	for _, value := range record {
		if strings.TrimSpace(value) != "" {
			return false
		}
	}

	return true
}

func stringPtr(value string) *string {
	return &value
}

func int64Ptr(value int64) *int64 {
	return &value
}
