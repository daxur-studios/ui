/**
 * 2D Implicit Signed Distance Field (SDF) evaluator and Marching-Squares cubic Bezier contour
 * extractor for liquid-metal cybersigil geometry.
 *
 * Veins, star cores, and branches are evaluated into a continuous 2D distance field using
 * polynomial smooth-minimum (`smin`) blending so every junction forms concave surface-tension
 * webbing automatically. Extracting both the outer silhouette (`d = 0`) and an inner medial-axis
 * ridge (`d = -ridgeOffset`) gives the SVG specular lighting filter a true peaked 3D bevel.
 */

import {
  cubicPoint,
  SIGIL_NORMAL_EPSILON,
  SIGIL_PATH_DECIMALS,
  signedArea,
  type ISigilPoint,
  type ISigilSpine,
} from './sigil-math';

/** Default grid resolution in user units. 1.5 balances crisp needle tips with <3ms evaluation. */
export const SIGIL_SDF_DEFAULT_CELL_SIZE = 1.5;

/** Grid padding around the canvas in cells so edge-crossing rails close cleanly. */
export const SIGIL_SDF_GRID_PADDING = 6;

/** Minimum enclosed polygon area (in sq user units) kept after contour extraction. */
export const SIGIL_SDF_MIN_LOOP_AREA = 6;

/** Douglas-Peucker simplification tolerance as a fraction of `cellSize`. */
export const SIGIL_SDF_SIMPLIFY_FACTOR = 0.58;

/** Number of Laplacian smoothing passes on non-sharp vertices to eliminate grid stair-step ripples. */
export const SIGIL_SDF_SMOOTH_PASSES = 2;

/** Cosine of the turning angle threshold above which a vertex is treated as a sharp needle tip. */
export const SIGIL_SDF_SHARP_CORNER_COS = 0.57; // ~55 degrees

/** Catmull-Rom tangent handle scale for smooth cubic Bezier segments. */
export const SIGIL_SDF_BEZIER_TENSION = 0.25;

/** A single tapered line-swept-sphere capsule primitive in the SDF. */
export interface ISdfCapsule {
  readonly ax: number;
  readonly ay: number;
  readonly ar: number;
  readonly bx: number;
  readonly by: number;
  readonly br: number;
  readonly blendK: number;
}

/** A sharp-cornered closed polygon primitive (e.g., star eye or diamond spear) in the SDF. */
export interface ISdfPolygon {
  readonly points: readonly ISigilPoint[];
  readonly blendK: number;
  readonly subtract: boolean;
}

/** Smooth scalloped circular aperture subtracted from the SDF. */
export interface ISdfScallopedHole {
  readonly cx: number;
  readonly cy: number;
  readonly radius: number;
  readonly scallopDepth: number;
  readonly scallopLobes: number;
  readonly blendK: number;
}

/** Output geometry extracted from an SDF field. */
export interface ISdfExtractedPaths {
  /** Outer liquid-metal silhouette path (`nonzero` fill rule, solids + holes). */
  readonly d: string;
  /** Inner medial-axis ridge contour path for crisp 3D bevel highlights. */
  readonly ridgeD: string;
  /** Enclosed negative-space pocket contours (for tinted spandrel glass in UI chrome). */
  readonly pocketD: string;
  /** Number of enclosed negative-space pockets found. */
  readonly pocketCount: number;
  /** Number of disconnected solid islands found. */
  readonly islandCount: number;
}

/** Polynomial cubic smooth minimum (`smin`) for organic liquid-metal fillet blending. */
export function smoothMin(a: number, b: number, k: number): number {
  if (k <= 0) return a < b ? a : b;
  const h = Math.max(k - Math.abs(a - b), 0) / k;
  return (a < b ? a : b) - h * h * k * 0.25;
}

/** Polynomial smooth maximum (`smax`) for smooth aperture subtraction. */
export function smoothMax(a: number, b: number, k: number): number {
  return -smoothMin(-a, -b, k);
}

