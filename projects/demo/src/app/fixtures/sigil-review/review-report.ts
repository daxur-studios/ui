import type { ICellMetrics, ICellSpread, IVariety } from './review-metrics';
import { KEEP_OUT_TOLERANCE } from './review-metrics';
import type { IReviewSubject, ReviewMetricName } from './review-types';

/** Measurements and flags for one rendered cell. */
export interface ICellReport {
  readonly seed: number;
  readonly width: number;
  readonly metrics: ICellMetrics;
  /** `out-of-bounds`, `keep-out`, or `band:<metric>` for each band the cell misses. */
  readonly flags: readonly string[];
}

/** Summary of all seeds at one width. */
export interface IWidthSummary {
  readonly width: number;
  readonly spread: ICellSpread;
  readonly variety: IVariety;
  /** Seeds at which the hard invariants failed (empty when the width is fine). */
  readonly invariantFailures: readonly number[];
}

/** What the review page publishes on `window.__sigilReview`. */
export interface IReviewReport {
  readonly subject: string;
  readonly seeds: readonly number[];
  readonly widths: readonly number[];
  readonly cells: readonly ICellReport[];
  readonly summary: readonly IWidthSummary[];
  /** Frames only: true when no width has an invariant failure. */
  readonly resizeStable: boolean | null;
  readonly ready: boolean;
}

/** Flags for a cell: hard-invariant breaches first, then missed target bands. */
export function flagsFor(metrics: ICellMetrics, subject: IReviewSubject): string[] {
  const flags: string[] = [];
  if (metrics.outOfBounds) flags.push('out-of-bounds');
  if (metrics.keepOutHit > KEEP_OUT_TOLERANCE) flags.push('keep-out');
  for (const [name, band] of Object.entries(subject.bands ?? {}) as [
    ReviewMetricName,
    readonly [number, number],
  ][]) {
    const value = metrics[name];
    if (value < band[0] || value > band[1]) flags.push(`band:${name}`);
  }
  return flags;
}

/** True for flags that are hard-invariant breaches rather than looks. */
export function isInvariantFlag(flag: string): boolean {
  return flag === 'out-of-bounds' || flag === 'keep-out';
}
