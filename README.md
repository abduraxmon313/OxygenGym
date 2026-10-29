# 🏋️ OxygenGym — Zal uchun sotuv dasturi

**OxygenGym** — supplement do'koni (zal) uchun to'liq sotuv va ombor boshqaruv dasturi. Windows kompyuter uchun .EXE ilova.

## ✨ Imkoniyatlar

- 🛒 **POS (Sotuv)** — tez sotuv, barcode skanerlash (kamera orqali)
- 📦 **Mahsulotlar** — to'liq katalog, kategoriyalar, brendlar
- 📥 **Kirim (Priyomka)** — mahsulot qabul qilish, partiya (lot) kuzatuvi
- 📅 **FEFO tizimi** — yaroqlik muddati bo'yicha avtomatik sotuv (First Expired First Out)
- 👥 **Mijozlar** — loyalty ball, darajalar (Bronze/Silver/Gold/Diamond)
- 🧾 **Sotuvlar tarixi** — barcha sotuvlar, qaytarish (refund)
- 📈 **Hisobotlar** — kunlik sotuv, mahsulot bo'yicha, foyda-zarar
- 🔔 **Ogohlantirishlar** — kam qolgan mahsulot, muddati yaqin partiyalar
- 📋 **Audit log** — barcha harakatlar qayd qilinadi
- 💾 **Zaxira nusxa** — backup va restore
- 🔄 **Avtomatik yangilash** — GitHub'dan yangi versiyani yuklab olish
- 🚛 **Yetkazib beruvchilar** — bazasi va tarix
- ⚙️ **Sozlamalar** — do'kon, loyalty, ogohlantirishlar

## 💻 Texnologiyalar

- **Electron** — Windows desktop ilova
- **React** — foydalanuvchi interfeysi
- **SQLite** — lokal ma'lumotlar bazasi (laptopda saqlanadi)
- **better-sqlite3** — tez va ishonchli DB
- **@zxing** — kamera orqali barcode skanerlash

## 📥 O'rnatish (Foydalanuvchi uchun)

1. [Releases](https://github.com/abduraxmon313/OxygenGym/releases) sahifasiga o'ting
2. Eng yangi versiyadan `OxygenGym-Setup-x.x.x.exe` ni yuklab oling
3. .EXE ni ishga tushiring va o'rnating
4. Ish stolida 🏋️ OxygenGym icon paydo bo'ladi — bosing va ishlating!

## 🔧 Dasturchi uchun (Development)

### Talab qilinadi:
- Node.js 18+
- npm

### O'rnatish:

```bash
# Repo yuklab olish
git clone https://github.com/abduraxmon313/OxygenGym.git
cd OxygenGym

# Asosiy bog'liqliklarni o'rnatish
npm install

# React ilovasi bog'liqliklarini o'rnatish
cd renderer && npm install && cd ..
```

### Ishga tushirish (development):

```bash
# React dev server ishga tushirish
cd renderer && npm start

# Boshqa terminalda Electron ishga tushirish
npm run dev
```

### .EXE yaratish (build):

```bash
# React build + Electron build
npm run build
```

`dist/` papkasida .EXE fayl paydo bo'ladi.

## 📁 Loyiha tuzilishi

```
OxygenGym/
├── main.js              ← Electron asosiy fayl
├── preload.js           ← IPC bridge (xavfsizlik)
├── package.json         ← Asosiy konfiguratsiya
├── src/
│   └── database.js      ← SQLite ma'lumotlar bazasi
├── renderer/            ← React ilova (UI)
│   ├── public/
│   └── src/
│       ├── App.js       ← Asosiy komponent
│       ├── components/  ← Qayta ishlatiladigan komponentlar
│       │   ├── BarcodeScanner.js  ← Kamera barcode
│       │   ├── Modal.js
│       │   └── Sidebar.js
│       ├── pages/       ← Sahifalar
│       │   ├── Dashboard.js    ← Bosh panel
│       │   ├── POS.js          ← Sotuv
│       │   ├── Products.js     ← Mahsulotlar
│       │   ├── StockReceive.js ← Kirim
│       │   ├── Sales.js        ← Sotuvlar tarixi
│       │   ├── Customers.js    ← Mijozlar
│       │   ├── Suppliers.js    ← Yetkazib beruvchilar
│       │   ├── Alerts.js       ← Ogohlantirishlar
│       │   ├── Reports.js      ← Hisobotlar
│       │   ├── AuditLog.js     ← Audit
│       │   └── Settings.js     ← Sozlamalar
│       └── styles/
│           └── global.css      ← Dizayn
└── assets/              ← Icon va rasmlar
```

## 💾 Ma'lumotlar qayerda saqlanadi?

```
C:\Users\[Siz]\AppData\Roaming\oxygengym\data\oxygengym.db
```

Ma'lumotlar laptop xotirasida saqlanadi. Internet kerak emas!

## 🔄 Yangilash

Ilova ochilganda GitHub'dan yangi versiyani tekshiradi. Agar yangi versiya bo'lsa — bildirishnoma chiqadi va bitta tugma bilan yangilaysiz.

## 📄 Litsenziya

MIT

---

**OxygenGym** — Sizning zalingiz uchun yaratilgan! 🏋️
