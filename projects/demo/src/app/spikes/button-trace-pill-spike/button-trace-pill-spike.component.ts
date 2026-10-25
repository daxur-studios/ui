import { afterNextRender, ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { ButtonComponent } from '@daxur-studios/ui';

/**
 * Spike harness for the industrial hairline trace HUD button with status LED pip
 * exploring momentary clicks, status indicators, and reactive-form toggle/latching state.
 */
@Component({
  selector: 'app-button-trace-pill-spike',
  standalone: true,
  imports: [ButtonComponent, ReactiveFormsModule],
  templateUrl: './button-trace-pill-spike.component.html',
  styleUrl: './button-trace-pill-spike.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ButtonTracePillSpikeComponent {
  protected readonly ready = signal(false);
  protected readonly triggerCount = signal(0);
  protected readonly toggleState = signal(false);

  /** Nullable reactive form control to verify reset() restores false. */
  protected readonly uplink = new FormControl<boolean | null>(false);

  constructor() {
    afterNextRender(() => this.ready.set(true));
  }

  protected onTrigger(): void {
    this.triggerCount.update((c) => c + 1);
  }

  protected toggleUplinkDisabled(): void {
    if (this.uplink.disabled) this.uplink.enable();
    else this.uplink.disable();
  }

  protected resetUplink(): void {
    this.uplink.reset();
  }
}
