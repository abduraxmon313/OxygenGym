import React, { useCallback, useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { ArrowDownLeft, ArrowUpRight, Archive, Pencil, Receipt, SlidersHorizontal, Wallet } from 'lucide-react';
import Modal from './Modal';
import CustomerForm from './CustomerForm';
import CustomerMoneyModal from './CustomerMoneyModal';
import SaleDetail from './SaleDetail';
import { useConfirm } from './ConfirmDialog';
import { EmptyState, Pill, SaleStatus, Tabs } from './ui';
import { balanceState, fmtDate, fmtDateTime, paymentLabel, signedSom, som, txLabel } from '../lib/format';
import { t } from '../lib/i18n';

const TX_TONE = { deposit: 'success', withdraw: 'warning', sale: 'primary', refund: 'neutral', adjustment: 'warning' };

export default function CustomerDetail({ customerId, onClose, onChanged }) {
  const [customer, setCustomer] = useState(null);
  const [tab, setTab] = useState('ledger');
  const [money, setMoney] = useState(null);
  const [editing, setEditing] = useState(false);
  const [saleId, setSaleId] = useState(null);
  const confirm = useConfirm();

  const load = useCallback(async () => {
    try { setCustomer(await window.api.customers.getById(customerId)); } catch (err) { toast.error(err.message); }
  }, [customerId]);
  useEffect(() => { load(); }, [load]);

  const changed = async () => {
    await load();
    if (onChanged) onChanged();
  };

  async function archive() {
    const ok = await confirm({
      title: t('Mijozni arxivlash'),
      message: t('"{name}" ro\'yxatdan olib tashlanadi. Sotuvlar tarixi saqlanib qoladi.', { name: customer.name }),
      confirmText: t('Arxivlash'),
      danger: true,
    });
    if (!ok) return;
    try {
      await window.api.customers.remove(customer.id);
      toast.success(t('Mijoz arxivlandi'));
      if (onChanged) onChanged();
      onClose();
    } catch (err) {
      toast.error(err.message);
    }
  }

  if (!customer) return null;
  const b = balanceState(customer.balance);
  const cardCls = b.kind === 'debt' ? 'debt' : b.kind === 'advance' ? 'advance' : '';
  const statusText = b.kind === 'debt'
    ? t('Mijozning qarzi bor')
    : b.kind === 'advance' ? t('Mijoz hisobida avans bor — keyingi xaridlarda ishlatiladi') : t("Hisob yopiq, qarz yoki avans yo'q");
  const limitText = customer.debt_limit === null ? t('Cheklovsiz') : Number(customer.debt_limit) === 0 ? t('Qarz berilmaydi') : som(customer.debt_limit);

  return (
    <>
      <Modal
        size="xl"
        title={customer.name}
        subtitle={[customer.phone, t('Mijoz {d} dan beri', { d: fmtDate(customer.created_at) })].filter(Boolean).join(' · ')}
        onClose={onClose}
        footer={(
          <>
            <button type="button" className="btn btn-ghost left" onClick={archive}><Archive size={16} />{t('Arxivlash')}</button>
            <button type="button" className="btn btn-secondary" onClick={() => setEditing(true)}><Pencil size={16} />{t('Tahrirlash')}</button>
            <button type="button" className="btn btn-secondary" onClick={onClose}>{t('Yopish')}</button>
          </>
        )}
      >
        <div className="stack">
          <div className={`balance-card ${cardCls}`}>
            <div>
              <div className="label">{b.kind === 'zero' ? t('Hisob holati') : b.label}</div>
              <div className="value">{som(b.amount)}</div>
              <div className="note">{statusText}</div>
            </div>
            <div className="row">
              <button type="button" className="btn btn-primary" onClick={() => setMoney('deposit')}>
                <ArrowDownLeft size={16} />{b.kind === 'debt' ? t("Qarz to'lovi") : t("To'lov qabul qilish")}
              </button>
              <button type="button" className="btn btn-secondary" onClick={() => setMoney('withdraw')} disabled={customer.balance <= 0}>
                <ArrowUpRight size={16} />{t('Avansni qaytarish')}
              </button>
              <button type="button" className="btn btn-secondary btn-icon" title={t('Hisobni tuzatish')} onClick={() => setMoney('adjust')}>
                <SlidersHorizontal size={16} />
              </button>
            </div>
          </div>

          <dl className="dl">
            <div><dt>{t('Xaridlar soni')}</dt><dd className="tnum">{t('{n} ta', { n: customer.purchases_count })}</dd></div>
            <div><dt>{t('Jami xaridlar')}</dt><dd className="tnum">{som(customer.purchases_total)}</dd></div>
            <div><dt>{t('Qarz limiti')}</dt><dd>{limitText}</dd></div>
            <div><dt>{t("So'nggi harakat")}</dt><dd>{customer.last_activity ? fmtDateTime(customer.last_activity) : '—'}</dd></div>
          </dl>
          {customer.notes && <div className="callout callout-info"><span>{customer.notes}</span></div>}

          <div>
            <Tabs
              value={tab}
              onChange={setTab}
              tabs={[
                { id: 'ledger', label: t('Hisob harakatlari'), count: customer.transactions.length },
                { id: 'sales', label: t('Xaridlar'), count: customer.sales.length },
              ]}
            />
            {tab === 'ledger' && (
              customer.transactions.length === 0 ? (
                <EmptyState icon={Wallet} title={t("Hisob harakatlari yo'q")} text={t("To'lov, xarid va qarzlar shu yerda ko'rinadi")} />
              ) : (
                <div className="table-wrap" style={{ maxHeight: 360 }}>
                  <table className="table table-sm">
                    <thead><tr><th>{t('Sana')}</th><th>{t('Turi')}</th><th>{t('Izoh')}</th><th>{t('Usul')}</th><th className="num">{t('Summa')}</th><th className="num">{t('Keyingi balans')}</th></tr></thead>
                    <tbody>
                      {customer.transactions.map((tx) => {
                        const after = balanceState(tx.balance_after);
                        return (
                          <tr key={tx.id} className={tx.sale_id ? 'clickable' : undefined} onClick={tx.sale_id ? () => setSaleId(tx.sale_id) : undefined}>
                            <td className="nowrap">{fmtDateTime(tx.created_at)}</td>
                            <td><Pill tone={TX_TONE[tx.type] || 'neutral'}>{txLabel(tx.type)}</Pill></td>
                            <td className="secondary">{tx.note || '—'}</td>
                            <td>{tx.method ? paymentLabel(tx.method) : '—'}</td>
                            <td className={`num ${tx.amount > 0 ? 'amount-pos' : 'amount-neg'}`}>{signedSom(tx.amount)}</td>
                            <td className={`num ${after.cls}`}>{after.amount ? `${after.label} ${som(after.amount)}` : som(0)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )
            )}
            {tab === 'sales' && (
              customer.sales.length === 0 ? (
                <EmptyState icon={Receipt} title={t("Xaridlar yo'q")} />
              ) : (
                <div className="table-wrap" style={{ maxHeight: 360 }}>
                  <table className="table table-sm">
                    <thead><tr><th>{t('Chek')}</th><th>{t('Sana')}</th><th className="num">{t('Summa')}</th><th className="num">{t('Hisobdan')}</th><th className="num">{t('Qarzga')}</th><th>{t('Holat')}</th></tr></thead>
                    <tbody>
                      {customer.sales.map((s) => (
                        <tr key={s.id} className="clickable" onClick={() => setSaleId(s.id)}>
                          <td className="mono">{s.sale_number}</td>
                          <td className="nowrap">{fmtDateTime(s.created_at)}</td>
                          <td className="num strong">{som(s.final_total)}{s.returned_amount > 0 && <div className="cell-sub text-danger">−{som(s.returned_amount)}</div>}</td>
                          <td className="num">{s.balance_used ? som(s.balance_used) : '—'}</td>
                          <td className={`num ${s.debt_amount ? 'amount-neg' : ''}`}>{s.debt_amount ? som(s.debt_amount) : '—'}</td>
                          <td><SaleStatus sale={s} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )
            )}
          </div>
        </div>
      </Modal>

      {money && (
        <CustomerMoneyModal customer={customer} mode={money} onClose={() => setMoney(null)} onDone={() => { setMoney(null); changed(); }} />
      )}
      {editing && (
        <CustomerForm customer={customer} onClose={() => setEditing(false)} onSaved={() => { setEditing(false); changed(); }} />
      )}
      {saleId && <SaleDetail saleId={saleId} onClose={() => setSaleId(null)} onChanged={changed} />}
    </>
  );
}
