# RESEARCH

## Project Goal

Build a 3D timing-based arcade game (Quick Drop-like): the player drops balls from a fixed spawn point into rotating jars before time expires.

## Confirmed Requirements

- **Tech:** TypeScript + Vite
- **Hot reload:** required
- **Tests:** required
- **Physics:** use a modern/popular option (Rapier approved)
- **Platform:** desktop + mobile web
- **Visual style:** realistic
- **Gameplay:**
  - fixed amount of balls per round (start with **50**)
  - player can drop rapidly (no one-ball lock)
  - strict/real collisions in V1 (including rim bounces), not only simplified scoring volumes
  - standard starting timer around **30s**
  - bonus bucket mechanic: hitting a **BONUS** bucket adds about **+3s**
  - strong play should be able to extend rounds to roughly **40–60s** total
  - score increases with successful bucket landings (arcade high-score style)
  - no jackpot system in V1
  - include a simple cabinet frame around the playfield (no full environment scene)
  - simple audio cue when a ball is dropped

## Visual Reference (`example.jpg`)

- Arcade machine-inspired presentation
- Bright glossy plastics/metals, strong color accents
- Focus gameplay elements front-and-center
- **No environmental background/setting required** (use clean neutral backdrop)

## Source Context (from `PROMPT.md`)

- Jars rotate around a central axis on a circular track.
- Player has one core action: drop a ball now.
- Ball falls under gravity; scoring is based on timing jar alignment under the drop path.
- V1 should include:
  - fixed camera
  - one rotating ring of jars
  - fixed drop point
  - input to drop ball (space/click/tap)
  - timer + score UI
  - end-of-round overlay
  - cleanup of missed balls

## Recommendation: Rendering/Framework Direction

### Chosen recommendation: **Vanilla Three.js + Rapier (no full game engine)**

Reasoning:

- Tight control of simulation loop and timing gameplay
- Lower abstraction for physics-heavy interactions
- Easier to reason about deterministic behavior
- Vite already provides strong HMR for development

If we later need faster UI composition, we can still add a thin React HUD layer without migrating 3D runtime.

## Proposed Stack

- **Runtime:** TypeScript
- **Bundler/dev:** Vite (HMR)
- **3D:** Three.js
- **Physics:** `@dimforge/rapier3d-compat`
- **Audio SFX:** arcade-style generated effects (SFXR-style), played via native Web Audio/HTMLAudio wrapper
- **Unit/integration tests:** Vitest
- **E2E/browser tests:** Playwright
- **Lint/format:** ESLint + Prettier

## Physics/Gameplay Model (V1)

### Ball/Jar interaction

- Real rigid-body dynamics in Rapier
- Balls are dynamic spheres
- Jars have colliders representing walls/rim/bottom so rim bounces are physically plausible
- Score event occurs when a ball settles within a jar capture volume (or passes a capture plane inside jar without escaping)

### Orbiting jars

- Kinematic jar rigs orbit center:
  - `x = cx + cos(angle) * r`
  - `z = cz + sin(angle) * r`
  - `y = constant`
  - `angle += omega * dt`
- All jars rotate together as one ring at constant speed
- Jars remain upright while orbiting
- V1 defaults:
  - `jarCount = 5`
  - all jars are identical size
  - ring speed is constant
  - `orbitRadius = 3 * jarDiameter` (initial tuning baseline)

### Round economy

- `ballsTotal = 50` (initial)
- `ballsRemaining` decreases per drop
- Player may spam drops until remaining reaches 0
- `timeRemaining` starts at `30s`
- Landing in a BONUS bucket adds `+3s`
- BONUS provides time extension only (no extra score multiplier by default)
- `bonusBucketCount = 2` (of 5 jars)
- BONUS designation is attached to bucket entities for the round (buckets move with ring as normal)

### Round end/result model (current)

- Round ends when `timeRemaining <= 0`
- Round also ends when `ballsRemaining === 0` and all active balls have resolved
- No binary jackpot/win target in V1; outcome is final score (high-score style)
- Show end-of-round summary overlay (score, hits, misses, accuracy)

