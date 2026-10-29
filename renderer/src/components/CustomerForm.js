import React, { useState } from 'react';
import { toast } from 'react-hot-toast';
import Modal from './Modal';
import MoneyInput from './MoneyInput';
import { Field, Segmented } from './ui';
import { MONEY_METHODS } from '../lib/format';

function limitMode(limit) {
  if (limit === null || limit === undefined || limit === '') return 'none';
  return Number(limit) === 0 ? 'forbid' : 'limit';
}

export default function CustomerForm({ customer, onClose, onSaved }) {
  const editing = Boolean(customer);
  const [form, setForm] = useState({
    name: customer?.name || '',
    phone: customer?.phone || '',
    notes: customer?.notes || '',
    limitMode: limitMode(customer?.debt_limit),
    debt_limit: customer?.debt_limit > 0 ? customer.debt_limit : '',
    initial_type: 'none',
    initial_amount: '',
    initial_method: 'cash',
  });
  const [busy, setBusy] = useState(false);
  const set = (key) => (value) => setForm((f) => ({ ...f, [key]: value }));

  async function submit(e) {
    e.preventDefault();
    if (busy) return;
    if (!form.name.trim()) return toast.error('Mijoz ismini kiriting');
    if (form.limitMode === 'limit' && !form.debt_limit) return toast.error('Qarz limitini kiriting');
    if (form.initial_type !== 'none' && !form.initial_amount) return toast.error('Boshlang\'ich summani kiriting');
    const payload = {
      name: form.name,
      phone: form.phone,
      notes: form.notes,
      debt_limit: form.limitMode === 'none' ? null : form.limitMode === 'forbid' ? 0 : form.debt_limit,
    };
    if (!editing) {
      payload.initial_type = form.initial_type;
      payload.initial_amount = form.initial_type === 'none' ? 0 : form.initial_amount;
      payload.initial_method = form.initial_method;
    }
    setBusy(true);
    try {
      const saved = editing
        ? await window.api.customers.update(customer.id, payload)
        : await window.api.customers.create(payload);
      toast.success(editing ? "Mijoz ma'lumotlari saqlandi" : "Mijoz qo'shildi");
      onSaved(saved);
    } catch (err) {
      toast.error(err.message);
      setBusy(false);
    }
  }

  return (
    <Modal
      size="md"
      title={editing ? 'Mijozni tahrirlash' : 'Yangi mijoz'}
      subtitle={editing ? customer.name : "Mijoz hisobiga avans yoki eski qarzini darhol kiritish mumkin"}
      onClose={onClose}
      footer={(
        <>
          <button type="button" className="btn btn-secondary" onClick={onClose}>Bekor qilish</button>
          <button type="submit" form="customer-form" className="btn btn-primary" disabled={busy}>{editing ? 'Saqlash' : "Qo'shish"}</button>
        </>
      )}
    >
      <form id="customer-form" onSubmit={submit}>
        <div className="form-section">
          <div className="grid-2">
            <Field label="Ism-familiya" required>
              <input className="input" value={form.name} onChange={(e) => set('name')(e.target.value)} placeholder="Aziz Karimov" autoFocus />
            </Field>
            <Field label="Telefon">
              <input className="input" value={form.phone} onChange={(e) => set('phone')(e.target.value)} placeholder="+998 90 123 45 67" />
            </Field>
          </div>
        </div>

        <div className="form-section">
          <div className="form-section-title">Qarz sharti</div>
          <Segmented
            options={[{ id: 'none', label: 'Cheklovsiz' }, { id: 'limit', label: 'Limit bilan' }, { id: 'forbid', label: 'Qarz berilmaydi' }]}
            value={form.limitMode}
            onChange={set('limitMode')}
          />
          {form.limitMode === 'limit' && (
            <div className="mt-12" style={{ maxWidth: 280 }}>
              <Field label="Maksimal qarz summasi" hint="Qarz shu summadan oshsa sotuv to'xtatiladi">
                <MoneyInput value={form.debt_limit} onChange={set('debt_limit')} />
              </Field>
            </div>
          )}
        </div>

        {!editing && (
          <div className="form-section">
            <div className="form-section-title">Boshlang'ich hisob</div>
            <Segmented
              options={[{ id: 'none', label: "Yo'q" }, { id: 'advance', label: 'Pul berdi (avans)' }, { id: 'debt', label: 'Eski qarzi bor' }]}
              value={form.initial_type}
              onChange={set('initial_type')}
            />
            {form.initial_type !== 'none' && (
              <div className="grid-2 mt-12">
                <Field label={form.initial_type === 'advance' ? 'Berilgan summa' : 'Qarz summasi'}>
                  <MoneyInput value={form.initial_amount} onChange={set('initial_amount')} autoFocus />
                </Field>
                {form.initial_type === 'advance' && (
                  <Field label="To'lov usuli">
                    <select className="input" value={form.initial_method} onChange={(e) => set('initial_method')(e.target.value)}>
                      {MONEY_METHODS.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
                    </select>
                  </Field>
                )}
              </div>
            )}
          </div>
        )}

        <div className="form-section">
          <Field label="Izoh">
            <textarea className="input" rows={2} value={form.notes} onChange={(e) => set('notes')(e.target.value)} placeholder="Masalan: har oy protein oladi, abonement egasi" />
          </Field>
        </div>
      </form>
    </Modal>
  );
}
