/**
 * Procedural Architectural UI Chrome generators for cybersigillistic interfaces.
 *
 * Covers the structural UI vocabulary observed in `cyber (1).jpg`, `cyber (2).jpg`, `cyber (3).jpg`,
 * `cyber (1).png`, and `cyber (2).png`:
 * - Top Toolbars / Header Crowns with central medallion cradles & flanking rib pockets
 * - 4-Quadrant Corner Spandrels (`tl`, `tr`, `bl`, `br`)
 * - Section Waist Dividers with central diamond/star nodes & 4 concave spandrel pockets
 * - Dendritic `1 -> N` Rail-to-Card Branching Connectors
 * - Calyx Pill / Search / Button Frames
 */

import {
  GRAMMAR_RIDGE_DEPTH_RATIO,
  blendRadiusFromParams,
  doubleTaperWidthProfile,
  veinWidthProfile,
  type ISigilRichGeometry,
} from './sigil-grammar';
import {
  normalizeSigilParams,
  SIGIL_FULL_TURN,
  type ISigilLabParams,
  type ISigilPoint,
  type ISigilSpine,
} from './sigil-math';
import { createSigilRng, type ISigilRng } from './sigil-rng';
import { SigilSdfField } from './sigil-sdf';

/** Quadrant identifier for corner spandrel brackets. */
export type SigilCornerQuadrant = 'tl' | 'tr' | 'bl' | 'br';

/** Default width of the toolbar crown canvas in user units. */
export const UI_TOOLBAR_WIDTH = 640;
/** Default height of the toolbar crown canvas in user units. */
export const UI_TOOLBAR_HEIGHT = 120;
/** Default square size of a corner spandrel bracket in user units. */
export const UI_CORNER_SIZE = 120;
/** Default width of the waist divider canvas in user units. */
export const UI_DIVIDER_WIDTH = 520;
/** Default height of the waist divider canvas in user units. */
export const UI_DIVIDER_HEIGHT = 96;
/** Default width of a branching rail-to-card connector in user units. */
export const UI_CONNECTOR_WIDTH = 140;
/** Default height of a branching rail-to-card connector in user units. */
export const UI_CONNECTOR_HEIGHT = 240;
/** Default width of a calyx pill frame in user units. */
export const UI_CALYX_WIDTH = 420;
/** Default height of a calyx pill frame in user units. */
export const UI_CALYX_HEIGHT = 64;

/** Overhang past `0` and `width`/`height` so SVG viewBox slices rails cleanly while staying inside grid padding. */
const RAIL_OVERSHOOT = 3;

/** Adds a horizontally mirrored pair of splines across `axisX`. */
function addSymSpline(
  field: SigilSdfField,
  spine: ISigilSpine,
  widthAt: (t: number) => number,
  blendK: number,
  axisX: number,
  samples = 20,
): void {
  field.addSpline(spine, widthAt, blendK, samples);
  field.addSpline(
    {
      p0: { x: 2 * axisX - spine.p0.x, y: spine.p0.y },
      p1: { x: 2 * axisX - spine.p1.x, y: spine.p1.y },
      p2: { x: 2 * axisX - spine.p2.x, y: spine.p2.y },
      p3: { x: 2 * axisX - spine.p3.x, y: spine.p3.y },
    },
    widthAt,
    blendK,
    samples,
  );
}

/* ---------------------------------------------------------------------------------------------- */
/* 1. Top Toolbar / Header Crown                                                                  */
/* ---------------------------------------------------------------------------------------------- */

type ToolbarCrownStyle = 'medallion-cradle' | 'star-crown' | 'gothic-calyx' | 'braided-arch';

/**
 * Generates a procedural Top Toolbar / Header Crown (`cyber (1).jpg`, `cyber (2).jpg`, `cyber (3).jpg`).
 * Features a central emblem cradle flanked by bifurcating liquid-metal rib arches and negative-space
 * teardrop pockets that transition into left/right vertical frame rails.
 */
