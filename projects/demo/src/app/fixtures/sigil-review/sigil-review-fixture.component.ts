import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ChromeKitWindowComponent } from '../../spikes/cybersigil-chrome-kit-spike/chrome-kit-window.component';
import { variety, measureCell, summariseCells } from './review-metrics';
import { rasteriseGeometry } from './review-rasterise';
import { flagsFor, isInvariantFlag, type ICellReport, type IReviewReport } from './review-report';
import { parseSeeds, parseWidths } from './review-params';
import type { IReviewGrid } from './review-grid';
import { findReviewSubject, REVIEW_SUBJECTS } from './review-subjects';
import type { IReviewGeometry } from './review-types';

/** Folder of the concept art, served from `public/`. */
const CONCEPT_DIR = '/concept/cybersigillism/';

/** One cell as drawn: geometry plus where it sits. */
interface IDrawnCell {
  readonly seed: number;
  readonly width: number;
  readonly geometry: IReviewGeometry;
}

/** Window property the harness reads, so Playwright and agents get numbers without scraping. */
declare global {
  interface Window {
    __sigilReview?: IReviewReport;
  }
}

/**
 * Sigil review page: renders one subject across seeds and widths beside its concept references,
 * measures every cell from a rasterised silhouette, and publishes the result on
 * `window.__sigilReview`. Driven by query parameters (`subject`, `seeds`, `widths`, `dressed`).
 * Not a spike: it is a fixture and never appears in the catalog.
 */
@Component({
  selector: 'demo-sigil-review-fixture',
  imports: [ChromeKitWindowComponent],
  templateUrl: './sigil-review-fixture.component.html',
  styleUrl: './sigil-review-fixture.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SigilReviewFixtureComponent {
  private readonly params = inject(ActivatedRoute).snapshot.queryParamMap;

  protected readonly subject = findReviewSubject(this.params.get('subject') ?? '');
  protected readonly knownIds = REVIEW_SUBJECTS.map((s) => s.id).join(', ');
  protected readonly seeds = parseSeeds(this.params.get('seeds'));
  protected readonly dressed = this.params.get('dressed') === '1' && !!this.subject?.dressedVariant;
  protected readonly widths = (() => {
    const asked = parseWidths(this.params.get('widths'));
    return asked.length > 0 ? asked : [...(this.subject?.widths ?? [])];
  })();

  /** Geometry for every cell, grouped by width. */
  protected readonly groups = this.widths.map((width) => ({
    width,
    cells: this.seeds.map<IDrawnCell>((seed) => ({
      seed,
      width,
      geometry: this.subject!.geometry(seed, width),
    })),
  }));

  protected readonly report = signal<IReviewReport | null>(null);
  protected readonly ready = computed(() => this.report()?.ready === true);

  constructor() {
    if (this.subject) afterNextRender(() => this.measureAll());
  }

  /** Flags for one cell, or an empty list before measuring finishes. */
  protected flagsOf(seed: number, width: number): readonly string[] {
    return this.report()?.cells.find((c) => c.seed === seed && c.width === width)?.flags ?? [];
  }

  protected conceptSrc(file: string): string {
    return `${CONCEPT_DIR}${file}`;
  }

  protected inkClass(strokeWidth: number | undefined): string {
    return strokeWidth === undefined ? 'fill' : 'stroke';
  }

  /** Rasterises and measures every cell, then publishes the report. */
  private measureAll(): void {
    const subject = this.subject!;
    const cells: ICellReport[] = [];
    const summary: IReviewReport['summary'][number][] = [];
    for (const group of this.groups) {
      const grids: IReviewGrid[] = [];
      const metrics = group.cells.map((cell) => {
        const raster = rasteriseGeometry(cell.geometry);
        grids.push(raster.ink);
        const m = measureCell(raster.ink, raster.keepOut);
        cells.push({
          seed: cell.seed,
          width: cell.width,
          metrics: m,
          flags: flagsFor(m, subject),
        });
        return m;
      });
      const failing = cells
        .filter((c) => c.width === group.width && c.flags.some(isInvariantFlag))
        .map((c) => c.seed);
      summary.push({
        width: group.width,
        spread: summariseCells(metrics),
        variety: variety(grids, subject.kind === 'frame'),
        invariantFailures: failing,
      });
    }
    const report: IReviewReport = {
      subject: subject.id,
      seeds: this.seeds,
      widths: this.widths,
      cells,
      summary,
      resizeStable:
        subject.kind === 'frame' ? summary.every((s) => s.invariantFailures.length === 0) : null,
      ready: true,
    };
    window.__sigilReview = report;
    this.report.set(report);
  }
}
