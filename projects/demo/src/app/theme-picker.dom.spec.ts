import { Component, provideZonelessChangeDetection } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { UiThemePickerComponent, UiThemeService, UI_THEME_STORAGE_KEY } from '@daxur-studios/ui';
import { beforeEach, describe, expect, it } from 'vitest';

@Component({
  imports: [UiThemePickerComponent],
  template: `<ui--theme-picker />`,
})
class ThemePickerHostComponent {}

function clickOption(root: HTMLElement, testId: string): void {
  const button = root.querySelector<HTMLButtonElement>(`[data-testid="${testId}"]`);
  if (!button) throw new Error(`missing option ${testId}`);
  button.click();
}

describe('UiThemePickerComponent', () => {
  let fixture: ComponentFixture<ThemePickerHostComponent>;
  let theme: UiThemeService;
  let root: HTMLElement;

  beforeEach(() => {
    localStorage.clear();
    for (const attribute of ['data-ui-scheme', 'data-ui-mode', 'data-ui-density']) {
      document.documentElement.removeAttribute(attribute);
    }
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
    theme = TestBed.inject(UiThemeService);
    fixture = TestBed.createComponent(ThemePickerHostComponent);
    fixture.detectChanges();
    root = fixture.nativeElement;
  });

  it('renders an option for every scheme, mode and density', () => {
    expect(root.querySelectorAll('[data-testid^="theme-scheme-"]').length).toBe(3);
    expect(root.querySelectorAll('[data-testid^="theme-mode-"]').length).toBe(3);
    expect(root.querySelectorAll('[data-testid^="theme-density-"]').length).toBe(3);
  });

  it('marks the active option with aria-pressed and the active class', () => {
    const hud = root.querySelector('[data-testid="theme-scheme-hud"]');
    expect(hud?.getAttribute('aria-pressed')).toBe('true');
    expect(hud?.classList.contains('active')).toBe(true);

    const orange = root.querySelector('[data-testid="theme-scheme-orange"]');
    expect(orange?.getAttribute('aria-pressed')).toBe('false');
  });

  it('applies the selection to the document root on click', () => {
    clickOption(root, 'theme-scheme-blue');
    clickOption(root, 'theme-mode-light');
    clickOption(root, 'theme-density-compact');
    fixture.detectChanges();

    expect(document.documentElement.getAttribute('data-ui-scheme')).toBe('blue');
    expect(document.documentElement.getAttribute('data-ui-mode')).toBe('light');
    expect(document.documentElement.getAttribute('data-ui-density')).toBe('compact');
  });

  it('moves the active marker to the newly selected option', () => {
    clickOption(root, 'theme-scheme-orange');
    fixture.detectChanges();

    expect(
      root.querySelector('[data-testid="theme-scheme-orange"]')?.getAttribute('aria-pressed'),
    ).toBe('true');
    expect(
      root.querySelector('[data-testid="theme-scheme-hud"]')?.getAttribute('aria-pressed'),
    ).toBe('false');
  });

  it('persists the selection to localStorage', () => {
    clickOption(root, 'theme-scheme-orange');
    clickOption(root, 'theme-density-spacious');

    const stored = localStorage.getItem(UI_THEME_STORAGE_KEY);
    expect(stored).toContain('orange');
    expect(stored).toContain('spacious');
    expect(theme.snapshot()).toEqual({ scheme: 'orange', mode: 'dark', density: 'spacious' });
  });
});
