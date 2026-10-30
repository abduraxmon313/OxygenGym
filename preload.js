'use strict';

const { contextBridge, ipcRenderer } = require('electron');

// IPC javobini ochib beradi: xato bo'lsa toza o'zbekcha xabar bilan Error tashlaydi
const call = (channel) => (...args) => ipcRenderer.invoke(channel, ...args).then((res) => {
  if (!res || !res.ok) {
    const err = new Error((res && res.error) || 'Error');
    if (res && res.code) err.code = res.code;
    throw err;
  }
  return res.data;
});

const on = (channel) => (callback) => {
  const listener = (_event, data) => callback(data);
  ipcRenderer.on(channel, listener);
  return () => ipcRenderer.removeListener(channel, listener);
};

contextBridge.exposeInMainWorld('api', {
  app: {
    info: call('app:info'),
  },
  products: {
    getAll: call('products:getAll'),
    getById: call('products:getById'),
    create: call('products:create'),
    update: call('products:update'),
    remove: call('products:remove'),
    archived: call('products:archived'),
    restore: call('products:restore'),
    writeOff: call('products:writeOff'),
    correctStock: call('products:correctStock'),
    nextCode: call('products:nextCode'),
    lowStock: call('products:lowStock'),
    expiring: call('products:expiring'),
    categories: call('products:categories'),
    brands: call('products:brands'),
  },
  stock: {
    receive: call('stock:receive'),
    receipts: call('stock:receipts'),
    receiptById: call('stock:receiptById'),
    cancelReceipt: call('stock:cancelReceipt'),
    adjustments: call('stock:adjustments'),
  },
  sales: {
    create: call('sales:create'),
    list: call('sales:list'),
    getById: call('sales:getById'),
    refund: call('sales:refund'),
    returnItems: call('sales:return'),
  },
  customers: {
    list: call('customers:list'),
    getById: call('customers:getById'),
    create: call('customers:create'),
    update: call('customers:update'),
    remove: call('customers:remove'),
    restore: call('customers:restore'),
    summary: call('customers:summary'),
    deposit: call('customers:deposit'),
    withdraw: call('customers:withdraw'),
    adjust: call('customers:adjust'),
  },
  dashboard: {
    stats: call('dashboard:stats'),
  },
  reports: {
    sales: call('reports:sales'),
    products: call('reports:products'),
    categories: call('reports:categories'),
    cashflow: call('reports:cashflow'),
    losses: call('reports:losses'),
  },
  settings: {
    get: call('settings:get'),
    update: call('settings:update'),
    setLanguage: call('settings:setLanguage'),
  },
  audit: {
    list: call('audit:list'),
  },
  updates: {
    check: call('updates:check'),
    download: call('updates:download'),
    install: call('updates:install'),
    onAvailable: on('update:available'),
    onNotAvailable: on('update:not-available'),
    onProgress: on('update:progress'),
    onDownloaded: on('update:downloaded'),
    onError: on('update:error'),
  },
});
