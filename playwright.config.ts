import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  workers: 1,
  timeout: 30_000,
  expect: { timeout: 10_000 },
  outputDir: 'e2e-artifacts/results',
  reporter: [
    ['list'],
    ['html', { outputFolder: 'e2e-artifacts/report', open: 'never' }],
  ],
  use: {
    baseURL: 'http://localhost:5173',
    locale: 'en-US',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'node scripts/e2e-server.mjs',
    // A successful proxied API response means both Web and server are ready.
    url: 'http://localhost:5173/api/v1/auth/me',
    timeout: 120_000,
    reuseExistingServer: false,
    gracefulShutdown: { signal: 'SIGTERM', timeout: 5_000 },
    stdout: 'ignore',
    stderr: 'pipe',
  },
});