export function composeToolbarCrown(
  raw: ISigilLabParams,
  seed = 1,
  width = UI_TOOLBAR_WIDTH,
  height = UI_TOOLBAR_HEIGHT,
): ISigilRichGeometry {
  const params = normalizeSigilParams(raw);
  const rng = createSigilRng(seed);
  const field = new SigilSdfField(width, height, 1.5);
  const blendK = blendRadiusFromParams(params) * 0.75;

  const cx = width * 0.5;
  const railW = 4.2 + params.swell * 2.2;
  const topY = 22;
  const cradleRadius = Math.min(height * 0.34, 34 + params.spikeLength * 8);
  const cradleCy = topY + cradleRadius * 0.72;
  const style = rng.pick<ToolbarCrownStyle>([
    'medallion-cradle',
    'star-crown',
    'gothic-calyx',
    'braided-arch',
  ]);
  const ribReach = rng.range(0.24, 0.34);

  // 1. Central cradle motif
  if (style === 'star-crown') {
    const starPts: ISigilPoint[] = [];
    const tips = 8;
    const step = SIGIL_FULL_TURN / tips;
    for (let i = 0; i < tips; i++) {
      const a = i * step;
      const r = i % 2 === 0 ? cradleRadius * 1.18 : cradleRadius * 0.62;
      starPts.push({ x: cx + r * Math.cos(a), y: cradleCy + r * Math.sin(a) });
      starPts.push({
        x: cx + cradleRadius * 0.36 * Math.cos(a + step / 2),
        y: cradleCy + cradleRadius * 0.36 * Math.sin(a + step / 2),
      });
    }
    field.addPolygon(starPts, blendK * 0.6, false);
    field.subtractScallopedEye(cx, cradleCy, cradleRadius * 0.48, 0.08, 8, 1.0);
  } else {
    // Circular/oval medallion ring cradling the Æ emblem
    const ringPts: ISigilPoint[] = [];
    const segs = 36;
    const outerR = cradleRadius + railW * 0.85;
    for (let i = 0; i < segs; i++) {
      const a = (i * SIGIL_FULL_TURN) / segs;
      ringPts.push({ x: cx + outerR * Math.cos(a), y: cradleCy + outerR * Math.sin(a) });
    }
    field.addPolygon(ringPts, blendK * 0.5, false);
    field.subtractScallopedEye(cx, cradleCy, cradleRadius - railW * 0.35, 0.0, 4, 0.8);
  }

  // 2. Sweeping primary arch from cradle side out to the corner spandrel & down the vertical rail
  const cornerX = 14;
  const archDip = 10 + params.curvature * 14;
  const outerSpine: ISigilSpine = {
    p0: { x: cx - cradleRadius * 0.9, y: cradleCy + cradleRadius * 0.52 },
    p1: { x: cx - width * 0.16, y: topY - 4 },
    p2: { x: cornerX + 42, y: topY },
    p3: { x: cornerX, y: height + RAIL_OVERSHOOT },
  };
  addSymSpline(field, outerSpine, () => railW, blendK, cx, 24);

  // 3. Upper horizon frame rail tying across topY from corner to corner
  const horizonSpine: ISigilSpine = {
    p0: { x: cx - cradleRadius * 1.08, y: topY + 4 },
    p1: { x: cx - width * 0.22, y: topY - archDip * 0.45 },
    p2: { x: cornerX + 26, y: topY + 2 },
    p3: { x: -RAIL_OVERSHOOT, y: topY + 18 },
  };
  addSymSpline(field, horizonSpine, () => railW * 0.92, blendK, cx, 22);

  // 4. Inner rib pocket filament (enclosing teardrop pockets beside the medallion)
  const ribSpread = rng.range(16, 30) + params.curvature * 12;
  const ribSpine: ISigilSpine = {
    p0: { x: cx - cradleRadius * 1.05, y: cradleCy + 6 },
    p1: { x: cx - cradleRadius - 36, y: topY + ribSpread },
    p2: { x: cx - cradleRadius - 76, y: topY + ribSpread * 0.4 },
    p3: { x: cx - width * ribReach, y: topY + 2 },
  };
  addSymSpline(
    field,
    ribSpine,
    (t) => doubleTaperWidthProfile(t, railW * 0.85, railW * 0.45, params.swell),
    blendK,
    cx,
    18,
  );

  // 5. Seeded secondary flourish or gothic calyx accent
  if (style === 'gothic-calyx' || style === 'braided-arch') {
    const flareSpine: ISigilSpine = {
      p0: { x: cx - cradleRadius * 1.15, y: cradleCy - 8 },
      p1: { x: cx - cradleRadius - 24, y: cradleCy + 26 },
      p2: { x: cx - cradleRadius - 56, y: cradleCy + 18 },
      p3: { x: cx - cradleRadius - 88 - params.spikeLength * 24, y: cradleCy + 4 },
    };
    addSymSpline(
      field,
      flareSpine,
      (t) => veinWidthProfile(t, railW * 0.85, 0.7, params.swell, 0.3),
      blendK,
      cx,
      16,
    );
  }

  if (style === 'braided-arch') {
    const secondPocket: ISigilSpine = {
      p0: { x: cx - width * ribReach + 12, y: topY + 2 },
      p1: { x: cx - width * (ribReach + 0.08), y: topY + 22 },
      p2: { x: cornerX + 64, y: topY + 18 },
      p3: { x: cornerX + 38, y: topY + 2 },
    };
    addSymSpline(
      field,
      secondPocket,
      (t) => doubleTaperWidthProfile(t, railW * 0.78, railW * 0.4, params.swell),
      blendK,
      cx,
      16,
    );
  }

  // 6. Corner spandrel web at left & right edges
  const cornerSpandrel: ISigilSpine = {
    p0: { x: cornerX + 38, y: topY + 2 },
    p1: { x: cornerX + 12, y: topY + 12 },
    p2: { x: cornerX + 4, y: topY + 34 },
    p3: { x: cornerX, y: topY + 62 },
  };
  addSymSpline(
    field,
    cornerSpandrel,
    (t) => doubleTaperWidthProfile(t, railW * 0.78, railW * 0.45, params.swell),
    blendK,
    cx,
    16,
  );

  const extracted = field.extract(1.3 + params.swell * 0.4);
  return { ...extracted, width, height, seed };
}

