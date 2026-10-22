import {
  afterNextRender,
  computed,
  DestroyRef,
  Directive,
  effect,
  ElementRef,
  inject,
  input,
  model,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { UiFormControl } from '../forms/ui-form-control';
import {
  clampAndSnapValue,
  normalizeSliderBounds,
  normalizeSliderStep,
  ratioToValue,
} from './slider-math';

/** Safe initial width before browser layout measurement. */
const INITIAL_WIDTH = 0;
/** Coarse keyboard steps per Shift+Arrow transaction. */
const COARSE_STEP_MULTIPLIER = 10;
/** Fraction of the full range traversed by PageUp or PageDown. */
const PAGE_FRACTION = 0.1;
/** Primary mouse button; touch and pen also report this for pointerdown. */
const PRIMARY_BUTTON = 0;

/** One captured pointer transaction and the layout cached at its start. */
export interface IUiSliderDrag {
  pointerId: number;
  startValue: number;
  left: number;
  width: number;
}

/**
 * Headless behaviour shared by every `ui--slider-*` attempt: the value model, bounds and step
 * normalization, the full keyboard contract, captured-pointer scrubbing, terminal commits,
 * responsive width measurement, and reactive-forms coercion.
 *
 * Visual attempts override two seams — {@link trackHeight} and {@link pointerRatio} — and supply
 * their own geometry and template. The template must expose the interactive element as `#track`.
 * Behaviour is intentionally identical across attempts, so it is tested once here rather than
 * per attempt.
 */
@Directive()
export abstract class UiSliderBase extends UiFormControl<number> {
  readonly label = input.required<string>();
  readonly value = model<number>(0);
  readonly valueCommit = output<number>();
  readonly min = input<number>(0);
  readonly max = input<number>(100);
  readonly step = input<number>(1);
  readonly unit = input<string>('');

  /** SVG canvas height for this attempt's proportioned geometry. */
  protected abstract get trackHeight(): number;

  /** Measured width of the interactive rail, updated by the `ResizeObserver`. */
  protected readonly trackWidth = signal(INITIAL_WIDTH);
  /** Normalized, always-ordered range endpoints. */
  protected readonly bounds = computed(() => normalizeSliderBounds(this.min(), this.max()));
  /** Validated step increment, defaulting to `1` when the input is invalid. */
  protected readonly increment = computed(() => normalizeSliderStep(this.step()));
  /** The model value clamped and snapped to the current bounds and step. */
  protected readonly currentValue = computed(() =>
    clampAndSnapValue(this.value(), this.bounds().min, this.bounds().max, this.increment()),
  );
  /** Readout and `aria-valuetext`, appending the unit when present. */
  protected readonly valueText = computed(() => `${this.currentValue()}${this.unit()}`);

  private readonly track = viewChild.required<ElementRef<HTMLElement>>('track');
  private readonly destroyRef = inject(DestroyRef);
  private observer?: ResizeObserver;
  private drag?: IUiSliderDrag;

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
      if (this.isDisabled()) this.finishPointer();
    });
    this.destroyRef.onDestroy(() => {
      this.observer?.disconnect();
      this.drag = undefined;
    });
  }

  /** Starts one captured pointer transaction and caches layout once for all subsequent moves. */
  protected onPointerDown(event: PointerEvent): void {
    if (this.isDisabled() || this.drag || !event.isPrimary || event.button !== PRIMARY_BUTTON)
      return;
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

  /** Emits live values using cached bounds; captured moves remain valid outside the rail. */
  protected updatePointer(event: PointerEvent): void {
    const drag = this.drag;
    if (!drag || drag.pointerId !== event.pointerId || this.isDisabled()) return;
    const ratio = this.pointerRatio(event.clientX, drag);
    const bounds = this.bounds();
    this.setValue(ratioToValue(ratio, bounds.min, bounds.max, this.increment()));
  }

  /** Finishes capture exactly once, including cancellation or unexpected capture loss. */
  protected finishPointer(event?: PointerEvent): void {
    const drag = this.drag;
    if (!drag || (event && event.pointerId !== drag.pointerId)) return;
    if (event?.type === 'pointerup') this.updatePointer(event);
    this.drag = undefined;
    const element = this.track().nativeElement;
    if (element.hasPointerCapture(drag.pointerId)) element.releasePointerCapture(drag.pointerId);
    if (this.currentValue() !== drag.startValue) this.valueCommit.emit(this.currentValue());
  }

  /** Applies the full slider keyboard contract as one live update and one changed-value commit. */
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
    if (this.setValue(value)) this.valueCommit.emit(value);
  }

  /** Accepts any finite number as written and maps everything else, including reset's null, to min. */
  protected coerceWrittenValue(value: number | null | undefined): number {
    return typeof value === 'number' && Number.isFinite(value) ? value : this.bounds().min;
  }

  /** Maps a pointer client X onto a normalized ratio using this attempt's rail insets. */
  protected abstract pointerRatio(clientX: number, drag: IUiSliderDrag): number;

  /** Suppresses duplicate notifications when a pointer remains on the same snapped step. */
  private setValue(value: number): boolean {
    if (value === this.currentValue()) return false;
    this.updateValueFromUser(value);
    return true;
  }
}
