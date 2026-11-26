# Fever procedural sound verification

System Chrome, production Fever build, 1050×1680. These are context captures for the sound task, not visual changes. The startup logo was allowed to finish before capturing.

- [Warm](warm.png): five hits; pulse + percussion, 112 BPM; rising combo chimes and milestone riser/crash.
- [FEVER](fever.png): fifteen hits; pulse + bass + percussion, 164 BPM; Fever drop and alternate loop.

One-off `node /tmp/fever-snd/prove.mjs` instrumented the real AudioContext with an analyser on its master gain and source start/ended counters. It pressed a key to unlock, paced fifteen test-bridge jar hits (including a bonus), then forced the warning and round end. The temporary script was removed after verification. Observed output:

```json
{
  "combo": 15,
  "heat": "fever",
  "contexts": ["running", "running"],
  "maximumSources": 24,
  "maxPeak": 0.19412028789520264,
  "lowpassSwept": true,
  "lowpassRestored": true,
  "consoleErrors": []
}
```

The second context is the unchanged classic AudioSystem's warning cue. The analyser observed the Fever bus only; the source counter observed both contexts. The low-pass reached its 800 Hz target under hit-stop and returned to 18 kHz. This is signal/lifecycle verification, not a cabinet-speaker listening or loudness assessment.

The committed Fever e2e also presses a non-drop key (to isolate Fever unlock from classic audio), scripts the fifteen-hit combo, asserts the actual context is running and checks zero console errors. Musical scale, heat/layer selection, voice-limit allocation/release and a minimal AudioContext lifecycle are covered in `tests/unit/feverSound.test.ts`.
