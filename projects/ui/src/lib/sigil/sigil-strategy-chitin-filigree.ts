/**
 * Chitin Filigree sigil geometry strategy for the Cybersigil Shape Lab.
 *
 * Implements procedural geometry competing against the baseline strategy across all four archetype
 * slots, targeting the authentic biomechanical aesthetic of concept art (6), (7), and (1):
 * - Slot 1 (Winged Star): Concept (6) asymmetric soaring plumes, multi-tiered scythe wings, and an
 *   under-wing looping armpit pocket seamlessly welded to a hollow 8-point scalloped star eye.
 * - Slot 2 (Filigree Crest): Concept (7) bilateral filigree ribcage with a trident crown spear,
 *   open negative-space lace eyes, an upright antler comb, and terminal hook barbs.
 * - Slot 3 (S-Curve Tendril): Concept (1) flowing spine with continuous body thickness into a
 *   terminal node, a sweeping lower belly claw, mid-spine looping eye, upper claw fork, and anchor cluster.
 * - Slot 4 (Modular UI Join): Interlocking dual-claw end-caps with concave crescent rail welds and
 *   an 8-point cyber-diamond star reticle that preserves fixed cap aspect ratios across rail widths.
 */

import {
  crescentBranchShapes,
  cubicPoint,
  cubicTangent,
  curvedSpine,
  hole,
  hookShapes,
  mirrorShapes,
  normalizeSigilParams,
  outlinePoints,
  ribbonPoints,
  shapesToPath,
  sigilWidthProfile,
  solid,
  thornShapes,
  SIGIL_BASE_WIDTH,
  SIGIL_CENTER,
  SIGIL_FULL_TURN,
  SIGIL_JOIN_CAP_WIDTH,
  SIGIL_JOIN_HEIGHT,
  SIGIL_JOIN_RAIL_THICKNESS,
  SIGIL_NORMAL_EPSILON,
  SIGIL_SPIKE_GAIN,
  SIGIL_THORN_BASE_WIDTH,
  SIGIL_VIEW_HEIGHT,
  SIGIL_VIEW_WIDTH,
  type ISigilGeometry,
  type ISigilJoinGeometry,
  type ISigilLabParams,
  type ISigilPoint,
  type ISigilShape,
  type ISigilSpine,
} from './sigil-math';
import type { ISigilStrategy } from './sigil-strategies';

/* ---------------------------------------------------------------------------------------------- */
/* Generic vector & sampling math                                                                 */
/* ---------------------------------------------------------------------------------------------- */

/** Samples taken along each quadratic arc for filigree webs and concave contours. */
const CHITIN_QUAD_SAMPLES = 12;

/** Samples taken around circular and scalloped hollow eye cutouts. */
const CHITIN_EYE_SAMPLES = 48;

/** Adds two points in 2D user space. */
function add(a: ISigilPoint, b: ISigilPoint): ISigilPoint {
  return { x: a.x + b.x, y: a.y + b.y };
}

/** Subtracts point b from point a. */
function subtract(a: ISigilPoint, b: ISigilPoint): ISigilPoint {
  return { x: a.x - b.x, y: a.y - b.y };
}

/** Scales a 2D vector by a scalar factor. */
function scale(v: ISigilPoint, factor: number): ISigilPoint {
  return { x: v.x * factor, y: v.y * factor };
}

/** Linear interpolation between two 2D points. */
function lerp(a: ISigilPoint, b: ISigilPoint, t: number): ISigilPoint {
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
}

/** Calculates the Euclidean magnitude of a 2D vector. */
function length(v: ISigilPoint): number {
  return Math.hypot(v.x, v.y);
}

/** Returns the unit vector in the direction of v, or zero vector if length is below epsilon. */
function unit(v: ISigilPoint): ISigilPoint {
  const mag = length(v);
  if (mag < SIGIL_NORMAL_EPSILON) return { x: 0, y: 0 };
  return scale(v, 1 / mag);
}

/** Returns a vector rotated 90 degrees counter-clockwise (perpendicular normal). */
function perpendicular(v: ISigilPoint): ISigilPoint {
  return { x: -v.y, y: v.x };
}

/** Rotates a vector by an angle in radians. */
function rotate(v: ISigilPoint, angle: number): ISigilPoint {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return { x: v.x * cos - v.y * sin, y: v.x * sin + v.y * cos };
}

/** Returns a point at a given polar offset from centre. */
function polar(centre: ISigilPoint, radius: number, angle: number): ISigilPoint {
  return { x: centre.x + radius * Math.cos(angle), y: centre.y + radius * Math.sin(angle) };
}

