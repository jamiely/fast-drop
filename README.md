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

For the component StorybookJS site, run `npm run storybook` and open http://localhost:6006.

Storybook stories currently included:

- Ball (size/material/color controls)
- Jar (bonus jar body/rim controls)
- Center Platform (radius/bridge/material controls)
- Outer Ring (diameter/material + LED chase tuning)
- Light Rig Lab (interactive light source/type/position/intensity experimentation)
- Jar Spinner (orbit radius/spin speed tuning)
- Score Panel (value/LED color/scale controls)
- Status Display (timer ring + balls remaining display with placement controls)
- Round Complete Dialog (summary UI states)

## Debug / camera / gameplay tuning toggles

- Use `?debug=1` in the URL to open the debug panel:
  - `http://localhost:5173/?debug=1`
- Mobile auto-performance mode is enabled by default on mobile user agents:
  - shader effects default to off (unless explicitly overridden),
  - renderer starts with lower pixel ratio / antialias off,
  - gameplay visuals start in a lighter LED preset,
  - adaptive quality drops further if FPS stays low.
- Use `?effects=0` (or `?fx=0`) to force-disable shader-driven LED/reflection effects on any device:
  - `http://localhost:5173/?effects=0`
- Use `?effects=1` to force-enable shader effects on mobile when you want max visuals.
- Use `?mobileQuality=0` (or `?mq=0`) to disable automatic mobile quality tuning.
- Use `?inputDebug=1` to print pointer/touch/click input decisions in the browser console (handy for mobile simulator debugging):
  - `http://localhost:5173/?inputDebug=1`
- Debug panel includes:
  - pause/resume + step
  - score/time mutators
  - speed controls
  - gameplay tuning (including jar spin speed, center dome diameter/steepness/height, ring diameter, ball size, drop height, screen display X/Y/Z placement + size, drop cooldown, ring LED enable/speed/head count/trail/reverse chance)
  - camera tuning (distance/pitch/yaw + lateral pan X, with wider zoom-out range)
  - lighting rig tuning (move lights, change light type, toggle each light on/off, add lights, and show light-source markers while debugging)
  - light legend showing each light id/name plus marker mapping (`●` source color, `◆` target)
  - stronger light helper emphasis: selected source markers render with a bright white halo + filled core; non-selected source markers stay dim and outline-only
  - live numeric values + selected light color hex value + copyable JSON snapshot for sharing tuned settings (including lights)
  - preset save/load
- Controls:
  - click/tap the page (outside UI controls) or press `Space` to drop
  - when a round ends, tap/click the playfield (outside UI controls) or press `Enter` / `Space` to play again
  - in `?debug=1`, scroll wheel zooms camera in/out (outside debug UI elements)

## Scripts

- `npm run dev` — start classic dev server
- `npm run dev:fever` — start Fast Drop Fever (`--mode fever`, `.env.fever`, no platform-specific shell env syntax)
- `npm run build:fever` — typecheck + Fever web build into `dist-fever/` (separate from classic `dist/`)
- `npm run test:classic-bundle` — build classic and assert that no juice marker or Fever UI is bundled
- `npm run storybook` — run StorybookJS locally on port 6006
- `npm run build-storybook` — build static StorybookJS output
- `npm run build` — typecheck + production web build (root-relative assets)
- `npm run build:electron:web` — typecheck + Electron-friendly web build (relative assets)
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
- `npm run electron:start` — build Electron-friendly web assets, then run desktop app
- `npm run electron:smoke` — build Electron-friendly web assets, validate packaging inputs, and perform a real Electron startup/load smoke check
- `npm run build:electron:win` — package Windows desktop artifacts
- `npm run build:electron:mac` — package macOS desktop artifacts (`dmg` + `zip`)
- `npm run build:electron:linux` — package Linux desktop artifacts (`AppImage` + `tar.gz`)
- `npm run release:electron:win` — run full quality gate, then package Windows artifacts

## Fast Drop Fever — juice core

The first build-time edition slice follows [the approved design](docs/JUICY_EDITION.md). Classic remains the default; its build prunes the conditional Fever import (including Fever CSS). Three is emitted as a shared chunk so Fever's dynamic import cannot depend back on the main entry while its top-level startup await is pending. No Electron packaging/release behavior changes in this slice.

Fever adds bounded camera trauma, simulation-only hit-stop/slow-mo (at least 0.25×, at most two **real seconds under distortion** per round), jar/full-screen flashes, one additive 1,500-quad instanced pool (at most 300 particles per burst), and world-anchored spring popups. All effect animation uses real time rather than slowed simulation time. Explicit debug pause freezes effects too.

