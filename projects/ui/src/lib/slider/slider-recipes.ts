import {
  buildReticleSliderPaths,
  DEFAULT_RETICLE_THUMB_RADIUS,
} from '../slider-reticle/slider-reticle-math';
import {
  buildSegmentedCells,
  DEFAULT_CELL_GAP,
  DEFAULT_CHAMFER,
} from '../slider-segmented/slider-segmented-math';
import type {
  ISliderPart,
  ISliderPartState,
  ISliderPathPart,
  ISliderRecipeContext,
} from './slider-parts';
import { buildAngledTrackPath, valueToRatio } from './slider-math';

/** Every shipped slider look. Adding a look is adding a key here — never a new component class. */
export type SliderRecipe = 'angled' | 'segmented' | 'reticle' | 'notch';

/** Heading chrome a recipe renders above the track. */
export type SliderReadout = 'heading' | 'badge-chamfer' | 'badge-rounded' | 'inline';

/** Recipe used by `ui--slider` when no `recipe` input is supplied. */
export const DEFAULT_SLIDER_RECIPE: SliderRecipe = 'angled';

/** Measured rail rectangle captured once per pointer transaction. */
export interface ISliderDragRect {
  readonly left: number;
  readonly width: number;
}

/**
 * One slider look: the geometry seam (height, pointer mapping) plus the ordered primitives and the
 * heading chrome. A recipe is pure data and pure functions, so a new look needs no component class.
 */
export interface ISliderRecipeDefinition {
  /** SVG canvas height in CSS pixels. */
  readonly height: number;
  /** Heading chrome variant rendered above the track. */
  readonly readout: SliderReadout;
  /** `preserveAspectRatio` for the SVG, or `null` to keep the SVG default. */
  readonly preserveAspectRatio: 'none' | null;
  /** Container class carrying the recipe's track chrome (padding, border, wrapper). */
  readonly trackClass: string;
  /** Whether the recipe renders an optional chamfered outer wrapper. */
  readonly wrappable: boolean;
  /** Maps a pointer client X onto a normalized ratio using this recipe's rail insets. */
  readonly pointerRatio: (clientX: number, rect: ISliderDragRect) => number;
  /** Builds the ordered primitive list from normalized state and presentation context. */
  readonly parts: (
    state: ISliderPartState,
    context: ISliderRecipeContext,
  ) => readonly ISliderPart[];
}

/** SVG canvas height for the angled rail attempt. */
const ANGLED_TRACK_HEIGHT = 40;
/** Inset keeps the entire knob visible at both range endpoints. */
const ANGLED_THUMB_RADIUS = 6;
/** Horizontal run of the angled hook. */
const ANGLED_HOOK_DX = 16;
/** Vertical drop from the active rail to the knob. */
const ANGLED_HOOK_DY = 12;
/** Active rail centerline measured from the top of the canvas. */
const ANGLED_TRACK_Y = 10;
/** Two symmetric knob margins are removed when mapping pointer position onto the rail. */
const ANGLED_EDGE_COUNT = 2;

/** Height in pixels of the segmented HUD track canvas. */
const SEGMENTED_TRACK_HEIGHT = 28;

/** SVG canvas height for the dual-rail reticle attempt. */
const RETICLE_TRACK_HEIGHT = 40;
/** Pointer margin reserved on each side of the reticle's caliper-bracketed span. */
const RETICLE_POINTER_MARGIN = 20;

/** SVG canvas height for the chamfered notch rail. */
const NOTCH_TRACK_HEIGHT = 40;
/** Vertical inset of the rail's top edge, keeping the shorter rail centred in the hit area. */
const NOTCH_TOP_Y = 10;
/** Vertical extent of the chamfered ends and the handle drop; half the canvas height. */
const NOTCH_DIAGONAL_RISE = 20;
/** Horizontal run of the diagonals; paired with {@link NOTCH_DIAGONAL_RISE} it keeps the original steep angle. */
const NOTCH_DIAGONAL_RUN = 6;
/** Distance between the handle and the anchor point of the readout text. */
const NOTCH_READOUT_GAP = 6;
/** Minimum readout inset so the value never overflows the left chamfer. */
const NOTCH_READOUT_MIN_INSET = 30;

