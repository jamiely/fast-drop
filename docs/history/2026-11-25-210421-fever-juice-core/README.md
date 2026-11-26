# Fast Drop Fever — juice core

Production Fever build, captured in headless **system Google Chrome** at **1050×1680**, device scale factor 1. The locally downloaded Playwright Chromium is broken; no browser/config workaround is committed to the project.

These are scripted settlements using `window.__FAST_DROP_TEST_BRIDGE__.scriptJarHit(1)`, the same `Game.processSceneSettlements` scoring/effects path as jar entries. They do not represent physically dropped balls: balls remaining stays 50. Between hits the bridge steps 90 frames; after the final hit it steps 12 frames and pauses for the screenshot. Startup logo and CSS stamp transitions finish before capture. No UI is hidden or injected.

| Capture           | State                                            | Score | Largest framing NDC |
| ----------------- | ------------------------------------------------ | ----- | ------------------- |
| `jar-hit.png`     | 1 combo, ×1, cyan confetti and +10               | 10    | 0.9399999992        |
| `combo-stamp.png` | 5 combo, warm, ×2, +20 ×2 popup                  | 60    | 0.9400022178        |
| `fever.png`       | 15 combo, FEVER with 5.8 s left, ×3, orbit 1.25× | 320   | 0.9425112695        |

Capture script reported `Browser errors: []`. All three images were opened and inspected.

The production browser check uncovered a dynamic-import/top-level-await cycle: the Fever chunk imported Three exports from the still-initializing main entry. Emitting Three as a shared Vite chunk fixes that cycle. Screenshots also revealed overlapping score/milestone popups; nearby fresh popups now use separate vertical lanes, with a regression assertion in the Fever e2e.

This slice adds no bloom, LED patterns, machinery, music, attract mode or Electron release changes. Performance on the cabinet/GT 1030 has not been measured.
