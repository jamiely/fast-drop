# PLAN — Post-Completion Follow-ups

Previous gameplay delivery plan was archived to:

- `docs/history/2026-03-14-plan-phase6-13-complete/PLAN.md`

## Goal

Track remaining items that are still called out in `RESEARCH.md` but are not fully implemented yet.

## Remaining items from RESEARCH

### 1) Round flow + end-of-round overlay

Status: ⏳ Not started

- Add explicit round/game phase model (`idle | countdown | playing | ended`).
- End round when:
  - `timeRemaining <= 0`, or
  - `ballsRemaining === 0` and all active balls resolve.
- Add end-of-round summary overlay with:
  - final score,
  - hits,
  - misses,
  - accuracy.

### 2) State accounting for hits/misses/accuracy

Status: ⏳ Not started

- Extend runtime state with deterministic counters for landed/missed balls.
- Use settlement + miss cleanup events to update stats.
- Add unit tests for round accounting.

### 3) E2E for round completion and summary

Status: ⏳ Not started

- Add Playwright regression that validates round-end conditions.
- Add Playwright regression that validates summary overlay content.

### 4) Optional gameplay throttle (from TODO)

Status: ⏳ Not started

- Evaluate short drop cooldown (50–100ms) to avoid unbounded burst spawning.
- Keep rapid play feel; apply only if needed for stability/tuning.

## Definition of done for this follow-up plan

- Round can start, play, and end deterministically.
- End-of-round summary overlay is shown and test-covered.
- Hit/miss/accuracy counters are correct and reflected in UI.
- `npm run check` and `npm run test:e2e` remain green.
