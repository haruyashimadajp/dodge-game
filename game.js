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
let freezeUntil = -1;      // 時間停止 (timeStop) が終わる曲の時刻

// ---- World layout -------------------------------------------------------
const GROUND_H = 56;                 // thickness of the bottom ground
const GROUND_Y = H - GROUND_H;       // top surface of the ground
const CEIL_Y = 56;                   // 天井の下の面（重力が上向きのときだけ立てる。曲⑦ Malware）

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
    if (player.vy * stage.grav < 0) player.vy *= PHYS.jumpCut;   // variable jump height
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
let gfx = 2;               // 画質 being drawn now: 2 = 高, 1 = 中, 0 = 低 (visuals.js reads it)
let renderScale = 1;       // 低 draws the canvas at 70% resolution (fewer pixels to fill)
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
  freezeUntil = -1;
  hitsTaken = 0;
  songTime = 0;
  stageReset();
  echoReset();
  malwareReset();
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

  // Gravity（曲⑦ Malware の「重力バグ」では上向きになる: stage.grav = -1）
  const g = stage.grav;
  player.vy = Math.max(-PHYS.maxFall, Math.min(PHYS.maxFall, player.vy + g * PHYS.gravity * dt));

  // 傾いた世界: 重力の横向きの成分で、低いほうへすべっていく（曲④ Vertigo）
  // 風（曲⑫ Shiki）も同じように、プレイヤーを流す
  stage.slideV += (STAGE_SLIDE * Math.sin(stage.tilt) + stage.wind - stage.slideV) * Math.min(1, dt * 4);

  // Timers
  player.coyoteT -= dt;
  player.bufferT -= dt;
  if (invuln > 0) invuln -= dt;

  // Jump (with coyote time + input buffering)
  if (player.bufferT > 0 && (player.onGround || player.coyoteT > 0)) {
    player.vy = -g * PHYS.jumpVel;
    player.onGround = false;
    player.coyoteT = 0;
    player.bufferT = 0;
    player.squash = 1;       // stretch on takeoff
    sfxJump();
    fxJump();
  }

  // Integrate + collide (axis-separated)
  moveAndCollide(dt);

  // Walls (左右の壁は動くことがある。電気が流れていたら、さわると当たる)
  if (player.x < stage.wl) { player.x = stage.wl; player.vx = Math.max(0, player.vx); if (stage.shock >= 1) zapPlayer(1); }
  if (player.x + player.w > stage.wr) { player.x = stage.wr - player.w; player.vx = Math.min(0, player.vx); if (stage.shock >= 1) zapPlayer(-1); }
  // 床の穴に落ちた: 当たり ＋ 近くの床へはね上げてもどす
  if (player.y > H + 30) {
    const h = stage.holes.find(h => player.x + player.w / 2 > h.x - 40 && player.x + player.w / 2 < h.x + h.w + 40);
    if (h) {                                       // 穴の近いほうのふちへ（壁の外になるなら反対側）
      const left = h.x - player.w - 6, right = h.x + h.w + 6;
      const goLeft = player.x + player.w / 2 < h.x + h.w / 2 ? left >= stage.wl : right + player.w > stage.wr;
      player.x = goLeft ? left : right;
    }
    player.x = Math.max(stage.wl, Math.min(stage.wr - player.w, player.x));
    player.y = H; player.vy = -1000;
    if (running && invuln <= 0) hitPlayer();
  }

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
  updateStage(dt);
  updateEcho(dt);
  updateMalware(dt);

  const frozen = songTime < freezeUntil;     // 時間停止中: 弾はその場で止まる（当たり判定は残る）
  for (const b of bullets) {
    if (frozen && !b.noFreeze) { b.px = b.x; b.py = b.y; continue; }
    const e = dt * bulletSpeedMul * b.spd;   // effective step (弾の速さ knob × the song's speed at spawn)
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
  // Horizontal（自分の速さ ＋ 傾きですべる速さ ＋ 地面にいればベルトコンベアの速さ）
  const onFloor = player.onGround && player.y + player.h >= GROUND_Y - 1;
  const dx = (player.vx + stage.slideV + (onFloor ? stage.conveyor : 0)) * dt;
  player.x += dx;
  for (const p of platforms) {
    if (p.ground || platformGone(p)) continue;   // ground spans full width; no side walls
    if (overlapRect(player, p)) {
      if (dx > 0) player.x = p.x - player.w;
      else if (dx < 0) player.x = p.x + p.w;
      player.vx = 0;
    }
  }

  // Vertical
  const wasGround = player.onGround;
  player.onGround = false;
  player.y += player.vy * dt;
  const g = stage.grav;
  const land = () => {
    player.vy = 0;
    if (!wasGround) { player.squash = -1; fxLand(); }   // squash + dust on landing
    player.onGround = true;
  };
  for (const p of platforms) {
    if (!overlapRect(player, p)) continue;
    if (p.ground && overHole()) continue;     // 床に穴が開いている → 落ちる
    if (platformGone(p)) continue;             // 足場がくずれ落ちている
    if (player.vy > 0) {           // moving down -> land on top (重力が上向きなら、頭をぶつけるだけ)
      player.y = p.y - player.h;
      if (g > 0) land(); else player.vy = 0;
    } else if (player.vy < 0 && !(p.ground && g > 0)) { // moving up -> bonk head (重力が上向きなら、足場の裏に立つ)
      player.y = p.y + p.h;
      if (g < 0) land(); else player.vy = 0;
    }
  }
  // 重力が上向きのあいだは、天井が床になる
  if (g < 0 && player.y < CEIL_Y) { player.y = CEIL_Y; if (player.vy < 0) land(); }

  if (player.onGround) player.coyoteT = PHYS.coyote;
}

// プレイヤーが、開いている床の穴の真上にいる？（体の 3/4 以上が穴の上なら落ちる）
function overHole() {
  for (const h of stage.holes) {
    if (songTime < h.open || songTime > h.close) continue;
    const a = Math.max(player.x, h.x), z = Math.min(player.x + player.w, h.x + h.w);
    if (z - a >= player.w * 0.75) return true;
  }
  return false;
}

