// /home/jmechavez/Projects/vape-inventory/apps/mobile/src/database/schema.ts
export const createTables = `
-- Users
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY,
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'STAFF',
    created_at TEXT NOT NULL,
    _sync_status TEXT DEFAULT 'synced'
);

-- Suppliers
CREATE TABLE IF NOT EXISTS suppliers (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    contact_person TEXT,
    phone TEXT,
    email TEXT,
    address TEXT,
    created_at TEXT NOT NULL,
    _sync_status TEXT DEFAULT 'synced'
);

-- Products
CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY,
    sku TEXT NOT NULL UNIQUE,
    barcode TEXT,
    name TEXT NOT NULL,
    category_id INTEGER,
    brand TEXT,
    version TEXT,
    flavor TEXT,
    cost_price REAL NOT NULL DEFAULT 0,
    selling_price REAL NOT NULL DEFAULT 0,
    minimum_stock INTEGER NOT NULL DEFAULT 0,
    active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL,
    _sync_status TEXT DEFAULT 'synced'
);

-- Inventory
CREATE TABLE IF NOT EXISTS inventory (
    product_id INTEGER PRIMARY KEY,
    current_stock INTEGER NOT NULL DEFAULT 0,
    updated_at TEXT NOT NULL,
    _sync_status TEXT DEFAULT 'synced',
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

-- Stock Movements
CREATE TABLE IF NOT EXISTS stock_movements (
    id INTEGER PRIMARY KEY,
    product_id INTEGER NOT NULL,
    user_id INTEGER,
    supplier_id INTEGER,
    type TEXT NOT NULL,
    quantity INTEGER NOT NULL,
    reference TEXT,
    notes TEXT,
    movement_date TEXT NOT NULL,
    created_at TEXT NOT NULL,
    _sync_status TEXT DEFAULT 'synced',
    FOREIGN KEY (product_id) REFERENCES products(id)
);

-- Sales
CREATE TABLE IF NOT EXISTS sales (
    id INTEGER PRIMARY KEY,
    reference TEXT NOT NULL UNIQUE,
    user_id INTEGER,
    sale_date TEXT NOT NULL,
    subtotal REAL NOT NULL DEFAULT 0,
    discount REAL NOT NULL DEFAULT 0,
    total REAL NOT NULL DEFAULT 0,
    payment_method TEXT NOT NULL,
    created_at TEXT NOT NULL,
    _sync_status TEXT DEFAULT 'synced',
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Sale Items
CREATE TABLE IF NOT EXISTS sale_items (
    id INTEGER PRIMARY KEY,
    sale_id INTEGER NOT NULL,
    product_id INTEGER NOT NULL,
    quantity INTEGER NOT NULL,
    unit_price REAL NOT NULL,
    subtotal REAL NOT NULL,
    _sync_status TEXT DEFAULT 'synced',
    FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_products_sync ON products(_sync_status);
CREATE INDEX IF NOT EXISTS idx_sales_sync ON sales(_sync_status);
CREATE INDEX IF NOT EXISTS idx_inventory_sync ON inventory(_sync_status);
`;
