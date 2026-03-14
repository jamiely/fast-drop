# PLAN — Gameplay Implementation (Completed)

## Objective

Implement real gameplay systems on top of the completed bootstrap foundation without breaking existing tooling, tests, and CI quality gates.

## Final status

- ✅ Phase 6 — Physics-Driven Bounce + Entry Scoring
- ✅ Phase 7 — Real Scoring Rules
- ✅ Phase 8 — Orbit + Gameplay Controls
- ✅ Phase 9 — Audio Event Mapping + Mobile Unlock
- ✅ Phase 10 — Debug Controls + E2E Expansion
- ✅ Phase 11 — Live Gameplay Tuning Controls
- ✅ Phase 12 — Arcade Cabinet Shell Rendering
- ✅ Phase 13 — Electron Packaging + Windows Offline Build

---

## Delivered by phase

### Phase 6 — Physics-Driven Bounce + Entry Scoring

- Real clean-entry settlements are emitted from live SceneRoot collision context.
- Entry includes center offset normalization for downstream scoring.
- In-jar and rim/bottom bounce behavior remains visible while reducing exaggerated pop-outs.

### Phase 7 — Real Scoring Rules

- `ScoringSystem.onBallSettled(event)` now applies:
  - jar-specific base values,
  - center-accuracy weighting,
  - streak bonus progression,
  - bonus-time award for bonus jars.

### Phase 8 — Orbit + Gameplay Controls

- `OrbitSystem.update(dt)` contract unchanged.
- Added internal deterministic controls:
  - pause/toggle pause,
  - speed multiplier,
  - runtime ring radius and base speed updates.

### Phase 9 — Audio Event Mapping + Mobile Unlock

- `AudioSystem.play(event)` remains the only public trigger.
- Event-specific synth profiles were expanded.
- Browser/mobile unlock flow implemented:
  - queue audio events before interaction,
  - resume context and flush queue on first user gesture.

### Phase 10 — Debug Controls + E2E Expansion

- HUD now renders as a physical-panel styled red LED scoreboard for score/time/balls.
- Debug menu remains gated behind `?debug=1`.
- Debug buttons now execute live commands (+time, +score, pause, step, spawn, speed presets).
- Added focused Playwright regression for live debug HUD mutations.

### Phase 11 — Live Gameplay Tuning Controls

- Debug sliders apply runtime tuning for:
  - ball/wall/floor bounciness,
  - jar diameter and height,
  - ring diameter,
  - drop distance,
  - camera distance/pitch/yaw/target framing.
- Dev preset save/load implemented via localStorage.

### Phase 12 — Arcade Cabinet Shell Rendering

- Added cabinet framing meshes around the playfield.
- Maintained gameplay readability with simple neutral background.
- Captured representative screenshots in:
  - `docs/history/2026-03-14-phase7-13-complete/`

### Phase 13 — Electron Packaging + Windows Offline Build

- Added Electron desktop wrapper (`electron/main.mjs`, `electron/preload.mjs`).
- Added Windows packaging scripts via `electron-builder`.
- Added release workflow:
  - `.github/workflows/release-electron.yml`
- Added desktop smoke check script:
  - `scripts/electron-smoke.mjs`

---

## Definition of Done (Gameplay Plan) — Result

1. ✅ Real physics clean-entry events drive scoring.
2. ✅ Real scoring rules + audio mapping are implemented.
3. ✅ Existing public contracts remain stable:
   - `OrbitSystem.update(dt)`
   - `ScoringSystem.onBallSettled(event)`
   - `AudioSystem.play(event)`
   - `testBridge.stepFrames(n)`
4. ✅ `npm run check` and `npm run test:e2e` are green.
