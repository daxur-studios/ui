"""Experiment 2b: do asymmetric limb edges (centre offset plus mean width) help?

Usage: python run_asymmetric.py <outdir> <theta.json> <image|crop_left> [<image|crop_left> ...]
Value: part A rebuilds each reference from measured widths with and without a measured left/right offset;
part B replaces the offset by one global bend-bias rule on top of the experiment 2 width rules and scans it.
Tells whether asymmetry is worth keeping in the graph format.
"""
import json
import os
import sys

import numpy as np
from PIL import Image
from scipy.interpolate import PchipInterpolator

import run_parametric as rp
import sigiltrace as st

MARCH_STEP_PX = 0.5                 # step when measuring the distance to the boundary along a normal
MARCH_RADIUS_FACTOR = 1.6           # cap each side at this x the local skeleton radius (stops marching into neighbouring limbs)
MARCH_MARGIN_PX = 2.0
OFFSET_MAX_PER_RADIUS = 0.5         # |offset| cap as a fraction of the skeleton radius
OFFSET_SMOOTH_SIGMA = 2.0           # smoothing of measured offsets and half widths before compression
BIAS_SCAN = (-0.6, -0.4, -0.2, 0.0, 0.2, 0.4, 0.6)   # bend-bias values tried for the rule
FILLET_PX = 8.0                     # best fillet from experiment 2
INK_COLOUR = (30, 30, 40)


def side_extents(mask, p, normals, r):
    """Distance from each path point to the boundary along +n and -n."""
    H, W = mask.shape
    out = []
    for sign in (1.0, -1.0):
        ext = np.zeros(len(p))
        for i, (pt, n) in enumerate(zip(p, normals)):
            lim = MARCH_RADIUS_FACTOR * max(r[i], 1.0) + MARCH_MARGIN_PX
            t = np.arange(0.0, lim, MARCH_STEP_PX)
            xs = np.clip(pt[0] + sign * n[0] * t, 0, W - 1)
            ys = np.clip(pt[1] + sign * n[1] * t, 0, H - 1)
            inside = mask[np.round(ys).astype(int), np.round(xs).astype(int)]
            out_idx = np.nonzero(~inside)[0]
            ext[i] = t[out_idx[0]] if len(out_idx) else lim
        out.append(ext)
    return out[0], out[1]


def with_measured_asymmetry(mask, g2, g_raw):
    """Copy of g2 whose edges carry mean half width and a signed centre offset measured from the mask."""
    g = json.loads(json.dumps(g2))
    for e, er in zip(g['edges'], g_raw['edges']):
        p = np.array(er['pts'])
        n = st.edge_normals(p)
        rl, rr = side_extents(mask, p, n, np.array(er['radii']))
        off = st.ndi.gaussian_filter1d((rr - rl) / 2, OFFSET_SMOOTH_SIGMA, mode='nearest')
        r_sk = np.array(er['radii'])
        off = np.clip(off, -OFFSET_MAX_PER_RADIUS * r_sk, OFFSET_MAX_PER_RADIUS * r_sk)
        s = st._arclen(p)
        u = s / max(s[-1], 1e-6)
        us = np.linspace(0, 1, st.PROFILE_POINTS)
        os_ = np.interp(us, u, off)
        # keep the compressed distance-transform width, widen by |offset| so the span stays [-rl, rr]
        hs = np.array([y for _, y in e['profile']]) + np.abs(os_)
        for k, node in ((0, g['nodes'][e['a']]), (-1, g['nodes'][e['b']])):
            if node['kind'] == 'tip':
                hs[k], os_[k] = st.TIP_RADIUS_PX, 0.0
        e['profile_asym'] = [[float(a), float(b)] for a, b in zip(us, hs)]
        e['offset'] = [[float(a), float(b)] for a, b in zip(us, os_)]
    return g


def use_asym_profiles(g):
    h = json.loads(json.dumps(g))
    for e in h['edges']:
        e['profile'] = e['profile_asym']
    return h


def drop_offsets(g):
    h = json.loads(json.dumps(g))
    for e in h['edges']:
        e.pop('offset', None)
    return h


