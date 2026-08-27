-- /home/jmechavez/Projects/vape-inventory/migrations/002_sync_tables.sql

-- Sync devices table
CREATE TABLE IF NOT EXISTS sync_devices (
    device_id TEXT PRIMARY KEY,
    device_name TEXT,
    last_sync_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sync changes table
CREATE TABLE IF NOT EXISTS sync_changes (
    id BIGSERIAL PRIMARY KEY,
    table_name TEXT NOT NULL,
    record_id BIGINT NOT NULL,
    operation TEXT NOT NULL,
    old_data JSONB,
    new_data JSONB,
    changed_at TIMESTAMPTZ DEFAULT NOW(),
    synced_to_devices TEXT[] DEFAULT '{}'
);

-- Trigger function
CREATE OR REPLACE FUNCTION track_sync_changes() RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        INSERT INTO sync_changes (table_name, record_id, operation, old_data)
        VALUES (TG_TABLE_NAME, OLD.id, 'DELETE', row_to_json(OLD));
        RETURN OLD;
    ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO sync_changes (table_name, record_id, operation, old_data, new_data)
        VALUES (TG_TABLE_NAME, NEW.id, 'UPDATE', row_to_json(OLD), row_to_json(NEW));
        RETURN NEW;
    ELSIF TG_OP = 'INSERT' THEN
        INSERT INTO sync_changes (table_name, record_id, operation, new_data)
        VALUES (TG_TABLE_NAME, NEW.id, 'INSERT', row_to_json(NEW));
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Add triggers to all tables
CREATE TRIGGER track_products_changes
    AFTER INSERT OR UPDATE OR DELETE ON products
    FOR EACH ROW EXECUTE FUNCTION track_sync_changes();

CREATE TRIGGER track_suppliers_changes
    AFTER INSERT OR UPDATE OR DELETE ON suppliers
    FOR EACH ROW EXECUTE FUNCTION track_sync_changes();

CREATE TRIGGER track_inventory_changes
    AFTER INSERT OR UPDATE OR DELETE ON inventory
    FOR EACH ROW EXECUTE FUNCTION track_sync_changes();

CREATE TRIGGER track_sales_changes
    AFTER INSERT OR UPDATE OR DELETE ON sales
    FOR EACH ROW EXECUTE FUNCTION track_sync_changes();

CREATE TRIGGER track_sale_items_changes
    AFTER INSERT OR UPDATE OR DELETE ON sale_items
    FOR EACH ROW EXECUTE FUNCTION track_sync_changes();

CREATE TRIGGER track_stock_movements_changes
    AFTER INSERT OR UPDATE OR DELETE ON stock_movements
    FOR EACH ROW EXECUTE FUNCTION track_sync_changes();

-- Indexes
CREATE INDEX idx_sync_changes_changed_at ON sync_changes(changed_at);
CREATE INDEX idx_sync_changes_table_record ON sync_changes(table_name, record_id);
