"use strict";

/* =========================================================================
   ENGINE  —  character, physics, ground/platforms, collision, game loop.
   You normally don't need to touch this part.
   Scroll down to the "弾幕" section at the bottom to author your bullets.
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

// ---- The song's beat grid ------------------------------------------------
// 120 BPM: one beat = 0.5 s, first bar starts at 0.865 s. Around 106 s the
// beat shifts ~0.12 s earlier, so the grid switches base there.
const BEAT_SEC = 0.5;
const SONG_END = 128.8;
function beatTime(n) { return (n <= 210 ? 0.865 : 0.75) + n * BEAT_SEC; }   // time of beat n
function beatPos(t) {                                                         // beat number at time t (fractional)
  if (t <= 105.865) return (t - 0.865) / BEAT_SEC;
  if (t < 106.25) return 210 + (t - 105.865) / 0.385;
  return (t - 0.75) / BEAT_SEC;
}
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

// ---- Game state ---------------------------------------------------------
let running = false;
let paused = false;
let scene = 'title';       // 'title' | 'play' | 'over' | 'clear'  (what visuals.js draws)
let hitsTaken = 0;
let fxScale = 1;           // 画面演出 setting: scales shake / zoom / flash / glitch
let elapsed = 0;
let best = parseFloat(localStorage.getItem('dodge_best') || '0') || 0;
bestEl.textContent = best.toFixed(1) + 's';
titleBest.textContent = best.toFixed(1) + 's';

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

  // Collision: bullet (circle) vs player (rect).
  if (invuln <= 0) {
    for (const b of bullets) {
      if (b.delay > 0) continue;            // warning rings don't hit you
      const nx = Math.max(player.x, Math.min(b.x, player.x + player.w));
      const ny = Math.max(player.y, Math.min(b.y, player.y + player.h));
      const dx = b.x - nx, dy = b.y - ny;
      if (dx * dx + dy * dy < b.r * b.r) { hitPlayer(); return; }
    }
  }
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
// time. (The file is named .mp3 but is actually AAC/MP4 — browsers play it.)
const bgm = new Audio(encodeURI('the EmpErroR.mp3'));
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
  titleBest.textContent = best.toFixed(1) + 's';
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
    localStorage.setItem('dodge_best', String(best));
    bestEl.textContent = best.toFixed(1) + 's';
  }
  resultTimer = setTimeout(() => {
    overlay.classList.remove('over', 'clear');
    overlay.classList.add('result', kind);
    setOverlayTitle(kind === 'clear' ? 'CLEAR' : 'GAME OVER');
    ovSub.textContent = kind === 'clear' ? '最後まで生き残った！' : (newBest ? 'NEW BEST!' : '');
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
  const saved = localStorage.getItem(d.store);
  slider.value = saved !== null ? saved : d.def;
  const apply = () => {
    const v = Number(slider.value);
    d.apply(v);
    valEl.textContent = d.fmt(v);
    localStorage.setItem(d.store, String(v));
  };
  slider.addEventListener('input', apply);
  apply();
}

// Control mode (PC / mobile) — only selectable on the title screen
let controlMode = localStorage.getItem('dodge_controlMode') || 'pc';
const modeBtns = settingsPanel.querySelectorAll('.seg-btn[data-mode]');
function setControlMode(m) {
  controlMode = m;
  localStorage.setItem('dodge_controlMode', m);
  modeBtns.forEach(b => b.classList.toggle('active', b.dataset.mode === m));
  updateTouchControls();
}
modeBtns.forEach(b => b.addEventListener('click', () => setControlMode(b.dataset.mode)));
setControlMode(controlMode);

// Move control type (big ◀ ▶ pad / analog stick) for mobile controls
let moveCtl = localStorage.getItem('dodge_moveCtl') || 'buttons';
const ctlBtns = settingsPanel.querySelectorAll('.seg-btn[data-ctl]');
function setMoveCtl(c) {
  moveCtl = c;
  localStorage.setItem('dodge_moveCtl', c);
  ctlBtns.forEach(b => b.classList.toggle('active', b.dataset.ctl === c));
  moveZone.classList.toggle('stick', c === 'stick');
  releaseMove();
  if (typeof fitStage === 'function') fitStage();
}
ctlBtns.forEach(b => b.addEventListener('click', () => setMoveCtl(b.dataset.ctl)));

// Which side the move control sits on (left / right); jump goes on the other
let dpadSide = localStorage.getItem('dodge_dpadSide') || 'left';
const dpadBtns = settingsPanel.querySelectorAll('.seg-btn[data-dpad]');
function setDpadSide(side) {
  dpadSide = side;
  localStorage.setItem('dodge_dpadSide', side);
  dpadBtns.forEach(b => b.classList.toggle('active', b.dataset.dpad === side));
  touchControls.classList.toggle('dpad-right', side === 'right');
}
dpadBtns.forEach(b => b.addEventListener('click', () => setDpadSide(b.dataset.dpad)));
setDpadSide(dpadSide);

// Movement style (slidy / constant speed) — debug setting
const moveStyleBtns = settingsPanel.querySelectorAll('.seg-btn[data-move]');
function setMoveStyle(s) {
  slideMove = (s === 'slide');
  localStorage.setItem('dodge_slideMove', s);
  moveStyleBtns.forEach(b => b.classList.toggle('active', b.dataset.move === s));
}
moveStyleBtns.forEach(b => b.addEventListener('click', () => setMoveStyle(b.dataset.move)));
setMoveStyle(localStorage.getItem('dodge_slideMove') || 'slide');

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
  stageEl.style.width = '';
  const portrait = innerHeight > innerWidth;
  if (touchControls.classList.contains('hidden') || !portrait) return;
  const ctlTop = Math.min(moveZone.getBoundingClientRect().top, jumpBtn.getBoundingClientRect().top);
  const top = stageEl.getBoundingClientRect().top;
  const room = ctlTop - 8 - top;                          // free height above the controls
  const w = Math.min(stageEl.getBoundingClientRect().width, room * W / H);
  if (w > 0) stageEl.style.width = Math.floor(w) + 'px';
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

// Boot up on the title screen. The loop starts once every script (the chart
// below, visuals.js) has run — DOMContentLoaded waits for all of them.
showTitle();
document.addEventListener('DOMContentLoaded', () => requestAnimationFrame(t => { lastT = t; loop(t); }));


/* =========================================================================
   弾幕（だんまく）  —  ここがあなたの編集エリア
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
      move(b, dt) {
        const mx = b.cx + b.vx * b.age;          // ① 中心が進む
        const my = b.cy + b.vy * b.age;
        const ang = b.corner + b.spin * b.age;   // ② 全体が回る
        const rad = b.size + b.grow * b.age      // ③ だんだん広がる
                  + b.pulse * beatKick(songTime); //    ＋ 拍のたびにふくらむ
        b.x = mx + Math.cos(ang) * rad;          // ④ 中心＋回転した角
        b.y = my + Math.sin(ang) * rad;
      },
    });
  }
}

/* ---- 場面（セクション）ごとの見た目 -----------------------------------
   曲の場面が変わると、画面の色・背景の図形・カメラの動きが切りかわり、
   上に場面の名前（バナー）が出ます。visuals.js がこの表を読んで描きます。
     t      … 始まる時刻（秒）            name / sub … バナーの文字
     sky    … 空の色 [上, 下]             color      … 弾と光の色
     shape  … 背景で回る図形の角の数（0 で無し）
     pulse  … 拍ごとのズーム（0.01 = 1%）  sway … 画面がゆっくり傾く角度（度）
     zoom   … [始め, 終わり] だんだんズーム  beams … 光の柱   stars … 星の流れる速さ
   -------------------------------------------------------------------------- */