/** Pixel precision keeps generated SVG attributes stable and readable. */
const PIXEL_PRECISION = 2;
/** Zero endpoint and safe fallback for degenerate dimensions. */
const ZERO = 0;
/** Upper endpoint of normalized ranges. */
const ONE = 1;
/** Splits a dimension or margin into two equal halves. */
const HALF = 2;

/** Formats a pixel dimension to a fixed precision. */
function toPixel(value: number): number {
  return Number(value.toFixed(PIXEL_PRECISION));
}

/** Clamps a normalized ratio into the unit interval. */
function clampRatio(ratio: number): number {
  return Number.isFinite(ratio) ? Math.min(ONE, Math.max(ZERO, ratio)) : ZERO;
}

/** Inactive rail, active rail, and circular knob for the angled attempt. */
function angledParts(
  state: ISliderPartState,
  _context: ISliderRecipeContext,
): readonly ISliderPart[] {
  const geometry = buildAngledTrackPath({
    width: state.width,
    height: ANGLED_TRACK_HEIGHT,
    ratio: valueToRatio(state.value, state.min, state.max),
    hookDx: ANGLED_HOOK_DX,
    hookDy: ANGLED_HOOK_DY,
    trackY: ANGLED_TRACK_Y,
    thumbRadius: ANGLED_THUMB_RADIUS,
  });
  return [
    { kind: 'path', cssClass: 'inactive', d: geometry.inactivePath },
    { kind: 'path', cssClass: 'active', d: geometry.activePath },
    {
      kind: 'circle',
      cssClass: 'thumb',
      cx: geometry.thumbX,
      cy: geometry.thumbY,
      r: ANGLED_THUMB_RADIUS,
    },
  ];
}

/** The discrete illuminated cell array for the segmented attempt. */
function segmentedParts(
  state: ISliderPartState,
  context: ISliderRecipeContext,
): readonly ISliderPart[] {
  const cells = buildSegmentedCells({
    width: state.width,
    height: SEGMENTED_TRACK_HEIGHT,
    cellCount: context.cellCount,
    cellGap: DEFAULT_CELL_GAP,
    ratio: valueToRatio(state.value, state.min, state.max),
    chamfer: DEFAULT_CHAMFER,
  });
  return [{ kind: 'cells', cells }];
}

/** Dual rails, bipolar origin tick, fill, caliper brackets, and diamond knob for the reticle attempt. */
function reticleParts(
  state: ISliderPartState,
  _context: ISliderRecipeContext,
): readonly ISliderPart[] {
  const paths = buildReticleSliderPaths({
    width: state.width,
    height: RETICLE_TRACK_HEIGHT,
    min: state.min,
    max: state.max,
    value: state.value,
    thumbRadius: DEFAULT_RETICLE_THUMB_RADIUS,
  });
  const parts: ISliderPathPart[] = [
    { kind: 'path', cssClass: 'rail', d: paths.topRailPath },
    { kind: 'path', cssClass: 'rail', d: paths.bottomRailPath },
  ];
  if (paths.isBipolar && paths.originTickPath) {
    parts.push({ kind: 'path', cssClass: 'origin-tick', d: paths.originTickPath });
  }
  if (paths.activeFillPath) {
    parts.push({ kind: 'path', cssClass: 'active-fill', d: paths.activeFillPath });
  }
  parts.push({ kind: 'path', cssClass: 'caliper-bracket', d: paths.leftBracketPath });
  parts.push({ kind: 'path', cssClass: 'caliper-bracket', d: paths.rightBracketPath });
  parts.push({ kind: 'path', cssClass: 'thumb-diamond', d: paths.thumbDiamondPath });
  return parts;
}

