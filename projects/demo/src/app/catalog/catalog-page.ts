import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ISpikeEntry, SPIKE_REGISTRY } from '../spikes/spike-registry';
import { hiddenSpikeCount, visibleSpikes } from './catalog-filter';
import { SpikePlaceholderComponent } from './spike-placeholder';

/**
 * Catalog of every spike in the registry. Failed and inconclusive spikes are hidden until the
 * filter is turned on. A thumbnail that is missing or fails to load shows the placeholder.
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
  protected readonly hiddenCount = hiddenSpikeCount(SPIKE_REGISTRY);
  protected readonly visible = computed(() => visibleSpikes(SPIKE_REGISTRY, this.showHidden()));

  /** Ids of entries whose thumbnail file failed to load, so they fall back to the placeholder. */
  private readonly brokenThumbnails = signal<ReadonlySet<string>>(new Set());

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
