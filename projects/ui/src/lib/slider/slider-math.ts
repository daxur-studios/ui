/** Default increment for missing, non-finite, or non-positive steps. */
export const DEFAULT_SLIDER_STEP = 1;
/** Decimal places retained to remove floating-point stepping noise. */
const VALUE_PRECISION = 12;
/** Pixel precision keeps generated SVG attributes stable and readable. */
const PIXEL_PRECISION = 3;
/** Lower endpoint of normalized ranges and safe fallback for invalid dimensions. */
const ZERO = 0;
/** Upper endpoint of normalized ranges. */
const ONE = 1;
/** Splits a dimension into two equal margins. */
const HALF = 2;

/** Finite ordered bounds shared by rendering, accessibility, and interaction. */
export function normalizeSliderBounds(min: number, max: number): { min: number; max: number } {
  const lower = Number.isFinite(min) ? min : ZERO;
  const upper = Number.isFinite(max) && max > lower ? max : lower;
  return { min: lower, max: upper };
}

/** Supplies a usable increment so invalid inputs cannot poison keyboard or pointer math. */
export function normalizeSliderStep(step: number): number {
  return Number.isFinite(step) && step > ZERO ? step : DEFAULT_SLIDER_STEP;
}

/** Clamps and snaps relative to min; explicit endpoints remain reachable off the step lattice. */
export function clampAndSnapValue(
  rawValue: number,
  min: number,
  max: number,
  step: number,
): number {
  const bounds = normalizeSliderBounds(min, max);
  const value = Number.isFinite(rawValue) ? rawValue : bounds.min;
  if (value <= bounds.min) return bounds.min;
  if (value >= bounds.max) return bounds.max;
  const increment = normalizeSliderStep(step);
  const steps = (value - bounds.min) / increment;
  // Extreme magnitudes can overflow a step count; the finite input is still a safe value.
  const snapped = Number.isFinite(steps) ? bounds.min + Math.round(steps) * increment : value;
  return Math.min(bounds.max, Math.max(bounds.min, Number(snapped.toFixed(VALUE_PRECISION))));
}

/** Converts a value to a finite unit ratio, including collapsed and invalid ranges. */
export function valueToRatio(value: number, min: number, max: number): number {
  const bounds = normalizeSliderBounds(min, max);
  if (bounds.max === bounds.min || !Number.isFinite(value)) return ZERO;
  const bounded = Math.min(bounds.max, Math.max(bounds.min, value));
  const span = bounds.max - bounds.min;
  return Number.isFinite(span)
    ? (bounded - bounds.min) / span
    : (bounded / HALF - bounds.min / HALF) / (bounds.max / HALF - bounds.min / HALF);
}

/** Converts a normalized pointer position into a clamped, stepped control value. */
export function ratioToValue(ratio: number, min: number, max: number, step: number): number {
  const bounds = normalizeSliderBounds(min, max);
  const position = Number.isFinite(ratio) ? Math.min(ONE, Math.max(ZERO, ratio)) : ZERO;
  const value = bounds.min * (ONE - position) + bounds.max * position;
  return clampAndSnapValue(value, bounds.min, bounds.max, step);
}

/** Responsive rail geometry in CSS pixels; dimensions may be zero before the first measurement. */
export interface ISliderTrackGeometry {
  readonly width: number;
  readonly height: number;
  readonly ratio: number;
  readonly hookDx: number;
  readonly hookDy: number;
  readonly trackY: number;
  readonly thumbRadius: number;
}

/** Paths and exact knob coordinates from a single geometry calculation. */
export interface ISliderSvgPaths {
  readonly activePath: string;
  readonly inactivePath: string;
  readonly thumbX: number;
  readonly thumbY: number;
}

/** Draws a horizontal rail followed by a downward hook, keeping the entire knob inside the canvas. */
export function buildAngledTrackPath(geometry: ISliderTrackGeometry): ISliderSvgPaths {
  const dimension = (value: number) => (Number.isFinite(value) ? Math.max(ZERO, value) : ZERO);
  const pixel = (value: number) => Number(value.toFixed(PIXEL_PRECISION));
  const width = dimension(geometry.width);
  const height = dimension(geometry.height);
  const radius = Math.min(dimension(geometry.thumbRadius), width / HALF, height / HALF);
  const startX = radius;
  const endX = width - radius;
  const ratio = Number.isFinite(geometry.ratio)
    ? Math.min(ONE, Math.max(ZERO, geometry.ratio))
    : ZERO;
  const trackY = pixel(Math.min(height - radius, Math.max(radius, dimension(geometry.trackY))));
  const thumbX = pixel(startX + (endX - startX) * ratio);
  const thumbY = pixel(Math.min(height - radius, trackY + dimension(geometry.hookDy)));
  const kneeX = pixel(Math.max(startX, thumbX - dimension(geometry.hookDx)));
  return {
    activePath: `M ${pixel(startX)} ${trackY} L ${kneeX} ${trackY} L ${thumbX} ${thumbY}`,
    inactivePath: `M ${thumbX} ${thumbY} L ${pixel(endX)} ${thumbY}`,
    thumbX,
    thumbY,
  };
}