/** Mutable 2D SDF scene builder that accumulates primitives and extracts cubic SVG contours. */
export class SigilSdfField {
  private readonly capsules: ISdfCapsule[] = [];
  private readonly polygons: ISdfPolygon[] = [];
  private readonly holes: ISdfScallopedHole[] = [];

  constructor(
    readonly width: number,
    readonly height: number,
    readonly cellSize: number = SIGIL_SDF_DEFAULT_CELL_SIZE,
  ) {}

  /** Adds a tapered capsule segment blended with `blendK`. */
  addCapsule(
    ax: number,
    ay: number,
    ar: number,
    bx: number,
    by: number,
    br: number,
    blendK: number,
  ): this {
    if (!Number.isFinite(ax + ay + ar + bx + by + br + blendK)) return this;
    this.capsules.push({ ax, ay, ar: Math.max(0.2, ar), bx, by, br: Math.max(0.2, br), blendK });
    return this;
  }

  /** Samples a cubic Bezier spine with `widthAt(t)` (full width) into tapered SDF capsules. */
  addSpline(
    spine: ISigilSpine,
    widthAt: (t: number) => number,
    blendK: number,
    samples = 18,
  ): this {
    let prev = cubicPoint(spine, 0);
    let prevR = Math.max(0.25, widthAt(0) * 0.5);
    for (let i = 1; i <= samples; i++) {
      const t = i / samples;
      const curr = cubicPoint(spine, t);
      const currR = Math.max(0.25, widthAt(t) * 0.5);
      this.addCapsule(prev.x, prev.y, prevR, curr.x, curr.y, currR, blendK);
      prev = curr;
      prevR = currR;
    }
    return this;
  }

  /** Adds a closed polygon solid (blended into veins via `smin`) or cutout (`subtract = true`). */
  addPolygon(points: readonly ISigilPoint[], blendK: number, subtract = false): this {
    if (points.length >= 3) {
      this.polygons.push({ points, blendK, subtract });
    }
    return this;
  }

  /** Subtracts a scalloped hollow eye aperture from the distance field. */
  subtractScallopedEye(
    cx: number,
    cy: number,
    radius: number,
    scallopDepth: number,
    scallopLobes: number,
    blendK: number,
  ): this {
    if (radius > 0.5) {
      this.holes.push({ cx, cy, radius, scallopDepth, scallopLobes, blendK });
    }
    return this;
  }

