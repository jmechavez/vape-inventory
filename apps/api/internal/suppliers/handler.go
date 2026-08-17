package suppliers

import (
	"encoding/json"
	"net/http"
	"strconv"

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

func (h *Handler) List(
	w http.ResponseWriter,
	r *http.Request,
) {
	suppliers, err := h.repository.List(
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

	if suppliers == nil {
		suppliers = []Supplier{}
	}

	httpresponse.JSON(
		w,
		http.StatusOK,
		suppliers,
	)
}

func (h *Handler) Create(
	w http.ResponseWriter,
	r *http.Request,
) {
	var supplier Supplier

	if err := json.NewDecoder(
		r.Body,
	).Decode(&supplier); err != nil {
		httpresponse.Error(
			w,
			http.StatusBadRequest,
			"invalid request body",
		)
		return
	}

	if supplier.Name == "" {
		httpresponse.Error(
			w,
			http.StatusBadRequest,
			"name is required",
		)
		return
	}

	created, err := h.repository.Create(
		r.Context(),
		supplier,
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
			"invalid supplier id",
		)
		return
	}

	var supplier Supplier

	if err := json.NewDecoder(
		r.Body,
	).Decode(&supplier); err != nil {
		httpresponse.Error(
			w,
			http.StatusBadRequest,
			"invalid request body",
		)
		return
	}

	if supplier.Name == "" {
		httpresponse.Error(
			w,
			http.StatusBadRequest,
			"name is required",
		)
		return
	}

	updated, err := h.repository.Update(
		r.Context(),
		id,
		supplier,
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

func (h *Handler) Delete(
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
			"invalid supplier id",
		)
		return
	}

	if err := h.repository.Delete(
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
		"supplier deleted",
	)
}
