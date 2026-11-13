/**
 * Calligraphic blade engine for procedural cybersigils (prototype, Spike 09e).
 *
 * Purpose: replace stamped thorns and SDF blobs with the one atom the references are really made
 * of: the *blade*, a curved stroke that runs hairline, belly, hairline, with a curl that tightens
 * toward a hooked tip. Children leave their parent nearly tangent, curl the opposite way and flare
 * at the root, so junctions get their concave fillet without any distance field.
 *
 * Value: tips are exact (the outline converges on the spine end, so nothing rounds them off), and
 * seeds change *structure* (how many branches, where, which way they curl, what symmetry) instead
 * of only jittering coordinates. Each seed generates several candidates and keeps the best-scoring
 * one, so weak layouts are filtered out rather than shipped.
 *
 * Rendering: every blade becomes one closed polygon with the same winding. They are emitted into a
 * single `d` string filled with `nonzero`, so overlapping blades union visually for free and the
 * chrome filter sees one connected alpha silhouette.
 */

import { createSigilRng, type ISigilRng } from './sigil-rng';

/** A 2D point in sigil space. */
export interface IBladePoint {
  readonly x: number;
  readonly y: number;
}

/** One sample along a blade spine. */
interface IBladeSample {
  readonly x: number;
  readonly y: number;
  /** Heading in radians. */
  readonly heading: number;
  /** Full stroke width at this sample. */
  readonly width: number;
}

/** Parameters for one calligraphic blade. */
export interface IBladeSpec {
  /** Root position. */
  readonly x: number;
  readonly y: number;
  /** Root heading in radians. */
  readonly heading: number;
  /** Arc length of the spine. */
  readonly length: number;
  /** Peak full width at the belly. */
  readonly width: number;
  /** Turning (radians) spread evenly along the spine; opposite sign to `hookTurn` makes an S. */
  readonly baseTurn: number;
  /** Extra turning concentrated toward the tip, which produces the hooked end. */
  readonly hookTurn: number;
  /** Belly position along the blade in `[0, 1]`. */
  readonly bellyT: number;
  /** Width at the root as a fraction of `width`; `0` gives a needle root. */
  readonly rootFraction: number;
  /** Extra root width that decays quickly, producing the concave junction fillet. */
  readonly rootFlare: number;
  /** How much the belly bulges to the convex side, in `[-0.5, 0.5]`. */
  readonly edgeBias: number;
}

/** A generated blade, kept for debugging overlays and scoring. */
export interface IBlade {
  readonly spec: IBladeSpec;
  readonly samples: readonly IBladeSample[];
  readonly outline: readonly IBladePoint[];
  readonly depth: number;
}

/** Symmetry archetypes a seed can pick. */
export type BladeSigilLayout = 'crest' | 'wingspan' | 'runner' | 'starburst';

/** Every layout, in the order the seed picker weights them. */
export const BLADE_SIGIL_LAYOUTS: readonly BladeSigilLayout[] = [
  'crest',
  'wingspan',
  'runner',
  'starburst',
];

/** Options for generating one sigil. */
export interface IBladeSigilOptions {
  readonly seed: number;
  /** Output box width. */
  readonly width: number;
  /** Output box height. */
  readonly height: number;
  /** Force a layout; omit to let the seed pick. */
  readonly layout?: BladeSigilLayout;
  /** Candidates generated per seed; the best score wins. */
  readonly candidates?: number;
  /** Multiplies every stroke width; `1` matches the references. */
  readonly weight?: number;
}

/** Generated sigil ready for an SVG `<path>`. */
export interface IBladeSigil {
  readonly d: string;
  /** Thin spine strokes, useful as a ridge highlight or debug overlay. */
  readonly spineD: string;
  readonly blades: readonly IBlade[];
  readonly layout: BladeSigilLayout;
  readonly score: number;
  readonly viewBox: string;
}

