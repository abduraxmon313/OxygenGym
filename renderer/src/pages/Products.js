import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'react-hot-toast';
import { Archive, Copy, Package, Pencil, Plus } from 'lucide-react';
import { CategorySelect, EmptyState, PageHeader, Pill, SearchInput, Segmented } from '../components/ui';
import ProductForm from '../components/ProductForm';
import { useConfirm } from '../components/ConfirmDialog';
import { categoryLabel, money, productMeta, som } from '../lib/format';

export default function Products({ refreshAlerts, settings }) {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('');
  const [stockFilter, setStockFilter] = useState('all');
  const [form, setForm] = useState(null); // { mode, source }
  const confirm = useConfirm();

  const load = useCallback(async () => {
    try {
      const [p, c, b] = await Promise.all([window.api.products.getAll(), window.api.products.categories(), window.api.products.brands()]);
      setProducts(p);
      setCategories(c);
      setBrands(b);
    } catch (err) {
      toast.error(err.message);
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return products.filter((p) => {
      if (category && p.category_id !== category && p.category_parent_id !== category) return false;
      if (stockFilter === 'low' && !(p.stock > 0 && p.stock <= p.min_stock)) return false;
      if (stockFilter === 'out' && p.stock > 0) return false;
      if (!q) return true;
      return [p.name, p.code, p.brand, p.flavor, p.weight].some((v) => v && String(v).toLowerCase().includes(q));
    });
  }, [products, query, category, stockFilter]);

  const totals = useMemo(() => filtered.reduce((t, p) => ({
    units: t.units + Math.max(0, p.stock),
    value: t.value + Math.max(0, p.stock) * p.cost_price,
  }), { units: 0, value: 0 }), [filtered]);

  async function archive(p) {
    const ok = await confirm({
      title: 'Mahsulotni arxivlash',
      message: `"${p.name}" sotuv va ro'yxatlardan olib tashlanadi.${p.stock > 0 ? `\nOmborda hali ${p.stock} ${p.unit} bor.` : ''}\nSotuvlar tarixi saqlanib qoladi.`,
      confirmText: 'Arxivlash',
      danger: true,
    });
    if (!ok) return;
    try {
      await window.api.products.remove(p.id);
      toast.success('Mahsulot arxivlandi');
      load();
      refreshAlerts();
    } catch (err) {
      toast.error(err.message);
    }
  }

  return (
    <>
      <PageHeader
        title="Mahsulotlar"
        subtitle={`${products.length} ta faol mahsulot`}
        actions={<button type="button" className="btn btn-primary" onClick={() => setForm({ mode: 'create' })}><Plus size={16} />Yangi mahsulot</button>}
      />
      <div className="content">
        <div className="toolbar">
          <SearchInput value={query} onChange={setQuery} placeholder="Nomi, brend, ta'm yoki kod" />
          <div style={{ width: 260 }}>
            <CategorySelect categories={categories} value={category} onChange={setCategory} emptyLabel="Barcha kategoriyalar" />
          </div>
          <Segmented
            options={[{ id: 'all', label: 'Hammasi' }, { id: 'low', label: 'Kam qolgan' }, { id: 'out', label: 'Tugagan' }]}
            value={stockFilter}
            onChange={setStockFilter}
          />
        </div>

        {filtered.length === 0 ? (
          <div className="table-wrap">
            <EmptyState
              icon={Package}
              title={products.length ? 'Mahsulot topilmadi' : "Hali mahsulot qo'shilmagan"}
              text={products.length ? "Filtrlarni o'zgartirib ko'ring" : "Birinchi mahsulotni qo'shing. Har bir ta'm yoki hajm alohida mahsulot sifatida yaratiladi."}
              action={!products.length && <button type="button" className="btn btn-primary" onClick={() => setForm({ mode: 'create' })}><Plus size={16} />Mahsulot qo'shish</button>}
            />
          </div>
        ) : (
          <>
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Kod</th>
                    <th>Mahsulot</th>
                    <th>Kategoriya</th>
                    <th className="num">Tannarx</th>
                    <th className="num">Sotuv narxi</th>
                    <th className="num">Ustama</th>
                    <th className="num">Qoldiq</th>
                    <th className="actions" />
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((p) => {
                    const markup = p.cost_price > 0 ? Math.round(((p.sell_price - p.cost_price) / p.cost_price) * 100) : null;
                    const tone = p.stock <= 0 ? 'danger' : p.stock <= p.min_stock ? 'warning' : 'success';
                    return (
                      <tr key={p.id} className="clickable" onClick={() => setForm({ mode: 'edit', source: p })}>
                        <td className="mono secondary">{p.code}</td>
                        <td><div className="cell-title">{p.name}</div><div className="cell-sub">{productMeta(p) || '—'}</div></td>
                        <td className="secondary">{categoryLabel(p)}</td>
                        <td className="num secondary">{money(p.cost_price)}</td>
                        <td className="num strong">{money(p.sell_price)}</td>
                        <td className={`num ${markup !== null && markup < 0 ? 'text-danger' : 'secondary'}`}>{markup === null ? '—' : `${markup}%`}</td>
                        <td className="num"><Pill tone={tone}>{p.stock} {p.unit}</Pill></td>
                        <td className="actions" onClick={(e) => e.stopPropagation()}>
                          <div className="row">
                            <button type="button" className="btn btn-ghost btn-icon btn-sm" title="Tahrirlash" onClick={() => setForm({ mode: 'edit', source: p })}><Pencil size={15} /></button>
                            <button type="button" className="btn btn-ghost btn-icon btn-sm" title="Boshqa ta'm/hajm uchun nusxa" onClick={() => setForm({ mode: 'duplicate', source: p })}><Copy size={15} /></button>
                            <button type="button" className="btn btn-ghost btn-icon btn-sm" title="Arxivlash" onClick={() => archive(p)}><Archive size={15} /></button>
                          </div>
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
          onSaved={() => { setForm(null); load(); refreshAlerts(); }}
        />
      )}
    </>
  );
}
