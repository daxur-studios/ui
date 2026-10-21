import { ChangeDetectionStrategy, Component, computed } from '@angular/core';
import { provideUiFormControl } from '../forms/ui-form-control';
import { buildAngledTrackPath, valueToRatio } from './slider-math';
import { UiSliderBase, type IUiSliderDrag } from './ui-slider-base';

/** SVG canvas height; the CSS container may scale it without changing its proportions. */
const TRACK_HEIGHT = 40;
/** Inset keeps the entire knob visible at both range endpoints. */
const THUMB_RADIUS = 6;
/** Horizontal run of the angled hook. */
const HOOK_DX = 16;
/** Vertical drop from the active rail to the knob. */
const HOOK_DY = 12;
/** Active rail centerline measured from the top of the canvas. */
const TRACK_Y = 10;
/** Two symmetric knob margins are removed when mapping pointer position onto the rail. */
const EDGE_COUNT = 2;
/** A rail narrower than its knob margins reports the start of the range. */
const ZERO_SPAN = 0;
/** Unique label IDs allow multiple sliders to provide independent accessible names. */
let nextSliderId = 0;

/** Accessible live-preview range control with a responsive angled SVG rail and terminal commits. */
@Component({
  selector: 'ui--slider',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './slider.component.html',
  styleUrl: './slider.component.scss',
  providers: [provideUiFormControl(() => SliderComponent)],
})
export class SliderComponent extends UiSliderBase {
  protected readonly trackHeight = TRACK_HEIGHT;
  protected readonly thumbRadius = THUMB_RADIUS;
  protected readonly labelId = `ui-slider-label-${nextSliderId++}`;
  protected readonly paths = computed(() =>
    buildAngledTrackPath({
      width: this.trackWidth(),
      height: TRACK_HEIGHT,
      ratio: valueToRatio(this.currentValue(), this.bounds().min, this.bounds().max),
      hookDx: HOOK_DX,
      hookDy: HOOK_DY,
      trackY: TRACK_Y,
      thumbRadius: THUMB_RADIUS,
    }),
  );

  /** Removes one knob margin at each edge so the knob stays fully inside the rail. */
  protected pointerRatio(clientX: number, drag: IUiSliderDrag): number {
    const radius = Math.min(THUMB_RADIUS, drag.width / EDGE_COUNT);
    const span = drag.width - radius * EDGE_COUNT;
    return span > ZERO_SPAN ? (clientX - drag.left - radius) / span : ZERO_SPAN;
  }
}
