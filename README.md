# Dodge Game

A 2D dodge game built with plain HTML / CSS / JavaScript (Canvas).
Mario-like platformer controls — run, jump between platforms, and dodge
bullets fired in time with the music. Survive to the end of the song to clear it.

Ten songs, each with its own chart and look (pick one on the title screen with ◀ ▶):

- **First Step** — the beginner song (first in the list): an original, cheerful 108 BPM pop track with a bell melody (`songs/firststep-compose.py`); slow bullets with long warnings, and on-screen hints that teach one thing at a time — moving, jumping over rolling balls, finding gaps in rings, and getting onto platforms when the floor lights up
- **the EmpErroR** (sasakure.UK, from maimai's PANDORA BOXXX) — remade as a maimai cabinet: a round screen with 8 buttons in the middle, and the bullets are maimai notes (TAP / EACH / BREAK / slide stars with arrow tracks / TOUCH). The PANDORA BOXXX box opens at the start, the screen breaks into errors around a glitching emperor's crown, and the places where the song quotes older sasakure.UK songs get their own patterns (麒麟, 神威 lightning, Jack-the-Ripper◆ knives, Garakuta Doll Play puppets, ガラテアの螺旋 spiral). Near misses show CRITICAL PERFECT / PERFECT, with an achievement rate and combo; a no-hit clear is ALL PERFECT; it ends with the song's 32nd-note roll (the デレレレレレ… at 2:00) as a rapid stream of TAP notes raining down, each landing exactly as its note sounds
- **Re:Unknown X** (marasy, from Touhou Danmaku Kagura; original: アンノウンX ～ Unfound Adventure from Touhou Hisoutensoku) — remade as a Touhou shoot-'em-up final stage: the boss Unknown X with a health bar and magic circles, spell card names and timers in the corner (Get Spell Card Bonus!! for a no-hit spell), a graze counter, Touhou bullet shapes (rice, amulets, stars), Suwako's bouncing iron rings, hopping frogs in the rain, the red / green / blue UFOs and giant stomping feet, over Youkai Mountain and the Moriya shrine at night; it builds to a finale where the boss fires regular flower rings and spiralling rice bullets, then seven X beams strike at once and X-shaped fireworks burst over the night sky
- Both of these also keep their **original (pre-remake) charts and looks**: on the title screen, the 譜面 button under the song name (or the C key) switches between リメイク and 旧譜面. Each chart has its own best time (records from before the remake stay with 旧譜面), and the game remembers which chart you picked for each song.
- **モラトリウム** (Moratorium) — an original 150 BPM song made for this game (composed and synthesized in `songs/moratorium-compose.py`); inside a clock tower at dusk, where the clock face is a stained-glass rose window with the setting sun, a distant town and migrating birds behind it, with time stops, rewinds, pendulums, clock-hand beams and melody notes that land exactly when they sound
- **segment** — an original 160 BPM song of piano, glockenspiel and breaking glass (`songs/segment-compose.py`); a room of glass around a faceted glass sphere that cracks, shatters into floating segments, pulses on the kick, gathers back together and is whole again at the end, splitting the light from a high window into a rainbow; panes shatter on the glass hits, cracks spread across the screen, piano notes fall as key blocks onto a keyboard floor, and glockenspiel notes refract like light
- **Vertigo** — an original 128 BPM wobbling electro track (`songs/vertigo-compose.py`); almost no bullets — the stage itself is the enemy: the world tilts and you slide, the floor runs like a conveyor belt, holes open, electric walls close in, and the screen turns upside down, mirrors and zooms in — all while you look down a twisting spiral staircase in a nod to Hitchcock's *Vertigo* (a dolly-zoom stretch in the choruses and Saul Bass–style spirals and sliced titles)
- **ExtremeEX** — the hardest: an original 200 BPM hardcore track built on a screaming synth that whines up into every note (`songs/extremeex-compose.py`); with its own mechanics: EX ECHO (a red copy of you that follows your path a moment behind — touch it and you're hit), LOCK-ON crosshairs that track you and explode, and REV shots that hang and whine up, then rocket at you (some aim where you're running); set inside an overdrive reactor: a hexagon tunnel rushing in on the beat, a turbine around a white-hot core that arcs during the drops, and DANGER / level gauges at the sides
- **Malware** — an original 150 BPM glitch / dubstep track about bugs and computer viruses (`songs/malware-compose.py`): a dial-up modem boot, an 8-bit chip lead, wobble bass and a track that stutters, crashes into a blue screen and shuts down at the end. Its mechanics: viruses that infect the floor where they land (the infection spreads tile by tile into spikes), worms whose long bodies follow the head's path, retro ERROR windows that pop up and cascade, a gravity bug that sticks you to the ceiling, and a loop bug that makes the bullets on screen skip back and forth whenever the music stutters

- **Abyss** — an original 90 BPM deep-sea ambient track (`songs/abyss-compose.py`) with sonar pings, whale song and a kalimba: the slowest bullets of any song, but hard — dense slow fields to thread through, jellyfish that lunge at you on every beat (their tentacles hit too), marine snow drifting down everywhere, a dark-water section where you only see around yourself and sonar pings reveal the bullets, and a giant leviathan that winds across the screen
- **Ward 13** — an original 100 BPM industrial horror track (`songs/ward13-compose.py`) set in an abandoned hospital; normal difficulty, with the focus on horror-game atmosphere: you see only what your flashlight points at, a tall stalker walks after you and blinks closer whenever the lights cut out (radio static on screen and in the speakers grows as it nears), an air-raid siren turns the hospital into a rusty, bloody other world, a CCTV section cuts between security cameras, crawlers rush along the floor, doors slam shut, bloody handprints hit the screen, jump scares land on the music's stingers, and losing shows YOU DIED
- **Prism** — an original 128 BPM melodic trance track (`songs/prism-compose.py`) where beams are the main attack and are drawn like art: every beam is sketched first like a pencil line, then fires as light split into red, green and blue, and stays behind on the canvas as a light painting — at the end the whole song's beams become one framed picture. Its patterns: rainbow fans from a glass prism, string art (a cardioid drawn thread by thread), kaleidoscope stars, light that bounces off the walls, a light brush that paints Lissajous curves and fires at you, and keyboard-like curtains of light; with Vertigo-style screen movement (a full turn of the world, tilts, a mirror flip and a close-up camera)
- **Shiki** (四季, the four seasons) — an original 100 BPM, 3-minute piece for koto, shakuhachi, taiko, temple bell and music box (`songs/shiki-compose.py`); the screen is a moving sumi-e ink painting that passes through spring, summer, autumn and winter and back to spring, with an ink drop and a big brush character with a red seal at each change. Fairly hard. Few round bullets — the attacks are shapes: ink brush strokes, growing cherry branches that blossom, fireworks that open into rays of light, an ensō circle drawn around you, koi that leap out of the water, a Hokusai-style great wave to jump, wind that pushes you with maple leaves, crescent-moon slashes, falling icicles and swaying aurora curtains. The painting opens as an unrolling scroll, a torii stands in the water, fireworks reflect on it, geese cross the autumn moon, snow piles up in winter, dried strokes leave ink stains on the paper, a hit splashes ink on the screen, and the finale brings all four seasons back at once
- **Candy Pop Parade** — an original 150 BPM kawaii future-bass track (`songs/candy-compose.py`) with a music box, glockenspiel, a chiptune lead, cute vocal chops, toy squeaks and bubble pops, set in a pastel sweets kingdom (a rainbow, a cake castle, striped hills with lollipop trees, smiling clouds that squish on the beat, a bunny peeking out, a strawberry-shortcake floor). Cute but fairly hard; the attacks are sweets: bouncing gumdrops, spinning candy canes, hearts that spread out in a heart shape, a marching gummy bear to jump over, a lollipop that ticks around like a clock hand, bitten donut rings (go through the bite) and soap bubbles that pop into stars

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
| `songs/emperror-classic.js`, `songs/unknown-classic.js` | The original charts of the EmpErroR and Re:Unknown X, kept as 旧譜面 variants (`variantOf`) |
| `visuals-dusk.js` | The clock-tower theme used by モラトリウム (stained-glass rose-window clock, light shafts, brass gears) |
| `visuals-glass.js` | The glass-room theme used by segment (a glass sphere that cracks, shatters and reassembles with the song) |
| `visuals-gyro.js` | The Vertigo theme: looking down a twisting spiral staircase with a dolly-zoom, Saul Bass–style spirals and titles, a tilt gauge |
| `visuals-ex.js` | The ExtremeEX theme: an overdrive reactor (hexagon tunnel, turbine core, DANGER / level gauges, WARNING tape) |
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
