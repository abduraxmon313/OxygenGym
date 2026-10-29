import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Toaster, toast } from 'react-hot-toast';
import Sidebar from './components/Sidebar';
import { ConfirmProvider } from './components/ConfirmDialog';
import Dashboard from './pages/Dashboard';
import POS from './pages/POS';
import Products from './pages/Products';
import StockReceive from './pages/StockReceive';
import Sales from './pages/Sales';
import Customers from './pages/Customers';
import Alerts from './pages/Alerts';
import Reports from './pages/Reports';
import AuditLog from './pages/AuditLog';
import Settings from './pages/Settings';

const PAGES = {
  dashboard: Dashboard,
  pos: POS,
  products: Products,
  stock: StockReceive,
  sales: Sales,
  customers: Customers,
  alerts: Alerts,
  reports: Reports,
  audit: AuditLog,
  settings: Settings,
};

function UpdateAvailableToast({ t, version, onDownload }) {
  return (
    <div className="toast-card">
      <div className="toast-card-title">Yangi versiya mavjud: {version}</div>
      <div className="toast-card-text">Yangilanganda barcha ma'lumotlar saqlanib qoladi.</div>
      <div className="toast-card-actions">
        <button type="button" className="btn btn-primary btn-sm" onClick={onDownload}>Yuklab olish</button>
        <button type="button" className="btn btn-secondary btn-sm" onClick={() => toast.dismiss(t.id)}>Keyinroq</button>
      </div>
    </div>
  );
}

function UpdateReadyToast({ t }) {
  return (
    <div className="toast-card">
      <div className="toast-card-title">Yangilanish tayyor</div>
      <div className="toast-card-text">O'rnatish uchun dastur qayta ishga tushadi.</div>
      <div className="toast-card-actions">
        <button type="button" className="btn btn-success btn-sm" onClick={() => window.api.updates.install()}>Qayta ishga tushirish</button>
        <button type="button" className="btn btn-secondary btn-sm" onClick={() => toast.dismiss(t.id)}>Yopilganda o'rnatish</button>
      </div>
    </div>
  );
}

export default function App() {
  const [page, setPage] = useState('dashboard');
  const [alertCount, setAlertCount] = useState(0);
  const [settings, setSettings] = useState({});
  const [info, setInfo] = useState({});
  const downloading = useRef(false);

  const refreshAlerts = useCallback(async () => {
    try {
      const [low, expiring] = await Promise.all([window.api.products.lowStock(), window.api.products.expiring()]);
      setAlertCount(low.length + expiring.length);
    } catch (err) {
      // ogohlantirishlar soni muhim emas — jim o'tkazamiz
    }
  }, []);

  const reloadSettings = useCallback(async () => {
    try { setSettings(await window.api.settings.get()); } catch (err) { toast.error(err.message); }
  }, []);

  useEffect(() => {
    refreshAlerts();
    reloadSettings();
    window.api.app.info().then(setInfo).catch(() => {});
    const timer = setInterval(refreshAlerts, 60000);
    return () => clearInterval(timer);
  }, [refreshAlerts, reloadSettings]);

  useEffect(() => {
    const u = window.api.updates;
    const startDownload = () => {
      downloading.current = true;
      toast.loading('Yangilanish yuklanmoqda…', { id: 'update' });
      u.download().catch((err) => toast.error(err.message, { id: 'update' }));
    };
    const offs = [
      u.onAvailable(({ version }) => toast.custom(
        (t) => <UpdateAvailableToast t={t} version={version} onDownload={startDownload} />,
        { id: 'update', duration: Infinity },
      )),
      u.onProgress(({ percent }) => toast.loading(`Yangilanish yuklanmoqda: ${percent}%`, { id: 'update' })),
      u.onDownloaded(() => {
        downloading.current = false;
        toast.custom((t) => <UpdateReadyToast t={t} />, { id: 'update', duration: Infinity });
      }),
      u.onError(({ message }) => {
        if (!downloading.current) return;
        downloading.current = false;
        toast.error(`Yangilashda xatolik: ${message}`, { id: 'update' });
      }),
    ];
    return () => offs.forEach((off) => off && off());
  }, []);

  const Page = PAGES[page] || Dashboard;

  return (
    <ConfirmProvider>
      <div className="app">
        <Sidebar page={page} onNavigate={setPage} alertCount={alertCount} shopName={settings.shopName} version={info.version} />
        <main className="main">
          <Page
            navigate={setPage}
            refreshAlerts={refreshAlerts}
            settings={settings}
            reloadSettings={reloadSettings}
            appInfo={info}
          />
        </main>
      </div>
      <Toaster
        position="top-right"
        gutter={10}
        toastOptions={{
          duration: 3500,
          style: {
            background: '#fff', color: '#101828', border: '1px solid #e4e7ec', borderRadius: 10,
            boxShadow: '0 12px 16px -4px rgba(16,24,40,.08), 0 4px 6px -2px rgba(16,24,40,.03)',
            fontSize: 13.5, padding: '10px 14px', maxWidth: 420,
          },
          success: { iconTheme: { primary: '#079455', secondary: '#fff' } },
          error: { duration: 5000, iconTheme: { primary: '#d92d20', secondary: '#fff' } },
        }}
      />
    </ConfirmProvider>
  );
}
