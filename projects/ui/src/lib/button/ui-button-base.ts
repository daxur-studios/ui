import { booleanAttribute, Directive, input, model, output } from '@angular/core';
import { UiFormControl } from '../forms/ui-form-control';

export type ButtonType = 'button' | 'submit' | 'reset';
export type ButtonVariant = 'chamfer' | 'bracket' | 'trace';

/**
 * Base reactive-forms directive for HUD button controls.
 * Encapsulates single tab-stop keyboard activation, toggle/latching state,
 * blur touched tracking, and disabled coordination.
 */
@Directive()
export abstract class UiButtonBase extends UiFormControl<boolean> {
  readonly label = input.required<string>();
  readonly toggle = input(false, { transform: booleanAttribute });
  readonly type = input<ButtonType>('button');
  readonly value = model<boolean>(false);
  readonly triggered = output<void>();

  /** Maps any form write, including reset's null, to a boolean. */
  protected override coerceWrittenValue(value: boolean | null | undefined): boolean {
    return Boolean(value);
  }

  /**
   * Activates the button on user click or Enter/Space keystroke.
   * Flips value and notifies reactive form if toggle mode is active.
   */
  activate(): void {
    if (this.isDisabled()) return;
    if (this.toggle()) {
      this.updateValueFromUser(!this.value());
    }
    this.triggered.emit();
  }

  /** Handles Space and Enter keyboard triggering. */
  protected onKeyDown(event: KeyboardEvent): void {
    if (this.isDisabled()) return;
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this.activate();
    }
  }

  /** Reports blur to mark the reactive form control touched. */
  protected onBlur(): void {
    this.markTouched();
  }
}
