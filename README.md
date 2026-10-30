# OxygenGym

Zal bari uchun savdo va ombor dasturi: protein, kreatin, vitaminlar, ichimliklar va aksessuarlar sotuvi. Windows uchun. Ma'lumotlar kompyuterning o'zida saqlanadi, internet faqat yangilanish uchun kerak.

## O'rnatish

1. [Releases](https://github.com/abduraxmon313/OxygenGym/releases/latest) sahifasidan `OxygenGym-Setup-x.y.z.exe` ni yuklab oling.
2. Faylni ishga tushiring va o'rnating.

Keyingi versiyalar dastur ichidan yangilanadi. Yangi versiya chiqqanda o'ng yuqori burchakda xabar chiqadi.

## Bo'limlar

| Bo'lim | Vazifasi |
|---|---|
| Bosh panel | Bugungi savdo, foyda, kassa tushumi, mijozlar qarzi, 14 kunlik grafik |
| Sotuv | Kategoriya va qidiruv bo'yicha tez sotuv, chegirma, mijoz tanlash |
| Mahsulotlar | Qo'lda kiritish: nom, kod, kategoriya, brend, hajm, ta'm, narx. Har bir ta'm/hajm alohida mahsulot |
| Kirim | Kelgan mahsulot: miqdor, tannarx, sotuv narxi, yaroqlilik muddati |
| Ogohlantirishlar | Kam qolgan va muddati yaqin/o'tgan partiyalar |
| Sotuvlar | Barcha cheklar, to'lov tafsilotlari, qaytarish |
| Mijozlar | Mijoz hisobi: avans, qarz, to'lovlar tarixi |
| Hisobotlar | Kunlik savdo, mahsulotlar, kategoriyalar, kassa |
| Harakatlar jurnali | Har bir muhim amal qayd qilinadi |
| Sozlamalar | Do'kon, qarz qoidasi, ogohlantirishlar, zaxira nusxa, yangilanish |

## Mijoz hisobi qanday ishlaydi

Har bir mijozning bitta balansi bor:

- **Musbat balans — avans.** Mijoz oldindan pul qoldirgan. Xarid qilganda avval shu puldan yechiladi.
- **Manfiy balans — qarz.** Mijoz qarzga olgan.

Sotuvda to'lov tartibi:

1. Mijozda avans bo'lsa, avval hisobdan yechiladi (summani o'zgartirish mumkin).
2. Qolgan qismi naqd, karta, Click yoki Payme bilan to'lanadi (bir nechtasini birga ishlatish mumkin).
3. Pul yetmasa, qolgani mijoz qarziga yoziladi. Mijozsiz sotuvda to'liq to'lov majburiy.
4. Ortiqcha naqd pul qaytim sifatida beriladi yoki mijoz hisobiga yoziladi.

Har bir mijozga qarz sharti qo'yiladi: cheklovsiz, limit bilan yoki qarz berilmaydi. Barcha harakatlar (to'lov, xarid, qaytarish, tuzatish) mijoz kartasida keyingi balansi bilan ko'rinadi. Balansni to'g'ridan-to'g'ri o'zgartirib bo'lmaydi, faqat sababi yozilgan "Tuzatish" orqali o'zgaradi.

## Logo

Logoni `assets/brand/` papkasiga bitta rasm (PNG, JPG yoki WEBP) qilib joylang. Build vaqtida `scripts/prepare-brand.py` shu rasmdan yon menyu logosini (o'zgartirishsiz) va dastur ikonkasini yasaydi.

## Ombor va qaytarish qoidalari

- **Muddati o'tgan partiya sotilmaydi.** Bunday tovar "Ogohlantirishlar" va "Ombor holati" oynasida ko'rinadi; uni hisobdan chiqarish kerak.
- **Hisobdan chiqarish** (shikastlangan, yo'qolgan, muddati o'tgan) va **qoldiqni tuzatish** (inventarizatsiya) mahsulotning "Ombor holati" oynasida. Barchasi "Hisobotlar → Yo'qotishlar" da ko'rinadi.
- **Qisman qaytarish:** chekdan istalgan miqdorni qaytarish mumkin. Summa chegirma ulushi bilan hisoblanadi; avval mijoz hisobidan yechilgan yoki qarzga yozilgan qism hisobga qaytadi, qolgani naqd beriladi.
- **Kirimni bekor qilish:** undan hech narsa sotilmagan bo'lsa.
- **Arxiv:** mahsulot va mijozlar o'chirilmaydi, arxivlanadi va istalgan vaqt qaytariladi.
- Savatcha ochilgandan keyin narx o'zgarsa, sotuv to'xtatiladi va savatcha yangi narx bilan yangilanadi.

## Ma'lumotlar va zaxira nusxa

- Baza: `%APPDATA%\OxygenGym\data\oxygengym.db`
- Har kuni dastur ochilganda avtomatik nusxa olinadi va so'nggi 14 kunlik nusxa `%APPDATA%\OxygenGym\backups` papkasida saqlanadi.
- Sozlamalar sahifasidan nusxani USB'ga saqlash va nusxadan tiklash mumkin.
- Yangi versiya eski bazani avtomatik yangilaydi (migratsiya). Ma'lumotlar yo'qolmaydi.

## Yangi versiya chiqarish

1. `package.json` dagi `version` ni oshiring (masalan `1.1.0` → `1.2.0`).
2. O'zgarishlarni `main` ga merge qiling.
3. GitHub Actions `.exe` ni yig'adi va `v1.2.0` release'ni yaratadi. O'rnatilgan dasturlar yangilanishni o'zi topadi.

## Dasturchi uchun

```bash
npm install
cd renderer && npm install && cd ..

# ishlab chiqish: ikkita terminalda
cd renderer && npm start
npm run dev

# Windows installer
npm run build
```

Texnologiyalar: Electron, React, SQLite (better-sqlite3), electron-updater.
