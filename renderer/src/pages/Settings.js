import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';

export default function Settings() {
  const [settings, setSettings] = useState({});
  const [loaded, setLoaded] = useState(false);

  useEffect(() => { load(); }, []);

  async function load() {
    if (!window.api) return;
    const data = await window.api.settings.get();
    setSettings(data || {});
    setLoaded(true);
  }

  function update(key, value) {
    setSettings(prev => ({ ...prev, [key]: value }));
  }

  async function save() {
    try {
      await window.api.settings.update(settings);
      toast.success('✅ Sozlamalar saqlandi!');
    } catch (err) {
      toast.error('Xatolik: ' + err.message);
    }
  }

  async function createBackup() {
    try {
      const result = await window.api.backup.create();
      if (result.success) toast.success(`✅ Zaxira nusxa saqlandi!\n${result.path}`);
      else toast.error(result.message);
    } catch (err) { toast.error(err.message); }
  }

  async function restoreBackup() {
    try {
      const result = await window.api.backup.restore();
      if (result.success) {
        toast.success('✅ Tiklandi! Ilova qayta yuklanadi...');
        setTimeout(() => window.location.reload(), 1500);
      } else {
        toast.error(result.message);
      }
    } catch (err) { toast.error(err.message); }
  }

  if (!loaded) return null;

  return (
    <>
      <div className="page-header">
        <h2>⚙️ Sozlamalar</h2>
        <button className="btn btn-primary" onClick={save}>💾 Saqlash</button>
      </div>
      <div className="page-body">
        {/* Shop Info */}
        <div className="card" style={{ marginBottom: 16 }}>
          <h3 style={{ marginBottom: 16 }}>🏪 Do'kon ma'lumotlari</h3>
          <div className="grid-3">
            <div className="form-group"><label>Do'kon nomi</label><input className="form-input" value={settings.shopName || ''} onChange={(e) => update('shopName', e.target.value)} /></div>
            <div className="form-group"><label>Telefon</label><input className="form-input" value={settings.shopPhone || ''} onChange={(e) => update('shopPhone', e.target.value)} /></div>
            <div className="form-group"><label>Valyuta</label><input className="form-input" value={settings.currency || ''} onChange={(e) => update('currency', e.target.value)} /></div>
          </div>
          <div className="form-group"><label>Manzil</label><input className="form-input" value={settings.shopAddress || ''} onChange={(e) => update('shopAddress', e.target.value)} /></div>
        </div>

        {/* Loyalty */}
        <div className="card" style={{ marginBottom: 16 }}>
          <h3 style={{ marginBottom: 16 }}>🏆 Loyalty (Sodiqlik) sozlamalari</h3>
          <div className="form-group">
            <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input type="checkbox" checked={settings.loyaltyEnabled === 'true'} onChange={(e) => update('loyaltyEnabled', e.target.checked ? 'true' : 'false')} />
              Loyalty tizimini yoqish
            </label>
          </div>
          <div className="form-group">
            <label>Har necha so'mga 1 ball?</label>
            <input className="form-input" type="number" value={settings.loyaltyPointsPerUnit || 1000} onChange={(e) => update('loyaltyPointsPerUnit', e.target.value)} />
          </div>
          <h4 style={{ marginBottom: 8, marginTop: 16 }}>Darajalar:</h4>
          <div className="table-container">
            <table>
              <thead><tr><th>Daraja</th><th>Min. ball</th><th>Chegirma %</th></tr></thead>
              <tbody>
                <tr>
                  <td>🥉 Bronze</td>
                  <td><input className="form-input" type="number" value={settings.loyaltyBronzeMin || 0} onChange={(e) => update('loyaltyBronzeMin', e.target.value)} /></td>
                  <td><input className="form-input" type="number" value={settings.loyaltyBronzeDiscount || 2} onChange={(e) => update('loyaltyBronzeDiscount', e.target.value)} /></td>
                </tr>
                <tr>
                  <td>🥈 Silver</td>
                  <td><input className="form-input" type="number" value={settings.loyaltySilverMin || 1000} onChange={(e) => update('loyaltySilverMin', e.target.value)} /></td>
                  <td><input className="form-input" type="number" value={settings.loyaltySilverDiscount || 5} onChange={(e) => update('loyaltySilverDiscount', e.target.value)} /></td>
                </tr>
                <tr>
                  <td>🥇 Gold</td>
                  <td><input className="form-input" type="number" value={settings.loyaltyGoldMin || 5000} onChange={(e) => update('loyaltyGoldMin', e.target.value)} /></td>
                  <td><input className="form-input" type="number" value={settings.loyaltyGoldDiscount || 8} onChange={(e) => update('loyaltyGoldDiscount', e.target.value)} /></td>
                </tr>
                <tr>
                  <td>💎 Diamond</td>
                  <td><input className="form-input" type="number" value={settings.loyaltyDiamondMin || 15000} onChange={(e) => update('loyaltyDiamondMin', e.target.value)} /></td>
                  <td><input className="form-input" type="number" value={settings.loyaltyDiamondDiscount || 12} onChange={(e) => update('loyaltyDiamondDiscount', e.target.value)} /></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Alerts */}
        <div className="card" style={{ marginBottom: 16 }}>
          <h3 style={{ marginBottom: 16 }}>🔔 Ogohlantirish sozlamalari</h3>
          <div className="grid-2">
            <div className="form-group"><label>Minimum qoldiq ogohlantirishi (dona)</label><input className="form-input" type="number" value={settings.lowStockAlert || 3} onChange={(e) => update('lowStockAlert', e.target.value)} /></div>
            <div className="form-group"><label>Yaroqlik muddati ogohlantirishi (kun)</label><input className="form-input" type="number" value={settings.expiryAlertDays || 30} onChange={(e) => update('expiryAlertDays', e.target.value)} /></div>
          </div>
        </div>

        {/* Backup */}
        <div className="card" style={{ marginBottom: 16 }}>
          <h3 style={{ marginBottom: 16 }}>💾 Zaxira nusxa (Backup)</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginBottom: 16 }}>
            Ma'lumotlaringizni xavfsiz saqlash uchun muntazam zaxira nusxa oling. USB ga saqlashni tavsiya qilamiz.
          </p>
          <div style={{ display: 'flex', gap: 12 }}>
            <button className="btn btn-primary" onClick={createBackup}>💾 Zaxira nusxa olish</button>
            <button className="btn btn-outline" onClick={restoreBackup}>📂 Nusxadan tiklash</button>
          </div>
        </div>
      </div>
    </>
  );
}
