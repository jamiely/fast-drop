# PLAN — Gameplay Implementation (New Active Plan)

## Objective

Implement real gameplay systems on top of the completed bootstrap foundation without breaking existing tooling, tests, and CI quality gates.

## Product requirement note

- Balls must visibly and realistically bounce in-game, especially inside jars, without frequent exaggerated bounce-outs.
- Scoring should trigger on clean jar entry (not delayed until full settlement).
- HUD must use a physical-panel red segmented LED scoreboard style for all key counters (score, timer, balls remaining).

## Status

- ⏳ Phase 6 — Physics-Driven Bounce + Entry Scoring (not started)
- ⏳ Phase 7 — Real Scoring Rules (not started)
- ⏳ Phase 8 — Orbit + Gameplay Controls (not started)
- ⏳ Phase 9 — Audio Event Mapping + Mobile Unlock (not started)
- ⏳ Phase 10 — Debug Controls + E2E Expansion (not started)
- ⏳ Phase 11 — Live Gameplay Tuning Controls (not started)
- ⏳ Phase 12 — Arcade Cabinet Shell Rendering (not started)
- ⏳ Phase 13 — Electron Packaging + Windows Offline Build (not started)

---

## Phase 6 — Physics-Driven Bounce + Entry Scoring

### Tasks

1. Replace placeholder ball-settled event creation with real physics/collision-derived clean-entry events.
2. Tune ball physics/material parameters (restitution, damping, mass, friction) for realistic visible bounces, including in-jar bounce behavior.
3. Prevent exaggerated bounce-outs after jar entry while preserving realism-first behavior.
4. Keep `ScoringSystem.onBallSettled(event)` API unchanged.
5. Keep `dropBallState(state, scoreDelta, bonusTimeDelta)` as the single reducer for drop+reward transitions.
6. Add deterministic integration tests for event emission and state transitions.

### Acceptance

- Balls visibly and realistically bounce (rim and bottom bounce visibility treated equally).
- Balls bounce inside jars without frequent exaggerated bounce-outs.
- Score updates on clean jar-entry events from real collision context.
- Existing tests pass; new bounce/entry-scoring tests are stable.

---

## Phase 7 — Real Scoring Rules

### Tasks

1. Implement jar-specific values and center-accuracy weighting.
2. Add streak/bonus logic via `scoreDelta` + `bonusTimeDelta` outputs.
3. Add/expand scoring unit tests (including edge and regression cases).

### Acceptance

- Scoring behavior is deterministic and documented in tests.
- Coverage remains at or above project thresholds.

---

## Phase 8 — Orbit + Gameplay Controls

### Tasks

1. Keep `OrbitSystem.update(dt)` deterministic and frame-rate independent.
2. Introduce pause/slow-motion/modifier inputs internally without API changes.
3. Add deterministic tests for speed scaling and pause behavior.

### Acceptance

- Orbit behavior is consistent across frame rates.
- Controls work without breaking system contracts.

---

## Phase 9 — Audio Event Mapping + Mobile Unlock

### Tasks

1. Keep `AudioSystem.play(event)` as the only public audio trigger.
2. Map existing events to concrete SFX/music assets.
3. Implement first-user-interaction audio unlock flow for browser/mobile autoplay policy compliance.

### Acceptance

- Core gameplay events trigger audible feedback.
- Audio works reliably after user interaction on mobile browsers.

---

## Phase 10 — Debug Controls + E2E Expansion

### Tasks

1. Implement HUD as a physical-panel red segmented LED scoreboard for score, timer, and balls remaining.
2. Wire debug menu controls to real commands (spawn ball, add time, toggle speed, etc.).
3. Keep debug features behind `?debug=1`.
4. Expand Playwright coverage for live debug controls and gameplay assertions.
5. Add a feature-complete policy: every major shipped feature must include at least one new focused E2E regression test.

### Acceptance

- Score, timer, and balls remaining render with the red segmented LED physical-panel style.
- Debug controls operate only in debug mode.
- E2E coverage validates critical gameplay loop.
- Major feature deliveries include corresponding E2E regression coverage.

---

## Phase 11 — Live Gameplay Tuning Controls

### Tasks

1. Add debug-menu controls/sliders for bounciness/restitution, jar diameter, jar height, ring diameter, and drop distance.
2. Add debug-menu camera controls for distance/zoom plus orientation (pitch/yaw/framing) tuning.
3. Route tunable values through centralized gameplay config so changes are reflected immediately and testably.
4. Persist/restore tuning presets in dev mode for quick balancing loops.
5. Add unit/integration coverage for config application and runtime updates.

### Acceptance

- Requested tuning controls are available in debug mode and visibly affect gameplay.
- Tuning changes apply deterministically without breaking round-state contracts.

---

## Phase 12 — Arcade Cabinet Shell Rendering

### Tasks

1. Build an arcade-machine shell around the playfield using `example.jpg` as visual reference.
2. Keep the background/environment simple and neutral while making the cabinet framing prominent.
3. Verify readability of gameplay + LED scoreboard within the cabinet framing.
4. Add representative screenshots for the feature.

### Acceptance

- Playfield is framed by a recognizable arcade cabinet shell matching project art direction.
- Gameplay visibility and HUD readability remain strong.

---

## Phase 13 — Electron Packaging + Windows Offline Build

### Tasks

1. Add Electron app wrapper for desktop runtime.
2. Configure packaging pipeline for Windows distributables suitable for offline arcade PCs.
3. Add a GitHub Actions release workflow that builds the Electron app and uploads packaged artifacts (Windows first).
4. Document build/run/package/release workflow in `README.md` and/or `docs/dev-setup.md`.
5. Add smoke E2E coverage (or equivalent automated checks) for packaged desktop startup path where feasible.

### Acceptance

- Project can be packaged as a Windows desktop build via Electron tooling.
- GitHub Actions can build/package Electron artifacts and attach them to a release.
- Offline startup path is documented and reproducible.

---

## Definition of Done (Gameplay Plan)

1. Real physics clean-entry events drive scoring.
2. Real scoring rules + audio mapping are implemented.
3. Existing public contracts stay stable:
   - `OrbitSystem.update(dt)`
   - `ScoringSystem.onBallSettled(event)`
   - `AudioSystem.play(event)`
   - `testBridge.stepFrames(n)`
4. `npm run check` and `npm run test:e2e` pass consistently.
