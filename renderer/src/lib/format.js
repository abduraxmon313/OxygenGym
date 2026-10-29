const NBSP = '\u00a0';
const pad = (n) => String(n).padStart(2, '0');

const MONTHS = ['yanvar', 'fevral', 'mart', 'aprel', 'may', 'iyun', 'iyul', 'avgust', 'sentabr', 'oktabr', 'noyabr', 'dekabr'];
const WEEKDAYS = ['yakshanba', 'dushanba', 'seshanba', 'chorshanba', 'payshanba', 'juma', 'shanba'];

export function money(value) {
  const n = Math.round(Number(value) || 0);
  const s = Math.abs(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, NBSP);
  return n < 0 ? `−${s}` : s;
}

export const som = (value) => `${money(value)}${NBSP}so'm`;

export function signedSom(value) {
  const n = Math.round(Number(value) || 0);
  return `${n > 0 ? '+' : ''}${som(n)}`;
}

export function compactMoney(value) {
  const n = Number(value) || 0;
  if (Math.abs(n) >= 1e9) return `${(n / 1e9).toFixed(1)} mlrd`;
  if (Math.abs(n) >= 1e6) return `${(n / 1e6).toFixed(1)} mln`;
  if (Math.abs(n) >= 1e3) return `${Math.round(n / 1e3)} ming`;
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
  return `${d.getDate()}-${MONTHS[d.getMonth()]}, ${d.getFullYear()} · ${WEEKDAYS[d.getDay()]}`;
}

export function shortDay(iso) {
  const d = parse(iso);
  return d ? `${d.getDate()} ${MONTHS[d.getMonth()].slice(0, 3)}` : '';
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

export const DATE_PRESETS = [
  { id: 'today', label: 'Bugun', range: () => [isoDate(), isoDate()] },
  { id: 'week', label: '7 kun', range: () => [daysAgo(6), isoDate()] },
  { id: 'month', label: 'Shu oy', range: () => monthRange(0) },
  { id: 'prev', label: "O'tgan oy", range: () => monthRange(-1) },
];

export const MONEY_METHODS = [
  { id: 'cash', label: 'Naqd' },
  { id: 'card', label: 'Karta' },
  { id: 'click', label: 'Click' },
  { id: 'payme', label: 'Payme' },
];

export const PAYMENT_LABELS = {
  cash: 'Naqd',
  card: 'Karta',
  click: 'Click',
  payme: 'Payme',
  balance: 'Mijoz hisobidan',
  debt: 'Qarzga',
  mixed: 'Aralash',
};

export const TX_LABELS = {
  deposit: "To'lov qabul qilindi",
  withdraw: 'Pul qaytarildi',
  sale: 'Xarid',
  refund: 'Qaytarish',
  adjustment: 'Tuzatish',
};

export function methodsText(methods) {
  if (!methods) return '—';
  const unique = Array.from(new Set(String(methods).split(',')));
  return unique.map((m) => PAYMENT_LABELS[m] || m).join(' + ');
}

export function productMeta(p) {
  return [p.brand, p.weight, p.flavor].filter(Boolean).join(' · ');
}

export function categoryLabel(p) {
  if (!p.category_name) return 'Kategoriyasiz';
  return p.parent_category_name ? `${p.parent_category_name} / ${p.category_name}` : p.category_name;
}

export function initials(name) {
  return String(name || '?').trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
}

export function balanceState(balance) {
  const b = Math.round(Number(balance) || 0);
  if (b > 0) return { tone: 'success', cls: 'amount-pos', label: 'Avans', amount: b };
  if (b < 0) return { tone: 'danger', cls: 'amount-neg', label: 'Qarz', amount: -b };
  return { tone: 'neutral', cls: 'amount-zero', label: 'Hisob nol', amount: 0 };
}

export function fileSize(bytes) {
  if (bytes >= 1048576) return `${(bytes / 1048576).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}
