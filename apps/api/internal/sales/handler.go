package sales

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
	salesList, err := h.repository.List(
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

	if salesList == nil {
		salesList = []Sale{}
	}

	httpresponse.JSON(
		w,
		http.StatusOK,
		salesList,
	)
}

func (h *Handler) Get(
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
			"invalid sale id",
		)
		return
	}

	sale, err := h.repository.Get(
		r.Context(),
		id,
	)
	if err != nil {
		httpresponse.Error(
			w,
			http.StatusNotFound,
			err.Error(),
		)
		return
	}

	httpresponse.JSON(
		w,
		http.StatusOK,
		sale,
	)
}

func (h *Handler) Create(
	w http.ResponseWriter,
	r *http.Request,
) {
	var request CreateSaleRequest

	if err := json.NewDecoder(
		r.Body,
	).Decode(&request); err != nil {
		httpresponse.Error(
			w,
			http.StatusBadRequest,
			"invalid request body",
		)
		return
	}

	if len(request.Items) == 0 {
		httpresponse.Error(
			w,
			http.StatusBadRequest,
			"sale must contain at least one item",
		)
		return
	}

	if request.PaymentMethod == "" {
		httpresponse.Error(
			w,
			http.StatusBadRequest,
			"payment_method is required",
		)
		return
	}

	if request.Discount < 0 {
		httpresponse.Error(
			w,
			http.StatusBadRequest,
			"discount cannot be negative",
		)
		return
	}

	sale, err := h.repository.Create(
		r.Context(),
		request,
	)
	if err != nil {
		httpresponse.Error(
			w,
			http.StatusBadRequest,
			err.Error(),
		)
		return
	}

	httpresponse.JSON(
		w,
		http.StatusCreated,
		sale,
	)
}
