const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const rateLimit = require('express-rate-limit');
const db = require('../db');

// Rate limiter for order placement: max 5 orders per 10 min per IP
const orderLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 5,
  message: { error: 'Too many order requests. Please try again after a few minutes or order directly on WhatsApp.' },
  standardHeaders: true,
  legacyHeaders: false
});

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

// GET /api/products (active products, optional ?cat=, ?q=)
router.get('/products', (req, res) => {
  try {
    const { cat, q } = req.query;
    let sql = 'SELECT * FROM products WHERE is_active = 1';
    const params = [];

    if (cat && cat !== 'all') {
      if (cat === 'new') {
        sql += ' AND is_new = 1';
      } else {
        sql += ' AND category_slug = ?';
        params.push(cat);
      }
    }

    if (q && q.trim()) {
      sql += ' AND (name LIKE ? OR description LIKE ?)';
      const term = `%${q.trim()}%`;
      params.push(term, term);
    }

    sql += ' ORDER BY sort_order ASC, rowid ASC';

    const rows = db.prepare(sql).all(...params);
    res.json(rows.map(formatProduct));
  } catch (err) {
    console.error('Error fetching products:', err.message);
    res.status(500).json({ error: 'Failed to retrieve products' });
  }
});

// GET /api/products/:id (single active product)
router.get('/products/:id', (req, res) => {
  try {
    const { id } = req.params;
    const row = db.prepare('SELECT * FROM products WHERE id = ? AND is_active = 1').get(id);
    if (!row) {
      return res.status(404).json({ error: 'Product not found' });
    }
    res.json(formatProduct(row));
  } catch (err) {
    console.error('Error fetching product:', err.message);
    res.status(500).json({ error: 'Failed to retrieve product' });
  }
});

// GET /api/settings (public shop settings)
router.get('/settings', (req, res) => {
  try {
    const row = db.prepare('SELECT * FROM shop_settings WHERE id = 1').get();
    if (!row) {
      return res.status(404).json({ error: 'Shop settings not configured' });
    }

    let phones = [];
    try { phones = JSON.parse(row.phones || '[]'); } catch (e) { phones = []; }

    res.json({
      name: row.name,
      whatsapp: row.whatsapp,
      phones,
      city: row.city,
      address: row.address,
      map_query: row.map_query,
      mapQuery: row.map_query,
      map_link: row.map_link,
      opening_hours: row.opening_hours,
      instagram: row.instagram || '',
      facebook: row.facebook || '',
      upi_id: row.upi_id || '',
      return_policy: row.return_policy || ''
    });
  } catch (err) {
    console.error('Error fetching settings:', err.message);
    res.status(500).json({ error: 'Failed to retrieve shop settings' });
  }
});

// POST /api/orders (create an order with server validation and transaction)
router.post('/orders', orderLimiter, (req, res) => {
  try {
    const body = req.body || {};

    // Silently reject honeypot hits
    if (body.website || body._hp || body.company) {
      console.warn('Honeypot triggered, silently dropping order.');
      return res.json({ success: true, order_id: crypto.randomUUID() });
    }

    const customer_name = String(body.customer_name || body.name || '').trim();
    const mobile = String(body.mobile || '').trim();
    const address = String(body.address || '').trim();
    const city = String(body.city || 'Jaysingpur').trim();
    const delivery_type = String(body.delivery_type || body.delivery || 'Pick up from shop').trim();
    const note = String(body.note || '').trim();
    const rawItems = Array.isArray(body.items) ? body.items : [];

    // Validations
    if (customer_name.length < 2) {
      return res.status(400).json({ error: 'Customer name must be at least 2 characters.' });
    }
    if (!/^[6-9]\d{9}$/.test(mobile)) {
      return res.status(400).json({ error: 'Please enter a valid 10-digit mobile number.' });
    }
    if (rawItems.length === 0) {
      return res.status(400).json({ error: 'Order must contain at least one item.' });
    }

    // Prepare statement to query product details
    const findProductStmt = db.prepare('SELECT id, name, price, sizes, colors, in_stock, is_active FROM products WHERE id = ?');

    const validatedItems = [];
    let totalItems = 0;
    let pricedSum = 0;
    let hasPricedItem = false;

    for (const item of rawItems) {
      const productId = String(item.product_id || item.id || '').trim();
      const qty = parseInt(item.qty, 10);
      const size = String(item.size || '').trim();
      const colour = String(item.colour || item.color || '').trim();

      if (!productId) {
        return res.status(400).json({ error: 'Invalid product id in order items.' });
      }
      if (isNaN(qty) || qty < 1 || qty > 50) {
        return res.status(400).json({ error: 'Item quantity must be between 1 and 50.' });
      }

      const product = findProductStmt.get(productId);
      if (!product || !product.is_active) {
        return res.status(400).json({ error: `Product '${productId}' is not available.` });
      }

      // Validate size against product sizes if defined
      let validSizes = [];
      try { validSizes = JSON.parse(product.sizes || '[]'); } catch (e) { validSizes = []; }
      if (validSizes.length > 0) {
        if (!size || !validSizes.includes(size)) {
          return res.status(400).json({ error: `Please choose a valid size for ${product.name} (${validSizes.join(', ')})` });
        }
      }

      // Validate color against product colors if defined
      let validColors = [];
      try { validColors = JSON.parse(product.colors || '[]'); } catch (e) { validColors = []; }
      if (validColors.length > 0) {
        if (colour && !validColors.includes(colour)) {
          return res.status(400).json({ error: `Please choose a valid colour for ${product.name} (${validColors.join(', ')})` });
        }
      }

      // Server sets the authoritative price from DB
      const unitPrice = (typeof product.price === 'number' && !isNaN(product.price)) ? product.price : null;
      if (unitPrice !== null) {
        pricedSum += unitPrice * qty;
        hasPricedItem = true;
      }
      totalItems += qty;

      validatedItems.push({
        product_id: product.id,
        product_name: product.name,
        size: size || null,
        colour: colour || null,
        qty,
        unit_price: unitPrice
      });
    }

    const totalAmount = hasPricedItem ? pricedSum : null;
    const orderId = crypto.randomUUID();

    const insertOrderStmt = db.prepare(`
      INSERT INTO orders (
        id, created_at, customer_name, mobile, address, city,
        delivery_type, note, total_items, total_amount, status
      ) VALUES (
        @id, datetime('now'), @customer_name, @mobile, @address, @city,
        @delivery_type, @note, @total_items, @total_amount, 'new'
      )
    `);

    const insertItemStmt = db.prepare(`
      INSERT INTO order_items (
        order_id, product_id, product_name, size, colour, qty, unit_price
      ) VALUES (
        @order_id, @product_id, @product_name, @size, @colour, @qty, @unit_price
      )
    `);

    // Execute in transaction
    const createOrderTx = db.transaction(() => {
      insertOrderStmt.run({
        id: orderId,
        customer_name,
        mobile,
        address: address || null,
        city: city || null,
        delivery_type,
        note: note || null,
        total_items: totalItems,
        total_amount: totalAmount
      });

      for (const item of validatedItems) {
        insertItemStmt.run({
          order_id: orderId,
          product_id: item.product_id,
          product_name: item.product_name,
          size: item.size,
          colour: item.colour,
          qty: item.qty,
          unit_price: item.unit_price
        });
      }
    });

    createOrderTx();

    return res.status(201).json({
      success: true,
      order_id: orderId,
      total_items: totalItems,
      total_amount: totalAmount
    });
  } catch (err) {
    console.error('Error creating order:', err.message);
    return res.status(500).json({ error: 'Failed to process order. Please try again.' });
  }
});

module.exports = router;

