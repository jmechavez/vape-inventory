package inventory

import (
	"encoding/json"
	"net/http"
	"strconv"
)

type Handler struct {
	repository *Repository
}

func NewHandler(repository *Repository) *Handler {
	return &Handler{
		repository: repository,
	}
}

func (h *Handler) Receive(
	w http.ResponseWriter,
	r *http.Request,
) {
	var request ReceiveStockRequest

	if err := json.NewDecoder(
		r.Body,
	).Decode(&request); err != nil {
		http.Error(
			w,
			"invalid request body",
			http.StatusBadRequest,
		)
		return
	}

	if request.ProductID <= 0 {
		http.Error(
			w,
			"product_id is required",
			http.StatusBadRequest,
		)
		return
	}

	if request.Quantity <= 0 {
		http.Error(
			w,
			"quantity must be greater than zero",
			http.StatusBadRequest,
		)
		return
	}

	if request.UnitCost != nil &&
		*request.UnitCost < 0 {
		http.Error(
			w,
			"unit_cost cannot be negative",
			http.StatusBadRequest,
		)
		return
	}

	movement, err := h.repository.Receive(
		r.Context(),
		request,
	)
	if err != nil {
		http.Error(
			w,
			err.Error(),
			http.StatusBadRequest,
		)
		return
	}

	w.Header().Set(
		"Content-Type",
		"application/json",
	)

	w.WriteHeader(http.StatusCreated)

	_ = json.NewEncoder(w).Encode(
		movement,
	)
}

func (h *Handler) List(
	w http.ResponseWriter,
	r *http.Request,
) {
	items, err := h.repository.List(
		r.Context(),
	)
	if err != nil {
		http.Error(
			w,
			err.Error(),
			http.StatusInternalServerError,
		)
		return
	}

	if items == nil {
		items = []InventoryItem{}
	}

	w.Header().Set(
		"Content-Type",
		"application/json",
	)

	if err := json.NewEncoder(w).Encode(
		items,
	); err != nil {
		return
	}
}

func (h *Handler) Sale(
	w http.ResponseWriter,
	r *http.Request,
) {
	var request SaleStockRequest

	if err := json.NewDecoder(
		r.Body,
	).Decode(&request); err != nil {
		http.Error(
			w,
			"invalid request body",
			http.StatusBadRequest,
		)
		return
	}

	if request.ProductID <= 0 {
		http.Error(
			w,
			"product_id is required",
			http.StatusBadRequest,
		)
		return
	}

	if request.Quantity <= 0 {
		http.Error(
			w,
			"quantity must be greater than zero",
			http.StatusBadRequest,
		)
		return
	}

	if err := h.repository.Sale(
		r.Context(),
		request,
	); err != nil {
		http.Error(
			w,
			err.Error(),
			http.StatusBadRequest,
		)
		return
	}

	w.Header().Set(
		"Content-Type",
		"application/json",
	)

	w.WriteHeader(http.StatusCreated)

	_, _ = w.Write(
		[]byte(`{"message":"sale recorded"}`),
	)
}

// Adjustment manually increases or decreases stock.
func (h *Handler) Adjustment(
	w http.ResponseWriter,
	r *http.Request,
) {
	var request AdjustmentStockRequest

	if err := json.NewDecoder(
		r.Body,
	).Decode(&request); err != nil {
		http.Error(
			w,
			"invalid request body",
			http.StatusBadRequest,
		)
		return
	}

	if request.ProductID <= 0 {
		http.Error(
			w,
			"product_id is required",
			http.StatusBadRequest,
		)
		return
	}

	if request.Quantity == 0 {
		http.Error(
			w,
			"quantity cannot be zero",
			http.StatusBadRequest,
		)
		return
	}

	if err := h.repository.Adjustment(
		r.Context(),
		request,
	); err != nil {
		http.Error(
			w,
			err.Error(),
			http.StatusBadRequest,
		)
		return
	}

	w.Header().Set(
		"Content-Type",
		"application/json",
	)

	w.WriteHeader(http.StatusCreated)

	_, _ = w.Write(
		[]byte(`{"message":"stock adjusted"}`),
	)
}

