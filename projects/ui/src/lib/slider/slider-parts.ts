import type { ISegmentedCell } from '../slider-segmented/slider-segmented-math';

/**
 * Read-ready state every slider recipe reads to build its primitives. Values are already normalized
 * and snapped by the headless core, so a recipe only maps them onto SVG geometry.
 */
export interface ISliderPartState {
  /** Measured width in CSS pixels of the interactive rail. */
  readonly width: number;
  /** Lower, ordered range endpoint. */
  readonly min: number;
  /** Upper, ordered range endpoint. */
  readonly max: number;
  /** Current value, already clamped and snapped. */
  readonly value: number;
  /** Formatted readout text (value plus unit), for recipes that draw the value in the canvas. */
  readonly text: string;
}

/**
 * Presentation knobs a recipe may consume. Declared once on the recipe component so every recipe
 * shares a single, stable input surface; recipes ignore the knobs they do not use.
 */
export interface ISliderRecipeContext {
  /** Requested number of discrete cells, used by the segmented recipe. */
  readonly cellCount: number;
  /** Requested number of tick marks, used by tick-scale recipes. */
  readonly tickCount: number;
  /** Whether the optional chamfered outer wrapper should render, used by the notch recipe. */
  readonly wrapper: boolean;
}

/** A straight or multi-segment SVG path. Covers rails, active tracks, brackets, fills, and ticks. */
export interface ISliderPathPart {
  readonly kind: 'path';
  /** Token-styled CSS class name; must match a rule in `slider.component.scss`. */
  readonly cssClass: string;
  /** SVG path data. */
  readonly d: string;
}

/** The segmented cell array; each cell reports its own lit state. */
export interface ISliderCellsPart {
  readonly kind: 'cells';
  readonly cells: readonly ISegmentedCell[];
}

/** A circular thumb. */
export interface ISliderCirclePart {
  readonly kind: 'circle';
  readonly cssClass: string;
  readonly cx: number;
  readonly cy: number;
  readonly r: number;
}

/** An in-canvas text readout, used by recipes that anchor the value to the handle. */
export interface ISliderTextPart {
  readonly kind: 'text';
  readonly cssClass: string;
  readonly x: number;
  readonly y: number;
  readonly text: string;
  readonly anchor: 'start' | 'middle' | 'end';
}

/**
 * One render-ready primitive. The recipe component renders a list of these with a single `@switch`,
 * so a new look is new data — never a new component class.
 */
export type ISliderPart = ISliderPathPart | ISliderCellsPart | ISliderCirclePart | ISliderTextPart;
