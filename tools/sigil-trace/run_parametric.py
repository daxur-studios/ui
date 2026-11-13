"""Experiment 2: replace measured radii with a few global rules and measure how much IoU survives.

Usage: python run_parametric.py <outdir> <image|crop_left> [<image|crop_left> ...]
Value: shows whether a handful of global parameters (node radius rule, waist, taper) can stand in for
per-edge measured widths, which is the precondition for a generator that invents graphs.
"""
import json
import os
import sys

import numpy as np
from PIL import Image
from scipy.interpolate import PchipInterpolator
from scipy.optimize import minimize

import sigiltrace as st

NODE_RADIUS_PER_MEAN_EDGE_LENGTH = 0.30   # starting guess, refit below
RULE_PROFILE_POINTS = 9                   # control points sampled from the rule per edge
PASS_IOU = 0.75                           # experiment 2 pass threshold
INK_COLOUR = (30, 30, 40)
OVERLAP_COLOUR = (200, 200, 200)
MISSING_COLOUR = (220, 40, 40)
EXTRA_COLOUR = (40, 90, 220)
# parameter vector: node_k, waist_pos, waist_ratio, taper_p, leaf_q
START = np.array([NODE_RADIUS_PER_MEAN_EDGE_LENGTH, 0.5, 0.6, 1.0, 1.0, 1.0, 0.0, 0.0])
BOUNDS = [(0.1, 0.6), (0.2, 0.8), (0.2, 1.2), (0.3, 3.0), (0.3, 3.0), (0.4, 2.5), (-1.5, 1.5), (-2.0, 6.0)]
TYPICAL_DEGREE = 3.0                      # degree at which the degree exponent has no effect
FILLET_WIDTHS_PX = (0.0, 4.0, 8.0)


def incident_lengths(g):
    inc = {i: [] for i in range(len(g['nodes']))}
    for e in g['edges']:
        inc[e['a']].append(e['length'])
        inc[e['b']].append(e['length'])
    return inc


def rule_profile(ra, rb, a_tip, b_tip, theta):
    """Edge width profile from end radii and global parameters: [[u, r], ...]."""
    _, c, w, p, q = theta[:5]
    u = np.linspace(0, 1, RULE_PROFILE_POINTS)
    if a_tip and b_tip:
        r = np.full_like(u, st.TIP_RADIUS_PX)
    elif a_tip or b_tip:
        rj = rb if a_tip else ra
        s = (1 - u) if a_tip else u           # 0 at the junction end, 1 at the tip
        r = st.TIP_RADIUS_PX + (rj - st.TIP_RADIUS_PX) * (1 - s) ** q
    else:
        rw = w * min(ra, rb)
        left = rw + (ra - rw) * np.clip(1 - u / c, 0, 1) ** p
        right = rw + (rb - rw) * np.clip((u - c) / (1 - c), 0, 1) ** p
        r = np.where(u <= c, left, right)
    return [[float(x), float(y)] for x, y in zip(u, r)]


CURVATURE_SMOOTH_SIGMA_PX = 6.0           # smoothing of the edge path before measuring bend


def curvature_at(pts, u):
    """Absolute curvature (1/px) of an edge path at arc fractions u."""
    p = np.array(pts)
    if len(p) < 5:
        return np.zeros_like(u)
    x = st.ndi.gaussian_filter1d(p[:, 0], CURVATURE_SMOOTH_SIGMA_PX, mode='nearest')
    y = st.ndi.gaussian_filter1d(p[:, 1], CURVATURE_SMOOTH_SIGMA_PX, mode='nearest')
    dx, dy = np.gradient(x), np.gradient(y)
    ddx, ddy = np.gradient(dx), np.gradient(dy)
    k = np.abs(dx * ddy - dy * ddx) / np.maximum((dx * dx + dy * dy) ** 1.5, 1e-6)
    s = st._arclen(p)
    return np.interp(u * s[-1], s, k)


def parametric_graph(g2, theta, measured_nodes):
    """Copy of g2 whose junction radii and edge profiles come from the rules."""
    g3 = json.loads(json.dumps(g2))
    inc = incident_lengths(g3)
    leafy = {i for e in g3['edges'] for i, o in ((e['a'], e['b']), (e['b'], e['a'])) if g3['nodes'][o]['kind'] == 'tip'}
    if not measured_nodes:
        for i, n in enumerate(g3['nodes']):
            if n['kind'] == 'junction' and inc[i]:
                n['r'] = (theta[0] * float(np.mean(inc[i])) * (theta[5] if i in leafy else 1.0)
                          * (len(inc[i]) / TYPICAL_DEGREE) ** theta[6])
    for e in g3['edges']:
        a, b = g3['nodes'][e['a']], g3['nodes'][e['b']]
        ra = st.TIP_RADIUS_PX if a['kind'] == 'tip' else a['r']
        rb = st.TIP_RADIUS_PX if b['kind'] == 'tip' else b['r']
        prof = np.array(rule_profile(ra, rb, a['kind'] == 'tip', b['kind'] == 'tip', theta))
        bend = curvature_at(e['pts'], prof[:, 0]) * max(ra, rb)   # dimensionless bend
        prof[:, 1] = prof[:, 1] / np.maximum(1.0 + theta[7] * bend, 0.2)
        e['profile'] = prof.tolist()
    return g3


