/** One filled or stroked path contributing to the ornament silhouette. */
export interface IReviewInk {
  readonly d: string;
  /** Stroke width in subject units; omit for a filled path. */
  readonly strokeWidth?: number;
  /** Fill rule for filled paths. Default `nonzero`. */
  readonly fillRule?: 'nonzero' | 'evenodd';
}

/** An axis-aligned box in a cell's own coordinate space. */
export interface IReviewBox {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

/** Geometry for one cell, in its own coordinate box. */
export interface IReviewGeometry {
  readonly width: number;
  readonly height: number;
  readonly ink: readonly IReviewInk[];
  /** Boxes that ornament must stay out of (text, controls). Frames only. */
  readonly keepOut?: readonly IReviewBox[];
}

/** A motif is a free-standing ornament; a frame wraps real content and must resize. */
export type ReviewSubjectKind = 'motif' | 'frame';

/** Numeric per-cell measurements that can have a target band. */
export type ReviewMetricName =
  'coverage' | 'boxFill' | 'hairline' | 'mass' | 'fragments' | 'pockets' | 'mirror' | 'keepOutHit';

/** One generator in one configuration, reviewed by the harness. */
export interface IReviewSubject {
  /** Kebab-case id, used on the command line and in output paths. */
  readonly id: string;
  readonly kind: ReviewSubjectKind;
  readonly label: string;
  /** Reference image file names under `/concept/cybersigillism/`. */
  readonly references: readonly string[];
  /** Cell widths in CSS pixels. Motifs usually one; frames several. */
  readonly widths: readonly number[];
  /** Cell height for a given width. */
  heightFor(width: number): number;
  /** Pure, deterministic geometry. No DOM access. */
  geometry(seed: number, width: number): IReviewGeometry;
  /** Reference-window variant to mount as a dressed row, for looking only; omit for none. */
  readonly dressedVariant?: 'desktop' | 'phone';
  /** Optional target ranges; cells outside are flagged, not failed. */
  readonly bands?: Partial<Record<ReviewMetricName, readonly [min: number, max: number]>>;
}
