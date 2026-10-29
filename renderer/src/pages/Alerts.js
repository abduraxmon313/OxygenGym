import React, { useState, useEffect } from 'react';

function formatMoney(n) { return Number(n || 0).toLocaleString('uz-UZ'); }

export default function Alerts() {
  const [lowStock, setLowStock] = useState([]);
  const [expiring, setExpiring] = useState([]);
  const [tab, setTab] = useState('low');

  useEffect(() => { load(); }, []);

  async function load() {
    if (!window.api) return;
    const [ls, ex] = await Promise.all([
      window.api.products.getLowStock(),
      window.api.products.getExpiring(60),
    ]);
    setLowStock(ls || []);
    setExpiring(ex || []);
  }

  const today = new Date();

  return (
    <>
      <div className="page-header">
        <h2>🔔 Ogohlantirishlar</h2>
      </div>
      <div className="page-body">
        <div className="tabs">
          <button className={`tab ${tab === 'low' ? 'active' : ''}`} onClick={() => setTab('low')}>
            📦 Kam qolgan ({lowStock.length})
          </button>
          <button className={`tab ${tab === 'exp' ? 'active' : ''}`} onClick={() => setTab('exp')}>
            ⏰ Muddati yaqin ({expiring.length})
          </button>
        </div>

        {tab === 'low' && (
          <div className="table-container">
            <table>
              <thead><tr><th>Mahsulot</th><th>Kategoriya</th><th>Qoldiq</th><th>Min. qoldiq</th><th>Status</th></tr></thead>
              <tbody>
                {lowStock.map(p => (
                  <tr key={p.id}>
                    <td style={{ fontWeight: 600 }}>{p.name}</td>
                    <td>{p.category_name || '—'}</td>
                    <td><span className={p.stock <= 0 ? 'badge-danger' : 'badge-warning'}>{p.stock} {p.unit}</span></td>
                    <td>{p.min_stock}</td>
                    <td>
                      {p.stock <= 0
                        ? <span className="badge-danger">🔴 TUGADI</span>
                        : <span className="badge-warning">🟡 Kam qoldi</span>
                      }
                    </td>
                  </tr>
                ))}
                {lowStock.length === 0 && (
                  <tr><td colSpan="5" className="text-center" style={{ padding: 40 }}>✅ Barcha mahsulotlar yetarli</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {tab === 'exp' && (
          <div className="table-container">
            <table>
              <thead><tr><th>Mahsulot</th><th>Partiya</th><th>Qoldiq</th><th>Yaroqlik muddati</th><th>Qoldi</th><th>Status</th></tr></thead>
              <tbody>
                {expiring.map(b => {
                  const exp = new Date(b.expiry_date);
                  const daysLeft = Math.ceil((exp - today) / (1000 * 60 * 60 * 24));
                  return (
                    <tr key={b.id}>
                      <td style={{ fontWeight: 600 }}>{b.product_name}</td>
                      <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{b.batch_number}</td>
                      <td>{b.remaining} dona</td>
                      <td>{b.expiry_date}</td>
                      <td>
                        <span className={daysLeft <= 0 ? 'badge-danger' : daysLeft <= 30 ? 'badge-warning' : 'badge-blue'}>
                          {daysLeft <= 0 ? "O'TGAN!" : `${daysLeft} kun`}
                        </span>
                      </td>
                      <td>
                        {daysLeft <= 0
                          ? <span className="badge-danger">🔴 Muddati o'tdi!</span>
                          : daysLeft <= 30
                          ? <span className="badge-warning">🟡 Tez orada</span>
                          : <span className="badge-blue">🔵 Kuzatishda</span>
                        }
                      </td>
                    </tr>
                  );
                })}
                {expiring.length === 0 && (
                  <tr><td colSpan="6" className="text-center" style={{ padding: 40 }}>✅ Muddati yaqin mahsulot yo'q</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
