"use strict";

/* =========================================================================
   ENGINE  —  character, physics, ground/platforms, collision, game loop.
   You normally don't need to touch this part.
   Each song's chart lives in songs/*.js; the bullet tools it uses are in the
   "弾幕" section at the bottom of this file.
   All drawing / effects (camera, particles, title animation) live in visuals.js.
   ========================================================================= */

const cv = document.getElementById('game');
const ctx = cv.getContext('2d');
const W = cv.width, H = cv.height;

const scoreEl = document.getElementById('score');
const bestEl = document.getElementById('best');
const livesHud = document.getElementById('livesHud');
const overlay = document.getElementById('overlay');
const ovTitle = document.getElementById('ovTitle');
const ovSub = document.getElementById('ovSub');
const startBtn = document.getElementById('startBtn');
const pauseOverlay = document.getElementById('pauseOverlay');
const resumeBtn = document.getElementById('resumeBtn');
const restartBtn = document.getElementById('restartBtn');
const toTitleBtn = document.getElementById('toTitleBtn');
const pauseBtn = document.getElementById('pauseBtn');
const touchControls = document.getElementById('touchControls');
const settingsModal = document.getElementById('settingsModal');
const mountSettings = document.getElementById('mountSettings');
const moveZone = document.getElementById('moveZone');
const lrLeft = document.getElementById('lrLeft');
const lrRight = document.getElementById('lrRight');
const stickBase = document.getElementById('stickBase');
const stickKnob = document.getElementById('stickKnob');
const jumpBtn = document.getElementById('jumpBtn');

const settingsToggle = document.getElementById('settingsToggle');
const resultBox = document.getElementById('resultBox');
const resTime = document.getElementById('resTime');
const resBest = document.getElementById('resBest');
const resHits = document.getElementById('resHits');
const titleBest = document.getElementById('titleBest');
const toTitleBtn2 = document.getElementById('toTitleBtn2');

// ---- Songs ----------------------------------------------------------------
// Each file in songs/ calls addSong({...}) with its music file, beat grid,
// sections (looks) and chart (bullets). The title screen picks one; the
// globals below always describe the song that is currently selected.
const SONGS = [];
function addSong(s) { SONGS.push(s); }
let song = null;           // the selected song object
let BEAT_SEC = 0.5;        // seconds per beat      (copied from the song)
let SONG_END = 128.8;      // survive to here = clear
let SECTIONS = [];         // the song's sections table (colors, banners, camera)
function beatTime(n) { return song.beatTime(n); }      // time of beat n
function beatPos(t)  { return song.beatPos(t); }       // beat number at time t (fractional)
// 1 right on a beat, decaying to 0 before the next one (per = beats per pulse)
function beatKick(t, per = 1) { const p = beatPos(t) / per; return Math.exp(-(p - Math.floor(p)) * 5); }
let songTime = 0;          // current position in the song (s); drives bullets & visuals

// ---- World layout -------------------------------------------------------
const GROUND_H = 56;                 // thickness of the bottom ground
const GROUND_Y = H - GROUND_H;       // top surface of the ground

// Platforms you can stand on. {x, y, w, h}. The ground is index 0.
// Add/remove floating platforms here to change the stage.
const platforms = [
  { x: 0,   y: GROUND_Y, w: W,   h: GROUND_H, ground: true },
  { x: 120, y: H - 150,  w: 150, h: 16 },
  { x: 530, y: H - 150,  w: 150, h: 16 },
  { x: 320, y: H - 250,  w: 160, h: 16 },
];

// ---- Player & physics ---------------------------------------------------
const PHYS = {
  gravity: 2200,        // px/s^2
  moveSpeed: 260,       // max horizontal speed (px/s)
  accel: 2600,          // ground acceleration
  airAccel: 1800,       // air control
  friction: 2400,       // ground deceleration when no input
  jumpVel: 760,         // initial jump speed (px/s)
  jumpCut: 0.45,        // velocity kept when jump released early (variable height)
  coyote: 0.09,         // grace period to jump after leaving a ledge (s)
  buffer: 0.10,         // jump press buffer before landing (s)
  maxFall: 1400,
};

const player = {
  x: W / 2 - 13, y: GROUND_Y - 36,
  w: 20, h: 20,
  vx: 0, vy: 0,
  onGround: false,
  facing: 1,
  coyoteT: 0,
  bufferT: 0,
  squash: 0,            // visual juice: -1 squash .. +1 stretch
};

// ---- Bullets ------------------------------------------------------------
// Every bullet is a plain object. The chart at the bottom calls spawn(...)
// to create them; here the engine just runs them. See the 弾幕 section.
let bullets = [];

// ---- Input --------------------------------------------------------------
const keys = {};
const LEFT  = e => e === 'ArrowLeft'  || e === 'a' || e === 'A';
const RIGHT = e => e === 'ArrowRight' || e === 'd' || e === 'D';
const JUMP  = e => e === 'ArrowUp'    || e === 'w' || e === 'W' || e === ' ';

// Core press/release, shared by keyboard AND on-screen touch buttons.
function onPress(key) {
  if (key === 'Escape') {
    if (settingsOpen()) { closeSettings(); return; }
    if (running && !paused) pauseGame();
    else if (running && paused) resumeGame();
    return;
  }
  if (JUMP(key) && !keys._jumpHeld) { player.bufferT = PHYS.buffer; }
  keys[key] = true;
  if (JUMP(key)) keys._jumpHeld = true;
}
function onRelease(key) {
  keys[key] = false;
  if (JUMP(key)) {
    keys._jumpHeld = false;
    if (player.vy < 0) player.vy *= PHYS.jumpCut;   // variable jump height
  }
}

window.addEventListener('keydown', e => {
  // Title / result screen: Enter or Space starts (not while a slider has focus
  // or the settings page is open)
  if (!running && !settingsOpen() && !overlay.classList.contains('hidden') && (e.key === 'Enter' || e.key === ' ') &&
      !(e.target instanceof HTMLInputElement)) {
    e.preventDefault();
    if (!e.repeat) start();
    return;
  }
  onPress(e.key);
  if (['ArrowLeft','ArrowRight','ArrowUp','ArrowDown',' ','Escape'].includes(e.key)) e.preventDefault();
});
window.addEventListener('keyup', e => onRelease(e.key));

const held = pred => Object.keys(keys).some(k => keys[k] && pred(k));

// On-screen move control (mobile). x = -1 left / 0 none / +1 right,
// k = how hard (0..1; the stick gives less than 1 for a small push).
const touchMove = { x: 0, k: 1 };
let movePointer = null;                   // pointer id holding the move zone
let jumpPointer = null;                   // pointer id holding the jump button

// Saved settings / best time. Browser storage can be missing or blocked
// (private windows, embedded pages), so every access is guarded.
const store = {
  get(k)    { try { return localStorage.getItem(k); } catch (e) { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* not saved */ } },
};

// ---- Game state ---------------------------------------------------------
let running = false;
let paused = false;
let scene = 'title';       // 'title' | 'play' | 'over' | 'clear'  (what visuals.js draws)
let hitsTaken = 0;
let fxScale = 1;           // 画面演出 setting: scales shake / zoom / flash / glitch
let elapsed = 0;
let best = 0;              // best time of the selected song (loaded by selectSong)

// Settings-driven values (defaults; overwritten when settings load below)
let startLives = 3;        // 残機 (debug setting)
let livesLeft = startLives;
let invuln = 0;            // invincibility timer after taking a hit (s)
let flashT = 0;            // screen flash on strong beats (1 = full, fades out)
let bulletSpeedMul = 1;    // 弾の速さ multiplier (debug setting)
let slideMove = true;      // 移動の仕方: true = slidy, false = constant speed

