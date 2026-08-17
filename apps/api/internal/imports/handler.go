package imports

import (
	"net/http"

	"github.com/jmechavez/vape-inventory/internal/httpresponse"
)

type Handler struct {
	importer *ProductImporter
}

func NewHandler(importer *ProductImporter) *Handler {
	return &Handler{
		importer: importer,
	}
}

func (h *Handler) Products(
	w http.ResponseWriter,
	r *http.Request,
) {
	file, _, err := r.FormFile("file")
	if err != nil {
		httpresponse.Error(
			w,
			http.StatusBadRequest,
			"CSV file is required",
		)
		return
	}
	defer file.Close()

	count, err := h.importer.Import(
		r.Context(),
		file,
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
		http.StatusOK,
		map[string]any{
			"message": "products imported",
			"count":   count,
		},
	)
}
