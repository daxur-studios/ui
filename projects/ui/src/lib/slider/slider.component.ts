import { ChangeDetectionStrategy, Component } from '@angular/core';
import { provideUiFormControl } from '../forms/ui-form-control';
import type { SliderRecipe } from './slider-recipes';
import { UiSliderRecipeComponent } from './ui-slider-recipe';

/** Unique label IDs allow multiple sliders to provide independent accessible names. */
let nextSliderId = 0;

/**
 * Accessible range control that renders one of the shipped looks (see {@link SliderRecipe}); the
 * default `angled` look is the original responsive SVG rail with terminal commits. All behaviour,
 * keyboard handling, pointer capture, and reactive-forms integration come from
 * `UiSliderRecipeComponent`; a look is selected with the `recipe` input.
 */
@Component({
  selector: 'ui--slider',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './slider.component.html',
  styleUrl: './slider.component.scss',
  providers: [provideUiFormControl(() => SliderComponent)],
})
export class SliderComponent extends UiSliderRecipeComponent {
  protected readonly defaultRecipe: SliderRecipe = 'angled';
  protected readonly labelId = `ui-slider-label-${nextSliderId++}`;
}
