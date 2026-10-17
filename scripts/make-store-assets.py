#!/usr/bin/env python3
"""Composes the store header/banner images from the generated screenshots + logo.
Needs Pillow and the Inter font (falls back to DejaVu). Run after scripts/store-screenshots.mjs and scripts/make-icons.py."""
import pathlib
from PIL import Image, ImageDraw, ImageFont

root = pathlib.Path(__file__).resolve().parent.parent
shots = root / 'store' / 'screenshots' / '6.9in-1320x2868'
BG, FG, DIM, ACC = (11, 11, 12), (245, 245, 247), (142, 142, 152), (200, 241, 53)

def font(weight: str, size: int):
    for p in (f'/usr/share/fonts/opentype/inter/Inter-{weight}.otf', f'/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'):
        try: return ImageFont.truetype(p, size)
        except OSError: pass
    return ImageFont.load_default()

def phone(name: str, w: int) -> Image.Image:
    im = Image.open(shots / f'{name}.png').convert('RGB'); h = round(im.height * w / im.width)
    im = im.resize((w, h), Image.LANCZOS)
    pad = 6; out = Image.new('RGB', (w + 2 * pad, h + 2 * pad), (38, 38, 42))       # thin bezel
    out.paste(im, (pad, pad))
    mask = Image.new('L', out.size, 0); ImageDraw.Draw(mask).rounded_rectangle([0, 0, *out.size], radius=round(w * .13), fill=255)
    res = Image.new('RGBA', out.size, (0, 0, 0, 0)); res.paste(out, mask=mask); return res

def banner(W: int, H: int, path: pathlib.Path, big: bool):
    s = W / 2048
    im = Image.new('RGB', (W, H), BG); d = ImageDraw.Draw(im)
    logo = Image.open(root / 'store' / 'assets' / 'icon-1024.png').resize((round(132 * s), round(132 * s)), Image.LANCZOS)
    m = Image.new('L', logo.size, 0); ImageDraw.Draw(m).rounded_rectangle([0, 0, *logo.size], radius=round(30 * s), fill=255)
    x0 = round(130 * s); im.paste(logo, (x0, round((150 if big else 90) * s)), m)
    d.text((x0 + round(160 * s), round((178 if big else 118) * s)), 'Plate', font=font('Bold', round(72 * s)), fill=FG)
    y = round(380 * s) if big else round(280 * s)
    d.text((x0, y), 'Lift. Log.', font=font('Bold', round(112 * s)), fill=FG)
    d.text((x0, y + round(128 * s)), 'Beat last week.', font=font('Bold', round(112 * s)), fill=ACC)
    d.text((x0, y + round(300 * s)), 'Offline workout tracker with routines,\nprogressive overload and 750+ exercises.', font=font('Medium', round(40 * s)), fill=DIM, spacing=round(12 * s))
    pw = round(430 * s)
    for name, x, top in (('2-workout', 1090, 120), ('3-exercise', 1560, 220)):
        p = phone(name, pw); im.paste(p, (round(x * s), round(top * s)), p)
    im.save(path, optimize=True); print(path.relative_to(root), im.size)

out = root / 'store' / 'assets'
banner(2048, 1024, out / 'header-2048x1024.png', True)      # general store / marketing header (2:1)
banner(1024, 500, out / 'feature-graphic-1024x500.png', False)   # Google Play-style feature graphic, if you ever ship there
