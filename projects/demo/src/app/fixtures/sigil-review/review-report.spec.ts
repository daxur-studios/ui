import { describe, expect, it } from 'vitest';
import { createGrid } from './review-grid';
import { measureCell } from './review-metrics';
import { flagsFor, isInvariantFlag } from './review-report';
import type { IReviewSubject } from './review-types';

const base: IReviewSubject = {
  id: 'x',
  kind: 'motif',
  label: 'x',
  references: [],
  widths: [10],
  heightFor: () => 10,
  geometry: () => ({ width: 10, height: 10, ink: [] }),
};

describe('flagsFor', () => {
  const metrics = measureCell(createGrid(8, 8));

  it('has no flags for a clean cell with no bands', () => {
    expect(flagsFor(metrics, base)).toEqual([]);
  });

  it('flags ink on the edge and keep-out overlap as invariants', () => {
    const flags = flagsFor({ ...metrics, outOfBounds: true, keepOutHit: 0.2 }, base);
    expect(flags).toEqual(['out-of-bounds', 'keep-out']);
    expect(flags.every(isInvariantFlag)).toBe(true);
  });

  it('flags a metric outside its band, but not as an invariant', () => {
    const subject = { ...base, bands: { hairline: [0.1, 0.4] as const } };
    expect(flagsFor({ ...metrics, hairline: 0.9 }, subject)).toEqual(['band:hairline']);
    expect(flagsFor({ ...metrics, hairline: 0.2 }, subject)).toEqual([]);
    expect(isInvariantFlag('band:hairline')).toBe(false);
  });
});
