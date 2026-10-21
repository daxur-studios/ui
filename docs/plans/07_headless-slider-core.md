---
type: Plan
title: Headless Slider Core and Procedural Slider Parts
description: De-duplicate the slider attempts behind a headless UiSliderBase, then test whether a procedural recipe of visual parts can reproduce the keepers and generate new looks without new component classes.
timestamp: 2026-10-21T00:00:00Z
status: active
runbook: /docs/runbook/07_headless-slider-core.md
tags: [slider, architecture, reuse, spikes, procedural, headless, angular, planning]
---

# Headless Slider Core and Procedural Slider Parts

## 1. Goal

Three slider attempts ship today (`slider-svg-spike`, `slider-segmented-hud-spike`,
`slider-reticle-rail-spike`). Each is a ~200-line component, and roughly 85% of that code is
identical: the value model, bounds normalization, keyboard contract, captured-pointer scrubbing,
terminal commits, responsive width measurement, and reactive-forms coercion. Only the
**presentation** and the **pointer-to-ratio geometry** differ.

This plan answers two questions in order:

1. **Headless core (spike 07a):** can one shared base serve all three attempts with no
   behavioural or pixel regressions?
2. **Procedural parts (spike 07b):** can a recipe of small visual parts plus token overrides
   reproduce the keepers — and generate a new look — without a new component class per attempt?

The buttons already chose the shape for question 1: `UiButtonBase` + `ButtonComponent [variant]`

- dedicated variant components. This plan applies the same pattern to sliders and then evaluates
  whether to go further into a procedural composition layer.

## 2. Decisions

1. **Separate three concerns.** (a) Headless behaviour — stable across every slider. (b) Geometry
   — pure functions in `*-math.ts`, kept as per-attempt strategies. (c) Presentation recipe — the
   only place "attempts" differ.
2. **Tier 1 first (spike 07a).** Extract `UiSliderBase extends UiFormControl<number>` holding all
   behaviour, with two extension seams: `trackHeight` and `pointerRatio(clientX, drag)`. Variants
   keep their own template, styles, geometry, and `labelId`. Public API is unchanged.
3. **Tier 2 as a separate spike (07b).** A single `ui--slider` with a recipe/renderer input that
   assembles visual primitives (`rail`, `ticks`, `thumb`, `readout`, `bracket`). Standalone
   attempts remain as thin facades, mirroring `ui--button variant=...`.
4. **Tier 3 deferred.** Content-projected parts with DI (`<ui--slider><ui-slider-rail/>…`) is
   held until a consumer needs to assemble sliders we did not ship; it is speculative for three
   attempts.
5. **The headless core is path-independent.** Whether 07b succeeds or fails, the base built in
   07a is the seam both paths need, so it is worth doing first regardless.

## 3. Spike 07a — Headless Slider Core

**Hypothesis:** one `UiSliderBase` can serve `ui--slider`, `ui--slider-segmented`, and
`ui--slider-reticle` with no behavioural or pixel regression, verified by the existing Vitest,
DOM, Playwright, and thumbnail suites passing unchanged.

- New file: `projects/ui/src/lib/slider/ui-slider-base.ts` (`@Directive()`, abstract).
- Base owns: `label/value/valueCommit/min/max/step/unit`, `bounds`, `increment`, `currentValue`,
  `valueText`, `trackWidth` + `ResizeObserver`, `drag` state, `onPointerDown`, `updatePointer`,
  `finishPointer`, `onKeyDown`, `coerceWrittenValue`, `setValue`, and the disabled-during-drag
  effect.
- Seams: `protected abstract readonly trackHeight` and
  `protected abstract pointerRatio(clientX, drag): number`.
- Variants keep: `selector`, `providers`, template, styles, geometry computed, `labelId`, and the
  constants their geometry needs.
- Export `UiSliderBase` and `IUiSliderDrag` from the public API so consumers can author attempts.

## 4. Spike 07b — Procedural Slider Parts (queued)

**Hypothesis:** a recipe (`angled | segmented | reticle | custom config`) rendering from a small
set of visual primitives and `--ui-*` token overrides can reproduce all three keepers and produce
one new look without a new component class.

- One `ui--slider` component with a `recipe` input and a registry mapping recipe → ordered parts
  - token values.
- Visual primitives as small standalone components/directives sharing one state source.
- Standalone attempts become thin facades over the shared core.
- Not started; deliberately gated on 07a's outcome.

## 5. Action Checklist

### Spike 07a — Headless slider core

- [x] Create Plan 07 / Runbook 07 and register both indexes.
- [x] Add `projects/ui/src/lib/slider/ui-slider-base.ts`.
- [x] Refactor `SliderComponent`, `SliderSegmentedComponent`, `SliderReticleComponent` to extend it.
- [x] Export `UiSliderBase` / `IUiSliderDrag` from `public-api.ts`.
- [x] Run `npm test`, `npm run test:dom`, `npm run test:e2e`, `npm run build:ui`, Prettier; confirm no regressions.
- [x] Record the finding in the registry and Runbook 07.

### Spike 07b — Procedural slider parts (queued)

- [ ] Owner go/no-go after 07a.
- [ ] Write the falsifiable hypothesis for the new look the recipe must produce.
- [ ] Build the recipe registry and visual primitives; keep standalone attempts as facades.

## 6. Verified Finding — Spike 07a (2026-10-21)

**Passed.** One `UiSliderBase` serves all three attempts with no behavioural or pixel regression.
The attempt components shrank from 635 lines total (207 / 218 / 210) to 159 (54 / 54 / 51) ahead of
a 194-line base — about 44% less code — and each attempt now declares only `trackHeight`, its
geometry, `labelId`, extension inputs, and `pointerRatio`. All existing Vitest (57), jsdom (53),
and Playwright (35) tests passed unchanged. The base is also the shared state source spike 07b will
build on.

## 7. Open Questions

- Should 07b's recipe be a string enum, a config object, or both? Default: string enum for the
  shipped looks plus an optional config object for consumers.
- Do we keep three standalone selectors long-term, or collapse to one `ui--slider` and treat the
  others as deprecated aliases? Default: keep the standalone selectors as the per-attempt surface.
- Where do per-attempt token overrides live — component SCSS or the recipe? Default: recipe sets
  `--ui-*`, styles read tokens.
