/** Lifecycle outcome of one spike. `pending` means the question is still open. */
export type SpikeStatus = 'pending' | 'passed' | 'failed' | 'inconclusive';

/** UI control family under exploration. */
export type SpikeElement = 'slider' | 'button' | 'sigil';

/** Owner curation verdict across competing style attempts. */
export type SpikeDisposition = 'candidate' | 'keep' | 'discard';

/**
 * One falsifiable question and its outcome. Fields follow `docs/standards/spikes.md` §5, and the
 * catalog shows failed and inconclusive entries only when a filter asks for them.
 */
export interface ISpikeEntry {
  readonly id: string;
  readonly number: number;
  readonly element: SpikeElement;
  readonly attempt: number;
  readonly title: string;
  readonly route: string;
  readonly hypothesis: string;
  readonly status: SpikeStatus;
  readonly disposition: SpikeDisposition;
  readonly rank: number | null;
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
    element: 'slider',
    attempt: 1,
    title: 'Angled SVG range slider',
    route: '/spikes/slider-svg-spike',
    hypothesis:
      'Can a single-tab-stop Angular OnPush signal slider render a responsive angled SVG rail, support pointer capture and full keyboard navigation, and separate live value updates from terminal commits without layout shift or literal component colors?',
    status: 'passed',
    disposition: 'candidate',
    rank: 1,
    finding:
      'The 12 slider browser checks confirm single-stop keyboard access, responsive angled SVG geometry and captured dragging with more than five live previews followed by exactly one commit. Control bounds stay unchanged during interaction, pointermove performs zero layout reads, and the generated thumbnail is 5.7 KB.',
    thumbnail: 'thumbnails/slider-svg-spike.webp',
    planRunbook: '/docs/runbook/03_slider-svg-spike.md',
    dateISO: '2026-10-18',
  },
  {
    id: 'slider-segmented-hud-spike',
    number: 2,
    element: 'slider',
    attempt: 2,
    title: 'Segmented tick-cell HUD slider',
    route: '/spikes/slider-segmented-hud-spike',
    hypothesis:
      'Can an OnPush SVG segmented-cell slider (UiFormControl<number>) compute cell illumination paths responsively via ResizeObserver, support pointer scrubbing + keyboard stepping, and pass the FormControl round-trip contract without layout shift?',
    status: 'passed',
    disposition: 'candidate',
    rank: 2,
    finding:
      'Discrete cell array illuminates responsively up to normalized ratio, passes full keyboard and pointer capture navigation, and fulfills UiFormControl round-trip contract.',
    thumbnail: 'thumbnails/slider-segmented-hud-spike.webp',
    planRunbook: '/docs/runbook/05_multi-attempt-element-spikes.md',
    dateISO: '2026-10-18',
  },
  {
    id: 'slider-reticle-rail-spike',
    number: 3,
    element: 'slider',
    attempt: 3,
    title: 'Dual-rail bracket reticle slider',
    route: '/spikes/slider-reticle-rail-spike',
    hypothesis:
      'Can a dual-rail reticle slider (UiFormControl<number>) render bipolar origin-relative active fill (e.g. -20 to +20 anchored at 0) and caliper thumb geometry in SVG while preserving single-tab-stop keyboard/pointer and reactive form semantics?',
    status: 'passed',
    disposition: 'candidate',
    rank: 3,
    finding:
      'Dual-rail caliper slider reliably renders zero-anchored bipolar fill and caliper framing brackets, maintaining seamless keyboard stepping and reactive form lifecycle.',
    thumbnail: 'thumbnails/slider-reticle-rail-spike.webp',
    planRunbook: '/docs/runbook/05_multi-attempt-element-spikes.md',
    dateISO: '2026-10-18',
  },
  {
    id: 'button-chamfer-hud-spike',
    number: 4,
    element: 'button',
    attempt: 1,
    title: 'Chamfered polygon frame button',
    route: '/spikes/button-chamfer-hud-spike',
    hypothesis:
      'Can a chamfered SVG-framed button extending UiFormControl<boolean> support both momentary action clicks (type="button" | "submit" | "reset") and reactive-form toggle latching (aria-pressed, FormControl<boolean>, disable(), reset()) with a single tab stop and token-only styling?',
    status: 'passed',
    disposition: 'candidate',
    rank: 1,
    finding:
      'Chamfered polygon frame button supports both momentary action and reactive-form toggle latching with single-tab-stop navigation, blur touched tracking, and token-only styling.',
    thumbnail: 'thumbnails/button-chamfer-hud-spike.webp',
    planRunbook: '/docs/runbook/05_multi-attempt-element-spikes.md',
    dateISO: '2026-10-18',
  },
  {
    id: 'button-bracket-reticle-spike',
    number: 5,
    element: 'button',
    attempt: 2,
    title: 'Corner-bracket reticle button',
    route: '/spikes/button-bracket-reticle-spike',
    hypothesis:
      'Can a corner-bracket reticle button extending UiFormControl<boolean> animate/position its 4 SVG corner brackets purely from state signals and --ui-* tokens while passing full keyboard (Space/Enter), blur-touched, and FormControl<boolean> round-trip verification?',
    status: 'passed',
    disposition: 'candidate',
    rank: 2,
    finding:
      'Tactical bracket button provides smooth 4-corner bracket cinching and locking without layout shift, passing full keyboard navigation and reactive forms contract.',
    thumbnail: 'thumbnails/button-bracket-reticle-spike.webp',
    planRunbook: '/docs/runbook/05_multi-attempt-element-spikes.md',
    dateISO: '2026-10-18',
  },
  {
    id: 'button-trace-pill-spike',
    number: 6,
    element: 'button',
    attempt: 3,
    title: 'Hairline trace & status-LED button',
    route: '/spikes/button-trace-pill-spike',
    hypothesis:
      'Can a trace-and-LED button extending UiFormControl<boolean> reflect live FormControl<boolean> state, disabled state (isDisabled()), and dirty/touched telemetry through its status pip and trace rail without hardcoded color literals?',
    status: 'passed',
    disposition: 'candidate',
    rank: 3,
    finding:
      'Trace-and-LED button cleanly indicates off, armed, and latched states via its embedded SVG status pip and bottom trace bar, fulfilling the reactive form contract using design tokens only.',
    thumbnail: 'thumbnails/button-trace-pill-spike.webp',
    planRunbook: '/docs/runbook/05_multi-attempt-element-spikes.md',
    dateISO: '2026-10-18',
  },
  {
    id: 'slider-notch-rail-spike',
    number: 7,
    element: 'slider',
    attempt: 4,
    title: 'Chamfered notch rail slider',
    route: '/spikes/slider-notch-rail-spike',
    hypothesis:
      'Can the procedural slider recipe engine produce a fourth, previously unseen look — a chamfered notch rail whose progress line drops diagonally into the handle with an anchored in-canvas readout — purely from recipe data and --ui-* tokens, with no new component class?',
    status: 'passed',
    disposition: 'candidate',
    rank: 4,
    finding:
      'The notch look ships as pure recipe data (a dropped progress path and an anchored SVG readout, with no container chrome) with zero new component classes: the whole slider family is now one shared template plus four recipe entries. Existing segmented/reticle e2e specs passed unchanged against the unified component, and three new browser checks confirm the notch geometry, the wrapper-toggle class, and the reactive-forms contract.',
    thumbnail: 'thumbnails/slider-notch-rail-spike.webp',
    planRunbook: '/docs/runbook/07_headless-slider-core.md',
    dateISO: '2026-10-21',
  },
  {
    id: 'cybersigil-shape-lab-spike',
    number: 8,
    element: 'sigil',
    attempt: 1,
    title: 'Cybersigil shape & chrome lab',
    route: '/spikes/cybersigil-shape-lab-spike',
    hypothesis:
      'Can pure procedural Bezier-ribbon and crescent-junction math (sigil-math.ts) plus a hardware-accelerated SVG feSpecularLighting filter generate the three target cybersigil archetypes (asymmetric winged star from concept (6), bilateral crest from concept (7), anodized S-tendril from concept (1)), with live slider tuning, flat-versus-chrome inspection, and pointer-reactive specular glints, using --ui-* tokens only?',
    status: 'pending',
    disposition: 'candidate',
    rank: null,
    thumbnail: 'thumbnails/cybersigil-shape-lab-spike.webp',
    planRunbook: '/docs/plans/09_cybersigillism-svg-lighting.md',
    dateISO: '2026-10-25',
  },
];
