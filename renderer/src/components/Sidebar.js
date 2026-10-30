import React, { useState } from 'react';
import {
  AlertTriangle, BarChart3, LayoutDashboard, Moon, Package, PackagePlus, Receipt, ScrollText, Settings, ShoppingCart, Sun, Users,
} from 'lucide-react';
import { useTheme } from '../lib/theme';

export const NAV_GROUPS = [
  {
    title: 'Asosiy',
    items: [
      { id: 'dashboard', label: 'Bosh panel', icon: LayoutDashboard },
      { id: 'pos', label: 'Sotuv', icon: ShoppingCart },
    ],
  },
  {
    title: 'Ombor',
    items: [
      { id: 'products', label: 'Mahsulotlar', icon: Package },
      { id: 'stock', label: 'Kirim', icon: PackagePlus },
      { id: 'alerts', label: 'Ogohlantirishlar', icon: AlertTriangle, badge: true },
    ],
  },
  {
    title: 'Savdo',
    items: [
      { id: 'sales', label: 'Sotuvlar', icon: Receipt },
      { id: 'customers', label: 'Mijozlar', icon: Users },
    ],
  },
  {
    title: 'Tahlil',
    items: [
      { id: 'reports', label: 'Hisobotlar', icon: BarChart3 },
      { id: 'audit', label: 'Harakatlar jurnali', icon: ScrollText },
    ],
  },
  {
    title: 'Tizim',
    items: [{ id: 'settings', label: 'Sozlamalar', icon: Settings }],
  },
];

function BrandMark() {
  // Logo fayli renderer/public/logo.png — u yo'q bo'lsa matnli belgi ko'rsatiladi
  const [failed, setFailed] = useState(false);
  return (
    <div className="brand-mark">
      {failed ? <span className="fallback">OG</span> : <img src="./logo.png" alt="Oxygen Fitness" onError={() => setFailed(true)} />}
    </div>
  );
}

export function ThemeSwitch() {
  const { theme, setTheme } = useTheme();
  return (
    <div className="theme-switch" role="group" aria-label="Ko'rinish rejimi">
      <button type="button" className={theme === 'light' ? 'active' : ''} onClick={() => setTheme('light')}><Sun size={14} />Kunduzgi</button>
      <button type="button" className={theme === 'dark' ? 'active' : ''} onClick={() => setTheme('dark')}><Moon size={14} />Tungi</button>
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
          <div className="brand-sub">Savdo va ombor tizimi</div>
        </div>
      </div>
      <nav className="sidebar-nav">
        {NAV_GROUPS.map((group) => (
          <div key={group.title} className="nav-group">
            <div className="nav-group-title">{group.title}</div>
            {group.items.map(({ id, label, icon: Icon, badge }) => (
              <button key={id} type="button" className={`nav-item${page === id ? ' active' : ''}`} onClick={() => onNavigate(id)}>
                <Icon size={18} strokeWidth={1.9} />
                <span>{label}</span>
                {badge && alertCount > 0 && <span className="nav-badge">{alertCount > 99 ? '99+' : alertCount}</span>}
              </button>
            ))}
            {group.title === 'Tizim' && <ThemeSwitch />}
          </div>
        ))}
      </nav>
      <div className="sidebar-footer">
        <div className="shop">{shopName || 'OxygenGym'}</div>
        <div className="ver">Versiya {version || '—'}</div>
      </div>
    </aside>
  );
}