/**
 * Samples a quadratic Bezier arc from `from` to `to` using `control`. Excludes start point so it
 * chains cleanly into an existing contour polygon.
 */
function quadraticSamples(from: ISigilPoint, control: ISigilPoint, to: ISigilPoint): ISigilPoint[] {
  const points: ISigilPoint[] = [];
  for (let index = 1; index <= CHITIN_QUAD_SAMPLES; index++) {
    const t = index / CHITIN_QUAD_SAMPLES;
    const u = 1 - t;
    points.push({
      x: u * u * from.x + 2 * u * t * control.x + t * t * to.x,
      y: u * u * from.y + 2 * u * t * control.y + t * t * to.y,
    });
  }
  return points;
}

/* ---------------------------------------------------------------------------------------------- */
/* Slot 1: Asymmetric Winged Star (Concept 6)                                                     */
/* ---------------------------------------------------------------------------------------------- */

/** Base outer radius of the winged star eye at zero spike length. */
const STAR_BASE_RADIUS = 58;
/** Ratio of diagonal rays relative to the base radius. */
const STAR_DIAGONAL_RATIO = 0.48;
/** Ratio of star ray valleys relative to the base radius. */
const STAR_VALLEY_RATIO = 0.28;
/** Ratio of the hollow eye cutout relative to the base radius. */
const STAR_HOLE_RATIO = 0.22;
/** Depth of organic scallop wave on the hollow eye rim. */
const STAR_SCALLOP_DEPTH = 0.14;
/** Frequency of scallop lobes around the hollow eye. */
const STAR_SCALLOP_LOBES = 8;
/** Elongation multiplier for the tall cardinal top ray in concept (6). */
const STAR_TOP_RAY_RATIO = 1.62;
/** Elongation multiplier for the cardinal bottom ray. */
const STAR_BOTTOM_RAY_RATIO = 1.25;
/** Elongation multiplier for the cardinal left ray. */
const STAR_LEFT_RAY_RATIO = 1.38;
/** Cardinal right ray ratio. */
const STAR_RIGHT_RAY_RATIO = 1.05;

/** Full ribbon width of the primary soaring wing vein. */
const STAR_WING_PRIMARY_WIDTH = 13;
/** Full ribbon width of secondary filigree wing veins. */
const STAR_WING_SECONDARY_WIDTH = 9;
/** Full ribbon width of under-wing looping veins. */
const STAR_WING_LOOP_WIDTH = 8;

/**
 * Generates an 8-point hollow star eye with concept (6) cardinal ray proportions and a scalloped
 * negative-space central aperture.
 */
function composeChitinStarEye(centre: ISigilPoint, radius: number): ISigilShape[] {
  const outline: ISigilPoint[] = [];
  const tipCount = 8;
  const step = SIGIL_FULL_TURN / tipCount;

  for (let index = 0; index < tipCount; index++) {
    const angle = index * step;
    let tipRadius = radius * STAR_DIAGONAL_RATIO;
    if (index === 0) tipRadius = radius * STAR_RIGHT_RAY_RATIO;
    else if (index === 2) tipRadius = radius * STAR_BOTTOM_RAY_RATIO;
    else if (index === 4) tipRadius = radius * STAR_LEFT_RAY_RATIO;
    else if (index === 6) tipRadius = radius * STAR_TOP_RAY_RATIO;

    outline.push(polar(centre, tipRadius, angle));
    outline.push(polar(centre, radius * STAR_VALLEY_RATIO, angle + step / 2));
  }

  const holeRadius = radius * STAR_HOLE_RATIO;
  const eyePoints: ISigilPoint[] = [];
  for (let index = 0; index < CHITIN_EYE_SAMPLES; index++) {
    const angle = (index * SIGIL_FULL_TURN) / CHITIN_EYE_SAMPLES;
    const scallop = 1 + STAR_SCALLOP_DEPTH * Math.cos(STAR_SCALLOP_LOBES * angle);
    eyePoints.push(polar(centre, holeRadius * scallop, angle));
  }

  return [solid(outline), hole(eyePoints)];
}

/**
 * Composes archetype 1 (Winged Star), featuring multi-tiered scythe plumes and an under-wing
 * looping armpit pocket matching concept (6), welded directly into the hollow star eye.
 */
