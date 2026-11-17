import { describe, expect, it } from 'vitest';
import { deltaMarkdown, deltaRows } from './review-delta';
import type { IReviewReport } from './review-report';

const spread = (median: number) => ({ min: median, median, max: median });

function report(coverage: number, mean: number, overshoot: number): IReviewReport {
  return {
    subject: 's',
    seeds: [1],
    widths: [100],
    cells: [
      {
        seed: 1,
        width: 100,
        flags: [],
        metrics: { overshootPx: overshoot, keepOutDepthPx: 0 },
      } as unknown as IReviewReport['cells'][number],
    ],
    summary: [
      {
        width: 100,
        spread: {
          coverage: spread(coverage),
        } as unknown as IReviewReport['summary'][number]['spread'],
        variety: { mean, min: { value: mean, a: 0, b: 1 } },
        invariantFailures: [],
      },
    ],
    resizeStable: null,
    ready: true,
  };
}

describe('review delta', () => {
  it('reports nothing for identical reports', () => {
    const rows = deltaRows(report(0.4, 0.5, 0), report(0.4, 0.5, 0));
    expect(rows.some((r) => r.notable)).toBe(false);
    expect(deltaMarkdown(rows)).toContain('None');
  });

  it('lists changes that are both large and more than 10%', () => {
    const rows = deltaRows(report(0.6, 0.5, 8), report(0.4, 0.5, 0));
    const names = rows.filter((r) => r.notable).map((r) => r.name);
    expect(names).toContain('coverage (median)');
    expect(names).toContain('overshootPx (max)');
    expect(names).not.toContain('variety (mean)');
    expect(deltaMarkdown(rows)).toContain('| 100 | coverage (median) | 0.400 | 0.600 | +0.200 |');
  });

  it('ignores widths missing from the baseline', () => {
    const current = report(0.4, 0.5, 0);
    const other = { ...report(0.4, 0.5, 0), summary: [{ ...current.summary[0], width: 200 }] };
    expect(deltaRows(current, other)).toEqual([]);
  });
});
