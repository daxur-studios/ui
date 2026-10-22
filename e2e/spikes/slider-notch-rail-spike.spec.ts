import { expect, test, type Page } from '@playwright/test';

const SPIKE_ROUTE = '/spikes/slider-notch-rail-spike';

async function openSpike(page: Page): Promise<void> {
  await page.goto(SPIKE_ROUTE);
  await expect(page.locator('[data-spike-ready="true"]')).toBeVisible();
}

test.beforeEach(async ({ page }) => openSpike(page));

test('renders the recipe-only notch look with an anchored readout and no layout shift', async ({
  page,
}) => {
  const slider = page.getByRole('slider', { name: 'Thrust' });
  await expect(slider).toHaveClass(/track--notch/);
  await expect(slider).toHaveClass(/track--wrapped/);
  await expect(slider).toHaveAttribute('aria-valuemin', '0');
  await expect(slider).toHaveAttribute('aria-valuemax', '100');
  await expect(slider).toHaveAttribute('aria-valuenow', '35');
  await expect(slider).toHaveAttribute('aria-valuetext', '35%');
  await expect(slider.locator('svg')).toHaveAttribute('aria-hidden', 'true');

  const readout = slider.locator('.notch-readout');
  await expect(readout).toHaveText('35%');
  await expect(slider.locator('.notch-progress')).toBeAttached();

  const before = await slider.boundingBox();
  await slider.press('End');
  await expect(slider).toHaveAttribute('aria-valuenow', '100');
  await expect(readout).toHaveText('100%');
  expect(await slider.boundingBox()).toEqual(before);
  await expect(page.getByTestId('commit-count')).toHaveText('1');
  await expect(page.getByTestId('committed-value')).toHaveText('100');
});

test('drops the wrapper for a trim slider without changing behaviour', async ({ page }) => {
  const trim = page.getByRole('slider', { name: 'Trim' });
  await expect(trim).toHaveClass(/track--notch/);
  await expect(trim).not.toHaveClass(/track--wrapped/);
  await expect(trim).toHaveAttribute('aria-valuetext', '6°');
});

test('reactive form: handles dirty, touched, disable, and reset states', async ({ page }) => {
  const navigation = page.getByRole('slider', { name: 'Navigation' });
  await expect(page.getByTestId('form-value')).toHaveText('40');
  await expect(page.getByTestId('form-dirty')).toHaveText('false');

  await navigation.press('ArrowRight');
  await expect(navigation).toHaveAttribute('aria-valuenow', '41');
  await expect(page.getByTestId('form-value')).toHaveText('41');
  await expect(page.getByTestId('form-dirty')).toHaveText('true');

  await page.keyboard.press('Tab');
  await expect(page.getByTestId('form-touched')).toHaveText('true');

  await page.getByTestId('form-toggle-disabled').click();
  await expect(navigation).toHaveAttribute('tabindex', '-1');
  await page.getByTestId('form-toggle-disabled').click();
  await expect(navigation).toHaveAttribute('tabindex', '0');

  await page.getByTestId('form-reset').click();
  await expect(navigation).toHaveAttribute('aria-valuenow', '0');
  await expect(page.getByTestId('form-value')).toHaveText('null');
  await expect(page.getByTestId('form-dirty')).toHaveText('false');
});
