// /home/jmechavez/Projects/vape-inventory/apps/api/internal/sync/types.go
package sync

import (
	"encoding/json"
	"time"
)

type SyncRequest struct {
	DeviceID   string       `json:"device_id"`
	DeviceName string       `json:"device_name"`
	LastSyncAt string       `json:"last_sync_at"`
	Changes    []SyncChange `json:"changes"`
}

type SyncChange struct {
	Table     string          `json:"table"`
	RecordID  int64           `json:"record_id"`
	Operation string          `json:"operation"` // INSERT, UPDATE, DELETE
	Data      json.RawMessage `json:"data"`
}

type SyncResponse struct {
	Changes     map[string][]map[string]interface{} `json:"changes"`
	NewSyncTime string                              `json:"new_sync_time"`
	DeviceID    string                              `json:"device_id"`
}

type DeviceInfo struct {
	DeviceID   string    `json:"device_id"`
	DeviceName string    `json:"device_name"`
	LastSyncAt time.Time `json:"last_sync_at"`
	CreatedAt  time.Time `json:"created_at"`
}