/** Spine samples per blade; enough for smooth hooks at UI sizes without heavy `d` strings. */
const BLADE_SAMPLES = 36;
/** Exponent of the rising edge from root to belly. */
const BLADE_RISE_EXPONENT = 0.7;
/** Exponent of the falling edge from belly to tip; above 1 gives the long hairline tail. */
const BLADE_FALL_EXPONENT = 1.2;
/** Decay length (in `t`) of the root flare. Small means a tight, crisp fillet. */
const BLADE_FLARE_DECAY = 0.07;
/** How far a child root is pushed back inside its parent, as a fraction of parent width. */
const CHILD_ROOT_INSET = 0.35;
/** Fraction of a child's length ignored for collision so it can leave its parent. */
const CHILD_COLLISION_GRACE = 0.3;
/** Child belly width per unit of its length, so short barbs keep a calligraphic body. */
const CHILD_WIDTH_PER_LENGTH = 0.13;
/** Probability that a long blade sprouts a rejoining loop (teardrop pocket). */
const LOOP_CHANCE = 0.4;
/** Loop width at its middle as a fraction of its merge thickness. */
const LOOP_WAIST = 0.32;
/** Shape of the loop's thinning toward its middle; below 1 keeps the merges fat. */
const LOOP_PINCH_EXPONENT = 0.8;
/** Runners span twice the work scale, so their spine needs extra width to read at the same weight. */
const RUNNER_WEIGHT_BOOST = 1.35;
/** Minimum gap between strokes as a fraction of the sigil's main width. */
const CLEARANCE_FRACTION = 0.55;
/** Spatial-hash cell size for collision checks. */
const HASH_CELL = 10;
/** Deepest recursion level (0 is the primary blade). */
const MAX_DEPTH = 3;
/** Attempts to place each child before giving up on it. */
const CHILD_ATTEMPTS = 5;
/** Default candidates per seed. */
const DEFAULT_CANDIDATES = 10;
/** Working-space scale; layouts are built in this space then fitted to the output box. */
const WORK_SCALE = 200;
/** Padding around the fitted sigil, as a fraction of the box. */
const FIT_PADDING = 0.04;
/** Occupancy grid columns used to score coverage. */
const SCORE_COLS = 12;
/** Occupancy grid rows used to score coverage. */
const SCORE_ROWS = 6;
/** Number of decimals in emitted path coordinates. */
const PATH_DECIMALS = 2;

/** Builds the full width at `t` for a blade, including the root flare. */
function bladeWidthAt(spec: IBladeSpec, t: number): number {
  const belly = Math.min(0.9, Math.max(0.08, spec.bellyT));
  let shape: number;
  if (t <= belly) {
    const u = t / belly;
    shape =
      spec.rootFraction +
      (1 - spec.rootFraction) * Math.pow(Math.sin((u * Math.PI) / 2), BLADE_RISE_EXPONENT);
  } else {
    const u = (t - belly) / (1 - belly);
    shape = Math.pow(Math.cos((u * Math.PI) / 2), BLADE_FALL_EXPONENT);
  }
  const flare = spec.rootFlare * Math.exp(-t / BLADE_FLARE_DECAY);
  return Math.max(0, spec.width * shape + spec.width * flare);
}

/**
 * Integrates the spine from curvature, so turning is smooth and the hook tightens toward the tip.
 * Curvature is `(baseTurn + 3 hookTurn t^2) / length`, which integrates to `baseTurn + hookTurn`.
 */
export function buildBlade(spec: IBladeSpec, depth = 0): IBlade {
  const samples: IBladeSample[] = [];
  const ds = spec.length / BLADE_SAMPLES;
  let x = spec.x;
  let y = spec.y;
  let heading = spec.heading;
  for (let i = 0; i <= BLADE_SAMPLES; i++) {
    const t = i / BLADE_SAMPLES;
    samples.push({ x, y, heading, width: bladeWidthAt(spec, t) });
    // Curvature sampled at the step midpoint, so total turning matches the spec.
    const tm = (i + 0.5) / BLADE_SAMPLES;
    const kappa = (spec.baseTurn + 3 * spec.hookTurn * tm * tm) / spec.length;
    // Midpoint integration keeps long hooks from drifting.
    const mid = heading + (kappa * ds) / 2;
    x += Math.cos(mid) * ds;
    y += Math.sin(mid) * ds;
    heading += kappa * ds;
  }
  return { spec, samples, outline: outlineFromSamples(samples, spec), depth };
}

/**
 * Offsets the spine to both sides. The convex side (away from the hook) takes more of the width,
 * which is what gives the references their "one edge taut, one edge swelling" calligraphy.
 */
