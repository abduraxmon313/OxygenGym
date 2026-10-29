import React, { useState, useEffect } from 'react';

function formatMoney(n) {
  return Number(n || 0).toLocaleString('uz-UZ') + " so'm";
}

export default function Dashboard({ setPage }) {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    loadStats();
    const i = setInterval(loadStats, 30000);
    return () => clearInterval(i);
  }, []);

  async function loadStats() {
    if (!window.api) {
      // Demo data for development
      setStats({
        today: { count: 0, revenue: 0, profit: 0 },
        month: { count: 0, revenue: 0, profit: 0 },
        lowStock: 0, expiring: 0, totalProducts: 0, totalCustomers: 0,
        topProducts: [], recentSales: [], dailySales: [],
      });
      return;
    }
    try {
      const data = await window.api.dashboard.getStats();
      setStats(data);
    } catch (e) { console.error(e); }
  }

  if (!stats) return <div className="page-body"><div className="empty-state"><span className="icon">⏳</span><p>Yuklanmoqda...</p></div></div>;

  return (
    <>
      <div className="page-header">
        <h2>📊 Bosh panel</h2>
        <span style={{ color: 'var(--text-muted)', fontSize: 14 }}>
          {new Date().toLocaleDateString('uz-UZ', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </span>
      </div>
      <div className="page-body">
        {/* Stats Grid */}
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon blue">💰</div>
            <div className="stat-info">
              <h3>{formatMoney(stats.today.revenue)}</h3>
              <p>Bugungi sotuv</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon green">📈</div>
            <div className="stat-info">
              <h3>{formatMoney(stats.today.profit)}</h3>
              <p>Bugungi foyda</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon purple">🧾</div>
            <div className="stat-info">
              <h3>{stats.today.count} ta</h3>
              <p>Bugungi sotuvlar</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon yellow">📦</div>
            <div className="stat-info">
              <h3>{stats.totalProducts} ta</h3>
              <p>Jami mahsulotlar</p>
            </div>
          </div>
        </div>

        {/* Monthly Stats */}
        <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))' }}>
          <div className="stat-card">
            <div className="stat-icon blue">📅</div>
            <div className="stat-info">
              <h3>{formatMoney(stats.month.revenue)}</h3>
              <p>Bu oylik sotuv ({stats.month.count} ta chek)</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon green">💵</div>
            <div className="stat-info">
              <h3>{formatMoney(stats.month.profit)}</h3>
              <p>Bu oylik sof foyda</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon purple">👥</div>
            <div className="stat-info">
              <h3>{stats.totalCustomers} ta</h3>
              <p>Jami mijozlar</p>
            </div>
          </div>
        </div>

        {/* Alerts */}
        {(stats.lowStock > 0 || stats.expiring > 0) && (
          <div className="card" style={{ marginBottom: 24, borderColor: 'var(--warning)' }}>
            <h3 style={{ marginBottom: 12 }}>⚠️ Ogohlantirishlar</h3>
            <div style={{ display: 'flex', gap: 16 }}>
              {stats.lowStock > 0 && (
                <div className="badge-danger" style={{ cursor: 'pointer', padding: '8px 16px', fontSize: 14 }} onClick={() => setPage('alerts')}>
                  📦 {stats.lowStock} ta mahsulot kam qoldi
                </div>
              )}
              {stats.expiring > 0 && (
                <div className="badge-warning" style={{ cursor: 'pointer', padding: '8px 16px', fontSize: 14 }} onClick={() => setPage('alerts')}>
                  ⏰ {stats.expiring} ta partiya muddati yaqin
                </div>
              )}
            </div>
          </div>
        )}

        <div className="grid-2">
          {/* Top Products */}
          <div className="card">
            <h3 style={{ marginBottom: 12 }}>🏆 Top mahsulotlar (bu oy)</h3>
            {stats.topProducts.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', padding: 20, textAlign: 'center' }}>Hali sotuv yo'q</p>
            ) : (
              <div className="table-container">
                <table>
                  <thead><tr><th>#</th><th>Mahsulot</th><th>Sotilgan</th><th>Daromad</th></tr></thead>
                  <tbody>
                    {stats.topProducts.map((p, i) => (
                      <tr key={i}>
                        <td>{i + 1}</td>
                        <td>{p.name}</td>
                        <td>{p.qty} dona</td>
                        <td>{formatMoney(p.revenue)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Recent Sales */}
          <div className="card">
            <h3 style={{ marginBottom: 12 }}>🕐 Oxirgi sotuvlar</h3>
            {stats.recentSales.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', padding: 20, textAlign: 'center' }}>Hali sotuv yo'q</p>
            ) : (
              <div className="table-container">
                <table>
                  <thead><tr><th>Chek</th><th>Mijoz</th><th>Summa</th><th>Vaqt</th></tr></thead>
                  <tbody>
                    {stats.recentSales.map((s) => (
                      <tr key={s.id}>
                        <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{s.sale_number}</td>
                        <td>{s.customer_name || '—'}</td>
                        <td>{formatMoney(s.final_total)}</td>
                        <td style={{ fontSize: 12 }}>{new Date(s.created_at).toLocaleTimeString('uz-UZ')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
