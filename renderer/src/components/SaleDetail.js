import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'react-hot-toast';
import { RotateCcw } from 'lucide-react';
import Modal from './Modal';
import { Pill, ProductThumb } from './ui';
import { PAYMENT_LABELS, fmtDateTime, money, productMeta, som } from '../lib/format';

function ReturnModal({ sale, onClose, onDone }) {
  const returnable = sale.items.filter((it) => it.quantity - it.returned_qty > 0);
  const [qty, setQty] = useState(() => Object.fromEntries(returnable.map((it) => [it.product_id, 0])));
  const [toBalance, setToBalance] = useState(false);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  const selected = returnable.filter((it) => Number(qty[it.product_id]) > 0);
  const remainingValue = sale.final_total - sale.returned_amount;
  const allSelected = returnable.every((it) => Number(qty[it.product_id]) === it.quantity - it.returned_qty);
  const amount = useMemo(() => {
    const raw = Math.round(selected.reduce((s, it) => s + it.price * Number(qty[it.product_id]), 0) * sale.ratio);
    return allSelected ? remainingValue : Math.min(raw, remainingValue);
  }, [selected, qty, sale.ratio, allSelected, remainingValue]);

  const chargedLeft = Math.max(0, sale.balance_used + sale.debt_amount - sale.returned_to_account);
  const toAccount = sale.customer_id ? Math.min(amount, chargedLeft) : 0;
  const cash = amount - toAccount;

  function setAll(full) {
    setQty(Object.fromEntries(returnable.map((it) => [it.product_id, full ? it.quantity - it.returned_qty : 0])));
  }

  async function submit() {
    if (!selected.length) return toast.error('Qaytariladigan miqdorni kiriting');
    setBusy(true);
    try {
      const res = await window.api.sales.returnItems(sale.id, {
        items: selected.map((it) => ({ product_id: it.product_id, quantity: Number(qty[it.product_id]) })),
        to_balance: toBalance,
        note,
      });
      toast.success(res.refund_cash > 0 ? `Qaytarildi. Mijozga ${som(res.refund_cash)} naqd bering` : `Qaytarildi · ${som(res.amount)} mijoz hisobiga`, { duration: 8000 });
      onDone();
    } catch (err) {
      toast.error(err.message);
      setBusy(false);
    }
  }

  return (
    <Modal
      size="md"
      title="Mahsulotni qaytarish"
      subtitle={`Chek ${sale.sale_number} · mahsulot omborga qaytadi`}
      onClose={onClose}
      footer={(
        <>
          <button type="button" className="btn btn-ghost left" onClick={() => setAll(!allSelected)}>{allSelected ? 'Tozalash' : 'Hammasini tanlash'}</button>
          <button type="button" className="btn btn-secondary" onClick={onClose}>Bekor qilish</button>
          <button type="button" className="btn btn-danger" onClick={submit} disabled={busy || !selected.length}>Qaytarishni tasdiqlash</button>
        </>
      )}
    >
      <div className="stack">
        <div className="table-wrap">
          <table className="table table-sm">
            <thead><tr><th>Mahsulot</th><th className="num">Sotilgan</th><th className="num">Qaytarish mumkin</th><th className="num">Qaytariladi</th></tr></thead>
            <tbody>
              {returnable.map((it) => {
                const max = it.quantity - it.returned_qty;
                return (
                  <tr key={it.product_id}>
                    <td><div className="cell-title">{it.product_name}</div><div className="cell-sub">{money(it.price)} × {it.quantity}</div></td>
                    <td className="num">{it.quantity}</td>
                    <td className="num">{max}</td>
                    <td className="num">
                      <input
                        className="input input-sm tnum qty-inline"
                        type="number"
                        min="0"
                        max={max}
                        value={qty[it.product_id]}
                        onChange={(e) => setQty((q) => ({ ...q, [it.product_id]: Math.max(0, Math.min(max, Math.floor(Number(e.target.value) || 0))) }))}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="pay-box summary">
          <div className="summary-row"><span>Qaytariladigan summa{sale.ratio < 1 ? ' (chegirma hisobga olingan)' : ''}</span><strong>{som(amount)}</strong></div>
          {toAccount > 0 && <div className="summary-row"><span>Mijoz hisobiga (qarz/avansdan olingan qism)</span><strong>{som(toAccount)}</strong></div>}
          {cash > 0 && (
            <div className="summary-row total"><span>{toBalance ? 'Mijoz hisobiga yoziladi' : 'Naqd beriladi'}</span><strong className={toBalance ? '' : 'text-danger'}>{som(cash)}</strong></div>
          )}
        </div>

        {sale.customer_id && cash > 0 && (
          <label className="checkbox">
            <input type="checkbox" checked={toBalance} onChange={(e) => setToBalance(e.target.checked)} />
            {som(cash)} ni naqd bermasdan mijoz hisobiga yozish
          </label>
        )}
        <div className="field">
          <label>Sabab / izoh</label>
          <input className="input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Masalan: ta'mi yoqmadi, yopiq holatda qaytardi" />
        </div>
      </div>
    </Modal>
  );
}

export default function SaleDetail({ saleId, onClose, onChanged }) {
  const [sale, setSale] = useState(null);
  const [returning, setReturning] = useState(false);

  const load = useCallback(async () => {
    try { setSale(await window.api.sales.getById(saleId)); } catch (err) { toast.error(err.message); }
  }, [saleId]);
  useEffect(() => { load(); }, [load]);

  if (!sale) return null;
  const discountAmount = sale.total - sale.final_total;
  const completed = sale.status === 'completed';
  const partly = completed && sale.returned_amount > 0;

  return (
    <>
      <Modal
        size="lg"
        title={`Chek ${sale.sale_number}`}
        subtitle={fmtDateTime(sale.created_at)}
        onClose={onClose}
        footer={(
          <>
            {completed && (
              <button type="button" className="btn btn-danger-outline left" onClick={() => setReturning(true)}>
                <RotateCcw size={16} />Qaytarish
              </button>
            )}
            <button type="button" className="btn btn-secondary" onClick={onClose}>Yopish</button>
          </>
        )}
      >
        <div className="stack">
          <dl className="dl">
            <div>
              <dt>Holat</dt>
              <dd>{!completed ? <Pill tone="danger">To'liq qaytarilgan</Pill> : partly ? <Pill tone="warning">Qisman qaytarilgan</Pill> : <Pill tone="success">Yakunlangan</Pill>}</dd>
            </div>
            <div><dt>Mijoz</dt><dd>{sale.customer_name || <span className="muted">Mijozsiz</span>}</dd></div>
            <div><dt>Telefon</dt><dd>{sale.customer_phone || '—'}</dd></div>
            <div><dt>Pozitsiyalar</dt><dd>{sale.items.length} xil</dd></div>
          </dl>

          <div className="table-wrap">
            <table className="table table-sm">
              <thead><tr><th>Mahsulot</th><th className="num">Narx</th><th className="num">Miqdor</th><th className="num">Summa</th></tr></thead>
              <tbody>
                {sale.items.map((it) => (
                  <tr key={`${it.product_id}-${it.price}`}>
                    <td>
                      <div className="cell-product">
                        <ProductThumb product={it} size="sm" />
                        <div><div className="cell-title">{it.product_name}</div><div className="cell-sub">{productMeta(it) || `Kod ${it.code}`}</div></div>
                      </div>
                    </td>
                    <td className="num">{money(it.price)}</td>
                    <td className="num">
                      {it.quantity} {it.unit}
                      {it.returned_qty > 0 && <div className="cell-sub text-danger">qaytarilgan {it.returned_qty}</div>}
                    </td>
                    <td className="num strong">{money(it.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="grid-2">
            <div className="pay-box summary">
              <div className="summary-row"><span>Jami</span><strong>{som(sale.total)}</strong></div>
              {discountAmount > 0 && (
                <div className="summary-row"><span>Chegirma{sale.discount_type === 'percent' ? ` (${sale.discount}%)` : ''}</span><strong className="text-danger">−{som(discountAmount)}</strong></div>
              )}
              <div className="summary-row total"><span>To'langan</span><strong>{som(sale.final_total)}</strong></div>
              {sale.returned_amount > 0 && (
                <>
                  <div className="summary-row"><span>Qaytarilgan</span><strong className="text-danger">−{som(sale.returned_amount)}</strong></div>
                  <div className="summary-row"><span>Sof savdo</span><strong>{som(sale.final_total - sale.returned_amount)}</strong></div>
                </>
              )}
            </div>
            <div className="pay-box summary">
              {sale.payments.map((p) => (
                <div key={p.method} className="summary-row">
                  <span>{PAYMENT_LABELS[p.method] || p.method}</span>
                  <strong className={p.method === 'debt' ? 'text-danger' : undefined}>{som(p.amount)}</strong>
                </div>
              ))}
              {sale.change_amount > 0 && (
                <div className="summary-row"><span>{sale.change_to_balance > 0 ? 'Qaytim (hisobga yozildi)' : 'Qaytim berildi'}</span><strong>{som(sale.change_amount)}</strong></div>
              )}
            </div>
          </div>

          {sale.returns.length > 0 && (
            <div>
              <div className="form-section-title">Qaytarishlar</div>
              <div className="table-wrap">
                <table className="table table-sm">
                  <thead><tr><th>Raqam</th><th>Sana</th><th>Izoh</th><th className="num">Summa</th><th className="num">Hisobga</th><th className="num">Naqd berildi</th></tr></thead>
                  <tbody>
                    {sale.returns.map((r) => (
                      <tr key={r.id}>
                        <td className="mono">{r.return_number}</td>
                        <td className="nowrap secondary">{fmtDateTime(r.created_at)}</td>
                        <td className="secondary">{r.note || '—'}</td>
                        <td className="num strong">{money(r.amount)}</td>
                        <td className="num">{r.to_account ? money(r.to_account) : '—'}</td>
                        <td className="num">{r.cash_back ? money(r.cash_back) : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          {sale.notes && <div className="callout callout-info"><span>{sale.notes}</span></div>}
        </div>
      </Modal>

      {returning && (
        <ReturnModal
          sale={sale}
          onClose={() => setReturning(false)}
          onDone={async () => { setReturning(false); await load(); if (onChanged) onChanged(); }}
        />
      )}
    </>
  );
}
