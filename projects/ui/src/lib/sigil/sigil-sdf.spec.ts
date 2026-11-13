import { describe, expect, it } from 'vitest';
import { SigilSdfField, smoothMax, smoothMin } from './sigil-sdf';

describe('sigil-sdf', () => {
  it('computes smooth minimum below hard minimum within blend radius', () => {
    const hard = Math.min(4, 6);
    const blended = smoothMin(4, 6, 5);
    expect(blended).toBeLessThan(hard);
    expect(smoothMin(4, 6, 0)).toBe(hard);
  });

  it('computes smooth maximum above hard maximum within blend radius', () => {
    const hard = Math.max(4, 6);
    const blended = smoothMax(4, 6, 5);
    expect(blended).toBeGreaterThan(hard);
  });

  it('extracts closed cubic outer path, medial ridge path, and enclosed pocket for a split loop', () => {
    const field = new SigilSdfField(200, 120, 1.5);
    // Two arched splines meeting at both ends to enclose a negative-space pocket
    field.addSpline(
      {
        p0: { x: 30, y: 60 },
        p1: { x: 75, y: 20 },
        p2: { x: 125, y: 20 },
        p3: { x: 170, y: 60 },
      },
      () => 12,
      5,
    );
    field.addSpline(
      {
        p0: { x: 30, y: 60 },
        p1: { x: 75, y: 100 },
        p2: { x: 125, y: 100 },
        p3: { x: 170, y: 60 },
      },
      () => 12,
      5,
    );

    const result = field.extract(1.8);
    expect(result.d.startsWith('M')).toBe(true);
    expect(result.d.includes('C')).toBe(true);
    expect(result.d.endsWith('Z')).toBe(true);
    expect(result.islandCount).toBe(1);
    expect(result.pocketCount).toBeGreaterThanOrEqual(1);
    expect(result.pocketD.length).toBeGreaterThan(0);
    expect(result.ridgeD.length).toBeGreaterThan(0);
  });
});
