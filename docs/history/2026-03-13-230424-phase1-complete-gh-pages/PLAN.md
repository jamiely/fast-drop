# PLAN — Bootstrap First (Build/Test Focus)

## Objective
Bootstrap a production-ready TypeScript game project with strong dev workflow and testing foundations first, while using placeholders for gameplay systems.

## Status
- ✅ Phase 0 — Repository Initialization (completed)
- ✅ Phase 1 — Project Skeleton (completed)
- 🚧 Phase 2 — Testing Foundation (in progress)

---

## Phase 0 — Repository Initialization

### Tasks
1. Initialize Vite + TypeScript project.
2. Add core dependencies:
   - `three`
   - `@dimforge/rapier3d-compat`
3. Add quality/tooling dependencies:
   - `vitest`
   - `@vitest/coverage-v8`
   - `playwright`
   - `eslint`, `@typescript-eslint/*`
   - `prettier`, `eslint-config-prettier`
   - `npm-run-all` (optional script orchestration)
4. Add scripts for dev/build/test/lint/e2e.

### Deliverables
- `package.json` scripts and dependency baseline
- `tsconfig.json` + `tsconfig.node.json`
- Vite config + Vitest config
- Playwright config

### Acceptance
- `npm run dev` starts with HMR
- `npm run build` succeeds
- `npm run test` succeeds
- `npm run test:e2e` runs a smoke test

---

## Phase 1 — Project Skeleton (Placeholder Runtime)

### Tasks
Create modular folder structure with placeholder systems and no heavy gameplay yet.

### Proposed structure
```txt
src/
  main.ts
  app/App.ts
  game/
    Game.ts
    config.ts
    state.ts
    types.ts
  scene/
    SceneRoot.ts
    camera.ts
    lighting.ts
  physics/
    PhysicsWorld.ts
  entities/
    Ball.ts
    Jar.ts
  systems/
    OrbitSystem.ts
    ScoringSystem.ts
    InputSystem.ts
    UISystem.ts
    AudioSystem.ts
  ui/
    hud.ts
    debugMenu.ts
  testhooks/
    testBridge.ts
public/
  audio/
    drop.wav (placeholder)
```

### Placeholder behavior in this phase
- Render a basic Three scene (neutral background, simple lights, static geometry).
- Initialize Rapier world (no complex colliders yet).
- Instantiate 5 placeholder jars in a ring.
- Add button/space input that only decrements balls and logs events.
- HUD shows timer/score/balls with mock state updates.
- Debug menu visible in `?debug=1` mode with non-functional controls wired to stubs.

### Acceptance
- App loads and renders scene + placeholder jars
- Input updates HUD counters
- Debug menu can open in debug mode

---

## Phase 2 — Testing Foundation (Before Full Gameplay)

### Tasks
1. Unit tests (Vitest):
   - orbit math utility
   - timer countdown reducer
   - ball economy reducer
   - bonus time award function
2. Integration tests (Vitest):
   - game loop `tick()` transitions state predictably
   - `dropBall()` updates `ballsRemaining`
3. E2E tests (Playwright):
   - launch app and verify HUD visible
   - perform drop action and verify HUD changes
   - debug mode smoke (`?debug=1`) verifies menu appears

### Acceptance
- All tests pass locally
- Coverage generated (`coverage/`)
- No flaky test behavior in 3 consecutive runs

---

## Phase 3 — Dev Experience + CI

### Tasks
1. Add lint + format + typecheck scripts.
2. Add pre-commit hooks (optional) for lint/test subset.
3. Add CI workflow (GitHub Actions):
   - install
   - typecheck
   - lint
   - unit/integration tests
   - Playwright e2e (headed off / chromium)
4. Artifact uploads for:
   - coverage report
   - Playwright traces on failure

### Acceptance
- CI passes on clean clone
- Playwright trace available when e2e fails

---

## Phase 4 — Placeholder-to-Feature Hand-off

> Still not full gameplay implementation; this phase prepares clean hand-off.

### Tasks
1. Finalize interfaces for real systems:
   - `OrbitSystem.update(dt)`
   - `ScoringSystem.onBallSettled(...)`
   - `AudioSystem.play(event)`
   - `testBridge.stepFrames(n)`
2. Add TODO markers and implementation contracts in each placeholder module.
3. Document implementation order for next phase.

### Acceptance
- Team can implement gameplay without changing tooling/test foundation
- Interfaces stable and covered by baseline tests

---

## Scripts (Target)
```json
{
  "dev": "vite",
  "build": "tsc -b && vite build",
  "preview": "vite preview",
  "typecheck": "tsc -b --pretty",
  "lint": "eslint .",
  "format": "prettier --write .",
  "test": "vitest run --coverage",
  "test:watch": "vitest",
  "test:e2e": "playwright test",
  "test:e2e:ui": "playwright test --ui",
  "check": "npm-run-all -s typecheck lint test"
}
```

---

## Initial Config Defaults (for placeholders)
- `ballsTotal = 50`
- `timeStartSeconds = 30`
- `bonusTimeSeconds = 3`
- `jarCount = 5`
- `bonusBucketCount = 2`
- `orbitRadius = 3 * jarDiameter`
- `ringAngularSpeed = constant`

---

## Risks + Mitigations
- **Realtime test flakiness** → use deterministic tick + testBridge frame stepping.
- **Mobile input differences** → early Playwright mobile viewport smoke tests.
- **Audio autoplay restrictions** → unlock audio on first user interaction.

---

## Definition of Done (Bootstrap)
Bootstrap is complete when:
1. Build/dev/test/e2e/lint/typecheck all work from clean install.
2. Placeholder game loop + HUD + debug menu run end-to-end.
3. CI validates all above automatically.
4. Repo is ready for real gameplay implementation with minimal rework.
