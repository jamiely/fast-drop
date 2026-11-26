# Fever score board: verification

The board above the machine is now Fever's main readout (`src/juice/board.ts`, pure logic in
`src/juice/boardLogic.ts`). Classic's `StatusDisplay.ts` is unchanged: the board follows the display without
joining its group, so the portrait fit measures the same objects.

## Screenshots (system Chrome, scripted hits through the test bridge)

| State                        | File                                       |
| ---------------------------- | ------------------------------------------ |
| Calm, mid-round (1050×1680)  | `calm.png`                                 |
| Hot with an 11 combo         | `hot-combo.png`                            |
| FEVER                        | `fever.png`                                |
| Last 10 s                    | `last-10s.png`                             |
| Balls tumbling from counter  | `tumbling-balls.png`                       |
| FEVER at 720×1280 / 720×1680 | `fever-720x1280.png`, `fever-720x1680.png` |

## Performance (M1, system Chrome, headed GPU via ANGLE, 1050×1680)

240 rAF frames each with extra hits and drops during the sample (`/tmp/fever-board/perf.mjs`):

| Tier  | Mean frame | Max frame    | Max draw calls | Juice CPU    | Live particles |
| ----- | ---------- | ------------ | -------------- | ------------ | -------------- |
| Hot   | 16.65 ms   | 18.1–18.7 ms | 120            | 0.22 ms      | 4              |
| FEVER | 16.66 ms   | 18.2–19.6 ms | 120            | 0.44–0.51 ms | 818            |

The board adds up to seven draws: bulbs, halos, cracks, score plate, dial alarm, tumbling balls and steam
(the alarm, cracks and steam only when shown). The frame is vsync-bound at 60 Hz; the e2e still checks ≤ 150 calls
and juice CPU < 1 ms in FEVER.

## Checks

- `npm run format:check`, `npm run lint`: pass
- `npm run test`: 116 passed; `npm run coverage`: 96.6 % lines (`board.ts` excluded with the other three.js render
  modules; `boardLogic.ts` 100 %)
- `npx playwright test -c /tmp/fever-board/pw.config.mjs` (system Chrome): 15 passed, three runs in a row
- `npm run test:classic-bundle`: PASS
