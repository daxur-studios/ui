/**
 * Occupancy grid used by every review measurement.
 *
 * Purpose: a plain row-major boolean raster that is independent of the browser, so each
 * measurement can be unit-tested in Node with hand-built shapes.
 */
export interface IReviewGrid {
  readonly width: number;
  readonly height: number;
  /** Row-major cells; `1` is ink, `0` is background. */
  readonly cells: Uint8Array;
}

/** CSS pixels covered by one grid cell, so measurements mean the same at every cell size. */
export const REVIEW_CELL_PX = 2;

/** Empty cells added around every rasterised cell, so edge-touching ink is detectable. */
export const REVIEW_GRID_PAD = 2;

/** Creates an empty grid of the given size. */
export function createGrid(width: number, height: number): IReviewGrid {
  return { width, height, cells: new Uint8Array(width * height) };
}

/** Builds a grid from rows of text where `#` is ink; used by specs and docs. */
export function gridFromRows(rows: readonly string[]): IReviewGrid {
  const grid = createGrid(rows[0]?.length ?? 0, rows.length);
  rows.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      if (row[x] === '#') grid.cells[y * grid.width + x] = 1;
    }
  });
  return grid;
}

/** Reads a cell; anything outside the grid counts as background. */
export function cellAt(grid: IReviewGrid, x: number, y: number): number {
  if (x < 0 || y < 0 || x >= grid.width || y >= grid.height) return 0;
  return grid.cells[y * grid.width + x];
}

/** Number of ink cells. */
export function countInk(grid: IReviewGrid): number {
  let total = 0;
  for (const value of grid.cells) total += value;
  return total;
}

/** Smallest box holding every ink cell, or `null` for an empty grid. */
export function inkBounds(
  grid: IReviewGrid,
): { x0: number; y0: number; x1: number; y1: number } | null {
  let x0 = grid.width;
  let y0 = grid.height;
  let x1 = -1;
  let y1 = -1;
  for (let y = 0; y < grid.height; y++) {
    for (let x = 0; x < grid.width; x++) {
      if (!grid.cells[y * grid.width + x]) continue;
      if (x < x0) x0 = x;
      if (x > x1) x1 = x;
      if (y < y0) y0 = y;
      if (y > y1) y1 = y;
    }
  }
  return x1 < 0 ? null : { x0, y0, x1, y1 };
}

/** One erosion step: a cell survives only if it and its four neighbours are ink. */
export function erode(grid: IReviewGrid): IReviewGrid {
  const out = createGrid(grid.width, grid.height);
  for (let y = 0; y < grid.height; y++) {
    for (let x = 0; x < grid.width; x++) {
      const keep =
        cellAt(grid, x, y) &&
        cellAt(grid, x - 1, y) &&
        cellAt(grid, x + 1, y) &&
        cellAt(grid, x, y - 1) &&
        cellAt(grid, x, y + 1);
      if (keep) out.cells[y * grid.width + x] = 1;
    }
  }
  return out;
}

/** Applies `erode` the given number of times. */
export function erodeTimes(grid: IReviewGrid, steps: number): IReviewGrid {
  let current = grid;
  for (let i = 0; i < steps; i++) current = erode(current);
  return current;
}

/** One connected region of equal cells. */
export interface IGridComponent {
  readonly size: number;
  /** True when the region touches the grid border. */
  readonly touchesBorder: boolean;
}

/**
 * Connected regions of `value` cells (flood fill).
 *
 * @param eight `true` joins diagonal neighbours; `false` uses the four edge neighbours.
 */
export function components(grid: IReviewGrid, value: 0 | 1, eight: boolean): IGridComponent[] {
  const seen = new Uint8Array(grid.cells.length);
  const result: IGridComponent[] = [];
  for (let start = 0; start < grid.cells.length; start++) {
    if (seen[start] || grid.cells[start] !== value) continue;
    let size = 0;
    let touchesBorder = false;
    const stack = [start];
    seen[start] = 1;
    while (stack.length > 0) {
      const index = stack.pop() as number;
      const x = index % grid.width;
      const y = (index - x) / grid.width;
      size++;
      if (x === 0 || y === 0 || x === grid.width - 1 || y === grid.height - 1) {
        touchesBorder = true;
      }
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if ((dx === 0 && dy === 0) || (!eight && dx !== 0 && dy !== 0)) continue;
          const nx = x + dx;
          const ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= grid.width || ny >= grid.height) continue;
          const next = ny * grid.width + nx;
          if (seen[next] || grid.cells[next] !== value) continue;
          seen[next] = 1;
          stack.push(next);
        }
      }
    }
    result.push({ size, touchesBorder });
  }
  return result;
}

/** Left-right mirror of a grid. */
export function mirrorGrid(grid: IReviewGrid): IReviewGrid {
  const out = createGrid(grid.width, grid.height);
  for (let y = 0; y < grid.height; y++) {
    for (let x = 0; x < grid.width; x++) {
      out.cells[y * grid.width + x] = grid.cells[y * grid.width + (grid.width - 1 - x)];
    }
  }
  return out;
}

/** True when any ink cell sits on the outermost ring of the grid. */
export function touchesEdge(grid: IReviewGrid): boolean {
  for (let x = 0; x < grid.width; x++) {
    if (cellAt(grid, x, 0) || cellAt(grid, x, grid.height - 1)) return true;
  }
  for (let y = 0; y < grid.height; y++) {
    if (cellAt(grid, 0, y) || cellAt(grid, grid.width - 1, y)) return true;
  }
  return false;
}

/**
 * Intersection over union of two same-size grids; two empty grids count as identical (`1`).
 */
export function iou(a: IReviewGrid, b: IReviewGrid): number {
  let both = 0;
  let either = 0;
  for (let i = 0; i < a.cells.length; i++) {
    const inA = a.cells[i];
    const inB = b.cells[i];
    both += inA & inB;
    either += inA | inB;
  }
  return either === 0 ? 1 : both / either;
}

/** Ink present in every grid: the fixed part of a frame, such as its rails. */
export function commonInk(grids: readonly IReviewGrid[]): IReviewGrid {
  const first = grids[0];
  const out = createGrid(first.width, first.height);
  for (let i = 0; i < out.cells.length; i++) {
    out.cells[i] = grids.every((g) => g.cells[i]) ? 1 : 0;
  }
  return out;
}

/** Copy of `grid` with every cell that is ink in `remove` cleared. */
export function subtractInk(grid: IReviewGrid, remove: IReviewGrid): IReviewGrid {
  const out = createGrid(grid.width, grid.height);
  for (let i = 0; i < out.cells.length; i++) {
    out.cells[i] = grid.cells[i] && !remove.cells[i] ? 1 : 0;
  }
  return out;
}
