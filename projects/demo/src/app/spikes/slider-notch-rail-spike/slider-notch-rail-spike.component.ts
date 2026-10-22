import { afterNextRender, ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { SliderComponent } from '@daxur-studios/ui';

/** Initial thrust level for the primary notch slider. */
const INITIAL_THRUST = 35;
/** Initial trim value, rendered without the chamfered wrapper. */
const INITIAL_TRIM = 6;
/** Starting live-preview and commit counts. */
const INITIAL_COUNT = 0;
/** Starting navigation value for the reactive-forms demo. */
const INITIAL_NAVIGATION = 40;

/**
 * Spike page for the procedural `notch` recipe: a chamfered HUD rail whose progress line drops
 * diagonally to become the handle, with an anchored in-canvas readout. It is produced entirely from
 * recipe data and `--ui-*` tokens — no new component class — proving the recipe engine's hypothesis.
 */
@Component({
  selector: 'app-slider-notch-rail-spike',
  standalone: true,
  imports: [SliderComponent, ReactiveFormsModule],
  templateUrl: './slider-notch-rail-spike.component.html',
  styleUrl: './slider-notch-rail-spike.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SliderNotchRailSpikeComponent {
  protected readonly ready = signal(false);
  protected readonly thrust = signal(INITIAL_THRUST);
  protected readonly trim = signal(INITIAL_TRIM);
  protected readonly liveCount = signal(INITIAL_COUNT);
  protected readonly commitCount = signal(INITIAL_COUNT);
  protected readonly committedValue = signal(INITIAL_THRUST);

  /** Nullable reactive form control to verify reset() restores empty state. */
  protected readonly navigation = new FormControl<number | null>(INITIAL_NAVIGATION);

  constructor() {
    afterNextRender(() => this.ready.set(true));
  }

  protected toggleNavigationDisabled(): void {
    if (this.navigation.disabled) this.navigation.enable();
    else this.navigation.disable();
  }

  protected resetNavigation(): void {
    this.navigation.reset();
  }

  protected onLiveValue(value: number): void {
    this.thrust.set(value);
    this.liveCount.update((count) => count + 1);
  }

  protected onCommit(value: number): void {
    this.committedValue.set(value);
    this.commitCount.update((count) => count + 1);
  }
}
