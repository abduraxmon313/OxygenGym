import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import Modal from '../components/Modal';
import BarcodeScanner from '../components/BarcodeScanner';

function formatMoney(n) { return Number(n || 0).toLocaleString('uz-UZ'); }

export default function StockReceive({ onDataChange }) {
  const [receipts, setReceipts] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [showDetail, setShowDetail] = useState(null);

  const [supplierId, setSupplierId] = useState('');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState('');
  const [searchResults, setSearchResults] = useState([]);

  useEffect(() => { load(); }, []);

  async function load() {
    if (!window.api) return;
    const [r, s, p] = await Promise.all([
      window.api.stock.getReceipts({}),
      window.api.suppliers.getAll(),
      window.api.products.getAll(),
    ]);
    setReceipts(r || []);
    setSuppliers(s || []);
    setProducts(p || []);
  }

  function startNew() {
    setSupplierId('');
    setNotes('');
    setItems([]);
    setShowForm(true);
  }

  function addItem(product) {
    const existing = items.find(i => i.product_id === product.id);
    if (existing) {
      toast('Bu mahsulot ro\'yxatda bor, miqdorni o\'zgartiring');
      return;
    }
    setItems([...items, {
      product_id: product.id,
      product_name: product.name,
      quantity: 1,
      cost_price: product.cost_price || 0,
      expiry_date: '',
      batch_number: '',
    }]);
    setSearch('');
    setSearchResults([]);
    toast.success(`✅ ${product.name} qo'shildi`);
  }

  function updateItem(index, field, value) {
    setItems(items.map((item, i) => i === index ? { ...item, [field]: value } : item));
  }

  function removeItem(index) {
    setItems(items.filter((_, i) => i !== index));
  }

  async function handleBarcodeScan(barcode) {
    setShowScanner(false);
    if (!window.api) return;
    const product = await window.api.products.getByBarcode(barcode);
    if (product) {
      addItem(product);
    } else {
      toast.error(`❌ Barcode topilmadi: ${barcode}\nAvval mahsulotni yarating`);
    }
  }

  async function saveReceipt() {
    if (items.length === 0) return toast.error("Kamida 1 ta mahsulot qo'shing!");
    for (const item of items) {
      if (!item.quantity || item.quantity <= 0) return toast.error("Miqdor noto'g'ri!");
    }
    try {
      const result = await window.api.stock.receive({
        supplier_id: supplierId || null,
        notes,
        items,
      });
      if (result.success) {
        toast.success(`✅ Kirim #${result.receipt_number} saqlandi! ${items.reduce((s, i) => s + i.quantity, 0)} dona qabul qilindi`);
        setShowForm(false);
        load();
        if (onDataChange) onDataChange();
      }
    } catch (err) {
      toast.error('Xatolik: ' + err.message);
    }
  }

  async function viewDetail(id) {
    const receipt = await window.api.stock.getReceiptById(id);
    setShowDetail(receipt);
  }

  function handleSearch(q) {
    setSearch(q);
    if (q.length < 1) { setSearchResults([]); return; }
    const filtered = products.filter(p =>
      p.name.toLowerCase().includes(q.toLowerCase()) || (p.barcode && p.barcode.includes(q))
    ).slice(0, 10);
    setSearchResults(filtered);
  }

  const totalAmount = items.reduce((s, i) => s + (i.quantity * i.cost_price), 0);
  const totalItems = items.reduce((s, i) => s + Number(i.quantity), 0);

  return (
    <>
      <div className="page-header">
        <h2>📥 Kirim / Priyomka</h2>
        <button className="btn btn-primary" onClick={startNew}>➕ Yangi kirim</button>
      </div>
      <div className="page-body">
        <div className="table-container">
          <table>
            <thead>
              <tr><th>Raqam</th><th>Yetkazib beruvchi</th><th>Mahsulotlar</th><th>Jami summa</th><th>Sana</th><th></th></tr>
            </thead>
            <tbody>
              {receipts.map(r => (
                <tr key={r.id}>
                  <td style={{ fontFamily: 'monospace' }}>{r.receipt_number}</td>
                  <td>{r.supplier_name || '—'}</td>
                  <td>{r.total_items} dona</td>
                  <td>{formatMoney(r.total_amount)} so'm</td>
                  <td>{new Date(r.created_at).toLocaleDateString('uz-UZ')}</td>
                  <td><button className="btn btn-outline btn-sm" onClick={() => viewDetail(r.id)}>👁️</button></td>
                </tr>
              ))}
              {receipts.length === 0 && (
                <tr><td colSpan="6" style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>Hali kirim yo'q</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* New Receipt Form */}
      {showForm && (
        <Modal title="📥 Yangi kirim" onClose={() => setShowForm(false)} large>
          <div className="grid-2">
            <div className="form-group">
              <label>Yetkazib beruvchi</label>
              <select className="form-input" value={supplierId} onChange={(e) => setSupplierId(e.target.value)}>
                <option value="">Tanlang (ixtiyoriy)...</option>
                {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Izoh</label>
              <input className="form-input" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Masalan: Oktyabr partiyasi" />
            </div>
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-secondary)', marginBottom: 6, display: 'block' }}>Mahsulot qo'shish:</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <div style={{ flex: 1, position: 'relative' }}>
                <input className="form-input" placeholder="Mahsulot nomi yoki barcode..." value={search} onChange={(e) => handleSearch(e.target.value)} />
                {searchResults.length > 0 && (
                  <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 8, zIndex: 10, maxHeight: 200, overflowY: 'auto' }}>
                    {searchResults.map(p => (
                      <div key={p.id} style={{ padding: '8px 12px', cursor: 'pointer', borderBottom: '1px solid var(--border)', fontSize: 13 }}
                        onClick={() => addItem(p)}>
                        <strong>{p.name}</strong> <span style={{ color: 'var(--text-muted)' }}>{p.barcode}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <button className="btn btn-primary" onClick={() => setShowScanner(true)}>📷 Skanerlash</button>
            </div>
          </div>

          {items.length > 0 && (
            <div className="table-container" style={{ marginBottom: 16 }}>
              <table>
                <thead><tr><th>Mahsulot</th><th>Miqdor</th><th>Kelish narxi</th><th>Yaroqlik</th><th>Jami</th><th></th></tr></thead>
                <tbody>
                  {items.map((item, i) => (
                    <tr key={i}>
                      <td style={{ fontWeight: 600, fontSize: 13 }}>{item.product_name}</td>
                      <td><input className="form-input" type="number" min="1" style={{ width: 80 }} value={item.quantity} onChange={(e) => updateItem(i, 'quantity', Number(e.target.value))} /></td>
                      <td><input className="form-input" type="number" style={{ width: 120 }} value={item.cost_price} onChange={(e) => updateItem(i, 'cost_price', Number(e.target.value))} /></td>
                      <td><input className="form-input" type="date" style={{ width: 150 }} value={item.expiry_date} onChange={(e) => updateItem(i, 'expiry_date', e.target.value)} /></td>
                      <td style={{ fontWeight: 600 }}>{formatMoney(item.quantity * item.cost_price)}</td>
                      <td><button className="btn btn-outline btn-sm" onClick={() => removeItem(i)} style={{ color: 'var(--danger)' }}>🗑️</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div style={{ background: 'var(--bg-primary)', padding: 16, borderRadius: 8, marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14 }}>
              <span>Jami mahsulotlar:</span><strong>{items.length} tur, {totalItems} dona</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 18, fontWeight: 800, marginTop: 8, color: 'var(--accent)' }}>
              <span>Jami summa:</span><span>{formatMoney(totalAmount)} so'm</span>
            </div>
          </div>

          <div className="modal-footer">
            <button className="btn btn-outline" onClick={() => setShowForm(false)}>Bekor</button>
            <button className="btn btn-success btn-lg" onClick={saveReceipt}>
              ✅ Kirimni tasdiqlash
            </button>
          </div>
        </Modal>
      )}

      {/* Detail Modal */}
      {showDetail && (
        <Modal title={`📋 Kirim #${showDetail.receipt_number}`} onClose={() => setShowDetail(null)} large>
          <div className="grid-2" style={{ marginBottom: 16 }}>
            <div><strong>Yetkazib beruvchi:</strong> {showDetail.supplier_name || '—'}</div>
            <div><strong>Sana:</strong> {new Date(showDetail.created_at).toLocaleString('uz-UZ')}</div>
          </div>
          {showDetail.notes && <div style={{ marginBottom: 16 }}><strong>Izoh:</strong> {showDetail.notes}</div>}
          <div className="table-container">
            <table>
              <thead><tr><th>Mahsulot</th><th>Barcode</th><th>Miqdor</th><th>Narx</th><th>Yaroqlik</th><th>Jami</th></tr></thead>
              <tbody>
                {(showDetail.items || []).map((item, i) => (
                  <tr key={i}>
                    <td>{item.product_name}</td>
                    <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{item.barcode || '—'}</td>
                    <td>{item.quantity} dona</td>
                    <td>{formatMoney(item.cost_price)}</td>
                    <td>{item.expiry_date || '—'}</td>
                    <td style={{ fontWeight: 600 }}>{formatMoney(item.quantity * item.cost_price)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ textAlign: 'right', marginTop: 12, fontSize: 18, fontWeight: 800, color: 'var(--accent)' }}>
            Jami: {formatMoney(showDetail.total_amount)} so'm
          </div>
        </Modal>
      )}

      {showScanner && (
        <Modal title="📷 Barcode skanerlash" onClose={() => setShowScanner(false)}>
          <BarcodeScanner onScan={handleBarcodeScan} onClose={() => setShowScanner(false)} />
        </Modal>
      )}
    </>
  );
}
