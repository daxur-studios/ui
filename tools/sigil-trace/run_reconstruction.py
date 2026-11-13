"""Experiment 1: reconstruct a reference from its own compressed junction-node graph.

Usage: python run_reconstruction.py <image> <outdir> [crop_left]
Value: reports mask IoU and skeleton distance for several fillet widths and writes side-by-side
PNGs plus the graph JSON, so the representation can be judged before any generator exists.
"""
import json
import os
import sys

import numpy as np
from PIL import Image

import sigiltrace as st

FILLET_WIDTHS_PX = (0.0, 4.0, 8.0, 14.0)
INK_COLOUR = (30, 30, 40)
OVERLAP_COLOUR = (200, 200, 200)
MISSING_COLOUR = (220, 40, 40)
EXTRA_COLOUR = (40, 90, 220)

img, out = sys.argv[1], sys.argv[2]
crop_left = int(sys.argv[3]) if len(sys.argv) > 3 else 0
os.makedirs(out, exist_ok=True)
mask, rgb = st.load_mask(img, crop_left=crop_left)
H, W = mask.shape
diag = float(np.hypot(W, H))
g = st.trace_graph(mask)
g2 = st.compress_graph(g)
json.dump(g2, open(os.path.join(out, 'graph.json'), 'w'))
print(f'nodes={len(g2["nodes"])} edges={len(g2["edges"])} junctions={sum(n["kind"] == "junction" for n in g2["nodes"])}')
results = {}
for fk in FILLET_WIDTHS_PX:
    f = st.skin(g2, (W, H), fillet_k=fk)
    rec = f < 0
    results[fk] = (st.iou(mask, rec), st.skeleton_distance(mask, rec, diag), rec)
    print(f'fillet_k={fk}: IoU={results[fk][0]:.3f} skel_dist={100 * results[fk][1]:.2f}% diag')
best = max(results, key=lambda k: results[k][0])
rec = results[best][2]
panel = np.full((H, W * 3, 3), 255, np.uint8)
panel[:, :W] = rgb
ref = np.full((H, W, 3), 255, np.uint8)
ref[mask] = INK_COLOUR
rc = np.full((H, W, 3), 255, np.uint8)
rc[rec] = INK_COLOUR
panel[:, W:2 * W] = ref
panel[:, 2 * W:] = rc
diff = np.full((H, W, 3), 255, np.uint8)
diff[mask & rec] = OVERLAP_COLOUR
diff[mask & ~rec] = MISSING_COLOUR
diff[~mask & rec] = EXTRA_COLOUR
Image.fromarray(panel).save(os.path.join(out, 'side_by_side.png'))
Image.fromarray(diff).save(os.path.join(out, 'diff.png'))
print('best fillet_k', best)
