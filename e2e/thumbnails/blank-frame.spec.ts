import { test, expect } from '@playwright/test';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { captureThumbnail } from './capture-thumbnail';

test.describe('blank-frame rejection', () => {
  let outputDir: string;

  // A temporary directory keeps these checks away from the real thumbnails folder.
  test.beforeEach(() => {
    outputDir = mkdtempSync(join(tmpdir(), 'thumbnails-'));
  });

  test.afterEach(() => {
    rmSync(outputDir, { recursive: true, force: true });
  });

  test('rejects a blank frame and keeps the previous thumbnail', async ({ page }) => {
    const previous = join(outputDir, 'blank.webp');
    const sentinel = Buffer.from('previous thumbnail');
    writeFileSync(previous, sentinel);

    await expect(captureThumbnail(page, '/fixtures/blank', outputDir)).rejects.toThrow(
      /frame is blank/,
    );

    expect(readFileSync(previous)).toEqual(sentinel);
  });

  test('writes no file for a blank frame that has no previous thumbnail', async ({ page }) => {
    await expect(captureThumbnail(page, '/fixtures/blank', outputDir)).rejects.toThrow(
      /frame is blank/,
    );

    expect(existsSync(join(outputDir, 'blank.webp'))).toBe(false);
  });

  test('control: a frame with content is written', async ({ page }) => {
    const { path, bytes } = await captureThumbnail(page, '/fixtures/pipeline', outputDir);

    expect(existsSync(path)).toBe(true);
    expect(bytes).toBeGreaterThan(0);
  });
});
