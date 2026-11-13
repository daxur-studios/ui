/**
 * Seeded Topological Venation Grammar for procedural cybersigillism.
 *
 * Instead of stamping isolated triangles onto a single line, this module composes connected
 * venation graphs using discrete topological motifs:
 * - Mass-conserving Y-bifurcations (Murray's-law width splitting)
 * - Anastomosis loops (split-and-rejoin filaments that carve negative-space teardrop pockets)
 * - Opposing calliper claws and C/S-whip terminations
 * - Crossed anchor clusters
 * - Clearance-checked recursive sub-branching so every seed remains balanced and legible
 */

import {
  cubicPoint,
  cubicTangent,
  normalizeSigilParams,
  SIGIL_CENTER,
  SIGIL_FULL_TURN,
  SIGIL_NORMAL_EPSILON,
  SIGIL_VIEW_HEIGHT,
  SIGIL_VIEW_WIDTH,
  type ISigilLabParams,
  type ISigilPoint,
  type ISigilSpine,
} from './sigil-math';
import { createSigilRng, harmonicPositions, type ISigilRng } from './sigil-rng';
import { SigilSdfField, type ISdfExtractedPaths } from './sigil-sdf';

/** Default SDF grid resolution for archetypes. */
export const GRAMMAR_CELL_SIZE = 1.5;

/** Minimum distance (in user units) a new branch tip must keep from existing vein centers. */
export const GRAMMAR_MIN_CLEARANCE = 14;

/** Smooth-min blend radius base in user units, scaled by `crescentDepth`. */
export const GRAMMAR_BLEND_BASE = 4;
/** Additional smooth-min blend radius at `crescentDepth = 1`. */
export const GRAMMAR_BLEND_GAIN = 11;

/** Medial ridge extraction depth as a fraction of nominal vein width. */
export const GRAMMAR_RIDGE_DEPTH_RATIO = 0.22;

/** Extended geometry result including medial ridge and negative-space pocket paths. */
export interface ISigilRichGeometry extends ISdfExtractedPaths {
  readonly width: number;
  readonly height: number;
  readonly seed: number;
}

/** Tracks sampled spine points so candidate branches avoid self-collision. */
export class ClearanceTracker {
  private readonly points: ISigilPoint[] = [];

  /** Registers points along a spline into the clearance field. */
  recordSpine(spine: ISigilSpine, samples = 8): void {
    for (let i = 0; i <= samples; i++) {
      this.points.push(cubicPoint(spine, i / samples));
    }
  }

  /** Registers a single anchor point. */
  recordPoint(pt: ISigilPoint): void {
    this.points.push(pt);
  }

  /** Returns true if `pt` is at least `minDist` away from all recorded points (excluding `ignoreNear`). */
  hasClearance(pt: ISigilPoint, minDist: number, ignoreNear?: ISigilPoint, ignoreRadius = 22): boolean {
    const minSq = minDist * minDist;
    const ignSq = ignoreRadius * ignoreRadius;
    for (const p of this.points) {
      if (ignoreNear) {
        const idx = p.x - ignoreNear.x;
        const idy = p.y - ignoreNear.y;
        if (idx * idx + idy * idy < ignSq) continue;
      }
      const dx = p.x - pt.x;
      const dy = p.y - pt.y;
      if (dx * dx + dy * dy < minSq) return false;
    }
    return true;
  }
}

/* ---------------------------------------------------------------------------------------------- */
/* Vector helpers                                                                                 */
/* ---------------------------------------------------------------------------------------------- */

function vecAdd(a: ISigilPoint, b: ISigilPoint): ISigilPoint {
  return { x: a.x + b.x, y: a.y + b.y };
}

function vecSub(a: ISigilPoint, b: ISigilPoint): ISigilPoint {
  return { x: a.x - b.x, y: a.y - b.y };
}

function vecScale(v: ISigilPoint, s: number): ISigilPoint {
  return { x: v.x * s, y: v.y * s };
}

function vecUnit(v: ISigilPoint): ISigilPoint {
  const len = Math.hypot(v.x, v.y);
  if (len < SIGIL_NORMAL_EPSILON) return { x: 1, y: 0 };
  return { x: v.x / len, y: v.y / len };
}

function vecPerp(v: ISigilPoint): ISigilPoint {
  return { x: -v.y, y: v.x };
}

