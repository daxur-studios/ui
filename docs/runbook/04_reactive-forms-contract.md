---
type: Runbook
title: Reactive Forms Contract (ControlValueAccessor) — Runbook
description: Trace of the decision to make reactive forms the default binding for Daxur controls, and the slider's adoption evidence.
timestamp: 2026-10-18T00:00:00Z
plans: [/docs/plans/04_reactive-forms-contract.md]
tags: [forms, reactive-forms, control-value-accessor, slider, standards]
---

# Reactive Forms Contract (`ControlValueAccessor`) — Runbook

## 2026-10-18

### Claude Code — Gap identified and standard written

- **[finding]** Plans 00–03 never required Angular forms support. `<ui--slider>` exposed only
  `[(value)]`, `(valueChange)`, and `(valueCommit)`, so it could not bind with `[formControl]` or
  `formControlName`.
- **[decision]** Owner direction: reactive forms are the default, preferred binding for every Daxur
  form element and are required. Material form-field integration (`MatFormFieldControl`) is less
  preferred and deferred.
- **[decision]** Implement `ControlValueAccessor` once in a shared abstract base
  (`UiFormControl<T>`) instead of per component, so every control behaves identically.
- **[decision]** Forms receive live values (each changed drag/key step), matching native
  `<input type="range">` and `MatSlider`; `valueCommit` remains the end-of-interaction signal.
  Rejected commit-only form updates because `form.value` would lag behind the visible value during
  a drag.
- **[decision]** Touched on blur; form writes never notify the form or emit `valueCommit`; `null`
  from `reset()` maps to a documented per-control fallback (slider: normalized minimum);
  `disabled` input and form disabled state combine into one `isDisabled()`.
- **[decision]** `@angular/forms` becomes a required peer. Validators, `aria-invalid`, and Signal
  Forms are deferred (Plan 04 §5). `value = model<T>()` keeps the Signal Forms migration small.
- **[assessment]** Slider impact is small and non-breaking: a new ~60-line base, ~20 changed lines
  in `slider.component.ts`, two or three template bindings, one peer entry, plus tests. The Plan 03
  numeric/geometry code and its 12 Playwright checks are unaffected.
- **[action]** Wrote [`docs/standards/form-controls.md`](../standards/form-controls.md) and Plan 04;
  added the rule to `AGENTS.md`, a decision to Plan/Runbook 00, a dated note to Runbook 03, and a
  forms section to the bundled `SKILL.md`.
- **[next]** Implement the base and slider adoption, then append verification evidence below.