function outlineFromSamples(samples: readonly IBladeSample[], spec: IBladeSpec): IBladePoint[] {
  const curlSign = Math.sign(spec.baseTurn + spec.hookTurn) || 1;
  const bias = Math.max(-0.5, Math.min(0.5, spec.edgeBias)) * curlSign;
  const left: IBladePoint[] = [];
  const right: IBladePoint[] = [];
  for (const s of samples) {
    const nx = -Math.sin(s.heading);
    const ny = Math.cos(s.heading);
    // Positive normal points to the left of travel; a positive curl turns left.
    const wl = s.width * (0.5 - bias * 0.5);
    const wr = s.width * (0.5 + bias * 0.5);
    left.push({ x: s.x + nx * wl, y: s.y + ny * wl });
    right.push({ x: s.x - nx * wr, y: s.y - ny * wr });
  }
  const points = [...left, ...right.reverse()];
  return signedArea(points) < 0 ? points.reverse() : points;
}

/** Shoelace signed area; used to give every polygon the same winding. */
function signedArea(points: readonly IBladePoint[]): number {
  let area = 0;
  for (let i = 0; i < points.length; i++) {
    const a = points[i];
    const b = points[(i + 1) % points.length];
    area += a.x * b.y - b.x * a.y;
  }
  return area / 2;
}

/** Spatial hash of sampled stroke discs for clearance checks. */
class StrokeHash {
  private readonly cells = new Map<string, { x: number; y: number; r: number; owner: number }[]>();

  add(blade: IBlade, owner: number): void {
    for (const s of blade.samples) {
      const key = this.key(s.x, s.y);
      let bucket = this.cells.get(key);
      if (!bucket) {
        bucket = [];
        this.cells.set(key, bucket);
      }
      bucket.push({ x: s.x, y: s.y, r: s.width / 2, owner });
    }
  }

  /** Returns `true` if any sample of `blade` past the grace zone is too close to existing strokes. */
  collides(
    blade: IBlade,
    clearance: number,
    ignoreOwner: number,
    mirrorAxisX: number | null,
  ): boolean {
    const grace = Math.floor(blade.samples.length * CHILD_COLLISION_GRACE);
    for (let i = grace; i < blade.samples.length; i++) {
      const s = blade.samples[i];
      if (mirrorAxisX !== null && s.x - s.width / 2 < mirrorAxisX + clearance) return true;
      const cx = Math.floor(s.x / HASH_CELL);
      const cy = Math.floor(s.y / HASH_CELL);
      const reach = Math.ceil((clearance + s.width) / HASH_CELL) + 1;
      for (let gx = cx - reach; gx <= cx + reach; gx++) {
        for (let gy = cy - reach; gy <= cy + reach; gy++) {
          const bucket = this.cells.get(`${gx},${gy}`);
          if (!bucket) continue;
          for (const o of bucket) {
            if (o.owner === ignoreOwner) continue;
            const d = Math.hypot(o.x - s.x, o.y - s.y);
            if (d < o.r + s.width / 2 + clearance) return true;
          }
        }
      }
    }
    return false;
  }

  private key(x: number, y: number): string {
    return `${Math.floor(x / HASH_CELL)},${Math.floor(y / HASH_CELL)}`;
  }
}

/** Shared state while growing one candidate. */
interface IGrowth {
  readonly rng: ISigilRng;
  readonly blades: IBlade[];
  readonly hash: StrokeHash;
  readonly clearance: number;
  /** Blades must stay right of this x (mirrored layouts); `null` for asymmetric ones. */
  readonly axisX: number | null;
  readonly weight: number;
}

/** Adds a blade if it fits, returning its owner index or `-1`. */
function place(growth: IGrowth, blade: IBlade, ignoreOwner: number, checkAxis: boolean): number {
  if (growth.hash.collides(blade, growth.clearance, ignoreOwner, checkAxis ? growth.axisX : null)) {
    return -1;
  }
  const owner = growth.blades.length;
  growth.blades.push(blade);
  growth.hash.add(blade, owner);
  return owner;
}

/**
 * Builds a rejoining loop: a stroke that leaves the parent at `ta`, bows out to one side and merges
 * back at `tb`. The enclosed teardrop of negative space is the "pocket" seen throughout the
 * references. Width is thick at both merge points and thins in the middle.
 */
