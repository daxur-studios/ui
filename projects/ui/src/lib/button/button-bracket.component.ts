import { ChangeDetectionStrategy, Component } from '@angular/core';
import { provideUiFormControl } from '../forms/ui-form-control';
import { UiButtonBase } from './ui-button-base';

/**
 * Tactical bracket reticle HUD button featuring 4-corner SVG bracket ticks that cinch
 * inward on focus/hover and lock closed when active. Extends UiButtonBase / UiFormControl<boolean>.
 */
@Component({
  selector: 'ui--button-bracket',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './button-bracket.component.html',
  styleUrl: './button-bracket.component.scss',
  providers: [provideUiFormControl(() => ButtonBracketComponent)],
})
export class ButtonBracketComponent extends UiButtonBase {}
