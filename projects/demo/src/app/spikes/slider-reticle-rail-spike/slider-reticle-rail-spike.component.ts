import { afterNextRender, ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { SliderReticleComponent } from '@daxur-studios/ui';

/** Initial bipolar gain in decibels, anchored around zero. */
const INITIAL_GAIN = 4;
/** Initial azimuth bearing. */
const INITIAL_AZIMUTH = -15;
/** Starting transaction and live update counts. */
const INITIAL_COUNT = 0;
/** Starting elevation angle for reactive form demo. */
const INITIAL_ELEVATION = 20;

/**
 * Spike harness for the dual-rail reticle caliper slider exploring bipolar origin ticks,
 * framing caliper bracket geometry, pointer scrubbing, and reactive form integration.
 */
@Component({
  selector: 'app-slider-reticle-rail-spike',
  standalone: true,
  imports: [SliderReticleComponent, ReactiveFormsModule],
  templateUrl: './slider-reticle-rail-spike.component.html',
  styleUrl: './slider-reticle-rail-spike.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SliderReticleRailSpikeComponent {
  protected readonly ready = signal(false);
  protected readonly gain = signal(INITIAL_GAIN);
  protected readonly azimuth = signal(INITIAL_AZIMUTH);
  protected readonly liveCount = signal(INITIAL_COUNT);
  protected readonly commitCount = signal(INITIAL_COUNT);
  protected readonly committedValue = signal(INITIAL_GAIN);

  /** Nullable reactive form control to verify reset() restores empty state. */
  protected readonly elevation = new FormControl<number | null>(INITIAL_ELEVATION);

  constructor() {
    afterNextRender(() => this.ready.set(true));
  }

  protected toggleElevationDisabled(): void {
    if (this.elevation.disabled) this.elevation.enable();
    else this.elevation.disable();
  }

  protected resetElevation(): void {
    this.elevation.reset();
  }

  protected onLiveValue(value: number): void {
    this.gain.set(value);
    this.liveCount.update((c) => c + 1);
  }

  protected onCommit(value: number): void {
    this.committedValue.set(value);
    this.commitCount.update((c) => c + 1);
  }
}
