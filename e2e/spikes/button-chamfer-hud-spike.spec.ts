import { expect, test, type Page } from '@playwright/test';

const SPIKE_ROUTE = '/spikes/button-chamfer-hud-spike';

async function openSpike(page: Page): Promise<void> {
  await page.goto(SPIKE_ROUTE);
  await expect(page.locator('[data-spike-ready="true"]')).toBeVisible();
}

test.beforeEach(async ({ page }) => openSpike(page));

test('renders accessible chamfered SVG buttons with action, toggle, and disabled modes', async ({
  page,
}) => {
  const actionBtn = page.getByRole('button', { name: 'Execute Pulse' });
  const toggleBtn = page.getByRole('button', { name: 'Latching Mode' });
  const disabledBtn = page.getByRole('button', { name: 'Offline System' });

  await expect(actionBtn).toBeVisible();
  await expect(actionBtn).not.toHaveAttribute('aria-pressed');
  await expect(actionBtn.locator('.frame-polygon')).toBeVisible();
  await expect(actionBtn.locator('.accent-cut')).toBeVisible();

  await expect(toggleBtn).toHaveAttribute('aria-pressed', 'false');
  await expect(disabledBtn).toHaveAttribute('aria-disabled', 'true');
  await expect(disabledBtn).toHaveAttribute('tabindex', '-1');

  // Momentary action click
  await actionBtn.click();
  await expect(page.getByTestId('trigger-count')).toHaveText('1');

  // Keyboard Space activation
  await actionBtn.focus();
  await page.keyboard.press('Space');
  await expect(page.getByTestId('trigger-count')).toHaveText('2');

  // Toggle button activation
  await toggleBtn.click();
  await expect(toggleBtn).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByTestId('toggle-value')).toHaveText('true');
});

test('reactive form: handles toggle, dirty, touched, disable, and reset states', async ({
  page,
}) => {
  const formBtn = page.getByRole('button', { name: 'Reactor Interlock' });
  await expect(page.getByTestId('form-value')).toHaveText('false');
  await expect(page.getByTestId('form-dirty')).toHaveText('false');
  await expect(page.getByTestId('form-touched')).toHaveText('false');

  await formBtn.click();
  await expect(formBtn).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByTestId('form-value')).toHaveText('true');
  await expect(page.getByTestId('form-dirty')).toHaveText('true');

  await formBtn.focus();
  await page.keyboard.press('Tab');
  await expect(page.getByTestId('form-touched')).toHaveText('true');

  const toggleDisabled = page.getByTestId('form-toggle-disabled');
  await toggleDisabled.click();
  await expect(formBtn).toHaveAttribute('tabindex', '-1');
  await expect(formBtn).toHaveAttribute('aria-disabled', 'true');

  await toggleDisabled.click();
  await expect(formBtn).toHaveAttribute('tabindex', '0');
  await expect(formBtn).toHaveAttribute('aria-disabled', 'false');

  await page.getByTestId('form-reset').click();
  await expect(formBtn).toHaveAttribute('aria-pressed', 'false');
  await expect(page.getByTestId('form-value')).toHaveText('null');
  await expect(page.getByTestId('form-dirty')).toHaveText('false');
});
