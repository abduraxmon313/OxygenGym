import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'react-hot-toast';
import { Minus, PackageSearch, Plus, ShoppingCart, Trash2, UserRound, X } from 'lucide-react';
import { EmptyState, Pill, ProductMedia, ProductThumb, SearchInput, Segmented } from '../components/ui';
import MoneyInput from '../components/MoneyInput';
import CustomerPicker from '../components/CustomerPicker';
import PaymentModal from '../components/PaymentModal';
import { useConfirm } from '../components/ConfirmDialog';
import { balanceState, catName, categoryLabel, currency, initials, money, productMeta, som, unitLabel } from '../lib/format';
import { t } from '../lib/i18n';

function stockTone(p) {
  if (p.sellable <= 0) return 'danger';
  if (p.sellable <= p.min_stock) return 'warning';
  return 'neutral';
}

// Mahsulotlar qayta yuklanganda savatchadagi narx va qoldiqni yangilaymiz.
// Arxivlangan yoki tugagan mahsulot savatchadan olib tashlanadi.
function syncCart(cart, products) {
  const byId = new Map(products.map((p) => [p.id, p]));
  const notes = [];
  const next = [];
  cart.forEach((item) => {
    const p = byId.get(item.product_id);
    if (!p || p.sellable <= 0) { notes.push(t('"{name}" savatchadan olib tashlandi', { name: item.name })); return; }
    const quantity = Math.min(item.quantity, p.sellable);
    if (p.sell_price !== item.price) notes.push(t('"{name}" narxi: {a} → {b}', { name: p.name, a: money(item.price), b: money(p.sell_price) }));
    if (quantity < item.quantity) notes.push(t('"{name}" miqdori {n} ga kamaytirildi', { name: p.name, n: quantity }));
    next.push({ ...item, price: p.sell_price, stock: p.sellable, image: p.image, quantity });
  });
  return { next, notes };
}

function ProductTile({ p, qty, onAdd }) {
  const disabled = p.sellable <= 0;
  const activate = () => { if (!disabled) onAdd(p); };
  return (
    <div
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-disabled={disabled}
      className={`tile${disabled ? ' disabled' : ''}${qty ? ' in-cart' : ''}`}
      onClick={activate}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); activate(); } }}
      title={p.name}
    >
      {qty > 0 && <span className="tile-qty">{qty}</span>}
      <ProductMedia product={p} />
      <div className="tile-body">
        <div className="tile-cat">{categoryLabel(p)}</div>
        <div className="tile-name">{p.name}</div>
        <div className="tile-meta">{productMeta(p) || t('Kod {c}', { c: p.code })}</div>
        <div className="tile-foot">
          <span className="tile-price">{money(p.sell_price)}</span>
          <Pill tone={stockTone(p)}>
            {disabled ? (p.expired_qty > 0 ? t("Muddati o'tgan") : t('Tugagan')) : `${p.sellable} ${unitLabel(p.unit)}`}
          </Pill>
        </div>
      </div>
    </div>
  );
}