const SECTIONS = [
  { t: 0,       name: 'INTRO',       sub: 'すみからの狙い撃ち',   sky: ['#1a0f3a', '#07050f'], color: '#ff4d6d', shape: 3,  pulse: 0.006, stars: 25 },
  { t: 8.865,   name: 'HEXAGON',     sub: '回る六角形',           sky: ['#0b2447', '#050b1a'], color: '#4cc9f0', shape: 6,  pulse: 0.010, stars: 45 },
  { t: 16.865,  name: 'FIREWORKS',   sub: '花火',                 sky: ['#2b1045', '#0b0514'], color: '#ffd166', shape: 5,  pulse: 0.010, stars: 45 },
  { t: 24.865,  name: 'CROSSFIRE',   sub: '跳ぶ弾・跳ばない弾',   sky: ['#0f2e2b', '#04100e'], color: '#2ef2b1', shape: 4,  pulse: 0.008, stars: 35 },
  { t: 32.865,  name: 'BOUNCE',      sub: 'はね玉',               sky: ['#1d2b53', '#070b19'], color: '#7aa2ff', shape: 8,  pulse: 0.010, stars: 40 },
  { t: 40.865,  name: 'VORTEX',      sub: 'サビ ─ 渦',            sky: ['#3a0a2e', '#10030c'], color: '#ff3ea5', shape: 6,  pulse: 0.020, stars: 90,  beams: true },
  { t: 48.865,  name: 'SWEEP',       sub: '首ふり連射',           sky: ['#2d0b45', '#0c0318'], color: '#b388ff', shape: 7,  pulse: 0.018, stars: 90,  beams: true, sway: 0.8 },
  { t: 56.865,  name: 'HUNTER',      sub: '追尾弾',               sky: ['#40120c', '#120403'], color: '#ff7b3d', shape: 3,  pulse: 0.018, stars: 90,  beams: true },
  { t: 63.8,    name: '',            sub: '',                     sky: ['#07070d', '#000000'], color: '#8888aa', shape: 0,  pulse: 0,     stars: 8 },
  { t: 65.865,  name: 'METEOR',      sub: '隕石',                 sky: ['#3b1204', '#0e0402'], color: '#ffb347', shape: 3,  pulse: 0.012, stars: 60 },
  { t: 72.865,  name: 'CURTAIN',     sub: 'すき間をくぐれ',       sky: ['#06283d', '#020b12'], color: '#47e5ff', shape: 4,  pulse: 0.010, stars: 50 },
  { t: 80.865,  name: 'RISE',        sub: 'ななめの雨',           sky: ['#1b1b3a', '#06060f'], color: '#9d4edd', shape: 5,  pulse: 0.012, stars: 80,  zoom: [1, 1.025] },
  { t: 88.865,  name: 'GEYSER',      sub: '足元に注意',           sky: ['#062b27', '#010a09'], color: '#00f5d4', shape: 6,  pulse: 0.014, stars: 120, zoom: [1.025, 1.07] },
  { t: 96.865,  name: 'CHORUS II',   sub: '逆回転の渦',           sky: ['#4a0d1f', '#12030a'], color: '#ff2e63', shape: 6,  pulse: 0.022, stars: 140, beams: true, sway: 1.6 },
  { t: 104.865, name: 'BLOOM',       sub: '花と花火',             sky: ['#3d0b3f', '#0f0312'], color: '#ff8fe5', shape: 8,  pulse: 0.020, stars: 140, beams: true, sway: 1.2 },
  { t: 112.75,  name: 'CLOSING IN',  sub: 'せまる輪から逃げろ',   sky: ['#0a1a2f', '#02060d'], color: '#e0e7ff', shape: 12, pulse: 0.014, stars: 70,  sway: 0.6 },
  { t: 120.25,  name: 'FADE',        sub: '',                     sky: ['#0b0b1a', '#000000'], color: '#a0a8ff', shape: 3,  pulse: 0.004, stars: 20 },
];

