import React, { useEffect, useRef, useState } from 'react';
import { toast } from 'react-hot-toast';
import { ImagePlus, X } from 'lucide-react';
import Modal from './Modal';
import MoneyInput from './MoneyInput';
import { CategorySelect, Field } from './ui';
import { UNITS, isoDate, som, unitLabel } from '../lib/format';
import { t } from '../lib/i18n';
import { resizeImage } from '../lib/image';


function emptyForm(defaults = {}) {
  return {
    name: '', code: '', category_id: '', brand: '', weight: '', flavor: '', unit: 'dona',
    cost_price: '', sell_price: '', min_stock: 3, description: '', initial_stock: '', initial_expiry: '', image: '',
    ...defaults,
  };
}

function fromProduct(p) {
  return emptyForm({
    name: p.name || '', code: p.code || '', category_id: p.category_id || '', brand: p.brand || '',
    weight: p.weight || '', flavor: p.flavor || '', unit: p.unit || 'dona', cost_price: p.cost_price ?? '',
    sell_price: p.sell_price ?? '', min_stock: p.min_stock ?? 3, description: p.description || '', image: p.image || '',
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
  const [busy, setBusy] = useState(false);
  const [imageBusy, setImageBusy] = useState(false);
  const fileRef = useRef(null);

  useEffect(() => {
    if (mode !== 'edit') window.api.products.nextCode().then(setNextCode).catch(() => {});
  }, [mode]);

  const set = (key) => (value) => setForm((f) => ({ ...f, [key]: value }));
  const setFromEvent = (key) => (e) => set(key)(e.target.value);

  async function pickImage(e) {
    const file = e.target.files && e.target.files[0];
    e.target.value = '';
    if (!file) return;
    setImageBusy(true);
    try {
      set('image')(await resizeImage(file));
    } catch (err) {
      toast.error(err.message);
    } finally {
      setImageBusy(false);
    }
  }

  const cost = Number(form.cost_price) || 0;
  const sell = Number(form.sell_price) || 0;
  const margin = sell > 0 && cost > 0 ? sell - cost : null;
  const markup = margin !== null && cost > 0 ? (margin / cost) * 100 : null;

  async function submit(e) {
    e.preventDefault();
    if (busy || imageBusy) return;
    if (!form.name.trim()) return toast.error(t('Mahsulot nomini kiriting'));
    if (!sell) return toast.error(t('Sotuv narxini kiriting'));
    if (sell < cost) toast(t('Diqqat: sotuv narxi tannarxdan past'), { icon: '!' });
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
      toast.success(mode === 'edit' ? t('Mahsulot saqlandi') : t('Mahsulot yaratildi (kod {c})', { c: saved.code }));
      onSaved(saved);
    } catch (err) {
      toast.error(err.message);
      setBusy(false);
    }
  }

  const title = mode === 'edit' ? t('Mahsulotni tahrirlash') : mode === 'duplicate' ? t('Yangi variant (nusxa)') : t('Yangi mahsulot');
  const subtitle = mode === 'duplicate'
    ? t("Boshqa ta'm yoki hajm uchun alohida mahsulot — har birining qoldig'i alohida hisoblanadi")
    : mode === 'edit' ? t('Kod {c} · omborda {n} {u}', { c: source.code, n: source.stock, u: unitLabel(source.unit) }) : t("Ma'lumotlarni qo'lda kiriting");

  return (
    <Modal
      size="lg"
      title={title}
      subtitle={subtitle}
      onClose={onClose}
      footer={(
        <>
          <button type="button" className="btn btn-secondary" onClick={onClose}>{t('Bekor qilish')}</button>
          <button type="submit" form="product-form" className="btn btn-primary" disabled={busy || imageBusy}>
            {mode === 'edit' ? t('Saqlash') : t('Yaratish')}
          </button>
        </>
      )}
    >
      <form id="product-form" onSubmit={submit}>
        <datalist id="brand-list">
          {brands.map((b) => <option key={b} value={b} />)}
        </datalist>

        <div className="form-section">
          <div className="form-section-title">{t("Asosiy ma'lumotlar")}</div>
          <div style={{ display: 'grid', gridTemplateColumns: '120px minmax(0, 1fr)', gap: 20 }}>
            <div className="field">
              <label>{t('Rasm')}</label>
              <div
                className={`image-picker${form.image ? ' has-image' : ''}`}
                role="button"
                tabIndex={0}
                onClick={() => fileRef.current && fileRef.current.click()}
                onKeyDown={(e) => { if (e.key === 'Enter' && fileRef.current) fileRef.current.click(); }}
              >
                {form.image ? (
                  <>
                    <img src={form.image} alt="" />
                    <button type="button" className="remove" aria-label={t('Rasmni olib tashlash')} onClick={(e) => { e.stopPropagation(); set('image')(''); }}>
                      <X size={13} />
                    </button>
                  </>
                ) : (
                  <div className="placeholder"><ImagePlus size={22} />{t('Rasm tanlash')}<br />PNG, JPG, WEBP</div>
                )}
                {imageBusy && <div className="busy">{t('Tayyorlanmoqda…')}</div>}
              </div>
              <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" style={{ display: 'none' }} onChange={pickImage} />
            </div>
            <div className="stack">
              <div className="grid-3">
                <Field label={t('Mahsulot nomi')} required className="span-2">
                  <input className="input" value={form.name} onChange={setFromEvent('name')} placeholder={t('Masalan: Gold Standard 100% Whey')} autoFocus />
                </Field>
                <Field label={t('Mahsulot kodi')} hint={t("Bo'sh qolsa avtomatik")}>
                  <input className="input mono" value={form.code} onChange={setFromEvent('code')} placeholder={nextCode || t('Avtomatik')} />
                </Field>
              </div>
              <div className="grid-3">
                <Field label={t('Kategoriya')}>
                  <CategorySelect categories={categories} value={form.category_id} onChange={set('category_id')} />
                </Field>
                <Field label={t('Ishlab chiqaruvchi (brend)')}>
                  <input className="input" list="brand-list" value={form.brand} onChange={setFromEvent('brand')} placeholder="Optimum Nutrition" />
                </Field>
                <Field label={t('Hajmi / qadoq')}>
                  <input className="input" value={form.weight} onChange={setFromEvent('weight')} placeholder={t('2,27 kg · 120 kapsula')} />
                </Field>
              </div>
            </div>
          </div>
          <div className="grid-3 mt-16">
            <Field label={t("Ta'mi / varianti")}>
              <input className="input" value={form.flavor} onChange={setFromEvent('flavor')} placeholder={t("Shokolad, vanil, ta'msiz")} />
            </Field>
            <Field label={t("O'lchov birligi")}>
              <select className="input" value={form.unit} onChange={setFromEvent('unit')}>
                {UNITS.map((u) => <option key={u} value={u}>{unitLabel(u)}</option>)}
              </select>
            </Field>
            <Field label={t('Minimal qoldiq')} hint={t('Shundan kam qolsa ogohlantiradi')}>
              <input className="input tnum" type="number" min="0" value={form.min_stock} onChange={setFromEvent('min_stock')} />
            </Field>
          </div>
        </div>

        <div className="form-section">
          <div className="form-section-title">{t('Narx')}</div>
          <div className="grid-3">
            <Field label={t('Tannarx (kelish narxi)')}>
              <MoneyInput value={form.cost_price} onChange={set('cost_price')} />
            </Field>
            <Field label={t('Sotuv narxi')} required>
              <MoneyInput value={form.sell_price} onChange={set('sell_price')} />
            </Field>
            <Field label={t('Foyda')}>
              <div className="input readonly tnum">
                {margin === null ? <span className="muted">—</span> : (
                  <span className={margin >= 0 ? 'amount-pos' : 'amount-neg'}>
                    {som(margin)}{markup !== null && <span className="muted" style={{ fontWeight: 400 }}> · {t('ustama {p}%', { p: markup.toFixed(0) })}</span>}
                  </span>
                )}
              </div>
            </Field>
          </div>
        </div>

        {allowInitialStock && mode !== 'edit' && (
          <div className="form-section">
            <div className="form-section-title">{t("Boshlang'ich qoldiq")}<span>{t("ixtiyoriy — keyinroq \"Kirim\" orqali ham qo'shish mumkin")}</span></div>
            <div className="grid-3">
              <Field label={t('Miqdor')}>
                <input className="input tnum" type="number" min="0" value={form.initial_stock} onChange={setFromEvent('initial_stock')} placeholder="0" />
              </Field>
              <Field label={t('Yaroqlilik muddati')}>
                <input className="input" type="date" min={isoDate()} value={form.initial_expiry} onChange={setFromEvent('initial_expiry')} />
              </Field>
            </div>
          </div>
        )}

        <div className="form-section">
          <Field label={t('Izoh')}>
            <textarea className="input" rows={2} value={form.description} onChange={setFromEvent('description')} placeholder={t("Tarkibi, porsiya soni va boshqa ma'lumotlar")} />
          </Field>
        </div>
      </form>
    </Modal>
  );
}
