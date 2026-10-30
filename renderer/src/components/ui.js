import React from 'react';
import { Package, Search } from 'lucide-react';
import { catName, datePresets, groupPhone, phoneDigits } from '../lib/format';
import { t } from '../lib/i18n';

// Rasm CSS fon sifatida chiziladi: o'lchami qat'iy, matn ustiga chiqmaydi, yuklanish kechikmaydi
const bg = (src) => ({ backgroundImage: `url("${src}")` });

export function ProductThumb({ product, size }) {
  const px = size === 'sm' ? 15 : size === 'lg' ? 22 : 18;
  const img = product && product.image;
  return (
    <div className={`thumb${size ? ` ${size}` : ''}${img ? ' has-image' : ''}`} style={img ? bg(img) : undefined}>
      {!img && <Package size={px} strokeWidth={1.6} />}
    </div>
  );
}

export function ProductMedia({ product, className = 'tile-media' }) {
  const img = product && product.image;
  return (
    <div className={`${className}${img ? ' has-image' : ''}`} style={img ? bg(img) : undefined}>
      {!img && <Package size={28} strokeWidth={1.4} />}
    </div>
  );
}

export function PageHeader({ title, subtitle, actions }) {
  return (
    <header className="topbar">
      <div className="topbar-title">
        <h1>{title}</h1>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {actions && <div className="topbar-actions">{actions}</div>}
    </header>
  );
}

export function StatCard({ label, value, unit, hint, icon: Icon, tone = 'neutral', onClick, title, children }) {
  return (
    <div className={`stat${onClick ? ' clickable' : ''}`} onClick={onClick} role={onClick ? 'button' : undefined} title={title}>
      <div className="stat-top">
        <span className="stat-label">{label}</span>
        {Icon && <span className={`stat-icon ${tone}`}><Icon size={17} strokeWidth={2} /></span>}
      </div>
      <div className="stat-value" title={typeof value === 'string' ? value : undefined}>
        {value}{unit && <small>{unit}</small>}
      </div>
      {hint && <div className="stat-hint">{hint}</div>}
      {children}
    </div>
  );
}

export function Pill({ tone = 'neutral', dot = true, children }) {
  return <span className={`pill pill-${tone}${dot ? '' : ' no-dot'}`}>{children}</span>;
}

export function SaleStatus({ sale }) {
  if (sale.status !== 'completed') return <Pill tone="danger">{t('Qaytarilgan')}</Pill>;
  if (sale.returned_amount > 0) return <Pill tone="warning">{t('Qisman qaytarilgan')}</Pill>;
  return <Pill tone="success">{t('Yakunlangan')}</Pill>;
}

export function EmptyState({ icon: Icon, title, text, action }) {
  return (
    <div className="empty">
      {Icon && <div className="empty-icon"><Icon size={20} /></div>}
      <div className="empty-title">{title}</div>
      {text && <div className="empty-text">{text}</div>}
      {action}
    </div>
  );
}

export function SearchInput({ value, onChange, placeholder, autoFocus, inputRef, onKeyDown, size }) {
  return (
    <div className={`search${size === 'lg' ? ' lg' : ''}`}>
      <Search size={size === 'lg' ? 18 : 16} />
      <input
        ref={inputRef}
        className="input"
        value={value}
        placeholder={placeholder || t('Qidirish…')}
        autoFocus={autoFocus}
        onKeyDown={onKeyDown}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

export function Segmented({ options, value, onChange, size }) {
  return (
    <div className={`segmented${size === 'sm' ? ' sm' : ''}`}>
      {options.map((o) => (
        <button key={o.id} type="button" className={value === o.id ? 'active' : ''} onClick={() => onChange(o.id)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Tabs({ tabs, value, onChange }) {
  return (
    <div className="tabs">
      {tabs.map((tab) => (
        <button key={tab.id} type="button" className={`tab${value === tab.id ? ' active' : ''}`} onClick={() => onChange(tab.id)}>
          {tab.label}
          {tab.count !== undefined && <span className="tab-count">{tab.count}</span>}
        </button>
      ))}
    </div>
  );
}

export function DateRange({ from, to, onChange }) {
  const presets = datePresets();
  const active = presets.find((p) => {
    const [a, b] = p.range();
    return a === from && b === to;
  });
  return (
    <div className="row" style={{ gap: 10, flexWrap: 'wrap' }}>
      <Segmented
        options={presets.map((p) => ({ id: p.id, label: p.label }))}
        value={active ? active.id : null}
        onChange={(id) => {
          const preset = presets.find((p) => p.id === id);
          const [a, b] = preset.range();
          onChange(a, b);
        }}
      />
      <div className="row" style={{ gap: 6 }}>
        <input className="input" type="date" value={from} max={to} onChange={(e) => e.target.value && onChange(e.target.value, to)} style={{ width: 148 }} />
        <span className="muted">—</span>
        <input className="input" type="date" value={to} min={from} onChange={(e) => e.target.value && onChange(from, e.target.value)} style={{ width: 148 }} />
      </div>
    </div>
  );
}

export function Field({ label, required, hint, error, children, className }) {
  return (
    <div className={`field${className ? ` ${className}` : ''}`}>
      {label && <label>{label}{required && <span className="req">*</span>}</label>}
      {children}
      {error ? <span className="field-error">{error}</span> : hint && <span className="field-hint">{hint}</span>}
    </div>
  );
}

export function CategorySelect({ categories, value, onChange, emptyLabel, className = 'input' }) {
  return (
    <select className={className} value={value || ''} onChange={(e) => onChange(e.target.value ? Number(e.target.value) : '')}>
      <option value="">{emptyLabel || t('Tanlanmagan')}</option>
      {categories.map((c) => (
        <optgroup key={c.id} label={catName(c.name)}>
          <option value={c.id}>{t('{name} — umumiy', { name: catName(c.name) })}</option>
          {c.children.map((ch) => <option key={ch.id} value={ch.id}>{catName(ch.name)}</option>)}
        </optgroup>
      ))}
    </select>
  );
}

// +998 o'zgarmas; foydalanuvchi faqat 9 ta raqam yozadi: 33 313 44 22
export function PhoneInput({ value, onChange, autoFocus, invalid }) {
  const digits = phoneDigits(value);
  return (
    <div className={`phone-input${invalid ? ' is-invalid' : ''}`}>
      <span className="prefix">+998</span>
      <input
        inputMode="numeric"
        autoComplete="off"
        value={groupPhone(digits)}
        placeholder="33 313 44 22"
        autoFocus={autoFocus}
        onChange={(e) => {
          const raw = e.target.value.replace(/\D/g, '');
          // To'liq raqam (998 bilan) joylansa ham to'g'ri ishlaydi
          onChange(phoneDigits(raw.length > 9 && raw.startsWith('998') ? raw : raw.slice(0, 9)));
        }}
      />
    </div>
  );
}
