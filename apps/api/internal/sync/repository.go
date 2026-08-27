// /home/jmechavez/Projects/vape-inventory/apps/api/internal/sync/repository.go
package sync

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/jmechavez/vape-inventory/internal/products"
	"github.com/jmechavez/vape-inventory/internal/sales"
	"github.com/jmechavez/vape-inventory/internal/suppliers"
)

type Repository struct {
	db *pgxpool.Pool
}

func NewRepository(db *pgxpool.Pool) *Repository {
	return &Repository{
		db: db,
	}
}

// ============================================================
// SYNC
// ============================================================

func (r *Repository) Sync(ctx context.Context, req SyncRequest) (SyncResponse, error) {
	now := time.Now().UTC().Format(time.RFC3339)

	// 1. Apply client changes to server
	if err := r.applyChanges(ctx, req.Changes); err != nil {
		return SyncResponse{}, err
	}

	// 2. Get server changes since client's last sync
	changes, err := r.getChangesSince(ctx, req.LastSyncAt, req.DeviceID)
	if err != nil {
		return SyncResponse{}, err
	}

	// 3. Update device sync status
	if err := r.updateDevice(ctx, req.DeviceID, req.DeviceName, now); err != nil {
		return SyncResponse{}, err
	}

	return SyncResponse{
		Changes:     changes,
		NewSyncTime: now,
		DeviceID:    req.DeviceID,
	}, nil
}

// ============================================================
// APPLY CLIENT CHANGES
// ============================================================

func (r *Repository) applyChanges(ctx context.Context, changes []SyncChange) error {
	if len(changes) == 0 {
		return nil
	}

	tx, err := r.db.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	for _, change := range changes {
		if err := r.applyChange(ctx, tx, change); err != nil {
			return err
		}
	}

	return tx.Commit(ctx)
}

func (r *Repository) applyChange(ctx context.Context, tx pgx.Tx, change SyncChange) error {
	switch change.Table {
	case "products":
		return r.applyProductChange(ctx, tx, change)
	case "suppliers":
		return r.applySupplierChange(ctx, tx, change)
	case "inventory":
		return r.applyInventoryChange(ctx, tx, change)
	case "sales":
		return r.applySaleChange(ctx, tx, change)
	case "sale_items":
		return r.applySaleItemChange(ctx, tx, change)
	case "stock_movements":
		return r.applyStockMovementChange(ctx, tx, change)
	default:
		return fmt.Errorf("unknown table: %s", change.Table)
	}
}

// ============================================================
// PRODUCT CHANGE HANDLERS
// ============================================================

func (r *Repository) applyProductChange(ctx context.Context, tx pgx.Tx, change SyncChange) error {
	switch change.Operation {
	case "INSERT", "UPDATE":
		var p products.Product
		if err := json.Unmarshal(change.Data, &p); err != nil {
			return err
		}

		_, err := tx.Exec(ctx, `
			INSERT INTO products (
				id, sku, barcode, name, category_id,
				brand, version, flavor,
				cost_price, selling_price, minimum_stock, active
			) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
			ON CONFLICT (id) DO UPDATE SET
				sku = EXCLUDED.sku,
				barcode = EXCLUDED.barcode,
				name = EXCLUDED.name,
				category_id = EXCLUDED.category_id,
				brand = EXCLUDED.brand,
				version = EXCLUDED.version,
				flavor = EXCLUDED.flavor,
				cost_price = EXCLUDED.cost_price,
				selling_price = EXCLUDED.selling_price,
				minimum_stock = EXCLUDED.minimum_stock,
				active = EXCLUDED.active
		`,
			p.ID, p.SKU, p.Barcode, p.Name, p.CategoryID,
			p.Brand, p.Version, p.Flavor,
			p.CostPrice, p.SellingPrice, p.MinimumStock, p.Active,
		)
		return err

	case "DELETE":
		_, err := tx.Exec(ctx, "DELETE FROM products WHERE id = $1", change.RecordID)
		return err

	default:
		return fmt.Errorf("unknown operation: %s", change.Operation)
	}
}

// ============================================================
// SUPPLIER CHANGE HANDLERS
// ============================================================

func (r *Repository) applySupplierChange(ctx context.Context, tx pgx.Tx, change SyncChange) error {
	switch change.Operation {
	case "INSERT", "UPDATE":
		var s suppliers.Supplier
		if err := json.Unmarshal(change.Data, &s); err != nil {
			return err
		}

		_, err := tx.Exec(ctx, `
			INSERT INTO suppliers (id, name, contact_person, phone, email, address)
			VALUES ($1, $2, $3, $4, $5, $6)
			ON CONFLICT (id) DO UPDATE SET
				name = EXCLUDED.name,
				contact_person = EXCLUDED.contact_person,
				phone = EXCLUDED.phone,
				email = EXCLUDED.email,
				address = EXCLUDED.address
		`,
			s.ID, s.Name, s.ContactPerson, s.Phone, s.Email, s.Address,
		)
		return err

	case "DELETE":
		_, err := tx.Exec(ctx, "DELETE FROM suppliers WHERE id = $1", change.RecordID)
		return err

	default:
		return fmt.Errorf("unknown operation: %s", change.Operation)
	}
}

