import { test, expect } from '@playwright/test';

/** The shell mounts the picker in a fixed top-corner overlay on every page. */
test.describe('theme picker', () => {
  test('shows on a spike page and applies scheme, mode and density to the document', async ({
    page,
  }) => {
    await page.goto('/spikes/slider-svg-spike');
    await expect(page.getByTestId('theme-picker')).toBeVisible();

    await page.getByTestId('theme-scheme-blue').click();
    await page.getByTestId('theme-mode-light').click();
    await page.getByTestId('theme-density-compact').click();

    const html = page.locator('html');
    await expect(html).toHaveAttribute('data-ui-scheme', 'blue');
    await expect(html).toHaveAttribute('data-ui-mode', 'light');
    await expect(html).toHaveAttribute('data-ui-density', 'compact');

    const accent = await page.evaluate(() =>
      getComputedStyle(document.documentElement).getPropertyValue('--ui-accent').trim(),
    );
    expect(accent).not.toBe('');
  });

  test('marks the selected option as pressed', async ({ page }) => {
    await page.goto('/');

    const orange = page.getByTestId('theme-scheme-orange');
    await orange.click();
    await expect(orange).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByTestId('theme-scheme-hud')).toHaveAttribute('aria-pressed', 'false');
  });

  test('persists the theme across navigation', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('theme-scheme-orange').click();
    await page.getByTestId('theme-density-spacious').click();

    await page.goto('/catalog');

    await expect(page.locator('html')).toHaveAttribute('data-ui-scheme', 'orange');
    await expect(page.locator('html')).toHaveAttribute('data-ui-density', 'spacious');
  });
});
