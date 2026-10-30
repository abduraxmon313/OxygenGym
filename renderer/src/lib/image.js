import { t } from './i18n';

// Mahsulot rasmini kichraytirib, WebP formatida data-URL qilib qaytaradi.
// Bazada katta rasmlar saqlansa ro'yxatlar sekinlashadi va baza og'irlashadi.
const MAX_SIDE = 480;
const MAX_INPUT = 15 * 1024 * 1024;

export function resizeImage(file) {
  return new Promise((resolve, reject) => {
    if (!file || !/^image\/(png|jpe?g|webp|gif|bmp)$/.test(file.type)) {
      reject(new Error(t('Faqat PNG, JPG yoki WEBP rasm tanlang')));
      return;
    }
    if (file.size > MAX_INPUT) {
      reject(new Error(t("Rasm 15 MB dan katta bo'lmasligi kerak")));
      return;
    }
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, MAX_SIDE / Math.max(img.width, img.height));
      const w = Math.max(1, Math.round(img.width * scale));
      const h = Math.max(1, Math.round(img.height * scale));
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, w, h);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL('image/webp', 0.86));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error(t("Rasmni o'qib bo'lmadi")));
    };
    img.src = url;
  });
}