  /**
   * Evaluates the SDF on an accelerated grid and extracts the outer silhouette, medial ridge,
   * and enclosed negative-space pockets as smooth cubic Bezier SVG paths.
   */
  extract(ridgeDepth = 2.0): ISdfExtractedPaths {
    const pad = SIGIL_SDF_GRID_PADDING * this.cellSize;
    const minX = -pad;
    const minY = -pad;
    const cols = Math.ceil((this.width + pad * 2) / this.cellSize) + 1;
    const rows = Math.ceil((this.height + pad * 2) / this.cellSize) + 1;
    const grid = new Float32Array(cols * rows);
    grid.fill(1e6);

    // 1. Splat each capsule over its local AABB for fast O(capsules * localArea) evaluation.
    for (const cap of this.capsules) {
      const maxR = Math.max(cap.ar, cap.br);
      const reach = maxR + Math.max(0, cap.blendK) + this.cellSize * 2;
      const x0 = Math.max(0, Math.floor((Math.min(cap.ax, cap.bx) - reach - minX) / this.cellSize));
      const x1 = Math.min(
        cols - 1,
        Math.ceil((Math.max(cap.ax, cap.bx) + reach - minX) / this.cellSize),
      );
      const y0 = Math.max(0, Math.floor((Math.min(cap.ay, cap.by) - reach - minY) / this.cellSize));
      const y1 = Math.min(
        rows - 1,
        Math.ceil((Math.max(cap.ay, cap.by) + reach - minY) / this.cellSize),
      );

      const bax = cap.bx - cap.ax;
      const bay = cap.by - cap.ay;
      const lenSq = bax * bax + bay * bay;
      const invLenSq = lenSq > SIGIL_NORMAL_EPSILON ? 1 / lenSq : 0;

      for (let iy = y0; iy <= y1; iy++) {
        const py = minY + iy * this.cellSize;
        const pay = py - cap.ay;
        const rowOffset = iy * cols;
        for (let ix = x0; ix <= x1; ix++) {
          const px = minX + ix * this.cellSize;
          const pax = px - cap.ax;
          let t = invLenSq > 0 ? (pax * bax + pay * bay) * invLenSq : 0;
          if (t < 0) t = 0;
          else if (t > 1) t = 1;
          const dx = pax - bax * t;
          const dy = pay - bay * t;
          const r = cap.ar + (cap.br - cap.ar) * t;
          const dist = Math.hypot(dx, dy) - r;
          const idx = rowOffset + ix;
          grid[idx] = smoothMin(grid[idx], dist, cap.blendK);
        }
      }
    }

    // 2. Splat polygon solids and cutouts.
    for (const poly of this.polygons) {
      let pMinX = Infinity;
      let pMinY = Infinity;
      let pMaxX = -Infinity;
      let pMaxY = -Infinity;
      for (const p of poly.points) {
        if (p.x < pMinX) pMinX = p.x;
        if (p.y < pMinY) pMinY = p.y;
        if (p.x > pMaxX) pMaxX = p.x;
        if (p.y > pMaxY) pMaxY = p.y;
      }
      const reach = Math.max(0, poly.blendK) + this.cellSize * 2;
      const x0 = Math.max(0, Math.floor((pMinX - reach - minX) / this.cellSize));
      const x1 = Math.min(cols - 1, Math.ceil((pMaxX + reach - minX) / this.cellSize));
      const y0 = Math.max(0, Math.floor((pMinY - reach - minY) / this.cellSize));
      const y1 = Math.min(rows - 1, Math.ceil((pMaxY + reach - minY) / this.cellSize));

      for (let iy = y0; iy <= y1; iy++) {
        const py = minY + iy * this.cellSize;
        const rowOffset = iy * cols;
        for (let ix = x0; ix <= x1; ix++) {
          const px = minX + ix * this.cellSize;
          const dPoly = signedDistanceToPolygon(px, py, poly.points);
          const idx = rowOffset + ix;
          grid[idx] = poly.subtract
            ? smoothMax(grid[idx], -dPoly, poly.blendK)
            : smoothMin(grid[idx], dPoly, poly.blendK);
        }
      }
    }

    // 3. Subtract scalloped eyes.
    for (const hole of this.holes) {
      const maxR = hole.radius * (1 + Math.abs(hole.scallopDepth)) + Math.max(0, hole.blendK) + this.cellSize * 2;
      const x0 = Math.max(0, Math.floor((hole.cx - maxR - minX) / this.cellSize));
      const x1 = Math.min(cols - 1, Math.ceil((hole.cx + maxR - minX) / this.cellSize));
      const y0 = Math.max(0, Math.floor((hole.cy - maxR - minY) / this.cellSize));
      const y1 = Math.min(rows - 1, Math.ceil((hole.cy + maxR - minY) / this.cellSize));

      for (let iy = y0; iy <= y1; iy++) {
        const py = minY + iy * this.cellSize;
        const dy = py - hole.cy;
        const rowOffset = iy * cols;
        for (let ix = x0; ix <= x1; ix++) {
          const px = minX + ix * this.cellSize;
          const dx = px - hole.cx;
          const angle = Math.atan2(dy, dx);
          const targetR =
            hole.radius * (1 + hole.scallopDepth * Math.cos(hole.scallopLobes * angle));
          const dHole = Math.hypot(dx, dy) - targetR;
          const idx = rowOffset + ix;
          grid[idx] = smoothMax(grid[idx], -dHole, hole.blendK);
        }
      }
    }

    // 4. Extract outer contour (level = 0) and medial ridge contour (level = -ridgeDepth).
    const outerLoops = extractClosedLoops(grid, cols, rows, minX, minY, this.cellSize, 0);
    const solidPaths: string[] = [];
    const holePaths: string[] = [];
    let islandCount = 0;
    let pocketCount = 0;

    for (const loop of outerLoops) {
      const area = signedArea(loop);
      if (Math.abs(area) < SIGIL_SDF_MIN_LOOP_AREA) continue;
      const isHole = isLoopHole(loop, grid, cols, rows, minX, minY, this.cellSize, 0);
      // Normalize winding for SVG nonzero fill-rule: solids positive, holes negative.
      const normalized = (area > 0) !== isHole ? loop : [...loop].reverse();
      const pathStr = loopToCubicPath(normalized, this.cellSize);
      if (isHole) {
        holePaths.push(pathStr);
        pocketCount++;
      } else {
        solidPaths.push(pathStr);
        islandCount++;
      }
    }

    const ridgeLoops = extractClosedLoops(
      grid,
      cols,
      rows,
      minX,
      minY,
      this.cellSize,
      -Math.abs(ridgeDepth),
    );
    const ridgePaths: string[] = [];
    for (const loop of ridgeLoops) {
      if (Math.abs(signedArea(loop)) < SIGIL_SDF_MIN_LOOP_AREA * 0.5) continue;
      const isHole = isLoopHole(loop, grid, cols, rows, minX, minY, this.cellSize, -Math.abs(ridgeDepth));
      const area = signedArea(loop);
      const normalized = (area > 0) !== isHole ? loop : [...loop].reverse();
      ridgePaths.push(loopToCubicPath(normalized, this.cellSize));
    }

    return {
      d: [...solidPaths, ...holePaths].join(''),
      ridgeD: ridgePaths.join(''),
      pocketD: holePaths.join(''),
      pocketCount,
      islandCount,
    };
  }
}

