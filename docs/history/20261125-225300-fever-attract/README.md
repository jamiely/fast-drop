# Fever attract mode — 1050×1680

After 20 real seconds without input on the ended screen, Fever starts a demo using the normal ball, orbit, settlement, scoring and light-show paths. Launch still starts a real round. Demo end returns to game over and a fresh 20-second wait. The first Space/tap/click starts a real 50-ball round without dropping; the normal game-over restart lock does not delay a demo exit. No score submission or persistence exists in Game.

The autopilot predicts jar arrival at the ball's entry plane from signed orbit speed and fall time, then aims paired drops 200 ms apart. Small ±15 ms jitter and correlated late-aim streaks keep it fallible (17 of 26 aims target hits), while allowing warm/hot combos and occasional FEVER. Demo sound uses Fever's procedural bus at 40% master gain; duplicate classic cues are suppressed in the demo. Audio still requires a first user gesture.

## Captures

Both PNGs were generated in system Chrome and visually inspected:

- `attract.png`: 12 wall-clock seconds into an unassisted demo; pulsing PRESS DROP panel below the cabinet, balls in flight and a natural jar-hit celebration.
- `attract-fever.png`: genuine autopilot drops reached 15 consecutive hits, with the full FEVER show and PRESS DROP panel. For this separate capture, the existing `stepFrames(10)` bridge accelerated physics and `startAttract()` skipped waits between demos; no scripted hits were injected. Bridge snapshot at capture request: 20 drops, 17 hits, 3 misses, combo 15, heat FEVER, 6 seconds of FEVER remaining, portrait maxNdc 0.94. Live animation continued while Chrome captured the PNG.

## 60-second proof

Command: `node /tmp/fever-att/proof.mjs` (throwaway script, outside the repository). System Chrome, 1050×1680, real animation time; no accelerated frames after initially forcing game over and skipping the first idle wait. A non-drop key unlocked audio. The first demo ended naturally, waited 20 seconds, and the next demo started automatically.

Final output:

```text
elapsedMs: 60003.8
round 1: ended, 35 drops, 19 hits, 14 misses, score 360
round 2: playing, 6 drops, 4 hits, 0 misses, score 40
total: 41 drops, 23 hits, 14 misses, 4 unresolved
resolved hit rate: 23 / 37 = 62.2%
highest heat: fever
max portrait NDC over all demo frames: 0.9846621034534593
console/page errors: []
mouse exit: phase playing, attract round, 50 balls, 0 drops, 0 hits, 0 misses, score 0
```

The committed Fever e2e also forces game over, starts attract, observes the banner and increasing drops without input, then verifies Space and a full mouse gesture each start an untouched real round and keep portrait framing inside NDC 1.

## Local verification setup

Playwright's bundled Chromium is broken locally. `/tmp/fever-att/pw.config.mjs` copies the existing external system-Chrome config, using ports 4673/4674. The production test configuration and dependencies are unchanged. Run `npx playwright test --config /tmp/fever-att/pw.config.mjs` for both classic and Fever projects. No browser installation was attempted.
