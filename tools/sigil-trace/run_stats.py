"""Experiment 3: statistics envelope from the traced references, checked against the old generator output.

Usage: python run_stats.py <outdir> <assets_dir> <ref_image|crop> [<ref_image|crop> ...]
Value: shows which shape statistics separate the concept art from the seven earlier generators, and whether
the references pass their own envelope (leave-one-out), before any new generator is built.
"""
import json
import os
import sys

import numpy as np
from PIL import Image
from scipy import ndimage as ndi
from skimage.morphology import remove_small_objects

import sigil_stats as ss
import sigiltrace as st

DARK_INK_MIN_GRAY = 100             # luminance above this is ink on the dark lab panels
LIGHT_INK_MAX_GRAY = 205            # luminance below this is ink on the white blade-lab sheet
GROUP_DILATION_PX = 12              # merges the parts of one ornament into one component
MIN_COMPONENT_HEIGHT_FRACTION = 0.045  # of image height; drops caption text
MIN_COMPONENT_AREA_PX = 300
TEXT_FRAGMENT_MAX_PX = 18           # raw ink fragments no larger than this in both directions are caption letters
SHAPE_LAB_PANELS = ((33, 212, 318, 372), (337, 212, 623, 372), (640, 212, 927, 372))  # at 960x540
SHAPE_LAB_SIZE = (960, 540)
BLADE_TOP_FRACTION = 0.08           # skip the control bar
BAND_WIDEN = 0.5                    # envelope = reference range widened by this x its spread
BAND_MIN_REL_SPREAD = 0.15          # minimum spread as a fraction of the mean, for very tight ranges
TILE_W, TILE_H, TILES_PER_ROW = 220, 90, 8
ATTEMPTS = {                        # file -> (attempt name, extractor)
    'shape-lab-baseline.png': ('baseline', 'dark_panels'),
    'shape-lab-chitin-filigree.png': ('chitin-filigree', 'dark_panels'),
    'shape-lab-orbital-lace.png': ('orbital-lace', 'dark_panels'),
    'shape-lab-sculpted-web.png': ('sculpted-web', 'dark_panels'),
    'shape-lab-seeded-growth.png': ('seeded-growth', 'dark_panels'),
    'shape-lab-topological-sdf.png': ('topological-sdf', 'dark_panels'),
    'shape-lab-six-seed-matrix.png': ('topological-sdf', 'dark_generic'),
    'blade-lab-contact-sheet.png': ('blade-engine', 'light_sheet'),
}


def drop_text_fragments(ink):
    lab, _ = ndi.label(ink, structure=np.ones((3, 3)))
    keep = ink.copy()
    for i, sl in enumerate(ndi.find_objects(lab), 1):
        if max(sl[0].stop - sl[0].start, sl[1].stop - sl[1].start) <= TEXT_FRAGMENT_MAX_PX:
            keep[sl] &= lab[sl] != i
    return keep


def components(ink, min_h):
    ink = drop_text_fragments(ink)
    grouped = ndi.binary_dilation(ink, structure=st._disk(GROUP_DILATION_PX))
    lab, k = ndi.label(grouped)
    out = []
    for i, sl in enumerate(ndi.find_objects(lab), 1):
        part = ink[sl] & (lab[sl] == i)
        if part.sum() >= MIN_COMPONENT_AREA_PX and (sl[0].stop - sl[0].start) >= min_h:
            out.append(part)
    return out


def gray_of(path):
    im = Image.open(path).convert('L')
    return np.asarray(im).astype(float), im.size


