"""Traced frame templates with 9-slice retargeting (experiment 5, not shipped).

Purpose: trace each clean frame reference into a junction-node graph, then resize it to any width and height by
stretching only the middle band of the graph geometry while the corner zones and all stroke widths stay rigid.
Value: the traced-template fallback for the frame generator: resizable frames that keep the concept art's
corner flourishes, plus a stroke-weight variation layer.
Usage: python frame_templates.py <outdir> <sheet_image> <templates_json_out>
"""
import json
import os
import sys

import numpy as np
from PIL import Image
from scipy import ndimage as ndi

import run_stats_frames as rf
import run_stats_sheet as sh
import sigil_stats as ss
import sigiltrace as st

TEMPLATES = ('card', 'dialog', 'stats', 'search', 'tabs', 'select', 'toolbar', 'medallion')
RIGID_FRACTION = 0.30               # of the shorter template side, kept rigid at each end of each axis
MIN_MIDDLE_PX = 4.0                 # a stretched middle never shrinks below this
FILLET_PX = 8.0
WEIGHT_RANGE = (0.8, 1.25)          # stroke-weight variation layer
DEMO_SIZES = ((1.0, 1.0), (1.8, 1.0), (0.7, 1.4))   # width and height multipliers shown per template
DEMO_WEIGHTS = (1.0, 0.8, 1.25)


def frame_masks(sheet):
    im = np.asarray(Image.open(sheet).convert('RGB')).astype(int)
    ink = ndi.binary_closing(im.min(axis=2) < rf.INK_MAX_MIN_CHANNEL, structure=st._disk(rf.CLOSE_RADIUS_PX))
    out = {}
    for k in TEMPLATES:
        x0, y0, x1, y1 = sh.BOXES[k]
        crop = ink[y0:y1, x0:x1].copy()
        h, w = crop.shape
        if k in rf.INTERIOR_ERASE:
            for fx0, fy0, fx1, fy1 in rf.INTERIOR_ERASE[k]:
                crop[int(fy0 * h):int(fy1 * h), int(fx0 * w):int(fx1 * w)] = False
        else:
            crop &= rf.rim_band(h, w)
        out[k] = ss.normalise_mask(sh.largest_component(crop))
    return out


def trace_template(mask):
    g = st.compress_graph(st.trace_graph(mask))
    h, w = mask.shape
    return dict(graph=g, size=[w, h])


def _axis_map(n0, n1, m):
    """Piecewise-linear map for one axis: rigid m at both ends, stretched middle."""
    m = min(m, n0 / 2 - 1)
    mid1 = max(n1 - 2 * m, MIN_MIDDLE_PX)
    return lambda v: np.interp(v, [0, m, n0 - m, n0], [0, m, m + mid1, m + mid1 + m])


def retarget(tpl, scale_w, scale_h, weight=1.0):
    """Graph stretched to (scale_w, scale_h) times its native size, with every stroke radius times weight."""
    w0, h0 = tpl['size']
    m = RIGID_FRACTION * min(w0, h0)
    n1x, n1y = w0 * scale_w, h0 * scale_h
    fx, fy = _axis_map(w0, n1x, m), _axis_map(h0, n1y, m)
    g = json.loads(json.dumps(tpl['graph']))
    for n in g['nodes']:
        n['x'], n['y'] = float(fx(n['x'])), float(fy(n['y']))
        n['r'] = n['r'] * weight if n['kind'] == 'junction' else n['r']
    for e in g['edges']:
        p = np.array(e['pts'])
        p = np.stack([fx(p[:, 0]), fy(p[:, 1])], 1)
        e['pts'] = p.tolist()
        e['length'] = float(st._arclen(p)[-1])
        e['profile'] = [[u, r * weight if r > st.TIP_RADIUS_PX + 1e-6 else r] for u, r in e['profile']]
    size = (int(round(fx(w0))) + 1, int(round(fy(h0))) + 1)
    return g, size


def render(g, size):
    return st.skin(g, size, fillet_k=FILLET_PX) < 0


def tile(m, w=330, h=170):
    t = np.full((h, w), 255, np.uint8)
    im = Image.fromarray((~m * 255).astype(np.uint8))
    im.thumbnail((w - 4, h - 4))
    a = np.asarray(im)
    t[2:2 + a.shape[0], 2:2 + a.shape[1]] = a
    return t


def main():
    outdir, sheet, out_json = sys.argv[1:4]
    os.makedirs(outdir, exist_ok=True)
    masks = frame_masks(sheet)
    tpls = {k: trace_template(m) for k, m in masks.items()}
    json.dump(tpls, open(out_json, 'w'))
    rows = []
    print('template   native IoU')
    for k, tpl in tpls.items():
        g, size = retarget(tpl, 1.0, 1.0)
        r0 = render(g, size)
        m0 = masks[k][:r0.shape[0], :r0.shape[1]]
        i0 = st.iou(r0, np.pad(m0, ((0, r0.shape[0] - m0.shape[0]), (0, r0.shape[1] - m0.shape[1]))))
        print(f'{k:10s} {i0:.3f}')
        cells = []
        for (sw, sh_) in DEMO_SIZES:
            g, size = retarget(tpl, sw, sh_)
            cells.append(tile(render(g, size)))
        for wgt in DEMO_WEIGHTS[1:]:
            g, size = retarget(tpl, 1.4, 1.0, wgt)
            cells.append(tile(render(g, size)))
        rows.append(np.concatenate(cells, 1))
    Image.fromarray(np.concatenate(rows, 0)).save(os.path.join(outdir, 'frame_templates.png'))


if __name__ == '__main__':
    main()