export function composeChitinWingedStar(raw: ISigilLabParams): ISigilGeometry {
  const params = normalizeSigilParams(raw);
  const centre = SIGIL_CENTER;
  const starRadius = STAR_BASE_RADIUS * (1 + params.spikeLength * SIGIL_SPIKE_GAIN);
  const curvatureLift = params.curvature * 32;
  const asymmetryLift = params.asymmetry * 26;
  const asymmetryReach = params.asymmetry * 28;

  // Primary soaring left wing: starts inside the star body and sweeps up and left to a needle tip
  const leftSoarSpine: ISigilSpine = {
    p0: { x: centre.x - starRadius * 0.35, y: centre.y - 6 },
    p1: { x: centre.x - 110, y: centre.y - 88 - curvatureLift },
    p2: { x: centre.x - 175, y: centre.y - 98 - curvatureLift * 0.8 },
    p3: { x: centre.x - 228, y: centre.y - 82 - params.spikeLength * 20 },
  };

  // Secondary middle left wing
  const leftMidSpine: ISigilSpine = {
    p0: { x: centre.x - starRadius * 0.35, y: centre.y + 10 },
    p1: { x: centre.x - 70, y: centre.y + 22 },
    p2: { x: centre.x - 120, y: centre.y + 32 },
    p3: { x: centre.x - 165, y: centre.y + 10 },
  };

  // Concept (6) under-wing looping armpit pocket: swoops down, around, and curls up inside
  const leftLoopSpine: ISigilSpine = {
    p0: { x: centre.x - 65, y: centre.y + 25 },
    p1: { x: centre.x - 85, y: centre.y + 75 },
    p2: { x: centre.x - 130, y: centre.y + 90 + curvatureLift * 0.4 },
    p3: { x: centre.x - 120, y: centre.y + 45 },
  };

  // Bottom scythe sweep
  const leftBottomSpine: ISigilSpine = {
    p0: { x: centre.x - 85, y: centre.y + 85 },
    p1: { x: centre.x - 125, y: centre.y + 110 + curvatureLift * 0.5 },
    p2: { x: centre.x - 165, y: centre.y + 95 },
    p3: { x: centre.x - 195, y: centre.y + 75 },
  };

  // Asymmetric right wing: sweeping flame plumes with double tines
  const rightSoarSpine: ISigilSpine = {
    p0: { x: centre.x + starRadius * 0.35, y: centre.y - 6 },
    p1: { x: centre.x + 95, y: centre.y - 62 - curvatureLift },
    p2: { x: centre.x + 160, y: centre.y - 88 - asymmetryLift },
    p3: { x: centre.x + 228 + asymmetryReach, y: centre.y - 102 - params.spikeLength * 20 },
  };

  const rightMidSpine: ISigilSpine = {
    p0: { x: centre.x + starRadius * 0.35, y: centre.y + 10 },
    p1: { x: centre.x + 85, y: centre.y + 20 },
    p2: { x: centre.x + 135, y: centre.y - 5 },
    p3: { x: centre.x + 185 + asymmetryReach * 0.5, y: centre.y - 25 },
  };

  const rightBottomSpine: ISigilSpine = {
    p0: { x: centre.x + 60, y: centre.y + 35 },
    p1: { x: centre.x + 95, y: centre.y + 62 },
    p2: { x: centre.x + 128, y: centre.y + 82 + curvatureLift * 0.4 },
    p3: { x: centre.x + 160 + asymmetryReach * 0.4, y: centre.y + 70 },
  };

  const shapes: ISigilShape[] = [
    ...composeChitinStarEye(centre, starRadius),
    // Left wing hierarchy
    solid(ribbonPoints(leftSoarSpine, STAR_WING_PRIMARY_WIDTH, params.swell)),
    solid(ribbonPoints(leftMidSpine, STAR_WING_SECONDARY_WIDTH, params.swell)),
    solid(ribbonPoints(leftLoopSpine, STAR_WING_LOOP_WIDTH, params.swell)),
    solid(ribbonPoints(leftBottomSpine, STAR_WING_SECONDARY_WIDTH, params.swell)),
    ...thornShapes(leftSoarSpine, params, 0, STAR_WING_PRIMARY_WIDTH),
    ...thornShapes(leftMidSpine, params, 0, STAR_WING_SECONDARY_WIDTH),
    ...hookShapes(leftSoarSpine, 0.8, 1, params, STAR_WING_PRIMARY_WIDTH),
    ...hookShapes(leftMidSpine, 0.85, -1, params, STAR_WING_SECONDARY_WIDTH),
    ...hookShapes(leftLoopSpine, 0.8, 1, params, STAR_WING_LOOP_WIDTH),

    // Right wing hierarchy
    solid(ribbonPoints(rightSoarSpine, STAR_WING_PRIMARY_WIDTH, params.swell)),
    solid(ribbonPoints(rightMidSpine, STAR_WING_SECONDARY_WIDTH, params.swell)),
    solid(ribbonPoints(rightBottomSpine, STAR_WING_SECONDARY_WIDTH, params.swell)),
    ...thornShapes(rightSoarSpine, params, params.asymmetry * 0.06, STAR_WING_PRIMARY_WIDTH),
    ...thornShapes(rightMidSpine, params, params.asymmetry * 0.06, STAR_WING_SECONDARY_WIDTH),
    ...hookShapes(rightSoarSpine, 0.78, -1, params, STAR_WING_PRIMARY_WIDTH),
    ...hookShapes(rightMidSpine, 0.82, 1, params, STAR_WING_SECONDARY_WIDTH),
    ...hookShapes(rightBottomSpine, 0.75, -1, params, STAR_WING_SECONDARY_WIDTH),
  ];

  return { d: shapesToPath(shapes), width: SIGIL_VIEW_WIDTH, height: SIGIL_VIEW_HEIGHT };
}

