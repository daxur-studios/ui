import { ChangeDetectionStrategy, Component } from '@angular/core';
import { provideUiFormControl } from '../forms/ui-form-control';
import type { SliderRecipe } from '../slider/slider-recipes';
import { UiSliderRecipeComponent } from '../slider/ui-slider-recipe';

/** Next unique slider ID counter for accessible ARIA labelling. */
let nextSegmentedSliderId = 0;

/**
 * Tactical segmented-cell HUD range slider that illuminates discrete cells up to the active value.
 * A thin subclass of the recipe core sharing its template and styles, preset to the `segmented`
 * look; all behaviour comes from `UiSliderRecipeComponent` and the `cellCount` input is inherited.
 */
@Component({
  selector: 'ui--slider-segmented',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: '../slider/slider.component.html',
  styleUrl: '../slider/slider.component.scss',
  providers: [provideUiFormControl(() => SliderSegmentedComponent)],
})
export class SliderSegmentedComponent extends UiSliderRecipeComponent {
  protected readonly defaultRecipe: SliderRecipe = 'segmented';
  protected readonly labelId = `ui-slider-segmented-label-${nextSegmentedSliderId++}`;
}
