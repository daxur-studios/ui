import { describe, expect, it } from 'vitest';
import {
  buildCrescentBranch,
  buildSpearCrest,
  buildStarEyeSigil,
  buildTaperedRibbon,
  composeFiligreeCrest,
  composeModularUiJoin,
  composeTendrilSCurve,
  composeWingedStar,
  cubicPoint,
  cubicTangent,
  DEFAULT_SIGIL_LAB_PARAMS,
  ISigilLabParams,
  ISigilPoint,
  ISigilSpine,
  normalizeSigilParams,
  signedArea,
  sigilWidthProfile,
  SIGIL_CENTER,
  SIGIL_JOIN_CAP_WIDTH,
  SIGIL_JOIN_MIN_WIDTH,
  SIGIL_MAX_THORN_COUNT,
  SIGIL_VIEW_HEIGHT,
  SIGIL_VIEW_WIDTH,
} from './sigil-math';

/** Tolerance for mirror-symmetry checks, one hundredth of a user unit per printed coordinate. */
const COORDINATE_TOLERANCE = 0.05;

/** Parses SVG path data written by `sigil-math` into one point list per closed subpath. */
function subpaths(d: string): ISigilPoint[][] {
  return d
    .split('M')
    .filter((chunk) => chunk.length > 0)
    .map((chunk) =>
      chunk
        .replace(/Z$/, '')
        .split('L')
        .map((pair) => {
          const [x, y] = pair.split(' ').map(Number);
          return { x, y };
        }),
    );
}

/** Every point of every subpath, flattened. */
function allPoints(d: string): ISigilPoint[] {
  return subpaths(d).flat();
}

/** A simple horizontal spine, straight and evenly spaced, for the profile and ribbon tests. */
const STRAIGHT_SPINE: ISigilSpine = {
  p0: { x: 0, y: 0 },
  p1: { x: 100 / 3, y: 0 },
  p2: { x: 200 / 3, y: 0 },
  p3: { x: 100, y: 0 },
};

describe('cubicPoint and cubicTangent', () => {
  it('passes through the end points of the spine', () => {
    expect(cubicPoint(STRAIGHT_SPINE, 0)).toEqual({ x: 0, y: 0 });
    expect(cubicPoint(STRAIGHT_SPINE, 1)).toEqual({ x: 100, y: 0 });
  });

  it('evaluates the midpoint of an evenly spaced straight spine at its centre', () => {
    const middle = cubicPoint(STRAIGHT_SPINE, 0.5);
    expect(middle.x).toBeCloseTo(50, 10);
    expect(middle.y).toBeCloseTo(0, 10);
  });

  it('returns a tangent that points along the spine direction', () => {
    const tangent = cubicTangent(STRAIGHT_SPINE, 0.5);
    expect(tangent.x).toBeGreaterThan(0);
    expect(tangent.y).toBeCloseTo(0, 10);
  });
});

describe('sigilWidthProfile', () => {
  it('converges to a needle point at t = 1', () => {
    expect(sigilWidthProfile(1, 9, 0.5)).toBe(0);
  });

  it('returns the base width at the spine start when swell is zero', () => {
    expect(sigilWidthProfile(0, 9, 0)).toBeCloseTo(9, 10);
  });

  it('thickens at the junction when swell is raised', () => {
    const plain = sigilWidthProfile(0.4, 9, 0);
    const swollen = sigilWidthProfile(0.4, 9, 1);
    expect(swollen).toBeGreaterThan(plain);
  });

  it('stays finite and clamps out-of-range parameters', () => {
    expect(Number.isFinite(sigilWidthProfile(-2, 9, 5))).toBe(true);
    expect(sigilWidthProfile(2, 9, 0)).toBe(0);
  });
});

describe('buildTaperedRibbon', () => {
  it('returns one closed filled path', () => {
    const d = buildTaperedRibbon(STRAIGHT_SPINE, { baseWidth: 9, swell: 0.5 });
    expect(d.startsWith('M')).toBe(true);
    expect(d.endsWith('Z')).toBe(true);
    expect(subpaths(d)).toHaveLength(1);
  });

  it('is deterministic for identical inputs', () => {
    const options = { baseWidth: 9, swell: 0.5 };
    expect(buildTaperedRibbon(STRAIGHT_SPINE, options)).toBe(
      buildTaperedRibbon(STRAIGHT_SPINE, options),
    );
  });

  it('closes onto a single needle point at the spine end', () => {
    const points = subpaths(buildTaperedRibbon(STRAIGHT_SPINE, { baseWidth: 9, swell: 0 }))[0];
    const tipPoints = points.filter((p) => Math.abs(p.x - 100) < COORDINATE_TOLERANCE);
    expect(tipPoints.length).toBeGreaterThanOrEqual(2);
    for (const tip of tipPoints) expect(Math.abs(tip.y)).toBeLessThan(COORDINATE_TOLERANCE);
  });
});

