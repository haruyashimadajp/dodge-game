# Dodge Game

A 2D dodge game built with plain HTML / CSS / JavaScript (Canvas).
Mario-like platformer controls — run, jump between platforms, and dodge
bullets fired in time with the music. Survive to the end of the song to clear it.

Six songs, each with its own chart and look (pick one on the title screen with ◀ ▶):

- **the EmpErroR** — 120 BPM, neon shapes, fireworks, meteors
- **Re:Unknown X** — 190 BPM, a moonlit night with red / green / blue UFOs, searchlights and danmaku-style bullets; the effects grow with the song's intensity
- **モラトリウム** (Moratorium) — an original 150 BPM song made for this game (composed and synthesized in `songs/moratorium-compose.py`); a clock tower at dusk with time stops, rewinds, pendulums, clock-hand beams and melody notes that land exactly when they sound
- **segment** — an original 160 BPM song of piano, glockenspiel and breaking glass (`songs/segment-compose.py`); a room of glass where panes shatter on the glass hits, cracks spread across the screen, piano notes fall as key blocks onto a keyboard floor, and glockenspiel notes refract like light
- **Vertigo** — an original 128 BPM wobbling electro track (`songs/vertigo-compose.py`); almost no bullets — the stage itself is the enemy: the world tilts and you slide, the floor runs like a conveyor belt, holes open, electric walls close in, and the screen turns upside down, mirrors and zooms in
- **ExtremeEX** — the hardest: an original 200 BPM hardcore track built on a screaming synth that whines up into every note (`songs/extremeex-compose.py`); with its own mechanics: EX ECHO (a red copy of you that follows your path a moment behind — touch it and you're hit), LOCK-ON crosshairs that track you and explode, and REV shots that hang and whine up, then rocket at you (some aim where you're running)

## Play

Open `index.html` in a web browser.

- **Move:** `← →` / `A` `D`
- **Jump:** `↑` / `W` / `Space`
- **Choose a song (title):** `←` `→` or the ◀ ▶ buttons

## Files

| File | Description |
|------|-------------|
| `index.html` | The page to open in a browser |
| `game.js` | Game code — character, physics, collision, song select, and the bullet tools |
| `songs/*.js` | One file per song: beat grid, sections (looks) and chart (bullets) |
| `songs/*-env.js` | Per-band loudness of each song (generated), used by the audio-reactive visuals |
| `visuals.js` | Rendering & effects — beat-synced camera, particles, title animation, the neon theme, graphics quality |
| `visuals-night.js` | The night / UFO theme used by Re:Unknown X |
| `visuals-dusk.js` | The dusk / clock-tower theme used by モラトリウム |
| `visuals-glass.js` | The glass-room theme used by segment |
| `visuals-gyro.js` | The attitude-indicator theme used by Vertigo |
| `visuals-ex.js` | The black-and-red alarm theme used by ExtremeEX |
| `songs/moratorium-compose.py` | Composes and renders モラトリウム (Python + numpy/scipy) and writes its note timings |
| `songs/segment-compose.py` | Composes and renders segment (piano, glockenspiel, breaking glass) and writes its note timings |
| `style.css` | Colors and layout |
| `MANUAL.md` | Guide for editing the code and authoring bullet patterns (Japanese) |

## Bullet patterns

Each song's chart (弾幕) lives in its file under `songs/`; the bullet tools
(`spawn`, `ring`, `laser`, …) are at the bottom of `game.js`. See `MANUAL.md`
for how to write your own patterns or add a song.
