import { defineConfig, devices } from '@playwright/test';

const isCI = Boolean(process.env.CI);
const isGitHubCI = process.env.GITHUB_ACTIONS === 'true';
const timeoutScale = isGitHubCI ? 2 : 1;

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: !isCI,
  workers: isCI ? 1 : undefined,
  retries: isCI ? 1 : 0,
  timeout: 15_000 * timeoutScale,
  expect: {
    timeout: 3_000 * timeoutScale
  },
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: 'http://127.0.0.1:4173',
    trace: 'on-first-retry',
    actionTimeout: 5_000 * timeoutScale,
    navigationTimeout: 10_000 * timeoutScale
  },
  webServer: {
    command: 'npm run build && npm run preview -- --host 127.0.0.1 --port 4173',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: !isCI,
    timeout: 45_000 * timeoutScale
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] }
    }
  ]
});