function reset() {
  player.x = W / 2 - player.w / 2;
  player.y = GROUND_Y - player.h;
  player.vx = 0; player.vy = 0;
  player.onGround = true;     // already standing on the ground — avoids a
                             // spurious "landing" squash on the first frame
  player.facing = 1;
  player.coyoteT = 0; player.bufferT = 0; player.squash = 0;
  bullets = [];
  elapsed = 0;
  livesLeft = startLives;
  invuln = 0;
  flashT = 0;
  hitsTaken = 0;
  songTime = 0;
  updateLivesHud();
  resetChart();              // rebuild the bullet timeline from the top
}

// ---- Update -------------------------------------------------------------
function update(dt) {
  elapsed += dt;

  // Horizontal input
  let dir = 0;
  if (held(LEFT))  dir -= 1;
  if (held(RIGHT)) dir += 1;
  let maxSpeed = PHYS.moveSpeed;
  if (touchMove.x !== 0) {             // on-screen pad / stick wins over keys
    dir = touchMove.x;
    maxSpeed = PHYS.moveSpeed * touchMove.k;
  }
  if (dir !== 0) player.facing = dir;

  if (slideMove) {
    // Slidy movement: accelerate up to speed, with friction when idle on ground
    const accel = player.onGround ? PHYS.accel : PHYS.airAccel;
    if (dir !== 0) {
      player.vx += dir * accel * dt;
      player.vx = Math.max(-maxSpeed, Math.min(maxSpeed, player.vx));
    } else if (player.onGround) {
      const f = PHYS.friction * dt;
      if (Math.abs(player.vx) <= f) player.vx = 0;
      else player.vx -= Math.sign(player.vx) * f;
    }
  } else {
    // Snappy movement: always a constant speed, instant start/stop (no sliding)
    player.vx = dir * maxSpeed;
  }

  // Gravity
  player.vy = Math.min(player.vy + PHYS.gravity * dt, PHYS.maxFall);

  // Timers
  player.coyoteT -= dt;
  player.bufferT -= dt;
  if (invuln > 0) invuln -= dt;

  // Jump (with coyote time + input buffering)
  if (player.bufferT > 0 && (player.onGround || player.coyoteT > 0)) {
    player.vy = -PHYS.jumpVel;
    player.onGround = false;
    player.coyoteT = 0;
    player.bufferT = 0;
    player.squash = 1;       // stretch on takeoff
    sfxJump();
    fxJump();
  }

  // Integrate + collide (axis-separated)
  moveAndCollide(dt);

  // Walls
  if (player.x < 0) { player.x = 0; player.vx = 0; }
  if (player.x + player.w > W) { player.x = W - player.w; player.vx = 0; }

  // Visual squash/stretch easing
  player.squash *= Math.pow(0.0001, dt);
  if (Math.abs(player.squash) < 0.01) player.squash = 0;

  updateBullets(dt);
  scoreEl.textContent = elapsed.toFixed(1) + 's';
}

// ---- Bullets: spawn from the timeline, then move & collide --------------
function updateBullets(dt) {
  // Spawn whatever the chart scheduled. Clock to the song so bullets stay in
  // sync; if the music didn't start (e.g. blocked), fall back to the game clock.
  songTime = (bgm && !bgm.paused) ? bgm.currentTime : elapsed;
  runChart(songTime);

  const e = dt * bulletSpeedMul;            // effective step (the 弾の速さ knob)
  for (const b of bullets) {
    if (b.delay > 0) {                                // charging: a warning ring
      b.delay -= dt;
      if (b.delay <= 0) fxFire(b);                    // just fired: a little pop
      continue;
    }
    b.px = b.x; b.py = b.y;                          // last position (for the trail)
    b.age += e;                                      // seconds since it fired
    b.move(b, e);                                    // run THIS bullet's movement
  }

  // Drop bullets a move() marked dead, and fired ones that left the screen
  // (charging ones are always kept).
  bullets = bullets.filter(b => !b.dead && (
    b.delay > 0 ||
    (b.x > -b.r - W && b.x < W * 2 + b.r &&
     b.y > -b.r - H && b.y < H * 2 + b.r)));

  // Collision: bullet (circle) vs player (rect). A bullet with its own
  // hits(b) test (lasers) uses that instead; b.safe = just for show.
  if (invuln <= 0) {
    for (const b of bullets) {
      if (b.delay > 0 || b.safe) continue;  // warnings don't hit you
      if (b.hits ? b.hits(b) : circleHitsPlayer(b.x, b.y, b.r)) { hitPlayer(); return; }
    }
  }

  // Reached the end of the song = clear (also works if the music is blocked)
  if (songTime >= SONG_END) winGame();
}

function circleHitsPlayer(x, y, r) {
  const nx = Math.max(player.x, Math.min(x, player.x + player.w));
  const ny = Math.max(player.y, Math.min(y, player.y + player.h));
  const dx = x - nx, dy = y - ny;
  return dx * dx + dy * dy < r * r;
}

// Does the thick line (x1,y1)-(x2,y2) with half-width r touch the player?
function segmentHitsPlayer(x1, y1, x2, y2, r) {
  const L = player.x, T = player.y, R = player.x + player.w, B = player.y + player.h;
  // distance from a point to the segment
  const segDist = (px, py) => {
    const dx = x2 - x1, dy = y2 - y1, len2 = dx * dx + dy * dy || 1;
    const k = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / len2));
    return Math.hypot(px - (x1 + dx * k), py - (y1 + dy * k));
  };
  // distance from a point to the player box
  const boxDist = (px, py) => Math.hypot(Math.max(L - px, 0, px - R), Math.max(T - py, 0, py - B));
  // the segment crosses the box? (sample along it — boxes are small, lines are long)
  const n = Math.ceil(Math.hypot(x2 - x1, y2 - y1) / 8);
  for (let i = 0; i <= n; i++) {
    const k = i / n;
    if (boxDist(x1 + (x2 - x1) * k, y1 + (y2 - y1) * k) < r) return true;
  }
  return Math.min(segDist(L, T), segDist(R, T), segDist(L, B), segDist(R, B)) < r;
}

function moveAndCollide(dt) {
  // Horizontal
  player.x += player.vx * dt;
  for (const p of platforms) {
    if (p.ground) continue;        // ground spans full width; no side walls
    if (overlapRect(player, p)) {
      if (player.vx > 0) player.x = p.x - player.w;
      else if (player.vx < 0) player.x = p.x + p.w;
      player.vx = 0;
    }
  }

  // Vertical
  const wasGround = player.onGround;
  player.onGround = false;
  player.y += player.vy * dt;
  for (const p of platforms) {
    if (!overlapRect(player, p)) continue;
    if (player.vy > 0) {           // falling -> land on top
      player.y = p.y - player.h;
      player.vy = 0;
      if (!wasGround) { player.squash = -1; fxLand(); }   // squash + dust on landing
      player.onGround = true;
    } else if (player.vy < 0 && !p.ground) { // moving up -> bonk head
      player.y = p.y + p.h;
      player.vy = 0;
    }
  }

  if (player.onGround) player.coyoteT = PHYS.coyote;
}

function overlapRect(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x &&
         a.y < b.y + b.h && a.y + a.h > b.y;
}

// ---- Draw ---------------------------------------------------------------
// Everything is drawn by drawScene() in visuals.js (background, camera,
// bullets, particles, the character, the title animation).