/* ---------------------------------------------------------------------------------------------- */
/* Slot 2: Bilateral Filigree Crest (Concept 7)                                                   */
/* ---------------------------------------------------------------------------------------------- */

/** Base height of the central trident spear. */
const CREST_SPEAR_BASE_HEIGHT = 215;
/** Half-width of the central spear at its widest point. */
const CREST_SPEAR_HALF_WIDTH = 26;
/** Concave pull factor for the central spear sides. */
const CREST_SPEAR_CONCAVITY = 0.38;
/** Full width of the main crest wing ribbon. */
const CREST_MAIN_VEIN_WIDTH = 11;
/** Full width of inner filigree lace ribs. */
const CREST_RIB_VEIN_WIDTH = 7;

/**
 * Builds the central trident diamond spear of concept (7) with top antler prongs, concave waist,
 * and bottom flanking fangs.
 */
function composeChitinSpearAxis(
  centre: ISigilPoint,
  height: number,
  params: ISigilLabParams,
): ISigilShape[] {
  const h2 = height / 2;
  const corners = [
    { x: centre.x, y: centre.y - h2 },
    { x: centre.x + CREST_SPEAR_HALF_WIDTH, y: centre.y },
    { x: centre.x, y: centre.y + h2 },
    { x: centre.x - CREST_SPEAR_HALF_WIDTH, y: centre.y },
  ];
  const outline: ISigilPoint[] = [];
  corners.forEach((from, index) => {
    const to = corners[(index + 1) % corners.length];
    const mid = lerp(from, to, 0.5);
    const control = lerp(mid, centre, CREST_SPEAR_CONCAVITY);
    outline.push(from, ...quadraticSamples(from, control, to));
  });

  // Top trident antler horns curving upward and outward
  const leftAntler = crescentBranchShapes({
    junction: { x: centre.x - 12, y: centre.y - h2 * 0.45 },
    direction: { x: -0.5, y: -0.866 },
    tip: { x: centre.x - 32, y: centre.y - h2 * 0.85 },
    baseWidth: 8,
    swell: params.swell,
    bend: -0.3 * params.curvature,
    crescentDepth: params.crescentDepth,
  });

  // Bottom flanking fangs curving downward alongside spear tip
  const leftFang = crescentBranchShapes({
    junction: { x: centre.x - 12, y: centre.y + h2 * 0.45 },
    direction: { x: -0.5, y: 0.866 },
    tip: { x: centre.x - 24, y: centre.y + h2 * 0.95 },
    baseWidth: 8,
    swell: params.swell,
    bend: 0.3 * params.curvature,
    crescentDepth: params.crescentDepth,
  });

  const bilateralAntlers = [...leftAntler, ...mirrorShapes(leftAntler, centre.x)];
  const bilateralFangs = [...leftFang, ...mirrorShapes(leftFang, centre.x)];

  return [solid(outline), ...bilateralAntlers, ...bilateralFangs];
}

/**
 * Composes archetype 2 (Filigree Crest), generating an intricate bilateral bone/chitin ribcage with
 * open negative-space lace eyes, upright antler combs, and terminal double horns matching concept (7).
 */
