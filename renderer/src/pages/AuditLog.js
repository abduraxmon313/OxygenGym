import React, { useCallback, useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { ScrollText } from 'lucide-react';
import { DateRange, EmptyState, PageHeader, Pill, SearchInput } from '../components/ui';
import { daysAgo, fmtDateTime, isoDate } from '../lib/format';
import { t } from '../lib/i18n';

const actions = () => ({
  SALE: { label: t('Sotuv'), tone: 'success' },
  REFUND: { label: t('Qaytarish'), tone: 'danger' },
  RECEIVE: { label: t('Kirim'), tone: 'primary' },
  CREATE: { label: t('Yaratildi'), tone: 'primary' },
  UPDATE: { label: t('Tahrirlandi'), tone: 'neutral' },
  DELETE: { label: t('Arxivlandi'), tone: 'warning' },
  PRICE: { label: t("Narx o'zgardi"), tone: 'warning' },
  PAYMENT_IN: { label: t("To'lov qabul"), tone: 'success' },
  PAYMENT_OUT: { label: t('Pul qaytarildi'), tone: 'warning' },
  ADJUST: { label: t('Hisob tuzatildi'), tone: 'warning' },
  WRITEOFF: { label: t('Hisobdan chiqarildi'), tone: 'danger' },
  ADJUST_STOCK: { label: t('Qoldiq tuzatildi'), tone: 'warning' },
  RECEIVE_CANCEL: { label: t('Kirim bekor qilindi'), tone: 'danger' },
  SETTINGS: { label: t('Sozlamalar'), tone: 'neutral' },
  BACKUP: { label: t('Zaxira nusxa'), tone: 'neutral' },
  RESTORE: { label: t('Tiklandi / qaytarildi'), tone: 'primary' },
});

const entities = () => ({ sale: t('Sotuv'), stock: t('Ombor'), product: t('Mahsulot'), customer: t('Mijoz'), system: t('Tizim') });

export default function AuditLog() {
  const [rows, setRows] = useState([]);
  const [from, setFrom] = useState(daysAgo(6));
  const [to, setTo] = useState(isoDate());
  const [query, setQuery] = useState('');
  const [action, setAction] = useState('');
  const ACTIONS = actions();
  const ENTITIES = entities();

  const load = useCallback(async () => {
    try { setRows(await window.api.audit.list({ dateFrom: from, dateTo: to, search: query, action: action || undefined })); } catch (err) { toast.error(err.message); }
  }, [from, to, query, action]);

  useEffect(() => {
    const timer = setTimeout(load, 150);
    return () => clearTimeout(timer);
  }, [load]);

  return (
    <>
      <PageHeader title={t('Harakatlar jurnali')} subtitle={t("Dasturdagi har bir muhim amal o'chirib bo'lmaydigan tarzda qayd qilinadi")} />
      <div className="content">
        <div className="toolbar">
          <DateRange from={from} to={to} onChange={(a, b) => { setFrom(a); setTo(b); }} />
          <SearchInput value={query} onChange={setQuery} placeholder={t("Tafsilot bo'yicha qidirish")} />
          <select className="input" style={{ width: 200 }} value={action} onChange={(e) => setAction(e.target.value)}>
            <option value="">{t('Barcha amallar')}</option>
            {Object.entries(ACTIONS).filter(([k]) => k !== 'BACKUP').map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
        </div>
        <div className="table-wrap">
          {rows.length === 0 ? (
            <EmptyState icon={ScrollText} title={t('Yozuv topilmadi')} />
          ) : (
            <table className="table table-sm">
              <thead><tr><th>{t('Vaqt')}</th><th>{t('Amal')}</th><th>{t("Bo'lim")}</th><th>{t('Tafsilot')}</th></tr></thead>
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
