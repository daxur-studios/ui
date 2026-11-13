"""Sigil trace tools (experiment, not shipped, not part of the library build).

Purpose: turn a reference image into (1) a clean binary mask and (2) a planar skeleton graph
(nodes with radius, edges with arc-length width profile), and skin such a graph back into a filled
shape so the representation can be tested for fidelity before any generator exists.
Value: gives an objective, repeatable yes/no on whether junction nodes plus tapered edges can express the art.
"""
import json
import numpy as np
from PIL import Image
from scipy import ndimage as ndi
from scipy.interpolate import PchipInterpolator
from skimage.morphology import skeletonize, remove_small_holes, remove_small_objects

# --- named constants -------------------------------------------------------------------------
NORMAL_DIAGONAL = 1000.0            # diagonal of the traced bounding box after normalisation
INK_DISTANCE_FROM_WHITE = 90        # min per-channel drop from white to count as ink (watermark is about 25)
COUNTER_MIN_AREA_FRACTION = 0.0006  # holes smaller than this fraction of the image are highlights
SPECK_MIN_AREA_FRACTION = 0.0004    # ink specks smaller than this are noise
SPUR_LENGTH_PER_RADIUS = 0.9        # leaf edges shorter than this x node radius are skeleton noise
SKEL_SMOOTH_SIGMA_PX = 3.0          # gaussian smoothing of skeleton paths
SAMPLE_STEP_PX = 2.0                # arc-length sampling step for skinning
TIP_RADIUS_PX = 0.4                 # radius at a sharp tip
SLIT_CLOSE_RADIUS_PX = 4            # closes chrome-highlight slits thinner than this; real counters are wider
PROFILE_POINTS = 5                  # width-profile control points per edge (waist-only fit was too coarse)
BACKGROUND_MIN_CHANNEL = 245        # a hole whose mean min-channel is below this is tinted metal, not background
PRUNE_PASSES = 12                  # max spur pruning iterations
WAIST_SEARCH_MARGIN = 0.15          # waist is searched between this and 1 minus this of the edge
PROFILE_SMOOTH_SIGMA = 2.0          # smoothing of measured radii before compression
FIELD_FAR = 1e9                     # 'no shape here' distance
DISC_MARGIN_PX = 40                 # window margin around each disc when evaluating fields


def _disk(r):
    y, x = np.ogrid[-r:r + 1, -r:r + 1]
    return x * x + y * y <= r * r


def load_mask(path, crop_left=0, crop_box=None):
    """Return (mask bool HxW, rgb) with watermark, highlights and ID strip removed."""
    im = np.asarray(Image.open(path).convert('RGB')).astype(int)
    if crop_box:
        x0, y0, x1, y1 = crop_box
        im = im[y0:y1, x0:x1]
    elif crop_left:
        im = im[:, crop_left:]
    h, w, _ = im.shape
    ink = (255 - im.min(axis=2)) > INK_DISTANCE_FROM_WHITE
    ink = ndi.binary_closing(ink, structure=_disk(SLIT_CLOSE_RADIUS_PX))
    ink = remove_small_holes(ink, int(COUNTER_MIN_AREA_FRACTION * h * w))
    ink = remove_small_objects(ink, int(SPECK_MIN_AREA_FRACTION * h * w))
    ink = fill_highlight_holes(ink, im)
    return ink, im.astype(np.uint8)


def fill_highlight_holes(ink, im):
    """Fill enclosed holes that are tinted metal (chrome highlights); keep holes showing the white background."""
    lab, k = ndi.label(~ink)
    border = set(lab[0]) | set(lab[-1]) | set(lab[:, 0]) | set(lab[:, -1])
    out = ink.copy()
    for i in range(1, k + 1):
        if i in border:
            continue
        hole = lab == i
        if im[hole].min(axis=1).mean() < BACKGROUND_MIN_CHANNEL:
            out |= hole
    return out


def _neighbors(sk):
    k = np.ones((3, 3), int)
    k[1, 1] = 0
    return ndi.convolve(sk.astype(int), k, mode='constant') * sk