function buildLoop(
  parent: IBlade,
  ta: number,
  tb: number,
  side: number,
  bulge: number,
  thickness: number,
): IBlade {
  const last = parent.samples.length - 1;
  const a = parent.samples[Math.round(ta * last)];
  const b = parent.samples[Math.round(tb * last)];
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const span = Math.hypot(dx, dy) || 1;
  const nx = (-dy / span) * side;
  const ny = (dx / span) * side;
  // Cubic with tangents leaving the parent at a shallow angle, so both merges are fillets.
  const c1 = { x: a.x + dx * 0.15 + nx * span * bulge, y: a.y + dy * 0.15 + ny * span * bulge };
  const c2 = { x: a.x + dx * 0.85 + nx * span * bulge, y: a.y + dy * 0.85 + ny * span * bulge };
  const samples: IBladeSample[] = [];
  for (let i = 0; i <= BLADE_SAMPLES; i++) {
    const t = i / BLADE_SAMPLES;
    const u = 1 - t;
    const x = u * u * u * a.x + 3 * u * u * t * c1.x + 3 * u * t * t * c2.x + t * t * t * b.x;
    const y = u * u * u * a.y + 3 * u * u * t * c1.y + 3 * u * t * t * c2.y + t * t * t * b.y;
    const tx = 3 * u * u * (c1.x - a.x) + 6 * u * t * (c2.x - c1.x) + 3 * t * t * (b.x - c2.x);
    const ty = 3 * u * u * (c1.y - a.y) + 6 * u * t * (c2.y - c1.y) + 3 * t * t * (b.y - c2.y);
    const pinch = Math.pow(Math.abs(2 * t - 1), LOOP_PINCH_EXPONENT);
    const width = thickness * (LOOP_WAIST + (1 - LOOP_WAIST) * pinch);
    samples.push({ x, y, heading: Math.atan2(ty, tx), width });
  }
  const spec: IBladeSpec = {
    x: a.x,
    y: a.y,
    heading: samples[0].heading,
    length: span,
    width: thickness,
    baseTurn: side,
    hookTurn: 0,
    bellyT: 0.5,
    rootFraction: 1,
    rootFlare: 0,
    edgeBias: 0,
  };
  return { spec, samples, outline: outlineFromSamples(samples, spec), depth: parent.depth + 1 };
}

/** Collision proxy for a loop: only its middle, since both ends intentionally touch the parent. */
function loopMiddle(loop: IBlade): IBlade {
  const n = loop.samples.length;
  const samples = loop.samples.slice(Math.floor(n * 0.2), Math.ceil(n * 0.8));
  return { ...loop, samples };
}

/**
 * Grows children off `parent`: 1 to 3 nodes at stratified positions, alternating sides, each child
 * leaving nearly tangent and counter-curling. Deeper levels get shorter and more barb-like.
 */
function growChildren(growth: IGrowth, parent: IBlade, owner: number): void {
  const { rng } = growth;
  const depth = parent.depth + 1;
  if (depth > MAX_DEPTH) return;
  const spec = parent.spec;
  const nodeCount = depth === 1 ? rng.int(1, 3) : depth === 2 ? rng.int(0, 2) : rng.int(0, 1);
  if (depth <= 2 && spec.length > WORK_SCALE * 0.35 && rng.chance(LOOP_CHANCE)) {
    const ta = rng.range(0.12, 0.4);
    const tb = Math.min(0.85, ta + rng.range(0.22, 0.38));
    const loopSide = rng.chance() ? 1 : -1;
    const thickness =
      parent.samples[Math.round(ta * (parent.samples.length - 1))].width * rng.range(0.55, 0.8);
    const loop = buildLoop(parent, ta, tb, loopSide, rng.range(0.22, 0.42), thickness);
    const probe = loopMiddle(loop);
    if (
      !growth.hash.collides(
        { ...probe, samples: probe.samples },
        growth.clearance,
        owner,
        growth.axisX,
      )
    ) {
      const loopOwner = growth.blades.length;
      growth.blades.push(loop);
      growth.hash.add(loop, loopOwner);
    }
  }
  if (nodeCount === 0) return;
  const parentCurl = Math.sign(spec.baseTurn + spec.hookTurn) || 1;
  let side = rng.chance() ? 1 : -1;
  const positions: number[] = [];
  for (let i = 0; i < nodeCount; i++) {
    positions.push(0.18 + ((i + rng.range(0.15, 0.85)) / nodeCount) * 0.62);
  }
  for (const t of positions) {
    const index = Math.round(t * (parent.samples.length - 1));
    const s = parent.samples[index];
    // Prefer the convex side early so branches fan outward, then alternate.
    for (let attempt = 0; attempt < CHILD_ATTEMPTS; attempt++) {
      const spread = rng.range(0.3, depth === 1 ? 0.7 : 0.9);
      const heading = s.heading + side * spread;
      const lengthScale =
        depth === 1
          ? rng.range(0.5, 0.85)
          : depth === 2
            ? rng.range(0.3, 0.55)
            : rng.range(0.18, 0.3);
      const length = spec.length * lengthScale * (1 - t * 0.35);
      // Counter-curl most of the time: the child hooks back toward the parent's tip.
      const curl = rng.chance(0.55) ? side : -side;
      const insetX = Math.cos(s.heading + Math.PI) * s.width * CHILD_ROOT_INSET;
      const insetY = Math.sin(s.heading + Math.PI) * s.width * CHILD_ROOT_INSET;
      const childSpec: IBladeSpec = {
        x: s.x + insetX,
        y: s.y + insetY,
        heading,
        length,
        width: Math.min(
          s.width * 0.95,
          Math.max(length * CHILD_WIDTH_PER_LENGTH, s.width * rng.range(0.6, 0.9)),
        ),
        baseTurn: curl * rng.range(-0.3, 0.7),
        hookTurn: curl * rng.range(depth === 1 ? 1.6 : 1.8, depth === 1 ? 3 : 3.4),
        bellyT: rng.range(0.12, 0.3),
        rootFraction: rng.range(0.55, 0.8),
        rootFlare: rng.range(0.35, 0.7),
        edgeBias: rng.range(0.1, 0.45),
      };
      const child = buildBlade(childSpec, depth);
      const childOwner = place(growth, child, owner, true);
      if (childOwner >= 0) {
        growChildren(growth, child, childOwner);
        break;
      }
      // Retry with a tighter spread and shorter length.
      if (attempt === CHILD_ATTEMPTS - 2) side = -side;
    }
    side = -side;
    void parentCurl;
  }
}