describe('buildCrescentBranch', () => {
  it('returns the thorn and its armpit web as two closed subpaths', () => {
    const d = buildCrescentBranch({
      junction: { x: 0, y: 0 },
      direction: { x: 1, y: 0 },
      tip: { x: 60, y: -30 },
      baseWidth: 6,
      swell: 0.5,
      bend: 0.4,
      crescentDepth: 0.5,
    });
    expect(subpaths(d)).toHaveLength(2);
    expect(d).not.toMatch(/NaN|Infinity/);
  });

  it('pulls the armpit deeper as crescentDepth grows', () => {
    const shallow = buildCrescentBranch({
      junction: { x: 0, y: 0 },
      direction: { x: 1, y: 0 },
      tip: { x: 60, y: -30 },
      baseWidth: 6,
      swell: 0,
      bend: 0,
      crescentDepth: 0,
    });
    const deep = buildCrescentBranch({
      junction: { x: 0, y: 0 },
      direction: { x: 1, y: 0 },
      tip: { x: 60, y: -30 },
      baseWidth: 6,
      swell: 0,
      bend: 0,
      crescentDepth: 1,
    });
    expect(deep).not.toBe(shallow);
  });
});

describe('buildStarEyeSigil', () => {
  const d = buildStarEyeSigil(SIGIL_CENTER, 34);
  const [outer, eye] = subpaths(d);

  it('cuts a hollow eye out of a solid star', () => {
    expect(subpaths(d)).toHaveLength(2);
    expect(signedArea(outer)).toBeGreaterThan(0);
    expect(signedArea(eye)).toBeLessThan(0);
  });

  it('keeps the hollow inside the star valleys', () => {
    const eyeRadii = eye.map((p) => Math.hypot(p.x - SIGIL_CENTER.x, p.y - SIGIL_CENTER.y));
    const outerRadii = outer.map((p) => Math.hypot(p.x - SIGIL_CENTER.x, p.y - SIGIL_CENTER.y));
    expect(Math.max(...eyeRadii)).toBeLessThan(Math.min(...outerRadii));
  });

  it('reaches its cardinal needle tips at the requested radius', () => {
    const radii = outer.map((p) => Math.hypot(p.x - SIGIL_CENTER.x, p.y - SIGIL_CENTER.y));
    expect(Math.max(...radii)).toBeCloseTo(34, 1);
  });
});

describe('buildSpearCrest', () => {
  it('draws one diamond whose sides are mirror-symmetric about the axis', () => {
    const d = buildSpearCrest(SIGIL_CENTER, 200, 46);
    expect(subpaths(d)).toHaveLength(1);
    const points = allPoints(d);
    const minX = Math.min(...points.map((p) => p.x));
    const maxX = Math.max(...points.map((p) => p.x));
    expect(minX + maxX).toBeCloseTo(SIGIL_CENTER.x * 2, 1);
  });
});

describe('normalizeSigilParams', () => {
  it('clamps unit fields and bounds the thorn count', () => {
    const params = normalizeSigilParams({
      curvature: 2,
      swell: -1,
      thornCount: 99,
      crescentDepth: 0.25,
      asymmetry: Number.NaN,
      spikeLength: 0.75,
    });
    expect(params).toEqual({
      curvature: 1,
      swell: 0,
      thornCount: SIGIL_MAX_THORN_COUNT,
      crescentDepth: 0.25,
      asymmetry: 0,
      spikeLength: 0.75,
    });
  });

  it('rounds a fractional thorn count to at least one thorn', () => {
    expect(normalizeSigilParams({ ...DEFAULT_SIGIL_LAB_PARAMS, thornCount: 0.2 }).thornCount).toBe(
      1,
    );
    expect(normalizeSigilParams({ ...DEFAULT_SIGIL_LAB_PARAMS, thornCount: 2.6 }).thornCount).toBe(
      3,
    );
  });
});

