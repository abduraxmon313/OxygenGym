import React, { useCallback, useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import {
  AlertTriangle, Banknote, Boxes, CalendarClock, ChevronRight, HandCoins, Package, PackageMinus, Receipt, ShoppingCart, TrendingUp, Wallet,
} from 'lucide-react';
import { EmptyState, PageHeader, ProductThumb, StatCard } from '../components/ui';
import { chartColors, useTheme } from '../lib/theme';
import SaleDetail from '../components/SaleDetail';
import { compactMoney, currency, fmtTime, longDate, money, productMeta, shortDay, som } from '../lib/format';
import { t } from '../lib/i18n';

function ChartTooltip({ active, payload }) {
  if (!active || !payload || !payload.length) return null;
  const p = payload[0].payload;
  return (
    <div className="chart-tooltip">
      <div className="t">{shortDay(p.date)} · {t('{n} ta chek', { n: p.count })}</div>
      <div className="v">{som(p.revenue)}</div>
    </div>
  );
}

export default function Dashboard({ navigate }) {
  const [stats, setStats] = useState(null);
  const { theme } = useTheme();
  const colors = chartColors(theme);
  const [saleId, setSaleId] = useState(null);

  const load = useCallback(async () => {
    try { setStats(await window.api.dashboard.stats()); } catch (err) { toast.error(err.message); }
  }, []);

  useEffect(() => {
    load();
    const timer = setInterval(load, 30000);
    return () => clearInterval(timer);
  }, [load]);

  const header = (
    <PageHeader
      title={t('Bosh panel')}
      subtitle={longDate()}
      actions={<button type="button" className="btn btn-primary" onClick={() => navigate('pos')}><ShoppingCart size={16} />{t('Yangi sotuv')}</button>}
    />
  );

  if (!stats) return <>{header}<div className="content"><div className="loading">{t('Yuklanmoqda…')}</div></div></>;

  const { today, month, inventory, customers } = stats;
  const margin = today.revenue > 0 ? Math.round((today.profit / today.revenue) * 100) : 0;
  const chartData = stats.daily.map((d) => ({ ...d, label: shortDay(d.date) }));
  const alertsTotal = inventory.low_stock + inventory.expiring + inventory.expired;
  const cur = currency();
  const cash = stats.cashToday;

  return (
    <>
      {header}
      <div className="content">
        <div className="stat-grid">
          <StatCard
            label={t('Bugungi savdo')}
            value={money(today.revenue)}
            unit={cur}
            hint={today.debt > 0 ? t('{n} ta chek · shundan qarzga {d}', { n: today.count, d: som(today.debt) }) : t('{n} ta chek', { n: today.count })}
            icon={TrendingUp}
            tone="primary"
          />
          <StatCard label={t('Bugungi foyda')} value={money(today.profit)} unit={cur} hint={today.revenue ? t('Marja {p}%', { p: margin }) : t("Sotuv hali yo'q")} icon={Wallet} tone="success" />
          <StatCard
            label={t('Bugun kassaga tushgan pul')}
            value={money(cash.total)}
            unit={cur}
            icon={Banknote}
            title={t("Naqd, karta, Click va Payme orqali haqiqatda olingan pul. Qarzga sotilgan summa kirmaydi, mijoz qoldirgan avans esa kiradi.")}
          >
            <div className="stat-breakdown">
              <div className="line"><span>{t('Sotuvlardan')}</span><b>{money(cash.sales)}</b></div>
              {(cash.deposits !== 0 || cash.withdrawals !== 0) && (
                <div className="line"><span>{t("Mijozlar to'lovi (avans, qarz)")}</span><b>{money(cash.deposits + cash.withdrawals)}</b></div>
              )}
              {cash.refunds !== 0 && <div className="line"><span>{t('Qaytarilgan')}</span><b>{money(cash.refunds)}</b></div>}
            </div>
          </StatCard>
          <StatCard
            label={t('Mijozlar qarzi')}
            value={money(customers.total_debt)}
            unit={cur}
            hint={customers.debtors ? t('{n} ta qarzdor mijoz', { n: customers.debtors }) : t("Qarzdor mijoz yo'q")}
            icon={HandCoins}
            tone={customers.total_debt > 0 ? 'danger' : 'neutral'}
            onClick={() => navigate('customers')}
          />
        </div>

        <div className="dash-grid">
          <div className="card">
            <div className="card-header">
              <div>
                <div className="card-title">{t('Savdo dinamikasi')}</div>
                <div className="card-subtitle">{t("So'nggi 14 kun")}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div className="card-subtitle">{t('Shu oy savdosi')}</div>
                <div className="strong tnum" style={{ fontSize: 16 }}>{som(month.revenue)}</div>
              </div>
            </div>
            <div className="chart-box">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 8, left: 8, bottom: 0 }}>
                  <defs>
                    <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={colors.line} stopOpacity={theme === 'dark' ? 0.28 : 0.18} />
                      <stop offset="100%" stopColor={colors.line} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke={colors.grid} vertical={false} />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 11.5, fill: colors.tick }} interval="preserveStartEnd" />
                  <YAxis tickLine={false} axisLine={false} width={64} tick={{ fontSize: 11.5, fill: colors.tick }} tickFormatter={compactMoney} />
                  <Tooltip content={<ChartTooltip />} cursor={{ stroke: colors.cursor }} />
                  <Area type="monotone" dataKey="revenue" stroke={colors.line} strokeWidth={2} fill="url(#rev)" activeDot={{ r: 4 }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <div>
                <div className="card-title">{t('Ombor holati')}</div>
                <div className="card-subtitle">{t('{n} ta faol mahsulot', { n: inventory.products })}</div>
              </div>
            </div>
            <div className="kv-list">
              <div className="kv"><span className="kv-label"><Boxes size={16} />{t('Ombor qiymati (tannarx)')}</span><span className="kv-value">{som(inventory.stock_value)}</span></div>
              <div className="kv"><span className="kv-label"><Package size={16} />{t('Sotuv narxida')}</span><span className="kv-value">{som(inventory.retail_value)}</span></div>
              <div className="kv"><span className="kv-label"><Wallet size={16} />{t('Mijozlardagi avans')}</span><span className="kv-value">{som(customers.total_advance)}</span></div>
              <div className="kv link" onClick={() => navigate('alerts')}>
                <span className="kv-label"><AlertTriangle size={16} />{t('Kam qolgan / tugagan')}</span>
                <span className={`kv-value ${inventory.low_stock ? 'text-warning' : ''}`}>{t('{n} ta', { n: inventory.low_stock })} <ChevronRight size={14} className="muted" /></span>
              </div>
              <div className="kv link" onClick={() => navigate('alerts')}>
                <span className="kv-label"><CalendarClock size={16} />{t("Muddati yaqin / o'tgan")}</span>
                <span className={`kv-value ${inventory.expired ? 'text-danger' : inventory.expiring ? 'text-warning' : ''}`}>
                  {inventory.expiring} / {inventory.expired} <ChevronRight size={14} className="muted" />
                </span>
              </div>
              <div className="kv">
                <span className="kv-label"><PackageMinus size={16} />{t('Shu oy hisobdan chiqarilgan')}</span>
                <span className={`kv-value ${inventory.month_loss ? 'text-danger' : ''}`}>{som(inventory.month_loss)}</span>
              </div>
            </div>
            {alertsTotal === 0 && <div className="card-body muted" style={{ fontSize: 12.5, paddingTop: 0 }}>{t("Ombor bo'yicha ogohlantirish yo'q.")}</div>}
          </div>
        </div>

        <div className="dash-grid even">
          <div className="card">
            <div className="card-header"><div><div className="card-title">{t("Eng ko'p sotilganlar")}</div><div className="card-subtitle">{t("Shu oy, savdo summasi bo'yicha")}</div></div></div>
            {stats.topProducts.length === 0 ? (
              <EmptyState icon={Package} title={t("Shu oy hali sotuv yo'q")} />
            ) : (
              <div className="table-wrap">
                <table className="table table-sm">
                  <thead><tr><th>{t('Mahsulot')}</th><th className="num">{t('Sotildi')}</th><th className="num">{t('Savdo')}</th></tr></thead>
                  <tbody>
                    {stats.topProducts.map((p) => (
                      <tr key={p.id}>
                        <td>
                          <div className="cell-product">
                            <ProductThumb product={p} size="sm" />
                            <div><div className="cell-title">{p.name}</div><div className="cell-sub">{productMeta(p) || '—'}</div></div>
                          </div>
                        </td>
                        <td className="num">{p.qty}</td>
                        <td className="num strong">{money(p.revenue)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="card">
            <div className="card-header">
              <div><div className="card-title">{t("So'nggi sotuvlar")}</div><div className="card-subtitle">{t('Chekni ochish uchun bosing')}</div></div>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => navigate('sales')}>{t('Barchasi')}<ChevronRight size={14} /></button>
            </div>
            {stats.recentSales.length === 0 ? (
              <EmptyState icon={Receipt} title={t("Hali sotuv yo'q")} />
            ) : (
              <div className="table-wrap">
                <table className="table table-sm">
                  <thead><tr><th>{t('Chek')}</th><th>{t('Vaqt')}</th><th>{t('Mijoz')}</th><th className="num">{t('Summa')}</th></tr></thead>
                  <tbody>
                    {stats.recentSales.map((s) => (
                      <tr key={s.id} className="clickable" onClick={() => setSaleId(s.id)}>
                        <td className="mono">{s.sale_number}</td>
                        <td className="secondary">{fmtTime(s.created_at)}</td>
                        <td>{s.customer_name || <span className="muted">{t('Mijozsiz')}</span>}</td>
                        <td className="num strong">{money(s.final_total - s.returned_amount)}{s.debt_amount > 0 && <div className="cell-sub text-danger">{t('qarz {a}', { a: money(s.debt_amount) })}</div>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
      {saleId && <SaleDetail saleId={saleId} onClose={() => setSaleId(null)} onChanged={load} />}
    </>
  );
}
