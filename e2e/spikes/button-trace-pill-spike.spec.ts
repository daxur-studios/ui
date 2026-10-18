import { expect, test, type Page } from '@playwright/test';

const SPIKE_ROUTE = '/spikes/button-trace-pill-spike';

async function openSpike(page: Page): Promise<void> {
  await page.goto(SPIKE_ROUTE);
  await expect(page.locator('[data-spike-ready="true"]')).toBeVisible();
}

test.beforeEach(async ({ page }) => openSpike(page));

test('renders accessible industrial trace buttons with LED status pip and trace rail', async ({
  page,
}) => {
  const actionBtn = page.getByRole('button', { name: 'Send Telemetry' });
  const toggleBtn = page.getByRole('button', { name: 'Data Stream' });
  const disabledBtn = page.getByRole('button', { name: 'Comm Link Lost' });

  await expect(actionBtn).toBeVisible();
  await expect(actionBtn.locator('.led-pip')).toBeVisible();
  await expect(actionBtn.locator('.bottom-trace')).toBeVisible();

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
  const formBtn = page.getByRole('button', { name: 'Uplink Channel' });
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
