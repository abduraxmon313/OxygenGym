import React, { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { UserPlus, Users } from 'lucide-react';
import Modal from './Modal';
import CustomerForm from './CustomerForm';
import { EmptyState, SearchInput } from './ui';
import { balanceState, initials, som } from '../lib/format';

export default function CustomerPicker({ onSelect, onClose }) {
  const [query, setQuery] = useState('');
  const [list, setList] = useState([]);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    let alive = true;
    const t = setTimeout(() => {
      window.api.customers.list({ search: query, limit: 50 })
        .then((rows) => { if (alive) setList(rows); })
        .catch((err) => toast.error(err.message));
    }, 120);
    return () => { alive = false; clearTimeout(t); };
  }, [query]);

  return (
    <>
      <Modal
        size="md"
        title="Mijozni tanlash"
        subtitle="Hisobdan yechish yoki qarzga sotish uchun mijoz tanlanadi"
        onClose={onClose}
        footer={(
          <>
            <button type="button" className="btn btn-secondary left" onClick={() => setCreating(true)}><UserPlus size={16} />Yangi mijoz</button>
            <button type="button" className="btn btn-secondary" onClick={onClose}>Yopish</button>
          </>
        )}
      >
        <SearchInput value={query} onChange={setQuery} placeholder="Ism yoki telefon raqami" autoFocus />
        <div className="mt-12" style={{ border: '1px solid var(--border)', borderRadius: 10, maxHeight: 420, overflowY: 'auto' }}>
          {list.length === 0 ? (
            <EmptyState icon={Users} title="Mijoz topilmadi" text="Yangi mijoz qo'shishingiz mumkin" />
          ) : list.map((c) => {
            const b = balanceState(c.balance);
            return (
              <div key={c.id} className="dropdown-item" style={{ borderRadius: 0, borderBottom: '1px solid var(--border)', padding: '10px 14px' }} onClick={() => onSelect(c)}>
                <div className="row" style={{ gap: 12, minWidth: 0 }}>
                  <div className="avatar">{initials(c.name)}</div>
                  <div style={{ minWidth: 0 }}>
                    <div className="cell-title">{c.name}</div>
                    <div className="cell-sub">{c.phone || 'Telefon kiritilmagan'}</div>
                  </div>
                </div>
                <div className="num" style={{ textAlign: 'right' }}>
                  <div className={b.cls}>{b.amount ? som(b.amount) : '—'}</div>
                  <div className="cell-sub">{b.amount ? b.label : 'Hisob nol'}</div>
                </div>
              </div>
            );
          })}
        </div>
      </Modal>
      {creating && (
        <CustomerForm onClose={() => setCreating(false)} onSaved={(c) => { setCreating(false); onSelect(c); }} />
      )}
    </>
  );
}
