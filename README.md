# Dodge Game

A 2D dodge game built with plain HTML / CSS / JavaScript (Canvas).
Mario-like platformer controls — run, jump between platforms, and dodge
bullets fired in time with the music. Survive to the end of the song to clear it.

Two songs, each with its own chart and look (pick one on the title screen with ◀ ▶):

- **the EmpErroR** — 120 BPM, neon shapes, fireworks, meteors
- **Re:Unknown X** — 190 BPM, a moonlit night with red / green / blue UFOs, searchlights and danmaku-style bullets; the effects grow with the song's intensity

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
| `style.css` | Colors and layout |
| `MANUAL.md` | Guide for editing the code and authoring bullet patterns (Japanese) |

## Bullet patterns

Each song's chart (弾幕) lives in its file under `songs/`; the bullet tools
(`spawn`, `ring`, `laser`, …) are at the bottom of `game.js`. See `MANUAL.md`
for how to write your own patterns or add a song.