export function composeChitinFiligreeCrest(raw: ISigilLabParams): ISigilGeometry {
  const params = normalizeSigilParams(raw);
  const centre = SIGIL_CENTER;
  const spearHeight =
    CREST_SPEAR_BASE_HEIGHT * (0.9 + params.spikeLength * SIGIL_SPIKE_GAIN * 0.35);
  const lift = 34 + params.curvature * 36;

  // Main horizontal scythe wing (left side)
  const mainSpine: ISigilSpine = {
    p0: { x: centre.x - 16, y: centre.y - 8 },
    p1: { x: centre.x - 85, y: centre.y + 18 },
    p2: { x: centre.x - 155, y: centre.y - 20 - lift * 0.3 },
    p3: { x: centre.x - 226, y: centre.y - 60 - lift * 0.7 - params.spikeLength * 15 },
  };

  // Inner filigree rib that arches down to create an open lace eye between spear and wing
  const innerRibSpine: ISigilSpine = {
    p0: { x: centre.x - 18, y: centre.y - 42 },
    p1: { x: centre.x - 48, y: centre.y - 50 },
    p2: { x: centre.x - 72, y: centre.y - 12 },
    p3: { x: centre.x - 68, y: centre.y + 12 },
  };

  // Upright antler thorn rising from inner rib apex
  const ribApex = cubicPoint(innerRibSpine, 0.45);
  const innerAntler = crescentBranchShapes({
    junction: ribApex,
    direction: { x: -0.6, y: -0.8 },
    tip: { x: centre.x - 48, y: centre.y - 88 - lift * 0.4 - params.spikeLength * 15 },
    baseWidth: 7,
    swell: params.swell,
    bend: -0.25 * params.curvature,
    crescentDepth: params.crescentDepth,
  });

  // Lower scythe rib
  const lowerRibSpine: ISigilSpine = {
    p0: { x: centre.x - 14, y: centre.y + 35 },
    p1: { x: centre.x - 65, y: centre.y + 40 },
    p2: { x: centre.x - 125, y: centre.y + 70 + lift * 0.3 },
    p3: { x: centre.x - 185, y: centre.y + 40 },
  };

  // Terminal antler fork at outer wing tip (sweeping horizontally back toward centre)
  const outerHook = hookShapes(mainSpine, 0.84, 1, params, CREST_MAIN_VEIN_WIDTH);

  // Upward antler thorns along the main scythe contour
  const combThorns: ISigilShape[] = [];
  const combFractions = [0.28, 0.48, 0.65, 0.8];
  const count = Math.min(params.thornCount, combFractions.length);
  for (let index = 0; index < count; index++) {
    const t = combFractions[index];
    const junction = cubicPoint(mainSpine, t);
    const direction = cubicTangent(mainSpine, t);
    const outward = rotate(unit(direction), -0.7);
    const spikeExtension = 1 + params.spikeLength * SIGIL_SPIKE_GAIN;
    const thornTip = add(junction, scale(outward, 45 * spikeExtension));
    combThorns.push(
      ...crescentBranchShapes({
        junction,
        direction,
        tip: thornTip,
        baseWidth: 7,
        swell: params.swell,
        bend: -0.3 * params.curvature,
        crescentDepth: params.crescentDepth,
      }),
    );
  }

  const leftWing: ISigilShape[] = [
    solid(ribbonPoints(mainSpine, CREST_MAIN_VEIN_WIDTH, params.swell)),
    solid(ribbonPoints(innerRibSpine, CREST_RIB_VEIN_WIDTH, params.swell)),
    solid(ribbonPoints(lowerRibSpine, CREST_RIB_VEIN_WIDTH, params.swell)),
    ...innerAntler,
    ...outerHook,
    ...combThorns,
    ...thornShapes(lowerRibSpine, params, 0, CREST_RIB_VEIN_WIDTH),
  ];

  const rightWing = mirrorShapes(leftWing, centre.x);
  const spear = composeChitinSpearAxis(centre, spearHeight, params);

  return {
    d: shapesToPath([...spear, ...leftWing, ...rightWing]),
    width: SIGIL_VIEW_WIDTH,
    height: SIGIL_VIEW_HEIGHT,
  };
}

/* ---------------------------------------------------------------------------------------------- */
/* Slot 3: Flowing S-Curve Tendril (Concept 1)                                                    */
/* ---------------------------------------------------------------------------------------------- */

/** Full width of the primary S-curve tendril spine. */
const TENDRIL_MAIN_WIDTH = 13;
/** Parameter t where the sweeping lower claw branches in concept (1). */
const TENDRIL_LOWER_CLAW_T = 0.38;
/** Parameter t where the mid-spine looping arch begins. */
const TENDRIL_LOOP_START_T = 0.15;
/** Parameter t where the mid-spine looping arch rejoins. */
const TENDRIL_LOOP_END_T = 0.34;
/** Long radius of the swollen terminal chitin node. */
const TENDRIL_NODE_RADIUS_X = 16;
/** Short radius of the swollen terminal chitin node. */
const TENDRIL_NODE_RADIUS_Y = 10;
/** Samples taken for the terminal chitin node ellipse. */
const TENDRIL_NODE_SAMPLES = 24;

/**
 * Builds the swollen chitinous junction node where the tendril splits into its terminal claws.
 */
