"use strict";

/* =========================================================================
   ENGINE  —  character, physics, ground/platforms, collision, game loop.
   You normally don't need to touch this part.
   Scroll down to the "弾幕" section at the bottom to author your bullets.
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
  if (dir !== 0) player.facing = dir;

  if (slideMove) {
    // Slidy movement: accelerate up to speed, with friction when idle on ground
    const accel = player.onGround ? PHYS.accel : PHYS.airAccel;
    if (dir !== 0) {
      player.vx += dir * accel * dt;
      player.vx = Math.max(-PHYS.moveSpeed, Math.min(PHYS.moveSpeed, player.vx));
    } else if (player.onGround) {
      const f = PHYS.friction * dt;
      if (Math.abs(player.vx) <= f) player.vx = 0;
      else player.vx -= Math.sign(player.vx) * f;
    }
  } else {
    // Snappy movement: always a constant speed, instant start/stop (no sliding)
    player.vx = dir * PHYS.moveSpeed;
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

  updateBullets(dt);
}

// ---- Bullets: spawn from the timeline, then move & collide --------------
function updateBullets(dt) {
  // Spawn whatever the chart scheduled. Clock to the song so bullets stay in
  // sync; if the music didn't start (e.g. blocked), fall back to the game clock.
  const songT = (bgm && !bgm.paused) ? bgm.currentTime : elapsed;
  runChart(songT);

  const e = dt * bulletSpeedMul;            // effective step (the 弾の速さ knob)
  for (const b of bullets) {
    if (b.delay > 0) { b.delay -= dt; continue; }   // charging: a warning ring
    b.age += e;                                      // seconds since it fired
    b.move(b, e);                                    // run THIS bullet's movement
  }

  // Drop fired bullets that left the screen (charging ones are always kept).
  bullets = bullets.filter(b =>
    b.delay > 0 ||
    (b.x > -b.r - W && b.x < W * 2 + b.r &&
     b.y > -b.r - H && b.y < H * 2 + b.r));

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

  for (const b of bullets) drawBullet(b);

  drawCharacter();

  scoreEl.textContent = elapsed.toFixed(1) + 's';
}

function drawBullet(b) {
  if (b.delay > 0) {
    // Charging: a faint warning ring, with a core that fills as it nears firing.
    const k = b.delayMax > 0 ? 1 - b.delay / b.delayMax : 1;   // 0 -> 1 progress
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(226, 75, 74, 0.55)';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.beginPath();
    ctx.fillStyle = 'rgba(226, 75, 74, 0.30)';
    ctx.arc(b.x, b.y, b.r * k, 0, Math.PI * 2);
    ctx.fill();
    return;
  }
  ctx.fillStyle = COL.danger;
  ctx.beginPath();
  ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
  ctx.fill();
  // soft inner highlight so big bullets read well
  ctx.beginPath();
  ctx.fillStyle = 'rgba(255,255,255,0.18)';
  ctx.arc(b.x - b.r * 0.25, b.y - b.r * 0.25, b.r * 0.45, 0, Math.PI * 2);
  ctx.fill();
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
let looping = false;                  // is exactly one rAF loop alive?
function loop(t) {
  if (!running) { looping = false; return; }   // stopped: let the loop die
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
  running = true;
  paused = false;
  overlay.classList.add('hidden');
  pauseOverlay.classList.add('hidden');
  pauseBtn.classList.remove('hidden');
  updateTouchControls();
  bgm.currentTime = 0;
  bgm.play().catch(() => {});                    // play from the top (user gesture)
  lastT = performance.now();
  if (!looping) {                  // reuse the live loop on restart; never stack two
    looping = true;
    requestAnimationFrame(loop);
  }
}

function pauseGame() {
  if (!running || paused) return;
  paused = true;
  bgm.pause();                                   // freeze the music too
  mountPause.appendChild(settingsPanel);        // settings live here while paused
  controlModeGroup.classList.add('hidden');     // control mode: title screen only
  pauseOverlay.classList.remove('hidden');
}

function resumeGame() {
  if (!running || !paused) return;
  paused = false;
  pauseOverlay.classList.add('hidden');
  bgm.play().catch(() => {});
  lastT = performance.now();                    // avoid a time jump on resume
}

function showTitle() {
  running = false;
  paused = false;
  bgm.pause(); bgm.currentTime = 0;
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
  bgm.pause();
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

// Reached the end of the song without dying.
function winGame() {
  running = false;
  paused = false;
  bgm.pause();
  pauseBtn.classList.add('hidden');
  if (elapsed > best) {
    best = elapsed;
    localStorage.setItem('dodge_best', String(best));
    bestEl.textContent = best.toFixed(1) + 's';
  }
  mountTitle.appendChild(settingsPanel);
  controlModeGroup.classList.remove('hidden');
  ovTitle.textContent = 'クリア！ 🎉';
  ovSub.textContent = '最後まで生き残った！';
  startBtn.textContent = 'もう一回';
  overlay.classList.remove('hidden');
  updateTouchControls();
  draw();
}

function hitPlayer() {
  livesLeft -= 1;
  updateLivesHud();
  sfxHit();
  if (livesLeft <= 0) { gameOver(); return; }
  invuln = 1.6;          // brief mercy invincibility, then play continues as-is
                         // (bullets are NOT cleared — the run keeps going)
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
  { id: 'volume',      val: 'volVal',    store: 'dodge_volume',      def: 70,             apply: v => { masterVol = v / 100; bgm.volume = masterVol; }, fmt: v => v },
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

// Movement style (slidy / constant speed) — debug setting
const moveStyleBtns = settingsPanel.querySelectorAll('.seg-btn[data-move]');
function setMoveStyle(s) {
  slideMove = (s === 'slide');
  localStorage.setItem('dodge_slideMove', s);
  moveStyleBtns.forEach(b => b.classList.toggle('active', b.dataset.move === s));
}
moveStyleBtns.forEach(b => b.addEventListener('click', () => setMoveStyle(b.dataset.move)));
setMoveStyle(localStorage.getItem('dodge_slideMove') || 'slide');

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
  b.x += b.vx * dt;
  b.y += b.vy * dt;
}

// まとめて出す道具（中身は全部 spawn を呼んでいるだけ）--------------------

// 円形に同時発射（まっすぐ外向き）
function ring({ x, y, count, speed, r = 6, delay = 0, start = 0 }) {
  for (let i = 0; i < count; i++) {
    const a = start + (i / count) * TAU;
    spawn({ x, y, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed, r, delay });
  }
}

// 回って見える渦（まっすぐ飛ぶ弾を、少しずつ時間差で出す）
//   turns=周回数 / gap=1発ごとの遅れ秒 / start=開始角 / delay=全体の溜め
function spiral({ x, y, count, speed, r = 6, turns = 1, gap = 0.05, start = 0, delay = 0 }) {
  for (let i = 0; i < count; i++) {
    const a = start + (i / count) * TAU * turns;
    spawn({ x, y, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed, r, delay: delay + i * gap });
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
// 考え方は「中心＋回転した角のオフセット」を毎フレーム計算しているだけ。
function spinShape({ x, y, count = 4, size = 36, spin = 2.5, grow = 0, vx = 0, vy = 0, r = 7, start = 0, delay = 0 }) {
  for (let i = 0; i < count; i++) {
    const corner = start + i * (TAU / count);   // この弾が中心から見て向く角度
    spawn({
      x, y, r, delay,
      cx: x, cy: y, vx, vy, corner, size, spin, grow,
      move(b, dt) {
        const mx = b.cx + b.vx * b.age;          // ① 中心が進む
        const my = b.cy + b.vy * b.age;
        const ang = b.corner + b.spin * b.age;   // ② 全体が回る
        const rad = b.size + b.grow * b.age;     // ③ だんだん広がる
        b.x = mx + Math.cos(ang) * rad;          // ④ 中心＋回転した角
        b.y = my + Math.sin(ang) * rad;
      },
    });
  }
}

/* ---- 譜面（曲のどの時間に弾を出すか）-----------------------------------
   "the EmpErroR.mp3"  全長128.8秒 / 120 BPM（1拍0.5秒・1小節=4拍=2秒）
   最初の小節の頭 = 0.865秒。曲は 8秒（4小節）ごとに場面が変わります。

       0.9〜  8.9  イントロ        40.9〜 63.8  サビ1          96.9〜114.2  サビ2（いちばん激しい）
       8.9〜 24.9  Aメロ           63.8〜 66.9  ブレイク（静か）114.2〜120.2  アウトロ
      24.9〜 40.9  Bメロ           66.9〜 80.9  Cメロ          120.2〜128.8  フェードアウト
                                   80.9〜 96.9  盛り上げ

   タイムラインは曲の再生時刻で動くので、キューは拍にそろって発動します。

       burst(時刻, () => { spawn(...) });          ← その時刻に1回だけ実行
       fire(時刻, 警告秒, delay => ring({ ..., delay }));
                                                  ← 警告を出して、ちょうど「時刻」に発射
       beat(n) = n拍目の時刻 / bar(k) = k小節目の頭の時刻

   数値は自由に調整OK: r=大きさ / gap=渦の密度 / delay=警告の長さ。
   -------------------------------------------------------------------------- */
