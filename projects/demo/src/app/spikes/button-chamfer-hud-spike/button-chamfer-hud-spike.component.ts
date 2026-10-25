import { afterNextRender, ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { ButtonComponent } from '@daxur-studios/ui';

/**
 * Spike harness for the chamfered polygon frame HUD button exploring momentary
 * action triggering, keyboard activation, and reactive-form toggle/latching state.
 */
@Component({
  selector: 'app-button-chamfer-hud-spike',
  standalone: true,
  imports: [ButtonComponent, ReactiveFormsModule],
  templateUrl: './button-chamfer-hud-spike.component.html',
  styleUrl: './button-chamfer-hud-spike.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ButtonChamferHudSpikeComponent {
  protected readonly ready = signal(false);
  protected readonly triggerCount = signal(0);
  protected readonly toggleState = signal(false);

  /** Nullable reactive form control to verify reset() restores false. */
  protected readonly latched = new FormControl<boolean | null>(false);

  constructor() {
    afterNextRender(() => this.ready.set(true));
  }

  protected onTrigger(): void {
    this.triggerCount.update((c) => c + 1);
  }

  protected toggleLatchedDisabled(): void {
    if (this.latched.disabled) this.latched.enable();
    else this.latched.disable();
  }

  protected resetLatched(): void {
    this.latched.reset();
  }
}