func (h *Handler) ListMovements(
	w http.ResponseWriter,
	r *http.Request,
) {
	page := 1
	limit := 20

	if value := r.URL.Query().Get("page"); value != "" {
		parsed, err := strconv.Atoi(value)
		if err != nil || parsed < 1 {
			http.Error(
				w,
				"page must be a positive integer",
				http.StatusBadRequest,
			)
			return
		}

		page = parsed
	}

	if value := r.URL.Query().Get("limit"); value != "" {
		parsed, err := strconv.Atoi(value)
		if err != nil || parsed < 1 {
			http.Error(
				w,
				"limit must be a positive integer",
				http.StatusBadRequest,
			)
			return
		}

		if parsed > 100 {
			http.Error(
				w,
				"limit cannot exceed 100",
				http.StatusBadRequest,
			)
			return
		}

		limit = parsed
	}

	request := ListMovementsRequest{
		Type:   r.URL.Query().Get("type"),
		Page:   page,
		Limit:  limit,
		Offset: (page - 1) * limit,
	}

	movements, total, err := h.repository.ListMovements(
		r.Context(),
		request,
	)
	if err != nil {
		http.Error(
			w,
			err.Error(),
			http.StatusInternalServerError,
		)
		return
	}

	totalPages := 0

	if total > 0 {
		totalPages = (total + limit - 1) / limit
	}

	if movements == nil {
		movements = []StockMovement{}
	}

	response := MovementListResponse{
		Items:      movements,
		Page:       page,
		Limit:      limit,
		Total:      total,
		TotalPages: totalPages,
	}

	w.Header().Set(
		"Content-Type",
		"application/json",
	)

	if err := json.NewEncoder(w).Encode(
		response,
	); err != nil {
		return
	}
}

// Damage records damaged inventory.
func (h *Handler) Damage(
	w http.ResponseWriter,
	r *http.Request,
) {
	var request DamageStockRequest

	if err := json.NewDecoder(
		r.Body,
	).Decode(&request); err != nil {
		http.Error(
			w,
			"invalid request body",
			http.StatusBadRequest,
		)
		return
	}

	if request.ProductID <= 0 {
		http.Error(
			w,
			"product_id is required",
			http.StatusBadRequest,
		)
		return
	}

	if request.Quantity <= 0 {
		http.Error(
			w,
			"quantity must be greater than zero",
			http.StatusBadRequest,
		)
		return
	}

	if err := h.repository.Damage(
		r.Context(),
		request,
	); err != nil {
		http.Error(
			w,
			err.Error(),
			http.StatusBadRequest,
		)
		return
	}

	w.Header().Set(
		"Content-Type",
		"application/json",
	)

	w.WriteHeader(http.StatusCreated)

	_, _ = w.Write(
		[]byte(`{"message":"damage recorded"}`),
	)
}

// Return records returned inventory.
func (h *Handler) Return(
	w http.ResponseWriter,
	r *http.Request,
) {
	var request ReturnStockRequest

	if err := json.NewDecoder(
		r.Body,
	).Decode(&request); err != nil {
		http.Error(
			w,
			"invalid request body",
			http.StatusBadRequest,
		)
		return
	}

	if request.ProductID <= 0 {
		http.Error(
			w,
			"product_id is required",
			http.StatusBadRequest,
		)
		return
	}

	if request.Quantity <= 0 {
		http.Error(
			w,
			"quantity must be greater than zero",
			http.StatusBadRequest,
		)
		return
	}

	if err := h.repository.Return(
		r.Context(),
		request,
	); err != nil {
		http.Error(
			w,
			err.Error(),
			http.StatusBadRequest,
		)
		return
	}

	w.Header().Set(
		"Content-Type",
		"application/json",
	)

	w.WriteHeader(http.StatusCreated)

	_, _ = w.Write(
		[]byte(`{"message":"return recorded"}`),
	)
}
