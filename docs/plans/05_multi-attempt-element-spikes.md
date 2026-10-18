---
type: Plan
title: Multi-Attempt UI Element Spikes (Slider & Button) and Catalog Curation
description: Explore multiple HUD/geometric style attempts per UI element (Slider and Button), sort and triage attempts by preference in the catalog, and enforce UiFormControl reactive forms across all attempts.
timestamp: 2026-10-18T17:53:00Z
status: active
runbook: /docs/runbook/05_multi-attempt-element-spikes.md
tags: [spikes, catalog, slider, button, reactive-forms, hud, curation, planning]
---

# Multi-Attempt UI Element Spikes (Slider & Button) and Catalog Curation

## 1. Goal

A single spike per control only tests one visual and interaction idea. Every `@daxur-studios/ui` element (`slider`, `button`, and subsequent controls) should instead be explored through **multiple competing style/approach attempts** so the owner can compare them in `/catalog`, sort them by preference (`rank`), keep the strongest candidates (`keep`), and discard the rest (`discard`).

Every attempt must also honor the library's [Reactive Forms Contract](../standards/form-controls.md) (`UiFormControl<T>` + `provideUiFormControl(...)`).

---

## 2. Decisions

1. **One catalog spike entry per attempt**:
   - Each style/approach attempt is a standalone spike route and registry entry tagged with its target `element` (`'slider'` | `'button'`), `attempt` number (`1`, `2`, `3`, …), owner preference `rank` (`number | null`, where `1` is favorite), and curation `disposition` (`'candidate'` | `'keep'` | `'discard'`).
2. **Catalog filtering, sorting, and curation (`/catalog`)**:
   - **Filter by element**: `All`, `Slider`, `Button`.
   - **Sort order**: `Preference rank` (`rank` ascending, then unranked by creation `number`) vs `Creation order` (`number`).
   - **Visibility filter**: `discard` entries are hidden from the default view just like `failed` and `inconclusive` entries, and revealed when the "Show hidden / discarded" toggle is enabled.
3. **Button Reactive Forms integration (`UiFormControl<boolean>`)**:
   - `<ui--button>` attempts extend `UiFormControl<boolean>` and register `provideUiFormControl(...)`.
   - Supports **toggle/latching mode** (`toggle = input(false, { transform: booleanAttribute })`): when active or bound to a `FormControl<boolean>`, clicking or pressing `Enter`/`Space` flips `value` via `updateValueFromUser(!this.value())`, reflects `aria-pressed="true | false"`, marks touched on `blur`, and maps `null` (`form.reset()`) to `false`.
   - Supports **action mode** (`toggle = false`): standard button semantics (`type="button" | "submit" | "reset"`), single sequential tab stop, `aria-disabled` driven by `isDisabled()` (combining the `disabled` input and `FormControl.disable()`), and `(triggered)` output.
4. **Visual direction — HUD / Geometric Sci-Fi**:
   - All new Slider and Button attempts explore distinct HUD/sci-fi geometric language (chamfered polygons, corner bracket reticles, segmented tick rails, hairline trace borders, and status indicators) using `--ui-*` tokens exclusively (zero literal `#hex` or `rgba()` in component styles).

---

## 3. Planned Attempts

### 3.1 Slider Attempts (`element: 'slider'`)

| Attempt | Spike ID | Style / Mechanism Approach | Falsifiable Hypothesis |
| --- | --- | --- | --- |
| **#1** *(existing)* | `slider-svg-spike` | **Angled `¬` Turnstile SVG Rail** — Horizontal active rail with angled hook into a diamond thumb. | *(Completed in Plan 03 / 04; retrofitted with `element: 'slider'`, `attempt: 1`, `disposition: 'candidate'`, `rank: 1`).* |
| **#2** | `slider-segmented-hud-spike` | **Segmented Tick-Cell HUD Bar** — Discrete SVG cell array that illuminates up to the current ratio, paired with a chamfered numeric readout badge. | Can an OnPush SVG segmented-cell slider (`UiFormControl<number>`) compute cell illumination paths responsively via `ResizeObserver`, support pointer scrubbing + keyboard stepping, and pass the `FormControl` round-trip contract without layout shift? |
| **#3** | `slider-reticle-rail-spike` | **Dual-Rail Bracket Reticle Slider** — Parallel hairline rails with a zero/origin tick marker and `[ ♦ ]` caliper brackets that frame the thumb. | Can a dual-rail reticle slider (`UiFormControl<number>`) render bipolar origin-relative active fill (e.g. `-20` to `+20` anchored at `0`) and caliper thumb geometry in SVG while preserving single-tab-stop keyboard/pointer and reactive form semantics? |