/** Random primary blade spec rooted at `(x, y)`. */
function primarySpec(
  rng: ISigilRng,
  x: number,
  y: number,
  heading: number,
  length: number,
  weight: number,
  curl: number,
): IBladeSpec {
  return {
    x,
    y,
    heading,
    length,
    width: WORK_SCALE * rng.range(0.07, 0.1) * weight,
    baseTurn: -curl * rng.range(0, 0.7),
    hookTurn: curl * rng.range(0.9, 2),
    bellyT: rng.range(0.18, 0.4),
    rootFraction: rng.range(0.35, 0.7),
    rootFlare: rng.range(0.1, 0.4),
    edgeBias: rng.range(0.05, 0.35),
  };
}

/** Vertical double-ended spear on the axis, shared by mirrored layouts. */
function axisSpear(growth: IGrowth, cx: number, cy: number, up: number, down: number): void {
  const { rng, weight } = growth;
  const w = WORK_SCALE * rng.range(0.045, 0.07) * weight;
  const make = (heading: number, length: number): IBladeSpec => ({
    x: cx,
    y: cy,
    heading,
    length,
    width: w,
    baseTurn: 0,
    hookTurn: 0,
    bellyT: rng.range(0.2, 0.45),
    rootFraction: 0.9,
    rootFlare: 0,
    edgeBias: 0,
  });
  if (up > 0) place(growth, buildBlade(make(-Math.PI / 2, up)), -2, false);
  if (down > 0) place(growth, buildBlade(make(Math.PI / 2, down)), -2, false);
}

