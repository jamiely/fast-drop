# Fast Drop Fever: Drop Pocket finale

Original synthesized D-minor-ninth disco pocket: four-on-the-floor kick, octave-jumping bass, swept band-pass guitar stabs, string swell, detuned brass and resolving chord. Full score is three bars at 150 BPM (4.8 seconds); the short tag reuses the material in 1.5 seconds. Classic audio is untouched.

The existing rank stamp is immediate (no animation delay). As agreed during implementation, brass lands at t=0 and strings rise from just after the stamp into the tally's resolving chord, rather than delaying the stamp for a pickup. Visuals, tally, skip gate and celebration timing are unchanged. Skip cancels the score and stops its live/pending sources; reset uses the existing voice cleanup.

## Verification

- `npm run format`, `npm run format:check`, `npm run lint`: pass.
- `npm run test`: 22 files, 120 tests pass.
- `npm run coverage` and `npm run check`: pass; 96.73% statements, 96.25% branches; finale table 100%.
- `npm run build:fever`: pass.
- `npm run test:classic-bundle`: PASS, no juice marker, Fever UI or bloom composer (4 assets checked).
- `npx playwright test -c /tmp/fever-board/pw.config.mjs`: final full run 15 passed (38.9 s), system Chrome, ports 5073/5074. Earlier runs intermittently failed existing performance/time limits. The unchanged 6fb56df baseline also failed the same juice CPU assertion at 1.26183 ms; the first changed run measured 1.17171 ms (limit 1 ms). No threshold or e2e changes.
- Forbidden-theme source/test/docs search: no matches.
- `git diff --check`: pass.

## Audio proof

Scripted a round to the finale in system Chrome; inspected the resulting 720×1280 screenshot. No console errors. Real AudioContexts reported `running` but their clocks remained at 0.005333 s after 5.2 wall seconds, so the zero analyser reading is **not** evidence of audible output. Headed Chrome also timed out. No device diagnosis or production workaround was added.

Used an approved throwaway OfflineAudioContext proof (`node /tmp/fever-board/disco-offline.mjs`) at 48 kHz, 6 seconds per case. It imports the production FeverSound, calls its existing graph seam, and schedules via 50 ms offline suspend/resume intervals. It uses the unchanged master compressor and gain. The proxy only reports the offline context as running and makes close a no-op (offline contexts close themselves). All synthesis, voice limits, scheduling and cancellation are production code. Measured float-buffer absolute peaks:

| Case           |       Peak | Max live sources | Started / stopped | Live at end | Live after cancellation |
| -------------- | ---------: | ---------------: | ----------------: | ----------: | ----------------------: |
| Full           | 0.10399146 |               21 |           86 / 86 |           0 |                       — |
| Short          | 0.10507938 |               21 |           44 / 44 |           0 |                       — |
| Skip at 1.6 s  | 0.10390736 |               21 |           41 / 41 |           0 |                       0 |
| Reset at 1.6 s | 0.10390736 |               21 |           41 / 41 |           0 |                       0 |

Cancellation samples were taken 100 ms after cancellation; source counts use start and ended events. All peaks below clipping; all source starts have stop times, no hanging voices, maximum below the existing 24-voice cap. Offline proof console errors: none. Live audible playback remains unverified on this machine.
