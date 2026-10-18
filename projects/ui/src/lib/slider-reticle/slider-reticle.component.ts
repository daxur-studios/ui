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
  buildReticleSliderPaths,
  clampAndSnapValue,
  DEFAULT_RETICLE_THUMB_RADIUS,
  normalizeSliderBounds,
  normalizeSliderStep,
  ratioToValue,
  valueToRatio,
} from './slider-reticle-math';

/** SVG canvas height in pixels. */
const TRACK_HEIGHT = 40;
/** Primary mouse button code. */
const PRIMARY_BUTTON = 0;
/** Initial width before layout measurement. */
const INITIAL_WIDTH = 0;
/** Coarse keyboard stepping multiplier. */
const COARSE_STEP_MULTIPLIER = 10;
/** Fraction of range for PageUp / PageDown. */
const PAGE_FRACTION = 0.1;
/** Margin on both sides for pointer to ratio conversion. */
const CALIPER_TOTAL_MARGIN = 20;
/** ID counter for unique label associations. */
let nextReticleSliderId = 0;

/**
 * Tactical dual-rail slider with reticle caliper brackets and zero/origin tick for bipolar ranges.
 * Extends `UiFormControl<number>` to support reactive forms and signal two-way binding.
 */
@Component({
  selector: 'ui--slider-reticle',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './slider-reticle.component.html',
  styleUrl: './slider-reticle.component.scss',
  providers: [provideUiFormControl(() => SliderReticleComponent)],
})
export class SliderReticleComponent extends UiFormControl<number> {
  readonly label = input.required<string>();
  readonly value = model<number>(0);
  readonly valueCommit = output<number>();
  readonly min = input<number>(0);
  readonly max = input<number>(100);
  readonly step = input<number>(1);
  readonly unit = input<string>('');

  protected readonly labelId = `ui-slider-reticle-label-${nextReticleSliderId++}`;
  protected readonly trackHeight = TRACK_HEIGHT;
  protected readonly trackWidth = signal(INITIAL_WIDTH);
  protected readonly bounds = computed(() => normalizeSliderBounds(this.min(), this.max()));
  protected readonly increment = computed(() => normalizeSliderStep(this.step()));
  protected readonly currentValue = computed(() =>
    clampAndSnapValue(this.value(), this.bounds().min, this.bounds().max, this.increment()),
  );
  protected readonly valueText = computed(() => `${this.currentValue()}${this.unit()}`);

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

  protected updatePointer(event: PointerEvent): void {
    const drag = this.drag;
    if (!drag || drag.pointerId !== event.pointerId || this.isDisabled()) return;
    const span = Math.max(1, drag.width - CALIPER_TOTAL_MARGIN * 2);
    const offset = event.clientX - drag.left - CALIPER_TOTAL_MARGIN;
    const ratio = Math.min(1, Math.max(0, offset / span));
    const bounds = this.bounds();
    this.setValue(ratioToValue(ratio, bounds.min, bounds.max, this.increment()));
  }

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

  protected coerceWrittenValue(value: number | null | undefined): number {
    return typeof value === 'number' && Number.isFinite(value) ? value : this.bounds().min;
  }

  private setValue(value: number): boolean {
    if (value === this.currentValue()) return false;
    this.updateValueFromUser(value);
    return true;
  }
}
