import React, { useCallback, useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { CalendarClock, CheckCircle2, PackagePlus } from 'lucide-react';
import { EmptyState, PageHeader, Pill, Tabs } from '../components/ui';
import { fmtDate, money, productMeta } from '../lib/format';

export default function Alerts({ navigate, settings }) {
  const [low, setLow] = useState([]);
  const [expiring, setExpiring] = useState([]);
  const [tab, setTab] = useState('stock');
  const days = Number(settings.expiryAlertDays) || 30;

  const load = useCallback(async () => {
    try {
      const [l, e] = await Promise.all([window.api.products.lowStock(), window.api.products.expiring(days)]);
      setLow(l);
      setExpiring(e);
    } catch (err) {
      toast.error(err.message);
    }
  }, [days]);
  useEffect(() => { load(); }, [load]);

  return (
    <>
      <PageHeader
        title="Ogohlantirishlar"
        subtitle={`Kam qolgan mahsulotlar va ${days} kun ichida muddati tugaydigan partiyalar`}
        actions={<button type="button" className="btn btn-secondary" onClick={() => navigate('stock')}><PackagePlus size={16} />Kirim qilish</button>}
      />
      <div className="content">
        <Tabs
          value={tab}
          onChange={setTab}
          tabs={[
            { id: 'stock', label: 'Kam qolgan / tugagan', count: low.length },
            { id: 'expiry', label: 'Yaroqlilik muddati', count: expiring.length },
          ]}
        />

        {tab === 'stock' && (
          <div className="table-wrap">
            {low.length === 0 ? (
              <EmptyState icon={CheckCircle2} title="Barcha mahsulotlar yetarli" text="Qoldig'i minimal darajadan kam mahsulot yo'q" />
            ) : (
              <table className="table">
                <thead><tr><th>Kod</th><th>Mahsulot</th><th>Kategoriya</th><th className="num">Qoldiq</th><th className="num">Minimal</th><th className="num">Oxirgi tannarx</th><th>Holat</th></tr></thead>
                <tbody>
                  {low.map((p) => (
                    <tr key={p.id}>
                      <td className="mono secondary">{p.code}</td>
                      <td><div className="cell-title">{p.name}</div><div className="cell-sub">{productMeta(p) || '—'}</div></td>
                      <td className="secondary">{p.category_name || '—'}</td>
                      <td className="num strong">{p.stock} {p.unit}</td>
                      <td className="num secondary">{p.min_stock}</td>
                      <td className="num secondary">{money(p.cost_price)}</td>
                      <td>{p.stock <= 0 ? <Pill tone="danger">Tugagan</Pill> : <Pill tone="warning">Kam qoldi</Pill>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {tab === 'expiry' && (
          <div className="table-wrap">
            {expiring.length === 0 ? (
              <EmptyState icon={CalendarClock} title="Muddati yaqin partiya yo'q" text={`${days} kun ichida yaroqlilik muddati tugaydigan mahsulot topilmadi`} />
            ) : (
              <table className="table">
                <thead><tr><th>Mahsulot</th><th>Partiya</th><th className="num">Qoldiq</th><th>Yaroqlilik</th><th className="num">Qolgan kun</th><th>Tavsiya</th></tr></thead>
                <tbody>
                  {expiring.map((b) => (
                    <tr key={b.id}>
                      <td><div className="cell-title">{b.product_name}</div><div className="cell-sub">{[productMeta(b), `Kod ${b.code}`].filter(Boolean).join(' · ')}</div></td>
                      <td className="mono secondary">{b.batch_number}</td>
                      <td className="num">{b.remaining} {b.unit}</td>
                      <td>{fmtDate(b.expiry_date)}</td>
                      <td className="num">
                        {b.days_left < 0 ? <Pill tone="danger">O'tgan</Pill> : <Pill tone={b.days_left <= 14 ? 'danger' : 'warning'}>{b.days_left} kun</Pill>}
                      </td>
                      <td className="secondary">{b.days_left < 0 ? 'Sotuvdan oling' : b.days_left <= 14 ? 'Chegirma bilan tezroq soting' : 'Birinchi navbatda soting'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </>
  );
}