/* ---------------------------------------------------------------------------------------------- */
/* 2. 4-Quadrant Corner Spandrels                                                                 */
/* ---------------------------------------------------------------------------------------------- */

/**
 * Generates an L-corner spandrel bracket (`cyber (1).jpg`, `cyber (3).jpg`, `cyber (1).png`).
 * Always enters cleanly along the horizontal and vertical frame rails and splits into a concave
 * inner fillet arch + seeded spandrel web pockets.
 */
export function composeCornerSpandrel(
  raw: ISigilLabParams,
  seed = 1,
  size = UI_CORNER_SIZE,
  quadrant: SigilCornerQuadrant = 'tl',
): ISigilRichGeometry {
  const params = normalizeSigilParams(raw);
  const rng = createSigilRng(seed);
  const field = new SigilSdfField(size, size, 1.5);
  const blendK = blendRadiusFromParams(params) * 0.7;

  const railW = 4.2 + params.swell * 2.0;
  const pad = 16;

  // Map canonical TL coordinates into the requested quadrant
  const mapPt = (x: number, y: number): ISigilPoint => {
    const mx = quadrant === 'tr' || quadrant === 'br' ? size - x : x;
    const my = quadrant === 'bl' || quadrant === 'br' ? size - y : y;
    return { x: mx, y: my };
  };
  const mapSpine = (s: ISigilSpine): ISigilSpine => ({
    p0: mapPt(s.p0.x, s.p0.y),
    p1: mapPt(s.p1.x, s.p1.y),
    p2: mapPt(s.p2.x, s.p2.y),
    p3: mapPt(s.p3.x, s.p3.y),
  });

  // Outer sweeping L-rail
  const outerCorner: ISigilSpine = mapSpine({
    p0: { x: size + RAIL_OVERSHOOT, y: pad },
    p1: { x: pad + 18, y: pad },
    p2: { x: pad, y: pad + 18 },
    p3: { x: pad, y: size + RAIL_OVERSHOOT },
  });
  field.addSpline(outerCorner, () => railW, blendK, 22);

  // Inner concave fillet arch enclosing the primary spandrel pocket
  const archReach = size * rng.range(0.58, 0.78);
  const archPull = rng.range(0.22, 0.36) + params.curvature * 0.14;
  const innerArch: ISigilSpine = mapSpine({
    p0: { x: archReach, y: pad },
    p1: { x: pad + archReach * archPull, y: pad + archReach * 0.14 },
    p2: { x: pad + archReach * 0.14, y: pad + archReach * archPull },
    p3: { x: pad, y: archReach },
  });
  field.addSpline(
    innerArch,
    (t) => doubleTaperWidthProfile(t, railW * 0.9, railW * 0.5, params.swell),
    blendK,
    18,
  );

  // Seeded secondary web strut or outer corner thorn
  if (rng.chance(0.65)) {
    const strutSpine = mapSpine({
      p0: { x: pad + archReach * 0.52, y: pad + archReach * 0.18 },
      p1: { x: pad + 26, y: pad + 26 },
      p2: { x: pad + 18, y: pad + 18 },
      p3: { x: pad + 4, y: pad + 4 },
    });
    field.addSpline(
      strutSpine,
      (t) => veinWidthProfile(t, railW * 0.78, 0.7, params.swell, 0.3),
      blendK,
      14,
    );
  }

  if (rng.chance(0.55) || params.spikeLength > 0.6) {
    const spurLen = 22 + params.spikeLength * 18;
    const spurSpine = mapSpine({
      p0: { x: pad + 8, y: pad + 8 },
      p1: { x: pad + 18, y: pad + 14 },
      p2: { x: pad + 24 + spurLen * 0.4, y: pad + 24 + spurLen * 0.3 },
      p3: { x: pad + 18 + spurLen, y: pad + 18 + spurLen * 0.85 },
    });
    field.addSpline(
      spurSpine,
      (t) => veinWidthProfile(t, railW * 0.75, 0.7, params.swell, 0.25),
      blendK,
      14,
    );
  }

  const extracted = field.extract(1.3 + params.swell * 0.4);
  return { ...extracted, width: size, height: size, seed };
}