function composeChitinNodeShape(centre: ISigilPoint, swell: number): ISigilShape {
  const points: ISigilPoint[] = [];
  const radiusY = TENDRIL_NODE_RADIUS_Y * (1 + swell * 0.8);
  for (let index = 0; index < TENDRIL_NODE_SAMPLES; index++) {
    const angle = (index * SIGIL_FULL_TURN) / TENDRIL_NODE_SAMPLES;
    points.push({
      x: centre.x + TENDRIL_NODE_RADIUS_X * Math.cos(angle),
      y: centre.y + radiusY * Math.sin(angle),
    });
  }
  return solid(points);
}

/**
 * Custom width profile for the tendril spine that fades in from a needle root at t = 0, swells in the
 * midsection, and maintains solid thickness into the terminal chitin node at t = 1.
 */
function tendrilFlowWidth(t: number, swell: number): number {
  const clampedT = Math.min(1, Math.max(0, t));
  const rootFade = Math.min(1, clampedT / 0.12);
  const z = (clampedT - 0.4) / 0.16;
  const junctionBump = 1 + swell * 1.2 * Math.exp(-0.5 * z * z);
  const bodyTaper = Math.pow(1 - clampedT * 0.48, 1.2);
  return TENDRIL_MAIN_WIDTH * rootFade * junctionBump * bodyTaper;
}

/**
 * Composes archetype 3 (S-Curve Tendril), incorporating concept (1)'s sweeping lower belly claw,
 * mid-spine looping eye, upper claw fork, and lower anchor/cross cluster.
 */
