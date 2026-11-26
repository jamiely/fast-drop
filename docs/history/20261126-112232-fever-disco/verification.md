# Disco Fever verification

System Chrome (headless, Playwright `channel: 'chrome'`), portrait 1050×1680. Scripted fifteen jar hits, forced timer expiry, sampled 90 animation frames during the finale. External proof script: `/tmp/fever-e17b/proof.mjs`.

- Maximum render calls (including bloom): **111**, under 150.
- Mean frame interval: **27.54 ms**; maximum **66.60 ms**. These are rAF intervals on the development Mac, not GT 1030 GPU timings. The 16.6 ms cabinet target is **not demonstrated**; cabinet profiling remains necessary.
- Smoothed juice update CPU: 1.03 ms at final sample.
- Live pooled particles: 1440 at final sample, within 1500 slots.
- Framing maxNdc: **0.940**.
- Browser page/console errors: **none**.

Screenshots were opened and visually inspected: `disco-gameplay.png`, `drop-recoil.png`, `disco-fever.png`, `finale.png` (1050×1680), and `finale-720.png` (720×1280). The first capture attempt included the startup logo; those images were replaced with gameplay captures after waiting for its removal.

Core regressions in `tests/e2e/fever.spec.ts` cover both fresh restart paths and text bounding boxes at 720×1280 and 720×1680. Rank, tally endpoints, skip boundary, and Ode to Joy pitches/rhythm are tested in `tests/unit/finale.test.ts`.

Manual hook steps: format, format:check, lint, test, coverage, system-Chrome e2e with `/tmp/fever-e17b/pw.config.mjs` on ports 4873/4874, classic bundle guard. `npm run check` also passes. No bundled Chromium installation and no push.
