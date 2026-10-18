import { describe, expect, it } from 'vitest';
import {
  buildAngledTrackPath,
  clampAndSnapValue,
  normalizeSliderBounds,
  normalizeSliderStep,
  ratioToValue,
  valueToRatio,
} from './slider-math';

describe('slider normalization', () => {
  it.each([
    [-10, 0, 100, 1, 0],
    [200, 0, 100, 1, 100],
    [0.1 + 0.2, 0, 1, 0.1, 0.3],
    [-9.84, -20, 0, 0.1, -9.8],
    [3.4, 2, 12, 2, 4],
    [10, 0, 10, 3, 10],
    [9.9, 0, 10, 3, 9],
    [4, 5, 5, 1, 5],
    [4, 5, -5, 1, 5],
    [NaN, 2, 10, 1, 2],
    [Infinity, 2, 10, 1, 2],
    [-Infinity, 2, 10, 1, 2],
    [2.7, 0, 10, 0, 3],
    [2.7, 0, 10, -1, 3],
    [2.7, 0, 10, NaN, 3],
    [2.7, 0, 10, Infinity, 3],
    [1, NaN, 10, 1, 1],
    [2, 1, Infinity, 1, 1],
  ])('snaps %s over [%s, %s] step %s to %s', (raw, min, max, step, expected) => {
    expect(clampAndSnapValue(raw, min, max, step)).toBe(expected);
  });

  it('shares safe bounds and increments with component semantics', () => {
    expect(normalizeSliderBounds(Infinity, NaN)).toEqual({ min: 0, max: 0 });
    expect(normalizeSliderStep(0)).toBe(1);
  });

  it('normalizes and round-trips negative ranges', () => {
    expect(valueToRatio(-10, -20, 0)).toBe(0.5);
    expect(ratioToValue(0.51, -20, 0, 0.1)).toBe(-9.8);
    for (const value of [-20, -10, 0]) {
      expect(ratioToValue(valueToRatio(value, -20, 0), -20, 0, 0.1)).toBe(value);
    }
  });

  it('clamps ratios and tolerates invalid inputs and collapsed bounds', () => {
    expect(valueToRatio(200, 0, 100)).toBe(1);
    expect(valueToRatio(-1, 0, 100)).toBe(0);
    expect(valueToRatio(NaN, 0, 100)).toBe(0);
    expect(valueToRatio(5, 10, 0)).toBe(0);
    expect(ratioToValue(NaN, 2, 10, 1)).toBe(2);
    expect(ratioToValue(-1, 2, 10, 1)).toBe(2);
    expect(ratioToValue(2, 2, 10, 1)).toBe(10);
    expect(ratioToValue(0.5, 5, 1, 1)).toBe(5);
    expect(valueToRatio(0, -1e308, 1e308)).toBe(0.5);
    expect(ratioToValue(0.5, -1e308, 1e308, 1)).toBe(0);
  });
});

describe('angled track geometry', () => {
  const geometry = { width: 200, height: 40, hookDx: 16, hookDy: 12, trackY: 10, thumbRadius: 6 };
  it.each([
    [0, 'M 6 10 L 6 10 L 6 22', 'M 6 22 L 194 22', 6],
    [0.5, 'M 6 10 L 84 10 L 100 22', 'M 100 22 L 194 22', 100],
    [1, 'M 6 10 L 178 10 L 194 22', 'M 194 22 L 194 22', 194],
  ])(
    'builds the horizontal-then-downward path at ratio %s',
    (ratio, activePath, inactivePath, thumbX) => {
      expect(buildAngledTrackPath({ ...geometry, ratio })).toEqual({
        activePath,
        inactivePath,
        thumbX,
        thumbY: 22,
      });
    },
  );

  it.each([0, 1, 8, 12])('keeps narrow width %s geometry finite and nonnegative', (width) => {
    const paths = buildAngledTrackPath({ ...geometry, width, ratio: 0.5 });
    expect(paths.thumbX).toBeGreaterThanOrEqual(0);
    expect(paths.thumbX).toBeLessThanOrEqual(width);
    expect(paths.activePath).not.toMatch(/NaN|Infinity|-/);
  });

  it('bounds the hook vertically and handles invalid dimensions', () => {
    expect(buildAngledTrackPath({ ...geometry, ratio: 5, hookDy: 100 }).thumbY).toBe(34);
    const paths = buildAngledTrackPath({ ...geometry, width: NaN, height: -1, ratio: Infinity });
    expect(paths).toEqual({
      activePath: 'M 0 0 L 0 0 L 0 0',
      inactivePath: 'M 0 0 L 0 0',
      thumbX: 0,
      thumbY: 0,
    });
  });
});
