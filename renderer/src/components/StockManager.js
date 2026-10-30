import React, { useCallback, useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { ClipboardCheck, PackageMinus } from 'lucide-react';
import Modal from './Modal';
import { Field, Pill, ProductThumb, Segmented } from './ui';
import { fmtDate, fmtDateTime, money, productMeta, som, unitLabel } from '../lib/format';
import { t } from '../lib/i18n';

// Bazaga o'zbekcha saqlanadi (uz), ekranda tarjimasi ko'rsatiladi
const REASONS = [
  { id: 'expired', uz: "Muddati o'tgan" },
  { id: 'damaged', uz: 'Shikastlangan' },
  { id: 'lost', uz: "Yo'qolgan" },
  { id: 'sample', uz: "Tatib ko'rish / namuna" },
  { id: 'other', uz: 'Boshqa' },
];
const reasons = () => REASONS.map((r) => ({ ...r, label: t(r.uz) }));

function WriteOffForm({ product, batch, onClose, onDone }) {
  const max = batch ? batch.remaining : product.stock;
  const unit = unitLabel(product.unit);
  const [qty, setQty] = useState(batch && batch.days_left < 0 ? batch.remaining : 1);
  const [reason, setReason] = useState(batch && batch.days_left < 0 ? 'expired' : 'damaged');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const cost = batch ? batch.cost_price : product.cost_price;

  async function submit(e) {
    e.preventDefault();
    const n = Number(qty);
    if (!Number.isInteger(n) || n <= 0) return toast.error(t('Miqdorni kiriting'));
    if (n > max) return toast.error(t("Ko'pi bilan {n} {u}", { n: max, u: unit }));
    const label = REASONS.find((r) => r.id === reason).uz;
    const full = reason === 'other' ? note.trim() : [label, note.trim()].filter(Boolean).join(': ');
    if (!full) return toast.error(t('Sababini yozing'));
    setBusy(true);
    try {
      const res = await window.api.products.writeOff({ product_id: product.id, batch_id: batch ? batch.id : null, quantity: n, reason: full });
      toast.success(t('{n} {u} hisobdan chiqarildi · zarar {s}', { n, u: unit, s: som(res.loss) }));
      onDone();
    } catch (err) {
      toast.error(err.message);
      setBusy(false);
    }
  }

  return (
    <Modal
      size="sm"
      title={t('Hisobdan chiqarish')}
      subtitle={batch
        ? t('Partiya {b} · qoldiq {n}', { b: batch.batch_number, n: batch.remaining })
        : t('{name} · qoldiq {n}', { name: product.name, n: product.stock })}
      onClose={onClose}
      footer={(
        <>
          <button type="button" className="btn btn-secondary" onClick={onClose}>{t('Bekor qilish')}</button>
          <button type="submit" form="writeoff-form" className="btn btn-danger" disabled={busy}>{t('Hisobdan chiqarish')}</button>
        </>
      )}
    >
      <form id="writeoff-form" onSubmit={submit} className="stack">
        <Field label={t('Miqdor')} required hint={t("Ko'pi bilan {n} · taxminiy zarar {s}", { n: max, s: som((Number(qty) || 0) * cost) })}>
          <input className="input tnum" type="number" min="1" max={max} value={qty} onChange={(e) => setQty(e.target.value)} autoFocus />
        </Field>
        <Field label={t('Sabab')} required>
          <select className="input" value={reason} onChange={(e) => setReason(e.target.value)}>
            {reasons().map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
          </select>
        </Field>
        <Field label={reason === 'other' ? t('Sabab tafsiloti') : t('Izoh')} required={reason === 'other'}>
          <input className="input" value={note} onChange={(e) => setNote(e.target.value)} placeholder={t('Ixtiyoriy')} />
        </Field>
      </form>
    </Modal>
  );
}

function CorrectionForm({ product, onClose, onDone }) {
  const [actual, setActual] = useState(product.stock);
  const [reason, setReason] = useState(() => t('Inventarizatsiya'));
  const [busy, setBusy] = useState(false);
  const diff = (Number(actual) || 0) - product.stock;

  async function submit(e) {
    e.preventDefault();
    const n = Number(actual);
    if (!Number.isInteger(n) || n < 0) return toast.error(t("Haqiqiy qoldiqni to'g'ri kiriting"));
    if (n === product.stock) return toast(t("Qoldiq o'zgarmadi"));
    setBusy(true);
    try {
      await window.api.products.correctStock({ product_id: product.id, actual: n, reason });
      toast.success(t('Qoldiq tuzatildi: {a} → {b}', { a: product.stock, b: n }));
      onDone();
    } catch (err) {
      toast.error(err.message);
      setBusy(false);
    }
  }

  return (
    <Modal
      size="sm"
      title={t('Qoldiqni tuzatish')}
      subtitle={t('Javondagi haqiqiy sonni kiriting')}
      onClose={onClose}
      footer={(
        <>
          <button type="button" className="btn btn-secondary" onClick={onClose}>{t('Bekor qilish')}</button>
          <button type="submit" form="correct-form" className="btn btn-primary" disabled={busy}>{t('Saqlash')}</button>
        </>
      )}
    >
      <form id="correct-form" onSubmit={submit} className="stack">
        <div className="pay-box summary">
          <div className="summary-row"><span>{t('Tizimda')}</span><strong>{product.stock} {unitLabel(product.unit)}</strong></div>
          <div className="summary-row"><span>{t('Farq')}</span><strong className={diff > 0 ? 'text-success' : diff < 0 ? 'text-danger' : ''}>{diff > 0 ? `+${diff}` : diff}</strong></div>
        </div>
        <Field label={t('Haqiqiy qoldiq')} required>
          <input className="input tnum" type="number" min="0" value={actual} onChange={(e) => setActual(e.target.value)} autoFocus />
        </Field>
        <Field label={t('Sabab')}>
          <input className="input" value={reason} onChange={(e) => setReason(e.target.value)} />
        </Field>
        <div className="callout callout-info">
          <span>{t("Kamaysa — avval eng yaqin muddatli partiyadan ayiriladi. Ko'paysa — joriy tannarx bilan yangi partiya ochiladi. Kelgan tovar uchun \"Kirim\" bo'limidan foydalaning.")}</span>
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
  const unit = unitLabel(p.unit);

  return (
    <>
      <Modal
        size="lg"
        title={t('Ombor holati')}
        subtitle={`${p.name}${productMeta(p) ? ` · ${productMeta(p)}` : ''}`}
        onClose={onClose}
        footer={(
          <>
            <button type="button" className="btn btn-secondary left" onClick={() => setCorrecting(true)}><ClipboardCheck size={16} />{t('Qoldiqni tuzatish')}</button>
            <button type="button" className="btn btn-danger-outline" onClick={() => setWriteOff({})} disabled={p.stock <= 0}><PackageMinus size={16} />{t('Hisobdan chiqarish')}</button>
            <button type="button" className="btn btn-secondary" onClick={onClose}>{t('Yopish')}</button>
          </>
        )}
      >
        <div className="stack">
          <div className="row" style={{ gap: 16 }}>
            <ProductThumb product={p} size="lg" />
            <dl className="dl" style={{ flex: 1 }}>
              <div><dt>{t('Jami qoldiq')}</dt><dd className="tnum">{p.stock} {unit}</dd></div>
              <div><dt>{t('Sotish mumkin')}</dt><dd className="tnum">{p.sellable} {unit}</dd></div>
              <div><dt>{t("Muddati o'tgan")}</dt><dd className={`tnum ${p.expired_qty ? 'text-danger' : ''}`}>{p.expired_qty} {unit}</dd></div>
              <div><dt>{t('Ombor qiymati')}</dt><dd className="tnum">{som(p.stock * p.cost_price)}</dd></div>
            </dl>
          </div>
          {p.expired_qty > 0 && (
            <div className="callout callout-danger">
              <span>{t("{n} {u} mahsulotning yaroqlilik muddati o'tgan. Ular sotuvda chiqmaydi — partiya qatoridagi \"Chiqarish\" tugmasi bilan hisobdan chiqaring.", { n: p.expired_qty, u: unit })}</span>
            </div>
          )}

          <Segmented
            options={[
              { id: 'batches', label: t('Partiyalar ({n})', { n: p.batches.length }) },
              { id: 'history', label: t('Tuzatishlar ({n})', { n: p.adjustments.length }) },
            ]}
            value={tab}
            onChange={setTab}
          />

          {tab === 'batches' && (
            <div className="table-wrap">
              <table className="table table-sm">
                <thead><tr><th>{t('Partiya')}</th><th>{t('Kirim')}</th><th className="num">{t('Tannarx')}</th><th className="num">{t('Qoldiq')}</th><th>{t('Yaroqlilik')}</th><th className="actions" /></tr></thead>
                <tbody>
                  {p.batches.length === 0 && p.unbatched === 0 && (
                    <tr><td colSpan={6} className="muted">{t("Omborda qoldiq yo'q")}</td></tr>
                  )}
                  {p.batches.map((b) => (
                    <tr key={b.id}>
                      <td className="mono">{b.batch_number}</td>
                      <td className="secondary">{fmtDate(b.created_at)}</td>
                      <td className="num">{money(b.cost_price)}</td>
                      <td className="num">{b.remaining} / {b.quantity}</td>
                      <td>
                        {!b.expiry_date ? <span className="muted">{t("Ko'rsatilmagan")}</span>
                          : b.days_left < 0 ? <Pill tone="danger">{t("O'tgan · {d}", { d: fmtDate(b.expiry_date) })}</Pill>
                            : b.days_left <= 30 ? <Pill tone="warning">{t('{d} · {n} kun', { d: fmtDate(b.expiry_date), n: b.days_left })}</Pill>
                              : fmtDate(b.expiry_date)}
                      </td>
                      <td className="actions"><button type="button" className="btn btn-ghost btn-sm" onClick={() => setWriteOff({ batch: b })}>{t('Chiqarish')}</button></td>
                    </tr>
                  ))}
                  {p.unbatched > 0 && (
                    <tr>
                      <td className="secondary" colSpan={3}>{t('Partiyasiz qoldiq (eski versiyadan)')}</td>
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
                <thead><tr><th>{t('Sana')}</th><th>{t('Turi')}</th><th>{t('Sabab')}</th><th className="num">{t('Miqdor')}</th><th className="num">{t('Qiymat')}</th></tr></thead>
                <tbody>
                  {p.adjustments.length === 0 ? (
                    <tr><td colSpan={5} className="muted">{t("Tuzatishlar yo'q")}</td></tr>
                  ) : p.adjustments.map((a) => (
                    <tr key={a.id}>
                      <td className="nowrap secondary">{fmtDateTime(a.created_at)}</td>
                      <td>{a.type === 'writeoff' ? <Pill tone="danger">{t('Hisobdan chiqarildi')}</Pill> : <Pill tone="neutral">{t('Tuzatish')}</Pill>}</td>
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
