import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts', 'test/**/*.test.ts'],
    exclude: ['src/**/*.int.test.ts', 'src/**/*.e2e.test.ts', 'test/**/*.int.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: ['src/modules/*/service.ts', 'src/modules/*/policy.ts'],
      thresholds: { lines: 80 },
    },
  },
});
