# PLAN — Round Flow, Summary Overlay, and Remaining Research Items

## Status

Completed on 2026-03-14:

- Phase A ✅
- Phase B ✅
- Phase C ✅
- Phase D ✅
- Phase E ✅
- Phase F ✅ (drop cooldown implemented + debug tuning)

Previous completed gameplay plan is archived at:

- `docs/history/2026-03-14-plan-phase6-13-complete/PLAN.md`

## Objective

Complete the remaining requirements from `RESEARCH.md` by adding deterministic round lifecycle handling, end-of-round summary UI, hit/miss/accuracy accounting, and regression coverage.

## Scope

In scope:

- round lifecycle state and transitions
- round-end conditions
- hit/miss/accuracy counters
- end-of-round overlay UI
- unit + integration + e2e coverage
- optional drop throttle (if it improves stability without harming feel)

Out of scope:

- major physics rewrites
- visual art overhauls outside the new round summary UI

---

## Phase A — Round lifecycle model

### Tasks

1. Extend game state to include round phase:
   - `idle | countdown | playing | ended`
2. Add round transition reducers/selectors:
   - `startRound`
   - `endRound`
   - `canDropBall`
3. Ensure deterministic transitions in fixed-step flow.
4. Keep existing public contracts stable where possible:
   - `OrbitSystem.update(dt)`
   - `ScoringSystem.onBallSettled(event)`
   - `AudioSystem.play(event)`
   - `testBridge.stepFrames(n)`

### Acceptance

- Round starts in a known phase and transitions predictably.
- Drops only happen in valid phases.
- Existing tests remain green.

---

## Phase B — Hit/miss/accuracy accounting

### Tasks

1. Extend runtime state with counters:
   - `hits`
   - `misses`
   - `ballsDropped`
2. Add deterministic event plumbing for:
   - clean-entry settlement => `hits +1`
   - unresolved/cleanup miss => `misses +1`
3. Add derived `accuracy` selector:
   - `hits / max(1, hits + misses)`
4. Add unit tests for all branches:
   - no attempts
   - only misses
   - mixed outcomes
   - late round edge cases

### Acceptance

- Counters are correct and deterministic.
- Accuracy value is stable and matches expected math.
- Coverage remains at/above project threshold.

---

## Phase C — Round-end conditions

### Tasks

1. End round on timer expiry (`timeRemaining <= 0`).
2. End round when:
   - `ballsRemaining === 0`
   - and all active balls are resolved (hit/miss/frozen/cleaned).
3. Expose read-only “round ended” state for UI and tests.
4. Add integration tests for both end paths.

### Acceptance

- Both end conditions are deterministic and test-covered.
- No premature round ends while active balls remain unresolved.

---

## Phase D — End-of-round summary overlay

### Tasks

1. Add overlay UI rendered only when round phase is `ended`.
2. Show:
   - final score
   - hits
   - misses
   - accuracy (%)
3. Add “Play Again” action to reset round deterministically.
4. Ensure HUD/overlay coexist cleanly on desktop and mobile layouts.

### Acceptance

- Overlay appears exactly at round end.
- Values match state.
- Restart begins a fresh round with reset counters.

---

## Phase E — E2E regression expansion

### Tasks

1. Add Playwright test: round ends on timer expiry and summary appears.
2. Add Playwright test: round ends after balls exhausted + resolution.
3. Add Playwright test: summary values are non-empty and internally consistent.
4. Keep debug-gated controls only under `?debug=1`.

### Acceptance

- New e2e tests are stable locally and in CI.
- Existing smoke tests remain green.

---

## Phase F — Optional drop throttle (TODO)

### Tasks

1. Add configurable drop cooldown (`0–100ms`, default tuned from playtest).
2. Keep space/click/tap responsiveness high.
3. Add deterministic tests for cooldown behavior.
4. Add debug control for cooldown tuning (dev/debug mode only).

### Acceptance

- Ball spam is bounded when cooldown is enabled.
- Gameplay still feels fast; no perceived input lag at chosen default.

---

## File-level implementation map

- `src/game/types.ts` — round phase + stats types
- `src/game/state.ts` — reducers/selectors for phase and stats
- `src/game/Game.ts` — round-end orchestration + transitions
- `src/scene/SceneRoot.ts` — miss-resolution event signal if needed
- `src/systems/UISystem.ts` + `src/ui/*` — summary overlay wiring
- `tests/unit/state.test.ts` — phase/stats reducer tests
- `tests/unit/game.test.ts` — orchestration and end-condition tests
- `tests/e2e/*.spec.ts` — round-end and summary assertions
- `README.md` / `docs/dev-setup.md` — behavior and test updates

---

## Execution order

1. Phase A
2. Phase B
3. Phase C
4. Phase D
5. Phase E
6. Phase F (optional, based on feel/stability)

---

## Definition of Done

- Remaining research requirements are implemented and documented.
- Round lifecycle and summary overlay are deterministic and test-covered.
- Hit/miss/accuracy counters are accurate and visible.
- `npm run check` and `npm run test:e2e` pass.
