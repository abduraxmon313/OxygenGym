import React, { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { UserPlus, Users } from 'lucide-react';
import Modal from './Modal';
import CustomerForm from './CustomerForm';
import { EmptyState, SearchInput } from './ui';
import { balanceState, initials, som } from '../lib/format';
import { t } from '../lib/i18n';

export default function CustomerPicker({ onSelect, onClose }) {
  const [query, setQuery] = useState('');
  const [list, setList] = useState([]);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    let alive = true;
    const timer = setTimeout(() => {
      window.api.customers.list({ search: query, limit: 50 })
        .then((rows) => { if (alive) setList(rows); })
        .catch((err) => toast.error(err.message));
    }, 120);
    return () => { alive = false; clearTimeout(timer); };
  }, [query]);

  return (
    <>
      <Modal
        size="md"
        title={t('Mijozni tanlash')}
        subtitle={t('Hisobdan yechish yoki qarzga sotish uchun mijoz tanlanadi')}
        onClose={onClose}
        footer={(
          <>
            <button type="button" className="btn btn-secondary left" onClick={() => setCreating(true)}><UserPlus size={16} />{t('Yangi mijoz')}</button>
            <button type="button" className="btn btn-secondary" onClick={onClose}>{t('Yopish')}</button>
          </>
        )}
      >
        <SearchInput value={query} onChange={setQuery} placeholder={t('Ism yoki telefon raqami')} autoFocus />
        <div className="list-box mt-12" style={{ maxHeight: 420 }}>
          {list.length === 0 ? (
            <EmptyState icon={Users} title={t('Mijoz topilmadi')} text={t("Yangi mijoz qo'shishingiz mumkin")} />
          ) : list.map((c) => {
            const b = balanceState(c.balance);
            return (
              <div key={c.id} className="dropdown-item" onClick={() => onSelect(c)}>
                <div className="row" style={{ gap: 12, minWidth: 0 }}>
                  <div className="avatar">{initials(c.name)}</div>
                  <div style={{ minWidth: 0 }}>
                    <div className="cell-title">{c.name}</div>
                    <div className="cell-sub tnum">{c.phone || t('Telefon kiritilmagan')}</div>
                  </div>
                </div>
                <div className="num" style={{ textAlign: 'right' }}>
                  <div className={b.cls}>{b.amount ? som(b.amount) : '—'}</div>
                  <div className="cell-sub">{b.label}</div>
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
