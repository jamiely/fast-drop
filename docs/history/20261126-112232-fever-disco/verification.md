# Disco Fever verification

System Chrome (headless, Playwright `channel: 'chrome'`), portrait 1050×1680. Scripted fifteen jar hits, forced timer expiry, sampled 90 animation frames during the finale. External proof script: `/tmp/fever-e17b/proof.mjs`.

- Maximum render calls (including bloom): **104**, under 150.
- Mean frame interval: **16.58 ms**; maximum **16.80 ms**. These are rAF intervals on the development M1 Mac, not GT 1030 GPU timings. This meets the requested M1 mean/max; cabinet profiling remains necessary.
- Smoothed juice update CPU: 0.45 ms at final sample.
- Live pooled particles: 228 at final sample, within 1500 slots.

The first finale measured 27.54 ms mean / 66.60 ms max. The corrected finale clears residual Fever particles, uses four shorter/lower-count waves with smaller quads, and a tighter quarter-resolution bloom. It hides the classic end display and HUD while owning the end state, restores both on restart, and skips the hidden classic display's expensive canvas repaint/upload. There is one ROUND COMPLETE heading and no stale multiplier. Both corrected finale screenshots were recaptured.

Load investigation found simultaneous browser GPU/renderers and unrelated ffmpeg jobs on the host, plus the existing two webServers launching separate TypeScript/Vite builds concurrently. No unrelated processes were stopped. The npm e2e scripts now build editions sequentially before preview startup; Playwright uses one worker locally and in CI. No timeouts were raised.

- Framing maxNdc: **0.940**.
- Browser page/console errors: **none**.

Screenshots were opened and visually inspected: `disco-gameplay.png`, `drop-recoil.png`, `disco-fever.png`, `finale.png` (1050×1680), and `finale-720.png` (720×1280). The first capture attempt included the startup logo; those images were replaced with gameplay captures after waiting for its removal.

Core regressions in `tests/e2e/fever.spec.ts` cover both fresh restart paths and text bounding boxes at 720×1280 and 720×1680. Rank, tally endpoints, skip boundary, and original disco finale pitches/rhythm are tested in `tests/unit/finale.test.ts`.

Manual hook steps: format, format:check, lint, test, coverage, system-Chrome e2e with `/tmp/fever-e17b/pw.config.mjs` on ports 4873/4874, classic bundle guard. `npm run check` also passes. No bundled Chromium installation and no push.
