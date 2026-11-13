"""Experiment 3b: statistics of the ornaments on the full-UI concept sheet (aaaa.png).

Usage: python run_stats_sheet.py <outdir> <sheet_image> <stats_json_from_run_stats>
Value: tests whether the four separating numbers also describe the frame ornaments (toolbar, medallion, dialog,
cards), which are the pieces the app chrome needs, and widens the reference set beyond three free sigils.
"""
import json
import os
import sys

import numpy as np
from PIL import Image
from scipy import ndimage as ndi

import run_stats as rs
import sigil_stats as ss
import sigiltrace as st

INK_MAX_MIN_CHANNEL = 175           # chrome and dark edges; pale glass and background are above this
CLOSE_RADIUS_PX = 2                 # joins hairline breaks in the rim
CORE_FOUR = ('tips_per_junction', 'holes_per_junction', 'fork_frac', 'taper')
BOXES = {                           # element -> (x0, y0, x1, y1) on the 1672x941 sheet
    'medallion': (505, 160, 1195, 905),
    'toolbar': (30, 10, 1650, 150),
    'search': (15, 205, 510, 295),
    'tabs': (15, 335, 490, 410),
    'select': (15, 450, 490, 515),
    'slider': (15, 555, 500, 625),
    'card': (15, 665, 515, 880),
    'dialog': (1200, 170, 1655, 610),
    'stats': (1185, 645, 1655, 865),
}


def largest_component(ink):
    lab, k = ndi.label(ink, structure=np.ones((3, 3)))
    if k == 0:
        return ink
    sizes = ndi.sum(ink, lab, range(1, k + 1))
    return lab == (1 + int(np.argmax(sizes)))


def main():
    outdir, sheet, stats_json = sys.argv[1:4]
    os.makedirs(outdir, exist_ok=True)
    im = np.asarray(Image.open(sheet).convert('RGB')).astype(int)
    ink_all = im.min(axis=2) < INK_MAX_MIN_CHANNEL
    ink_all = ndi.binary_closing(ink_all, structure=st._disk(CLOSE_RADIUS_PX))
    base = json.load(open(stats_json))
    ref_stats = base['refs']
    masks = {}
    for name, (x0, y0, x1, y1) in BOXES.items():
        masks[name] = ss.normalise_mask(largest_component(ink_all[y0:y1, x0:x1]))
    rs.montage({'sheet': list(masks.values())}, os.path.join(outdir, 'sheet_masks.png'))
    stats = {k: ss.shape_stats(m) for k, m in masks.items()}
    json.dump(stats, open(os.path.join(outdir, 'sheet_stats.json'), 'w'), indent=1)
    bands = {s: rs.band([r[s] for r in ref_stats.values()]) for s in ss.SCALARS}
    print('element        ' + ' '.join(f'{s[:9]:>9s}' for s in CORE_FOUR) + '   swell   score13  in-band of core four')
    for k, v in stats.items():
        inb = sum(rs.in_band(v[s], bands[s]) for s in CORE_FOUR)
        print(f'{k:14s} ' + ' '.join(f'{v[s]:9.2f}' for s in CORE_FOUR) + f'   {v["swell"]:.2f}   {100 * rs.score(v, bands):4.0f}%   {inb}/4')
    print('refs           ' + ' '.join(f'{np.mean([r[s] for r in ref_stats.values()]):9.2f}' for s in CORE_FOUR))


if __name__ == '__main__':
    main()
