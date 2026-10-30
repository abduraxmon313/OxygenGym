import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Toaster, toast } from 'react-hot-toast';
import { ThemeContext, applyTheme, initialTheme, toastStyle } from './lib/theme';
import { LangContext, getLanguage, setLanguage, t } from './lib/i18n';
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

function UpdateAvailableToast({ toastId, version, onDownload }) {
  return (
    <div className="toast-card">
      <div className="toast-card-title">{t('Yangi versiya mavjud: {v}', { v: version })}</div>
      <div className="toast-card-text">{t("Yangilanganda barcha ma'lumotlar saqlanib qoladi.")}</div>
      <div className="toast-card-actions">
        <button type="button" className="btn btn-primary btn-sm" onClick={onDownload}>{t('Yuklab olish')}</button>
        <button type="button" className="btn btn-secondary btn-sm" onClick={() => toast.dismiss(toastId)}>{t('Keyinroq')}</button>
      </div>
    </div>
  );
}

function UpdateReadyToast({ toastId }) {
  return (
    <div className="toast-card">
      <div className="toast-card-title">{t('Yangilanish tayyor')}</div>
      <div className="toast-card-text">{t("O'rnatish uchun dastur qayta ishga tushadi.")}</div>
      <div className="toast-card-actions">
        <button type="button" className="btn btn-success btn-sm" onClick={() => window.api.updates.install()}>{t('Qayta ishga tushirish')}</button>
        <button type="button" className="btn btn-secondary btn-sm" onClick={() => toast.dismiss(toastId)}>{t("Yopilganda o'rnatish")}</button>
      </div>
    </div>
  );
}

export default function App() {
  const [page, setPage] = useState('dashboard');
  const [alertCount, setAlertCount] = useState(0);
  const [settings, setSettings] = useState({});
  const [info, setInfo] = useState({});
  const [theme, setThemeState] = useState(initialTheme);
  const [lang, setLangState] = useState(getLanguage);
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
    try {
      const s = await window.api.settings.get();
      setSettings(s);
      // Bazadagi til — asosiy manba (boshqa kompyuterdan tiklangan baza ham to'g'ri tilda ochiladi)
      if (s.language && s.language !== getLanguage()) {
        setLanguage(s.language);
        setLangState(s.language);
      }
    } catch (err) {
      toast.error(err.message);
    }
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
      toast.loading(t('Yangilanish yuklanmoqda…'), { id: 'update' });
      u.download().catch((err) => toast.error(err.message, { id: 'update' }));
    };
    const offs = [
      u.onAvailable(({ version }) => toast.custom(
        (tt) => <UpdateAvailableToast toastId={tt.id} version={version} onDownload={startDownload} />,
        { id: 'update', duration: Infinity },
      )),
      u.onProgress(({ percent }) => toast.loading(t('Yangilanish yuklanmoqda: {p}%', { p: percent }), { id: 'update' })),
      u.onDownloaded(() => {
        downloading.current = false;
        toast.custom((tt) => <UpdateReadyToast toastId={tt.id} />, { id: 'update', duration: Infinity });
      }),
      u.onError(({ message, code }) => {
        if (!downloading.current) return;
        downloading.current = false;
        const text = code === 'CHECKSUM'
          ? t("Yuklangan fayl buzilgan. Birozdan keyin dasturni qayta ochib, yana urinib ko'ring")
          : message;
        toast.error(t('Yangilashda xatolik: {m}', { m: text }), { id: 'update' });
      }),
    ];
    return () => offs.forEach((off) => off && off());
  }, []);

  const Page = PAGES[page] || Dashboard;
  const themeValue = useMemo(() => ({
    theme,
    setTheme: (v) => { applyTheme(v); setThemeState(v); },
  }), [theme]);
  const langValue = useMemo(() => ({
    lang,
    setLang: (v) => {
      setLanguage(v);
      setLangState(v);
      // Bazadagi xato xabarlari ham shu tilda bo'lishi uchun
      window.api.settings.setLanguage(v).then(setSettings).catch(() => {});
    },
  }), [lang]);

  return (
    <LangContext.Provider value={langValue}>
      <ThemeContext.Provider value={themeValue}>
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
              style: toastStyle(theme),
              success: { iconTheme: { primary: '#0f9a6b', secondary: '#fff' } },
              error: { duration: 5000, iconTheme: { primary: '#d6393c', secondary: '#fff' } },
            }}
          />
        </ConfirmProvider>
      </ThemeContext.Provider>
    </LangContext.Provider>
  );
}