// 足場がいま、くずれて消えている？（floorHole が足場の上のプレイヤーをねらったとき）
function platformGone(p) {
  return stage.drops.some(d => d.p === p && songTime >= d.open && songTime <= d.close);
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
  autoGfx(dt);
  if (dt > 0.05) dt = 0.05;          // clamp big frame gaps (tab switches)
  if (dt < 0) dt = 0;
  requestAnimationFrame(loop);        // 先に次のコマを予約: 万一どこかでエラーが出ても、ゲームが止まらない
  try {
    if (!paused) {                     // when paused: freeze time, keep last frame
      if (running) update(dt);
      updateFx(dt);
    }
    drawScene();
  } catch (e) { console.error(e); }
  if (scene === 'title') overlay.style.setProperty('--kick', kickOf(titleBeat()).toFixed(3));
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
  stageReset();
  echoReset();
  malwareReset();
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
    setOverlayTitle(kind === 'clear' ? (song.clearTitle || 'CLEAR') : (song.overTitle || 'GAME OVER'));   // 曲ごとに変えられる（Ward 13 は YOU DIED）
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

// 画質 (graphics quality): 自動 / 高 / 中 / 低.
// 自動 starts at 高 and steps down while playing if frames keep taking too long.
let gfxSetting = store.get('dodge_gfx') || 'auto';
const gfxBtns = settingsPanel.querySelectorAll('.seg-btn[data-gfx]');
const gfxVal = settingsPanel.querySelector('#gfxVal');
function applyGfx(level) {
  gfx = level;
  const s = level === 0 ? 0.7 : 1;
  if (s !== renderScale) {                  // resize the canvas; drawing stays in 800×750 units
    renderScale = s;
    cv.width = Math.round(W * s);
    cv.height = Math.round(H * s);
  }
  gfxVal.textContent = gfxSetting === 'auto' ? `（いま: ${['低', '中', '高'][gfx]}）` : '';
}
function setGfx(v) {
  gfxSetting = v;
  store.set('dodge_gfx', v);
  gfxBtns.forEach(b => b.classList.toggle('active', b.dataset.gfx === v));
  slowT = 0;
  applyGfx(v === 'auto' ? 2 : Number(v));
}
let slowT = 0;                              // how long frames have been slow (s)
function autoGfx(dt) {
  if (gfxSetting !== 'auto' || gfx === 0 || scene !== 'play' || paused || elapsed < 1.5) return;
  if (dt > 1 / 45 && dt < 0.25) slowT += dt;              // slower than ~45 fps
  else slowT = Math.max(0, slowT - dt * 0.5);
  if (slowT > 2) { slowT = 0; applyGfx(gfx - 1); }        // 2 s of slow frames → one step lower
}
gfxBtns.forEach(b => b.addEventListener('click', () => setGfx(b.dataset.gfx)));
setGfx(gfxSetting);

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
  if (scene === 'title') setOverlayTitle('DODGE');   // （Malware のタイトル画面の文字化けを、曲を変えたら元にもどす）
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
   ● style: 'rice'（米つぶ形・進む向きを向く）/ 'star'（星）/ 'big'（大玉）で見た目を変えられる
     （当たり判定はどれも同じ丸。曲②の見た目のセットで使う）

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
  return (ease(now) - ease(b.s0)) * step * BEAT_SEC * bulletSpeedMul * (b.spd || 1);
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
  // 曲が決める速さの倍率（盛り上がる所ほど速い）。発射する瞬間の値で決まり、途中では変わらない
  if (b.spd == null) b.spd = song.speedAt ? song.speedAt(songTime + b.delay) : 1;
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
function ring({ x, y, count, speed, r = 6, delay = 0, start = 0, step = 0, color, style }) {
  for (let i = 0; i < count; i++) {
    const a = start + (i / count) * TAU;
    spawn({ x, y, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed, r, delay, step, color, style });
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
    ? b.snap * stepTime(b, 1) / (BEAT_SEC * bulletSpeedMul * (b.spd || 1))
    : b.spin * b.age;
  const ang = b.corner + turn;
  const rad = b.size + b.grow * b.age      // ③ だんだん広がる
            + b.pulse * beatKick(songTime); //    ＋ 拍のたびにふくらむ
  b.x = mx + Math.cos(ang) * rad;          // ④ 中心＋回転した角
  b.y = my + Math.sin(ang) * rad;
}

/* ---- ここから下は「Re:Unknown X」で生まれた形態（UFO・光線・正体不明の弾）---
   当たり判定はどれも今までと同じ「丸」（光線だけは線）。
   -------------------------------------------------------------------------- */

// 拍の番号（発射のちょうどその拍を確実に数えるため、少しだけ前にずらして数える）
const beatIndex = (t, per = 1) => Math.floor(beatPos(t) / per + 0.05);

// ブリンク: なめらかに動かず、拍のたびに「パッ」と瞬間移動して進む。
// 次に移る場所はうっすら四角で予告される。vx, vy = 速さ（px/秒、平均）/ step = 何拍ごとに跳ぶか
function blink({ x, y, vx = 0, vy = 160, r = 9, step = 1, delay = 0, color }) {
  spawn({
    x, y, vx, vy, r, delay, color, every: step, noTrail: true,
    move(b) {
      const n = beatIndex(songTime, b.every);
      if (b.n0 == null) { b.n0 = n; b.ox = b.x; b.oy = b.y; }
      const hop = b.every * BEAT_SEC * bulletSpeedMul * b.spd;  // 1回の瞬間移動で進む「時間」
      const nx = b.ox + b.vx * (n - b.n0) * hop, ny = b.oy + b.vy * (n - b.n0) * hop;
      if (nx !== b.x || ny !== b.y) { blip(b.x, b.y, b); b.x = nx; b.y = ny; }
      b.nx = b.x + b.vx * hop; b.ny = b.y + b.vy * hop;         // 次の位置（予告の四角）
    },
  });
}

// 分裂弾: 大きな玉が、every 拍ごとに X の形（ななめ4方向）に割れる。gen 回まで割れる
//   speed = 割れた破片の速さ / start = 割れる向き（π/4 で X、0 で ＋）/ bits = 破片の見た目（'star' など）
function splitter({ x, y, vx = 0, vy = 120, r = 18, gen = 2, every = 2, speed = 150, start = Math.PI / 4, delay = 0, color, style, bits = style }) {
  spawn({
    x, y, vx, vy, r, delay, gen, every, speed, start, color, style, bits,
    move(b, dt) {
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      const n = beatIndex(songTime, b.every);
      if (b.n0 == null) b.n0 = n;
      if (n > b.n0 && b.gen > 0) {                              // 拍が来た → 割れる
        for (let i = 0; i < 4; i++) {
          const a = b.start + i * (TAU / 4);
          splitter({ x: b.x, y: b.y, vx: Math.cos(a) * b.speed, vy: Math.sin(a) * b.speed, r: b.r * 0.62,
                     gen: b.gen - 1, every: b.every, speed: b.speed * 1.15, start: b.start + Math.PI / 4, color: b.color, style: b.bits, bits: b.bits });
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
    x, y, r, delay, cell, hops, color,
    move(b) {
      const f = beatPos(songTime) + 0.05, n = Math.floor(f);
      if (b.cur == null) { b.cur = n; b.hop = 0; b.fx0 = b.tx = b.x; b.fy0 = b.ty = b.y; }
      if (n > b.cur) {                                          // 次の拍: 行き先を決める
        b.cur = n;
        b.fx0 = b.tx; b.fy0 = b.ty;
        const p = playerXY(), dx = p.x - b.tx, dy = p.y - b.ty;
        const c = b.cell * bulletSpeedMul * b.spd;
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

// 光の滝: x の列に、米つぶ弾が縦一列で並んで落ちてくる（step 拍ごとにガクッと進む）
function stream({ x, count = 5, gap = 34, vy = 260, r = 8, step = 0.5, delay = 0, color, style = 'rice' }) {
  for (let i = 0; i < count; i++) {
    spawn({ x, y: -20 - i * gap, vy, r, delay, step, color, style, lane: i === 0 ? [0, 1] : null });
  }
}

// 回る X: 中心から4本の腕（X の形）に弾を並べて、まるごと回す。
//   per = 1本の腕の弾の数 / gap = 弾の間隔 / spin = 回る速さ
//   snap = 1拍ごとに回る角度（これを使うと「カクッ、カクッ」と拍で回る。spin より優先）
function spinX({ x, y, arms = 4, per = 4, gap = 26, inner = 18, spin = 1.6, snap = 0, vx = 0, vy = 0, r = 7, start = Math.PI / 4, pulse = 0, delay = 0, color, style }) {
  for (let a = 0; a < arms; a++) {
    for (let j = 0; j < per; j++) {
      spawn({
        x, y, r, delay, color, style,
        cx: x, cy: y, vx, vy, corner: start + a * (TAU / arms), size: inner + j * gap, spin, snap, grow: 0, pulse,
        move: orbitMove,
      });
    }
  }
}

// 文字の形に並んだ弾（'X' と '?'）。cell = 1マスの大きさ。まとめて vx, vy で動く
const GLYPHS = {
  'X': ['10001', '01010', '00100', '01010', '10001'],
  '?': ['01110', '10001', '00010', '00100', '00000', '00100'],
};
function glyph({ ch = 'X', x, y, cell = 22, vx = 0, vy = 90, r = 7, step = 0, delay = 0, color, style }) {
  const rows = GLYPHS[ch];
  rows.forEach((row, j) => [...row].forEach((on, i) => {
    if (on !== '1') return;
    spawn({ x: x + (i - (row.length - 1) / 2) * cell, y: y + (j - (rows.length - 1) / 2) * cell, vx, vy, r, step, delay, color, style });
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

// X の字のレーザー: (x, y) を通るななめ2本（交差する探照灯）
function xStrike({ x, y, len = 1100, width = 18, delay = 0.6, hold = 0.25, color = '#ff2a6d' }) {
  for (const a of [Math.PI / 4, -Math.PI / 4]) {
    const dx = Math.cos(a) * len / 2, dy = Math.sin(a) * len / 2;
    laser({ x1: x - dx, y1: y - dy, x2: x + dx, y2: y + dy, width, delay, hold, color });
  }
}

// 縦の柱: 画面を n 列に分けて、cols に書いた列（0 = 左はし）に上から下までのビーム（UFO の光線）
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
      x1: a, y1: y0, x2: z, y2: y0, width: 14, delay, hold: 999, color,
      move(b) {
        const n = stepTime(b, step) / (step * BEAT_SEC * bulletSpeedMul * b.spd);   // 何回下りたか（拍で数える）
        b.y1 = b.y2 = b.y = y0 + (y1 - y0) * Math.min(steps, n) / steps;
        if (n >= steps + 1 && b.hold > b.age) b.hold = b.age;   // 地面で1回ぶん待ってから消える
      },
    });
  }
}

// ★UFO★ 空を飛びながら、拍に合わせて弾を撃つ円盤（UFO そのものには当たらない）
//   path(t) = 出てから t 秒後の位置 {x, y}（書かなければその場に浮かぶ）/ life = いる時間（秒）
//   every = 何拍ごとに撃つか / shot(u, n) = 撃つ中身（u.x, u.y が今の位置。n = 何回目か）
function ufo({ x, y, path, life = 4, every = 1, color = '#ff4d6d', size = 1, shot }) {
  return spawn({
    kind: 'ufo', x, y, r: 20 * size, size, safe: true, life, every, color, path, shot, spd: 1,
    move(b) {
      if (b.path) { const p = b.path(b.age); b.x = p.x; b.y = p.y; }
      const n = beatIndex(songTime, b.every);
      if (b.n0 == null) { b.n0 = b.lastN = n; }
      if (n > b.lastN) {
        b.lastN = n;
        if (b.shot && b.age < b.life - 0.2) { b.shot(b, n - b.n0); b.firedAt = b.age; }
      }
      if (b.age > b.life) b.dead = true;
    },
  });
}

/* ---- ここから下は「モラトリウム」で生まれた形態（時計・時間）---------------- */

// ★時間停止★ dur 秒のあいだ、画面の弾がすべてその場で止まる（止まった弾にも当たる）。
// プレイヤーは動けるので、止まっているうちにすき間へ移動する
function timeStop(dur) {
  freezeUntil = Math.max(freezeUntil, songTime + dur);
  if (typeof fxTimeStop === 'function') fxTimeStop(dur);
}
const timeFrozen = () => songTime < freezeUntil;

// ★巻き戻し★ まっすぐ飛んでいる弾が、いっせいに来た道を逆向きに戻る
function rewind() {
  for (const b of bullets) {
    if (b.delay > 0 || b.kind || b.move !== straight || b.step || b.rewound) continue;
    if (b.x < -20 || b.x > W + 20 || b.y < -20 || b.y > H + 20) continue;   // 画面の外の弾はそのまま
    b.vx = -b.vx; b.vy = -b.vy;
    b.rewound = true;                                  // 1つの弾が戻るのは1回だけ（行ったり来たりしない）
    if (typeof blip === 'function') blip(b.x, b.y, b);
  }
  if (typeof fxRewind === 'function') fxRewind();
}

// 振り子: (px, py) からつるした重い玉が左右にゆれる。いちばん下では地面すれすれ → 跳び越える
//   len = ひもの長さ / amp = ふれ幅（ラジアン）/ beats = 片道にかかる拍数（下を通るのは片道のまん中）
//   life = いる秒数
function pendulum({ px, py = 110, len = GROUND_Y - 24 - 110, amp = 0.75, beats = 4, life = 8, r = 20, delay = 0.8, color }) {
  const T = beats * BEAT_SEC;
  return spawn({
    x: px + Math.sin(amp) * len, y: py + Math.cos(amp) * len, r, delay, color, life, pivot: { x: px, y: py }, len, amp, T, noTrail: true,
    spd: 1,                                  // 拍にぴったり合わせるので、曲の速さ倍率は使わない
    move(b) {
      const th = b.amp * Math.cos(Math.PI * b.age / (b.T * bulletSpeedMul * b.spd));
      b.x = b.pivot.x + Math.sin(th) * b.len;
      b.y = b.pivot.y + Math.cos(th) * b.len;
      if (b.age > b.life) b.dead = true;
    },
  });
}

// 時計の針: (cx, cy) を中心に回るビーム。1拍ごとに step（ラジアン）ずつ「カチッ」と進む。
// 次に止まる場所はうすい線で見える。len が長いと下を通るとき地面に届く → 跳び越える
function clockHand({ cx, cy, len = 400, a0 = -Math.PI / 2, step = Math.PI / 12, width = 14, life = 8, delay = 0.8, color, hub = 34 }) {
  const at = a => ({ x1: cx + Math.cos(a) * hub, y1: cy + Math.sin(a) * hub, x2: cx + Math.cos(a) * len, y2: cy + Math.sin(a) * len });
  const p = at(a0);
  const hand = laser({
    ...p, width, delay, hold: life, color,
    move(b) {
      const n = b.age / (BEAT_SEC * bulletSpeedMul * b.spd), k = Math.floor(n);
      const ang = a0 + step * (k + Math.min(1, (n - k) * 5));       // 拍の頭ですばやく進んで止まる
      Object.assign(b, at(ang));
      b.x = (b.x1 + b.x2) / 2; b.y = (b.y1 + b.y2) / 2;
      const g = at(a0 + step * (k + 1));
      b.gx = g.x2; b.gy = g.y2; b.gx1 = g.x1; b.gy1 = g.y1;        // 次の位置（予告の線）
    },
  });
  hand.spd = 1;                              // 拍にぴったり合わせる
  return hand;
}

// 音符の雨: 旋律の音が、ちょうどその音が鳴る瞬間に地面へ落ちてくる弾
//   t = 地面に着く時刻 / x = 落ちる場所 / v = 落ちる速さ
function noteDrop(t, x, v = 420, { r = 8, color, warn = 0.35 } = {}) {
  const top = -16, travel = (GROUND_Y - r - top) / v;
  return { at: t - travel - warn, go: () => spawn({
    x, y: top, vy: v, r, delay: warn, color, style: 'note', spd: 1, lane: [0, 1], noFreeze: false,
    move(b, dt) {
      b.y += b.vy * dt;
      if (b.vy > 0 && b.y >= GROUND_Y - b.r) {               // 地面に着いた: はじけて消える
        if (typeof sparks === 'function') sparks(b.x, GROUND_Y - 2, { n: 6, color: b.color || '#ffd9a0', speed: 160, life: 0.35, size: 2.5, gravity: 400, dir: -Math.PI / 2, spread: 2.4 });
        b.dead = true;
      }
    },
  }) };
}

/* ---- ここから下は「segment」で生まれた形態（ガラス・ピアノ・鉄琴）--------------- */

// ガラスの破片（見た目 'shard' = とがった三角）。g = 重力（0 ならまっすぐ飛ぶ）
function shardFall(b, dt) {
  b.vy += b.g * dt;
  b.x += b.vx * dt; b.y += b.vy * dt;
  if (b.vy > 0 && b.y >= GROUND_Y - 2) {                       // 地面に落ちたら、くだけて消える
    if (typeof sparks === 'function') sparks(b.x, GROUND_Y - 2, { n: 3, color: b.color || '#dff6ff', speed: 120, life: 0.3, size: 2, gravity: 500, dir: -Math.PI / 2, spread: 2.2 });
    b.dead = true;
  }
}
function shard({ x, y, vx = 0, vy = 200, g = 0, r = 7, delay = 0, color, spd }) {
  return spawn({ x, y, vx, vy, g, r, delay, color, spd, style: 'shard', spin: rand(-5, 5), move: g ? shardFall : straight });
}

// ★ガラスの板★ (x, y) を中心にした w×h の板。曲の時刻 at にパリンと割れて、
// n 枚の破片がひびの中心 (hx, hy) から外へ飛び散り、重力で落ちる。
// 割れるまでは当たらない（ひびがだんだん広がっていくのが予告）。譜面では at の warn 秒前に呼ぶ
function pane({ x, y, w, h, at, hx = x, hy = y, n = 24, speed = 220, g = 260, r = 7, color, size = 1 }) {
  const L = x - w / 2, T = y - h / 2;
  const inside = (px, py) => [Math.max(L, Math.min(L + w, px)), Math.max(T, Math.min(T + h, py))];
  const cracks = [];
  const arms = 7 + Math.round(size * 3);
  for (let i = 0; i < arms; i++) {                             // ひび: 中心から放射状に、ギザギザに伸びる
    let a = (i + rand(-0.3, 0.3)) / arms * TAU, px = hx, py = hy;
    const pts = [[px, py]];
    for (let s = 0; s < 7; s++) {
      a += rand(-0.35, 0.35);
      [px, py] = inside(px + Math.cos(a) * rand(22, 58) * (0.6 + size * 0.4), py + Math.sin(a) * rand(22, 58) * (0.6 + size * 0.4));
      pts.push([px, py]);
    }
    cracks.push(pts);
  }
  const rings = [0.28, 0.55].map(f => Array.from({ length: arms }, (_, i) => cracks[i][Math.round(f * 7)]));   // 輪のようなひび
  return spawn({
    kind: 'pane', x: hx, y: hy, r: 4, safe: true, spd: 1, rect: { x: L, y: T, w, h }, at, t0: songTime, cracks, rings,
    color, n, speed, g, rr: r, hx, hy, size,
    move(b) {
      b.p = Math.max(0, Math.min(1, (songTime - b.t0) / Math.max(0.01, b.at - b.t0)));   // 割れるまでの進みぐあい 0〜1
      if (songTime < b.at) return;
      const cols = Math.max(1, Math.round(Math.sqrt(b.n * b.rect.w / b.rect.h))), rows = Math.ceil(b.n / cols);
      for (let i = 0; i < b.n; i++) {                          // 板をます目に分けて、1マスに1枚
        const sx = b.rect.x + ((i % cols) + rand(0.15, 0.85)) * b.rect.w / cols;
        const sy = b.rect.y + (Math.floor(i / cols) + rand(0.15, 0.85)) * b.rect.h / rows;
        const a = Math.atan2(sy - b.hy, sx - b.hx) + rand(-0.25, 0.25);
        const v = b.speed * rand(0.55, 1.15);
        shard({ x: sx, y: sy, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 60, g: b.g, r: b.rr * rand(0.8, 1.2), color: b.color });
      }
      if (typeof fxShatter === 'function') fxShatter(b);
      b.dead = true;
    },
  });
}

// ★ひび割れ★ (x, y) からガラスにひびが走る。予告（うすい線）のあと、ひびが根もとから
// speed px/秒 でギザギザに伸びていき、伸びたところに当たる。伸びきってから hold 秒で消える。
//   arms = 何本に分かれるか / a0 = まん中の向き / spread = 広がる角度 / len = 1本の長さ
function crack({ x, y, arms = 3, a0 = Math.PI / 2, spread = 1.2, len = 360, speed = 900, width = 8, delay = 0.7, hold = 0.35, color }) {
  const segs = [];                                               // [x1, y1, x2, y2, 根もとからの距離]
  const grow = (sx, sy, a, d, left, depth) => {
    while (left > 1) {
      const l = Math.min(left, rand(34, 62));
      a += rand(-0.38, 0.38);
      const nx = sx + Math.cos(a) * l, ny = sy + Math.sin(a) * l;
      segs.push([sx, sy, nx, ny, d]);
      d += l; left -= l; sx = nx; sy = ny;
      if (depth === 0 && left > 80 && Math.random() < 0.3) grow(sx, sy, a + (Math.random() < 0.5 ? -1 : 1) * rand(0.5, 0.9), d, left * 0.55, 1);
    }
  };
  for (let i = 0; i < arms; i++) {
    const a = arms === 1 ? a0 : a0 - spread / 2 + spread * i / (arms - 1);
    grow(x, y, a + rand(-0.12, 0.12), 0, len * rand(0.85, 1.1), 0);
  }
  const reachMax = Math.max(...segs.map(s => s[4] + Math.hypot(s[2] - s[0], s[3] - s[1])));
  return spawn({
    kind: 'crack', x, y, r: width / 2, segs, delay, hold, speed, color, reach: 0, reachMax,
    move(b) {
      b.reach = b.age * b.speed;
      if (b.reach > b.reachMax + b.hold * b.speed) b.safe = true;
      if (b.reach > b.reachMax + (b.hold + 0.3) * b.speed) b.dead = true;
    },
    hits: b => b.segs.some(s => {
      if (s[4] >= b.reach) return false;
      const l = Math.hypot(s[2] - s[0], s[3] - s[1]), k = Math.min(1, (b.reach - s[4]) / l);
      return segmentHitsPlayer(s[0], s[1], s[0] + (s[2] - s[0]) * k, s[1] + (s[3] - s[1]) * k, b.r);
    }),
  });
}

// ★鍵盤ブロック★ ピアノの音が、鳴るちょうどその瞬間に地面（鍵盤）に着く縦長のブロック。
// ブロックの長さ = 音の長さ。音がのびているあいだ地面に吸いこまれ続けるので、その間そこには立てない
//   t = 着く時刻 / x = 場所 / dur = 音の長さ（秒）/ v = 落ちる速さ / w = 幅
function keyDrop(t, x, dur, v = 520, { w = 34, color, warn = 0.3 } = {}) {
  const h = Math.max(18, dur * v - 6), y0 = -12, travel = (GROUND_Y - y0) / v;
  return { at: t - travel - warn, go: () => spawn({
    kind: 'key', x, y: y0, w, h, r: h, vy: v, delay: warn, color, spd: 1,
    move(b, dt) {
      b.y += b.vy * dt;                                          // b.y = ブロックの下のはし
      if (!b.landed && b.y >= GROUND_Y) { b.landed = true; if (typeof fxKey === 'function') fxKey(b); }
      if (b.y - b.h > GROUND_Y) b.dead = true;
    },
    hits: b => {
      const top = b.y - b.h, bot = Math.min(b.y, GROUND_Y);
      return bot > top && player.x < b.x + b.w / 2 - 3 && player.x + player.w > b.x - b.w / 2 + 3 && player.y < bot - 3 && player.y + player.h > top + 3;
    },
  }) };
}

// ★プリズム弾★ まっすぐ飛ぶが、every 拍ごとに光が屈折するように turn（ラジアン）だけカクッと曲がる。
// alt = true なら毎回逆に曲がる（ジグザグ）。次に曲がる向きは短い点線で見える
function prism({ x, y, a, v = 200, turn = 0.6, alt = true, every = 1, r = 7, delay = 0, color, style = 'shard' }) {
  return spawn({
    x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, r, delay, color, style, turn, alt, every, noTrail: true,
    move(b, dt) {
      const n = beatIndex(songTime, b.every);
      if (b.n0 == null) b.n0 = b.lastN = n;
      if (n > b.lastN) {
        b.lastN = n;
        const c = Math.cos(b.turn), s = Math.sin(b.turn);
        [b.vx, b.vy] = [b.vx * c - b.vy * s, b.vx * s + b.vy * c];
        if (b.alt) b.turn = -b.turn;
        if (typeof blip === 'function') blip(b.x, b.y, b);
      }
      b.x += b.vx * dt; b.y += b.vy * dt;
      const c = Math.cos(b.turn), s = Math.sin(b.turn), sp = Math.hypot(b.vx, b.vy) || 1;
      b.tx = (b.vx * c - b.vy * s) / sp; b.ty = (b.vx * s + b.vy * c) / sp;   // 次に曲がる向き（予告の点線）
    },
  });
}

/* ---- ここから下は「Vertigo」で生まれた仕掛け（弾ではなく、ステージそのものが動く）---------
   stage の値を stageTo で「なめらかに」変えると、世界が傾いたり、床が流れたり、画面がさかさまになる。
     tilt     世界の傾き（ラジアン。＋ で右が下がる）→ 低いほうへすべる。0.35 で約20度（ふんばるのがやっと）
     spin     画面だけの回転（重力は画面の下のまま）。Math.PI で上下さかさま → ←→ が逆に見える
     mirror   1 = ふつう、-1 = 左右反転（1→-1 にすると、カードがひっくり返るように反転する）
     zoom / follow   カメラのズームと、プレイヤーを追いかける強さ（0〜1）
     conveyor 地面が流れる速さ（px/秒、＋ で右へ）。床の穴もいっしょに流れる
     wl, wr   左右の壁の位置（せまくなってくる）/ shock = 1 で壁に電気（さわると当たる）
   -------------------------------------------------------------------------- */
const STAGE_SLIDE = 620;       // 傾きですべる速さ（px/秒）= STAGE_SLIDE × sin(傾き)。走る速さは 260
const STAGE_DEFAULT = { tilt: 0, spin: 0, mirror: 1, zoom: 1, follow: 0, conveyor: 0, wl: 0, wr: W, shock: 0, grav: 1, gravVis: 1, ceil: 0, dark: 0, cctv: 0, brush: 0, wind: 0 };
const stage = { ...STAGE_DEFAULT, slideV: 0, scroll: 0, holes: [], drops: [], hint: null, pings: [] };
let stageTweens = [];
function stageReset() {
  Object.assign(stage, STAGE_DEFAULT, { slideV: 0, scroll: 0, holes: [], drops: [], hint: null, pings: [] });
  stageTweens = [];
}
// props の値へ、dur 秒かけて変える（ease: 'smooth' = なめらか / 'snap' = 最初にぐっと動く / 'linear'）
function stageTo(props, dur = 0.4, ease = 'smooth') {
  for (const key in props) {
    stageTweens = stageTweens.filter(tw => tw.key !== key);
    stageTweens.push({ key, from: stage[key], to: props[key], t0: songTime, t1: songTime + Math.max(0.001, dur), ease });
  }
}
const STAGE_EASE = {
  smooth: p => p * p * (3 - 2 * p),
  snap: p => 1 - Math.pow(1 - p, 3),
  linear: p => p,
};
// 床の穴: 曲の時刻 open に開いて close に閉じる。warn 秒前から赤く点滅する。x, w = 場所と幅
function floorHole({ x, w = 110, open, close, warn = 1 }) {
  stage.holes.push({ x, w, open, close, warn });
}
// 足場をくずす: open〜close のあいだ消える（warn 秒前から赤く点滅）。足場の上に逃げるのを防ぐ
function dropPlatform(p, { open, close, warn = 1 }) {
  stage.drops.push({ p, open, close, warn });
}
// プレイヤーが乗っている（か、真上にいる）足場。地面なら null
function platformUnderPlayer() {
  let best = null;
  for (const p of platforms) {
    if (p.ground || player.x + player.w <= p.x || player.x >= p.x + p.w || player.y + player.h > p.y + 2) continue;
    if (!best || p.y < best.y) best = p;
  }
  return best;
}
// 画面のまん中に出す予告の文字（「◀ TILT」など）
function stageHint(text, dur = 1) { stage.hint = { text, t0: songTime, t1: songTime + dur }; }
// ★転がるトゲ車★ 床の上を転がる。坂（tilt）を下る向きに加速し、コンベアにも運ばれる。
// 開いた穴に落ちたり、電気の壁にぶつかると消える（電気が流れていない壁でははね返る）。跳び越える
//   x = 出てくる場所 / vx = 最初の速さ / r = 大きさ
function roller({ x, vx = 0, r = 15, delay = 0.7, life = 9, color }) {
  return spawn({
    x, y: GROUND_Y - r, vx, r, delay, color, style: 'roller', spd: 1, life, lane: [Math.sign(vx) || 1, 0], noTrail: true,
    move(b, dt) {
      if (b.falling) { b.vy += 2200 * dt; b.y += b.vy * dt; if (b.y > H + 40) b.dead = true; return; }
      b.vx += 900 * Math.sin(stage.tilt) * dt;
      b.x += (b.vx + stage.conveyor) * dt;
      const inHole = stage.holes.some(h => songTime >= h.open && songTime <= h.close && b.x > h.x + b.r * 0.5 && b.x < h.x + h.w - b.r * 0.5);
      if (inHole) { b.falling = true; b.vy = 0; return; }
      for (const [w, d] of [[stage.wl, 1], [stage.wr, -1]]) {
        if ((b.x - b.r - w) * d < 0) {
          if (stage.shock >= 1) { if (typeof sparks === 'function') sparks(b.x, b.y, { n: 14, color: '#e8fdff', speed: 260, life: 0.4, size: 2.5 }); b.dead = true; }
          else { b.x = w + d * b.r; b.vx = d * Math.abs(b.vx) * 0.6; }
        }
      }
      if (b.age > b.life) b.dead = true;
    },
  });
}
// 床の電気: x〜x+w の床に、delay 秒の予告のあと hold 秒だけ電気が走る（跳ぶか足場へ）
function zapFloor({ x, w, delay = 0.9, hold = 0.5, color = '#7ff6ff' }) {
  const b = laser({ x1: x, y1: GROUND_Y - 7, x2: x + w, y2: GROUND_Y - 7, width: 14, delay, hold, color });
  b.label = '▲';
  return b;
}
// 天井のピストン: x に、上から地面まで太い柱がドンと落ちる（よける）
function piston({ x, w = 70, delay = 0.8, hold = 0.3, color = '#ffe36e' }) {
  return laser({ x1: x, y1: -60, x2: x, y2: GROUND_Y, width: w, delay, hold, color });
}
function zapPlayer(dir) {                     // 電気の壁にさわった
  player.x += dir * 36;
  player.vx = dir * 200;
  if (running && invuln <= 0) hitPlayer();
}
function updateStage(dt) {
  for (const tw of stageTweens) {
    const p = Math.max(0, Math.min(1, (songTime - tw.t0) / (tw.t1 - tw.t0)));
    stage[tw.key] = tw.from + (tw.to - tw.from) * STAGE_EASE[tw.ease](p);
    tw.done = p >= 1;
  }
  stageTweens = stageTweens.filter(tw => !tw.done);
  stage.scroll += stage.conveyor * dt;
  for (const h of stage.holes) h.x += stage.conveyor * dt;     // 穴も床といっしょに流れる
  stage.holes = stage.holes.filter(h => songTime < h.close + 0.5);
  stage.drops = stage.drops.filter(d => songTime < d.close + 0.5);
  if (stage.hint && songTime > stage.hint.t1) stage.hint = null;
  stage.gravVis += (stage.grav - stage.gravVis) * Math.min(1, dt * 14);   // キャラが上下にひっくり返る見た目
}

/* ---- ここから下は「ExtremeEX」で生まれた形態（この曲だけのもの）----------------- */

// ★EXエコー★ プレイヤーの「delay 秒前の位置」に赤い分身がいて、さわると当たる。
// 止まっていると追いつかれ、来た道を引き返すとぶつかる（跳び越えればよい）。
const echo = { on: false, delay: 1.5, a: 0, x: 0, y: 0, hist: [] };
function echoReset() { echo.on = false; echo.a = 0; echo.hist = []; }
function echoSet(on, delay = echo.delay) { echo.on = on; echo.delay = delay; }
function updateEcho(dt) {
  echo.hist.push({ t: songTime, x: player.x, y: player.y });
  while (echo.hist.length > 2 && echo.hist[1].t < songTime - echo.delay - 0.2) echo.hist.shift();
  const tt = songTime - echo.delay;
  let p = echo.hist[0];
  for (const q of echo.hist) { if (q.t > tt) break; p = q; }
  echo.x = p.x; echo.y = p.y;
  echo.a = Math.max(0, Math.min(1, echo.a + (echo.on ? dt / 0.8 : -dt / 0.4)));   // 0.8秒かけて現れる（それまでは当たらない）
  if (echo.a >= 1 && invuln <= 0 && running &&
      player.x < echo.x + player.w - 4 && player.x + player.w > echo.x + 4 &&
      player.y < echo.y + player.h - 4 && player.y + player.h > echo.y + 4) hitPlayer();
}

// ★ロックオン★ 照準が track 秒プレイヤーを追いかけ、そこで止まって lock 秒点滅し、ドンと爆発する。
// 止まった照準の円（半径 r）から出ればよい
function lockOn({ track = 0.9, lock = 0.45, r = 56, color = '#ff2a3a' }) {
  const p = playerXY();
  return spawn({
    kind: 'lock', x: p.x, y: p.y, r, track, lock, color, safe: true, spd: 1,
    move(b, dt) {
      if (b.age < b.track) {
        const q = playerXY(), k = Math.min(1, dt * 10);
        b.x += (q.x - b.x) * k; b.y += (q.y - b.y) * k;
      } else if (b.age >= b.track + b.lock && !b.blown) {
        b.blown = true; b.safe = false; b.blowAt = b.age;
        if (typeof shockRing === 'function') { shockRing(b.x, b.y, { color: b.color, size: b.r * 1.6, life: 0.3, width: 6 }); shake(5); }
      }
      if (b.blown && b.age > b.blowAt + 0.12) b.dead = true;
    },
    hits: b => circleHitsPlayer(b.x, b.y, b.r),
  });
}

// ★REV弾★ 「ヴイーン」の弾。hang 秒ほとんど止まってうなり、そのあと rise 秒で一気に v まで加速する
// （シンセの音程がしゃくり上がるのと同じカーブ）。aim = true なら、飛び出す瞬間にプレイヤーをねらい直す（spread だけずらす）
// lead = true なら「先読み」: プレイヤーが走っている先をねらう（走り続けるだけでは逃げられない）
function revShot({ x, y, a = Math.PI / 2, v = 620, hang = 0.4, rise = 0.25, aim = true, lead = false, spread = 0, r = 7, delay = 0, color }) {
  return spawn({
    x, y, r, delay, color, style: 'rev', dirA: a, v, hang, rise, aim, lead, spread, noTrail: true, revK: 0,
    move(b, dt) {
      if (b.age < b.hang) { b.revK = 0; b.shiver = (Math.random() - 0.5) * 2; return; }
      if (b.aim && !b.aimed) {
        const p = playerXY();
        if (b.lead) {                                   // 先読み: 着くころにプレイヤーがいる場所をねらう
          const tt = Math.hypot(p.x - b.x, p.y - b.y) / (b.v * bulletSpeedMul * b.spd) + b.rise * 0.5;
          p.x = Math.max(0, Math.min(W, p.x + (player.vx + stage.slideV) * tt));
        }
        b.dirA = Math.atan2(p.y - b.y, p.x - b.x) + b.spread; b.aimed = true;
      }
      const k = Math.min(1, (b.age - b.hang) / b.rise), sp = b.v * (0.03 + 0.97 * k * k * (3 - 2 * k));
      b.revK = k; b.shiver = 0;
      b.vx = Math.cos(b.dirA) * sp; b.vy = Math.sin(b.dirA) * sp;
      b.x += b.vx * dt; b.y += b.vy * dt;
    },
  });
}
// REV弾をまとめて円形に（全部いっしょにうなって、いっせいに外へ飛ぶ。aim なし）
function revRing({ x, y, count = 12, v = 520, hang = 0.45, start = 0, r = 7, delay = 0, color }) {
  for (let i = 0; i < count; i++) revShot({ x, y, a: start + i / count * TAU, v, hang, aim: false, r, delay, color });
}

/* ---- ここから下は「Malware」で生まれた形態（この曲だけのもの）-------------------
   テーマは「バグとウイルス」。
     感染する床   … ウイルス（spore）が落ちた所から、床が1マスずつ左右に感染していく。感染したマスはトゲになる
     ワーム       … 体の長いヘビ。頭がプレイヤーを追いかけ、体は頭の通った道をそのままたどる
     エラー画面   … 「ERROR」のウィンドウが開く（さわると当たる）。cascade で、ずらしながら何枚も開く
     重力バグ     … 重力が上向きになり、天井に立つ（gravityFlip）
     ループバグ   … 曲が同じ所をくり返す（スタッター）あいだ、画面の弾も同じ所を行ったり来たりする
   -------------------------------------------------------------------------- */
const INF_TILE = 20;                                        // 感染のマスの幅（px）。reach 2 → 5マス = 100px
const CEIL = { x: 0, y: 0, w: W, h: CEIL_Y, ceil: true };   // 天井（感染する面として使う）
const malware = { tiles: [], loop: null };
function malwareReset() { malware.tiles = []; malware.loop = null; }

// x の位置から、面 p（地面・足場・CEIL）を感染させる。spread 秒ごとに1マスずつ左右へ reach マスまで広がる。
// 各マスは inc 秒の潜伏（点滅する予告）のあと、life 秒のあいだトゲになる
function infectAt(x, p = platforms[0], { reach = 3, spread = 0.12, inc = 0.5, life = 2.4, at = songTime } = {}) {
  const c = Math.floor(x / INF_TILE);
  for (let d = -reach; d <= reach; d++) {
    const x0 = Math.max(p.x, (c + d) * INF_TILE), x1 = Math.min(p.x + p.w, (c + d + 1) * INF_TILE);
    if (x1 - x0 < 4) continue;
    const on = at + Math.abs(d) * spread, live = on + inc, off = live + life;
    const t = malware.tiles.find(q => q.p === p && q.x0 === x0 && q.on <= off && q.off >= on);
    if (t) { t.on = Math.min(t.on, on); t.live = Math.min(t.live, live); t.off = Math.max(t.off, off); }
    else malware.tiles.push({ p, x0, x1, on, live, off });
  }
}
// プレイヤーが面 p の x0〜x1 に「立っている（ふれている）」？
function onSurface(p, x0, x1) {
  if (player.x + player.w <= x0 + 3 || player.x >= x1 - 3) return false;
  if (p.ceil) return stage.grav < 0 && player.y <= CEIL_Y + 6;
  const feet = player.y + player.h;
  return feet >= p.y - 8 && feet <= p.y + 3 && !platformGone(p) && !(p.ground && overHole());
}
// ★ウイルス★ 重力 g で落ちて（g < 0 なら天井へ上がって）、着いた面を感染させる。それ自体も当たる
function spore({ x, y, vx = 0, vy = 0, g = 900, r = 8, delay = 0, color, reach = 3, spread = 0.12, inc = 0.5, life = 2.4, spd }) {
  return spawn({
    x, y, vx, vy, g, r, delay, color, spd, style: 'spore', noTrail: true, inf: { reach, spread, inc, life }, loopable: true,
    move(b, dt) {
      const y0 = b.y;
      b.vy += b.g * dt; b.x += b.vx * dt; b.y += b.vy * dt;
      let hit = null;
      if (b.vy > 0) {
        for (const p of platforms) {
          if (platformGone(p) || b.x < p.x || b.x > p.x + p.w) continue;
          if (y0 + b.r <= p.y + 1 && b.y + b.r >= p.y && (!hit || p.y < hit.y)) hit = p;
        }
      } else if (b.vy < 0 && stage.ceil > 0.5 && b.y - b.r <= CEIL_Y) hit = CEIL;
      if (hit) {
        infectAt(b.x, hit, b.inf);
        b.dead = true;
        if (typeof fxSplat === 'function') fxSplat(b.x, hit.ceil ? CEIL_Y : hit.y, b);
      }
    },
  });
}

// ★ワーム★ n 節の長い体。頭は turn（ラジアン/秒）までしか曲がれずにプレイヤーを追い、life 秒たつとまっすぐ去っていく。
// 体は頭の通った道をそのままたどる → 体の上を跳び越えるか、回りこむ
function worm({ x, y, n = 12, gap = 13, v = 190, turn = 2.4, life = 6, r = 10, delay = 0.6, color }) {
  const p = playerXY();
  return spawn({
    kind: 'worm', x, y, r, delay, color, n, gap, v, turn, life, a: Math.atan2(p.y - y, p.x - x), trail: [{ x, y }], segs: [{ x, y }],
    move(b, dt) {
      if (b.age < b.life) {
        const q = playerXY();
        let d = Math.atan2(q.y - b.y, q.x - b.x) - b.a;
        d = Math.atan2(Math.sin(d), Math.cos(d));
        b.a += Math.max(-b.turn * dt, Math.min(b.turn * dt, d));
      }
      b.x += Math.cos(b.a) * b.v * dt; b.y += Math.sin(b.a) * b.v * dt;
      if (b.y > GROUND_Y - b.r) b.y = GROUND_Y - b.r;                         // 床にもぐらない（床をはう）
      if (stage.ceil > 0.5 && b.y < CEIL_Y + b.r) b.y = CEIL_Y + b.r;
      b.trail.unshift({ x: b.x, y: b.y });
      const segs = [{ x: b.x, y: b.y }];
      let dist = 0, need = b.gap, i = 1;
      for (; i < b.trail.length && segs.length < b.n; i++) {
        const A = b.trail[i - 1], B = b.trail[i], L = Math.hypot(B.x - A.x, B.y - A.y);
        while (L > 0 && dist + L >= need && segs.length < b.n) { const k = (need - dist) / L; segs.push({ x: A.x + (B.x - A.x) * k, y: A.y + (B.y - A.y) * k }); need += b.gap; }
        dist += L;
      }
      const last = b.trail[b.trail.length - 1];
      while (segs.length < b.n) segs.push({ x: last.x, y: last.y });
      if (b.trail.length > i + 2) b.trail.length = i + 2;
      b.segs = segs;
      if (b.age > b.life && segs.every(s => s.x < -40 || s.x > W + 40 || s.y < -40 || s.y > H + 40)) b.dead = true;
      if (b.age > b.life + 8) b.dead = true;
    },
    hits: b => b.segs.some((s, i) => circleHitsPlayer(s.x, s.y, i ? b.r * 0.8 : b.r)),
  });
}

// ★エラー画面★ (x, y) を中心に w×h のウィンドウが、delay 秒の予告（点線のわく）のあと開き、hold 秒のあいだ当たる
function popup({ x, y, w = 190, h = 110, delay = 0.6, hold = 1.6, title = 'ERROR', text = '', color }) {
  return spawn({
    kind: 'popup', x, y, w, h, r: Math.max(w, h) / 2, delay, hold, title, text, color, spd: 1,
    move(b) { if (b.age > b.hold) { b.safe = true; if (b.age > b.hold + 0.15) b.dead = true; } },
    hits: b => player.x < b.x + b.w / 2 - 2 && player.x + player.w > b.x - b.w / 2 + 2 &&
               player.y < b.y + b.h / 2 - 2 && player.y + player.h > b.y - b.h / 2 + 2,
  });
}
// エラー画面が (dx, dy) ずつずれながら、every 秒ごとに n 枚つづけて開く（昔のパソコンがこわれた時の、あれ）
function cascade({ x, y, n = 6, dx = 26, dy = 22, every = 0.1, delay = 0.6, hold = 1.2, w, h, title, text, color }) {
  for (let i = 0; i < n; i++) popup({ x: x + dx * i, y: y + dy * i, w, h, delay: delay + i * every, hold, title, text, color });
}

// ★重力バグ★ up = true で重力が上向きになり、天井に立つ（ジャンプは下向き）。false で元にもどる
function gravityFlip(up) {
  stage.grav = up ? -1 : 1;
  player.onGround = false; player.coyoteT = 0;
  stageTo({ ceil: up ? 1 : 0 }, up ? 0.25 : 0.8);
}

// ★ループバグ★ これから dur 秒のあいだ、いま画面にある弾が slice 秒ごとに「今の位置」へ巻きもどる（行ったり来たり）。
// accel < 1 なら、くり返しがだんだん細かくなる（曲のスタッターと同じ）
function glitchLoop(dur, slice, accel = 1) {
  const cuts = [];
  let t = songTime, s = slice;
  while (t + Math.max(0.006, s) < songTime + dur) { t += Math.max(0.006, s); cuts.push(t); s *= accel; }
  for (const b of bullets) {
    if (b.delay > 0 || b.kind || !(b.loopable || (b.move === straight && !b.step))) continue;
    b.loop = { x: b.x, y: b.y, vx: b.vx, vy: b.vy };
  }
  malware.loop = { t1: songTime + dur, cuts, i: 0 };
}

function updateMalware(dt) {
  const L = malware.loop;
  if (L) {
    let jump = false;
    while (L.i < L.cuts.length && songTime >= L.cuts[L.i]) { L.i++; jump = true; }
    if (jump) for (const b of bullets) if (b.loop) Object.assign(b, b.loop, { px: b.loop.x, py: b.loop.y });
    if (songTime >= L.t1) { for (const b of bullets) b.loop = null; malware.loop = null; }
  }
  malware.tiles = malware.tiles.filter(t => songTime < t.off + 0.3);
  if (invuln > 0 || !running) return;
  for (const t of malware.tiles) {
    if (songTime >= t.live && songTime <= t.off && onSurface(t.p, t.x0, t.x1)) { hitPlayer(); return; }
  }
}

/* ---- ここから下は「Abyss」で生まれた形態（深海。弾は遅いが、むずかしい）-----------------
     クラゲ     … 拍ごとにプレイヤーへ「グッ」と泳いで、すぐ止まる。下に触手がたれている（触手も当たる）
     マリンスノー … ゆらゆら横にゆれながら、ゆっくり沈む小さな粒
     暗い海     … stageTo({ dark: 1 }) で画面が暗くなり、自分のまわりしか見えない（弾はうっすら光る）
     ソナー     … sonar(x, y) で輪が広がり、通った所の弾が一瞬はっきり光る
     リヴァイアサン … 長い体の巨大な生き物が、うねりながら画面を横切る
   -------------------------------------------------------------------------- */
function sonar(x, y) { stage.pings.push({ x, y, t0: songTime }); stage.pings = stage.pings.filter(p => songTime - p.t0 < 3); }

// ★クラゲ★ every 拍ごとに、プレイヤーの方へ速さ v で泳ぎ出し、水の抵抗ですぐ遅くなる。life 秒たつと上へ去る
function jelly({ x, y, v = 260, every = 1, drag = 3.2, r = 13, life = 8, legs = 3, delay = 0.8, color }) {
  return spawn({
    kind: 'jelly', x, y, r, delay, color, v, every, drag, life, legs, tail: [], noTrail: true,
    move(b, dt) {
      const n = beatIndex(songTime, b.every);
      if (b.n == null) b.n = n - 1;
      if (n > b.n) {                                    // 拍の頭: 泳ぎ出す
        b.n = n;
        if (b.age < b.life) { const p = playerXY(), a = Math.atan2(p.y - b.y, p.x - b.x); b.vx = Math.cos(a) * b.v; b.vy = Math.sin(a) * b.v; }
        else { b.vx = 0; b.vy = -b.v; }
        b.pulse = 1;
      }
      const f = Math.exp(-b.drag * dt);
      b.vx *= f; b.vy *= f;
      b.x += b.vx * dt; b.y += b.vy * dt;
      if (b.y > GROUND_Y - b.r - 30) b.y = GROUND_Y - b.r - 30;
      b.pulse = Math.max(0, (b.pulse || 0) - dt * 3);
      b.tail.unshift({ x: b.x, y: b.y });
      if (b.tail.length > 40) b.tail.length = 40;
      if (b.age > b.life + 4 || b.y < -80) b.dead = true;
    },
    // 触手: 少し前の位置から、下へたれる3本（当たり判定は小さな丸）
    legPts(b) {
      const pts = [], back = b.tail[Math.min(b.tail.length - 1, 10)] || b;
      for (let i = 0; i < b.legs; i++) {
        const ox = (i - (b.legs - 1) / 2) * b.r * 0.7;
        for (let j = 1; j <= 3; j++) pts.push({ x: b.x + ox + (back.x - b.x) * j / 3 + Math.sin(songTime * 3 + i + j) * 3, y: b.y + b.r * 0.4 + j * b.r * 0.75 + (back.y - b.y) * j / 3 });
      }
      return pts;
    },
    hits: b => circleHitsPlayer(b.x, b.y, b.r) || b.legPts(b).some(p => circleHitsPlayer(p.x, p.y, 4)),
  });
}

// ★マリンスノー★ ゆっくり沈みながら、左右に amp だけゆれる小さな粒
function snow({ x, y = -10, vy = 60, amp = 30, freq = 0.8, r = 5, delay = 0, color }) {
  return spawn({
    x, y, vy, r, delay, color, amp, freq, style: 'snow', ox: x, ph: Math.random() * TAU, noTrail: true,
    move(b, dt) { b.y += b.vy * dt; b.x = b.ox + Math.sin(b.age * b.freq * TAU + b.ph) * b.amp; if (b.y > GROUND_Y + 10) b.dead = true; },
  });
}

// ★リヴァイアサン★ 体の節 n 個の巨大な生き物。y を中心に amp の高さでうねりながら、dir の向きへ v で横切る
function leviathan({ y = 380, dir = 1, v = 150, amp = 140, wave = 0.5, n = 14, gap = 0.22, r = 34, delay = 1.5, color }) {
  const x0 = dir > 0 ? -80 : W + 80;
  const pos = (b, t) => ({ x: x0 + dir * b.v * t, y: b.y0 + Math.sin(t * b.wave * TAU) * b.amp });
  return spawn({
    kind: 'leviathan', x: x0, y, y0: y, dir, v, amp, wave, n, gap, r, delay, color, spd: 1, segs: [], lane: [dir, 0],
    move(b) {
      b.segs = [];
      for (let i = 0; i < b.n; i++) {
        const t = b.age - i * b.gap;
        const p = pos(b, Math.max(0, t));
        b.segs.push({ x: p.x, y: p.y, r: b.r * (i === 0 ? 1 : Math.max(0.35, 1 - i / b.n * 0.75)), on: t > 0 });
      }
      b.x = b.segs[0].x; b.y = b.segs[0].y;
      const tail = b.segs[b.n - 1];
      if ((dir > 0 && tail.x > W + 120) || (dir < 0 && tail.x < -120)) b.dead = true;
    },
    hits: b => b.segs.some(s => s.on && circleHitsPlayer(s.x, s.y, s.r * 0.85)),
  });
}

/* ---- ここから下は「Ward 13」で生まれた形態（ホラー）-------------------------------
     ストーカー … 背の高い化け物が、床を歩いて追いかけてくる。stalkerBlink() で明かりが消えた瞬間に近づく。
                  背は 90px なので、ジャンプで頭の上を跳び越えられる
     はうもの   … 床をすばやくはってくる低い生き物（跳び越える）
     扉         … 上から床まで、太い扉がバタンと閉まる（予告のあと、その場所にいると当たる）
     stageTo({ cctv: 1 }) … 監視カメラの映像になる（見た目だけ。カメラの切りかえは zoom / follow で）
   -------------------------------------------------------------------------- */
// ★ストーカー★ x から床を歩いてプレイヤーを追う。v = 歩く速さ、life 秒で消える
function stalker({ x, v = 90, life = 10, w = 30, h = 92, delay = 1.0, color }) {
  return spawn({
    kind: 'stalker', x, y: GROUND_Y - h / 2, w, h, v, life, r: h / 2, delay, color, spd: 1, dir: 1, fade: 0,
    move(b, dt) {
      const p = playerXY(), d = p.x - b.x;
      b.dir = Math.sign(d) || b.dir;
      if (b.age < b.life) { if (Math.abs(d) > 4) b.x += b.dir * Math.min(Math.abs(d), b.v * dt); b.step = (b.step || 0) + dt; }
      else { b.fade += dt; b.safe = true; if (b.fade > 0.6) b.dead = true; }
    },
    hits: b => player.x < b.x + b.w / 2 - 3 && player.x + player.w > b.x - b.w / 2 + 3 && player.y + player.h > GROUND_Y - b.h + 6,
  });
}
// 明かりが消えた瞬間、ストーカーが dist だけ近くにワープする（でも gap より近くには来ない）
function stalkerBlink(dist = 160, gap = 110) {
  const p = playerXY();
  for (const b of bullets) {
    if (b.kind !== 'stalker' || b.delay > 0 || b.safe) continue;
    const d = p.x - b.x, m = Math.max(0, Math.min(dist, Math.abs(d) - gap));
    b.x += Math.sign(d) * m; b.blinkT = songTime;
  }
}
// ★はうもの★ 床の上を、左右のはしから速さ v ではってくる（跳び越える）
function crawler({ fromLeft = true, v = 300, r = 12, delay = 0.8, color }) {
  const x = fromLeft ? -20 : W + 20;
  return spawn({ x, y: GROUND_Y - r, vx: fromLeft ? v : -v, r, delay, color, style: 'crawler', lane: [fromLeft ? 1 : -1, 0], noTrail: true });
}
// ★扉★ x を中心に、幅 w の扉が上から床まで閉まる。delay 秒の予告のあと hold 秒のあいだ当たる
function doorSlam({ x, w = 56, delay = 0.9, hold = 0.5, color }) {
  return spawn({
    kind: 'door', x, y: GROUND_Y / 2, w, r: w, delay, hold, color, spd: 1,
    move(b) { if (b.age > b.hold) { b.safe = true; if (b.age > b.hold + 0.3) b.dead = true; } },
    hits: b => player.x < b.x + b.w / 2 - 2 && player.x + player.w > b.x - b.w / 2 + 2,
  });
}
// 血のしずく: 天井から落ちる（重力つき）
function bloodDrop({ x, delay = 0.6, g = 900, r = 6, color = '#b0101a' }) {
  return spawn({ x, y: -8, vy: 0, g, r, delay, color, style: 'blood', lane: [0, 1], noTrail: true,
    move(b, dt) { b.vy += b.g * dt; b.y += b.vy * dt; if (b.y > GROUND_Y - b.r) { b.dead = true; if (typeof fxSplat === 'function') fxSplat(b.x, GROUND_Y, b); } } });
}

/* ---- ここから下は「Prism」で生まれた形（ビームの芸術）-----------------------------------
   ぜんぶ laser() の仲間。予告の線が出て、そのあと少しのあいだだけ当たる光になる。
   撃ったビームは、見た目のセット（visuals-prism.js）が「光の絵」としてキャンバスに描き残していく。
     prismFan   … 上のプリズムで白い光が七色に分かれ、地面の xs の場所へ扇のように降りる（赤→紫の順に光る）
     kaleido    … 中心 (cx,cy) から d だけ離れた n 本の線（万華鏡の星）。中心の円の中は安全
     bounceBeam … 壁・天井・床で反射しながら進む光（光が走るように、1本ずつ順に光る）
     brushPos   … 空に絵を描く「光の筆」の位置（曲の時刻で決まる）。stageTo({ brush: 1 }) で見える
   -------------------------------------------------------------------------- */
const SPECTRUM = ['#ff4d6d', '#ff9f43', '#ffe66d', '#5cff9d', '#4dd2ff', '#6c7bff', '#c77dff'];   // 赤→紫
function spectrum(i, n = 7) { return SPECTRUM[Math.round(Math.max(0, Math.min(1, n > 1 ? i / (n - 1) : 0)) * 6)]; }
// 光の線: ふつうのレーザーと同じ。拍にぴったり合わせるので、光っている時間 hold は秒のまま
function ray(o) { const b = laser({ width: 12, hold: 0.24, ...o }); b.spd = 1; return b; }
// (x1,y1) から (x2,y2) の向きへ、画面の外まで伸ばした線
function rayThrough(x1, y1, x2, y2, o = {}) {
  const a = Math.atan2(y2 - y1, x2 - x1), L = 1300;
  return ray({ x1, y1, x2: x1 + Math.cos(a) * L, y2: y1 + Math.sin(a) * L, ...o });
}
// ★プリズム★ (x, y) のプリズムから、地面の xs の場所へ七色の光。step 秒ずつずれて、赤→紫の順に光る
function prismFan({ x, y = 96, xs, width = 12, delay = 0.8, hold = 0.26, step = 0.12, reverse = false }) {
  const n = xs.length;
  xs.forEach((gx, i) => {
    const j = reverse ? n - 1 - i : i;
    const a = Math.atan2(GROUND_Y - y, gx - x);
    const b = ray({ x1: x + Math.cos(a) * 26, y1: y + Math.sin(a) * 26, x2: gx + Math.cos(a) * 60, y2: GROUND_Y + Math.sin(a) * 60, width, delay: delay + j * step, hold, color: spectrum(i, n) });
    b.prism = { x, y };
  });
}
// ★万華鏡の星★ 中心から d 離れた所を通る n 本の線（線の向きは rot から等間隔）。step 秒ずつ順に光る
function kaleido({ cx, cy, n = 6, d = 120, rot = 0, len = 1300, width = 10, delay = 0.8, hold = 0.24, step = 0.1, colors }) {
  for (let i = 0; i < n; i++) {
    const a = rot + i * TAU / n, tx = cx + Math.cos(a) * d, ty = cy + Math.sin(a) * d;    // 円にふれる点
    const ux = -Math.sin(a) * len / 2, uy = Math.cos(a) * len / 2;
    const b = ray({ x1: tx - ux, y1: ty - uy, x2: tx + ux, y2: ty + uy, width, delay: delay + i * step, hold, color: colors ? colors[i % colors.length] : spectrum(i, n) });
    b.star = { cx, cy, d };
  }
}
// ★反射する光★ (x, y) から角度 ang へ。画面のはし・天井・床で反射して、bounces 回まで進む
function bounceBeam({ x, y, ang, bounces = 5, width = 10, delay = 0.8, hold = 0.24, step = 0.07, hue = 0 }) {
  let px = x, py = y, dx = Math.cos(ang), dy = Math.sin(ang);
  const X0 = 0, X1 = W, Y0 = 0, Y1 = GROUND_Y;
  for (let i = 0; i <= bounces; i++) {
    const ts = [];
    if (dx > 1e-6) ts.push([(X1 - px) / dx, 'x']); if (dx < -1e-6) ts.push([(X0 - px) / dx, 'x']);
    if (dy > 1e-6) ts.push([(Y1 - py) / dy, 'y']); if (dy < -1e-6) ts.push([(Y0 - py) / dy, 'y']);
    const [t, side] = ts.filter(q => q[0] > 1e-3).sort((a, b) => a[0] - b[0])[0];
    const nx = px + dx * t, ny = py + dy * t;
    const b = ray({ x1: px, y1: py, x2: nx, y2: ny, width, delay: delay + i * step, hold, color: SPECTRUM[(hue + i) % 7] });
    b.bounce = i;
    px = nx; py = ny;
    if (side === 'x') dx = -dx; else dy = -dy;
  }
}
// 光の筆の位置（リサジュー曲線。曲の時刻 t で決まるので、先の位置もわかる）
function brushPos(t) {
  const u = t * 0.62;
  return { x: W / 2 + 300 * Math.sin(u * 1.3 + 0.6), y: 200 + 105 * Math.sin(u * 2.1) };
}

/* ---- ここから下は「Shiki（四季）」で生まれた形（丸い弾をあまり使わない）-------------------------
     inkStroke   … 墨の一筆。予告のあと、筆が線の上を走り、墨のついた所に当たる。描き終えて少しすると乾いて消える
     branch      … 桜の枝がのびる（墨の一筆が枝分かれする）。枝の先には花が咲く（見た目）
     fireworkRays… 花火の玉が上がって、光の筋が放射状に開く（筋と筋のすき間に入る）
     enso        … 円相（ひと筆の円）。プレイヤーを囲むように描かれる。円の中は安全
     mapleLeaf   … もみじ。風に流されながら、ひらひら飛んでくる
     icicle      … つらら。天井から落ちてくる
     aurora      … オーロラのカーテン。上から地面までの光の帯が、左右にゆれる
     stageTo({ wind: 140 }) … 風。プレイヤーが右へ（－なら左へ）流される
   -------------------------------------------------------------------------- */
function bezierPts(p0, p1, p2, p3, n = 24) {
  const out = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n, u = 1 - t;
    out.push({ x: u * u * u * p0.x + 3 * u * u * t * p1.x + 3 * u * t * t * p2.x + t * t * t * p3.x,
               y: u * u * u * p0.y + 3 * u * u * t * p1.y + 3 * u * t * t * p2.y + t * t * t * p3.y });
  }
  return out;
}
function arcPts(cx, cy, r, a0, a1, n = 32) {
  return Array.from({ length: n + 1 }, (_, i) => { const a = a0 + (a1 - a0) * i / n; return { x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r }; });
}
// 筆の太さ: 入りと抜きは細く、まん中は太い（0〜1 の場所 u で）
function inkTaper(u) { return 0.35 + 0.65 * Math.pow(Math.sin(Math.PI * Math.max(0, Math.min(1, u))), 0.6); }
// ★墨の一筆★ pts（点の列）に沿って、筆が speed px/秒で走る。width = いちばん太い所の太さ
function inkStroke({ pts, width = 18, speed = 900, delay = 0.8, hold = 0.35, color = '#16121c', taper = true }) {
  const cum = [0];
  for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y));
  const total = cum[cum.length - 1] || 1, mid = pts[pts.length >> 1];
  return spawn({
    kind: 'ink', x: mid.x, y: mid.y, r: width / 2, pts, cum, total, speed, hold, delay, color, taper, head: 0, spd: 1, noFreeze: false,
    move(b) {
      b.head = Math.min(b.total, b.age * b.speed);
      const done = b.total / b.speed;
      if (b.age > done + b.hold) b.safe = true;
      if (b.age > done + b.hold + 0.6) b.dead = true;
    },
    hits(b) {
      for (let i = 1; i < b.pts.length && b.cum[i - 1] < b.head; i++) {
        const a = b.pts[i - 1], z = b.pts[i];
        const f = Math.min(1, (b.head - b.cum[i - 1]) / ((b.cum[i] - b.cum[i - 1]) || 1));
        const w = b.r * (b.taper ? inkTaper(b.cum[i] / b.total) : 1) * 0.85;
        if (segmentHitsPlayer(a.x, a.y, a.x + (z.x - a.x) * f, a.y + (z.y - a.y) * f, w)) return true;
      }
      return false;
    },
  });
}
// ★桜の枝★ (x, y) から角度 ang へ、長さ len の枝がのびて、depth 回まで枝分かれする。seed で形が決まる
function branch({ x, y, ang, len = 300, depth = 3, width = 20, speed = 650, delay = 0.9, seed = 1, color = '#2a1c1a' }) {
  const rnd = k => { const v = Math.sin(seed * 91.7 + k * 37.3) * 43758.5453; return v - Math.floor(v); };
  const bend = (rnd(1) - 0.5) * 0.8;
  const end = { x: x + Math.cos(ang) * len, y: y + Math.sin(ang) * len };
  const c1 = { x: x + Math.cos(ang + bend) * len * 0.35, y: y + Math.sin(ang + bend) * len * 0.35 };
  const c2 = { x: x + Math.cos(ang - bend * 0.6) * len * 0.7, y: y + Math.sin(ang - bend * 0.6) * len * 0.7 };
  const pts = bezierPts({ x, y }, c1, c2, end, 16);
  const b = inkStroke({ pts, width, speed, delay, hold: 0.5 + depth * 0.25, color });
  b.branch = { depth, seed };
  if (depth > 1) {
    for (const [f, side] of [[0.45, 1], [0.72, -1]]) {
      const p = pts[Math.round(f * 16)];
      branch({ x: p.x, y: p.y, ang: ang + side * (0.45 + rnd(2 + side) * 0.4), len: len * 0.55, depth: depth - 1, width: width * 0.62, speed, delay: delay + (len * f) / speed, seed: seed * 3.1 + side, color });
    }
  }
  return b;
}
// ★花火★ 玉が (x, 地面) から (x, y) へ上がり（予告）、n 本の光の筋が r0〜r1 に開く
function fireworkRays({ x, y, n = 12, r0 = 26, r1 = 420, rot = 0, width = 9, delay = 1.2, hold = 0.32, color = '#ffd27f' }) {
  spawn({ kind: 'shell', x, y, r: 4, delay, color, safe: true, spd: 1, life: 0.05, move(b) { if (b.age > b.life) b.dead = true; } });
  for (let i = 0; i < n; i++) {
    const a = rot + i * TAU / n;
    const b = laser({ x1: x + Math.cos(a) * r0, y1: y + Math.sin(a) * r0, x2: x + Math.cos(a) * r1, y2: y + Math.sin(a) * r1, width, delay, hold, color });
    b.spd = 1; b.fw = { x, y };
  }
}
// ★円相★ (cx, cy) を中心に、半径 r の円をひと筆で描く（a0 から少しだけすき間を残して1周）
function enso({ cx, cy, r = 130, a0 = -Math.PI / 2, width = 20, speed = 1100, delay = 0.9, hold = 0.6, color = '#16121c' }) {
  const b = inkStroke({ pts: arcPts(cx, cy, r, a0, a0 + TAU * 0.93, 40), width, speed, delay, hold, color });
  b.enso = true;
  return b;
}
// もみじ: 風（stage.wind）に流されながら、ひらひら
function mapleLeaf({ x, y, vx = 0, vy = 70, r = 9, delay = 0.5, color = '#d8452a' }) {
  return spawn({
    x, y, vx, vy, r, delay, color, style: 'leaf', noTrail: true, ph: Math.random() * TAU, rot: Math.random() * TAU,
    move(b, dt) {
      b.vx += (stage.wind * 1.6 - b.vx) * Math.min(1, dt * 0.8);
      b.x += (b.vx + Math.sin(b.age * 3 + b.ph) * 60) * dt;
      b.y += (b.vy + Math.cos(b.age * 2.3 + b.ph) * 30) * dt;
      b.rot += dt * 3;
      if (b.y > GROUND_Y + 20) b.dead = true;
    },
  });
}
// つらら: 天井の x から落ちる（重力つき）。len = 長さ
function icicle({ x, len = 56, g = 1500, delay = 0.8, color = '#cfeaff' }) {
  return spawn({
    kind: 'icicle', x, y: -len, r: 7, len, vy: 0, g, delay, color, spd: 1,
    move(b, dt) {
      b.vy += b.g * dt; b.y += b.vy * dt;
      if (b.y >= GROUND_Y) { b.dead = true; if (typeof fxShatter === 'function') fxShatter(b.x, GROUND_Y, b); }
    },
    hits: b => segmentHitsPlayer(b.x, b.y - b.len, b.x, b.y, 6),
  });
}
// オーロラのカーテン: x0 を中心に amp だけ左右にゆれる光の帯（幅 w）。life 秒で消える
function aurora({ x0, amp = 140, w = 70, period = 4.8, life = 9.6, delay = 1.2, color = '#5cffb0', ph = 0 }) {
  return spawn({
    kind: 'aurora', x: x0, y: GROUND_Y / 2, r: w / 2, w, x0, amp, period, life, delay, color, ph, spd: 1,
    move(b) {
      b.x = b.x0 + b.amp * Math.sin(TAU * b.age / b.period + b.ph);
      if (b.age > b.life) { b.safe = true; if (b.age > b.life + 0.8) b.dead = true; }
    },
    hits: b => player.x + player.w > b.x - b.w * 0.4 && player.x < b.x + b.w * 0.4,
  });
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
