import React from 'react';

const NAV_ITEMS = [
  { id: 'dashboard', icon: '📊', label: 'Bosh panel' },
  { id: 'pos', icon: '🛒', label: 'Sotuv (POS)' },
  { id: 'products', icon: '📦', label: 'Mahsulotlar' },
  { id: 'stock', icon: '📥', label: 'Kirim (Priyomka)' },
  { id: 'sales', icon: '🧾', label: 'Sotuvlar tarixi' },
  { id: 'customers', icon: '👥', label: 'Mijozlar' },
  { id: 'suppliers', icon: '🚛', label: 'Yetkazib beruvchilar' },
  { id: 'alerts', icon: '🔔', label: 'Ogohlantirishlar', alertKey: true },
  { id: 'reports', icon: '📈', label: 'Hisobotlar' },
  { id: 'audit', icon: '📋', label: 'Audit log' },
  { id: 'settings', icon: '⚙️', label: 'Sozlamalar' },
];

export default function Sidebar({ page, setPage, alerts }) {
  const totalAlerts = (alerts?.lowStock || 0) + (alerts?.expiring || 0);

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <span className="logo-icon">🏋️</span>
        <h1>OxygenGym</h1>
      </div>
      <nav className="sidebar-nav">
        {NAV_ITEMS.map((item) => (
          <button
            key={item.id}
            className={`nav-item ${page === item.id ? 'active' : ''}`}
            onClick={() => setPage(item.id)}
          >
            <span className="icon">{item.icon}</span>
            <span>{item.label}</span>
            {item.alertKey && totalAlerts > 0 && (
              <span className="badge">{totalAlerts}</span>
            )}
          </button>
        ))}
      </nav>
      <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border)', fontSize: 11, color: 'var(--text-muted)' }}>
        OxygenGym v1.0.0
      </div>
    </aside>
  );
}
