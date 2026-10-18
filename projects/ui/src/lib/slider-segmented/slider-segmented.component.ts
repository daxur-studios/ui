import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  input,
  model,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { provideUiFormControl, UiFormControl } from '../forms/ui-form-control';
import {
  buildSegmentedCells,
  clampAndSnapValue,
  DEFAULT_CELL_COUNT,
  DEFAULT_CELL_GAP,
  DEFAULT_CHAMFER,
  normalizeSliderBounds,
  normalizeSliderStep,
  ratioToValue,
  valueToRatio,
} from './slider-segmented-math';

/** Height in pixels of the segmented HUD track canvas. */
const TRACK_HEIGHT = 28;
/** Primary mouse button code. */
const PRIMARY_BUTTON = 0;
/** Safe initial width before layout measurement. */
const INITIAL_WIDTH = 0;
/** Coarse keyboard stepping multiplier for Shift+Arrow navigation. */
const COARSE_STEP_MULTIPLIER = 10;
/** Fraction of total range traversed by PageUp / PageDown. */
const PAGE_FRACTION = 0.1;
/** Next unique slider ID counter for accessible ARIA labelling. */
let nextSegmentedSliderId = 0;

/**
 * Tactical segmented-cell HUD range slider that illuminates discrete cells up to the active value.
 * Extends `UiFormControl<number>` to support reactive forms and signal two-way binding.
 */
@Component({
  selector: 'ui--slider-segmented',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './slider-segmented.component.html',
  styleUrl: './slider-segmented.component.scss',
  providers: [provideUiFormControl(() => SliderSegmentedComponent)],
})
export class SliderSegmentedComponent extends UiFormControl<number> {
  readonly label = input.required<string>();
  readonly value = model<number>(0);
  readonly valueCommit = output<number>();
  readonly min = input<number>(0);
  readonly max = input<number>(100);
  readonly step = input<number>(1);
  readonly unit = input<string>('');
  readonly cellCount = input<number>(DEFAULT_CELL_COUNT);

  protected readonly labelId = `ui-slider-segmented-label-${nextSegmentedSliderId++}`;
  protected readonly trackHeight = TRACK_HEIGHT;
  protected readonly trackWidth = signal(INITIAL_WIDTH);
  protected readonly bounds = computed(() => normalizeSliderBounds(this.min(), this.max()));
  protected readonly increment = computed(() => normalizeSliderStep(this.step()));
  protected readonly currentValue = computed(() =>
    clampAndSnapValue(this.value(), this.bounds().min, this.bounds().max, this.increment()),
  );
  protected readonly ratio = computed(() =>
    valueToRatio(this.currentValue(), this.bounds().min, this.bounds().max),
  );
  protected readonly valueText = computed(() => `${this.currentValue()}${this.unit()}`);

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

  private readonly track = viewChild.required<ElementRef<HTMLElement>>('track');
  private readonly destroyRef = inject(DestroyRef);
  private observer?: ResizeObserver;
  private drag?: { pointerId: number; startValue: number; left: number; width: number };

  constructor() {
    super();
    afterNextRender(() => {
      const element = this.track().nativeElement;
      this.trackWidth.set(element.getBoundingClientRect().width);
      this.observer = new ResizeObserver(([entry]) => {
        this.trackWidth.set(entry.contentRect.width);
        if (this.drag) {
          const rect = element.getBoundingClientRect();
          this.drag.left = rect.left;
          this.drag.width = rect.width;
        }
      });
      this.observer.observe(element);
    });

    effect(() => {
      if (this.isDisabled()) {
        this.finishPointer();
      }
    });

    this.destroyRef.onDestroy(() => {
      this.observer?.disconnect();
      this.drag = undefined;
    });
  }

  /** Begins a pointer capture transaction and caches track dimensions. */
  protected onPointerDown(event: PointerEvent): void {
    if (this.isDisabled() || this.drag || !event.isPrimary || event.button !== PRIMARY_BUTTON) {
      return;
    }
    event.preventDefault();
    const element = this.track().nativeElement;
    const rect = element.getBoundingClientRect();
    this.drag = {
      pointerId: event.pointerId,
      startValue: this.currentValue(),
      left: rect.left,
      width: rect.width,
    };
    element.focus();
    element.setPointerCapture(event.pointerId);
    this.updatePointer(event);
  }

  /** Updates live value from captured pointer position. */
  protected updatePointer(event: PointerEvent): void {
    const drag = this.drag;
    if (!drag || drag.pointerId !== event.pointerId || this.isDisabled()) return;
    const ratio = drag.width > 0 ? (event.clientX - drag.left) / drag.width : 0;
    const bounds = this.bounds();
    this.setValue(ratioToValue(ratio, bounds.min, bounds.max, this.increment()));
  }

  /** Finishes pointer capture and emits valueCommit if value changed. */
  protected finishPointer(event?: PointerEvent): void {
    const drag = this.drag;
    if (!drag || (event && event.pointerId !== drag.pointerId)) return;
    if (event?.type === 'pointerup') {
      this.updatePointer(event);
    }
    this.drag = undefined;
    const element = this.track().nativeElement;
    if (element.hasPointerCapture(drag.pointerId)) {
      element.releasePointerCapture(drag.pointerId);
    }
    if (this.currentValue() !== drag.startValue) {
      this.valueCommit.emit(this.currentValue());
    }
  }

  /** Handles keyboard slider stepping and navigation. */
  protected onKeyDown(event: KeyboardEvent): void {
    if (this.isDisabled() || this.drag || event.altKey || event.ctrlKey || event.metaKey) return;
    const { min, max } = this.bounds();
    const step = this.increment();
    const arrow = event.shiftKey ? step * COARSE_STEP_MULTIPLIER : step;
    const page = Math.max(step, (max - min) * PAGE_FRACTION);
    let target: number;

    switch (event.key) {
      case 'ArrowRight':
      case 'ArrowUp':
        target = this.currentValue() + arrow;
        break;
      case 'ArrowLeft':
      case 'ArrowDown':
        target = this.currentValue() - arrow;
        break;
      case 'PageUp':
        target = this.currentValue() + page;
        break;
      case 'PageDown':
        target = this.currentValue() - page;
        break;
      case 'Home':
        target = min;
        break;
      case 'End':
        target = max;
        break;
      default:
        return;
    }

    event.preventDefault();
    const value = clampAndSnapValue(target, min, max, step);
    if (this.setValue(value)) {
      this.valueCommit.emit(value);
    }
  }

  /** Coerces incoming form writes, falling back to normalized minimum on null or non-finite. */
  protected coerceWrittenValue(value: number | null | undefined): number {
    return typeof value === 'number' && Number.isFinite(value) ? value : this.bounds().min;
  }

  /** Updates the value if different, routing through UiFormControl.updateValueFromUser. */
  private setValue(value: number): boolean {
    if (value === this.currentValue()) return false;
    this.updateValueFromUser(value);
    return true;
  }
}
