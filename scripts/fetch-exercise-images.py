#!/usr/bin/env python3
"""One-off: downloads the two photo frames per exercise from free-exercise-db (public domain), converts them to small
greyscale WebP and writes public/ex/<id>/{0,1}.webp so the app has images fully offline. Needs Pillow. Re-runnable (skips existing)."""
import io, json, pathlib, sys, urllib.request
from concurrent.futures import ThreadPoolExecutor
from PIL import Image, ImageOps

root = pathlib.Path(__file__).resolve().parent.parent
BASE = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/'
src = json.load(urllib.request.urlopen(BASE + 'dist/exercises.json'))
jobs = [(x['id'], i, p) for x in src if x['category'] != 'stretching' for i, p in enumerate(x['images'][:2])]

def work(job):
    id_, i, path = job
    out = root / 'public' / 'ex' / id_ / f'{i}.webp'
    if out.exists(): return True
    try:
        raw = urllib.request.urlopen(BASE + 'exercises/' + urllib.request.quote(path), timeout=30).read()
        im = ImageOps.autocontrast(Image.open(io.BytesIO(raw)).convert('L'), cutoff=1)
        im.thumbnail((400, 400), Image.LANCZOS)
        out.parent.mkdir(parents=True, exist_ok=True)
        im.save(out, 'WEBP', quality=60, method=6)
        return True
    except Exception as e:
        print('fail', path, e, file=sys.stderr); return False

with ThreadPoolExecutor(16) as ex: ok = list(ex.map(work, jobs))
print(f'{sum(ok)}/{len(jobs)} images')
