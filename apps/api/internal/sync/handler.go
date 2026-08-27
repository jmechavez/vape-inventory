// /home/jmechavez/Projects/vape-inventory/apps/api/internal/sync/handler.go
package sync

import (
	"encoding/json"
	"net/http"

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

// Sync handles bidirectional synchronization
func (h *Handler) Sync(w http.ResponseWriter, r *http.Request) {
	var req SyncRequest

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httpresponse.Error(w, http.StatusBadRequest, "invalid request body")
		return
	}

	if req.DeviceID == "" {
		httpresponse.Error(w, http.StatusBadRequest, "device_id is required")
		return
	}

	resp, err := h.repository.Sync(r.Context(), req)
	if err != nil {
		httpresponse.Error(w, http.StatusInternalServerError, err.Error())
		return
	}

	httpresponse.JSON(w, http.StatusOK, resp)
}

// ListDevices returns all sync devices
func (h *Handler) ListDevices(w http.ResponseWriter, r *http.Request) {
	devices, err := h.repository.ListDevices(r.Context())
	if err != nil {
		httpresponse.Error(w, http.StatusInternalServerError, err.Error())
		return
	}

	if devices == nil {
		devices = []DeviceInfo{}
	}

	httpresponse.JSON(w, http.StatusOK, devices)
}

// DeleteDevice removes a device and its sync history
func (h *Handler) DeleteDevice(w http.ResponseWriter, r *http.Request) {
	deviceID := r.PathValue("device_id")

	if deviceID == "" {
		httpresponse.Error(w, http.StatusBadRequest, "device_id is required")
		return
	}

	if err := h.repository.DeleteDevice(r.Context(), deviceID); err != nil {
		httpresponse.Error(w, http.StatusInternalServerError, err.Error())
		return
	}

	httpresponse.Message(w, http.StatusOK, "device deleted")
}
