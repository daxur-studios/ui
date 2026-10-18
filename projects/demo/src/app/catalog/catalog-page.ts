import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ISpikeEntry, SPIKE_REGISTRY } from '../spikes/spike-registry';
import {
  hiddenSpikeCount,
  visibleSpikes,
  type ElementFilter,
  type SortOrder,
} from './catalog-filter';
import { SpikePlaceholderComponent } from './spike-placeholder';

/**
 * Catalog of every spike in the registry. Allows filtering by element and sorting by preference
 * rank or creation order. Failed, inconclusive, and discarded spikes are hidden until requested.
 */
@Component({
  selector: 'demo-catalog-page',
  imports: [RouterLink, SpikePlaceholderComponent],
  templateUrl: './catalog-page.html',
  styleUrl: './catalog-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CatalogPage {
  protected readonly registry = SPIKE_REGISTRY;
  protected readonly showHidden = signal(false);
  protected readonly elementFilter = signal<ElementFilter>('all');
  protected readonly sortOrder = signal<SortOrder>('rank');

  protected readonly hiddenCount = computed(() =>
    hiddenSpikeCount(SPIKE_REGISTRY, this.elementFilter()),
  );

  protected readonly visible = computed(() =>
    visibleSpikes(SPIKE_REGISTRY, {
      showHidden: this.showHidden(),
      element: this.elementFilter(),
      sort: this.sortOrder(),
    }),
  );

  /** Ids of entries whose thumbnail file failed to load, so they fall back to the placeholder. */
  private readonly brokenThumbnails = signal<ReadonlySet<string>>(new Set());

  protected setElementFilter(filter: ElementFilter): void {
    this.elementFilter.set(filter);
  }

  protected setSortOrder(order: SortOrder): void {
    this.sortOrder.set(order);
  }

  protected onShowHiddenChange(event: Event): void {
    this.showHidden.set((event.target as HTMLInputElement).checked);
  }

  protected onThumbnailError(entry: ISpikeEntry): void {
    this.brokenThumbnails.update((ids) => new Set(ids).add(entry.id));
  }

  /** Public URL of the thumbnail, or `null` when the placeholder should show. */
  protected thumbnailSrc(entry: ISpikeEntry): string | null {
    if (!entry.thumbnail || this.brokenThumbnails().has(entry.id)) return null;
    return `/${entry.thumbnail}`;
  }
}
