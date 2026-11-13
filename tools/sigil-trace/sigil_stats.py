"""Shape statistics for sigil masks (experiment 3, not shipped).

Purpose: turn any binary sigil mask into a small vector of scale-free numbers (thickness distribution,
node swelling, waist, taper, branch angles, leaf lengths, counters) so reference art and generator
output can be compared against an envelope instead of by eye.
Value: gives a repeatable, resolution-independent measurement; whether it separates good from bad
shapes is checked by run_stats.py.
"""
import numpy as np
from PIL import Image
from scipy import ndimage as ndi

import sigiltrace as st

NORMAL_DIAG_PX = 1000.0             # every mask is resampled so its bounding-box diagonal is this
RESAMPLE_THRESHOLD = 0.5            # coverage above which a resampled pixel counts as ink
GRANULOMETRY_RADII_PX = (2, 4, 8, 16)  # opening radii at normalised size
TANGENT_ARC_PX = 25.0               # arc distance used to read an edge direction at a node
FORK_ANGLE_DEG = 45.0               # two arms closer than this form a tangent fork, not a wide crotch
SWELL_ARC_FRACTION = 0.3            # where along an incident edge the limb width is read for node swelling
MIN_MASK_PX = 400                   # ignore masks smaller than this after normalisation
SCALARS = ('swell', 'waist', 'taper', 'fork_frac', 'leaf_len_med', 'leaf_tail',
           'holes_per_junction', 'deg4_frac', 'tips_per_junction',
           'gran_2', 'gran_4', 'gran_8', 'gran_16')


def normalise_mask(gray_or_mask, bbox_pad_px=6):
    """Crop to the ink, resample so the bounding box diagonal is NORMAL_DIAG_PX, return bool mask."""
    m = np.asarray(gray_or_mask, float)
    ys, xs = np.nonzero(m > 0.5)
    if len(ys) == 0:
        return np.zeros((1, 1), bool)
    m = m[ys.min():ys.max() + 1, xs.min():xs.max() + 1]
    h, w = m.shape
    k = NORMAL_DIAG_PX / float(np.hypot(w, h))
    im = Image.fromarray((m * 255).astype(np.uint8)).resize((max(int(w * k), 2), max(int(h * k), 2)), Image.LANCZOS)
    out = np.asarray(im).astype(float) / 255 > RESAMPLE_THRESHOLD
    return np.pad(out, bbox_pad_px)


def _edge_dir(e, node_is_a):
    p = np.array(e['pts'])
    if not node_is_a:
        p = p[::-1]
    s = st._arclen(p)
    i = int(np.searchsorted(s, min(TANGENT_ARC_PX, s[-1])))
    v = p[min(i, len(p) - 1)] - p[0]
    n = np.hypot(*v)
    return v / n if n > 1e-6 else None


def _profile_at(e, u):
    prof = np.array(e['profile'])
    return float(np.interp(u, prof[:, 0], prof[:, 1]))


def shape_stats(mask):
    """Dict of SCALARS for a normalised mask; entries are NaN when the shape has nothing to measure."""
    g = st.compress_graph(st.trace_graph(mask))
    nodes, edges = g['nodes'], g['edges']
    deg = np.zeros(len(nodes), int)
    inc = {i: [] for i in range(len(nodes))}
    for e in edges:
        deg[e['a']] += 1
        deg[e['b']] += 1
        inc[e['a']].append((e, True))
        inc[e['b']].append((e, False))
    junctions = [i for i, n in enumerate(nodes) if n['kind'] == 'junction']
    tips = [i for i, n in enumerate(nodes) if n['kind'] == 'tip']
    swell, waist, taper, leaf_len, fork, forks_total = [], [], [], [], 0, 0
    for j in junctions:
        for e, is_a in inc[j]:
            w = _profile_at(e, SWELL_ARC_FRACTION if is_a else 1 - SWELL_ARC_FRACTION)
            if w > 1:
                swell.append(nodes[j]['r'] / w)
        dirs = [d for d in (_edge_dir(e, is_a) for e, is_a in inc[j]) if d is not None]
        if len(dirs) >= 3:
            for a in range(len(dirs)):
                for b in range(a + 1, len(dirs)):
                    ang = np.degrees(np.arccos(np.clip(dirs[a] @ dirs[b], -1, 1)))
                    fork += ang < FORK_ANGLE_DEG
                    forks_total += 1
    for e in edges:
        ka, kb = nodes[e['a']]['kind'], nodes[e['b']]['kind']
        prof = np.array(e['profile'])
        if ka == 'junction' and kb == 'junction':
            ends = min(prof[0, 1], prof[-1, 1])
            if ends > 1:
                waist.append(prof[:, 1].min() / ends)
        elif 'tip' in (ka, kb):
            rj = prof[-1, 1] if ka == 'tip' else prof[0, 1]
            if rj > 1:
                taper.append(_profile_at(e, 0.5) / rj)
            leaf_len.append(e['length'] / NORMAL_DIAG_PX)
    lab, k = ndi.label(~mask)
    border = set(lab[0]) | set(lab[-1]) | set(lab[:, 0]) | set(lab[:, -1])
    holes = sum(1 for i in range(1, k + 1) if i not in border)
    nj = max(len(junctions), 1)
    area = max(float(mask.sum()), 1.0)
    out = dict(
        swell=float(np.median(swell)) if swell else np.nan,
        waist=float(np.median(waist)) if waist else np.nan,
        taper=float(np.median(taper)) if taper else np.nan,
        fork_frac=fork / forks_total if forks_total else np.nan,
        leaf_len_med=float(np.median(leaf_len)) if leaf_len else np.nan,
        leaf_tail=float(np.percentile(leaf_len, 90) / max(np.median(leaf_len), 1e-6)) if len(leaf_len) >= 3 else np.nan,
        holes_per_junction=holes / nj,
        deg4_frac=float((deg[junctions] >= 4).mean()) if junctions else np.nan,
        tips_per_junction=len(tips) / nj,
    )
    for r in GRANULOMETRY_RADII_PX:
        out[f'gran_{r}'] = float(ndi.binary_opening(mask, structure=st._disk(r)).sum() / area)
    return out