/** Exact signed distance to a closed polygon (negative inside, positive outside). */
function signedDistanceToPolygon(px: number, py: number, pts: readonly ISigilPoint[]): number {
  let d = Infinity;
  let inside = false;
  const n = pts.length;
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const xi = pts[i].x;
    const yi = pts[i].y;
    const xj = pts[j].x;
    const yj = pts[j].y;

    const ex = xj - xi;
    const ey = yj - yi;
    const wx = px - xi;
    const wy = py - yi;
    const lenSq = ex * ex + ey * ey;
    let t = lenSq > SIGIL_NORMAL_EPSILON ? (wx * ex + wy * ey) / lenSq : 0;
    if (t < 0) t = 0;
    else if (t > 1) t = 1;
    const bx = wx - ex * t;
    const by = wy - ey * t;
    const distSq = bx * bx + by * by;
    if (distSq < d) d = distSq;

    if ((yi > py) !== (yj > py) && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  const dist = Math.sqrt(d);
  return inside ? -dist : dist;
}

/** Marching Squares edge-pair lookup (0: top, 1: right, 2: bottom, 3: left). */
const MS_TABLE: readonly (readonly [number, number])[][] = [
  [], // 0
  [[3, 2]], // 1: bl
  [[2, 1]], // 2: br
  [[3, 1]], // 3: bl, br
  [[1, 0]], // 4: tr
  [], // 5: saddle (tr, bl)
  [[2, 0]], // 6: tr, br
  [[3, 0]], // 7: tr, br, bl
  [[0, 3]], // 8: tl
  [[0, 2]], // 9: tl, bl
  [], // 10: saddle (tl, br)
  [[0, 1]], // 11: tl, bl, br
  [[1, 3]], // 12: tl, tr
  [[1, 2]], // 13: tl, tr, bl
  [[2, 3]], // 14: tl, tr, br
  [], // 15
];

interface ISegment {
  readonly startKey: string;
  readonly endKey: string;
  readonly a: ISigilPoint;
  readonly b: ISigilPoint;
}

/** Extracts closed iso-contour loops from `grid` at `level`. */
function extractClosedLoops(
  grid: Float32Array,
  cols: number,
  rows: number,
  minX: number,
  minY: number,
  cellSize: number,
  level: number,
): ISigilPoint[][] {
  const segments: ISegment[] = [];
  const byStart = new Map<string, number[]>();

  const edgePoint = (ix: number, iy: number, edge: number): ISigilPoint => {
    const x = minX + ix * cellSize;
    const y = minY + iy * cellSize;
    const tl = grid[iy * cols + ix];
    const tr = grid[iy * cols + ix + 1];
    const br = grid[(iy + 1) * cols + ix + 1];
    const bl = grid[(iy + 1) * cols + ix];
    const lerpT = (v0: number, v1: number): number => {
      const denom = v1 - v0;
      if (Math.abs(denom) < SIGIL_NORMAL_EPSILON) return 0.5;
      return Math.min(0.999, Math.max(0.001, (level - v0) / denom));
    };
    switch (edge) {
      case 0:
        return { x: x + lerpT(tl, tr) * cellSize, y };
      case 1:
        return { x: x + cellSize, y: y + lerpT(tr, br) * cellSize };
      case 2:
        return { x: x + lerpT(bl, br) * cellSize, y: y + cellSize };
      default:
        return { x, y: y + lerpT(tl, bl) * cellSize };
    }
  };

  const edgeKey = (ix: number, iy: number, edge: number): string => {
    switch (edge) {
      case 0:
        return `h:${ix},${iy}`;
      case 1:
        return `v:${ix + 1},${iy}`;
      case 2:
        return `h:${ix},${iy + 1}`;
      default:
        return `v:${ix},${iy}`;
    }
  };

  for (let iy = 0; iy < rows - 1; iy++) {
    for (let ix = 0; ix < cols - 1; ix++) {
      const tl = grid[iy * cols + ix];
      const tr = grid[iy * cols + ix + 1];
      const br = grid[(iy + 1) * cols + ix + 1];
      const bl = grid[(iy + 1) * cols + ix];

      const mask =
        (tl < level ? 8 : 0) |
        (tr < level ? 4 : 0) |
        (br < level ? 2 : 0) |
        (bl < level ? 1 : 0);

      if (mask === 0 || mask === 15) continue;

      let pairs: readonly (readonly [number, number])[];
      if (mask === 5) {
        const center = 0.25 * (tl + tr + br + bl);
        pairs = center < level ? [[3, 0], [1, 2]] : [[3, 2], [1, 0]];
      } else if (mask === 10) {
        const center = 0.25 * (tl + tr + br + bl);
        pairs = center < level ? [[0, 1], [2, 3]] : [[0, 3], [2, 1]];
      } else {
        pairs = MS_TABLE[mask];
      }

      for (const [e0, e1] of pairs) {
        const startKey = edgeKey(ix, iy, e0);
        const endKey = edgeKey(ix, iy, e1);
        const segIdx = segments.length;
        segments.push({
          startKey,
          endKey,
          a: edgePoint(ix, iy, e0),
          b: edgePoint(ix, iy, e1),
        });
        const list = byStart.get(startKey);
        if (list) list.push(segIdx);
        else byStart.set(startKey, [segIdx]);
      }
    }
  }

  const used = new Uint8Array(segments.length);
  const loops: ISigilPoint[][] = [];

  for (let i = 0; i < segments.length; i++) {
    if (used[i]) continue;
    used[i] = 1;
    const startSeg = segments[i];
    const loop: ISigilPoint[] = [startSeg.a];
    let currKey = startSeg.endKey;
    let guard = 0;

    while (currKey !== startSeg.startKey && guard < segments.length + 1) {
      guard++;
      const candidates = byStart.get(currKey);
      if (!candidates) break;
      let nextIdx = -1;
      for (const c of candidates) {
        if (!used[c]) {
          nextIdx = c;
          break;
        }
      }
      if (nextIdx === -1) break;
      used[nextIdx] = 1;
      const seg = segments[nextIdx];
      loop.push(seg.a);
      currKey = seg.endKey;
    }

    if (currKey === startSeg.startKey && loop.length >= 3) {
      loops.push(loop);
    }
  }

  return loops;
}

/** Samples the grid bilinearly to determine whether an enclosed loop surrounds empty space (a hole). */
function isLoopHole(
  loop: readonly ISigilPoint[],
  grid: Float32Array,
  cols: number,
  rows: number,
  minX: number,
  minY: number,
  cellSize: number,
  level: number,
): boolean {
  // Find the longest edge to test an interior point slightly off its midpoint.
  let bestIdx = 0;
  let bestLenSq = -1;
  for (let i = 0; i < loop.length; i++) {
    const a = loop[i];
    const b = loop[(i + 1) % loop.length];
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const lenSq = dx * dx + dy * dy;
    if (lenSq > bestLenSq) {
      bestLenSq = lenSq;
      bestIdx = i;
    }
  }
  const a = loop[bestIdx];
  const b = loop[(bestIdx + 1) % loop.length];
  const mx = (a.x + b.x) * 0.5;
  const my = (a.y + b.y) * 0.5;
  const len = Math.sqrt(bestLenSq) || 1;
  // Normal pointing left of edge a->b; in y-down coords, area > 0 means interior is on the left.
  const area = signedArea(loop);
  const sign = area > 0 ? 1 : -1;
  const nx = (-(b.y - a.y) / len) * sign;
  const ny = ((b.x - a.x) / len) * sign;
  const probeX = mx + nx * cellSize * 0.6;
  const probeY = my + ny * cellSize * 0.6;

  const gx = Math.min(cols - 1.001, Math.max(0, (probeX - minX) / cellSize));
  const gy = Math.min(rows - 1.001, Math.max(0, (probeY - minY) / cellSize));
  const ix = Math.floor(gx);
  const iy = Math.floor(gy);
  const fx = gx - ix;
  const fy = gy - iy;
  const v00 = grid[iy * cols + ix];
  const v10 = grid[iy * cols + ix + 1];
  const v01 = grid[(iy + 1) * cols + ix];
  const v11 = grid[(iy + 1) * cols + ix + 1];
  const val = (v00 * (1 - fx) + v10 * fx) * (1 - fy) + (v01 * (1 - fx) + v11 * fx) * fy;
  return val > level;
}

/** Ramer-Douglas-Peucker simplification for closed polygon loops. */
function simplifyClosedLoop(points: readonly ISigilPoint[], epsilon: number): ISigilPoint[] {
  if (points.length <= 4) return [...points];
  // Split at the two farthest points on the loop so RDP handles closed contours cleanly.
  let farIdx = 0;
  let farDistSq = -1;
  const p0 = points[0];
  for (let i = 1; i < points.length; i++) {
    const dx = points[i].x - p0.x;
    const dy = points[i].y - p0.y;
    const d2 = dx * dx + dy * dy;
    if (d2 > farDistSq) {
      farDistSq = d2;
      farIdx = i;
    }
  }
  const firstHalf = rdpOpen(points.slice(0, farIdx + 1), epsilon);
  const secondHalf = rdpOpen([...points.slice(farIdx), points[0]], epsilon);
  return [...firstHalf.slice(0, -1), ...secondHalf.slice(0, -1)];
}

function rdpOpen(pts: readonly ISigilPoint[], epsilon: number): ISigilPoint[] {
  if (pts.length <= 2) return [...pts];
  const start = pts[0];
  const end = pts[pts.length - 1];
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const len = Math.hypot(dx, dy);
  let maxDist = -1;
  let split = 0;
  for (let i = 1; i < pts.length - 1; i++) {
    const dist =
      len > SIGIL_NORMAL_EPSILON
        ? Math.abs(dy * pts[i].x - dx * pts[i].y + end.x * start.y - end.y * start.x) / len
        : Math.hypot(pts[i].x - start.x, pts[i].y - start.y);
    if (dist > maxDist) {
      maxDist = dist;
      split = i;
    }
  }
  if (maxDist > epsilon) {
    const left = rdpOpen(pts.slice(0, split + 1), epsilon);
    const right = rdpOpen(pts.slice(split), epsilon);
    return [...left.slice(0, -1), ...right];
  }
  return [start, end];
}

function fmt(value: number): string {
  return value.toFixed(SIGIL_PATH_DECIMALS);
}

/**
 * Converts a closed loop into a smooth SVG cubic Bezier path (`C` commands) while preserving sharp
 * needle tips and star valleys (`L` / corner tangents where the turning angle exceeds ~55 deg).
 */
function loopToCubicPath(rawLoop: readonly ISigilPoint[], cellSize: number): string {
  const simplified = simplifyClosedLoop(rawLoop, cellSize * SIGIL_SDF_SIMPLIFY_FACTOR);
  const n = simplified.length;
  if (n < 3) return '';

  // Identify sharp needle tips before smoothing so tips stay razor-sharp.
  const sharp = new Uint8Array(n);
  for (let i = 0; i < n; i++) {
    const prev = simplified[(i - 1 + n) % n];
    const curr = simplified[i];
    const next = simplified[(i + 1) % n];
    const ax = curr.x - prev.x;
    const ay = curr.y - prev.y;
    const bx = next.x - curr.x;
    const by = next.y - curr.y;
    const la = Math.hypot(ax, ay) || 1;
    const lb = Math.hypot(bx, by) || 1;
    if ((ax * bx + ay * by) / (la * lb) < SIGIL_SDF_SHARP_CORNER_COS) {
      sharp[i] = 1;
    }
  }

  // Light Laplacian smoothing on non-sharp vertices removes shallow-angle grid ripples.
  let pts = simplified.map((p) => ({ x: p.x, y: p.y }));
  for (let pass = 0; pass < SIGIL_SDF_SMOOTH_PASSES; pass++) {
    const nextPts = pts.map((p, i) => {
      if (sharp[i]) return p;
      const prev = pts[(i - 1 + n) % n];
      const next = pts[(i + 1) % n];
      return {
        x: p.x * 0.5 + (prev.x + next.x) * 0.25,
        y: p.y * 0.5 + (prev.y + next.y) * 0.25,
      };
    });
    pts = nextPts;
  }

  const tangents: ISigilPoint[] = new Array(n);

  for (let i = 0; i < n; i++) {
    if (sharp[i]) {
      tangents[i] = { x: 0, y: 0 };
      continue;
    }
    const prev = pts[(i - 1 + n) % n];
    const curr = pts[i];
    const next = pts[(i + 1) % n];
    const ax = curr.x - prev.x;
    const ay = curr.y - prev.y;
    const bx = next.x - curr.x;
    const by = next.y - curr.y;
    const la = Math.hypot(ax, ay) || 1;
    const lb = Math.hypot(bx, by) || 1;
    const tx = ax / la + bx / lb;
    const ty = ay / la + by / lb;
    const tl = Math.hypot(tx, ty) || 1;
    tangents[i] = { x: tx / tl, y: ty / tl };
  }

  let d = `M${fmt(pts[0].x)} ${fmt(pts[0].y)}`;
  for (let i = 0; i < n; i++) {
    const p0 = pts[i];
    const p1 = pts[(i + 1) % n];
    const nextIdx = (i + 1) % n;
    if (sharp[i] && sharp[nextIdx]) {
      d += `L${fmt(p1.x)} ${fmt(p1.y)}`;
      continue;
    }
    const segLen = Math.hypot(p1.x - p0.x, p1.y - p0.y);
    const handle = segLen * SIGIL_SDF_BEZIER_TENSION;
    const c1x = sharp[i] ? p0.x : p0.x + tangents[i].x * handle;
    const c1y = sharp[i] ? p0.y : p0.y + tangents[i].y * handle;
    const c2x = sharp[nextIdx] ? p1.x : p1.x - tangents[nextIdx].x * handle;
    const c2y = sharp[nextIdx] ? p1.y : p1.y - tangents[nextIdx].y * handle;
    d += `C${fmt(c1x)} ${fmt(c1y)} ${fmt(c2x)} ${fmt(c2y)} ${fmt(p1.x)} ${fmt(p1.y)}`;
  }
  return `${d}Z`;
}
