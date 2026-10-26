---
name: ui
description: UI component library and styling primitives for Daxur Studios applications with @daxur-studios/ui. Use when adding UI components, layout widgets, tokens, or styling primitives to Daxur applications.
---

# @daxur-studios/ui

UI component library and styling primitives for Daxur Studios applications and design systems.

## 1. When to apply

- Adding reusable UI components, widgets, or layout primitives to a Daxur Studios application.
- Integrating UI design tokens and CSS custom properties (`--ui-*`).
- Composing accessible, responsive UI elements adhering to Daxur design standards.

## 2. Install and peers

Required Angular 20 peer dependencies (standalone components, OnPush, signals, zoneless compatible):

```json
{
  "@angular/core": "^20.3.0",
  "@angular/cdk": "^20.0.0",
  "@angular/common": "^20.3.0",
  "@angular/forms": "^20.3.0"
}
```

Runtime dependencies:

- `tslib` (`^2.3.0`)

## 3. Public entry points

| Import              | Depends on | Provides                                                                                                                                                                                                                                                                                                                            |
| ------------------- | ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `@daxur-studios/ui` | Angular 20 | `SliderComponent`, `UiFormControl`, `provideUiFormControl`, slider math/types, `UI_LIB_VERSION`, `UiThemeService` / `provideUiTheme`, theme presets/types, `UiThemePickerComponent`, `SigilChromeComponent`, sigil geometry composers (`composeWingedStar`, `composeFiligreeCrest`, `composeTendrilSCurve`, `composeModularUiJoin`) |

Use the single root entrypoint. There are no Angular or component sub-entrypoints and no aggregate import-all array.

## 4. API reference

### Core (`@daxur-studios/ui`)

- `UI_LIB_VERSION: string` — the current version string of the `@daxur-studios/ui` package.

### Slider (`ui--slider`)

Import `SliderComponent` into a standalone component's `imports`.

| Input         | Default         | Purpose                                                                                                    |
| ------------- | --------------- | ---------------------------------------------------------------------------------------------------------- |
| `label`       | required string | Visible label and accessible name                                                                          |
| `value`       | `0`             | Numeric model supporting `[(value)]` and `(valueChange)` live preview                                      |
| `min` / `max` | `0` / `100`     | Range endpoints                                                                                            |
| `step`        | `1`             | Increment aligned to min; invalid steps fall back to 1                                                     |
| `unit`        | `''`            | Readout and `aria-valuetext` suffix; include a leading space if desired                                    |
| `disabled`    | `false`         | Disables interaction and removes the slider from sequential focus; combined with the form's disabled state |

`valueCommit: OutputEmitterRef<number>` emits once at the end of a changed pointer transaction
(up, cancel, or capture loss), or once per keyboard action that changes the value. Pointer moves
emit live `valueChange` only. Unchanged clicks/keys and drags returning to their starting value do
not commit. Disabling during a changed drag closes that transaction once.

The rail is the sole tab stop. Arrow keys move one step, Shift+Arrow moves ten steps,
PageUp/Down moves 10% of the range (at least one step), and Home/End reaches the endpoints.
Captured pointer movement continues outside the rail. ResizeObserver is browser-only and is
disconnected on destroy; the first browser render measures the track.

Non-finite values render at the normalized minimum; non-finite min becomes zero, and invalid or
reversed max collapses to min. Incoming model values are normalized for display/ARIA without an
unsolicited output. Interaction emits normalized numbers. Explicit endpoints remain reachable
when max is off the step lattice. Decimal stepping is rounded to 12 places.

Pure helpers exported from the same entrypoint: `clampAndSnapValue`, `valueToRatio`,
`ratioToValue`, `normalizeSliderBounds`, `normalizeSliderStep`, `buildAngledTrackPath`,
`DEFAULT_SLIDER_STEP`, `ISliderTrackGeometry`, and `ISliderSvgPaths`.

### Reactive forms (preferred binding)

Every value-bearing control supports Angular reactive forms by default; prefer `[formControl]` /
`formControlName` over `[(value)]` for form state. Import `ReactiveFormsModule` alongside the
control. Do not combine form directives and `[(value)]` on the same element.

