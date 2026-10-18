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
 * Every owner-approved spike hypothesis and its measured outcome, in creation order.
 */
export const SPIKE_REGISTRY: readonly ISpikeEntry[] = [
  {
    id: 'slider-svg-spike',
    number: 1,
    title: 'Angled SVG range slider',
    route: '/spikes/slider-svg-spike',
    hypothesis:
      'Can a single-tab-stop Angular OnPush signal slider render a responsive angled SVG rail, support pointer capture and full keyboard navigation, and separate live value updates from terminal commits without layout shift or literal component colors?',
    status: 'passed',
    finding:
      'The 12 slider browser checks confirm single-stop keyboard access, responsive angled SVG geometry and captured dragging with more than five live previews followed by exactly one commit. Control bounds stay unchanged during interaction, pointermove performs zero layout reads, and the generated thumbnail is 5.7 KB.',
    thumbnail: 'thumbnails/slider-svg-spike.webp',
    planRunbook: '/docs/runbook/03_slider-svg-spike.md',
    dateISO: '2026-10-18',
  },
];
