import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { describe, it, expect, beforeEach } from 'vitest';
import { SPIKE_REGISTRY } from '../spikes/spike-registry';
import { hiddenSpikeCount, visibleSpikes } from './catalog-filter';
import { CatalogPage } from './catalog-page';

function cardCount(root: HTMLElement): number {
  return root.querySelectorAll('[data-testid="spike-card"]').length;
}

describe('CatalogPage', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), provideRouter([])],
    });
  });

  it('shows only the visible entries and notes how many are hidden', () => {
    const fixture = TestBed.createComponent(CatalogPage);
    fixture.detectChanges();
    const root: HTMLElement = fixture.nativeElement;

    expect(root.querySelector<HTMLInputElement>('[data-testid="show-hidden"]')?.checked).toBe(
      false,
    );
    expect(cardCount(root)).toBe(visibleSpikes(SPIKE_REGISTRY, false).length);

    const note = root.querySelector('[data-testid="hidden-note"]');
    if (hiddenSpikeCount(SPIKE_REGISTRY) > 0) {
      expect(note?.textContent).toContain(String(hiddenSpikeCount(SPIKE_REGISTRY)));
    } else {
      expect(note).toBeNull();
    }
  });

  it('shows every entry, and drops the hidden note, when the filter is turned on', () => {
    const fixture = TestBed.createComponent(CatalogPage);
    fixture.detectChanges();
    const root: HTMLElement = fixture.nativeElement;

    const checkbox = root.querySelector<HTMLInputElement>('[data-testid="show-hidden"]');
    if (!checkbox) throw new Error('filter checkbox is missing');
    checkbox.checked = true;
    checkbox.dispatchEvent(new Event('change'));
    fixture.detectChanges();

    expect(cardCount(root)).toBe(SPIKE_REGISTRY.length);
    expect(root.querySelector('[data-testid="hidden-note"]')).toBeNull();
  });
});