- **Updates:** the form receives every changed live value (each drag or key step). Use
  `(valueCommit)` or debounce `valueChanges` for end-of-interaction work.
- **Writes:** `setValue`/`patchValue` update the display without marking the control dirty or
  emitting `valueCommit`. `reset()` (`null`) renders the slider at its normalized minimum.
- **Touched:** set when the rail loses focus. **Disabled:** `control.disable()` behaves like the
  `disabled` input (no tab stop, `aria-disabled="true"`, input ignored).
- Status classes (`ng-dirty`, `ng-touched`, `ng-invalid`, …) apply to the `ui--slider` host.
- Material `mat-form-field` integration is not provided.

Authoring a new control: extend `UiFormControl<T>`, declare `value = model<T>(...)`, implement
`coerceWrittenValue`, add `providers: [provideUiFormControl(() => MyControl)]`, route user changes
through `updateValueFromUser()`, call `markTouched()` on blur, and read `isDisabled()`.

### Themes and tokens

Import the packaged Sass theme once in application global styles:

```scss
@use '@daxur-studios/ui/styles/theme';
```

This enables `.ui-theme-hud` and `[data-ui-theme="hud"]` scopes with explicit dark defaults,
even under a light Material theme. Components also work without this import: private resolved
tokens use inherited `--ui-*`, then mapped `--mat-sys-*`, then shared dark defaults. Components
never define public defaults on `:host`, so inherited overrides continue to work.

The same import enables the multi-theme scopes. Themes are three independent axes driven by
attributes on the document root:

- Colour scheme: `[data-ui-scheme='hud' | 'blue' | 'orange']` (default `hud`).
- Mode: `[data-ui-mode='dark' | 'light']` (default `dark`); also sets native `color-scheme`.
- Density: `[data-ui-density='compact' | 'comfortable' | 'spacious']` (default `comfortable`),
  which scales spacing and type tokens.

Apply them with `UiThemeService` (signals `scheme`, `mode`, `density`, `resolvedMode`) and
register `provideUiTheme()` so the persisted theme lands before first render. The service writes
the attributes to `document.documentElement`, persists to `localStorage` (`ui-theme`), and treats
`mode: 'system'` as `prefers-color-scheme`. `ui--theme-picker` is a ready-made segmented control
over all three axes; mount one instance and position it as you like.

Color tokens: `--ui-surface`, `--ui-surface-raised`, `--ui-text`, `--ui-muted`, `--ui-accent`,
`--ui-border`, `--ui-overlay`. Material adapters respectively use surface, surface-container,
on-surface, on-surface-variant, primary, and outline-variant; overlays use translucent white.
Sizing/type tokens and their defaults are defined in the shipped `styles/_tokens.scss` partial,
including `--ui-slider-height`, `--ui-slider-stroke`, `--ui-font-size`, and `--ui-space`.
Use public `--ui-*` overrides; `--_ui-*` properties are private implementation details.

### Sigil geometry and chrome (`sigil-math`, `ui--sigil-chrome`)

Pure, deterministic SVG path builders for the cybersigil direction (Plan 09). Each composer takes
an `ISigilLabParams` (`curvature`, `swell`, `thornCount`, `crescentDepth`, `asymmetry`,
`spikeLength`; unit-interval values except `thornCount`) and returns an `ISigilGeometry` with
`d`, `width` and `height` for a `<path>` in a matching `viewBox`:

- `composeWingedStar`, `composeFiligreeCrest`, `composeTendrilSCurve`: full 480 x 270 archetypes.
- `composeModularUiJoin(params, railWidth)`: fixed-size caps with a stretchable rail. Its `parts`
  show that caps stay identical across widths.
- Primitives: `buildTaperedRibbon`, `buildCrescentBranch`, `buildStarEyeSigil`, `buildSpearCrest`, `buildTendrilBulb`, `buildTendrilLoop`.

