"""Outline N-slice fit versus graph retarget (spike 1 deciding check, not shipped).

Purpose: test whether stretching a template's baked outline (contour points through the same piecewise-linear
axis maps the graph retarget uses) matches re-skinning the retargeted graph.
Value: the pass or fail the Oracle plan sets before any TypeScript is written (IoU at least 0.97, no boundary
point more than 1.5 px from the reference).
Usage: python outline_fit_check.py <templates_json> <outdir>
"""
import json
import os
import sys

import numpy as np
from PIL import Image
from scipy import ndimage as ndi
from skimage import draw, measure

import frame_templates as ft
import sigiltrace as st

CHECK_TEMPLATES = ('card', 'dialog', 'stats')
CHECK_SIZES = ((1.0, 1.0), (1.8, 1.0), (0.7, 1.4), (3.0, 2.0))   # width and height multipliers
IOU_PASS = 0.97
MAX_DEVIATION_PASS_PX = 1.5
CONTOUR_LEVEL = 0.0
MIN_CONTOUR_POINTS = 8
CONTOUR_PAD_PX = 2                  # outside border added before contouring
ISLAND_MIN_DEV_PX = 2.0             # column or row ink count deviation that marks a feature
ISLAND_REL_DEV = 0.25               # or this fraction of the rail's own ink count, whichever is larger
ISLAND_MARGIN_PX = 6                # rigid margin added around each feature
ISLAND_MIN_RUN_PX = 4               # shorter flagged runs are ignored
SEAM_SEARCH_FRACTION = 0.10         # seam may move this fraction of the shorter side
OUTSIDE_VALUE = 1.0                # any positive field value means outside the ink


def bake_contours(tpl):
    """Closed contours of the native-size skinned template, as (x, y) arrays."""
    g, size = ft.retarget(tpl, 1.0, 1.0)
    field = st.skin(g, size, fillet_k=ft.FILLET_PX)
    padded = np.pad(field, CONTOUR_PAD_PX, constant_values=OUTSIDE_VALUE)   # closes contours that touch the canvas edge
    cs = measure.find_contours(padded, CONTOUR_LEVEL)
    return [np.stack([c[:, 1] - CONTOUR_PAD_PX, c[:, 0] - CONTOUR_PAD_PX], 1) for c in cs if len(c) >= MIN_CONTOUR_POINTS]


def rigid_intervals(counts, n0, m, search):
    """Rigid [lo, hi] intervals on one axis: end zones with seams searched near m, plus feature islands."""
    counts = np.asarray(counts, float)
    lo_w = range(int(max(m - search, 1)), int(m + search) + 1)
    hi_w = range(int(n0 - m - search), int(min(n0 - m + search, n0 - 1)) + 1)
    med = float(np.median(counts[int(m):int(n0 - m)])) if n0 - 2 * m > 1 else float(np.median(counts))
    dev = np.abs(counts - med)
    a = min(lo_w, key=lambda i: (dev[i], abs(i - m)))
    b = min(hi_w, key=lambda i: (dev[i], abs(i - (n0 - m))))
    flag = dev > np.maximum(ISLAND_MIN_DEV_PX, ISLAND_REL_DEV * med)
    flag[:a] = False
    flag[b:] = False
    ivs = [(0.0, float(a)), (float(b), float(n0))]
    i = a
    while i < b:
        if flag[i]:
            j = i
            while j < b and flag[j]:
                j += 1
            if j - i >= ISLAND_MIN_RUN_PX:
                ivs.append((float(max(i - ISLAND_MARGIN_PX, 0)), float(min(j + ISLAND_MARGIN_PX, n0))))
            i = j
        else:
            i += 1
    ivs.sort()
    merged = [list(ivs[0])]
    for lo, hi in ivs[1:]:
        if lo <= merged[-1][1]:
            merged[-1][1] = max(merged[-1][1], hi)
        else:
            merged.append([lo, hi])
    return [tuple(x) for x in merged]


def axis_map(n0, n1, ivs):
    """Piecewise-linear map: rigid intervals keep length; the gaps between share the size change."""
    gaps = [(ivs[k][1], ivs[k + 1][0]) for k in range(len(ivs) - 1)]
    total = sum(h - l for l, h in gaps)
    if total <= 0:
        return lambda v: np.asarray(v, float)
    rigid = sum(h - l for l, h in ivs)
    stretch = max(n1 - rigid, ft.MIN_MIDDLE_PX * len(gaps))
    xs, ys, pos = [0.0], [0.0], 0.0
    for k, (lo, hi) in enumerate(ivs):
        pos += hi - lo
        xs.append(hi)
        ys.append(pos)
        if k < len(gaps):
            pos += stretch * (gaps[k][1] - gaps[k][0]) / total
            xs.append(gaps[k][1])
            ys.append(pos)
    return lambda v: np.interp(v, xs, ys)