/* ---- 譜面（曲のどの時間に弾を出すか）-----------------------------------
   "the EmpErroR.mp3"  全長128.8秒 / 120 BPM（1拍0.5秒・1小節=4拍=2秒）
   最初の小節の頭 = 0.865秒。曲は 8秒（4小節）ごとにフレーズが変わります。

   ● フレーズごとに「主役の攻撃」を変えています（同じ主役は2回使わない）
       0.9〜  8.9  イントロ   … すみからの大玉狙い撃ち
       8.9〜 16.9  A1         … 回る六角形 ＋ 雨
      16.9〜 24.9  A2         … 花火 ＋ 3方向の狙い撃ち
      24.9〜 32.9  B1         … 横から「低い弾(跳ぶ)」「高い弾(跳ばない)」
      32.9〜 40.9  B2         … はね玉 ＋ 揺れる弾
      40.9〜 48.9  サビ1-1    … 真ん中からの渦
      48.9〜 56.9  サビ1-2    … 上すみからの首ふり連射
      56.9〜 63.8  サビ1-3    … 追尾弾 ＋ 裏拍の扇
      63.8〜 65.9  ブレイク   … ゆっくり落ちる大玉だけ
      65.9〜 72.9  C1         … 隕石（強いキックのたびに落ちてくる）
      72.9〜 80.9  C2         … すき間のある横一列
      80.9〜 88.9  盛り上げ1  … ななめに交差する雨
      88.9〜 96.9  盛り上げ2  … 足元からの噴水 ＋ 細かい雨
      96.9〜104.9  サビ2-1    … 左右の逆回転の渦
     104.9〜112.7  サビ2-2    … 広がる花 ＋ 花火
     112.7〜120.2  アウトロ   … せまってくる輪
     120.2〜128.8  フェード   … ゆっくりの雪

   ● 強い音（解析で目立った瞬間）には特別な弾幕
       impact(t) … 画面が光る ＋ 真ん中から大きなリング ＋ 地面の衝撃波（いちばん強い音）
       meteor    … 隕石がちょうどその音で地面に落ちる（強い音）
       hit(t)    … 画面が少し光るだけ

   タイムラインは曲の再生時刻で動くので、キューは拍にそろって発動します。
       burst(時刻, () => { spawn(...) });          ← その時刻に1回だけ実行
       fire(時刻, 警告秒, delay => ring({ ..., delay }));
                                                  ← 警告を出して、ちょうど「時刻」に発射
       beat(n) = n拍目の時刻 / bar(k) = k小節目の頭の時刻

   ● 曲に合わせて動く弾
       step: 1    … 拍ごとに「グッ」と進む（イントロの大玉・CURTAIN の横一列・CLOSING IN の輪）
       step: 0.5  … 8分音符ごと（VORTEX の渦）
       pulse: 12  … 拍のたびにふくらむ図形（HEXAGON・38.9秒の3重リング・BLOOM の花）
   -------------------------------------------------------------------------- */
