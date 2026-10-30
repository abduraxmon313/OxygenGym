import React, { useCallback, useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { BarChart3, Banknote, HandCoins, TrendingUp, Wallet } from 'lucide-react';
import { DateRange, EmptyState, PageHeader, StatCard, Tabs } from '../components/ui';
import { catName, currency, fmtDate, monthRange, money, productMeta, som, unitLabel } from '../lib/format';
import { t } from '../lib/i18n';

const pct = (profit, revenue) => (revenue > 0 ? `${((profit / revenue) * 100).toFixed(1)}%` : '—');
// "Shikastlangan: izoh" — sabab o'zbekcha saqlanadi, birinchi qismini tarjima qilamiz
function reasonText(r) {
  const i = r.indexOf(': ');
  return i < 0 ? t(r) : t(r.slice(0, i)) + r.slice(i);
}
const sum = (rows, key) => rows.reduce((s, r) => s + (Number(r[key]) || 0), 0);

export default function Reports() {
  const [tab, setTab] = useState('sales');
  const [range, setRange] = useState(() => monthRange(0));
  const [rows, setRows] = useState([]);
  const [cash, setCash] = useState(null);
  const [from, to] = range;
  // Boshqa bo'lim ma'lumotlari yangi jadvalda ko'rinib qolmasligi uchun
  useEffect(() => { setRows([]); }, [tab]);

  const load = useCallback(async () => {
    const filters = { dateFrom: from, dateTo: to };
    try {
      if (tab === 'cash') {
        setCash(await window.api.reports.cashflow(filters));
      } else {
        const fn = {
          sales: window.api.reports.sales,
          products: window.api.reports.products,
          categories: window.api.reports.categories,
          losses: window.api.reports.losses,
        }[tab];
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

  const lossOut = rows.filter((r) => r.quantity < 0).reduce((s, r) => s + -r.quantity * r.cost_price, 0);
  const lossWriteoff = rows.filter((r) => r.quantity < 0 && r.type === 'writeoff').reduce((s, r) => s + -r.quantity * r.cost_price, 0);
  const gainIn = rows.filter((r) => r.quantity > 0).reduce((s, r) => s + r.quantity * r.cost_price, 0);

  const summaryCards = tab === 'losses' ? (
    <div className="stat-grid cols-3">
      <StatCard label={t("Hisobdan chiqarilgan")} value={money(lossWriteoff)} unit={currency()} hint={t("Muddati o'tgan, shikastlangan, yo'qolgan")} icon={Wallet} tone={lossWriteoff ? 'danger' : 'neutral'} />
      <StatCard label={t("Inventarizatsiyada kamaygan")} value={money(lossOut - lossWriteoff)} unit={currency()} icon={BarChart3} tone="warning" />
      <StatCard label={t("Inventarizatsiyada ortgan")} value={money(gainIn)} unit={currency()} icon={TrendingUp} tone="success" />
    </div>
  ) : tab === 'cash' && cash ? (
    <div className="stat-grid">
      <StatCard label={t("Jami tushum")} value={money(cash.totals.total)} unit={currency()} icon={Banknote} tone="primary" />
      <StatCard label={t("Naqd")} value={money(cash.totals.cash)} unit={currency()} icon={Wallet} />
      <StatCard label={t("Karta / Click / Payme")} value={money(cash.totals.card + cash.totals.click + cash.totals.payme)} unit={currency()} icon={Wallet} />
      <StatCard label={t("Qarzga sotilgan")} value={money(cash.totals.debt)} unit={currency()} hint={t("Kassaga tushmagan")} icon={HandCoins} tone={cash.totals.debt ? 'danger' : 'neutral'} />
    </div>
  ) : tab !== 'cash' ? (
    <div className="stat-grid cols-3">
      <StatCard label={t("Savdo")} value={money(revenue)} unit={currency()} hint={t("Chegirmalardan keyin")} icon={TrendingUp} tone="primary" />
      <StatCard label={t("Tannarx")} value={money(cost)} unit={currency()} icon={Wallet} />
      <StatCard label={t("Yalpi foyda")} value={money(profit)} unit={currency()} hint={t('Marja {p}', { p: pct(profit, revenue) })} icon={BarChart3} tone="success" />
    </div>
  ) : null;

  const empty = <EmptyState icon={BarChart3} title={t("Bu davrda ma'lumot yo'q")} text={t("Sana oralig'ini o'zgartiring")} />;

  return (
    <>
      <PageHeader title={t("Hisobotlar")} subtitle={t("Savdo, foyda va kassa tahlili")} />
      <div className="content">
        <Tabs
          value={tab}
          onChange={setTab}
          tabs={[
            { id: 'sales', label: t('Kunlik savdo') },
            { id: 'products', label: t('Mahsulotlar') },
            { id: 'categories', label: t('Kategoriyalar') },
            { id: 'cash', label: t('Kassa') },
            { id: 'losses', label: t("Yo'qotishlar") },
          ]}
        />
        <div className="toolbar">
          <DateRange from={from} to={to} onChange={(a, b) => setRange([a, b])} />
        </div>

        {summaryCards}

        <div className="table-wrap">
          {tab === 'sales' && (rows.length === 0 ? empty : (
            <table className="table">
              <thead><tr><th>{t('Sana')}</th><th className="num">{t('Cheklar')}</th><th className="num">{t('Chegirma')}</th><th className="num">{t('Qaytarilgan')}</th><th className="num">{t('Sof savdo')}</th><th className="num">{t('Tannarx')}</th><th className="num">{t('Foyda')}</th><th className="num">{t('Marja')}</th><th className="num">{t('Qarzga')}</th></tr></thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.date}>
                    <td>{fmtDate(r.date)}</td>
                    <td className="num">{r.sales_count}</td>
                    <td className="num secondary">{r.discount ? money(r.discount) : '—'}</td>
                    <td className={`num ${r.returned ? 'text-danger' : 'muted'}`}>{r.returned ? money(r.returned) : '—'}</td>
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
                  <td>{t('Jami')}</td><td className="num">{sum(rows, 'sales_count')}</td><td className="num">{money(sum(rows, 'discount'))}</td><td className="num">{money(sum(rows, 'returned'))}</td>
                  <td className="num">{money(revenue)}</td><td className="num">{money(cost)}</td><td className="num">{money(profit)}</td>
                  <td className="num">{pct(profit, revenue)}</td><td className="num">{money(sum(rows, 'debt'))}</td>
                </tr>
              </tfoot>
            </table>
          ))}

          {tab === 'products' && (rows.length === 0 ? empty : (
            <table className="table">
              <thead><tr><th>#</th><th>{t('Mahsulot')}</th><th className="num">{t('Sotildi')}</th><th className="num">{t('Savdo')}</th><th className="num">{t('Tannarx')}</th><th className="num">{t('Foyda')}</th><th className="num">{t('Marja')}</th><th className="num">{t('Ulush')}</th></tr></thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={r.id}>
                    <td className="secondary">{i + 1}</td>
                    <td><div className="cell-title">{r.name}</div><div className="cell-sub">{[productMeta(r), t('Kod {code}', { code: r.code })].filter(Boolean).join(' · ')}</div></td>
                    <td className="num">{r.qty} {unitLabel(r.unit)}</td>
                    <td className="num strong">{money(r.revenue)}</td>
                    <td className="num secondary">{money(r.cost)}</td>
                    <td className={`num ${r.profit >= 0 ? 'amount-pos' : 'amount-neg'}`}>{money(r.profit)}</td>
                    <td className="num secondary">{pct(r.profit, r.revenue)}</td>
                    <td className="num secondary">{revenue ? `${((r.revenue / revenue) * 100).toFixed(1)}%` : '—'}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot><tr><td colSpan={2}>{t('Jami')}</td><td className="num">{sum(rows, 'qty')}</td><td className="num">{money(revenue)}</td><td className="num">{money(cost)}</td><td className="num">{money(profit)}</td><td className="num">{pct(profit, revenue)}</td><td className="num">100%</td></tr></tfoot>
            </table>
          ))}

          {tab === 'categories' && (rows.length === 0 ? empty : (
            <table className="table">
              <thead><tr><th>{t('Kategoriya')}</th><th className="num">{t('Sotildi')}</th><th className="num">{t('Savdo')}</th><th className="num">{t('Foyda')}</th><th className="num">{t('Marja')}</th><th className="num">{t('Ulush')}</th></tr></thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.name}>
                    <td className="cell-title">{catName(r.name)}</td>
                    <td className="num">{r.qty}</td>
                    <td className="num strong">{money(r.revenue)}</td>
                    <td className={`num ${r.profit >= 0 ? 'amount-pos' : 'amount-neg'}`}>{money(r.profit)}</td>
                    <td className="num secondary">{pct(r.profit, r.revenue)}</td>
                    <td className="num secondary">{revenue ? `${((r.revenue / revenue) * 100).toFixed(1)}%` : '—'}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot><tr><td>{t('Jami')}</td><td className="num">{sum(rows, 'qty')}</td><td className="num">{money(revenue)}</td><td className="num">{money(profit)}</td><td className="num">{pct(profit, revenue)}</td><td className="num">100%</td></tr></tfoot>
            </table>
          ))}

          {tab === 'cash' && cash && (cash.rows.length === 0 ? empty : (
            <table className="table">
              <thead><tr><th>{t('Sana')}</th><th className="num">{t('Naqd')}</th><th className="num">{t('Karta')}</th><th className="num">{t('Click')}</th><th className="num">{t('Payme')}</th><th className="num">{t('Jami tushum')}</th><th className="num">{t('Qarzga sotildi')}</th></tr></thead>
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
                  <td>{t('Jami')}</td><td className="num">{money(cash.totals.cash)}</td><td className="num">{money(cash.totals.card)}</td>
                  <td className="num">{money(cash.totals.click)}</td><td className="num">{money(cash.totals.payme)}</td>
                  <td className="num">{som(cash.totals.total)}</td><td className="num">{money(cash.totals.debt)}</td>
                </tr>
              </tfoot>
            </table>
          ))}
          {tab === 'losses' && (rows.length === 0 ? empty : (
            <table className="table">
              <thead><tr><th>{t('Sana')}</th><th>{t('Mahsulot')}</th><th>{t('Turi')}</th><th>{t('Sabab')}</th><th>{t('Partiya')}</th><th className="num">{t('Miqdor')}</th><th className="num">{t('Qiymat (tannarx)')}</th></tr></thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td className="nowrap secondary">{fmtDate(r.created_at)}</td>
                    <td><div className="cell-title">{r.product_name}</div><div className="cell-sub">{productMeta(r) || t('Kod {code}', { code: r.code })}</div></td>
                    <td>{t(r.type_label)}</td>
                    <td className="secondary">{r.reason ? reasonText(r.reason) : '—'}</td>
                    <td className="mono secondary">{r.batch_number || '—'}</td>
                    <td className={`num ${r.quantity < 0 ? 'amount-neg' : 'amount-pos'}`}>{r.quantity > 0 ? `+${r.quantity}` : r.quantity}</td>
                    <td className="num">{money(Math.abs(r.quantity) * r.cost_price)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ))}
        </div>
        {tab === 'cash' && (
          <div className="table-footer-note">
            <span>{t("Kassa = sotuvdan tushgan pul + mijozlar to'lovlari (avans, qarz uzish) − qaytarilgan pul. Qarzga sotilgan summa kassaga kirmaydi.")}</span>
            {cash && (
              <span>
                {t('Sotuvlardan')}: {som(cash.sources.sales)} · {t("Mijozlar to'lovi")}: {som(cash.sources.deposits)}
                {cash.sources.withdrawals > 0 && <> · {t('Mijozga qaytarilgan')}: −{som(cash.sources.withdrawals)}</>}
                {cash.sources.refunds > 0 && <> · {t('Qaytarilgan')}: −{som(cash.sources.refunds)}</>}
              </span>
            )}
          </div>
        )}
      </div>
    </>
  );
}
