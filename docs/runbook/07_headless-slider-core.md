---
type: Runbook
title: Headless Slider Core and Procedural Slider Parts — Runbook
description: Chronological trace of the slider de-duplication (headless UiSliderBase) and the evaluation of a procedural slider-parts layer.
timestamp: 2026-10-21T00:00:00Z
plans: [/docs/plans/07_headless-slider-core.md]
tags: [slider, architecture, reuse, spikes, procedural, headless, angular, runbook]
---

# Headless Slider Core and Procedural Slider Parts — Runbook

## 2026-10-21

### opencode — Analysis and owner decisions

- **[finding]** `SliderComponent`, `SliderSegmentedComponent`, and `SliderReticleComponent` are
  each ~200 lines and share ~85% of their code (value model, bounds/step normalization, keyboard
  contract, captured-pointer scrubbing, `finishPointer` commit semantics, `ResizeObserver`
  measurement, `coerceWrittenValue`, `setValue`). Only the geometry (`buildAngledTrackPath` /
  `buildSegmentedCells` / `buildReticleSliderPaths`), the SVG canvas height, and one pointer→ratio
  inset differ.
- **[decision]** Apply the button precedent (`UiButtonBase` + `ButtonComponent [variant]`) to
  sliders as tier 1: a headless `UiSliderBase` with two seams (`trackHeight`, `pointerRatio`).
  Tier 2 (a recipe-driven `ui--slider` of visual parts) becomes spike 07b, gated on 07a. Tier 3
  (content-projected parts with DI) is deferred as speculative.

### opencode — Spike 07a implementation

- **[action]** Added `projects/ui/src/lib/slider/ui-slider-base.ts`: an abstract `@Directive()`
  extending `UiFormControl<number>` that owns the shared inputs/model/output, `bounds`,
  `increment`, `currentValue`, `valueText`, the `trackWidth` signal with its `ResizeObserver`, the
  captured-pointer `drag` state, `onPointerDown`/`updatePointer`/`finishPointer`/`onKeyDown`,
  `coerceWrittenValue`/`setValue`, and the disabled-during-drag effect. Seams are
  `protected abstract trackHeight` and `protected abstract pointerRatio(clientX, drag)`.
- **[action]** Refactored the three slider components to extend the base; each now declares only
  its `trackHeight`, geometry `computed`, `labelId`, extension input (`cellCount`), and
  `pointerRatio`.
- **[action]** Exported `UiSliderBase` and `IUiSliderDrag` from `public-api.ts`.

### opencode — Verification

- **[verification]** No public API change: the three selectors, inputs, outputs, and form-control
  contract are unchanged; `UiSliderBase` / `IUiSliderDrag` are additive exports.
- **[verification]** `npm test`: 57 Vitest tests pass (unchanged).
- **[verification]** `npm run test:dom`: 53 jsdom tests pass (unchanged).
- **[verification]** `npm run test:e2e` (chromium): 35 Playwright tests pass (unchanged), covering
  keyboard, pointer capture, resize, terminal-commit counts, reactive forms, and the token/scope
  resolution test.
- **[verification]** `ng build ui` succeeds; Prettier applied to changed files.

### opencode — Finding (spike 07a)

- **[finding]** **Passed.** One `UiSliderBase` serves all three attempts with no behavioural or
  pixel regression. The three attempt components shrank from 635 lines total (207 / 218 / 210) to
  159 (54 / 54 / 51) in front of a 194-line base — about 282 lines removed (~44%), with each
  attempt now declaring only `trackHeight`, geometry, `labelId`, extension inputs, and
  `pointerRatio`. Every existing unit, DOM, and Playwright test passed unchanged, confirming the
  shared behaviour is identical across attempts.
- **[decision]** Proceed to spike 07b (procedural slider parts) as the next queued spike; the base
  is the shared state source that a recipe/part layer will sit on.

### opencode — Spike 07b design (proposed)

- **[finding]** Full design read of the three attempts: they differ only in their SVG parts
  (`angled` = inactive/active paths + circle thumb; `segmented` = N chamfered cells with an active
  flag; `reticle` = dual rails + origin tick + fill + two caliper brackets + diamond thumb) and
  their heading chrome (plain readout vs. badge). All three share the identical `#track` contract
  (role slider, tabindex, aria-*, five pointer/keyboard handlers) and heading structure.