/* ---------------------------------------------------------------------------------------------- */
/* 3. Section Waist Divider                                                                       */
/* ---------------------------------------------------------------------------------------------- */

type DividerNodeStyle = 'diamond-eye' | 'star-reticle' | 'double-calyx' | 'split-crescent';

/**
 * Generates a horizontal Section Waist Divider (`cyber (3).jpg`, `cyber (1).png`).
 * Left and right vertical rails sweep inward to meet a central sigil node, carving 4 concave
 * spandrel corner pockets.
 */
export function composeWaistDivider(
  raw: ISigilLabParams,
  seed = 1,
  width = UI_DIVIDER_WIDTH,
  height = UI_DIVIDER_HEIGHT,
): ISigilRichGeometry {
  const params = normalizeSigilParams(raw);
  const rng = createSigilRng(seed);
  const field = new SigilSdfField(width, height, 1.5);
  const blendK = blendRadiusFromParams(params) * 0.7;

  const cx = width * 0.5;
  const cy = height * 0.5;
  const railW = 4.0 + params.swell * 2.0;
  const railX = 14;
  const style = rng.pick<DividerNodeStyle>([
    'diamond-eye',
    'star-reticle',
    'double-calyx',
    'split-crescent',
  ]);

  // Central tension bridge
  const bridgeSpine: ISigilSpine = {
    p0: { x: railX, y: cy },
    p1: { x: cx * 0.45, y: cy },
    p2: { x: width - cx * 0.45, y: cy },
    p3: { x: width - railX, y: cy },
  };
  field.addSpline(bridgeSpine, () => railW * 0.88, blendK, 22);

  // Sweeping upper & lower waist arches on both sides
  for (const vy of [-1, 1]) {
    const waistSpine: ISigilSpine = {
      p0: { x: railX, y: cy + vy * (height * 0.5 + RAIL_OVERSHOOT) },
      p1: { x: railX + 4, y: cy + vy * 14 },
      p2: { x: railX + 38, y: cy + vy * 4 },
      p3: { x: cx - 36, y: cy },
    };
    addSymSpline(field, waistSpine, () => railW, blendK, cx, 20);
  }

  // Central sigil node
  const nodeW = 28 + params.spikeLength * 14;
  const nodeH = 14 + params.swell * 6;
  if (style === 'star-reticle') {
    const pts: ISigilPoint[] = [];
    for (let i = 0; i < 8; i++) {
      const a = (i * SIGIL_FULL_TURN) / 8;
      const rx = i % 2 === 0 ? nodeW : nodeW * 0.42;
      const ry = i % 2 === 0 ? nodeH * 1.4 : nodeH * 0.6;
      pts.push({ x: cx + rx * Math.cos(a), y: cy + ry * Math.sin(a) });
      const va = a + Math.PI / 8;
      pts.push({ x: cx + nodeW * 0.25 * Math.cos(va), y: cy + nodeH * 0.35 * Math.sin(va) });
    }
    field.addPolygon(pts, blendK * 0.5, false);
    field.subtractScallopedEye(cx, cy, nodeH * 0.42, 0.1, 4, 0.8);
  } else {
    const diamondPts: ISigilPoint[] = [
      { x: cx - nodeW, y: cy },
      { x: cx, y: cy - nodeH },
      { x: cx + nodeW, y: cy },
      { x: cx, y: cy + nodeH },
    ];
    field.addPolygon(diamondPts, blendK * 0.5, false);
    if (style === 'diamond-eye' || style === 'split-crescent') {
      field.subtractScallopedEye(cx, cy, nodeH * 0.46, 0.12, 4, 0.8);
    }
  }

  // Optional flanking teardrop loop pockets on the bridge
  if (style === 'double-calyx' || rng.chance(0.5)) {
    const pocketArch: ISigilSpine = {
      p0: { x: cx - nodeW * 1.1, y: cy },
      p1: { x: cx - nodeW * 1.8, y: cy - 12 - params.curvature * 8 },
      p2: { x: cx - nodeW * 2.5, y: cy - 10 },
      p3: { x: cx - nodeW * 3.1, y: cy },
    };
    addSymSpline(
      field,
      pocketArch,
      (t) => doubleTaperWidthProfile(t, railW * 0.72, railW * 0.4, params.swell),
      blendK,
      cx,
      16,
    );
  }

  const extracted = field.extract(1.2 + params.swell * 0.4);
  return { ...extracted, width, height, seed };
}

