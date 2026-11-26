# Fast Drop Fever: the juicy edition

Status: design proposal, not built. The working name is **Fast Drop Fever**, after its signature mode.

## Goal

The game is the same: one button drops a ball, five jars orbit the dome, and you have 30 s and 50 balls to land as
many as you can. Every moment of it is cranked to arcade-cabinet excess: impacts you feel, a machine that
celebrates, and escalation that builds to a Fever. The classic Fast Drop stays byte-for-byte as it is today.

## How it ships

It is a **build-time edition in the same repo**:

- `src/edition.ts` exports `EDITION`, set from `import.meta.env.VITE_EDITION` (`classic` by default, or `fever`).
- The juice code lives in `src/juice/`. `Game` only calls `juice.emit(event, weight, position)` at the existing hook
  points. The classic build binds a no-op sink, and because `EDITION` is a build-time constant, Vite drops
  `src/juice/` from the classic bundle.
- `npm run build:electron:win:fever` builds with `VITE_EDITION=fever` and electron-builder overrides:
  `productName "Fast Drop Fever"`, `appId com.fastdrop.fever` and `extraMetadata.name fast-drop-fever`. The
  separate `name` gives it its own `%APPDATA%\fast-drop-fever` profile. Matching `:fever` scripts exist for
  Windows (portable only), macOS (dmg, zip) and Linux (AppImage, tar.gz).
- The release workflow gets three Fever matrix rows, one per platform. Both editions publish to the same rolling `latest`
  release:
  - `Fast.Drop.0.1.0.exe`: the classic pattern `^Fast[ .-]Drop[ .-](?<version>…)\.exe$` keeps matching only this
    file, because after `Drop` it expects a digit.
  - `Fast.Drop.Fever.0.1.0.exe`: the new pattern is `^Fast[ .-]Drop[ .-]Fever[ .-](?<version>…)\.exe$`.
  - Fever builds no NSIS installer and uploads no `latest*.yml`, so it can't overwrite the classic files. Its
    mac and Linux artifacts carry `Fever` in their names too.
