import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import Modal from '../components/Modal';

export default function Suppliers() {
  const [suppliers, setSuppliers] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '', address: '', notes: '' });
  const [editId, setEditId] = useState(null);

  useEffect(() => { load(); }, []);

  async function load() {
    if (!window.api) return;
    const data = await window.api.suppliers.getAll();
    setSuppliers(data || []);
  }

  function openNew() { setForm({ name: '', phone: '', address: '', notes: '' }); setEditId(null); setShowForm(true); }
  function openEdit(s) { setForm({ name: s.name, phone: s.phone || '', address: s.address || '', notes: s.notes || '' }); setEditId(s.id); setShowForm(true); }

  async function save() {
    if (!form.name) return toast.error("Nomini kiriting!");
    try {
      if (editId) { await window.api.suppliers.update(editId, form); toast.success("✅ Yangilandi"); }
      else { await window.api.suppliers.create(form); toast.success("✅ Qo'shildi"); }
      setShowForm(false); load();
    } catch (err) { toast.error("Xatolik: " + err.message); }
  }

  async function del(id, name) {
    if (!window.confirm(`"${name}" ni o'chirmoqchimisiz?`)) return;
    await window.api.suppliers.delete(id); toast.success("O'chirildi"); load();
  }

  return (
    <>
      <div className="page-header">
        <h2>🚛 Yetkazib beruvchilar ({suppliers.length})</h2>
        <button className="btn btn-primary" onClick={openNew}>➕ Yangi</button>
      </div>
      <div className="page-body">
        <div className="table-container">
          <table>
            <thead><tr><th>Nomi</th><th>Telefon</th><th>Manzil</th><th>Izoh</th><th>Amallar</th></tr></thead>
            <tbody>
              {suppliers.map(s => (
                <tr key={s.id}>
                  <td style={{ fontWeight: 600 }}>{s.name}</td>
                  <td>{s.phone || '—'}</td>
                  <td>{s.address || '—'}</td>
                  <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{s.notes || '—'}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button className="btn btn-outline btn-sm" onClick={() => openEdit(s)}>✏️</button>
                      <button className="btn btn-outline btn-sm" onClick={() => del(s.id, s.name)} style={{ color: 'var(--danger)' }}>🗑️</button>
                    </div>
                  </td>
                </tr>
              ))}
              {suppliers.length === 0 && (
                <tr><td colSpan="5" style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>Yetkazib beruvchi yo'q</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showForm && (
        <Modal title={editId ? '✏️ Tahrirlash' : '➕ Yangi yetkazib beruvchi'} onClose={() => setShowForm(false)}>
          <div className="form-group"><label>Nomi *</label><input className="form-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="MaxPower Distribution" /></div>
          <div className="grid-2">
            <div className="form-group"><label>Telefon</label><input className="form-input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+998..." /></div>
            <div className="form-group"><label>Manzil</label><input className="form-input" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
          </div>
          <div className="form-group"><label>Izoh</label><textarea className="form-input" rows="2" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
          <div className="modal-footer">
            <button className="btn btn-outline" onClick={() => setShowForm(false)}>Bekor</button>
            <button className="btn btn-primary" onClick={save}>{editId ? '💾 Saqlash' : '➕ Qo\'shish'}</button>
          </div>
        </Modal>
      )}
    </>
  );
}
