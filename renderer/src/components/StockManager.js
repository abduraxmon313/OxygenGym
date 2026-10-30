import React, { useCallback, useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { ClipboardCheck, PackageMinus } from 'lucide-react';
import Modal from './Modal';
import { Field, Pill, ProductThumb, Segmented } from './ui';
import { fmtDate, fmtDateTime, money, productMeta, som } from '../lib/format';

const REASONS = ["Muddati o'tgan", 'Shikastlangan', "Yo'qolgan", 'Tatib ko\'rish / namuna', 'Boshqa'];

function WriteOffForm({ product, batch, onClose, onDone }) {
  const max = batch ? batch.remaining : product.stock;
  const [qty, setQty] = useState(batch && batch.days_left < 0 ? batch.remaining : 1);
  const [reason, setReason] = useState(batch && batch.days_left < 0 ? REASONS[0] : REASONS[1]);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const cost = batch ? batch.cost_price : product.cost_price;

  async function submit(e) {
    e.preventDefault();
    const n = Number(qty);
    if (!Number.isInteger(n) || n <= 0) return toast.error('Miqdorni kiriting');
    if (n > max) return toast.error(`Ko'pi bilan ${max} dona`);
    const full = reason === 'Boshqa' ? note.trim() : [reason, note.trim()].filter(Boolean).join(': ');
    if (!full) return toast.error('Sababini yozing');
    setBusy(true);
    try {
      const res = await window.api.products.writeOff({ product_id: product.id, batch_id: batch ? batch.id : null, quantity: n, reason: full });
      toast.success(`${n} ${product.unit || 'dona'} hisobdan chiqarildi · zarar ${som(res.loss)}`);
      onDone();
    } catch (err) {
      toast.error(err.message);
      setBusy(false);
    }
  }

  return (
    <Modal
      size="sm"
      title="Hisobdan chiqarish"
      subtitle={batch ? `Partiya ${batch.batch_number} · qoldiq ${batch.remaining}` : `${product.name} · qoldiq ${product.stock}`}
      onClose={onClose}
      footer={(
        <>
          <button type="button" className="btn btn-secondary" onClick={onClose}>Bekor qilish</button>
          <button type="submit" form="writeoff-form" className="btn btn-danger" disabled={busy}>Hisobdan chiqarish</button>
        </>
      )}
    >
      <form id="writeoff-form" onSubmit={submit} className="stack">
        <Field label="Miqdor" required hint={`Ko'pi bilan ${max} · taxminiy zarar ${som((Number(qty) || 0) * cost)}`}>
          <input className="input tnum" type="number" min="1" max={max} value={qty} onChange={(e) => setQty(e.target.value)} autoFocus />
        </Field>
        <Field label="Sabab" required>
          <select className="input" value={reason} onChange={(e) => setReason(e.target.value)}>
            {REASONS.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
        </Field>
        <Field label={reason === 'Boshqa' ? 'Sabab tafsiloti' : 'Izoh'} required={reason === 'Boshqa'}>
          <input className="input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ixtiyoriy" />
        </Field>
      </form>
    </Modal>
  );
}

function CorrectionForm({ product, onClose, onDone }) {
  const [actual, setActual] = useState(product.stock);
  const [reason, setReason] = useState('Inventarizatsiya');
  const [busy, setBusy] = useState(false);
  const diff = (Number(actual) || 0) - product.stock;

  async function submit(e) {
    e.preventDefault();
    const n = Number(actual);
    if (!Number.isInteger(n) || n < 0) return toast.error("Haqiqiy qoldiqni to'g'ri kiriting");
    if (n === product.stock) return toast("Qoldiq o'zgarmadi");
    setBusy(true);
    try {
      await window.api.products.correctStock({ product_id: product.id, actual: n, reason });
      toast.success(`Qoldiq tuzatildi: ${product.stock} → ${n}`);
      onDone();
    } catch (err) {
      toast.error(err.message);
      setBusy(false);
    }
  }

  return (
    <Modal
      size="sm"
      title="Qoldiqni tuzatish"
      subtitle="Javondagi haqiqiy sonni kiriting"
      onClose={onClose}
      footer={(
        <>
          <button type="button" className="btn btn-secondary" onClick={onClose}>Bekor qilish</button>
          <button type="submit" form="correct-form" className="btn btn-primary" disabled={busy}>Saqlash</button>
        </>
      )}
    >
      <form id="correct-form" onSubmit={submit} className="stack">
        <div className="pay-box summary">
          <div className="summary-row"><span>Tizimda</span><strong>{product.stock} {product.unit}</strong></div>
          <div className="summary-row"><span>Farq</span><strong className={diff > 0 ? 'text-success' : diff < 0 ? 'text-danger' : ''}>{diff > 0 ? `+${diff}` : diff}</strong></div>
        </div>
        <Field label="Haqiqiy qoldiq" required>
          <input className="input tnum" type="number" min="0" value={actual} onChange={(e) => setActual(e.target.value)} autoFocus />
        </Field>
        <Field label="Sabab">
          <input className="input" value={reason} onChange={(e) => setReason(e.target.value)} />
        </Field>
        <div className="callout callout-info">
          <span>Kamaysa — avval eng yaqin muddatli partiyadan ayiriladi. Ko'paysa — joriy tannarx bilan yangi partiya ochiladi. Kelgan tovar uchun "Kirim" bo'limidan foydalaning.</span>
        </div>
      </form>
    </Modal>
  );
}

export default function StockManager({ productId, onClose, onChanged }) {
  const [p, setP] = useState(null);
  const [writeOff, setWriteOff] = useState(null); // { batch } | {}
  const [correcting, setCorrecting] = useState(false);
  const [tab, setTab] = useState('batches');

  const load = useCallback(async () => {
    try { setP(await window.api.products.getById(productId)); } catch (err) { toast.error(err.message); }
  }, [productId]);
  useEffect(() => { load(); }, [load]);

  const done = async () => {
    setWriteOff(null);
    setCorrecting(false);
    await load();
    if (onChanged) onChanged();
  };

  if (!p) return null;

  return (
    <>
      <Modal
        size="lg"
        title="Ombor holati"
        subtitle={`${p.name}${productMeta(p) ? ` · ${productMeta(p)}` : ''}`}
        onClose={onClose}
        footer={(
          <>
            <button type="button" className="btn btn-secondary left" onClick={() => setCorrecting(true)}><ClipboardCheck size={16} />Qoldiqni tuzatish</button>
            <button type="button" className="btn btn-danger-outline" onClick={() => setWriteOff({})} disabled={p.stock <= 0}><PackageMinus size={16} />Hisobdan chiqarish</button>
            <button type="button" className="btn btn-secondary" onClick={onClose}>Yopish</button>
          </>
        )}
      >
        <div className="stack">
          <div className="row" style={{ gap: 16 }}>
            <ProductThumb product={p} size="lg" />
            <dl className="dl" style={{ flex: 1 }}>
              <div><dt>Jami qoldiq</dt><dd className="tnum">{p.stock} {p.unit}</dd></div>
              <div><dt>Sotish mumkin</dt><dd className="tnum">{p.sellable} {p.unit}</dd></div>
              <div><dt>Muddati o'tgan</dt><dd className={`tnum ${p.expired_qty ? 'text-danger' : ''}`}>{p.expired_qty} {p.unit}</dd></div>
              <div><dt>Ombor qiymati</dt><dd className="tnum">{som(p.stock * p.cost_price)}</dd></div>
            </dl>
          </div>
          {p.expired_qty > 0 && (
            <div className="callout callout-danger">
              <span>{p.expired_qty} {p.unit} mahsulotning yaroqlilik muddati o'tgan. Ular sotuvda chiqmaydi — partiya qatoridagi "Chiqarish" tugmasi bilan hisobdan chiqaring.</span>
            </div>
          )}

          <Segmented
            options={[{ id: 'batches', label: `Partiyalar (${p.batches.length})` }, { id: 'history', label: `Tuzatishlar (${p.adjustments.length})` }]}
            value={tab}
            onChange={setTab}
          />

          {tab === 'batches' && (
            <div className="table-wrap">
              <table className="table table-sm">
                <thead><tr><th>Partiya</th><th>Kirim</th><th className="num">Tannarx</th><th className="num">Qoldiq</th><th>Yaroqlilik</th><th className="actions" /></tr></thead>
                <tbody>
                  {p.batches.length === 0 && p.unbatched === 0 && (
                    <tr><td colSpan={6} className="muted">Omborda qoldiq yo'q</td></tr>
                  )}
                  {p.batches.map((b) => (
                    <tr key={b.id}>
                      <td className="mono">{b.batch_number}</td>
                      <td className="secondary">{fmtDate(b.created_at)}</td>
                      <td className="num">{money(b.cost_price)}</td>
                      <td className="num">{b.remaining} / {b.quantity}</td>
                      <td>
                        {!b.expiry_date ? <span className="muted">Ko'rsatilmagan</span>
                          : b.days_left < 0 ? <Pill tone="danger">O'tgan · {fmtDate(b.expiry_date)}</Pill>
                            : b.days_left <= 30 ? <Pill tone="warning">{fmtDate(b.expiry_date)} · {b.days_left} kun</Pill>
                              : fmtDate(b.expiry_date)}
                      </td>
                      <td className="actions"><button type="button" className="btn btn-ghost btn-sm" onClick={() => setWriteOff({ batch: b })}>Chiqarish</button></td>
                    </tr>
                  ))}
                  {p.unbatched > 0 && (
                    <tr>
                      <td className="secondary" colSpan={3}>Partiyasiz qoldiq (eski versiyadan)</td>
                      <td className="num">{p.unbatched}</td>
                      <td className="muted">—</td>
                      <td />
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {tab === 'history' && (
            <div className="table-wrap">
              <table className="table table-sm">
                <thead><tr><th>Sana</th><th>Turi</th><th>Sabab</th><th className="num">Miqdor</th><th className="num">Qiymat</th></tr></thead>
                <tbody>
                  {p.adjustments.length === 0 ? (
                    <tr><td colSpan={5} className="muted">Tuzatishlar yo'q</td></tr>
                  ) : p.adjustments.map((a) => (
                    <tr key={a.id}>
                      <td className="nowrap secondary">{fmtDateTime(a.created_at)}</td>
                      <td>{a.type === 'writeoff' ? <Pill tone="danger">Hisobdan chiqarildi</Pill> : <Pill tone="neutral">Tuzatish</Pill>}</td>
                      <td>{a.reason || '—'}</td>
                      <td className={`num ${a.quantity < 0 ? 'amount-neg' : 'amount-pos'}`}>{a.quantity > 0 ? `+${a.quantity}` : a.quantity}</td>
                      <td className="num secondary">{money(Math.abs(a.quantity) * a.cost_price)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </Modal>
      {writeOff && <WriteOffForm product={p} batch={writeOff.batch} onClose={() => setWriteOff(null)} onDone={done} />}
      {correcting && <CorrectionForm product={p} onClose={() => setCorrecting(false)} onDone={done} />}
    </>
  );
}
