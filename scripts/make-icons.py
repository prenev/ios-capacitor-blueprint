#!/usr/bin/env python3
"""Builds every brand raster from brand/mark.svg (the biceps logo): iOS app icon (1024, no alpha), splash images,
web favicon/icon, and store/assets/icon-1024.png. Needs Pillow and `npm install` (uses @resvg/resvg-js).
Run: python3 scripts/make-icons.py"""
import pathlib, re, subprocess, tempfile
from PIL import Image

root = pathlib.Path(__file__).resolve().parent.parent
BG = '#0b0b0c'
mark = (root / 'brand' / 'mark.svg').read_text()
inner = re.search(r'<svg[^>]*>(.*)</svg>', mark, re.S).group(1)

def compose(size: int, scale: float, rounded: bool = False) -> str:
    off = size * (1 - scale) / 2
    r = f' rx="{size * 0.225}"' if rounded else ''
    return (f'<svg xmlns="http://www.w3.org/2000/svg" width="{size}" height="{size}" viewBox="0 0 {size} {size}">'
            f'<rect width="{size}" height="{size}" fill="{BG}"{r}/>'
            f'<g transform="translate({off} {off}) scale({size * scale / 100})">{inner}</g></svg>')

def raster(svg: str, size: int) -> Image.Image:
    with tempfile.TemporaryDirectory() as d:
        s, p = pathlib.Path(d, 'a.svg'), pathlib.Path(d, 'a.png')
        s.write_text(svg)
        subprocess.run(['node', str(root / 'scripts' / 'render-svg.mjs'), str(s), str(p), str(size)], check=True)
        im = Image.open(p); im.load()
    bg = Image.new('RGB', im.size, BG); bg.paste(im, mask=im.getchannel('A')); return bg   # flatten: the App Store rejects an alpha channel

app = root / 'ios' / 'App' / 'App' / 'Assets.xcassets'
if app.exists():
    raster(compose(1024, 0.82), 1024).save(app / 'AppIcon.appiconset' / 'AppIcon-512@2x.png')
    for f in (app / 'Splash.imageset').glob('*.png'):
        raster(compose(2732, 0.2), 2732).save(f)
(root / 'store' / 'assets').mkdir(parents=True, exist_ok=True)
raster(compose(1024, 0.82), 1024).save(root / 'store' / 'assets' / 'icon-1024.png')
(root / 'public').mkdir(exist_ok=True)
raster(compose(512, 0.82, rounded=True), 512).save(root / 'public' / 'icon.png')
(root / 'public' / 'favicon.svg').write_text(compose(100, 0.86, rounded=True).replace(' width="100" height="100"', ''))
print('brand assets written')
