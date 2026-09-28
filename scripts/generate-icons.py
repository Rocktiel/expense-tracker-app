"""Gider Defteri uygulama ikonlarını onboarding ekranındaki Ionicons 'wallet' simgesinden üretir.

Kullanım:  pip install pillow && python3 scripts/generate-icons.py
"""
import json
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / 'assets'
VI = ROOT / 'node_modules/@expo/vector-icons/build/vendor/react-native-vector-icons'
FONT = VI / 'Fonts/Ionicons.ttf'
GLYPH = chr(json.load(open(VI / 'glyphmaps/Ionicons.json'))['wallet'])

GREEN = (0x34, 0xD3, 0x99)
# Onboarding kutusu: primary %15 opak, #0A0E13 zemin üzerinde -> ~#102C27
TOP = (0x14, 0x38, 0x31)
BOTTOM = (0x0B, 0x20, 0x1C)
SS = 4  # süper örnekleme (kenar yumuşatma)


def gradient(size: int) -> Image.Image:
    img = Image.new('RGB', (size, size))
    px = img.load()
    for y in range(size):
        t = y / (size - 1)
        c = tuple(round(TOP[i] + (BOTTOM[i] - TOP[i]) * t) for i in range(3))
        for x in range(size):
            px[x, y] = c
    return img


def glyph_layer(size: int, glyph_ratio: float, color) -> Image.Image:
    """Şeffaf zemin üzerinde, mürekkep sınırına göre tam ortalanmış simge."""
    big = size * SS
    target = big * glyph_ratio
    # Önce ölç, sonra mürekkep genişliği hedefe eşit olacak şekilde font boyutunu ayarla
    probe = ImageFont.truetype(str(FONT), 1000)
    l, t, r, b = probe.getbbox(GLYPH)
    scale = target / max(r - l, b - t)
    font = ImageFont.truetype(str(FONT), round(1000 * scale))
    l, t, r, b = font.getbbox(GLYPH)
    layer = Image.new('RGBA', (big, big), (0, 0, 0, 0))
    ImageDraw.Draw(layer).text(((big - (r - l)) / 2 - l, (big - (b - t)) / 2 - t), GLYPH, font=font, fill=color + (255,))
    return layer.resize((size, size), Image.LANCZOS)


def rounded_tile(size: int, tile_ratio: float, radius_ratio: float) -> Image.Image:
    big = size * SS
    tile = round(big * tile_ratio)
    off = (big - tile) // 2
    mask = Image.new('L', (big, big), 0)
    ImageDraw.Draw(mask).rounded_rectangle((off, off, off + tile, off + tile), radius=round(tile * radius_ratio), fill=255)
    bg = gradient(size).resize((big, big)).convert('RGBA')
    out = Image.new('RGBA', (big, big), (0, 0, 0, 0))
    out.paste(bg, (0, 0), mask)
    return out.resize((size, size), Image.LANCZOS)


# 1) Genel ikon (iOS / Expo Go / mağaza): tam dolu kare, köşeleri sistem yuvarlar
icon = gradient(1024).convert('RGBA')
icon.alpha_composite(glyph_layer(1024, 0.56, GREEN))
icon.convert('RGB').save(ASSETS / 'icon.png')

# 2) Android adaptive: arka plan + güvenli alanda (orta %66) ön plan
gradient(1024).save(ASSETS / 'android-icon-background.png')
glyph_layer(1024, 0.38, GREEN).save(ASSETS / 'android-icon-foreground.png')
# Android 13 temalı ikon: tek renk, sistem boyar
glyph_layer(1024, 0.38, (255, 255, 255)).save(ASSETS / 'android-icon-monochrome.png')

# 3) Açılış ekranı: onboarding'deki gibi yuvarlak köşeli kutu içinde cüzdan.
#    Android 12+ açılış simgesini daireyle kırptığı için kutu dairenin içinde kalacak boyutta.
splash = rounded_tile(1024, 0.58, 0.33)
splash.alpha_composite(glyph_layer(1024, 0.58 * 0.54, GREEN))
splash.save(ASSETS / 'splash-icon.png')

# 4) Favicon
fav = rounded_tile(192, 1.0, 0.25)
fav.alpha_composite(glyph_layer(192, 0.6, GREEN))
fav.resize((48, 48), Image.LANCZOS).save(ASSETS / 'favicon.png')
print('İkonlar assets/ klasörüne yazıldı.')
