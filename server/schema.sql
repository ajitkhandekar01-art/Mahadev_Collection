-- Database schema for Mahadev Collection

CREATE TABLE IF NOT EXISTS shop_settings (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  name TEXT NOT NULL,
  whatsapp TEXT NOT NULL,
  phones TEXT NOT NULL DEFAULT '[]',
  city TEXT NOT NULL,
  address TEXT NOT NULL,
  map_query TEXT,
  map_link TEXT,
  opening_hours TEXT,
  instagram TEXT,
  facebook TEXT,
  upi_id TEXT,
  return_policy TEXT
);

CREATE TABLE IF NOT EXISTS categories (
  slug TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category_slug TEXT NOT NULL,
  price REAL NULL CHECK (price IS NULL OR price >= 0),
  mrp REAL NULL CHECK (mrp IS NULL OR mrp >= 0),
  sizes TEXT NOT NULL DEFAULT '[]',
  colors TEXT NOT NULL DEFAULT '[]',
  description TEXT,
  image_url TEXT,
  extra_images TEXT NOT NULL DEFAULT '[]',
  is_new INTEGER NOT NULL DEFAULT 0 CHECK (is_new IN (0, 1)),
  tag TEXT,
  is_landscape INTEGER NOT NULL DEFAULT 0 CHECK (is_landscape IN (0, 1)),
  in_stock INTEGER NOT NULL DEFAULT 1 CHECK (in_stock IN (0, 1)),
  is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
  sort_order INTEGER DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (category_slug) REFERENCES categories(slug) ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  customer_name TEXT NOT NULL,
  mobile TEXT NOT NULL,
  address TEXT,
  city TEXT,
  delivery_type TEXT,
  note TEXT,
  total_items INTEGER NOT NULL CHECK (total_items >= 1),
  total_amount REAL NULL CHECK (total_amount IS NULL OR total_amount >= 0),
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'confirmed', 'delivered', 'cancelled'))
);

CREATE TABLE IF NOT EXISTS order_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id TEXT NOT NULL,
  product_id TEXT NOT NULL,
  product_name TEXT NOT NULL,
  size TEXT,
  colour TEXT,
  qty INTEGER NOT NULL CHECK (qty >= 1 AND qty <= 50),
  unit_price REAL NULL CHECK (unit_price IS NULL OR unit_price >= 0),
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS admin_users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  salt TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_slug);
CREATE INDEX IF NOT EXISTS idx_products_active ON products(is_active);
CREATE INDEX IF NOT EXISTS idx_orders_created ON orders(created_at);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);

