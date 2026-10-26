import { describe, expect, it } from 'vitest';
import {
  DEFAULT_SIGIL_LAB_PARAMS,
  SIGIL_MAX_THORN_COUNT,
  SIGIL_VIEW_HEIGHT,
  SIGIL_VIEW_WIDTH,
  type ISigilLabParams,
} from './sigil-math';
import {
  composeChitinFiligreeCrest,
  composeChitinModularUiJoin,
  composeChitinTendrilSCurve,
  composeChitinWingedStar,
  SIGIL_CHITIN_FILIGREE_STRATEGY,
} from './sigil-strategy-chitin-filigree';

describe('SIGIL_CHITIN_FILIGREE_STRATEGY', () => {
  it('registers correct id and human-readable label', () => {
    expect(SIGIL_CHITIN_FILIGREE_STRATEGY.id).toBe('chitin-filigree');
    expect(SIGIL_CHITIN_FILIGREE_STRATEGY.label).toBe('Chitin Filigree');
  });

  describe('slot 1: composeChitinWingedStar (concept 6)', () => {
    it('produces valid canvas dimensions and non-empty path data', () => {
      const result = composeChitinWingedStar(DEFAULT_SIGIL_LAB_PARAMS);
      expect(result.width).toBe(SIGIL_VIEW_WIDTH);
      expect(result.height).toBe(SIGIL_VIEW_HEIGHT);
      expect(result.d).toMatch(/^M[-\d.]+ [-\d.]+L/);
      expect(result.d).not.toMatch(/NaN|Infinity/);
    });

    it('contains multiple closed subpaths for multi-tiered wings and hollow eye', () => {
      const result = composeChitinWingedStar(DEFAULT_SIGIL_LAB_PARAMS);
      const subpathCount = (result.d.match(/Z/g) ?? []).length;
      expect(subpathCount).toBeGreaterThanOrEqual(10);
    });

    it('exhibits organic asymmetry between left and right wing reaches', () => {
      const calm = composeChitinWingedStar({ ...DEFAULT_SIGIL_LAB_PARAMS, asymmetry: 0 });
      const wild = composeChitinWingedStar({ ...DEFAULT_SIGIL_LAB_PARAMS, asymmetry: 1 });
      expect(wild.d).not.toBe(calm.d);
    });
  });

  describe('slot 2: composeChitinFiligreeCrest (concept 7)', () => {
    it('produces valid canvas dimensions and finite geometry', () => {
      const result = composeChitinFiligreeCrest(DEFAULT_SIGIL_LAB_PARAMS);
      expect(result.width).toBe(SIGIL_VIEW_WIDTH);
      expect(result.height).toBe(SIGIL_VIEW_HEIGHT);
      expect(result.d).not.toMatch(/NaN|Infinity/);
    });

    it('remains perfectly bilateral across the centre x-axis', () => {
      const result = composeChitinFiligreeCrest(DEFAULT_SIGIL_LAB_PARAMS);
      expect(result.d.length).toBeGreaterThan(0);
      // Ignores asymmetry knob by design
      const lowAsym = composeChitinFiligreeCrest({ ...DEFAULT_SIGIL_LAB_PARAMS, asymmetry: 0 });
      const highAsym = composeChitinFiligreeCrest({ ...DEFAULT_SIGIL_LAB_PARAMS, asymmetry: 1 });
      expect(highAsym.d).toBe(lowAsym.d);
    });
  });

  describe('slot 3: composeChitinTendrilSCurve (concept 1)', () => {
    it('produces valid canvas dimensions and includes terminal cluster subpaths', () => {
      const result = composeChitinTendrilSCurve(DEFAULT_SIGIL_LAB_PARAMS);
      expect(result.width).toBe(SIGIL_VIEW_WIDTH);
      expect(result.height).toBe(SIGIL_VIEW_HEIGHT);
      expect(result.d).not.toMatch(/NaN|Infinity/);
      const subpathCount = (result.d.match(/Z/g) ?? []).length;
      expect(subpathCount).toBeGreaterThanOrEqual(8);
    });

    it('responds deterministically to curvature changes', () => {
      const lowCurv = composeChitinTendrilSCurve({ ...DEFAULT_SIGIL_LAB_PARAMS, curvature: 0 });
      const highCurv = composeChitinTendrilSCurve({ ...DEFAULT_SIGIL_LAB_PARAMS, curvature: 1 });
      expect(highCurv.d).not.toBe(lowCurv.d);
    });
  });

  describe('slot 4: composeChitinModularUiJoin', () => {
    const testWidths = [180, 240, 420, 600, 720];

    for (const width of testWidths) {
      it(`preserves exact width ${width} across stretching rails`, () => {
        const join = composeChitinModularUiJoin(DEFAULT_SIGIL_LAB_PARAMS, width);
        expect(join.width).toBe(width);
        expect(join.height).toBe(56);
        expect(join.d).not.toMatch(/NaN|Infinity/);
        expect(join.parts.leftCap).toMatch(/^M/);
        expect(join.parts.rail).toMatch(/^M/);
        expect(join.parts.center).toMatch(/^M/);
        expect(join.parts.rightCap).toMatch(/^M/);
      });
    }
  });

  describe('extreme parameter sweep', () => {
    const extremes: ISigilLabParams[] = [
      {
        curvature: 0,
        swell: 0,
        thornCount: 1,
        crescentDepth: 0,
        asymmetry: 0,
        spikeLength: 0,
      },
      {
        curvature: 1,
        swell: 1,
        thornCount: SIGIL_MAX_THORN_COUNT,
        crescentDepth: 1,
        asymmetry: 1,
        spikeLength: 1,
      },
      {
        curvature: 0,
        swell: 1,
        thornCount: SIGIL_MAX_THORN_COUNT,
        crescentDepth: 0,
        asymmetry: 1,
        spikeLength: 0,
      },
      {
        curvature: 1,
        swell: 0,
        thornCount: 1,
        crescentDepth: 1,
        asymmetry: 0,
        spikeLength: 1,
      },
    ];

    it('keeps every archetype coordinate finite across all extreme combinations', () => {
      for (const params of extremes) {
        expect(composeChitinWingedStar(params).d).not.toMatch(/NaN|Infinity/);
        expect(composeChitinFiligreeCrest(params).d).not.toMatch(/NaN|Infinity/);
        expect(composeChitinTendrilSCurve(params).d).not.toMatch(/NaN|Infinity/);
        expect(composeChitinModularUiJoin(params, 300).d).not.toMatch(/NaN|Infinity/);
      }
    });
  });
});
