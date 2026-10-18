import { Component, provideZonelessChangeDetection } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { SliderReticleComponent } from '@daxur-studios/ui';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

const STEP = 1;
const INITIAL_VALUE = 20;
const RANGE_MIN = 0;

class ResizeObserverStub {
  observe(): void {}
  disconnect(): void {}
}

@Component({
  imports: [SliderReticleComponent, ReactiveFormsModule],
  template: `<ui--slider-reticle
    label="Elevation"
    [formControl]="control"
    (valueCommit)="commits.push($event)"
  />`,
})
class SliderReticleHostComponent {
  readonly control = new FormControl<number | null>(INITIAL_VALUE);
  readonly commits: number[] = [];
}

describe('SliderReticleComponent reactive forms', () => {
  let fixture: ComponentFixture<SliderReticleHostComponent>;
  let host: SliderReticleHostComponent;
  let track: HTMLElement;
  let originalResizeObserver: typeof ResizeObserver | undefined;

  beforeEach(() => {
    originalResizeObserver = globalThis.ResizeObserver;
    globalThis.ResizeObserver = ResizeObserverStub as unknown as typeof ResizeObserver;
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection()],
    });
    fixture = TestBed.createComponent(SliderReticleHostComponent);
    host = fixture.componentInstance;
    fixture.detectChanges();
    track = fixture.nativeElement.querySelector('[role="slider"]') as HTMLElement;
  });

  afterEach(() => {
    if (originalResizeObserver) globalThis.ResizeObserver = originalResizeObserver;
    else Reflect.deleteProperty(globalThis, 'ResizeObserver');
  });

  function press(key: string): void {
    track.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));
    fixture.detectChanges();
  }

  it('renders the initial form value on the slider', () => {
    expect(track.getAttribute('aria-valuenow')).toBe(String(INITIAL_VALUE));
  });

  it('updates the track when form value changes, without marking the control dirty', () => {
    host.control.setValue(45);
    fixture.detectChanges();

    expect(track.getAttribute('aria-valuenow')).toBe('45');
    expect(host.control.dirty).toBe(false);
  });

  it('pushes keyboard changes into the form, marks it dirty, and commits once', () => {
    press('ArrowRight');

    expect(host.control.value).toBe(INITIAL_VALUE + STEP);
    expect(host.control.dirty).toBe(true);
    expect(host.commits).toEqual([INITIAL_VALUE + STEP]);
  });

  it('marks the control touched when track loses focus', () => {
    expect(host.control.touched).toBe(false);

    track.dispatchEvent(new FocusEvent('blur'));
    fixture.detectChanges();

    expect(host.control.touched).toBe(true);
  });

  it('disables the slider and ignores keystrokes while form is disabled, then restores it', () => {
    host.control.disable();
    fixture.detectChanges();

    expect(track.getAttribute('tabindex')).toBe('-1');
    expect(track.getAttribute('aria-disabled')).toBe('true');

    press('ArrowRight');
    expect(host.control.value).toBe(INITIAL_VALUE);
    expect(host.commits).toEqual([]);

    host.control.enable();
    fixture.detectChanges();

    expect(track.getAttribute('tabindex')).toBe('0');
    expect(track.getAttribute('aria-disabled')).toBe('false');
  });

  it('renders at minimum when the form is reset to null', () => {
    press('ArrowRight');
    host.control.reset();
    fixture.detectChanges();

    expect(track.getAttribute('aria-valuenow')).toBe(String(RANGE_MIN));
    expect(host.control.dirty).toBe(false);
  });
});
