import React from 'react';
import { Search } from 'lucide-react';
import { DATE_PRESETS } from '../lib/format';

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

export function StatCard({ label, value, unit, hint, icon: Icon, tone = 'neutral', onClick }) {
  return (
    <div className={`stat${onClick ? ' clickable' : ''}`} onClick={onClick} role={onClick ? 'button' : undefined}>
      <div className="stat-top">
        <span className="stat-label">{label}</span>
        {Icon && <span className={`stat-icon ${tone}`}><Icon size={17} strokeWidth={2} /></span>}
      </div>
      <div className="stat-value" title={typeof value === 'string' ? value : undefined}>
        {value}{unit && <small>{unit}</small>}
      </div>
      {hint && <div className="stat-hint">{hint}</div>}
    </div>
  );
}

export function Pill({ tone = 'neutral', dot = true, children }) {
  return <span className={`pill pill-${tone}${dot ? '' : ' no-dot'}`}>{children}</span>;
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

export function SearchInput({ value, onChange, placeholder = 'Qidirish…', autoFocus, inputRef, onKeyDown, size }) {
  return (
    <div className={`search${size === 'lg' ? ' lg' : ''}`}>
      <Search size={size === 'lg' ? 18 : 16} />
      <input
        ref={inputRef}
        className="input"
        value={value}
        placeholder={placeholder}
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
      {tabs.map((t) => (
        <button key={t.id} type="button" className={`tab${value === t.id ? ' active' : ''}`} onClick={() => onChange(t.id)}>
          {t.label}
          {t.count !== undefined && <span className="tab-count">{t.count}</span>}
        </button>
      ))}
    </div>
  );
}

export function DateRange({ from, to, onChange }) {
  const active = DATE_PRESETS.find((p) => {
    const [a, b] = p.range();
    return a === from && b === to;
  });
  return (
    <div className="row" style={{ gap: 10, flexWrap: 'wrap' }}>
      <Segmented
        options={DATE_PRESETS.map((p) => ({ id: p.id, label: p.label }))}
        value={active ? active.id : null}
        onChange={(id) => {
          const preset = DATE_PRESETS.find((p) => p.id === id);
          const [a, b] = preset.range();
          onChange(a, b);
        }}
      />
      <div className="row" style={{ gap: 6 }}>
        <input className="input" type="date" value={from} max={to} onChange={(e) => onChange(e.target.value, to)} style={{ width: 150 }} />
        <span className="muted">—</span>
        <input className="input" type="date" value={to} min={from} onChange={(e) => onChange(from, e.target.value)} style={{ width: 150 }} />
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

export function CategorySelect({ categories, value, onChange, emptyLabel = 'Tanlanmagan', className = 'input' }) {
  return (
    <select className={className} value={value || ''} onChange={(e) => onChange(e.target.value ? Number(e.target.value) : '')}>
      <option value="">{emptyLabel}</option>
      {categories.map((c) => (
        <optgroup key={c.id} label={c.name}>
          <option value={c.id}>{c.name} — umumiy</option>
          {c.children.map((ch) => <option key={ch.id} value={ch.id}>{ch.name}</option>)}
        </optgroup>
      ))}
    </select>
  );
}
