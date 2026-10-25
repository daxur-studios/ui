/**
 * Pure, deterministic procedural builders for the cybersigil shape lab. Every builder returns SVG
 * path data (`d`) for closed filled silhouettes. There is no randomness and no DOM access, so Node
 * tests can check the geometry directly. Winding is normalised per shape: solids are positive and
 * holes are negative, so a single `nonzero` fill renders unions and cut-outs correctly.
 */

/** A point in SVG user units. */
export interface ISigilPoint {
  readonly x: number;
  readonly y: number;
}

/** A cubic Bezier spine from `p0` to `p3`, bent by the control points `p1` and `p2`. */
export interface ISigilSpine {
  readonly p0: ISigilPoint;
  readonly p1: ISigilPoint;
  readonly p2: ISigilPoint;
  readonly p3: ISigilPoint;
}

/** Knobs shared by every archetype. Unit-interval values run from 0 (off) to 1 (maximum). */
export interface ISigilLabParams {
  /** C-curve whip tension of veins and thorns: 0 is straight, 1 is fully bent. */
  readonly curvature: number;
  /** Vein thickening at junctions: 0 is a uniform taper, 1 is a strong swell. */
  readonly swell: number;
  /** Branching thorns per vein, an integer from 1 to `SIGIL_MAX_THORN_COUNT`. */
  readonly thornCount: number;
  /** Depth of the concave armpit webbing where a thorn meets its vein: 0 is a V-corner, 1 is deep. */
  readonly crescentDepth: number;
  /** Organic offset of the wings: 0 is mirrored, 1 is strongly lopsided. Ignored by the bilateral crest. */
  readonly asymmetry: number;
  /** Needle extension of thorns and star rays: 0 is short, 1 is long. */
  readonly spikeLength: number;
}

/** SVG path data for one composed sigil, with the viewBox size it was composed for. */
export interface ISigilGeometry {
  readonly d: string;
  readonly width: number;
  readonly height: number;
}

/** Modular join geometry. Each part is its own path, so seams can be compared across widths. */
export interface ISigilJoinGeometry extends ISigilGeometry {
  readonly parts: {
    readonly leftCap: string;
    readonly rail: string;
    readonly center: string;
    readonly rightCap: string;
  };
}

/** Width inputs for a tapered ribbon. */
export interface ITaperedRibbonOptions {
  /** Ribbon width at the spine start, in user units, before the swell and taper apply. */
  readonly baseWidth: number;
  /** Junction swell from 0 to 1. */
  readonly swell: number;
}

/** Inputs for a thorn that branches from a parent vein with a concave armpit. */
export interface ICrescentBranchOptions extends ITaperedRibbonOptions {
  /** Point on the parent vein where the thorn leaves it. */
  readonly junction: ISigilPoint;
  /** Tangent of the parent vein at the junction. Only its direction is used. */
  readonly direction: ISigilPoint;
  /** Needle tip of the thorn. */
  readonly tip: ISigilPoint;
  /** Curl of the thorn from -1 (curls one way) to 1 (curls the other). */
  readonly bend: number;
  /** Depth of the armpit webbing from 0 to 1. */
  readonly crescentDepth: number;
}

/** Archetype names used by the lab page and by tests. */
export type SigilArchetype =
  'winged-star' | 'filigree-crest' | 'tendril-s-curve' | 'modular-ui-join';

/* ---------------------------------------------------------------------------------------------- */
/* Canvas and generic math                                                                         */
/* ---------------------------------------------------------------------------------------------- */

/** Canvas width in user units for the three full archetypes. Matches the 16:9 spike frame. */
export const SIGIL_VIEW_WIDTH = 480;
/** Canvas height in user units for the three full archetypes. Matches the 16:9 spike frame. */
export const SIGIL_VIEW_HEIGHT = 270;
/** Centre of the full-archetype canvas, where the star eye and spear crest sit. */
export const SIGIL_CENTER: ISigilPoint = { x: SIGIL_VIEW_WIDTH / 2, y: SIGIL_VIEW_HEIGHT / 2 };
/** Full turn in radians, used to place polar points without a literal `2 * Math.PI` repeated. */
export const SIGIL_FULL_TURN = 2 * Math.PI;
/** Decimal places kept when writing path coordinates, so output is stable across runs. */
export const SIGIL_PATH_DECIMALS = 2;
/** Smallest point count that still encloses an area, so degenerate shapes are dropped. */
export const SIGIL_MIN_POLYGON_POINTS = 3;
/** Vector length below which a tangent counts as zero, so normals stay finite at the needle tip. */
export const SIGIL_NORMAL_EPSILON = 1e-9;
/** Maximum thorns per vein. Above this the thorns crowd each other on a 480-unit canvas. */
export const SIGIL_MAX_THORN_COUNT = 6;
/** Samples taken along each cubic spine. Enough for smooth curves at lab scale. */
export const SIGIL_SPINE_SAMPLES = 32;
/** Samples taken along each quadratic arc, used by armpits and the spear's concave sides. */
export const SIGIL_QUAD_SAMPLES = 12;
/** Exponent of the taper `(1 - t)^e`. Values above 1 sharpen the needle tip. */
export const SIGIL_TAPER_EXPONENT = 1.6;
/** Parameter `t` at which the junction swell peaks along a spine. */
export const SIGIL_JUNCTION_T = 0.4;
/** Width of the junction swell bump in `t`. Smaller values make a tighter knot. */
export const SIGIL_JUNCTION_SPREAD = 0.14;
/** Peak junction thickening per unit of swell. At swell 1 a junction is 2.8 times the taper width. */
export const SIGIL_SWELL_GAIN = 1.8;
/** Fraction of the spine taken by the first control point. One third gives an even Bezier. */
export const SIGIL_CONTROL_FRACTION = 1 / 3;
/** Scale of the spine bend per unit of `bend`, relative to the chord length. */
export const SIGIL_BEND_GAIN = 0.35;
/** Share of the bend carried by the first control point, so the curl starts near the root. */
export const SIGIL_BEND_LEAD = 0.5;
/** Vein width of a main wing spine, in user units at the root. */
export const SIGIL_BASE_WIDTH = 14;

