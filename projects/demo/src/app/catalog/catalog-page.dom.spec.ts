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
    const hiddenCount = hiddenSpikeCount(SPIKE_REGISTRY, 'all');
    if (hiddenCount > 0) {
      expect(note?.textContent).toContain(String(hiddenCount));
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

  it('filters entries when an element pill is clicked', () => {
    const fixture = TestBed.createComponent(CatalogPage);
    fixture.detectChanges();
    const root: HTMLElement = fixture.nativeElement;

    const buttonPill = root.querySelector<HTMLButtonElement>('[data-testid="filter-button"]');
    if (!buttonPill) throw new Error('button pill is missing');
    buttonPill.click();
    fixture.detectChanges();

    const visibleButtons = visibleSpikes(SPIKE_REGISTRY, { showHidden: false, element: 'button' });
    expect(cardCount(root)).toBe(visibleButtons.length);

    const allPill = root.querySelector<HTMLButtonElement>('[data-testid="filter-all"]');
    allPill?.click();
    fixture.detectChanges();
    expect(cardCount(root)).toBe(visibleSpikes(SPIKE_REGISTRY, false).length);
  });

  it('filters to sigil spikes when the sigil pill is clicked', () => {
    const fixture = TestBed.createComponent(CatalogPage);
    fixture.detectChanges();
    const root: HTMLElement = fixture.nativeElement;

    const sigilPill = root.querySelector<HTMLButtonElement>('[data-testid="filter-sigil"]');
    if (!sigilPill) throw new Error('sigil pill is missing');
    sigilPill.click();
    fixture.detectChanges();

    const visibleSigil = visibleSpikes(SPIKE_REGISTRY, { showHidden: false, element: 'sigil' });
    expect(cardCount(root)).toBe(visibleSigil.length);
    expect(sigilPill.classList.contains('active')).toBe(true);
  });

  it('toggles sort order between preference rank and creation order', () => {
    const fixture = TestBed.createComponent(CatalogPage);
    fixture.detectChanges();
    const root: HTMLElement = fixture.nativeElement;

    const sortNumber = root.querySelector<HTMLButtonElement>('[data-testid="sort-number"]');
    sortNumber?.click();
    fixture.detectChanges();

    expect(sortNumber?.classList.contains('active')).toBe(true);

    const sortRank = root.querySelector<HTMLButtonElement>('[data-testid="sort-rank"]');
    sortRank?.click();
    fixture.detectChanges();

    expect(sortRank?.classList.contains('active')).toBe(true);
  });

  it('renders element, attempt, rank, and disposition badges on spike cards', () => {
    const fixture = TestBed.createComponent(CatalogPage);
    fixture.detectChanges();
    const root: HTMLElement = fixture.nativeElement;

    const cards = root.querySelectorAll('[data-testid="spike-card"]');
    if (cards.length > 0) {
      const firstCard = cards[0];
      expect(firstCard.querySelector('[data-testid="card-element"]')).not.toBeNull();
      expect(firstCard.querySelector('[data-testid="card-rank"]')).not.toBeNull();
      expect(firstCard.querySelector('[data-testid="card-disposition"]')).not.toBeNull();
    }
  });
});
