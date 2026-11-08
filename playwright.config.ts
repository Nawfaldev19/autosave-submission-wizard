import { defineConfig, devices } from '@playwright/test';

// Full stack: the GraphQL server on a freshly seeded submission_wizard_e2e database,
// plus the production web build served by `vite preview` (which proxies the API).
const API_PORT = 4401;

export default defineConfig({
  testDir: 'e2e',
  fullyParallel: false,
  workers: 1,
  // The suite shares one seeded database, so a retry would not start clean.
  retries: 0,
  forbidOnly: Boolean(process.env.CI),
  reporter: process.env.CI ? 'github' : 'list',
  use: { baseURL: 'http://localhost:5280', trace: 'retain-on-failure' },
  projects: [
    // Everything except the tablet-only smoke tests.
    { name: 'desktop', use: { ...devices['Desktop Chrome'], channel: 'chromium' }, grepInvert: /@tablet/ },
    { name: 'mobile', use: { ...devices['Pixel 7'], channel: 'chromium' }, grep: /@mobile/ },
    {
      name: 'tablet',
      use: {
        ...devices['Desktop Chrome'],
        channel: 'chromium',
        viewport: { width: 768, height: 1024 },
        hasTouch: true,
      },
      grep: /@tablet/,
    },
  ],
  webServer: [
    {
      command:
        'npm run seed --workspace @submission-wizard/server && npm run start --workspace @submission-wizard/server',
      url: `http://localhost:${API_PORT}/healthz`,
      env: {
        PORT: String(API_PORT),
        SUBMISSION_WIZARD_DATABASE: 'submission_wizard_e2e',
        ALLOWED_ORIGINS: 'http://localhost:5280',
        STORAGE_DIR: new URL('./server/.e2e-storage/', import.meta.url).pathname,
      },
      reuseExistingServer: false,
      timeout: 120_000,
    },
    {
      command:
        'npm run build --workspace @submission-wizard/web && npm run preview --workspace @submission-wizard/web',
      port: 5280,
      env: { SUBMISSION_WIZARD_API_URL: `http://localhost:${API_PORT}` },
      reuseExistingServer: false,
      timeout: 120_000,
    },
  ],
});
