import React, { useCallback, useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { RotateCcw } from 'lucide-react';
import Modal from './Modal';
import { Pill } from './ui';
import { PAYMENT_LABELS, fmtDateTime, money, productMeta, som } from '../lib/format';

export default function SaleDetail({ saleId, onClose, onChanged }) {
  const [sale, setSale] = useState(null);
  const [refunding, setRefunding] = useState(false);
  const [toBalance, setToBalance] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try { setSale(await window.api.sales.getById(saleId)); } catch (err) { toast.error(err.message); }
  }, [saleId]);
  useEffect(() => { load(); }, [load]);

  async function refund() {
    setBusy(true);
    try {
      const res = await window.api.sales.refund(saleId, { to_balance: toBalance });
      toast.success(res.refund_cash > 0 ? `Sotuv qaytarildi. Mijozga ${som(res.refund_cash)} qaytaring` : 'Sotuv qaytarildi');
      setRefunding(false);
      await load();
      if (onChanged) onChanged();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  }

  if (!sale) return null;
  const discountAmount = sale.total - sale.final_total;
  const completed = sale.status === 'completed';
  const charged = (sale.balance_used || 0) + (sale.debt_amount || 0);

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
              <button type="button" className="btn btn-danger-outline left" onClick={() => setRefunding(true)}>
                <RotateCcw size={16} />Sotuvni qaytarish
              </button>
            )}
            <button type="button" className="btn btn-secondary" onClick={onClose}>Yopish</button>
          </>
        )}
      >
        <div className="stack">
          <dl className="dl">
            <div><dt>Holat</dt><dd>{completed ? <Pill tone="success">Yakunlangan</Pill> : <Pill tone="danger">Qaytarilgan</Pill>}</dd></div>
            <div><dt>Mijoz</dt><dd>{sale.customer_name || <span className="muted">Mijozsiz</span>}</dd></div>
            <div><dt>Telefon</dt><dd>{sale.customer_phone || '—'}</dd></div>
            <div><dt>{completed ? 'Pozitsiyalar' : 'Qaytarilgan sana'}</dt><dd>{completed ? `${sale.items.length} xil` : fmtDateTime(sale.refunded_at)}</dd></div>
          </dl>

          <div className="table-wrap">
            <table className="table table-sm">
              <thead><tr><th>Mahsulot</th><th className="num">Narx</th><th className="num">Miqdor</th><th className="num">Summa</th></tr></thead>
              <tbody>
                {sale.items.map((it) => (
                  <tr key={`${it.product_id}-${it.price}`}>
                    <td><div className="cell-title">{it.product_name}</div><div className="cell-sub">{productMeta(it) || `Kod ${it.code}`}</div></td>
                    <td className="num">{money(it.price)}</td>
                    <td className="num">{it.quantity} {it.unit}</td>
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
              <div className="summary-row total"><span>To'lanadigan</span><strong>{som(sale.final_total)}</strong></div>
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
              {!completed && sale.refund_cash > 0 && (
                <div className="summary-row"><span>Qaytarishda naqd berildi</span><strong className="text-danger">{som(sale.refund_cash)}</strong></div>
              )}
            </div>
          </div>
          {sale.notes && <div className="callout callout-info"><span>{sale.notes}</span></div>}
        </div>
      </Modal>

      {refunding && (
        <Modal
          size="sm"
          title="Sotuvni qaytarish"
          subtitle={`Chek ${sale.sale_number} · ${som(sale.final_total)}`}
          onClose={() => setRefunding(false)}
          footer={(
            <>
              <button type="button" className="btn btn-secondary" onClick={() => setRefunding(false)}>Bekor qilish</button>
              <button type="button" className="btn btn-danger" onClick={refund} disabled={busy}>Qaytarishni tasdiqlash</button>
            </>
          )}
        >
          <div className="stack-sm confirm-text">
            <p>Mahsulotlar omborga qaytariladi.</p>
            {charged > 0 && <p>Mijoz hisobiga {som(charged)} qaytariladi (hisobdan yechilgan va qarzga yozilgan qism).</p>}
            {sale.paid_amount > 0 && !toBalance && <p>Mijozga <strong>{som(sale.paid_amount)}</strong> naqd pul qaytarasiz.</p>}
            {sale.customer_id && sale.paid_amount > 0 && (
              <label className="checkbox mt-8">
                <input type="checkbox" checked={toBalance} onChange={(e) => setToBalance(e.target.checked)} />
                To'langan {som(sale.paid_amount)} ni naqd bermasdan mijoz hisobiga yozish
              </label>
            )}
          </div>
        </Modal>
      )}
    </>
  );
}
