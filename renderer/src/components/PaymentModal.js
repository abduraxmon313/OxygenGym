import React, { useState } from 'react';
import { toast } from 'react-hot-toast';
import { AlertCircle, Banknote, CheckCircle2, CreditCard, Smartphone, Wallet } from 'lucide-react';
import Modal from './Modal';
import MoneyInput from './MoneyInput';
import { balanceState, som } from '../lib/format';

const METHODS = [
  { id: 'cash', label: 'Naqd', icon: Banknote },
  { id: 'card', label: 'Karta', icon: CreditCard },
  { id: 'click', label: 'Click', icon: Smartphone },
  { id: 'payme', label: 'Payme', icon: Smartphone },
];

/**
 * To'lov tartibi:
 * 1) mijoz avansi bo'lsa — avval hisobdan yechiladi (o'zgartirish mumkin)
 * 2) qolgan qismi naqd / karta / Click / Payme (bir nechtasini birga ishlatish mumkin)
 * 3) yetmagan qismi — mijoz tanlangan bo'lsa qarzga yoziladi
 * 4) ortiqcha naqd — qaytim beriladi yoki mijoz hisobiga yoziladi
 */
export default function PaymentModal({ total, subtotal, customer, items, discount, discountType, allowDebt, onClose, onDone }) {
  const available = customer ? Math.max(0, Math.round(customer.balance)) : 0;
  const initialBalance = Math.min(available, total);
  const [useBalance, setUseBalance] = useState(initialBalance);
  const [amounts, setAmounts] = useState({ cash: total - initialBalance, card: '', click: '', payme: '' });
  const [changeToBalance, setChangeToBalance] = useState(false);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  const balanceUsed = Math.min(Number(useBalance) || 0, available, total);
  const need = total - balanceUsed;
  const paid = METHODS.reduce((s, m) => s + (Number(amounts[m.id]) || 0), 0);
  const change = Math.max(0, paid - need);
  const debt = Math.max(0, need - paid);
  const balanceAfter = customer ? customer.balance - balanceUsed - debt + (changeToBalance ? change : 0) : 0;
  const limit = customer ? customer.debt_limit : null;

  let error = null;
  if (debt > 0 && !customer) error = "To'lov yetarli emas. Qarzga sotish uchun mijozni tanlang.";
  else if (debt > 0 && !allowDebt) error = "Qarzga sotish sozlamalarda o'chirilgan.";
  else if (debt > 0 && limit !== null && limit !== undefined && -balanceAfter > limit) {
    error = Number(limit) === 0 ? 'Bu mijozga qarzga sotish taqiqlangan.' : `Qarz limiti (${som(limit)}) oshib ketadi.`;
  } else if (change > 0 && !changeToBalance && change > (Number(amounts.cash) || 0)) {
    error = 'Qaytim faqat naqd puldan beriladi. Karta, Click yoki Payme summasini kamaytiring.';
  }

  const onlyCash = !amounts.card && !amounts.click && !amounts.payme;

  function changeBalanceUse(v) {
    const value = v === '' ? '' : Math.min(v, available, total);
    setUseBalance(value);
    if (onlyCash) setAmounts((a) => ({ ...a, cash: Math.max(0, total - (Number(value) || 0)) }));
  }

  function payFullWith(method) {
    setAmounts({ cash: '', card: '', click: '', payme: '', [method]: need });
  }

  async function submit(e) {
    e.preventDefault();
    if (busy || error) return;
    setBusy(true);
    try {
      const result = await window.api.sales.create({
        items: items.map((i) => ({ product_id: i.product_id, quantity: i.quantity })),
        discount,
        discount_type: discountType,
        customer_id: customer ? customer.id : null,
        balance_used: balanceUsed,
        payments: Object.fromEntries(METHODS.map((m) => [m.id, Number(amounts[m.id]) || 0])),
        change_to_balance: changeToBalance && change > 0,
        notes: note,
      });
      onDone(result);
    } catch (err) {
      toast.error(err.message);
      setBusy(false);
    }
  }

  const after = balanceState(balanceAfter);

  return (
    <Modal
      size="md"
      title="To'lov"
      subtitle={customer ? `Mijoz: ${customer.name}` : 'Mijozsiz sotuv — to\'liq to\'lov talab qilinadi'}
      onClose={onClose}
      footer={(
        <>
          <button type="button" className="btn btn-secondary" onClick={onClose}>Orqaga</button>
          <button type="submit" form="payment-form" className="btn btn-success btn-lg" disabled={busy || Boolean(error)}>
            <CheckCircle2 size={18} />Sotuvni yakunlash
          </button>
        </>
      )}
    >
      <form id="payment-form" onSubmit={submit}>
        <div className="pay-hero">
          <div>
            <div className="label">To'lanadigan summa</div>
            <div className="value">{som(total)}</div>
          </div>
          {subtotal !== total && (
            <div className="side">
              <div>Jami: {som(subtotal)}</div>
              <div>Chegirma: −{som(subtotal - total)}</div>
            </div>
          )}
        </div>

        {customer && available > 0 && (
          <div className="pay-box mb-16">
            <div className="row-between" style={{ marginBottom: 10 }}>
              <div className="row"><Wallet size={16} className="muted" /><span className="strong">Mijoz hisobidan</span></div>
              <span className="secondary tnum">Mavjud avans: <span className="amount-pos">{som(available)}</span></span>
            </div>
            <div className="row">
              <div style={{ flex: 1 }}><MoneyInput value={useBalance} onChange={changeBalanceUse} /></div>
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => changeBalanceUse(initialBalance)}>Maksimal</button>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => changeBalanceUse(0)}>Ishlatmaslik</button>
            </div>
          </div>
        )}

        <div className="form-section-title">To'lov usullari</div>
        <div className="pay-methods">
          {METHODS.map((m, i) => (
            <div key={m.id} className="pay-row">
              <span className="label"><m.icon size={16} />{m.label}</span>
              <MoneyInput
                value={amounts[m.id]}
                onChange={(v) => setAmounts((a) => ({ ...a, [m.id]: v }))}
                autoFocus={i === 0}
              />
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => payFullWith(m.id)} disabled={need <= 0}>To'liq</button>
            </div>
          ))}
        </div>

        <div className="pay-box summary mt-16">
          {balanceUsed > 0 && <div className="summary-row"><span>Hisobdan yechiladi</span><strong>{som(balanceUsed)}</strong></div>}
          <div className="summary-row"><span>Pul bilan to'lanishi kerak</span><strong>{som(need)}</strong></div>
          <div className="summary-row"><span>Qabul qilindi</span><strong>{som(paid)}</strong></div>
          {change > 0 && <div className="summary-row total"><span>Qaytim</span><strong className="text-success">{som(change)}</strong></div>}
          {debt > 0 && <div className="summary-row total"><span>Qarzga yoziladi</span><strong className="text-danger">{som(debt)}</strong></div>}
          {change === 0 && debt === 0 && <div className="summary-row total"><span>Holat</span><strong className="text-success" style={{ fontSize: 15 }}>To'liq to'landi</strong></div>}
          {customer && (
            <div className="summary-row">
              <span>Sotuvdan keyingi hisob</span>
              <strong className={after.cls}>{after.amount ? `${after.label}: ${som(after.amount)}` : som(0)}</strong>
            </div>
          )}
        </div>

        {customer && change > 0 && (
          <label className="checkbox mt-12">
            <input type="checkbox" checked={changeToBalance} onChange={(e) => setChangeToBalance(e.target.checked)} />
            Qaytimni ({som(change)}) naqd bermasdan mijoz hisobiga yozish
          </label>
        )}

        {error && (
          <div className="callout callout-danger mt-12"><AlertCircle size={16} /><span>{error}</span></div>
        )}

        <div className="field mt-16">
          <label>Izoh</label>
          <input className="input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ixtiyoriy" />
        </div>
      </form>
    </Modal>
  );
}
