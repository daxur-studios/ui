import { booleanAttribute, computed, Directive, input } from '@angular/core';
import { DEFAULT_CELL_COUNT } from '../slider-segmented/slider-segmented-math';
import { DEFAULT_SLIDER_RECIPE, SLIDER_RECIPES, type SliderRecipe } from './slider-recipes';
import { UiSliderBase, type IUiSliderDrag } from './ui-slider-base';

/** Fallback tick count for tick-scale recipes that do not ship yet. */
const DEFAULT_TICK_COUNT = 0;

/**
 * Recipe-driven slider core. Turns {@link UiSliderBase}'s normalized state into an ordered list of
 * visual primitives for one of the shipped {@link SliderRecipe} looks. The two geometry seams from
 * the headless base are answered by the active recipe, so a new look is new recipe data — never a
 * new component class. Concrete components only choose a `defaultRecipe` and a selector.
 */
@Directive()
export abstract class UiSliderRecipeComponent extends UiSliderBase {
  /** Look to render; falls back to {@link defaultRecipe} when omitted. */
  readonly recipe = input<SliderRecipe | null>(null);
  /** Discrete cell count for the segmented recipe. */
  readonly cellCount = input<number>(DEFAULT_CELL_COUNT);
  /** Tick count for tick-scale recipes. */
  readonly tickCount = input<number>(DEFAULT_TICK_COUNT);
  /** Whether the notch recipe draws its optional chamfered outer wrapper. */
  readonly wrapper = input(true, { transform: booleanAttribute });

  /** Look used when the `recipe` input is not supplied; set by each concrete component. */
  protected abstract readonly defaultRecipe: SliderRecipe;

  /** The active recipe definition. */
  protected readonly activeRecipe = computed(
    () => SLIDER_RECIPES[this.recipe() ?? this.defaultRecipe],
  );
  /** Heading chrome variant for the active recipe. */
  protected readonly readout = computed(() => this.activeRecipe().readout);
  /** Whether the active recipe renders a wrapper and the caller has left it enabled. */
  protected readonly wrapped = computed(() => this.activeRecipe().wrappable && this.wrapper());
  /** Render-ready primitive list for the active recipe and current state. */
  protected readonly parts = computed(() => {
    const definition = this.activeRecipe();
    return definition.parts(
      {
        width: this.trackWidth(),
        min: this.bounds().min,
        max: this.bounds().max,
        value: this.currentValue(),
        text: this.valueText(),
      },
      { cellCount: this.cellCount(), tickCount: this.tickCount(), wrapper: this.wrapper() },
    );
  });

  protected get trackHeight(): number {
    return this.activeRecipe().height;
  }

  /** Container class carrying the active recipe's track chrome. */
  protected get trackClass(): string {
    return this.activeRecipe().trackClass;
  }

  /** `preserveAspectRatio` for the SVG, or `null` to keep the SVG default. */
  protected get preserveAspectRatio(): 'none' | null {
    return this.activeRecipe().preserveAspectRatio;
  }

  protected pointerRatio(clientX: number, drag: IUiSliderDrag): number {
    return this.activeRecipe().pointerRatio(clientX, drag);
  }
}
