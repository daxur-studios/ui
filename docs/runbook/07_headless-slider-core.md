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
