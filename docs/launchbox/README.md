# LaunchBox / Big Box media

Media for the Vermilion cabinet's LaunchBox "Arcade" platform, made from the game itself by
`node scripts/launchbox-media.mjs` (default: the `latest` release the cabinet runs; `--ref .` for this checkout,
`--art-only` to recompose the logo and posters from the screenshots here). `SOURCE.txt` names the captured commit.

For the placeholder juicy edition, run `node scripts/launchbox-media.mjs --game fever --ref fever`
(or `--ref origin/fever` once published). Its Disco theme is in progress; re-run when ready.
Run only one capture at a time. Needs system Google Chrome, node_modules, and ffmpeg.
The release predates the Electron-relative build script, so Vite preview serves the selected ref's production build.

The folders mirror LaunchBox's own, and files are named `<Title>-01` so LaunchBox matches them to the game.
To install or restore, close LaunchBox and Big Box, then copy `Images/` and `Videos/` over
`C:\Users\arcade\LaunchBox\` (this tree is the backup; the cabinet's collector does not archive media).

Each title has six PNGs and one 30-second H.264 video snap. The title screenshot is the opening playfield
(the released game has no title menu). Keyboard Space releases drop balls; Enter restarts finished rounds.
Base posters use bold Arial, matching the in-world status display; Fever uses weight-800 system-ui,
matching its edition heading (neither bundles a webfont). Both use the game's neon pink/blue and
midnight purple palette, with Fever's pink `#ff85de`. The tagline “Time it. Drop it. Win big!” describes the README's
rotating-jar timing game. Layout and artwork treatment follow the approved Coin Quake media.