### 3.2 Button Attempts (`element: 'button'`)

| Attempt | Spike ID | Style / Mechanism Approach | Falsifiable Hypothesis |
| --- | --- | --- | --- |
| **#1** | `button-chamfer-hud-spike` | **Chamfered Polygon Frame Button** — SVG notched-corner perimeter trace with diagonal accent cut and translucent white press overlay. | Can a chamfered SVG-framed button extending `UiFormControl<boolean>` support both momentary action clicks (`type="button" \| "submit" \| "reset"`) and reactive-form toggle latching (`aria-pressed`, `FormControl<boolean>`, `disable()`, `reset()`) with a single tab stop and token-only styling? |
| **#2** | `button-bracket-reticle-spike` | **Corner-Bracket Reticle Button** — Tactical `[ LABEL ]` corner ticks that cinch inward on focus/hover and lock closed when `value()` is `true`. | Can a corner-bracket reticle button extending `UiFormControl<boolean>` animate/position its 4 SVG corner brackets purely from state signals and `--ui-*` tokens while passing full keyboard (`Space`/`Enter`), blur-touched, and `FormControl<boolean>` round-trip verification? |
| **#3** | `button-trace-pill-spike` | **Hairline Trace & Status-LED Button** — Industrial HUD bar button with an embedded SVG status pip (off / armed / latched) and bottom trace bar. | Can a trace-and-LED button extending `UiFormControl<boolean>` reflect live `FormControl<boolean>` state, disabled state (`isDisabled()`), and dirty/touched telemetry through its status pip and trace rail without hardcoded color literals? |

---

## 4. Action Checklist

- [ ] **Phase 1 — Registry & Catalog Curation**
  - [ ] Extend `ISpikeEntry` in `projects/demo/src/app/spikes/spike-registry.ts` with `element`, `attempt`, `disposition`, and `rank`.
  - [ ] Update `catalog-filter.ts` + `catalog-filter.spec.ts` with element filtering (`all` | `'slider'` | `'button'`), preference rank sorting (`rank` ascending with `null` last, tie-broken by `number`), and `discard` hiding.
  - [ ] Update `catalog-page.{ts,html,scss}` and `catalog-page.dom.spec.ts` to expose element filter pills, sort toggle, and disposition/rank badges.
- [ ] **Phase 2 — Additional Slider Attempts (`UiFormControl<number>`)**
  - [ ] Build `slider-segmented-hud-spike` (Attempt #2) + DOM `FormControl` round-trip spec + Playwright spec.
  - [ ] Build `slider-reticle-rail-spike` (Attempt #3) + DOM `FormControl` round-trip spec + Playwright spec.
- [ ] **Phase 3 — Button Attempts (`UiFormControl<boolean>`)**
  - [ ] Build `button-chamfer-hud-spike` (Attempt #1) + DOM `FormControl<boolean>` round-trip spec + Playwright spec.
  - [ ] Build `button-bracket-reticle-spike` (Attempt #2) + DOM `FormControl<boolean>` round-trip spec + Playwright spec.
  - [ ] Build `button-trace-pill-spike` (Attempt #3) + DOM `FormControl<boolean>` round-trip spec + Playwright spec.
- [ ] **Phase 4 — Verification & Thumbnails**
  - [ ] Run `npm test`, `npm run test:dom`, `npm run test:e2e`, and `npm run spikes:thumbnails` across all 6 spikes, then record findings and owner rankings in Runbook 05.
