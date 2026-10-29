import React, { useState, useEffect, useRef } from 'react';
import { toast } from 'react-hot-toast';
import BarcodeScanner from '../components/BarcodeScanner';
import Modal from '../components/Modal';

function formatMoney(n) {
  return Number(n || 0).toLocaleString('uz-UZ');
}

export default function POS({ onDataChange }) {
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [search, setSearch] = useState('');
  const [showScanner, setShowScanner] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [discount, setDiscount] = useState(0);
  const [discountType, setDiscountType] = useState('percent');
  const [customer, setCustomer] = useState(null);
  const [customers, setCustomers] = useState([]);
  const [showCustomerSearch, setShowCustomerSearch] = useState(false);
  const [customerSearch, setCustomerSearch] = useState('');
  const [showPayment, setShowPayment] = useState(false);
  const searchRef = useRef(null);

  useEffect(() => { loadProducts(); }, []);

  async function loadProducts() {
    if (!window.api) return;
    const data = await window.api.products.getAll();
    setProducts(data || []);
  }

  async function handleBarcodeScan(barcode) {
    setShowScanner(false);
    if (!window.api) return;
    const product = await window.api.products.getByBarcode(barcode);
    if (product) {
      addToCart(product);
      toast.success(`✅ ${product.name} qo'shildi`);
    } else {
      toast.error(`❌ Barcode topilmadi: ${barcode}`);
    }
  }

  function addToCart(product) {
    if (product.stock <= 0) {
      toast.error(`❌ ${product.name} — omborda qolmagan!`);
      return;
    }
    setCart(prev => {
      const existing = prev.find(i => i.product_id === product.id);
      if (existing) {
        if (existing.quantity >= product.stock) {
          toast.error(`⚠️ Omborda faqat ${product.stock} dona bor`);
          return prev;
        }
        return prev.map(i => i.product_id === product.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, {
        product_id: product.id,
        name: product.name,
        price: product.sell_price,
        stock: product.stock,
        quantity: 1,
      }];
    });
  }

  function updateQty(productId, delta) {
    setCart(prev => prev.map(i => {
      if (i.product_id !== productId) return i;
      const newQty = i.quantity + delta;
      if (newQty <= 0) return null;
      if (newQty > i.stock) { toast.error(`Omborda faqat ${i.stock} dona bor`); return i; }
      return { ...i, quantity: newQty };
    }).filter(Boolean));
  }

  function removeFromCart(productId) {
    setCart(prev => prev.filter(i => i.product_id !== productId));
  }

  const subtotal = cart.reduce((s, i) => s + i.price * i.quantity, 0);
  const discountAmount = discountType === 'percent' ? subtotal * (discount / 100) : discount;
  const finalTotal = Math.max(0, subtotal - discountAmount);

  // Loyalty points
  const settings = { loyaltyPointsPerUnit: 1000 };
  const pointsEarned = Math.floor(finalTotal / settings.loyaltyPointsPerUnit);

  async function completeSale() {
    if (cart.length === 0) return toast.error('Savatcha bo\'sh!');
    if (!window.api) return toast.error('API ulanmagan');

    try {
      const result = await window.api.sales.create({
        items: cart.map(i => ({ product_id: i.product_id, quantity: i.quantity, price: i.price })),
        total: subtotal,
        discount: discount,
        discount_type: discountType,
        final_total: finalTotal,
        payment_method: paymentMethod,
        customer_id: customer?.id || null,
        loyalty_points_earned: pointsEarned,
        loyalty_points_used: 0,
      });

      if (result.success) {
        toast.success(`✅ Sotuv #${result.sale_number} muvaffaqiyatli!`);
        setCart([]);
        setDiscount(0);
        setCustomer(null);
        setShowPayment(false);
        loadProducts();
        if (onDataChange) onDataChange();
      }
    } catch (err) {
      toast.error('Xatolik: ' + err.message);
    }
  }

  async function searchCustomers(q) {
    if (!window.api || q.length < 1) return;
    const results = await window.api.customers.search(q);
    setCustomers(results || []);
  }

  const filtered = search
    ? products.filter(p => p.name.toLowerCase().includes(search.toLowerCase()) || (p.barcode && p.barcode.includes(search)))
    : products;

  return (
    <div className="pos-layout">
      {/* Left: Products */}
      <div className="pos-products">
        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          <div className="search-bar" style={{ flex: 1 }}>
            <span className="search-icon">🔍</span>
            <input
              ref={searchRef}
              placeholder="Mahsulot qidirish yoki barcode..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && search) {
                  const found = products.find(p => p.barcode === search);
                  if (found) { addToCart(found); setSearch(''); toast.success(`✅ ${found.name}`); }
                }
              }}
              autoFocus
            />
          </div>
          <button className="btn btn-primary" onClick={() => setShowScanner(true)}>
            📷 Kamera
          </button>
        </div>

        <div className="product-grid">
          {filtered.map(p => (
            <div key={p.id} className="product-card" onClick={() => { addToCart(p); }}>
              <div className="emoji">
                {p.stock <= 0 ? '❌' : p.stock <= (p.min_stock || 3) ? '⚠️' : '📦'}
              </div>
              <div className="name" title={p.name}>{p.name}</div>
              <div className="price">{formatMoney(p.sell_price)}</div>
              <div className="stock" style={{ color: p.stock <= 0 ? 'var(--danger)' : p.stock <= (p.min_stock || 3) ? 'var(--warning)' : 'var(--text-muted)' }}>
                {p.stock} dona
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="empty-state" style={{ gridColumn: '1/-1' }}>
              <span className="icon">📦</span>
              <p>Mahsulot topilmadi</p>
            </div>
          )}
        </div>
      </div>

      {/* Right: Cart */}
      <div className="pos-cart">
        <div className="pos-cart-header">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>🛒 Savatcha ({cart.length})</span>
            {cart.length > 0 && (
              <button className="btn btn-outline btn-sm" onClick={() => setCart([])}>🗑️ Tozalash</button>
            )}
          </div>
          {/* Customer */}
          <div style={{ marginTop: 8, fontSize: 13 }}>
            {customer ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--accent-light)', padding: '6px 10px', borderRadius: 8 }}>
                <span>👤 {customer.name} ({customer.loyalty_tier} — {customer.loyalty_points} ball)</span>
                <button style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer' }} onClick={() => setCustomer(null)}>✕</button>
              </div>
            ) : (
              <button className="btn btn-outline btn-sm" style={{ width: '100%' }} onClick={() => setShowCustomerSearch(true)}>
                👤 Mijoz tanlash
              </button>
            )}
          </div>
        </div>

        <div className="pos-cart-items">
          {cart.length === 0 ? (
            <div className="empty-state" style={{ padding: 30 }}>
              <span className="icon">🛒</span>
              <p>Savatcha bo'sh</p>
              <p style={{ fontSize: 12, marginTop: 4 }}>Mahsulotni bosing yoki skanerlang</p>
            </div>
          ) : (
            cart.map(item => (
              <div key={item.product_id} className="cart-item">
                <div className="cart-item-info">
                  <div className="cart-item-name">{item.name}</div>
                  <div className="cart-item-price">{formatMoney(item.price)} × {item.quantity} = {formatMoney(item.price * item.quantity)}</div>
                </div>
                <div className="cart-item-qty">
                  <button onClick={() => updateQty(item.product_id, -1)}>−</button>
                  <span>{item.quantity}</span>
                  <button onClick={() => updateQty(item.product_id, 1)}>+</button>
                </div>
                <button style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', fontSize: 18 }} onClick={() => removeFromCart(item.product_id)}>🗑️</button>
              </div>
            ))
          )}
        </div>

        <div className="pos-cart-total">
          <div className="total-row">
            <span>Jami:</span>
            <span>{formatMoney(subtotal)} so'm</span>
          </div>
          {discount > 0 && (
            <div className="total-row" style={{ color: 'var(--danger)' }}>
              <span>Chegirma:</span>
              <span>−{formatMoney(discountAmount)} so'm</span>
            </div>
          )}
          <div className="total-row final">
            <span>YAKUNIY:</span>
            <span>{formatMoney(finalTotal)} so'm</span>
          </div>
          {pointsEarned > 0 && customer && (
            <div style={{ fontSize: 12, color: 'var(--accent)', textAlign: 'right', marginTop: 4 }}>
              +{pointsEarned} loyalty ball
            </div>
          )}
          <button
            className="btn btn-success btn-lg"
            style={{ width: '100%', marginTop: 12, fontSize: 18, padding: '14px' }}
            onClick={() => cart.length > 0 && setShowPayment(true)}
            disabled={cart.length === 0}
          >
            💳 To'lash ({formatMoney(finalTotal)} so'm)
          </button>
        </div>
      </div>

      {/* Payment Modal */}
      {showPayment && (
        <Modal title="💳 To'lov" onClose={() => setShowPayment(false)}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-secondary)', marginBottom: 8, display: 'block' }}>To'lov usuli:</label>
            <div className="payment-buttons">
              {[
                { id: 'cash', label: '💵 Naqd' },
                { id: 'card', label: '💳 Karta' },
                { id: 'click', label: '📱 Click' },
                { id: 'payme', label: '📱 Payme' },
                { id: 'mixed', label: '🔄 Aralash' },
              ].map(m => (
                <div key={m.id} className={`payment-btn ${paymentMethod === m.id ? 'active' : ''}`} onClick={() => setPaymentMethod(m.id)}>
                  {m.label}
                </div>
              ))}
            </div>
          </div>

          <div className="grid-2">
            <div className="form-group">
              <label>Chegirma miqdori:</label>
              <input className="form-input" type="number" value={discount} onChange={(e) => setDiscount(Math.max(0, Number(e.target.value)))} />
            </div>
            <div className="form-group">
              <label>Turi:</label>
              <select className="form-input" value={discountType} onChange={(e) => setDiscountType(e.target.value)}>
                <option value="percent">Foiz (%)</option>
                <option value="amount">Summa (so'm)</option>
              </select>
            </div>
          </div>

          <div style={{ background: 'var(--bg-primary)', padding: 16, borderRadius: 'var(--radius-sm)', marginTop: 12 }}>
            <div className="total-row"><span>Jami:</span><span>{formatMoney(subtotal)} so'm</span></div>
            {discount > 0 && <div className="total-row" style={{ color: 'var(--danger)' }}><span>Chegirma:</span><span>−{formatMoney(discountAmount)} so'm</span></div>}
            <div className="total-row final"><span>YAKUNIY:</span><span>{formatMoney(finalTotal)} so'm</span></div>
          </div>

          <div className="modal-footer">
            <button className="btn btn-outline" onClick={() => setShowPayment(false)}>Bekor</button>
            <button className="btn btn-success btn-lg" onClick={completeSale}>
              ✅ Sotishni tasdiqlash
            </button>
          </div>
        </Modal>
      )}

      {/* Camera Scanner Modal */}
      {showScanner && (
        <Modal title="📷 Barcode skanerlash" onClose={() => setShowScanner(false)}>
          <BarcodeScanner onScan={handleBarcodeScan} onClose={() => setShowScanner(false)} />
        </Modal>
      )}

      {/* Customer Search Modal */}
      {showCustomerSearch && (
        <Modal title="👤 Mijoz tanlash" onClose={() => setShowCustomerSearch(false)}>
          <div className="search-bar" style={{ marginBottom: 12 }}>
            <span className="search-icon">🔍</span>
            <input
              placeholder="Ism yoki telefon..."
              value={customerSearch}
              onChange={(e) => { setCustomerSearch(e.target.value); searchCustomers(e.target.value); }}
              autoFocus
            />
          </div>
          {customers.map(c => (
            <div key={c.id}
              style={{ padding: '10px 12px', borderRadius: 8, cursor: 'pointer', border: '1px solid var(--border)', marginBottom: 6, background: 'var(--bg-primary)' }}
              onClick={() => { setCustomer(c); setShowCustomerSearch(false); setCustomerSearch(''); }}
            >
              <div style={{ fontWeight: 600 }}>{c.name}</div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                📞 {c.phone || '—'} | {c.loyalty_tier} | {c.loyalty_points} ball
              </div>
            </div>
          ))}
          {customers.length === 0 && customerSearch && (
            <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 20 }}>Topilmadi</p>
          )}
        </Modal>
      )}
    </div>
  );
}
