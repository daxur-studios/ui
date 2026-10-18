import { defineConfig, devices } from '@playwright/test';

/** Dedicated demo harness port. 4200 is used by the local apps dashboard, so the harness must not share it. */
const HARNESS_PORT = 4226;
/** Demo harness dev-server origin. */
const HARNESS_ORIGIN = `http://localhost:${HARNESS_PORT}`;

/**
 * Playwright configuration for @daxur-studios/ui.
 * Runs cross-browser component rendering and interaction verification against the demo harness.
 * The `thumbnails` project captures spike previews and is kept out of the normal test run.
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env['CI'],
  retries: process.env['CI'] ? 2 : 0,
  workers: process.env['CI'] ? 1 : undefined,
  reporter: 'list',
  use: {
    baseURL: HARNESS_ORIGIN,
    trace: 'on-first-retry',
  },
  webServer: {
    command: `npx ng serve demo --port ${HARNESS_PORT}`,
    url: HARNESS_ORIGIN,
    reuseExistingServer: !process.env['CI'],
    timeout: 120_000,
  },
  projects: [
    {
      name: 'chromium',
      testIgnore: '**/thumbnails/**',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'thumbnails',
      testMatch: '**/thumbnails/*.spec.ts',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
