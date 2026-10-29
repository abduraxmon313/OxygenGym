'use strict';

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const SCHEMA_VERSION = 2;
const MONEY_METHODS = ['cash', 'card', 'click', 'payme'];
const SETTING_KEYS = ['shopName', 'shopPhone', 'shopAddress', 'allowDebt', 'lowStockAlert', 'expiryAlertDays'];

// Kategoriyalar blb.uz katalogi asosida tuzilgan (zal bari uchun moslashtirilgan)
const CATEGORY_TREE = [
  ['Proteinlar', ['Zardob proteini (Whey)', 'Izolyat', 'Kazein', "Ko'p komponentli", "O'simlik proteini", "Mol go'shti proteini"]],
  ['Geynerlar', ['Yuqori uglevodli', 'Yuqori oqsilli', 'Laktoza va shakarsiz']],
  ['Kreatin', ['Kreatin monogidrat', 'Kukun', 'Kapsula', "Ko'p komponentli"]],
  ['Aminokislotalar', ['BCAA', 'EAA va komplekslar', 'Glutamin', 'Arginin', 'Beta-alanin', 'Taurin', 'HMB']],
  ["Mashg'ulot oldi komplekslari", []],
  ["Yog' yoquvchilar", ['Termogeniklar', 'L-karnitin']],
  ['Vitamin va minerallar', ['Vitamin komplekslari', 'B guruhi vitaminlari', 'Vitamin C', 'Vitamin D', 'Vitamin E', 'Vitamin A', 'Vitamin K', 'Minerallar (rux, magniy, temir)', 'ZMA', 'Bolalar uchun vitaminlar']],
  ["Omega yog'lari", ['Omega-3', 'Omega-3-6-9']],
  ['Kollagen', ['Mol kollageni', 'Dengiz kollageni']],
  ["Bo'g'im va paylar", []],
  ['Testosteron va anabolik komplekslar', ['Tribulus', 'Testobusterlar']],
  ['Tiklanish va uyqu', ['Melatonin', 'GABA']],
  ['Salomatlik', ['Probiotiklar', 'Antioksidantlar', 'Koenzim Q10', 'Jigar uchun', 'Fosfolipidlar', "O'simlik vositalari"]],
  ['Uglevodlar va izotoniklar', ['Uglevodlar', 'Izotoniklar']],
  ['Batonchiklar va gazaklar', ['Protein batonchiklar', 'Protein pecheniye']],
  ['Bar: ichimliklar', ['Protein kokteyl', 'Suv', 'Energetik ichimliklar', 'BCAA ichimliklar', 'Kofe va choy']],
  ['Aksessuarlar', ['Sheykerlar', 'Fitnes jihozlari', 'Sport kiyim']],
  ['Boshqa', []],
];

const BRANDS = [
  '21st Century', 'Applied Nutrition', 'BioTechUSA', 'BPI Sports', 'BSN', 'California Gold Nutrition', 'Cellucor',
  "Doctor's Best", 'Dymatize Nutrition', 'GAT', 'Grenade', 'Isopure', 'Jarrow', 'Kirkland', 'Labrada', 'Life Extension',
  'Maxler', 'MuscleMeds', 'Muscle Pharm', 'MuscleTech', 'Mutant', 'Myprotein', 'Natrol', "Nature's Way", 'Natures Bounty',
  'Nordic Naturals', 'NOW Foods', 'Nutrex', 'Nutricost', 'Olimp Nutrition', 'Optimum Nutrition', 'OstroVit', 'Power System',
  'Prosupps', 'Puritans Pride', 'Redcon1', 'Ronnie Coleman', 'Rule One Proteins', 'Scivation', 'Solgar', 'Sports Research',
  'Swanson', 'Thorne', 'Ultimate Nutrition', 'Universal Nutrition', 'USN', 'Vital Proteins', 'Weider',
];

// Chegirma sotuv darajasida beriladi — mahsulot qatoriga proporsional taqsimlanadi
const REVENUE_EXPR = 'si.total * (CASE WHEN s.total > 0 THEN s.final_total * 1.0 / s.total ELSE 0 END)';