function vecRotate(v: ISigilPoint, angle: number): ISigilPoint {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  return { x: v.x * c - v.y * s, y: v.x * s + v.y * c };
}

/** Standard liquid-metal width profile: swells at `swellT`, tapers smoothly to a needle tip. */
export function veinWidthProfile(
  t: number,
  rootWidth: number,
  tipWidth: number,
  swell: number,
  swellT = 0.35,
): number {
  const u = Math.min(1, Math.max(0, t));
  const taper = Math.pow(1 - u, 1.15);
  const base = tipWidth + (rootWidth - tipWidth) * taper;
  const z = (u - swellT) / 0.18;
  const bump = 1 + swell * 0.75 * Math.exp(-0.5 * z * z);
  return base * bump;
}

/** Double-tapered profile (needle/pinch at both ends, swollen mid-belly). */
export function doubleTaperWidthProfile(
  t: number,
  peakWidth: number,
  endWidth: number,
  swell: number,
): number {
  const u = Math.min(1, Math.max(0, t));
  const arch = Math.pow(Math.sin(Math.PI * u), 0.65);
  return endWidth + (peakWidth * (1 + swell * 0.5) - endWidth) * arch;
}

/** Computes blend radius `k` from `crescentDepth`. */
export function blendRadiusFromParams(params: ISigilLabParams): number {
  return GRAMMAR_BLEND_BASE + params.crescentDepth * GRAMMAR_BLEND_GAIN;
}

/* ---------------------------------------------------------------------------------------------- */
/* Topological Motifs                                                                             */
/* ---------------------------------------------------------------------------------------------- */

/**
 * Anastomosis pocket: splits an arching filament off `spine` at `t0` and rejoins at `t1`,
 * enclosing a clean negative-space teardrop/crescent window.
 */
export function growAnastomosisPocket(
  field: SigilSdfField,
  tracker: ClearanceTracker,
  spine: ISigilSpine,
  t0: number,
  t1: number,
  bowHeight: number,
  width: number,
  swell: number,
  blendK: number,
): void {
  const p0 = cubicPoint(spine, t0);
  const p3 = cubicPoint(spine, t1);
  const chord = vecSub(p3, p0);
  const chordLen = Math.hypot(chord.x, chord.y);
  if (chordLen < 12) return;
  const dir = vecUnit(chord);
  const normal = vecPerp(dir);

  const archSpine: ISigilSpine = {
    p0,
    p1: vecAdd(vecAdd(p0, vecScale(dir, chordLen * 0.28)), vecScale(normal, bowHeight)),
    p2: vecAdd(vecAdd(p0, vecScale(dir, chordLen * 0.72)), vecScale(normal, bowHeight * 0.85)),
    p3,
  };
  field.addSpline(
    archSpine,
    (t) => doubleTaperWidthProfile(t, width, width * 0.45, swell),
    blendK,
    18,
  );
  tracker.recordSpine(archSpine, 6);
}

/**
 * Opposing calliper claws: two crescent hooks curving toward each other to frame an open eye.
 */
export function growCalliperClaw(
  field: SigilSdfField,
  tracker: ClearanceTracker,
  origin: ISigilPoint,
  direction: ISigilPoint,
  reach: number,
  width: number,
  curvature: number,
  swell: number,
  blendK: number,
  sideSign: number,
): void {
  const dir = vecUnit(direction);
  const perp = vecPerp(dir);
  const spread = 0.55 + curvature * 0.35;

  for (const clawSign of [-1, 1]) {
    const outDir = vecRotate(dir, clawSign * spread * 0.65);
    const tip = vecAdd(
      origin,
      vecAdd(vecScale(outDir, reach * (clawSign === sideSign ? 1.0 : 0.82)), vecScale(perp, -clawSign * reach * 0.15)),
    );
    const ctrl1 = vecAdd(origin, vecScale(vecRotate(dir, clawSign * spread * 1.1), reach * 0.45));
    const ctrl2 = vecAdd(tip, vecScale(vecRotate(dir, -clawSign * 0.9), reach * 0.32));
    const spine: ISigilSpine = { p0: origin, p1: ctrl1, p2: ctrl2, p3: tip };
    field.addSpline(
      spine,
      (t) => veinWidthProfile(t, width, 0.8, swell, 0.25),
      blendK,
      16,
    );
    tracker.recordSpine(spine, 5);
  }
}