export default function POS({ refreshAlerts, settings }) {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [category, setCategory] = useState('all');
  const [query, setQuery] = useState('');
  const [cart, setCart] = useState([]);
  const [discount, setDiscount] = useState('');
  const [discountType, setDiscountType] = useState('percent');
  const [customer, setCustomer] = useState(null);
  const [picking, setPicking] = useState(false);
  const [paying, setPaying] = useState(false);
  const searchRef = useRef(null);
  const confirm = useConfirm();

  const load = useCallback(async () => {
    try {
      const [p, c] = await Promise.all([window.api.products.getAll(), window.api.products.categories()]);
      setProducts(p);
      setCategories(c);
      return p;
    } catch (err) {
      toast.error(err.message);
      return null;
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  async function refreshCart() {
    const fresh = await load();
    if (!fresh) return cart;
    const { next, notes } = syncCart(cart, fresh);
    notes.forEach((n) => toast(n, { icon: '!', duration: 6000 }));
    setCart(next);
    return next;
  }

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return products.filter((p) => {
      if (category !== 'all' && (p.category_parent_id || p.category_id) !== category) return false;
      if (!q) return true;
      return [p.name, p.code, p.brand, p.flavor, p.weight].some((v) => v && String(v).toLowerCase().includes(q));
    });
  }, [products, category, query]);

  const inCart = useMemo(() => Object.fromEntries(cart.map((i) => [i.product_id, i.quantity])), [cart]);
  const chips = categories.filter((c) => c.product_count > 0);

  function add(p) {
    if (p.sellable <= 0) {
      toast.error(p.expired_qty > 0 ? t('"{name}": qolgan tovarning muddati o\'tgan', { name: p.name }) : t('"{name}" omborda qolmagan', { name: p.name }));
      return;
    }
    const current = inCart[p.id] || 0;
    if (current >= p.sellable) { toast.error(t('Sotish mumkin: {n} {u}', { n: p.sellable, u: unitLabel(p.unit) })); return; }
    setCart((prev) => (current
      ? prev.map((i) => (i.product_id === p.id ? { ...i, quantity: i.quantity + 1 } : i))
      : [...prev, { product_id: p.id, name: p.name, meta: productMeta(p), price: p.sell_price, stock: p.sellable, unit: p.unit || 'dona', image: p.image, quantity: 1 }]));
  }

  function setQty(id, raw) {
    const item = cart.find((i) => i.product_id === id);
    if (!item) return;
    let qty = Math.floor(Number(raw) || 0);
    if (qty > item.stock) { toast.error(t('Omborda faqat {n} {u} bor', { n: item.stock, u: unitLabel(item.unit) })); qty = item.stock; }
    if (qty < 1) qty = 1;
    setCart((prev) => prev.map((i) => (i.product_id === id ? { ...i, quantity: qty } : i)));
  }

  const remove = (id) => setCart((prev) => prev.filter((i) => i.product_id !== id));

  async function clearCart() {
    if (!cart.length) return;
    const ok = await confirm({ title: t('Savatchani tozalash'), message: t('Savatchadagi barcha mahsulotlar olib tashlanadi.'), confirmText: t('Tozalash'), danger: true });
    if (ok) { setCart([]); setDiscount(''); }
  }

  const subtotal = cart.reduce((s, i) => s + i.price * i.quantity, 0);
  const discountValue = Number(discount) || 0;
  const discountAmount = discountType === 'percent'
    ? Math.round((subtotal * Math.min(discountValue, 100)) / 100)
    : Math.min(discountValue, subtotal);
  const total = subtotal - discountAmount;
  const itemsCount = cart.reduce((s, i) => s + i.quantity, 0);

  function onSearchKey(e) {
    if (e.key !== 'Enter') return;
    const q = query.trim().toLowerCase();
    const exact = products.find((p) => p.code && p.code.toLowerCase() === q);
    const target = exact || (visible.length === 1 ? visible[0] : null);
    if (target) { add(target); setQuery(''); }
  }

  function finish(result) {
    setPaying(false);
    setCart([]);
    setDiscount('');
    setCustomer(null);
    toast.success(t('Sotuv {n} yakunlandi · {s}', { n: result.sale_number, s: som(result.final_total) }));
    if (result.change > 0) toast(t('Qaytim: {s}', { s: som(result.change) }), { duration: 10000, icon: '↩' });
    if (result.debt > 0) toast(t('Qarzga yozildi: {s}', { s: som(result.debt) }), { duration: 8000, icon: '!' });
    load();
    refreshAlerts();
    if (searchRef.current) searchRef.current.focus();
  }

  function openPayment() {
    // To'lov oynasi ochilishidan oldin narx va qoldiqlarni tekshiramiz
    refreshCart().then((next) => { if (next.length) setPaying(true); });
  }

  const cb = customer ? balanceState(customer.balance) : null;

  return (
    <div className="content flush">
      <div className="pos">
        <section className="pos-catalog">
          <div className="pos-catalog-head">
            <div className="row-between">
              <SearchInput
                size="lg"
                inputRef={searchRef}
                value={query}
                onChange={setQuery}
                onKeyDown={onSearchKey}
                placeholder={t("Mahsulot nomi, brend yoki kod — Enter qo'shadi")}
                autoFocus
              />
              <span className="secondary nowrap" style={{ fontSize: 13 }}>{t('{n} ta mahsulot', { n: visible.length })}</span>
            </div>
            <div className="chips">
              <button type="button" className={`chip${category === 'all' ? ' active' : ''}`} onClick={() => setCategory('all')}>
                {t('Barchasi')} <span className="count">{products.length}</span>
              </button>
              {chips.map((c) => (
                <button key={c.id} type="button" className={`chip${category === c.id ? ' active' : ''}`} onClick={() => setCategory(c.id)}>
                  {catName(c.name)} <span className="count">{c.product_count}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="pos-grid-wrap">
            {visible.length === 0 ? (
              <EmptyState
                icon={PackageSearch}
                title={products.length ? t('Mahsulot topilmadi') : t("Hali mahsulot qo'shilmagan")}
                text={products.length ? t("Qidiruv so'zini yoki kategoriyani o'zgartiring") : t('"Mahsulotlar" bo\'limida mahsulot yarating')}
              />
            ) : (
              <div className="product-grid">
                {visible.map((p) => <ProductTile key={p.id} p={p} qty={inCart[p.id] || 0} onAdd={add} />)}
              </div>
            )}
          </div>
        </section>

        <aside className="pos-cart">
          <div className="cart-head">
            <div className="row-between">
              <div className="row"><ShoppingCart size={18} /><span className="strong">{t('Savatcha')}</span>{itemsCount > 0 && <Pill tone="primary" dot={false}>{itemsCount}</Pill>}</div>
              <button type="button" className="btn btn-ghost btn-sm" onClick={clearCart} disabled={!cart.length}>{t('Tozalash')}</button>
            </div>

            {customer ? (
              <div className="cart-customer">
                <div className="avatar">{initials(customer.name)}</div>
                <div className="info">
                  <div className="name">{customer.name}</div>
                  <div className="meta">
                    {cb.amount ? <span className={cb.cls}>{cb.label}: {som(cb.amount)}</span> : t('Hisob nol')}
                  </div>
                </div>
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => setPicking(true)}>{t("O'zgartirish")}</button>
                <button type="button" className="btn btn-ghost btn-icon btn-sm" onClick={() => setCustomer(null)} aria-label={t('Mijozni olib tashlash')}><X size={16} /></button>
              </div>
            ) : (
              <div className="cart-customer empty-state">
                <div className="avatar neutral"><UserRound size={16} /></div>
                <div className="info">
                  <div className="name">{t('Mijozsiz sotuv')}</div>
                  <div className="meta">{t('Avans yoki qarz uchun mijoz tanlang')}</div>
                </div>
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => setPicking(true)}>{t('Tanlash')}</button>
              </div>
            )}
          </div>

          <div className="cart-lines">
            {cart.length === 0 ? (
              <EmptyState icon={ShoppingCart} title={t("Savatcha bo'sh")} text={t('Mahsulot kartochkasini bosing yoki qidiruvda Enter bosing')} />
            ) : cart.map((i) => (
              <div key={i.product_id} className="cart-line">
                <ProductThumb product={i} size="sm" />
                <div style={{ minWidth: 0 }}>
                  <div className="name">{i.name}</div>
                  {i.meta && <div className="meta">{i.meta}</div>}
                </div>
                <div className="line-total">{money(i.price * i.quantity)}</div>
                <div className="controls">
                  <div className="qty">
                    <button type="button" onClick={() => (i.quantity > 1 ? setQty(i.product_id, i.quantity - 1) : remove(i.product_id))} aria-label={t('Kamaytirish')}><Minus size={14} /></button>
                    <input value={i.quantity} onChange={(e) => setQty(i.product_id, e.target.value)} inputMode="numeric" />
                    <button type="button" onClick={() => setQty(i.product_id, i.quantity + 1)} aria-label={t("Ko'paytirish")}><Plus size={14} /></button>
                  </div>
                  <span className="unit">{money(i.price)} × {i.quantity}</span>
                  <button type="button" className="btn btn-ghost btn-icon btn-sm" onClick={() => remove(i.product_id)} aria-label={t("O'chirish")}><Trash2 size={15} /></button>
                </div>
              </div>
            ))}
          </div>

          <div className="cart-foot">
            <div className="discount-row">
              <span className="secondary" style={{ fontSize: 13, minWidth: 64 }}>{t('Chegirma')}</span>
              <div className="input-wrap">
                {discountType === 'percent' ? (
                  <div className="input-group">
                    <input className="input tnum" type="number" min="0" max="100" value={discount} onChange={(e) => setDiscount(e.target.value === '' ? '' : Math.min(100, Math.max(0, Number(e.target.value))))} placeholder="0" />
                    <span className="input-addon">%</span>
                  </div>
                ) : (
                  <MoneyInput value={discount} onChange={setDiscount} />
                )}
              </div>
              <Segmented size="sm" options={[{ id: 'percent', label: '%' }, { id: 'amount', label: currency() }]} value={discountType} onChange={(v) => { setDiscountType(v); setDiscount(''); }} />
            </div>
            <div className="summary">
              <div className="summary-row"><span>{t('Jami ({n} {u})', { n: itemsCount, u: unitLabel('dona') })}</span><strong>{som(subtotal)}</strong></div>
              {discountAmount > 0 && <div className="summary-row"><span>{t('Chegirma')}</span><strong className="text-danger">−{som(discountAmount)}</strong></div>}
              <div className="summary-row total"><span>{t("To'lov")}</span><strong>{som(total)}</strong></div>
            </div>
            <button type="button" className="btn btn-primary btn-lg btn-block" disabled={!cart.length} onClick={openPayment}>
              {t("To'lovga o'tish")}
            </button>
          </div>
        </aside>
      </div>

      {picking && (
        <CustomerPicker onClose={() => setPicking(false)} onSelect={(c) => { setCustomer(c); setPicking(false); }} />
      )}
      {paying && (
        <PaymentModal
          total={total}
          subtotal={subtotal}
          customer={customer}
          items={cart}
          discount={discountType === 'percent' ? Math.min(discountValue, 100) : discountAmount}
          discountType={discountType}
          allowDebt={settings.allowDebt !== 'false'}
          onClose={() => setPaying(false)}
          onStale={() => { setPaying(false); refreshCart(); }}
          onDone={finish}
        />
      )}
    </div>
  );
}
