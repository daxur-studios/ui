import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { provideUiFormControl } from '../forms/ui-form-control';
import { UiSliderBase, type IUiSliderDrag } from '../slider/ui-slider-base';
import {
  buildSegmentedCells,
  DEFAULT_CELL_COUNT,
  DEFAULT_CELL_GAP,
  DEFAULT_CHAMFER,
  valueToRatio,
} from './slider-segmented-math';

/** Height in pixels of the segmented HUD track canvas. */
const TRACK_HEIGHT = 28;
/** A zero-width rail reports the start of the range. */
const ZERO = 0;
/** Next unique slider ID counter for accessible ARIA labelling. */
let nextSegmentedSliderId = 0;

/**
 * Tactical segmented-cell HUD range slider that illuminates discrete cells up to the active value.
 * Extends `UiSliderBase` for the shared value, keyboard, pointer, and reactive-forms behaviour.
 */
@Component({
  selector: 'ui--slider-segmented',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './slider-segmented.component.html',
  styleUrl: './slider-segmented.component.scss',
  providers: [provideUiFormControl(() => SliderSegmentedComponent)],
})
export class SliderSegmentedComponent extends UiSliderBase {
  readonly cellCount = input<number>(DEFAULT_CELL_COUNT);

  protected readonly trackHeight = TRACK_HEIGHT;
  protected readonly labelId = `ui-slider-segmented-label-${nextSegmentedSliderId++}`;
  protected readonly ratio = computed(() =>
    valueToRatio(this.currentValue(), this.bounds().min, this.bounds().max),
  );
  protected readonly cells = computed(() =>
    buildSegmentedCells({
      width: this.trackWidth(),
      height: TRACK_HEIGHT,
      cellCount: this.cellCount(),
      cellGap: DEFAULT_CELL_GAP,
      ratio: this.ratio(),
      chamfer: DEFAULT_CHAMFER,
    }),
  );

  /** Maps the pointer across the full rail width, with no knob inset. */
  protected pointerRatio(clientX: number, drag: IUiSliderDrag): number {
    return drag.width > ZERO ? (clientX - drag.left) / drag.width : ZERO;
  }
}