// ============================================================
// INVENTORY CHANGE HANDLERS
// ============================================================

func (r *Repository) applyInventoryChange(ctx context.Context, tx pgx.Tx, change SyncChange) error {
	switch change.Operation {
	case "INSERT", "UPDATE":
		var data struct {
			ProductID    int64     `json:"product_id"`
			CurrentStock int       `json:"current_stock"`
			UpdatedAt    time.Time `json:"updated_at"`
		}
		if err := json.Unmarshal(change.Data, &data); err != nil {
			return err
		}

		_, err := tx.Exec(ctx, `
			INSERT INTO inventory (product_id, current_stock, updated_at)
			VALUES ($1, $2, $3)
			ON CONFLICT (product_id) DO UPDATE SET
				current_stock = EXCLUDED.current_stock,
				updated_at = EXCLUDED.updated_at
		`,
			data.ProductID, data.CurrentStock, data.UpdatedAt,
		)
		return err

	case "DELETE":
		_, err := tx.Exec(ctx, "DELETE FROM inventory WHERE product_id = $1", change.RecordID)
		return err

	default:
		return fmt.Errorf("unknown operation: %s", change.Operation)
	}
}

// ============================================================
// SALE CHANGE HANDLERS
// ============================================================

func (r *Repository) applySaleChange(ctx context.Context, tx pgx.Tx, change SyncChange) error {
	switch change.Operation {
	case "INSERT", "UPDATE":
		var s sales.Sale
		if err := json.Unmarshal(change.Data, &s); err != nil {
			return err
		}

		_, err := tx.Exec(ctx, `
			INSERT INTO sales (
				id, reference, user_id, sale_date,
				subtotal, discount, total, payment_method, status
			) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
			ON CONFLICT (id) DO UPDATE SET
				reference = EXCLUDED.reference,
				user_id = EXCLUDED.user_id,
				sale_date = EXCLUDED.sale_date,
				subtotal = EXCLUDED.subtotal,
				discount = EXCLUDED.discount,
				total = EXCLUDED.total,
				payment_method = EXCLUDED.payment_method,
				status = EXCLUDED.status
		`,
			s.ID, s.Reference, s.UserID, s.SaleDate,
			s.Subtotal, s.Discount, s.Total, s.PaymentMethod, s.Status,
		)
		return err

	case "DELETE":
		_, err := tx.Exec(ctx, "DELETE FROM sales WHERE id = $1", change.RecordID)
		return err

	default:
		return fmt.Errorf("unknown operation: %s", change.Operation)
	}
}

// ============================================================
// SALE ITEM CHANGE HANDLERS
// ============================================================

func (r *Repository) applySaleItemChange(ctx context.Context, tx pgx.Tx, change SyncChange) error {
	switch change.Operation {
	case "INSERT", "UPDATE":
		var si sales.SaleItem
		if err := json.Unmarshal(change.Data, &si); err != nil {
			return err
		}

		_, err := tx.Exec(ctx, `
			INSERT INTO sale_items (id, sale_id, product_id, sku, product_name, quantity, unit_price, subtotal)
			VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
			ON CONFLICT (id) DO UPDATE SET
				sale_id = EXCLUDED.sale_id,
				product_id = EXCLUDED.product_id,
				sku = EXCLUDED.sku,
				product_name = EXCLUDED.product_name,
				quantity = EXCLUDED.quantity,
				unit_price = EXCLUDED.unit_price,
				subtotal = EXCLUDED.subtotal
		`,
			si.ID, si.SaleID, si.ProductID, si.SKU, si.ProductName,
			si.Quantity, si.UnitPrice, si.Subtotal,
		)
		return err

	case "DELETE":
		_, err := tx.Exec(ctx, "DELETE FROM sale_items WHERE id = $1", change.RecordID)
		return err

	default:
		return fmt.Errorf("unknown operation: %s", change.Operation)
	}
}

// ============================================================
// STOCK MOVEMENT CHANGE HANDLERS
// ============================================================

