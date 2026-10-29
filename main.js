'use strict';

const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const log = require('electron-log');
const { autoUpdater } = require('electron-updater');
const DB = require('./src/database');

let db = null;
let mainWindow = null;
const isDev = process.env.NODE_ENV === 'development';
const UPDATE_INTERVAL_MS = 4 * 60 * 60 * 1000;

// ===== IPC: barcha xatolar renderer'ga toza matn sifatida qaytadi =====
function handle(channel, fn) {
  ipcMain.handle(channel, async (_event, ...args) => {
    try {
      return { ok: true, data: await fn(...args) };
    } catch (err) {
      log.warn(`[ipc] ${channel}:`, err && err.message);
      return { ok: false, error: (err && err.message) || String(err) };
    }
  });
}

function send(channel, payload) {
  if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send(channel, payload);
}

// ===== WINDOW =====
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1180,
    minHeight: 720,
    title: 'OxygenGym',
    backgroundColor: '#f4f5f7',
    icon: path.join(__dirname, 'assets', 'icon.png'),
    autoHideMenuBar: true,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:3000');
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    mainWindow.loadFile(path.join(__dirname, 'renderer', 'build', 'index.html'));
  }

  mainWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  mainWindow.webContents.on('will-navigate', (e, url) => {
    if (!url.startsWith('file://') && !url.startsWith('http://localhost:3000')) e.preventDefault();
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow.maximize();
    mainWindow.show();
  });
  mainWindow.on('closed', () => { mainWindow = null; });
  mainWindow.webContents.once('did-finish-load', () => {
    setTimeout(checkForUpdates, 5000);
  });
}

// ===== AUTO UPDATE (GitHub Releases) =====
autoUpdater.logger = log;
autoUpdater.autoDownload = false;
autoUpdater.autoInstallOnAppQuit = true;

autoUpdater.on('update-available', (info) => send('update:available', { version: info.version }));
autoUpdater.on('update-not-available', () => send('update:not-available'));
autoUpdater.on('download-progress', (p) => send('update:progress', { percent: Math.round(p.percent) }));
autoUpdater.on('update-downloaded', (info) => send('update:downloaded', { version: info.version }));
autoUpdater.on('error', (err) => {
  log.warn('Updater error:', err && err.message);
  send('update:error', { message: (err && err.message) || 'Noma\'lum xatolik' });
});

function checkForUpdates() {
  if (!app.isPackaged) return Promise.resolve(null);
  return autoUpdater.checkForUpdates().catch((err) => {
    log.warn('Update check failed:', err && err.message);
    return null;
  });
}

function isNewer(a, b) {
  const pa = String(a).split('.').map(Number);
  const pb = String(b).split('.').map(Number);
  for (let i = 0; i < 3; i += 1) {
    if ((pa[i] || 0) > (pb[i] || 0)) return true;
    if ((pa[i] || 0) < (pb[i] || 0)) return false;
  }
  return false;
}

handle('updates:check', async () => {
  if (!app.isPackaged) return { available: false, dev: true, current: app.getVersion() };
  const result = await autoUpdater.checkForUpdates();
  const latest = result && result.updateInfo ? result.updateInfo.version : null;
  return { available: Boolean(latest && isNewer(latest, app.getVersion())), latest, current: app.getVersion() };
});
handle('updates:download', () => {
  autoUpdater.downloadUpdate().catch((err) => send('update:error', { message: err.message }));
  return true;
});
handle('updates:install', () => {
  setImmediate(() => autoUpdater.quitAndInstall(false, true));
  return true;
});

// ===== APP =====
handle('app:info', () => ({
  version: app.getVersion(),
  dataDir: db.dataDir,
  backupDir: db.backupDir,
  isPackaged: app.isPackaged,
}));
handle('app:openBackupFolder', async () => {
  fs.mkdirSync(db.backupDir, { recursive: true });
  const error = await shell.openPath(db.backupDir);
  if (error) throw new Error(error);
  return true;
});

