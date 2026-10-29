import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'react-hot-toast';
import { HandCoins, Receipt, RotateCcw, TrendingUp } from 'lucide-react';
import { DateRange, EmptyState, PageHeader, Pill, SearchInput, Segmented, StatCard } from '../components/ui';
import SaleDetail from '../components/SaleDetail';
import { fmtDateTime, isoDate, methodsText, money } from '../lib/format';

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
        status: status === 'refunded' ? 'refunded' : status === 'all' ? undefined : 'completed',
        onlyDebt: status === 'debt',
      }));
    } catch (err) {
      toast.error(err.message);
    }
  }, [from, to, query, status]);

  useEffect(() => {
    const t = setTimeout(load, 150);
    return () => clearTimeout(t);
  }, [load]);

  const summary = useMemo(() => sales.reduce((s, x) => {
    if (x.status === 'completed') {
      s.count += 1;
      s.revenue += x.final_total;
      s.debt += x.debt_amount;
    } else {
      s.refunded += 1;
      s.refundedSum += x.final_total;
    }
    return s;
  }, { count: 0, revenue: 0, debt: 0, refunded: 0, refundedSum: 0 }), [sales]);

  return (
    <>
      <PageHeader title="Sotuvlar" subtitle="Barcha cheklar, to'lov tafsilotlari va qaytarishlar" />
      <div className="content">
        <div className="stat-grid">
          <StatCard label="Sotuvlar" value={summary.count} unit="ta" hint="Tanlangan davrda" icon={Receipt} tone="primary" />
          <StatCard label="Savdo summasi" value={money(summary.revenue)} unit="so'm" icon={TrendingUp} tone="success" />
          <StatCard label="Qarzga sotilgan" value={money(summary.debt)} unit="so'm" icon={HandCoins} tone={summary.debt ? 'danger' : 'neutral'} />
          <StatCard label="Qaytarilgan" value={summary.refunded} unit="ta" hint={summary.refunded ? `${money(summary.refundedSum)} so'm` : undefined} icon={RotateCcw} tone="warning" />
        </div>

        <div className="toolbar">
          <DateRange from={from} to={to} onChange={(a, b) => { setFrom(a); setTo(b); }} />
          <SearchInput value={query} onChange={setQuery} placeholder="Chek raqami, mijoz yoki telefon" />
          <Segmented
            options={[{ id: 'all', label: 'Hammasi' }, { id: 'completed', label: 'Yakunlangan' }, { id: 'debt', label: 'Qarzga' }, { id: 'refunded', label: 'Qaytarilgan' }]}
            value={status}
            onChange={setStatus}
          />
        </div>

        <div className="table-wrap">
          {sales.length === 0 ? (
            <EmptyState icon={Receipt} title="Sotuv topilmadi" text="Sana oralig'ini yoki filtrlarni o'zgartiring" />
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Chek</th><th>Sana</th><th>Mijoz</th><th className="num">Miqdor</th><th>To'lov</th>
                  <th className="num">Summa</th><th className="num">Qarzga</th><th>Holat</th>
                </tr>
              </thead>
              <tbody>
                {sales.map((s) => (
                  <tr key={s.id} className="clickable" onClick={() => setSaleId(s.id)}>
                    <td className="mono">{s.sale_number}</td>
                    <td className="nowrap">{fmtDateTime(s.created_at)}</td>
                    <td>{s.customer_name ? <><div className="cell-title">{s.customer_name}</div>{s.customer_phone && <div className="cell-sub">{s.customer_phone}</div>}</> : <span className="muted">Mijozsiz</span>}</td>
                    <td className="num">{s.items_qty}</td>
                    <td className="secondary">{methodsText(s.methods)}</td>
                    <td className="num strong">{money(s.final_total)}</td>
                    <td className={`num ${s.debt_amount ? 'amount-neg' : 'muted'}`}>{s.debt_amount ? money(s.debt_amount) : '—'}</td>
                    <td>{s.status === 'completed' ? <Pill tone="success">Yakunlangan</Pill> : <Pill tone="danger">Qaytarilgan</Pill>}</td>
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