/** Returns `value` clamped into `[min, max]`. A non-finite value clamps to `min`. */
function clampRange(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
}

/** Clamps a value into the unit interval. */
function clampUnit(value: number): number {
  return clampRange(value, 0, 1);
}

/**
 * Normalises raw lab knobs: unit-interval fields are clamped to `[0, 1]`, and `thornCount` is rounded
 * to an integer within `[1, SIGIL_MAX_THORN_COUNT]`. Every composer runs its input through here, so a
 * slider overshoot never produces NaN or a runaway thorn count.
 */
export function normalizeSigilParams(raw: ISigilLabParams): ISigilLabParams {
  return {
    curvature: clampUnit(raw.curvature),
    swell: clampUnit(raw.swell),
    thornCount: clampRange(Math.round(raw.thornCount), 1, SIGIL_MAX_THORN_COUNT),
    crescentDepth: clampUnit(raw.crescentDepth),
    asymmetry: clampUnit(raw.asymmetry),
    spikeLength: clampUnit(raw.spikeLength),
  };
}

/** Default knob values for the lab page, mid-range so each shape reads at first paint. */
export const DEFAULT_SIGIL_LAB_PARAMS: ISigilLabParams = {
  curvature: 0.5,
  swell: 0.5,
  thornCount: 3,
  crescentDepth: 0.5,
  asymmetry: 0.3,
  spikeLength: 0.5,
};

function add(a: ISigilPoint, b: ISigilPoint): ISigilPoint {
  return { x: a.x + b.x, y: a.y + b.y };
}

function subtract(a: ISigilPoint, b: ISigilPoint): ISigilPoint {
  return { x: a.x - b.x, y: a.y - b.y };
}

function scale(v: ISigilPoint, factor: number): ISigilPoint {
  return { x: v.x * factor, y: v.y * factor };
}

function lerp(a: ISigilPoint, b: ISigilPoint, t: number): ISigilPoint {
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
}

function length(v: ISigilPoint): number {
  return Math.hypot(v.x, v.y);
}

/** Unit vector in the direction of `v`. A zero vector returns zero, so callers never divide by zero. */
function unit(v: ISigilPoint): ISigilPoint {
  const magnitude = length(v);
  if (magnitude < SIGIL_NORMAL_EPSILON) return { x: 0, y: 0 };
  return scale(v, 1 / magnitude);
}

/** Rotates `v` by `angle` radians. */
function rotate(v: ISigilPoint, angle: number): ISigilPoint {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return { x: v.x * cos - v.y * sin, y: v.x * sin + v.y * cos };
}

/** Point on a polar offset from `centre`. */
function polar(centre: ISigilPoint, radius: number, angle: number): ISigilPoint {
  return { x: centre.x + radius * Math.cos(angle), y: centre.y + radius * Math.sin(angle) };
}

/** Evaluates the cubic Bezier spine at parameter `t` in `[0, 1]`. */
export function cubicPoint(spine: ISigilSpine, t: number): ISigilPoint {
  const u = 1 - t;
  const a = u * u * u;
  const b = 3 * u * u * t;
  const c = 3 * u * t * t;
  const d = t * t * t;
  return {
    x: a * spine.p0.x + b * spine.p1.x + c * spine.p2.x + d * spine.p3.x,
    y: a * spine.p0.y + b * spine.p1.y + c * spine.p2.y + d * spine.p3.y,
  };
}

