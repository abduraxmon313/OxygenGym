const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const log = require('electron-log');
const { autoUpdater } = require('electron-updater');

// Database
const Database = require('./src/database');
let db;

let mainWindow;

// Auto-updater config
autoUpdater.logger = log;
autoUpdater.autoDownload = false;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 700,
    title: 'OxygenGym',
    icon: path.join(__dirname, 'assets', 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    autoHideMenuBar: true,
    show: false,
  });

  // Load React app
  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:3000');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, 'renderer', 'build', 'index.html'));
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    mainWindow.maximize();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Check for updates after window loads
  mainWindow.webContents.on('did-finish-load', () => {
    checkForUpdates();
  });
}

// ===== AUTO UPDATER =====
function checkForUpdates() {
  autoUpdater.checkForUpdates().catch((err) => {
    log.warn('Update check failed:', err.message);
  });
}

autoUpdater.on('update-available', (info) => {
  mainWindow?.webContents.send('update-available', {
    version: info.version,
    releaseNotes: info.releaseNotes || '',
  });
});

autoUpdater.on('download-progress', (progress) => {
  mainWindow?.webContents.send('update-progress', {
    percent: Math.round(progress.percent),
  });
});

autoUpdater.on('update-downloaded', () => {
  mainWindow?.webContents.send('update-downloaded');
});

ipcMain.handle('start-update-download', () => {
  autoUpdater.downloadUpdate();
});

ipcMain.handle('install-update', () => {
  autoUpdater.quitAndInstall();
});

// ===== DATABASE OPERATIONS =====

// -- Products --
ipcMain.handle('products:getAll', () => db.getProducts());
ipcMain.handle('products:getById', (_, id) => db.getProductById(id));
ipcMain.handle('products:search', (_, query) => db.searchProducts(query));
ipcMain.handle('products:getByBarcode', (_, barcode) => db.getProductByBarcode(barcode));
ipcMain.handle('products:create', (_, product) => db.createProduct(product));
ipcMain.handle('products:update', (_, id, product) => db.updateProduct(id, product));
ipcMain.handle('products:delete', (_, id) => db.deleteProduct(id));
ipcMain.handle('products:getLowStock', () => db.getLowStockProducts());
ipcMain.handle('products:getExpiring', (_, days) => db.getExpiringProducts(days));
ipcMain.handle('products:getCategories', () => db.getCategories());

// -- Sales --
ipcMain.handle('sales:create', (_, sale) => db.createSale(sale));
ipcMain.handle('sales:getAll', (_, filters) => db.getSales(filters));
ipcMain.handle('sales:getById', (_, id) => db.getSaleById(id));
ipcMain.handle('sales:refund', (_, saleId, items) => db.refundSale(saleId, items));
ipcMain.handle('sales:getStats', (_, period) => db.getSalesStats(period));

// -- Stock/Inventory --
ipcMain.handle('stock:receive', (_, receipt) => db.receiveStock(receipt));
ipcMain.handle('stock:getReceipts', (_, filters) => db.getStockReceipts(filters));
ipcMain.handle('stock:getReceiptById', (_, id) => db.getStockReceiptById(id));
ipcMain.handle('stock:getBatches', (_, productId) => db.getProductBatches(productId));

// -- Customers --
ipcMain.handle('customers:getAll', () => db.getCustomers());
ipcMain.handle('customers:getById', (_, id) => db.getCustomerById(id));
ipcMain.handle('customers:create', (_, customer) => db.createCustomer(customer));
ipcMain.handle('customers:update', (_, id, customer) => db.updateCustomer(id, customer));
ipcMain.handle('customers:delete', (_, id) => db.deleteCustomer(id));
ipcMain.handle('customers:search', (_, query) => db.searchCustomers(query));

// -- Suppliers --
ipcMain.handle('suppliers:getAll', () => db.getSuppliers());
ipcMain.handle('suppliers:create', (_, supplier) => db.createSupplier(supplier));
ipcMain.handle('suppliers:update', (_, id, supplier) => db.updateSupplier(id, supplier));
ipcMain.handle('suppliers:delete', (_, id) => db.deleteSupplier(id));

// -- Dashboard / Reports --
ipcMain.handle('dashboard:getStats', () => db.getDashboardStats());
ipcMain.handle('reports:sales', (_, filters) => db.getSalesReport(filters));
ipcMain.handle('reports:products', (_, filters) => db.getProductsReport(filters));
ipcMain.handle('reports:profit', (_, filters) => db.getProfitReport(filters));

// -- Backup --
ipcMain.handle('backup:create', async () => {
  const result = await dialog.showSaveDialog(mainWindow, {
    title: "Zaxira nusxa saqlash",
    defaultPath: `OxygenGym-backup-${new Date().toISOString().split('T')[0]}.db`,
    filters: [{ name: 'Database', extensions: ['db'] }],
  });
  if (!result.canceled && result.filePath) {
    return db.createBackup(result.filePath);
  }
  return { success: false, message: 'Bekor qilindi' };
});

ipcMain.handle('backup:restore', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: "Zaxira nusxadan tiklash",
    filters: [{ name: 'Database', extensions: ['db'] }],
    properties: ['openFile'],
  });
  if (!result.canceled && result.filePaths[0]) {
    return db.restoreBackup(result.filePaths[0]);
  }
  return { success: false, message: 'Bekor qilindi' };
});

// -- Settings --
ipcMain.handle('settings:get', () => db.getSettings());
ipcMain.handle('settings:update', (_, settings) => db.updateSettings(settings));

// -- Audit Log --
ipcMain.handle('audit:getLog', (_, filters) => db.getAuditLog(filters));

// App lifecycle
app.whenReady().then(() => {
  db = new Database();
  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

app.on('before-quit', () => {
  if (db) db.close();
});
