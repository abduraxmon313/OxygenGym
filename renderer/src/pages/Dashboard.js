import React, { useCallback, useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import {
  AlertTriangle, Banknote, Boxes, CalendarClock, ChevronRight, HandCoins, Package, Receipt, ShoppingCart, TrendingUp, Wallet,
} from 'lucide-react';
import { EmptyState, PageHeader, StatCard } from '../components/ui';
import SaleDetail from '../components/SaleDetail';
import { compactMoney, fmtTime, longDate, money, productMeta, shortDay, som } from '../lib/format';

function ChartTooltip({ active, payload }) {
  if (!active || !payload || !payload.length) return null;
  const p = payload[0].payload;
  return (
    <div className="chart-tooltip">
      <div className="t">{shortDay(p.date)} · {p.count} ta chek</div>
      <div className="v">{som(p.revenue)}</div>
    </div>
  );
}

export default function Dashboard({ navigate }) {
  const [stats, setStats] = useState(null);
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
      title="Bosh panel"
      subtitle={longDate()}
      actions={<button type="button" className="btn btn-primary" onClick={() => navigate('pos')}><ShoppingCart size={16} />Yangi sotuv</button>}
    />
  );

  if (!stats) return <>{header}<div className="content"><div className="loading">Yuklanmoqda…</div></div></>;

  const { today, month, inventory, customers } = stats;
  const margin = today.revenue > 0 ? Math.round((today.profit / today.revenue) * 100) : 0;
  const chartData = stats.daily.map((d) => ({ ...d, label: shortDay(d.date) }));
  const alertsTotal = inventory.low_stock + inventory.expiring + inventory.expired;

  return (
    <>
      {header}
      <div className="content">
        <div className="stat-grid">
          <StatCard label="Bugungi savdo" value={money(today.revenue)} unit="so'm" hint={`${today.count} ta chek`} icon={TrendingUp} tone="primary" />
          <StatCard label="Bugungi foyda" value={money(today.profit)} unit="so'm" hint={today.revenue ? `Marja ${margin}%` : 'Sotuv hali yo\'q'} icon={Wallet} tone="success" />
          <StatCard label="Bugungi kassa tushumi" value={money(stats.cashToday)} unit="so'm" hint="Naqd, karta, Click, Payme va mijoz to'lovlari" icon={Banknote} />
          <StatCard
            label="Mijozlar qarzi"
            value={money(customers.total_debt)}
            unit="so'm"
            hint={customers.debtors ? `${customers.debtors} ta qarzdor mijoz` : "Qarzdor mijoz yo'q"}
            icon={HandCoins}
            tone={customers.total_debt > 0 ? 'danger' : 'neutral'}
            onClick={() => navigate('customers')}
          />
        </div>

        <div className="dash-grid">
          <div className="card">
            <div className="card-header">
              <div>
                <div className="card-title">Savdo dinamikasi</div>
                <div className="card-subtitle">So'nggi 14 kun</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div className="card-subtitle">Shu oy savdosi</div>
                <div className="strong tnum" style={{ fontSize: 16 }}>{som(month.revenue)}</div>
              </div>
            </div>
            <div className="chart-box">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 8, left: 8, bottom: 0 }}>
                  <defs>
                    <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#2563eb" stopOpacity={0.18} />
                      <stop offset="100%" stopColor="#2563eb" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="#eef0f3" vertical={false} />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 11.5, fill: '#98a2b3' }} interval="preserveStartEnd" />
                  <YAxis tickLine={false} axisLine={false} width={64} tick={{ fontSize: 11.5, fill: '#98a2b3' }} tickFormatter={compactMoney} />
                  <Tooltip content={<ChartTooltip />} cursor={{ stroke: '#d0d5dd' }} />
                  <Area type="monotone" dataKey="revenue" stroke="#2563eb" strokeWidth={2} fill="url(#rev)" activeDot={{ r: 4 }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <div>
                <div className="card-title">Ombor holati</div>
                <div className="card-subtitle">{inventory.products} ta faol mahsulot</div>
              </div>
            </div>
            <div className="kv-list">
              <div className="kv"><span className="kv-label"><Boxes size={16} />Ombor qiymati (tannarx)</span><span className="kv-value">{som(inventory.stock_value)}</span></div>
              <div className="kv"><span className="kv-label"><Package size={16} />Sotuv narxida</span><span className="kv-value">{som(inventory.retail_value)}</span></div>
              <div className="kv"><span className="kv-label"><Wallet size={16} />Mijozlardagi avans</span><span className="kv-value">{som(customers.total_advance)}</span></div>
              <div className="kv link" onClick={() => navigate('alerts')}>
                <span className="kv-label"><AlertTriangle size={16} />Kam qolgan / tugagan</span>
                <span className={`kv-value ${inventory.low_stock ? 'text-warning' : ''}`}>{inventory.low_stock} ta <ChevronRight size={14} className="muted" /></span>
              </div>
              <div className="kv link" onClick={() => navigate('alerts')}>
                <span className="kv-label"><CalendarClock size={16} />Muddati yaqin / o'tgan</span>
                <span className={`kv-value ${inventory.expired ? 'text-danger' : inventory.expiring ? 'text-warning' : ''}`}>
                  {inventory.expiring} / {inventory.expired} <ChevronRight size={14} className="muted" />
                </span>
              </div>
            </div>
            {alertsTotal === 0 && <div className="card-body muted" style={{ fontSize: 12.5, paddingTop: 0 }}>Ombor bo'yicha ogohlantirish yo'q.</div>}
          </div>
        </div>

        <div className="dash-grid even">
          <div className="card">
            <div className="card-header"><div><div className="card-title">Eng ko'p sotilganlar</div><div className="card-subtitle">Shu oy, savdo summasi bo'yicha</div></div></div>
            {stats.topProducts.length === 0 ? (
              <EmptyState icon={Package} title="Shu oy hali sotuv yo'q" />
            ) : (
              <div className="table-wrap">
                <table className="table table-sm">
                  <thead><tr><th>Mahsulot</th><th className="num">Sotildi</th><th className="num">Savdo</th></tr></thead>
                  <tbody>
                    {stats.topProducts.map((p) => (
                      <tr key={p.id}>
                        <td><div className="cell-title">{p.name}</div><div className="cell-sub">{productMeta(p) || '—'}</div></td>
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
              <div><div className="card-title">So'nggi sotuvlar</div><div className="card-subtitle">Chekni ochish uchun bosing</div></div>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => navigate('sales')}>Barchasi<ChevronRight size={14} /></button>
            </div>
            {stats.recentSales.length === 0 ? (
              <EmptyState icon={Receipt} title="Hali sotuv yo'q" />
            ) : (
              <div className="table-wrap">
                <table className="table table-sm">
                  <thead><tr><th>Chek</th><th>Vaqt</th><th>Mijoz</th><th className="num">Summa</th></tr></thead>
                  <tbody>
                    {stats.recentSales.map((s) => (
                      <tr key={s.id} className="clickable" onClick={() => setSaleId(s.id)}>
                        <td className="mono">{s.sale_number}</td>
                        <td className="secondary">{fmtTime(s.created_at)}</td>
                        <td>{s.customer_name || <span className="muted">Mijozsiz</span>}</td>
                        <td className="num strong">{money(s.final_total)}{s.debt_amount > 0 && <div className="cell-sub text-danger">qarz {money(s.debt_amount)}</div>}</td>
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
