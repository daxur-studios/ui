import type { ISpikeEntry, SpikeElement } from '../spikes/spike-registry';

/** Element family filter option. */
export type ElementFilter = 'all' | SpikeElement;

/** Sort order for catalog entries. */
export type SortOrder = 'rank' | 'number';

/** Options for filtering and sorting catalog entries. */
export interface ICatalogFilterOptions {
  readonly showHidden?: boolean;
  readonly element?: ElementFilter;
  readonly sort?: SortOrder;
}

/** Statuses or dispositions hidden from the initial catalog view. */
export function isSpikeHiddenByDefault(entry: ISpikeEntry): boolean {
  return (
    entry.status === 'failed' || entry.status === 'inconclusive' || entry.disposition === 'discard'
  );
}

/** Returns the entries the catalog shows. Failed, inconclusive, and discarded entries appear only when `showHidden` is true. */
export function visibleSpikes(
  entries: readonly ISpikeEntry[],
  optionsOrShowHidden: boolean | ICatalogFilterOptions = false,
): readonly ISpikeEntry[] {
  const options: ICatalogFilterOptions =
    typeof optionsOrShowHidden === 'boolean'
      ? { showHidden: optionsOrShowHidden }
      : optionsOrShowHidden;

  const showHidden = options.showHidden ?? false;
  const element = options.element ?? 'all';
  const sort = options.sort ?? 'rank';

  let result = showHidden
    ? [...entries]
    : entries.filter((entry) => !isSpikeHiddenByDefault(entry));

  if (element !== 'all') {
    result = result.filter((entry) => entry.element === element);
  }

  if (sort === 'rank') {
    result.sort((a, b) => {
      if (a.rank !== null && b.rank !== null) {
        if (a.rank !== b.rank) return a.rank - b.rank;
        return a.number - b.number;
      }
      if (a.rank !== null) return -1;
      if (b.rank !== null) return 1;
      return a.number - b.number;
    });
  } else if (sort === 'number') {
    result.sort((a, b) => a.number - b.number);
  }

  return result;
}

/** How many entries the default view hides for the given element filter. */
export function hiddenSpikeCount(
  entries: readonly ISpikeEntry[],
  element: ElementFilter = 'all',
): number {
  return entries.filter((entry) => {
    const matchesElement = element === 'all' || entry.element === element;
    return matchesElement && isSpikeHiddenByDefault(entry);
  }).length;
}
