import { describe, expect, it } from 'vitest';
import {
  buildSegmentedCells,
  DEFAULT_CELL_COUNT,
  DEFAULT_CELL_GAP,
  DEFAULT_CHAMFER,
} from './slider-segmented-math';

describe('buildSegmentedCells', () => {
  it('returns empty array when width or height is zero or negative', () => {
    expect(
      buildSegmentedCells({
        width: 0,
        height: 20,
        cellCount: 10,
        cellGap: 2,
        ratio: 0.5,
        chamfer: 2,
      }),
    ).toEqual([]);

    expect(
      buildSegmentedCells({
        width: 200,
        height: 0,
        cellCount: 10,
        cellGap: 2,
        ratio: 0.5,
        chamfer: 2,
      }),
    ).toEqual([]);
  });

  it('builds the specified number of discrete cells', () => {
    const cells = buildSegmentedCells({
      width: 240,
      height: 24,
      cellCount: 10,
      cellGap: 2,
      ratio: 0.5,
      chamfer: 2,
    });

    expect(cells.length).toBe(10);
    expect(cells[0].index).toBe(0);
    expect(cells[9].index).toBe(9);
  });

  it('illuminates cells up to the normalized ratio', () => {
    const cellsZero = buildSegmentedCells({
      width: 200,
      height: 20,
      cellCount: 10,
      cellGap: 2,
      ratio: 0,
      chamfer: 2,
    });
    expect(cellsZero.every((c) => !c.active)).toBe(true);

    const cellsFull = buildSegmentedCells({
      width: 200,
      height: 20,
      cellCount: 10,
      cellGap: 2,
      ratio: 1,
      chamfer: 2,
    });
    expect(cellsFull.every((c) => c.active)).toBe(true);

    const cellsMid = buildSegmentedCells({
      width: 200,
      height: 20,
      cellCount: 10,
      cellGap: 2,
      ratio: 0.5,
      chamfer: 2,
    });
    const activeCount = cellsMid.filter((c) => c.active).length;
    expect(activeCount).toBeGreaterThanOrEqual(4);
    expect(activeCount).toBeLessThanOrEqual(6);
  });

  it('generates valid SVG polygon paths with chamfered coordinates', () => {
    const cells = buildSegmentedCells({
      width: 100,
      height: 20,
      cellCount: 4,
      cellGap: 2,
      ratio: 0.8,
      chamfer: 2,
    });

    expect(cells[0].path).toContain('M ');
    expect(cells[0].path).toContain(' Z');
  });
});
