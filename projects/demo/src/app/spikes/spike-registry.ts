/** Lifecycle outcome of one spike. `pending` means the question is still open. */
export type SpikeStatus = 'pending' | 'passed' | 'failed' | 'inconclusive';

/**
 * One falsifiable question and its outcome. Fields follow `docs/standards/spikes.md` §5, and the
 * catalog shows failed and inconclusive entries only when a filter asks for them.
 */
export interface ISpikeEntry {
  readonly id: string;
  readonly number: number;
  readonly title: string;
  readonly route: string;
  readonly hypothesis: string;
  readonly status: SpikeStatus;
  readonly finding?: string;
  /** Path under `public/`, or `null` when the catalog should show the placeholder. */
  readonly thumbnail: string | null;
  readonly planRunbook?: string;
  readonly dateISO: string;
}

/**
 * Every spike, in creation order. Empty until the owner confirms the first hypothesis, because a
 * spike's question must come from the owner and never be invented.
 */
export const SPIKE_REGISTRY: readonly ISpikeEntry[] = [];
