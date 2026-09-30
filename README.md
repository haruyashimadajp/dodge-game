# Dodge Game

A 2D dodge game built with plain HTML / CSS / JavaScript (Canvas).
Mario-like platformer controls — run, jump between platforms, and dodge
incoming circular bullets to survive as long as you can.

## Play

Open `index.html` in a web browser.

- **Move:** `← →` / `A` `D`
- **Jump:** `↑` / `W` / `Space`

## Files

| File | Description |
|------|-------------|
| `index.html` | The page to open in a browser |
| `game.js` | Game code — character, physics, collision, and the bullet patterns |
| `visuals.js` | Rendering & effects — neon background, beat-synced camera, particles, title animation |
| `song-data.js` | Per-band loudness of the song (generated), used by the audio-reactive visuals |
| `style.css` | Colors and layout |
| `MANUAL.md` | Guide for editing the code and authoring bullet patterns (Japanese) |

## Bullet patterns

The bullet patterns (弾幕) live in the `BULLET PATTERNS` section at the bottom
of `game.js`. See `MANUAL.md` for how to write your own.