- **[decision]** Model the differences as **data**, not classes: an `ISliderPart` union of
  primitives (`path`/`cells`/`circle`/`polygon`) each carrying a token-mapped `role`, plus a pure
  `buildSliderParts(recipe, state, config)` registry. One `ui--slider [recipe]` renders the list;
  default `recipe='angled'` keeps today's output identical. This deviates from "primitives as
  standalone components" in the earlier note — data descriptors rendered by one SVG renderer need
  fewer files and no extra change-detection boundaries, and satisfy the same goal.
- **[action]** Recorded the design and the two open decisions (the new look; the fate of the
  standalone selectors) in Plan 07 §4. Per `docs/standards/spikes.md` §3 the hypothesis must not be
  invented, so 07b waits on the owner's new-look definition.

### opencode — Spike 07b implementation

- **[decision]** Owner defined the new look: a `notch` chamfered HUD rail (progress line drops
  diagonally into the handle, value readout anchored in the notch, optional outer wrapper), and
  chose thin subclasses sharing the recipe template for the segmented/reticle selectors.
- **[action]** Added `slider-parts.ts` (the `ISliderPart` union — `path`/`cells`/`circle`/`text`,
  each with a token-mapped `cssClass`), `slider-recipes.ts` (the `angled | segmented | reticle |
notch` registry, each with `height`, `pointerRatio`, `readout`, `preserveAspectRatio`, track class,
  and a pure `parts(state, context)` builder), and `ui-slider-recipe.ts` (the recipe core that answers
  `UiSliderBase`'s geometry seams from the active recipe).
- **[action]** Rewrote `slider.component.{html,scss}` as one shared template renderer (`@for` + a
  `@switch` over `part.kind`) and merged the three stylesheets into one token-only file, keeping every
  existing DOM class (`.cell.active`, `.origin-tick`, `.caliper-bracket`, `.thumb-diamond`,
  `.active`/`.inactive`/`.thumb`) so the existing specs stay the regression guard.
- **[action]** Reduced `SliderSegmentedComponent` / `SliderReticleComponent` to thin subclasses
  (`defaultRecipe` + `labelId` + provider) sharing the recipe template/styles; deleted their duplicate
  `.html`/`.scss`. Added the `notch` spike page, lazy route, and registry entry #7.

### opencode — Verification (spike 07b)

- **[verification]** `ng build ui` succeeds.
- **[verification]** `npm test`: 65 Vitest tests pass (57 + 8 new `slider-recipes.spec.ts`).
- **[verification]** `npm run test:dom`: 53 jsdom tests pass, unchanged.
- **[verification]** `npm run test:e2e` (chromium): 38 Playwright tests pass, unchanged for the three
  keepers plus 3 new notch checks.
- **[verification]** Prettier applied to changed files.

### opencode — Finding (spike 07b)

- **[finding]** **Passed.** The `notch` look is produced entirely from recipe data with **no new
  component class**, and the recipe engine reproduces all three keepers: the unified component passed
  every pre-existing segmented and reticle browser check unmodified. The slider family now has one
  shared template, one shared stylesheet, and four registry recipes; the segmented/reticle components
  are thin subclasses and their duplicate templates/styles are gone.
- **[finding]** Deviation from the earlier "primitives as standalone components" note: primitives are
  data descriptors rendered by one SVG renderer. This needed fewer files, added no change-detection
  boundaries, and kept the public selectors and every test selector intact.
- **[action]** Owner design iteration on the `notch` geometry: after an attempt at a shallower 30°
  diagonal with a full-height drop, the owner preferred the original (steeper, ~73°) angle and asked
  for the drop to be halved. Settled on `NOTCH_DIAGONAL_RISE = 20` (half the canvas) with
  `NOTCH_DIAGONAL_RUN = 6` (preserving the original slope) and `NOTCH_TOP_Y = 10` so the shorter rail
  is centred in the 40 px hit area. Both are single constants in `slider-recipes.ts` for future
  tuning; the readout tracks the drop automatically.
- **[action]** Owner design iteration on the `notch` chrome: removed the grey `notch-track` outline
  primitive (and its `.notch-track` rule) and the filled/hexagonal container box
  (`.track--notch` background plus the `.track--notch.track--wrapped` chamfered `clip-path`). The
  notch now renders only the accent dropped progress line and the anchored readout, floating
  transparently. `slider-recipes.spec.ts` updated (`notch` parts are now `['path','text']`).
  `wrappable`/`wrapper` remain a no-op for the notch look (the class still toggles; it just has no
  notch-specific styling).
