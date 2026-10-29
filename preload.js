const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  // Products
  products: {
    getAll: () => ipcRenderer.invoke('products:getAll'),
    getById: (id) => ipcRenderer.invoke('products:getById', id),
    search: (query) => ipcRenderer.invoke('products:search', query),
    getByBarcode: (barcode) => ipcRenderer.invoke('products:getByBarcode', barcode),
    create: (product) => ipcRenderer.invoke('products:create', product),
    update: (id, product) => ipcRenderer.invoke('products:update', id, product),
    delete: (id) => ipcRenderer.invoke('products:delete', id),
    getLowStock: () => ipcRenderer.invoke('products:getLowStock'),
    getExpiring: (days) => ipcRenderer.invoke('products:getExpiring', days),
    getCategories: () => ipcRenderer.invoke('products:getCategories'),
  },

  // Sales
  sales: {
    create: (sale) => ipcRenderer.invoke('sales:create', sale),
    getAll: (filters) => ipcRenderer.invoke('sales:getAll', filters),
    getById: (id) => ipcRenderer.invoke('sales:getById', id),
    refund: (saleId, items) => ipcRenderer.invoke('sales:refund', saleId, items),
    getStats: (period) => ipcRenderer.invoke('sales:getStats', period),
  },

  // Stock
  stock: {
    receive: (receipt) => ipcRenderer.invoke('stock:receive', receipt),
    getReceipts: (filters) => ipcRenderer.invoke('stock:getReceipts', filters),
    getReceiptById: (id) => ipcRenderer.invoke('stock:getReceiptById', id),
    getBatches: (productId) => ipcRenderer.invoke('stock:getBatches', productId),
  },

  // Customers
  customers: {
    getAll: () => ipcRenderer.invoke('customers:getAll'),
    getById: (id) => ipcRenderer.invoke('customers:getById', id),
    create: (customer) => ipcRenderer.invoke('customers:create', customer),
    update: (id, customer) => ipcRenderer.invoke('customers:update', id, customer),
    delete: (id) => ipcRenderer.invoke('customers:delete', id),
    search: (query) => ipcRenderer.invoke('customers:search', query),
  },

  // Suppliers
  suppliers: {
    getAll: () => ipcRenderer.invoke('suppliers:getAll'),
    create: (supplier) => ipcRenderer.invoke('suppliers:create', supplier),
    update: (id, supplier) => ipcRenderer.invoke('suppliers:update', id, supplier),
    delete: (id) => ipcRenderer.invoke('suppliers:delete', id),
  },

  // Dashboard & Reports
  dashboard: {
    getStats: () => ipcRenderer.invoke('dashboard:getStats'),
  },
  reports: {
    sales: (filters) => ipcRenderer.invoke('reports:sales', filters),
    products: (filters) => ipcRenderer.invoke('reports:products', filters),
    profit: (filters) => ipcRenderer.invoke('reports:profit', filters),
  },

  // Backup
  backup: {
    create: () => ipcRenderer.invoke('backup:create'),
    restore: () => ipcRenderer.invoke('backup:restore'),
  },

  // Settings
  settings: {
    get: () => ipcRenderer.invoke('settings:get'),
    update: (settings) => ipcRenderer.invoke('settings:update', settings),
  },

  // Audit
  audit: {
    getLog: (filters) => ipcRenderer.invoke('audit:getLog', filters),
  },

  // Updates
  updates: {
    startDownload: () => ipcRenderer.invoke('start-update-download'),
    install: () => ipcRenderer.invoke('install-update'),
    onAvailable: (cb) => ipcRenderer.on('update-available', (_, data) => cb(data)),
    onProgress: (cb) => ipcRenderer.on('update-progress', (_, data) => cb(data)),
    onDownloaded: (cb) => ipcRenderer.on('update-downloaded', () => cb()),
  },
});