def fit_contours(contours, tpl, scale_w, scale_h, ivs=None):
    """Map baked contours through the template's axis maps; returns contours and the target canvas size."""
    w0, h0 = tpl['size']
    if ivs is not None:
        fx = axis_map(w0, w0 * scale_w, ivs[0])
        fy = axis_map(h0, h0 * scale_h, ivs[1])
        out = [np.stack([fx(c[:, 0]), fy(c[:, 1])], 1) for c in contours]
        return out, (int(round(float(fx(w0)))) + 1, int(round(float(fy(h0)))) + 1)
    m = ft.RIGID_FRACTION * min(w0, h0)
    fx = ft._axis_map(w0, w0 * scale_w, m)
    fy = ft._axis_map(h0, h0 * scale_h, m)
    out = [np.stack([fx(c[:, 0]), fy(c[:, 1])], 1) for c in contours]
    return out, (int(round(fx(w0))) + 1, int(round(fy(h0))) + 1)


def rasterise(contours, size):
    """Even-odd fill: each closed contour XORed into the mask, so holes cut out."""
    w, h = size
    mask = np.zeros((h, w), bool)
    for c in contours:
        layer = np.zeros((h, w), bool)
        rr, cc = draw.polygon(c[:, 1], c[:, 0], shape=(h, w))   # pixel-centre inclusion, same convention as the field
        layer[rr, cc] = True
        mask ^= layer
    return mask


def boundary(mask):
    return mask & ~ndi.binary_erosion(mask)


def max_deviation(a, b):
    """Largest distance from a boundary pixel of either mask to the other mask's boundary."""
    ba, bb = boundary(a), boundary(b)
    da = ndi.distance_transform_edt(~bb)
    db = ndi.distance_transform_edt(~ba)
    return float(max(da[ba].max() if ba.any() else 0, db[bb].max() if bb.any() else 0))


def main():
    tpl_json, outdir = sys.argv[1:3]
    os.makedirs(outdir, exist_ok=True)
    tpls = json.load(open(tpl_json))
    print('template  size       IoU    maxdev_px  verdict')
    rows = []
    for k in CHECK_TEMPLATES:
        tpl = tpls[k]
        contours = bake_contours(tpl)
        w0, h0 = tpl['size']
        m = ft.RIGID_FRACTION * min(w0, h0)
        search = SEAM_SEARCH_FRACTION * min(w0, h0)
        g0, s0 = ft.retarget(tpl, 1.0, 1.0)
        ink0 = ft.render(g0, s0)
        ivs = (rigid_intervals(ink0.sum(axis=0)[:w0], w0, m, search),
               rigid_intervals(ink0.sum(axis=1)[:h0], h0, m, search))
        print(k, 'rigid x', [(round(a), round(b)) for a, b in ivs[0]], 'y', [(round(a), round(b)) for a, b in ivs[1]], flush=True)
        cells = []
        for sw, sh in CHECK_SIZES:
            g, size = ft.retarget(tpl, sw, sh)
            ref = ft.render(g, size)
            fitted, fsize = fit_contours(contours, tpl, sw, sh, ivs)
            got = rasterise(fitted, fsize)
            hh, ww = min(ref.shape[0], got.shape[0]), min(ref.shape[1], got.shape[1])
            ref, got = ref[:hh, :ww], got[:hh, :ww]
            iou = st.iou(ref, got)
            dev = max_deviation(ref, got)
            ok = iou >= IOU_PASS and dev <= MAX_DEVIATION_PASS_PX
            print(f'{k:9s} {sw:.1f}x{sh:.1f}   {iou:.3f}  {dev:8.1f}   {"PASS" if ok else "FAIL"}', flush=True)
            diff = np.full(ref.shape + (3,), 255, np.uint8)
            diff[ref & got] = (60, 60, 60)
            diff[ref & ~got] = (220, 40, 40)      # reference only: red
            diff[~ref & got] = (40, 90, 220)      # fit only: blue
            cells.append(np.asarray(Image.fromarray(diff).resize((330, 170), Image.LANCZOS)))
        rows.append(np.concatenate(cells, 1))
    Image.fromarray(np.concatenate(rows, 0)).save(os.path.join(outdir, 'outline-fit-check.png'))


if __name__ == '__main__':
    main()