/** Derivative of the cubic spine at `t`. Its direction is the spine tangent. */
export function cubicTangent(spine: ISigilSpine, t: number): ISigilPoint {
  const u = 1 - t;
  const a = 3 * u * u;
  const b = 6 * u * t;
  const c = 3 * t * t;
  return {
    x:
      a * (spine.p1.x - spine.p0.x) + b * (spine.p2.x - spine.p1.x) + c * (spine.p3.x - spine.p2.x),
    y:
      a * (spine.p1.y - spine.p0.y) + b * (spine.p2.y - spine.p1.y) + c * (spine.p3.y - spine.p2.y),
  };
}

/**
 * Samples a quadratic arc from `from` to `to` with control `control`. The start point is excluded, so
 * the result can be appended to a polygon that already holds `from`. The end point is included.
 */
function quadraticSamples(from: ISigilPoint, control: ISigilPoint, to: ISigilPoint): ISigilPoint[] {
  const samples: ISigilPoint[] = [];
  for (let index = 1; index <= SIGIL_QUAD_SAMPLES; index++) {
    const t = index / SIGIL_QUAD_SAMPLES;
    const u = 1 - t;
    samples.push({
      x: u * u * from.x + 2 * u * t * control.x + t * t * to.x,
      y: u * u * from.y + 2 * u * t * control.y + t * t * to.y,
    });
  }
  return samples;
}

/** Signed shoelace area. Positive and negative values mark opposite winding directions. */
export function signedArea(points: readonly ISigilPoint[]): number {
  let twiceArea = 0;
  for (let index = 0; index < points.length; index++) {
    const current = points[index];
    const next = points[(index + 1) % points.length];
    twiceArea += current.x * next.y - next.x * current.y;
  }
  return twiceArea / 2;
}

/* ---------------------------------------------------------------------------------------------- */
/* Shapes: a polygon plus whether it cuts a hole. Path output normalises winding from this flag.     */
/* ---------------------------------------------------------------------------------------------- */

interface ISigilShape {
  readonly points: readonly ISigilPoint[];
  readonly hole: boolean;
}

function solid(points: readonly ISigilPoint[]): ISigilShape {
  return { points, hole: false };
}

function hole(points: readonly ISigilPoint[]): ISigilShape {
  return { points, hole: true };
}

/** Returns the points wound positively when `positive` is true, and negatively otherwise. */
function withWinding(points: readonly ISigilPoint[], positive: boolean): readonly ISigilPoint[] {
  const isPositive = signedArea(points) > 0;
  return isPositive === positive ? points : [...points].reverse();
}

function formatCoordinate(value: number): string {
  return value.toFixed(SIGIL_PATH_DECIMALS);
}

/** Writes shapes as one SVG path. Holes are wound opposite to solids, so `nonzero` fill cuts them out. */
function shapesToPath(shapes: readonly ISigilShape[]): string {
  return shapes
    .filter((shape) => shape.points.length >= SIGIL_MIN_POLYGON_POINTS)
    .map((shape) => {
      const points = withWinding(shape.points, !shape.hole);
      const [first, ...rest] = points;
      const head = `M${formatCoordinate(first.x)} ${formatCoordinate(first.y)}`;
      const body = rest.map((p) => `L${formatCoordinate(p.x)} ${formatCoordinate(p.y)}`).join('');
      return `${head}${body}Z`;
    })
    .join('');
}

/** Mirrors shapes across the vertical axis at `axisX`. Winding is renormalised when written. */
function mirrorShapes(shapes: readonly ISigilShape[], axisX: number): ISigilShape[] {
  return shapes.map((shape) => ({
    points: shape.points.map((p) => ({ x: 2 * axisX - p.x, y: p.y })),
    hole: shape.hole,
  }));
}

/* ---------------------------------------------------------------------------------------------- */
/* Tapered ribbons and crescent branches                                                           */
/* ---------------------------------------------------------------------------------------------- */

/**
 * Thickness of a ribbon at parameter `t`. The taper `(1 - t)^e` converges to a needle at `t = 1`. A
 * Gaussian bump centred at `SIGIL_JUNCTION_T` adds the junction swell, scaled by `swell`.
 */
export function sigilWidthProfile(t: number, baseWidth: number, swell: number): number {
  const clampedT = clampRange(t, 0, 1);
  const taper = Math.pow(1 - clampedT, SIGIL_TAPER_EXPONENT);
  const z = (clampedT - SIGIL_JUNCTION_T) / SIGIL_JUNCTION_SPREAD;
  const junctionBump = 1 + clampUnit(swell) * SIGIL_SWELL_GAIN * Math.exp(-0.5 * z * z);
  return baseWidth * taper * junctionBump;
}

/**
 * Builds a spine from `from` to `to`. The two inner control points sit one third and two thirds of the
 * way along the chord, and `bend` pushes them sideways so the vein curls like a C.
 */
