import React, { useState } from 'react';
import {
  AlertTriangle, BarChart3, LayoutDashboard, Moon, Package, PackagePlus, Receipt, ScrollText, Settings, ShoppingCart, Sun, Users,
} from 'lucide-react';
import { useTheme } from '../lib/theme';
import { LANGUAGES, t, useLang } from '../lib/i18n';

const navGroups = () => [
  {
    id: 'main',
    title: t('Asosiy'),
    items: [
      { id: 'dashboard', label: t('Bosh panel'), icon: LayoutDashboard },
      { id: 'pos', label: t('Sotuv'), icon: ShoppingCart },
    ],
  },
  {
    id: 'stock',
    title: t('Ombor'),
    items: [
      { id: 'products', label: t('Mahsulotlar'), icon: Package },
      { id: 'stock', label: t('Kirim'), icon: PackagePlus },
      { id: 'alerts', label: t('Ogohlantirishlar'), icon: AlertTriangle, badge: true },
    ],
  },
  {
    id: 'trade',
    title: t('Savdo'),
    items: [
      { id: 'sales', label: t('Sotuvlar'), icon: Receipt },
      { id: 'customers', label: t('Mijozlar'), icon: Users },
    ],
  },
  {
    id: 'analytics',
    title: t('Tahlil'),
    items: [
      { id: 'reports', label: t('Hisobotlar'), icon: BarChart3 },
      { id: 'audit', label: t('Harakatlar jurnali'), icon: ScrollText },
    ],
  },
  {
    id: 'system',
    title: t('Tizim'),
    items: [{ id: 'settings', label: t('Sozlamalar'), icon: Settings }],
  },
];

function BrandMark() {
  // Logo: renderer/public/logo.png (assets/brand dan build vaqtida olinadi)
  // ?v= qo'shimchasi keshdan eski logoni olishni oldini oladi
  const [failed, setFailed] = useState(false);
  const ver = typeof window !== 'undefined' && window.__OXYGENGYM_VERSION__ ? window.__OXYGENGYM_VERSION__ : '0';
  return (
    <div className="brand-mark">
      {failed ? <span className="fallback">OG</span> : <img src={`./logo.png?v=${ver}`} alt="OxygenGym" onError={() => setFailed(true)} />}
    </div>
  );
}

export function ThemeSwitch() {
  const { theme, setTheme } = useTheme();
  return (
    <div className="theme-switch" role="group" aria-label={t("Ko'rinish")}>
      <button type="button" title={t('Kunduzgi')} className={theme === 'light' ? 'active' : ''} onClick={() => setTheme('light')}>
        <Sun size={14} /><span>{t('Kunduzgi')}</span>
      </button>
      <button type="button" title={t('Tungi')} className={theme === 'dark' ? 'active' : ''} onClick={() => setTheme('dark')}>
        <Moon size={14} /><span>{t('Tungi')}</span>
      </button>
    </div>
  );
}

export function LangSwitch() {
  const { lang, setLang } = useLang();
  return (
    <div className="theme-switch lang" role="group" aria-label={t('Til')}>
      {LANGUAGES.map((l) => (
        <button key={l.id} type="button" title={l.label} className={lang === l.id ? 'active' : ''} onClick={() => setLang(l.id)}>{l.short}</button>
      ))}
    </div>
  );
}

export default function Sidebar({ page, onNavigate, alertCount, shopName, version }) {
  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <BrandMark />
        <div>
          <div className="brand-name">OxygenGym</div>
          <div className="brand-sub">{t('Savdo va ombor tizimi')}</div>
        </div>
      </div>
      <nav className="sidebar-nav">
        {navGroups().map((group) => (
          <div key={group.id} className="nav-group">
            <div className="nav-group-title">{group.title}</div>
            {group.items.map(({ id, label, icon: Icon, badge }) => (
              <button key={id} type="button" title={label} className={`nav-item${page === id ? ' active' : ''}`} onClick={() => onNavigate(id)}>
                <Icon size={18} strokeWidth={1.9} />
                <span className="label">{label}</span>
                {badge && alertCount > 0 && <span className="nav-badge">{alertCount > 99 ? '99+' : alertCount}</span>}
              </button>
            ))}
            {group.id === 'system' && (
              <div className="pref-group">
                <ThemeSwitch />
                <LangSwitch />
              </div>
            )}
          </div>
        ))}
      </nav>
      <div className="sidebar-footer">
        <div className="shop">{shopName || 'OxygenGym'}</div>
        <div className="ver">{t('Versiya {v}', { v: version || '—' })}</div>
      </div>
    </aside>
  );
}