/** Dropped progress line and anchored readout for the notch look. */
function notchParts(
  state: ISliderPartState,
  _context: ISliderRecipeContext,
): readonly ISliderPart[] {
  const width = Math.max(ZERO, state.width);
  const run = Math.min(NOTCH_DIAGONAL_RUN, width / HALF);
  const topY = NOTCH_TOP_Y;
  const bottomY = topY + NOTCH_DIAGONAL_RISE;
  const topRight = Math.max(run, width - run);
  const ratio = clampRatio(valueToRatio(state.value, state.min, state.max));
  const span = Math.max(ZERO, topRight - run);
  const thumbX = toPixel(run + span * ratio);
  const readoutX = Math.max(run + NOTCH_READOUT_MIN_INSET, thumbX - NOTCH_READOUT_GAP);
  const readoutY = toPixel(topY + NOTCH_DIAGONAL_RISE / HALF);
  return [
    {
      kind: 'path',
      cssClass: 'notch-progress',
      d: `M ${toPixel(run)} ${topY} L ${thumbX} ${topY} L ${toPixel(thumbX + run)} ${bottomY}`,
    },
    {
      kind: 'text',
      cssClass: 'notch-readout',
      x: toPixel(readoutX),
      y: readoutY,
      text: state.text,
      anchor: 'end',
    },
  ];
}

/** Maps a pointer across the angled rail's knob-inset span. */
function angledPointerRatio(clientX: number, rect: ISliderDragRect): number {
  const radius = Math.min(ANGLED_THUMB_RADIUS, rect.width / ANGLED_EDGE_COUNT);
  const span = rect.width - radius * ANGLED_EDGE_COUNT;
  return span > ZERO ? (clientX - rect.left - radius) / span : ZERO;
}

/** Maps a pointer across the full segmented rail width, with no knob inset. */
function segmentedPointerRatio(clientX: number, rect: ISliderDragRect): number {
  return rect.width > ZERO ? (clientX - rect.left) / rect.width : ZERO;
}

/** Clamps a pointer into the rail span that sits between the reticle caliper brackets. */
function reticlePointerRatio(clientX: number, rect: ISliderDragRect): number {
  const span = Math.max(ONE, rect.width - RETICLE_POINTER_MARGIN * HALF);
  return clampRatio((clientX - rect.left - RETICLE_POINTER_MARGIN) / span);
}

/** Clamps a pointer into the notch rail's chamfered top-edge span. */
function notchPointerRatio(clientX: number, rect: ISliderDragRect): number {
  const run = Math.min(NOTCH_DIAGONAL_RUN, rect.width / HALF);
  const span = Math.max(ONE, rect.width - run * HALF);
  return clampRatio((clientX - rect.left - run) / span);
}

/** Every shipped look, keyed by its public recipe name. */
export const SLIDER_RECIPES: Readonly<Record<SliderRecipe, ISliderRecipeDefinition>> = {
  angled: {
    height: ANGLED_TRACK_HEIGHT,
    readout: 'heading',
    preserveAspectRatio: 'none',
    trackClass: 'track--angled',
    wrappable: false,
    pointerRatio: angledPointerRatio,
    parts: angledParts,
  },
  segmented: {
    height: SEGMENTED_TRACK_HEIGHT,
    readout: 'badge-chamfer',
    preserveAspectRatio: null,
    trackClass: 'track--segmented',
    wrappable: false,
    pointerRatio: segmentedPointerRatio,
    parts: segmentedParts,
  },
  reticle: {
    height: RETICLE_TRACK_HEIGHT,
    readout: 'badge-rounded',
    preserveAspectRatio: null,
    trackClass: 'track--reticle',
    wrappable: false,
    pointerRatio: reticlePointerRatio,
    parts: reticleParts,
  },
  notch: {
    height: NOTCH_TRACK_HEIGHT,
    readout: 'inline',
    preserveAspectRatio: 'none',
    trackClass: 'track--notch',
    wrappable: true,
    pointerRatio: notchPointerRatio,
    parts: notchParts,
  },
};
