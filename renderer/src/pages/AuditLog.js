import React, { useCallback, useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { ScrollText } from 'lucide-react';
import { DateRange, EmptyState, PageHeader, Pill, SearchInput } from '../components/ui';
import { daysAgo, fmtDateTime, isoDate } from '../lib/format';

const ACTIONS = {
  SALE: { label: 'Sotuv', tone: 'success' },
  REFUND: { label: 'Qaytarish', tone: 'danger' },
  RECEIVE: { label: 'Kirim', tone: 'primary' },
  CREATE: { label: 'Yaratildi', tone: 'primary' },
  UPDATE: { label: 'Tahrirlandi', tone: 'neutral' },
  DELETE: { label: 'Arxivlandi', tone: 'warning' },
  PRICE: { label: "Narx o'zgardi", tone: 'warning' },
  PAYMENT_IN: { label: "To'lov qabul", tone: 'success' },
  PAYMENT_OUT: { label: 'Pul qaytarildi', tone: 'warning' },
  ADJUST: { label: 'Hisob tuzatildi', tone: 'warning' },
  WRITEOFF: { label: 'Hisobdan chiqarildi', tone: 'danger' },
  ADJUST_STOCK: { label: 'Qoldiq tuzatildi', tone: 'warning' },
  RECEIVE_CANCEL: { label: 'Kirim bekor qilindi', tone: 'danger' },
  SETTINGS: { label: 'Sozlamalar', tone: 'neutral' },
  BACKUP: { label: 'Zaxira nusxa', tone: 'neutral' },
  RESTORE: { label: 'Tiklandi / qaytarildi', tone: 'primary' },
};

const ENTITIES = { sale: 'Sotuv', stock: 'Ombor', product: 'Mahsulot', customer: 'Mijoz', system: 'Tizim' };

export default function AuditLog() {
  const [rows, setRows] = useState([]);
  const [from, setFrom] = useState(daysAgo(6));
  const [to, setTo] = useState(isoDate());
  const [query, setQuery] = useState('');
  const [action, setAction] = useState('');

  const load = useCallback(async () => {
    try { setRows(await window.api.audit.list({ dateFrom: from, dateTo: to, search: query, action: action || undefined })); } catch (err) { toast.error(err.message); }
  }, [from, to, query, action]);

  useEffect(() => {
    const t = setTimeout(load, 150);
    return () => clearTimeout(t);
  }, [load]);

  return (
    <>
      <PageHeader title="Harakatlar jurnali" subtitle="Dasturdagi har bir muhim amal o'chirib bo'lmaydigan tarzda qayd qilinadi" />
      <div className="content">
        <div className="toolbar">
          <DateRange from={from} to={to} onChange={(a, b) => { setFrom(a); setTo(b); }} />
          <SearchInput value={query} onChange={setQuery} placeholder="Tafsilot bo'yicha qidirish" />
          <select className="input" style={{ width: 200 }} value={action} onChange={(e) => setAction(e.target.value)}>
            <option value="">Barcha amallar</option>
            {Object.entries(ACTIONS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
        </div>
        <div className="table-wrap">
          {rows.length === 0 ? (
            <EmptyState icon={ScrollText} title="Yozuv topilmadi" />
          ) : (
            <table className="table table-sm">
              <thead><tr><th>Vaqt</th><th>Amal</th><th>Bo'lim</th><th>Tafsilot</th></tr></thead>
              <tbody>
                {rows.map((r) => {
                  const a = ACTIONS[r.action] || { label: r.action, tone: 'neutral' };
                  return (
                    <tr key={r.id}>
                      <td className="nowrap secondary">{fmtDateTime(r.created_at)}</td>
                      <td><Pill tone={a.tone}>{a.label}</Pill></td>
                      <td className="secondary">{ENTITIES[r.entity] || r.entity}</td>
                      <td>{r.details}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </>
  );
}
