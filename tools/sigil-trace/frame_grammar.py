"""Frame grammar prototype (experiment 4, not shipped): procedural skeleton graph for a sigil frame.

Purpose: generate a rounded-rectangle rim with corner flourishes and an optional centre spike as a junction-node
skeleton graph (same format as sigiltrace), then skin it with sigiltrace.skin into one filleted outline.
Value: a resizable, seeded frame whose shape statistics can be checked against the eight traced frame references.
Usage: python frame_grammar.py <outdir> <frame_stats.json> [seed_count]
"""
import json
import os
import sys

import numpy as np
from PIL import Image

import run_stats as rs
import sigil_stats as ss
import sigiltrace as st

TARGET_DIAG_PX = 1000.0             # frames are generated at the normalised statistics size
PAD_PX = 90                         # canvas margin so flourishes are not clipped
ARC_STEPS = 24                      # samples per rounded corner
CORNER_RADIUS_FRACTION = 0.16       # of the shorter side
RIM_HALF_WIDTH_PX = (5.5, 8.5)      # rim half width range at its waist
CORNER_SWELL = (1.7, 2.3)           # corner node radius over the rim half width read at 0.3 of the edge
FLOURISH_KEEP_PROB = 0.85           # chance each corner carries a flourish
FLOURISH_LENGTH_FRACTION = (0.35, 0.65)  # of the shorter side
FLOURISH_BEND_DEG = (40.0, 100.0)    # total heading change along a flourish
FLOURISH_STEPS = 40
FLOURISH_TAPER = (0.45, 0.6)       # half width at mid length over the corner node radius
CENTRE_SPIKE_PROB = 0.6             # chance of a spike on the top edge centre
CENTRE_SPIKE_FRACTION = (0.15, 0.30)  # of the shorter side
CENTRE_NODE_SWELL = 1.7             # centre node radius over rim half width
FILLET_PX = 8.0
CORNER_MID_DEG = (225.0, 315.0, 45.0, 135.0)   # TL, TR, BR, BL, image coordinates (y down)
CORNER_OUTWARD = ((-1, -1), (1, -1), (1, 1), (-1, 1))


def _arc(cx, cy, r, a0, a1):
    th = np.radians(np.linspace(a0, a1, ARC_STEPS + 1))
    return np.stack([cx + r * np.cos(th), cy + r * np.sin(th)], 1)


def rim_edges(w, h, cr):
    """Four rim paths, each from one corner's arc midpoint to the next, clockwise from the top-left."""
    centres = ((cr, cr), (w - cr, cr), (w - cr, h - cr), (cr, h - cr))
    spans = ((180, 270), (270, 360), (0, 90), (90, 180))
    arcs = [_arc(c[0], c[1], cr, s[0], s[1]) for c, s in zip(centres, spans)]
    half = ARC_STEPS // 2
    out = []
    for k in range(4):
        a, b = arcs[k], arcs[(k + 1) % 4]
        out.append(np.concatenate([a[half:], b[:half + 1]]))
    return out


def split_mid(path):
    s = st._arclen(path)
    i = int(np.searchsorted(s, s[-1] / 2))
    return path[:i + 1], path[i:]


def flourish(p0, outward, length, bend_deg, sign, steps=FLOURISH_STEPS):
    """Curved limb leaving p0 along the outward diagonal, heading rotated by bend_deg over its length."""
    head0 = np.arctan2(outward[1], outward[0])
    ds = length / steps
    pts, p = [p0.copy()], p0.copy()
    for i in range(steps):
        head = head0 + sign * np.radians(bend_deg) * ((i + 0.5) / steps) ** 1.5
        p = p + ds * np.array([np.cos(head), np.sin(head)])
        pts.append(p.copy())
    return np.array(pts)


def edge(a, b, pts, widths):
    """Edge record with a 5-point width profile (widths already list of 5)."""
    us = np.linspace(0, 1, st.PROFILE_POINTS)
    return dict(a=a, b=b, pts=pts.tolist(), length=float(st._arclen(pts)[-1]),
                profile=[[float(u), float(x)] for u, x in zip(us, widths)])


