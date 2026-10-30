import React, { useCallback, useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { ArrowDownLeft, ArrowUpRight, Archive, Pencil, Receipt, SlidersHorizontal, Wallet } from 'lucide-react';
import Modal from './Modal';
import CustomerForm from './CustomerForm';
import CustomerMoneyModal from './CustomerMoneyModal';
import SaleDetail from './SaleDetail';
import { useConfirm } from './ConfirmDialog';
import { EmptyState, Pill, SaleStatus, Tabs } from './ui';
import { PAYMENT_LABELS, TX_LABELS, balanceState, fmtDate, fmtDateTime, signedSom, som } from '../lib/format';

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
      title: 'Mijozni arxivlash',
      message: `"${customer.name}" ro'yxatdan olib tashlanadi. Sotuvlar tarixi saqlanib qoladi.`,
      confirmText: 'Arxivlash',
      danger: true,
    });
    if (!ok) return;
    try {
      await window.api.customers.remove(customer.id);
      toast.success('Mijoz arxivlandi');
      if (onChanged) onChanged();
      onClose();
    } catch (err) {
      toast.error(err.message);
    }
  }

  if (!customer) return null;
  const b = balanceState(customer.balance);
  const cardCls = b.label === 'Qarz' ? 'debt' : b.label === 'Avans' ? 'advance' : '';
  const statusText = b.label === 'Qarz'
    ? 'Mijozning qarzi bor'
    : b.label === 'Avans' ? 'Mijoz hisobida avans bor — keyingi xaridlarda ishlatiladi' : "Hisob yopiq, qarz yoki avans yo'q";
  const limitText = customer.debt_limit === null ? 'Cheklovsiz' : Number(customer.debt_limit) === 0 ? 'Qarz berilmaydi' : som(customer.debt_limit);

  return (
    <>
      <Modal
        size="xl"
        title={customer.name}
        subtitle={[customer.phone, `Mijoz ${fmtDate(customer.created_at)} dan beri`].filter(Boolean).join(' · ')}
        onClose={onClose}
        footer={(
          <>
            <button type="button" className="btn btn-ghost left" onClick={archive}><Archive size={16} />Arxivlash</button>
            <button type="button" className="btn btn-secondary" onClick={() => setEditing(true)}><Pencil size={16} />Tahrirlash</button>
            <button type="button" className="btn btn-secondary" onClick={onClose}>Yopish</button>
          </>
        )}
      >
        <div className="stack">
          <div className={`balance-card ${cardCls}`}>
            <div>
              <div className="label">{b.label === 'Hisob nol' ? 'Hisob holati' : b.label}</div>
              <div className="value">{som(b.amount)}</div>
              <div className="note">{statusText}</div>
            </div>
            <div className="row">
              <button type="button" className="btn btn-primary" onClick={() => setMoney('deposit')}>
                <ArrowDownLeft size={16} />{b.label === 'Qarz' ? "Qarz to'lovi" : "To'lov qabul qilish"}
              </button>
              <button type="button" className="btn btn-secondary" onClick={() => setMoney('withdraw')} disabled={customer.balance <= 0}>
                <ArrowUpRight size={16} />Avansni qaytarish
              </button>
              <button type="button" className="btn btn-secondary btn-icon" title="Hisobni tuzatish" onClick={() => setMoney('adjust')}>
                <SlidersHorizontal size={16} />
              </button>
            </div>
          </div>

          <dl className="dl">
            <div><dt>Xaridlar soni</dt><dd className="tnum">{customer.purchases_count} ta</dd></div>
            <div><dt>Jami xaridlar</dt><dd className="tnum">{som(customer.purchases_total)}</dd></div>
            <div><dt>Qarz limiti</dt><dd>{limitText}</dd></div>
            <div><dt>So'nggi harakat</dt><dd>{customer.last_activity ? fmtDateTime(customer.last_activity) : '—'}</dd></div>
          </dl>
          {customer.notes && <div className="callout callout-info"><span>{customer.notes}</span></div>}

          <div>
            <Tabs
              value={tab}
              onChange={setTab}
              tabs={[
                { id: 'ledger', label: 'Hisob harakatlari', count: customer.transactions.length },
                { id: 'sales', label: 'Xaridlar', count: customer.sales.length },
              ]}
            />
            {tab === 'ledger' && (
              customer.transactions.length === 0 ? (
                <EmptyState icon={Wallet} title="Hisob harakatlari yo'q" text="To'lov, xarid va qarzlar shu yerda ko'rinadi" />
              ) : (
                <div className="table-wrap" style={{ maxHeight: 360 }}>
                  <table className="table table-sm">
                    <thead><tr><th>Sana</th><th>Turi</th><th>Izoh</th><th>Usul</th><th className="num">Summa</th><th className="num">Keyingi balans</th></tr></thead>
                    <tbody>
                      {customer.transactions.map((t) => {
                        const after = balanceState(t.balance_after);
                        return (
                          <tr key={t.id} className={t.sale_id ? 'clickable' : undefined} onClick={t.sale_id ? () => setSaleId(t.sale_id) : undefined}>
                            <td className="nowrap">{fmtDateTime(t.created_at)}</td>
                            <td><Pill tone={TX_TONE[t.type] || 'neutral'}>{TX_LABELS[t.type] || t.type}</Pill></td>
                            <td className="secondary">{t.note || '—'}</td>
                            <td>{t.method ? PAYMENT_LABELS[t.method] : '—'}</td>
                            <td className={`num ${t.amount > 0 ? 'amount-pos' : 'amount-neg'}`}>{signedSom(t.amount)}</td>
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
                <EmptyState icon={Receipt} title="Xaridlar yo'q" />
              ) : (
                <div className="table-wrap" style={{ maxHeight: 360 }}>
                  <table className="table table-sm">
                    <thead><tr><th>Chek</th><th>Sana</th><th className="num">Summa</th><th className="num">Hisobdan</th><th className="num">Qarzga</th><th>Holat</th></tr></thead>
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