def signed_bend(pts, u, rmax):
    p = np.array(pts)
    if len(p) < 5:
        return np.zeros_like(u)
    x = st.ndi.gaussian_filter1d(p[:, 0], rp.CURVATURE_SMOOTH_SIGMA_PX, mode='nearest')
    y = st.ndi.gaussian_filter1d(p[:, 1], rp.CURVATURE_SMOOTH_SIGMA_PX, mode='nearest')
    dx, dy = np.gradient(x), np.gradient(y)
    ddx, ddy = np.gradient(dx), np.gradient(dy)
    k = (dx * ddy - dy * ddx) / np.maximum((dx * dx + dy * dy) ** 1.5, 1e-6)
    s = st._arclen(p)
    return np.interp(u * s[-1], s, k) * rmax


def rule_with_bias(g2, theta, bias):
    """Experiment 2 rule graph plus a centre offset toward one side of each bend (bias x width x tanh(bend))."""
    g = rp.parametric_graph(g2, theta, False)
    for e in g['edges']:
        prof = np.array(e['profile'])
        rmax = float(prof[:, 1].max())
        bend = signed_bend(e['pts'], prof[:, 0], rmax)
        off = bias * prof[:, 1] * np.tanh(bend * 3.0)
        a, b = g['nodes'][e['a']], g['nodes'][e['b']]
        if a['kind'] == 'tip':
            off[0] = 0.0
        if b['kind'] == 'tip':
            off[-1] = 0.0
        e['offset'] = [[float(u), float(o)] for u, o in zip(prof[:, 0], off)]
    return g


def raster(g, size, mask_shape):
    return st.skin(g, size, fillet_k=FILLET_PX) < 0


def main():
    outdir, theta_path = sys.argv[1], sys.argv[2]
    os.makedirs(outdir, exist_ok=True)
    tj = json.load(open(theta_path))
    theta = np.array([tj[k] for k in ['node_k', 'waist_pos', 'waist_ratio', 'taper_p', 'leaf_q',
                                       'leafy_node_mult', 'degree_exp', 'curvature_gain']])
    summary = {}
    for spec in sys.argv[3:]:
        path, _, crop = spec.partition('|')
        mask, rgb = st.load_mask(path, crop_left=int(crop or '0'))
        H, W = mask.shape
        g_raw = st.trace_graph(mask)
        g2 = st.compress_graph(g_raw)
        ga = with_measured_asymmetry(mask, g2, g_raw)
        tag = os.path.basename(path).split('(')[-1].split(')')[0]
        res = {}
        for label, g in (('measured symmetric (dist radii)', drop_offsets(g2)),
                         ('measured asymmetric', use_asym_profiles(ga))):
            for fk in (0.0, FILLET_PX):
                rec = st.skin(g, (W, H), fillet_k=fk) < 0
                res[(label, fk)] = (st.iou(mask, rec), rec)
            print(f'{tag} A {label}: ' + ', '.join(f'fillet {fk:g} IoU {res[(label, fk)][0]:.3f}' for fk in (0.0, FILLET_PX)))
        scan = {}
        for bias in BIAS_SCAN:
            rec = raster(rule_with_bias(g2, theta, bias), (W, H), mask.shape)
            scan[bias] = (st.iou(mask, rec), rec)
        print(f'{tag} B bias scan: ' + ', '.join(f'{b:+.1f}: {v[0]:.3f}' for b, v in scan.items()))
        best = max(scan, key=lambda b: scan[b][0])
        offs = np.concatenate([np.array(e['offset'])[:, 1] for e in ga['edges']])
        summary[tag] = dict(measured_offset_mean_abs=float(np.abs(offs).mean()), best_bias=best,
                            iou_bias0=scan[0.0][0], iou_best=scan[best][0])

        def panel(rec):
            im = np.full((H, W, 3), 255, np.uint8)
            im[rec] = INK_COLOUR
            return im
        ref = panel(mask)
        sym = panel(res[('measured symmetric (dist radii)', FILLET_PX)][1])
        asy = panel(res[('measured asymmetric', FILLET_PX)][1])
        r0, rb = panel(scan[0.0][1]), panel(scan[best][1])
        Image.fromarray(np.concatenate([np.concatenate([rgb, ref, sym, asy], 1),
                                        np.concatenate([ref, r0, rb, panel(np.zeros_like(mask))], 1)], 0)
                        ).save(os.path.join(outdir, f'asym_{tag}.png'))
    json.dump(summary, open(os.path.join(outdir, 'summary.json'), 'w'), indent=1)
    print(json.dumps(summary, indent=1))


if __name__ == '__main__':
    main()
