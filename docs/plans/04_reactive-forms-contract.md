---
type: Plan
title: Reactive Forms Contract (ControlValueAccessor)
description: Make reactive forms the default binding for every value-bearing @daxur-studios/ui control through a shared ControlValueAccessor base, starting with <ui--slider>.
timestamp: 2026-10-18T00:00:00Z
status: active
runbook: /docs/runbook/04_reactive-forms-contract.md
tags: [forms, reactive-forms, control-value-accessor, slider, standards]
---

# Reactive Forms Contract (`ControlValueAccessor`)

## 1. Goal

Initial planning (Plans 00–03) did not require Angular forms support. Reactive forms are the
preferred way for applications to bind Daxur controls, so every value-bearing control must
implement `ControlValueAccessor` correctly by default. Material form-field integration is
explicitly lower priority.

This is a library-wide contract, not a falsifiable spike. The rules live in the standard
[`docs/standards/form-controls.md`](../standards/form-controls.md); this plan tracks adoption.

## 2. Decisions

- **Shared base.** An abstract `@Directive()` class `UiFormControl<T>` in
  `projects/ui/src/lib/forms/` implements `ControlValueAccessor` once: change/touched callbacks,
  a form-disabled signal combined with the `disabled` input into `isDisabled()`, `writeValue`
  through a per-control `coerceWrittenValue`, and `updateValueFromUser` as the single
  user-change path. `provideUiFormControl(...)` registers `NG_VALUE_ACCESSOR`.
- **Live form updates.** Forms receive every changed live value (matching native range inputs and
  `MatSlider`) so `form.value` always matches the screen. `valueCommit` stays the end-of-interaction
  signal.
- **Touched on blur; writes never echo** back to the form or emit `valueCommit`.
- **`null` writes** (`reset()`) map to a documented per-control fallback; the slider uses its
  normalized minimum.
- **Peer dependency.** `@angular/forms` becomes a required peer of `@daxur-studios/ui`.
- **Non-goals.** `MatFormFieldControl`, base validators, and Signal Forms are deferred (see the
  standard §5). `value = model<T>()` keeps the Signal Forms path open.
- **Non-breaking.** `[(value)]`, `(valueChange)`, and `(valueCommit)` keep their Plan 03 behavior.

## 3. Slider adoption (first control)

`<ui--slider>` from [Plan 03](03_slider-svg-spike.md) is the first adopter:

- Extends `UiFormControl<number>`; its own `disabled` input moves to the base.
- `setValue()` routes through `updateValueFromUser`; all guards and the template read `isDisabled()`.
- The rail calls `markTouched()` on blur.
- The `slider-svg-spike` page gains a "Reactive form" panel (an `Exposure` slider bound to a
  `FormControl` with value/dirty/touched telemetry plus disable and reset buttons) as browser evidence.

## 4. Action Checklist

- [x] Write the standard [`docs/standards/form-controls.md`](../standards/form-controls.md).
- [x] Add the forms rule to `AGENTS.md`, the decision to Plan/Runbook 00, and the forms section to
      the bundled `SKILL.md`.
- [x] Implement `UiFormControl<T>` and `provideUiFormControl` and export them from `public-api.ts`.
- [x] Move `<ui--slider>` onto the base (live updates, touched on blur, combined disabled, `null` → min).
- [x] Add `@angular/forms` to `projects/ui/package.json` peers.
- [x] Add `FormControl` round-trip DOM tests (`npm run test:dom`) per standard §3.
- [x] Add the reactive form panel to the slider spike and Playwright checks (`npm run test:e2e`).
- [x] Verify `npm test`, `npm run test:dom`, `npm run test:e2e`, `npm run build:ui`, and the
      production demo build; record evidence in Runbook 04.
- [ ] Apply the standard to every future value-bearing control from its first commit.

## 5. Verified Finding (2026-10-18)

**Passed.** `<ui--slider>` binds with `[formControl]`: form writes render without marking dirty,
keyboard steps update the form live and mark it dirty, blur marks touched, `disable()`/`enable()`
toggle the tab stop and `aria-disabled`, and `reset()` renders at the minimum. Existing Plan 03
behavior is unchanged. Evidence: `npm test` 35 passed, `npm run test:dom` 9 passed (6 new),
Playwright 20 passed on Chromium (4 new), library and production demo builds passed. See
[Runbook 04](../runbook/04_reactive-forms-contract.md).

## 6. Open Questions

- Should some controls offer an opt-in "commit-only" form update mode for expensive consumers?
  Not until a real consumer needs it; `valueCommit` and debounced `valueChanges` cover it today.
- Should `aria-invalid` reflect form validity automatically? This needs `NgControl` access without
  a circular provider; revisit with the first control that has meaningful validation.
