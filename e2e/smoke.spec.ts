import { test, expect } from '@playwright/test';

test.describe('demo harness smoke', () => {
  test('loads the home page and renders the library version', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Demo harness' })).toBeVisible();
    await expect(page.getByTestId('harness-ready')).toHaveText('Library version 0.0.1');
  });
});
