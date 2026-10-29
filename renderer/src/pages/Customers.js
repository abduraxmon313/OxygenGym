import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import Modal from '../components/Modal';

function formatMoney(n) { return Number(n || 0).toLocaleString('uz-UZ'); }

const TIER_COLORS = { Bronze: '🥉', Silver: '🥈', Gold: '🥇', Diamond: '💎' };

export default function Customers() {
  const [customers, setCustomers] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '', birthday: '', notes: '' });
  const [editId, setEditId] = useState(null);
  const [search, setSearch] = useState('');

  useEffect(() => { load(); }, []);

  async function load() {
    if (!window.api) return;
    const data = await window.api.customers.getAll();
    setCustomers(data || []);
  }

  function openNew() {
    setForm({ name: '', phone: '', birthday: '', notes: '' });
    setEditId(null);
    setShowForm(true);
  }

  function openEdit(c) {
    setForm({ name: c.name, phone: c.phone || '', birthday: c.birthday || '', notes: c.notes || '' });
    setEditId(c.id);
    setShowForm(true);
  }

  async function save() {
    if (!form.name) return toast.error("Ismni kiriting!");
    try {
      if (editId) {
        await window.api.customers.update(editId, form);
        toast.success("✅ Mijoz yangilandi");
      } else {
        await window.api.customers.create(form);
        toast.success("✅ Yangi mijoz qo'shildi");
      }
      setShowForm(false);
      load();
    } catch (err) {
      toast.error("Xatolik: " + err.message);
    }
  }

  async function deleteCustomer(id, name) {
    if (!window.confirm(`"${name}" ni o'chirmoqchimisiz?`)) return;
    await window.api.customers.delete(id);
    toast.success("O'chirildi");
    load();
  }

  const filtered = search
    ? customers.filter(c => c.name.toLowerCase().includes(search.toLowerCase()) || (c.phone && c.phone.includes(search)))
    : customers;

  return (
    <>
      <div className="page-header">
        <h2>👥 Mijozlar ({customers.length})</h2>
        <button className="btn btn-primary" onClick={openNew}>➕ Yangi mijoz</button>
      </div>
      <div className="page-body">
        <div className="search-bar" style={{ marginBottom: 16 }}>
          <span className="search-icon">🔍</span>
          <input placeholder="Ism yoki telefon bo'yicha qidirish..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>

        <div className="table-container">
          <table>
            <thead>
              <tr><th>Ism</th><th>Telefon</th><th>Status</th><th>Ball</th><th>Jami xaridlar</th><th>Jami sarflagan</th><th>Amallar</th></tr>
            </thead>
            <tbody>
              {filtered.map(c => (
                <tr key={c.id}>
                  <td style={{ fontWeight: 600 }}>{c.name}</td>
                  <td>{c.phone || '—'}</td>
                  <td>{TIER_COLORS[c.loyalty_tier]} {c.loyalty_tier}</td>
                  <td><span className="badge-blue">{c.loyalty_points} ball</span></td>
                  <td>{c.total_purchases} ta</td>
                  <td>{formatMoney(c.total_spent)} so'm</td>
                  <td>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button className="btn btn-outline btn-sm" onClick={() => openEdit(c)}>✏️</button>
                      <button className="btn btn-outline btn-sm" onClick={() => deleteCustomer(c.id, c.name)} style={{ color: 'var(--danger)' }}>🗑️</button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan="7" style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>Mijoz topilmadi</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showForm && (
        <Modal title={editId ? '✏️ Mijozni tahrirlash' : '➕ Yangi mijoz'} onClose={() => setShowForm(false)}>
          <div className="form-group">
            <label>Ism-familiya *</label>
            <input className="form-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Aziz Karimov" />
          </div>
          <div className="grid-2">
            <div className="form-group">
              <label>Telefon</label>
              <input className="form-input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+998 90 123-45-67" />
            </div>
            <div className="form-group">
              <label>Tug'ilgan sana</label>
              <input className="form-input" type="date" value={form.birthday} onChange={(e) => setForm({ ...form, birthday: e.target.value })} />
            </div>
          </div>
          <div className="form-group">
            <label>Izoh</label>
            <textarea className="form-input" rows="2" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Qo'shimcha ma'lumot..." />
          </div>
          <div className="modal-footer">
            <button className="btn btn-outline" onClick={() => setShowForm(false)}>Bekor</button>
            <button className="btn btn-primary" onClick={save}>{editId ? '💾 Saqlash' : '➕ Qo\'shish'}</button>
          </div>
        </Modal>
      )}
    </>
  );
}
