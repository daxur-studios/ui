import type { IReviewReport } from './review-report';

/** One compared number: a baseline value, the current value and their difference. */
export interface IDeltaRow {
  readonly width: number;
  readonly name: string;
  readonly baseline: number;
  readonly current: number;
  readonly delta: number;
  /** True when the change is big enough to look at (more than 0.02 and 10% of the baseline). */
  readonly notable: boolean;
}

/** Changes smaller than this are noise. */
export const NOTABLE_ABSOLUTE = 0.02;
/** Changes smaller than this share of the baseline are noise. */
export const NOTABLE_RELATIVE = 0.1;

function row(width: number, name: string, baseline: number, current: number): IDeltaRow {
  const delta = current - baseline;
  const notable =
    Math.abs(delta) > NOTABLE_ABSOLUTE && Math.abs(delta) > Math.abs(baseline) * NOTABLE_RELATIVE;
  return { width, name, baseline, current, delta, notable };
}

/**
 * Compares a report with a saved baseline: the median of every measurement, the seed variety, and
 * the worst overshoot and keep-out depth, at each width both reports share.
 */
export function deltaRows(current: IReviewReport, baseline: IReviewReport): IDeltaRow[] {
  const rows: IDeltaRow[] = [];
  for (const now of current.summary) {
    const before = baseline.summary.find((s) => s.width === now.width);
    if (!before) continue;
    for (const [name, spread] of Object.entries(now.spread)) {
      const old = before.spread[name as keyof typeof before.spread];
      if (old) rows.push(row(now.width, `${name} (median)`, old.median, spread.median));
    }
    rows.push(row(now.width, 'variety (mean)', before.variety.mean, now.variety.mean));
    rows.push(
      row(
        now.width,
        'variety (min pair)',
        before.variety.min?.value ?? 0,
        now.variety.min?.value ?? 0,
      ),
    );
    for (const key of ['overshootPx', 'keepOutDepthPx'] as const) {
      const worst = (r: IReviewReport) =>
        Math.max(
          0,
          ...r.cells.filter((c) => c.width === now.width).map((c) => c.metrics[key] ?? 0),
        );
      rows.push(row(now.width, `${key} (max)`, worst(baseline), worst(current)));
    }
  }
  return rows;
}

/** Markdown for the delta rows; only notable rows get a line, so an unchanged run is short. */
export function deltaMarkdown(rows: readonly IDeltaRow[]): string {
  const notable = rows.filter((r) => r.notable);
  const lines = ['## Changes since baseline', ''];
  if (notable.length === 0) {
    lines.push(`None (${rows.length} numbers compared).`);
    return lines.join('\n');
  }
  lines.push('| width | metric | baseline | now | change |', '| --- | --- | --- | --- | --- |');
  const f = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(3));
  for (const r of notable) {
    const sign = r.delta > 0 ? '+' : '';
    lines.push(
      `| ${r.width} | ${r.name} | ${f(r.baseline)} | ${f(r.current)} | ${sign}${f(r.delta)} |`,
    );
  }
  return lines.join('\n');
}
