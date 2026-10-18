import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['projects/ui/src/**/*.spec.ts', 'projects/demo/src/**/*.spec.ts'],
    environment: 'node',
  },
});
