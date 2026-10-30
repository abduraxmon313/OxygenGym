import React, { useState } from 'react';
import { toast } from 'react-hot-toast';
import { Info } from 'lucide-react';
import Modal from './Modal';
import MoneyInput from './MoneyInput';
import { Field, Segmented } from './ui';
import { balanceState, moneyMethods, som } from '../lib/format';
import { t } from '../lib/i18n';

const copy = () => ({
  deposit: { title: t("To'lov qabul qilish"), button: t('Qabul qilish') },
  withdraw: { title: t('Avansni qaytarish'), button: t('Pulni qaytarish') },
  adjust: { title: t('Hisobni tuzatish'), button: t('Tuzatishni saqlash') },
});

/** mode: 'deposit' | 'withdraw' | 'adjust' */
export default function CustomerMoneyModal({ customer, mode, onClose, onDone }) {
  const [amount, setAmount] = useState(mode === 'deposit' && customer.balance < 0 ? -customer.balance : '');
  const [method, setMethod] = useState('cash');
  const [direction, setDirection] = useState('minus');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  const value = Number(amount) || 0;
  const delta = mode === 'deposit' ? value : mode === 'withdraw' ? -value : direction === 'plus' ? value : -value;
  const after = customer.balance + delta;
  const now = balanceState(customer.balance);
  const next = balanceState(after);

  let error = null;
  if (mode === 'withdraw' && value > Math.max(0, customer.balance)) error = t('Hisobda faqat {s} bor', { s: som(Math.max(0, customer.balance)) });

  async function submit(e) {
    e.preventDefault();
    if (busy) return;
    if (!value) return toast.error(t('Summani kiriting'));
    if (error) return toast.error(error);
    if (mode === 'adjust' && !note.trim()) return toast.error(t('Tuzatish sababini yozing'));
    setBusy(true);
    try {
      if (mode === 'deposit') await window.api.customers.deposit(customer.id, { amount: value, method, note });
      if (mode === 'withdraw') await window.api.customers.withdraw(customer.id, { amount: value, method, note });
      if (mode === 'adjust') await window.api.customers.adjust(customer.id, { amount: delta, note });
      toast.success(t('Hisob yangilandi'));
      onDone();
    } catch (err) {
      toast.error(err.message);
      setBusy(false);
    }
  }

  const COPY = copy();
  return (
    <Modal
      size="sm"
      title={COPY[mode].title}
      subtitle={customer.name}
      onClose={onClose}
      footer={(
        <>
          <button type="button" className="btn btn-secondary" onClick={onClose}>{t('Bekor qilish')}</button>
          <button type="submit" form="money-form" className={`btn ${mode === 'withdraw' ? 'btn-danger' : 'btn-primary'}`} disabled={busy || Boolean(error)}>
            {COPY[mode].button}
          </button>
        </>
      )}
    >
      <form id="money-form" onSubmit={submit} className="stack">
        <div className="summary pay-box">
          <div className="summary-row"><span>{t('Hozirgi holat')}</span><strong className={now.cls}>{now.kind === 'zero' ? som(0) : `${now.label}: ${som(now.amount)}`}</strong></div>
          <div className="summary-row"><span>{t('Amaldan keyin')}</span><strong className={next.cls}>{next.kind === 'zero' ? som(0) : `${next.label}: ${som(next.amount)}`}</strong></div>
        </div>

        {mode === 'adjust' && (
          <Segmented
            options={[{ id: 'minus', label: t('Hisobdan ayirish (qarz)') }, { id: 'plus', label: t("Hisobga qo'shish") }]}
            value={direction}
            onChange={setDirection}
          />
        )}

        <Field label={t('Summa')} required error={error}>
          <MoneyInput value={amount} onChange={setAmount} autoFocus invalid={Boolean(error)} />
        </Field>

        {mode !== 'adjust' && (
          <Field label={t("To'lov usuli")}>
            <Segmented options={moneyMethods()} value={method} onChange={setMethod} />
          </Field>
        )}

        <Field label={mode === 'adjust' ? t('Sabab') : t('Izoh')} required={mode === 'adjust'}>
          <input className="input" value={note} onChange={(e) => setNote(e.target.value)} placeholder={mode === 'adjust' ? t('Masalan: daftardagi eski qarz') : t('Ixtiyoriy')} />
        </Field>

        {mode === 'deposit' && (
          <div className="callout callout-info">
            <Info size={16} />
            <span>{t("Qarzi bo'lsa avval qarz yopiladi, ortgan summa avans bo'lib qoladi va keyingi xaridlarda ishlatiladi.")}</span>
          </div>
        )}
        {mode === 'adjust' && (
          <div className="callout callout-warning">
            <Info size={16} />
            <span>{t("Tuzatish kassaga ta'sir qilmaydi. Faqat xato yozuvlarni yoki daftardagi eski hisoblarni kiritish uchun ishlating.")}</span>
          </div>
        )}
      </form>
    </Modal>
  );
}
