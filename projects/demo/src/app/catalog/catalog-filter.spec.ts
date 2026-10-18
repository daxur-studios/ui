import { describe, expect, it } from 'vitest';
import type { ISpikeEntry } from '../spikes/spike-registry';
import { hiddenSpikeCount, visibleSpikes } from './catalog-filter';

/** Sample entries for the filter only. They are not registry data, so no spike is invented. */
function sample(id: string, status: ISpikeEntry['status']): ISpikeEntry {
  return {
    id,
    number: 1,
    title: id,
    route: `/spikes/${id}`,
    hypothesis: 'Sample hypothesis for filter tests.',
    status,
    thumbnail: null,
    dateISO: '2026-10-18',
  };
}

const ENTRIES = [
  sample('pending-one', 'pending'),
  sample('passed-one', 'passed'),
  sample('failed-one', 'failed'),
  sample('inconclusive-one', 'inconclusive'),
];

describe('visibleSpikes', () => {
  it('hides failed and inconclusive entries by default', () => {
    expect(visibleSpikes(ENTRIES, false).map((entry) => entry.id)).toEqual([
      'pending-one',
      'passed-one',
    ]);
  });

  it('shows every entry when the filter asks for hidden ones', () => {
    expect(visibleSpikes(ENTRIES, true)).toEqual(ENTRIES);
  });

  it('returns an empty list for an empty registry', () => {
    expect(visibleSpikes([], false)).toEqual([]);
  });
});

describe('hiddenSpikeCount', () => {
  it('counts failed and inconclusive entries', () => {
    expect(hiddenSpikeCount(ENTRIES)).toBe(2);
  });

  it('is zero when nothing is hidden', () => {
    expect(hiddenSpikeCount([sample('pending-only', 'pending')])).toBe(0);
  });
});