export function composeChitinTendrilSCurve(raw: ISigilLabParams): ISigilGeometry {
  const params = normalizeSigilParams(raw);
  const centre = SIGIL_CENTER;
  const curvatureGain = params.curvature * 35;
  const asymmetryShift = params.asymmetry * 20;

  // Flowing main spine from tail to terminal junction
  const mainSpine: ISigilSpine = {
    p0: { x: 25, y: centre.y + 85 },
    p1: { x: 135, y: centre.y - 45 - curvatureGain },
    p2: { x: 255, y: centre.y + 30 + curvatureGain * 0.7 },
    p3: { x: 355, y: centre.y - 15 + asymmetryShift },
  };

  // Concept (1) signature 1: Massive sweeping lower belly claw curling far back to the left
  const clawJunction = cubicPoint(mainSpine, TENDRIL_LOWER_CLAW_T);
  const clawDirection = cubicTangent(mainSpine, TENDRIL_LOWER_CLAW_T);
  const clawTip: ISigilPoint = {
    x: 82 - params.spikeLength * 30,
    y: centre.y + 65 + curvatureGain * 0.4,
  };
  const lowerBellyClaw = crescentBranchShapes({
    junction: clawJunction,
    direction: clawDirection,
    tip: clawTip,
    baseWidth: 11,
    parentWidth: tendrilFlowWidth(TENDRIL_LOWER_CLAW_T, params.swell),
    swell: params.swell,
    bend: -0.42 * (0.8 + params.curvature * 0.4),
    crescentDepth: params.crescentDepth,
  });

  // Concept (1) signature 2: Mid-spine looping arch that creates a hollow negative-space eye
  const loopStart = cubicPoint(mainSpine, TENDRIL_LOOP_START_T);
  const loopEnd = cubicPoint(mainSpine, TENDRIL_LOOP_END_T);
  const loopLift = -48 * (1 + params.spikeLength * SIGIL_SPIKE_GAIN * 0.4);
  const loopSpine: ISigilSpine = {
    p0: loopStart,
    p1: { x: lerp(loopStart, loopEnd, 0.33).x, y: loopStart.y + loopLift },
    p2: { x: lerp(loopStart, loopEnd, 0.67).x, y: loopEnd.y + loopLift },
    p3: loopEnd,
  };
  const loopRibbon = solid(
    outlinePoints(
      loopSpine,
      (t) => 8 * Math.pow(Math.sin(Math.PI * t), 0.7) * (1 + params.swell * 0.4),
    ),
  );

  // Upward crescent thorn on the apex of the loop
  const loopApex = cubicPoint(loopSpine, 0.5);
  const loopApexThorn = crescentBranchShapes({
    junction: loopApex,
    direction: { x: 1, y: 0 },
    tip: { x: loopApex.x + 10, y: loopApex.y - 25 - params.spikeLength * 15 },
    baseWidth: 6,
    swell: params.swell,
    bend: 0.3 * params.curvature,
    crescentDepth: params.crescentDepth,
  });

  // Terminal chitin node
  const terminalNode = composeChitinNodeShape(mainSpine.p3, params.swell);

  // Terminal feature A: Upper fork claw with hollow crescent eye
  const forkOuterSpine: ISigilSpine = {
    p0: mainSpine.p3,
    p1: { x: mainSpine.p3.x + 35, y: mainSpine.p3.y - 40 - curvatureGain * 0.4 },
    p2: { x: mainSpine.p3.x + 65, y: mainSpine.p3.y - 65 },
    p3: { x: 445, y: 32 - params.spikeLength * 18 },
  };
  const forkInnerBranch = crescentBranchShapes({
    junction: cubicPoint(forkOuterSpine, 0.45),
    direction: cubicTangent(forkOuterSpine, 0.45),
    tip: { x: 415, y: 15 },
    baseWidth: 7,
    swell: params.swell,
    bend: -0.25 * params.curvature,
    crescentDepth: params.crescentDepth,
  });

  // Terminal feature B: Horizontal needle barb
  const horizBarb = crescentBranchShapes({
    junction: mainSpine.p3,
    direction: { x: 1, y: 0 },
    tip: { x: 435 + params.spikeLength * 22, y: mainSpine.p3.y },
    baseWidth: 7,
    swell: params.swell,
    bend: 0,
    crescentDepth: params.crescentDepth,
  });

  // Terminal feature C: Lower anchor/cross cluster (vertical stem + opposing crescent fins)
  const anchorStemSpine: ISigilSpine = {
    p0: mainSpine.p3,
    p1: { x: mainSpine.p3.x + 6, y: mainSpine.p3.y + 25 },
    p2: { x: mainSpine.p3.x + 10, y: mainSpine.p3.y + 50 },
    p3: { x: mainSpine.p3.x + 12, y: mainSpine.p3.y + 75 },
  };

  const upperFin = crescentBranchShapes({
    junction: { x: mainSpine.p3.x + 8, y: mainSpine.p3.y + 36 },
    direction: { x: 0, y: 1 },
    tip: { x: mainSpine.p3.x - 24, y: mainSpine.p3.y + 32 },
    baseWidth: 6,
    swell: params.swell,
    bend: -0.5 * params.curvature,
    crescentDepth: params.crescentDepth,
  });
  const upperFinRight = crescentBranchShapes({
    junction: { x: mainSpine.p3.x + 8, y: mainSpine.p3.y + 36 },
    direction: { x: 0, y: 1 },
    tip: { x: mainSpine.p3.x + 40, y: mainSpine.p3.y + 32 },
    baseWidth: 6,
    swell: params.swell,
    bend: 0.5 * params.curvature,
    crescentDepth: params.crescentDepth,
  });

  const lowerFin = crescentBranchShapes({
    junction: { x: mainSpine.p3.x + 12, y: mainSpine.p3.y + 68 },
    direction: { x: 0, y: 1 },
    tip: { x: mainSpine.p3.x - 24, y: mainSpine.p3.y + 74 },
    baseWidth: 6,
    swell: params.swell,
    bend: 0.5 * params.curvature,
    crescentDepth: params.crescentDepth,
  });
  const lowerFinRight = crescentBranchShapes({
    junction: { x: mainSpine.p3.x + 12, y: mainSpine.p3.y + 68 },
    direction: { x: 0, y: 1 },
    tip: { x: mainSpine.p3.x + 40, y: mainSpine.p3.y + 74 },
    baseWidth: 6,
    swell: params.swell,
    bend: -0.5 * params.curvature,
    crescentDepth: params.crescentDepth,
  });

  const shapes: ISigilShape[] = [
    solid(outlinePoints(mainSpine, (t) => tendrilFlowWidth(t, params.swell))),
    ...lowerBellyClaw,
    loopRibbon,
    ...loopApexThorn,
    terminalNode,
    solid(ribbonPoints(forkOuterSpine, 8, params.swell)),
    ...forkInnerBranch,
    ...horizBarb,
    solid(ribbonPoints(anchorStemSpine, 7, params.swell)),
    ...upperFin,
    ...upperFinRight,
    ...lowerFin,
    ...lowerFinRight,
    ...thornShapes(mainSpine, params, 0, TENDRIL_MAIN_WIDTH),
  ];

  return { d: shapesToPath(shapes), width: SIGIL_VIEW_WIDTH, height: SIGIL_VIEW_HEIGHT };
}

/* ---------------------------------------------------------------------------------------------- */
/* Slot 4: Modular UI Join                                                                        */
/* ---------------------------------------------------------------------------------------------- */

