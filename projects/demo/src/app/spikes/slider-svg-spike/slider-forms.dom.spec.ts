import { Component, provideZonelessChangeDetection } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { SliderComponent } from '@daxur-studios/ui';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

/** Keyboard step size used by the slider; the host control uses the default step of 1. */
const STEP = 1;
/** Initial value written by the host control in every scenario. */
const INITIAL_VALUE = 40;
/** Minimum of the default slider range, where a reset control must render. */
const RANGE_MIN = 0;

/** jsdom has no layout observer; the slider only disconnects it, so a no-op stub is enough. */
class ResizeObserverStub {
  observe(): void {}
  disconnect(): void {}
}

/** Host that binds one slider to a reactive form control and records commit events. */
@Component({
  imports: [SliderComponent, ReactiveFormsModule],
  template: `<ui--slider
    label="Exposure"
    [formControl]="control"
    (valueCommit)="commits.push($event)"
  />`,
})
class SliderHostComponent {
  readonly control = new FormControl<number | null>(INITIAL_VALUE);
  readonly commits: number[] = [];
}

describe('SliderComponent reactive forms', () => {
  let fixture: ComponentFixture<SliderHostComponent>;
  let host: SliderHostComponent;
  let rail: HTMLElement;
  let originalResizeObserver: typeof ResizeObserver | undefined;

  beforeEach(() => {
    originalResizeObserver = globalThis.ResizeObserver;
    globalThis.ResizeObserver = ResizeObserverStub as unknown as typeof ResizeObserver;
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection()],
    });
    fixture = TestBed.createComponent(SliderHostComponent);
    host = fixture.componentInstance;
    fixture.detectChanges();
    rail = fixture.nativeElement.querySelector('[role="slider"]') as HTMLElement;
  });

  afterEach(() => {
    if (originalResizeObserver) globalThis.ResizeObserver = originalResizeObserver;
    else Reflect.deleteProperty(globalThis, 'ResizeObserver');
  });

  /** Dispatches a keydown on the rail and refreshes the view, as a browser keystroke would. */
  function press(key: string): void {
    rail.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));
    fixture.detectChanges();
  }

  it('renders the initial form value on the rail', () => {
    expect(rail.getAttribute('aria-valuenow')).toBe(String(INITIAL_VALUE));
  });

  it('updates the rail when the form value changes, without marking the control dirty', () => {
    host.control.setValue(60);
    fixture.detectChanges();

    expect(rail.getAttribute('aria-valuenow')).toBe('60');
    expect(host.control.dirty).toBe(false);
  });

  it('pushes keyboard changes into the form, marks it dirty, and commits once', () => {
    press('ArrowRight');

    expect(host.control.value).toBe(INITIAL_VALUE + STEP);
    expect(host.control.dirty).toBe(true);
    expect(host.commits).toEqual([INITIAL_VALUE + STEP]);
  });

  it('marks the control touched when the rail loses focus', () => {
    expect(host.control.touched).toBe(false);

    rail.dispatchEvent(new FocusEvent('blur'));
    fixture.detectChanges();

    expect(host.control.touched).toBe(true);
  });

  it('disables the rail and ignores keystrokes while the form is disabled, then restores it', () => {
    host.control.disable();
    fixture.detectChanges();

    expect(rail.getAttribute('tabindex')).toBe('-1');
    expect(rail.getAttribute('aria-disabled')).toBe('true');

    press('ArrowRight');
    expect(host.control.value).toBe(INITIAL_VALUE);
    expect(host.commits).toEqual([]);

    host.control.enable();
    fixture.detectChanges();

    expect(rail.getAttribute('tabindex')).toBe('0');
    expect(rail.getAttribute('aria-disabled')).toBe('false');
  });

  it('renders at the minimum when the form is reset to null', () => {
    press('ArrowRight');
    host.control.reset();
    fixture.detectChanges();

    expect(rail.getAttribute('aria-valuenow')).toBe(String(RANGE_MIN));
    expect(host.control.dirty).toBe(false);
  });
});
