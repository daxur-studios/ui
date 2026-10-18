import { describe, expect, it } from 'vitest';
import { buildReticleSliderPaths } from './slider-reticle-math';

describe('buildReticleSliderPaths', () => {
  it('builds dual rails and reticle caliper brackets for unipolar range', () => {
    const paths = buildReticleSliderPaths({
      width: 300,
      height: 40,
      min: 0,
      max: 100,
      value: 50,
    });

    expect(paths.isBipolar).toBe(false);
    expect(paths.originTickPath).toBe('');
    expect(paths.topRailPath).toContain('M ');
    expect(paths.bottomRailPath).toContain('M ');
    expect(paths.leftBracketPath).toContain('M ');
    expect(paths.rightBracketPath).toContain('M ');
    expect(paths.thumbDiamondPath).toContain('M ');
    expect(paths.thumbX).toBeGreaterThan(50);
  });

  it('identifies bipolar ranges and computes origin tick at zero', () => {
    const paths = buildReticleSliderPaths({
      width: 300,
      height: 40,
      min: -20,
      max: 20,
      value: 10,
    });

    expect(paths.isBipolar).toBe(true);
    expect(paths.originTickPath).not.toBe('');
    expect(paths.activeFillPath).toContain('M ');
  });

  it('handles negative value in bipolar range by filling leftwards from origin', () => {
    const pathsNegative = buildReticleSliderPaths({
      width: 300,
      height: 40,
      min: -50,
      max: 50,
      value: -25,
    });

    expect(pathsNegative.isBipolar).toBe(true);
    expect(pathsNegative.activeFillPath).not.toBe('');
  });

  it('handles zero width gracefully', () => {
    const pathsZero = buildReticleSliderPaths({
      width: 0,
      height: 40,
      min: 0,
      max: 100,
      value: 50,
    });

    expect(pathsZero.topRailPath).toContain('M ');
  });
});