/**
 * Crossed anchor motif: a descending drop-vein crossed by a curved crescent cross-bar.
 */
export function growCrossedAnchor(
  field: SigilSdfField,
  tracker: ClearanceTracker,
  origin: ISigilPoint,
  direction: ISigilPoint,
  stemLen: number,
  crossSpan: number,
  width: number,
  swell: number,
  blendK: number,
): void {
  const dir = vecUnit(direction);
  const perp = vecPerp(dir);
  const tip = vecAdd(origin, vecScale(dir, stemLen));
  const stem: ISigilSpine = {
    p0: origin,
    p1: vecAdd(origin, vecScale(dir, stemLen * 0.35)),
    p2: vecAdd(origin, vecScale(dir, stemLen * 0.7)),
    p3: tip,
  };
  field.addSpline(stem, (t) => veinWidthProfile(t, width, 0.8, swell, 0.45), blendK, 14);
  tracker.recordSpine(stem, 4);

  const crossCenter = vecAdd(origin, vecScale(dir, stemLen * 0.45));
  const leftTip = vecAdd(vecAdd(crossCenter, vecScale(perp, -crossSpan)), vecScale(dir, stemLen * 0.15));
  const rightTip = vecAdd(vecAdd(crossCenter, vecScale(perp, crossSpan)), vecScale(dir, -stemLen * 0.1));
  const crossSpine: ISigilSpine = {
    p0: leftTip,
    p1: vecAdd(crossCenter, vecScale(perp, -crossSpan * 0.4)),
    p2: vecAdd(crossCenter, vecScale(perp, crossSpan * 0.4)),
    p3: rightTip,
  };
  field.addSpline(
    crossSpine,
    (t) => doubleTaperWidthProfile(t, width * 0.9, 0.8, swell),
    blendK,
    14,
  );
  tracker.recordSpine(crossSpine, 4);
}

/**
 * Mass-conserving Y-bifurcation branch with optional recursive sub-branching and clearance check.
 */
export function growBifurcatingBranch(
  field: SigilSdfField,
  tracker: ClearanceTracker,
  origin: ISigilPoint,
  parentTangent: ISigilPoint,
  angle: number,
  length: number,
  width: number,
  params: ISigilLabParams,
  blendK: number,
  depth: number,
  rng: ISigilRng,
): void {
  const dir = vecUnit(parentTangent);
  const branchDir = vecRotate(dir, angle);
  const curlAngle = (angle >= 0 ? 1 : -1) * (0.45 + params.curvature * 0.85);
  const tip = vecAdd(origin, vecScale(vecRotate(branchDir, curlAngle * 0.35), length));

  if (depth <= 0 && !tracker.hasClearance(tip, GRAMMAR_MIN_CLEARANCE, origin)) {
    return;
  }

  const ctrl1 = vecAdd(origin, vecScale(dir, length * 0.32));
  const ctrl2 = vecAdd(origin, vecScale(vecRotate(branchDir, -curlAngle * 0.2), length * 0.72));
  const spine: ISigilSpine = { p0: origin, p1: ctrl1, p2: ctrl2, p3: tip };

  field.addSpline(
    spine,
    (t) => veinWidthProfile(t, width, 0.75, params.swell, 0.3),
    blendK,
    16,
  );
  tracker.recordSpine(spine, 5);

  if (depth > 0 && length > 28) {
    const splitT = rng.range(0.38, 0.58);
    const splitPt = cubicPoint(spine, splitT);
    const splitTan = cubicTangent(spine, splitT);
    const childSign = angle >= 0 ? -1 : 1;
    const childAngle = childSign * rng.range(0.55, 0.95);
    const childLen = length * rng.range(0.48, 0.68);
    const childWidth = width * 0.68;
    growBifurcatingBranch(
      field,
      tracker,
      splitPt,
      splitTan,
      childAngle,
      childLen,
      childWidth,
      params,
      blendK,
      depth - 1,
      rng.fork('sub'),
    );
  }
}

/* ---------------------------------------------------------------------------------------------- */
/* Archetype 1: Topological Winged Star (Concept 6)                                               */
/* ---------------------------------------------------------------------------------------------- */

