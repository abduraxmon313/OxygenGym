import React, { useState, useEffect } from 'react';

function formatMoney(n) { return Number(n || 0).toLocaleString('uz-UZ'); }

export default function Reports() {
  const [tab, setTab] = useState('sales');
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date(); d.setDate(1);
    return d.toISOString().split('T')[0];
  });
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().split('T')[0]);
  const [data, setData] = useState([]);

  useEffect(() => { loadReport(); }, [tab]);

  async function loadReport() {
    if (!window.api) return;
    const filters = { dateFrom, dateTo };
    let result;
    if (tab === 'sales') result = await window.api.reports.sales(filters);
    else if (tab === 'products') result = await window.api.reports.products(filters);
    else if (tab === 'profit') result = await window.api.reports.profit(filters);
    setData(result || []);
  }

  const totalRevenue = data.reduce((s, d) => s + (d.revenue || 0), 0);
  const totalProfit = data.reduce((s, d) => s + (d.profit || 0), 0);

  return (
    <>
      <div className="page-header">
        <h2>📈 Hisobotlar</h2>
      </div>
      <div className="page-body">
        <div className="tabs">
          <button className={`tab ${tab === 'sales' ? 'active' : ''}`} onClick={() => setTab('sales')}>📊 Kunlik sotuv</button>
          <button className={`tab ${tab === 'products' ? 'active' : ''}`} onClick={() => setTab('products')}>📦 Mahsulot bo'yicha</button>
          <button className={`tab ${tab === 'profit' ? 'active' : ''}`} onClick={() => setTab('profit')}>💰 Foyda-zarar</button>
        </div>

        <div style={{ display: 'flex', gap: 8, marginBottom: 16, alignItems: 'flex-end' }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>Dan:</label>
            <input className="form-input" type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>Gacha:</label>
            <input className="form-input" type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
          </div>
          <button className="btn btn-primary" onClick={loadReport}>📊 Ko'rsatish</button>
        </div>

        {/* Summary */}
        <div className="stats-grid" style={{ marginBottom: 16 }}>
          <div className="stat-card">
            <div className="stat-icon blue">💰</div>
            <div className="stat-info"><h3>{formatMoney(totalRevenue)} so'm</h3><p>Jami daromad</p></div>
          </div>
          <div className="stat-card">
            <div className="stat-icon green">📈</div>
            <div className="stat-info"><h3>{formatMoney(totalProfit)} so'm</h3><p>Jami foyda</p></div>
          </div>
        </div>

        {/* Sales report */}
        {tab === 'sales' && (
          <div className="table-container">
            <table>
              <thead><tr><th>Sana</th><th>Sotuvlar</th><th>Daromad</th><th>Foyda</th></tr></thead>
              <tbody>
                {data.map((d, i) => (
                  <tr key={i}>
                    <td>{d.date}</td>
                    <td>{d.sales_count} ta</td>
                    <td>{formatMoney(d.revenue)} so'm</td>
                    <td style={{ color: 'var(--success)' }}>{formatMoney(d.profit)} so'm</td>
                  </tr>
                ))}
                {data.length === 0 && <tr><td colSpan="4" style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>Ma'lumot yo'q</td></tr>}
              </tbody>
            </table>
          </div>
        )}

        {/* Products report */}
        {tab === 'products' && (
          <div className="table-container">
            <table>
              <thead><tr><th>#</th><th>Mahsulot</th><th>Barcode</th><th>Sotilgan</th><th>Daromad</th><th>Foyda</th></tr></thead>
              <tbody>
                {data.map((d, i) => (
                  <tr key={i}>
                    <td>{i + 1}</td>
                    <td style={{ fontWeight: 600 }}>{d.name}</td>
                    <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{d.barcode || '—'}</td>
                    <td>{d.qty_sold} dona</td>
                    <td>{formatMoney(d.revenue)} so'm</td>
                    <td style={{ color: 'var(--success)' }}>{formatMoney(d.profit)} so'm</td>
                  </tr>
                ))}
                {data.length === 0 && <tr><td colSpan="6" style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>Ma'lumot yo'q</td></tr>}
              </tbody>
            </table>
          </div>
        )}

        {/* Profit report */}
        {tab === 'profit' && (
          <div className="table-container">
            <table>
              <thead><tr><th>Sana</th><th>Daromad</th><th>Xarajat</th><th>Sof foyda</th><th>Margin</th></tr></thead>
              <tbody>
                {data.map((d, i) => (
                  <tr key={i}>
                    <td>{d.date}</td>
                    <td>{formatMoney(d.revenue)} so'm</td>
                    <td style={{ color: 'var(--danger)' }}>{formatMoney(d.cost)} so'm</td>
                    <td style={{ fontWeight: 700, color: d.profit >= 0 ? 'var(--success)' : 'var(--danger)' }}>{formatMoney(d.profit)} so'm</td>
                    <td>{d.revenue > 0 ? ((d.profit / d.revenue) * 100).toFixed(1) + '%' : '—'}</td>
                  </tr>
                ))}
                {data.length === 0 && <tr><td colSpan="5" style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>Ma'lumot yo'q</td></tr>}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
