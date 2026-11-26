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
- Pre-commit now auto-runs `npm run format` (Prettier `--write`), re-stages formatted staged files, then verifies with `npm run format:check` before quality gates.
- Pre-commit enforces lint, tests, coverage (>=90%), and e2e before allowing commit.
- `.gitattributes` enforces LF line endings across platforms so Windows checkouts do not trigger CRLF-only Prettier failures in CI.

## E2E + coverage notes

- `npm run test:e2e` (and `test:e2e:ui`) builds classic, checks bundle isolation, then builds Fever sequentially before Playwright starts its two preview servers. Use these npm scripts rather than invoking Playwright directly against missing/stale builds. This avoids concurrent TypeScript/Vite builds competing during the server-startup timeout.
- E2E tests run one at a time locally and in CI; timeout limits are unchanged.
- Timeout policy is intentionally short by default:
  - Playwright test timeout: `15s`
  - Playwright expect timeout: `3s`
  - Playwright action timeout: `5s`
  - Playwright navigation timeout: `10s`
  - Playwright web server startup timeout: `45s`
  - Vitest `testTimeout`/`hookTimeout`: `10s`
- In GitHub Actions (`GITHUB_ACTIONS=true`), these test timeouts are scaled to `2x` automatically.
- Playwright always runs with `1` worker; CI additionally enables `1` retry for stability.
- Coverage output is written to `coverage/`.
- Coverage thresholds are enforced in `vite.config.ts`.
- Threshold accounting intentionally excludes runtime-heavy render/orchestration/audio UI files (`src/game/Game.ts`, `src/scene/SceneRoot.ts`, `src/ui/debugMenu.ts`, `src/systems/AudioSystem.ts`, `src/systems/OrbitSystem.ts`, `src/ui/hud.ts`) and type-only modules, so the global 90% gate applies to deterministic unit-testable code paths.

## Electron desktop packaging

### Run desktop app locally

```bash
npm run electron:start
```

### Windows packaging

```bash
npm run build:electron:win
```

Artifacts are written to `dist_electron/`.
Typical outputs include:

- `Fast Drop Setup <version>.exe` (NSIS installer)
- `Fast Drop <version>.exe` (portable)

### macOS packaging

```bash
npm run build:electron:mac
```

Typical outputs include:

- `Fast Drop-<version>.dmg`
- `Fast Drop-<version>-mac.zip`

### Linux packaging

```bash
npm run build:electron:linux
```

Typical outputs include:

- `Fast Drop-<version>.AppImage`
- `fast-drop-<version>.tar.gz`

For a local release-grade Windows check:

```bash
npm run release:electron:win
```

This runs `npm run check` before packaging.

### Desktop smoke check

```bash
npm run electron:smoke
```

This builds Electron-friendly renderer assets (`vite build --base ./`), validates required packaging inputs (`dist/index.html`, `electron/main.mjs`, `electron/preload.cjs`), and performs a real Electron boot/load check in smoke mode.

### Fast Drop Fever (separate desktop app)

```bash
npm run dev:fever                 # Fever web dev server
npm run build:fever               # web build in dist-fever/
npm run electron:start:fever      # relative-assets build, then run locally
npm run electron:smoke:fever      # same build + real Electron load check
npm run build:electron:win:fever   # portable only; no NSIS
npm run build:electron:mac:fever   # dmg + zip
npm run build:electron:linux:fever # AppImage + tar.gz
```

Build each platform's packages on that OS. `build:electron:web:fever` runs
`tsc -b && vite build --mode fever --base ./ --outDir dist-fever` so classic
`dist/` is never overwritten by Fever. The Fever builder config maps `dist-fever/`
to `dist/` inside the package, which the existing Electron loader opens. Local
runs pass `--fever` to select `dist-fever/`; packaged apps do not need this flag.
Fullscreen (`--fullscreen`) and F11 work in either edition.

`electron-builder.fever.json` sets product name `Fast Drop Fever`, appId
`com.fastdrop.fever`, package name `fast-drop-fever`, and output
`dist_electron_fever/`. Its identity gives Fever a separate userData profile from
classic. Artifacts include:

- `Fast.Drop.Fever.<version>.exe`
- `Fast.Drop.Fever.<version>-<arch>.dmg` and `.zip`
- `Fast.Drop.Fever.<version>-<arch>.AppImage` and `.tar.gz`

Fever uses `publish: null` (no `latest*.yml` generation), and the release workflow
uploads only the Fever-named packages. Both editions ship beside each other on
the rolling GitHub `latest` release, with classic's packages and update metadata
paths unchanged. `tests/unit/release-assets.test.ts` checks identity/targets and
that the cabinet's classic and Fever executable regexes cannot cross-match; it
runs with `npm run test` and the coverage gate in `npm run check`.

## GitHub Actions

- `.github/workflows/quality.yml`: typecheck/lint/format/coverage gate.
- `.github/workflows/deploy-pages.yml`: Pages deployment from `main` after quality + e2e.
- `.github/workflows/release-electron.yml`: desktop Electron packaging (Windows + macOS + Linux) on pull requests, pushes to `main`, and manual dispatch (Node.js 20 LTS runner), with source-file path filtering (including `.env.fever` and `electron-builder.fever.json`; markdown-only changes skip this workflow), rolling `latest` prerelease asset updates for both editions on `main`, separate classic/Fever artifact uploads, and failure diagnostics retention. The existing three OS jobs build both editions; Windows and macOS smoke-test both.
