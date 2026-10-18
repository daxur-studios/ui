import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach } from 'vitest';
import { SpikePlaceholderComponent } from './spike-placeholder';

describe('SpikePlaceholderComponent', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
  });

  it('shows the label and names it for assistive tech', () => {
    const fixture = TestBed.createComponent(SpikePlaceholderComponent);
    fixture.componentRef.setInput('label', 'Angled SVG range slider');
    fixture.detectChanges();

    const element: HTMLElement = fixture.nativeElement.querySelector('[role="img"]');
    expect(element.getAttribute('aria-label')).toBe('No thumbnail yet: Angled SVG range slider');
    expect(element.textContent?.trim()).toBe('Angled SVG range slider');
  });
});
