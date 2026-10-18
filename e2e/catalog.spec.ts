import { test, expect } from '@playwright/test';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { SPIKE_REGISTRY } from '../projects/demo/src/app/spikes/spike-registry';

/** Entries the catalog shows by default. The count follows the registry, so the test holds as spikes are added. */
const VISIBLE_BY_DEFAULT = SPIKE_REGISTRY.filter(
  (entry) => entry.status !== 'failed' && entry.status !== 'inconclusive',
);

test.describe('spike catalog', () => {
  test('shows the filter unchecked and one card per visible entry', async ({ page }) => {
    await page.goto('/catalog');

    await expect(page.getByRole('heading', { name: 'Spike catalog' })).toBeVisible();
    await expect(page.getByTestId('show-hidden')).not.toBeChecked();

    if (VISIBLE_BY_DEFAULT.length === 0) {
      await expect(page.getByTestId('catalog-empty')).toBeVisible();
      return;
    }
    await expect(page.getByTestId('spike-card')).toHaveCount(VISIBLE_BY_DEFAULT.length);
  });

  test('shows the thumbnail only when its file exists, otherwise the placeholder', async ({
    page,
  }) => {
    await page.goto('/catalog');

    const cards = page.getByTestId('spike-card');
    await expect(cards).toHaveCount(VISIBLE_BY_DEFAULT.length);
    const all = await cards.all();
    for (const [index, entry] of VISIBLE_BY_DEFAULT.entries()) {
      const hasFile =
        entry.thumbnail !== null && existsSync(join('projects', 'demo', 'public', entry.thumbnail));
      const card = all[index];
      await expect(card.locator('img')).toHaveCount(hasFile ? 1 : 0);
      await expect(card.locator('app-spike-placeholder')).toHaveCount(hasFile ? 0 : 1);
    }
  });

  test('is reachable from the home page', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('catalog-link').click();
    await expect(page).toHaveURL(/\/catalog$/);
  });
});