func (r *Repository) applyStockMovementChange(ctx context.Context, tx pgx.Tx, change SyncChange) error {
	switch change.Operation {
	case "INSERT", "UPDATE":
		var data struct {
			ID           int64     `json:"id"`
			ProductID    int64     `json:"product_id"`
			UserID       *int64    `json:"user_id"`
			SupplierID   *int64    `json:"supplier_id"`
			Type         string    `json:"type"`
			Quantity     int       `json:"quantity"`
			UnitCost     *float64  `json:"unit_cost"`
			Reference    *string   `json:"reference"`
			Notes        *string   `json:"notes"`
			MovementDate time.Time `json:"movement_date"`
			CreatedAt    time.Time `json:"created_at"`
		}
		if err := json.Unmarshal(change.Data, &data); err != nil {
			return err
		}

		_, err := tx.Exec(ctx, `
			INSERT INTO stock_movements (
				id, product_id, user_id, supplier_id, type,
				quantity, unit_cost, reference, notes, movement_date, created_at
			) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
			ON CONFLICT (id) DO UPDATE SET
				product_id = EXCLUDED.product_id,
				user_id = EXCLUDED.user_id,
				supplier_id = EXCLUDED.supplier_id,
				type = EXCLUDED.type,
				quantity = EXCLUDED.quantity,
				unit_cost = EXCLUDED.unit_cost,
				reference = EXCLUDED.reference,
				notes = EXCLUDED.notes,
				movement_date = EXCLUDED.movement_date
		`,
			data.ID, data.ProductID, data.UserID, data.SupplierID, data.Type,
			data.Quantity, data.UnitCost, data.Reference, data.Notes,
			data.MovementDate, data.CreatedAt,
		)
		return err

	case "DELETE":
		_, err := tx.Exec(ctx, "DELETE FROM stock_movements WHERE id = $1", change.RecordID)
		return err

	default:
		return fmt.Errorf("unknown operation: %s", change.Operation)
	}
}

// ============================================================
// GET SERVER CHANGES
// ============================================================

func (r *Repository) getChangesSince(ctx context.Context, since string, deviceID string) (map[string][]map[string]interface{}, error) {
	result := make(map[string][]map[string]interface{})

	if since == "" {
		since = "1970-01-01T00:00:00Z"
	}

	rows, err := r.db.Query(ctx, `
		SELECT
			table_name,
			record_id,
			operation,
			COALESCE(new_data, old_data) AS data
		FROM sync_changes
		WHERE changed_at > $1
		  AND NOT ($2 = ANY(synced_to_devices))
		ORDER BY changed_at
	`, since, deviceID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	for rows.Next() {
		var tableName string
		var recordID int64
		var operation string
		var data []byte

		if err := rows.Scan(&tableName, &recordID, &operation, &data); err != nil {
			return nil, err
		}

		var record map[string]interface{}
		if err := json.Unmarshal(data, &record); err != nil {
			continue
		}

		record["_sync_operation"] = operation

		if _, exists := result[tableName]; !exists {
			result[tableName] = []map[string]interface{}{}
		}
		result[tableName] = append(result[tableName], record)
	}

	if err := rows.Err(); err != nil {
		return nil, err
	}

	// Mark changes as synced to this device
	_, err = r.db.Exec(ctx, `
		UPDATE sync_changes
		SET synced_to_devices = array_append(synced_to_devices, $1)
		WHERE changed_at > $2
		  AND NOT ($1 = ANY(synced_to_devices))
	`, deviceID, since)

	return result, err
}

// ============================================================
// DEVICE MANAGEMENT
// ============================================================

func (r *Repository) updateDevice(ctx context.Context, deviceID, deviceName, syncTime string) error {
	_, err := r.db.Exec(ctx, `
		INSERT INTO sync_devices (device_id, device_name, last_sync_at)
		VALUES ($1, $2, $3)
		ON CONFLICT (device_id) DO UPDATE SET
			device_name = EXCLUDED.device_name,
			last_sync_at = EXCLUDED.last_sync_at
	`, deviceID, deviceName, syncTime)

	return err
}

func (r *Repository) ListDevices(ctx context.Context) ([]DeviceInfo, error) {
	rows, err := r.db.Query(ctx, `
		SELECT device_id, device_name, last_sync_at, created_at
		FROM sync_devices
		ORDER BY last_sync_at DESC
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var devices []DeviceInfo
	for rows.Next() {
		var d DeviceInfo
		if err := rows.Scan(&d.DeviceID, &d.DeviceName, &d.LastSyncAt, &d.CreatedAt); err != nil {
			return nil, err
		}
		devices = append(devices, d)
	}

	if err := rows.Err(); err != nil {
		return nil, err
	}

	return devices, nil
}

func (r *Repository) DeleteDevice(ctx context.Context, deviceID string) error {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	// Remove device from sync histories
	_, err = tx.Exec(ctx, `
		UPDATE sync_changes
		SET synced_to_devices = array_remove(synced_to_devices, $1)
	`, deviceID)
	if err != nil {
		return err
	}

	// Delete device
	_, err = tx.Exec(ctx, "DELETE FROM sync_devices WHERE device_id = $1", deviceID)
	if err != nil {
		return err
	}

	return tx.Commit(ctx)
}
