# Fast Drop

Browser-first 3D timing arcade game with physics-driven ball drops into rotating jars.

## Tech stack

- TypeScript
- Vite
- Three.js
- Rapier
- Vitest + coverage
- Playwright
- ESLint + Prettier
- Electron + electron-builder (desktop packaging)

## Getting started

```bash
npm install
npm run dev
```

Open http://localhost:5173.

For the component storybook site, open http://localhost:5173/storybook.html.

## Debug / camera / gameplay tuning toggles

- Use `?debug=1` in the URL to open the debug panel:
  - `http://localhost:5173/?debug=1`
- Debug panel includes:
  - pause/resume + step
  - score/time mutators
  - speed controls
  - gameplay tuning (including drop cooldown)
  - camera tuning
  - preset save/load

## Scripts

- `npm run dev` — start dev server
- `npm run storybook:dev` — start dev server and open the component storybook page
- `npm run build` — typecheck + production build (includes `index.html` + `storybook.html`)
- `npm run preview` — preview production build
- `npm run typecheck` — TypeScript checks
- `npm run lint` — ESLint
- `npm run lint:fix` — ESLint with auto-fixes
- `npm run format` — Prettier write
- `npm run format:check` — Prettier formatting validation
- `npm run test` — Vitest tests
- `npm run coverage` — Vitest with coverage metrics (`text`, `json-summary`, `html`, `lcov`)
- `npm run test:e2e` — Playwright tests
- `npm run check` — typecheck + lint + prettier check + coverage
- `npm run electron:start` — run desktop app using built web assets
- `npm run electron:smoke` — validate packaging inputs and perform a real Electron startup/load smoke check
- `npm run build:electron:win` — package Windows desktop artifacts
- `npm run release:electron:win` — run full quality gate, then package Windows artifacts

## Test timeout policy

The project keeps test timeouts intentionally short to surface hangs quickly.

Local defaults:

- Playwright test timeout: `15s`
- Playwright expect timeout: `3s`
- Playwright web server startup timeout: `45s`
- Vitest test/hook timeout: `10s`

GitHub Actions automatically uses a `2x` multiplier for these timeouts.

To reduce flakiness in CI, Playwright also runs with `1` worker and `1` retry when `CI=true`.

## Git hooks (Husky)

- Hooks are installed via `npm run prepare` (also runs during `npm install`).
- Pre-commit runs:
  - `npm run lint`
  - `npm run test`
  - `npm run coverage` (enforces global 90% minimum for statements/branches/functions/lines)
  - `npm run test:e2e`
- Coverage excludes runtime-heavy orchestration/render/audio UI files (`Game.ts`, `SceneRoot.ts`, `ui/debugMenu.ts`, `systems/AudioSystem.ts`, `systems/OrbitSystem.ts`, `ui/hud.ts`, `storybook/**`) and pure type-only modules from threshold accounting so the 90% gate targets deterministic unit-testable logic.

## CI/CD

- Quality workflow: `.github/workflows/quality.yml`
- GitHub Pages deployment: `.github/workflows/deploy-pages.yml`
- Windows Electron release packaging: `.github/workflows/release-electron.yml` (runs on published releases or manual dispatch)

Windows release workflow behavior:

- installs Chromium for Playwright so `npm run check` can execute e2e in CI,
- runs `npm run check`, `npm run build`, and `npm run electron:smoke`,
- builds `nsis` + `portable` artifacts via `electron-builder`,
- uploads artifacts to the GitHub Release and as a 14-day workflow artifact,
- uploads diagnostics (`dist_electron/`, `test-results/`, `playwright-report/`) on failures.

## Current status

Implemented in this pass:

- deterministic round lifecycle (`playing`/`ended`) + restart flow,
- hit/miss/balls-dropped stats + derived accuracy,
- deterministic round-end conditions (timer expiry and no balls + resolved scene),
- end-of-round summary overlay with Play Again,
- e2e regressions for summary/round-end behavior,
- configurable drop cooldown (default 80ms, debug-tunable),
- visual style refresh inspired by the neon reference image,
- audio polish pass with dynamic-range compression and event throttling to reduce clipping/stacking,
- improved HUD/summary readability polish and mobile-safe-area spacing,
- ball size updated to 1/8 jar diameter,
- outer arcade enclosure removed,
- added a lightweight component storybook page with isolated stories for ball, bonus jar, center platform, and score panel, with per-story feedback capture.

## Representative screenshots

### Neon gameplay (desktop)

![Neon gameplay desktop](docs/history/2026-03-14-final-polish-audio-ui/gameplay-desktop-polish.png)

### Round summary overlay

![Round summary desktop](docs/history/2026-03-14-final-polish-audio-ui/round-summary-polish.png)

### Neon gameplay (mobile)

![Neon gameplay mobile](docs/history/2026-03-14-final-polish-audio-ui/gameplay-mobile-polish.png)
