import {
  clampAndSnapValue,
  normalizeSliderBounds,
  normalizeSliderStep,
  ratioToValue,
  valueToRatio,
} from '../slider/slider-math';

export {
  clampAndSnapValue,
  normalizeSliderBounds,
  normalizeSliderStep,
  ratioToValue,
  valueToRatio,
};

/** Default number of discrete cells in the segmented track. */
export const DEFAULT_CELL_COUNT = 24;
/** Default gap in pixels between adjacent cells. */
export const DEFAULT_CELL_GAP = 2;
/** Default chamfer cut in pixels for corner notches. */
export const DEFAULT_CHAMFER = 3;
/** Precision for pixel measurements in generated SVG attributes. */
const PIXEL_PRECISION = 2;
/** Minimum cell width before cells are omitted. */
const MIN_CELL_WIDTH = 2;
/** Zero threshold for bounds clamping. */
const ZERO = 0;
/** Normalized unit upper bound. */
const ONE = 1;

/** Input parameters for computing discrete segmented cell geometry. */
export interface ISegmentedTrackGeometry {
  readonly width: number;
  readonly height: number;
  readonly cellCount: number;
  readonly cellGap: number;
  readonly ratio: number;
  readonly chamfer: number;
}

/** Precalculated path and state for a single segmented cell in the HUD bar. */
export interface ISegmentedCell {
  readonly index: number;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly active: boolean;
  readonly path: string;
}

/** Formats a pixel dimension to a fixed precision. */
function toPixel(val: number): number {
  return Number(val.toFixed(PIXEL_PRECISION));
}

/**
 * Builds discrete SVG cell paths across the track width, marking cells active
 * up to the current normalized slider ratio.
 */
export function buildSegmentedCells(geometry: ISegmentedTrackGeometry): readonly ISegmentedCell[] {
  const width = Math.max(ZERO, geometry.width);
  const height = Math.max(ZERO, geometry.height);
  const count = Math.max(1, Math.floor(geometry.cellCount));
  const gap = Math.max(ZERO, geometry.cellGap);
  const chamfer = Math.max(ZERO, geometry.chamfer);
  const ratio = Number.isFinite(geometry.ratio)
    ? Math.min(ONE, Math.max(ZERO, geometry.ratio))
    : ZERO;

  const totalGaps = (count - 1) * gap;
  const availableWidth = width - totalGaps;
  if (availableWidth <= ZERO || height <= ZERO) {
    return [];
  }

  const rawCellWidth = availableWidth / count;
  if (rawCellWidth < MIN_CELL_WIDTH) {
    return [];
  }

  const cellWidth = toPixel(rawCellWidth);
  const cells: ISegmentedCell[] = [];

  for (let i = 0; i < count; i++) {
    const x = toPixel(i * (rawCellWidth + gap));
    const y = ZERO;
    const c = Math.min(chamfer, cellWidth / 2, height / 2);
    // Cell is active if current ratio reaches at least the cell's center or fraction
    const cellThreshold = count > 1 ? i / (count - 1) : ZERO;
    // When ratio > 0, at least the first cell lights up if ratio >= 0.01; otherwise compare to threshold
    const active = ratio > ZERO && (ratio >= cellThreshold || (i === 0 && ratio > 0));

    // Polygon with chamfered top-right and bottom-left corners for a sci-fi HUD aesthetic
    const p1 = `M ${x} ${toPixel(y + c)}`;
    const p2 = `L ${toPixel(x + c)} ${y}`;
    const p3 = `L ${toPixel(x + cellWidth - c)} ${y}`;
    const p4 = `L ${toPixel(x + cellWidth)} ${toPixel(y + c)}`;
    const p5 = `L ${toPixel(x + cellWidth)} ${toPixel(y + height - c)}`;
    const p6 = `L ${toPixel(x + cellWidth - c)} ${toPixel(y + height)}`;
    const p7 = `L ${toPixel(x + c)} ${toPixel(y + height)}`;
    const p8 = `L ${x} ${toPixel(y + height - c)} Z`;

    const path = `${p1} ${p2} ${p3} ${p4} ${p5} ${p6} ${p7} ${p8}`;

    cells.push({
      index: i,
      x,
      y,
      width: cellWidth,
      height,
      active,
      path,
    });
  }

  return cells;
}
