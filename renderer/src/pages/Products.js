import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'react-hot-toast';
import { Archive, ArchiveRestore, Boxes, Copy, Package, Pencil, Plus } from 'lucide-react';
import { CategorySelect, EmptyState, PageHeader, Pill, ProductThumb, SearchInput, Segmented, Tabs } from '../components/ui';
import ProductForm from '../components/ProductForm';
import StockManager from '../components/StockManager';
import { useConfirm } from '../components/ConfirmDialog';
import { categoryLabel, fmtDate, money, productMeta, som, unitLabel } from '../lib/format';
import { t } from '../lib/i18n';

function StockPill({ p }) {
  if (p.sellable <= 0 && p.expired_qty > 0) return <Pill tone="danger">{t("Muddati o'tgan")} · {p.expired_qty}</Pill>;
  if (p.sellable <= 0) return <Pill tone="danger">{t('Tugagan')}</Pill>;
  const tone = p.sellable <= p.min_stock ? 'warning' : 'success';
  return (
    <span className="stack-sm" style={{ alignItems: 'flex-end', gap: 2 }}>
      <Pill tone={tone}>{p.sellable} {unitLabel(p.unit)}</Pill>
      {p.expired_qty > 0 && <span className="cell-sub text-danger">{t("+{n} muddati o'tgan", { n: p.expired_qty })}</span>}
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
      title: t('Mahsulotni arxivlash'),
      message: t('"{name}" sotuv oynasi va ro\'yxatlardan yashiriladi. Sotuvlar tarixi saqlanadi, istalgan vaqt "Arxiv" bo\'limidan qaytarish mumkin.', { name: p.name })
        + (p.stock > 0 ? `\n\n${t('Omborda {n} {u} bor. Agar tovar yo\'q bo\'lsa, avval "Ombor holati" orqali hisobdan chiqaring — aks holda ombor qiymatida noto\'g\'ri qolib ketadi.', { n: p.stock, u: unitLabel(p.unit) })}` : ''),
      confirmText: t('Arxivlash'),
      danger: true,
    });
    if (!ok) return;
    try {
      await window.api.products.remove(p.id);
      toast.success(t('Mahsulot arxivlandi'));
      changed();
    } catch (err) {
      toast.error(err.message);
    }
  }

  async function restore(p) {
    try {
      await window.api.products.restore(p.id);
      toast.success(t('"{name}" arxivdan qaytarildi', { name: p.name }));
      changed();
    } catch (err) {
      toast.error(err.message);
    }
  }

  return (
    <>
      <PageHeader
        title={t('Mahsulotlar')}
        subtitle={t('{a} ta faol · {b} ta arxivda', { a: products.length, b: archived.length })}
        actions={<button type="button" className="btn btn-primary" onClick={() => setForm({ mode: 'create' })}><Plus size={16} />{t('Yangi mahsulot')}</button>}
      />
      <div className="content">
        <Tabs
          value={tab}
          onChange={(v) => { setTab(v); setStockFilter('all'); }}
          tabs={[{ id: 'active', label: t('Faol'), count: products.length }, { id: 'archived', label: t('Arxiv'), count: archived.length }]}
        />
        <div className="toolbar">
          <SearchInput value={query} onChange={setQuery} placeholder={t("Nomi, brend, ta'm yoki kod")} />
          <div style={{ width: 260 }}>
            <CategorySelect categories={categories} value={category} onChange={setCategory} emptyLabel={t('Barcha kategoriyalar')} />
          </div>
          {tab === 'active' && (
            <Segmented
              options={[{ id: 'all', label: t('Hammasi') }, { id: 'low', label: t('Kam qolgan') }, { id: 'out', label: t('Tugagan') }, { id: 'expired', label: t("Muddati o'tgan") }]}
              value={stockFilter}
              onChange={setStockFilter}
            />
          )}
        </div>

        {filtered.length === 0 ? (
          <div className="table-wrap">
            {tab === 'archived' ? (
              <EmptyState icon={Archive} title={t("Arxiv bo'sh")} text={t('Arxivlangan mahsulotlar shu yerda saqlanadi va istalgan vaqt qaytariladi')} />
            ) : (
              <EmptyState
                icon={Package}
                title={products.length ? t('Mahsulot topilmadi') : t("Hali mahsulot qo'shilmagan")}
                text={products.length ? t("Filtrlarni o'zgartirib ko'ring") : t("Har bir ta'm yoki hajm alohida mahsulot sifatida yaratiladi.")}
                action={!products.length && <button type="button" className="btn btn-primary" onClick={() => setForm({ mode: 'create' })}><Plus size={16} />{t("Mahsulot qo'shish")}</button>}
              />
            )}
          </div>
        ) : (
          <>
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>{t('Mahsulot')}</th>
                    <th>{t('Kod')}</th>
                    <th>{t('Kategoriya')}</th>
                    <th className="num">{t('Tannarx')}</th>
                    <th className="num">{t('Sotuv narxi')}</th>
                    <th className="num">{t('Ustama')}</th>
                    <th className="num">{tab === 'active' ? t('Qoldiq') : t('Arxivlangan')}</th>
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
                            <><div className="secondary">{fmtDate(p.updated_at)}</div>{p.stock > 0 && <div className="cell-sub text-warning">{t('qoldiq {n} {u}', { n: p.stock, u: unitLabel(p.unit) })}</div>}</>
                          )}
                        </td>
                        <td className="actions" onClick={(e) => e.stopPropagation()}>
                          {tab === 'active' ? (
                            <div className="row">
                              <button type="button" className="btn btn-ghost btn-icon btn-sm" title={t('Ombor holati')} onClick={() => setStockId(p.id)}><Boxes size={15} /></button>
                              <button type="button" className="btn btn-ghost btn-icon btn-sm" title={t('Tahrirlash')} onClick={() => setForm({ mode: 'edit', source: p })}><Pencil size={15} /></button>
                              <button type="button" className="btn btn-ghost btn-icon btn-sm" title={t("Boshqa ta'm/hajm uchun nusxa")} onClick={() => setForm({ mode: 'duplicate', source: p })}><Copy size={15} /></button>
                              <button type="button" className="btn btn-ghost btn-icon btn-sm" title={t('Arxivlash')} onClick={() => archive(p)}><Archive size={15} /></button>
                            </div>
                          ) : (
                            <button type="button" className="btn btn-secondary btn-sm" onClick={() => restore(p)}><ArchiveRestore size={15} />{t('Qaytarish')}</button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="table-footer-note">
              <span>{t('{n} ta mahsulot · {u} dona omborda', { n: filtered.length, u: totals.units })}</span>
              <span>{t('Ombor qiymati (tannarx)')}: <strong className="tnum" style={{ color: 'var(--text)' }}>{som(totals.value)}</strong></span>
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
