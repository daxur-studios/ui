---
type: Plan
title: Angled SVG Range Slider (<ui--slider>) Spike
description: First falsifiable UI control spike — accessible Angular 20 standalone <ui--slider> with dynamic ¬ (negation/step) SVG track geometry, pure TS math helpers, and Playwright + Vitest verification.
timestamp: 2026-10-18T12:56:00Z
status: completed
runbook: /docs/runbook/03_slider-svg-spike.md
tags: [slider, svg, spike, accessibility, angular, signals, playwright, vitest, tokens]
---

# Angled SVG Range Slider (`<ui--slider>`) Spike

## 1. Goal & Falsifiable Hypothesis

Build and verify the first `@daxur-studios/ui` control (`<ui--slider>`) and its corresponding demo spike (`slider-svg-spike`) following the locked-in consensus from [Plan 01](01_testing-and-architecture-evaluation.md) and the [Spikes Standard](../standards/spikes.md).

- **Spike ID**: `slider-svg-spike` (`#1` in `SPIKE_REGISTRY`)
- **Route**: `/spikes/slider-svg-spike`
- **Falsifiable Hypothesis**:
  > _"Can a `<ui--slider>` built as a single-tab-stop Angular 20 `OnPush` signal component render a dynamic SVG `¬` (horizontal-then-angled-down) active track path measured via `ResizeObserver`, support pointer-capture dragging and full keyboard navigation (`Arrow`, `Shift+Arrow`, `PageUp/Down`, `Home/End`), and emit separate live `value` updates and terminal `valueCommit` events without layout shift or hardcoded CSS color literals?"_

---

## 2. Visual & SVG Geometry Design (`¬` Angled Track)

Instead of a flat rectangular bar, `<ui--slider>` renders a responsive SVG canvas where the active track draws a horizontal line from the start of the rail (`x = 0`) and angles sharply downward (`¬` / turnstile hook) directly into the active knob position (`thumbX`), while the remaining inactive rail continues cleanly to the right end:

```text
Label (e.g. "FOV")                                      [ 75.0° ]
0% ═══════════════════════════════╲
                                   ╲  [♦]  · · · · · · · · · 100%
```

### Pure TS Geometry & Math (`projects/ui/src/lib/slider/slider-math.ts`)

Zero Angular or DOM imports so Vitest can test all math deterministically in Node:

1. **`clampAndSnapValue(rawValue, min, max, step)`**:
   - Handles non-finite inputs, reversed/equal bounds (`max <= min`), step snapping aligned to `min`, and decimal precision rounding (preventing IEEE-754 float drift like `0.30000000000000004`).
2. **`valueToRatio(value, min, max)` & `ratioToValue(ratio, min, max, step)`**:
   - Normalizes between `[0, 1]` safely (returns `0` when `max <= min`).
3. **`buildAngledTrackPath(geometry: ISliderTrackGeometry): ISliderSvgPaths`**:
   - Given `{ width, height, ratio, hookDx, hookDy, trackY, thumbRadius }`, returns:
     - `activePath`: SVG path string `M startX trackY L kneeX trackY L thumbX (trackY + hookDy)` that smoothly clamps `kneeX` near `0%` so the hook never draws at negative X coordinates.
     - `inactivePath`: SVG path string from the knob (`thumbX`) to the right edge (`endX`).
     - `thumbX` and `thumbY`: Exact pixel coordinates for positioning the SVG knob element.

---

## 3. Component Contract (`<ui--slider>`)

Location: `projects/ui/src/lib/slider/` (exported from `projects/ui/src/public-api.ts`).

### Selector & Host Rules

- **Selector**: `ui--slider` (double-dash element selector per Plan 01 consensus).
- **Files**: Separate `slider.component.ts`, `slider.component.html`, and `slider.component.scss`; component browser verification lives in `e2e/spikes/slider-svg-spike.spec.ts` (Vitest remains pure Node math testing per Plan 01).
- **Change Detection**: `ChangeDetectionStrategy.OnPush`, standalone, 100% zoneless-compatible (`host: {}` bindings, no `@HostListener`).
- **Explicit Host Display**: `:host { display: block; }` (never `inline`).

### Inputs, Model & Outputs (Standardized Control Contract)

- `label = input.required<string>()` — Visible label & accessible name (`aria-label` / linked label ID).
- `value = model<number>(0)` — Live numeric value updated during scrubbing and keyboard stepping.
- `valueCommit = output<number>()` — Emitted **only** at the end of an interaction transaction (`pointerup` / `pointercancel` after a drag that changed the value, or after a discrete keyboard step / track click).
- `min = input<number>(0)` — Minimum bound.
- `max = input<number>(100)` — Maximum bound.
- `step = input<number>(1)` — Step increment (validated `> 0`, defaults to `1` if invalid).
- `unit = input<string>('')` — Optional unit suffix displayed in the readout (e.g., `'°'`, `'m/s²'`, `'%'`).
- `disabled = input<boolean>(false)` — Disables pointer and keyboard interaction and sets `aria-disabled="true"`.

### Accessibility & Interaction Contract

- **Single Sequential Tab Stop**:
  - The interactive slider thumb/rail element (`role="slider"`, `tabindex="0"` when enabled, `tabindex="-1"` when disabled) is the **sole tab stop** inside `<ui--slider>`.
  - Exposes `aria-valuemin`, `aria-valuemax`, `aria-valuenow`, `aria-valuetext` (including `unit` when present), `aria-disabled`, and `aria-labelledby`.
  - Decorative `<svg>` elements carry `aria-hidden="true"` and `focusable="false"`.
