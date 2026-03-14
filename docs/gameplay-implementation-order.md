# Gameplay Implementation Order (Post-Bootstrap)

This document captures the hand-off order after Phase 4 so gameplay can be implemented without changing tooling, test harnesses, or CI quality gates.

## 1) Ball settlement pipeline (first)

1. Replace `Game.createPlaceholderBallSettledEvent()` with a real event from physics + collision context.
2. Keep `ScoringSystem.onBallSettled(event)` signature unchanged.
3. Keep `dropBallState(state, scoreDelta, bonusTimeDelta)` as the single state reducer for ball consumption + rewards.

## 2) Real scoring rules

1. Implement jar-specific values, center-accuracy weighting, and streak bonuses in `src/systems/ScoringSystem.ts`.
2. Preserve return contract:
   - `scoreDelta`
   - `bonusTimeDelta`
3. Add/expand unit tests in `tests/unit/systems-basic.test.ts` (or split to a dedicated scoring test file).

## 3) Orbit/gameplay coupling

1. Keep `OrbitSystem.update(dt)` deterministic and frame-rate independent.
2. Add gameplay controls (pause, modifiers, slow-motion) as inputs to internals, not as API changes.
3. Validate behavior with deterministic unit tests similar to `tests/unit/orbit.test.ts`.

## 4) Audio event mapping

1. Keep `AudioSystem.play(event)` as the only public trigger.
2. Map existing events (`drop`, `ball-settled`, `bonus-awarded`, `time-warning`, `game-over`) to concrete SFX/music.
3. Add browser/mobile audio unlock flow while preserving this event API.

## 5) Test bridge expansion

1. Keep `testBridge.stepFrames(n)` contract stable for deterministic tests.
2. Add optional bridge methods only when needed (spawn ball, set timer, etc.) without breaking existing calls.
3. Keep frame-step normalization deterministic via `normalizeStepFrameCount`.

## 6) UI/debug upgrades

1. Wire debug menu controls to real game commands after system APIs are implemented.
2. Keep debug mode behind `?debug=1`.
3. Extend Playwright smoke coverage only after controls are live.

## Definition of done for gameplay phase start

- Existing `npm run check` and `npm run test:e2e` remain green.
- No signature changes required for:
  - `OrbitSystem.update(dt)`
  - `ScoringSystem.onBallSettled(event)`
  - `AudioSystem.play(event)`
  - `testBridge.stepFrames(n)`
