import { ChangeDetectionStrategy, Component, computed } from '@angular/core';
import { provideUiFormControl } from '../forms/ui-form-control';
import { UiSliderBase, type IUiSliderDrag } from '../slider/ui-slider-base';
import { buildReticleSliderPaths, DEFAULT_RETICLE_THUMB_RADIUS } from './slider-reticle-math';

/** SVG canvas height in pixels. */
const TRACK_HEIGHT = 40;
/** Margin on both sides reserved for the caliper brackets during pointer mapping. */
const CALIPER_TOTAL_MARGIN = 20;
/** Smallest pointer span to avoid division by zero. */
const MIN_SPAN = 1;
/** Normalized lower bound. */
const ZERO = 0;
/** Normalized upper bound. */
const ONE = 1;
/** ID counter for unique label associations. */
let nextReticleSliderId = 0;

/**
 * Tactical dual-rail slider with reticle caliper brackets and zero/origin tick for bipolar ranges.
 * Extends `UiSliderBase` for the shared value, keyboard, pointer, and reactive-forms behaviour.
 */
@Component({
  selector: 'ui--slider-reticle',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './slider-reticle.component.html',
  styleUrl: './slider-reticle.component.scss',
  providers: [provideUiFormControl(() => SliderReticleComponent)],
})
export class SliderReticleComponent extends UiSliderBase {
  protected readonly trackHeight = TRACK_HEIGHT;
  protected readonly labelId = `ui-slider-reticle-label-${nextReticleSliderId++}`;
  protected readonly paths = computed(() =>
    buildReticleSliderPaths({
      width: this.trackWidth(),
      height: TRACK_HEIGHT,
      min: this.bounds().min,
      max: this.bounds().max,
      value: this.currentValue(),
      thumbRadius: DEFAULT_RETICLE_THUMB_RADIUS,
    }),
  );

  /** Clamps the pointer into the rail span that sits between the caliper brackets. */
  protected pointerRatio(clientX: number, drag: IUiSliderDrag): number {
    const span = Math.max(MIN_SPAN, drag.width - CALIPER_TOTAL_MARGIN * 2);
    const offset = clientX - drag.left - CALIPER_TOTAL_MARGIN;
    return Math.min(ONE, Math.max(ZERO, offset / span));
  }
}
