import React from 'react';
import { currency } from '../lib/format';

// Katta summalarni o'qishga qulay: 1 045 500 ko'rinishida yoziladi
export default function MoneyInput({ value, onChange, placeholder = '0', suffix, autoFocus, disabled, invalid, inputRef, onKeyDown, className }) {
  const display = value === '' || value === null || value === undefined
    ? ''
    : String(Math.round(Number(value) || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return (
    <div className={`input-group${invalid ? ' is-invalid' : ''}${className ? ` ${className}` : ''}`}>
      <input
        ref={inputRef}
        className="input tnum"
        inputMode="numeric"
        value={display}
        placeholder={placeholder}
        autoFocus={autoFocus}
        disabled={disabled}
        onKeyDown={onKeyDown}
        onFocus={(e) => e.target.select()}
        onChange={(e) => {
          const digits = e.target.value.replace(/\D/g, '').slice(0, 13);
          onChange(digits === '' ? '' : Number(digits));
        }}
      />
      {suffix !== false && <span className="input-addon">{suffix || currency()}</span>}
    </div>
  );
}
