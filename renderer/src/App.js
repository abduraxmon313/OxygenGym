import React, { useState, useEffect } from 'react';
import { Toaster, toast } from 'react-hot-toast';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import POS from './pages/POS';
import Products from './pages/Products';
import StockReceive from './pages/StockReceive';
import Customers from './pages/Customers';
import Sales from './pages/Sales';
import Reports from './pages/Reports';
import Suppliers from './pages/Suppliers';
import Alerts from './pages/Alerts';
import Settings from './pages/Settings';
import AuditLog from './pages/AuditLog';

const PAGES = {
  dashboard: Dashboard,
  pos: POS,
  products: Products,
  stock: StockReceive,
  customers: Customers,
  sales: Sales,
  reports: Reports,
  suppliers: Suppliers,
  alerts: Alerts,
  settings: Settings,
  audit: AuditLog,
};

export default function App() {
  const [page, setPage] = useState('dashboard');
  const [alerts, setAlerts] = useState({ lowStock: 0, expiring: 0 });

  useEffect(() => {
    loadAlerts();
    const interval = setInterval(loadAlerts, 60000);

    // Auto-update listener
    if (window.api?.updates) {
      window.api.updates.onAvailable((data) => {
        toast((t) => (
          <div>
            <strong>🔔 Yangi versiya: v{data.version}</strong>
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <button className="btn btn-primary btn-sm" onClick={() => { window.api.updates.startDownload(); toast.dismiss(t.id); }}>
                ⬇️ Yangilash
              </button>
              <button className="btn btn-outline btn-sm" onClick={() => toast.dismiss(t.id)}>
                Keyinroq
              </button>
            </div>
          </div>
        ), { duration: Infinity });
      });
      window.api.updates.onDownloaded(() => {
        toast((t) => (
          <div>
            <strong>✅ Yangilanish tayyor!</strong>
            <p style={{ fontSize: 12, marginTop: 4 }}>Ilova qayta ishga tushiriladi</p>
            <button className="btn btn-success btn-sm" style={{ marginTop: 8 }} onClick={() => window.api.updates.install()}>
              🔄 Qayta ishga tushirish
            </button>
          </div>
        ), { duration: Infinity });
      });
    }

    return () => clearInterval(interval);
  }, []);

  async function loadAlerts() {
    try {
      if (!window.api) return;
      const lowStock = await window.api.products.getLowStock();
      const expiring = await window.api.products.getExpiring(30);
      setAlerts({ lowStock: lowStock?.length || 0, expiring: expiring?.length || 0 });
    } catch (e) { /* ignore */ }
  }

  const PageComponent = PAGES[page] || Dashboard;

  return (
    <div className="app-layout">
      <Sidebar page={page} setPage={setPage} alerts={alerts} />
      <main className="main-content">
        <PageComponent setPage={setPage} onDataChange={loadAlerts} />
      </main>
      <Toaster
        position="top-right"
        toastOptions={{
          style: { background: '#1e293b', color: '#f1f5f9', border: '1px solid #334155' },
          success: { iconTheme: { primary: '#10b981', secondary: '#fff' } },
          error: { iconTheme: { primary: '#ef4444', secondary: '#fff' } },
        }}
      />
    </div>
  );
}
