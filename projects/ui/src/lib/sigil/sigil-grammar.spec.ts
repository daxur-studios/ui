import { describe, expect, it } from 'vitest';
import {
  composeTopologicalFiligreeCrest,
  composeTopologicalTendril,
  composeTopologicalWingedStar,
} from './sigil-grammar';
import { DEFAULT_SIGIL_LAB_PARAMS, type ISigilLabParams } from './sigil-math';

describe('sigil-grammar', () => {
  it('produces deterministic output for identical params and seed', () => {
    const a = composeTopologicalWingedStar(DEFAULT_SIGIL_LAB_PARAMS, 7);
    const b = composeTopologicalWingedStar(DEFAULT_SIGIL_LAB_PARAMS, 7);
    expect(a.d).toBe(b.d);
    expect(a.ridgeD).toBe(b.ridgeD);
    expect(a.pocketD).toBe(b.pocketD);
  });

  it('produces genuinely distinct silhouettes across consecutive seeds', () => {
    const starPaths = new Set<string>();
    const crestPaths = new Set<string>();
    const tendrilPaths = new Set<string>();

    for (let seed = 1; seed <= 12; seed++) {
      const star = composeTopologicalWingedStar(DEFAULT_SIGIL_LAB_PARAMS, seed);
      const crest = composeTopologicalFiligreeCrest(DEFAULT_SIGIL_LAB_PARAMS, seed);
      const tendril = composeTopologicalTendril(DEFAULT_SIGIL_LAB_PARAMS, seed);

      expect(star.d.length).toBeGreaterThan(100);
      expect(crest.d.length).toBeGreaterThan(100);
      expect(tendril.d.length).toBeGreaterThan(100);
      expect(star.d).not.toContain('NaN');
      expect(crest.d).not.toContain('NaN');
      expect(tendril.d).not.toContain('NaN');

      starPaths.add(star.d);
      crestPaths.add(crest.d);
      tendrilPaths.add(tendril.d);
    }

    expect(starPaths.size).toBe(12);
    expect(crestPaths.size).toBe(12);
    expect(tendrilPaths.size).toBe(12);
  });

  it('stays finite at extreme parameter combinations', () => {
    const extremes: ISigilLabParams[] = [
      { curvature: 0, swell: 0, thornCount: 1, crescentDepth: 0, asymmetry: 0, spikeLength: 0 },
      { curvature: 1, swell: 1, thornCount: 6, crescentDepth: 1, asymmetry: 1, spikeLength: 1 },
    ];
    for (const params of extremes) {
      for (const fn of [
        composeTopologicalWingedStar,
        composeTopologicalFiligreeCrest,
        composeTopologicalTendril,
      ]) {
        const res = fn(params, 42);
        expect(res.d.startsWith('M')).toBe(true);
        expect(res.d).not.toContain('NaN');
        expect(res.d).not.toContain('Infinity');
      }
    }
  });
});
