import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'react-hot-toast';
import { PackagePlus, Plus, Trash2 } from 'lucide-react';
import Modal from '../components/Modal';
import MoneyInput from '../components/MoneyInput';
import ProductForm from '../components/ProductForm';
import { useConfirm } from '../components/ConfirmDialog';
import { DateRange, EmptyState, PageHeader, SearchInput } from '../components/ui';
import { daysAgo, fmtDate, fmtDateTime, isoDate, money, productMeta, som } from '../lib/format';

function ReceiptForm({ products, categories, brands, defaultMinStock, onClose, onSaved, onProductCreated }) {
  const [lines, setLines] = useState([]);
  const [notes, setNotes] = useState('');
  const [query, setQuery] = useState('');
  const [creating, setCreating] = useState(false);
  const [busy, setBusy] = useState(false);
  const searchRef = useRef(null);
  const confirm = useConfirm();

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return products
      .filter((p) => [p.name, p.code, p.brand, p.flavor, p.weight].some((v) => v && String(v).toLowerCase().includes(q)))
      .slice(0, 12);
  }, [products, query]);

  function addLine(p) {
    if (lines.some((l) => l.product_id === p.id)) {
      toast("Bu mahsulot ro'yxatda bor — miqdorni o'zgartiring");
    } else {
      setLines((prev) => [...prev, {
        product_id: p.id, name: p.name, meta: productMeta(p), code: p.code, unit: p.unit || 'dona',
        stock: p.stock, quantity: '', cost_price: p.cost_price || '', sell_price: p.sell_price, old_sell: p.sell_price, expiry_date: '',
      }]);
    }
    setQuery('');
    if (searchRef.current) searchRef.current.focus();
  }

  const update = (i, key, value) => setLines((prev) => prev.map((l, idx) => (idx === i ? { ...l, [key]: value } : l)));
  const removeLine = (i) => setLines((prev) => prev.filter((_, idx) => idx !== i));

  const totalQty = lines.reduce((s, l) => s + (Number(l.quantity) || 0), 0);
  const totalSum = lines.reduce((s, l) => s + (Number(l.quantity) || 0) * (Number(l.cost_price) || 0), 0);

  async function close() {
    if (lines.length) {
      const ok = await confirm({ title: 'Kirimni bekor qilish', message: "Kiritilgan ma'lumotlar saqlanmaydi.", confirmText: 'Bekor qilish', cancelText: 'Davom etish', danger: true });
      if (!ok) return;
    }
    onClose();
  }

  async function save() {
    if (!lines.length) return toast.error("Kamida bitta mahsulot qo'shing");
    const bad = lines.find((l) => !(Number(l.quantity) > 0));
    if (bad) return toast.error(`"${bad.name}" uchun miqdorni kiriting`);
    const priced = lines.find((l) => !(Number(l.sell_price) > 0));
    if (priced) return toast.error(`"${priced.name}" uchun sotuv narxini kiriting`);
    setBusy(true);
    try {
      const res = await window.api.stock.receive({
        notes,
        items: lines.map((l) => ({
          product_id: l.product_id,
          quantity: Number(l.quantity),
          cost_price: Number(l.cost_price) || 0,
          sell_price: Number(l.sell_price),
          expiry_date: l.expiry_date || null,
        })),
      });
      toast.success(`Kirim ${res.receipt_number} saqlandi · ${totalQty} dona`);
      onSaved();
    } catch (err) {
      toast.error(err.message);
      setBusy(false);
    }
  }

  return (
    <>
      <Modal
        size="xl"
        title="Yangi kirim"
        subtitle="Kelgan mahsulotlar, miqdori, tannarxi va yaroqlilik muddati"
        onClose={close}
        footer={(
          <>
            <div className="left secondary tnum" style={{ fontSize: 13 }}>
              {lines.length} xil · {totalQty} dona · <strong style={{ color: 'var(--text)' }}>{som(totalSum)}</strong>
            </div>
            <button type="button" className="btn btn-secondary" onClick={close}>Bekor qilish</button>
            <button type="button" className="btn btn-primary" onClick={save} disabled={busy || !lines.length}>Kirimni saqlash</button>
          </>
        )}
      >
        <div className="stack">
          <div className="row" style={{ alignItems: 'flex-start' }}>
            <div style={{ position: 'relative', flex: 1, maxWidth: 560 }}>
              <SearchInput
                inputRef={searchRef}
                value={query}
                onChange={setQuery}
                autoFocus
                placeholder="Mahsulotni qidiring: nomi, brend yoki kod"
                onKeyDown={(e) => { if (e.key === 'Enter' && results.length) { e.preventDefault(); addLine(results[0]); } }}
              />
              {query.trim() && (
                <div className="dropdown">
                  {results.length === 0 ? (
                    <div className="dropdown-empty">Topilmadi. Yangi mahsulot yarating.</div>
                  ) : results.map((p) => (
                    <div key={p.id} className="dropdown-item" onClick={() => addLine(p)}>
                      <div style={{ minWidth: 0 }}>
                        <div className="cell-title">{p.name}</div>
                        <div className="cell-sub">{[productMeta(p), `Kod ${p.code}`].filter(Boolean).join(' · ')}</div>
                      </div>
                      <span className="secondary nowrap tnum" style={{ fontSize: 12.5 }}>Qoldiq: {p.stock}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <button type="button" className="btn btn-secondary" onClick={() => setCreating(true)}><Plus size={16} />Yangi mahsulot</button>
          </div>

          {lines.length === 0 ? (
            <div className="table-wrap">
              <EmptyState icon={PackagePlus} title="Ro'yxat bo'sh" text="Yuqoridagi qidiruvdan kelgan mahsulotlarni qo'shing. Ro'yxatda yo'q mahsulotni darhol yaratish mumkin." />
            </div>
          ) : (
            <div className="table-wrap">
              <table className="table table-sm">
                <thead>
                  <tr>
                    <th>Mahsulot</th>
                    <th style={{ width: 110 }}>Miqdor</th>
                    <th style={{ width: 170 }}>Tannarx (dona)</th>
                    <th style={{ width: 170 }}>Sotuv narxi</th>
                    <th style={{ width: 160 }}>Yaroqlilik muddati</th>
                    <th className="num">Summa</th>
                    <th className="actions" />
                  </tr>
                </thead>
                <tbody>
                  {lines.map((l, i) => (
                    <tr key={l.product_id}>
                      <td>
                        <div className="cell-title">{l.name}</div>
                        <div className="cell-sub">{[l.meta, `Hozir: ${l.stock} ${l.unit}`].filter(Boolean).join(' · ')}</div>
                      </td>
                      <td><input className="input input-sm tnum" type="number" min="1" value={l.quantity} onChange={(e) => update(i, 'quantity', e.target.value)} placeholder="0" autoFocus={i === lines.length - 1} /></td>
                      <td><MoneyInput value={l.cost_price} onChange={(v) => update(i, 'cost_price', v)} /></td>
                      <td>
                        <MoneyInput value={l.sell_price} onChange={(v) => update(i, 'sell_price', v)} />
                        {Number(l.sell_price) !== Number(l.old_sell) && <div className="cell-sub text-warning">avval {money(l.old_sell)}</div>}
                      </td>
                      <td><input className="input input-sm" type="date" min={isoDate()} value={l.expiry_date} onChange={(e) => update(i, 'expiry_date', e.target.value)} /></td>
                      <td className="num strong">{money((Number(l.quantity) || 0) * (Number(l.cost_price) || 0))}</td>
                      <td className="actions"><button type="button" className="btn btn-ghost btn-icon btn-sm" onClick={() => removeLine(i)} aria-label="O'chirish"><Trash2 size={15} /></button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="field" style={{ maxWidth: 560 }}>
            <label>Izoh</label>
            <input className="input" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Masalan: qayerdan olindi, faktura raqami" />
          </div>
        </div>
      </Modal>

      {creating && (
        <ProductForm
          mode="create"
          categories={categories}
          brands={brands}
          defaultMinStock={defaultMinStock}
          allowInitialStock={false}
          onClose={() => setCreating(false)}
          onSaved={(p) => { setCreating(false); onProductCreated(); addLine(p); }}
        />
      )}
    </>
  );
}

function ReceiptView({ receiptId, onClose }) {
  const [receipt, setReceipt] = useState(null);
  useEffect(() => {
    window.api.stock.receiptById(receiptId).then(setReceipt).catch((err) => toast.error(err.message));
  }, [receiptId]);
  if (!receipt) return null;
  return (
    <Modal size="lg" title={`Kirim ${receipt.receipt_number}`} subtitle={fmtDateTime(receipt.created_at)} onClose={onClose}
      footer={<button type="button" className="btn btn-secondary" onClick={onClose}>Yopish</button>}>
      <div className="stack">
        {receipt.notes && <div className="callout callout-info"><span>{receipt.notes}</span></div>}
        <div className="table-wrap">
          <table className="table table-sm">
            <thead><tr><th>Mahsulot</th><th className="num">Miqdor</th><th className="num">Tannarx</th><th>Yaroqlilik</th><th className="num">Summa</th></tr></thead>
            <tbody>
              {receipt.items.map((it) => (
                <tr key={it.id}>
                  <td><div className="cell-title">{it.product_name}</div><div className="cell-sub">{productMeta(it) || `Kod ${it.code}`}</div></td>
                  <td className="num">{it.quantity} {it.unit}</td>
                  <td className="num">{money(it.cost_price)}</td>
                  <td>{it.expiry_date ? fmtDate(it.expiry_date) : <span className="muted">—</span>}</td>
                  <td className="num strong">{money(it.quantity * it.cost_price)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr><td>Jami</td><td className="num">{receipt.total_items}</td><td /><td /><td className="num">{som(receipt.total_amount)}</td></tr>
            </tfoot>
          </table>
        </div>
      </div>
    </Modal>
  );
}

export default function StockReceive({ refreshAlerts, settings }) {
  const [receipts, setReceipts] = useState([]);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);
  const [from, setFrom] = useState(daysAgo(29));
  const [to, setTo] = useState(isoDate());
  const [creating, setCreating] = useState(false);
  const [viewId, setViewId] = useState(null);

  const loadReceipts = useCallback(async () => {
    try { setReceipts(await window.api.stock.receipts({ dateFrom: from, dateTo: to })); } catch (err) { toast.error(err.message); }
  }, [from, to]);

  const loadCatalog = useCallback(async () => {
    try {
      const [p, c, b] = await Promise.all([window.api.products.getAll(), window.api.products.categories(), window.api.products.brands()]);
      setProducts(p);
      setCategories(c);
      setBrands(b);
    } catch (err) {
      toast.error(err.message);
    }
  }, []);

  useEffect(() => { loadReceipts(); }, [loadReceipts]);
  useEffect(() => { loadCatalog(); }, [loadCatalog]);

  const total = receipts.reduce((s, r) => s + r.total_amount, 0);

  return (
    <>
      <PageHeader
        title="Kirim"
        subtitle="Omborga kelgan mahsulotlarni qabul qilish"
        actions={<button type="button" className="btn btn-primary" onClick={() => setCreating(true)}><Plus size={16} />Yangi kirim</button>}
      />
      <div className="content">
        <div className="toolbar">
          <DateRange from={from} to={to} onChange={(a, b) => { setFrom(a); setTo(b); }} />
        </div>
        <div className="table-wrap">
          {receipts.length === 0 ? (
            <EmptyState icon={PackagePlus} title="Bu davrda kirim yo'q" text="Mahsulot kelganda 'Yangi kirim' orqali qabul qiling" />
          ) : (
            <table className="table">
              <thead><tr><th>Raqam</th><th>Sana</th><th>Izoh</th><th className="num">Pozitsiya</th><th className="num">Miqdor</th><th className="num">Summa</th></tr></thead>
              <tbody>
                {receipts.map((r) => (
                  <tr key={r.id} className="clickable" onClick={() => setViewId(r.id)}>
                    <td className="mono">{r.receipt_number}</td>
                    <td className="nowrap">{fmtDateTime(r.created_at)}</td>
                    <td className="secondary">{r.notes || '—'}</td>
                    <td className="num">{r.lines_count}</td>
                    <td className="num">{r.total_items}</td>
                    <td className="num strong">{money(r.total_amount)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot><tr><td colSpan={5}>Jami {receipts.length} ta kirim</td><td className="num">{som(total)}</td></tr></tfoot>
            </table>
          )}
        </div>
      </div>

      {creating && (
        <ReceiptForm
          products={products}
          categories={categories}
          brands={brands}
          defaultMinStock={Number(settings.lowStockAlert) || 3}
          onClose={() => setCreating(false)}
          onProductCreated={loadCatalog}
          onSaved={() => { setCreating(false); loadReceipts(); loadCatalog(); refreshAlerts(); }}
        />
      )}
      {viewId && <ReceiptView receiptId={viewId} onClose={() => setViewId(null)} />}
    </>
  );
}
