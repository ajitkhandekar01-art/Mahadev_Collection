const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const os = require('os');
const crypto = require('crypto');
const multer = require('multer');
const rateLimit = require('express-rate-limit');
const db = require('../db');
const { verifyPassword, requireAdmin } = require('../auth');

// Rate limiter for login: 10 attempts per 15 minutes
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Too many login attempts. Please try again after 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false
});

// Configure multer storage for image uploads
const uploadDir = path.join(__dirname, '..', '..', 'images', 'products');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const safeName = 'p-' + Date.now() + '-' + crypto.randomBytes(4).toString('hex') + ext;
    cb(null, safeName);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2 MB max
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!['.jpg', '.jpeg', '.png', '.webp'].includes(ext)) {
      return cb(new Error('Only JPG, PNG and WebP images are allowed.'));
    }
    cb(null, true);
  }
});

function verifyImageMagicBytes(filePath) {
  try {
    const fd = fs.openSync(filePath, 'r');
    const buffer = Buffer.alloc(12);
    const bytesRead = fs.readSync(fd, buffer, 0, 12, 0);
    fs.closeSync(fd);
    if (bytesRead < 4) return null;

    // JPEG: FF D8 FF
    if (buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF) return 'jpg';
    // PNG: 89 50 4E 47 0D 0A 1A 0A
    if (bytesRead >= 8 &&
        buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47 &&
        buffer[4] === 0x0D && buffer[5] === 0x0A && buffer[6] === 0x1A && buffer[7] === 0x0A) {
      return 'png';
    }
    // WEBP: RIFF .... WEBP
    if (bytesRead >= 12 &&
        buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46 &&
        buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50) {
      return 'webp';
    }
    return null;
  } catch (e) {
    return null;
  }
}

function uniqueSlug(name) {
  let base = String(name || '').toLowerCase().trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'product';
  let slug = base;
  let counter = 2;
  const checkStmt = db.prepare('SELECT id FROM products WHERE id = ?');
  while (checkStmt.get(slug)) {
    slug = `${base}-${counter}`;
    counter++;
  }
  return slug;
}

function formatProduct(row) {
  if (!row) return null;
  let sizes = [];
  try { sizes = JSON.parse(row.sizes || '[]'); } catch (e) { sizes = []; }
  let colors = [];
  try { colors = JSON.parse(row.colors || '[]'); } catch (e) { colors = []; }
  let extra_images = [];
  try { extra_images = JSON.parse(row.extra_images || '[]'); } catch (e) { extra_images = []; }

  return {
    id: row.id,
    name: row.name,
    cat: row.category_slug,
    category_slug: row.category_slug,
    price: row.price,
    mrp: row.mrp,
    sizes,
    colors,
    desc: row.description || '',
    description: row.description || '',
    img: row.image_url || '',
    image_url: row.image_url || '',
    extra_images,
    isNew: Boolean(row.is_new),
    is_new: row.is_new,
    tag: row.tag || '',
    land: Boolean(row.is_landscape),
    is_landscape: row.is_landscape,
    in_stock: row.in_stock,
    is_active: row.is_active,
    sort_order: row.sort_order,
    created_at: row.created_at,
    updated_at: row.updated_at
  };
}

// ---------------- AUTH ROUTES ----------------

// POST /api/admin/login
router.post('/login', loginLimiter, (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  const user = db.prepare('SELECT * FROM admin_users WHERE email = ?').get(String(email).trim().toLowerCase());
  if (!user || !verifyPassword(String(password), user.salt, user.password_hash)) {
    return res.status(401).json({ error: 'Invalid email or password.' });
  }

  req.session.adminUser = {
    id: user.id,
    email: user.email
  };

  return res.json({
    success: true,
    user: req.session.adminUser
  });
});

// POST /api/admin/logout
router.post('/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) {
      console.error('Session destroy error:', err);
    }
    res.clearCookie('connect.sid');
    return res.json({ success: true, message: 'Logged out successfully.' });
  });
});

// GET /api/admin/me
router.get('/me', (req, res) => {
  if (req.session && req.session.adminUser) {
    return res.json({ loggedIn: true, user: req.session.adminUser });
  }
  return res.json({ loggedIn: false, user: null });
});

// Protect all following routes with requireAdmin middleware
router.use(requireAdmin);

// ---------------- PRODUCT ROUTES ----------------

