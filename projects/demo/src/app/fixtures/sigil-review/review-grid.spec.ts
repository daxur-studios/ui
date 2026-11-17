import { describe, expect, it } from 'vitest';
import {
  commonInk,
  components,
  countInk,
  createGrid,
  erode,
  erodeTimes,
  gridFromRows,
  inkBounds,
  iou,
  maskDepth,
  overshootCells,
  mirrorGrid,
  subtractInk,
  touchesEdge,
} from './review-grid';

describe('review grid', () => {
  it('parses rows and counts ink', () => {
    const grid = gridFromRows(['#.#', '...', '###']);
    expect(grid.width).toBe(3);
    expect(grid.height).toBe(3);
    expect(countInk(grid)).toBe(5);
  });

  it('finds the ink bounds, and null when empty', () => {
    expect(inkBounds(gridFromRows(['....', '.##.', '.#..']))).toEqual({
      x0: 1,
      y0: 1,
      x1: 2,
      y1: 2,
    });
    expect(inkBounds(createGrid(4, 4))).toBeNull();
  });

  it('erodes with four neighbours and treats the outside as background', () => {
    const plus = gridFromRows(['.#.', '###', '.#.']);
    expect(countInk(erode(plus))).toBe(1);
    const full = gridFromRows(['###', '###', '###']);
    expect(countInk(erode(full))).toBe(1);
    expect(countInk(erodeTimes(full, 2))).toBe(0);
  });

  it('joins diagonals only with eight-connectivity', () => {
    const diagonal = gridFromRows(['#..', '.#.', '..#']);
    expect(components(diagonal, 1, true)).toHaveLength(1);
    expect(components(diagonal, 1, false)).toHaveLength(3);
  });

  it('reports whether a region touches the border', () => {
    const ring = gridFromRows(['#####', '#...#', '#####']);
    const holes = components(ring, 0, false);
    expect(holes).toHaveLength(1);
    expect(holes[0]).toEqual({ size: 3, touchesBorder: false });
  });

  it('mirrors left to right', () => {
    const grid = gridFromRows(['#..', '##.']);
    expect(mirrorGrid(grid).cells).toEqual(gridFromRows(['..#', '.##']).cells);
  });

  it('detects ink on the outer ring', () => {
    expect(touchesEdge(gridFromRows(['...', '.#.', '...']))).toBe(false);
    expect(touchesEdge(gridFromRows(['...', '.#.', '..#']))).toBe(true);
  });

  it('computes IoU, with two empty grids identical', () => {
    const a = gridFromRows(['##..']);
    expect(iou(a, a)).toBe(1);
    expect(iou(a, gridFromRows(['..##']))).toBe(0);
    expect(iou(a, gridFromRows(['.##.']))).toBeCloseTo(1 / 3, 10);
    expect(iou(createGrid(2, 2), createGrid(2, 2))).toBe(1);
  });

  it('keeps common ink and subtracts it', () => {
    const a = gridFromRows(['##.#']);
    const b = gridFromRows(['.###']);
    expect(commonInk([a, b]).cells).toEqual(gridFromRows(['.#.#']).cells);
    expect(subtractInk(a, commonInk([a, b])).cells).toEqual(gridFromRows(['#...']).cells);
    expect(countInk(subtractInk(a, a))).toBe(0);
  });

  it('measures how far ink overshoots the padded box', () => {
    expect(overshootCells(gridFromRows(['.....', '.....', '..#..', '.....', '.....']), 1)).toBe(0);
    expect(overshootCells(gridFromRows(['.....', '.#...', '.....', '.....', '.....']), 1)).toBe(0);
    expect(overshootCells(gridFromRows(['#....', '.....', '.....', '.....', '.....']), 2)).toBe(2);
    expect(overshootCells(gridFromRows(['.....', '.....', '.....', '...#.', '.....']), 2)).toBe(1);
  });

  it('measures how deep ink reaches into a mask', () => {
    const mask = gridFromRows(['.......', '.#####.', '.#####.', '.#####.', '.......']);
    expect(maskDepth(gridFromRows(['#......', '.......', '.......', '.......', '.......']), mask)).toBe(0);
    expect(maskDepth(gridFromRows(['.......', '.#.....', '.......', '.......', '.......']), mask)).toBe(1);
    expect(maskDepth(gridFromRows(['.......', '.......', '...#...', '.......', '.......']), mask)).toBe(2);
  });
});
