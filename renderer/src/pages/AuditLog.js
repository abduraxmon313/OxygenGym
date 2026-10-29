import React, { useState, useEffect } from 'react';

const ACTION_ICONS = {
  CREATE: '➕', UPDATE: '✏️', DELETE: '🗑️', SALE: '🛒', REFUND: '↩️',
  RECEIVE: '📥', BACKUP: '💾', RESTORE: '📂',
};

export default function AuditLog() {
  const [logs, setLogs] = useState([]);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  useEffect(() => { load(); }, []);

  async function load() {
    if (!window.api) return;
    const data = await window.api.audit.getLog({ dateFrom, dateTo });
    setLogs(data || []);
  }

  return (
    <>
      <div className="page-header">
        <h2>📋 Audit log (Barcha harakatlar)</h2>
      </div>
      <div className="page-body">
        <div style={{ display: 'flex', gap: 8, marginBottom: 16, alignItems: 'flex-end' }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>Dan:</label>
            <input className="form-input" type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>Gacha:</label>
            <input className="form-input" type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
          </div>
          <button className="btn btn-primary" onClick={load}>🔍 Qidirish</button>
        </div>

        <div className="table-container">
          <table>
            <thead><tr><th>Vaqt</th><th>Harakat</th><th>Bo'lim</th><th>Tafsilot</th></tr></thead>
            <tbody>
              {logs.map(log => (
                <tr key={log.id}>
                  <td style={{ fontSize: 12, whiteSpace: 'nowrap' }}>{new Date(log.created_at).toLocaleString('uz-UZ')}</td>
                  <td><span className="badge-blue">{ACTION_ICONS[log.action] || '📌'} {log.action}</span></td>
                  <td style={{ textTransform: 'capitalize' }}>{log.entity}</td>
                  <td style={{ fontSize: 13 }}>{log.details}</td>
                </tr>
              ))}
              {logs.length === 0 && (
                <tr><td colSpan="4" style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>Hali yozuv yo'q</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
