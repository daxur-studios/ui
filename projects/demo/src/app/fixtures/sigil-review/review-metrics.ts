import {
  commonInk,
  components,
  countInk,
  erode,
  erodeTimes,
  type IReviewGrid,
  inkBounds,
  iou,
  mirrorGrid,
  maskDepth,
  overshootCells,
  REVIEW_CELL_PX,
  subtractInk,
} from './review-grid';
import type { ReviewMetricName } from './review-types';

/** Erosion steps used to find how much of the ink is heavy mass rather than strokes. */
export const MASS_EROSIONS = 4;

/** Ink regions smaller than this many cells count as stray fragments. */
export const FRAGMENT_MIN_CELLS = 6;

/** Largest share of a keep-out box that ornament may cover before a run fails. */
export const KEEP_OUT_TOLERANCE = 0.01;

/** Measurements for one rendered cell. */
export interface ICellMetrics extends Record<ReviewMetricName, number> {
  /** True when ink goes past the content box (`overshootPx > 0`). */
  readonly outOfBounds: boolean;
  /** CSS px the ink reaches past the content box; `0` when it stays inside or only touches. */
  readonly overshootPx: number;
  /** CSS px the ink reaches into a keep-out box (about); `0` when it stays out. */
  readonly keepOutDepthPx: number;
}

/** Share of `part` in `whole`; `0` when `whole` is `0`. */
function ratio(part: number, whole: number): number {
  return whole === 0 ? 0 : part / whole;
}

/** Share of the keep-out mask area that is covered by ink; `0` when the mask is empty. */
export function keepOutHit(ink: IReviewGrid, keepOutMask: IReviewGrid): number {
  let covered = 0;
  let total = 0;
  for (let i = 0; i < keepOutMask.cells.length; i++) {
    if (!keepOutMask.cells[i]) continue;
    total++;
    covered += ink.cells[i];
  }
  return ratio(covered, total);
}

/**
 * Measures one cell's ink grid.
 *
 * @param keepOutMask Optional grid marking content boxes; omit for motifs.
 * @param pad Empty rings around the content box; ink in them is past the edge.
 */
export function measureCell(
  ink: IReviewGrid,
  keepOutMask?: IReviewGrid,
  pad = 1,
): ICellMetrics {
  const overshoot = overshootCells(ink, pad);
  const inkCells = countInk(ink);
  const bounds = inkBounds(ink);
  const boxCells = bounds ? (bounds.x1 - bounds.x0 + 1) * (bounds.y1 - bounds.y0 + 1) : 0;
  const fragments = components(ink, 1, true).filter((c) => c.size < FRAGMENT_MIN_CELLS).length;
  const pockets = components(ink, 0, false).filter((c) => !c.touchesBorder).length;
  return {
    coverage: ratio(inkCells, boxCells),
    boxFill: ratio(boxCells, ink.width * ink.height),
    hairline: inkCells === 0 ? 0 : 1 - ratio(countInk(erode(ink)), inkCells),
    mass: ratio(countInk(erodeTimes(ink, MASS_EROSIONS)), inkCells),
    fragments,
    pockets,
    mirror: iou(ink, mirrorGrid(ink)),
    keepOutHit: keepOutMask ? keepOutHit(ink, keepOutMask) : 0,
    outOfBounds: overshoot > 0,
    overshootPx: overshoot * REVIEW_CELL_PX,
    keepOutDepthPx: keepOutMask ? maskDepth(ink, keepOutMask) * REVIEW_CELL_PX : 0,
  };
}

/** The most different pair of seeds is not interesting; the most similar pair is. */
export interface IVarietyMin {
  /** Smallest pairwise `1 - IoU`. */
  readonly value: number;
  /** Indices into the grid list of the two most similar cells. */
  readonly a: number;
  readonly b: number;
}

/** How different the seeds are from each other. */
export interface IVariety {
  /** Mean pairwise `1 - IoU`. */
  readonly mean: number;
  /** Most similar pair, or `null` with fewer than two grids. */
  readonly min: IVarietyMin | null;
}

/**
 * Pairwise difference between seed grids.
 *
 * @param subtractFixed Removes ink common to every grid first, so a frame's fixed rails do not
 * hide how little its ornament changes.
 */
export function variety(grids: readonly IReviewGrid[], subtractFixed: boolean): IVariety {
  if (grids.length < 2) return { mean: 0, min: null };
  const fixed = subtractFixed ? commonInk(grids) : null;
  const work = fixed ? grids.map((g) => subtractInk(g, fixed)) : grids;
  let sum = 0;
  let pairs = 0;
  let min: IVarietyMin | null = null;
  for (let a = 0; a < work.length; a++) {
    for (let b = a + 1; b < work.length; b++) {
      const distance = 1 - iou(work[a], work[b]);
      sum += distance;
      pairs++;
      if (min === null || distance < min.value) min = { value: distance, a, b };
    }
  }
  return { mean: sum / pairs, min };
}

/** Minimum, median and maximum of a set of numbers. */
export interface ISpread {
  readonly min: number;
  readonly median: number;
  readonly max: number;
}

/** Spread of a list; all zeros for an empty list. */
export function spreadOf(values: readonly number[]): ISpread {
  if (values.length === 0) return { min: 0, median: 0, max: 0 };
  const sorted = [...values].sort((x, y) => x - y);
  const mid = sorted.length >> 1;
  const median = sorted.length % 2 === 1 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  return { min: sorted[0], median, max: sorted[sorted.length - 1] };
}

/** Every per-cell measurement summarised across cells. */
export type ICellSpread = Record<ReviewMetricName, ISpread>;

/** Spread of each numeric measurement across cells. */
export function summariseCells(cells: readonly ICellMetrics[]): ICellSpread {
  const names: ReviewMetricName[] = [
    'coverage',
    'boxFill',
    'hairline',
    'mass',
    'fragments',
    'pockets',
    'mirror',
    'keepOutHit',
  ];
  const out = {} as ICellSpread;
  for (const name of names) out[name] = spreadOf(cells.map((c) => c[name]));
  return out;
}
