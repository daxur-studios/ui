import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['projects/ui/src/**/*.spec.ts', 'projects/demo/src/**/*.spec.ts'],
    // DOM specs (*.dom.spec.ts) run under `ng test demo` with jsdom.
    exclude: ['**/node_modules/**', 'projects/demo/src/**/*.dom.spec.ts'],
    environment: 'node',
  },
});