// GET /api/admin/products
router.get('/products', (req, res) => {
  try {
    const rows = db.prepare('SELECT * FROM products ORDER BY sort_order ASC, rowid ASC').all();
    res.json(rows.map(formatProduct));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/admin/products
router.post('/products', (req, res) => {
  try {
    const b = req.body || {};
    const name = String(b.name || '').trim();
    if (!name) {
      return res.status(400).json({ error: 'Product name is required.' });
    }

    const category_slug = String(b.category_slug || b.cat || 'men').trim();
    const slug = b.id ? String(b.id).trim() : uniqueSlug(name);

    // Parse sizes & colors (can come as array or comma-separated string)
    const sizes = Array.isArray(b.sizes)
      ? b.sizes
      : String(b.sizes || '').split(',').map(s => s.trim()).filter(Boolean);
    const colors = Array.isArray(b.colors)
      ? b.colors
      : String(b.colors || '').split(',').map(s => s.trim()).filter(Boolean);

    const price = (b.price !== '' && b.price !== null && !isNaN(Number(b.price))) ? Number(b.price) : null;
    const mrp = (b.mrp !== '' && b.mrp !== null && !isNaN(Number(b.mrp))) ? Number(b.mrp) : null;
    const is_new = b.is_new || b.isNew ? 1 : 0;
    const is_landscape = b.is_landscape || b.land ? 1 : 0;
    const in_stock = b.in_stock !== undefined ? (b.in_stock ? 1 : 0) : 1;
    const is_active = b.is_active !== undefined ? (b.is_active ? 1 : 0) : 1;
    const sort_order = parseInt(b.sort_order, 10) || 0;
    const image_url = String(b.image_url || b.img || '').trim();
    const description = String(b.description || b.desc || '').trim();
    const tag = String(b.tag || '').trim();

    const stmt = db.prepare(`
      INSERT INTO products (
        id, name, category_slug, price, mrp, sizes, colors,
        description, image_url, extra_images, is_new, tag,
        is_landscape, in_stock, is_active, sort_order, created_at, updated_at
      ) VALUES (
        @id, @name, @category_slug, @price, @mrp, @sizes, @colors,
        @description, @image_url, '[]', @is_new, @tag,
        @is_landscape, @in_stock, @is_active, @sort_order, datetime('now'), datetime('now')
      )
    `);

    stmt.run({
      id: slug,
      name,
      category_slug,
      price,
      mrp,
      sizes: JSON.stringify(sizes),
      colors: JSON.stringify(colors),
      description,
      image_url,
      is_new,
      tag,
      is_landscape,
      in_stock,
      is_active,
      sort_order
    });

    const newProd = db.prepare('SELECT * FROM products WHERE id = ?').get(slug);
    res.status(201).json(formatProduct(newProd));
  } catch (err) {
    console.error('Error creating product:', err);
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/admin/products/:id
router.put('/products/:id', (req, res) => {
  try {
    const { id } = req.params;
    const existing = db.prepare('SELECT * FROM products WHERE id = ?').get(id);
    if (!existing) {
      return res.status(404).json({ error: 'Product not found.' });
    }

    const b = req.body || {};
    const name = b.name !== undefined ? String(b.name).trim() : existing.name;
    const category_slug = b.category_slug || b.cat || existing.category_slug;

    const sizes = b.sizes !== undefined
      ? (Array.isArray(b.sizes) ? b.sizes : String(b.sizes).split(',').map(s => s.trim()).filter(Boolean))
      : JSON.parse(existing.sizes || '[]');

    const colors = b.colors !== undefined
      ? (Array.isArray(b.colors) ? b.colors : String(b.colors).split(',').map(s => s.trim()).filter(Boolean))
      : JSON.parse(existing.colors || '[]');

    const price = b.price !== undefined
      ? ((b.price !== '' && b.price !== null && !isNaN(Number(b.price))) ? Number(b.price) : null)
      : existing.price;

    const mrp = b.mrp !== undefined
      ? ((b.mrp !== '' && b.mrp !== null && !isNaN(Number(b.mrp))) ? Number(b.mrp) : null)
      : existing.mrp;

    const is_new = b.is_new !== undefined ? (b.is_new ? 1 : 0) : (b.isNew !== undefined ? (b.isNew ? 1 : 0) : existing.is_new);
    const is_landscape = b.is_landscape !== undefined ? (b.is_landscape ? 1 : 0) : (b.land !== undefined ? (b.land ? 1 : 0) : existing.is_landscape);
    const in_stock = b.in_stock !== undefined ? (b.in_stock ? 1 : 0) : existing.in_stock;
    const is_active = b.is_active !== undefined ? (b.is_active ? 1 : 0) : existing.is_active;
    const sort_order = b.sort_order !== undefined ? parseInt(b.sort_order, 10) : existing.sort_order;
    const image_url = b.image_url !== undefined ? String(b.image_url).trim() : (b.img !== undefined ? String(b.img).trim() : existing.image_url);
    const description = b.description !== undefined ? String(b.description).trim() : (b.desc !== undefined ? String(b.desc).trim() : existing.description);
    const tag = b.tag !== undefined ? String(b.tag).trim() : existing.tag;

    const stmt = db.prepare(`
      UPDATE products SET
        name = @name,
        category_slug = @category_slug,
        price = @price,
        mrp = @mrp,
        sizes = @sizes,
        colors = @colors,
        description = @description,
        image_url = @image_url,
        is_new = @is_new,
        tag = @tag,
        is_landscape = @is_landscape,
        in_stock = @in_stock,
        is_active = @is_active,
        sort_order = @sort_order,
        updated_at = datetime('now')
      WHERE id = @id
    `);

    stmt.run({
      id,
      name,
      category_slug,
      price,
      mrp,
      sizes: JSON.stringify(sizes),
      colors: JSON.stringify(colors),
      description,
      image_url,
      is_new,
      tag,
      is_landscape,
      in_stock,
      is_active,
      sort_order
    });

    const updated = db.prepare('SELECT * FROM products WHERE id = ?').get(id);
    res.json(formatProduct(updated));
  } catch (err) {
    console.error('Error updating product:', err);
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/admin/products/:id
router.delete('/products/:id', (req, res) => {
  try {
    const { id } = req.params;
    const resDel = db.prepare('DELETE FROM products WHERE id = ?').run(id);
    if (resDel.changes === 0) {
      return res.status(404).json({ error: 'Product not found.' });
    }
    res.json({ success: true, message: 'Product deleted.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/admin/products/:id/toggle-stock
router.patch('/products/:id/toggle-stock', (req, res) => {
  try {
    const { id } = req.params;
    const p = db.prepare('SELECT in_stock FROM products WHERE id = ?').get(id);
    if (!p) return res.status(404).json({ error: 'Product not found' });
    const nextVal = p.in_stock ? 0 : 1;
    db.prepare("UPDATE products SET in_stock = ?, updated_at = datetime('now') WHERE id = ?").run(nextVal, id);
    res.json({ success: true, in_stock: nextVal });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/admin/products/:id/toggle-active
router.patch('/products/:id/toggle-active', (req, res) => {
  try {
    const { id } = req.params;
    const p = db.prepare('SELECT is_active FROM products WHERE id = ?').get(id);
    if (!p) return res.status(404).json({ error: 'Product not found' });
    const nextVal = p.is_active ? 0 : 1;
    db.prepare("UPDATE products SET is_active = ?, updated_at = datetime('now') WHERE id = ?").run(nextVal, id);
    res.json({ success: true, is_active: nextVal });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/admin/upload (Image upload with multer and magic byte check)
router.post('/upload', (req, res) => {
  upload.single('image')(req, res, err => {
    if (err) {
      return res.status(400).json({ error: err.message });
    }
    if (!req.file) {
      return res.status(400).json({ error: 'No image file uploaded.' });
    }

    // Verify real file type using magic bytes
    const realType = verifyImageMagicBytes(req.file.path);
    if (!realType) {
      // Discard invalid file
      try { fs.unlinkSync(req.file.path); } catch (e) {}
      return res.status(400).json({ error: 'File is not a valid image format (JPG, PNG, WebP).' });
    }

    const relativeUrl = `images/products/${req.file.filename}`;
    return res.json({
      success: true,
      image_url: relativeUrl,
      filename: req.file.filename
    });
  });
});

// ---------------- ORDER ROUTES ----------------

// GET /api/admin/orders (with items, newest first, optional ?status=)
router.get('/orders', (req, res) => {
  try {
    const { status } = req.query;
    let sql = 'SELECT * FROM orders';
    const params = [];
    if (status && status !== 'all') {
      sql += ' WHERE status = ?';
      params.push(status);
    }
    sql += ' ORDER BY created_at DESC';

    const orders = db.prepare(sql).all(...params);
    const itemStmt = db.prepare('SELECT * FROM order_items WHERE order_id = ?');

    const result = orders.map(ord => ({
      ...ord,
      items: itemStmt.all(ord.id)
    }));

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/admin/orders/:id/status
router.patch('/orders/:id/status', (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body || {};
    if (!['new', 'confirmed', 'delivered', 'cancelled'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status value.' });
    }

    const result = db.prepare('UPDATE orders SET status = ? WHERE id = ?').run(status, id);
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Order not found.' });
    }

    res.json({ success: true, status });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/orders/export (CSV export)
router.get('/orders/export', (req, res) => {
  try {
    const orders = db.prepare('SELECT * FROM orders ORDER BY created_at DESC').all();
    const itemStmt = db.prepare('SELECT * FROM order_items WHERE order_id = ?');

    const csvEscape = s => {
      if (s === null || s === undefined) return '""';
      const str = String(s).replace(/"/g, '""');
      return `"${str}"`;
    };

    const headers = [
      'Order ID', 'Date & Time', 'Customer Name', 'Mobile',
      'City', 'Address', 'Delivery Type', 'Items Summary',
      'Total Items', 'Total Amount', 'Status', 'Note'
    ];

    const rows = [headers.join(',')];

    for (const ord of orders) {
      const items = itemStmt.all(ord.id);
      const itemsSummary = items
        .map(i => `${i.product_name} (${[i.size, i.colour].filter(Boolean).join('/') || 'default'}) x${i.qty} @ ${i.unit_price ? 'Rs.' + i.unit_price : 'Ask'}`)
        .join('; ');

      rows.push([
        csvEscape(ord.id),
        csvEscape(ord.created_at),
        csvEscape(ord.customer_name),
        csvEscape(ord.mobile),
        csvEscape(ord.city),
        csvEscape(ord.address),
        csvEscape(ord.delivery_type),
        csvEscape(itemsSummary),
        ord.total_items,
        ord.total_amount !== null ? ord.total_amount : 'TBC',
        csvEscape(ord.status),
        csvEscape(ord.note)
      ].join(','));
    }

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="mahadev-orders.csv"');
    return res.send(rows.join('\r\n'));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------- SETTINGS ROUTES ----------------

// GET /api/admin/settings
router.get('/settings', (req, res) => {
  try {
    const row = db.prepare('SELECT * FROM shop_settings WHERE id = 1').get();
    let phones = [];
    try { phones = JSON.parse(row.phones || '[]'); } catch (e) { phones = []; }
    res.json({
      ...row,
      phones
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/admin/settings
router.put('/settings', (req, res) => {
  try {
    const b = req.body || {};
    const name = String(b.name || '').trim();
    const whatsapp = String(b.whatsapp || '').trim();
    if (!name || !whatsapp) {
      return res.status(400).json({ error: 'Shop name and WhatsApp number are required.' });
    }

    const phones = Array.isArray(b.phones)
      ? b.phones
      : String(b.phones || '').split(',').map(s => s.trim()).filter(Boolean);

    const stmt = db.prepare(`
      UPDATE shop_settings SET
        name = @name,
        whatsapp = @whatsapp,
        phones = @phones,
        city = @city,
        address = @address,
        map_query = @map_query,
        map_link = @map_link,
        opening_hours = @opening_hours,
        instagram = @instagram,
        facebook = @facebook,
        upi_id = @upi_id,
        return_policy = @return_policy
      WHERE id = 1
    `);

    stmt.run({
      name,
      whatsapp,
      phones: JSON.stringify(phones),
      city: String(b.city || '').trim(),
      address: String(b.address || '').trim(),
      map_query: String(b.map_query || b.mapQuery || '').trim(),
      map_link: String(b.map_link || '').trim(),
      opening_hours: String(b.opening_hours || '').trim(),
      instagram: String(b.instagram || '').trim(),
      facebook: String(b.facebook || '').trim(),
      upi_id: String(b.upi_id || '').trim(),
      return_policy: String(b.return_policy || '').trim()
    });

    res.json({ success: true, message: 'Settings updated successfully.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------- BACKUP ROUTE ----------------

// GET /api/admin/backup
router.get('/backup', async (req, res) => {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const tempBackupPath = path.join(os.tmpdir(), `mahadev-backup-${timestamp}.db`);

  try {
    await db.backup(tempBackupPath);
    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="mahadev-backup-${timestamp}.db"`);

    const stream = fs.createReadStream(tempBackupPath);
    stream.pipe(res);
    stream.on('end', () => {
      try { fs.unlinkSync(tempBackupPath); } catch (e) {}
    });
    stream.on('error', err => {
      console.error('Backup stream error:', err);
      try { fs.unlinkSync(tempBackupPath); } catch (e) {}
    });
  } catch (err) {
    console.error('Backup failed:', err);
    try { fs.unlinkSync(tempBackupPath); } catch (e) {}
    res.status(500).json({ error: 'Failed to create database backup.' });
  }
});

module.exports = router;

