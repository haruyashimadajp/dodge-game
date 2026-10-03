# Dodge Game

A 2D dodge game built with plain HTML / CSS / JavaScript (Canvas).
Mario-like platformer controls — run, jump between platforms, and dodge
bullets fired in time with the music. Survive to the end of the song to clear it.

Ten songs, each with its own chart and look (pick one on the title screen with ◀ ▶):

- **First Step** — the beginner song (first in the list): an original, cheerful 108 BPM pop track with a bell melody (`songs/firststep-compose.py`); slow bullets with long warnings, and on-screen hints that teach one thing at a time — moving, jumping over rolling balls, finding gaps in rings, and getting onto platforms when the floor lights up
- **the EmpErroR** — 120 BPM, neon shapes, fireworks, meteors
- **Re:Unknown X** — 190 BPM, a moonlit night with red / green / blue UFOs, searchlights and danmaku-style bullets; the effects grow with the song's intensity
- **モラトリウム** (Moratorium) — an original 150 BPM song made for this game (composed and synthesized in `songs/moratorium-compose.py`); a clock tower at dusk with time stops, rewinds, pendulums, clock-hand beams and melody notes that land exactly when they sound
- **segment** — an original 160 BPM song of piano, glockenspiel and breaking glass (`songs/segment-compose.py`); a room of glass where panes shatter on the glass hits, cracks spread across the screen, piano notes fall as key blocks onto a keyboard floor, and glockenspiel notes refract like light
- **Vertigo** — an original 128 BPM wobbling electro track (`songs/vertigo-compose.py`); almost no bullets — the stage itself is the enemy: the world tilts and you slide, the floor runs like a conveyor belt, holes open, electric walls close in, and the screen turns upside down, mirrors and zooms in
- **ExtremeEX** — the hardest: an original 200 BPM hardcore track built on a screaming synth that whines up into every note (`songs/extremeex-compose.py`); with its own mechanics: EX ECHO (a red copy of you that follows your path a moment behind — touch it and you're hit), LOCK-ON crosshairs that track you and explode, and REV shots that hang and whine up, then rocket at you (some aim where you're running)
- **Malware** — an original 150 BPM glitch / dubstep track about bugs and computer viruses (`songs/malware-compose.py`): a dial-up modem boot, an 8-bit chip lead, wobble bass and a track that stutters, crashes into a blue screen and shuts down at the end. Its mechanics: viruses that infect the floor where they land (the infection spreads tile by tile into spikes), worms whose long bodies follow the head's path, retro ERROR windows that pop up and cascade, a gravity bug that sticks you to the ceiling, and a loop bug that makes the bullets on screen skip back and forth whenever the music stutters

- **Abyss** — an original 90 BPM deep-sea ambient track (`songs/abyss-compose.py`) with sonar pings, whale song and a kalimba: the slowest bullets of any song, but hard — dense slow fields to thread through, jellyfish that lunge at you on every beat (their tentacles hit too), marine snow drifting down everywhere, a dark-water section where you only see around yourself and sonar pings reveal the bullets, and a giant leviathan that winds across the screen
- **Ward 13** — an original 100 BPM industrial horror track (`songs/ward13-compose.py`) set in an abandoned hospital; normal difficulty, with the focus on horror-game atmosphere: you see only what your flashlight points at, a tall stalker walks after you and blinks closer whenever the lights cut out (radio static on screen and in the speakers grows as it nears), an air-raid siren turns the hospital into a rusty, bloody other world, a CCTV section cuts between security cameras, crawlers rush along the floor, doors slam shut, bloody handprints hit the screen, jump scares land on the music's stingers, and losing shows YOU DIED
- **Prism** — an original 128 BPM melodic trance track (`songs/prism-compose.py`) where beams are the main attack and are drawn like art: every beam is sketched first like a pencil line, then fires as light split into red, green and blue, and stays behind on the canvas as a light painting — at the end the whole song's beams become one framed picture. Its patterns: rainbow fans from a glass prism, string art (a cardioid drawn thread by thread), kaleidoscope stars, light that bounces off the walls, a light brush that paints Lissajous curves and fires at you, and keyboard-like curtains of light; with Vertigo-style screen movement (a full turn of the world, tilts, a mirror flip and a close-up camera)
- **Shiki** (四季, the four seasons) — an original 100 BPM, 3-minute piece for koto, shakuhachi, taiko, temple bell and music box (`songs/shiki-compose.py`); the screen is a moving sumi-e ink painting that passes through spring, summer, autumn and winter and back to spring, with an ink drop and a big brush character with a red seal at each change. Fairly hard. Few round bullets — the attacks are shapes: ink brush strokes, growing cherry branches that blossom, fireworks that open into rays of light, an ensō circle drawn around you, koi that leap out of the water, a Hokusai-style great wave to jump, wind that pushes you with maple leaves, crescent-moon slashes, falling icicles and swaying aurora curtains. The painting opens as an unrolling scroll, a torii stands in the water, fireworks reflect on it, geese cross the autumn moon, snow piles up in winter, dried strokes leave ink stains on the paper, a hit splashes ink on the screen, and the finale brings all four seasons back at once
- **Candy Pop Parade** — an original 150 BPM kawaii future-bass track (`songs/candy-compose.py`) with a music box, glockenspiel, a chiptune lead, cute vocal chops, toy squeaks and bubble pops, set in a pastel sweets kingdom (a rainbow, a cake castle, striped hills with lollipop trees, smiling clouds that squish on the beat, a bunny peeking out, a strawberry-shortcake floor). Normal difficulty; the attacks are sweets: bouncing gumdrops, spinning candy canes, hearts that spread out in a heart shape, a marching gummy bear to jump over, a lollipop that ticks around like a clock hand, bitten donut rings (go through the bite) and soap bubbles that pop into stars

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
| `visuals-virus.js` | The green terminal / virus theme used by Malware |
| `visuals-day.js` | The bright daytime theme used by First Step |
| `visuals-abyss.js` | The deep-sea theme used by Abyss |
| `visuals-horror.js` | The abandoned-hospital horror theme used by Ward 13 |
| `visuals-prism.js` | The dark-gallery / light-painting theme used by Prism |
| `visuals-shiki.js` | The moving ink-painting (four seasons) theme used by Shiki |
| `visuals-candy.js` | The pastel sweets-kingdom theme used by Candy Pop Parade |
| `songs/moratorium-compose.py` | Composes and renders モラトリウム (Python + numpy/scipy) and writes its note timings |
| `songs/segment-compose.py` | Composes and renders segment (piano, glockenspiel, breaking glass) and writes its note timings |
| `style.css` | Colors and layout |
| `MANUAL.md` | Guide for editing the code and authoring bullet patterns (Japanese) |

## Bullet patterns

Each song's chart (弾幕) lives in its file under `songs/`; the bullet tools
(`spawn`, `ring`, `laser`, …) are at the bottom of `game.js`. See `MANUAL.md`
for how to write your own patterns or add a song.
