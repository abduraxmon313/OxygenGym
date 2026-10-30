import { getLanguage, t } from './i18n';

const NBSP = '\u00a0';
const pad = (n) => String(n).padStart(2, '0');

const MONTHS = {
  uz: ['yanvar', 'fevral', 'mart', 'aprel', 'may', 'iyun', 'iyul', 'avgust', 'sentabr', 'oktabr', 'noyabr', 'dekabr'],
  ru: ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'],
  en: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
};
const MONTHS_SHORT = {
  uz: ['yan', 'fev', 'mar', 'apr', 'may', 'iyn', 'iyl', 'avg', 'sen', 'okt', 'noy', 'dek'],
  ru: ['янв', 'фев', 'мар', 'апр', 'мая', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'],
  en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
};
const WEEKDAYS = {
  uz: ['yakshanba', 'dushanba', 'seshanba', 'chorshanba', 'payshanba', 'juma', 'shanba'],
  ru: ['воскресенье', 'понедельник', 'вторник', 'среда', 'четверг', 'пятница', 'суббота'],
  en: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
};
const CURRENCY = { uz: "so'm", ru: 'сум', en: 'UZS' };

export const currency = () => CURRENCY[getLanguage()] || CURRENCY.uz;

export function money(value) {
  const n = Math.round(Number(value) || 0);
  const s = Math.abs(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, NBSP);
  return n < 0 ? `−${s}` : s;
}

export const som = (value) => `${money(value)}${NBSP}${currency()}`;

export function signedSom(value) {
  const n = Math.round(Number(value) || 0);
  return `${n > 0 ? '+' : ''}${som(n)}`;
}

export function compactMoney(value) {
  const n = Number(value) || 0;
  if (Math.abs(n) >= 1e9) return `${(n / 1e9).toFixed(1)} ${t('mlrd')}`;
  if (Math.abs(n) >= 1e6) return `${(n / 1e6).toFixed(1)} ${t('mln')}`;
  if (Math.abs(n) >= 1e3) return `${Math.round(n / 1e3)} ${t('ming')}`;
  return String(Math.round(n));
}

function parse(value) {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(String(value).replace(' ', 'T'));
  return Number.isNaN(d.getTime()) ? null : d;
}

export function fmtDate(value) {
  const d = parse(value);
  return d ? `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}` : '—';
}

export function fmtTime(value) {
  const d = parse(value);
  return d ? `${pad(d.getHours())}:${pad(d.getMinutes())}` : '';
}

export function fmtDateTime(value) {
  const d = parse(value);
  return d ? `${fmtDate(d)}, ${fmtTime(d)}` : '—';
}

export function longDate(d = new Date()) {
  const lang = getLanguage();
  const month = MONTHS[lang][d.getMonth()];
  const day = WEEKDAYS[lang][d.getDay()];
  if (lang === 'en') return `${day}, ${month} ${d.getDate()}, ${d.getFullYear()}`;
  if (lang === 'ru') return `${d.getDate()} ${month} ${d.getFullYear()} · ${day}`;
  return `${d.getDate()}-${month}, ${d.getFullYear()} · ${day}`;
}

export function shortDay(iso) {
  const d = parse(iso);
  if (!d) return '';
  const m = MONTHS_SHORT[getLanguage()][d.getMonth()];
  return getLanguage() === 'en' ? `${m} ${d.getDate()}` : `${d.getDate()} ${m}`;
}

export function isoDate(d = new Date()) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return isoDate(d);
}

export function monthRange(offset = 0) {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() + offset, 1);
  const end = new Date(now.getFullYear(), now.getMonth() + offset + 1, 0);
  return [isoDate(start), isoDate(end)];
}

export const datePresets = () => [
  { id: 'today', label: t('Bugun'), range: () => [isoDate(), isoDate()] },
  { id: 'week', label: t('7 kun'), range: () => [daysAgo(6), isoDate()] },
  { id: 'month', label: t('Shu oy'), range: () => monthRange(0) },
  { id: 'prev', label: t("O'tgan oy"), range: () => monthRange(-1) },
];

export const moneyMethods = () => [
  { id: 'cash', label: t('Naqd') },
  { id: 'card', label: t('Karta') },
  { id: 'click', label: 'Click' },
  { id: 'payme', label: 'Payme' },
];

export function paymentLabel(method) {
  const map = {
    cash: t('Naqd'),
    card: t('Karta'),
    click: 'Click',
    payme: 'Payme',
    balance: t('Mijoz hisobidan'),
    debt: t('Qarzga'),
    mixed: t('Aralash'),
  };
  return map[method] || method;
}

export function txLabel(type) {
  const map = {
    deposit: t("To'lov qabul qilindi"),
    withdraw: t('Pul qaytarildi'),
    sale: t('Xarid'),
    refund: t('Qaytarish'),
    adjustment: t('Tuzatish'),
  };
  return map[type] || type;
}

export const UNITS = ['dona', 'quti', 'paket', 'shisha', 'kg', 'litr'];
export function unitLabel(u) {
  const map = { dona: t('dona'), quti: t('quti'), paket: t('paket'), shisha: t('shisha'), kg: t('kg'), litr: t('litr') };
  return map[u || 'dona'] || u;
}

export function methodsText(methods) {
  if (!methods) return '—';
  const unique = Array.from(new Set(String(methods).split(',')));
  return unique.map(paymentLabel).join(' + ');
}

export function productMeta(p) {
  return [p.brand, p.weight, p.flavor].filter(Boolean).join(' · ');
}

// Kategoriya nomlari bazada o'zbekcha saqlanadi — ko'rsatishda tarjima qilinadi
export const catName = (name) => (name ? t(name) : name);

export function categoryLabel(p) {
  if (!p.category_name) return t('Kategoriyasiz');
  return p.parent_category_name ? `${catName(p.parent_category_name)} / ${catName(p.category_name)}` : catName(p.category_name);
}

export function initials(name) {
  return String(name || '?').trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
}

export function balanceState(balance) {
  const b = Math.round(Number(balance) || 0);
  if (b > 0) return { tone: 'success', cls: 'amount-pos', kind: 'advance', label: t('Avans'), amount: b };
  if (b < 0) return { tone: 'danger', cls: 'amount-neg', kind: 'debt', label: t('Qarz'), amount: -b };
  return { tone: 'neutral', cls: 'amount-zero', kind: 'zero', label: t('Hisob nol'), amount: 0 };
}

// Telefon: bazada "+998 33 313 44 22", formada faqat 9 ta raqam
export function phoneDigits(v) {
  let d = String(v || '').replace(/\D/g, '');
  if (d.length >= 12 && d.startsWith('998')) d = d.slice(3);
  return d.slice(0, 9);
}

export function groupPhone(d) {
  const parts = [d.slice(0, 2), d.slice(2, 5), d.slice(5, 7), d.slice(7, 9)].filter(Boolean);
  return parts.join(' ');
}
