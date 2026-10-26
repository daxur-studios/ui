import { expect, test, type Page } from '@playwright/test';

const SPIKE_ROUTE = '/spikes/cybersigil-shape-lab-spike';

/** Light position the page starts with, before any pointer has moved over a canvas. */
const DEFAULT_LIGHT = '120, 40';

/** Thorn count the slider can reach, matching the library's maximum. */
const MAX_THORN_COUNT = '6';

async function openSpike(page: Page): Promise<void> {
  await page.goto(SPIKE_ROUTE);
  await expect(page.locator('[data-spike-ready="true"]')).toBeVisible();
}

test.beforeEach(async ({ page }) => openSpike(page));

test('renders three full archetypes and three modular joins with real path data', async ({
  page,
}) => {
  await expect(page.getByTestId('sigil-canvas')).toHaveCount(6);

  for (const archetype of ['winged-star', 'filigree-crest', 'tendril-s-curve']) {
    const silhouette = page.locator(`[data-archetype="${archetype}"] .silhouette`);
    await expect(silhouette).toHaveAttribute('d', /^M[-\d.]+ [-\d.]+L/);
  }

  const joinWidths = await page
    .locator('[data-archetype="modular-ui-join"]')
    .evaluateAll((nodes) => nodes.map((node) => node.getAttribute('data-width')));
  expect(joinWidths).toEqual(['240', '420', '600']);
});

test('applies the mercury liquid-chrome filter by default and the flat preset removes it', async ({
  page,
}) => {
  const silhouette = page.locator('[data-archetype="winged-star"] .silhouette');
  await expect(silhouette).toHaveAttribute('filter', 'url(#sigil-liquid-chrome)');

  await page.getByTestId('material-flat').click();
  await expect(page.getByTestId('active-material')).toHaveText('flat');
  await expect(silhouette).not.toHaveAttribute('filter', /.*/);
});

test('switching metals changes the palette scope and the chrome toggle restores the last one', async ({
  page,
}) => {
  await page.getByTestId('material-bronze').click();
  await expect(page.locator('svg[data-material]')).toHaveAttribute('data-material', 'bronze');

  await page.getByTestId('chrome-toggle').click();
  await expect(page.getByTestId('active-material')).toHaveText('flat');

  await page.getByTestId('chrome-toggle').click();
  await expect(page.getByTestId('active-material')).toHaveText('bronze');
});

test('a geometry slider reshapes the winged star', async ({ page }) => {
  const silhouette = page.locator('[data-archetype="winged-star"] .silhouette');
  const before = await silhouette.getAttribute('d');

  const curvature = page.getByRole('slider', { name: 'Curvature' });
  await curvature.press('End');
  await expect(curvature).toHaveAttribute('aria-valuenow', '100');
  await expect.poll(() => silhouette.getAttribute('d')).not.toBe(before);
});

test('the seed changes the procedural tendril and restores it when reset', async ({ page }) => {
  await page.getByTestId('strategy-tendril').selectOption('seeded-growth');
  const silhouette = page.locator('[data-archetype="tendril-s-curve"] .silhouette');
  const initial = await silhouette.getAttribute('d');
  const seed = page.getByRole('slider', { name: 'Seed (Seeded Growth tendril)' });
  await seed.press('ArrowRight');
  await expect.poll(() => silhouette.getAttribute('d')).not.toBe(initial);
  await seed.press('ArrowLeft');
  await expect.poll(() => silhouette.getAttribute('d')).toBe(initial);
});

test('the thorn count slider is bounded to the maximum thorn count', async ({ page }) => {
  const thorns = page.getByRole('slider', { name: 'Thorn count' });
  await thorns.press('End');
  await expect(page.getByTestId('thorn-count')).toHaveText(MAX_THORN_COUNT);
  await thorns.press('ArrowRight');
  await expect(thorns).toHaveAttribute('aria-valuenow', MAX_THORN_COUNT);
});

test('pointer glints move the light over a canvas', async ({ page }) => {
  await expect(page.getByTestId('light-position')).toHaveText(DEFAULT_LIGHT);

  const canvas = page.locator('[data-archetype="winged-star"]');
  const box = await canvas.boundingBox();
  if (!box) throw new Error('the winged star canvas has no box');
  await page.mouse.move(box.x + box.width * 0.25, box.y + box.height * 0.25);

  await expect(page.getByTestId('light-position')).not.toHaveText(DEFAULT_LIGHT);
});

test('shows the concept reference strip with three images when toggled', async ({ page }) => {
  await expect(page.getByTestId('reference-strip')).toHaveCount(0);
  await page.getByTestId('reference-toggle').click();
  await expect(page.getByTestId('reference-strip').locator('img')).toHaveCount(3);
});

test.describe('reduced motion', () => {
  test.use({ reducedMotion: 'reduce' });

  test('holds the light still so thumbnail captures stay deterministic', async ({ page }) => {
    await openSpike(page);
    const canvas = page.locator('[data-archetype="winged-star"]');
    const box = await canvas.boundingBox();
    if (!box) throw new Error('the winged star canvas has no box');
    await page.mouse.move(box.x + box.width * 0.25, box.y + box.height * 0.25);

    await expect(page.getByTestId('light-position')).toHaveText(DEFAULT_LIGHT);
  });
});
