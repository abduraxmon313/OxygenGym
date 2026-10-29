import React, { useEffect, useRef, useState } from 'react';
import { toast } from 'react-hot-toast';
import { ImagePlus, X } from 'lucide-react';
import Modal from './Modal';
import MoneyInput from './MoneyInput';
import { CategorySelect, Field } from './ui';
import { fmtDate, isoDate, money, som } from '../lib/format';

const UNITS = ['dona', 'quti', 'paket', 'shisha', 'kg', 'litr'];

function emptyForm(defaults = {}) {
  return {
    name: '', code: '', category_id: '', brand: '', weight: '', flavor: '', unit: 'dona',
    cost_price: '', sell_price: '', min_stock: 3, description: '', initial_stock: '', initial_expiry: '',
    image: '',
    ...defaults,
  };
}

function fromProduct(p) {
  return emptyForm({
    name: p.name || '', code: p.code || '', category_id: p.category_id || '', brand: p.brand || '',
    weight: p.weight || '', flavor: p.flavor || '', unit: p.unit || 'dona', cost_price: p.cost_price ?? '',
    sell_price: p.sell_price ?? '', min_stock: p.min_stock ?? 3, description: p.description || '',
    image: p.image || '',
  });
}

/**
 * mode: 'create' | 'edit' | 'duplicate'
 * source: tahrirlanayotgan yoki nusxa olinayotgan mahsulot
 */
