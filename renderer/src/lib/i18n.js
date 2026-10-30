import { createContext, useContext } from 'react';
import en from '../locales/en';
import ru from '../locales/ru';

// Kalit — o'zbekcha matn. Tarjima topilmasa, o'zbekchasi ko'rsatiladi.
// {nom} — o'zgaruvchi: t('{n} ta chek', { n: 5 })
const DICTS = { uz: {}, en, ru };
const KEY = 'oxygengym-lang';

export const LANGUAGES = [
  { id: 'uz', short: 'UZ', label: "O'zbekcha" },
  { id: 'ru', short: 'RU', label: 'Русский' },
  { id: 'en', short: 'EN', label: 'English' },
];

let current = 'uz';

export function initialLanguage() {
  try {
    const v = localStorage.getItem(KEY);
    return DICTS[v] ? v : 'uz';
  } catch (err) {
    return 'uz';
  }
}

export function setLanguage(lang) {
  current = DICTS[lang] ? lang : 'uz';
  document.documentElement.setAttribute('lang', current);
  try { localStorage.setItem(KEY, current); } catch (err) { /* e'tiborsiz */ }
}

export function getLanguage() {
  return current;
}

export function t(text, vars) {
  const dict = DICTS[current];
  const s = dict && typeof dict[text] === 'string' ? dict[text] : text;
  if (!vars) return s;
  return s.replace(/\{(\w+)\}/g, (m, k) => (vars[k] === undefined || vars[k] === null ? m : String(vars[k])));
}

export const LangContext = createContext({ lang: 'uz', setLang: () => {} });
export const useLang = () => useContext(LangContext);
