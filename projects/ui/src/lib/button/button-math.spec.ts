import { describe, expect, it } from 'vitest';
import { buildBracketPaths, buildChamferPoints } from './button-math';

describe('buildChamferPoints', () => {
  it('builds an 8-point polygon string with chamfers', () => {
    const points = buildChamferPoints(100, 40, 8);
    const coords = points.split(' ');
    expect(coords.length).toBe(8);
    expect(coords[0]).toBe('0,8.00');
    expect(coords[1]).toBe('8.00,0');
    expect(coords[2]).toBe('92.00,0');
    expect(coords[3]).toBe('100.00,8.00');
  });

  it('handles zero dimensions safely', () => {
    const points = buildChamferPoints(0, 0, 8);
    expect(points).toContain('0,0.00');
  });
});

describe('buildBracketPaths', () => {
  it('builds four corner bracket paths', () => {
    const paths = buildBracketPaths(120, 40, 10, 4);
    expect(paths.tl).toBe('M 14 4 L 4 4 L 4 14');
    expect(paths.tr).toBe('M 106 4 L 116 4 L 116 14');
    expect(paths.bl).toBe('M 14 36 L 4 36 L 4 26');
    expect(paths.br).toBe('M 106 36 L 116 36 L 116 26');
  });
});