def profile_error(theta, graphs):
    """Sum of squared profile error between rule and measured widths, relative to the larger end radius."""
    err = 0.0
    for g2 in graphs:
        g3 = parametric_graph(g2, theta, measured_nodes=False)
        for e2, e3 in zip(g2['edges'], g3['edges']):
            m = np.array(e2['profile'])
            u = np.array([x for x, _ in e3['profile']])
            rule = np.array([y for _, y in e3['profile']])
            meas = PchipInterpolator(m[:, 0], m[:, 1])(u)
            err += float(((rule - meas) ** 2).sum()) / max(meas.max(), 1.0) ** 2
    return err


IOU_FIT_MAX_EVALS = 250                   # budget for the direct IoU fit


def neg_mean_iou(theta, refs):
    """Negative mean IoU over references using rule nodes and rule edges (what a generator would have)."""
    theta = np.clip(theta, [b[0] for b in BOUNDS], [b[1] for b in BOUNDS])
    total = 0.0
    for mask, g2 in refs:
        rec = st.skin(parametric_graph(g2, theta, False), g2['size']) < 0
        total += st.iou(mask, rec)
    return -total / len(refs)


def evaluate(g_ref, g3, mask, diag, fillets):
    out = {}
    for fk in fillets:
        rec = st.skin(g3, g_ref['size'], fillet_k=fk) < 0
        out[fk] = (st.iou(mask, rec), st.skeleton_distance(mask, rec, diag), rec)
    return out


def main():
    outdir = sys.argv[1]
    os.makedirs(outdir, exist_ok=True)
    refs = []
    for spec in sys.argv[2:]:
        path, _, crop = spec.partition('|')
        crop = crop or '0'
        mask, rgb = st.load_mask(path, crop_left=int(crop))
        g2 = st.compress_graph(st.trace_graph(mask))
        refs.append((os.path.basename(path), mask, rgb, g2))
    graphs = [r[3] for r in refs]
    res = minimize(profile_error, START, args=(graphs,), method='Powell', bounds=BOUNDS)
    print('profile-error fit:', np.round(res.x, 3))
    res = minimize(neg_mean_iou, res.x, args=([(r[1], r[3]) for r in refs],), method='Powell', bounds=BOUNDS,
                   options=dict(maxfev=IOU_FIT_MAX_EVALS, xtol=1e-2, ftol=1e-3))
    theta = np.clip(res.x, [b[0] for b in BOUNDS], [b[1] for b in BOUNDS])
    names = ['node_k', 'waist_pos', 'waist_ratio', 'taper_p', 'leaf_q', 'leafy_node_mult', 'degree_exp', 'curvature_gain']
    print('fitted:', {n: round(float(v), 3) for n, v in zip(names, theta)})
    json.dump(dict(zip(names, map(float, theta))), open(os.path.join(outdir, 'theta.json'), 'w'))
    for name, mask, rgb, g2 in refs:
        H, W = mask.shape
        diag = float(np.hypot(W, H))
        print(f'-- {name}')
        for label, measured in (('measured nodes + rule edges', True), ('rule nodes + rule edges', False)):
            g3 = parametric_graph(g2, theta, measured)
            r = evaluate(g2, g3, mask, diag, FILLET_WIDTHS_PX)
            best = max(r, key=lambda k: r[k][0])
            print(f'   {label}: ' + ', '.join(f'fillet {k:g}: IoU {v[0]:.3f} dist {100 * v[1]:.2f}%' for k, v in r.items()))
            if not measured:
                rec = r[best][2]
                ref = np.full((H, W, 3), 255, np.uint8)
                ref[mask] = INK_COLOUR
                rc = np.full((H, W, 3), 255, np.uint8)
                rc[rec] = INK_COLOUR
                panel = np.concatenate([rgb, ref, rc], axis=1)
                tag = name.split('(')[-1].split(')')[0]
                Image.fromarray(panel).save(os.path.join(outdir, f'param_{tag}_side_by_side.png'))
                diff = np.full((H, W, 3), 255, np.uint8)
                diff[mask & rec] = OVERLAP_COLOUR
                diff[mask & ~rec] = MISSING_COLOUR
                diff[~mask & rec] = EXTRA_COLOUR
                Image.fromarray(diff).save(os.path.join(outdir, f'param_{tag}_diff.png'))
    print(f'pass threshold IoU {PASS_IOU}')


if __name__ == '__main__':
    main()
