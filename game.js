"use strict";

/* =========================================================================
   ENGINE  —  character, physics, ground/platforms, collision, game loop.
   You normally don't need to touch this part.
   Scroll down to the "BULLET PATTERNS" section to author your 弾幕.
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
const mountTitle = document.getElementById('mountTitle');
const mountPause = document.getElementById('mountPause');

const css = (n, fallback) => {
  const v = getComputedStyle(document.documentElement).getPropertyValue(n).trim();
  return v || fallback;
};
const COL = {
  skyTop:   css('--sky-top', '#2a3a6b'),
  skyBot:   css('--sky-bottom', '#16203c'),
  ground:   css('--ground', '#3a2e26'),
  groundTop:css('--ground-top', '#6b8f3a'),
  platform: css('--platform', '#4a5a8c'),
  danger:   css('--danger', '#e24b4a'),
};

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
  w: 26, h: 36,
  vx: 0, vy: 0,
  onGround: false,
  facing: 1,
  coyoteT: 0,
  bufferT: 0,
  squash: 0,            // visual juice: -1 squash .. +1 stretch
};

// ---- Bullets ------------------------------------------------------------
// Each bullet: { x, y, vx, vy, r }. Plain circles, any radius.
let bullets = [];

// ---- Input --------------------------------------------------------------
const keys = {};
const LEFT  = e => e === 'ArrowLeft'  || e === 'a' || e === 'A';
const RIGHT = e => e === 'ArrowRight' || e === 'd' || e === 'D';
const JUMP  = e => e === 'ArrowUp'    || e === 'w' || e === 'W' || e === ' ';

// Core press/release, shared by keyboard AND on-screen touch buttons.
function onPress(key) {
  if (key === 'Escape') {
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
  onPress(e.key);
  if (['ArrowLeft','ArrowRight','ArrowUp','ArrowDown',' ','Escape'].includes(e.key)) e.preventDefault();
});
window.addEventListener('keyup', e => onRelease(e.key));

const held = pred => Object.keys(keys).some(k => keys[k] && pred(k));

// ---- Game state ---------------------------------------------------------
let running = false;
let paused = false;
let elapsed = 0;
let best = parseFloat(localStorage.getItem('dodge_best') || '0') || 0;
bestEl.textContent = best.toFixed(1) + 's';

// Settings-driven values (defaults; overwritten when settings load below)
let startLives = 3;        // 残機 (debug setting)
let livesLeft = startLives;
let invuln = 0;            // invincibility timer after taking a hit (s)
let bulletSpeedMul = 1;    // 弾の速さ multiplier (debug setting)

function reset() {
  player.x = W / 2 - player.w / 2;
  player.y = GROUND_Y - player.h;
  player.vx = 0; player.vy = 0;
  player.onGround = false;
  player.facing = 1;
  player.coyoteT = 0; player.bufferT = 0; player.squash = 0;
  bullets = [];
  elapsed = 0;
  livesLeft = startLives;
  invuln = 0;
  updateLivesHud();
  Patterns.reset();
}

// ---- Update -------------------------------------------------------------
function update(dt) {
  elapsed += dt;

  // Horizontal input
  let dir = 0;
  if (held(LEFT))  dir -= 1;
  if (held(RIGHT)) dir += 1;
  if (dir !== 0) player.facing = dir;

  const accel = player.onGround ? PHYS.accel : PHYS.airAccel;
  if (dir !== 0) {
    player.vx += dir * accel * dt;
    player.vx = Math.max(-PHYS.moveSpeed, Math.min(PHYS.moveSpeed, player.vx));
  } else if (player.onGround) {
    const f = PHYS.friction * dt;
    if (Math.abs(player.vx) <= f) player.vx = 0;
    else player.vx -= Math.sign(player.vx) * f;
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
  }

  // Integrate + collide (axis-separated)
  moveAndCollide(dt);

  // Walls
  if (player.x < 0) { player.x = 0; player.vx = 0; }
  if (player.x + player.w > W) { player.x = W - player.w; player.vx = 0; }

  // Visual squash/stretch easing
  player.squash *= Math.pow(0.0001, dt);
  if (Math.abs(player.squash) < 0.01) player.squash = 0;

  // ---- Bullets: author-defined spawning ----
  Patterns.tick(elapsed, dt);

  for (const b of bullets) { b.x += b.vx * dt * bulletSpeedMul; b.y += b.vy * dt * bulletSpeedMul; }
  // Cull bullets far off-screen
  bullets = bullets.filter(b =>
    b.x > -b.r - 60 && b.x < W + b.r + 60 &&
    b.y > -b.r - 60 && b.y < H + b.r + 60);

  // ---- Collision: bullet (circle) vs player (rect) ----
  if (invuln <= 0) {
    for (const b of bullets) {
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
      if (!wasGround) player.squash = -1;   // squash on landing
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
function draw() {
  // Sky
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, COL.skyTop);
  g.addColorStop(1, COL.skyBot);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  // Platforms
  for (const p of platforms) {
    if (p.ground) {
      ctx.fillStyle = COL.ground;
      ctx.fillRect(p.x, p.y, p.w, p.h);
      ctx.fillStyle = COL.groundTop;
      ctx.fillRect(p.x, p.y, p.w, 8);     // grassy top
    } else {
      roundRect(p.x, p.y, p.w, p.h, 6);
      ctx.fillStyle = COL.platform;
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.12)';
      ctx.fillRect(p.x + 4, p.y + 2, p.w - 8, 3);
    }
  }

  // Bullets
  ctx.fillStyle = COL.danger;
  for (const b of bullets) {
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
    ctx.fill();
    // soft inner highlight so big bullets read well
    ctx.beginPath();
    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    ctx.arc(b.x - b.r * 0.25, b.y - b.r * 0.25, b.r * 0.45, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = COL.danger;
  }

  drawCharacter();

  scoreEl.textContent = elapsed.toFixed(1) + 's';
}

function drawCharacter() {
  // Blink while invincible (after a hit)
  if (invuln > 0 && Math.floor(invuln * 12) % 2 === 0) return;

  // Squash/stretch
  const s = player.squash;
  const sx = 1 - s * 0.18;
  const sy = 1 + s * 0.18;
  const cx = player.x + player.w / 2;
  const baseY = player.y + player.h;          // feet
  const w = player.w * sx;
  const h = player.h * sy;
  const x = cx - w / 2;
  const y = baseY - h;

  ctx.save();
  // shadow on ground
  if (player.onGround) {
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.beginPath();
    ctx.ellipse(cx, baseY + 2, w * 0.55, 5, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  const f = player.facing;
  // ---- body (overalls) ----
  const bodyTop = y + h * 0.45;
  roundRect(x, bodyTop, w, h - (bodyTop - y), 5);
  ctx.fillStyle = '#3b6cf0';
  ctx.fill();

  // ---- head / face ----
  roundRect(x + w * 0.08, y + h * 0.06, w * 0.84, h * 0.46, 6);
  ctx.fillStyle = '#f4c9a0';
  ctx.fill();

  // ---- cap ----
  roundRect(x + w * 0.02, y, w * 0.96, h * 0.20, 5);
  ctx.fillStyle = '#e24b4a';
  ctx.fill();
  // cap brim, pointing in facing direction
  ctx.fillStyle = '#c43a39';
  ctx.beginPath();
  if (f >= 0) {
    ctx.rect(x + w * 0.55, y + h * 0.16, w * 0.55, h * 0.06);
  } else {
    ctx.rect(x - w * 0.10, y + h * 0.16, w * 0.55, h * 0.06);
  }
  ctx.fill();

  // ---- eyes ----
  ctx.fillStyle = '#222a3a';
  const eyeY = y + h * 0.30;
  const eyeR = Math.max(1.6, w * 0.07);
  const ex = cx + f * w * 0.10;
  ctx.beginPath(); ctx.arc(ex - w * 0.12, eyeY, eyeR, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(ex + w * 0.12, eyeY, eyeR, 0, Math.PI * 2); ctx.fill();

  // ---- feet ----
  ctx.fillStyle = '#5a3a22';
  const footW = w * 0.34, footH = h * 0.10;
  const footY = baseY - footH;
  // little walk bob when moving on ground
  const moving = player.onGround && Math.abs(player.vx) > 20;
  const bob = moving ? Math.sin(elapsed * 18) * 2 : 0;
  roundRect(x + w * 0.06, footY - bob, footW, footH, 3); ctx.fill();
  roundRect(x + w * 0.60, footY + bob, footW, footH, 3); ctx.fill();

  ctx.restore();
}

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
let lastT = 0;
function loop(t) {
  if (!running) return;
  let dt = (t - lastT) / 1000;
  lastT = t;
  if (dt > 0.05) dt = 0.05;          // clamp big frame gaps (tab switches)
  if (!paused) {                     // when paused: freeze time, keep last frame
    update(dt);
    if (running) draw();
  }
  requestAnimationFrame(loop);
}

// ---- Audio (the 音量 setting controls this) -----------------------------
let audioCtx = null;
let masterVol = 0.7;
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
  running = true;
  paused = false;
  overlay.classList.add('hidden');
  pauseOverlay.classList.add('hidden');
  pauseBtn.classList.remove('hidden');
  updateTouchControls();
  lastT = performance.now();
  requestAnimationFrame(loop);
}

function pauseGame() {
  if (!running || paused) return;
  paused = true;
  mountPause.appendChild(settingsPanel);        // settings live here while paused
  controlModeGroup.classList.add('hidden');     // control mode: title screen only
  pauseOverlay.classList.remove('hidden');
}

function resumeGame() {
  if (!running || !paused) return;
  paused = false;
  pauseOverlay.classList.add('hidden');
  lastT = performance.now();                    // avoid a time jump on resume
}

function showTitle() {
  running = false;
  paused = false;
  pauseOverlay.classList.add('hidden');
  pauseBtn.classList.add('hidden');
  mountTitle.appendChild(settingsPanel);
  controlModeGroup.classList.remove('hidden');
  ovTitle.textContent = 'Dodge Game';
  ovSub.textContent = 'Avoid the circles. Survive as long as you can.';
  startBtn.textContent = 'Start';
  overlay.classList.remove('hidden');
  updateTouchControls();
  draw();
}

function gameOver() {
  running = false;
  paused = false;
  pauseBtn.classList.add('hidden');
  if (elapsed > best) {
    best = elapsed;
    localStorage.setItem('dodge_best', String(best));
    bestEl.textContent = best.toFixed(1) + 's';
  }
  mountTitle.appendChild(settingsPanel);
  controlModeGroup.classList.remove('hidden');
  ovTitle.textContent = 'Game Over';
  ovSub.textContent = 'You survived ' + elapsed.toFixed(1) + 's';
  startBtn.textContent = 'Try again';
  overlay.classList.remove('hidden');
  updateTouchControls();
  draw();
}

function hitPlayer() {
  livesLeft -= 1;
  updateLivesHud();
  sfxHit();
  if (livesLeft <= 0) { gameOver(); return; }
  invuln = 1.6;          // brief mercy invincibility
  bullets = [];          // clear the field so the next life is fair
}

function updateLivesHud() {
  livesHud.textContent = livesLeft;
}

// ---- Settings UI (built once, moved between title & pause) ---------------
const settingsPanel = document.importNode(
  document.getElementById('settingsTemplate').content.querySelector('#settingsPanel'), true);
const controlModeGroup = settingsPanel.querySelector('#controlModeGroup');

// Sliders: { id, value-label id, storage key, default, how to apply, label format }
const sliderDefs = [
  { id: 'volume',      val: 'volVal',    store: 'dodge_volume',      def: 70,             apply: v => masterVol = v / 100,    fmt: v => v },
  { id: 'moveSpeed',   val: 'moveVal',   store: 'dodge_moveSpeed',   def: PHYS.moveSpeed, apply: v => PHYS.moveSpeed = v,      fmt: v => v },
  { id: 'jumpVel',     val: 'jumpVal',   store: 'dodge_jumpVel',     def: PHYS.jumpVel,   apply: v => PHYS.jumpVel = v,        fmt: v => v },
  { id: 'lives',       val: 'livesVal',  store: 'dodge_lives',       def: 3,              apply: v => startLives = v,          fmt: v => v },
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

// D-pad side (left / right) for mobile controls — title screen only
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

// Show on-screen buttons only in mobile mode, while actually playing
function updateTouchControls() {
  const show = controlMode === 'mobile' && running;
  touchControls.classList.toggle('hidden', !show);
}

// Wire the on-screen touch buttons to the same press/release as the keyboard
touchControls.querySelectorAll('.tbtn').forEach(btn => {
  const key = btn.dataset.key;
  const press = e => { e.preventDefault(); onPress(key); btn.classList.add('pressed'); };
  const release = e => { e.preventDefault(); onRelease(key); btn.classList.remove('pressed'); };
  btn.addEventListener('touchstart', press, { passive: false });
  btn.addEventListener('touchend', release);
  btn.addEventListener('touchcancel', release);
  btn.addEventListener('mousedown', press);
  btn.addEventListener('mouseup', release);
  btn.addEventListener('mouseleave', e => { if (btn.classList.contains('pressed')) release(e); });
});

// Buttons
startBtn.addEventListener('click', start);
resumeBtn.addEventListener('click', resumeGame);
restartBtn.addEventListener('click', start);
toTitleBtn.addEventListener('click', showTitle);
pauseBtn.addEventListener('click', () => { paused ? resumeGame() : pauseGame(); });

// Boot up on the title screen
showTitle();


/* =========================================================================
   BULLET PATTERNS  (弾幕)  —  THIS IS YOUR PART.
   -------------------------------------------------------------------------
   The engine calls Patterns.tick(t, dt) every frame while playing.
     t  = seconds since the run started
     dt = seconds since last frame
   Use the helpers in `B` to spawn bullets. Bullets are just circles.

   Helpers (all available as B.*):
     B.spawn(x, y, vx, vy, r)   -> create a bullet at (x,y) moving (vx,vy), radius r
     B.aim(x, y, speed)         -> {vx, vy} pointing from (x,y) toward the player
     B.player                   -> { x, y } center of the player right now
     B.W, B.H                   -> canvas size (1200 x 750)
     B.rand(min, max)           -> random float in [min, max)
     B.every(key, interval, fn) -> run fn() once per `interval` seconds
                                   (give each call a unique string key)

   Replace the placeholder body of `tick` below with your own danmaku.
   ========================================================================= */