def extract(path, kind):
    gray, (w, h) = gray_of(path)
    if kind == 'dark_panels':
        sx, sy = w / SHAPE_LAB_SIZE[0], h / SHAPE_LAB_SIZE[1]
        out = []
        for x0, y0, x1, y1 in SHAPE_LAB_PANELS:
            ink = gray[int(y0 * sy):int(y1 * sy), int(x0 * sx):int(x1 * sx)] > DARK_INK_MIN_GRAY
            ink = remove_small_objects(ink, MIN_COMPONENT_AREA_PX // 4)
            out.append(ink)
        return out
    if kind == 'dark_generic':
        ink = gray > DARK_INK_MIN_GRAY
        ink[: int(0.38 * h)] = False
        return components(ink, int(MIN_COMPONENT_HEIGHT_FRACTION * h))
    ink = gray < LIGHT_INK_MAX_GRAY
    ink[: int(BLADE_TOP_FRACTION * h)] = False
    return components(ink, int(MIN_COMPONENT_HEIGHT_FRACTION * h))


def montage(groups, path):
    rows = []
    for name, masks in groups.items():
        tiles = []
        for m in masks:
            t = np.full((TILE_H, TILE_W), 255, np.uint8)
            im = Image.fromarray((~m * 255).astype(np.uint8))
            im.thumbnail((TILE_W - 4, TILE_H - 4))
            a = np.asarray(im)
            t[2:2 + a.shape[0], 2:2 + a.shape[1]] = a
            tiles.append(t)
        for i in range(0, len(tiles), TILES_PER_ROW):
            chunk = tiles[i:i + TILES_PER_ROW]
            chunk += [np.full((TILE_H, TILE_W), 255, np.uint8)] * (TILES_PER_ROW - len(chunk))
            rows.append(np.concatenate(chunk, 1))
    Image.fromarray(np.concatenate(rows, 0)).save(path)


def band(values):
    v = np.array([x for x in values if not np.isnan(x)])
    if len(v) == 0:
        return (np.nan, np.nan)
    spread = max(v.max() - v.min(), BAND_MIN_REL_SPREAD * abs(v.mean()), 1e-3)
    return (v.min() - BAND_WIDEN * spread, v.max() + BAND_WIDEN * spread)


def in_band(x, b):
    return (not np.isnan(x)) and (not np.isnan(b[0])) and b[0] <= x <= b[1]


def score(stats, bands):
    return float(np.mean([in_band(stats[s], bands[s]) for s in ss.SCALARS]))


def main():
    outdir, assets = sys.argv[1], sys.argv[2]
    os.makedirs(outdir, exist_ok=True)
    refs = {}
    for spec in sys.argv[3:]:
        path, _, crop = spec.partition('|')
        mask, _ = st.load_mask(path, crop_left=int(crop or '0'))
        refs[os.path.basename(path).split('(')[-1].split(')')[0]] = ss.normalise_mask(mask)
    groups = {'refs': list(refs.values())}
    attempt_masks = {}
    for fname, (name, kind) in ATTEMPTS.items():
        ms = [ss.normalise_mask(m) for m in extract(os.path.join(assets, fname), kind)]
        ms = [m for m in ms if m.sum() >= ss.MIN_MASK_PX]
        attempt_masks.setdefault(name, []).extend(ms)
        groups[fname] = ms
        print(f'{fname}: {len(ms)} shapes')
    montage(groups, os.path.join(outdir, 'extracted_masks.png'))
    ref_stats = {k: ss.shape_stats(m) for k, m in refs.items()}
    attempt_stats = {n: [ss.shape_stats(m) for m in ms] for n, ms in attempt_masks.items()}
    json.dump(dict(refs=ref_stats, attempts=attempt_stats), open(os.path.join(outdir, 'stats.json'), 'w'), indent=1)
    bands = {s: band([r[s] for r in ref_stats.values()]) for s in ss.SCALARS}
    print('\nreference values and envelope')
    for s in ss.SCALARS:
        print(f'  {s:20s} ' + ' '.join(f'{r[s]:8.3f}' for r in ref_stats.values()) + f'   band [{bands[s][0]:.3f}, {bands[s][1]:.3f}]')
    print('\nleave-one-out: each reference against the envelope of the other two')
    for k, r in ref_stats.items():
        b = {s: band([v[s] for kk, v in ref_stats.items() if kk != k]) for s in ss.SCALARS}
        print(f'  ref {k}: {100 * score(r, b):.0f}% of scalars in band')
    print('\nattempts against the 3-reference envelope (mean of per-shape in-band share; share of shapes at 70% or more)')
    for n, sts in attempt_stats.items():
        sc = [score(x, bands) for x in sts]
        print(f'  {n:18s} shapes {len(sc):2d}  mean {100 * np.mean(sc):3.0f}%  shapes>=70%: {100 * np.mean([x >= 0.7 for x in sc]):3.0f}%')
    print('\nper scalar: share of attempt shapes inside the reference band')
    allst = [x for v in attempt_stats.values() for x in v]
    for s in ss.SCALARS:
        print(f'  {s:20s} {100 * np.mean([in_band(x[s], bands[s]) for x in allst]):3.0f}%')


if __name__ == '__main__':
    main()
