import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import Modal from '../components/Modal';

function formatMoney(n) { return Number(n || 0).toLocaleString('uz-UZ'); }

export default function Sales({ onDataChange }) {
  const [sales, setSales] = useState([]);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [showDetail, setShowDetail] = useState(null);

  useEffect(() => { load(); }, []);

  async function load() {
    if (!window.api) return;
    const data = await window.api.sales.getAll({ dateFrom, dateTo });
    setSales(data || []);
  }

  async function viewDetail(id) {
    const sale = await window.api.sales.getById(id);
    setShowDetail(sale);
  }

  async function refundSale(id) {
    if (!window.confirm("Bu sotuvni qaytarmoqchimisiz? Mahsulotlar omborga qaytariladi.")) return;
    try {
      const result = await window.api.sales.refund(id);
      if (result.success) {
        toast.success("✅ Sotuv qaytarildi");
        setShowDetail(null);
        load();
        if (onDataChange) onDataChange();
      } else {
        toast.error(result.message);
      }
    } catch (err) {
      toast.error("Xatolik: " + err.message);
    }
  }

  const PAYMENT_LABELS = { cash: '💵 Naqd', card: '💳 Karta', click: '📱 Click', payme: '📱 Payme', mixed: '🔄 Aralash' };

  return (
    <>
      <div className="page-header">
        <h2>🧾 Sotuvlar tarixi</h2>
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
            <thead>
              <tr><th>Chek raqami</th><th>Mijoz</th><th>Jami</th><th>Chegirma</th><th>Yakuniy</th><th>To'lov</th><th>Status</th><th>Sana</th><th></th></tr>
            </thead>
            <tbody>
              {sales.map(s => (
                <tr key={s.id}>
                  <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{s.sale_number}</td>
                  <td>{s.customer_name || '—'}</td>
                  <td>{formatMoney(s.total)}</td>
                  <td>{s.discount > 0 ? `−${s.discount}${s.discount_type === 'percent' ? '%' : " so'm"}` : '—'}</td>
                  <td style={{ fontWeight: 700 }}>{formatMoney(s.final_total)} so'm</td>
                  <td>{PAYMENT_LABELS[s.payment_method] || s.payment_method}</td>
                  <td>
                    <span className={s.status === 'completed' ? 'badge-success' : 'badge-danger'}>
                      {s.status === 'completed' ? '✅ Sotildi' : '↩️ Qaytarildi'}
                    </span>
                  </td>
                  <td style={{ fontSize: 12 }}>{new Date(s.created_at).toLocaleString('uz-UZ')}</td>
                  <td><button className="btn btn-outline btn-sm" onClick={() => viewDetail(s.id)}>👁️</button></td>
                </tr>
              ))}
              {sales.length === 0 && (
                <tr><td colSpan="9" style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>Sotuv topilmadi</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showDetail && (
        <Modal title={`🧾 Chek #${showDetail.sale_number}`} onClose={() => setShowDetail(null)} large>
          <div className="grid-2" style={{ marginBottom: 16 }}>
            <div><strong>Mijoz:</strong> {showDetail.customer_name || 'Noma\'lum'}</div>
            <div><strong>Sana:</strong> {new Date(showDetail.created_at).toLocaleString('uz-UZ')}</div>
            <div><strong>To'lov:</strong> {PAYMENT_LABELS[showDetail.payment_method]}</div>
            <div><strong>Status:</strong> {showDetail.status === 'completed' ? '✅ Sotildi' : '↩️ Qaytarildi'}</div>
          </div>
          <div className="table-container" style={{ marginBottom: 16 }}>
            <table>
              <thead><tr><th>Mahsulot</th><th>Narx</th><th>Soni</th><th>Jami</th></tr></thead>
              <tbody>
                {(showDetail.items || []).map((item, i) => (
                  <tr key={i}>
                    <td>{item.product_name}</td>
                    <td>{formatMoney(item.price)} so'm</td>
                    <td>{item.quantity}</td>
                    <td style={{ fontWeight: 600 }}>{formatMoney(item.total)} so'm</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 14 }}>Jami: {formatMoney(showDetail.total)} so'm</div>
            {showDetail.discount > 0 && <div style={{ color: 'var(--danger)' }}>Chegirma: −{showDetail.discount}{showDetail.discount_type === 'percent' ? '%' : " so'm"}</div>}
            <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--success)', marginTop: 4 }}>Yakuniy: {formatMoney(showDetail.final_total)} so'm</div>
          </div>
          {showDetail.status === 'completed' && (
            <div className="modal-footer">
              <button className="btn btn-danger" onClick={() => refundSale(showDetail.id)}>↩️ Qaytarish (Refund)</button>
            </div>
          )}
        </Modal>
      )}
    </>
  );
}
