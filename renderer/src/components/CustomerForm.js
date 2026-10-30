import React, { useState } from 'react';
import { toast } from 'react-hot-toast';
import Modal from './Modal';
import MoneyInput from './MoneyInput';
import { Field, PhoneInput, Segmented } from './ui';
import { moneyMethods, phoneDigits } from '../lib/format';
import { t } from '../lib/i18n';

function limitMode(limit) {
  if (limit === null || limit === undefined || limit === '') return 'none';
  return Number(limit) === 0 ? 'forbid' : 'limit';
}

export default function CustomerForm({ customer, onClose, onSaved }) {
  const editing = Boolean(customer);
  const [form, setForm] = useState({
    name: customer?.name || '',
    phone: phoneDigits(customer?.phone),
    notes: customer?.notes || '',
    limitMode: limitMode(customer?.debt_limit),
    debt_limit: customer?.debt_limit > 0 ? customer.debt_limit : '',
    initial_type: 'none',
    initial_amount: '',
    initial_method: 'cash',
  });
  const [busy, setBusy] = useState(false);
  const [phoneTouched, setPhoneTouched] = useState(false);
  const set = (key) => (value) => setForm((f) => ({ ...f, [key]: value }));
  const phoneIncomplete = form.phone.length > 0 && form.phone.length < 9;

  async function submit(e) {
    e.preventDefault();
    if (busy) return;
    if (!form.name.trim()) return toast.error(t('Mijoz ismini kiriting'));
    if (phoneIncomplete) { setPhoneTouched(true); return toast.error(t("Telefon raqami to'liq emas: +998 dan keyin 9 ta raqam kiriting")); }
    if (form.limitMode === 'limit' && !form.debt_limit) return toast.error(t('Qarz limitini kiriting'));
    if (form.initial_type !== 'none' && !form.initial_amount) return toast.error(t("Boshlang'ich summani kiriting"));
    const payload = {
      name: form.name,
      phone: form.phone ? `+998${form.phone}` : '',
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
      toast.success(editing ? t("Mijoz ma'lumotlari saqlandi") : t("Mijoz qo'shildi"));
      onSaved(saved);
    } catch (err) {
      toast.error(err.message);
      setBusy(false);
    }
  }

  return (
    <Modal
      size="md"
      title={editing ? t('Mijozni tahrirlash') : t('Yangi mijoz')}
      subtitle={editing ? customer.name : t('Mijoz hisobiga avans yoki eski qarzini darhol kiritish mumkin')}
      onClose={onClose}
      footer={(
        <>
          <button type="button" className="btn btn-secondary" onClick={onClose}>{t('Bekor qilish')}</button>
          <button type="submit" form="customer-form" className="btn btn-primary" disabled={busy}>{editing ? t('Saqlash') : t("Qo'shish")}</button>
        </>
      )}
    >
      <form id="customer-form" onSubmit={submit}>
        <div className="form-section">
          <div className="grid-2">
            <Field label={t('Ism-familiya')} required>
              <input className="input" value={form.name} onChange={(e) => set('name')(e.target.value)} placeholder="Aziz Karimov" autoFocus />
            </Field>
            <Field
              label={t('Telefon')}
              hint={t('Masalan: 33 313 44 22')}
              error={phoneTouched && phoneIncomplete ? t('9 ta raqam kiriting') : null}
            >
              <div onBlur={() => setPhoneTouched(true)}>
                <PhoneInput value={form.phone} onChange={set('phone')} invalid={phoneTouched && phoneIncomplete} />
              </div>
            </Field>
          </div>
        </div>

        <div className="form-section">
          <div className="form-section-title">{t('Qarz sharti')}</div>
          <Segmented
            options={[{ id: 'none', label: t('Cheklovsiz') }, { id: 'limit', label: t('Limit bilan') }, { id: 'forbid', label: t('Qarz berilmaydi') }]}
            value={form.limitMode}
            onChange={set('limitMode')}
          />
          {form.limitMode === 'limit' && (
            <div className="mt-12" style={{ maxWidth: 280 }}>
              <Field label={t('Maksimal qarz summasi')} hint={t("Qarz shu summadan oshsa sotuv to'xtatiladi")}>
                <MoneyInput value={form.debt_limit} onChange={set('debt_limit')} />
              </Field>
            </div>
          )}
        </div>

        {!editing && (
          <div className="form-section">
            <div className="form-section-title">{t("Boshlang'ich hisob")}</div>
            <Segmented
              options={[{ id: 'none', label: t("Yo'q") }, { id: 'advance', label: t('Pul berdi (avans)') }, { id: 'debt', label: t('Eski qarzi bor') }]}
              value={form.initial_type}
              onChange={set('initial_type')}
            />
            {form.initial_type !== 'none' && (
              <div className="grid-2 mt-12">
                <Field label={form.initial_type === 'advance' ? t('Berilgan summa') : t('Qarz summasi')}>
                  <MoneyInput value={form.initial_amount} onChange={set('initial_amount')} autoFocus />
                </Field>
                {form.initial_type === 'advance' && (
                  <Field label={t("To'lov usuli")}>
                    <select className="input" value={form.initial_method} onChange={(e) => set('initial_method')(e.target.value)}>
                      {moneyMethods().map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
                    </select>
                  </Field>
                )}
              </div>
            )}
          </div>
        )}

        <div className="form-section">
          <Field label={t('Izoh')}>
            <textarea className="input" rows={2} value={form.notes} onChange={(e) => set('notes')(e.target.value)} placeholder={t('Masalan: har oy protein oladi, abonement egasi')} />
          </Field>
        </div>
      </form>
    </Modal>
  );
}
