import React, { useCallback, useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { ArchiveRestore, ArrowDownLeft, HandCoins, UserPlus, Users, Wallet } from 'lucide-react';
import { EmptyState, PageHeader, SearchInput, Segmented, StatCard } from '../components/ui';
import CustomerForm from '../components/CustomerForm';
import CustomerDetail from '../components/CustomerDetail';
import CustomerMoneyModal from '../components/CustomerMoneyModal';
import { balanceState, currency, fmtDateTime, initials, money, som } from '../lib/format';
import { t } from '../lib/i18n';

export default function Customers() {
  const [list, setList] = useState([]);
  const [summary, setSummary] = useState(null);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('all');
  const [creating, setCreating] = useState(false);
  const [openId, setOpenId] = useState(null);
  const [paying, setPaying] = useState(null);

  const load = useCallback(async () => {
    try {
      const [rows, s] = await Promise.all([
        window.api.customers.list({ search: query, status: status === 'all' ? undefined : status }),
        window.api.customers.summary(),
      ]);
      setList(rows);
      setSummary(s);
    } catch (err) {
      toast.error(err.message);
    }
  }, [query, status]);

  async function restore(c) {
    try {
      await window.api.customers.restore(c.id);
      toast.success(t('"{name}" arxivdan qaytarildi', { name: c.name }));
      load();
    } catch (err) {
      toast.error(err.message);
    }
  }

  useEffect(() => {
    const timer = setTimeout(load, 120);
    return () => clearTimeout(timer);
  }, [load]);

  return (
    <>
      <PageHeader
        title={t('Mijozlar')}
        subtitle={t("Mijoz hisoblari: avans, qarz va to'lovlar tarixi")}
        actions={<button type="button" className="btn btn-primary" onClick={() => setCreating(true)}><UserPlus size={16} />{t('Yangi mijoz')}</button>}
      />
      <div className="content">
        {summary && (
          <div className="stat-grid">
            <StatCard label={t('Mijozlar')} value={summary.count} unit={t('ta')} icon={Users} tone="primary" />
            <StatCard label={t('Jami qarz')} value={money(summary.total_debt)} unit={currency()} hint={t('{n} ta qarzdor', { n: summary.debtors || 0 })} icon={HandCoins} tone={summary.total_debt ? 'danger' : 'neutral'} onClick={() => setStatus('debt')} />
            <StatCard label={t('Jami avans')} value={money(summary.total_advance)} unit={currency()} hint={t('{n} ta mijozda', { n: summary.with_advance || 0 })} icon={Wallet} tone="success" onClick={() => setStatus('advance')} />
            <StatCard label={t('Sof holat')} value={money(summary.total_advance - summary.total_debt)} unit={currency()} hint={t('Avans minus qarz')} icon={ArrowDownLeft} />
          </div>
        )}

        <div className="toolbar">
          <SearchInput value={query} onChange={setQuery} placeholder={t('Ism yoki telefon raqami')} />
          <Segmented
            options={[{ id: 'all', label: t('Hammasi') }, { id: 'debt', label: t('Qarzdorlar') }, { id: 'advance', label: t('Avansi borlar') }, { id: 'archived', label: t('Arxiv') }]}
            value={status}
            onChange={setStatus}
          />
        </div>

        <div className="table-wrap">
          {list.length === 0 ? (
            <EmptyState
              icon={Users}
              title={status === 'debt' ? t("Qarzdor mijoz yo'q") : status === 'advance' ? t("Avansi bor mijoz yo'q") : status === 'archived' ? t("Arxiv bo'sh") : t('Mijoz topilmadi')}
              text={t("Mijoz qo'shganda uning bergan pulini yoki eski qarzini darhol kiritish mumkin")}
              action={status === 'all' && !query && <button type="button" className="btn btn-primary" onClick={() => setCreating(true)}><UserPlus size={16} />{t("Mijoz qo'shish")}</button>}
            />
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>{t('Mijoz')}</th><th>{t('Telefon')}</th><th className="num">{t('Hisob')}</th><th>{t('Qarz limiti')}</th>
                  <th className="num">{t('Xaridlar')}</th><th>{t("So'nggi harakat")}</th><th className="actions" />
                </tr>
              </thead>
              <tbody>
                {list.map((c) => {
                  const b = balanceState(c.balance);
                  return (
                    <tr key={c.id} className={status === 'archived' ? 'dim' : 'clickable'} onClick={status === 'archived' ? undefined : () => setOpenId(c.id)}>
                      <td>
                        <div className="row" style={{ gap: 12 }}>
                          <div className="avatar">{initials(c.name)}</div>
                          <div><div className="cell-title">{c.name}</div>{c.notes && <div className="cell-sub" style={{ maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.notes}</div>}</div>
                        </div>
                      </td>
                      <td className="secondary nowrap tnum">{c.phone || '—'}</td>
                      <td className="num">
                        <div className={b.cls}>{b.amount ? som(b.amount) : '—'}</div>
                        <div className="cell-sub">{b.label}</div>
                      </td>
                      <td className="secondary">{c.debt_limit === null ? t('Cheklovsiz') : Number(c.debt_limit) === 0 ? t('Qarz berilmaydi') : som(c.debt_limit)}</td>
                      <td className="num"><div>{t('{n} ta', { n: c.purchases_count })}</div><div className="cell-sub">{money(c.purchases_total)}</div></td>
                      <td className="secondary nowrap">{c.last_activity ? fmtDateTime(c.last_activity) : '—'}</td>
                      <td className="actions" onClick={(e) => e.stopPropagation()}>
                        {status === 'archived' ? (
                          <button type="button" className="btn btn-secondary btn-sm" onClick={() => restore(c)}><ArchiveRestore size={14} />{t('Qaytarish')}</button>
                        ) : (
                          <button type="button" className="btn btn-secondary btn-sm" onClick={() => setPaying(c)}>
                            <ArrowDownLeft size={14} />{c.balance < 0 ? t("Qarz to'lovi") : t("To'lov")}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {creating && <CustomerForm onClose={() => setCreating(false)} onSaved={(c) => { setCreating(false); load(); setOpenId(c.id); }} />}
      {openId && <CustomerDetail customerId={openId} onClose={() => setOpenId(null)} onChanged={load} />}
      {paying && <CustomerMoneyModal customer={paying} mode="deposit" onClose={() => setPaying(null)} onDone={() => { setPaying(null); load(); }} />}
    </>
  );
}