export default function ProductForm({ mode = 'create', source, categories, brands, defaultMinStock = 3, allowInitialStock = true, onClose, onSaved }) {
  const [form, setForm] = useState(() => {
    if (mode === 'edit' && source) return fromProduct(source);
    if (mode === 'duplicate' && source) return { ...fromProduct(source), code: '', flavor: '' };
    return emptyForm({ min_stock: defaultMinStock });
  });
  const [nextCode, setNextCode] = useState('');
  const [batches, setBatches] = useState([]);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef(null);

  useEffect(() => {
    if (mode !== 'edit') window.api.products.nextCode().then(setNextCode).catch(() => {});
    if (mode === 'edit' && source) {
      window.api.products.getById(source.id).then((p) => setBatches((p && p.batches) || [])).catch(() => {});
    }
  }, [mode, source]);

  const set = (key) => (value) => setForm((f) => ({ ...f, [key]: value }));
  const setFromEvent = (key) => (e) => set(key)(e.target.value);

  const cost = Number(form.cost_price) || 0;
  const sell = Number(form.sell_price) || 0;
  const margin = sell > 0 && cost > 0 ? sell - cost : null;
  const markup = margin !== null && cost > 0 ? (margin / cost) * 100 : null;

  async function submit(e) {
    e.preventDefault();
    if (busy) return;
    if (!form.name.trim()) return toast.error('Mahsulot nomini kiriting');
    if (!sell) return toast.error('Sotuv narxini kiriting');
    if (sell < cost) {
      // Zarariga sotish ataylab bo'lishi mumkin, lekin ogohlantiramiz
      toast('Diqqat: sotuv narxi tannarxdan past', { icon: '!' });
    }
    setBusy(true);
    try {
      const payload = { ...form };
      if (!allowInitialStock || mode === 'edit') {
        delete payload.initial_stock;
        delete payload.initial_expiry;
      }
      const saved = mode === 'edit'
        ? await window.api.products.update(source.id, payload)
        : await window.api.products.create(payload);
      toast.success(mode === 'edit' ? 'Mahsulot saqlandi' : `Mahsulot yaratildi (kod ${saved.code})`);
      onSaved(saved);
    } catch (err) {
      toast.error(err.message);
      setBusy(false);
    }
  }

  const title = mode === 'edit' ? 'Mahsulotni tahrirlash' : mode === 'duplicate' ? 'Yangi variant (nusxa)' : 'Yangi mahsulot';
  const subtitle = mode === 'duplicate'
    ? "Boshqa ta'm yoki hajm uchun alohida mahsulot yarating — har birining qoldig'i alohida hisoblanadi"
    : mode === 'edit' ? `Kod ${source.code}` : "Ma'lumotlarni qo'lda kiriting";

  return (
    <Modal
      size="lg"
      title={title}
      subtitle={subtitle}
      onClose={onClose}
      footer={(
        <>
          <button type="button" className="btn btn-secondary" onClick={onClose}>Bekor qilish</button>
          <button type="submit" form="product-form" className="btn btn-primary" disabled={busy}>
            {mode === 'edit' ? 'Saqlash' : 'Yaratish'}
          </button>
        </>
      )}
    >
      <form id="product-form" onSubmit={submit}>
        <datalist id="brand-list">
          {brands.map((b) => <option key={b} value={b} />)}
        </datalist>

        <div className="form-section">
          <div className="form-section-title">Asosiy ma'lumotlar</div>
          <div style={{ display: 'flex', gap: 20, marginBottom: 16 }}>
            <div style={{ flexShrink: 0 }}>
              <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Rasm</label>
              <div style={{ width: 110, height: 110, borderRadius: 10, border: '2px dashed var(--border-strong)', background: 'var(--surface-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', position: 'relative', cursor: 'pointer' }}
                onClick={() => fileRef.current && fileRef.current.click()}>
                {form.image ? (
                  <>
                    <img src={form.image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    <button type="button" onClick={(e) => { e.stopPropagation(); set('image')(''); }}
                      style={{ position: 'absolute', top: 4, right: 4, width: 22, height: 22, borderRadius: '50%', background: 'rgba(0,0,0,0.6)', color: '#fff', border: 0, display: 'grid', placeItems: 'center', cursor: 'pointer' }}>
                      <X size={12} />
                    </button>
                  </>
                ) : (
                  <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                    <ImagePlus size={24} style={{ opacity: 0.5 }} />
                    <div style={{ fontSize: 11, marginTop: 4 }}>Tanlash</div>
                  </div>
                )}
                <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => {
                  const file = e.target.files && e.target.files[0];
                  if (!file) return;
                  if (file.size > 5 * 1024 * 1024) { toast.error("Rasm 5 MB dan katta bo'lmasligi kerak"); return; }
                  const reader = new FileReader();
                  reader.onload = () => set('image')(reader.result);
                  reader.readAsDataURL(file);
                  e.target.value = '';
                }} />
              </div>
            </div>
            <div style={{ flex: 1 }}>
              <div className="grid-2" style={{ marginBottom: 16 }}>
                <Field label="Mahsulot nomi" required>
                  <input className="input" value={form.name} onChange={setFromEvent('name')} placeholder="Masalan: Gold Standard 100% Whey" autoFocus />
                </Field>
                <Field label="Mahsulot kodi" hint="Bo'sh qolsa avtomatik beriladi">
                  <input className="input mono" value={form.code} onChange={setFromEvent('code')} placeholder={nextCode || 'Avtomatik'} />
                </Field>
              </div>
              <div className="grid-3">
                <Field label="Kategoriya">
                  <CategorySelect categories={categories} value={form.category_id} onChange={set('category_id')} />
                </Field>
                <Field label="Ishlab chiqaruvchi (brend)">
                  <input className="input" list="brand-list" value={form.brand} onChange={setFromEvent('brand')} placeholder="Optimum Nutrition" />
                </Field>
                <Field label="Hajmi / qadoq">
                  <input className="input" value={form.weight} onChange={setFromEvent('weight')} placeholder="2,27 kg · 120 kapsula · 500 ml" />
                </Field>
              </div>
            </div>
          </div>
          <div className="grid-3">
            <Field label="Ta'mi / varianti">
              <input className="input" value={form.flavor} onChange={setFromEvent('flavor')} placeholder="Shokolad, vanil, ta'msiz" />
            </Field>
            <Field label="O'lchov birligi">
              <select className="input" value={form.unit} onChange={setFromEvent('unit')}>
                {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
              </select>
            </Field>
            <Field label="Minimal qoldiq" hint="Shundan kam qolsa ogohlantiradi">
              <input className="input tnum" type="number" min="0" value={form.min_stock} onChange={setFromEvent('min_stock')} />
            </Field>
          </div>
        </div>

        <div className="form-section">
          <div className="form-section-title">Narx</div>
          <div className="grid-3">
            <Field label="Tannarx (kelish narxi)">
              <MoneyInput value={form.cost_price} onChange={set('cost_price')} />
            </Field>
            <Field label="Sotuv narxi" required>
              <MoneyInput value={form.sell_price} onChange={set('sell_price')} />
            </Field>
            <Field label="Foyda">
              <div className="input tnum" style={{ display: 'flex', alignItems: 'center', background: 'var(--surface-muted)' }}>
                {margin === null ? <span className="muted">—</span> : (
                  <span className={margin >= 0 ? 'amount-pos' : 'amount-neg'}>
                    {som(margin)}{markup !== null && <span className="muted" style={{ fontWeight: 400 }}> · ustama {markup.toFixed(0)}%</span>}
                  </span>
                )}
              </div>
            </Field>
          </div>
        </div>

        {allowInitialStock && mode !== 'edit' && (
          <div className="form-section">
            <div className="form-section-title">Boshlang'ich qoldiq<span>ixtiyoriy — keyinroq "Kirim" orqali ham qo'shish mumkin</span></div>
            <div className="grid-3">
              <Field label="Miqdor">
                <input className="input tnum" type="number" min="0" value={form.initial_stock} onChange={setFromEvent('initial_stock')} placeholder="0" />
              </Field>
              <Field label="Yaroqlilik muddati">
                <input className="input" type="date" min={isoDate()} value={form.initial_expiry} onChange={setFromEvent('initial_expiry')} />
              </Field>
            </div>
          </div>
        )}

        <div className="form-section">
          <Field label="Izoh">
            <textarea className="input" rows={2} value={form.description} onChange={setFromEvent('description')} placeholder="Tarkibi, porsiya soni va boshqa ma'lumotlar" />
          </Field>
        </div>

        {mode === 'edit' && (
          <div className="form-section">
            <div className="form-section-title">Ombordagi partiyalar<span>sotuvda avval muddati yaqin partiya chiqadi</span></div>
            {batches.length === 0 ? (
              <div className="muted" style={{ fontSize: 13 }}>Omborda partiya yo'q</div>
            ) : (
              <div className="table-wrap">
                <table className="table table-sm">
                  <thead>
                    <tr><th>Partiya</th><th>Kirim sanasi</th><th className="num">Tannarx</th><th className="num">Qoldiq</th><th>Yaroqlilik</th></tr>
                  </thead>
                  <tbody>
                    {batches.map((b) => (
                      <tr key={b.id}>
                        <td className="mono">{b.batch_number}</td>
                        <td>{fmtDate(b.created_at)}</td>
                        <td className="num">{money(b.cost_price)}</td>
                        <td className="num">{b.remaining} / {b.quantity}</td>
                        <td>{b.expiry_date ? fmtDate(b.expiry_date) : <span className="muted">Ko'rsatilmagan</span>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </form>
    </Modal>
  );
}
