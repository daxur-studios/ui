import { expect, test, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';

/** Exact public route under test, shared by all behavioral assertions. */
const SPIKE_ROUTE = '/spikes/slider-svg-spike';
/** Width used to verify responsive geometry without introducing a new page layout. */
const COMPACT_WIDTH = 320;

/** Waits for actual SVG measurement as well as the harness's initial rendered frame. */
async function openSpike(page: Page): Promise<void> {
  await page.goto(SPIKE_ROUTE);
  await expect(page.locator('[data-spike-ready="true"]')).toBeVisible();
  await expect
    .poll(async () =>
      page.getByRole('slider', { name: 'Field of View' }).locator('svg').getAttribute('viewBox'),
    )
    .not.toBe('0 0 0 40');
}

test.beforeEach(async ({ page }) => openSpike(page));

test('renders an accessible measured SVG and changes its path without layout shift', async ({
  page,
}) => {
  const slider = page.getByRole('slider', { name: 'Field of View' });
  const host = page.locator('ui--slider').first();
  await expect(host).toHaveCSS('display', 'block');
  await expect(slider).toHaveAttribute('aria-valuemin', '30');
  await expect(slider).toHaveAttribute('aria-valuemax', '120');
  await expect(slider).toHaveAttribute('aria-valuenow', '75');
  await expect(slider).toHaveAttribute('aria-valuetext', '75°');
  await expect(slider.locator('svg')).toHaveAttribute('aria-hidden', 'true');
  await expect(slider.locator('svg')).toHaveAttribute('focusable', 'false');
  const before = await host.boundingBox();
  const path = slider.locator('.active');
  const original = await path.getAttribute('d');
  await slider.press('End');
  await expect(path).not.toHaveAttribute('d', original!);
  expect(await host.boundingBox()).toEqual(before);
  await expect(page.getByTestId('commit-count')).toHaveText('1');
});

test('has one tab stop per enabled slider and skips the disabled control', async ({ page }) => {
  const fov = page.getByRole('slider', { name: 'Field of View' });
  const gravity = page.getByRole('slider', { name: 'Gravity Y' });
  await page.keyboard.press('Tab');
  await expect(fov).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(gravity).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(gravity).not.toBeFocused();
  await expect(page.getByRole('slider', { name: 'Disabled' })).not.toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(gravity).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(fov).toBeFocused();
  await expect(page.locator('ui--slider [tabindex="0"]')).toHaveCount(2);
});

test('supports arrows, coarse arrows, pages and endpoints with one commit per change', async ({
  page,
}) => {
  const slider = page.getByRole('slider', { name: 'Field of View' });
  const sequence: readonly [string, number][] = [
    ['ArrowRight', 76],
    ['Shift+ArrowRight', 86],
    ['ArrowUp', 87],
    ['Shift+ArrowUp', 97],
    ['ArrowLeft', 96],
    ['Shift+ArrowLeft', 86],
    ['ArrowDown', 85],
    ['Shift+ArrowDown', 75],
    ['PageUp', 84],
    ['PageDown', 75],
    ['Home', 30],
    ['End', 120],
  ];
  let commits = 0;
  for (const [key, value] of sequence) {
    await slider.press(key);
    await expect(slider).toHaveAttribute('aria-valuenow', String(value));
    await expect(page.getByTestId('live-value')).toHaveText(String(value));
    await expect(page.getByTestId('committed-value')).toHaveText(String(value));
    await expect(page.getByTestId('commit-count')).toHaveText(String(++commits));
  }
  await slider.press('End');
  await slider.press('ArrowRight');
  await expect(page.getByTestId('commit-count')).toHaveText(String(commits));
});

test('keeps decimal and negative values stable while navigating', async ({ page }) => {
  const gravity = page.getByRole('slider', { name: 'Gravity Y' });
  await gravity.press('ArrowRight');
  await expect(gravity).toHaveAttribute('aria-valuenow', '-9.7');
  await expect(gravity).toHaveAttribute('aria-valuetext', '-9.7 m/s²');
  await gravity.press('Home');
  await expect(gravity).toHaveAttribute('aria-valuenow', '-20');
  await gravity.press('End');
  await expect(gravity).toHaveAttribute('aria-valuenow', '0');
});

test('captures an out-of-bounds drag, emits live previews and commits exactly once on release', async ({
  page,
}) => {
  const slider = page.getByRole('slider', { name: 'Field of View' });
  const box = (await slider.boundingBox())!;
  const before = await page.locator('ui--slider').first().boundingBox();
  await page.mouse.move(box.x + box.width * 0.2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.8, box.y + box.height / 2, { steps: 12 });
  await expect
    .poll(async () => Number(await page.getByTestId('live-count').textContent()))
    .toBeGreaterThan(5);
  await expect(page.getByTestId('commit-count')).toHaveText('0');
  await page.mouse.move(box.x + box.width + 50, box.y + box.height + 80, { steps: 3 });
  await expect(slider).toHaveAttribute('aria-valuenow', '120');
  await page.mouse.up();
  await expect(page.getByTestId('commit-count')).toHaveText('1');
  await expect(page.getByTestId('committed-value')).toHaveText('120');
  expect(await page.locator('ui--slider').first().boundingBox()).toEqual(before);
  await page.mouse.move(box.x, box.y);
  await expect(slider).toHaveAttribute('aria-valuenow', '120');
  await expect(page.getByTestId('commit-count')).toHaveText('1');
});

test('commits a track click once and suppresses a click on the unchanged endpoint', async ({
  page,
}) => {
  const slider = page.getByRole('slider', { name: 'Field of View' });
  const box = (await slider.boundingBox())!;
  await page.mouse.click(box.x + box.width - 1, box.y + box.height / 2);
  await expect(slider).toHaveAttribute('aria-valuenow', '120');
  await expect(page.getByTestId('commit-count')).toHaveText('1');
  await page.mouse.click(box.x + box.width - 1, box.y + box.height / 2);
  await expect(page.getByTestId('commit-count')).toHaveText('1');
});

test('terminates cancelled capture once and allows the next pointer transaction', async ({
  page,
}) => {
  const slider = page.getByRole('slider', { name: 'Field of View' });
  await slider.evaluate((element) => {
    element.addEventListener('pointerdown', (event) =>
      element.setAttribute('data-pointer-id', String((event as PointerEvent).pointerId)),
    );
  });
  const box = (await slider.boundingBox())!;
  await page.mouse.move(box.x + box.width / 4, box.y + box.height / 2);
  await page.mouse.down();
  const pointerId = Number(await slider.getAttribute('data-pointer-id'));
  await slider.dispatchEvent('pointercancel', { pointerId });
  await expect(page.getByTestId('commit-count')).toHaveText('1');
  await page.mouse.up();
  await expect(page.getByTestId('commit-count')).toHaveText('1');
  await slider.click({ position: { x: box.width - 1, y: box.height / 2 } });
  await expect(page.getByTestId('commit-count')).toHaveText('2');
});

test('disables pointer and keyboard interaction', async ({ page }) => {
  const slider = page.getByRole('slider', { name: 'Disabled' });
  await expect(slider).toHaveAttribute('aria-disabled', 'true');
  await expect(slider).toHaveAttribute('tabindex', '-1');
  await slider.dispatchEvent('keydown', { key: 'End' });
  const box = (await slider.boundingBox())!;
  await page.mouse.click(box.x + box.width - 1, box.y + box.height / 2);
  await expect(slider).toHaveAttribute('aria-valuenow', '50');
});

test('does not commit a drag that returns to its starting value or read layout on pointermove', async ({
  page,
}) => {
  const slider = page.getByRole('slider', { name: 'Field of View' });
  const box = (await slider.boundingBox())!;
  const middle = box.x + box.width / 2;
  await page.mouse.move(middle, box.y + box.height / 2);
  await page.mouse.down();
  await slider.evaluate((element) => {
    const measure = element.getBoundingClientRect.bind(element);
    element.setAttribute('data-layout-reads', '0');
    element.getBoundingClientRect = () => {
      element.setAttribute(
        'data-layout-reads',
        String(Number(element.getAttribute('data-layout-reads')) + 1),
      );
      return measure();
    };
  });
  await page.mouse.move(box.x + box.width * 0.8, box.y + box.height / 2, { steps: 8 });
  await page.mouse.move(middle, box.y + box.height / 2, { steps: 8 });
  await page.mouse.up();
  await expect(slider).toHaveAttribute('aria-valuenow', '75');
  await expect(page.getByTestId('commit-count')).toHaveText('0');
  await expect(slider).toHaveAttribute('data-layout-reads', '0');
});

test('closes an unexpected capture loss once', async ({ page }) => {
  const slider = page.getByRole('slider', { name: 'Field of View' });
  await slider.evaluate((element) => {
    element.addEventListener('pointerdown', (event) =>
      element.setAttribute('data-pointer-id', String((event as PointerEvent).pointerId)),
    );
  });
  const box = (await slider.boundingBox())!;
  await page.mouse.move(box.x + box.width / 4, box.y + box.height / 2);
  await page.mouse.down();
  // A real move activates pending pointer capture before explicitly releasing it.
  await page.mouse.move(box.x + box.width / 3, box.y + box.height / 2);
  await slider.evaluate((element) =>
    element.releasePointerCapture(Number(element.getAttribute('data-pointer-id'))),
  );
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await expect(page.getByTestId('commit-count')).toHaveText('1');
  await page.mouse.up();
  await expect(page.getByTestId('commit-count')).toHaveText('1');
});

test('rebuilds geometry on resize and reaches both edges at the new width', async ({ page }) => {
  const slider = page.getByRole('slider', { name: 'Field of View' });
  const path = slider.locator('.active');
  const original = await path.getAttribute('d');
  await page.locator('.panel').evaluate((element, width) => {
    (element as HTMLElement).style.width = `${width}px`;
  }, COMPACT_WIDTH);
  await expect(path).not.toHaveAttribute('d', original!);
  await expect(slider).toHaveAttribute('aria-valuenow', '75');
  const box = (await slider.boundingBox())!;
  await page.mouse.click(box.x + 1, box.y + box.height / 2);
  await expect(slider).toHaveAttribute('aria-valuenow', '30');
  await page.mouse.click(box.x + box.width - 1, box.y + box.height / 2);
  await expect(slider).toHaveAttribute('aria-valuenow', '120');
});

test('resolves inherited UI tokens, Material adapters and both explicit HUD scopes', async ({
  page,
}) => {
  const host = page.locator('ui--slider').first();
  const stage = page.locator('[data-spike-stage]');
  const defaultColor = await host.evaluate((element) => getComputedStyle(element).color);
  await stage.evaluate((element) => {
    (element as HTMLElement).style.setProperty('--mat-sys-on-surface', 'rgb(10, 20, 30)');
    (element as HTMLElement).style.setProperty('--mat-sys-surface', 'white');
  });
  await expect(host).toHaveCSS('color', defaultColor);
  await expect(stage).toHaveCSS('color-scheme', 'dark');
  await stage.evaluate((element) => element.removeAttribute('data-ui-theme'));
  await expect(host).toHaveCSS('color', 'rgb(10, 20, 30)');
  await stage.evaluate((element) => element.classList.add('ui-theme-hud'));
  await expect(host).toHaveCSS('color', defaultColor);
  await stage.evaluate((element) =>
    (element as HTMLElement).style.setProperty('--ui-text', 'rgb(30, 40, 50)'),
  );
  await expect(host).toHaveCSS('color', 'rgb(30, 40, 50)');
  for (const path of [
    'projects/ui/src/lib/slider/slider.component.scss',
    'projects/demo/src/app/spikes/slider-svg-spike/slider-svg-spike.component.scss',
  ]) {
    expect(readFileSync(path, 'utf8')).not.toMatch(/#[\da-f]{3,8}\b|rgba\s*\(/i);
  }
});
