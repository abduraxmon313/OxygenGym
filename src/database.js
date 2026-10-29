const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const { app } = require('electron');
const log = require('electron-log');

class DB {
  constructor() {
    const userDataPath = app.getPath('userData');
    const dataDir = path.join(userDataPath, 'data');
    if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
    this.dbPath = path.join(dataDir, 'oxygengym.db');
    this.db = new Database(this.dbPath);
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('foreign_keys = ON');
    this.init();
    this.seedCategories();
    this.seedSettings();
    log.info('Database initialized at:', this.dbPath);
  }

  init() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        parent_id INTEGER,
        icon TEXT DEFAULT '📦',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (parent_id) REFERENCES categories(id)
      );

      CREATE TABLE IF NOT EXISTS suppliers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        phone TEXT,
        address TEXT,
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS products (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        barcode TEXT UNIQUE,
        category_id INTEGER,
        brand TEXT,
        description TEXT,
        image TEXT,
        cost_price REAL NOT NULL DEFAULT 0,
        sell_price REAL NOT NULL DEFAULT 0,
        stock INTEGER NOT NULL DEFAULT 0,
        min_stock INTEGER NOT NULL DEFAULT 3,
        weight TEXT,
        flavor TEXT,
        unit TEXT DEFAULT 'dona',
        is_active INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (category_id) REFERENCES categories(id)
      );

      CREATE TABLE IF NOT EXISTS product_batches (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        product_id INTEGER NOT NULL,
        receipt_id INTEGER,
        batch_number TEXT,
        quantity INTEGER NOT NULL DEFAULT 0,
        remaining INTEGER NOT NULL DEFAULT 0,
        cost_price REAL NOT NULL DEFAULT 0,
        expiry_date DATE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (product_id) REFERENCES products(id),
        FOREIGN KEY (receipt_id) REFERENCES stock_receipts(id)
      );

      CREATE TABLE IF NOT EXISTS customers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        phone TEXT,
        loyalty_points INTEGER DEFAULT 0,
        loyalty_tier TEXT DEFAULT 'Bronze',
        total_spent REAL DEFAULT 0,
        total_purchases INTEGER DEFAULT 0,
        birthday DATE,
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS sales (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        sale_number TEXT NOT NULL UNIQUE,
        customer_id INTEGER,
        total REAL NOT NULL DEFAULT 0,
        discount REAL DEFAULT 0,
        discount_type TEXT DEFAULT 'percent',
        final_total REAL NOT NULL DEFAULT 0,
        payment_method TEXT DEFAULT 'cash',
        loyalty_points_used INTEGER DEFAULT 0,
        loyalty_points_earned INTEGER DEFAULT 0,
        status TEXT DEFAULT 'completed',
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (customer_id) REFERENCES customers(id)
      );

      CREATE TABLE IF NOT EXISTS sale_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        sale_id INTEGER NOT NULL,
        product_id INTEGER NOT NULL,
        batch_id INTEGER,
        quantity INTEGER NOT NULL DEFAULT 1,
        price REAL NOT NULL,
        cost_price REAL NOT NULL DEFAULT 0,
        total REAL NOT NULL,
        FOREIGN KEY (sale_id) REFERENCES sales(id),
        FOREIGN KEY (product_id) REFERENCES products(id),
        FOREIGN KEY (batch_id) REFERENCES product_batches(id)
      );

      CREATE TABLE IF NOT EXISTS stock_receipts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        receipt_number TEXT NOT NULL UNIQUE,
        supplier_id INTEGER,
        total_items INTEGER DEFAULT 0,
        total_amount REAL DEFAULT 0,
        notes TEXT,
        status TEXT DEFAULT 'completed',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (supplier_id) REFERENCES suppliers(id)
      );

      CREATE TABLE IF NOT EXISTS stock_receipt_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        receipt_id INTEGER NOT NULL,
        product_id INTEGER NOT NULL,
        quantity INTEGER NOT NULL DEFAULT 0,
        cost_price REAL NOT NULL DEFAULT 0,
        expiry_date DATE,
        batch_number TEXT,
        FOREIGN KEY (receipt_id) REFERENCES stock_receipts(id),
        FOREIGN KEY (product_id) REFERENCES products(id)
      );

      CREATE TABLE IF NOT EXISTS audit_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        action TEXT NOT NULL,
        entity TEXT NOT NULL,
        entity_id INTEGER,
        details TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT
      );
    `);
  }

  seedCategories() {
    const count = this.db.prepare('SELECT COUNT(*) as c FROM categories').get();
    if (count.c > 0) return;
    const cats = [
      { name: 'Protein', icon: '💪', children: ['Whey Protein', 'Casein', 'Plant-Based', 'Mass Gainer'] },
      { name: 'Pre-Workout', icon: '⚡', children: ['Stimulant', 'Stim-Free'] },
      { name: 'Creatine', icon: '🔋', children: ['Monohydrate', 'HCL', 'Buffered'] },
      { name: 'Vitaminlar', icon: '💊', children: ['Zinc', 'Magnesium', 'Vitamin D', 'Multivitamin', 'Omega-3', 'Vitamin C'] },
      { name: 'Fat Burner', icon: '🔥', children: ['Thermogenic', 'L-Carnitine', 'CLA'] },
      { name: 'Amino Acids', icon: '💧', children: ['BCAA', 'EAA', 'Glutamine'] },
      { name: 'Joint Support', icon: '🦴', children: ['Glucosamine', 'Collagen', 'MSM'] },
      { name: 'Ichimliklar', icon: '🥤', children: ['Protein Shake', 'Energy Drink', 'BCAA Drink'] },
      { name: 'Aksessuarlar', icon: '🎽', children: ['Shaker', "Qo'lqop", 'Belt', 'Rezinka'] },
      { name: 'Boshqa', icon: '📦', children: [] },
    ];
    const insertParent = this.db.prepare('INSERT INTO categories (name, icon) VALUES (?, ?)');
    const insertChild = this.db.prepare('INSERT INTO categories (name, parent_id, icon) VALUES (?, ?, ?)');

    const transaction = this.db.transaction(() => {
      for (const cat of cats) {
        const result = insertParent.run(cat.name, cat.icon);
        const parentId = result.lastInsertRowid;
        for (const child of cat.children) {
          insertChild.run(child, parentId, cat.icon);
        }
      }
    });
    transaction();
  }

  seedSettings() {
    const count = this.db.prepare("SELECT COUNT(*) as c FROM settings").get();
    if (count.c > 0) return;
    const defaults = {
      shopName: 'OxygenGym',
      shopAddress: '',
      shopPhone: '',
      currency: "so'm",
      loyaltyEnabled: 'true',
      loyaltyPointsPerUnit: '1000',
      loyaltyBronzeMin: '0',
      loyaltyBronzeDiscount: '2',
      loyaltySilverMin: '1000',
      loyaltySilverDiscount: '5',
      loyaltyGoldMin: '5000',
      loyaltyGoldDiscount: '8',
      loyaltyDiamondMin: '15000',
      loyaltyDiamondDiscount: '12',
      lowStockAlert: '3',
      expiryAlertDays: '30',
    };
    const insert = this.db.prepare('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)');
    const t = this.db.transaction(() => {
      for (const [k, v] of Object.entries(defaults)) insert.run(k, v);
    });
    t();
  }

  // ===== CATEGORIES =====
  getCategories() {
    const parents = this.db.prepare('SELECT * FROM categories WHERE parent_id IS NULL ORDER BY name').all();
    return parents.map(p => ({
      ...p,
      children: this.db.prepare('SELECT * FROM categories WHERE parent_id = ? ORDER BY name').all(p.id),
    }));
  }

  // ===== PRODUCTS =====
  getProducts() {
    return this.db.prepare(`
      SELECT p.*, c.name as category_name,
        (SELECT c2.name FROM categories c2 WHERE c2.id = c.parent_id) as parent_category
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.is_active = 1
      ORDER BY p.name
    `).all();
  }

  getProductById(id) {
    const product = this.db.prepare(`
      SELECT p.*, c.name as category_name,
        (SELECT c2.name FROM categories c2 WHERE c2.id = c.parent_id) as parent_category
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.id = ?
    `).get(id);
    if (product) {
      product.batches = this.db.prepare(
        'SELECT * FROM product_batches WHERE product_id = ? AND remaining > 0 ORDER BY expiry_date ASC'
      ).all(id);
    }
    return product;
  }

  searchProducts(query) {
    const q = `%${query}%`;
    return this.db.prepare(`
      SELECT p.*, c.name as category_name
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.is_active = 1 AND (p.name LIKE ? OR p.barcode LIKE ? OR p.brand LIKE ?)
      ORDER BY p.name LIMIT 20
    `).all(q, q, q);
  }

  getProductByBarcode(barcode) {
    return this.db.prepare(`
      SELECT p.*, c.name as category_name
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.barcode = ? AND p.is_active = 1
    `).get(barcode);
  }

  createProduct(p) {
    const result = this.db.prepare(`
      INSERT INTO products (name, barcode, category_id, brand, description, image, cost_price, sell_price, stock, min_stock, weight, flavor, unit)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(p.name, p.barcode, p.category_id, p.brand, p.description, p.image, p.cost_price, p.sell_price, p.stock || 0, p.min_stock || 3, p.weight, p.flavor, p.unit || 'dona');
    this.log('CREATE', 'product', result.lastInsertRowid, `Yangi mahsulot: ${p.name}`);
    return { id: result.lastInsertRowid, success: true };
  }

  updateProduct(id, p) {
    this.db.prepare(`
      UPDATE products SET name=?, barcode=?, category_id=?, brand=?, description=?, image=?, cost_price=?, sell_price=?, min_stock=?, weight=?, flavor=?, unit=?, updated_at=CURRENT_TIMESTAMP
      WHERE id=?
    `).run(p.name, p.barcode, p.category_id, p.brand, p.description, p.image, p.cost_price, p.sell_price, p.min_stock, p.weight, p.flavor, p.unit, id);
    this.log('UPDATE', 'product', id, `Mahsulot yangilandi: ${p.name}`);
    return { success: true };
  }

  deleteProduct(id) {
    this.db.prepare('UPDATE products SET is_active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(id);
    this.log('DELETE', 'product', id, "Mahsulot o'chirildi");
    return { success: true };
  }

  getLowStockProducts() {
    return this.db.prepare(`
      SELECT p.*, c.name as category_name
      FROM products p LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.is_active = 1 AND p.stock <= p.min_stock
      ORDER BY p.stock ASC
    `).all();
  }

  getExpiringProducts(days = 30) {
    return this.db.prepare(`
      SELECT pb.*, p.name as product_name, p.barcode, p.sell_price
      FROM product_batches pb
      JOIN products p ON pb.product_id = p.id
      WHERE pb.remaining > 0
        AND pb.expiry_date IS NOT NULL
        AND pb.expiry_date <= date('now', '+' || ? || ' days')
      ORDER BY pb.expiry_date ASC
    `).all(days);
  }

  // ===== SALES =====
  createSale(sale) {
    const saleNum = 'S-' + Date.now();
    const t = this.db.transaction(() => {
      // Create sale
      const res = this.db.prepare(`
        INSERT INTO sales (sale_number, customer_id, total, discount, discount_type, final_total, payment_method, loyalty_points_used, loyalty_points_earned, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(saleNum, sale.customer_id, sale.total, sale.discount || 0, sale.discount_type || 'percent', sale.final_total, sale.payment_method || 'cash', sale.loyalty_points_used || 0, sale.loyalty_points_earned || 0, sale.notes);
      const saleId = res.lastInsertRowid;

      // Sale items + update stock with FEFO
      for (const item of sale.items) {
        let remaining = item.quantity;
        // FEFO: Get batches ordered by expiry
        const batches = this.db.prepare(
          'SELECT * FROM product_batches WHERE product_id = ? AND remaining > 0 ORDER BY expiry_date ASC'
        ).all(item.product_id);

        for (const batch of batches) {
          if (remaining <= 0) break;
          const take = Math.min(remaining, batch.remaining);
          this.db.prepare('UPDATE product_batches SET remaining = remaining - ? WHERE id = ?').run(take, batch.id);

          this.db.prepare(`
            INSERT INTO sale_items (sale_id, product_id, batch_id, quantity, price, cost_price, total)
            VALUES (?, ?, ?, ?, ?, ?, ?)
          `).run(saleId, item.product_id, batch.id, take, item.price, batch.cost_price, take * item.price);

          remaining -= take;
        }

        // If no batches or remaining, add without batch
        if (remaining > 0) {
          const product = this.db.prepare('SELECT cost_price FROM products WHERE id = ?').get(item.product_id);
          this.db.prepare(`
            INSERT INTO sale_items (sale_id, product_id, quantity, price, cost_price, total)
            VALUES (?, ?, ?, ?, ?, ?)
          `).run(saleId, item.product_id, remaining, item.price, product?.cost_price || 0, remaining * item.price);
        }

        // Update product stock
        this.db.prepare('UPDATE products SET stock = stock - ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(item.quantity, item.product_id);
      }

      // Update customer loyalty
      if (sale.customer_id) {
        this.db.prepare(`
          UPDATE customers SET
            loyalty_points = loyalty_points + ? - ?,
            total_spent = total_spent + ?,
            total_purchases = total_purchases + 1,
            updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `).run(sale.loyalty_points_earned || 0, sale.loyalty_points_used || 0, sale.final_total, sale.customer_id);
        this.updateCustomerTier(sale.customer_id);
      }

      this.log('SALE', 'sale', saleId, `Sotuv #${saleNum}: ${sale.final_total} so'm`);
      return { success: true, id: saleId, sale_number: saleNum };
    });
    return t();
  }

  updateCustomerTier(customerId) {
    const customer = this.db.prepare('SELECT loyalty_points FROM customers WHERE id = ?').get(customerId);
    if (!customer) return;
    const settings = this.getSettings();
    let tier = 'Bronze';
    if (customer.loyalty_points >= parseInt(settings.loyaltyDiamondMin)) tier = 'Diamond';
    else if (customer.loyalty_points >= parseInt(settings.loyaltyGoldMin)) tier = 'Gold';
    else if (customer.loyalty_points >= parseInt(settings.loyaltySilverMin)) tier = 'Silver';
    this.db.prepare('UPDATE customers SET loyalty_tier = ? WHERE id = ?').run(tier, customerId);
  }

  getSales(filters = {}) {
    let where = 'WHERE 1=1';
    const params = [];
    if (filters.dateFrom) { where += ' AND date(s.created_at) >= ?'; params.push(filters.dateFrom); }
    if (filters.dateTo) { where += ' AND date(s.created_at) <= ?'; params.push(filters.dateTo); }
    if (filters.status) { where += ' AND s.status = ?'; params.push(filters.status); }
    return this.db.prepare(`
      SELECT s.*, c.name as customer_name
      FROM sales s LEFT JOIN customers c ON s.customer_id = c.id
      ${where}
      ORDER BY s.created_at DESC
      LIMIT 200
    `).all(...params);
  }

  getSaleById(id) {
    const sale = this.db.prepare(`
      SELECT s.*, c.name as customer_name, c.phone as customer_phone
      FROM sales s LEFT JOIN customers c ON s.customer_id = c.id
      WHERE s.id = ?
    `).get(id);
    if (sale) {
      sale.items = this.db.prepare(`
        SELECT si.*, p.name as product_name, p.barcode
        FROM sale_items si JOIN products p ON si.product_id = p.id
        WHERE si.sale_id = ?
      `).all(id);
    }
    return sale;
  }

  refundSale(saleId) {
    const t = this.db.transaction(() => {
      const sale = this.getSaleById(saleId);
      if (!sale || sale.status === 'refunded') return { success: false, message: 'Qaytarish mumkin emas' };

      for (const item of sale.items) {
        this.db.prepare('UPDATE products SET stock = stock + ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(item.quantity, item.product_id);
        if (item.batch_id) {
          this.db.prepare('UPDATE product_batches SET remaining = remaining + ? WHERE id = ?').run(item.quantity, item.batch_id);
        }
      }

      if (sale.customer_id) {
        this.db.prepare(`
          UPDATE customers SET
            loyalty_points = loyalty_points - ? + ?,
            total_spent = total_spent - ?,
            total_purchases = total_purchases - 1,
            updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `).run(sale.loyalty_points_earned, sale.loyalty_points_used, sale.final_total, sale.customer_id);
        this.updateCustomerTier(sale.customer_id);
      }

      this.db.prepare("UPDATE sales SET status = 'refunded' WHERE id = ?").run(saleId);
      this.log('REFUND', 'sale', saleId, `Qaytarish #${sale.sale_number}`);
      return { success: true };
    });
    return t();
  }

  getSalesStats(period = 'today') {
    let dateFilter = "date(created_at) = date('now')";
    if (period === 'week') dateFilter = "created_at >= date('now', '-7 days')";
    if (period === 'month') dateFilter = "created_at >= date('now', '-30 days')";
    if (period === 'year') dateFilter = "created_at >= date('now', '-365 days')";

    return this.db.prepare(`
      SELECT
        COUNT(*) as total_sales,
        COALESCE(SUM(final_total), 0) as total_revenue,
        COALESCE(AVG(final_total), 0) as avg_sale
      FROM sales
      WHERE status = 'completed' AND ${dateFilter}
    `).get();
  }

  // ===== STOCK RECEIVING =====
  receiveStock(receipt) {
    const receiptNum = 'R-' + Date.now();
    const t = this.db.transaction(() => {
      const totalAmount = receipt.items.reduce((s, i) => s + i.quantity * i.cost_price, 0);
      const totalItems = receipt.items.reduce((s, i) => s + i.quantity, 0);

      const res = this.db.prepare(`
        INSERT INTO stock_receipts (receipt_number, supplier_id, total_items, total_amount, notes)
        VALUES (?, ?, ?, ?, ?)
      `).run(receiptNum, receipt.supplier_id, totalItems, totalAmount, receipt.notes);
      const receiptId = res.lastInsertRowid;

      for (const item of receipt.items) {
        // Receipt item
        this.db.prepare(`
          INSERT INTO stock_receipt_items (receipt_id, product_id, quantity, cost_price, expiry_date, batch_number)
          VALUES (?, ?, ?, ?, ?, ?)
        `).run(receiptId, item.product_id, item.quantity, item.cost_price, item.expiry_date, item.batch_number);

        // Create batch
        const batchNum = item.batch_number || `LOT-${Date.now()}-${item.product_id}`;
        this.db.prepare(`
          INSERT INTO product_batches (product_id, receipt_id, batch_number, quantity, remaining, cost_price, expiry_date)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run(item.product_id, receiptId, batchNum, item.quantity, item.quantity, item.cost_price, item.expiry_date);

        // Update product stock & cost
        this.db.prepare(`
          UPDATE products SET stock = stock + ?, cost_price = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?
        `).run(item.quantity, item.cost_price, item.product_id);
      }

      this.log('RECEIVE', 'stock', receiptId, `Kirim #${receiptNum}: ${totalItems} dona, ${totalAmount} so'm`);
      return { success: true, id: receiptId, receipt_number: receiptNum };
    });
    return t();
  }

  getStockReceipts(filters = {}) {
    let where = 'WHERE 1=1';
    const params = [];
    if (filters.dateFrom) { where += ' AND date(sr.created_at) >= ?'; params.push(filters.dateFrom); }
    if (filters.dateTo) { where += ' AND date(sr.created_at) <= ?'; params.push(filters.dateTo); }
    return this.db.prepare(`
      SELECT sr.*, s.name as supplier_name
      FROM stock_receipts sr LEFT JOIN suppliers s ON sr.supplier_id = s.id
      ${where}
      ORDER BY sr.created_at DESC LIMIT 200
    `).all(...params);
  }

  getStockReceiptById(id) {
    const receipt = this.db.prepare(`
      SELECT sr.*, s.name as supplier_name
      FROM stock_receipts sr LEFT JOIN suppliers s ON sr.supplier_id = s.id
      WHERE sr.id = ?
    `).get(id);
    if (receipt) {
      receipt.items = this.db.prepare(`
        SELECT sri.*, p.name as product_name, p.barcode
        FROM stock_receipt_items sri JOIN products p ON sri.product_id = p.id
        WHERE sri.receipt_id = ?
      `).all(id);
    }
    return receipt;
  }

  getProductBatches(productId) {
    return this.db.prepare(`
      SELECT * FROM product_batches WHERE product_id = ? AND remaining > 0 ORDER BY expiry_date ASC
    `).all(productId);
  }

  // ===== CUSTOMERS =====
  getCustomers() {
    return this.db.prepare('SELECT * FROM customers ORDER BY name').all();
  }
  getCustomerById(id) {
    return this.db.prepare('SELECT * FROM customers WHERE id = ?').get(id);
  }
  createCustomer(c) {
    const res = this.db.prepare(`
      INSERT INTO customers (name, phone, birthday, notes) VALUES (?, ?, ?, ?)
    `).run(c.name, c.phone, c.birthday, c.notes);
    this.log('CREATE', 'customer', res.lastInsertRowid, `Yangi mijoz: ${c.name}`);
    return { id: res.lastInsertRowid, success: true };
  }
  updateCustomer(id, c) {
    this.db.prepare(`
      UPDATE customers SET name=?, phone=?, birthday=?, notes=?, updated_at=CURRENT_TIMESTAMP WHERE id=?
    `).run(c.name, c.phone, c.birthday, c.notes, id);
    return { success: true };
  }
  deleteCustomer(id) {
    this.db.prepare('DELETE FROM customers WHERE id = ?').run(id);
    return { success: true };
  }
  searchCustomers(query) {
    const q = `%${query}%`;
    return this.db.prepare('SELECT * FROM customers WHERE name LIKE ? OR phone LIKE ? LIMIT 20').all(q, q);
  }

  // ===== SUPPLIERS =====
  getSuppliers() {
    return this.db.prepare('SELECT * FROM suppliers ORDER BY name').all();
  }
  createSupplier(s) {
    const res = this.db.prepare('INSERT INTO suppliers (name, phone, address, notes) VALUES (?, ?, ?, ?)').run(s.name, s.phone, s.address, s.notes);
    return { id: res.lastInsertRowid, success: true };
  }
  updateSupplier(id, s) {
    this.db.prepare('UPDATE suppliers SET name=?, phone=?, address=?, notes=?, updated_at=CURRENT_TIMESTAMP WHERE id=?').run(s.name, s.phone, s.address, s.notes, id);
    return { success: true };
  }
  deleteSupplier(id) {
    this.db.prepare('DELETE FROM suppliers WHERE id = ?').run(id);
    return { success: true };
  }

  // ===== DASHBOARD =====
  getDashboardStats() {
    const today = this.db.prepare(`
      SELECT COUNT(*) as count, COALESCE(SUM(final_total),0) as revenue
      FROM sales WHERE status='completed' AND date(created_at)=date('now')
    `).get();

    const month = this.db.prepare(`
      SELECT COUNT(*) as count, COALESCE(SUM(final_total),0) as revenue
      FROM sales WHERE status='completed' AND created_at >= date('now','start of month')
    `).get();

    const todayProfit = this.db.prepare(`
      SELECT COALESCE(SUM(si.total - si.cost_price * si.quantity), 0) as profit
      FROM sale_items si JOIN sales s ON si.sale_id = s.id
      WHERE s.status='completed' AND date(s.created_at)=date('now')
    `).get();

    const monthProfit = this.db.prepare(`
      SELECT COALESCE(SUM(si.total - si.cost_price * si.quantity), 0) as profit
      FROM sale_items si JOIN sales s ON si.sale_id = s.id
      WHERE s.status='completed' AND s.created_at >= date('now','start of month')
    `).get();

    const lowStock = this.db.prepare(`
      SELECT COUNT(*) as count FROM products WHERE is_active=1 AND stock <= min_stock
    `).get();

    const expiring = this.db.prepare(`
      SELECT COUNT(*) as count FROM product_batches
      WHERE remaining > 0 AND expiry_date IS NOT NULL AND expiry_date <= date('now','+30 days')
    `).get();

    const totalProducts = this.db.prepare('SELECT COUNT(*) as count FROM products WHERE is_active=1').get();
    const totalCustomers = this.db.prepare('SELECT COUNT(*) as count FROM customers').get();

    const topProducts = this.db.prepare(`
      SELECT p.name, SUM(si.quantity) as qty, SUM(si.total) as revenue
      FROM sale_items si JOIN products p ON si.product_id = p.id
      JOIN sales s ON si.sale_id = s.id
      WHERE s.status='completed' AND s.created_at >= date('now','start of month')
      GROUP BY si.product_id ORDER BY qty DESC LIMIT 5
    `).all();

    const recentSales = this.db.prepare(`
      SELECT s.*, c.name as customer_name
      FROM sales s LEFT JOIN customers c ON s.customer_id = c.id
      WHERE s.status='completed'
      ORDER BY s.created_at DESC LIMIT 10
    `).all();

    const dailySales = this.db.prepare(`
      SELECT date(created_at) as date, SUM(final_total) as revenue, COUNT(*) as count
      FROM sales WHERE status='completed' AND created_at >= date('now','-7 days')
      GROUP BY date(created_at) ORDER BY date
    `).all();

    return {
      today: { ...today, profit: todayProfit.profit },
      month: { ...month, profit: monthProfit.profit },
      lowStock: lowStock.count,
      expiring: expiring.count,
      totalProducts: totalProducts.count,
      totalCustomers: totalCustomers.count,
      topProducts,
      recentSales,
      dailySales,
    };
  }

  // ===== REPORTS =====
  getSalesReport(filters = {}) {
    let where = "WHERE s.status='completed'";
    const params = [];
    if (filters.dateFrom) { where += ' AND date(s.created_at) >= ?'; params.push(filters.dateFrom); }
    if (filters.dateTo) { where += ' AND date(s.created_at) <= ?'; params.push(filters.dateTo); }
    return this.db.prepare(`
      SELECT date(s.created_at) as date, COUNT(*) as sales_count,
        SUM(s.final_total) as revenue,
        SUM(si_agg.profit) as profit
      FROM sales s
      LEFT JOIN (SELECT sale_id, SUM(total - cost_price * quantity) as profit FROM sale_items GROUP BY sale_id) si_agg ON si_agg.sale_id = s.id
      ${where}
      GROUP BY date(s.created_at) ORDER BY date DESC
    `).all(...params);
  }

  getProductsReport(filters = {}) {
    let where = "WHERE s.status='completed'";
    const params = [];
    if (filters.dateFrom) { where += ' AND date(s.created_at) >= ?'; params.push(filters.dateFrom); }
    if (filters.dateTo) { where += ' AND date(s.created_at) <= ?'; params.push(filters.dateTo); }
    return this.db.prepare(`
      SELECT p.name, p.barcode, SUM(si.quantity) as qty_sold, SUM(si.total) as revenue,
        SUM(si.total - si.cost_price * si.quantity) as profit
      FROM sale_items si JOIN products p ON si.product_id = p.id
      JOIN sales s ON si.sale_id = s.id
      ${where}
      GROUP BY si.product_id ORDER BY qty_sold DESC
    `).all(...params);
  }

  getProfitReport(filters = {}) {
    let where = "WHERE s.status='completed'";
    const params = [];
    if (filters.dateFrom) { where += ' AND date(s.created_at) >= ?'; params.push(filters.dateFrom); }
    if (filters.dateTo) { where += ' AND date(s.created_at) <= ?'; params.push(filters.dateTo); }
    return this.db.prepare(`
      SELECT date(s.created_at) as date,
        SUM(s.final_total) as revenue,
        SUM(si_agg.cost) as cost,
        SUM(s.final_total) - SUM(si_agg.cost) as profit
      FROM sales s
      LEFT JOIN (SELECT sale_id, SUM(cost_price * quantity) as cost FROM sale_items GROUP BY sale_id) si_agg ON si_agg.sale_id = s.id
      ${where}
      GROUP BY date(s.created_at) ORDER BY date DESC
    `).all(...params);
  }

  // ===== SETTINGS =====
  getSettings() {
    const rows = this.db.prepare('SELECT * FROM settings').all();
    return rows.reduce((obj, r) => { obj[r.key] = r.value; return obj; }, {});
  }
  updateSettings(settings) {
    const upsert = this.db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)');
    const t = this.db.transaction(() => {
      for (const [k, v] of Object.entries(settings)) upsert.run(k, String(v));
    });
    t();
    return { success: true };
  }

  // ===== AUDIT =====
  log(action, entity, entityId, details) {
    this.db.prepare('INSERT INTO audit_log (action, entity, entity_id, details) VALUES (?, ?, ?, ?)').run(action, entity, entityId, details);
  }
  getAuditLog(filters = {}) {
    let where = 'WHERE 1=1';
    const params = [];
    if (filters.dateFrom) { where += ' AND date(created_at) >= ?'; params.push(filters.dateFrom); }
    if (filters.dateTo) { where += ' AND date(created_at) <= ?'; params.push(filters.dateTo); }
    if (filters.action) { where += ' AND action = ?'; params.push(filters.action); }
    return this.db.prepare(`SELECT * FROM audit_log ${where} ORDER BY created_at DESC LIMIT 500`).all(...params);
  }

  // ===== BACKUP =====
  createBackup(filePath) {
    try {
      this.db.backup(filePath);
      this.log('BACKUP', 'system', null, `Zaxira nusxa: ${filePath}`);
      return { success: true, path: filePath };
    } catch (err) {
      return { success: false, message: err.message };
    }
  }

  restoreBackup(filePath) {
    try {
      this.db.close();
      fs.copyFileSync(filePath, this.dbPath);
      this.db = new Database(this.dbPath);
      this.db.pragma('journal_mode = WAL');
      this.db.pragma('foreign_keys = ON');
      this.log('RESTORE', 'system', null, `Tiklandi: ${filePath}`);
      return { success: true };
    } catch (err) {
      return { success: false, message: err.message };
    }
  }

  close() {
    if (this.db) this.db.close();
  }
}

module.exports = DB;