export function curvedSpine(from: ISigilPoint, to: ISigilPoint, bend: number): ISigilSpine {
  const chord = subtract(to, from);
  const normal = { x: -chord.y, y: chord.x };
  const clampedBend = clampRange(bend, -1, 1);
  const offset = scale(normal, clampedBend * SIGIL_BEND_GAIN);
  const firstFraction = SIGIL_CONTROL_FRACTION;
  const secondFraction = 1 - SIGIL_CONTROL_FRACTION;
  return {
    p0: from,
    p1: add(lerp(from, to, firstFraction), scale(offset, SIGIL_BEND_LEAD)),
    p2: add(lerp(from, to, secondFraction), offset),
    p3: to,
  };
}

/** Closed outline of a ribbon along `spine`, left side forward and right side back. */
function ribbonPoints(spine: ISigilSpine, baseWidth: number, swell: number): ISigilPoint[] {
  const left: ISigilPoint[] = [];
  const right: ISigilPoint[] = [];
  for (let index = 0; index <= SIGIL_SPINE_SAMPLES; index++) {
    const t = index / SIGIL_SPINE_SAMPLES;
    const centre = cubicPoint(spine, t);
    const tangent = unit(cubicTangent(spine, t));
    const normal = { x: -tangent.y, y: tangent.x };
    const width = sigilWidthProfile(t, baseWidth, swell);
    const offset = scale(normal, width);
    left.push(add(centre, offset));
    right.push(subtract(centre, offset));
  }
  return [...left, ...right.reverse()];
}

/**
 * Evaluates a cubic Bezier spine `C(t)`, offsets its left and right contours by the normal scaled by
 * `w(t)`, and returns one closed filled path. The profile swells at the junction and converges to a
 * needle point at `t = 1`.
 */
export function buildTaperedRibbon(spine: ISigilSpine, options: ITaperedRibbonOptions): string {
  return shapesToPath([solid(ribbonPoints(spine, options.baseWidth, options.swell))]);
}

/** Parameter `t` at which a crescent armpit meets its thorn centreline. */
export const SIGIL_CRESCENT_WEB_T = 0.22;
/** Length of the armpit's reach along the parent vein, as a fraction of the thorn's chord. */
export const SIGIL_CRESCENT_WEB_LENGTH = 0.5;

/**
 * Shapes for one thorn: a tapered ribbon plus a concave armpit web. The web is a quadratic arc from a
 * point behind the junction on the parent vein to a point on the thorn. Its control point moves toward
 * the junction as `crescentDepth` grows, so the pocket curves inward and is never a sharp V.
 */
function crescentBranchShapes(options: ICrescentBranchOptions): ISigilShape[] {
  const chord = subtract(options.tip, options.junction);
  const spine = curvedSpine(options.junction, options.tip, options.bend);
  const ribbon = ribbonPoints(spine, options.baseWidth, options.swell);

  const webOffset = scale(unit(options.direction), -length(chord) * SIGIL_CRESCENT_WEB_LENGTH);
  const armpitStart = add(options.junction, webOffset);
  const armpitEnd = cubicPoint(spine, SIGIL_CRESCENT_WEB_T);
  const midpoint = lerp(armpitStart, armpitEnd, 0.5);
  const control = lerp(midpoint, options.junction, clampUnit(options.crescentDepth));
  const web = [armpitStart, ...quadraticSamples(armpitStart, control, armpitEnd), options.junction];

  return [solid(ribbon), solid(web)];
}

/** Builds a thorn branch with a concave crescent armpit as one SVG path. */
export function buildCrescentBranch(options: ICrescentBranchOptions): string {
  return shapesToPath(crescentBranchShapes(options));
}

/* ---------------------------------------------------------------------------------------------- */
/* Star eye and spear crest                                                                        */
/* ---------------------------------------------------------------------------------------------- */

/** Number of star tips. Four cardinal long rays plus four diagonal short rays make eight. */
export const SIGIL_STAR_TIP_COUNT = 8;
/** Length of diagonal rays as a fraction of the cardinal ray length. */
export const SIGIL_STAR_DIAGONAL_RATIO = 0.6;
/** Radius of the valleys between rays as a fraction of the outer radius. Keeps the rays needle-sharp. */
export const SIGIL_STAR_VALLEY_RATIO = 0.42;
/** Radius of the hollow eye as a fraction of the outer radius. Must stay under the valley ratio. */
export const SIGIL_STAR_HOLE_RATIO = 0.3;
/** Depth of the scalloped rim of the hollow eye, as a fraction of the eye radius. */
export const SIGIL_STAR_SCALLOP_DEPTH = 0.12;
/** Number of scallop lobes around the hollow eye. */
export const SIGIL_STAR_SCALLOP_LOBES = 8;
/** Points sampled around the hollow eye rim. */
export const SIGIL_STAR_HOLE_SAMPLES = 64;
/** Outer radius of the star eye at zero spike length, in user units. */
export const SIGIL_STAR_BASE_RADIUS = 44;
/** Growth of the star radius per unit of spike length. */
export const SIGIL_SPIKE_GAIN = 0.6;

