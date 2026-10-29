import React, { useCallback, useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { ArrowDownLeft, HandCoins, UserPlus, Users, Wallet } from 'lucide-react';
import { EmptyState, PageHeader, SearchInput, Segmented, StatCard } from '../components/ui';
import CustomerForm from '../components/CustomerForm';
import CustomerDetail from '../components/CustomerDetail';
import CustomerMoneyModal from '../components/CustomerMoneyModal';
import { balanceState, fmtDateTime, initials, money, som } from '../lib/format';

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

  useEffect(() => {
    const t = setTimeout(load, 120);
    return () => clearTimeout(t);
  }, [load]);

  return (
    <>
      <PageHeader
        title="Mijozlar"
        subtitle="Mijoz hisoblari: avans, qarz va to'lovlar tarixi"
        actions={<button type="button" className="btn btn-primary" onClick={() => setCreating(true)}><UserPlus size={16} />Yangi mijoz</button>}
      />
      <div className="content">
        {summary && (
          <div className="stat-grid">
            <StatCard label="Mijozlar" value={summary.count} unit="ta" icon={Users} tone="primary" />
            <StatCard label="Jami qarz" value={money(summary.total_debt)} unit="so'm" hint={`${summary.debtors || 0} ta qarzdor`} icon={HandCoins} tone={summary.total_debt ? 'danger' : 'neutral'} onClick={() => setStatus('debt')} />
            <StatCard label="Jami avans" value={money(summary.total_advance)} unit="so'm" hint={`${summary.with_advance || 0} ta mijozda`} icon={Wallet} tone="success" onClick={() => setStatus('advance')} />
            <StatCard label="Sof holat" value={money(summary.total_advance - summary.total_debt)} unit="so'm" hint="Avans minus qarz" icon={ArrowDownLeft} />
          </div>
        )}

        <div className="toolbar">
          <SearchInput value={query} onChange={setQuery} placeholder="Ism yoki telefon raqami" />
          <Segmented
            options={[{ id: 'all', label: 'Hammasi' }, { id: 'debt', label: 'Qarzdorlar' }, { id: 'advance', label: 'Avansi borlar' }]}
            value={status}
            onChange={setStatus}
          />
        </div>

        <div className="table-wrap">
          {list.length === 0 ? (
            <EmptyState
              icon={Users}
              title={status === 'debt' ? "Qarzdor mijoz yo'q" : status === 'advance' ? "Avansi bor mijoz yo'q" : 'Mijoz topilmadi'}
              text="Mijoz qo'shganda uning bergan pulini yoki eski qarzini darhol kiritish mumkin"
              action={status === 'all' && !query && <button type="button" className="btn btn-primary" onClick={() => setCreating(true)}><UserPlus size={16} />Mijoz qo'shish</button>}
            />
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Mijoz</th><th>Telefon</th><th className="num">Hisob</th><th>Qarz limiti</th>
                  <th className="num">Xaridlar</th><th>So'nggi harakat</th><th className="actions" />
                </tr>
              </thead>
              <tbody>
                {list.map((c) => {
                  const b = balanceState(c.balance);
                  return (
                    <tr key={c.id} className="clickable" onClick={() => setOpenId(c.id)}>
                      <td>
                        <div className="row" style={{ gap: 12 }}>
                          <div className="avatar">{initials(c.name)}</div>
                          <div><div className="cell-title">{c.name}</div>{c.notes && <div className="cell-sub" style={{ maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.notes}</div>}</div>
                        </div>
                      </td>
                      <td className="secondary nowrap">{c.phone || '—'}</td>
                      <td className="num">
                        <div className={b.cls}>{b.amount ? som(b.amount) : '—'}</div>
                        <div className="cell-sub">{b.amount ? b.label : 'Hisob nol'}</div>
                      </td>
                      <td className="secondary">{c.debt_limit === null ? 'Cheklovsiz' : Number(c.debt_limit) === 0 ? 'Qarz berilmaydi' : som(c.debt_limit)}</td>
                      <td className="num"><div>{c.purchases_count} ta</div><div className="cell-sub">{money(c.purchases_total)}</div></td>
                      <td className="secondary nowrap">{c.last_activity ? fmtDateTime(c.last_activity) : '—'}</td>
                      <td className="actions" onClick={(e) => e.stopPropagation()}>
                        <button type="button" className="btn btn-secondary btn-sm" onClick={() => setPaying(c)}>
                          <ArrowDownLeft size={14} />{c.balance < 0 ? "Qarz to'lovi" : "To'lov"}
                        </button>
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
