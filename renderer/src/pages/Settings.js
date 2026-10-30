import React, { useCallback, useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { Download, FolderOpen, Moon, RefreshCw, Sun, Upload } from 'lucide-react';
import { Field, PageHeader } from '../components/ui';
import { useConfirm } from '../components/ConfirmDialog';
import { fileSize, fmtDateTime } from '../lib/format';
import { useTheme } from '../lib/theme';

function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const options = [
    { id: 'light', label: 'Kunduzgi', icon: Sun },
    { id: 'dark', label: 'Tungi', icon: Moon },
  ];
  return (
    <div className="theme-cards">
      {options.map(({ id, label, icon: Icon }) => (
        <button key={id} type="button" className={`theme-card ${id}${theme === id ? ' active' : ''}`} onClick={() => setTheme(id)}>
          <div className="preview">
            <div className="side" />
            <div className="main"><div className="bar accent" /><div className="bar" /><div className="bar" /></div>
          </div>
          <div className="label"><Icon size={15} />{label}</div>
        </button>
      ))}
    </div>
  );
}

export default function Settings({ settings, reloadSettings, appInfo }) {
  const [form, setForm] = useState(settings);
  const [backups, setBackups] = useState({ dir: '', files: [] });
  const [checking, setChecking] = useState(false);
  const [saving, setSaving] = useState(false);
  const confirm = useConfirm();

  useEffect(() => { setForm(settings); }, [settings]);

  const loadBackups = useCallback(async () => {
    try { setBackups(await window.api.backup.info()); } catch (err) { toast.error(err.message); }
  }, []);
  useEffect(() => { loadBackups(); }, [loadBackups]);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.type === 'checkbox' ? String(e.target.checked) : e.target.value }));
  const dirty = JSON.stringify(form) !== JSON.stringify(settings);

  async function save() {
    setSaving(true);
    try {
      await window.api.settings.update(form);
      await reloadSettings();
      toast.success('Sozlamalar saqlandi');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function backup() {
    try {
      const res = await window.api.backup.create();
      if (res) toast.success('Zaxira nusxa saqlandi');
    } catch (err) {
      toast.error(err.message);
    }
  }

  async function restore() {
    const ok = await confirm({
      title: 'Zaxira nusxadan tiklash',
      message: "Hozirgi barcha ma'lumotlar tanlangan nusxa bilan almashtiriladi.\nXavfsizlik uchun hozirgi holat avval avtomatik saqlab qo'yiladi.",
      confirmText: 'Faylni tanlash',
      danger: true,
    });
    if (!ok) return;
    try {
      const res = await window.api.backup.restore();
      if (res) {
        toast.success("Ma'lumotlar tiklandi. Dastur qayta yuklanmoqda…");
        setTimeout(() => window.location.reload(), 1200);
      }
    } catch (err) {
      toast.error(err.message);
    }
  }

  async function checkUpdates() {
    setChecking(true);
    try {
      const res = await window.api.updates.check();
      if (res.dev) toast('Ishlab chiqish rejimida yangilanish tekshirilmaydi');
      else if (res.available) toast.success(`Yangi versiya topildi: ${res.latest}`);
      else toast.success(`Siz eng so'nggi versiyadasiz (${res.current})`);
    } catch (err) {
      toast.error(`Tekshirib bo'lmadi: ${err.message}`);
    } finally {
      setChecking(false);
    }
  }

  return (
    <>
      <PageHeader
        title="Sozlamalar"
        subtitle="Do'kon ma'lumotlari, savdo qoidalari va ma'lumotlar xavfsizligi"
        actions={<button type="button" className="btn btn-primary" onClick={save} disabled={!dirty || saving}>O'zgarishlarni saqlash</button>}
      />
      <div className="content">
        <div className="card">
          <div className="card-body">
            <div className="settings-grid">
              <div><h3>Do'kon</h3><p>Dastur sarlavhasida va hisobotlarda ko'rinadi.</p></div>
              <div className="grid-2">
                <Field label="Do'kon nomi"><input className="input" value={form.shopName || ''} onChange={set('shopName')} /></Field>
                <Field label="Telefon"><input className="input" value={form.shopPhone || ''} onChange={set('shopPhone')} placeholder="+998 ..." /></Field>
                <Field label="Manzil" className="span-2"><input className="input" value={form.shopAddress || ''} onChange={set('shopAddress')} /></Field>
              </div>
            </div>

            <div className="settings-grid">
              <div><h3>Savdo</h3><p>Qarzga sotish butunlay o'chirilsa, to'lov yetmasa sotuv yakunlanmaydi.</p></div>
              <div className="stack-sm">
                <label className="checkbox">
                  <input type="checkbox" checked={form.allowDebt !== 'false'} onChange={set('allowDebt')} />
                  Mijozlarga qarzga sotishga ruxsat berish
                </label>
                <span className="field-hint">Har bir mijoz uchun alohida qarz limitini mijoz kartasida belgilash mumkin.</span>
              </div>
            </div>

            <div className="settings-grid">
              <div><h3>Ogohlantirishlar</h3><p>Ombor nazorati uchun chegaralar.</p></div>
              <div className="grid-2">
                <Field label="Yangi mahsulot uchun minimal qoldiq" hint="Mahsulot kartasida alohida o'zgartirish mumkin">
                  <input className="input tnum" type="number" min="0" value={form.lowStockAlert || ''} onChange={set('lowStockAlert')} />
                </Field>
                <Field label="Yaroqlilik muddati ogohlantirishi (kun)" hint="Shuncha kun qolganda ogohlantiradi">
                  <input className="input tnum" type="number" min="1" value={form.expiryAlertDays || ''} onChange={set('expiryAlertDays')} />
                </Field>
              </div>
            </div>

            <div className="settings-grid">
              <div>
                <h3>Zaxira nusxa</h3>
                <p>Har kuni dastur ochilganda avtomatik nusxa olinadi va so'nggi 14 kunlik nusxa saqlanadi. Haftada bir marta USB'ga ham nusxa oling.</p>
              </div>
              <div className="stack">
                <div className="row" style={{ flexWrap: 'wrap' }}>
                  <button type="button" className="btn btn-primary" onClick={backup}><Download size={16} />Nusxani saqlash…</button>
                  <button type="button" className="btn btn-secondary" onClick={restore}><Upload size={16} />Nusxadan tiklash…</button>
                  <button type="button" className="btn btn-ghost" onClick={() => window.api.app.openBackupFolder().catch((err) => toast.error(err.message))}><FolderOpen size={16} />Avtomatik nusxalar papkasi</button>
                </div>
                <div className="table-wrap" style={{ maxHeight: 240 }}>
                  <table className="table table-sm">
                    <thead><tr><th>Fayl</th><th>Sana</th><th className="num">Hajmi</th></tr></thead>
                    <tbody>
                      {backups.files.length === 0 ? (
                        <tr><td colSpan={3} className="muted">Hali avtomatik nusxa yo'q</td></tr>
                      ) : backups.files.slice(0, 10).map((f) => (
                        <tr key={f.name}><td className="mono">{f.name}</td><td>{fmtDateTime(f.modified)}</td><td className="num">{fileSize(f.size)}</td></tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <span className="field-hint mono">{backups.dir}</span>
              </div>
            </div>

            <div className="settings-grid">
              <div><h3>Dastur</h3><p>Yangilanishlar GitHub orqali avtomatik tekshiriladi. Yangilanganda ma'lumotlar saqlanib qoladi.</p></div>
              <div className="stack-sm">
                <div className="row"><span className="secondary">Joriy versiya:</span><strong>{appInfo.version || '—'}</strong></div>
                <div>
                  <button type="button" className="btn btn-secondary" onClick={checkUpdates} disabled={checking}>
                    <RefreshCw size={16} />{checking ? 'Tekshirilmoqda…' : 'Yangilanishni tekshirish'}
                  </button>
                </div>
                {appInfo.dataDir && <span className="field-hint mono">Ma'lumotlar: {appInfo.dataDir}</span>}
              </div>
            </div>

            <div className="settings-grid">
              <div><h3>Ko'rinish</h3><p>Kunduzgi yoki tungi rejim. Tanlov darhol qo'llanadi va saqlanadi. Yon menyudagi "Sozlamalar" ostidan ham almashtirish mumkin.</p></div>
              <div className="stack-sm">
                <ThemeToggle />
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
