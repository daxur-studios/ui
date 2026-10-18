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
  buildAngledTrackPath,
  clampAndSnapValue,
  normalizeSliderBounds,
  normalizeSliderStep,
  ratioToValue,
  valueToRatio,
} from './slider-math';

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
/** Coarse keyboard steps per Shift+Arrow transaction. */
const COARSE_STEP_MULTIPLIER = 10;
/** Fraction of the full range traversed by PageUp or PageDown. */
const PAGE_FRACTION = 0.1;
/** Primary mouse button; touch and pen also report this for pointerdown. */
const PRIMARY_BUTTON = 0;
/** Safe initial width before browser measurement. */
const INITIAL_WIDTH = 0;
/** Two symmetric knob margins are removed when mapping pointer position onto the rail. */
const EDGE_COUNT = 2;
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
export class SliderComponent extends UiFormControl<number> {
  readonly label = input.required<string>();
  readonly value = model<number>(0);
  readonly valueCommit = output<number>();
  readonly min = input<number>(0);
  readonly max = input<number>(100);
  readonly step = input<number>(1);
  readonly unit = input<string>('');

  protected readonly labelId = `ui-slider-label-${nextSliderId++}`;
  protected readonly trackHeight = TRACK_HEIGHT;
  protected readonly thumbRadius = THUMB_RADIUS;
  protected readonly trackWidth = signal(INITIAL_WIDTH);
  protected readonly bounds = computed(() => normalizeSliderBounds(this.min(), this.max()));
  protected readonly increment = computed(() => normalizeSliderStep(this.step()));
  protected readonly currentValue = computed(() =>
    clampAndSnapValue(this.value(), this.bounds().min, this.bounds().max, this.increment()),
  );
  protected readonly valueText = computed(() => `${this.currentValue()}${this.unit()}`);
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
    const radius = Math.min(THUMB_RADIUS, drag.width / EDGE_COUNT);
    const span = drag.width - radius * EDGE_COUNT;
    const ratio =
      span > INITIAL_WIDTH ? (event.clientX - drag.left - radius) / span : INITIAL_WIDTH;
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

  /** Suppresses duplicate notifications when a pointer remains on the same snapped step. */
  private setValue(value: number): boolean {
    if (value === this.currentValue()) return false;
    this.updateValueFromUser(value);
    return true;
  }
}
