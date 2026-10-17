#!/usr/bin/env python3
"""Validates App Store listing limits and image sizes in store/. Exit 1 on any problem."""
import pathlib, sys
from PIL import Image
root = pathlib.Path(__file__).resolve().parent.parent / 'store'
m = root / 'metadata' / 'en-US'; bad = 0
for k, v in {'name': 30, 'subtitle': 30, 'keywords': 100, 'promotional_text': 170, 'description': 4000, 'release_notes': 4000}.items():
    n = len((m / f'{k}.txt').read_text().rstrip('\n'))
    print(f'{k:17}{n:5}/{v}'); bad += n > v
icon = Image.open(root / 'assets' / 'icon-1024.png'); print('icon', icon.size, icon.mode); bad += icon.size != (1024, 1024) or icon.mode != 'RGB'
for d, size in (('6.9in-1320x2868', (1320, 2868)), ('6.5in-1284x2778', (1284, 2778))):
    for f in sorted((root / 'screenshots' / d).glob('*.png')):
        im = Image.open(f); ok = im.size == size and im.mode == 'RGB'; bad += not ok
        if not ok: print('BAD', f, im.size, im.mode)
todo = [str(p.relative_to(root)) for p in root.rglob('*') if p.is_file() and p.suffix in ('.txt', '.md') and 'TODO' in p.read_text()]
print('files still containing TODO placeholders:', todo)
sys.exit(1 if bad else 0)