function buildScript() {
  const cues = [];
  const cx = W / 2, cy = H / 3;          // 上の方の中心（ここから撃つ）

  // 時刻 t に弾を出す命令を予約する（時間順は最後の sort が直してくれる）
  const burst = (t, fn) => cues.push({ t, fn });

  // 拍の時刻。106秒あたりで拍が 0.12秒ほど前にずれるので、そこから基準を変えている。
  const beat = n => (n <= 210 ? 0.865 : 0.75) + n * 0.5;   // n拍目（0始まり、小数もOK）
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
    spawn({ x: fromLeft ? 10 : W - 10, y, vx: fromLeft ? speed : -speed, r: 10, delay });

  // ===== イントロ 0.9〜8.9秒 ================================================
  // 小節の頭に、左右の上すみから大玉の狙い撃ち ＋ 3拍目に小さな雨
  for (let k = 0; k < 4; k++) {
    const x = k % 2 === 0 ? 120 : W - 120;
    fire(bar(k), 0.6, delay => { const v = aimVel(x, 40, 260); spawn({ x, y: 40, vx: v.vx, vy: v.vy, r: 16, delay }); });
    fire(beat(k * 4 + 2), 0.4, delay => drop(delay, { rMin: 6, rMax: 8 }));
  }
  // 7.0〜8.9秒 ドラムの連打 → 渦がぐるっと1周してAメロへ
  fire(7.0, 0.5, delay => spiral({ x: cx, y: cy, count: 24, speed: 180, r: 6, turns: 1, gap: 1.86 / 24, delay }));

  // ===== Aメロ 8.9〜24.9秒 ==================================================
  for (let k = 4; k < 12; k++) {
    for (let i = 0; i < 4; i++) fire(beat(k * 4 + i), 0.35, delay => drop(delay));   // 毎拍の雨
    if (k % 2 === 0) {
      // 偶数小節: 回りながら降ってくる六角形（左右交互・回転も逆）
      const left = k % 4 === 0;
      fire(bar(k), 0.5, delay => spinShape({ x: left ? W * 0.3 : W * 0.7, y: -40, vy: 200, count: 6, size: 42, spin: left ? 2.6 : -2.6, delay }));
    } else {
      // 奇数小節: 全方位リング
      fire(bar(k), 0.6, delay => ring({ x: cx, y: cy, count: 16, speed: 170, r: 7, start: k * 0.3, delay }));
    }
  }
  // 後半 16.9〜24.9: 2拍目・4拍目に3方向の狙い撃ちを追加
  for (let k = 8; k < 12; k++) {
    for (const i of [1, 3]) {
      fire(beat(k * 4 + i), 0.4, delay => fan({ x: rand(100, W - 100), y: 30, count: 3, spread: 0.35, speed: 230, r: 7, delay }));
    }
  }

  // ===== Bメロ 24.9〜40.9秒 =================================================
  // 横から「低い弾（跳ぶ）」と「高い弾（跳ばない）」が交互に来る。足場の上は安全地帯。
  for (let k = 12; k < 20; k++) {
    const L = k % 2 === 0;                           // 小節ごとに左右を入れかえ
    fire(bar(k),            0.5, delay => wall(L,  LOW, 240, delay));
    fire(beat(k * 4 + 2),   0.5, delay => wall(!L, MID, 240, delay));
    fire(beat(k * 4 + 1),   0.35, delay => drop(delay, { rMin: 6, rMax: 9 }));
    fire(beat(k * 4 + 3),   0.35, delay => drop(delay, { rMin: 6, rMax: 9 }));
    // 奇数小節: 回りながら降ってくる正方形（足場にずっといられないように）
    if (k % 2 === 1) fire(bar(k), 0.5, delay => spinShape({ x: rand(150, W - 150), y: -40, count: 4, size: 38, spin: 2.4, vy: 210, delay }));
  }
  fire(bar(16), 0.8, delay => ring({ x: cx, y: cy, count: 20, speed: 170, r: 7, delay }));   // 32.9s 後半の合図
  // 38.9s サビ前のため: 回りながら広がる3重リング
  for (const [spin, grow] of [[0.5, 95], [0.6, 90], [0.7, 85]]) {
    fire(bar(19), 0.6, delay => spinShape({ x: cx, y: cy, count: 14, size: 0, spin, grow, r: 6, delay }));
  }

  // ===== サビ1 40.9〜63.8秒 =================================================
  fire(bar(20), 0.8, delay => ring({ x: cx, y: cy, count: 24, speed: 195, r: 8, delay }));   // サビの一発目
  for (let k = 20; k < 31; k++) {
    // 16分音符ごとに1発、1小節で1周する渦（小節ごとに回る向きが逆）
    fire(bar(k), 0.4, delay => spiral({ x: cx, y: cy, count: 16, speed: 190, r: 6, turns: k % 2 ? -1 : 1, gap: 0.125, start: k * 0.4, delay }));
    for (let i = 0; i < 4; i++) fire(beat(k * 4 + i), 0.35, delay => drop(delay, { rMin: 6, rMax: 10 }));
    // 48.9〜56.9: 3拍目に地面すれすれの弾（左右交互）
    if (k >= 24 && k < 28) fire(beat(k * 4 + 2), 0.5, delay => wall(k % 2 === 0, LOW, 260, delay));
    // 56.9〜62.9: 裏拍に上すみから3方向の狙い撃ち
    if (k >= 28) {
      fire(beat(k * 4 + 1.5), 0.4, delay => fan({ x: 60,     y: 40, count: 3, spread: 0.3, speed: 240, r: 7, delay }));
      fire(beat(k * 4 + 3.5), 0.4, delay => fan({ x: W - 60, y: 40, count: 3, spread: 0.3, speed: 240, r: 7, delay }));
    }
  }
  fire(bar(31), 0.6, delay => ring({ x: cx, y: cy, count: 30, speed: 150, r: 9, delay }));   // 62.9s サビ1のしめ

  // ===== ブレイク 63.8〜66.9秒（音が消える）=================================
  // ひと休み: ゆっくり落ちてくる大玉だけ
  [[128, 0.2], [129, 0.8], [130, 0.5]].forEach(([n, fx]) =>
    fire(beat(n), 0.5, delay => spawn({ x: W * fx, y: -10, vy: 110, r: 22, delay })));

  // ===== Cメロ 66.9〜80.9秒 =================================================
  fire(bar(33), 0.6, delay => spiral({ x: cx, y: cy, count: 44, speed: 220, r: 7, turns: 1, gap: 0.02, delay }));  // 66.9s 再開
  for (let k = 33; k < 40; k++) {
    // 毎拍、ゆらゆら揺れながら落ちる弾（左右の列を交互に）
    for (let i = 0; i < 4; i++) {
      const x = (i % 2 === 0) ? rand(80, W / 2 - 40) : rand(W / 2 + 40, W - 80);
      fire(beat(k * 4 + i), 0.4, delay => wave({ x, y: 20, fall: 160, amp: 50, freq: 4, r: 8, delay }));
    }
  }
  // 72.9s 回りながら広がる3重リング（逆回転）
  for (const [spin, grow] of [[-0.5, 95], [-0.6, 90], [-0.7, 85]]) {
    fire(bar(36), 0.6, delay => spinShape({ x: cx, y: cy, count: 14, size: 0, spin, grow, r: 6, delay }));
  }
  // 73.2〜73.9s ドラムのフィル: 素早い狙い撃ち4連
  [73.24, 73.49, 73.72, 73.86].forEach(t =>
    fire(t, 0.3, delay => { const v = aimVel(cx, -10, 300); spawn({ x: cx, y: -10, vx: v.vx, vy: v.vy, r: 8, delay }); }));
  fire(beat(150), 0.6, delay => ring({ x: cx, y: cy, count: 20, speed: 200, r: 7, start: Math.PI / 20, delay }));  // 75.9s
  // 76.9〜80.9: 音が厚くなるので、2拍目・4拍目に雨を追加
  for (let k = 38; k < 40; k++) for (const i of [1, 3]) fire(beat(k * 4 + i), 0.35, delay => drop(delay));

  // ===== 盛り上げ 80.9〜96.9秒 ==============================================
  fire(bar(40), 0.6, delay => ring({ x: cx, y: cy, count: 20, speed: 180, r: 8, delay }));   // 80.9s
  // 80.9〜88.9: Bメロの横弾が速くなって戻ってくる ＋ 揺れる弾
  for (let k = 40; k < 44; k++) {
    const L = k % 2 === 1;
    fire(bar(k),          0.5, delay => wall(L,  LOW, 280, delay));
    fire(beat(k * 4 + 2), 0.5, delay => wall(!L, MID, 280, delay));
    for (const i of [1, 3]) fire(beat(k * 4 + i), 0.4, delay => wave({ x: rand(80, W - 80), y: 20, fall: 170, amp: 60, freq: 5, r: 8, delay }));
  }
  // 88.9〜94.9: 8分音符の細かい雨（だんだん密に）＋ 小節の頭に狙い撃ち
  for (let k = 44; k < 47; k++) {
    for (let i = 0; i < 8; i++) fire(beat(k * 4 + i / 2), 0.3, delay => drop(delay, { rMin: 5, rMax: 8, vMin: 200, vMax: 260 }));
    fire(bar(k), 0.5, delay => { const v = aimVel(cx, 30, 280); spawn({ x: cx, y: 30, vx: v.vx, vy: v.vy, r: 14, delay }); });
  }
  fire(beat(183), 0.5, delay => ring({ x: W * 0.25, y: cy, count: 14, speed: 180, r: 7, delay }));  // 92.4s
  fire(beat(187), 0.5, delay => ring({ x: W * 0.75, y: cy, count: 14, speed: 180, r: 7, delay }));  // 94.4s
  // 94.9〜95.9s サビ直前: 2周する渦の連発
  [188, 189].forEach((n, i) =>
    fire(beat(n), 0.5, delay => spiral({ x: cx, y: cy, count: 36, speed: 220, r: 6, turns: 2, gap: 0.015, start: i * 1.1, delay })));

  // ===== サビ2 96.9〜114.2秒（いちばん激しい）===============================
  fire(bar(48), 0.8, delay => ring({ x: cx, y: cy, count: 30, speed: 200, r: 8, delay }));   // 96.9s
  for (let k = 48; k < 56; k++) {
    fire(beat(k * 4 + 1), 0.35, delay => drop(delay));
    fire(beat(k * 4 + 3), 0.35, delay => drop(delay));
    if (k < 52) {
      // 96.9〜104.9: 左右の2か所から、逆向きに回る渦（8分音符ごと）
      const dir = k % 2 ? 1 : -1;
      fire(bar(k), 0.4, delay => spiral({ x: W * 0.25, y: cy, count: 8, speed: 180, r: 6, turns:  dir, gap: 0.25, start: k * 0.5, delay }));
      fire(bar(k), 0.4, delay => spiral({ x: W * 0.75, y: cy, count: 8, speed: 180, r: 6, turns: -dir, gap: 0.25, start: k * 0.5, delay }));
      if (k % 2 === 1) fire(beat(k * 4 + 2), 0.5, delay => fan({ x: cx, y: 30, count: 5, spread: 0.25, speed: 250, r: 7, delay }));
    } else {
      // 104.9〜112.7: 回りながら広がる花（2重）＋ 地面すれすれの横弾
      fire(bar(k), 0.5, delay => spinShape({ x: cx, y: cy, count: 10, size: 0, spin:  1.2, grow: 110, r: 7, delay }));
      fire(bar(k), 0.5, delay => spinShape({ x: cx, y: cy, count: 10, size: 0, spin: -1.2, grow: 110, r: 7, start: Math.PI / 10, delay }));
      fire(beat(k * 4 + 2), 0.5, delay => wall(k % 2 === 0, LOW, 280, delay));
      // 降ってくる六角形（左右交互）
      fire(beat(k * 4 + 2), 0.5, delay => spinShape({ x: k % 2 ? W * 0.25 : W * 0.75, y: -40, vy: 220, count: 6, size: 40, spin: 2.8, delay }));
    }
  }
  // 112.7s フィナーレ: 2周の大きな渦 ＋ リング
  fire(bar(56), 0.6, delay => spiral({ x: cx, y: cy, count: 48, speed: 200, r: 7, turns: 2, gap: 0.03, delay }));
  fire(beat(226), 0.5, delay => ring({ x: cx, y: cy, count: 24, speed: 170, r: 8, start: Math.PI / 24, delay }));

  // ===== アウトロ 114.2〜120.2秒 ============================================
  fire(beat(228), 0.7, delay => ring({ x: cx, y: cy, count: 18, speed: 185, r: 7, delay }));           // 114.8s
  fire(beat(230), 0.7, delay => ring({ x: cx, y: cy, count: 18, speed: 185, r: 7, start: Math.PI / 18, delay })); // 115.8s
  for (let n = 232; n < 240; n += 2) fire(beat(n), 0.5, delay => drop(delay, { rMin: 8, rMax: 12, vMin: 140, vMax: 180 }));

  // ===== フェードアウト 120.2〜128.8秒 ======================================
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
