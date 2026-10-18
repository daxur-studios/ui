import { expect, test, type Page } from '@playwright/test';

const SPIKE_ROUTE = '/spikes/slider-reticle-rail-spike';

async function openSpike(page: Page): Promise<void> {
  await page.goto(SPIKE_ROUTE);
  await expect(page.locator('[data-spike-ready="true"]')).toBeVisible();
}

test.beforeEach(async ({ page }) => openSpike(page));

test('renders an accessible dual-rail reticle slider with bipolar origin and caliper brackets', async ({
  page,
}) => {
  const slider = page.getByRole('slider', { name: 'Bipolar Audio Gain' });
  const host = page.locator('ui--slider-reticle').first();
  await expect(host).toHaveCSS('display', 'block');
  await expect(slider).toHaveAttribute('aria-valuemin', '-24');
  await expect(slider).toHaveAttribute('aria-valuemax', '24');
  await expect(slider).toHaveAttribute('aria-valuenow', '4');
  await expect(slider).toHaveAttribute('aria-valuetext', '4 dB');
  await expect(slider.locator('.origin-tick')).toBeAttached();
  await expect(slider.locator('.caliper-bracket')).toHaveCount(2);
  await expect(slider.locator('.thumb-diamond')).toBeVisible();

  const before = await host.boundingBox();
  await slider.press('End');
  await expect(slider).toHaveAttribute('aria-valuenow', '24');
  expect(await host.boundingBox()).toEqual(before);
  await expect(page.getByTestId('commit-count')).toHaveText('1');
});

test('navigates bipolar range across zero without stepping noise', async ({ page }) => {
  const slider = page.getByRole('slider', { name: 'Bipolar Audio Gain' });
  await slider.press('Home');
  await expect(slider).toHaveAttribute('aria-valuenow', '-24');
  await expect(page.getByTestId('live-value')).toHaveText('-24');

  await slider.press('Shift+ArrowRight');
  await expect(slider).toHaveAttribute('aria-valuenow', '-14');

  await slider.press('Shift+ArrowRight');
  await expect(slider).toHaveAttribute('aria-valuenow', '-4');

  await slider.press('ArrowRight');
  await slider.press('ArrowRight');
  await slider.press('ArrowRight');
  await slider.press('ArrowRight');
  await expect(slider).toHaveAttribute('aria-valuenow', '0');
});

test('reactive form: handles dirty, touched, disable, and reset states', async ({ page }) => {
  const elevation = page.getByRole('slider', { name: 'Antenna Elevation' });
  await expect(page.getByTestId('form-value')).toHaveText('20');
  await expect(page.getByTestId('form-dirty')).toHaveText('false');
  await expect(page.getByTestId('form-touched')).toHaveText('false');

  await elevation.press('ArrowRight');
  await expect(elevation).toHaveAttribute('aria-valuenow', '21');
  await expect(page.getByTestId('form-value')).toHaveText('21');
  await expect(page.getByTestId('form-dirty')).toHaveText('true');

  await page.keyboard.press('Tab');
  await expect(page.getByTestId('form-touched')).toHaveText('true');

  const toggle = page.getByTestId('form-toggle-disabled');
  await toggle.click();
  await expect(elevation).toHaveAttribute('tabindex', '-1');
  await expect(elevation).toHaveAttribute('aria-disabled', 'true');

  await toggle.click();
  await expect(elevation).toHaveAttribute('tabindex', '0');
  await expect(elevation).toHaveAttribute('aria-disabled', 'false');

  await page.getByTestId('form-reset').click();
  await expect(elevation).toHaveAttribute('aria-valuenow', '0');
  await expect(page.getByTestId('form-value')).toHaveText('null');
  await expect(page.getByTestId('form-dirty')).toHaveText('false');
});
