import { afterNextRender, ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { SliderSegmentedComponent } from '@daxur-studios/ui';

/** Initial battery level for primary slider. */
const INITIAL_BATTERY = 70;
/** Initial shield capacity. */
const INITIAL_SHIELD = 45;
/** Starting transaction and live update counts. */
const INITIAL_COUNT = 0;
/** Starting reactor output for reactive forms demo. */
const INITIAL_REACTOR = 50;

/**
 * Spike harness for the segmented HUD tick-cell slider exploring discrete cell illumination,
 * responsive SVG measurement, pointer capture, and reactive form integration.
 */
@Component({
  selector: 'app-slider-segmented-hud-spike',
  standalone: true,
  imports: [SliderSegmentedComponent, ReactiveFormsModule],
  templateUrl: './slider-segmented-hud-spike.component.html',
  styleUrl: './slider-segmented-hud-spike.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SliderSegmentedHudSpikeComponent {
  protected readonly ready = signal(false);
  protected readonly battery = signal(INITIAL_BATTERY);
  protected readonly shield = signal(INITIAL_SHIELD);
  protected readonly liveCount = signal(INITIAL_COUNT);
  protected readonly commitCount = signal(INITIAL_COUNT);
  protected readonly committedValue = signal(INITIAL_BATTERY);

  /** Nullable reactive form control to verify reset() restores empty state. */
  protected readonly reactor = new FormControl<number | null>(INITIAL_REACTOR);

  constructor() {
    afterNextRender(() => this.ready.set(true));
  }

  protected toggleReactorDisabled(): void {
    if (this.reactor.disabled) this.reactor.enable();
    else this.reactor.disable();
  }

  protected resetReactor(): void {
    this.reactor.reset();
  }

  protected onLiveValue(value: number): void {
    this.battery.set(value);
    this.liveCount.update((c) => c + 1);
  }

  protected onCommit(value: number): void {
    this.committedValue.set(value);
    this.commitCount.update((c) => c + 1);
  }
}
