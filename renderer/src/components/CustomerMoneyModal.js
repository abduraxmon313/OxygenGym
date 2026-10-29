import React, { useState } from 'react';
import { toast } from 'react-hot-toast';
import { Info } from 'lucide-react';
import Modal from './Modal';
import MoneyInput from './MoneyInput';
import { Field, Segmented } from './ui';
import { MONEY_METHODS, balanceState, som } from '../lib/format';

const COPY = {
  deposit: { title: "To'lov qabul qilish", button: 'Qabul qilish' },
  withdraw: { title: 'Avansni qaytarish', button: 'Pulni qaytarish' },
  adjust: { title: 'Hisobni tuzatish', button: 'Tuzatishni saqlash' },
};

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
  if (mode === 'withdraw' && value > Math.max(0, customer.balance)) error = `Hisobda faqat ${som(Math.max(0, customer.balance))} bor`;

  async function submit(e) {
    e.preventDefault();
    if (busy) return;
    if (!value) return toast.error('Summani kiriting');
    if (error) return toast.error(error);
    if (mode === 'adjust' && !note.trim()) return toast.error('Tuzatish sababini yozing');
    setBusy(true);
    try {
      if (mode === 'deposit') await window.api.customers.deposit(customer.id, { amount: value, method, note });
      if (mode === 'withdraw') await window.api.customers.withdraw(customer.id, { amount: value, method, note });
      if (mode === 'adjust') await window.api.customers.adjust(customer.id, { amount: delta, note });
      toast.success('Hisob yangilandi');
      onDone();
    } catch (err) {
      toast.error(err.message);
      setBusy(false);
    }
  }

  return (
    <Modal
      size="sm"
      title={COPY[mode].title}
      subtitle={customer.name}
      onClose={onClose}
      footer={(
        <>
          <button type="button" className="btn btn-secondary" onClick={onClose}>Bekor qilish</button>
          <button type="submit" form="money-form" className={`btn ${mode === 'withdraw' ? 'btn-danger' : 'btn-primary'}`} disabled={busy || Boolean(error)}>
            {COPY[mode].button}
          </button>
        </>
      )}
    >
      <form id="money-form" onSubmit={submit} className="stack">
        <div className="summary pay-box">
          <div className="summary-row"><span>Hozirgi holat</span><strong className={now.cls}>{now.label === 'Hisob nol' ? som(0) : `${now.label}: ${som(now.amount)}`}</strong></div>
          <div className="summary-row"><span>Amaldan keyin</span><strong className={next.cls}>{next.label === 'Hisob nol' ? som(0) : `${next.label}: ${som(next.amount)}`}</strong></div>
        </div>

        {mode === 'adjust' && (
          <Segmented
            options={[{ id: 'minus', label: 'Hisobdan ayirish (qarz)' }, { id: 'plus', label: "Hisobga qo'shish" }]}
            value={direction}
            onChange={setDirection}
          />
        )}

        <Field label="Summa" required error={error}>
          <MoneyInput value={amount} onChange={setAmount} autoFocus invalid={Boolean(error)} />
        </Field>

        {mode !== 'adjust' && (
          <Field label="To'lov usuli">
            <Segmented options={MONEY_METHODS} value={method} onChange={setMethod} />
          </Field>
        )}

        <Field label={mode === 'adjust' ? 'Sabab' : 'Izoh'} required={mode === 'adjust'}>
          <input className="input" value={note} onChange={(e) => setNote(e.target.value)} placeholder={mode === 'adjust' ? 'Masalan: daftardagi eski qarz' : 'Ixtiyoriy'} />
        </Field>

        {mode === 'deposit' && (
          <div className="callout callout-info">
            <Info size={16} />
            <span>Qarzi bo'lsa avval qarz yopiladi, ortgan summa avans bo'lib qoladi va keyingi xaridlarda ishlatiladi.</span>
          </div>
        )}
        {mode === 'adjust' && (
          <div className="callout callout-warning">
            <Info size={16} />
            <span>Tuzatish kassaga ta'sir qilmaydi. Faqat xato yozuvlarni yoki daftardagi eski hisoblarni kiritish uchun ishlating.</span>
          </div>
        )}
      </form>
    </Modal>
  );
}