/* ---------------------------------------------------------------------------------------------- */
/* 4. Dendritic 1 -> N Rail-to-Card Branching Connector                                           */
/* ---------------------------------------------------------------------------------------------- */

/**
 * Generates a procedural `1 -> N` dendritic vein manifold (`cyber (1).jpg`, `cyber (2).jpg`)
 * that bifurcates smoothly from a single left-rail root into `targetYs` card-edge ports.
 */
export function composeBranchingConnector(
  raw: ISigilLabParams,
  seed = 1,
  targetYs: readonly number[] = [42, 120, 198],
  width = UI_CONNECTOR_WIDTH,
  height = UI_CONNECTOR_HEIGHT,
): ISigilRichGeometry {
  const params = normalizeSigilParams(raw);
  const rng = createSigilRng(seed);
  const field = new SigilSdfField(width, height, 1.5);
  const blendK = blendRadiusFromParams(params) * 0.75;

  const sortedTargets = [...targetYs].sort((a, b) => a - b);
  const rootY =
    sortedTargets.length > 0
      ? (sortedTargets[0] + sortedTargets[sortedTargets.length - 1]) * 0.5
      : height * 0.5;
  const trunkW = 5.4 + params.swell * 2.4;
  const branchW = 3.8 + params.swell * 1.4;

  // Recursive binary tree split over targetY groups so branches bifurcate naturally with Y-saddles
  const emitSubtree = (
    ox: number,
    oy: number,
    targets: readonly number[],
    currentW: number,
    stream: ISigilRng,
  ): void => {
    if (targets.length === 0) return;
    if (targets.length === 1) {
      const ty = targets[0];
      const dx = width + RAIL_OVERSHOOT - ox;
      const spine: ISigilSpine = {
        p0: { x: ox, y: oy },
        p1: { x: ox + dx * 0.45, y: oy },
        p2: { x: ox + dx * 0.55, y: ty },
        p3: { x: width + RAIL_OVERSHOOT, y: ty },
      };
      field.addSpline(spine, (t) => currentW * (1 - 0.18 * t), blendK, 18);
      return;
    }

    const mid = Math.ceil(targets.length / 2);
    const upper = targets.slice(0, mid);
    const lower = targets.slice(mid);
    const splitX = Math.min(width * 0.72, ox + (width - ox) * stream.range(0.32, 0.48));
    const upperY = (upper[0] + upper[upper.length - 1]) * 0.5;
    const lowerY = (lower[0] + lower[lower.length - 1]) * 0.5;
    const childW = Math.max(branchW, currentW * 0.8);

    // Upper split branch
    const upperTargetY = upper.length === 1 ? upper[0] : (oy + upperY) * 0.5;
    field.addSpline(
      {
        p0: { x: ox, y: oy },
        p1: { x: ox + (splitX - ox) * 0.5, y: oy },
        p2: { x: ox + (splitX - ox) * 0.65, y: upperTargetY },
        p3: { x: splitX, y: upperTargetY },
      },
      (t) => currentW + (childW - currentW) * t,
      blendK,
      16,
    );
    emitSubtree(splitX, upperTargetY, upper, childW, stream.fork('u'));

    // Lower split branch
    const lowerTargetY = lower.length === 1 ? lower[0] : (oy + lowerY) * 0.5;
    field.addSpline(
      {
        p0: { x: ox, y: oy },
        p1: { x: ox + (splitX - ox) * 0.5, y: oy },
        p2: { x: ox + (splitX - ox) * 0.65, y: lowerTargetY },
        p3: { x: splitX, y: lowerTargetY },
      },
      (t) => currentW + (childW - currentW) * t,
      blendK,
      16,
    );
    emitSubtree(splitX, lowerTargetY, lower, childW, stream.fork('l'));
  };

  // Root trunk entering from the left border rail
  const trunkEndX = width * rng.range(0.18, 0.28);
  field.addSpline(
    {
      p0: { x: -RAIL_OVERSHOOT, y: rootY },
      p1: { x: trunkEndX * 0.35, y: rootY },
      p2: { x: trunkEndX * 0.7, y: rootY },
      p3: { x: trunkEndX, y: rootY },
    },
    () => trunkW,
    blendK,
    12,
  );

  emitSubtree(trunkEndX, rootY, sortedTargets, trunkW * 0.92, rng.fork('tree'));

  // Optional seeded anastomosis bridge or delicate barb between branches
  if (rng.chance(0.5) && sortedTargets.length >= 2) {
    const midY = (sortedTargets[0] + sortedTargets[sortedTargets.length - 1]) * 0.5;
    field.addSpline(
      {
        p0: { x: trunkEndX, y: rootY },
        p1: { x: trunkEndX + 26, y: midY - 18 },
        p2: { x: trunkEndX + 46, y: midY - 10 },
        p3: { x: trunkEndX + 64, y: midY },
      },
      (t) => veinWidthProfile(t, branchW * 0.75, 0.6, params.swell, 0.3),
      blendK,
      14,
    );
  }

  const extracted = field.extract(1.2 + params.swell * 0.4);
  return { ...extracted, width, height, seed };
}

