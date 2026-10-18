import { expect, test, type Page } from '@playwright/test';

const SPIKE_ROUTE = '/spikes/slider-segmented-hud-spike';

async function openSpike(page: Page): Promise<void> {
  await page.goto(SPIKE_ROUTE);
  await expect(page.locator('[data-spike-ready="true"]')).toBeVisible();
}

test.beforeEach(async ({ page }) => openSpike(page));

test('renders an accessible segmented SVG slider and illuminates cells without layout shift', async ({
  page,
}) => {
  const slider = page.getByRole('slider', { name: 'Battery Level' });
  const host = page.locator('ui--slider-segmented').first();
  await expect(host).toHaveCSS('display', 'block');
  await expect(slider).toHaveAttribute('aria-valuemin', '0');
  await expect(slider).toHaveAttribute('aria-valuemax', '100');
  await expect(slider).toHaveAttribute('aria-valuenow', '70');
  await expect(slider).toHaveAttribute('aria-valuetext', '70%');
  await expect(slider.locator('svg')).toHaveAttribute('aria-hidden', 'true');

  const activeCells = slider.locator('.cell.active');
  await expect(activeCells.first()).toBeVisible();
  const initialActiveCount = await activeCells.count();
  expect(initialActiveCount).toBeGreaterThan(5);

  const before = await host.boundingBox();
  await slider.press('End');
  await expect(slider).toHaveAttribute('aria-valuenow', '100');
  const fullActiveCount = await slider.locator('.cell.active').count();
  expect(fullActiveCount).toBeGreaterThan(initialActiveCount);
  expect(await host.boundingBox()).toEqual(before);
  await expect(page.getByTestId('commit-count')).toHaveText('1');
});

test('supports arrows, coarse arrows, and endpoints with one commit per change', async ({
  page,
}) => {
  const slider = page.getByRole('slider', { name: 'Battery Level' });
  await slider.press('ArrowRight');
  await expect(slider).toHaveAttribute('aria-valuenow', '71');
  await expect(page.getByTestId('live-value')).toHaveText('71');
  await expect(page.getByTestId('committed-value')).toHaveText('71');
  await expect(page.getByTestId('commit-count')).toHaveText('1');

  await slider.press('Shift+ArrowRight');
  await expect(slider).toHaveAttribute('aria-valuenow', '81');
  await expect(page.getByTestId('commit-count')).toHaveText('2');

  await slider.press('Home');
  await expect(slider).toHaveAttribute('aria-valuenow', '0');
  await expect(page.getByTestId('commit-count')).toHaveText('3');
});

test('reactive form: handles dirty, touched, disable, and reset states', async ({ page }) => {
  const reactor = page.getByRole('slider', { name: 'Reactor Output' });
  await expect(page.getByTestId('form-value')).toHaveText('50');
  await expect(page.getByTestId('form-dirty')).toHaveText('false');
  await expect(page.getByTestId('form-touched')).toHaveText('false');

  await reactor.press('ArrowRight');
  await expect(reactor).toHaveAttribute('aria-valuenow', '51');
  await expect(page.getByTestId('form-value')).toHaveText('51');
  await expect(page.getByTestId('form-dirty')).toHaveText('true');

  await page.keyboard.press('Tab');
  await expect(page.getByTestId('form-touched')).toHaveText('true');

  const toggle = page.getByTestId('form-toggle-disabled');
  await toggle.click();
  await expect(reactor).toHaveAttribute('tabindex', '-1');
  await expect(reactor).toHaveAttribute('aria-disabled', 'true');

  await toggle.click();
  await expect(reactor).toHaveAttribute('tabindex', '0');
  await expect(reactor).toHaveAttribute('aria-disabled', 'false');

  await page.getByTestId('form-reset').click();
  await expect(reactor).toHaveAttribute('aria-valuenow', '0');
  await expect(page.getByTestId('form-value')).toHaveText('null');
  await expect(page.getByTestId('form-dirty')).toHaveText('false');
});
