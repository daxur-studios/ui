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
