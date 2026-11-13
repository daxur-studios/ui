"""Experiment 3b-2: frame-only statistics with a rim-band mask to drop interior text, icons and photo tiles.

Usage: python run_stats_frames.py <outdir> <sheet_image> <stats_json_from_run_stats>
Value: builds a cleaner reference set for the frame generator (second of the two generators).
"""
import json
import os
import sys

import numpy as np
from PIL import Image
from scipy import ndimage as ndi

import run_stats as rs
import run_stats_sheet as sh
import sigil_stats as ss
import sigiltrace as st

RIM_BAND_FRACTION = 0.2             # of the shorter side, measured inward from the box edge
INK_MAX_MIN_CHANNEL = 205           # paler chrome than the first pass, safe because the band removes the interior
CLOSE_RADIUS_PX = 2
FRAMES = ('medallion', 'toolbar', 'search', 'tabs', 'select', 'card', 'dialog', 'stats')  # slider is a control, not a frame
# Elements whose rim is a thin outline: erase hand-set interior rectangles (x0, y0, x1, y1 as fractions of the box)
# instead of keeping only a rim band, so the end flourishes and any centre ornament survive.
INTERIOR_ERASE = {
    'search': ((0.12, 0.25, 0.93, 0.78),),
    'tabs': ((0.14, 0.22, 0.93, 0.80),),
    'select': ((0.14, 0.22, 0.93, 0.78),),
    'toolbar': ((0.08, 0.30, 0.44, 0.70), (0.56, 0.30, 0.92, 0.70)),
    'medallion': ((0.14, 0.55, 0.86, 0.77), (0.45, 0.28, 0.57, 0.42), (0.20, 0.32, 0.30, 0.39), (0.70, 0.32, 0.80, 0.39)),
}


def rim_band(h, w):
    b = max(int(RIM_BAND_FRACTION * min(h, w)), 4)
    m = np.zeros((h, w), bool)
    m[:b] = m[-b:] = True
    m[:, :b] = m[:, -b:] = True
    return m


def main():
    outdir, sheet, stats_json = sys.argv[1:4]
    os.makedirs(outdir, exist_ok=True)
    im = np.asarray(Image.open(sheet).convert('RGB')).astype(int)
    ink = ndi.binary_closing(im.min(axis=2) < INK_MAX_MIN_CHANNEL, structure=st._disk(CLOSE_RADIUS_PX))
    refs = json.load(open(stats_json))['refs']
    bands = {s: rs.band([r[s] for r in refs.values()]) for s in ss.SCALARS}
    masks = {}
    for k in FRAMES:
        x0, y0, x1, y1 = sh.BOXES[k]
        crop = ink[y0:y1, x0:x1].copy()
        h, w = crop.shape
        if k in INTERIOR_ERASE:
            for fx0, fy0, fx1, fy1 in INTERIOR_ERASE[k]:
                crop[int(fy0 * h):int(fy1 * h), int(fx0 * w):int(fx1 * w)] = False
        else:
            crop &= rim_band(h, w)
        masks[k] = ss.normalise_mask(sh.largest_component(crop))
    rs.montage({'frames': list(masks.values())}, os.path.join(outdir, 'frame_masks.png'))
    stats = {k: ss.shape_stats(m) for k, m in masks.items()}
    json.dump(stats, open(os.path.join(outdir, 'frame_stats.json'), 'w'), indent=1)
    print('element        ' + ' '.join(f'{s[:9]:>9s}' for s in sh.CORE_FOUR))
    for k, v in stats.items():
        print(f'{k:14s} ' + ' '.join(f'{v[s]:9.2f}' for s in sh.CORE_FOUR))
    for s in ss.SCALARS:
        vals = [v[s] for v in stats.values() if not np.isnan(v[s])]
        print(f'  {s:20s} frames min {min(vals):.2f} med {np.median(vals):.2f} max {max(vals):.2f}   free-sigil band [{bands[s][0]:.2f}, {bands[s][1]:.2f}]')


if __name__ == '__main__':
    main()
