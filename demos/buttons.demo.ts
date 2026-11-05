import { defineDemo } from '@daxur-studios/stop-motion-ui';
import assert from 'node:assert/strict';
import path from 'node:path';

/** Dedicated recording server, independent of the component-test harness. */
const DEMO_ORIGIN = 'http://localhost:4239';
/** Local supplied speech clips; provider setup belongs to the host environment. */
const AUDIO_DIR = process.env['STOP_MOTION_AUDIO_DIR'] || 'ignore/demo-audio';

export default defineDemo({
  baseURL: DEMO_ORIGIN,
  viewport: { width: 1280, height: 800 },
  webServer: {
    command: [
      process.execPath,
      'node_modules/@angular/cli/bin/ng.js',
      'serve',
      'demo',
      '--port',
      '4239',
    ],
    url: DEMO_ORIGIN,
  },
  async run({ page, demo }) {
    await page.goto('/spikes/button-chamfer-hud-spike');
    await page.locator('[data-spike-ready="true"]').waitFor();
    await demo.capture({
      id: 'intro',
      narration: 'Here is the chamfered button. We will activate it, then latch its toggle.',
      audio: path.resolve(AUDIO_DIR, 'intro.wav'),
    });
    await demo.click(page.getByTestId('action-btn').getByRole('button'), {
      id: 'trigger',
      narration: 'The action has fired once.',
      audio: path.resolve(AUDIO_DIR, 'trigger.wav'),
      ready: async (page) => {
        await page.getByTestId('trigger-count').filter({ hasText: /^1$/ }).waitFor();
        assert.equal((await page.getByTestId('trigger-count').innerText()).trim(), '1');
      },
    });
    await demo.click(page.getByTestId('toggle-btn').getByRole('button'), {
      id: 'toggle',
      narration: 'Latching mode is now enabled.',
      audio: path.resolve(AUDIO_DIR, 'toggle.wav'),
      ready: async (page) => {
        await page
          .getByTestId('toggle-value')
          .filter({ hasText: /^true$/ })
          .waitFor();
        assert.equal((await page.getByTestId('toggle-value').innerText()).trim(), 'true');
      },
    });
  },
});
