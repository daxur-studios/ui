import { ChangeDetectionStrategy, Component } from '@angular/core';
import { provideUiFormControl } from '../forms/ui-form-control';
import { UiButtonBase } from './ui-button-base';

/**
 * Chamfered polygon frame HUD button with notched corners, diagonal accent cut,
 * and translucent white press overlay. Extends UiButtonBase / UiFormControl<boolean>.
 */
@Component({
  selector: 'ui--button-chamfer',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './button-chamfer.component.html',
  styleUrl: './button-chamfer.component.scss',
  providers: [provideUiFormControl(() => ButtonChamferComponent)],
})
export class ButtonChamferComponent extends UiButtonBase {}
