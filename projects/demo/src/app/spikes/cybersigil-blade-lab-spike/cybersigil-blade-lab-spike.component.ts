import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import {
  BLADE_SIGIL_LAYOUTS,
  generateBladeSigil,
  type BladeSigilLayout,
  type IBladeSigil,
} from '../../../../../ui/src/lib/sigil/sigil-blade';

/** Cells on the contact sheet. */
const SHEET_SIZE = 24;
/** Width of one generated sigil in user units. */
const CELL_WIDTH = 400;
/** Height of one generated sigil in user units. */
const CELL_HEIGHT = 220;
/** Smallest allowed stroke weight multiplier. */
const MIN_WEIGHT = 0.5;
/** Largest allowed stroke weight multiplier. */
const MAX_WEIGHT = 1.8;
/** Stroke weight change per button press. */
const WEIGHT_STEP = 0.1;

/** How the sheet renders each sigil. */
type RenderMode = 'chrome' | 'flat' | 'spine';

/** One cell on the contact sheet. */
interface ISheetCell {
  readonly seed: number;
  readonly sigil: IBladeSigil;
}

/**
 * Spike 09e: calligraphic blade engine contact sheet.
 *
 * Purpose: answer one question quickly by eye: does the blade-graph grammar produce sigils that
 * read as cybersigillism, with real structural variety across 24 consecutive seeds? The page shows
 * the sheet in banded chrome, flat silhouette, or a spine overlay that exposes the branch graph.
 */
@Component({
  selector: 'app-cybersigil-blade-lab-spike',
  templateUrl: './cybersigil-blade-lab-spike.component.html',
  styleUrl: './cybersigil-blade-lab-spike.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CybersigilBladeLabSpikeComponent {
  protected readonly layouts: readonly (BladeSigilLayout | 'mixed')[] = [
    'mixed',
    ...BLADE_SIGIL_LAYOUTS,
  ];
  protected readonly modes: readonly RenderMode[] = ['chrome', 'flat', 'spine'];
  protected readonly cellWidth = CELL_WIDTH;
  protected readonly cellHeight = CELL_HEIGHT;

  protected readonly page = signal(0);
  protected readonly layout = signal<BladeSigilLayout | 'mixed'>('mixed');
  protected readonly mode = signal<RenderMode>('chrome');
  protected readonly weight = signal(1);

  protected readonly cells = computed<ISheetCell[]>(() => {
    const first = this.page() * SHEET_SIZE + 1;
    const layout = this.layout();
    const weight = this.weight();
    return Array.from({ length: SHEET_SIZE }, (_, i) => {
      const seed = first + i;
      return {
        seed,
        sigil: generateBladeSigil({
          seed,
          width: CELL_WIDTH,
          height: CELL_HEIGHT,
          layout: layout === 'mixed' ? undefined : layout,
          weight,
        }),
      };
    });
  });

  protected readonly firstSeed = computed(() => this.page() * SHEET_SIZE + 1);
  protected readonly lastSeed = computed(() => this.firstSeed() + SHEET_SIZE - 1);

  protected previousPage(): void {
    this.page.update((p) => Math.max(0, p - 1));
  }

  protected nextPage(): void {
    this.page.update((p) => p + 1);
  }

  protected heavier(): void {
    this.weight.update((w) => Math.min(MAX_WEIGHT, Number((w + WEIGHT_STEP).toFixed(2))));
  }

  protected lighter(): void {
    this.weight.update((w) => Math.max(MIN_WEIGHT, Number((w - WEIGHT_STEP).toFixed(2))));
  }
}
