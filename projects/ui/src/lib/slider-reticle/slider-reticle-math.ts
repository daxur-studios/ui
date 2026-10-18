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

/** Default thumb radius in pixels. */
export const DEFAULT_RETICLE_THUMB_RADIUS = 5;
/** Distance in pixels between thumb center and caliper brackets. */
export const CALIPER_OFFSET = 10;
/** Length in pixels of caliper bracket arms. */
export const CALIPER_ARM = 4;
/** Top rail vertical offset from canvas top. */
export const RAIL_Y_TOP = 10;
/** Bottom rail vertical offset from canvas top. */
export const RAIL_Y_BOTTOM = 30;
/** Pixel precision for SVG path output. */
const PIXEL_PRECISION = 2;
/** Zero threshold. */
const ZERO = 0;
/** Number of endpoints. */
const TWO = 2;

export interface ISliderReticleGeometry {
  readonly width: number;
  readonly height: number;
  readonly min: number;
  readonly max: number;
  readonly value: number;
  readonly thumbRadius?: number;
}

export interface ISliderReticlePaths {
  readonly topRailPath: string;
  readonly bottomRailPath: string;
  readonly originTickPath: string;
  readonly activeFillPath: string;
  readonly leftBracketPath: string;
  readonly rightBracketPath: string;
  readonly thumbDiamondPath: string;
  readonly thumbX: number;
  readonly thumbY: number;
  readonly isBipolar: boolean;
}

function toPixel(val: number): number {
  return Number(val.toFixed(PIXEL_PRECISION));
}

/**
 * Builds dual-rail and reticle caliper SVG geometry for bipolar or unipolar range sliders.
 */
export function buildReticleSliderPaths(geometry: ISliderReticleGeometry): ISliderReticlePaths {
  const width = Math.max(ZERO, geometry.width);
  const height = Math.max(ZERO, geometry.height);
  const radius = geometry.thumbRadius ?? DEFAULT_RETICLE_THUMB_RADIUS;
  const bounds = normalizeSliderBounds(geometry.min, geometry.max);
  const isBipolar = bounds.min < ZERO && bounds.max > ZERO;

  const margin = Math.max(radius + CALIPER_OFFSET + CALIPER_ARM, ZERO);
  const startX = toPixel(margin);
  const endX = toPixel(Math.max(startX, width - margin));
  const span = Math.max(ZERO, endX - startX);

  const ratio = valueToRatio(geometry.value, bounds.min, bounds.max);
  const thumbX = toPixel(startX + span * ratio);
  const thumbY = toPixel(height / TWO);

  // Origin position for bipolar sliders
  const originRatio = isBipolar ? valueToRatio(ZERO, bounds.min, bounds.max) : ZERO;
  const originX = toPixel(startX + span * originRatio);

  const yTop = toPixel(Math.min(height, RAIL_Y_TOP));
  const yBottom = toPixel(Math.min(height, RAIL_Y_BOTTOM));

  // Dual rails
  const topRailPath = `M ${startX} ${yTop} L ${endX} ${yTop}`;
  const bottomRailPath = `M ${startX} ${yBottom} L ${endX} ${yBottom}`;

  // Origin tick (draw tick extending 3px above top rail and 3px below bottom rail)
  const originTickPath = isBipolar
    ? `M ${originX} ${toPixel(yTop - 3)} L ${originX} ${toPixel(yBottom + 3)}`
    : '';

  // Active fill path between rails from origin (or start) to thumb
  const fillLeft = Math.min(originX, thumbX);
  const fillRight = Math.max(originX, thumbX);
  const activeFillPath =
    fillRight > fillLeft
      ? `M ${fillLeft} ${yTop} L ${fillRight} ${yTop} L ${fillRight} ${yBottom} L ${fillLeft} ${yBottom} Z`
      : '';

  // Left caliper bracket: [
  const lbX = toPixel(thumbX - CALIPER_OFFSET);
  const lbArm = toPixel(lbX - CALIPER_ARM);
  const leftBracketPath = `M ${lbX} ${yTop} L ${lbArm} ${yTop} L ${lbArm} ${yBottom} L ${lbX} ${yBottom}`;

  // Right caliper bracket: ]
  const rbX = toPixel(thumbX + CALIPER_OFFSET);
  const rbArm = toPixel(rbX + CALIPER_ARM);
  const rightBracketPath = `M ${rbX} ${yTop} L ${rbArm} ${yTop} L ${rbArm} ${yBottom} L ${rbX} ${yBottom}`;

  // Diamond thumb at (thumbX, thumbY)
  const thumbDiamondPath = `M ${thumbX} ${toPixel(thumbY - radius)} L ${toPixel(thumbX + radius)} ${thumbY} L ${thumbX} ${toPixel(thumbY + radius)} L ${toPixel(thumbX - radius)} ${thumbY} Z`;

  return {
    topRailPath,
    bottomRailPath,
    originTickPath,
    activeFillPath,
    leftBracketPath,
    rightBracketPath,
    thumbDiamondPath,
    thumbX,
    thumbY,
    isBipolar,
  };
}
