# Fast Drop Fever — spectacle

Production Fever build (`npm run build:fever`), captured in headless **system Google Chrome** at **1050×1680**,
device scale factor 1, on an Apple M1 (ANGLE Metal). Bloom is on (balanced tier) in all three.

| Capture     | State                                                                   | Draw calls | Largest framing NDC |
| ----------- | ----------------------------------------------------------------------- | ---------- | ------------------- |
| `calm.png`  | 6 real drops, 2 combo, cyan chase, machinery idling, no marquee         | 108        | 0.9400              |
| `hot.png`   | 10 scripted hits, magenta chase, marquee on, pistons pumping, "+30 ×3"  | 103        | 0.9400              |
| `fever.png` | 15 scripted hits, FEVER 5.7 s, rainbow ring, rainbow marquee, jar flash | 103        | 0.9403              |

`hot.png` and `fever.png` use `scriptJarHit` (the real settlement and scoring path) with `setBallsRemaining` so
the ball-counter column shows a drained level; they are not physically dropped balls. The game is paused for
the capture after the scripted frames.

## Performance

A scripted FEVER (15 hits, then one hit every 30 frames on the live `requestAnimationFrame` loop so it stays
in FEVER), sampled after a 30-frame warm-up:

| Tier     | Frames | Avg frame | Max frame | Draw calls (`renderer.info.render.calls`) | Juice CPU |
| -------- | ------ | --------- | --------- | ----------------------------------------- | --------- |
| balanced | 297    | 16.666 ms | 16.8 ms   | 103 (bloom passes included)               | 0.43 ms   |
| low      | 117    | 16.667 ms | 16.8 ms   | 88 (no bloom)                             | 0.29 ms   |

With balls in flight the peak was 143 calls. The frame time is vsync-bound on an M1, so it shows only that
there are no hitches; it says nothing about GPU headroom on a GT 1030. The first FEVER frames after a cold
start had one 67–83 ms frame, while bloom's shaders compile. Starting on the low tier and switching back did
not reproduce it. An early 4× MSAA scene target for bloom caused regular 33 ms frames even on the M1, so the
bloom target has no MSAA.
