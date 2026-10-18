import { Component, provideZonelessChangeDetection } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { ButtonTraceComponent } from '@daxur-studios/ui';
import { beforeEach, describe, expect, it } from 'vitest';

@Component({
  imports: [ButtonTraceComponent, ReactiveFormsModule],
  template: `<ui--button-trace
    label="Uplink"
    toggle
    [formControl]="control"
    (triggered)="triggers.push(true)"
  />`,
})
class ButtonTraceHostComponent {
  readonly control = new FormControl<boolean | null>(false);
  readonly triggers: boolean[] = [];
}

describe('ButtonTraceComponent reactive forms', () => {
  let fixture: ComponentFixture<ButtonTraceHostComponent>;
  let host: ButtonTraceHostComponent;
  let btn: HTMLButtonElement;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection()],
    });
    fixture = TestBed.createComponent(ButtonTraceHostComponent);
    host = fixture.componentInstance;
    fixture.detectChanges();
    btn = fixture.nativeElement.querySelector('button') as HTMLButtonElement;
  });

  it('renders initial form value with aria-pressed="false"', () => {
    expect(btn.getAttribute('aria-pressed')).toBe('false');
  });

  it('updates aria-pressed on programmatic write without marking control dirty', () => {
    host.control.setValue(true);
    fixture.detectChanges();

    expect(btn.getAttribute('aria-pressed')).toBe('true');
    expect(host.control.dirty).toBe(false);
  });

  it('user click toggles form value and marks control dirty', () => {
    btn.click();
    fixture.detectChanges();

    expect(host.control.value).toBe(true);
    expect(host.control.dirty).toBe(true);
    expect(btn.getAttribute('aria-pressed')).toBe('true');
    expect(host.triggers.length).toBe(1);
  });

  it('keyboard Enter toggles form value and marks control dirty', () => {
    btn.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    fixture.detectChanges();

    expect(host.control.value).toBe(true);
    expect(host.control.dirty).toBe(true);
    expect(btn.getAttribute('aria-pressed')).toBe('true');
  });

  it('keyboard Space toggles form value and marks control dirty', () => {
    btn.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }));
    fixture.detectChanges();

    expect(host.control.value).toBe(true);
    expect(host.control.dirty).toBe(true);
    expect(btn.getAttribute('aria-pressed')).toBe('true');
  });

  it('marks control touched on blur', () => {
    expect(host.control.touched).toBe(false);

    btn.dispatchEvent(new FocusEvent('blur'));
    fixture.detectChanges();

    expect(host.control.touched).toBe(true);
  });

  it('disables button and ignores activation while disabled, then restores on enable', () => {
    host.control.disable();
    fixture.detectChanges();

    expect(btn.getAttribute('tabindex')).toBe('-1');
    expect(btn.getAttribute('aria-disabled')).toBe('true');

    btn.click();
    expect(host.control.value).toBe(false);
    expect(host.triggers.length).toBe(0);

    host.control.enable();
    fixture.detectChanges();

    expect(btn.getAttribute('tabindex')).toBe('0');
    expect(btn.getAttribute('aria-disabled')).toBe('false');
  });

  it('resets form control to false when reset to null', () => {
    btn.click();
    expect(host.control.value).toBe(true);

    host.control.reset();
    fixture.detectChanges();

    expect(btn.getAttribute('aria-pressed')).toBe('false');
    expect(host.control.value).toBe(null);
    expect(host.control.dirty).toBe(false);
  });
});
