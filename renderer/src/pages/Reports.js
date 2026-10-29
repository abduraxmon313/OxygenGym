import React, { useCallback, useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { BarChart3, Banknote, HandCoins, TrendingUp, Wallet } from 'lucide-react';
import { DateRange, EmptyState, PageHeader, StatCard, Tabs } from '../components/ui';
import { fmtDate, monthRange, money, productMeta, som } from '../lib/format';

const pct = (profit, revenue) => (revenue > 0 ? `${((profit / revenue) * 100).toFixed(1)}%` : '—');
const sum = (rows, key) => rows.reduce((s, r) => s + (Number(r[key]) || 0), 0);

export default function Reports() {
  const [tab, setTab] = useState('sales');
  const [range, setRange] = useState(() => monthRange(0));
  const [rows, setRows] = useState([]);
  const [cash, setCash] = useState(null);
  const [from, to] = range;

  const load = useCallback(async () => {
    const filters = { dateFrom: from, dateTo: to };
    try {
      if (tab === 'cash') {
        setCash(await window.api.reports.cashflow(filters));
      } else {
        const fn = { sales: window.api.reports.sales, products: window.api.reports.products, categories: window.api.reports.categories }[tab];
        setRows(await fn(filters));
      }
    } catch (err) {
      toast.error(err.message);
    }
  }, [tab, from, to]);
  useEffect(() => { load(); }, [load]);

  const revenue = sum(rows, 'revenue');
  const cost = sum(rows, 'cost');
  const profit = revenue - cost;

  const summaryCards = tab === 'cash' && cash ? (
    <div className="stat-grid">
      <StatCard label="Jami tushum" value={money(cash.totals.total)} unit="so'm" icon={Banknote} tone="primary" />
      <StatCard label="Naqd" value={money(cash.totals.cash)} unit="so'm" icon={Wallet} />
      <StatCard label="Karta / Click / Payme" value={money(cash.totals.card + cash.totals.click + cash.totals.payme)} unit="so'm" icon={Wallet} />
      <StatCard label="Qarzga sotilgan" value={money(cash.totals.debt)} unit="so'm" hint="Kassaga tushmagan" icon={HandCoins} tone={cash.totals.debt ? 'danger' : 'neutral'} />
    </div>
  ) : tab !== 'cash' ? (
    <div className="stat-grid cols-3">
      <StatCard label="Savdo" value={money(revenue)} unit="so'm" hint="Chegirmalardan keyin" icon={TrendingUp} tone="primary" />
      <StatCard label="Tannarx" value={money(cost)} unit="so'm" icon={Wallet} />
      <StatCard label="Yalpi foyda" value={money(profit)} unit="so'm" hint={`Marja ${pct(profit, revenue)}`} icon={BarChart3} tone="success" />
    </div>
  ) : null;

  const empty = <EmptyState icon={BarChart3} title="Bu davrda ma'lumot yo'q" text="Sana oralig'ini o'zgartiring" />;

  return (
    <>
      <PageHeader title="Hisobotlar" subtitle="Savdo, foyda va kassa tahlili" />
      <div className="content">
        <Tabs
          value={tab}
          onChange={setTab}
          tabs={[
            { id: 'sales', label: 'Kunlik savdo' },
            { id: 'products', label: 'Mahsulotlar' },
            { id: 'categories', label: 'Kategoriyalar' },
            { id: 'cash', label: 'Kassa' },
          ]}
        />
        <div className="toolbar">
          <DateRange from={from} to={to} onChange={(a, b) => setRange([a, b])} />
        </div>

        {summaryCards}

        <div className="table-wrap">
          {tab === 'sales' && (rows.length === 0 ? empty : (
            <table className="table">
              <thead><tr><th>Sana</th><th className="num">Cheklar</th><th className="num">Chegirma</th><th className="num">Savdo</th><th className="num">Tannarx</th><th className="num">Foyda</th><th className="num">Marja</th><th className="num">Qarzga</th></tr></thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.date}>
                    <td>{fmtDate(r.date)}</td>
                    <td className="num">{r.sales_count}</td>
                    <td className="num secondary">{r.discount ? money(r.discount) : '—'}</td>
                    <td className="num strong">{money(r.revenue)}</td>
                    <td className="num secondary">{money(r.cost)}</td>
                    <td className={`num ${r.profit >= 0 ? 'amount-pos' : 'amount-neg'}`}>{money(r.profit)}</td>
                    <td className="num secondary">{pct(r.profit, r.revenue)}</td>
                    <td className={`num ${r.debt ? 'amount-neg' : 'muted'}`}>{r.debt ? money(r.debt) : '—'}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td>Jami</td><td className="num">{sum(rows, 'sales_count')}</td><td className="num">{money(sum(rows, 'discount'))}</td>
                  <td className="num">{money(revenue)}</td><td className="num">{money(cost)}</td><td className="num">{money(profit)}</td>
                  <td className="num">{pct(profit, revenue)}</td><td className="num">{money(sum(rows, 'debt'))}</td>
                </tr>
              </tfoot>
            </table>
          ))}

          {tab === 'products' && (rows.length === 0 ? empty : (
            <table className="table">
              <thead><tr><th>#</th><th>Mahsulot</th><th className="num">Sotildi</th><th className="num">Savdo</th><th className="num">Tannarx</th><th className="num">Foyda</th><th className="num">Marja</th><th className="num">Ulush</th></tr></thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={r.id}>
                    <td className="secondary">{i + 1}</td>
                    <td><div className="cell-title">{r.name}</div><div className="cell-sub">{[productMeta(r), `Kod ${r.code}`].filter(Boolean).join(' · ')}</div></td>
                    <td className="num">{r.qty} {r.unit}</td>
                    <td className="num strong">{money(r.revenue)}</td>
                    <td className="num secondary">{money(r.cost)}</td>
                    <td className={`num ${r.profit >= 0 ? 'amount-pos' : 'amount-neg'}`}>{money(r.profit)}</td>
                    <td className="num secondary">{pct(r.profit, r.revenue)}</td>
                    <td className="num secondary">{revenue ? `${((r.revenue / revenue) * 100).toFixed(1)}%` : '—'}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot><tr><td colSpan={2}>Jami</td><td className="num">{sum(rows, 'qty')}</td><td className="num">{money(revenue)}</td><td className="num">{money(cost)}</td><td className="num">{money(profit)}</td><td className="num">{pct(profit, revenue)}</td><td className="num">100%</td></tr></tfoot>
            </table>
          ))}

          {tab === 'categories' && (rows.length === 0 ? empty : (
            <table className="table">
              <thead><tr><th>Kategoriya</th><th className="num">Sotildi</th><th className="num">Savdo</th><th className="num">Foyda</th><th className="num">Marja</th><th className="num">Ulush</th></tr></thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.name}>
                    <td className="cell-title">{r.name}</td>
                    <td className="num">{r.qty}</td>
                    <td className="num strong">{money(r.revenue)}</td>
                    <td className={`num ${r.profit >= 0 ? 'amount-pos' : 'amount-neg'}`}>{money(r.profit)}</td>
                    <td className="num secondary">{pct(r.profit, r.revenue)}</td>
                    <td className="num secondary">{revenue ? `${((r.revenue / revenue) * 100).toFixed(1)}%` : '—'}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot><tr><td>Jami</td><td className="num">{sum(rows, 'qty')}</td><td className="num">{money(revenue)}</td><td className="num">{money(profit)}</td><td className="num">{pct(profit, revenue)}</td><td className="num">100%</td></tr></tfoot>
            </table>
          ))}

          {tab === 'cash' && cash && (cash.rows.length === 0 ? empty : (
            <table className="table">
              <thead><tr><th>Sana</th><th className="num">Naqd</th><th className="num">Karta</th><th className="num">Click</th><th className="num">Payme</th><th className="num">Jami tushum</th><th className="num">Qarzga sotildi</th></tr></thead>
              <tbody>
                {cash.rows.map((r) => (
                  <tr key={r.date}>
                    <td>{fmtDate(r.date)}</td>
                    <td className="num">{money(r.cash)}</td>
                    <td className="num">{money(r.card)}</td>
                    <td className="num">{money(r.click)}</td>
                    <td className="num">{money(r.payme)}</td>
                    <td className="num strong">{money(r.total)}</td>
                    <td className={`num ${r.debt ? 'amount-neg' : 'muted'}`}>{r.debt ? money(r.debt) : '—'}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td>Jami</td><td className="num">{money(cash.totals.cash)}</td><td className="num">{money(cash.totals.card)}</td>
                  <td className="num">{money(cash.totals.click)}</td><td className="num">{money(cash.totals.payme)}</td>
                  <td className="num">{som(cash.totals.total)}</td><td className="num">{money(cash.totals.debt)}</td>
                </tr>
              </tfoot>
            </table>
          ))}
        </div>
        {tab === 'cash' && (
          <div className="table-footer-note">
            <span>Kassa = sotuvdan tushgan pul + mijozlar to'lovlari − qaytarilgan pul. Qarzga sotilgan summa kassaga kirmaydi.</span>
          </div>
        )}
      </div>
    </>
  );
}
