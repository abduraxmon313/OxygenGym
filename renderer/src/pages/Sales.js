import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'react-hot-toast';
import { HandCoins, Receipt, RotateCcw, TrendingUp } from 'lucide-react';
import { DateRange, EmptyState, PageHeader, SaleStatus, SearchInput, Segmented, StatCard } from '../components/ui';
import SaleDetail from '../components/SaleDetail';
import { currency, fmtDateTime, isoDate, methodsText, money, som } from '../lib/format';
import { t } from '../lib/i18n';

export default function Sales({ refreshAlerts }) {
  const [sales, setSales] = useState([]);
  const [from, setFrom] = useState(isoDate());
  const [to, setTo] = useState(isoDate());
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('all');
  const [saleId, setSaleId] = useState(null);

  const load = useCallback(async () => {
    try {
      setSales(await window.api.sales.list({
        dateFrom: from,
        dateTo: to,
        search: query,
        status: status === 'returned' ? 'returned' : status === 'all' || status === 'debt' ? undefined : 'completed',
        onlyDebt: status === 'debt',
      }));
    } catch (err) {
      toast.error(err.message);
    }
  }, [from, to, query, status]);

  useEffect(() => {
    const timer = setTimeout(load, 150);
    return () => clearTimeout(timer);
  }, [load]);

  const summary = useMemo(() => sales.reduce((s, x) => {
    if (x.status === 'completed') s.count += 1;
    s.revenue += x.final_total - x.returned_amount;
    s.debt += x.debt_amount;
    if (x.returned_amount > 0) {
      s.refunded += 1;
      s.refundedSum += x.returned_amount;
    }
    return s;
  }, { count: 0, revenue: 0, debt: 0, refunded: 0, refundedSum: 0 }), [sales]);

  return (
    <>
      <PageHeader title={t('Sotuvlar')} subtitle={t("Barcha cheklar, to'lov tafsilotlari va qaytarishlar")} />
      <div className="content">
        <div className="stat-grid">
          <StatCard label={t('Sotuvlar')} value={summary.count} unit={t('ta')} hint={t('Tanlangan davrda')} icon={Receipt} tone="primary" />
          <StatCard label={t('Savdo summasi')} value={money(summary.revenue)} unit={currency()} icon={TrendingUp} tone="success" />
          <StatCard label={t('Qarzga sotilgan')} value={money(summary.debt)} unit={currency()} icon={HandCoins} tone={summary.debt ? 'danger' : 'neutral'} />
          <StatCard label={t('Qaytarilgan')} value={summary.refunded} unit={t('ta')} hint={summary.refunded ? som(summary.refundedSum) : undefined} icon={RotateCcw} tone="warning" />
        </div>

        <div className="toolbar">
          <DateRange from={from} to={to} onChange={(a, b) => { setFrom(a); setTo(b); }} />
          <SearchInput value={query} onChange={setQuery} placeholder={t('Chek raqami, mijoz yoki telefon')} />
          <Segmented
            options={[{ id: 'all', label: t('Hammasi') }, { id: 'completed', label: t('Yakunlangan') }, { id: 'debt', label: t('Qarzga') }, { id: 'returned', label: t('Qaytarishlar') }]}
            value={status}
            onChange={setStatus}
          />
        </div>

        <div className="table-wrap">
          {sales.length === 0 ? (
            <EmptyState icon={Receipt} title={t('Sotuv topilmadi')} text={t("Sana oralig'ini yoki filtrlarni o'zgartiring")} />
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>{t('Chek')}</th><th>{t('Sana')}</th><th>{t('Mijoz')}</th><th className="num">{t('Miqdor')}</th><th>{t("To'lov")}</th>
                  <th className="num">{t('Summa')}</th><th className="num">{t('Qarzga')}</th><th>{t('Holat')}</th>
                </tr>
              </thead>
              <tbody>
                {sales.map((s) => (
                  <tr key={s.id} className="clickable" onClick={() => setSaleId(s.id)}>
                    <td className="mono">{s.sale_number}</td>
                    <td className="nowrap">{fmtDateTime(s.created_at)}</td>
                    <td>{s.customer_name ? <><div className="cell-title">{s.customer_name}</div>{s.customer_phone && <div className="cell-sub tnum">{s.customer_phone}</div>}</> : <span className="muted">{t('Mijozsiz')}</span>}</td>
                    <td className="num">{s.items_qty}</td>
                    <td className="secondary">{methodsText(s.methods)}</td>
                    <td className="num strong">{money(s.final_total)}{s.returned_amount > 0 && <div className="cell-sub text-danger">−{money(s.returned_amount)}</div>}</td>
                    <td className={`num ${s.debt_amount ? 'amount-neg' : 'muted'}`}>{s.debt_amount ? money(s.debt_amount) : '—'}</td>
                    <td><SaleStatus sale={s} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
      {saleId && <SaleDetail saleId={saleId} onClose={() => setSaleId(null)} onChanged={() => { load(); refreshAlerts(); }} />}
    </>
  );
}
