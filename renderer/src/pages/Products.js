import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import Modal from '../components/Modal';
import BarcodeScanner from '../components/BarcodeScanner';

function formatMoney(n) { return Number(n || 0).toLocaleString('uz-UZ'); }

const EMPTY_PRODUCT = {
  name: '', barcode: '', category_id: '', brand: '', description: '',
  cost_price: '', sell_price: '', min_stock: 3, weight: '', flavor: '', unit: 'dona',
};

export default function Products({ onDataChange }) {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_PRODUCT);
  const [editId, setEditId] = useState(null);
  const [showScanner, setShowScanner] = useState(false);

  useEffect(() => { load(); }, []);

  async function load() {
    if (!window.api) return;
    const [prods, cats] = await Promise.all([
      window.api.products.getAll(),
      window.api.products.getCategories(),
    ]);
    setProducts(prods || []);
    setCategories(cats || []);
  }

  function openNew() {
    setForm(EMPTY_PRODUCT);
    setEditId(null);
    setShowForm(true);
  }

  function openEdit(product) {
    setForm({
      name: product.name,
      barcode: product.barcode || '',
      category_id: product.category_id || '',
      brand: product.brand || '',
      description: product.description || '',
      cost_price: product.cost_price,
      sell_price: product.sell_price,
      min_stock: product.min_stock,
      weight: product.weight || '',
      flavor: product.flavor || '',
      unit: product.unit || 'dona',
    });
    setEditId(product.id);
    setShowForm(true);
  }

  async function saveProduct() {
    if (!form.name || !form.sell_price) return toast.error("Nom va sotuv narxini kiriting!");
    try {
      if (editId) {
        await window.api.products.update(editId, form);
        toast.success("✅ Mahsulot yangilandi");
      } else {
        await window.api.products.create(form);
        toast.success("✅ Yangi mahsulot yaratildi");
      }
      setShowForm(false);
      load();
      if (onDataChange) onDataChange();
    } catch (err) {
      toast.error("Xatolik: " + err.message);
    }
  }

  async function deleteProduct(id, name) {
    if (!window.confirm(`"${name}" ni o'chirmoqchimisiz?`)) return;
    await window.api.products.delete(id);
    toast.success("O'chirildi");
    load();
    if (onDataChange) onDataChange();
  }

  const filtered = search
    ? products.filter(p => p.name.toLowerCase().includes(search.toLowerCase()) || (p.barcode && p.barcode.includes(search)) || (p.brand && p.brand.toLowerCase().includes(search.toLowerCase())))
    : products;

  // Flatten categories for select
  const flatCats = [];
  categories.forEach(cat => {
    flatCats.push({ id: cat.id, name: cat.icon + ' ' + cat.name, level: 0 });
    (cat.children || []).forEach(ch => flatCats.push({ id: ch.id, name: '  └ ' + ch.name, level: 1 }));
  });

  return (
    <>
      <div className="page-header">
        <h2>📦 Mahsulotlar ({products.length})</h2>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-primary" onClick={openNew}>➕ Yangi mahsulot</button>
        </div>
      </div>
      <div className="page-body">
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          <div className="search-bar" style={{ flex: 1 }}>
            <span className="search-icon">🔍</span>
            <input placeholder="Qidirish (nom, barcode, brend)..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <button className="btn btn-outline" onClick={() => setShowScanner(true)}>📷 Skanerlash</button>
        </div>

        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Mahsulot</th>
                <th>Barcode</th>
                <th>Kategoriya</th>
                <th>Brend</th>
                <th>Kelish narxi</th>
                <th>Sotuv narxi</th>
                <th>Foyda</th>
                <th>Qoldiq</th>
                <th>Amallar</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(p => {
                const profit = p.sell_price - p.cost_price;
                const margin = p.sell_price > 0 ? ((profit / p.sell_price) * 100).toFixed(1) : 0;
                return (
                  <tr key={p.id}>
                    <td style={{ fontWeight: 600 }}>{p.name}</td>
                    <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{p.barcode || '—'}</td>
                    <td>{p.category_name || '—'}</td>
                    <td>{p.brand || '—'}</td>
                    <td>{formatMoney(p.cost_price)}</td>
                    <td style={{ fontWeight: 600 }}>{formatMoney(p.sell_price)}</td>
                    <td style={{ color: 'var(--success)' }}>{formatMoney(profit)} ({margin}%)</td>
                    <td>
                      <span className={p.stock <= 0 ? 'badge-danger' : p.stock <= p.min_stock ? 'badge-warning' : 'badge-success'}>
                        {p.stock} {p.unit}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button className="btn btn-outline btn-sm" onClick={() => openEdit(p)}>✏️</button>
                        <button className="btn btn-outline btn-sm" onClick={() => deleteProduct(p.id, p.name)} style={{ color: 'var(--danger)' }}>🗑️</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr><td colSpan="9" style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>Mahsulot topilmadi</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Product Form Modal */}
      {showForm && (
        <Modal title={editId ? '✏️ Mahsulotni tahrirlash' : '➕ Yangi mahsulot'} onClose={() => setShowForm(false)} large>
          <div className="grid-2">
            <div className="form-group">
              <label>Mahsulot nomi *</label>
              <input className="form-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Masalan: Creatine Monohydrate 300g" />
            </div>
            <div className="form-group">
              <label>Barcode</label>
              <div style={{ display: 'flex', gap: 4 }}>
                <input className="form-input" value={form.barcode} onChange={(e) => setForm({ ...form, barcode: e.target.value })} placeholder="748927056112" />
                <button className="btn btn-outline btn-sm" onClick={() => setShowScanner(true)}>📷</button>
              </div>
            </div>
          </div>
          <div className="grid-2">
            <div className="form-group">
              <label>Kategoriya</label>
              <select className="form-input" value={form.category_id} onChange={(e) => setForm({ ...form, category_id: e.target.value })}>
                <option value="">Tanlang...</option>
                {flatCats.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Brend</label>
              <input className="form-input" value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} placeholder="Optimum Nutrition" />
            </div>
          </div>
          <div className="grid-3">
            <div className="form-group">
              <label>Kelish narxi (so'm) *</label>
              <input className="form-input" type="number" value={form.cost_price} onChange={(e) => setForm({ ...form, cost_price: Number(e.target.value) })} />
            </div>
            <div className="form-group">
              <label>Sotuv narxi (so'm) *</label>
              <input className="form-input" type="number" value={form.sell_price} onChange={(e) => setForm({ ...form, sell_price: Number(e.target.value) })} />
            </div>
            <div className="form-group">
              <label>Min. qoldiq (ogohlantirish)</label>
              <input className="form-input" type="number" value={form.min_stock} onChange={(e) => setForm({ ...form, min_stock: Number(e.target.value) })} />
            </div>
          </div>
          <div className="grid-3">
            <div className="form-group">
              <label>Og'irlik/Hajm</label>
              <input className="form-input" value={form.weight} onChange={(e) => setForm({ ...form, weight: e.target.value })} placeholder="300g, 2.27kg" />
            </div>
            <div className="form-group">
              <label>Ta'm/Variant</label>
              <input className="form-input" value={form.flavor} onChange={(e) => setForm({ ...form, flavor: e.target.value })} placeholder="Chocolate, Vanilla" />
            </div>
            <div className="form-group">
              <label>O'lchov birligi</label>
              <select className="form-input" value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })}>
                <option value="dona">Dona</option>
                <option value="kg">Kilogramm</option>
                <option value="litr">Litr</option>
                <option value="paket">Paket</option>
              </select>
            </div>
          </div>
          <div className="form-group">
            <label>Tavsif</label>
            <textarea className="form-input" rows="2" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Qo'shimcha ma'lumot..." />
          </div>
          {form.sell_price > 0 && form.cost_price > 0 && (
            <div style={{ background: 'var(--success-light)', padding: 12, borderRadius: 8, marginBottom: 16 }}>
              <strong style={{ color: 'var(--success)' }}>
                📈 Foyda: {formatMoney(form.sell_price - form.cost_price)} so'm ({((form.sell_price - form.cost_price) / form.sell_price * 100).toFixed(1)}%)
              </strong>
            </div>
          )}
          <div className="modal-footer">
            <button className="btn btn-outline" onClick={() => setShowForm(false)}>Bekor</button>
            <button className="btn btn-primary" onClick={saveProduct}>
              {editId ? '💾 Saqlash' : '➕ Yaratish'}
            </button>
          </div>
        </Modal>
      )}

      {showScanner && (
        <Modal title="📷 Barcode skanerlash" onClose={() => setShowScanner(false)}>
          <BarcodeScanner
            onScan={(barcode) => { setForm({ ...form, barcode }); setShowScanner(false); toast.success('Barcode: ' + barcode); }}
            onClose={() => setShowScanner(false)}
          />
        </Modal>
      )}
    </>
  );
}
