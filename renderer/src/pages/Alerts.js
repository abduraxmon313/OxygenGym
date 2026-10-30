import React, { useCallback, useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { CalendarClock, CheckCircle2, PackagePlus } from 'lucide-react';
import { EmptyState, PageHeader, Pill, ProductThumb, Tabs } from '../components/ui';
import StockManager from '../components/StockManager';
import { catName, fmtDate, money, productMeta, unitLabel } from '../lib/format';
import { t } from '../lib/i18n';

export default function Alerts({ navigate, settings, refreshAlerts }) {
  const [stockId, setStockId] = useState(null);
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
        title={t('Ogohlantirishlar')}
        subtitle={t('Kam qolgan mahsulotlar va {n} kun ichida muddati tugaydigan partiyalar', { n: days })}
        actions={<button type="button" className="btn btn-secondary" onClick={() => navigate('stock')}><PackagePlus size={16} />{t('Kirim qilish')}</button>}
      />
      <div className="content">
        <Tabs
          value={tab}
          onChange={setTab}
          tabs={[
            { id: 'stock', label: t('Kam qolgan / tugagan'), count: low.length },
            { id: 'expiry', label: t('Yaroqlilik muddati'), count: expiring.length },
          ]}
        />

        {tab === 'stock' && (
          <div className="table-wrap">
            {low.length === 0 ? (
              <EmptyState icon={CheckCircle2} title={t('Barcha mahsulotlar yetarli')} text={t("Qoldig'i minimal darajadan kam mahsulot yo'q")} />
            ) : (
              <table className="table">
                <thead><tr><th>{t('Kod')}</th><th>{t('Mahsulot')}</th><th>{t('Kategoriya')}</th><th className="num">{t('Sotish mumkin')}</th><th className="num">{t('Minimal')}</th><th className="num">{t('Oxirgi tannarx')}</th><th>{t('Holat')}</th><th className="actions" /></tr></thead>
                <tbody>
                  {low.map((p) => (
                    <tr key={p.id}>
                      <td className="mono secondary">{p.code}</td>
                      <td><div className="cell-product"><ProductThumb product={p} size="sm" /><div><div className="cell-title">{p.name}</div><div className="cell-sub">{productMeta(p) || '—'}</div></div></div></td>
                      <td className="secondary">{catName(p.category_name) || '—'}</td>
                      <td className="num strong">{p.sellable} {unitLabel(p.unit)}{p.expired_qty > 0 && <div className="cell-sub text-danger">{t("+{n} muddati o'tgan", { n: p.expired_qty })}</div>}</td>
                      <td className="num secondary">{p.min_stock}</td>
                      <td className="num secondary">{money(p.cost_price)}</td>
                      <td>{p.sellable <= 0 ? <Pill tone="danger">{t('Tugagan')}</Pill> : <Pill tone="warning">{t('Kam qoldi')}</Pill>}</td>
                      <td className="actions"><button type="button" className="btn btn-ghost btn-sm" onClick={() => setStockId(p.id)}>{t('Ombor')}</button></td>
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
              <EmptyState icon={CalendarClock} title={t("Muddati yaqin partiya yo'q")} text={t('{n} kun ichida yaroqlilik muddati tugaydigan mahsulot topilmadi', { n: days })} />
            ) : (
              <table className="table">
                <thead><tr><th>{t('Mahsulot')}</th><th>{t('Partiya')}</th><th className="num">{t('Qoldiq')}</th><th>{t('Yaroqlilik')}</th><th className="num">{t('Qolgan kun')}</th><th>{t('Tavsiya')}</th><th className="actions" /></tr></thead>
                <tbody>
                  {expiring.map((b) => (
                    <tr key={b.id}>
                      <td><div className="cell-title">{b.product_name}</div><div className="cell-sub">{[productMeta(b), t('Kod {c}', { c: b.code })].filter(Boolean).join(' · ')}</div></td>
                      <td className="mono secondary">{b.batch_number}</td>
                      <td className="num">{b.remaining} {unitLabel(b.unit)}</td>
                      <td>{fmtDate(b.expiry_date)}</td>
                      <td className="num">
                        {b.days_left < 0 ? <Pill tone="danger">{t("O'tgan")}</Pill> : <Pill tone={b.days_left <= 14 ? 'danger' : 'warning'}>{t('{n} kun', { n: b.days_left })}</Pill>}
                      </td>
                      <td className="secondary">{b.days_left < 0 ? t('Sotilmaydi — hisobdan chiqaring') : b.days_left <= 14 ? t('Chegirma bilan tezroq soting') : t('Birinchi navbatda sotiladi')}</td>
                      <td className="actions"><button type="button" className={`btn btn-sm ${b.days_left < 0 ? 'btn-danger-outline' : 'btn-ghost'}`} onClick={() => setStockId(b.product_id)}>{b.days_left < 0 ? t('Chiqarish') : t('Ombor')}</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
      {stockId && <StockManager productId={stockId} onClose={() => setStockId(null)} onChanged={() => { load(); if (refreshAlerts) refreshAlerts(); }} />}
    </>
  );
}