// ===== PRODUCTS =====
handle('products:getAll', () => db.getProducts());
handle('products:getById', (id) => db.getProductById(id));
handle('products:create', (p) => db.createProduct(p));
handle('products:update', (id, p) => db.updateProduct(id, p));
handle('products:remove', (id) => db.deleteProduct(id));
handle('products:nextCode', () => db.nextProductCode());
handle('products:lowStock', () => db.getLowStockProducts());
handle('products:expiring', (days) => db.getExpiringProducts(days));
handle('products:categories', () => db.getCategories());
handle('products:brands', () => db.getBrands());

// ===== STOCK =====
handle('stock:receive', (r) => db.receiveStock(r));
handle('stock:receipts', (f) => db.getStockReceipts(f));
handle('stock:receiptById', (id) => db.getStockReceiptById(id));

// ===== SALES =====
handle('sales:create', (s) => db.createSale(s));
handle('sales:list', (f) => db.getSales(f));
handle('sales:getById', (id) => db.getSaleById(id));
handle('sales:refund', (id, opts) => db.refundSale(id, opts));

// ===== CUSTOMERS =====
handle('customers:list', (f) => db.getCustomers(f));
handle('customers:getById', (id) => db.getCustomerById(id));
handle('customers:create', (c) => db.createCustomer(c));
handle('customers:update', (id, c) => db.updateCustomer(id, c));
handle('customers:remove', (id) => db.deleteCustomer(id));
handle('customers:summary', () => db.getCustomerSummary());
handle('customers:deposit', (id, d) => db.customerDeposit(id, d));
handle('customers:withdraw', (id, d) => db.customerWithdraw(id, d));
handle('customers:adjust', (id, d) => db.customerAdjust(id, d));

// ===== DASHBOARD & REPORTS =====
handle('dashboard:stats', () => db.getDashboardStats());
handle('reports:sales', (f) => db.getSalesReport(f));
handle('reports:products', (f) => db.getProductsReport(f));
handle('reports:categories', (f) => db.getCategoriesReport(f));
handle('reports:cashflow', (f) => db.getCashflow(f));

// ===== SETTINGS & AUDIT =====
handle('settings:get', () => db.getSettings());
handle('settings:update', (s) => db.updateSettings(s));
handle('audit:list', (f) => db.getAuditLog(f));

// ===== BACKUP =====
handle('backup:info', () => db.getBackupInfo());
handle('backup:create', async () => {
  const d = new Date();
  const stamp = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const result = await dialog.showSaveDialog(mainWindow, {
    title: 'Zaxira nusxani saqlash',
    defaultPath: `OxygenGym-zaxira-${stamp}.db`,
    filters: [{ name: 'OxygenGym zaxira nusxasi', extensions: ['db'] }],
  });
  if (result.canceled || !result.filePath) return null;
  return db.createBackup(result.filePath);
});
handle('backup:restore', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Zaxira nusxadan tiklash',
    filters: [{ name: 'OxygenGym zaxira nusxasi', extensions: ['db'] }],
    properties: ['openFile'],
  });
  if (result.canceled || !result.filePaths[0]) return null;
  return db.restoreBackup(result.filePaths[0]);
});

// ===== LIFECYCLE =====
async function start() {
  try {
    db = new DB(path.join(app.getPath('userData'), 'data'), log);
  } catch (err) {
    log.error('Database open failed:', err);
    dialog.showErrorBox('OxygenGym', `Ma'lumotlar bazasini ochib bo'lmadi:\n${err.message}`);
    app.quit();
    return;
  }
  db.autoBackup().catch((err) => log.warn('Auto backup failed:', err && err.message));
  createWindow();
  setInterval(checkForUpdates, UPDATE_INTERVAL_MS);
}

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (!mainWindow) return;
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  });
  app.whenReady().then(start);
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
app.on('activate', () => {
  if (db && BrowserWindow.getAllWindows().length === 0) createWindow();
});
app.on('before-quit', () => {
  if (db) db.close();
});