function buildScript() {
  const cues = [];
  const cx = W / 2, cy = H / 3;          // 上の方の中心（ここから撃つ）

  // 時刻 t に弾を出す命令を予約する（時間順は最後の sort が直してくれる）
  const burst = (t, fn) => cues.push({ t, fn });

  // 拍の時刻（エンジンの beatTime と同じ。106秒あたりで拍のずれを直している）
  const beat = beatTime;                                     // n拍目（0始まり、小数もOK）
  const bar  = k => beat(k * 4);                             // k小節目の頭

  // ちょうど t 秒に「発射」させる: warn 秒前に召喚して、警告リングを warn 秒出す。
  const fire = (t, warn, fn) => burst(t - warn, () => fn(warn));

  // この譜面でよく使う部品 -------------------------------------------------
  // 上から降る雨つぶ（大きさ・速さは少しランダム）
  const drop = (delay, { rMin = 7, rMax = 12, vMin = 180, vMax = 240 } = {}) => {
    const r = rand(rMin, rMax);
    spawn({ x: rand(r, W - r), y: 20, vy: rand(vMin, vMax), r, delay });
  };
  // 画面の横はしから地面ぞいに飛んでくる弾
  //   LOW = 地面すれすれ → ジャンプでよける / MID = 頭の上 → 跳ばずにやりすごす
  const LOW = GROUND_Y - 10, MID = GROUND_Y - 70;
  const wall = (fromLeft, y, speed, delay) =>
    spawn({ x: fromLeft ? 10 : W - 10, y, vx: fromLeft ? speed : -speed, r: 10, delay, lane: [fromLeft ? 1 : -1, 0] });

  // ---- 強い音用の特別な弾幕 ----
  // 画面が光って、少しズームする
  const hit = (t, amount = 0.5) => burst(t, () => { flash(amount); punch(0.02 * amount); });
  // いちばん強い音: 光る・ゆれる・ノイズ ＋ 真ん中から大きなリング ＋ 地面を左右に走る衝撃波
  const impact = (t, { count = 32, speed = 230 } = {}) => {
    hit(t, 1);
    burst(t, () => {
      shake(20); punch(0.08); glitch(0.8);
      shockRing(cx, cy, { color: '#ffffff', size: 520, life: 0.8, width: 10 });
      sparks(cx, cy, { n: 60, color: '#ffffff', speed: 520, life: 0.8, size: 3, gravity: 0 });
    });
    fire(t, 0.8, delay => ring({ x: cx, y: cy, count, speed, r: 7, delay }));
    fire(t, 0.8, delay => { wall(true, LOW, 230, delay); wall(false, LOW, 230, delay); });
  };
  // 隕石がちょうど t 秒に地面へ落ちる（プレイヤーの今いる所をねらう）
  const METEOR_FALL = 1000, METEOR_TIME = (GROUND_Y - 28 - 40) / METEOR_FALL;
  const meteorAt = (t, warn = 0.6) =>
    fire(t - METEOR_TIME, warn, delay => meteor({ x: playerXY().x, y: 40, fall: METEOR_FALL, r: 28, delay }));

  // ===== イントロ 0.9〜8.9秒 ｜ すみからの大玉狙い撃ち ======================
  hit(bar(0), 0.8);                                                  // 0.9s 曲の始まり（光るだけ）
  for (let k = 1; k < 4; k++) {
    const x = k % 2 === 0 ? 120 : W - 120;
    // step: 1 → 拍に合わせて「ドン、ドン」と迫ってくる
    fire(bar(k), 0.6, delay => { const v = aimVel(x, 40, 260); spawn({ x, y: 40, vx: v.vx, vy: v.vy, r: 16, delay, step: 1 }); });
    fire(beat(k * 4 + 2), 0.4, delay => drop(delay, { rMin: 6, rMax: 8 }));
  }
  // 7.0〜8.9秒 ドラムの連打 → 渦がぐるっと1周 ＋ 7.9s の強いキックで隕石
  fire(7.0, 0.5, delay => spiral({ x: cx, y: cy, count: 24, speed: 180, r: 6, turns: 1, gap: 1.86 / 24, delay }));
  meteorAt(7.87);

  // ===== A1 8.9〜16.9秒 ｜ 回る六角形 ＋ 雨 =================================
  hit(bar(4), 0.7);                                                  // 8.9s Aメロ突入
  for (let k = 4; k < 8; k++) {
    for (let i = 0; i < 4; i++) fire(beat(k * 4 + i), 0.35, delay => drop(delay));   // 毎拍の雨
    const left = k % 2 === 0;                                        // 毎小節、左右交互・回転も逆
    fire(bar(k), 0.5, delay => spinShape({ x: left ? W * 0.3 : W * 0.7, y: -40, vy: 200, count: 6, size: 42, spin: left ? 2.6 : -2.6, pulse: 12, delay }));
  }

  // ===== A2 16.9〜24.9秒 ｜ 花火 ＋ 3方向の狙い撃ち =========================
  for (let k = 8; k < 12; k++) {
    const x = k % 2 === 0 ? W * 0.25 : W * 0.75;                     // 地面から打ち上がって空中で破裂
    fire(bar(k), 0.6, delay => firework({ x, y: GROUND_Y - 12, vx: k % 2 === 0 ? 60 : -60, vy: -560, fuse: 0.9, count: 16, speed: 150, delay }));
    for (const i of [1, 3]) {
      fire(beat(k * 4 + i), 0.4, delay => fan({ x: rand(100, W - 100), y: 30, count: 3, spread: 0.35, speed: 230, r: 7, delay }));
    }
    fire(beat(k * 4 + 2), 0.35, delay => drop(delay, { rMin: 6, rMax: 9 }));
  }

  // ===== B1 24.9〜32.9秒 ｜ 横から低い弾・高い弾 ============================
  // 低い弾（跳ぶ）と高い弾（跳ばない）が交互に来る。足場の上は安全地帯。
  for (let k = 12; k < 16; k++) {
    const L = k % 2 === 0;                                           // 小節ごとに左右を入れかえ
    fire(bar(k),          0.5, delay => wall(L,  LOW, 240, delay));
    fire(beat(k * 4 + 2), 0.5, delay => wall(!L, MID, 240, delay));
    // 足場にずっといられないように、回りながら降ってくる正方形
    if (k % 2 === 1) fire(bar(k), 0.5, delay => spinShape({ x: rand(150, W - 150), y: -40, count: 4, size: 38, spin: 2.4, vy: 210, delay }));
  }
  meteorAt(beat(52));                                                // 26.9s 強いキック

  // ===== B2 32.9〜40.9秒 ｜ はね玉 ＋ 揺れる弾 ===============================
  hit(bar(16), 0.7);                                                 // 32.9s
  fire(bar(16), 0.5, delay => bouncer({ x: 40,     y: 60, vx:  170, hop: 640, r: 13, life: 7, delay }));
  fire(bar(18), 0.5, delay => bouncer({ x: W - 40, y: 60, vx: -170, hop: 640, r: 13, life: 6, delay }));
  fire(bar(17), 0.5, delay => bouncer({ x: cx,     y: 60, vx: rand(-120, 120), hop: 700, r: 11, life: 6, delay }));
  for (let k = 16; k < 19; k++) {
    for (let i = 0; i < 4; i++) fire(beat(k * 4 + i), 0.4, delay => wave({ x: rand(80, W - 80), y: 20, fall: 150, amp: 50, freq: 4, r: 8, delay }));
  }
  // 38.9s サビ前のため: 回りながら広がる3重リング
  for (const [spin, grow] of [[0.5, 95], [0.6, 90], [0.7, 85]]) {
    fire(bar(19), 0.6, delay => spinShape({ x: cx, y: cy, count: 14, size: 0, spin, grow, r: 6, pulse: 14, delay }));
  }

  // ===== サビ1-1 40.9〜48.9秒 ｜ 真ん中からの渦 ==============================
  impact(bar(20));                                                   // 40.9s サビ突入
  for (let k = 21; k < 24; k++) {
    // 16分音符ごとに1発、1小節で1周する渦（小節ごとに回る向きが逆）
    // step: 0.5 → 8分音符ごとに全部の弾がそろって「グッ」と進む
    fire(bar(k), 0.4, delay => spiral({ x: cx, y: cy, count: 16, speed: 190, r: 6, turns: k % 2 ? -1 : 1, gap: 0.125, start: k * 0.4, step: 0.5, delay }));
    for (const i of [1, 3]) fire(beat(k * 4 + i), 0.35, delay => drop(delay, { rMin: 6, rMax: 10 }));
  }

  // ===== サビ1-2 48.9〜56.9秒 ｜ 上すみからの首ふり連射 ======================
  for (let k = 24; k < 28; k++) {
    const left = k % 2 === 0;                                        // 小節ごとに左すみ / 右すみ
    fire(bar(k), 0.5, delay => sweep({
      x: left ? 40 : W - 40, y: 40, count: 16, speed: 230, r: 7, gap: 0.125,
      aim: left ? 1.0 : Math.PI - 1.0, swing: 0.6, swings: 1, delay,
    }));
    fire(beat(k * 4 + 2), 0.35, delay => drop(delay, { rMin: 6, rMax: 9 }));
  }
  meteorAt(beat(108));                                               // 54.9s 強い音

  // ===== サビ1-3 56.9〜63.8秒 ｜ 追尾弾 ＋ 裏拍の扇 ==========================
  for (let k = 28; k < 31; k++) {
    fire(bar(k), 0.5, delay => homing({ x: k % 2 ? 60 : W - 60, y: 40, speed: 170, turn: 1.6, seek: 2.2, r: 10, delay }));
    fire(beat(k * 4 + 1.5), 0.4, delay => fan({ x: 60,     y: 40, count: 3, spread: 0.3, speed: 240, r: 7, delay }));
    fire(beat(k * 4 + 3.5), 0.4, delay => fan({ x: W - 60, y: 40, count: 3, spread: 0.3, speed: 240, r: 7, delay }));
  }
  fire(bar(31), 0.6, delay => ring({ x: cx, y: cy, count: 30, speed: 150, r: 9, delay }));   // 62.9s サビ1のしめ

  // ===== ブレイク 63.8〜65.9秒（音が消える）｜ ゆっくり落ちる大玉だけ ======
  [[128, 0.2], [129, 0.8]].forEach(([n, fx]) =>
    fire(beat(n), 0.5, delay => spawn({ x: W * fx, y: -10, vy: 110, r: 22, delay })));

  // ===== C1 65.9〜72.9秒 ｜ 隕石 ============================================
  impact(beat(130), { count: 28, speed: 200 });                      // 65.9s 音が戻る（いちばん強い音）
  // 67.9 / 69.9 / 71.9s: 強いキックのたびに隕石が落ちてくる。その間は揺れる弾
  for (const n of [134, 138, 142]) {
    meteorAt(beat(n));
    fire(beat(n + 1), 0.4, delay => wave({ x: rand(80, W / 2 - 40),     y: 20, fall: 160, amp: 50, freq: 4, r: 8, delay }));
    fire(beat(n + 2), 0.4, delay => wave({ x: rand(W / 2 + 40, W - 80), y: 20, fall: 160, amp: 50, freq: 4, r: 8, delay }));
  }
  hit(beat(134), 0.8);                                               // 67.9s はとくに強いので強めに光る

  // ===== C2 72.9〜80.9秒 ｜ すき間のある横一列 ==============================
  // 2小節ごとに、穴がひとつだけ空いた横一列が拍ごとにガクッ、ガクッと降りてくる → 穴の下に入る
  for (const k of [36, 38]) {
    fire(bar(k), 0.6, delay => curtain({ y: 20, gapX: rand(150, W - 150), gapW: 120, spacing: 30, vy: 150, r: 9, step: 1, delay }));
  }
  // 73.2〜73.9s ドラムのフィル: 素早い狙い撃ち4連
  [73.24, 73.49, 73.72, 73.86].forEach(t =>
    fire(t, 0.3, delay => { const v = aimVel(cx, -10, 300); spawn({ x: cx, y: -10, vx: v.vx, vy: v.vy, r: 8, delay }); }));
  // 73.9 / 75.9 / 77.9 / 79.9s の強いキック: 光って、左右の上すみから小さなリング
  [146, 150, 154, 158].forEach((n, i) => {
    hit(beat(n), 0.5);
    fire(beat(n), 0.5, delay => ring({ x: i % 2 ? W - 60 : 60, y: 60, count: 12, speed: 170, r: 7, start: i * 0.3, delay }));
  });

  // ===== 盛り上げ1 80.9〜88.9秒 ｜ ななめに交差する雨 ========================
  impact(beat(162), { count: 36, speed: 240 });                      // 81.9s いちばん強い一撃
  for (let n = 164; n < 176; n++) {                                  // 毎拍、左上と右上から交互にななめの雨
    const fromLeft = n % 2 === 0;
    fire(beat(n), 0.35, delay => {
      for (let j = 0; j < 2; j++) {
        const x = fromLeft ? rand(0, W * 0.5) : rand(W * 0.5, W);
        spawn({ x, y: 20, vx: fromLeft ? 110 : -110, vy: 210, r: rand(7, 10), delay });
      }
    });
  }

  // ===== 盛り上げ2 88.9〜96.9秒 ｜ 足元からの噴水 ＋ 細かい雨 ================
  for (let k = 44; k < 47; k++) {
    for (let i = 0; i < 8; i++) fire(beat(k * 4 + i / 2), 0.3, delay => drop(delay, { rMin: 5, rMax: 8, vMin: 200, vMax: 260 }));
    fire(bar(k), 0.7, delay => geyser({ x: playerXY().x, count: 7, gap: 0.08, speed: 520, r: 10, delay }));
  }
  fire(beat(183), 0.5, delay => ring({ x: W * 0.25, y: cy, count: 14, speed: 180, r: 7, delay }));  // 92.4s
  fire(beat(187), 0.5, delay => ring({ x: W * 0.75, y: cy, count: 14, speed: 180, r: 7, delay }));  // 94.4s
  // 94.9〜95.9s サビ直前: 2周する渦の連発
  [188, 189].forEach((n, i) =>
    fire(beat(n), 0.5, delay => spiral({ x: cx, y: cy, count: 36, speed: 220, r: 6, turns: 2, gap: 0.015, start: i * 1.1, delay })));

  // ===== サビ2-1 96.9〜104.9秒 ｜ 左右の逆回転の渦 ===========================
  impact(bar(48), { count: 30, speed: 200 });                        // 96.9s サビ2突入
  for (let k = 49; k < 52; k++) {
    const dir = k % 2 ? 1 : -1;                                      // 8分音符ごと、左右の2か所から逆向きに
    fire(bar(k), 0.4, delay => spiral({ x: W * 0.25, y: cy, count: 8, speed: 180, r: 6, turns:  dir, gap: 0.25, start: k * 0.5, delay }));
    fire(bar(k), 0.4, delay => spiral({ x: W * 0.75, y: cy, count: 8, speed: 180, r: 6, turns: -dir, gap: 0.25, start: k * 0.5, delay }));
    for (const i of [1, 3]) fire(beat(k * 4 + i), 0.35, delay => drop(delay));
  }
  meteorAt(bar(50));                                                 // 100.9s 強い音

  // ===== サビ2-2 104.9〜112.7秒 ｜ 広がる花 ＋ 花火 ==========================
  for (let k = 52; k < 56; k++) {
    if (k % 2 === 0) {
      fire(bar(k), 0.5, delay => spinShape({ x: cx, y: cy, count: 10, size: 0, spin:  1.2, grow: 110, r: 7, pulse: 16, delay }));
      fire(bar(k), 0.5, delay => spinShape({ x: cx, y: cy, count: 10, size: 0, spin: -1.2, grow: 110, r: 7, start: Math.PI / 10, pulse: 16, delay }));
    } else {
      fire(bar(k), 0.6, delay => firework({ x: W * 0.15, y: GROUND_Y - 12, vx:  140, vy: -600, fuse: 0.8, count: 14, speed: 160, delay }));
      fire(bar(k), 0.6, delay => firework({ x: W * 0.85, y: GROUND_Y - 12, vx: -140, vy: -600, fuse: 0.8, count: 14, speed: 160, delay }));
    }
    fire(beat(k * 4 + 2), 0.5, delay => wall(k % 2 === 0, LOW, 280, delay));
    for (const i of [1, 3]) fire(beat(k * 4 + i), 0.35, delay => drop(delay));
  }
  meteorAt(beat(214));                                               // 107.8s 強い音

  // ===== アウトロ 112.7〜120.2秒 ｜ せまってくる輪 ===========================
  // 112.7s フィナーレ: 2周の大きな渦
  hit(bar(56), 0.8);
  fire(bar(56), 0.6, delay => spiral({ x: cx, y: cy, count: 48, speed: 200, r: 7, turns: 2, gap: 0.03, delay }));
  // 114.8 / 115.8 / 117.8s の強い音: プレイヤーを囲む輪が拍ごとにグッとせまってくる → すき間から外へ出る
  [228, 230, 234].forEach((n, i) => {
    hit(beat(n), 0.6);
    fire(beat(n), 0.7, delay => {
      const p = playerXY();
      closeIn({ x: p.x, y: p.y, count: 14, size: 380, speed: 130, spin: i % 2 ? 0.5 : -0.5, r: 8, delay });
    });
  });
  fire(beat(236), 0.5, delay => bouncer({ x: 40, y: 60, vx: 150, hop: 600, r: 14, life: 5, delay }));  // 118.8s

  // ===== フェードアウト 120.2〜128.8秒 ｜ ゆっくりの雪 ======================
  fire(beat(239), 0.8, delay => ring({ x: cx, y: cy, count: 12, speed: 120, r: 10, delay }));  // 最後の一発
  // あとは雪のようにゆっくり降るだけ（曲の最後まで生き残ればクリア）
  for (let t = beat(242); t < 126; t += 1.0) {
    burst(t, () => spawn({ x: rand(20, W - 20), y: -10, vy: rand(70, 100), r: 5 }));
  }

  return cues.sort((a, b) => a.t - b.t);
}

// 譜面の進行役: 時刻が来たキューを順に発火するだけ。
let chart = [];
let chartIndex = 0;
function resetChart() { chart = buildScript(); chartIndex = 0; }
function runChart(t) {
  while (chartIndex < chart.length && chart[chartIndex].t <= t) {
    chart[chartIndex].fn();
    chartIndex++;
  }
}
