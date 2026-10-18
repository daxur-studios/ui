import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { provideUiFormControl } from '../forms/ui-form-control';
import { ButtonVariant, UiButtonBase } from './ui-button-base';

/**
 * Universal HUD button component with support for multiple visual style variants
 * ('chamfer', 'bracket', 'trace'), momentary action triggering, reactive-form
 * toggle/latching state, and full keyboard accessibility.
 */
@Component({
  selector: 'ui--button',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './button.component.html',
  styleUrl: './button.component.scss',
  providers: [provideUiFormControl(() => ButtonComponent)],
})
export class ButtonComponent extends UiButtonBase {
  readonly variant = input<ButtonVariant>('chamfer');
}