- **Keyboard Navigation** (on the `role="slider"` element):
  - `ArrowRight` / `ArrowUp`: Increment by `+1 × step`, update `value`, emit `valueCommit`.
  - `ArrowLeft` / `ArrowDown`: Decrement by `-1 × step`, update `value`, emit `valueCommit`.
  - `Shift + ArrowRight/Up`: Coarse increment by `+10 × step`.
  - `Shift + ArrowLeft/Down`: Coarse decrement by `-10 × step`.
  - `PageUp` / `PageDown`: Jump by `±10%` of `(max - min)` snapped to `step` (or at least `1 × step`).
  - `Home`: Jump to `min`.
  - `End`: Jump to `max`.
  - _(Note: No `Alt+Arrow` shortcut to avoid Windows browser history navigation conflicts)._
- **Pointer Capture Scrubbing**:
  - `pointerdown` on the track/thumb area calls `setPointerCapture(event.pointerId)`, focuses the slider element, immediately computes the new `value` from pointer X relative to the track bounding box, and attaches move tracking.
  - `pointermove` (while dragging) updates `value` live without emitting `valueCommit`.
  - `pointerup` / `pointercancel` releases pointer capture and emits `valueCommit` once if the committed value changed.
- **Responsive Width Measurement**:
  - A `ResizeObserver` on the track container updates a `trackWidth` signal on resize (cleaned up via `DestroyRef.onDestroy`), avoiding `getBoundingClientRect()` reflows on every `pointermove` frame.

### Styling & Token Contract

- **Zero literal `#hex` or `rgba()`** in `slider.component.scss` (all fallback literals live in a shared token stylesheet or `_tokens.scss` partial).
- Consumes `--ui-*` tokens with `--mat-sys-*` and Dark HUD fallbacks, plus explicit `.ui-theme-hud` / `[data-ui-theme="hud"]` support.

---

## 4. Demo Spike Page (`slider-svg-spike`)

Following [`docs/standards/spikes.md`](../standards/spikes.md):

- **Component**: `projects/demo/src/app/spikes/slider-svg-spike/slider-svg-spike.component.{ts,html,scss}`
  - Selector: `app-slider-svg-spike`
  - Stage wrapper: `<section data-spike-stage [attr.data-spike-ready]="true" data-ui-theme="hud">`
  - Demonstrates 3 `<ui--slider>` instances (e.g., `Field of View` `30°–120°`, `Gravity Y` `-20–0 m/s²`, and a `Disabled` slider) plus live telemetry counters showing `liveValue` updates vs `commitCount` (`(valueCommit)` emissions) so Playwright and human reviewers can inspect the live-vs-commit split.
- **Route**: Registered at `spikes/slider-svg-spike` in `projects/demo/src/app/app.routes.ts`.
- **Registry Entry**: Added as `#1` in `projects/demo/src/app/spikes/spike-registry.ts`.

---

## 5. Action Checklist

- [x] Create shared token defaults partial (`projects/ui/src/lib/styles/_tokens.scss`) and `.ui-theme-hud` / `[data-ui-theme="hud"]` contract (no literal hex/rgba inside component SCSS).
- [x] Implement pure TS math & SVG path builder (`projects/ui/src/lib/slider/slider-math.ts`) with named constants and JSDoc.
- [x] Add comprehensive Vitest unit tests (`projects/ui/src/lib/slider/slider-math.spec.ts`) covering clamping, step snapping, float precision, and `¬` SVG path generation at `0%`, `50%`, `100%`, and narrow widths.
- [x] Implement `<ui--slider>` (`slider.component.ts`, `.html`, `.scss`) and export from `projects/ui/src/public-api.ts`.
- [x] Create spike page `projects/demo/src/app/spikes/slider-svg-spike/`, wire route in `app.routes.ts`, and register `#1` in `spike-registry.ts`.
- [x] Add Playwright verification spec `e2e/spikes/slider-svg-spike.spec.ts` verifying:
  - Host `display` is not `inline` and SVG path `[d]` updates dynamically when value changes.
  - Single `Tab` stop enters and exits `<ui--slider>` cleanly without traps.
  - Keyboard navigation (`ArrowRight`, `Shift+ArrowRight`, `Home`, `End`) updates `value` and increments `valueCommit`.
  - Pointer drag across the track emits multiple live `value` updates during `pointermove` and **exactly one** `valueCommit` on `pointerup`.
- [x] Run `npm test`, `npm run test:e2e`, and `npm run spikes:thumbnails`, then record the finding and mark `slider-svg-spike` status in `spike-registry.ts` and Runbook 03.

## 6. Verified Finding (2026-10-18)

**Passed.** The 12 slider Playwright checks confirm a single tab stop, every specified keyboard action,
responsive SVG geometry, more than five live previews during a captured drag and exactly one terminal
commit. Control bounds remain identical before/after interaction, and instrumented pointermove
handling performs zero layout reads. Both HUD scopes and inherited UI/Material tokens pass.

Verification: `npm test` (35 passed), `npm run test:e2e` (20 passed across the current workspace),
`npm run spikes:thumbnails` (4 passed; slider WebP 5.7 KB), production library/demo builds, and
Prettier on modified files only. See [Runbook 03](../runbook/03_slider-svg-spike.md) for decisions,
scope limits, and the [960 × 540 capture](../runbook/assets/03/slider-svg-spike.png).

## 7. First Spike Reflection

This first spike established a reusable numeric slider and token-based visual contract. Its current
customization covers bounds, step, unit, disabled state, theme tokens, and container width; geometry
and density remain internal. The next focused spike should test optional precise value editing with
a native number input, keeping the typed draft separate from the slider value until accepted, plus
compact, comfortable (current), and spacious density presets. Start inside `<ui--slider>`; extract a
shared number control only after another use case proves the API. See the reflection in
[Runbook 03](../runbook/03_slider-svg-spike.md#first-spike-reflection-2026-10-18).
