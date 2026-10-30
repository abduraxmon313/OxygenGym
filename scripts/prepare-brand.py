"""
assets/brand/ papkasidagi logo rasmidan dastur uchun kerakli fayllarni yasaydi:

  renderer/public/logo.png  — yon menyudagi logo (asl rasm, faqat PNG formatga o'tkaziladi)
  assets/icon.png           — oyna ikonkasi (512x512)
  assets/icon.ico           — .exe va o'rnatuvchi ikonkasi (16..256)

Asl rasm kesilmaydi va ranglari o'zgartirilmaydi. Kvadrat bo'lmasa, ikonka uchun
chetlari shaffof joy bilan to'ldiriladi. Papkada rasm bo'lmasa, mavjud ikonkalar qoldiriladi.
"""
import glob
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BRAND_DIR = os.path.join(ROOT, 'assets', 'brand')
EXTS = ('*.png', '*.jpg', '*.jpeg', '*.webp', '*.PNG', '*.JPG', '*.JPEG', '*.WEBP')


def find_logo():
    files = []
    for ext in EXTS:
        files.extend(glob.glob(os.path.join(BRAND_DIR, ext)))
    return sorted(files)[0] if files else None


def main():
    src = find_logo()
    if not src:
        print('assets/brand/ da logo topilmadi — mavjud ikonkalar ishlatiladi')
        return 0

    from PIL import Image

    img = Image.open(src)
    img.load()
    print(f'Logo: {os.path.relpath(src, ROOT)} ({img.width}x{img.height}, {img.mode})')
    rgba = img.convert('RGBA')

    # Yon menyu logosi — asl o'lchamda, o'zgartirishsiz
    public_logo = os.path.join(ROOT, 'renderer', 'public', 'logo.png')
    rgba.save(public_logo, 'PNG', optimize=True)

    # Ikonka — kvadrat polotnoga markazlab joylashtiriladi (kesilmaydi)
    side = max(rgba.width, rgba.height)
    canvas = Image.new('RGBA', (side, side), (0, 0, 0, 0))
    canvas.paste(rgba, ((side - rgba.width) // 2, (side - rgba.height) // 2))
    icon = canvas.resize((512, 512), Image.LANCZOS)
    icon.save(os.path.join(ROOT, 'assets', 'icon.png'), 'PNG', optimize=True)
    icon.save(
        os.path.join(ROOT, 'assets', 'icon.ico'),
        format='ICO',
        sizes=[(16, 16), (24, 24), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)],
    )
    print('Tayyor: renderer/public/logo.png, assets/icon.png, assets/icon.ico')
    return 0


if __name__ == '__main__':
    sys.exit(main())