/* ---------------------------------------------------------------------------------------------- */
/* 5. Calyx Pill / Input / Button Frame                                                           */
/* ---------------------------------------------------------------------------------------------- */

/**
 * Generates a pointed Calyx Pill / Search / Button Frame (`cyber (1).png`, `cyber (2).png`).
 */
export function composeCalyxFrame(
  raw: ISigilLabParams,
  seed = 1,
  width = UI_CALYX_WIDTH,
  height = UI_CALYX_HEIGHT,
): ISigilRichGeometry {
  const params = normalizeSigilParams(raw);
  const rng = createSigilRng(seed);
  const field = new SigilSdfField(width, height, 1.5);
  const blendK = blendRadiusFromParams(params) * 0.65;

  const cx = width * 0.5;
  const cy = height * 0.5;
  const railW = 3.2 + params.swell * 1.4;
  const tipX = 12;
  const shoulderX = 38 + params.curvature * 10;
  const topY = 12;
  const botY = height - 12;

  for (const vy of [-1, 1]) {
    const yEdge = vy === -1 ? topY : botY;
    const halfSpine: ISigilSpine = {
      p0: { x: tipX, y: cy },
      p1: { x: tipX + 14, y: cy + vy * (height * 0.34) },
      p2: { x: shoulderX, y: yEdge },
      p3: { x: cx + 2, y: yEdge },
    };
    addSymSpline(field, halfSpine, () => railW, blendK, cx, 18);
  }

  // Optional corner flare wisps on the outer calyx tips
  if (rng.chance(0.7)) {
    const flareLen = 14 + params.spikeLength * 10;
    const flare: ISigilSpine = {
      p0: { x: tipX + 8, y: cy },
      p1: { x: tipX + 4, y: cy - 8 },
      p2: { x: tipX - 2, y: cy - 12 },
      p3: { x: tipX - flareLen * 0.4, y: cy - flareLen * 0.7 },
    };
    addSymSpline(
      field,
      flare,
      (t) => veinWidthProfile(t, railW * 0.85, 0.6, params.swell, 0.25),
      blendK,
      cx,
      12,
    );
  }

  const extracted = field.extract(1.0 + params.swell * 0.3);
  return { ...extracted, width, height, seed };
}
