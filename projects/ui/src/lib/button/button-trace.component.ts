import { ChangeDetectionStrategy, Component } from '@angular/core';
import { provideUiFormControl } from '../forms/ui-form-control';
import { UiButtonBase } from './ui-button-base';

/**
 * Industrial hairline trace HUD button with an embedded SVG status LED pip
 * (off / armed / latched) and bottom trace bar. Extends UiButtonBase / UiFormControl<boolean>.
 */
@Component({
  selector: 'ui--button-trace',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './button-trace.component.html',
  styleUrl: './button-trace.component.scss',
  providers: [provideUiFormControl(() => ButtonTraceComponent)],
})
export class ButtonTraceComponent extends UiButtonBase {}