/** Lays out primaries for one candidate. Mirrored layouts only grow the right half. */
function growLayout(growth: IGrowth, layout: BladeSigilLayout): void {
  const { rng, weight } = growth;
  const S = WORK_SCALE;
  switch (layout) {
    case 'crest': {
      // Concept (7): bilateral, upswept wings off a central spear.
      axisSpear(growth, 0, 0, S * rng.range(0.25, 0.45), S * rng.range(0.35, 0.6));
      const count = rng.int(2, 3);
      for (let i = 0; i < count; i++) {
        const y = S * (-0.12 + i * rng.range(0.1, 0.16));
        const heading = rng.range(-0.9, -0.2) + i * rng.range(0.15, 0.4);
        const spec = primarySpec(
          rng,
          S * 0.02,
          y,
          heading,
          S * rng.range(0.6, 0.95) * (1 - i * 0.2),
          weight,
          rng.chance(0.6) ? -1 : 1,
        );
        const owner = place(growth, buildBlade(spec), -2, false);
        if (owner >= 0) growChildren(growth, growth.blades[owner], owner);
      }
      break;
    }
    case 'wingspan': {
      // Concept (6): wide horizontal wings, a focal star on the axis.
      const count = rng.int(2, 3);
      for (let i = 0; i < count; i++) {
        const heading = rng.range(-0.5, 0.35) + (i - 1) * rng.range(0.3, 0.55);
        const spec = primarySpec(
          rng,
          -S * 0.03,
          S * (i - 1) * 0.05,
          heading,
          S * rng.range(0.75, 1.05),
          weight,
          i % 2 === 0 ? -1 : 1,
        );
        const owner = place(growth, buildBlade(spec), -2, false);
        if (owner >= 0) growChildren(growth, growth.blades[owner], owner);
      }
      axisSpear(growth, 0, 0, S * rng.range(0.12, 0.25), S * rng.range(0.12, 0.3));
      break;
    }
    case 'starburst': {
      // A radial focal mark: short spikes around a centre, then long curls.
      const spikes = rng.int(3, 5);
      for (let i = 0; i < spikes; i++) {
        const heading = -Math.PI / 2 + (i / (spikes - 1)) * Math.PI * rng.range(0.85, 1);
        const length = S * (i % 2 === 0 ? rng.range(0.3, 0.45) : rng.range(0.15, 0.25));
        const spec: IBladeSpec = {
          ...primarySpec(rng, S * 0.02, 0, heading, length, weight, 1),
          baseTurn: 0,
          hookTurn: rng.range(-0.15, 0.15),
          bellyT: 0.08,
          rootFraction: 0.95,
          width: length * 0.16 * weight,
        };
        place(growth, buildBlade(spec), -2, false);
      }
      const curls = rng.int(1, 2);
      for (let i = 0; i < curls; i++) {
        const spec = primarySpec(
          rng,
          S * 0.05,
          S * (i ? -0.08 : 0.08),
          (i ? -0.25 : 0.35) + rng.range(-0.2, 0.2),
          S * rng.range(0.7, 0.95),
          weight,
          i ? 1 : -1,
        );
        const owner = place(growth, buildBlade(spec), -2, false);
        if (owner >= 0) growChildren(growth, growth.blades[owner], owner);
      }
      break;
    }
    case 'runner': {
      // Concept (1): one long asymmetric S spine with nodes; no mirroring.
      const runnerCurl = rng.chance() ? 1 : -1;
      const spec: IBladeSpec = {
        ...primarySpec(
          rng,
          -S,
          rng.range(-0.15, 0.15) * S,
          rng.range(-0.5, 0.2),
          S * rng.range(1.7, 2.1),
          weight,
          runnerCurl,
        ),
        // A true S: the body bends one way, the hook the other.
        baseTurn: -runnerCurl * rng.range(0.7, 1.3),
        hookTurn: runnerCurl * rng.range(1.3, 2.3),
        width: WORK_SCALE * rng.range(0.07, 0.1) * weight * RUNNER_WEIGHT_BOOST,
        rootFraction: 0,
        bellyT: rng.range(0.35, 0.55),
      };
      const owner = place(growth, buildBlade(spec), -2, false);
      if (owner >= 0) growChildren(growth, growth.blades[owner], owner);
      break;
    }
  }
}

/** Whether a layout is mirrored about `x = 0`. */
function isMirrored(layout: BladeSigilLayout): boolean {
  return layout !== 'runner';
}

/** Mirrors a blade outline about `x = 0`, keeping the winding consistent. */
function mirrorPoints(points: readonly IBladePoint[]): IBladePoint[] {
  return points.map((p) => ({ x: -p.x, y: p.y })).reverse();
}

/** Bounding box of all outline points. */
function bounds(polys: readonly (readonly IBladePoint[])[]): {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
} {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const poly of polys) {
    for (const p of poly) {
      if (p.x < minX) minX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.x > maxX) maxX = p.x;
      if (p.y > maxY) maxY = p.y;
    }
  }
  return { minX, minY, maxX, maxY };
}

/**
 * Scores a candidate: how evenly strokes cover the target box (occupancy of a coarse grid), how
 * close the aspect ratio is to the box, and whether there is enough structure to be interesting.
 */
