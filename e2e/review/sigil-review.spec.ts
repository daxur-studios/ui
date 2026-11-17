import { expect, test } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { REVIEW_SUBJECTS } from '../../projects/demo/src/app/fixtures/sigil-review/review-subjects';
import {
  isInvariantFlag,
  type IReviewReport,
} from '../../projects/demo/src/app/fixtures/sigil-review/review-report';

/** Root of the regenerable review output (git-ignored). */
const OUTPUT_DIR = join('ignore', 'sigil-review');
/** Viewport wide enough for the widest tube window cell beside its neighbours. */
const VIEWPORT = { width: 1400, height: 900 };

const env = (name: string): string => process.env[`SIGIL_REVIEW_${name}`] ?? '';
const requested = env('SUBJECTS');
const ids =
  requested === '' || requested === 'all' ? REVIEW_SUBJECTS.map((s) => s.id) : requested.split(',');

test.use({ viewport: VIEWPORT });

for (const id of ids) {
  test(`review ${id}`, async ({ page }) => {
    const query = new URLSearchParams({ subject: id });
    if (env('SEEDS')) query.set('seeds', env('SEEDS'));
    if (env('WIDTHS')) query.set('widths', env('WIDTHS'));
    if (env('DRESSED') === '1') query.set('dressed', '1');

    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));

    await page.goto(`/fixtures/sigil-review?${query}`);
    await page.waitForSelector('[data-review-ready]', { timeout: 30_000 });
    await page.evaluate(() =>
      Promise.all([...document.images].map((i) => i.decode().catch(() => undefined))),
    );

    const report = (await page.evaluate(() => window.__sigilReview)) as IReviewReport;
    const dir = join(OUTPUT_DIR, id);
    mkdirSync(dir, { recursive: true });
    await page.screenshot({ path: join(dir, 'sheet.png'), fullPage: true });
    const full = { ...report, generatedAt: new Date().toISOString() };
    writeFileSync(join(dir, 'report.json'), JSON.stringify(full, null, 2));
    writeFileSync(join(dir, 'report.md'), reportMarkdown(full));
    if (env('SAVE_BASELINE') === '1') {
      writeFileSync(join(dir, 'baseline.json'), JSON.stringify(full, null, 2));
    }
    console.log(`\n${reportMarkdown(full)}\nwritten: ${join(dir, 'report.md')}`);

    expect(errors, 'no console errors').toEqual([]);
    const failures = report.cells.filter((c) => c.flags.some(isInvariantFlag));
    expect(
      failures.map(
        (c) => `seed ${c.seed} @${c.width}: ${c.flags.filter(isInvariantFlag).join(', ')}`,
      ),
      'hard invariants',
    ).toEqual([]);
  });
}

/** Number formatted for a table cell. */
function num(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(3);
}

/** Markdown report: summary per width, then every flagged cell. */
function reportMarkdown(r: IReviewReport & { generatedAt: string }): string {
  const lines = [
    `# ${r.subject}`,
    '',
    `Generated ${r.generatedAt}. Seeds: ${r.seeds.join(', ')}.`,
    '',
  ];
  lines.push(`Resize stable: ${r.resizeStable ?? 'n/a (motif)'}`, '');
  for (const s of r.summary) {
    lines.push(
      `## ${s.width} px`,
      '',
      '| metric | min | median | max |',
      '| --- | --- | --- | --- |',
    );
    for (const [name, v] of Object.entries(s.spread)) {
      lines.push(`| ${name} | ${num(v.min)} | ${num(v.median)} | ${num(v.max)} |`);
    }
    const min = s.variety.min
      ? `${num(s.variety.min.value)} (seeds ${s.variety.min.a},${s.variety.min.b})`
      : 'n/a';
    lines.push('', `Variety: mean ${num(s.variety.mean)}, min pair ${min}.`);
    if (s.invariantFailures.length)
      lines.push(`Invariant failures: seeds ${s.invariantFailures.join(', ')}.`);
    lines.push('');
  }
  const flagged = r.cells.filter((c) => c.flags.length > 0);
  lines.push('## Flagged cells', '');
  if (flagged.length === 0) lines.push('None.');
  for (const c of flagged) lines.push(`- seed ${c.seed} @${c.width}: ${c.flags.join(', ')}`);
  return `${lines.join('\n')}\n`;
}
