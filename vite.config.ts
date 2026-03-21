/// <reference types="vitest/config" />
import { defineConfig } from 'vite';

const repositoryName = process.env.GITHUB_REPOSITORY?.split('/')[1];
const explicitBasePath = process.env.VITE_BASE_PATH;
const shouldUsePagesBase =
  process.env.GITHUB_ACTIONS === 'true' && process.env.GITHUB_PAGES === 'true';
const pagesBase =
  explicitBasePath ??
  (shouldUsePagesBase && repositoryName ? `/${repositoryName}/` : '/');
const isGitHubCI = process.env.GITHUB_ACTIONS === 'true';
const testTimeoutMs = isGitHubCI ? 20_000 : 10_000;

export default defineConfig({
  base: pagesBase,
  test: {
    environment: 'node',
    globals: true,
    testTimeout: testTimeoutMs,
    hookTimeout: testTimeoutMs,
    include: ['tests/unit/**/*.test.ts', 'tests/integration/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      all: true,
      include: ['src/**/*.ts'],
      exclude: [
        'src/main.ts',
        'src/testhooks/**',
        '**/*.d.ts',
        'src/game/types.ts',
        'src/game/Game.ts',
        'src/scene/SceneRoot.ts',
        'src/scene/lighting.ts',
        'src/ui/debugMenu.ts',
        'src/systems/AudioSystem.ts',
        'src/systems/OrbitSystem.ts',
        'src/ui/hud.ts',
        'src/entities/StatusDisplay.ts',
        'src/entities/ArcadeShell.ts',
        'src/stories/**'
      ],
      reporter: ['text', 'text-summary', 'json-summary', 'html', 'lcov'],
      reportsDirectory: 'coverage',
      thresholds: {
        statements: 90,
        branches: 90,
        functions: 90,
        lines: 90
      }
    }
  }
});