type StarCoreVariant = 'octa-crown' | 'octa-cross' | 'hexa-eye' | 'quad-lance';
type WingMotifVariant = 'soaring-loop' | 'double-pocket-braid' | 'scythe-cascade' | 'anchor-wing';

function buildStarPolygon(
  centre: ISigilPoint,
  radius: number,
  variant: StarCoreVariant,
): { points: ISigilPoint[]; lobes: number } {
  const points: ISigilPoint[] = [];
  if (variant === 'quad-lance') {
    const count = 4;
    const step = SIGIL_FULL_TURN / count;
    for (let i = 0; i < count; i++) {
      const a = i * step;
      const r = i === 3 ? radius * 1.45 : i === 1 ? radius * 1.2 : radius * 1.05;
      points.push({ x: centre.x + r * Math.cos(a), y: centre.y + r * Math.sin(a) });
      const va = a + step / 2;
      points.push({
        x: centre.x + radius * 0.24 * Math.cos(va),
        y: centre.y + radius * 0.24 * Math.sin(va),
      });
    }
    return { points, lobes: 4 };
  }

  const tipCount = variant === 'hexa-eye' ? 6 : 8;
  const step = SIGIL_FULL_TURN / tipCount;
  for (let i = 0; i < tipCount; i++) {
    const a = i * step;
    let r = radius * 0.48;
    if (tipCount === 6) {
      r = i % 2 === 0 ? radius * 1.05 : radius * 0.72;
    } else if (variant === 'octa-crown') {
      if (i === 6) r = radius * 1.55; // tall top needle
      else if (i === 2) r = radius * 1.22;
      else if (i === 0 || i === 4) r = radius * 1.15;
    } else {
      if (i % 2 === 0) r = radius * 1.32;
    }
    points.push({ x: centre.x + r * Math.cos(a), y: centre.y + r * Math.sin(a) });
    const va = a + step / 2;
    points.push({
      x: centre.x + radius * 0.27 * Math.cos(va),
      y: centre.y + radius * 0.27 * Math.sin(va),
    });
  }
  return { points, lobes: tipCount };
}

function growWingGraph(
  field: SigilSdfField,
  tracker: ClearanceTracker,
  centre: ISigilPoint,
  starRadius: number,
  side: -1 | 1,
  motif: WingMotifVariant,
  params: ISigilLabParams,
  blendK: number,
  rng: ISigilRng,
): void {
  const reach = (165 + params.spikeLength * 42) * (1 + (side === 1 ? params.asymmetry * 0.14 : 0));
  const lift = (48 + params.curvature * 42) * rng.range(0.88, 1.15);
  const rootWidth = 10 + params.swell * 5;

  const primarySpine: ISigilSpine = {
    p0: { x: centre.x + side * starRadius * 0.28, y: centre.y - 4 },
    p1: { x: centre.x + side * reach * 0.36, y: centre.y - lift * rng.range(0.85, 1.25) },
    p2: { x: centre.x + side * reach * 0.72, y: centre.y - lift * rng.range(0.45, 1.05) },
    p3: { x: centre.x + side * reach, y: centre.y - lift * rng.range(0.5, 1.15) },
  };
  field.addSpline(
    primarySpine,
    (t) => veinWidthProfile(t, rootWidth, 0.8, params.swell, 0.35),
    blendK,
    22,
  );
  tracker.recordSpine(primarySpine, 8);

  if (motif === 'soaring-loop' || motif === 'double-pocket-braid') {
    growAnastomosisPocket(
      field,
      tracker,
      primarySpine,
      0.16,
      0.58,
      side * (26 + params.curvature * 18),
      rootWidth * 0.62,
      params.swell,
      blendK,
    );
  }
  if (motif === 'double-pocket-braid') {
    growAnastomosisPocket(
      field,
      tracker,
      primarySpine,
      0.46,
      0.86,
      -side * (20 + params.curvature * 14),
      rootWidth * 0.52,
      params.swell,
      blendK,
    );
  }

  // Lower sweeping scythe wing
  const lowerSpine: ISigilSpine = {
    p0: { x: centre.x + side * starRadius * 0.26, y: centre.y + 8 },
    p1: { x: centre.x + side * reach * 0.34, y: centre.y + lift * rng.range(0.65, 1.05) },
    p2: { x: centre.x + side * reach * 0.68, y: centre.y + lift * rng.range(0.55, 0.95) },
    p3: { x: centre.x + side * reach * rng.range(0.82, 0.96), y: centre.y + lift * rng.range(0.25, 0.65) },
  };
  field.addSpline(
    lowerSpine,
    (t) => veinWidthProfile(t, rootWidth * 0.88, 0.75, params.swell, 0.4),
    blendK,
    20,
  );
  tracker.recordSpine(lowerSpine, 7);

  if (motif === 'anchor-wing') {
    const anchorOrigin = cubicPoint(lowerSpine, 0.55);
    growCrossedAnchor(
      field,
      tracker,
      anchorOrigin,
      { x: side * 0.25, y: 1 },
      38 + params.spikeLength * 18,
      22 + params.spikeLength * 10,
      rootWidth * 0.68,
      params.swell,
      blendK,
    );
  } else if (motif === 'scythe-cascade') {
    growCalliperClaw(
      field,
      tracker,
      cubicPoint(primarySpine, 0.66),
      cubicTangent(primarySpine, 0.66),
      34 + params.spikeLength * 16,
      rootWidth * 0.62,
      params.curvature,
      params.swell,
      blendK,
      side,
    );
  }

  // Harmonic bifurcating thorns along primary & lower wings
  const branchTs = harmonicPositions(
    Math.max(1, Math.round(params.thornCount * 0.75)),
    0.26,
    0.78,
    rng.fork('ts'),
  );
  branchTs.forEach((t, idx) => {
    const host = idx % 2 === 0 ? primarySpine : lowerSpine;
    const origin = cubicPoint(host, t);
    const tangent = cubicTangent(host, t);
    const branchSide = idx % 2 === 0 ? -side : side;
    const len = (36 + params.spikeLength * 32) * (1 - t * 0.35);
    growBifurcatingBranch(
      field,
      tracker,
      origin,
      tangent,
      branchSide * rng.range(0.55, 0.92),
      len,
      rootWidth * 0.68,
      params,
      blendK,
      idx === 0 ? 1 : 0,
      rng.fork(`b${idx}`),
    );
  });
}