function starEyeShapes(centre: ISigilPoint, radius: number): ISigilShape[] {
  const tipStep = SIGIL_FULL_TURN / SIGIL_STAR_TIP_COUNT;
  const outline: ISigilPoint[] = [];
  for (let index = 0; index < SIGIL_STAR_TIP_COUNT; index++) {
    const angle = index * tipStep;
    const isCardinal = index % 2 === 0;
    const tipRadius = isCardinal ? radius : radius * SIGIL_STAR_DIAGONAL_RATIO;
    outline.push(polar(centre, tipRadius, angle));
    outline.push(polar(centre, radius * SIGIL_STAR_VALLEY_RATIO, angle + tipStep / 2));
  }

  const eyeRadius = radius * SIGIL_STAR_HOLE_RATIO;
  const eye: ISigilPoint[] = [];
  for (let index = 0; index < SIGIL_STAR_HOLE_SAMPLES; index++) {
    const angle = (index * SIGIL_FULL_TURN) / SIGIL_STAR_HOLE_SAMPLES;
    const scallop = 1 + SIGIL_STAR_SCALLOP_DEPTH * Math.cos(SIGIL_STAR_SCALLOP_LOBES * angle);
    eye.push(polar(centre, eyeRadius * scallop, angle));
  }

  return [solid(outline), hole(eye)];
}

/**
 * Builds the hollow 8-point star eye from concept (6). Long cardinal needles alternate with shorter
 * diagonal rays, and a scalloped hole is cut through the centre.
 */
export function buildStarEyeSigil(centre: ISigilPoint, radius: number): string {
  return shapesToPath(starEyeShapes(centre, radius));
}

/** Share of the spear's width that its concave sides pull toward the centre. */
export const SIGIL_SPEAR_CONCAVITY = 0.45;

function spearShapes(centre: ISigilPoint, height: number, width: number): ISigilShape[] {
  const corners = [
    { x: centre.x, y: centre.y - height / 2 },
    { x: centre.x + width / 2, y: centre.y },
    { x: centre.x, y: centre.y + height / 2 },
    { x: centre.x - width / 2, y: centre.y },
  ];
  const outline: ISigilPoint[] = [];
  corners.forEach((from, index) => {
    const to = corners[(index + 1) % corners.length];
    const mid = lerp(from, to, 0.5);
    const control = lerp(mid, centre, SIGIL_SPEAR_CONCAVITY);
    outline.push(from, ...quadraticSamples(from, control, to));
  });
  return [solid(outline)];
}

/**
 * Builds the vertical diamond-spear axis from concept (7). Its four sides are concave arcs that pull
 * toward the centre, so the spine reads as a spear rather than a plain rhombus.
 */
export function buildSpearCrest(centre: ISigilPoint, height: number, width: number): string {
  return shapesToPath(spearShapes(centre, height, width));
}

/* ---------------------------------------------------------------------------------------------- */
/* Thorn placement shared by the archetype composers                                              */
/* ---------------------------------------------------------------------------------------------- */

/** First spine parameter at which a thorn may branch. Earlier values sit inside the star or spear. */
export const SIGIL_THORN_START_T = 0.2;
/** Last spine parameter at which a thorn may branch. Later values crowd the needle tip. */
export const SIGIL_THORN_END_T = 0.85;
/** Angle of a thorn away from its vein, in radians. */
export const SIGIL_THORN_ANGLE = 0.55;
/** Length of a thorn at zero spike length, in user units. */
export const SIGIL_THORN_BASE_LENGTH = 60;
/** Shrink of a thorn toward the needle tip. A thorn at `t = 1` is `1 - taper` of its root length. */
export const SIGIL_THORN_TAPER = 0.5;
/** Base width of a thorn's ribbon, in user units. */
export const SIGIL_THORN_BASE_WIDTH = 9;
/** Phase shift applied to the right wing per unit of asymmetry, in spine parameter units. */
export const SIGIL_ASYMMETRY_PHASE = 0.06;

/**
 * Places `thornCount` crescent thorns along `spine`. Thorns alternate sides so the wing reads as a
 * scythe. `phase` shifts every branch point, which gives the lopsided wing its organic offset.
 */
function thornShapes(
  spine: ISigilSpine,
  params: ISigilLabParams,
  phase: number,
  baseWidth: number,
): ISigilShape[] {
  const shapes: ISigilShape[] = [];
  const span = SIGIL_THORN_END_T - SIGIL_THORN_START_T;
  for (let index = 0; index < params.thornCount; index++) {
    const fraction = (index + 0.5) / params.thornCount;
    const t = clampRange(SIGIL_THORN_START_T + span * fraction + phase, 0, 1);
    const junction = cubicPoint(spine, t);
    const direction = cubicTangent(spine, t);
    const side = index % 2 === 0 ? 1 : -1;
    const outward = rotate(unit(direction), side * SIGIL_THORN_ANGLE);
    const thornLength =
      SIGIL_THORN_BASE_LENGTH *
      (1 + params.spikeLength * SIGIL_SPIKE_GAIN) *
      (1 - t * SIGIL_THORN_TAPER);
    shapes.push(
      ...crescentBranchShapes({
        junction,
        direction,
        tip: add(junction, scale(outward, thornLength)),
        baseWidth,
        swell: params.swell,
        bend: side * params.curvature,
        crescentDepth: params.crescentDepth,
      }),
    );
  }
  return shapes;
}

