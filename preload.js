'use strict';

const { contextBridge, ipcRenderer } = require('electron');

// IPC javobini ochib beradi: xato bo'lsa toza o'zbekcha xabar bilan Error tashlaydi
const call = (channel) => (...args) => ipcRenderer.invoke(channel, ...args).then((res) => {
  if (!res || !res.ok) throw new Error((res && res.error) || "Noma'lum xatolik");
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
    openBackupFolder: call('app:openBackupFolder'),
  },
  products: {
    getAll: call('products:getAll'),
    getById: call('products:getById'),
    create: call('products:create'),
    update: call('products:update'),
    remove: call('products:remove'),
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
  },
  sales: {
    create: call('sales:create'),
    list: call('sales:list'),
    getById: call('sales:getById'),
    refund: call('sales:refund'),
  },
  customers: {
    list: call('customers:list'),
    getById: call('customers:getById'),
    create: call('customers:create'),
    update: call('customers:update'),
    remove: call('customers:remove'),
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
  },
  settings: {
    get: call('settings:get'),
    update: call('settings:update'),
  },
  audit: {
    list: call('audit:list'),
  },
  backup: {
    info: call('backup:info'),
    create: call('backup:create'),
    restore: call('backup:restore'),
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