### Baseline defaults (current)

- `ballsTotal = 50`
- `timeStartSeconds = 30`
- `bonusTimeSeconds = +3` (on BONUS bucket)
- `jarCount = 5`
- `orbitRadius = 3 * jarDiameter`

## Game State Model (draft)

- `idle | countdown | playing | won | lost`
- `timeRemaining`
- `ballsTotal | ballsRemaining | ballsDropped`
- `requiredBalls | scoredBalls | missedBalls`
- active entities: `balls[]`, `jars[]`

## Input Model (draft)

- Desktop: `Space`, left-click
- Mobile: tap button (large thumb target)
- Optional: prevent absurd burst by tiny fire-rate cap (e.g., 50–100ms) for stability

## Testing Strategy

### Unit tests (Vitest)

- Orbit math (position from angle/radius)
- Round-end logic (`timeRemaining`, `ballsRemaining`, active-ball resolution)
- Ball economy logic (`remaining`, drop limits)
- BONUS time-award logic (`+3s` on bonus bucket hit)
- Timer transitions

### Integration tests (Vitest)

- Fixed-timestep loop updates state deterministically
- Drop command spawns ball entity and decrements `ballsRemaining`
- Score/time HUD state updates after hit/miss events

### Functional/E2E tests (Playwright) — primary browser-level validation

- Start game → drop balls → HUD updates (score/time/remaining)
- BONUS bucket hit increases timer by expected amount
- Round ends correctly on timer expiry
- Mobile viewport smoke tests for controls/HUD

### Real-time testing notes (important)

- Use **fixed timestep** simulation and expose a **test mode** hook to step N frames deterministically.
- Add a **debug/test menu** (dev/test builds only) to speed validation.
- In Playwright, assert on **state/HUD outcomes**, not exact per-frame pixel positions.
- Keep frame-tolerant assertions (timing windows) to avoid flaky realtime tests.

### Debug/Test Menu (dev + test only)

Expose guarded controls behind a `?debug=1` flag or `import.meta.env.DEV`:

- pause/resume simulation
- single-step frame / step N frames
- set timer value
- set score value
- set balls remaining
- force next bucket to BONUS hit path (or mark selected buckets as BONUS)
- spawn test ball at configurable position/velocity
- speed multiplier (0.5x / 1x / 2x)
- show physics/debug overlays (colliders, bucket IDs, bonus markers)

## Milestone Plan

1. Bootstrap project (Vite + TS + Three + Rapier + test tooling)
2. Core loop + fixed timestep physics integration
3. Base scene + realistic lighting/material setup (initial)
4. Rotating jars (kinematic bodies)
5. Ball spawning + collisions + scoring detection
6. HUD + timer + ball counters + overlays
7. Mobile control layout + responsive UI
8. Tests (unit/integration/e2e) and CI script setup
9. Tuning + polish (audio, particles, camera shake optional)

## File/Module Sketch

- `src/main.ts` – bootstrap
- `src/game/Game.ts` – orchestration loop
- `src/game/state.ts` – round/game state
- `src/game/config.ts` – constants and difficulty params
- `src/scene/` – camera, lights, materials, environment
- `src/physics/` – Rapier world, bodies, stepping
- `src/entities/Ball.ts`, `src/entities/Jar.ts`
- `src/systems/ScoringSystem.ts`, `src/systems/OrbitSystem.ts`, `src/systems/UISystem.ts`
- `src/ui/` – HTML/CSS HUD hooks
- `tests/unit/*`, `tests/integration/*`, `tests/e2e/*`

## Open Questions (Need Answers)

- None blocking right now.
- Optional later decisions: audio style, score balancing curve, visual polish priorities.

## Implementation Notes To Confirm

- Fixed timestep simulation (60Hz) + render interpolation
- Decouple render loop from physics step accumulator
- Centralized gameplay config for fast iteration
- Mobile-first HUD constraints (safe-area + large buttons)
