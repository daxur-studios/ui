---
type: Standard
title: Form Controls and Reactive Forms
description: Required ControlValueAccessor contract that makes every value-bearing @daxur-studios/ui control work with Angular reactive forms by default.
timestamp: 2026-10-18T00:00:00Z
status: active
plans: [/docs/plans/04_reactive-forms-contract.md]
tags: [forms, reactive-forms, control-value-accessor, standards, accessibility]
---

# Form Controls and Reactive Forms

> Every `@daxur-studios/ui` element that holds a user-editable value (slider, input, number,
> toggle, select, and so on) **must** work with Angular reactive forms out of the box. This is
> the default, preferred way to bind a Daxur control. Provenance and verification live in
> [Plan 04](../plans/04_reactive-forms-contract.md) and
> [Runbook 04](../runbook/04_reactive-forms-contract.md).

## 1. Purpose

Applications should bind Daxur controls the same way they bind native inputs:

```html
<ui--slider label="Exposure" [formControl]="exposure" />
<form [formGroup]="camera">
  <ui--slider label="Field of View" formControlName="fov" />
</form>
```

`form.value`, `valid`, `dirty`, `touched`, `disable()`, `reset()`, and the `ng-*` status classes
must all behave as they do for a native element. Signal bindings (`[(value)]`) remain supported
for local, non-form state.

## 2. Required contract

1. **Extend the shared base.** Value-bearing controls extend `UiFormControl<T>`
   (`projects/ui/src/lib/forms/ui-form-control.ts`) and register themselves with
   `provideUiFormControl(...)` (an `NG_VALUE_ACCESSOR` provider). Do not hand-write a separate
   `ControlValueAccessor` per component; the base keeps behavior identical across the library.
2. **One value model.** The control declares `readonly value = model<T>(...)`. It is the single
   source of truth for display, ARIA, and two-way binding. This shape also matches the custom-control
   shape of Angular's newer signal-based forms, keeping a later migration small.
3. **User changes go through one path.** Every user-driven change calls
   `updateValueFromUser(value)`, which sets `value` and notifies the form. Never call
   `value.set(...)` directly from an interaction handler.
4. **Form writes never echo.** `writeValue` sets `value` through `coerceWrittenValue` and must not
   notify the form (no change callback, no `dirty`). Controls never emit `valueCommit` for a form write.
5. **`null` is a valid write.** `form.reset()` writes `null`. Each control defines its fallback in
   `coerceWrittenValue` (the slider renders at its normalized minimum) and documents it in the skill.
6. **Live form updates.** The form is notified on every changed live value (each drag step or key
   step), matching native `<input type="range">` and Material. Work that should only run at the end
   of an interaction listens to the control's `valueCommit` output or debounces `valueChanges`.
7. **Touched on blur.** The control's focus target calls `markTouched()` on `blur`.
8. **One disabled state.** `disabled` (input) and the form's `setDisabledState` combine into
   `isDisabled()`. Templates and handlers read only `isDisabled()`. A disabled control has no
   sequential tab stop, sets `aria-disabled="true"`, ignores input, and closes any in-flight
   transaction once.
9. **No mixing on one element.** Use either `[formControl]` / `formControlName` **or**
   `[(value)]` on a given control instance, never both.

## 3. Required tests

Every value-bearing control ships a forms round trip in a `*.dom.spec.ts` (run with
`npm run test:dom`) using a real `FormControl`:

- A form write updates the rendered value / ARIA and does **not** mark the control dirty.
- A user interaction updates `control.value` and marks it dirty.
- Blur marks it touched.
- `disable()` removes the tab stop and blocks input; `enable()` restores it.
- `reset()` renders the documented `null` fallback.

Browser behavior (pointer, focus order) is additionally covered in the control's Playwright spec.

## 4. Packaging

`@angular/forms` is a required peer dependency of `@daxur-studios/ui`. The bundled skill
(`projects/ui/.agents/skills/ui/SKILL.md`) documents each control's forms usage and `null` fallback.

## 5. Non-goals (for now)

- **Angular Material form-field integration** (`MatFormFieldControl`, rendering inside
  `<mat-form-field>`) is lower priority and not required. Revisit only with a concrete consumer.
- **Built-in validators** (`NG_VALIDATORS`) are not part of the base contract. Controls that clamp
  their own range do not need them; add per control when a use case appears.
- **Signal Forms** (Angular's experimental signal-based forms) are not targeted yet; rule 2 keeps
  the door open.