Consecutive hits earn ×2 at five, ×3 at ten; a miss clears combo and meter. Fifteen hits (or a full meter) start six real seconds of FEVER with ×3 scoring and 1.25× orbit speed. Active Fever survives a miss but never extends on hits. The meter resets at entry, stays empty while Fever is active, and can fill again afterwards; heat cools to calm on expiry until the next hit, without erasing consecutive combo or its earned multiplier. Scoring changes only in Fever; classic still awards exactly ten per jar ball.

Tune event channels in `src/juice/table.ts`. Following the existing test bridge convention, Fever adds `scriptJarHit(jarIndex?, isBonusJar?)`, `getJuiceState()` and `getGameState()`. Scripted hits use the same settlement/scoring/effects path as actual jar entries; they do not simulate a dropped ball. These additional hooks are absent from classic.

## Desktop window, fullscreen and vertical monitors

- The Electron window opens maximized to the primary display's work area in whatever orientation it has, so a rotated (portrait) cabinet monitor gets a tall window instead of a fixed 1280×800 landscape one.
- `--fullscreen` starts the app fullscreen, e.g. `"Fast Drop.exe" --fullscreen` (for LaunchBox, add `--fullscreen` to the application's command-line parameters).
- **F11** toggles fullscreen at any time.
- When the window (or browser viewport) is taller than it is wide, the game switches to a portrait layout with no flags: the camera looks down more steeply and backs off until the whole ring, jars, platform and drop button fit, and the status display rises above the ring and grows so time, balls and the final score stay readable. Resizing back to landscape restores the original view. `#app[data-layout]` reports the active layout (`landscape` / `portrait`).

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
  - `npm run format` (Prettier `--write`)
  - re-stages previously staged files after formatting
  - `npm run format:check`
  - `npm run lint`
  - `npm run test`
  - `npm run coverage` (enforces global 90% minimum for statements/branches/functions/lines)
  - `npm run test:e2e`
- `.gitattributes` enforces LF line endings across platforms to prevent Windows CRLF drift from failing `npm run format:check` in CI.
- Fever rendering (`src/juice/fever.ts`, `src/juice/particles.ts`) and its type-only sink contract are also excluded. The pure combo/heat/Fever machine, trauma/time core, tuning table and classic no-op remain covered by the 90% gate.
- Playwright serves classic on port 4173 and Fever on 4174. Existing smoke/portrait tests run only against classic; `fever.spec.ts` runs the Fever production build at 1050×1680. The classic server startup also checks bundle isolation.
- Coverage excludes runtime-heavy orchestration/render/audio UI files (`Game.ts`, `SceneRoot.ts`, `scene/lighting.ts`, `ui/debugMenu.ts`, `systems/AudioSystem.ts`, `systems/OrbitSystem.ts`, `ui/hud.ts`, `entities/StatusDisplay.ts`, `entities/ArcadeShell.ts`, `stories/**`) and pure type-only modules from threshold accounting so the 90% gate targets deterministic unit-testable logic.

## CI/CD

- Quality workflow: `.github/workflows/quality.yml`
- GitHub Pages deployment: `.github/workflows/deploy-pages.yml`
- Electron desktop build + release packaging: `.github/workflows/release-electron.yml` (runs on pull requests, pushes to `main`, or manual dispatch)

Electron desktop workflow behavior:

- only runs when app/source files change (for example `src/**`, `electron/**`, build/test config, and package manifests), so markdown-only/doc-only changes do not trigger desktop packaging,
- runs a build matrix on `windows-latest`, `macos-latest`, and `ubuntu-latest`,
- runs `npm run check` and `npm run build` on each platform,
- runs `npm run electron:smoke` on Windows and macOS,
- builds platform artifacts via:
  - `build:electron:win` (`nsis` + `portable`)
  - `build:electron:mac` (`dmg` + `zip`)
  - `build:electron:linux` (`AppImage` + `tar.gz`)
- uploads platform artifacts with 14-day retention on every run,
- updates a rolling prerelease tagged `latest` on pushes to `main` with Windows + macOS + Linux assets,
- uploads diagnostics (`dist_electron/`, `test-results/`, `playwright-report/`) on failures.

## Current status

Implemented in this pass:

- deterministic round lifecycle (`playing`/`ended`) + restart flow,
- hit/miss/balls-dropped stats + derived accuracy,
- deterministic round-end conditions (timer expiry or immediate ball exhaustion),
- end-of-round summary overlay with Play Again (`Enter`/`Space` shortcuts),
- e2e regressions for summary/round-end behavior,
- configurable drop cooldown (default 160ms, debug-tunable),
- click-anywhere drop input (outside UI controls),
- visual style refresh inspired by the neon reference image,
- decorative outer ring around the jar orbit,
- in-world status display above the jars (left timer ring shifts from green to red with a needle, right side shows balls remaining),
- status display visual refresh: rounded monitor-style bezel, recessed screen, and larger default scale (1.3),
- round-end status display now uses stronger depth cues (layered screen glass/frame, pedestal/jar shadows, richer gradients, and raised result badge styling),
- LED chase effect on the outer ring with moving multi-color heads, soft gradient blending, and trailing glow,
- center dome now receives a subtle shader-based animated reflection driven by the outer-ring LED phase,
- material/lighting polish pass (metallic center, glass jars, red rubber balls),
- visual shell pass: transparent outer enclosure around the playfield, glass drop tube linked to ball diameter, and a front red LED "DROP" arcade button that pulses on each drop,
- audio polish pass with dynamic-range compression and event throttling to reduce clipping/stacking,
- improved HUD/summary readability polish and mobile-safe-area spacing,
- mobile viewport-fit polish for dynamic viewport units (`dvh`/`svh`) so layout scales better on phones,
- ball size updated to 0.157 reference diameter (relative to jar diameter scaling),
- added StorybookJS component stories for ball, bonus jar, center platform, outer ring, jar spinner, score panel, and round-complete dialog,
- debug menu now shows live control values and a copyable JSON snapshot of current tuning for easy sharing,
- debug menu lighting controls for moving lights, swapping light type, toggling light enabled/disabled, and adding extra lights.
- debug camera wheel zoom in `?debug=1` now supports a farther zoom-out range, plus visible light-source markers while tuning lighting.
- debug controls for center dome diameter and enabling/disabling outer ring LED chase.
- debug lighting legend now maps each light id/name to visible source/target helper markers and clearly tags the selected light.
- optional shader-effects kill switch via URL (`?effects=0` / `?fx=0`) to reduce GPU load.
- outer ring Storybook story now includes live LED chase controls (enable/speed/heads/trail/reverse chance).
- added Storybook "Light Rig Lab" story for interactive light-source experimentation.

## Representative screenshots

### Fast Drop Fever — juice core (1050×1680)

Scripted settlements through the real scoring/effects path; see [capture notes](docs/history/2026-11-25-210421-fever-juice-core/README.md).

| Jar hit                                                                                             | Combo ×2                                                                                                | FEVER                                                                                      |
| --------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| ![Jar hit with confetti and +10 popup](docs/history/2026-11-25-210421-fever-juice-core/jar-hit.png) | ![Five-hit combo stamp and multiplier](docs/history/2026-11-25-210421-fever-juice-core/combo-stamp.png) | ![Fifteen-hit FEVER activation](docs/history/2026-11-25-210421-fever-juice-core/fever.png) |

### Neon gameplay (desktop)

![Neon gameplay desktop](docs/history/2026-03-14-final-polish-audio-ui/gameplay-desktop-polish.png)

### Vertical cabinet monitor (1080×1920)

| Before                                                                           | Portrait layout                                                                     | Round end                                                                              |
| -------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| ![Portrait before](docs/history/2026-11-25-vertical-monitor/portrait-before.png) | ![Portrait layout](docs/history/2026-11-25-vertical-monitor/portrait-1080x1920.png) | ![Portrait round end](docs/history/2026-11-25-vertical-monitor/portrait-round-end.png) |

### Round summary overlay

![Round summary desktop](docs/history/2026-03-14-final-polish-audio-ui/round-summary-polish.png)

### In-world game-over/status display depth refresh

![In-world game-over display depth refresh](docs/history/2026-03-20-game-over-3d-depth/game-over-3d-desktop.png)

### Neon gameplay (mobile)

![Neon gameplay mobile](docs/history/2026-03-14-final-polish-audio-ui/gameplay-mobile-polish.png)

### StorybookJS controls (component isolation)

![StorybookJS ball controls](docs/history/2026-03-14-storybookjs-controls/storybookjs-ball-controls.png)

### Debug light legend

![Debug light legend](docs/history/2026-03-15-todo-lighting-effects/debug-light-legend.png)

### Effects disabled (`?effects=0`)

![Shader effects disabled](docs/history/2026-03-15-todo-lighting-effects/effects-disabled.png)
