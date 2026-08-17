-- migrations/001_initial_schema.sql

CREATE TABLE users (
    id BIGSERIAL PRIMARY KEY,
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'STAFF',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT users_role_valid
        CHECK (role IN ('ADMIN', 'STAFF'))
);

CREATE TABLE suppliers (
    id BIGSERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    contact_person TEXT,
    phone TEXT,
    email TEXT,
    address TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE products (
    id BIGSERIAL PRIMARY KEY,
    sku TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    brand TEXT,
    version TEXT,
    flavor TEXT,
    cost_price NUMERIC(12, 2) NOT NULL DEFAULT 0,
    selling_price NUMERIC(12, 2) NOT NULL DEFAULT 0,
    minimum_stock INTEGER NOT NULL DEFAULT 0,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT products_cost_price_non_negative
        CHECK (cost_price >= 0),

    CONSTRAINT products_selling_price_non_negative
        CHECK (selling_price >= 0),

    CONSTRAINT products_minimum_stock_non_negative
        CHECK (minimum_stock >= 0)
);

CREATE TABLE inventory (
    product_id BIGINT PRIMARY KEY REFERENCES products(id) ON DELETE CASCADE,
    current_stock INTEGER NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT inventory_current_stock_non_negative
        CHECK (current_stock >= 0)
);

CREATE TABLE stock_movements (
    id BIGSERIAL PRIMARY KEY,
    product_id BIGINT NOT NULL REFERENCES products(id),
    user_id BIGINT REFERENCES users(id),
    supplier_id BIGINT REFERENCES suppliers(id),
    type TEXT NOT NULL,
    quantity INTEGER NOT NULL,
    reference TEXT,
    notes TEXT,

    -- When the inventory movement actually happened.
    -- For a SALE, this should match the sale_date.
    movement_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- When the movement was recorded in the system.
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT stock_movements_type_valid
        CHECK (
            type IN (
                'RECEIVE',
                'SALE',
                'DAMAGE',
                'LOSS',
                'ADJUSTMENT',
                'RETURN'
            )
        ),

    CONSTRAINT stock_movements_quantity_non_zero
        CHECK (quantity <> 0)
);

CREATE INDEX idx_stock_movements_product_id
    ON stock_movements(product_id);

CREATE INDEX idx_stock_movements_user_id
    ON stock_movements(user_id);

CREATE INDEX idx_stock_movements_supplier_id
    ON stock_movements(supplier_id);

CREATE INDEX idx_stock_movements_movement_date
    ON stock_movements(movement_date);

CREATE INDEX idx_stock_movements_created_at
    ON stock_movements(created_at);

CREATE TABLE sales (
    id BIGSERIAL PRIMARY KEY,
    reference TEXT NOT NULL UNIQUE,
    user_id BIGINT REFERENCES users(id),
    sale_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    subtotal NUMERIC(12, 2) NOT NULL DEFAULT 0,
    discount NUMERIC(12, 2) NOT NULL DEFAULT 0,
    total NUMERIC(12, 2) NOT NULL DEFAULT 0,
    payment_method TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT sales_subtotal_non_negative
        CHECK (subtotal >= 0),

    CONSTRAINT sales_discount_non_negative
        CHECK (discount >= 0),

    CONSTRAINT sales_total_non_negative
        CHECK (total >= 0),

    CONSTRAINT sales_payment_method_valid
        CHECK (
            payment_method IN (
                'CASH',
                'GCASH',
                'MAYA',
                'MARIBANK',
                'CARD',
                'BANK_TRANSFER'
            )
        )
);

CREATE INDEX idx_sales_sale_date
    ON sales(sale_date);

CREATE INDEX idx_sales_user_id
    ON sales(user_id);

CREATE TABLE sale_items (
    id BIGSERIAL PRIMARY KEY,
    sale_id BIGINT NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
    product_id BIGINT NOT NULL REFERENCES products(id),
    quantity INTEGER NOT NULL,
    unit_price NUMERIC(12, 2) NOT NULL,
    subtotal NUMERIC(12, 2) NOT NULL,

    CONSTRAINT sale_items_quantity_positive
        CHECK (quantity > 0),

    CONSTRAINT sale_items_unit_price_non_negative
        CHECK (unit_price >= 0),

    CONSTRAINT sale_items_subtotal_non_negative
        CHECK (subtotal >= 0)
);

CREATE INDEX idx_sale_items_sale_id
    ON sale_items(sale_id);

CREATE INDEX idx_sale_items_product_id
    ON sale_items(product_id);