def trace_graph(mask):
    """Skeleton graph: nodes {x,y,r,kind}, edges {a,b,pts,radii} (pixel units)."""
    dist = ndi.distance_transform_edt(mask)
    sk = skeletonize(mask)
    H, W = sk.shape
    edges, nodes = [], []
    for _ in range(PRUNE_PASSES):
        nb = _neighbors(sk)
        junction = sk & (nb >= 3)
        endpoint = sk & (nb == 1)
        jl, jn = ndi.label(ndi.binary_dilation(junction, structure=np.ones((3, 3))) & sk, structure=np.ones((3, 3)))
        node_of, nodes = {}, []
        for i in range(1, jn + 1):
            ys, xs = np.nonzero(jl == i)
            nodes.append(dict(x=float(xs.mean()), y=float(ys.mean()), r=float(dist[ys, xs].max()), kind='junction'))
            for y, x in zip(ys, xs):
                node_of[(y, x)] = len(nodes) - 1
        for y, x in zip(*np.nonzero(endpoint)):
            nodes.append(dict(x=float(x), y=float(y), r=float(dist[y, x]), kind='tip'))
            node_of[(y, x)] = len(nodes) - 1
        edges, seen = [], set()

        def nbrs(y, x):
            for dy in (-1, 0, 1):
                for dx in (-1, 0, 1):
                    if (dy or dx) and 0 <= y + dy < H and 0 <= x + dx < W and sk[y + dy, x + dx]:
                        yield y + dy, x + dx

        for (y0, x0), a in list(node_of.items()):
            for n in nbrs(y0, x0):
                if node_of.get(n) == a or (y0, x0, *n) in seen:
                    continue
                path = [(y0, x0), n]
                seen.add((y0, x0, *n))
                cur, prev = n, (y0, x0)
                while cur not in node_of:
                    nxt = [m for m in nbrs(*cur) if m != prev and m not in path[-3:]]
                    if not nxt:
                        break
                    prev, cur = cur, nxt[0]
                    path.append(cur)
                if cur in node_of:
                    seen.add((*cur, *prev))
                    if node_of[cur] != a:
                        edges.append(dict(a=a, b=node_of[cur], path=path))
        drop = set()
        for i, e in enumerate(edges):
            for leaf, other in ((e['a'], e['b']), (e['b'], e['a'])):
                if nodes[leaf]['kind'] == 'tip' and nodes[other]['kind'] == 'junction':
                    if len(e['path']) < SPUR_LENGTH_PER_RADIUS * nodes[other]['r']:
                        drop.add(i)
        if not drop:
            break
        for i in drop:
            for (y, x) in edges[i]['path'][:-1] + edges[i]['path'][-1:]:
                pass
            for nid, idx in ((edges[i]['a'], 0), (edges[i]['b'], -1)):
                if nodes[nid]['kind'] == 'tip':
                    for (y, x) in edges[i]['path']:
                        if (y, x) not in node_of or nodes[node_of[(y, x)]]['kind'] == 'tip':
                            sk[y, x] = False
        sk = skeletonize(sk)
    out_edges = []
    for e in edges:
        p = np.array([(x, y) for y, x in e['path']], float)
        if len(p) > 6:
            ps = np.stack([ndi.gaussian_filter1d(p[:, 0], SKEL_SMOOTH_SIGMA_PX, mode='nearest'),
                           ndi.gaussian_filter1d(p[:, 1], SKEL_SMOOTH_SIGMA_PX, mode='nearest')], 1)
            p = ps
        na, nb_ = nodes[e['a']], nodes[e['b']]
        p[0] = (na['x'], na['y'])
        p[-1] = (nb_['x'], nb_['y'])
        r = ndi.map_coordinates(dist, [p[:, 1], p[:, 0]], order=1)
        out_edges.append(dict(a=e['a'], b=e['b'], pts=p.tolist(), radii=r.tolist()))
    keep = sorted({e['a'] for e in out_edges} | {e['b'] for e in out_edges})
    remap = {k: i for i, k in enumerate(keep)}
    nodes = [nodes[k] for k in keep]
    for e in out_edges:
        e['a'], e['b'] = remap[e['a']], remap[e['b']]
    return dict(nodes=nodes, edges=out_edges, size=[W, H])


NORMAL_SMOOTH_SIGMA_PX = 4.0        # smoothing of a path before taking its normal