function roundRect(x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// ---- Main loop ----------------------------------------------------------
// Always running (the title screen is animated too). The game itself only
// advances while playing; effects keep moving except while paused.
let lastT = 0;
function loop(t) {
  let dt = (t - lastT) / 1000;
  lastT = t;
  if (dt > 0.05) dt = 0.05;          // clamp big frame gaps (tab switches)
  if (dt < 0) dt = 0;
  if (!paused) {                     // when paused: freeze time, keep last frame
    if (running) update(dt);
    updateFx(dt);
  }
  drawScene();
  if (scene === 'title') overlay.style.setProperty('--kick', kickOf(titleBeat()).toFixed(3));
  requestAnimationFrame(loop);
}

// ---- Audio (the 音量 setting controls this) -----------------------------
let audioCtx = null;
let masterVol = 0.7;

// Background music. The bullet timeline is synced to this track's playback
// time. selectSong() points it at the chosen song's file.
const bgm = new Audio();
bgm.preload = 'auto';
bgm.volume = masterVol;
// Survive to the end of the song = clear.
bgm.addEventListener('ended', () => { if (running) winGame(); });
function beep(freq, dur, type, vol) {
  if (masterVol <= 0) return;
  try {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const o = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    o.type = type || 'square';
    o.frequency.value = freq;
    const t = audioCtx.currentTime;
    g.gain.setValueAtTime(masterVol * (vol || 1) * 0.18, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(audioCtx.destination);
    o.start(t); o.stop(t + dur);
  } catch (e) { /* ignore audio errors */ }
}
function sfxJump() { beep(620, 0.10, 'square', 0.8); }
function sfxHit()  { beep(140, 0.30, 'sawtooth', 1); }

// ---- Game flow ----------------------------------------------------------
function start() {
  reset();
  fxReset();
  running = true;
  paused = false;
  scene = 'play';
  clearTimeout(resultTimer);
  overlay.classList.add('hidden');
  overlay.classList.remove('result');
  pauseOverlay.classList.add('hidden');
  pauseBtn.classList.remove('hidden');
  updateTouchControls();
  stopPreview();
  bgm.volume = masterVol;
  bgm.currentTime = 0;
  bgm.play().catch(() => {});                    // play from the top (user gesture)
}

function pauseGame() {
  if (!running || paused) return;
  paused = true;
  bgm.pause();                                   // freeze the music too
  releaseMove(); releaseJump();                  // don't keep running on resume
  pauseOverlay.classList.remove('hidden');
}

function resumeGame() {
  if (!running || !paused) return;
  paused = false;
  closeSettings();
  pauseOverlay.classList.add('hidden');
  bgm.play().catch(() => {});
}

function showTitle() {
  running = false;
  paused = false;
  scene = 'title';
  clearTimeout(resultTimer);
  stopPreview();
  bgm.pause(); bgm.currentTime = 0;
  bullets = [];
  player.x = W / 2 - player.w / 2; player.y = GROUND_Y - player.h;
  player.vx = player.vy = 0; player.onGround = true; player.facing = 1; player.squash = 0;
  invuln = 0;
  if (typeof fxReset === 'function') fxReset();
  pauseOverlay.classList.add('hidden');
  pauseBtn.classList.add('hidden');
  closeSettings();
  overlay.classList.remove('result', 'over', 'clear');
  setOverlayTitle('DODGE');
  ovSub.textContent = '';
  startBtn.textContent = 'START';
  overlay.classList.remove('hidden');
  updateTouchControls();
}

// Shared by game over and clear: stop, save best, then show the result card
// after a short delay so the explosion / fireworks can play first.
let resultTimer = 0;
function endRun(kind) {
  running = false;
  paused = false;
  scene = kind;
  bgm.pause();
  pauseBtn.classList.add('hidden');
  updateTouchControls();
  const newBest = elapsed > best;
  if (newBest) {
    best = elapsed;
    store.set(song.bestKey, String(best));
    showBest();
  }
  resultTimer = setTimeout(() => {
    overlay.classList.remove('over', 'clear');
    overlay.classList.add('result', kind);
    setOverlayTitle(kind === 'clear' ? 'CLEAR' : 'GAME OVER');
    ovSub.textContent = kind === 'clear' ? (song.clearText || '最後まで生き残った！') : (newBest ? 'NEW BEST!' : '');
    resTime.textContent = elapsed.toFixed(1) + 's';
    resBest.textContent = best.toFixed(1) + 's';
    resHits.textContent = hitsTaken;
    startBtn.textContent = 'RETRY';
    overlay.classList.remove('hidden');
  }, kind === 'clear' ? 1600 : 1000);
}

function gameOver() { fxDeath(); endRun('over'); }
function winGame()  { fxClear(); endRun('clear'); }   // reached the end of the song

function setOverlayTitle(text) {
  ovTitle.textContent = text;
  ovTitle.dataset.text = text;                   // used by the CSS glitch layers
}

function hitPlayer() {
  livesLeft -= 1;
  hitsTaken += 1;
  updateLivesHud();
  sfxHit();
  if (livesLeft <= 0) { gameOver(); return; }
  fxHit();
  invuln = 1.6;          // brief mercy invincibility, then play continues as-is
                         // (bullets are NOT cleared — the run keeps going)
}

function updateLivesHud() {
  livesHud.textContent = livesLeft;
  livesHud.classList.remove('bump');
  void livesHud.offsetWidth;                     // restart the CSS bump animation
  livesHud.classList.add('bump');
}

// ---- Settings UI (built once, moved between title & pause) ---------------
const settingsPanel = document.importNode(
  document.getElementById('settingsTemplate').content.querySelector('#settingsPanel'), true);
mountSettings.appendChild(settingsPanel);       // lives on the settings page for good

// The settings page (title, result and pause screens all open the same one)
const settingsOpen = () => !settingsModal.classList.contains('hidden');
function openSettings()  { settingsModal.classList.remove('hidden'); mountSettings.scrollTop = 0; }
function closeSettings() { settingsModal.classList.add('hidden'); }

// Sliders: { id, value-label id, storage key, default, how to apply, label format }
const sliderDefs = [
  { id: 'volume',      val: 'volVal',    store: 'dodge_volume',      def: 70,             apply: v => { masterVol = v / 100; bgm.volume = masterVol; }, fmt: v => v },
  { id: 'fxAmount',    val: 'fxVal',     store: 'dodge_fx',          def: 100,            apply: v => fxScale = v / 100,        fmt: v => v + '%' },
  { id: 'moveSpeed',   val: 'moveVal',   store: 'dodge_moveSpeed',   def: PHYS.moveSpeed, apply: v => PHYS.moveSpeed = v,        fmt: v => v },
  { id: 'jumpVel',     val: 'jumpVal',   store: 'dodge_jumpVel',     def: PHYS.jumpVel,   apply: v => PHYS.jumpVel = v,          fmt: v => v },
  { id: 'lives',       val: 'livesVal',  store: 'dodge_lives',       def: 3,              apply: v => startLives = v,           fmt: v => v },
  { id: 'bulletSpeed', val: 'bulletVal', store: 'dodge_bulletSpeed', def: 100,            apply: v => bulletSpeedMul = v / 100, fmt: v => v + '%' },
];
for (const d of sliderDefs) {
  const slider = settingsPanel.querySelector('#' + d.id);
  const valEl = settingsPanel.querySelector('#' + d.val);
  const saved = store.get(d.store);
  slider.value = saved !== null ? saved : d.def;
  const apply = () => {
    const v = Number(slider.value);
    d.apply(v);
    valEl.textContent = d.fmt(v);
    store.set(d.store, String(v));
  };
  slider.addEventListener('input', apply);
  apply();
}

// Control mode (PC / mobile) — only selectable on the title screen
let controlMode = store.get('dodge_controlMode') || 'pc';
const modeBtns = settingsPanel.querySelectorAll('.seg-btn[data-mode]');
function setControlMode(m) {
  controlMode = m;
  store.set('dodge_controlMode', m);
  modeBtns.forEach(b => b.classList.toggle('active', b.dataset.mode === m));
  updateTouchControls();
}
modeBtns.forEach(b => b.addEventListener('click', () => setControlMode(b.dataset.mode)));
setControlMode(controlMode);

// Move control type (big ◀ ▶ pad / analog stick) for mobile controls
let moveCtl = store.get('dodge_moveCtl') || 'buttons';
const ctlBtns = settingsPanel.querySelectorAll('.seg-btn[data-ctl]');
function setMoveCtl(c) {
  moveCtl = c;
  store.set('dodge_moveCtl', c);
  ctlBtns.forEach(b => b.classList.toggle('active', b.dataset.ctl === c));
  moveZone.classList.toggle('stick', c === 'stick');
  releaseMove();
  if (typeof fitStage === 'function') fitStage();
}
ctlBtns.forEach(b => b.addEventListener('click', () => setMoveCtl(b.dataset.ctl)));

// Which side the move control sits on (left / right); jump goes on the other
let dpadSide = store.get('dodge_dpadSide') || 'left';
const dpadBtns = settingsPanel.querySelectorAll('.seg-btn[data-dpad]');
function setDpadSide(side) {
  dpadSide = side;
  store.set('dodge_dpadSide', side);
  dpadBtns.forEach(b => b.classList.toggle('active', b.dataset.dpad === side));
  touchControls.classList.toggle('dpad-right', side === 'right');
}
dpadBtns.forEach(b => b.addEventListener('click', () => setDpadSide(b.dataset.dpad)));
setDpadSide(dpadSide);

// Movement style (slidy / constant speed) — debug setting
const moveStyleBtns = settingsPanel.querySelectorAll('.seg-btn[data-move]');
function setMoveStyle(s) {
  slideMove = (s === 'slide');
  store.set('dodge_slideMove', s);
  moveStyleBtns.forEach(b => b.classList.toggle('active', b.dataset.move === s));
}
moveStyleBtns.forEach(b => b.addEventListener('click', () => setMoveStyle(b.dataset.move)));
setMoveStyle(store.get('dodge_slideMove') || 'slide');

// Show on-screen controls only in mobile mode, while actually playing
function updateTouchControls() {
  const show = controlMode === 'mobile' && running;
  touchControls.classList.toggle('hidden', !show);
  if (!show) { releaseMove(); releaseJump(); }
  fitStage();
}

// Phone held upright: the controls sit at the bottom of the screen, so shrink
// the game until its bottom edge is above them. Measured from the real
// positions, because mobile browsers' toolbars change the usable height.
function fitStage() {
  const stageEl = document.querySelector('.stage');
  const wrapEl = document.querySelector('.wrap');
  stageEl.style.width = '';
  wrapEl.style.paddingTop = '';
  const portrait = innerHeight > innerWidth;
  if (touchControls.classList.contains('hidden') || !portrait) return;
  const ctlTop = Math.min(moveZone.getBoundingClientRect().top, jumpBtn.getBoundingClientRect().top);
  const top = stageEl.getBoundingClientRect().top;
  const room = ctlTop - 12 - top;                         // free height above the controls
  const w = Math.min(stageEl.getBoundingClientRect().width, room * W / H);
  if (w > 0) stageEl.style.width = Math.floor(w) + 'px';
  // Left-over space (tall phones): split it above and below, so the score and
  // the game sit in the middle of the area above the buttons, not jammed at the top.
  const free = ctlTop - 12 - stageEl.getBoundingClientRect().bottom;
  if (free > 8) {
    const base = parseFloat(getComputedStyle(wrapEl).paddingTop) || 0;
    wrapEl.style.paddingTop = Math.round(base + free / 2) + 'px';
  }
}
window.addEventListener('resize', fitStage);
window.addEventListener('orientationchange', () => setTimeout(fitStage, 300));
if (window.visualViewport) visualViewport.addEventListener('resize', fitStage);

// ---- Move zone: one big area, tracked by pointer (multi-touch safe) -------
// ◀ ▶ pad : the half your finger is on decides the direction, so sliding
//           across switches direction without lifting.
// Stick   : the stick appears where you touch; push sideways to move, and a
//           small push moves slower than a full push.
const STICK_R = 56;                       // how far the knob travels (px)
let stickO = { x: 0, y: 0 };              // where the stick was put down

function moveFrom(e) {
  if (moveCtl === 'buttons') {
    const r = moveZone.getBoundingClientRect();
    touchMove.x = e.clientX < r.left + r.width / 2 ? -1 : 1;
    touchMove.k = 1;
  } else {
    const dx = e.clientX - stickO.x, dy = e.clientY - stickO.y;
    const len = Math.hypot(dx, dy), cl = Math.min(len, STICK_R);
    const kx = len ? dx / len * cl : 0, ky = len ? dy / len * cl : 0;
    stickKnob.style.transform = `translate(${kx}px, ${ky}px)`;
    const ax = Math.abs(dx) / STICK_R;
    if (ax < 0.2) touchMove.x = 0;                                   // dead zone
    else {
      touchMove.x = Math.sign(dx);
      touchMove.k = 0.35 + 0.65 * Math.min(1, (ax - 0.2) / 0.55);   // full speed at ~75%
    }
  }
  lrLeft.classList.toggle('pressed', touchMove.x < 0);
  lrRight.classList.toggle('pressed', touchMove.x > 0);
}
function releaseMove() {
  movePointer = null;
  touchMove.x = 0;
  lrLeft.classList.remove('pressed');
  lrRight.classList.remove('pressed');
  stickKnob.style.transform = '';
  stickBase.classList.remove('active');
  stickBase.style.left = stickBase.style.top = '';
}
moveZone.addEventListener('pointerdown', e => {
  if (movePointer !== null) return;
  e.preventDefault();
  movePointer = e.pointerId;
  try { moveZone.setPointerCapture(e.pointerId); } catch (_) {}
  if (moveCtl === 'stick') {
    const r = moveZone.getBoundingClientRect(), half = stickBase.offsetWidth / 2;
    const x = Math.max(r.left + half, Math.min(r.right - half, e.clientX));
    const y = Math.max(r.top + half, Math.min(r.bottom - half, e.clientY));
    stickO = { x, y };
    stickBase.style.left = (x - r.left) + 'px';
    stickBase.style.top = (y - r.top) + 'px';
    stickBase.classList.add('active');
  }
  moveFrom(e);
});
moveZone.addEventListener('pointermove', e => { if (e.pointerId === movePointer) moveFrom(e); });
for (const ev of ['pointerup', 'pointercancel', 'lostpointercapture']) {
  moveZone.addEventListener(ev, e => { if (e.pointerId === movePointer) releaseMove(); });
}

// ---- Jump button ----------------------------------------------------------
function releaseJump() {
  if (jumpPointer === null) return;
  jumpPointer = null;
  onRelease(' ');
  jumpBtn.classList.remove('pressed');
}
jumpBtn.addEventListener('pointerdown', e => {
  e.preventDefault();
  if (jumpPointer !== null) return;
  jumpPointer = e.pointerId;
  try { jumpBtn.setPointerCapture(e.pointerId); } catch (_) {}
  onPress(' ');
  jumpBtn.classList.add('pressed');
});
for (const ev of ['pointerup', 'pointercancel', 'lostpointercapture']) {
  jumpBtn.addEventListener(ev, e => { if (e.pointerId === jumpPointer) releaseJump(); });
}

// Block the long-press text selection / context menu (iOS & Android). Without
// this, holding a touch button could start selecting the pause or arrow
// buttons, and the game stopped reacting to taps. Range sliders are left alone.
const notSlider = e => !(e.target instanceof HTMLInputElement);
document.addEventListener('selectstart', e => { if (notSlider(e)) e.preventDefault(); });
document.addEventListener('contextmenu', e => e.preventDefault());
// While playing, a touch anywhere outside the menus / pause button never
// scrolls, zooms or selects (the pause button still needs its click).
document.addEventListener('touchstart', e => {
  if (running && !paused && !e.target.closest('.overlay, .pause-btn, .modal')) e.preventDefault();
}, { passive: false });

// Buttons
startBtn.addEventListener('click', start);
resumeBtn.addEventListener('click', resumeGame);
restartBtn.addEventListener('click', start);
toTitleBtn.addEventListener('click', showTitle);
toTitleBtn2.addEventListener('click', showTitle);
settingsToggle.addEventListener('click', openSettings);
document.getElementById('pauseSettingsBtn').addEventListener('click', openSettings);
document.getElementById('settingsClose').addEventListener('click', closeSettings);
document.getElementById('settingsDone').addEventListener('click', closeSettings);
settingsModal.addEventListener('click', e => { if (e.target === settingsModal) closeSettings(); });  // tap outside
pauseBtn.addEventListener('click', () => { paused ? resumeGame() : pauseGame(); });

setMoveCtl(moveCtl);

// ---- Song select (title screen) -------------------------------------------
const songPrev = document.getElementById('songPrev');
const songNext = document.getElementById('songNext');
const songName = document.getElementById('songName');
const songMeta = document.getElementById('songMeta');

function showBest() {
  bestEl.textContent = best.toFixed(1) + 's';
  titleBest.textContent = best.toFixed(1) + 's';
}
function selectSong(i) {
  const n = SONGS.length;
  song = SONGS[((i % n) + n) % n];
  store.set('dodge_song', song.id);
  BEAT_SEC = song.beat;
  SONG_END = song.end;
  SECTIONS = song.sections;
  if (bgm.dataset.src !== song.file) {        // load the new track (keeps the old one if same)
    bgm.dataset.src = song.file;
    bgm.src = encodeURI(song.file);
  }
  best = parseFloat(store.get(song.bestKey) || '0') || 0;
  showBest();
  songName.textContent = song.title;
  songMeta.textContent = song.meta;
  document.body.dataset.theme = song.theme;    // CSS colors of the menus follow the song
  songPrev.classList.toggle('hidden', n < 2);
  songNext.classList.toggle('hidden', n < 2);
}
function changeSong(d) {
  if (running || SONGS.length < 2) return;
  selectSong(SONGS.indexOf(song) + d);
  if (typeof fxReset === 'function') fxReset();
  if (typeof fxSongChange === 'function') fxSongChange();
  playPreview();                               // a click = user gesture, so audio may play
}

// A short loop from the song's catchiest part, while choosing on the title
let previewTimer = 0;
function playPreview() {
  stopPreview();
  if (masterVol <= 0) return;
  const t0 = song.preview || 0;
  const seek = () => { try { bgm.currentTime = t0; } catch (e) { /* not loaded yet */ } };
  if (bgm.readyState >= 1) seek(); else bgm.addEventListener('loadedmetadata', seek, { once: true });
  bgm.volume = 0;
  bgm.play().catch(() => {});
  const began = performance.now();
  previewTimer = setInterval(() => {            // fade in, play ~12 s, fade out, repeat
    const e = (performance.now() - began) / 1000 % 14;
    if (e < 0.1 && bgm.currentTime > t0 + 2) bgm.currentTime = t0;
    const v = e < 1 ? e : e > 12 ? Math.max(0, 13 - e) : 1;
    bgm.volume = masterVol * 0.8 * v;
  }, 50);
}
function stopPreview() {
  if (!previewTimer) return;
  clearInterval(previewTimer);
  previewTimer = 0;
  bgm.pause();
  bgm.volume = masterVol;
}
songPrev.addEventListener('click', () => changeSong(-1));
songNext.addEventListener('click', () => changeSong(1));
window.addEventListener('keydown', e => {
  if (scene !== 'title' || running || settingsOpen() || e.target instanceof HTMLInputElement) return;
  if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') changeSong(-1);
  if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') changeSong(1);
});

// Boot up on the title screen once every script (songs/*.js, visuals.js) has
// run — DOMContentLoaded waits for all of them. Then start the loop.
document.addEventListener('DOMContentLoaded', () => {
  const saved = SONGS.findIndex(s => s.id === store.get('dodge_song'));
  selectSong(Math.max(0, saved));
  showTitle();
  requestAnimationFrame(t => { lastT = t; loop(t); });
});


/* =========================================================================
   弾幕（だんまく）の道具  —  どの曲の譜面（songs/*.js）からでも使える
   =========================================================================

   弾は ただのオブジェクト。 spawn(...) で画面に出ます。

       spawn({ x: 600, y: -10, vx: 0, vy: 200, r: 8 });
       //      出る位置        速さ(右,下)   大きさ

   出てからの流れはこれだけ:
       毎フレーム  b.move(b, dt) で位置を更新  →  画面の外に出たら消える

   ● 動きを変えたい → move に関数を渡す（下の straight / spinShape が見本）
   ● 召喚→発射までの溜め → delay（秒）。その間は赤い警告リングで、当たらない。
   ● b.age = 発射してからの秒数（揺れや時間変化に使える）
   ● move の中で b.dead = true にすると、その弾は消える（花火の破裂などに）
   ● step: 1 をつけると、拍に合わせて「カクッ、カクッ」と進む（0.5 なら8分音符ごと）
   ● color: '#ffcc00' で弾の色を変えられる（書かなければ場面の色）

   角度のはなし: x = cos(角度), y = sin(角度)。y は下向きなので、
   角度が大きくなるほど画面では「時計回り」。0=右, π/2=下, π=左。
   ========================================================================= */

const TAU = Math.PI * 2;

// 便利な小道具 ------------------------------------------------------------
function rand(min, max) { return min + Math.random() * (max - min); }     // min〜max の乱数
function playerXY() {                                                       // プレイヤーの中心 {x,y}
  return { x: player.x + player.w / 2, y: player.y + player.h / 2 };
}
function aimVel(x, y, speed) {                                              // (x,y)→プレイヤー方向の速度
  const p = playerXY();
  const a = Math.atan2(p.y - y, p.x - x);
  return { vx: Math.cos(a) * speed, vy: Math.sin(a) * speed };
}

// 曲に合わせた時間: 拍ごとに「グッ」と進んで止まる時計（秒）。step = 何拍ごとか
// 全部の弾が同じ拍でそろって動くように、曲の拍を基準にしている。
function stepTime(b, step = 1) {
  const ease = x => { const n = Math.floor(x); return n + 1 - Math.pow(1 - (x - n), 3); };
  const now = beatPos(songTime) / step;
  if (b.s0 == null) b.s0 = now;                   // 発射した瞬間を覚えておく
  return (ease(now) - ease(b.s0)) * step * BEAT_SEC * bulletSpeedMul;
}

// 画面を白く光らせる（強い音の演出）。amount = 0〜1
function flash(amount = 1) { flashT = Math.max(flashT, amount * fxScale); }

// ★これがすべての中心★ 弾を1つ作って画面に出す。
// b に書ける値: x, y(位置) / r(半径) / vx, vy(速度) / delay(溜め秒) / move(動き)
//               ＋ move が使う好きな値（cx, spin, amp ... なんでも）
function spawn(b) {
  if (b.r  == null) b.r  = 6;
  if (b.vx == null) b.vx = 0;
  if (b.vy == null) b.vy = 0;
  if (b.move == null) b.move = straight;   // 何も指定しなければ「まっすぐ」
  b.age = 0;
  b.delay = b.delay || 0;
  b.delayMax = b.delay;
  bullets.push(b);
  return b;
}

/* ---- 動き（move 関数）---------------------------------------------------
   「動き」とは『毎フレーム、弾の位置をどう変えるか』を書いた関数です。
       move(b, dt)   b = 弾そのもの（b.x/b.y を書き換えると動く）, dt = 経過秒
   下の straight が一番シンプルなお手本。これを真似て自由に増やせます。
   -------------------------------------------------------------------------- */
function straight(b, dt) {            // まっすぐ進む（spawn の初期設定）
  if (b.step) {                       // step つき: 拍に合わせてカクッ、カクッと進む
    if (b.ox == null) { b.ox = b.x; b.oy = b.y; }
    const t = stepTime(b, b.step);
    b.x = b.ox + b.vx * t;
    b.y = b.oy + b.vy * t;
    return;
  }
  b.x += b.vx * dt;
  b.y += b.vy * dt;
}

// まとめて出す道具（中身は全部 spawn を呼んでいるだけ）--------------------

// 円形に同時発射（まっすぐ外向き）
function ring({ x, y, count, speed, r = 6, delay = 0, start = 0, step = 0, color }) {
  for (let i = 0; i < count; i++) {
    const a = start + (i / count) * TAU;
    spawn({ x, y, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed, r, delay, step, color });
  }
}

// 回って見える渦（まっすぐ飛ぶ弾を、少しずつ時間差で出す）
//   turns=周回数 / gap=1発ごとの遅れ秒 / start=開始角 / delay=全体の溜め
function spiral({ x, y, count, speed, r = 6, turns = 1, gap = 0.05, start = 0, delay = 0, step = 0, color }) {
  for (let i = 0; i < count; i++) {
    const a = start + (i / count) * TAU * turns;
    spawn({ x, y, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed, r, delay: delay + i * gap, step, color });
  }
}

// 扇形の狙い撃ち: プレイヤーの方向を真ん中にして count 発を spread（ラジアン）ずつ開く
function fan({ x, y, count = 3, spread = 0.3, speed = 220, r = 7, delay = 0 }) {
  const p = playerXY();
  const base = Math.atan2(p.y - y, p.x - x);
  for (let i = 0; i < count; i++) {
    const a = base + (i - (count - 1) / 2) * spread;
    spawn({ x, y, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed, r, delay });
  }
}

// ゆらゆら揺れながら落ちる弾: fall=落ちる速さ / amp=揺れ幅(px) / freq=揺れの速さ
function wave({ x, y, fall = 170, amp = 60, freq = 5, r = 8, delay = 0 }) {
  spawn({
    x, y, r, delay, x0: x, fall, amp, freq,
    move(b, dt) {
      b.y += b.fall * dt;
      b.x = b.x0 + Math.sin(b.age * b.freq) * b.amp;
    },
  });
}

// ---- ここから下は「新しい形態」の弾 -------------------------------------

// 花火: 打ち上がって減速し、fuse 秒後に破裂してリングになる
//   vx, vy=打ち上げの速さ / fuse=破裂までの秒 / count, speed=破裂したリングの数と速さ
function firework({ x, y, vx = 0, vy = -420, fuse = 0.9, count = 14, speed = 150, r = 10, bits = 6, delay = 0 }) {
  spawn({
    x, y, vx, vy, r, delay, fuse, count, speed, bits, color: '#ffd166', fx: 'spark', lane: [0, -1],
    move(b, dt) {
      b.vx *= Math.pow(0.25, dt);             // だんだん減速
      b.vy *= Math.pow(0.25, dt);
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      if (b.age >= b.fuse) {                  // 時間が来たら破裂
        ring({ x: b.x, y: b.y, count: b.count, speed: b.speed, r: b.bits, start: rand(0, TAU), color: '#ffd166' });
        sparks(b.x, b.y, { n: 40, color: '#ffd166', speed: 320, life: 0.9, size: 3, gravity: 160 });
        shockRing(b.x, b.y, { color: '#fff3c4', size: 150, life: 0.5, width: 4 });
        shake(5);
        b.dead = true;                        // 玉そのものは消す
      }
    },
  });
}

// はね玉: 重力で落ちて、地面と足場の上でポンポン跳ねる。壁では跳ね返る。life 秒で消える
//   vx=横の速さ / hop=跳ねる強さ（大きいほど高く跳ぶ）
function bouncer({ x, y, vx = 160, vy = 0, hop = 620, r = 12, life = 7, delay = 0 }) {
  spawn({
    x, y, vx, vy, r, delay, hop, life, color: '#2ef2b1',
    move(b, dt) {
      const bottom = b.y + b.r;
      b.vy += 1400 * dt;                      // 重力
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      if (b.x < b.r || b.x > W - b.r) { b.vx = -b.vx; b.x = Math.max(b.r, Math.min(W - b.r, b.x)); }
      if (b.vy > 0) {
        for (const p of platforms) {          // 上から着地したら跳ねる
          if (bottom <= p.y && b.y + b.r >= p.y && b.x > p.x && b.x < p.x + p.w) {
            b.y = p.y - b.r;
            b.vy = -b.hop;
            shockRing(b.x, p.y, { color: '#2ef2b1', size: 50, life: 0.3, width: 3 });
          }
        }
      }
      if (b.age > b.life) b.dead = true;
    },
  });
}

// 噴水: 地面から弾が縦一列に吹き上がる（x に警告が出るので、横に逃げる）
//   count=何発 / gap=1発ごとの遅れ秒 / speed=上がる速さ
function geyser({ x, count = 7, gap = 0.08, speed = 520, r = 9, delay = 0 }) {
  for (let i = 0; i < count; i++) {
    spawn({ x, y: GROUND_Y - r, vy: -speed, r, delay: delay + i * gap, lane: [0, -1] });
  }
}

// すき間のある横一列: 画面の幅いっぱいに弾を並べて落とす。gapX のあたりだけ穴があく
//   gapX=穴の中心 / gapW=穴の幅 / spacing=弾の間隔 / vy=落ちる速さ
//   step=1 にすると、拍ごとにガクッ、ガクッと降りてくる
function curtain({ y = -10, gapX, gapW = 110, spacing = 30, vy = 150, r = 9, delay = 0, step = 0 }) {
  for (let x = spacing / 2; x < W; x += spacing) {
    if (Math.abs(x - gapX) < gapW / 2) continue;   // 穴の部分は出さない
    spawn({ x, y, vy, r, delay, step });
  }
}

// 追尾弾: seek 秒のあいだ、プレイヤーの方へ少しずつ曲がる。そのあとはまっすぐ
//   turn=1秒に曲がれる角度（ラジアン。大きいほどしつこい）
function homing({ x, y, speed = 170, turn = 1.8, seek = 2.2, r = 9, delay = 0 }) {
  const v = aimVel(x, y, speed);
  spawn({
    x, y, vx: v.vx, vy: v.vy, r, delay, speed, turn, seek, color: '#c77dff', fx: 'spark',
    move(b, dt) {
      if (b.age < b.seek) {
        const p = playerXY();
        const now = Math.atan2(b.vy, b.vx);
        let diff = Math.atan2(p.y - b.y, p.x - b.x) - now;
        diff = Math.atan2(Math.sin(diff), Math.cos(diff));      // -π〜π に直す
        const a = now + Math.max(-b.turn * dt, Math.min(b.turn * dt, diff));
        b.vx = Math.cos(a) * b.speed;
        b.vy = Math.sin(a) * b.speed;
      }
      b.x += b.vx * dt;
      b.y += b.vy * dt;
    },
  });
}

// 隕石: 上から巨大な弾が落ちてきて、地面に当たると左右へ衝撃波（地面すれすれ → ジャンプ）
//   ＋ 上向きに破片が飛び散る。fall=落ちる速さ / wave=衝撃波の速さ
function meteor({ x, y = 40, fall = 1000, r = 28, wave = 220, delay = 0 }) {
  spawn({
    x, y, r, delay, fall, wave, color: '#ffb347', fx: 'fire', lane: [0, 1],
    move(b, dt) {
      b.y += b.fall * dt;
      if (b.y + b.r >= GROUND_Y) {             // 地面に着いた
        const gy = GROUND_Y - 10;
        spawn({ x: b.x, y: gy, vx: -b.wave, r: 10, color: '#ffb347' });
        spawn({ x: b.x, y: gy, vx:  b.wave, r: 10, color: '#ffb347' });
        for (let i = 0; i < 5; i++) {          // 上に飛び散る破片
          const a = -Math.PI / 2 + (i - 2) * 0.35;
          spawn({ x: b.x, y: gy - 10, vx: Math.cos(a) * 260, vy: Math.sin(a) * 260, r: 6, color: '#ff7b3d' });
        }
        // 演出: 光る・ゆれる・火花・地面に広がる輪
        flash(0.5); shake(16); punch(0.04); glitch(0.3);
        sparks(b.x, GROUND_Y, { n: 45, color: '#ffb347', speed: 420, life: 0.8, size: 4, gravity: 700, dir: -Math.PI / 2, spread: 2.6 });
        shockRing(b.x, GROUND_Y, { color: '#ffd9a0', size: 220, life: 0.55, width: 6 });
        b.dead = true;
      }
    },
  });
}

// 首ふりの連射: (x, y) から、向きを左右にふりながら弾を1発ずつ撃ち続ける
//   aim=真ん中の向き(ラジアン) / swing=ふれ幅 / swings=往復の回数 / gap=1発ごとの間隔(秒)
function sweep({ x, y, count = 24, speed = 220, aim = Math.PI / 2, swing = 0.9, swings = 1, gap = 0.08, r = 6, delay = 0 }) {
  for (let i = 0; i < count; i++) {
    const a = aim + Math.sin((i / count) * TAU * swings) * swing;
    spawn({ x, y, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed, r, delay: delay + i * gap });
  }
}

// せまってくる輪: (x, y) を囲む輪が回りながら縮んでいき、真ん中に着いたら消える
//   size=最初の半径 / speed=1秒で縮む長さ / spin=回る速さ → すき間を見つけて外へ出る
//   拍に合わせて「グッ、グッ」と縮む（step=何拍ごとか）
function closeIn({ x, y, count = 14, size = 380, speed = 130, spin = 0.5, r = 8, start = 0, delay = 0, step = 1 }) {
  for (let i = 0; i < count; i++) {
    const corner = start + i * (TAU / count);
    spawn({
      x: x + Math.cos(corner) * size, y: y + Math.sin(corner) * size, r, delay,
      cx: x, cy: y, corner, size, speed, spin, stepN: step, color: '#e0e7ff',
      move(b, dt) {
        const t = b.stepN ? stepTime(b, b.stepN) : b.age;
        const rad = b.size - b.speed * t;
        if (rad <= 4) { b.dead = true; return; }        // 真ん中に着いたら消える
        const ang = b.corner + b.spin * t;
        b.x = b.cx + Math.cos(ang) * rad;
        b.y = b.cy + Math.sin(ang) * rad;
      },
    });
  }
}

// ★回転する図形★ 中心のまわりに count 個の弾を等間隔で並べ、まるごと回す。
// 「リング」も「正方形」もこれ1つ。count を増やせば円（リング）、少なくすれば
// 多角形（4で正方形・3で三角形）。中心は vx,vy で動かせるので、回しながら飛ばせる。
//   x, y   … スタート位置（図形の中心）
//   count  … 弾の数（＝角の数）。多いほど円に近づく
//   size   … 中心から弾までの距離（図形の大きさ）。0 から grow で広げてもOK
//   spin   … 回る速さ（＋で時計回り、−で反時計回り）
//   grow   … 1秒で size がどれだけ広がるか（0 なら大きさ一定）
//   vx, vy … 中心が動く速さ（＋vy で下へ。0 ならその場で回るだけ）
//   start  … 最初の向き（ラジアン）。図形の傾きを変えたいとき
//   pulse  … 拍のたびに一瞬ふくらむ大きさ（px）。0 ならふくらまない
// 考え方は「中心＋回転した角のオフセット」を毎フレーム計算しているだけ。
function spinShape({ x, y, count = 4, size = 36, spin = 2.5, grow = 0, vx = 0, vy = 0, r = 7, start = 0, delay = 0, pulse = 0, color }) {
  for (let i = 0; i < count; i++) {
    const corner = start + i * (TAU / count);   // この弾が中心から見て向く角度
    spawn({
      x, y, r, delay,
      cx: x, cy: y, vx, vy, corner, size, spin, grow, pulse, color,
      move: orbitMove,
    });
  }
}
// spinShape / spinX の弾の動き（どちらも同じ計算）
function orbitMove(b) {
  const mx = b.cx + b.vx * b.age;          // ① 中心が進む
  const my = b.cy + b.vy * b.age;
  const turn = b.snap                      // ② 全体が回る（snap: 拍ごとにカクッと）
    ? b.snap * stepTime(b, 1) / (BEAT_SEC * bulletSpeedMul)
    : b.spin * b.age;
  const ang = b.corner + turn;
  const rad = b.size + b.grow * b.age      // ③ だんだん広がる
            + b.pulse * beatKick(songTime); //    ＋ 拍のたびにふくらむ
  b.x = mx + Math.cos(ang) * rad;          // ④ 中心＋回転した角
  b.y = my + Math.sin(ang) * rad;
}

/* ---- ここから下は「Re:Unknown X」で生まれた形態（データ・レーザー系）------
   shape: 'block' をつけた弾は、丸ではなく回る四角（データのかたまり）で描かれる。
   当たり判定はどれも今までと同じ「丸」。
   -------------------------------------------------------------------------- */

// 拍の番号（発射のちょうどその拍を確実に数えるため、少しだけ前にずらして数える）
const beatIndex = (t, per = 1) => Math.floor(beatPos(t) / per + 0.05);

// ブリンク: なめらかに動かず、拍のたびに「パッ」と瞬間移動して進む。
// 次に移る場所はうっすら四角で予告される。vx, vy = 速さ（px/秒、平均）/ step = 何拍ごとに跳ぶか
function blink({ x, y, vx = 0, vy = 160, r = 9, step = 1, delay = 0, color }) {
  spawn({
    x, y, vx, vy, r, delay, color, every: step, shape: 'block', noTrail: true,
    move(b) {
      const n = beatIndex(songTime, b.every);
      if (b.n0 == null) { b.n0 = n; b.ox = b.x; b.oy = b.y; }
      const hop = b.every * BEAT_SEC * bulletSpeedMul;          // 1回の瞬間移動で進む「時間」
      const nx = b.ox + b.vx * (n - b.n0) * hop, ny = b.oy + b.vy * (n - b.n0) * hop;
      if (nx !== b.x || ny !== b.y) { blip(b.x, b.y, b); b.x = nx; b.y = ny; }
      b.nx = b.x + b.vx * hop; b.ny = b.y + b.vy * hop;         // 次の位置（予告の四角）
    },
  });
}

// 分裂ブロック: 大きなブロックが、every 拍ごとに X の形（ななめ4方向）に割れる。gen 回まで割れる
//   speed = 割れた破片の速さ / start = 割れる向き（π/4 で X、0 で ＋）
function splitter({ x, y, vx = 0, vy = 120, r = 18, gen = 2, every = 2, speed = 150, start = Math.PI / 4, delay = 0, color }) {
  spawn({
    x, y, vx, vy, r, delay, gen, every, speed, start, color, shape: 'block',
    move(b, dt) {
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      const n = beatIndex(songTime, b.every);
      if (b.n0 == null) b.n0 = n;
      if (n > b.n0 && b.gen > 0) {                              // 拍が来た → 割れる
        for (let i = 0; i < 4; i++) {
          const a = b.start + i * (TAU / 4);
          splitter({ x: b.x, y: b.y, vx: Math.cos(a) * b.speed, vy: Math.sin(a) * b.speed, r: b.r * 0.62,
                     gen: b.gen - 1, every: b.every, speed: b.speed * 1.15, start: b.start + Math.PI / 4, color: b.color });
        }
        shockRing(b.x, b.y, { color: b.color || '#ffffff', size: b.r * 4, life: 0.3, width: 3 });
        b.dead = true;
      }
    },
  });
}

// 経路パケット: 拍ごとに「横」「縦」と交互に1マスずつカクッと進んで、プレイヤーへ近づく。
// hops 回進んだら、あとは1マスずつ下へ落ちていく。cell = 1マスの大きさ(px)
function router({ x, y, cell = 56, hops = 8, r = 9, delay = 0, color }) {
  spawn({
    x, y, r, delay, cell, hops, color, shape: 'block',
    move(b) {
      const f = beatPos(songTime) + 0.05, n = Math.floor(f);
      if (b.cur == null) { b.cur = n; b.hop = 0; b.fx0 = b.tx = b.x; b.fy0 = b.ty = b.y; }
      if (n > b.cur) {                                          // 次の拍: 行き先を決める
        b.cur = n;
        b.fx0 = b.tx; b.fy0 = b.ty;
        const p = playerXY(), dx = p.x - b.tx, dy = p.y - b.ty;
        const c = b.cell * bulletSpeedMul;
        if (b.hop >= b.hops) b.ty += c;                          // 追いかけ終わり → 下へ
        else if (b.hop % 2 === 0) b.tx += Math.abs(dx) < c / 2 ? 0 : Math.sign(dx) * c;
        else b.ty += dy > c / 2 ? c : 0;                         // 縦は下にだけ進む
        b.hop++;
        if (b.ty > H + 40) b.dead = true;
      }
      const e = 1 - Math.pow(1 - Math.min(1, (f - n) * 3), 3);   // 拍の頭ですばやく動いて止まる
      b.x = b.fx0 + (b.tx - b.fx0) * e;
      b.y = b.fy0 + (b.ty - b.fy0) * e;
    },
  });
}

// データの滝: x の列に、ブロックが縦一列で並んで落ちてくる（step 拍ごとにガクッと進む）
function stream({ x, count = 5, gap = 34, vy = 260, r = 8, step = 0.5, delay = 0, color }) {
  for (let i = 0; i < count; i++) {
    spawn({ x, y: -20 - i * gap, vy, r, delay, step, color, shape: 'block', lane: i === 0 ? [0, 1] : null });
  }
}

// 回る X: 中心から4本の腕（X の形）にブロックを並べて、まるごと回す。
//   per = 1本の腕の弾の数 / gap = 弾の間隔 / spin = 回る速さ
//   snap = 1拍ごとに回る角度（これを使うと「カクッ、カクッ」と拍で回る。spin より優先）
function spinX({ x, y, arms = 4, per = 4, gap = 26, inner = 18, spin = 1.6, snap = 0, vx = 0, vy = 0, r = 7, start = Math.PI / 4, pulse = 0, delay = 0, color }) {
  for (let a = 0; a < arms; a++) {
    for (let j = 0; j < per; j++) {
      spawn({
        x, y, r, delay, color, shape: 'block',
        cx: x, cy: y, vx, vy, corner: start + a * (TAU / arms), size: inner + j * gap, spin, snap, grow: 0, pulse,
        move: orbitMove,
      });
    }
  }
}

// 文字の形に並んだブロック（'X' と '?'）。cell = 1マスの大きさ。まとめて vx, vy で動く
const GLYPHS = {
  'X': ['10001', '01010', '00100', '01010', '10001'],
  '?': ['01110', '10001', '00010', '00100', '00000', '00100'],
};
function glyph({ ch = 'X', x, y, cell = 22, vx = 0, vy = 90, r = 7, step = 0, delay = 0, color }) {
  const rows = GLYPHS[ch];
  rows.forEach((row, j) => [...row].forEach((on, i) => {
    if (on !== '1') return;
    spawn({ x: x + (i - (row.length - 1) / 2) * cell, y: y + (j - (rows.length - 1) / 2) * cell, vx, vy, r, step, delay, color, shape: 'block' });
  }));
}

// ★レーザー★ 線の形の攻撃。delay（＝予告）秒のあいだ細い予告線が点滅し、
// そのあと hold 秒だけ太いビームになって当たる。消えていく光には当たらない。
//   (x1,y1)-(x2,y2) = 線の両はし / width = 太さ / move = ビームを動かしたいとき（下の scanner）
function laser({ x1, y1, x2, y2, width = 16, delay = 0.6, hold = 0.25, color, move }) {
  return spawn({
    kind: 'laser', x: (x1 + x2) / 2, y: (y1 + y2) / 2, r: width / 2, x1, y1, x2, y2, delay, hold, color, slide: move,
    move(b, dt) {
      if (b.slide) b.slide(b, dt);
      if (b.age >= b.hold) b.safe = true;
      if (b.age >= b.hold + 0.3) b.dead = true;
    },
    hits: b => segmentHitsPlayer(b.x1, b.y1, b.x2, b.y2, b.r),
  });
}

// X の字のレーザー: (x, y) を通るななめ2本。この曲のいちばんの見せ場
function xStrike({ x, y, len = 1100, width = 18, delay = 0.6, hold = 0.25, color = '#ff2a6d' }) {
  for (const a of [Math.PI / 4, -Math.PI / 4]) {
    const dx = Math.cos(a) * len / 2, dy = Math.sin(a) * len / 2;
    laser({ x1: x - dx, y1: y - dy, x2: x + dx, y2: y + dy, width, delay, hold, color });
  }
}

// 縦の柱: 画面を n 列に分けて、cols に書いた列（0 = 左はし）に上から下までのビーム
function columns({ cols, n = 8, delay = 0.6, hold = 0.25, color }) {
  const cw = W / n;
  for (const c of cols) {
    const x = (c + 0.5) * cw;
    laser({ x1: x, y1: -40, x2: x, y2: GROUND_Y + 30, width: cw - 12, delay, hold, color });
  }
}

// 床のビーム: 地面すれすれを横一面に走る。ちょうどその拍に空中（か足場の上）にいればセーフ
function floorStrike({ delay = 0.6, hold = 0.18, color = '#ff2a6d' }) {
  laser({ x1: -40, y1: GROUND_Y - 9, x2: W + 40, y2: GROUND_Y - 9, width: 18, delay, hold, color }).label = '▲ JUMP ▲';
}

// スキャナー: 縦のビームが横へ走る。y1〜y2 の高さだけに当たる
//   低いもの（地面〜50px）→ 跳び越える / 高いもの（上〜地面の60px上）→ 跳ばずに地面にいる
function scanner({ fromLeft = true, y1, y2, speed = 420, width = 12, delay = 0.6, color }) {
  const x = fromLeft ? -10 : W + 10, vx = fromLeft ? speed : -speed;
  const b = laser({
    x1: x, y1, x2: x, y2, width, delay, hold: 99, color,
    move(b, dt) {
      b.x1 += b.vx * dt; b.x2 = b.x1; b.x = b.x1;
      if (b.x1 < -30 || b.x1 > W + 30) b.dead = true;
    },
  });
  b.vx = vx;
  b.lane = [Math.sign(vx), 0];
  return b;
}

// ファイアウォール: 1か所だけ穴の空いた横のビームが、拍ごとにガクッと下りてくる。
//   gapX, gapW = 穴の場所と幅 / steps = 何回で下までくるか / step = 何拍ごとに下りるか
function firewall({ gapX, gapW = 120, y0 = 60, y1 = GROUND_Y - 12, steps = 6, step = 1, delay = 0.6, color }) {
  const parts = [[-40, gapX - gapW / 2], [gapX + gapW / 2, W + 40]];
  for (const [a, z] of parts) {
    if (z - a < 10) continue;
    laser({
      x1: a, y1: y0, x2: z, y2: y0, width: 14, delay, hold: (steps + 1) * step * BEAT_SEC, color,
      move(b) {
        const k = Math.min(steps, stepTime(b, step) / (step * BEAT_SEC * bulletSpeedMul));
        b.y1 = b.y2 = b.y = y0 + (y1 - y0) * k / steps;
      },
    });
  }
}

// 譜面の進行役: 時刻が来たキューを順に発火するだけ。
let chart = [];
let chartIndex = 0;
function resetChart() { chart = song.build(); chartIndex = 0; }
function runChart(t) {
  while (chartIndex < chart.length && chart[chartIndex].t <= t) {
    chart[chartIndex].fn();
    chartIndex++;
  }
}
