import { describe, expect, it } from 'vitest';
import { createGrid, gridFromRows, type IReviewGrid } from './review-grid';
import {
  FRAGMENT_MIN_CELLS,
  keepOutHit,
  measureCell,
  spreadOf,
  summariseCells,
  variety,
} from './review-metrics';

/** Fills a rectangle of ink. */
function fillRect(grid: IReviewGrid, x: number, y: number, w: number, h: number): IReviewGrid {
  for (let yy = y; yy < y + h; yy++) {
    for (let xx = x; xx < x + w; xx++) grid.cells[yy * grid.width + xx] = 1;
  }
  return grid;
}

describe('measureCell', () => {
  it('reads a solid square as heavy mass, not hairline', () => {
    const grid = fillRect(createGrid(48, 48), 4, 4, 40, 40);
    const m = measureCell(grid);
    expect(m.coverage).toBe(1);
    expect(m.boxFill).toBeCloseTo((40 * 40) / (48 * 48), 10);
    expect(m.hairline).toBeCloseTo(1 - 38 ** 2 / 40 ** 2, 10);
    expect(m.mass).toBeCloseTo(32 ** 2 / 40 ** 2, 10);
    expect(m.pockets).toBe(0);
    expect(m.fragments).toBe(0);
    expect(m.outOfBounds).toBe(false);
  });

  it('reads a one-cell line as all hairline and no mass', () => {
    const m = measureCell(fillRect(createGrid(30, 10), 5, 4, 20, 1));
    expect(m.hairline).toBe(1);
    expect(m.mass).toBe(0);
    expect(m.coverage).toBe(1);
  });

  it('counts enclosed pockets but not open gaps', () => {
    const ring = fillRect(createGrid(16, 16), 3, 3, 10, 10);
    for (let y = 6; y < 10; y++) for (let x = 6; x < 10; x++) ring.cells[y * 16 + x] = 0;
    expect(measureCell(ring).pockets).toBe(1);
    for (let y = 3; y < 7; y++) ring.cells[y * 16 + 3] = 0; // not touching the hole
    ring.cells[7 * 16 + 5] = 0;
    ring.cells[7 * 16 + 4] = 0;
    ring.cells[7 * 16 + 3] = 0; // opens the hole to the outside
    expect(measureCell(ring).pockets).toBe(0);
  });

  it('counts small separate ink regions as fragments, with diagonals joined', () => {
    const dots = gridFromRows(['#.........', '..........', '.......#..', '..........']);
    expect(measureCell(dots).fragments).toBe(2);
    const diagonal = gridFromRows(['#.', '.#']);
    expect(measureCell(diagonal).fragments).toBe(1);
    const block = fillRect(createGrid(10, 10), 2, 2, 3, 2); // 6 cells
    expect(FRAGMENT_MIN_CELLS).toBe(6);
    expect(measureCell(block).fragments).toBe(0);
  });

  it('scores mirror symmetry', () => {
    const symmetric = fillRect(createGrid(10, 4), 2, 1, 6, 2);
    expect(measureCell(symmetric).mirror).toBe(1);
    const lopsided = fillRect(createGrid(10, 4), 0, 1, 3, 2);
    expect(measureCell(lopsided).mirror).toBe(0);
  });

  it('flags ink on the grid edge', () => {
    expect(measureCell(fillRect(createGrid(8, 8), 0, 2, 3, 2)).outOfBounds).toBe(true);
  });

  it('measures an empty grid without dividing by zero', () => {
    const m = measureCell(createGrid(8, 8));
    expect(m.coverage).toBe(0);
    expect(m.boxFill).toBe(0);
    expect(m.hairline).toBe(0);
    expect(m.mass).toBe(0);
  });
});

describe('keepOutHit', () => {
  it('is the covered share of the keep-out area', () => {
    const mask = fillRect(createGrid(20, 20), 5, 5, 10, 10);
    const ink = fillRect(createGrid(20, 20), 5, 5, 5, 5);
    expect(keepOutHit(ink, mask)).toBe(0.25);
    expect(measureCell(ink, mask).keepOutHit).toBe(0.25);
  });

  it('is zero for an empty mask', () => {
    expect(keepOutHit(fillRect(createGrid(4, 4), 0, 0, 4, 4), createGrid(4, 4))).toBe(0);
  });
});

describe('variety', () => {
  const a = fillRect(createGrid(10, 10), 0, 0, 3, 3);
  const b = fillRect(createGrid(10, 10), 6, 6, 3, 3);

  it('is zero for identical grids and one for disjoint grids', () => {
    expect(variety([a, a], false).mean).toBe(0);
    expect(variety([a, b], false).mean).toBe(1);
  });

  it('names the most similar pair', () => {
    const near = fillRect(createGrid(10, 10), 0, 0, 3, 2);
    const result = variety([a, b, near], false);
    expect(result.min?.a).toBe(0);
    expect(result.min?.b).toBe(2);
    expect(result.min?.value).toBeCloseTo(1 - 6 / 9, 10);
  });

  it('needs two grids', () => {
    expect(variety([a], false)).toEqual({ mean: 0, min: null });
  });

  it('removes fixed rails before comparing frames', () => {
    const rail = (g: IReviewGrid) => fillRect(g, 0, 8, 10, 1);
    const withRailA = rail(fillRect(createGrid(10, 10), 0, 0, 2, 2));
    const withRailB = rail(fillRect(createGrid(10, 10), 7, 0, 2, 2));
    expect(variety([withRailA, withRailB], false).mean).toBeLessThan(1);
    expect(variety([withRailA, withRailB], true).mean).toBe(1);
  });
});

describe('spreadOf and summariseCells', () => {
  it('returns min, median and max', () => {
    expect(spreadOf([3, 1, 2])).toEqual({ min: 1, median: 2, max: 3 });
    expect(spreadOf([1, 2, 3, 4])).toEqual({ min: 1, median: 2.5, max: 4 });
    expect(spreadOf([])).toEqual({ min: 0, median: 0, max: 0 });
  });

  it('summarises every numeric measurement', () => {
    const cells = [
      measureCell(fillRect(createGrid(20, 20), 4, 4, 12, 12)),
      measureCell(fillRect(createGrid(20, 20), 4, 9, 12, 1)),
    ];
    const summary = summariseCells(cells);
    expect(summary.hairline.min).toBeLessThan(summary.hairline.max);
    expect(summary.hairline.max).toBe(1);
    expect(Object.keys(summary)).toHaveLength(8);
  });
});
