import {
  booleanAttribute,
  computed,
  Directive,
  forwardRef,
  input,
  signal,
  type ModelSignal,
  type Provider,
  type Type,
} from '@angular/core';
import { type ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

/**
 * Reactive-forms bridge for value controls. It lets `formControl`, `ngModel`, and `formControlName`
 * drive a component's `value` model, while user edits, form writes, and disabled state each take a
 * separate path so that writing a value never echoes back to the form as a user change.
 */
@Directive()
export abstract class UiFormControl<T> implements ControlValueAccessor {
  /** The control's current value; subclasses declare it as a `model()` so `[(value)]` keeps working. */
  abstract readonly value: ModelSignal<T>;

  /** Host-level disabled flag; `booleanAttribute` lets a bare `disabled` attribute turn it on. */
  readonly disabled = input(false, { transform: booleanAttribute });

  /** Disabled state pushed by the form through `setDisabledState`, kept apart from the input. */
  private readonly formDisabled = signal(false);

  /** Single interaction guard: true when either the input or the form has disabled the control. */
  readonly isDisabled = computed(() => this.disabled() || this.formDisabled());

  private onChange: (value: T) => void = () => {};
  private onTouched: () => void = () => {};

  /** Writes a form value into the model without notifying the form, which already holds it. */
  writeValue(value: T | null | undefined): void {
    this.value.set(this.coerceWrittenValue(value));
  }

  /** Stores the callback the form uses to receive user-driven value changes. */
  registerOnChange(fn: (value: T) => void): void {
    this.onChange = fn;
  }

  /** Stores the callback the form uses to receive blur events so touched state is accurate. */
  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  /** Mirrors the form's disabled state so every interaction guard reads one signal. */
  setDisabledState(isDisabled: boolean): void {
    this.formDisabled.set(isDisabled);
  }

  /** Maps any form write, including `null` from `reset()`, onto a valid model value. */
  protected abstract coerceWrittenValue(value: T | null | undefined): T;

  /** The only path for user-driven changes: updates the model, then tells the form. */
  protected updateValueFromUser(value: T): void {
    this.value.set(value);
    this.onChange(value);
  }

  /** Reports a user interaction to the form so its touched state reflects blur. */
  protected markTouched(): void {
    this.onTouched();
  }
}

/**
 * Provider that registers a `UiFormControl` subclass as an `NG_VALUE_ACCESSOR`. The `type` thunk
 * lets a component reference its own class inside its decorator without a forward-declaration error.
 */
export function provideUiFormControl(type: () => Type<unknown>): Provider {
  return { provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(type), multi: true };
}