describe('archetype composers', () => {
  const composers: Array<
    [string, (params: ISigilLabParams) => { d: string; width: number; height: number }]
  > = [
    ['winged-star', composeWingedStar],
    ['filigree-crest', composeFiligreeCrest],
    ['tendril-s-curve', composeTendrilSCurve],
  ];

  for (const [name, compose] of composers) {
    it(`${name} returns a full canvas with finite, non-empty geometry`, () => {
      const geometry = compose(DEFAULT_SIGIL_LAB_PARAMS);
      expect(geometry.width).toBe(SIGIL_VIEW_WIDTH);
      expect(geometry.height).toBe(SIGIL_VIEW_HEIGHT);
      expect(geometry.d.length).toBeGreaterThan(0);
      expect(geometry.d).not.toMatch(/NaN|Infinity/);
    });

    it(`${name} stays finite across the full thorn-count and extreme-knob sweep`, () => {
      for (let thornCount = 1; thornCount <= SIGIL_MAX_THORN_COUNT; thornCount++) {
        for (const extreme of [0, 1]) {
          const geometry = compose({
            curvature: extreme,
            swell: extreme,
            thornCount,
            crescentDepth: extreme,
            asymmetry: extreme,
            spikeLength: extreme,
          });
          expect(geometry.d).not.toMatch(/NaN|Infinity/);
          for (const p of allPoints(geometry.d)) {
            expect(p.x).toBeGreaterThan(-SIGIL_VIEW_WIDTH);
            expect(p.x).toBeLessThan(SIGIL_VIEW_WIDTH * 2);
          }
        }
      }
    });

    it(`${name} is deterministic for identical params`, () => {
      expect(compose(DEFAULT_SIGIL_LAB_PARAMS).d).toBe(compose(DEFAULT_SIGIL_LAB_PARAMS).d);
    });
  }

  it('winged star changes shape when asymmetry changes', () => {
    const mirrored = composeWingedStar({ ...DEFAULT_SIGIL_LAB_PARAMS, asymmetry: 0 });
    const lopsided = composeWingedStar({ ...DEFAULT_SIGIL_LAB_PARAMS, asymmetry: 1 });
    expect(lopsided.d).not.toBe(mirrored.d);
  });

  it('filigree crest is bilateral, so its bounding box is centred on the axis', () => {
    const points = allPoints(composeFiligreeCrest(DEFAULT_SIGIL_LAB_PARAMS).d);
    const minX = Math.min(...points.map((p) => p.x));
    const maxX = Math.max(...points.map((p) => p.x));
    expect(Math.abs(minX + maxX - SIGIL_VIEW_WIDTH)).toBeLessThan(COORDINATE_TOLERANCE * 4);
  });

  it('filigree crest ignores asymmetry, since the archetype is bilateral', () => {
    const mirrored = composeFiligreeCrest({ ...DEFAULT_SIGIL_LAB_PARAMS, asymmetry: 0 });
    const lopsided = composeFiligreeCrest({ ...DEFAULT_SIGIL_LAB_PARAMS, asymmetry: 1 });
    expect(lopsided.d).toBe(mirrored.d);
  });
});

describe('composeModularUiJoin', () => {
  const narrow = composeModularUiJoin(DEFAULT_SIGIL_LAB_PARAMS, 240);
  const wide = composeModularUiJoin(DEFAULT_SIGIL_LAB_PARAMS, 600);

  it('keeps the left thorn cap byte-identical across widths, so caps never stretch', () => {
    expect(narrow.parts.leftCap).toBe(wide.parts.leftCap);
  });

  it('stretches only the rail, and the rail meets the caps with no seam gap', () => {
    const railPoints = allPoints(wide.parts.rail);
    const xs = railPoints.map((p) => p.x);
    expect(Math.min(...xs)).toBeCloseTo(SIGIL_JOIN_CAP_WIDTH, 1);
    expect(Math.max(...xs)).toBeCloseTo(600 - SIGIL_JOIN_CAP_WIDTH, 1);
  });

  it('mirrors the right cap across the join centre', () => {
    const leftXs = allPoints(wide.parts.leftCap).map((p) => p.x);
    const rightXs = allPoints(wide.parts.rightCap).map((p) => p.x);
    // The right cap is the left cap reflected about x = width / 2, so its extremes swap.
    expect(Math.min(...rightXs)).toBeCloseTo(600 - Math.max(...leftXs), 1);
    expect(Math.max(...rightXs)).toBeCloseTo(600 - Math.min(...leftXs), 1);
  });

  it('clamps a too-narrow request to the minimum width that fits both caps and the star', () => {
    const tiny = composeModularUiJoin(DEFAULT_SIGIL_LAB_PARAMS, 40);
    expect(tiny.width).toBe(SIGIL_JOIN_MIN_WIDTH);
  });

  it('joins its parts into the full path', () => {
    expect(wide.d).toBe(
      wide.parts.leftCap + wide.parts.rail + wide.parts.center + wide.parts.rightCap,
    );
  });
});
