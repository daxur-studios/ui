import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  ElementRef,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';
import {
  buildTubeWindow,
  type ITubeLayout,
  type ITubeRect,
  type ITubeScene,
} from '../../../../../ui/src/lib/sigil/sigil-tube-kit';

/** Which reference composition the window mirrors. */
export type ChromeKitVariant = 'desktop' | 'phone';

/** Header band height per variant, in CSS pixels. */
const HEADER_HEIGHT: Record<ChromeKitVariant, number> = { desktop: 74, phone: 104 };
/** Body stroke as a fraction of tube width. */
const BODY_RATIO = 0.74;
/** Body offset toward the light, as a fraction of tube width; leaves a darker lower lip. */
const BODY_LIFT = 0.08;
/** Highlight stroke as a fraction of tube width. */
const HIGHLIGHT_RATIO = 0.3;
/** Highlight offset toward the light, as a fraction of tube width. */
const HIGHLIGHT_LIFT = 0.16;
/** Lower reflection stroke as a fraction of tube width. */
const REFLECT_RATIO = 0.2;
/** Lower reflection offset away from the light, as a fraction of tube width. */
const REFLECT_DROP = 0.24;

/** Instance counter so each window's gradient id is unique on the page. */
let nextWindowId = 0;

/** One stroke layer entry for the template. */
interface IStroke {
  readonly d: string;
  readonly width: number;
  readonly dy: number;
}

/**
 * One cybersigil window: HTML content in normal flow plus an SVG chrome overlay fitted to it.
 *
 * Purpose: prove the tube kit can wrap a real, reflowing layout. The component measures marked
 * elements (`data-chrome`) on resize only, builds the scene, and renders every tube in four stacked
 * layers (edge, body, reflection, highlight) so merges stay seamless.
 */
@Component({
  selector: 'app-chrome-kit-window',
  templateUrl: './chrome-kit-window.component.html',
  styleUrl: './chrome-kit-window.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[attr.data-variant]': 'variant()' },
})
export class ChromeKitWindowComponent {
  readonly seed = input.required<number>();
  readonly variant = input<ChromeKitVariant>('desktop');

  protected readonly nodeGradientId = `chrome-kit-node-${nextWindowId++}`;

  private readonly frame = viewChild.required<ElementRef<HTMLElement>>('frame');
  private readonly measured = signal<Omit<ITubeLayout, 'seed'> | null>(null);

  protected readonly headerHeight = computed(() => HEADER_HEIGHT[this.variant()]);

  protected readonly scene = computed<ITubeScene | null>(() => {
    const layout = this.measured();
    return layout ? buildTubeWindow({ ...layout, seed: this.seed() }) : null;
  });

  protected readonly viewBox = computed(() => {
    const m = this.measured();
    return m ? `0 0 ${m.width} ${m.height}` : '0 0 1 1';
  });

  protected readonly strokes = computed(() => {
    const scene = this.scene();
    if (!scene) return null;
    const all = [...scene.tubes, ...scene.fineTubes];
    const layer = (ratio: number, offset: number): IStroke[] =>
      all.map((t) => ({ d: t.d, width: t.width * ratio, dy: t.width * offset }));
    return {
      edge: layer(1, 0),
      body: layer(BODY_RATIO, -BODY_LIFT),
      reflect: layer(REFLECT_RATIO, REFLECT_DROP),
      highlight: layer(HIGHLIGHT_RATIO, -HIGHLIGHT_LIFT),
    };
  });

  constructor() {
    const destroyRef = inject(DestroyRef);
    afterNextRender(() => {
      const el = this.frame().nativeElement;
      const observer = new ResizeObserver(() => this.measure(el));
      observer.observe(el);
      this.measure(el);
      destroyRef.onDestroy(() => observer.disconnect());
    });
  }

  /** Reads marked element boxes relative to the frame; runs only on resize. */
  private measure(el: HTMLElement): void {
    const origin = el.getBoundingClientRect();
    const rel = (node: Element): ITubeRect => {
      const r = node.getBoundingClientRect();
      return { x: r.left - origin.left, y: r.top - origin.top, width: r.width, height: r.height };
    };
    const all = (kind: string) =>
      Array.from(el.querySelectorAll(`[data-chrome~="${kind}"]`)).map(rel);
    this.measured.set({
      width: origin.width,
      height: origin.height,
      headerHeight: this.headerHeight(),
      pills: all('pill'),
      cards: all('card'),
      connectorTargets: all('target'),
      dividers: all('divider').map((r) => r.y + r.height / 2),
    });
  }
}
