import { defineConfig, devices } from '@playwright/test';

const isCI = Boolean(process.env.CI);
const isGitHubCI = process.env.GITHUB_ACTIONS === 'true';
const timeoutScale = isGitHubCI ? 2 : 1;

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  workers: 1,
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
  webServer: [
    {
      command: 'npm run preview -- --host 127.0.0.1 --port 4173 --strictPort',
      url: 'http://127.0.0.1:4173',
      reuseExistingServer: !isCI,
      timeout: 45_000 * timeoutScale
    },
    {
      command:
        'npm run preview -- --outDir dist-fever --host 127.0.0.1 --port 4174 --strictPort',
      url: 'http://127.0.0.1:4174',
      reuseExistingServer: !isCI,
      timeout: 45_000 * timeoutScale
    }
  ],
  projects: [
    {
      name: 'chromium',
      testIgnore: '**/fever.spec.ts',
      use: { ...devices['Desktop Chrome'] }
    },
    {
      name: 'fever',
      testMatch: '**/fever.spec.ts',
      use: {
        ...devices['Desktop Chrome'],
        baseURL: 'http://127.0.0.1:4174',
        viewport: { width: 1050, height: 1680 }
      }
    }
  ]
});
