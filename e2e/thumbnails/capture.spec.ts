import { test } from '@playwright/test';
import { SPIKE_REGISTRY } from '../../projects/demo/src/app/spikes/spike-registry';
import { captureThumbnail, OUTPUT_DIR, SIZE_REVIEW_KB } from './capture-thumbnail';

/**
 * Routes to capture. `THUMBNAIL_ROUTES` (comma-separated) overrides the registry, which is how the
 * pipeline fixture is captured without adding it to the catalog.
 */
const routes =
  process.env['THUMBNAIL_ROUTES']
    ?.split(',')
    .map((route) => route.trim())
    .filter(Boolean) ?? SPIKE_REGISTRY.map((entry) => entry.route);

test.describe('spike thumbnails', () => {
  if (routes.length === 0) {
    test('no spikes to capture', () => {
      test.skip(true, 'The spike registry is empty, so there is nothing to capture.');
    });
  }

  for (const route of routes) {
    test(`capture ${route}`, async ({ page }) => {
      const { id, bytes } = await captureThumbnail(page, route, OUTPUT_DIR);

      const sizeKB = (bytes / 1024).toFixed(1);
      console.log(`[thumbnails] ${id}.webp: ${sizeKB} KB`);
      if (bytes > SIZE_REVIEW_KB * 1024) {
        console.warn(`[thumbnails] ${id}.webp is over ${SIZE_REVIEW_KB} KB and needs review.`);
      }
    });
  }
});