const pad = (n) => String(n).padStart(2, '0');
function isoDate(d) { return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; }
function now() {
  const d = new Date();
  return `${isoDate(d)} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}
function todayStr() { return isoDate(new Date()); }
function shiftDate(iso, days) {
  const [y, m, d] = iso.split('-').map(Number);
  return isoDate(new Date(y, m - 1, d + days));
}
function toInt(v) {
  const n = Math.round(Number(v));
  return Number.isFinite(n) ? n : 0;
}
function fail(message) { throw new Error(message); }
function fmt(n) { return `${String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')} so'm`; }
function opt(v) {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  return s ? s : null;
}
function range(filters = {}) {
  return [filters.dateFrom || '0000-01-01', filters.dateTo || '9999-12-31'];
}

class DB {
  constructor(dataDir, logger) {
    this.logger = logger || console;
    this.dataDir = dataDir;
    fs.mkdirSync(dataDir, { recursive: true });
    this.dbPath = path.join(dataDir, 'oxygengym.db');
    this.backupDir = path.join(path.dirname(dataDir), 'backups');
    this.open();
  }

  open() {
    this.db = new Database(this.dbPath);
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('foreign_keys = ON');
    this.createBaseSchema();
    this.migrate();
  }

  close() {
    if (this.db && this.db.open) this.db.close();
  }

  // ================= SCHEMA =================

  // v1.0 sxemasi (mavjud o'rnatmalar bilan mos bo'lishi uchun o'zgartirilmaydi)
  createBaseSchema() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, parent_id INTEGER, icon TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (parent_id) REFERENCES categories(id));
      CREATE TABLE IF NOT EXISTS suppliers (
        id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, phone TEXT, address TEXT, notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP);
      CREATE TABLE IF NOT EXISTS products (
        id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, barcode TEXT UNIQUE, category_id INTEGER,
        brand TEXT, description TEXT, image TEXT, cost_price REAL NOT NULL DEFAULT 0, sell_price REAL NOT NULL DEFAULT 0,
        stock INTEGER NOT NULL DEFAULT 0, min_stock INTEGER NOT NULL DEFAULT 3, weight TEXT, flavor TEXT,
        unit TEXT DEFAULT 'dona', is_active INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (category_id) REFERENCES categories(id));
      CREATE TABLE IF NOT EXISTS stock_receipts (
        id INTEGER PRIMARY KEY AUTOINCREMENT, receipt_number TEXT NOT NULL UNIQUE, supplier_id INTEGER,
        total_items INTEGER DEFAULT 0, total_amount REAL DEFAULT 0, notes TEXT, status TEXT DEFAULT 'completed',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (supplier_id) REFERENCES suppliers(id));
      CREATE TABLE IF NOT EXISTS product_batches (
        id INTEGER PRIMARY KEY AUTOINCREMENT, product_id INTEGER NOT NULL, receipt_id INTEGER, batch_number TEXT,
        quantity INTEGER NOT NULL DEFAULT 0, remaining INTEGER NOT NULL DEFAULT 0, cost_price REAL NOT NULL DEFAULT 0,
        expiry_date DATE, created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (product_id) REFERENCES products(id), FOREIGN KEY (receipt_id) REFERENCES stock_receipts(id));
      CREATE TABLE IF NOT EXISTS customers (
        id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, phone TEXT, loyalty_points INTEGER DEFAULT 0,
        loyalty_tier TEXT DEFAULT 'Bronze', total_spent REAL DEFAULT 0, total_purchases INTEGER DEFAULT 0,
        birthday DATE, notes TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP);
      CREATE TABLE IF NOT EXISTS sales (
        id INTEGER PRIMARY KEY AUTOINCREMENT, sale_number TEXT NOT NULL UNIQUE, customer_id INTEGER,
        total REAL NOT NULL DEFAULT 0, discount REAL DEFAULT 0, discount_type TEXT DEFAULT 'percent',
        final_total REAL NOT NULL DEFAULT 0, payment_method TEXT DEFAULT 'cash', loyalty_points_used INTEGER DEFAULT 0,
        loyalty_points_earned INTEGER DEFAULT 0, status TEXT DEFAULT 'completed', notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (customer_id) REFERENCES customers(id));
      CREATE TABLE IF NOT EXISTS sale_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT, sale_id INTEGER NOT NULL, product_id INTEGER NOT NULL, batch_id INTEGER,
        quantity INTEGER NOT NULL DEFAULT 1, price REAL NOT NULL, cost_price REAL NOT NULL DEFAULT 0, total REAL NOT NULL,
        FOREIGN KEY (sale_id) REFERENCES sales(id), FOREIGN KEY (product_id) REFERENCES products(id),
        FOREIGN KEY (batch_id) REFERENCES product_batches(id));
      CREATE TABLE IF NOT EXISTS stock_receipt_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT, receipt_id INTEGER NOT NULL, product_id INTEGER NOT NULL,
        quantity INTEGER NOT NULL DEFAULT 0, cost_price REAL NOT NULL DEFAULT 0, expiry_date DATE, batch_number TEXT,
        FOREIGN KEY (receipt_id) REFERENCES stock_receipts(id), FOREIGN KEY (product_id) REFERENCES products(id));
      CREATE TABLE IF NOT EXISTS audit_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT, action TEXT NOT NULL, entity TEXT NOT NULL, entity_id INTEGER,
        details TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP);
      CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT);
    `);
  }

  migrate() {
    const current = this.db.pragma('user_version', { simple: true });
    if (current < 2) {
      this.db.transaction(() => this.migrateToV2())();
      this.db.pragma(`user_version = ${SCHEMA_VERSION}`);
      this.logger.info && this.logger.info('Database migrated to v2');
    }
  }

  addColumn(table, column, definition) {
    const cols = this.db.prepare(`PRAGMA table_info(${table})`).all();
    if (!cols.some((c) => c.name === column)) {
      this.db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
    }
  }

  migrateToV2() {
    const db = this.db;

    // v1 vaqtni UTC da saqlagan — mahalliy vaqtga o'tkazamiz
    for (const t of ['categories', 'suppliers', 'products', 'product_batches', 'customers', 'sales', 'stock_receipts', 'audit_log']) {
      db.prepare(`UPDATE ${t} SET created_at = datetime(created_at, 'localtime') WHERE created_at IS NOT NULL`).run();
    }
    for (const t of ['suppliers', 'products', 'customers']) {
      db.prepare(`UPDATE ${t} SET updated_at = datetime(updated_at, 'localtime') WHERE updated_at IS NOT NULL`).run();
    }

    db.prepare("UPDATE product_batches SET expiry_date = NULL WHERE expiry_date = ''").run();
    db.prepare("UPDATE stock_receipt_items SET expiry_date = NULL WHERE expiry_date = ''").run();

    this.addColumn('categories', 'sort_order', 'INTEGER NOT NULL DEFAULT 0');

    this.addColumn('products', 'code', 'TEXT');
    db.prepare("UPDATE products SET code = CAST(1000 + id AS TEXT) WHERE code IS NULL OR code = ''").run();
    db.exec('CREATE UNIQUE INDEX IF NOT EXISTS idx_products_code ON products(code)');

    this.addColumn('customers', 'balance', 'REAL NOT NULL DEFAULT 0');
    this.addColumn('customers', 'debt_limit', 'REAL');
    this.addColumn('customers', 'is_active', 'INTEGER NOT NULL DEFAULT 1');

    this.addColumn('sales', 'paid_amount', 'REAL NOT NULL DEFAULT 0');
    this.addColumn('sales', 'balance_used', 'REAL NOT NULL DEFAULT 0');
    this.addColumn('sales', 'debt_amount', 'REAL NOT NULL DEFAULT 0');
    this.addColumn('sales', 'change_amount', 'REAL NOT NULL DEFAULT 0');
    this.addColumn('sales', 'change_to_balance', 'REAL NOT NULL DEFAULT 0');
    this.addColumn('sales', 'refunded_at', 'TEXT');
    this.addColumn('sales', 'refund_cash', 'REAL NOT NULL DEFAULT 0');

    db.exec(`
      CREATE TABLE IF NOT EXISTS sale_payments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        sale_id INTEGER NOT NULL REFERENCES sales(id),
        method TEXT NOT NULL,
        amount REAL NOT NULL
      );
      CREATE TABLE IF NOT EXISTS customer_transactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        customer_id INTEGER NOT NULL REFERENCES customers(id),
        type TEXT NOT NULL,
        amount REAL NOT NULL,
        balance_after REAL NOT NULL,
        method TEXT,
        sale_id INTEGER REFERENCES sales(id),
        note TEXT,
        created_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_sale_payments_sale ON sale_payments(sale_id);
      CREATE INDEX IF NOT EXISTS idx_ctx_customer ON customer_transactions(customer_id, id);
      CREATE INDEX IF NOT EXISTS idx_ctx_created ON customer_transactions(created_at);
      CREATE INDEX IF NOT EXISTS idx_sales_created ON sales(created_at);
      CREATE INDEX IF NOT EXISTS idx_sales_customer ON sales(customer_id);
      CREATE INDEX IF NOT EXISTS idx_sale_items_sale ON sale_items(sale_id);
      CREATE INDEX IF NOT EXISTS idx_batches_product ON product_batches(product_id);
    `);

    // Eski sotuvlar to'liq to'langan deb hisoblanadi
    db.prepare('UPDATE sales SET paid_amount = final_total WHERE paid_amount = 0 AND balance_used = 0 AND debt_amount = 0').run();
    db.prepare(`
      INSERT INTO sale_payments (sale_id, method, amount)
      SELECT id, CASE WHEN payment_method IN ('cash','card','click','payme') THEN payment_method ELSE 'cash' END, final_total
      FROM sales WHERE final_total > 0 AND id NOT IN (SELECT sale_id FROM sale_payments)
    `).run();
    db.prepare("UPDATE sales SET refunded_at = created_at, refund_cash = paid_amount WHERE status = 'refunded' AND refunded_at IS NULL").run();

    this.syncCategories();
    db.prepare("DELETE FROM settings WHERE key LIKE 'loyalty%' OR key IN ('currency')").run();
    this.seedSettings();
  }

  syncCategories() {
    const db = this.db;
    const used = db.prepare('SELECT DISTINCT category_id AS id FROM products WHERE category_id IS NOT NULL').all().map((r) => r.id);
    const keep = new Set(used);
    const parentOf = db.prepare('SELECT parent_id FROM categories WHERE id = ?');
    used.forEach((id) => {
      const row = parentOf.get(id);
      if (row && row.parent_id) keep.add(row.parent_id);
    });

    const remove = db.prepare('DELETE FROM categories WHERE id = ?');
    const all = db.prepare('SELECT id, parent_id FROM categories').all();
    all.filter((c) => c.parent_id && !keep.has(c.id)).forEach((c) => remove.run(c.id));
    const hasChild = db.prepare('SELECT 1 FROM categories WHERE parent_id = ? LIMIT 1');
    all.filter((c) => !c.parent_id && !keep.has(c.id) && !hasChild.get(c.id)).forEach((c) => remove.run(c.id));

    const findParent = db.prepare('SELECT id FROM categories WHERE parent_id IS NULL AND name = ?');
    const findChild = db.prepare('SELECT id FROM categories WHERE parent_id = ? AND name = ?');
    const insert = db.prepare('INSERT INTO categories (name, parent_id, icon, sort_order, created_at) VALUES (?, ?, NULL, ?, ?)');
    const setOrder = db.prepare('UPDATE categories SET sort_order = ? WHERE id = ?');

    CATEGORY_TREE.forEach(([name, children], i) => {
      const existing = findParent.get(name);
      const parentId = existing ? existing.id : insert.run(name, null, i + 1, now()).lastInsertRowid;
      if (existing) setOrder.run(i + 1, parentId);
      children.forEach((child, j) => {
        const c = findChild.get(parentId, child);
        if (c) setOrder.run(j + 1, c.id);
        else insert.run(child, parentId, j + 1, now());
      });
    });
    // Eski (ishlatilayotgan) kategoriyalar ro'yxat oxirida turadi
    db.prepare('UPDATE categories SET sort_order = 900 WHERE sort_order = 0').run();
  }

  seedSettings() {
    const defaults = {
      shopName: 'OxygenGym',
      shopPhone: '',
      shopAddress: '',
      allowDebt: 'true',
      lowStockAlert: '3',
      expiryAlertDays: '30',
    };
    const insert = this.db.prepare('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)');
    Object.entries(defaults).forEach(([k, v]) => insert.run(k, v));
  }

  log(action, entity, entityId, details) {
    this.db.prepare('INSERT INTO audit_log (action, entity, entity_id, details, created_at) VALUES (?, ?, ?, ?, ?)')
      .run(action, entity, entityId === undefined ? null : entityId, details, now());
  }

  nextNumber(table, prefix) {
    const { n } = this.db.prepare(`SELECT COALESCE(MAX(id), 0) + 1 AS n FROM ${table}`).get();
    return `${prefix}${String(n).padStart(6, '0')}`;
  }

  // ================= CATEGORIES & BRANDS =================

  getCategories() {
    const rows = this.db.prepare(`
      SELECT c.id, c.name, c.parent_id, c.sort_order,
        (SELECT COUNT(*) FROM products p WHERE p.is_active = 1 AND (p.category_id = c.id
          OR p.category_id IN (SELECT id FROM categories WHERE parent_id = c.id))) AS product_count
      FROM categories c ORDER BY c.sort_order, c.name
    `).all();
    return rows.filter((r) => !r.parent_id).map((p) => ({ ...p, children: rows.filter((r) => r.parent_id === p.id) }));
  }

  getBrands() {
    const used = this.db.prepare("SELECT DISTINCT brand FROM products WHERE brand IS NOT NULL AND brand <> ''").all().map((r) => r.brand);
    return Array.from(new Set([...used, ...BRANDS])).sort((a, b) => a.localeCompare(b));
  }

  // ================= PRODUCTS =================

  productSelect() {
    return `SELECT p.*, c.name AS category_name, c.parent_id AS category_parent_id, pc.name AS parent_category_name
      FROM products p
      LEFT JOIN categories c ON c.id = p.category_id
      LEFT JOIN categories pc ON pc.id = c.parent_id`;
  }

  getProducts() {
    return this.db.prepare(`${this.productSelect()} WHERE p.is_active = 1 ORDER BY p.name COLLATE NOCASE`).all();
  }

  getProductById(id) {
    const product = this.db.prepare(`${this.productSelect()} WHERE p.id = ?`).get(id);
    if (!product) return null;
    product.batches = this.db.prepare(`
      SELECT pb.*, sr.receipt_number FROM product_batches pb
      LEFT JOIN stock_receipts sr ON sr.id = pb.receipt_id
      WHERE pb.product_id = ? AND pb.remaining > 0
      ORDER BY (pb.expiry_date IS NULL), pb.expiry_date, pb.id
    `).all(id);
    return product;
  }

  nextProductCode() {
    const row = this.db.prepare("SELECT MAX(CAST(code AS INTEGER)) AS m FROM products WHERE code GLOB '[0-9]*'").get();
    return String(Math.max(1000, (row && row.m) || 0) + 1);
  }

  normalizeProduct(input) {
    const name = opt(input.name);
    if (!name) fail('Mahsulot nomini kiriting');
    const cost = toInt(input.cost_price);
    const sell = toInt(input.sell_price);
    if (cost < 0 || sell < 0) fail("Narx manfiy bo'lishi mumkin emas");
    if (sell <= 0) fail('Sotuv narxini kiriting');
    const categoryId = input.category_id ? Number(input.category_id) : null;
    if (categoryId && !this.db.prepare('SELECT 1 FROM categories WHERE id = ?').get(categoryId)) fail('Kategoriya topilmadi');
    return {
      name,
      code: opt(input.code),
      category_id: categoryId,
      brand: opt(input.brand),
      flavor: opt(input.flavor),
      weight: opt(input.weight),
      description: opt(input.description),
      cost_price: cost,
      sell_price: sell,
      min_stock: Math.max(0, toInt(input.min_stock)),
      unit: opt(input.unit) || 'dona',
      image: opt(input.image),
    };
  }

  ensureCodeFree(code, exceptId) {
    const row = this.db.prepare('SELECT id, name FROM products WHERE code = ? AND id <> ?').get(code, exceptId || 0);
    if (row) fail(`"${code}" kodi "${row.name}" mahsulotida ishlatilgan`);
  }

  createProduct(input) {
    return this.db.transaction(() => {
      const p = this.normalizeProduct(input);
      const code = p.code || this.nextProductCode();
      this.ensureCodeFree(code);
      const ts = now();
      const id = Number(this.db.prepare(`
        INSERT INTO products (code, name, category_id, brand, flavor, weight, description, image, cost_price, sell_price,
          stock, min_stock, unit, is_active, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, 1, ?, ?)
      `).run(code, p.name, p.category_id, p.brand, p.flavor, p.weight, p.description, p.image, p.cost_price, p.sell_price,
        p.min_stock, p.unit, ts, ts).lastInsertRowid);
      this.log('CREATE', 'product', id, `Yangi mahsulot: ${p.name} (kod ${code})`);

      const qty = toInt(input.initial_stock);
      if (qty > 0) {
        this.receiveStock({
          notes: "Boshlang'ich qoldiq",
          items: [{ product_id: id, quantity: qty, cost_price: p.cost_price, expiry_date: input.initial_expiry }],
        });
      }
      return this.getProductById(id);
    })();
  }

  updateProduct(id, input) {
    return this.db.transaction(() => {
      const existing = this.db.prepare('SELECT * FROM products WHERE id = ?').get(id);
      if (!existing) fail('Mahsulot topilmadi');
      const p = this.normalizeProduct(input);
      const code = p.code || existing.code || this.nextProductCode();
      this.ensureCodeFree(code, id);
      this.db.prepare(`
        UPDATE products SET code = ?, name = ?, category_id = ?, brand = ?, flavor = ?, weight = ?, description = ?, image = ?,
          cost_price = ?, sell_price = ?, min_stock = ?, unit = ?, updated_at = ? WHERE id = ?
      `).run(code, p.name, p.category_id, p.brand, p.flavor, p.weight, p.description, p.image, p.cost_price, p.sell_price,
        p.min_stock, p.unit, now(), id);
      let details = `Mahsulot tahrirlandi: ${p.name}`;
      if (toInt(existing.sell_price) !== p.sell_price) details += `; sotuv narxi ${fmt(existing.sell_price)} → ${fmt(p.sell_price)}`;
      this.log('UPDATE', 'product', id, details);
      return this.getProductById(id);
    })();
  }

  deleteProduct(id) {
    const p = this.db.prepare('SELECT name, stock FROM products WHERE id = ?').get(id);
    if (!p) fail('Mahsulot topilmadi');
    this.db.prepare('UPDATE products SET is_active = 0, updated_at = ? WHERE id = ?').run(now(), id);
    this.log('DELETE', 'product', id, `Mahsulot arxivlandi: ${p.name} (qoldiq: ${p.stock})`);
    return true;
  }

  getLowStockProducts() {
    return this.db.prepare(`${this.productSelect()} WHERE p.is_active = 1 AND p.stock <= p.min_stock ORDER BY p.stock, p.name`).all();
  }

  getExpiringProducts(days) {
    const d = toInt(days) || toInt(this.getSettings().expiryAlertDays) || 30;
    return this.db.prepare(`
      SELECT pb.*, p.name AS product_name, p.code, p.brand, p.flavor, p.weight, p.unit, p.sell_price,
        CAST(julianday(pb.expiry_date) - julianday(date('now','localtime')) AS INTEGER) AS days_left
      FROM product_batches pb JOIN products p ON p.id = pb.product_id
      WHERE pb.remaining > 0 AND p.is_active = 1 AND pb.expiry_date IS NOT NULL
        AND pb.expiry_date <= date('now', 'localtime', '+' || ? || ' days')
      ORDER BY pb.expiry_date
    `).all(d);
  }

  // ================= STOCK RECEIVING =================

  receiveStock(input) {
    return this.db.transaction(() => {
      const items = Array.isArray(input && input.items) ? input.items : [];
      if (!items.length) fail("Kamida bitta mahsulot qo'shing");
      const ts = now();
      const today = ts.slice(0, 10);
      const getProduct = this.db.prepare('SELECT * FROM products WHERE id = ? AND is_active = 1');

      const lines = items.map((it) => {
        const product = getProduct.get(it.product_id);
        if (!product) fail('Mahsulot topilmadi');
        const qty = toInt(it.quantity);
        if (qty <= 0 || Number(it.quantity) !== qty) fail(`"${product.name}": miqdor musbat butun son bo'lishi kerak`);
        const cost = toInt(it.cost_price);
        if (cost < 0) fail(`"${product.name}": tannarx manfiy bo'lishi mumkin emas`);
        const expiry = opt(it.expiry_date);
        if (expiry && !/^\d{4}-\d{2}-\d{2}$/.test(expiry)) fail(`"${product.name}": sana formati noto'g'ri`);
        if (expiry && expiry < today) fail(`"${product.name}": yaroqlilik muddati o'tib ketgan (${expiry})`);
        const hasSell = it.sell_price !== undefined && it.sell_price !== null && it.sell_price !== '';
        const sell = hasSell ? toInt(it.sell_price) : null;
        if (hasSell && sell <= 0) fail(`"${product.name}": sotuv narxi noto'g'ri`);
        return { product, qty, cost, expiry, sell };
      });

      const number = this.nextNumber('stock_receipts', 'K');
      const totalItems = lines.reduce((s, l) => s + l.qty, 0);
      const totalAmount = lines.reduce((s, l) => s + l.qty * l.cost, 0);
      const receiptId = Number(this.db.prepare(`
        INSERT INTO stock_receipts (receipt_number, supplier_id, total_items, total_amount, notes, status, created_at)
        VALUES (?, NULL, ?, ?, ?, 'completed', ?)
      `).run(number, totalItems, totalAmount, opt(input.notes), ts).lastInsertRowid);

      const insItem = this.db.prepare(`INSERT INTO stock_receipt_items (receipt_id, product_id, quantity, cost_price, expiry_date, batch_number)
        VALUES (?, ?, ?, ?, ?, ?)`);
      const insBatch = this.db.prepare(`INSERT INTO product_batches (product_id, receipt_id, batch_number, quantity, remaining, cost_price, expiry_date, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)`);
      const updProduct = this.db.prepare(`UPDATE products SET stock = stock + ?, cost_price = ?, sell_price = COALESCE(?, sell_price), updated_at = ? WHERE id = ?`);

      lines.forEach((l, i) => {
        const batch = `${number}-${i + 1}`;
        insItem.run(receiptId, l.product.id, l.qty, l.cost, l.expiry, batch);
        insBatch.run(l.product.id, receiptId, batch, l.qty, l.qty, l.cost, l.expiry, ts);
        updProduct.run(l.qty, l.cost, l.sell, ts, l.product.id);
        if (l.sell !== null && l.sell !== toInt(l.product.sell_price)) {
          this.log('PRICE', 'product', l.product.id, `${l.product.name}: sotuv narxi ${fmt(l.product.sell_price)} → ${fmt(l.sell)}`);
        }
      });

      this.log('RECEIVE', 'stock', receiptId, `Kirim ${number}: ${lines.length} xil, ${totalItems} dona, ${fmt(totalAmount)}`);
      return { id: receiptId, receipt_number: number };
    })();
  }

  getStockReceipts(filters = {}) {
    const [from, to] = range(filters);
    return this.db.prepare(`
      SELECT sr.*, (SELECT COUNT(*) FROM stock_receipt_items WHERE receipt_id = sr.id) AS lines_count
      FROM stock_receipts sr WHERE date(sr.created_at) BETWEEN ? AND ?
      ORDER BY sr.id DESC LIMIT 500
    `).all(from, to);
  }

  getStockReceiptById(id) {
    const receipt = this.db.prepare('SELECT * FROM stock_receipts WHERE id = ?').get(id);
    if (!receipt) return null;
    receipt.items = this.db.prepare(`
      SELECT sri.*, p.name AS product_name, p.code, p.brand, p.flavor, p.weight, p.unit
      FROM stock_receipt_items sri JOIN products p ON p.id = sri.product_id
      WHERE sri.receipt_id = ? ORDER BY sri.id
    `).all(id);
    return receipt;
  }

  // ================= CUSTOMERS & BALANCE =================

  customerSelect() {
    return `SELECT c.id, c.name, c.phone, c.notes, c.balance, c.debt_limit, c.is_active, c.created_at, c.updated_at,
      (SELECT COUNT(*) FROM sales s WHERE s.customer_id = c.id AND s.status = 'completed') AS purchases_count,
      (SELECT COALESCE(SUM(s.final_total), 0) FROM sales s WHERE s.customer_id = c.id AND s.status = 'completed') AS purchases_total,
      (SELECT MAX(t.created_at) FROM customer_transactions t WHERE t.customer_id = c.id) AS last_activity
      FROM customers c`;
  }

  getCustomers(filters = {}) {
    let where = 'WHERE c.is_active = 1';
    const params = [];
    if (filters.status === 'debt') where += ' AND c.balance < 0';
    if (filters.status === 'advance') where += ' AND c.balance > 0';
    const q = opt(filters.search);
    if (q) {
      where += ' AND (c.name LIKE ? OR c.phone LIKE ?)';
      params.push(`%${q}%`, `%${q}%`);
    }
    const order = filters.status === 'debt' ? 'c.balance ASC' : 'c.name COLLATE NOCASE';
    return this.db.prepare(`${this.customerSelect()} ${where} ORDER BY ${order} LIMIT ${toInt(filters.limit) || 1000}`).all(...params);
  }

  getCustomerSummary() {
    return this.db.prepare(`
      SELECT COUNT(*) AS count,
        COALESCE(SUM(CASE WHEN balance < 0 THEN -balance END), 0) AS total_debt,
        COALESCE(SUM(CASE WHEN balance > 0 THEN balance END), 0) AS total_advance,
        SUM(CASE WHEN balance < 0 THEN 1 ELSE 0 END) AS debtors,
        SUM(CASE WHEN balance > 0 THEN 1 ELSE 0 END) AS with_advance
      FROM customers WHERE is_active = 1
    `).get();
  }

  getCustomerById(id) {
    const customer = this.db.prepare(`${this.customerSelect()} WHERE c.id = ?`).get(id);
    if (!customer) return null;
    customer.transactions = this.db.prepare(`
      SELECT t.*, s.sale_number FROM customer_transactions t LEFT JOIN sales s ON s.id = t.sale_id
      WHERE t.customer_id = ? ORDER BY t.id DESC LIMIT 1000
    `).all(id);
    customer.sales = this.db.prepare(`
      SELECT s.id, s.sale_number, s.final_total, s.paid_amount, s.balance_used, s.debt_amount, s.status, s.created_at,
        (SELECT COUNT(*) FROM sale_items WHERE sale_id = s.id) AS items_count
      FROM sales s WHERE s.customer_id = ? ORDER BY s.id DESC LIMIT 300
    `).all(id);
    return customer;
  }

  getActiveCustomer(id) {
    const c = this.db.prepare('SELECT * FROM customers WHERE id = ? AND is_active = 1').get(id);
    if (!c) fail('Mijoz topilmadi');
    return c;
  }

  normalizeCustomer(input) {
    const name = opt(input.name);
    if (!name) fail('Mijoz ismini kiriting');
    const hasLimit = input.debt_limit !== null && input.debt_limit !== undefined && input.debt_limit !== '';
    const debtLimit = hasLimit ? toInt(input.debt_limit) : null;
    if (debtLimit !== null && debtLimit < 0) fail("Qarz limiti manfiy bo'lishi mumkin emas");
    return { name, phone: opt(input.phone), notes: opt(input.notes), debt_limit: debtLimit };
  }

  ensurePhoneFree(phone, exceptId) {
    if (!phone) return;
    const key = phone.replace(/\D/g, '').slice(-9);
    if (key.length < 7) return;
    const rows = this.db.prepare('SELECT id, name, phone FROM customers WHERE is_active = 1 AND id <> ? AND phone IS NOT NULL').all(exceptId || 0);
    const dup = rows.find((r) => r.phone.replace(/\D/g, '').slice(-9) === key);
    if (dup) fail(`Bu telefon raqami "${dup.name}" mijoziga biriktirilgan`);
  }

  // Har bir pul harakati shu yerdan o'tadi: balans yangilanadi va jurnalga yoziladi
  addCustomerTx(customerId, type, amount, method, saleId, note) {
    const amt = toInt(amount);
    if (!amt) return null;
    const ts = now();
    this.db.prepare('UPDATE customers SET balance = balance + ?, updated_at = ? WHERE id = ?').run(amt, ts, customerId);
    const { balance } = this.db.prepare('SELECT balance FROM customers WHERE id = ?').get(customerId);
    const id = Number(this.db.prepare(`
      INSERT INTO customer_transactions (customer_id, type, amount, balance_after, method, sale_id, note, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(customerId, type, amt, balance, method || null, saleId || null, note || null, ts).lastInsertRowid);
    return { id, balance_after: balance };
  }

  createCustomer(input) {
    return this.db.transaction(() => {
      const c = this.normalizeCustomer(input);
      this.ensurePhoneFree(c.phone);
      const ts = now();
      const id = Number(this.db.prepare(`
        INSERT INTO customers (name, phone, notes, debt_limit, balance, is_active, created_at, updated_at)
        VALUES (?, ?, ?, ?, 0, 1, ?, ?)
      `).run(c.name, c.phone, c.notes, c.debt_limit, ts, ts).lastInsertRowid);
      this.log('CREATE', 'customer', id, `Yangi mijoz: ${c.name}`);

      const amount = toInt(input.initial_amount);
      if (amount < 0) fail("Summa manfiy bo'lishi mumkin emas");
      if (amount > 0 && input.initial_type === 'advance') {
        const method = MONEY_METHODS.includes(input.initial_method) ? input.initial_method : 'cash';
        this.addCustomerTx(id, 'deposit', amount, method, null, "Boshlang'ich to'lov (avans)");
        this.log('PAYMENT_IN', 'customer', id, `${c.name}: avans +${fmt(amount)}`);
      } else if (amount > 0 && input.initial_type === 'debt') {
        this.addCustomerTx(id, 'adjustment', -amount, null, null, "Boshlang'ich qarz (oldingi hisob)");
        this.log('ADJUST', 'customer', id, `${c.name}: boshlang'ich qarz ${fmt(amount)}`);
      }
      return this.getCustomerById(id);
    })();
  }

  updateCustomer(id, input) {
    return this.db.transaction(() => {
      this.getActiveCustomer(id);
      const c = this.normalizeCustomer(input);
      this.ensurePhoneFree(c.phone, id);
      this.db.prepare('UPDATE customers SET name = ?, phone = ?, notes = ?, debt_limit = ?, updated_at = ? WHERE id = ?')
        .run(c.name, c.phone, c.notes, c.debt_limit, now(), id);
      this.log('UPDATE', 'customer', id, `Mijoz tahrirlandi: ${c.name}`);
      return this.getCustomerById(id);
    })();
  }

  deleteCustomer(id) {
    const c = this.getActiveCustomer(id);
    if (toInt(c.balance) !== 0) {
      fail(c.balance < 0
        ? `Mijozning ${fmt(-c.balance)} qarzi bor. Avval hisobni yoping`
        : `Mijoz hisobida ${fmt(c.balance)} avans bor. Avval pulni qaytaring`);
    }
    this.db.prepare('UPDATE customers SET is_active = 0, updated_at = ? WHERE id = ?').run(now(), id);
    this.log('DELETE', 'customer', id, `Mijoz arxivlandi: ${c.name}`);
    return true;
  }

  customerDeposit(id, input = {}) {
    return this.db.transaction(() => {
      const c = this.getActiveCustomer(id);
      const amount = toInt(input.amount);
      if (amount <= 0) fail('Summani kiriting');
      const method = MONEY_METHODS.includes(input.method) ? input.method : 'cash';
      const note = opt(input.note) || (c.balance < 0 ? "Qarz to'lovi" : "Hisobga pul qo'yildi");
      const tx = this.addCustomerTx(id, 'deposit', amount, method, null, note);
      this.log('PAYMENT_IN', 'customer', id, `${c.name}: +${fmt(amount)} (${method}). Balans: ${fmt(tx.balance_after)}`);
      return tx;
    })();
  }

  customerWithdraw(id, input = {}) {
    return this.db.transaction(() => {
      const c = this.getActiveCustomer(id);
      const amount = toInt(input.amount);
      if (amount <= 0) fail('Summani kiriting');
      if (amount > toInt(c.balance)) fail(`Mijoz hisobida faqat ${fmt(Math.max(0, c.balance))} bor`);
      const method = MONEY_METHODS.includes(input.method) ? input.method : 'cash';
      const tx = this.addCustomerTx(id, 'withdraw', -amount, method, null, opt(input.note) || 'Avans mijozga qaytarildi');
      this.log('PAYMENT_OUT', 'customer', id, `${c.name}: −${fmt(amount)} (${method}). Balans: ${fmt(tx.balance_after)}`);
      return tx;
    })();
  }

  customerAdjust(id, input = {}) {
    return this.db.transaction(() => {
      const c = this.getActiveCustomer(id);
      const amount = toInt(input.amount);
      if (!amount) fail('Summani kiriting');
      const note = opt(input.note);
      if (!note) fail('Tuzatish sababini yozing');
      const tx = this.addCustomerTx(id, 'adjustment', amount, null, null, note);
      this.log('ADJUST', 'customer', id, `${c.name}: ${amount > 0 ? '+' : '−'}${fmt(Math.abs(amount))} (${note})`);
      return tx;
    })();
  }

  // ================= SALES =================

  createSale(input = {}) {
    return this.db.transaction(() => {
      const settings = this.getSettings();
      const rawItems = Array.isArray(input.items) ? input.items : [];
      if (!rawItems.length) fail("Savatcha bo'sh");

      const qtyById = new Map();
      rawItems.forEach((it) => {
        const q = toInt(it.quantity);
        if (q <= 0) fail("Miqdor noto'g'ri");
        const pid = Number(it.product_id);
        qtyById.set(pid, (qtyById.get(pid) || 0) + q);
      });

      const getProduct = this.db.prepare('SELECT * FROM products WHERE id = ? AND is_active = 1');
      const lines = [];
      let subtotal = 0;
      qtyById.forEach((qty, pid) => {
        const p = getProduct.get(pid);
        if (!p) fail("Mahsulot topilmadi yoki o'chirilgan");
        if (p.stock < qty) fail(`"${p.name}" omborda yetarli emas. Qoldiq: ${p.stock} ${p.unit || 'dona'}`);
        const price = toInt(p.sell_price);
        lines.push({ p, qty, price });
        subtotal += price * qty;
      });

      const discountType = input.discount_type === 'amount' ? 'amount' : 'percent';
      const discountValue = Math.max(0, Number(input.discount) || 0);
      if (discountType === 'percent' && discountValue > 100) fail('Chegirma 100% dan oshmasligi kerak');
      const discountAmount = discountType === 'percent' ? Math.round((subtotal * discountValue) / 100) : toInt(discountValue);
      if (discountAmount > subtotal) fail('Chegirma umumiy summadan katta');
      const finalTotal = subtotal - discountAmount;

      const customer = input.customer_id ? this.getActiveCustomer(input.customer_id) : null;

      const payments = {};
      let paid = 0;
      MONEY_METHODS.forEach((m) => {
        const v = toInt(input.payments && input.payments[m]);
        if (v < 0) fail("To'lov summasi manfiy bo'lishi mumkin emas");
        if (v > 0) { payments[m] = v; paid += v; }
      });

      const balanceUsed = toInt(input.balance_used);
      if (balanceUsed < 0) fail("Hisobdan yechiladigan summa noto'g'ri");
      if (balanceUsed > 0) {
        if (!customer) fail('Hisobdan yechish uchun mijozni tanlang');
        if (balanceUsed > Math.max(0, toInt(customer.balance))) fail(`Mijoz hisobida faqat ${fmt(Math.max(0, customer.balance))} bor`);
        if (balanceUsed > finalTotal) fail('Hisobdan yechiladigan summa sotuv summasidan katta');
      }

      const need = finalTotal - balanceUsed;
      let debt = 0;
      let change = 0;
      const applied = { ...payments };
      const changeParts = {};

      if (paid >= need) {
        change = paid - need;
        if (change > 0) {
          const toBalance = Boolean(input.change_to_balance);
          if (toBalance && !customer) fail('Qaytimni hisobga yozish uchun mijozni tanlang');
          if (!toBalance && change > (payments.cash || 0)) {
            fail("Qaytim faqat naqd puldan beriladi. Karta, Click yoki Payme summasini kamaytiring");
          }
          let rest = change;
          MONEY_METHODS.forEach((m) => {
            const take = Math.min(rest, applied[m] || 0);
            if (take > 0) { applied[m] -= take; changeParts[m] = take; rest -= take; }
          });
        }
      } else {
        debt = need - paid;
        if (!customer) fail("To'lov yetarli emas. Qarzga sotish uchun mijozni tanlang");
        if (settings.allowDebt === 'false') fail("Qarzga sotish sozlamalarda o'chirilgan");
        const after = toInt(customer.balance) - balanceUsed - debt;
        if (customer.debt_limit !== null && customer.debt_limit !== undefined && -after > customer.debt_limit) {
          fail(toInt(customer.debt_limit) === 0
            ? 'Bu mijozga qarzga sotish taqiqlangan'
            : `Qarz limiti oshadi. Limit: ${fmt(customer.debt_limit)}, sotuvdan keyingi qarz: ${fmt(-after)}`);
        }
      }
      const changeToBalance = change > 0 && input.change_to_balance ? change : 0;

      const ts = now();
      const saleNumber = this.nextNumber('sales', 'S');
      const methods = MONEY_METHODS.filter((m) => applied[m] > 0);
      if (balanceUsed > 0) methods.push('balance');
      if (debt > 0) methods.push('debt');
      const paymentMethod = methods.length === 1 ? methods[0] : methods.length ? 'mixed' : 'cash';

      const saleId = Number(this.db.prepare(`
        INSERT INTO sales (sale_number, customer_id, total, discount, discount_type, final_total, payment_method,
          loyalty_points_used, loyalty_points_earned, status, notes, created_at,
          paid_amount, balance_used, debt_amount, change_amount, change_to_balance)
        VALUES (?, ?, ?, ?, ?, ?, ?, 0, 0, 'completed', ?, ?, ?, ?, ?, ?, ?)
      `).run(saleNumber, customer ? customer.id : null, subtotal, discountValue, discountType, finalTotal, paymentMethod,
        opt(input.notes), ts, paid - change, balanceUsed, debt, change, changeToBalance).lastInsertRowid);

      const insPayment = this.db.prepare('INSERT INTO sale_payments (sale_id, method, amount) VALUES (?, ?, ?)');
      MONEY_METHODS.forEach((m) => { if (applied[m] > 0) insPayment.run(saleId, m, applied[m]); });
      if (balanceUsed > 0) insPayment.run(saleId, 'balance', balanceUsed);
      if (debt > 0) insPayment.run(saleId, 'debt', debt);

      // FEFO: avval yaroqlilik muddati eng yaqin partiyadan sotiladi
      const getBatches = this.db.prepare(`SELECT * FROM product_batches WHERE product_id = ? AND remaining > 0
        ORDER BY (expiry_date IS NULL), expiry_date, id`);
      const takeBatch = this.db.prepare('UPDATE product_batches SET remaining = remaining - ? WHERE id = ?');
      const insItem = this.db.prepare(`INSERT INTO sale_items (sale_id, product_id, batch_id, quantity, price, cost_price, total)
        VALUES (?, ?, ?, ?, ?, ?, ?)`);
      const updStock = this.db.prepare('UPDATE products SET stock = stock - ?, updated_at = ? WHERE id = ?');

      lines.forEach(({ p, qty, price }) => {
        let remaining = qty;
        getBatches.all(p.id).forEach((b) => {
          if (remaining <= 0) return;
          const take = Math.min(remaining, b.remaining);
          takeBatch.run(take, b.id);
          insItem.run(saleId, p.id, b.id, take, price, b.cost_price, take * price);
          remaining -= take;
        });
        if (remaining > 0) insItem.run(saleId, p.id, null, remaining, price, p.cost_price, remaining * price);
        updStock.run(qty, ts, p.id);
      });

      let balanceAfter = customer ? toInt(customer.balance) : null;
      if (customer) {
        const charged = balanceUsed + debt;
        if (charged > 0) balanceAfter = this.addCustomerTx(customer.id, 'sale', -charged, null, saleId, `Xarid ${saleNumber}`).balance_after;
        if (changeToBalance > 0) {
          Object.entries(changeParts).forEach(([m, amount]) => {
            balanceAfter = this.addCustomerTx(customer.id, 'deposit', amount, m, saleId, `Qaytim hisobga yozildi (${saleNumber})`).balance_after;
          });
        }
      }

      const who = customer ? `, mijoz: ${customer.name}` : '';
      const debtNote = debt > 0 ? `, qarzga: ${fmt(debt)}` : '';
      this.log('SALE', 'sale', saleId, `Sotuv ${saleNumber}: ${fmt(finalTotal)}${who}${debtNote}`);

      return {
        id: saleId,
        sale_number: saleNumber,
        final_total: finalTotal,
        change: changeToBalance ? 0 : change,
        debt,
        balance_after: balanceAfter,
      };
    })();
  }

  getSales(filters = {}) {
    const [from, to] = range(filters);
    let where = 'WHERE date(s.created_at) BETWEEN ? AND ?';
    const params = [from, to];
    if (filters.status) { where += ' AND s.status = ?'; params.push(filters.status); }
    if (filters.customer_id) { where += ' AND s.customer_id = ?'; params.push(filters.customer_id); }
    if (filters.onlyDebt) where += ' AND s.debt_amount > 0';
    const q = opt(filters.search);
    if (q) { where += ' AND (s.sale_number LIKE ? OR c.name LIKE ? OR c.phone LIKE ?)'; params.push(`%${q}%`, `%${q}%`, `%${q}%`); }
    return this.db.prepare(`
      SELECT s.*, c.name AS customer_name, c.phone AS customer_phone,
        (SELECT GROUP_CONCAT(method) FROM sale_payments WHERE sale_id = s.id) AS methods,
        (SELECT COALESCE(SUM(quantity), 0) FROM sale_items WHERE sale_id = s.id) AS items_qty
      FROM sales s LEFT JOIN customers c ON c.id = s.customer_id
      ${where} ORDER BY s.id DESC LIMIT 1000
    `).all(...params);
  }

  getSaleById(id) {
    const sale = this.db.prepare(`
      SELECT s.*, c.name AS customer_name, c.phone AS customer_phone, c.balance AS customer_balance
      FROM sales s LEFT JOIN customers c ON c.id = s.customer_id WHERE s.id = ?
    `).get(id);
    if (!sale) return null;
    sale.items = this.db.prepare(`
      SELECT si.product_id, p.name AS product_name, p.code, p.brand, p.flavor, p.weight, p.unit, si.price,
        SUM(si.quantity) AS quantity, SUM(si.total) AS total, SUM(si.cost_price * si.quantity) AS cost
      FROM sale_items si JOIN products p ON p.id = si.product_id
      WHERE si.sale_id = ? GROUP BY si.product_id, si.price ORDER BY MIN(si.id)
    `).all(id);
    sale.payments = this.db.prepare('SELECT method, amount FROM sale_payments WHERE sale_id = ? ORDER BY id').all(id);
    return sale;
  }

  refundSale(id, options = {}) {
    return this.db.transaction(() => {
      const sale = this.db.prepare('SELECT * FROM sales WHERE id = ?').get(id);
      if (!sale) fail('Sotuv topilmadi');
      if (sale.status !== 'completed') fail('Bu sotuv allaqachon qaytarilgan');

      const ts = now();
      const items = this.db.prepare('SELECT * FROM sale_items WHERE sale_id = ?').all(id);
      const restoreStock = this.db.prepare('UPDATE products SET stock = stock + ?, updated_at = ? WHERE id = ?');
      const restoreBatch = this.db.prepare('UPDATE product_batches SET remaining = remaining + ? WHERE id = ?');
      items.forEach((it) => {
        restoreStock.run(it.quantity, ts, it.product_id);
        if (it.batch_id) restoreBatch.run(it.quantity, it.batch_id);
      });

      let refundCash = toInt(sale.paid_amount);
      if (sale.customer_id) {
        const back = toInt(sale.balance_used) + toInt(sale.debt_amount);
        if (back > 0) this.addCustomerTx(sale.customer_id, 'refund', back, null, id, `Qaytarish ${sale.sale_number}`);
        if (options.to_balance && refundCash > 0) {
          this.addCustomerTx(sale.customer_id, 'refund', refundCash, null, id, `Qaytarish ${sale.sale_number}: to'langan pul hisobga`);
          refundCash = 0;
        }
      }

      this.db.prepare("UPDATE sales SET status = 'refunded', refunded_at = ?, refund_cash = ? WHERE id = ?").run(ts, refundCash, id);
      this.log('REFUND', 'sale', id, `Qaytarish ${sale.sale_number}: ${fmt(sale.final_total)}${refundCash ? `, naqd qaytarildi ${fmt(refundCash)}` : ''}`);
      return { refund_cash: refundCash };
    })();
  }

  // ================= DASHBOARD & REPORTS =================

  getCashflow(filters = {}) {
    const [from, to] = range(filters);
    const rows = this.db.prepare(`
      SELECT d, method, SUM(amount) AS amount FROM (
        SELECT date(s.created_at) AS d, sp.method AS method, sp.amount AS amount
          FROM sale_payments sp JOIN sales s ON s.id = sp.sale_id
          WHERE sp.method IN ('cash','card','click','payme') AND date(s.created_at) BETWEEN @from AND @to
        UNION ALL
        SELECT date(created_at), method, amount FROM customer_transactions
          WHERE type IN ('deposit','withdraw') AND method IN ('cash','card','click','payme') AND date(created_at) BETWEEN @from AND @to
        UNION ALL
        SELECT date(refunded_at), 'cash', -refund_cash FROM sales
          WHERE status = 'refunded' AND refund_cash > 0 AND date(refunded_at) BETWEEN @from AND @to
      ) GROUP BY d, method
    `).all({ from, to });
    const debts = this.db.prepare(`
      SELECT date(created_at) AS d, SUM(debt_amount) AS debt FROM sales
      WHERE status = 'completed' AND debt_amount > 0 AND date(created_at) BETWEEN ? AND ? GROUP BY d
    `).all(from, to);

    const byDate = new Map();
    const row = (d) => {
      if (!byDate.has(d)) byDate.set(d, { date: d, cash: 0, card: 0, click: 0, payme: 0, total: 0, debt: 0 });
      return byDate.get(d);
    };
    rows.forEach((r) => { const x = row(r.d); x[r.method] += r.amount; x.total += r.amount; });
    debts.forEach((r) => { row(r.d).debt += r.debt; });
    const list = Array.from(byDate.values()).sort((a, b) => b.date.localeCompare(a.date));
    const totals = list.reduce((t, r) => {
      ['cash', 'card', 'click', 'payme', 'total', 'debt'].forEach((k) => { t[k] += r[k]; });
      return t;
    }, { cash: 0, card: 0, click: 0, payme: 0, total: 0, debt: 0 });
    return { rows: list, totals };
  }

  getDashboardStats() {
    const today = todayStr();
    const monthStart = `${today.slice(0, 8)}01`;
    const salesAgg = this.db.prepare(`SELECT COUNT(*) AS count, COALESCE(SUM(final_total), 0) AS revenue,
      COALESCE(SUM(debt_amount), 0) AS debt FROM sales WHERE status = 'completed' AND date(created_at) BETWEEN ? AND ?`);
    const costAgg = this.db.prepare(`SELECT COALESCE(SUM(si.cost_price * si.quantity), 0) AS cost
      FROM sale_items si JOIN sales s ON s.id = si.sale_id WHERE s.status = 'completed' AND date(s.created_at) BETWEEN ? AND ?`);
    const period = (from) => {
      const s = salesAgg.get(from, today);
      const { cost } = costAgg.get(from, today);
      return { ...s, cost, profit: s.revenue - cost };
    };

    const inventory = this.db.prepare(`
      SELECT COUNT(*) AS products,
        COALESCE(SUM(CASE WHEN stock > 0 THEN stock * cost_price END), 0) AS stock_value,
        COALESCE(SUM(CASE WHEN stock > 0 THEN stock * sell_price END), 0) AS retail_value,
        COALESCE(SUM(CASE WHEN stock <= min_stock THEN 1 ELSE 0 END), 0) AS low_stock,
        COALESCE(SUM(CASE WHEN stock <= 0 THEN 1 ELSE 0 END), 0) AS out_of_stock
      FROM products WHERE is_active = 1
    `).get();
    const expiring = this.getExpiringProducts();
    inventory.expiring = expiring.filter((b) => b.days_left >= 0).length;
    inventory.expired = expiring.filter((b) => b.days_left < 0).length;

    const topProducts = this.db.prepare(`
      SELECT p.id, p.name, p.brand, p.weight, p.flavor, SUM(si.quantity) AS qty, SUM(${REVENUE_EXPR}) AS revenue
      FROM sale_items si JOIN sales s ON s.id = si.sale_id JOIN products p ON p.id = si.product_id
      WHERE s.status = 'completed' AND date(s.created_at) BETWEEN ? AND ?
      GROUP BY p.id ORDER BY revenue DESC LIMIT 6
    `).all(monthStart, today);

    const recentSales = this.db.prepare(`
      SELECT s.id, s.sale_number, s.final_total, s.debt_amount, s.created_at, c.name AS customer_name
      FROM sales s LEFT JOIN customers c ON c.id = s.customer_id
      WHERE s.status = 'completed' ORDER BY s.id DESC LIMIT 8
    `).all();

    const from = shiftDate(today, -13);
    const dailyRows = this.db.prepare(`SELECT date(created_at) AS d, COUNT(*) AS count, SUM(final_total) AS revenue
      FROM sales WHERE status = 'completed' AND date(created_at) BETWEEN ? AND ? GROUP BY d`).all(from, today);
    const map = new Map(dailyRows.map((r) => [r.d, r]));
    const daily = [];
    for (let i = 13; i >= 0; i -= 1) {
      const d = shiftDate(today, -i);
      const r = map.get(d);
      daily.push({ date: d, revenue: r ? r.revenue : 0, count: r ? r.count : 0 });
    }

    return {
      today: period(today),
      month: period(monthStart),
      cashToday: this.getCashflow({ dateFrom: today, dateTo: today }).totals.total,
      inventory,
      customers: this.getCustomerSummary(),
      topProducts,
      recentSales,
      daily,
    };
  }

  getSalesReport(filters = {}) {
    const [from, to] = range(filters);
    return this.db.prepare(`
      SELECT date(s.created_at) AS date, COUNT(*) AS sales_count, SUM(s.final_total) AS revenue,
        SUM(s.total - s.final_total) AS discount, SUM(s.debt_amount) AS debt,
        SUM((SELECT COALESCE(SUM(cost_price * quantity), 0) FROM sale_items WHERE sale_id = s.id)) AS cost
      FROM sales s WHERE s.status = 'completed' AND date(s.created_at) BETWEEN ? AND ?
      GROUP BY date(s.created_at) ORDER BY date DESC
    `).all(from, to).map((r) => ({ ...r, profit: r.revenue - r.cost }));
  }

  getProductsReport(filters = {}) {
    const [from, to] = range(filters);
    return this.db.prepare(`
      SELECT p.id, p.code, p.name, p.brand, p.weight, p.flavor, p.unit, SUM(si.quantity) AS qty,
        SUM(${REVENUE_EXPR}) AS revenue, SUM(si.cost_price * si.quantity) AS cost
      FROM sale_items si JOIN sales s ON s.id = si.sale_id JOIN products p ON p.id = si.product_id
      WHERE s.status = 'completed' AND date(s.created_at) BETWEEN ? AND ?
      GROUP BY p.id ORDER BY revenue DESC
    `).all(from, to).map((r) => ({ ...r, profit: r.revenue - r.cost }));
  }

  getCategoriesReport(filters = {}) {
    const [from, to] = range(filters);
    return this.db.prepare(`
      SELECT COALESCE(pc.name, c.name, 'Kategoriyasiz') AS name, SUM(si.quantity) AS qty,
        SUM(${REVENUE_EXPR}) AS revenue, SUM(si.cost_price * si.quantity) AS cost
      FROM sale_items si JOIN sales s ON s.id = si.sale_id JOIN products p ON p.id = si.product_id
      LEFT JOIN categories c ON c.id = p.category_id LEFT JOIN categories pc ON pc.id = c.parent_id
      WHERE s.status = 'completed' AND date(s.created_at) BETWEEN ? AND ?
      GROUP BY 1 ORDER BY revenue DESC
    `).all(from, to).map((r) => ({ ...r, profit: r.revenue - r.cost }));
  }

  // ================= SETTINGS & AUDIT =================

  getSettings() {
    return this.db.prepare('SELECT key, value FROM settings').all().reduce((o, r) => { o[r.key] = r.value; return o; }, {});
  }

  updateSettings(input = {}) {
    const upsert = this.db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)');
    this.db.transaction(() => {
      SETTING_KEYS.forEach((k) => { if (input[k] !== undefined) upsert.run(k, String(input[k])); });
      this.log('SETTINGS', 'system', null, 'Sozlamalar yangilandi');
    })();
    return this.getSettings();
  }

  getAuditLog(filters = {}) {
    const [from, to] = range(filters);
    let where = 'WHERE date(created_at) BETWEEN ? AND ?';
    const params = [from, to];
    if (filters.action) { where += ' AND action = ?'; params.push(filters.action); }
    const q = opt(filters.search);
    if (q) { where += ' AND details LIKE ?'; params.push(`%${q}%`); }
    return this.db.prepare(`SELECT * FROM audit_log ${where} ORDER BY id DESC LIMIT 1000`).all(...params);
  }

  // ================= BACKUP =================

  async createBackup(filePath) {
    await this.db.backup(filePath);
    this.log('BACKUP', 'system', null, `Zaxira nusxa: ${filePath}`);
    return { path: filePath };
  }

  async autoBackup(keep = 14) {
    fs.mkdirSync(this.backupDir, { recursive: true });
    const file = path.join(this.backupDir, `oxygengym-${todayStr()}.db`);
    if (!fs.existsSync(file)) await this.db.backup(file);
    const files = fs.readdirSync(this.backupDir).filter((f) => /^oxygengym-\d{4}-\d{2}-\d{2}\.db$/.test(f)).sort();
    files.slice(0, Math.max(0, files.length - keep)).forEach((f) => fs.unlinkSync(path.join(this.backupDir, f)));
    return file;
  }

  getBackupInfo() {
    if (!fs.existsSync(this.backupDir)) return { dir: this.backupDir, files: [] };
    const files = fs.readdirSync(this.backupDir)
      .filter((f) => f.endsWith('.db'))
      .map((f) => {
        const st = fs.statSync(path.join(this.backupDir, f));
        return { name: f, size: st.size, modified: st.mtime.toISOString() };
      })
      .sort((a, b) => b.modified.localeCompare(a.modified));
    return { dir: this.backupDir, files };
  }

  async restoreBackup(filePath) {
    let probe = null;
    let valid = false;
    try {
      probe = new Database(filePath, { readonly: true, fileMustExist: true });
      valid = Boolean(probe.prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'products'").get());
    } catch (err) {
      valid = false;
    } finally {
      if (probe) probe.close();
    }
    if (!valid) fail("Bu fayl OxygenGym zaxira nusxasi emas yoki buzilgan");

    fs.mkdirSync(this.backupDir, { recursive: true });
    await this.db.backup(path.join(this.backupDir, `before-restore-${Date.now()}.db`));
    this.close();
    ['-wal', '-shm'].forEach((ext) => { if (fs.existsSync(this.dbPath + ext)) fs.unlinkSync(this.dbPath + ext); });
    fs.copyFileSync(filePath, this.dbPath);
    this.open();
    this.log('RESTORE', 'system', null, `Zaxira nusxadan tiklandi: ${filePath}`);
    return true;
  }
}

module.exports = DB;