/** Radius of the central cyber-diamond reticle in the modular join. */
const JOIN_RETICLE_RADIUS = 15;
/** Outer claw tip inset from the cap edge in user units. */
const JOIN_OUTER_TIP_INSET = 5;
/** Flared vertical reach of outer claw tips. */
const JOIN_OUTER_TIP_DY = 22;
/** Flared vertical reach of inner claw barbs. */
const JOIN_INNER_TIP_DY = 12;

/**
 * Builds the fixed-dimension dual-claw left cap for the modular join with concave crescent welds.
 */
function composeChitinJoinCap(params: ISigilLabParams, centreY: number): ISigilShape[] {
  const edge = { x: SIGIL_JOIN_CAP_WIDTH, y: centreY };
  const upperOuterTip = { x: JOIN_OUTER_TIP_INSET, y: centreY - JOIN_OUTER_TIP_DY };
  const lowerOuterTip = { x: JOIN_OUTER_TIP_INSET, y: centreY + JOIN_OUTER_TIP_DY };
  const upperInnerTip = { x: SIGIL_JOIN_CAP_WIDTH * 0.45, y: centreY - JOIN_INNER_TIP_DY };
  const lowerInnerTip = { x: SIGIL_JOIN_CAP_WIDTH * 0.45, y: centreY + JOIN_INNER_TIP_DY };

  const webDefaults = {
    junction: edge,
    direction: { x: -1, y: 0 },
    baseWidth: SIGIL_THORN_BASE_WIDTH,
    swell: params.swell,
    crescentDepth: params.crescentDepth,
    parentWidth: SIGIL_JOIN_RAIL_THICKNESS,
  };

  return [
    ...crescentBranchShapes({ ...webDefaults, tip: upperOuterTip, bend: params.curvature }),
    ...crescentBranchShapes({ ...webDefaults, tip: lowerOuterTip, bend: -params.curvature }),
    ...crescentBranchShapes({
      ...webDefaults,
      tip: upperInnerTip,
      bend: -0.3 * params.curvature,
      baseWidth: 6,
    }),
    ...crescentBranchShapes({
      ...webDefaults,
      tip: lowerInnerTip,
      bend: 0.3 * params.curvature,
      baseWidth: 6,
    }),
  ];
}

/**
 * Composes archetype 4 (Modular UI Join), preserving exact `railWidth` and fixed-aspect thorny
 * end-caps across stretching widths.
 */
export function composeChitinModularUiJoin(
  raw: ISigilLabParams,
  railWidth: number,
): ISigilJoinGeometry {
  const params = normalizeSigilParams(raw);
  const width = railWidth;
  const height = SIGIL_JOIN_HEIGHT;
  const centreY = height / 2;
  const centre: ISigilPoint = { x: width / 2, y: centreY };

  const leftCapShapes = composeChitinJoinCap(params, centreY);
  const rightCapShapes = mirrorShapes(leftCapShapes, centre.x);

  const railHalf = SIGIL_JOIN_RAIL_THICKNESS / 2;
  const railStartX = Math.min(SIGIL_JOIN_CAP_WIDTH, width / 2);
  const railEndX = Math.max(width - SIGIL_JOIN_CAP_WIDTH, width / 2);

  const rail = solid([
    { x: railStartX, y: centreY - railHalf },
    { x: railEndX, y: centreY - railHalf },
    { x: railEndX, y: centreY + railHalf },
    { x: railStartX, y: centreY + railHalf },
  ]);

  const starRadius = JOIN_RETICLE_RADIUS * (1 + params.spikeLength * SIGIL_SPIKE_GAIN * 0.4);
  const reticle = composeChitinStarEye(centre, starRadius);

  const parts = {
    leftCap: shapesToPath(leftCapShapes),
    rail: shapesToPath([rail]),
    center: shapesToPath(reticle),
    rightCap: shapesToPath(rightCapShapes),
  };

  return {
    d: parts.leftCap + parts.rail + parts.center + parts.rightCap,
    width,
    height,
    parts,
  };
}

/* ---------------------------------------------------------------------------------------------- */
/* Strategy Export                                                                                */
/* ---------------------------------------------------------------------------------------------- */

/**
 * Chitin Filigree sigil geometry strategy. Competes on all four archetype slots with multi-tiered
 * scythe wings, open negative-space lace eyes, sweeping claws, and interlocking modular caps.
 */
export const SIGIL_CHITIN_FILIGREE_STRATEGY: ISigilStrategy = {
  id: 'chitin-filigree',
  label: 'Chitin Filigree',
  star: composeChitinWingedStar,
  crest: composeChitinFiligreeCrest,
  tendril: composeChitinTendrilSCurve,
  join: composeChitinModularUiJoin,
};