/** Composes Archetype 1 (Winged Star) with seeded topological variation. */
export function composeTopologicalWingedStar(
  raw: ISigilLabParams,
  seed = 1,
): ISigilRichGeometry {
  const params = normalizeSigilParams(raw);
  const rng = createSigilRng(seed);
  const field = new SigilSdfField(SIGIL_VIEW_WIDTH, SIGIL_VIEW_HEIGHT, GRAMMAR_CELL_SIZE);
  const tracker = new ClearanceTracker();
  const centre = SIGIL_CENTER;
  const blendK = blendRadiusFromParams(params);

  const starRadius = 46 + params.spikeLength * 18;
  const coreVariant = rng.pick<StarCoreVariant>([
    'octa-crown',
    'octa-cross',
    'hexa-eye',
    'quad-lance',
  ]);
  const starPoly = buildStarPolygon(centre, starRadius, coreVariant);
  field.addPolygon(starPoly.points, blendK * 0.75, false);
  field.subtractScallopedEye(centre.x, centre.y, starRadius * 0.23, 0.14, starPoly.lobes, 1.5);
  tracker.recordPoint(centre);

  const motifs: readonly WingMotifVariant[] = [
    'soaring-loop',
    'double-pocket-braid',
    'scythe-cascade',
    'anchor-wing',
  ];
  const leftMotif = rng.fork('left').pick(motifs);
  const rightMotif =
    params.asymmetry > 0.15 ? rng.fork('right').pick(motifs) : leftMotif;

  growWingGraph(
    field,
    tracker,
    centre,
    starRadius,
    -1,
    leftMotif,
    params,
    blendK,
    rng.fork('wingL'),
  );
  growWingGraph(
    field,
    tracker,
    centre,
    starRadius,
    1,
    rightMotif,
    params,
    blendK,
    params.asymmetry > 0.1 ? rng.fork('wingR') : rng.fork('wingL'),
  );

  const extracted = field.extract(1.8 + params.swell * 0.8);
  return { ...extracted, width: SIGIL_VIEW_WIDTH, height: SIGIL_VIEW_HEIGHT, seed };
}

/* ---------------------------------------------------------------------------------------------- */
/* Archetype 2: Topological Filigree Crest (Concept 7)                                            */
/* ---------------------------------------------------------------------------------------------- */

