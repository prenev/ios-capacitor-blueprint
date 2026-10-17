#!/usr/bin/env python3
"""Draws the Plate logo (a lime weight plate on near-black) and writes the iOS app icon, splash images and web favicon.
Needs Pillow. Run: python3 scripts/make-icons.py"""
import pathlib
from PIL import Image, ImageDraw

BG, FG = (11, 11, 12), (200, 241, 53)
root = pathlib.Path(__file__).resolve().parent.parent

def plate(size: int, scale: float, bg=BG) -> Image.Image:
    S = size * 4                                   # supersample for smooth edges
    im = Image.new('RGB', (S, S), bg); d = ImageDraw.Draw(im); c = S / 2
    R = S * scale / 2
    ring = lambda r, col: d.ellipse([c - r, c - r, c + r, c + r], fill=col)
    ring(R, FG)                                    # plate
    ring(R * 0.80, bg); ring(R * 0.775, FG)        # engraved groove near the rim
    ring(R * 0.60, bg); ring(R * 0.575, FG)        # second groove
    ring(R * 0.26, bg)                             # centre hole
    return im.resize((size, size), Image.LANCZOS)

app = root / 'ios' / 'App' / 'App' / 'Assets.xcassets'
if app.exists():
    plate(1024, 0.66).save(app / 'AppIcon.appiconset' / 'AppIcon-512@2x.png')
    for f in (app / 'Splash.imageset').glob('*.png'):
        plate(2732, 0.2).save(f)
plate(512, 0.66).save(root / 'public' / 'icon.png')
(root / 'public' / 'favicon.svg').write_text(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" rx="22" fill="#0b0b0c"/>'
    '<circle cx="50" cy="50" r="33" fill="#c8f135"/><circle cx="50" cy="50" r="26.4" fill="#0b0b0c"/><circle cx="50" cy="50" r="25.6" fill="#c8f135"/>'
    '<circle cx="50" cy="50" r="19.8" fill="#0b0b0c"/><circle cx="50" cy="50" r="19" fill="#c8f135"/><circle cx="50" cy="50" r="8.6" fill="#0b0b0c"/></svg>')
print('icons written')
