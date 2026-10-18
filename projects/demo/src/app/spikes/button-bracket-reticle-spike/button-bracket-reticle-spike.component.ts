import { afterNextRender, ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { ButtonBracketComponent, ButtonComponent } from '@daxur-studios/ui';

/**
 * Spike harness for the tactical bracket reticle HUD button exploring 4-corner
 * bracket cinching, momentary action clicks, and reactive-form toggle/latching state.
 */
@Component({
  selector: 'app-button-bracket-reticle-spike',
  standalone: true,
  imports: [ButtonComponent, ButtonBracketComponent, ReactiveFormsModule],
  templateUrl: './button-bracket-reticle-spike.component.html',
  styleUrl: './button-bracket-reticle-spike.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ButtonBracketReticleSpikeComponent {
  protected readonly ready = signal(false);
  protected readonly triggerCount = signal(0);
  protected readonly toggleState = signal(false);

  /** Nullable reactive form control to verify reset() restores false. */
  protected readonly targetLock = new FormControl<boolean | null>(false);

  constructor() {
    afterNextRender(() => this.ready.set(true));
  }

  protected onTrigger(): void {
    this.triggerCount.update((c) => c + 1);
  }

  protected toggleTargetLockDisabled(): void {
    if (this.targetLock.disabled) this.targetLock.enable();
    else this.targetLock.disable();
  }

  protected resetTargetLock(): void {
    this.targetLock.reset();
  }
}
