import { describe, expect, it } from 'vitest';
import type {
  ISpikeEntry,
  SpikeDisposition,
  SpikeElement,
  SpikeStatus,
} from '../spikes/spike-registry';
import {
  hiddenSpikeCount,
  isSpikeHiddenByDefault,
  visibleSpikes,
  type ICatalogFilterOptions,
} from './catalog-filter';

/** Sample entries for the filter only. They are not registry data, so no spike is invented. */
function sample(params: {
  id: string;
  number?: number;
  status?: SpikeStatus;
  element?: SpikeElement;
  attempt?: number;
  disposition?: SpikeDisposition;
  rank?: number | null;
}): ISpikeEntry {
  return {
    id: params.id,
    number: params.number ?? 1,
    element: params.element ?? 'slider',
    attempt: params.attempt ?? 1,
    title: params.id,
    route: `/spikes/${params.id}`,
    hypothesis: 'Sample hypothesis for filter tests.',
    status: params.status ?? 'passed',
    disposition: params.disposition ?? 'candidate',
    rank: params.rank !== undefined ? params.rank : null,
    thumbnail: null,
    dateISO: '2026-10-18',
  };
}

const ENTRIES = [
  sample({ id: 'pending-slider', status: 'pending', element: 'slider', number: 1, rank: 2 }),
  sample({ id: 'passed-slider', status: 'passed', element: 'slider', number: 2, rank: 1 }),
  sample({ id: 'failed-slider', status: 'failed', element: 'slider', number: 3, rank: 3 }),
  sample({
    id: 'inconclusive-slider',
    status: 'inconclusive',
    element: 'slider',
    number: 4,
    rank: null,
  }),
  sample({
    id: 'discard-slider',
    status: 'passed',
    element: 'slider',
    disposition: 'discard',
    number: 5,
    rank: 4,
  }),
  sample({
    id: 'candidate-button-1',
    status: 'passed',
    element: 'button',
    number: 6,
    rank: 1,
  }),
  sample({
    id: 'candidate-button-2',
    status: 'passed',
    element: 'button',
    number: 7,
    rank: null,
  }),
];

describe('isSpikeHiddenByDefault', () => {
  it('returns true for failed, inconclusive, or discard entries', () => {
    expect(
      isSpikeHiddenByDefault(sample({ id: 'p', status: 'passed', disposition: 'candidate' })),
    ).toBe(false);
    expect(
      isSpikeHiddenByDefault(sample({ id: 'f', status: 'failed', disposition: 'candidate' })),
    ).toBe(true);
    expect(
      isSpikeHiddenByDefault(sample({ id: 'i', status: 'inconclusive', disposition: 'candidate' })),
    ).toBe(true);
    expect(
      isSpikeHiddenByDefault(sample({ id: 'd', status: 'passed', disposition: 'discard' })),
    ).toBe(true);
  });
});

describe('visibleSpikes', () => {
  it('hides failed, inconclusive, and discard entries by default', () => {
    const visible = visibleSpikes(ENTRIES, false);
    expect(visible.map((entry) => entry.id)).toEqual([
      'passed-slider',
      'candidate-button-1',
      'pending-slider',
      'candidate-button-2',
    ]);
  });

  it('shows every entry when showHidden is true', () => {
    const visible = visibleSpikes(ENTRIES, true);
    expect(visible.length).toBe(ENTRIES.length);
  });

  it('filters by element', () => {
    const sliders = visibleSpikes(ENTRIES, { element: 'slider' });
    expect(sliders.map((e) => e.id)).toEqual(['passed-slider', 'pending-slider']);

    const buttons = visibleSpikes(ENTRIES, { element: 'button' });
    expect(buttons.map((e) => e.id)).toEqual(['candidate-button-1', 'candidate-button-2']);

    const all = visibleSpikes(ENTRIES, { element: 'all' });
    expect(all.length).toBe(4);
  });

  it('sorts by rank ascending with null last, tie-breaking by number', () => {
    const sorted = visibleSpikes(ENTRIES, { showHidden: true, sort: 'rank' });
    // Ranks:
    // passed-slider (rank 1, num 2)
    // candidate-button-1 (rank 1, num 6) -> tie-break num 2 before 6
    // pending-slider (rank 2, num 1)
    // failed-slider (rank 3, num 3)
    // discard-slider (rank 4, num 5)
    // inconclusive-slider (rank null, num 4)
    // candidate-button-2 (rank null, num 7)
    expect(sorted.map((e) => e.id)).toEqual([
      'passed-slider',
      'candidate-button-1',
      'pending-slider',
      'failed-slider',
      'discard-slider',
      'inconclusive-slider',
      'candidate-button-2',
    ]);
  });

  it('sorts by number in creation order', () => {
    const sorted = visibleSpikes(ENTRIES, { showHidden: true, sort: 'number' });
    expect(sorted.map((e) => e.id)).toEqual([
      'pending-slider',
      'passed-slider',
      'failed-slider',
      'inconclusive-slider',
      'discard-slider',
      'candidate-button-1',
      'candidate-button-2',
    ]);
  });

  it('returns an empty list for an empty registry', () => {
    expect(visibleSpikes([], false)).toEqual([]);
  });
});

describe('hiddenSpikeCount', () => {
  it('counts failed, inconclusive, and discard entries for all elements', () => {
    expect(hiddenSpikeCount(ENTRIES)).toBe(3); // failed-slider, inconclusive-slider, discard-slider
  });

  it('counts hidden entries scoped to an element filter', () => {
    expect(hiddenSpikeCount(ENTRIES, 'slider')).toBe(3);
    expect(hiddenSpikeCount(ENTRIES, 'button')).toBe(0);
  });

  it('is zero when nothing is hidden', () => {
    expect(hiddenSpikeCount([sample({ id: 'pending-only', status: 'pending' })])).toBe(0);
  });
});
