import { defineDemo } from '@daxur-studios/stop-motion-ui';
import { fileURLToPath } from 'node:url';
import { kokoroSpeech } from './kokoro-tts.mjs';

const review = (params) => `/fixtures/sigil-review?${new URLSearchParams(params)}`;

export default defineDemo({
  baseURL: 'http://localhost:4226',
  viewport: { width: 1400, height: 900 },
  audioProvider: kokoroSpeech({ voice: 'af_heart' }),
  webServer: {
    command: [process.execPath, fileURLToPath(new URL('../node_modules/@angular/cli/bin/ng.js', import.meta.url)), 'serve', 'demo', '--port', '4226'],
    url: 'http://localhost:4226',
    reuseExistingServer: true,
  },
  async run({ page, demo }) {
    const ready = async (p) => p.waitForSelector('[data-review-ready]', { timeout: 60_000 });

    await page.goto(review({ subject: 'blade-crest', seeds: '1,2,3,4' }));
    await ready(page);
    await demo.capture({
      id: 'intro',
      narration: 'Cybersigillism: procedural ornament, drawn from concept art and checked by a review harness.',
    });

    await page.goto(review({ subject: 'tube-window-phone', seeds: '1,2,3,4', widths: '390' }));
    await ready(page);
    await demo.capture({
      id: 'phone-window',
      narration: 'A tube window wraps the real layout. The medallion rises above the frame like a crown.',
    });

    await page.goto(review({ subject: 'tube-window-phone', seeds: '5,6,7,8', widths: '390' }));
    await ready(page);
    await demo.capture({
      id: 'phone-seeds',
      narration: 'Each seed changes the ornament. The layout stays the same.',
    });

    await page.goto(review({ subject: 'tube-window-desktop', seeds: '1,2,3,4', widths: '1100' }));
    await ready(page);
    await demo.capture({
      id: 'desktop-window',
      narration: 'The same generator reflows for a wide desktop window.',
    });
  },
});