type CrestAxisVariant = 'concave-spear' | 'trident-lance' | 'hollow-spindle' | 'double-diamond';

function addMirroredSpline(
  field: SigilSdfField,
  tracker: ClearanceTracker,
  spine: ISigilSpine,
  widthAt: (t: number) => number,
  blendK: number,
  axisX: number,
): void {
  field.addSpline(spine, widthAt, blendK, 20);
  tracker.recordSpine(spine, 6);
  const mirrored: ISigilSpine = {
    p0: { x: 2 * axisX - spine.p0.x, y: spine.p0.y },
    p1: { x: 2 * axisX - spine.p1.x, y: spine.p1.y },
    p2: { x: 2 * axisX - spine.p2.x, y: spine.p2.y },
    p3: { x: 2 * axisX - spine.p3.x, y: spine.p3.y },
  };
  field.addSpline(mirrored, widthAt, blendK, 20);
  tracker.recordSpine(mirrored, 6);
}

/** Composes Archetype 2 (Bilateral Filigree Crest) with seeded gothic ribcage topologies. */
export function composeTopologicalFiligreeCrest(
  raw: ISigilLabParams,
  seed = 1,
): ISigilRichGeometry {
  const params = normalizeSigilParams(raw);
  const rng = createSigilRng(seed);
  const field = new SigilSdfField(SIGIL_VIEW_WIDTH, SIGIL_VIEW_HEIGHT, GRAMMAR_CELL_SIZE);
  const tracker = new ClearanceTracker();
  const centre = SIGIL_CENTER;
  const blendK = blendRadiusFromParams(params);

  const spearHeight = 195 + params.spikeLength * 42;
  const spearWidth = 34 + params.swell * 14;
  const axisVariant = rng.pick<CrestAxisVariant>([
    'concave-spear',
    'trident-lance',
    'hollow-spindle',
    'double-diamond',
  ]);

  // Central axis diamond spear
  const spearPts: ISigilPoint[] = [
    { x: centre.x, y: centre.y - spearHeight * 0.5 },
    { x: centre.x + spearWidth * 0.35, y: centre.y - spearHeight * 0.14 },
    { x: centre.x + spearWidth * 0.5, y: centre.y },
    { x: centre.x + spearWidth * 0.32, y: centre.y + spearHeight * 0.16 },
    { x: centre.x, y: centre.y + spearHeight * 0.5 },
    { x: centre.x - spearWidth * 0.32, y: centre.y + spearHeight * 0.16 },
    { x: centre.x - spearWidth * 0.5, y: centre.y },
    { x: centre.x - spearWidth * 0.35, y: centre.y - spearHeight * 0.14 },
  ];
  field.addPolygon(spearPts, blendK * 0.6, false);
  if (axisVariant === 'hollow-spindle') {
    field.subtractScallopedEye(centre.x, centre.y, spearWidth * 0.24, 0.12, 4, 1.2);
  }
  if (axisVariant === 'double-diamond') {
    const crownDiamond: ISigilPoint[] = [
      { x: centre.x, y: centre.y - spearHeight * 0.56 },
      { x: centre.x + 12, y: centre.y - spearHeight * 0.42 },
      { x: centre.x, y: centre.y - spearHeight * 0.28 },
      { x: centre.x - 12, y: centre.y - spearHeight * 0.42 },
    ];
    field.addPolygon(crownDiamond, blendK * 0.5, false);
  }

  // Bilateral ribcage wings (bridged to create negative-space filigree windows)
  const ribWidth = 8.5 + params.swell * 3.5;
  const reach = 175 + params.spikeLength * 35;
  const lift = 65 + params.curvature * 35;

  const upperRib: ISigilSpine = {
    p0: { x: centre.x - spearWidth * 0.22, y: centre.y - 22 },
    p1: { x: centre.x - reach * 0.38, y: centre.y - lift * rng.range(0.85, 1.2) },
    p2: { x: centre.x - reach * 0.74, y: centre.y - lift * rng.range(0.35, 0.75) },
    p3: { x: centre.x - reach, y: centre.y - lift * rng.range(0.85, 1.18) },
  };
  addMirroredSpline(
    field,
    tracker,
    upperRib,
    (t) => veinWidthProfile(t, ribWidth, 0.8, params.swell, 0.32),
    blendK,
    centre.x,
  );

  const lowerRib: ISigilSpine = {
    p0: { x: centre.x - spearWidth * 0.22, y: centre.y + 20 },
    p1: { x: centre.x - reach * 0.35, y: centre.y + lift * rng.range(0.65, 1.05) },
    p2: { x: centre.x - reach * 0.72, y: centre.y + lift * rng.range(0.75, 1.15) },
    p3: { x: centre.x - reach * 0.94, y: centre.y + lift * rng.range(0.35, 0.68) },
  };
  addMirroredSpline(
    field,
    tracker,
    lowerRib,
    (t) => veinWidthProfile(t, ribWidth * 0.95, 0.8, params.swell, 0.35),
    blendK,
    centre.x,
  );

  // Bridging filigree strut connecting upper & lower ribs to enclose an open gothic window
  const bridgeT1 = rng.range(0.36, 0.52);
  const bridgeT2 = rng.range(0.42, 0.58);
  const bStart = cubicPoint(upperRib, bridgeT1);
  const bEnd = cubicPoint(lowerRib, bridgeT2);
  const bridgeSpine: ISigilSpine = {
    p0: bStart,
    p1: { x: bStart.x - 18 - params.curvature * 14, y: (bStart.y + bEnd.y) * 0.5 - 12 },
    p2: { x: bEnd.x - 18 - params.curvature * 14, y: (bStart.y + bEnd.y) * 0.5 + 12 },
    p3: bEnd,
  };
  addMirroredSpline(
    field,
    tracker,
    bridgeSpine,
    (t) => doubleTaperWidthProfile(t, ribWidth * 0.85, ribWidth * 0.45, params.swell),
    blendK,
    centre.x,
  );

  // Crown antler or trident horns near the top of the spear
  if (axisVariant === 'trident-lance' || rng.chance(0.5)) {
    const antlerSpine: ISigilSpine = {
      p0: { x: centre.x - spearWidth * 0.18, y: centre.y - spearHeight * 0.22 },
      p1: { x: centre.x - 36, y: centre.y - spearHeight * 0.38 },
      p2: { x: centre.x - 44, y: centre.y - spearHeight * 0.48 },
      p3: { x: centre.x - 66 - params.spikeLength * 18, y: centre.y - spearHeight * 0.44 },
    };
    addMirroredSpline(
      field,
      tracker,
      antlerSpine,
      (t) => veinWidthProfile(t, ribWidth * 0.78, 0.75, params.swell, 0.3),
      blendK,
      centre.x,
    );
  }

  // Mirrored harmonic thorns along the ribs
  const thornTs = harmonicPositions(
    Math.max(1, Math.round(params.thornCount * 0.7)),
    0.25,
    0.82,
    rng.fork('crestTs'),
  );
  thornTs.forEach((t, idx) => {
    const host = idx % 2 === 0 ? upperRib : lowerRib;
    const origin = cubicPoint(host, t);
    const tangent = cubicTangent(host, t);
    const sign = idx % 2 === 0 ? -1 : 1;
    const len = (32 + params.spikeLength * 26) * (1 - t * 0.35);
    const angle = sign * rng.range(0.55, 0.92);
    const dir = vecUnit(tangent);
    const branchDir = vecRotate(dir, angle);
    const tip = vecAdd(origin, vecScale(branchDir, len));
    const thornSpine: ISigilSpine = {
      p0: origin,
      p1: vecAdd(origin, vecScale(dir, len * 0.35)),
      p2: vecAdd(origin, vecScale(branchDir, len * 0.72)),
      p3: tip,
    };
    addMirroredSpline(
      field,
      tracker,
      thornSpine,
      (u) => veinWidthProfile(u, ribWidth * 0.75, 0.7, params.swell, 0.25),
      blendK,
      centre.x,
    );
  });

  const extracted = field.extract(1.6 + params.swell * 0.7);
  return { ...extracted, width: SIGIL_VIEW_WIDTH, height: SIGIL_VIEW_HEIGHT, seed };
}

