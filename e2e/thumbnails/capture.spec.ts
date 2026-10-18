import { test } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { SPIKE_REGISTRY } from '../../projects/demo/src/app/spikes/spike-registry';

/** Fixed frame size for every spike thumbnail, so catalog cards are framed the same way. */
const VIEWPORT = { width: 960, height: 540 };
/** Thumbnail width after downscaling. Matches the sibling catalogs' 480 px preview. */
const THUMBNAIL_WIDTH = 480;
/** WebP quality, matching the sibling catalogs' 0.82 setting. */
const THUMBNAIL_QUALITY = 0.82;
/** Target size cap in MB. 0.04 MB is about 40 KB, the per-file budget from the standard. */
const THUMBNAIL_MAX_MB = 0.04;
/** Files above this size in KB are flagged for review. */
const SIZE_REVIEW_KB = 80;
/** A pixel counts as visible when its brightest channel exceeds this value. */
const VISIBLE_CHANNEL_THRESHOLD = 16;
/** A frame needs at least this many visible pixels to be kept. */
const MINIMUM_VISIBLE_PIXELS = 16;
/** Time allowed for a page to publish its `data-spike-ready` attribute. */
const READY_TIMEOUT_MS = 15_000;
/** Where captured thumbnails are written, relative to the repo root. */
const OUTPUT_DIR = join('projects', 'demo', 'public', 'thumbnails');
/** Browser build of the compressor. It registers the global `imageCompression`. */
const COMPRESSOR_SCRIPT = join('node_modules', 'browser-image-compression', 'dist', 'browser-image-compression.js');

/**
 * Routes to capture. `THUMBNAIL_ROUTES` (comma-separated) overrides the registry, which is how the
 * pipeline fixture is captured without adding it to the catalog.
 */
const routes = process.env['THUMBNAIL_ROUTES']
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
      const id = route.split('/').filter(Boolean).pop() ?? 'spike';

      await page.setViewportSize(VIEWPORT);
      await page.emulateMedia({ reducedMotion: 'reduce', colorScheme: 'dark' });
      await page.goto(route);
      await page.waitForSelector('[data-spike-ready]', { state: 'attached', timeout: READY_TIMEOUT_MS });
      await page.evaluate(() => document.fonts.ready);
      await page.mouse.move(0, 0);
      await page.addScriptTag({ path: COMPRESSOR_SCRIPT });

      const stage = page.locator('[data-spike-stage]');
      const png = await stage.screenshot({ animations: 'disabled', caret: 'hide' });

      const encoded = await page.evaluate(
        async ({ pngBase64, options }) => {
          const bytes = Uint8Array.from(atob(pngBase64), (char) => char.charCodeAt(0));
          const png = new Blob([bytes], { type: 'image/png' });

          const bitmap = await createImageBitmap(png);
          const canvas = document.createElement('canvas');
          canvas.width = bitmap.width;
          canvas.height = bitmap.height;
          const context = canvas.getContext('2d', { willReadFrequently: true });
          if (!context) throw new Error('The browser could not read the capture.');
          context.drawImage(bitmap, 0, 0);
          const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
          let visible = 0;
          for (let offset = 0; offset < pixels.length; offset += 4) {
            const brightest = Math.max(pixels[offset], pixels[offset + 1], pixels[offset + 2]);
            if (pixels[offset + 3] > 0 && brightest > options.visibleThreshold) {
              visible++;
              if (visible >= options.minimumVisible) break;
            }
          }
          if (visible < options.minimumVisible) return { blank: true as const };

          const compressor = (window as unknown as { imageCompression: (file: File, settings: object) => Promise<File> })
            .imageCompression;
          const compressed = await compressor(new File([png], 'capture.png', { type: 'image/png' }), {
            maxWidthOrHeight: options.width,
            maxSizeMB: options.maxSizeMB,
            initialQuality: options.quality,
            fileType: 'image/webp',
            useWebWorker: false,
          });

          const dataUrl = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = () => reject(reader.error);
            reader.readAsDataURL(compressed);
          });
          return {
            blank: false as const,
            base64: dataUrl.slice(dataUrl.indexOf(',') + 1),
            type: compressed.type,
            bytes: compressed.size,
          };
        },
        {
          pngBase64: png.toString('base64'),
          options: {
            width: THUMBNAIL_WIDTH,
            quality: THUMBNAIL_QUALITY,
            maxSizeMB: THUMBNAIL_MAX_MB,
            visibleThreshold: VISIBLE_CHANNEL_THRESHOLD,
            minimumVisible: MINIMUM_VISIBLE_PIXELS,
          },
        },
      );

      if (encoded.blank) {
        throw new Error(`${route}: the frame is blank. The previous thumbnail was kept.`);
      }
      if (encoded.type !== 'image/webp') {
        throw new Error(`${route}: expected WebP output but the browser returned ${encoded.type}.`);
      }

      mkdirSync(OUTPUT_DIR, { recursive: true });
      writeFileSync(join(OUTPUT_DIR, `${id}.webp`), Buffer.from(encoded.base64, 'base64'));
      const sizeKB = (encoded.bytes / 1024).toFixed(1);
      console.log(`[thumbnails] ${id}.webp: ${sizeKB} KB`);
      if (encoded.bytes > SIZE_REVIEW_KB * 1024) {
        console.warn(`[thumbnails] ${id}.webp is over ${SIZE_REVIEW_KB} KB and needs review.`);
      }
    });
  }
});
