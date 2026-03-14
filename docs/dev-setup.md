# Development Setup

## Prerequisites

- Node.js 24+
- npm 10+

## Install

```bash
npm install
```

## Local workflow

```bash
npm run dev
npm run check
npm run test:e2e
```

## Debug menu and tuning controls

- Open with `?debug=1`:
  - `http://localhost:5173/?debug=1`
- Includes controls for pause/step, score/time mutation, spawn ball, speed, gameplay tuning (including drop cooldown), and camera tuning.
- This menu is URL-gated and should stay hidden in normal mode.

## Git hooks

```bash
npm run prepare
```

- Installs Husky hooks at `.husky/`.
- Pre-commit enforces lint, tests, coverage (>=90%), and e2e before allowing commit.

## E2E + coverage notes

- E2E tests build and preview the app automatically through Playwright config.
- Timeout policy is intentionally short by default:
  - Playwright test timeout: `15s`
  - Playwright expect timeout: `3s`
  - Playwright action timeout: `5s`
  - Playwright navigation timeout: `10s`
  - Playwright web server startup timeout: `45s`
  - Vitest `testTimeout`/`hookTimeout`: `10s`
- Coverage output is written to `coverage/`.
- Coverage thresholds are enforced in `vite.config.ts`.
- Threshold accounting intentionally excludes runtime-heavy render/orchestration/audio UI files (`src/game/Game.ts`, `src/scene/SceneRoot.ts`, `src/ui/debugMenu.ts`, `src/systems/AudioSystem.ts`, `src/systems/OrbitSystem.ts`, `src/ui/hud.ts`) and type-only modules, so the global 90% gate applies to deterministic unit-testable code paths.

## Electron desktop packaging

### Run desktop app locally

```bash
npm run build
npm run electron:start
```

### Windows packaging

```bash
npm run build:electron:win
```

Artifacts are written to `dist_electron/`.

### Desktop smoke check

```bash
npm run build
npm run electron:smoke
```

This validates required packaging inputs (`dist/index.html`, `electron/main.mjs`, `electron/preload.mjs`).

## GitHub Actions

- `.github/workflows/quality.yml`: typecheck/lint/format/coverage gate.
- `.github/workflows/deploy-pages.yml`: Pages deployment from `main` after quality + e2e.
- `.github/workflows/release-electron.yml`: Windows Electron packaging for releases/workflow dispatch.
