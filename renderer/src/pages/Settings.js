import React, { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { Check, Moon, RefreshCw, Sun } from 'lucide-react';
import { Field, PageHeader } from '../components/ui';
import { useTheme } from '../lib/theme';
import { LANGUAGES, t, useLang } from '../lib/i18n';

const EDITABLE = ['shopName', 'shopPhone', 'shopAddress', 'allowDebt', 'lowStockAlert', 'expiryAlertDays'];
const pick = (s) => Object.fromEntries(EDITABLE.map((k) => [k, s[k] ?? '']));

function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const options = [
    { id: 'light', label: t('Kunduzgi'), icon: Sun },
    { id: 'dark', label: t('Tungi'), icon: Moon },
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

function LanguagePicker() {
  const { lang, setLang } = useLang();
  return (
    <div className="row" style={{ flexWrap: 'wrap' }}>
      {LANGUAGES.map((l) => (
        <button key={l.id} type="button" className={`btn ${lang === l.id ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setLang(l.id)}>
          {lang === l.id && <Check size={15} />}{l.label}
        </button>
      ))}
    </div>
  );
}

export default function Settings({ settings, reloadSettings, appInfo }) {
  const [form, setForm] = useState(() => pick(settings));
  const [touched, setTouched] = useState(false);
  const [checking, setChecking] = useState(false);
  const [saving, setSaving] = useState(false);

  // Til almashtirilganda tahrirlanayotgan qiymatlar yo'qolmasin
  useEffect(() => { if (!touched) setForm(pick(settings)); }, [settings, touched]);

  const set = (key) => (e) => {
    setTouched(true);
    const value = e.target.type === 'checkbox' ? String(e.target.checked) : e.target.value;
    setForm((f) => ({ ...f, [key]: value }));
  };
  const dirty = JSON.stringify(form) !== JSON.stringify(pick(settings));

  async function save() {
    setSaving(true);
    try {
      await window.api.settings.update(form);
      setTouched(false);
      await reloadSettings();
      toast.success(t('Sozlamalar saqlandi'));
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function checkUpdates() {
    setChecking(true);
    try {
      const res = await window.api.updates.check();
      if (res.dev) toast(t('Ishlab chiqish rejimida yangilanish tekshirilmaydi'));
      else if (res.available) toast.success(t('Yangi versiya topildi: {v}', { v: res.latest }));
      else toast.success(t("Siz eng so'nggi versiyadasiz ({v})", { v: res.current }));
    } catch (err) {
      toast.error(t("Tekshirib bo'lmadi: {m}", { m: err.message }));
    } finally {
      setChecking(false);
    }
  }

  return (
    <>
      <PageHeader
        title={t('Sozlamalar')}
        subtitle={t("Do'kon ma'lumotlari, savdo qoidalari, til va ko'rinish")}
        actions={<button type="button" className="btn btn-primary" onClick={save} disabled={!dirty || saving}>{t("O'zgarishlarni saqlash")}</button>}
      />
      <div className="content">
        <div className="card">
          <div className="card-body">
            <div className="settings-grid">
              <div><h3>{t("Do'kon")}</h3><p>{t("Dastur sarlavhasida va hisobotlarda ko'rinadi.")}</p></div>
              <div className="grid-2">
                <Field label={t("Do'kon nomi")}><input className="input" value={form.shopName} onChange={set('shopName')} /></Field>
                <Field label={t('Telefon')}><input className="input" value={form.shopPhone} onChange={set('shopPhone')} placeholder="+998 ..." /></Field>
                <Field label={t('Manzil')} className="span-2"><input className="input" value={form.shopAddress} onChange={set('shopAddress')} /></Field>
              </div>
            </div>

            <div className="settings-grid">
              <div><h3>{t('Savdo')}</h3><p>{t("Qarzga sotish butunlay o'chirilsa, to'lov yetmasa sotuv yakunlanmaydi.")}</p></div>
              <div className="stack-sm">
                <label className="checkbox">
                  <input type="checkbox" checked={form.allowDebt !== 'false'} onChange={set('allowDebt')} />
                  {t('Mijozlarga qarzga sotishga ruxsat berish')}
                </label>
                <span className="field-hint">{t('Har bir mijoz uchun alohida qarz limitini mijoz kartasida belgilash mumkin.')}</span>
              </div>
            </div>

            <div className="settings-grid">
              <div><h3>{t('Ogohlantirishlar')}</h3><p>{t('Ombor nazorati uchun chegaralar.')}</p></div>
              <div className="grid-2">
                <Field label={t('Yangi mahsulot uchun minimal qoldiq')} hint={t("Mahsulot kartasida alohida o'zgartirish mumkin")}>
                  <input className="input tnum" type="number" min="0" value={form.lowStockAlert} onChange={set('lowStockAlert')} />
                </Field>
                <Field label={t('Yaroqlilik muddati ogohlantirishi (kun)')} hint={t('Shuncha kun qolganda ogohlantiradi')}>
                  <input className="input tnum" type="number" min="1" value={form.expiryAlertDays} onChange={set('expiryAlertDays')} />
                </Field>
              </div>
            </div>

            <div className="settings-grid">
              <div><h3>{t('Til')}</h3><p>{t('Dastur tili darhol almashadi va saqlanadi.')}</p></div>
              <LanguagePicker />
            </div>

            <div className="settings-grid">
              <div><h3>{t("Ko'rinish")}</h3><p>{t("Kunduzgi yoki tungi rejim. Yon menyudagi \"Sozlamalar\" ostidan ham almashtirish mumkin.")}</p></div>
              <ThemeToggle />
            </div>

            <div className="settings-grid">
              <div><h3>{t('Dastur')}</h3><p>{t("Yangilanishlar GitHub orqali avtomatik tekshiriladi. Yangilanganda ma'lumotlar saqlanib qoladi.")}</p></div>
              <div className="stack-sm">
                <div className="row"><span className="secondary">{t('Joriy versiya:')}</span><strong>{appInfo.version || '—'}</strong></div>
                <div>
                  <button type="button" className="btn btn-secondary" onClick={checkUpdates} disabled={checking}>
                    <RefreshCw size={16} />{checking ? t('Tekshirilmoqda…') : t('Yangilanishni tekshirish')}
                  </button>
                </div>
                {appInfo.dataDir && <span className="field-hint mono">{t("Ma'lumotlar: {p}", { p: appInfo.dataDir })}</span>}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