/* ---------------------------------------------------------------------------------------------- */
/* Archetype 1: asymmetric winged star (concept 6)                                                */
/* ---------------------------------------------------------------------------------------------- */

/** Horizontal reach of each wing from the centre, in user units. */
export const SIGIL_WING_REACH = 180;
/** Vertical lift of each wing at zero curvature, in user units. Curvature scales it. */
export const SIGIL_WING_LIFT = 70;
/** Extra reach given to the right wing per unit of asymmetry. */
export const SIGIL_ASYMMETRY_GAIN = 0.2;

/**
 * Archetype 1, targeting concept (6). A hollow star eye sits at the centre, with two sweeping C-curve
 * wings. The right wing is longer and lifted differently, so the pair is asymmetric.
 */
export function composeWingedStar(raw: ISigilLabParams): ISigilGeometry {
  const params = normalizeSigilParams(raw);
  const centre = SIGIL_CENTER;
  const starRadius = SIGIL_STAR_BASE_RADIUS * (1 + params.spikeLength * SIGIL_SPIKE_GAIN);
  const lift = SIGIL_WING_LIFT * (0.4 + params.curvature);
  const rightReach = SIGIL_WING_REACH * (1 + params.asymmetry * SIGIL_ASYMMETRY_GAIN);

  const leftSpine: ISigilSpine = {
    p0: { x: centre.x - starRadius * 0.6, y: centre.y },
    p1: { x: centre.x - SIGIL_WING_REACH * 0.4, y: centre.y - lift },
    p2: { x: centre.x - SIGIL_WING_REACH * 0.8, y: centre.y + lift * 0.5 },
    p3: { x: centre.x - SIGIL_WING_REACH, y: centre.y - lift * 0.8 },
  };
  const rightSpine: ISigilSpine = {
    p0: { x: centre.x + starRadius * 0.6, y: centre.y },
    p1: { x: centre.x + rightReach * 0.35, y: centre.y - lift * 1.2 },
    p2: { x: centre.x + rightReach * 0.75, y: centre.y - lift * 0.2 },
    p3: { x: centre.x + rightReach, y: centre.y + lift * 0.6 },
  };

  const shapes: ISigilShape[] = [
    ...starEyeShapes(centre, starRadius),
    solid(ribbonPoints(leftSpine, SIGIL_BASE_WIDTH, params.swell)),
    solid(ribbonPoints(rightSpine, SIGIL_BASE_WIDTH, params.swell)),
    ...thornShapes(leftSpine, params, 0, SIGIL_THORN_BASE_WIDTH),
    ...thornShapes(
      rightSpine,
      params,
      params.asymmetry * SIGIL_ASYMMETRY_PHASE,
      SIGIL_THORN_BASE_WIDTH,
    ),
  ];

  return { d: shapesToPath(shapes), width: SIGIL_VIEW_WIDTH, height: SIGIL_VIEW_HEIGHT };
}

/* ---------------------------------------------------------------------------------------------- */
/* Archetype 2: bilateral filigree crest (concept 7)                                              */
/* ---------------------------------------------------------------------------------------------- */

/** Height of the central spear at zero spike length, in user units. */
export const SIGIL_SPEAR_HEIGHT = 230;
/** Width of the central spear, in user units. */
export const SIGIL_SPEAR_WIDTH = 54;
/** Length of the hook barbs on the spear's sides, as a fraction of the spear width. */
export const SIGIL_BARB_REACH = 1.0;

/**
 * Archetype 2, targeting concept (7). A vertical diamond spear sits on the axis. Each side has an
 * upper and lower scythe wing with crescent thorns, mirrored across the axis. `asymmetry` is ignored
 * here on purpose, since this archetype is bilateral.
 */