/* ---------------------------------------------------------------------------------------------- */
/* Archetype 3: Topological S-Curve Tendril (Concept 1)                                           */
/* ---------------------------------------------------------------------------------------------- */

type TendrilMotif = 'anastomosis-eye' | 'calliper-claw' | 'crossed-anchor' | 'belly-scythe';

/** Composes Archetype 3 (Flowing S-Curve Tendril) with genuinely distinct per-seed motif decks. */
export function composeTopologicalTendril(
  raw: ISigilLabParams,
  seed = 1,
): ISigilRichGeometry {
  const params = normalizeSigilParams(raw);
  const rng = createSigilRng(seed);
  const field = new SigilSdfField(SIGIL_VIEW_WIDTH, SIGIL_VIEW_HEIGHT, GRAMMAR_CELL_SIZE);
  const tracker = new ClearanceTracker();
  const blendK = blendRadiusFromParams(params);

  const polarity = rng.chance(0.5) ? 1 : -1;
  const bend = (38 + params.curvature * 48) * polarity;
  const mainWidth = 11 + params.swell * 6;

  const spine: ISigilSpine = {
    p0: { x: 26, y: SIGIL_CENTER.y + 38 * polarity + rng.range(-12, 12) },
    p1: { x: 155, y: SIGIL_CENTER.y - bend * rng.range(0.85, 1.25) },
    p2: { x: 315, y: SIGIL_CENTER.y + bend * rng.range(0.75, 1.2) },
    p3: { x: 454, y: SIGIL_CENTER.y - 42 * polarity + rng.range(-16, 16) },
  };
  field.addSpline(
    spine,
    (t) => doubleTaperWidthProfile(t, mainWidth, 0.85, params.swell),
    blendK,
    26,
  );
  tracker.recordSpine(spine, 10);

  // Pick a non-trivial motif sequence from the deck so seeds vary topologically
  const deck: readonly TendrilMotif[] = [
    'anastomosis-eye',
    'belly-scythe',
    'calliper-claw',
    'crossed-anchor',
  ];
  const slotCount = Math.min(4, Math.max(2, Math.round(params.thornCount * 0.75) + 1));
  const slotTs = harmonicPositions(slotCount, 0.18, 0.76, rng.fork('slots'), 0.15);

  slotTs.forEach((t, idx) => {
    const motif = deck[(idx + rng.int(0, deck.length - 1)) % deck.length];
    const pt = cubicPoint(spine, t);
    const tan = cubicTangent(spine, t);
    const side = idx % 2 === 0 ? -polarity : polarity;

    switch (motif) {
      case 'anastomosis-eye': {
        const endT = Math.min(0.88, t + rng.range(0.18, 0.28));
        growAnastomosisPocket(
          field,
          tracker,
          spine,
          t,
          endT,
          side * (34 + params.curvature * 24),
          mainWidth * 0.58,
          params.swell,
          blendK,
        );
        break;
      }
      case 'belly-scythe': {
        growBifurcatingBranch(
          field,
          tracker,
          pt,
          tan,
          side * rng.range(0.65, 1.05),
          52 + params.spikeLength * 36,
          mainWidth * 0.72,
          params,
          blendK,
          1,
          rng.fork(`scythe${idx}`),
        );
        break;
      }
      case 'calliper-claw': {
        growCalliperClaw(
          field,
          tracker,
          pt,
          tan,
          36 + params.spikeLength * 20,
          mainWidth * 0.62,
          params.curvature,
          params.swell,
          blendK,
          side,
        );
        break;
      }
      case 'crossed-anchor': {
        growCrossedAnchor(
          field,
          tracker,
          pt,
          { x: 0.15, y: side },
          44 + params.spikeLength * 22,
          24 + params.spikeLength * 12,
          mainWidth * 0.65,
          params.swell,
          blendK,
        );
        break;
      }
    }
  });

  // Forked tail / terminal prong
  const tailT = 0.78;
  const tailOrigin = cubicPoint(spine, tailT);
  const tailTan = cubicTangent(spine, tailT);
  growBifurcatingBranch(
    field,
    tracker,
    tailOrigin,
    tailTan,
    -polarity * rng.range(0.45, 0.78),
    64 + params.spikeLength * 28,
    mainWidth * 0.7,
    params,
    blendK,
    0,
    rng.fork('tail'),
  );

  const extracted = field.extract(1.8 + params.swell * 0.8);
  return { ...extracted, width: SIGIL_VIEW_WIDTH, height: SIGIL_VIEW_HEIGHT, seed };
}
