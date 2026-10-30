'use strict';

// Ma'lumotlar bazasi xabarlari tarjimasi. Kalit — o'zbekcha matn, {nom} — o'zgaruvchi.
// Til sozlamalardan olinadi (settings.language).

let LANG = 'uz';
const LANGS = ['uz', 'en', 'ru'];

const CURRENCY = { uz: "so'm", en: 'UZS', ru: 'сум' };
const UNITS = {
  en: { dona: 'pcs', quti: 'box', paket: 'pack', shisha: 'bottle', kg: 'kg', litr: 'l' },
  ru: { dona: 'шт', quti: 'кор.', paket: 'пак.', shisha: 'бут.', kg: 'кг', litr: 'л' },
};

const DICT = {
  en: {
    "Ma'lumotlar bazasi dasturning yangiroq versiyasida yaratilgan. Dasturni yangilang": 'The database was created by a newer version of the app. Please update the app',
    'Mahsulot topilmadi': 'Product not found',
    'Mahsulot nomini kiriting': 'Enter the product name',
    "Narx manfiy bo'lishi mumkin emas": 'Price cannot be negative',
    'Sotuv narxini kiriting': 'Enter the selling price',
    'Kategoriya topilmadi': 'Category not found',
    '"{code}" kodi "{name}" mahsulotida ishlatilgan': 'Code "{code}" is already used by "{name}"',
    '"{code}" kodi arxivdagi "{name}" mahsulotiga tegishli. Uni arxivdan qaytaring yoki boshqa kod kiriting': 'Code "{code}" belongs to archived product "{name}". Restore it or use another code',
    "Rasm formati noto'g'ri": 'Unsupported image format',
    'Rasm juda katta': 'Image is too large',
    "Partiya topilmadi yoki qoldig'i yo'q": 'Batch not found or empty',
    'Bu partiyada faqat {qty} dona bor': 'This batch has only {qty} pcs',
    'Miqdorni kiriting': 'Enter the quantity',
    'Omborda faqat {qty} {unit} bor': 'Only {qty} {unit} in stock',
    'Sababini yozing': 'Enter a reason',
    "Haqiqiy qoldiq musbat butun son bo'lishi kerak": 'Actual stock must be a non-negative whole number',
    "Kamida bitta mahsulot qo'shing": 'Add at least one product',
    "\"{name}\": miqdor musbat butun son bo'lishi kerak": '"{name}": quantity must be a positive whole number',
    "\"{name}\": tannarx manfiy bo'lishi mumkin emas": '"{name}": cost cannot be negative',
    "\"{name}\": sana formati noto'g'ri": '"{name}": invalid date',
    "\"{name}\": yaroqlilik muddati o'tib ketgan ({date})": '"{name}": expiry date has already passed ({date})',
    "\"{name}\": sotuv narxi noto'g'ri": '"{name}": invalid selling price',
    'Kirim topilmadi': 'Receipt not found',
    'Bu kirim allaqachon bekor qilingan': 'This receipt is already cancelled',
    "Bu kirimdan {qty} dona sotilgan yoki hisobdan chiqarilgan, bekor qilib bo'lmaydi. Ortiqcha qismini mahsulot kartasidagi \"Qoldiqni tuzatish\" orqali to'g'rilang": '{qty} pcs from this receipt were already sold or written off, so it cannot be cancelled. Fix the extra quantity with "Correct stock" on the product',
    'Mijoz topilmadi': 'Customer not found',
    'Mijoz ismini kiriting': 'Enter the customer name',
    "Qarz limiti manfiy bo'lishi mumkin emas": 'Credit limit cannot be negative',
    "Telefon raqami to'liq emas: +998 dan keyin 9 ta raqam kiriting": 'Phone number is incomplete: enter 9 digits after +998',
    'Bu telefon raqami "{name}" mijoziga biriktirilgan': 'This phone number belongs to customer "{name}"',
    "Summa manfiy bo'lishi mumkin emas": 'Amount cannot be negative',
    'Mijozning {amount} qarzi bor. Avval hisobni yoping': 'The customer owes {amount}. Settle the account first',
    'Mijoz hisobida {amount} avans bor. Avval pulni qaytaring': 'The customer has {amount} prepaid. Refund it first',
    'Summani kiriting': 'Enter the amount',
    'Mijoz hisobida faqat {amount} bor': 'The customer has only {amount} on account',
    'Tuzatish sababini yozing': 'Enter the reason for the correction',
    "Savatcha bo'sh": 'The cart is empty',
    "Miqdor noto'g'ri": 'Invalid quantity',
    'Mahsulot topilmadi yoki arxivlangan': 'Product not found or archived',
    "\"{name}\": {expired} donasining yaroqlilik muddati o'tgan. Sotish mumkin: {qty} {unit}": '"{name}": {expired} pcs are expired. Available to sell: {qty} {unit}',
    '"{name}" omborda yetarli emas. Qoldiq: {qty} {unit}': 'Not enough "{name}" in stock. Available: {qty} {unit}',
    'Chegirma 100% dan oshmasligi kerak': 'Discount cannot exceed 100%',
    'Chegirma umumiy summadan katta': 'Discount is greater than the total',
    "Mahsulot narxi o'zgargan. Savatcha yangi narxlar bilan yangilandi — summani qayta tekshiring": 'A product price has changed. The cart was updated with new prices — check the total again',
    "To'lov summasi manfiy bo'lishi mumkin emas": 'Payment amount cannot be negative',
    "Hisobdan yechiladigan summa noto'g'ri": 'Invalid amount to charge from account',
    'Hisobdan yechish uchun mijozni tanlang': 'Select a customer to pay from their account',
    'Hisobdan yechiladigan summa sotuv summasidan katta': 'Amount from account is greater than the sale total',
    'Qaytimni hisobga yozish uchun mijozni tanlang': 'Select a customer to put the change on account',
    'Qaytim faqat naqd puldan beriladi. Karta, Click yoki Payme summasini kamaytiring': 'Change can only be given from cash. Reduce the card, Click or Payme amount',
    "To'lov yetarli emas. Qarzga sotish uchun mijozni tanlang": 'Payment is not enough. Select a customer to sell on credit',
    "Qarzga sotish sozlamalarda o'chirilgan": 'Selling on credit is disabled in settings',
    'Bu mijozga qarzga sotish taqiqlangan': 'Selling on credit to this customer is not allowed',
    'Qarz limiti oshadi. Limit: {limit}, sotuvdan keyingi qarz: {debt}': 'Credit limit exceeded. Limit: {limit}, debt after this sale: {debt}',
    'Sotuv topilmadi': 'Sale not found',
    "Bu sotuv to'liq qaytarilgan": 'This sale is fully returned',
    'Qaytariladigan mahsulotni tanlang': 'Select products to return',
    "Bu mahsulot ushbu sotuvda yo'q": 'This product is not in this sale',
    "\"{name}\": qaytarish mumkin bo'lgan miqdor {qty}": '"{name}": you can return at most {qty}',
  },
  ru: {
    "Ma'lumotlar bazasi dasturning yangiroq versiyasida yaratilgan. Dasturni yangilang": 'База данных создана более новой версией программы. Обновите программу',
    'Mahsulot topilmadi': 'Товар не найден',
    'Mahsulot nomini kiriting': 'Введите название товара',
    "Narx manfiy bo'lishi mumkin emas": 'Цена не может быть отрицательной',
    'Sotuv narxini kiriting': 'Введите цену продажи',
    'Kategoriya topilmadi': 'Категория не найдена',
    '"{code}" kodi "{name}" mahsulotida ishlatilgan': 'Код «{code}» уже используется товаром «{name}»',
    '"{code}" kodi arxivdagi "{name}" mahsulotiga tegishli. Uni arxivdan qaytaring yoki boshqa kod kiriting': 'Код «{code}» принадлежит архивному товару «{name}». Восстановите его или укажите другой код',
    "Rasm formati noto'g'ri": 'Неподдерживаемый формат изображения',
    'Rasm juda katta': 'Изображение слишком большое',
    "Partiya topilmadi yoki qoldig'i yo'q": 'Партия не найдена или пуста',
    'Bu partiyada faqat {qty} dona bor': 'В этой партии только {qty} шт',
    'Miqdorni kiriting': 'Введите количество',
    'Omborda faqat {qty} {unit} bor': 'На складе только {qty} {unit}',
    'Sababini yozing': 'Укажите причину',
    "Haqiqiy qoldiq musbat butun son bo'lishi kerak": 'Фактический остаток должен быть целым неотрицательным числом',
    "Kamida bitta mahsulot qo'shing": 'Добавьте хотя бы один товар',
    "\"{name}\": miqdor musbat butun son bo'lishi kerak": '«{name}»: количество должно быть целым положительным числом',
    "\"{name}\": tannarx manfiy bo'lishi mumkin emas": '«{name}»: себестоимость не может быть отрицательной',
    "\"{name}\": sana formati noto'g'ri": '«{name}»: неверная дата',
    "\"{name}\": yaroqlilik muddati o'tib ketgan ({date})": '«{name}»: срок годности уже истёк ({date})',
    "\"{name}\": sotuv narxi noto'g'ri": '«{name}»: неверная цена продажи',
    'Kirim topilmadi': 'Приход не найден',
    'Bu kirim allaqachon bekor qilingan': 'Этот приход уже отменён',
    "Bu kirimdan {qty} dona sotilgan yoki hisobdan chiqarilgan, bekor qilib bo'lmaydi. Ortiqcha qismini mahsulot kartasidagi \"Qoldiqni tuzatish\" orqali to'g'rilang": 'Из этого прихода уже продано или списано {qty} шт, отменить нельзя. Исправьте лишнее через «Корректировка остатка» в карточке товара',
    'Mijoz topilmadi': 'Клиент не найден',
    'Mijoz ismini kiriting': 'Введите имя клиента',
    "Qarz limiti manfiy bo'lishi mumkin emas": 'Лимит долга не может быть отрицательным',
    "Telefon raqami to'liq emas: +998 dan keyin 9 ta raqam kiriting": 'Номер неполный: введите 9 цифр после +998',
    'Bu telefon raqami "{name}" mijoziga biriktirilgan': 'Этот номер уже привязан к клиенту «{name}»',
    "Summa manfiy bo'lishi mumkin emas": 'Сумма не может быть отрицательной',
    'Mijozning {amount} qarzi bor. Avval hisobni yoping': 'У клиента долг {amount}. Сначала закройте счёт',
    'Mijoz hisobida {amount} avans bor. Avval pulni qaytaring': 'У клиента аванс {amount}. Сначала верните деньги',
    'Summani kiriting': 'Введите сумму',
    'Mijoz hisobida faqat {amount} bor': 'На счёте клиента только {amount}',
    'Tuzatish sababini yozing': 'Укажите причину корректировки',
    "Savatcha bo'sh": 'Корзина пуста',
    "Miqdor noto'g'ri": 'Неверное количество',
    'Mahsulot topilmadi yoki arxivlangan': 'Товар не найден или в архиве',
    "\"{name}\": {expired} donasining yaroqlilik muddati o'tgan. Sotish mumkin: {qty} {unit}": '«{name}»: у {expired} шт истёк срок годности. Можно продать: {qty} {unit}',
    '"{name}" omborda yetarli emas. Qoldiq: {qty} {unit}': 'Недостаточно «{name}» на складе. Остаток: {qty} {unit}',
    'Chegirma 100% dan oshmasligi kerak': 'Скидка не может превышать 100%',
    'Chegirma umumiy summadan katta': 'Скидка больше суммы',
    "Mahsulot narxi o'zgargan. Savatcha yangi narxlar bilan yangilandi — summani qayta tekshiring": 'Цена товара изменилась. Корзина обновлена по новым ценам — проверьте сумму ещё раз',
    "To'lov summasi manfiy bo'lishi mumkin emas": 'Сумма оплаты не может быть отрицательной',
    "Hisobdan yechiladigan summa noto'g'ri": 'Неверная сумма списания со счёта',
    'Hisobdan yechish uchun mijozni tanlang': 'Выберите клиента для оплаты со счёта',
    'Hisobdan yechiladigan summa sotuv summasidan katta': 'Сумма со счёта больше суммы продажи',
    'Qaytimni hisobga yozish uchun mijozni tanlang': 'Выберите клиента, чтобы зачислить сдачу на счёт',
    'Qaytim faqat naqd puldan beriladi. Karta, Click yoki Payme summasini kamaytiring': 'Сдача выдаётся только из наличных. Уменьшите сумму по карте, Click или Payme',
    "To'lov yetarli emas. Qarzga sotish uchun mijozni tanlang": 'Оплаты недостаточно. Выберите клиента для продажи в долг',
    "Qarzga sotish sozlamalarda o'chirilgan": 'Продажа в долг отключена в настройках',
    'Bu mijozga qarzga sotish taqiqlangan': 'Этому клиенту продажа в долг запрещена',
    'Qarz limiti oshadi. Limit: {limit}, sotuvdan keyingi qarz: {debt}': 'Превышен лимит долга. Лимит: {limit}, долг после продажи: {debt}',
    'Sotuv topilmadi': 'Продажа не найдена',
    "Bu sotuv to'liq qaytarilgan": 'Эта продажа полностью возвращена',
    'Qaytariladigan mahsulotni tanlang': 'Выберите товары для возврата',
    "Bu mahsulot ushbu sotuvda yo'q": 'Этого товара нет в продаже',
    "\"{name}\": qaytarish mumkin bo'lgan miqdor {qty}": '«{name}»: можно вернуть не более {qty}',
  },
};

function setLanguage(lang) { LANG = LANGS.includes(lang) ? lang : 'uz'; }
function getLanguage() { return LANG; }

function t(template, vars = {}) {
  const dict = DICT[LANG] || {};
  const text = dict[template] || template;
  return text.replace(/\{(\w+)\}/g, (m, k) => (vars[k] === undefined ? m : String(vars[k])));
}

function money(n) {
  return `${String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')} ${CURRENCY[LANG]}`;
}

function unit(u) {
  const v = u || 'dona';
  return (UNITS[LANG] && UNITS[LANG][v]) || v;
}

module.exports = { setLanguage, getLanguage, t, money, unit, LANGS };
