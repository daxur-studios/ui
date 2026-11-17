import { createGrid, type IReviewGrid, REVIEW_CELL_PX, REVIEW_GRID_PAD } from './review-grid';
import type { IReviewGeometry } from './review-types';

/** Alpha at or above this counts as ink after antialiasing. */
const ALPHA_THRESHOLD = 128;

/** Ink and keep-out rasters for one cell. */
export interface IRasterCell {
  readonly ink: IReviewGrid;
  /** Mask of keep-out boxes; `undefined` for motifs. */
  readonly keepOut?: IReviewGrid;
}

/** Creates a canvas context sized to the grid for a geometry. */
function contextFor(geometry: IReviewGeometry): {
  ctx: CanvasRenderingContext2D;
  width: number;
  height: number;
} {
  const width = Math.ceil(geometry.width / REVIEW_CELL_PX) + REVIEW_GRID_PAD * 2;
  const headroom = geometry.headroom ?? 0;
  const headCells = Math.ceil(headroom / REVIEW_CELL_PX);
  const height = Math.ceil(geometry.height / REVIEW_CELL_PX) + headCells + REVIEW_GRID_PAD * 2;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('2d canvas is not available');
  const scale = 1 / REVIEW_CELL_PX;
  ctx.setTransform(scale, 0, 0, scale, REVIEW_GRID_PAD, REVIEW_GRID_PAD + headCells);
  return { ctx, width, height };
}

/** Reads thresholded alpha into a grid. */
function readGrid(ctx: CanvasRenderingContext2D, width: number, height: number): IReviewGrid {
  const data = ctx.getImageData(0, 0, width, height).data;
  const grid = createGrid(width, height);
  for (let i = 0; i < grid.cells.length; i++) {
    grid.cells[i] = data[i * 4 + 3] >= ALPHA_THRESHOLD ? 1 : 0;
  }
  return grid;
}

/**
 * Rasterises a cell's geometry at `REVIEW_CELL_PX` CSS pixels per grid cell, padded so ink that
 * reaches the cell border shows up on the grid's outer ring. Browser only.
 */
export function rasteriseGeometry(geometry: IReviewGeometry): IRasterCell {
  const { ctx, width, height } = contextFor(geometry);
  ctx.fillStyle = '#000';
  ctx.strokeStyle = '#000';
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  for (const ink of geometry.ink) {
    const path = new Path2D(ink.d);
    if (ink.strokeWidth === undefined) {
      ctx.fill(path, ink.fillRule ?? 'nonzero');
    } else {
      ctx.lineWidth = ink.strokeWidth;
      ctx.stroke(path);
    }
  }
  const inkGrid = readGrid(ctx, width, height);
  if (!geometry.keepOut) return { ink: inkGrid };

  const mask = contextFor(geometry);
  mask.ctx.fillStyle = '#000';
  for (const box of geometry.keepOut) mask.ctx.fillRect(box.x, box.y, box.width, box.height);
  return { ink: inkGrid, keepOut: readGrid(mask.ctx, mask.width, mask.height) };
}