`<ui--sigil-chrome [material]="'mercury' | 'bronze' | 'anodized' | 'flat'" />` defines the
`sigil-liquid-chrome` and `sigil-star-bloom` filters. Render it once per document and reference
the filters with `filter="url(#sigil-liquid-chrome)"`. Palettes come from the `--ui-sigil-*`
tokens (`<material>-body`, `-light`, `-rim`, `-bloom`). They are not part of the per-scheme colour
scopes yet, so override them with `--ui-sigil-*` on a page to retune a metal.

## 5. Examples

```typescript
import { SliderComponent } from '@daxur-studios/ui';
// Add SliderComponent to your standalone component's imports.
```

```html
<section data-ui-theme="hud">
  <ui--slider
    label="Field of View"
    [(value)]="fov"
    [min]="30"
    [max]="120"
    unit="°"
    (valueCommit)="saveFov($event)"
  />
</section>
```

```typescript
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { SliderComponent } from '@daxur-studios/ui';
// imports: [SliderComponent, ReactiveFormsModule]
readonly fov = new FormControl(75, { nonNullable: true });
```

```html
<ui--slider label="Field of View" [formControl]="fov" [min]="30" [max]="120" unit="°" />
```

`ui--slider` renders one of four looks via its `recipe` input: `angled` (default), `segmented`, `reticle`, and `notch`. `ui--slider-segmented` and `ui--slider-reticle` are convenience selectors that preset the middle two; all four share the same inputs, behaviour, and reactive-forms contract.

```html
<ui--slider recipe="notch" label="Thrust" [(value)]="thrust" unit="%" />
<ui--slider-segmented label="Battery" [(value)]="battery" [cellCount]="24" unit="%" />
```

## 6. Troubleshooting

- **Missing styles or un-themed components**: Verify that the consuming application imports standard theme variables or defines `--ui-*` / `--mat-sys-*` tokens.
- **Peer dependency warnings**: Install the required Angular core, common, forms, and CDK peers.
- **`No value accessor for form control`**: Ensure the control is imported from `@daxur-studios/ui` and `ReactiveFormsModule` is in the component's `imports`.

## 7. Version notes

- `0.0.1`: Initial workspace scaffolding, packaging pipeline, and agent skill bundle.
- Plan 03: Added standalone slider, pure geometry helpers, packaged Sass theme, and required Angular peers.
- Plan 04: Added reactive forms support (`UiFormControl`, `provideUiFormControl`) to the slider; `@angular/forms` is now a required peer.
- Plan 06: Added the multi-theme system (scheme × mode × density `data-ui-*` scopes), `UiThemeService` / `provideUiTheme`, theme presets/helpers, and the `ui--theme-picker` component. HUD dark remains the default; `[data-ui-theme='hud']` is a backward-compatible alias.
- Plan 07 (spike 07a): Extracted the headless `UiSliderBase` (and its `IUiSliderDrag` type) shared by `ui--slider`, `ui--slider-segmented`, and `ui--slider-reticle`. Authoring a new slider attempt: extend `UiSliderBase`, declare `trackHeight`, `pointerRatio(clientX, drag)`, a `#track` template ref, and your geometry; value, keyboard, pointer-capture, commit, and reactive-forms behaviour are inherited.
- Plan 07 (spike 07b): Added the procedural recipe engine. `ui--slider` now takes a `recipe` input (`angled` default, plus `segmented`, `reticle`, `notch`); `ui--slider-segmented` / `ui--slider-reticle` are thin subclasses that preset a recipe and share the one template/stylesheet. A look is pure data: add a `SliderRecipe` key to `SLIDER_RECIPES` returning `ISliderPart[]` (`path`/`cells`/`circle`/`text`, each with a token-mapped `cssClass`) — no new component class. `UiSliderRecipeComponent`, `slider-parts.ts`, and `slider-recipes.ts` are public.
- Plan 09 (spike 09a): Added `sigil-math` procedural geometry (`baseWidth` is the full ribbon width, and every ribbon root is a needle that welds into its parent) and the `ui--sigil-chrome` liquid-chrome filter pipeline with its `--ui-sigil-*` palettes.