function scoreCandidate(
  polys: readonly (readonly IBladePoint[])[],
  bladeCount: number,
  aspect: number,
): number {
  const b = bounds(polys);
  const w = b.maxX - b.minX;
  const h = b.maxY - b.minY;
  if (!(w > 0 && h > 0)) return -Infinity;
  const occupied = new Set<number>();
  for (const poly of polys) {
    for (const p of poly) {
      const cx = Math.min(SCORE_COLS - 1, Math.floor(((p.x - b.minX) / w) * SCORE_COLS));
      const cy = Math.min(SCORE_ROWS - 1, Math.floor(((p.y - b.minY) / h) * SCORE_ROWS));
      occupied.add(cy * SCORE_COLS + cx);
    }
  }
  const coverage = occupied.size / (SCORE_COLS * SCORE_ROWS);
  const aspectPenalty = Math.abs(Math.log(w / h / aspect));
  const structure = Math.min(1, bladeCount / 14);
  return coverage * 1.4 + structure * 0.6 - aspectPenalty * 0.8;
}

/** Formats a number for path output. */
function fmt(n: number): string {
  return Number(n.toFixed(PATH_DECIMALS)).toString();
}

/** Closed polygon to path data. */
function polyToD(points: readonly IBladePoint[]): string {
  let d = `M${fmt(points[0].x)} ${fmt(points[0].y)}`;
  for (let i = 1; i < points.length; i++) d += `L${fmt(points[i].x)} ${fmt(points[i].y)}`;
  return `${d}Z`;
}

/**
 * Generates one seeded cybersigil fitted to `width × height`.
 *
 * The seed picks a layout (unless forced), then `candidates` independent growths run on forked
 * streams and the best-scoring one is emitted. Same seed, same output.
 */
export function generateBladeSigil(options: IBladeSigilOptions): IBladeSigil {
  const rng = createSigilRng(options.seed);
  const layout = options.layout ?? rng.pick(BLADE_SIGIL_LAYOUTS);
  const weight = options.weight ?? 1;
  const aspect = options.width / options.height;
  const candidateCount = options.candidates ?? DEFAULT_CANDIDATES;
  let best: { polys: IBladePoint[][]; blades: IBlade[]; score: number } | null = null;

  for (let c = 0; c < candidateCount; c++) {
    const crng = rng.fork(`candidate-${c}`);
    const growth: IGrowth = {
      rng: crng,
      blades: [],
      hash: new StrokeHash(),
      clearance: WORK_SCALE * 0.1 * CLEARANCE_FRACTION * weight * 0.5,
      axisX: isMirrored(layout) ? 0 : null,
      weight,
    };
    growLayout(growth, layout);
    const polys: IBladePoint[][] = growth.blades.map((b) => [...b.outline]);
    if (isMirrored(layout)) {
      for (const b of growth.blades) polys.push(mirrorPoints(b.outline));
    }
    const score = scoreCandidate(polys, growth.blades.length, aspect);
    if (!best || score > best.score) best = { polys, blades: growth.blades, score };
  }

  const chosen = best!;
  // Fit into the box, keeping proportions.
  const b = bounds(chosen.polys);
  const pad = Math.min(options.width, options.height) * FIT_PADDING;
  const scale = Math.min(
    (options.width - 2 * pad) / (b.maxX - b.minX),
    (options.height - 2 * pad) / (b.maxY - b.minY),
  );
  const ox = (options.width - (b.maxX - b.minX) * scale) / 2 - b.minX * scale;
  const oy = (options.height - (b.maxY - b.minY) * scale) / 2 - b.minY * scale;
  const tx = (p: IBladePoint): IBladePoint => ({ x: p.x * scale + ox, y: p.y * scale + oy });

  const d = chosen.polys.map((poly) => polyToD(poly.map(tx))).join('');
  const spineParts: string[] = [];
  const mirrored = isMirrored(layout);
  for (const blade of chosen.blades) {
    const pts = blade.samples.map((s) => tx(s));
    spineParts.push(`M${pts.map((p) => `${fmt(p.x)} ${fmt(p.y)}`).join('L')}`);
    if (mirrored) {
      const mpts = blade.samples.map((s) => tx({ x: -s.x, y: s.y }));
      spineParts.push(`M${mpts.map((p) => `${fmt(p.x)} ${fmt(p.y)}`).join('L')}`);
    }
  }

  return {
    d,
    spineD: spineParts.join(''),
    blades: chosen.blades,
    layout,
    score: chosen.score,
    viewBox: `0 0 ${options.width} ${options.height}`,
  };
}
