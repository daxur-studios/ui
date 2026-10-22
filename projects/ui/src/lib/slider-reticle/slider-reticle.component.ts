import { ChangeDetectionStrategy, Component } from '@angular/core';
import { provideUiFormControl } from '../forms/ui-form-control';
import type { SliderRecipe } from '../slider/slider-recipes';
import { UiSliderRecipeComponent } from '../slider/ui-slider-recipe';

/** ID counter for unique label associations. */
let nextReticleSliderId = 0;

/**
 * Tactical dual-rail slider with reticle caliper brackets and a zero/origin tick for bipolar ranges.
 * A thin subclass of the recipe core sharing its template and styles, preset to the `reticle` look;
 * all behaviour comes from `UiSliderRecipeComponent`.
 */
@Component({
  selector: 'ui--slider-reticle',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: '../slider/slider.component.html',
  styleUrl: '../slider/slider.component.scss',
  providers: [provideUiFormControl(() => SliderReticleComponent)],
})
export class SliderReticleComponent extends UiSliderRecipeComponent {
  protected readonly defaultRecipe: SliderRecipe = 'reticle';
  protected readonly labelId = `ui-slider-reticle-label-${nextReticleSliderId++}`;
}
