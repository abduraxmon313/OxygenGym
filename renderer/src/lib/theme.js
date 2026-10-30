import { createContext, useContext } from 'react';

const KEY = 'oxygengym-theme';

export function initialTheme() {
  try {
    return localStorage.getItem(KEY) === 'dark' ? 'dark' : 'light';
  } catch (err) {
    return 'light';
  }
}

export function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  try { localStorage.setItem(KEY, theme); } catch (err) { /* saqlab bo'lmasa ham ishlayveradi */ }
}

export const ThemeContext = createContext({ theme: 'light', setTheme: () => {} });
export const useTheme = () => useContext(ThemeContext);

// Recharts CSS o'zgaruvchilarini o'qiy olmaydi — ranglarni rejimga qarab beramiz
export function chartColors(theme) {
  return theme === 'dark'
    ? { line: '#5b8cff', grid: '#1d2129', tick: '#6b7280', cursor: '#2e333d' }
    : { line: '#2f6bff', grid: '#eceef2', tick: '#94a3b8', cursor: '#d1d5db' };
}

export function toastStyle(theme) {
  const dark = theme === 'dark';
  return {
    background: dark ? '#16191f' : '#ffffff',
    color: dark ? '#eceef3' : '#0f172a',
    border: `1px solid ${dark ? '#22262e' : '#e5e7eb'}`,
    borderRadius: 10,
    boxShadow: dark ? '0 16px 32px -8px rgba(0,0,0,.6)' : '0 12px 24px -6px rgba(15,23,42,.12)',
    fontSize: 13.5,
    padding: '10px 14px',
    maxWidth: 420,
  };
}
