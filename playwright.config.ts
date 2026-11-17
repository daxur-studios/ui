import { defineConfig, devices } from '@playwright/test';

/** Dedicated demo harness port. 4200 is used by the local apps dashboard, so the harness must not share it. */
const HARNESS_PORT = 4226;
/** Demo harness dev-server origin. */
const HARNESS_ORIGIN = `http://localhost:${HARNESS_PORT}`;

/** Review project, only enabled when the `sigil:review` wrapper sets `SIGIL_REVIEW_SUBJECTS`, so a plain `playwright test` never runs it. */
const REVIEW_PROJECT = {
  name: 'review',
  testMatch: '**/review/*.spec.ts',
  use: { ...devices['Desktop Chrome'] },
};

/**
 * Playwright configuration for @daxur-studios/ui.
 * Runs cross-browser component rendering and interaction verification against the demo harness.
 * The `thumbnails` and `review` projects (spike previews, sigil review sheets) are kept out of the normal test run.
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
      testIgnore: ['**/thumbnails/**', '**/review/**'],
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'thumbnails',
      testMatch: '**/thumbnails/*.spec.ts',
      use: { ...devices['Desktop Chrome'] },
    },
    ...(process.env['SIGIL_REVIEW_SUBJECTS'] ? [REVIEW_PROJECT] : []),
  ],
});
