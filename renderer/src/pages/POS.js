import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'react-hot-toast';
import { Minus, PackageSearch, Plus, ShoppingCart, Trash2, UserRound, X } from 'lucide-react';
import { EmptyState, Pill, SearchInput, Segmented } from '../components/ui';
import MoneyInput from '../components/MoneyInput';
import CustomerPicker from '../components/CustomerPicker';
import PaymentModal from '../components/PaymentModal';
import { useConfirm } from '../components/ConfirmDialog';
import { balanceState, categoryLabel, initials, money, productMeta, som } from '../lib/format';

function stockTone(p) {
  if (p.stock <= 0) return 'danger';
  if (p.stock <= p.min_stock) return 'warning';
  return 'neutral';
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
    } catch (err) {
      toast.error(err.message);
    }
  }, []);
  useEffect(() => { load(); }, [load]);

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
    if (p.stock <= 0) { toast.error(`"${p.name}" omborda qolmagan`); return; }
    const current = inCart[p.id] || 0;
    if (current >= p.stock) { toast.error(`Omborda faqat ${p.stock} ${p.unit || 'dona'} bor`); return; }
    setCart((prev) => (current
      ? prev.map((i) => (i.product_id === p.id ? { ...i, quantity: i.quantity + 1 } : i))
      : [...prev, { product_id: p.id, name: p.name, meta: productMeta(p), price: p.sell_price, stock: p.stock, unit: p.unit || 'dona', quantity: 1 }]));
  }

  function setQty(id, raw) {
    const item = cart.find((i) => i.product_id === id);
    if (!item) return;
    let qty = Math.floor(Number(raw) || 0);
    if (qty > item.stock) { toast.error(`Omborda faqat ${item.stock} ${item.unit} bor`); qty = item.stock; }
    if (qty < 1) qty = 1;
    setCart((prev) => prev.map((i) => (i.product_id === id ? { ...i, quantity: qty } : i)));
  }

  const remove = (id) => setCart((prev) => prev.filter((i) => i.product_id !== id));

  async function clearCart() {
    if (!cart.length) return;
    const ok = await confirm({ title: 'Savatchani tozalash', message: "Savatchadagi barcha mahsulotlar olib tashlanadi.", confirmText: 'Tozalash', danger: true });
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
    toast.success(`Sotuv ${result.sale_number} yakunlandi · ${som(result.final_total)}`);
    if (result.change > 0) toast(`Qaytim: ${som(result.change)}`, { duration: 10000, icon: '↩' });
    if (result.debt > 0) toast(`Qarzga yozildi: ${som(result.debt)}`, { duration: 8000, icon: '!' });
    load();
    refreshAlerts();
    if (searchRef.current) searchRef.current.focus();
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
                placeholder="Mahsulot nomi, brend yoki kod — Enter qo'shadi"
                autoFocus
              />
              <span className="secondary nowrap" style={{ fontSize: 13 }}>{visible.length} ta mahsulot</span>
            </div>
            <div className="chips">
              <button type="button" className={`chip${category === 'all' ? ' active' : ''}`} onClick={() => setCategory('all')}>
                Barchasi <span className="count">{products.length}</span>
              </button>
              {chips.map((c) => (
                <button key={c.id} type="button" className={`chip${category === c.id ? ' active' : ''}`} onClick={() => setCategory(c.id)}>
                  {c.name} <span className="count">{c.product_count}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="pos-grid-wrap">
            {visible.length === 0 ? (
              <EmptyState
                icon={PackageSearch}
                title={products.length ? 'Mahsulot topilmadi' : "Hali mahsulot qo'shilmagan"}
                text={products.length ? "Qidiruv so'zini yoki kategoriyani o'zgartiring" : '"Mahsulotlar" bo\'limida mahsulot yarating'}
              />
            ) : (
              <div className="product-grid">
                {visible.map((p) => (
                  <button key={p.id} type="button" className="tile" onClick={() => add(p)} disabled={p.stock <= 0}>
                    {inCart[p.id] > 0 && <span className="tile-qty">{inCart[p.id]}</span>}
                    <span className="tile-cat">{categoryLabel(p)}</span>
                    <span className="tile-name">{p.name}</span>
                    <span className="tile-meta">{productMeta(p) || `Kod ${p.code}`}</span>
                    <span className="tile-foot">
                      <span className="tile-price">{money(p.sell_price)}</span>
                      <Pill tone={stockTone(p)}>{p.stock <= 0 ? 'Tugagan' : `${p.stock} ${p.unit || 'dona'}`}</Pill>
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </section>

        <aside className="pos-cart">
          <div className="cart-head">
            <div className="row-between">
              <div className="row"><ShoppingCart size={18} /><span className="strong">Savatcha</span>{itemsCount > 0 && <Pill tone="primary" dot={false}>{itemsCount}</Pill>}</div>
              <button type="button" className="btn btn-ghost btn-sm" onClick={clearCart} disabled={!cart.length}>Tozalash</button>
            </div>

            {customer ? (
              <div className="cart-customer">
                <div className="avatar">{initials(customer.name)}</div>
                <div className="info">
                  <div className="name">{customer.name}</div>
                  <div className="meta">
                    {cb.amount ? <span className={cb.cls}>{cb.label}: {som(cb.amount)}</span> : 'Hisob nol'}
                  </div>
                </div>
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => setPicking(true)}>O'zgartirish</button>
                <button type="button" className="btn btn-ghost btn-icon btn-sm" onClick={() => setCustomer(null)} aria-label="Mijozni olib tashlash"><X size={16} /></button>
              </div>
            ) : (
              <div className="cart-customer empty-state">
                <div className="avatar neutral"><UserRound size={16} /></div>
                <div className="info">
                  <div className="name">Mijozsiz sotuv</div>
                  <div className="meta">Avans yoki qarz uchun mijoz tanlang</div>
                </div>
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => setPicking(true)}>Tanlash</button>
              </div>
            )}
          </div>

          <div className="cart-lines">
            {cart.length === 0 ? (
              <EmptyState icon={ShoppingCart} title="Savatcha bo'sh" text="Mahsulot kartochkasini bosing yoki qidiruvda Enter bosing" />
            ) : cart.map((i) => (
              <div key={i.product_id} className="cart-line">
                <div>
                  <div className="name">{i.name}</div>
                  {i.meta && <div className="meta">{i.meta}</div>}
                </div>
                <div className="line-total">{money(i.price * i.quantity)}</div>
                <div className="controls">
                  <div className="qty">
                    <button type="button" onClick={() => (i.quantity > 1 ? setQty(i.product_id, i.quantity - 1) : remove(i.product_id))} aria-label="Kamaytirish"><Minus size={14} /></button>
                    <input value={i.quantity} onChange={(e) => setQty(i.product_id, e.target.value)} inputMode="numeric" />
                    <button type="button" onClick={() => setQty(i.product_id, i.quantity + 1)} aria-label="Ko'paytirish"><Plus size={14} /></button>
                  </div>
                  <span className="unit">{money(i.price)} × {i.quantity}</span>
                  <button type="button" className="btn btn-ghost btn-icon btn-sm" onClick={() => remove(i.product_id)} aria-label="O'chirish"><Trash2 size={15} /></button>
                </div>
              </div>
            ))}
          </div>

          <div className="cart-foot">
            <div className="discount-row">
              <span className="secondary" style={{ fontSize: 13, width: 70 }}>Chegirma</span>
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
              <Segmented size="sm" options={[{ id: 'percent', label: '%' }, { id: 'amount', label: "so'm" }]} value={discountType} onChange={(v) => { setDiscountType(v); setDiscount(''); }} />
            </div>
            <div className="summary">
              <div className="summary-row"><span>Jami ({itemsCount} dona)</span><strong>{som(subtotal)}</strong></div>
              {discountAmount > 0 && <div className="summary-row"><span>Chegirma</span><strong className="text-danger">−{som(discountAmount)}</strong></div>}
              <div className="summary-row total"><span>To'lov</span><strong>{som(total)}</strong></div>
            </div>
            <button type="button" className="btn btn-primary btn-lg btn-block" disabled={!cart.length} onClick={() => setPaying(true)}>
              To'lovga o'tish
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
          onDone={finish}
        />
      )}
    </div>
  );
}