export function composeFiligreeCrest(raw: ISigilLabParams): ISigilGeometry {
  const params = normalizeSigilParams(raw);
  const centre = SIGIL_CENTER;
  const spearHeight = SIGIL_SPEAR_HEIGHT * (0.9 + params.spikeLength * 0.2);
  const lift = SIGIL_WING_LIFT * (0.6 + params.curvature);

  const upperSpine: ISigilSpine = {
    p0: { x: centre.x - SIGIL_SPEAR_WIDTH / 2, y: centre.y - 28 },
    p1: { x: centre.x - 80, y: centre.y - lift * 1.2 },
    p2: { x: centre.x - 150, y: centre.y - lift * 0.4 },
    p3: { x: centre.x - 205, y: centre.y - lift * 1.1 },
  };
  const lowerSpine: ISigilSpine = {
    p0: { x: centre.x - SIGIL_SPEAR_WIDTH / 2, y: centre.y + 28 },
    p1: { x: centre.x - 80, y: centre.y + lift * 0.9 },
    p2: { x: centre.x - 150, y: centre.y + lift * 1.3 },
    p3: { x: centre.x - 200, y: centre.y + lift * 0.7 },
  };

  const leftWing: ISigilShape[] = [
    solid(ribbonPoints(upperSpine, SIGIL_BASE_WIDTH, params.swell)),
    solid(ribbonPoints(lowerSpine, SIGIL_BASE_WIDTH, params.swell)),
    ...thornShapes(upperSpine, params, 0, SIGIL_THORN_BASE_WIDTH),
    ...thornShapes(lowerSpine, params, 0, SIGIL_THORN_BASE_WIDTH),
  ];
  const rightWing = mirrorShapes(leftWing, centre.x);

  // Hook barbs sit on the spear's left side and are mirrored, so they stay bilateral.
  const barbReach = SIGIL_SPEAR_WIDTH * SIGIL_BARB_REACH;
  const barbJunction = { x: centre.x - SIGIL_SPEAR_WIDTH / 4, y: centre.y - spearHeight * 0.15 };
  const barbTip = {
    x: centre.x - (SIGIL_SPEAR_WIDTH / 4 + barbReach),
    y: centre.y - spearHeight * 0.3,
  };
  const leftBarbs = crescentBranchShapes({
    junction: barbJunction,
    direction: { x: -1, y: 0 },
    tip: barbTip,
    baseWidth: SIGIL_THORN_BASE_WIDTH,
    swell: params.swell,
    bend: params.curvature,
    crescentDepth: params.crescentDepth,
  });
  const barbs = [...leftBarbs, ...mirrorShapes(leftBarbs, centre.x)];

  const spear = spearShapes(centre, spearHeight, SIGIL_SPEAR_WIDTH);
  const shapes: ISigilShape[] = [...spear, ...leftWing, ...rightWing, ...barbs];

  return { d: shapesToPath(shapes), width: SIGIL_VIEW_WIDTH, height: SIGIL_VIEW_HEIGHT };
}

/* ---------------------------------------------------------------------------------------------- */
/* Archetype 3: flowing S-curve tendril (concept 1)                                               */
/* ---------------------------------------------------------------------------------------------- */

/** Base amplitude of the S-curve, in user units. Curvature adds `SIGIL_TENDRIL_CURVE_GAIN` on top. */
export const SIGIL_TENDRIL_AMPLITUDE = 50;
/** Extra amplitude per unit of curvature, in user units. */
export const SIGIL_TENDRIL_CURVE_GAIN = 50;
/** Base width of the tendril spine, in user units. Thicker than a thorn, thinner than the wing veins. */
export const SIGIL_TENDRIL_WIDTH = 16;
/** Spine parameter at which the tendril forks into two needle tips. */
export const SIGIL_FORK_T = 0.82;
/** Base width of each fork tine, in user units. */
export const SIGIL_FORK_WIDTH = 9;
/** Vertical spread between the two fork tines at the tip, in user units. */
export const SIGIL_FORK_SPREAD = 22;

/**
 * Archetype 3, targeting concept (1). An S-curve spine runs across the canvas. Opposing crescent hooks
 * alternate sides along it, and the tail forks into two needle tips.
 */
export function composeTendrilSCurve(raw: ISigilLabParams): ISigilGeometry {
  const params = normalizeSigilParams(raw);
  const centre = SIGIL_CENTER;
  const amplitude = SIGIL_TENDRIL_AMPLITUDE + params.curvature * SIGIL_TENDRIL_CURVE_GAIN;
  const tailShift = params.asymmetry * SIGIL_WING_LIFT;

  const spine: ISigilSpine = {
    p0: { x: 30, y: centre.y + 20 },
    p1: { x: 150, y: centre.y - amplitude },
    p2: { x: 330, y: centre.y + amplitude },
    p3: { x: 450, y: centre.y - 10 + tailShift },
  };

  const forkStart = cubicPoint(spine, SIGIL_FORK_T);
  const forkReach =
    SIGIL_FORK_SPREAD + params.spikeLength * SIGIL_SPIKE_GAIN * SIGIL_THORN_BASE_LENGTH;
  const tineUpper = curvedSpine(forkStart, spine.p3, params.curvature * 0.15);
  const tineLower = curvedSpine(
    forkStart,
    { x: spine.p3.x + forkReach * 0.3, y: spine.p3.y + SIGIL_FORK_SPREAD },
    -params.curvature * 0.15,
  );

  const shapes: ISigilShape[] = [
    solid(ribbonPoints(spine, SIGIL_TENDRIL_WIDTH, params.swell)),
    solid(ribbonPoints(tineUpper, SIGIL_FORK_WIDTH, params.swell)),
    solid(ribbonPoints(tineLower, SIGIL_FORK_WIDTH, params.swell)),
    ...thornShapes(spine, params, 0, SIGIL_THORN_BASE_WIDTH),
  ];

  return { d: shapesToPath(shapes), width: SIGIL_VIEW_WIDTH, height: SIGIL_VIEW_HEIGHT };
}

