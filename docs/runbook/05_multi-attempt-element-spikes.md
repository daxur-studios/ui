---
type: Runbook
title: Multi-Attempt UI Element Spikes (Slider & Button) and Catalog Curation — Runbook
description: Chronological trace of decisions and verification for multi-attempt Slider and Button spikes, catalog sorting/curation, and UiFormControl<boolean> button support.
timestamp: 2026-10-18T17:53:00Z
plans: [/docs/plans/05_multi-attempt-element-spikes.md]
tags: [spikes, catalog, slider, button, reactive-forms, hud, curation, runbook]
---

# Multi-Attempt UI Element Spikes (Slider & Button) and Catalog Curation — Runbook

## 2026-10-18

### Antigravity — Plan refinement and owner decisions

- **[finding]** `slider-svg-spike` (Plan 03 / Plan 04) proved the single-tab-stop SVG slider and `UiFormControl<number>` contract, but only explored a single visual style (`¬` angled turnstile track), and `ISpikeEntry` had no fields for grouping multiple attempts by UI element, sorting them by preference, or discarding rejected styles.
- **[decision]** **One catalog spike entry per attempt:** Each style/approach attempt gets its own spike entry tagged with `element` (`'slider' | 'button'`), `attempt` index, `rank` (`number | null`), and `disposition` (`'candidate' | 'keep' | 'discard'`). The catalog filters by `element`, sorts by `rank` (or creation `number`), and hides `discard` entries by default alongside `failed` and `inconclusive` spikes.
- **[decision]** **Button reactive forms contract (`UiFormControl<boolean>`):** `<ui--button>` attempts extend `UiFormControl<boolean>` (`provideUiFormControl`) so buttons support reactive-form toggle/latching state (`aria-pressed`, `FormControl<boolean>`, `markTouched()` on blur, `null` → `false` on `reset()`) alongside standard momentary action clicks (`type="button" | "submit" | "reset"`) and shared `isDisabled()` coordination.
- **[decision]** **Visual direction:** Queue 2 additional HUD/geometric sci-fi Slider attempts (`slider-segmented-hud-spike`, `slider-reticle-rail-spike`) and 3 HUD/geometric sci-fi Button attempts (`button-chamfer-hud-spike`, `button-bracket-reticle-spike`, `button-trace-pill-spike`).
- **[action]** Updated [`docs/standards/spikes.md`](../standards/spikes.md) §5 with `element`, `attempt`, `disposition`, and `rank`, created [Plan 05](../plans/05_multi-attempt-element-spikes.md), and registered Plan/Runbook 05 in both indexes.

### Antigravity — Implementation, verification gates, and findings

- **[action]** Extended `ISpikeEntry` in `projects/demo/src/app/spikes/spike-registry.ts` with `element`, `attempt`, `disposition`, and `rank`.
- **[action]** Implemented catalog filtering and sorting logic in `catalog-filter.ts`:
  - Element filtering by `'all' | 'slider' | 'button'`.
  - Preference rank sorting (`rank` ascending with `null` last, tie-breaking by `number` ascending) vs creation order (`number`).
  - Visibility filtering hiding `discard` entries by default alongside `failed` and `inconclusive` spikes.
- **[action]** Implemented catalog UI in `catalog-page.{ts,html,scss}` exposing element filter pills, sort controls, and badges on cards for element, attempt, rank, and disposition, styled exclusively with `--ui-*` CSS custom properties.
- **[action]** Built two new Slider attempts (`element: 'slider'`, `UiFormControl<number>`):
  - **Attempt #2 (`slider-segmented-hud-spike`)**: `<ui--slider-segmented>` featuring discrete SVG cell array that illuminates up to the normalized ratio, paired with a chamfered numeric readout badge, responsive `ResizeObserver` tracking, captured dragging, keyboard stepping, and full reactive forms telemetry.
  - **Attempt #3 (`slider-reticle-rail-spike`)**: `<ui--slider-reticle>` featuring dual hairline rails with zero-anchored bipolar fill (e.g. `-24` to `+24` dB) and caliper framing brackets around the thumb diamond.
- **[action]** Built shared button contract and three Button attempts (`element: 'button'`, `UiFormControl<boolean>`):
  - Shared `UiButtonBase` extending `UiFormControl<boolean>` with `label`, `toggle`, `type`, `value` model, `triggered` output, `null` -> `false` coercion on `form.reset()`, and blur-touched tracking.
  - `<ui--button>` component supporting variants (`chamfer`, `bracket`, `trace`) along with dedicated variant components `<ui--button-chamfer>`, `<ui--button-bracket>`, and `<ui--button-trace>`.
  - **Attempt #1 (`button-chamfer-hud-spike`)**: Chamfered SVG polygon perimeter frame with diagonal accent cut and translucent overlay active state.
  - **Attempt #2 (`button-bracket-reticle-spike`)**: Tactical 4-corner SVG bracket reticle ticks that cinch inward on hover/focus and lock closed when active.
  - **Attempt #3 (`button-trace-pill-spike`)**: Industrial hairline trace button with an embedded SVG status LED pip (off / armed / latched) and bottom trace rail.
- **[verification]**:
  - `npm test`: 51 pure Vitest unit tests passing across math helpers and catalog filtering.
  - `npm run test:dom`: 48 DOM Reactive Forms tests passing across all 6 spikes, catalog page, and placeholder.
  - `npm run spikes:thumbnails`: Captured all 6 WebP thumbnails under `projects/demo/public/thumbnails/` within the size budget (all under 11 KB).
  - `npm run test:e2e`: 41 cross-browser Playwright tests passing across all spikes and catalog pages.
  - `npm run build:ui`: Production library bundle built successfully.
- **[finding]** Initial curation and owner rankings:
  - Sliders: #1 `slider-svg-spike` (Rank 1, candidate), #2 `slider-segmented-hud-spike` (Rank 2, candidate), #3 `slider-reticle-rail-spike` (Rank 3, candidate).
  - Buttons: #4 `button-chamfer-hud-spike` (Rank 1, candidate), #5 `button-bracket-reticle-spike` (Rank 2, candidate), #6 `button-trace-pill-spike` (Rank 3, candidate).
