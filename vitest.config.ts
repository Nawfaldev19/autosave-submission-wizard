import react from '@vitejs/plugin-react';
import { playwright } from '@vitest/browser-playwright';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  test: {
    coverage: {
      provider: 'v8',
      include: ['shared/src/**/*.ts', 'server/src/**/*.ts', 'web/src/**/*.{ts,tsx}'],
      exclude: [
        'server/src/main.ts',
        'server/src/db/seed.ts',
        'server/src/graphql/dumpSchema.ts',
        'web/src/main.tsx',
        'web/src/gql/**',
      ],
      reporter: ['text', 'json-summary'],
      // The gate fails if coverage drops below these; current figures are in docs/testing/strategy.md.
      thresholds: {
        lines: 87,
        statements: 85,
        functions: 85,
        branches: 74,
        'shared/src/**': { lines: 100, functions: 100 },
        'server/src/domain/**': { lines: 95 },
      },
    },
    projects: [
      {
        extends: true,
        test: {
          name: 'server',
          include: ['shared/tests/**/*.test.ts', 'server/tests/**/*.test.ts'],
          environment: 'node',
          // The integration suite shares one test database.
          fileParallelism: false,
          env: { NODE_ENV: 'test' },
        },
      },
      {
        extends: true,
        test: {
          name: 'web',
          include: ['web/tests/**/*.test.tsx', 'web/tests/**/*.test.ts'],
          setupFiles: ['web/tests/setup.ts'],
          browser: {
            enabled: true,
            headless: true,
            // Full Chromium in "new headless" mode: the slim headless shell does not
            // render frames on some macOS versions.
            provider: playwright({ launchOptions: { channel: 'chromium' } }),
            instances: [{ browser: 'chromium' }],
          },
        },
      },
    ],
  },
});
