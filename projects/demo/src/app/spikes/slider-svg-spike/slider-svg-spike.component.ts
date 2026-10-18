import { afterNextRender, ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { SliderComponent } from '@daxur-studios/ui';

/** Initial camera field of view, midway between the harness bounds. */
const INITIAL_FOV = 75;
/** Familiar earth-gravity value demonstrates negative decimal stepping. */
const INITIAL_GRAVITY = -9.8;
/** Starting transaction and update counts before any user input. */
const INITIAL_COUNT = 0;
/** Starting exposure for the reactive form demo, away from both harness endpoints. */
const INITIAL_EXPOSURE = 40;

/** Dogfoods the public slider API and makes the live/terminal event split directly observable. */
@Component({
  selector: 'app-slider-svg-spike',
  standalone: true,
  imports: [SliderComponent, ReactiveFormsModule],
  templateUrl: './slider-svg-spike.component.html',
  styleUrl: './slider-svg-spike.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SliderSvgSpikeComponent {
  protected readonly ready = signal(false);
  protected readonly fov = signal(INITIAL_FOV);
  protected readonly gravity = signal(INITIAL_GRAVITY);
  protected readonly liveCount = signal(INITIAL_COUNT);
  protected readonly commitCount = signal(INITIAL_COUNT);
  protected readonly committedValue = signal(INITIAL_FOV);
  /** Nullable so `reset()` restores the empty state, which the slider renders at its minimum. */
  protected readonly exposure = new FormControl<number | null>(INITIAL_EXPOSURE);

  constructor() {
    afterNextRender(() => this.ready.set(true));
  }

  /** Toggles the form-driven disabled state to prove the reactive bridge removes the tab stop. */
  protected toggleExposureDisabled(): void {
    if (this.exposure.disabled) this.exposure.enable();
    else this.exposure.disable();
  }

  /** Clears the form value and its dirty and touched state, as a form reset does. */
  protected resetExposure(): void {
    this.exposure.reset();
  }

  /** Counts preview events without conflating them with completed interaction transactions. */
  protected onLiveValue(value: number): void {
    this.fov.set(value);
    this.liveCount.update((count) => count + 1);
  }

  /** Records exactly what consumers receive when a FOV transaction finishes. */
  protected onCommit(value: number): void {
    this.committedValue.set(value);
    this.commitCount.update((count) => count + 1);
  }
}