const B = {
  get W() { return W; },
  get H() { return H; },
  get player() { return { x: player.x + player.w / 2, y: player.y + player.h / 2 }; },
  spawn(x, y, vx, vy, r) {
    bullets.push({ x, y, vx, vy, r: r || 6 });
  },
  aim(x, y, speed) {
    const p = B.player;
    const a = Math.atan2(p.y - y, p.x - x);
    return { vx: Math.cos(a) * speed, vy: Math.sin(a) * speed };
  },
  rand(min, max) { return min + Math.random() * (max - min); },
  every(key, interval, fn) {
    const acc = (Patterns._timers[key] || 0) + Patterns._dt;
    if (acc >= interval) { Patterns._timers[key] = acc - interval; fn(); }
    else Patterns._timers[key] = acc;
  },
};

const Patterns = {
  _timers: {},
  _dt: 0,
  reset() { this._timers = {}; },
  tick(t, dt) {
    this._dt = dt;

    /* ----------------------------------------------------------------
       PLACEHOLDER PATTERN — delete everything below and write your own.
       It rains circles of random size from the top, getting denser and
       throwing in the occasional aimed shot, so the stage is playable
       right now. Difficulty scales with time.
       ---------------------------------------------------------------- */
    const difficulty = 1 + t / 20;                 // ramps up over time
    const rainInterval = Math.max(0.12, 0.5 / difficulty);

    B.every('rain', rainInterval, () => {
      const x = B.rand(0, B.W);
      const r = B.rand(5, 16);                      // 大小自由の円
      const speed = B.rand(120, 200) * Math.min(2, difficulty);
      B.spawn(x, -r, B.rand(-40, 40), speed, r);
    });

    B.every('aimed', Math.max(0.6, 1.8 / difficulty), () => {
      const x = B.rand(0, B.W);
      const v = B.aim(x, -10, 220);
      B.spawn(x, -10, v.vx, v.vy, B.rand(8, 13));
    });

    B.every('ring', 0.1, () => {
  const cx = B.W / 2, cy = B.H / 3; // 中心の位置
  const n = 32, speed = 150;        // 16方向に発射
  for (let i = 0; i < n; i++) {
    const a = (Math.PI * 2) * i / n;
    B.spawn(cx, cy, Math.cos(a) * speed, Math.sin(a) * speed, 3);
  }
});
    /* -------------------- end placeholder -------------------- */
  },
};