- On the cabinet:
  - `electron-games.json` gets a `FastDropFever` entry at `C:\arcade\Fast Drop Fever\`.
  - LaunchBox gets an Arcade entry with `--fullscreen`.
  - JoyToKey gets a profile and hook mapping the main button to Space, copied from Fast Drop's.
  - The backup collectors and `RESTORE.md` cover the new folder and profile.

## Core loop (unchanged)

The game keeps the same orbit, jars, drop point, cooldown, 30 s timer, 50 balls, physics, and scoring of 10 per
jar ball. The only gameplay addition is the **combo multiplier** (below), which only adds to scores. A run
played the classic way still scores at least as much as it would in classic.

## The juice system

The design matches Coin Quake's (`coin-quake/GAME_DESIGN.md` §4). One call,
`juice.emit(event, weight 1–5, worldPos)`, fans out to five channels: **shake, light, particles, sound, text**.
Their strengths come from one tuning table, `src/juice/table.ts`, which is editable in the debug menu.

| Event                        | Weight       | Shake                    | Time                                              | Light                                            | Particles                           | Sound                                        | Text                         |
| ---------------------------- | ------------ | ------------------------ | ------------------------------------------------- | ------------------------------------------------ | ----------------------------------- | -------------------------------------------- | ---------------------------- |
| `drop` (button press)        | 1            | tiny kick down           | –                                                 | button flare, tube flash                         | muzzle puff                         | thunk plus a rising pitch per ball in flight | –                            |
| `rim-bounce` (near miss)     | 2            | small, away from the rim | slow-mo 0.35× for 0.4 s when it might still go in | rim spark                                        | sparks                              | metallic _ping_                              | "SO CLOSE" if it misses      |
| `jar-hit`                    | 2–4 by combo | trauma `w²·k`            | hit-stop 40–90 ms                                 | jar emissive flash, ring LED burst from that jar | confetti burst out of the jar mouth | chime on a rising scale (Peggle-style)       | world popup "+10", "+20 ×2"… |
| `bonus-jar`                  | 4            | big                      | hit-stop 110 ms                                   | full-ring rainbow wipe                           | fireworks                           | fanfare stab                                 | "BONUS!"                     |
| `miss`                       | 1            | –                        | –                                                 | brief dim                                        | dust puff on the floor              | soft _fizzle_, combo drops                   | combo stamp falls away       |
| `combo-milestone` ×5/×10/×20 | 3–5          | big plus a zoom punch    | slow-mo 0.5 s                                     | strobe                                           | shockwave ring                      | riser plus a crash                           | "×10 COMBO!" stamp           |
| `fever-start`                | 5            | max                      | hit-stop 150 ms, then slow-mo into it             | everything rainbow                               | ring of fireworks                   | drop plus a fever loop                       | "FEVER!!" full-screen        |
| `time-warning` (8 s)         | 2            | heartbeat micro-shake    | –                                                 | red pulse                                        | –                                   | tempo up, heartbeat                          | "HURRY!"                     |
| `last-ball`                  | 3            | –                        | slow-mo while it falls                            | spotlight on the ball                            | trail                               | drum roll                                    | –                            |
| `round-end`                  | 3–5 by rank  | –                        | –                                                 | light show by rank                               | rain of balls for a high score      | tally ticks plus a cymbal                    | rank stamp (C…S, "PERFECT")  |

Time effects scale the **simulation** (orbit, balls, and the round timer, which already share `step(dt)`).
Particles, lights and the camera stay on real time, so hit-stop reads as a freeze-frame and not a stall.
Hit-stop and slow-mo never stack beyond 0.25× and are capped at 2 s per round, so the round length barely changes.

### Escalation

- **Combo** counts consecutive jar hits, and a miss resets it. Its multiplier is ×1 at 0–4 hits, ×2 at 5–9 and
  ×3 at 10+. The combo and multiplier show as a sticker on the status display's corner that grows, shakes and
  recolours per tier, and turns to glitter foil in FEVER; the top HUD keeps only the Fever meter.
- **Heat tiers** follow the combo and the time left, and each tier adds a layer:
  - **Calm:** cyan LEDs and a slow chase.
  - **Warm (×5):** faster chases, sparks off the jar rims, and a percussion layer.
  - **Hot (×10):** magenta lighting, a constant micro-shake, and the camera breathing.
  - **FEVER (×15, or by filling the Fever meter):** 6 s in which everything goes:
    - rainbow strobe and confetti;
    - the jars glow and leave light trails;
    - every hit is a bonus-sized explosion, worth ×3;
    - the orbit speeds up 1.25×, the only physics change, kept short and visible;
    - a fever loop plays.

  Fever ends with a cool-down wipe back to calm. It can trigger again.

### Spectacle and machinery

- **Camera punches:** an FOV punch of −3° for 100 ms on weight 4+, with directional kicks. The framing still has
  to pass the portrait `getFraming` check, so punches stay within the safety margin it already leaves.
- **Jar celebrations:** a jar that gets a hit squashes and stretches, its lid LEDs chase, and its balls hop.
- **Light shows:** the existing `outerRingLed` gains named patterns: chase, sparkle, wipe, strobe, rainbow and
  heartbeat. The status display becomes the score board (`src/juice/board.ts`): a chasing bulb marquee that
  speeds up with heat, rolling score reels that "+N" callouts fly into, a squash on every hit, a red heartbeat
  over the dial in the last 10 s with a matching tick, balls tumbling out of the counter, and cracks, steam and
  sparks at hot and FEVER.
- **Extra moving parts** are purely visual, so physics and fairness don't change:
  - spinning pinwheels on the dome;
  - a rotating beacon on the drop tube;
  - pistons that pump on the beat around the base;
  - a ball-counter tube that visibly drains.
- **Popups:** world-anchored and springy with overshoot, colored by tier, and scaled up for portrait.
- **Sound** is procedural Web Audio on the existing `AudioSystem`, with no announcer and no sample assets:
  - a musical scale for combos;
  - a three-layer loop whose tempo follows the heat tier;
  - stingers;
  - a low-pass sweep under slow-mo.
- **Attract mode:** after 20 s idle on the game-over screen, a demo plays. An autopilot drops on timing with a
  realistic hit rate and shows the full light show, under a "PRESS DROP" banner. The first press starts a round.

## One button, portrait first

The only input is still the drop. Nothing in Fever needs a second button. Every new HUD element (combo stamp,
Fever meter, popups) is laid out for 1050×1680 first and tested by the existing portrait e2e framing check.
Landscape just has to fit.

## Performance budget (GT 1030 class, 1050×1680)

| Item        | Budget                                                                                                     |
| ----------- | ---------------------------------------------------------------------------------------------------------- |
| Frame       | 16.6 ms at 60 fps; target ≤ 12 ms on a GT 1030                                                             |
| Pixel ratio | 1.0 on the cabinet (cap stays 2 for dev)                                                                   |
| Bloom       | One `UnrealBloomPass` at half resolution, 3 mips; it's the only post effect and is dropped on the low tier |
| Particles   | One instanced pool of 1,500 quads, additive, no sorting; confetti ≤ 300 per burst                          |
| Lights      | Existing rig plus at most 2 dynamic point lights for flashes; LED glow is emissive plus bloom, not lights  |
| Shadows     | None, as in classic                                                                                        |
| Draw calls  | ≤ 150 (new machinery is instanced)                                                                         |
| Juice CPU   | ≤ 1 ms per frame                                                                                           |

The existing adaptive quality tiers extend to Fever. On the low tier there is no bloom, the particle pool is
halved, and the machinery is static. Fever logs frame time in the smoke run, and a Fever round is checked on the
cabinet before it ships.

## Testing

- **Unit tests:**
  - the juice table, and trauma decay;
  - the combo and heat state machine;
  - the time-scale caps;
  - the fever trigger and its end.
- **E2E:**
  - a Fever smoke run with the portrait framing check;
  - a scripted combo through the test bridge that reaches Fever.
- **Classic:** the existing suites pass unchanged, and a check asserts that the classic bundle doesn't contain
  `src/juice`.
