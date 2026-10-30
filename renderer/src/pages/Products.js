import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'react-hot-toast';
import { Archive, ArchiveRestore, Boxes, Copy, Package, Pencil, Plus } from 'lucide-react';
import { CategorySelect, EmptyState, PageHeader, Pill, ProductThumb, SearchInput, Segmented, Tabs } from '../components/ui';
import ProductForm from '../components/ProductForm';
import StockManager from '../components/StockManager';
import { useConfirm } from '../components/ConfirmDialog';
import { categoryLabel, fmtDate, money, productMeta, som } from '../lib/format';

function StockPill({ p }) {
  if (p.sellable <= 0 && p.expired_qty > 0) return <Pill tone="danger">Muddati o'tgan · {p.expired_qty}</Pill>;
  if (p.sellable <= 0) return <Pill tone="danger">Tugagan</Pill>;
  const tone = p.sellable <= p.min_stock ? 'warning' : 'success';
  return (
    <span className="stack-sm" style={{ alignItems: 'flex-end', gap: 2 }}>
      <Pill tone={tone}>{p.sellable} {p.unit}</Pill>
      {p.expired_qty > 0 && <span className="cell-sub text-danger">+{p.expired_qty} muddati o'tgan</span>}
    </span>
  );
}

export default function Products({ refreshAlerts, settings }) {
  const [products, setProducts] = useState([]);
  const [archived, setArchived] = useState([]);
  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);
  const [tab, setTab] = useState('active');
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('');
  const [stockFilter, setStockFilter] = useState('all');
  const [form, setForm] = useState(null); // { mode, source }
  const [stockId, setStockId] = useState(null);
  const confirm = useConfirm();

  const load = useCallback(async () => {
    try {
      const [p, a, c, b] = await Promise.all([
        window.api.products.getAll(), window.api.products.archived(),
        window.api.products.categories(), window.api.products.brands(),
      ]);
      setProducts(p);
      setArchived(a);
      setCategories(c);
      setBrands(b);
    } catch (err) {
      toast.error(err.message);
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  const changed = () => { load(); refreshAlerts(); };

  const source = tab === 'active' ? products : archived;
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return source.filter((p) => {
      if (category && p.category_id !== category && p.category_parent_id !== category) return false;
      if (tab === 'active' && stockFilter === 'low' && !(p.sellable > 0 && p.sellable <= p.min_stock)) return false;
      if (tab === 'active' && stockFilter === 'out' && p.sellable > 0) return false;
      if (tab === 'active' && stockFilter === 'expired' && !p.expired_qty) return false;
      if (!q) return true;
      return [p.name, p.code, p.brand, p.flavor, p.weight].some((v) => v && String(v).toLowerCase().includes(q));
    });
  }, [source, query, category, stockFilter, tab]);

  const totals = useMemo(() => filtered.reduce((t, p) => ({
    units: t.units + Math.max(0, p.stock),
    value: t.value + Math.max(0, p.stock) * p.cost_price,
  }), { units: 0, value: 0 }), [filtered]);

  async function archive(p) {
    const ok = await confirm({
      title: 'Mahsulotni arxivlash',
      message: `"${p.name}" sotuv oynasi va ro'yxatlardan yashiriladi. Sotuvlar tarixi saqlanadi, istalgan vaqt "Arxiv" bo'limidan qaytarish mumkin.${
        p.stock > 0 ? `\n\nOmborda ${p.stock} ${p.unit} bor. Agar tovar yo'q bo'lsa, avval "Ombor holati" orqali hisobdan chiqaring — aks holda ombor qiymatida noto'g'ri qolib ketadi.` : ''}`,
      confirmText: 'Arxivlash',
      danger: true,
    });
    if (!ok) return;
    try {
      await window.api.products.remove(p.id);
      toast.success('Mahsulot arxivlandi');
      changed();
    } catch (err) {
      toast.error(err.message);
    }
  }

  async function restore(p) {
    try {
      await window.api.products.restore(p.id);
      toast.success(`"${p.name}" arxivdan qaytarildi`);
      changed();
    } catch (err) {
      toast.error(err.message);
    }
  }

  return (
    <>
      <PageHeader
        title="Mahsulotlar"
        subtitle={`${products.length} ta faol · ${archived.length} ta arxivda`}
        actions={<button type="button" className="btn btn-primary" onClick={() => setForm({ mode: 'create' })}><Plus size={16} />Yangi mahsulot</button>}
      />
      <div className="content">
        <Tabs
          value={tab}
          onChange={(t) => { setTab(t); setStockFilter('all'); }}
          tabs={[{ id: 'active', label: 'Faol', count: products.length }, { id: 'archived', label: 'Arxiv', count: archived.length }]}
        />
        <div className="toolbar">
          <SearchInput value={query} onChange={setQuery} placeholder="Nomi, brend, ta'm yoki kod" />
          <div style={{ width: 260 }}>
            <CategorySelect categories={categories} value={category} onChange={setCategory} emptyLabel="Barcha kategoriyalar" />
          </div>
          {tab === 'active' && (
            <Segmented
              options={[{ id: 'all', label: 'Hammasi' }, { id: 'low', label: 'Kam qolgan' }, { id: 'out', label: 'Tugagan' }, { id: 'expired', label: "Muddati o'tgan" }]}
              value={stockFilter}
              onChange={setStockFilter}
            />
          )}
        </div>

        {filtered.length === 0 ? (
          <div className="table-wrap">
            {tab === 'archived' ? (
              <EmptyState icon={Archive} title="Arxiv bo'sh" text="Arxivlangan mahsulotlar shu yerda saqlanadi va istalgan vaqt qaytariladi" />
            ) : (
              <EmptyState
                icon={Package}
                title={products.length ? 'Mahsulot topilmadi' : "Hali mahsulot qo'shilmagan"}
                text={products.length ? "Filtrlarni o'zgartirib ko'ring" : "Har bir ta'm yoki hajm alohida mahsulot sifatida yaratiladi."}
                action={!products.length && <button type="button" className="btn btn-primary" onClick={() => setForm({ mode: 'create' })}><Plus size={16} />Mahsulot qo'shish</button>}
              />
            )}
          </div>
        ) : (
          <>
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Mahsulot</th>
                    <th>Kod</th>
                    <th>Kategoriya</th>
                    <th className="num">Tannarx</th>
                    <th className="num">Sotuv narxi</th>
                    <th className="num">Ustama</th>
                    <th className="num">{tab === 'active' ? 'Qoldiq' : 'Arxivlangan'}</th>
                    <th className="actions" />
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((p) => {
                    const markup = p.cost_price > 0 ? Math.round(((p.sell_price - p.cost_price) / p.cost_price) * 100) : null;
                    const open = tab === 'active' ? () => setForm({ mode: 'edit', source: p }) : undefined;
                    return (
                      <tr key={p.id} className={open ? 'clickable' : undefined} onClick={open}>
                        <td>
                          <div className="cell-product">
                            <ProductThumb product={p} />
                            <div><div className="cell-title">{p.name}</div><div className="cell-sub">{productMeta(p) || '—'}</div></div>
                          </div>
                        </td>
                        <td className="mono secondary">{p.code}</td>
                        <td className="secondary">{categoryLabel(p)}</td>
                        <td className="num secondary">{money(p.cost_price)}</td>
                        <td className="num strong">{money(p.sell_price)}</td>
                        <td className={`num ${markup !== null && markup < 0 ? 'text-danger' : 'secondary'}`}>{markup === null ? '—' : `${markup}%`}</td>
                        <td className="num">
                          {tab === 'active' ? <StockPill p={p} /> : (
                            <><div className="secondary">{fmtDate(p.updated_at)}</div>{p.stock > 0 && <div className="cell-sub text-warning">qoldiq {p.stock} {p.unit}</div>}</>
                          )}
                        </td>
                        <td className="actions" onClick={(e) => e.stopPropagation()}>
                          {tab === 'active' ? (
                            <div className="row">
                              <button type="button" className="btn btn-ghost btn-icon btn-sm" title="Ombor holati" onClick={() => setStockId(p.id)}><Boxes size={15} /></button>
                              <button type="button" className="btn btn-ghost btn-icon btn-sm" title="Tahrirlash" onClick={() => setForm({ mode: 'edit', source: p })}><Pencil size={15} /></button>
                              <button type="button" className="btn btn-ghost btn-icon btn-sm" title="Boshqa ta'm/hajm uchun nusxa" onClick={() => setForm({ mode: 'duplicate', source: p })}><Copy size={15} /></button>
                              <button type="button" className="btn btn-ghost btn-icon btn-sm" title="Arxivlash" onClick={() => archive(p)}><Archive size={15} /></button>
                            </div>
                          ) : (
                            <button type="button" className="btn btn-secondary btn-sm" onClick={() => restore(p)}><ArchiveRestore size={15} />Qaytarish</button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="table-footer-note">
              <span>{filtered.length} ta mahsulot · {totals.units} dona omborda</span>
              <span>Ombor qiymati (tannarx): <strong className="tnum" style={{ color: 'var(--text)' }}>{som(totals.value)}</strong></span>
            </div>
          </>
        )}
      </div>

      {form && (
        <ProductForm
          mode={form.mode}
          source={form.source}
          categories={categories}
          brands={brands}
          defaultMinStock={Number(settings.lowStockAlert) || 3}
          onClose={() => setForm(null)}
          onSaved={() => { setForm(null); changed(); }}
        />
      )}
      {stockId && <StockManager productId={stockId} onClose={() => setStockId(null)} onChanged={changed} />}
    </>
  );
}
