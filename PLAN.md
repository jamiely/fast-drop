# PLAN — Electron Packaging, Release Automation, and Final Polish

## Status

Active as of 2026-03-14.

Progress snapshot (2026-03-14):

- [x] Phase A — Electron packaging hardening
- [x] Phase B — Windows offline artifacts
- [x] Phase C — GitHub release automation
- [ ] Phase D — Final polish pass
- [x] Phase E — Documentation + artifacts (desktop/release docs)

Previous completed plan archived at:

- `docs/history/2026-03-14-plan-round-flow-summary-complete/PLAN.md`

## Objective

Complete the remaining `RESEARCH.md` milestones:

- Milestone 11: Desktop packaging (Electron + Windows offline build)
- Milestone 12: Tuning + polish (audio/visual quality and UX cleanup)

## Remaining Scope (from research)

In scope:

- Electron app packaging for offline play
- Windows build artifacts (portable + installer)
- GitHub Actions release automation for desktop artifacts
- Final gameplay/audio/visual polish tasks
- Documentation for build, release, and offline deployment

Out of scope:

- New gameplay mechanics beyond existing round flow
- Large art-direction pivot or engine migration

---

## Phase A — Electron packaging hardening

### Tasks

1. Audit current Electron entry/build wiring (`electron/`, `package.json` build config).
2. Validate production app boot path from packaged assets (`dist/` loading and routing).
3. Ensure app behavior parity with web build:
   - controls
   - debug flag behavior
   - round flow and overlay behavior
4. Add/refresh smoke checks for Electron launch/startup.

### Acceptance

- Electron app boots from packaged assets without manual dev server.
- Core gameplay loop works in Electron the same as web.
- Existing tests remain green.

---

## Phase B — Windows offline artifacts

### Tasks

1. Produce Windows artifacts via `electron-builder`:
   - portable executable
   - installer artifact
2. Verify output naming/versioning conventions.
3. Validate artifact startup expectations for offline arcade PCs.
4. Document artifact locations and manual verification steps.

### Acceptance

- Windows artifacts build reproducibly from CI-compatible commands.
- Artifacts are suitable for offline deployment.

---

## Phase C — GitHub release automation

### Tasks

1. Add GitHub Actions workflow to build Electron Windows artifacts on tags/releases.
2. Upload artifacts to GitHub Releases.
3. Keep quality gates in workflow path (lint/tests/coverage as appropriate).
4. Add clear failure diagnostics and artifact retention settings.

### Acceptance

- Tag/release trigger generates downloadable Windows desktop artifacts.
- Release workflow is documented and repeatable.

---

## Phase D — Final polish pass

### Tasks

1. Audio polish:
   - verify drop/hit/bonus/game-over cues are distinct and balanced
   - prevent clipping/stacking artifacts
2. Gameplay feel polish:
   - validate drop cadence/cooldown and bonus pacing remain fun
   - spot-check long rounds (40–60s target with strong play)
3. Visual/UI polish:
   - verify HUD readability on desktop/mobile
   - verify summary overlay readability and spacing
4. Stability polish:
   - rerun flaky-sensitive e2e paths and keep deterministic hooks reliable

### Acceptance

- Audio, gameplay feel, and UI are coherent and stable.
- No regressions in quality checks and e2e.

---

## Phase E — Documentation + artifacts

### Tasks

1. Update `README.md` with:
   - Electron run/build instructions
   - Windows artifact/release usage notes
   - representative screenshots (menu/gameplay/summary)
2. Add/update `docs/dev-setup.md` for desktop packaging + release workflow.
3. Store new screenshots/historical artifacts under `docs/history/timestamp-x/`.

### Acceptance

- README and docs reflect current desktop release workflow.
- Screenshot/history requirements are satisfied.

---

## File-level implementation map

- `electron/main.mjs` — desktop boot behavior
- `electron/preload.*` (if present) — desktop bridge/security
- `package.json` — electron-builder config/scripts
- `.github/workflows/*` — release pipeline for Electron artifacts
- `scripts/electron-smoke.mjs` — startup verification
- `README.md` — usage + release docs + screenshots
- `docs/dev-setup.md` — developer packaging/release instructions

---

## Execution order

1. Phase A
2. Phase B
3. Phase C
4. Phase D
5. Phase E

---

## Definition of Done

- Electron desktop packaging is production-ready.
- Windows artifacts are built and published through GitHub Releases.
- Final polish tasks are complete with no quality regressions.
- Documentation and screenshots are updated for developers and users.
