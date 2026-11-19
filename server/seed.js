const fs = require('fs');
const path = require('path');
const vm = require('vm');

function extractColors(desc) {
  if (!desc) return [];
  let m = desc.match(/Colours:\s*([^.]+)/i) ||
          desc.match(/Available in\s*([^.]+)/i) ||
          desc.match(/(?:trousers|shirts|finish) in\s*([^.]+)/i) ||
          desc.match(/Colour Range:?\s*([^.]+)/i);
  if (m) {
    let clean = m[1].replace(/M to XXL/i, '').replace(/6 fresh colours/i, '').trim();
    if (clean) {
      return clean.split(/,| and |\/|&/).map(s => s.trim()).filter(Boolean);
    }
  }
  return [];
}

function loadProductsJs(filePath) {
  const code = fs.readFileSync(filePath, 'utf8');
  const ctx = vm.createContext({});
  const result = vm.runInContext(code + '\n;({ SHOP, CATEGORIES, PRODUCTS });', ctx);
  return result;
}

function seedDatabase(db) {
  const productsJsPath = path.join(__dirname, '..', 'js', 'products.js');
  if (!fs.existsSync(productsJsPath)) {
    console.warn('Seed warning: js/products.js not found at', productsJsPath);
    return;
  }

  const { SHOP, CATEGORIES, PRODUCTS } = loadProductsJs(productsJsPath);

  const insertSetting = db.prepare(`
    INSERT OR IGNORE INTO shop_settings (
      id, name, whatsapp, phones, city, address, map_query, map_link,
      opening_hours, instagram, facebook, upi_id, return_policy
    ) VALUES (
      1, @name, @whatsapp, @phones, @city, @address, @map_query, @map_link,
      @opening_hours, @instagram, @facebook, @upi_id, @return_policy
    )
  `);

  const insertCategory = db.prepare(`
    INSERT OR IGNORE INTO categories (slug, name, sort_order)
    VALUES (@slug, @name, @sort_order)
  `);

  const insertProduct = db.prepare(`
    INSERT OR REPLACE INTO products (
      id, name, category_slug, price, mrp, sizes, colors,
      description, image_url, extra_images, is_new, tag,
      is_landscape, in_stock, is_active, sort_order, created_at, updated_at
    ) VALUES (
      @id, @name, @category_slug, @price, @mrp, @sizes, @colors,
      @description, @image_url, @extra_images, @is_new, @tag,
      @is_landscape, @in_stock, @is_active, @sort_order, datetime('now'), datetime('now')
    )
  `);

  const seedTx = db.transaction(() => {
    // 1. Settings
    if (SHOP) {
      insertSetting.run({
        name: SHOP.name || 'Mahadev Collection',
        whatsapp: SHOP.whatsapp || '917030474595',
        phones: JSON.stringify(SHOP.phones || ['7030474595', '7742185654']),
        city: SHOP.city || 'Jaysingpur, Maharashtra',
        address: SHOP.address || 'Mahadev Collection, Jaysingpur, Maharashtra',
        map_query: SHOP.mapQuery || 'Jaysingpur, Maharashtra',
        map_link: 'https://www.google.com/maps?q=' + encodeURIComponent(SHOP.mapQuery || 'Jaysingpur, Maharashtra') + '&output=embed',
        opening_hours: '10:00 AM – 9:00 PM (All Days)',
        instagram: SHOP.instagram || '',
        facebook: SHOP.facebook || '',
        upi_id: '',
        return_policy: 'Easy exchange within 7 days at store. Items must be unused with tags intact.'
      });
    }

    // 2. Categories
    if (CATEGORIES) {
      const order = { men: 1, women: 2, kids: 3 };
      for (const [slug, name] of Object.entries(CATEGORIES)) {
        insertCategory.run({ slug, name, sort_order: order[slug] || 0 });
      }
    }

    // 3. Products
    if (Array.isArray(PRODUCTS)) {
      PRODUCTS.forEach((p, idx) => {
        const colors = extractColors(p.desc);
        insertProduct.run({
          id: p.id,
          name: p.name,
          category_slug: p.cat,
          price: (typeof p.price === 'number' && !isNaN(p.price)) ? p.price : null,
          mrp: null,
          sizes: JSON.stringify(p.sizes || []),
          colors: JSON.stringify(colors),
          description: p.desc || '',
          image_url: p.img || '',
          extra_images: JSON.stringify([]),
          is_new: p.isNew ? 1 : 0,
          tag: p.tag || '',
          is_landscape: p.land ? 1 : 0,
          in_stock: 1,
          is_active: 1,
          sort_order: idx + 1
        });
      });
    }
  });

  seedTx();
  console.log(`Seeded shop settings, categories, and ${PRODUCTS.length} products into the database.`);
}

module.exports = { seedDatabase, loadProductsJs };