def generate(seed, aspect):
    """Return (graph, (width, height)) for a frame of the given aspect ratio, normalised to TARGET_DIAG_PX."""
    rng = np.random.default_rng(seed)
    h = TARGET_DIAG_PX / np.sqrt(1 + aspect ** 2) - 2 * PAD_PX * 0
    w = h * aspect
    short = min(w, h)
    cr = CORNER_RADIUS_FRACTION * short
    rim_w = rng.uniform(*RIM_HALF_WIDTH_PX)
    big_r = rim_w * rng.uniform(*CORNER_SWELL) * 1.0
    rims = [r + PAD_PX for r in rim_edges(w, h, cr)]
    nodes, edges = [], []
    corner_ids = []
    for k in range(4):
        keep = rng.random() < FLOURISH_KEEP_PROB
        p = rims[k][0]
        nodes.append(dict(x=float(p[0]), y=float(p[1]), r=float(big_r), kind='junction' if keep else 'bend'))
        corner_ids.append(len(nodes) - 1)
    mid_prof = lambda r_end: [r_end, r_end / CORNER_SWELL[0] * 0.95, rim_w, r_end / CORNER_SWELL[0] * 0.95, r_end]
    for k in range(4):
        a, b = corner_ids[k], corner_ids[(k + 1) % 4]
        path = rims[k]
        if k == 0 and rng.random() < CENTRE_SPIKE_PROB:
            first, second = split_mid(path)
            c = first[-1]
            nodes.append(dict(x=float(c[0]), y=float(c[1]), r=float(rim_w * CENTRE_NODE_SWELL), kind='junction'))
            cid = len(nodes) - 1
            edges.append(edge(a, cid, first, mid_prof(big_r)[:4] + [rim_w * CENTRE_NODE_SWELL]))
            edges.append(edge(cid, b, second, [rim_w * CENTRE_NODE_SWELL] + mid_prof(big_r)[1:]))
            L = rng.uniform(*CENTRE_SPIKE_FRACTION) * short
            tip = np.array([[c[0], c[1] - L * f] for f in np.linspace(0, 1, 12)])
            nodes.append(dict(x=float(tip[-1][0]), y=float(tip[-1][1]), r=st.TIP_RADIUS_PX, kind='tip'))
            r0 = rim_w * CENTRE_NODE_SWELL
            edges.append(edge(cid, len(nodes) - 1, tip, [r0, r0 * 0.7, r0 * 0.4, r0 * 0.2, st.TIP_RADIUS_PX]))
        else:
            edges.append(edge(a, b, path, mid_prof(big_r)))
    for k in range(4):
        if nodes[corner_ids[k]]['kind'] != 'junction':
            continue
        p0 = np.array([nodes[corner_ids[k]]['x'], nodes[corner_ids[k]]['y']])
        out = np.array(CORNER_OUTWARD[k], float)
        out /= np.hypot(*out)
        length = rng.uniform(*FLOURISH_LENGTH_FRACTION) * short
        pts = flourish(p0, out, length, rng.uniform(*FLOURISH_BEND_DEG), rng.choice([-1, 1]))
        nodes.append(dict(x=float(pts[-1][0]), y=float(pts[-1][1]), r=st.TIP_RADIUS_PX, kind='tip'))
        t = rng.uniform(*FLOURISH_TAPER)
        edges.append(edge(corner_ids[k], len(nodes) - 1, pts,
                          [big_r, big_r * (t + 0.25), big_r * t, big_r * t * 0.55, st.TIP_RADIUS_PX]))
    return dict(nodes=nodes, edges=edges), (int(w + 2 * PAD_PX), int(h + 2 * PAD_PX))


def render(g, size):
    """Skin a graph and return a boolean ink mask."""
    return st.skin(g, size, fillet_k=FILLET_PX) < 0


def main():
    outdir, stats_json = sys.argv[1], sys.argv[2]
    n = int(sys.argv[3]) if len(sys.argv) > 3 else 8
    os.makedirs(outdir, exist_ok=True)
    frames = json.load(open(stats_json))
    bands = {s: rs.band([v[s] for v in frames.values()]) for s in ss.SCALARS}
    aspects = [5.0, 2.3, 1.1]
    masks, rows = [], []
    for aspect in aspects:
        for seed in range(n):
            g, size = generate(seed, aspect)
            m = render(g, size)
            masks.append(m)
            stt = ss.shape_stats(ss.normalise_mask(m))
            rows.append((aspect, seed, stt))
    rs.montage({'gen': masks}, os.path.join(outdir, 'frame_grammar.png'))
    print('aspect seed ' + ' '.join(f'{c[:9]:>9s}' for c in ('tips_per_junction', 'holes_per_junction', 'fork_frac', 'taper')) + '  score13  core4')
    core = ('tips_per_junction', 'holes_per_junction', 'fork_frac', 'taper')
    sc, c4 = [], []
    for aspect, seed, stt in rows:
        inb = sum(rs.in_band(stt[s], bands[s]) for s in core)
        sc.append(rs.score(stt, bands))
        c4.append(inb)
        print(f'{aspect:5.1f} {seed:4d} ' + ' '.join(f'{stt[s]:9.2f}' for s in core) + f'  {100 * sc[-1]:4.0f}%   {inb}/4')
    print(f'mean score13 {100 * np.mean(sc):.0f}%   mean core4 in band {np.mean(c4):.2f}/4')


if __name__ == '__main__':
    main()