/* ---------------------------------------------------------------------------------------------- */
/* Archetype 4: modular UI join                                                                    */
/* ---------------------------------------------------------------------------------------------- */

/** Height of a modular join, in user units. Fixed, so only its width stretches. */
export const SIGIL_JOIN_HEIGHT = 56;
/** Width of each fixed thorn cap, in user units. Caps never stretch with the rail. */
export const SIGIL_JOIN_CAP_WIDTH = 56;
/** Thickness of the stretchable vein rail, in user units. */
export const SIGIL_JOIN_RAIL_THICKNESS = 4;
/** Outer radius of the centre star sigil at zero spike length, in user units. */
export const SIGIL_JOIN_STAR_RADIUS = 16;
/** Smallest join width that still fits two caps and the centre star. */
export const SIGIL_JOIN_MIN_WIDTH = 160;
/** How far a cap thorn reaches toward the join's outer edge, in user units. */
export const SIGIL_JOIN_CAP_TIP_INSET = 4;
/** How far a cap thorn rises from the centre line, as a fraction of the cap width. */
export const SIGIL_JOIN_CAP_RISE = 0.45;

/** Fixed-size left cap, drawn in local coordinates `x in [0, SIGIL_JOIN_CAP_WIDTH]`. */
function joinCapShapes(params: ISigilLabParams, centreY: number): ISigilShape[] {
  const edge = { x: SIGIL_JOIN_CAP_WIDTH, y: centreY };
  const upperTip = {
    x: SIGIL_JOIN_CAP_TIP_INSET,
    y: centreY - SIGIL_JOIN_CAP_WIDTH * SIGIL_JOIN_CAP_RISE,
  };
  const lowerTip = {
    x: SIGIL_JOIN_CAP_TIP_INSET,
    y: centreY + SIGIL_JOIN_CAP_WIDTH * SIGIL_JOIN_CAP_RISE,
  };
  const upper = curvedSpine(edge, upperTip, params.curvature);
  const lower = curvedSpine(edge, lowerTip, -params.curvature);
  const armpit = lerp(edge, { x: SIGIL_JOIN_CAP_TIP_INSET, y: centreY }, 0.5);
  return [
    solid(ribbonPoints(upper, SIGIL_THORN_BASE_WIDTH, params.swell)),
    solid(ribbonPoints(lower, SIGIL_THORN_BASE_WIDTH, params.swell)),
    ...crescentBranchShapes({
      junction: armpit,
      direction: { x: 1, y: 0 },
      tip: upperTip,
      baseWidth: SIGIL_THORN_BASE_WIDTH,
      swell: params.swell,
      bend: params.curvature,
      crescentDepth: params.crescentDepth,
    }),
  ];
}

/**
 * Archetype 4, the modular UI join: `[Left Thorn Cap] + [Stretchable Vein Rail] + [Centre Star] +
 * [Right Thorn Cap]`. Caps are fixed-size and only the rail stretches, so thorns keep their shape
 * across widths. The result returns each part separately so tests can compare them across widths.
 */
export function composeModularUiJoin(raw: ISigilLabParams, railWidth: number): ISigilJoinGeometry {
  const params = normalizeSigilParams(raw);
  const width = Math.max(railWidth, SIGIL_JOIN_MIN_WIDTH);
  const height = SIGIL_JOIN_HEIGHT;
  const centreY = height / 2;
  const centre = { x: width / 2, y: centreY };
  const starRadius = SIGIL_JOIN_STAR_RADIUS * (1 + params.spikeLength * SIGIL_SPIKE_GAIN);

  const leftCap = joinCapShapes(params, centreY);
  const rightCap = mirrorShapes(leftCap, centre.x);
  const railHalf = SIGIL_JOIN_RAIL_THICKNESS / 2;
  const rail = solid([
    { x: SIGIL_JOIN_CAP_WIDTH, y: centreY - railHalf },
    { x: width - SIGIL_JOIN_CAP_WIDTH, y: centreY - railHalf },
    { x: width - SIGIL_JOIN_CAP_WIDTH, y: centreY + railHalf },
    { x: SIGIL_JOIN_CAP_WIDTH, y: centreY + railHalf },
  ]);
  const star = starEyeShapes(centre, starRadius);

  const parts = {
    leftCap: shapesToPath(leftCap),
    rail: shapesToPath([rail]),
    center: shapesToPath(star),
    rightCap: shapesToPath(rightCap),
  };
  return {
    d: parts.leftCap + parts.rail + parts.center + parts.rightCap,
    width,
    height,
    parts,
  };
}