def edge_normals(p):
    """Unit normals (+n is 90 degrees left of travel in image coordinates) along a path, shape (N, 2)."""
    p = np.asarray(p, float)
    if len(p) < 3:
        return np.tile([0.0, 1.0], (len(p), 1))
    x = ndi.gaussian_filter1d(p[:, 0], NORMAL_SMOOTH_SIGMA_PX, mode='nearest')
    y = ndi.gaussian_filter1d(p[:, 1], NORMAL_SMOOTH_SIGMA_PX, mode='nearest')
    dx, dy = np.gradient(x), np.gradient(y)
    n = np.hypot(dx, dy)
    n = np.maximum(n, 1e-6)
    return np.stack([-dy / n, dx / n], 1)


def _arclen(p):
    return np.r_[0, np.cumsum(np.hypot(*np.diff(p, axis=0).T))]


def compress_edge(edge, nodes):
    """Reduce an edge's measured radii to a 3-point width profile (start, waist, end) over arc length."""
    p = np.array(edge['pts'])
    s = _arclen(p)
    L = max(s[-1], 1e-6)
    r = ndi.gaussian_filter1d(np.array(edge['radii']), PROFILE_SMOOTH_SIGMA, mode='nearest')
    u = s / L
    ra, rb = r[0], r[-1]
    if nodes[edge['a']]['kind'] == 'tip':
        ra = TIP_RADIUS_PX
    if nodes[edge['b']]['kind'] == 'tip':
        rb = TIP_RADIUS_PX
    us = np.linspace(0, 1, PROFILE_POINTS)
    rs = np.interp(us, u, r)
    rs[0], rs[-1] = ra, rb
    return dict(length=float(L), profile=[[float(a), float(b)] for a, b in zip(us, rs)])


def compress_graph(g):
    g2 = json.loads(json.dumps(g))
    for e in g2['edges']:
        c = compress_edge(e, g2['nodes'])
        e['profile'], e['length'] = c['profile'], c['length']
        del e['radii']
    return g2


def _smooth_min(a, b, k):
    h = np.maximum(k - np.abs(a - b), 0) / k
    return np.minimum(a, b) - h * h * k * 0.25


def skin(g2, size, fillet_k=0.0, step=SAMPLE_STEP_PX, node_scale=1.0):
    """Skin a compressed graph into a signed field (negative inside). fillet_k = concave fillet width in px."""
    W, H = size
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)

    def disc_union(centres, radii):
        f = np.full((H, W), FIELD_FAR, np.float32)
        for (cx, cy), r in zip(centres, radii):
            x0, x1 = int(max(cx - r - DISC_MARGIN_PX, 0)), int(min(cx + r + DISC_MARGIN_PX, W))
            y0, y1 = int(max(cy - r - DISC_MARGIN_PX, 0)), int(min(cy + r + DISC_MARGIN_PX, H))
            if x1 <= x0 or y1 <= y0:
                continue
            d = np.hypot(xx[y0:y1, x0:x1] - cx, yy[y0:y1, x0:x1] - cy) - r
            f[y0:y1, x0:x1] = np.minimum(f[y0:y1, x0:x1], d)
        return f

    parts = []
    for n in g2['nodes']:
        if n['kind'] == 'junction':
            parts.append(disc_union([(n['x'], n['y'])], [n['r'] * node_scale]))
    for e in g2['edges']:
        p = np.array(e['pts'])
        s = _arclen(p)
        L = s[-1]
        if L < 1:
            continue
        n = max(int(L / step), 2)
        t = np.linspace(0, L, n)
        c = np.stack([np.interp(t, s, p[:, 0]), np.interp(t, s, p[:, 1])], 1)
        if 'offset' in e:
            off = np.array(e['offset'])
            c = c + PchipInterpolator(off[:, 0], off[:, 1])(t / L)[:, None] * edge_normals(c)
        prof = np.array(e['profile'])
        w = PchipInterpolator(prof[:, 0], prof[:, 1])(t / L)
        parts.append(disc_union(c, np.maximum(w, 0.0)))
    field = np.full((H, W), FIELD_FAR, np.float32)
    for f in parts:
        field = _smooth_min(field, f, fillet_k) if fillet_k > 0 else np.minimum(field, f)
    return field


def iou(a, b):
    return float((a & b).sum() / max((a | b).sum(), 1))


def skeleton_distance(a, b, diag):
    """Mean symmetric nearest-skeleton distance as a fraction of the diagonal."""
    sa, sb = skeletonize(a), skeletonize(b)
    da = ndi.distance_transform_edt(~sb)
    db = ndi.distance_transform_edt(~sa)
    return float((da[sa].mean() + db[sb].mean()) / 2 / diag)
