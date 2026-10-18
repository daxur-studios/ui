import type { ISpikeEntry } from '../spikes/spike-registry';

/** Statuses hidden from the initial catalog view. Failed and inconclusive spikes are kept, not deleted. */
const HIDDEN_BY_DEFAULT: ReadonlySet<ISpikeEntry['status']> = new Set(['failed', 'inconclusive']);

/** Returns the entries the catalog shows. Failed and inconclusive entries appear only when `showHidden` is true. */
export function visibleSpikes(
  entries: readonly ISpikeEntry[],
  showHidden: boolean,
): readonly ISpikeEntry[] {
  return showHidden ? entries : entries.filter((entry) => !HIDDEN_BY_DEFAULT.has(entry.status));
}

/** How many entries the default view hides. */
export function hiddenSpikeCount(entries: readonly ISpikeEntry[]): number {
  return entries.filter((entry) => HIDDEN_BY_DEFAULT.has(entry.status)).length;
}
