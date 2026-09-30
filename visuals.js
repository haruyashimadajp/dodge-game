"use strict";

/* =========================================================================
   VISUALS  —  見た目の演出だけを担当するファイル
   背景・カメラ（ゆれ / ズーム / 回転）・パーティクル・弾とキャラの描画・
   セクション名のバナー・タイトル画面のアニメーション。
   当たり判定やゲームの進行には一切影響しません（game.js のあとに読み込む）。

   game.js の弾幕から使える演出:
       flash(0〜1)          画面が白く光る           （game.js）
       shake(強さ)          画面がゆれる（10〜20 くらい）
       punch(強さ)          一瞬ズームインする（0.03〜0.08 くらい）
       glitch(0〜1)         画面がノイズで乱れる（曲名 the EmpErroR っぽく）
       sparks(x, y, {...})  火花が飛び散る
       shockRing(x, y, {...}) 輪が広がる
   ========================================================================= */

// ---- 曲の音量データ（song-data.js）を読む ----------------------------------
const ENV_ALPHA = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
const ENV_LUT = new Float32Array(128);
for (let i = 0; i < 64; i++) ENV_LUT[ENV_ALPHA.charCodeAt(i)] = i / 63;
// band: 0=低音 … 7=高音。t 秒での強さ 0〜1
function songEnv(band, t) {
  if (typeof SONG_ENV === 'undefined') return 0;
  const f = t * SONG_ENV.fps, i = Math.floor(f);
  if (i < 0 || i >= SONG_ENV.frames - 1) return 0;
  const s = SONG_ENV.bands[band];
  const a = ENV_LUT[s.charCodeAt(i)], b = ENV_LUT[s.charCodeAt(i + 1)];
  return a + (b - a) * (f - i);
}

// ---- 色の小道具 ---------------------------------------------------------
const rgbCache = {};
function rgb(hex) {
  if (Array.isArray(hex)) return hex;
  if (rgbCache[hex]) return rgbCache[hex];
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map(c => c + c).join('') : h, 16);
  return (rgbCache[hex] = [(n >> 16) & 255, (n >> 8) & 255, n & 255]);
}
const mixC = (a, b, k) => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
const rgba = (c, a) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${Math.max(0, Math.min(1, a)).toFixed(3)})`;
const clamp01 = v => Math.max(0, Math.min(1, v));
const lerp = (a, b, k) => a + (b - a) * k;
const easeOut = k => 1 - Math.pow(1 - clamp01(k), 3);

// 光のにじみ用の画像（色ごとに1回だけ作って使い回す）
const glowCache = {};
function glowSprite(c) {
  const key = c.join(',');
  if (glowCache[key]) return glowCache[key];
  const s = document.createElement('canvas');
  s.width = s.height = 64;
  const g = s.getContext('2d');
  const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, rgba(c, 0.9));
  gr.addColorStop(0.35, rgba(c, 0.35));
  gr.addColorStop(1, rgba(c, 0));
  g.fillStyle = gr;
  g.fillRect(0, 0, 64, 64);
  return (glowCache[key] = s);
}

// ---- 演出の状態 ---------------------------------------------------------
const fx = {
  particles: [],
  rings: [],        // 広がる輪（発射の瞬間・衝撃波など）
  bgRings: [],      // 背景で小節ごとに広がる輪
  ghosts: [],       // プレイヤーの残像
  ghostT: 0,
  shake: 0, punch: 0, glitch: 0, hurt: 0,
  banner: null,
  secIdx: -1,
  lastBar: -99,
  deathT: -1,
  clearT: -1, clearNext: 0,
  stars: null,
};

function fxReset() {
  fx.particles.length = 0; fx.rings.length = 0; fx.bgRings.length = 0; fx.ghosts.length = 0;
  fx.shake = fx.punch = fx.glitch = fx.hurt = 0;
  fx.banner = null; fx.secIdx = -1; fx.lastBar = -99;
  fx.deathT = -1; fx.clearT = -1;
}

// ---- 弾幕やエンジンから呼ぶ演出 ----------------------------------------
function shake(amount)  { fx.shake  = Math.max(fx.shake,  amount * fxScale); }
function punch(amount)  { fx.punch  = Math.max(fx.punch,  amount * fxScale); }
function glitch(amount) { fx.glitch = Math.max(fx.glitch, amount * fxScale); }

function sparks(x, y, { n = 16, color = '#ffffff', speed = 260, life = 0.6, size = 3, gravity = 300, spread = TAU, dir = 0 } = {}) {
  const c = rgb(color);
  for (let i = 0; i < n && fx.particles.length < 1200; i++) {
    const a = dir + (Math.random() - 0.5) * spread;
    const v = speed * (0.35 + Math.random() * 0.65);
    fx.particles.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: life * (0.6 + Math.random() * 0.4), max: life, size: size * (0.6 + Math.random() * 0.8), c, g: gravity });
  }
}
function shockRing(x, y, { color = '#ffffff', size = 120, life = 0.5, width = 4 } = {}) {
  if (fx.rings.length > 260) return;
  fx.rings.push({ x, y, r: 0, size, life, max: life, width, c: rgb(color) });
}

// エンジンからのフック -----------------------------------------------------
function fxFire(b) {                          // 警告が終わって弾が飛び出した瞬間
  shockRing(b.x, b.y, { color: bulletColor(b), size: b.r * 3.2, life: 0.28, width: 2 });
}
function fxJump() {
  const p = playerXY();
  sparks(p.x, player.y + player.h, { n: 8, color: '#cfd8ff', speed: 120, life: 0.35, size: 2.5, gravity: 200, dir: Math.PI / 2, spread: 2.4 });
}
function fxLand() {
  const p = playerXY();
  sparks(p.x - 6, player.y + player.h, { n: 5, color: '#cfd8ff', speed: 110, life: 0.3, size: 2.2, gravity: 0, dir: Math.PI, spread: 0.6 });
  sparks(p.x + 6, player.y + player.h, { n: 5, color: '#cfd8ff', speed: 110, life: 0.3, size: 2.2, gravity: 0, dir: 0, spread: 0.6 });
}
function fxHit() {
  const p = playerXY();
  sparks(p.x, p.y, { n: 36, color: '#ff4d6d', speed: 380, life: 0.7, size: 3.5 });
  sparks(p.x, p.y, { n: 14, color: '#ffffff', speed: 240, life: 0.4, size: 2.5 });
  shockRing(p.x, p.y, { color: '#ff4d6d', size: 110, life: 0.45, width: 5 });
  shake(16); punch(0.05); glitch(0.7);
  fx.hurt = 1;
}
function fxDeath() {
  const p = playerXY();
  sparks(p.x, p.y, { n: 90, color: '#ff4d6d', speed: 520, life: 1.2, size: 4 });
  sparks(p.x, p.y, { n: 40, color: '#ffffff', speed: 320, life: 0.9, size: 3 });
  shockRing(p.x, p.y, { color: '#ffffff', size: 320, life: 0.8, width: 8 });
  shake(26); punch(0.09); glitch(1);
  fx.deathT = 0;
}
function fxClear() { fx.clearT = 0; fx.clearNext = 0; flash(0.8); }

// ---- セクション（曲の場面）ごとの見た目 --------------------------------
const TITLE_LOOK = { name: '', sky: ['#160a33', '#05030d'], color: '#ff3ea5', shape: 6, pulse: 0.01, sway: 0, beams: true, stars: 40 };

function sectionIndex(t) {
  let i = 0;
  while (i + 1 < SECTIONS.length && SECTIONS[i + 1].t <= t) i++;
  return i;
}
// 前のセクションから 0.8秒かけて色などをなめらかに切りかえる
function lookAt(t) {
  if (scene === 'title') {
    return { skyTop: rgb(TITLE_LOOK.sky[0]), skyBot: rgb(TITLE_LOOK.sky[1]), color: rgb(TITLE_LOOK.color),
             shape: TITLE_LOOK.shape, pulse: TITLE_LOOK.pulse, sway: 0, beams: 1, stars: TITLE_LOOK.stars, zoom: 1 };
  }
  const i = sectionIndex(t), s = SECTIONS[i], p = SECTIONS[Math.max(0, i - 1)];
  const k = i === 0 ? 1 : clamp01((t - s.t) / 0.8);
  const next = i + 1 < SECTIONS.length ? SECTIONS[i + 1].t : SONG_END;
  const z = s.zoom ? lerp(s.zoom[0], s.zoom[1], clamp01((t - s.t) / (next - s.t))) : 1;
  return {
    skyTop: mixC(rgb(p.sky[0]), rgb(s.sky[0]), k),
    skyBot: mixC(rgb(p.sky[1]), rgb(s.sky[1]), k),
    color:  mixC(rgb(p.color), rgb(s.color), k),
    shape: s.shape || 0,
    pulse: lerp(p.pulse || 0, s.pulse || 0, k),
    sway:  lerp(p.sway || 0, s.sway || 0, k),
    beams: lerp(p.beams ? 1 : 0, s.beams ? 1 : 0, k),
    stars: lerp(p.stars || 30, s.stars || 30, k),
    zoom: z,
  };
}
let curLook = null;
function bulletColor(b) { return b.color ? rgb(b.color) : (curLook ? curLook.color : rgb('#ff4d6d')); }

// タイトル画面用の時計（音楽なしで 120 BPM を刻む）
const titleClock = () => performance.now() / 1000;
const titleBeat = () => titleClock() * 2;
const kickOf = pos => Math.exp(-(pos - Math.floor(pos)) * 5);

// =========================================================================
//  毎フレームの更新（時間で動く演出）
// =========================================================================
function updateFx(dt) {
  const T = scene === 'title' ? titleClock() : songTime;
  const look = lookAt(T);

  fx.shake *= Math.pow(0.002, dt);  if (fx.shake < 0.2) fx.shake = 0;
  fx.punch *= Math.pow(0.004, dt);  if (fx.punch < 0.001) fx.punch = 0;
  fx.glitch = Math.max(0, fx.glitch - dt * 2.2);
  fx.hurt   = Math.max(0, fx.hurt - dt * 1.6);
  if (flashT > 0) flashT = Math.max(0, flashT - dt * 2.5);

  // 星（奥ほどゆっくり流れる）
  if (!fx.stars) {
    fx.stars = Array.from({ length: 140 }, () => ({ x: Math.random() * W, y: Math.random() * H, z: 0.15 + Math.random() * 0.85, tw: Math.random() * TAU }));
  }
  const starV = look.stars * (1 + songEnv(0, T) * (scene === 'play' ? 1.5 : 0));
  for (const s of fx.stars) {
    s.y += starV * s.z * dt;
    if (s.y > H) { s.y -= H; s.x = Math.random() * W; }
  }

  if (scene === 'play') {
    // 小節の頭で背景に輪が広がる
    const bar = Math.floor(beatPos(T) / 4);
    if (bar !== fx.lastBar && T > 0.8) {
      fx.lastBar = bar;
      fx.bgRings.push({ r: 30, a: 0.45 });
    }
    // セクションが変わったらバナーを出す
    const si = sectionIndex(T);
    if (si !== fx.secIdx) {
      fx.secIdx = si;
      const s = SECTIONS[si];
      if (s.name) { fx.banner = { name: s.name, sub: s.sub || '', c: rgb(s.color), age: 0 }; glitch(0.45); }
    }
    // 弾のしっぽ（隕石の炎・花火の火花）
    for (const b of bullets) {
      if (b.delay > 0 || !b.fx) continue;
      if (b.fx === 'fire' && fx.particles.length < 1200) {
        fx.particles.push({ x: b.x + rand(-b.r, b.r) * 0.6, y: b.y - b.r * 0.4, vx: rand(-40, 40), vy: rand(-220, -80), life: 0.35, max: 0.35, size: rand(4, 9), c: rgb(Math.random() < 0.5 ? '#ffb347' : '#ff5e3a'), g: 0 });
      } else if (b.fx === 'spark' && Math.random() < 0.7) {
        sparks(b.x, b.y, { n: 1, color: '#ffe8a3', speed: 60, life: 0.4, size: 2, gravity: 120 });
      }
    }
    // 残像
    fx.ghostT += dt;
    if (fx.ghostT > 0.035) {
      fx.ghostT = 0;
      if (Math.abs(player.vx) > 60 || !player.onGround) fx.ghosts.push({ x: player.x, y: player.y, a: 0.45 });
    }
  }
  if (fx.banner) fx.banner.age += dt;
  for (const g of fx.ghosts) g.a -= dt * 2.2;
  fx.ghosts = fx.ghosts.filter(g => g.a > 0);

  for (const r of fx.bgRings) { r.r += 520 * dt; r.a -= dt * 0.45; }
  fx.bgRings = fx.bgRings.filter(r => r.a > 0);

  for (const p of fx.particles) {
    p.vy += p.g * dt;
    p.vx *= Math.pow(0.35, dt); p.vy *= Math.pow(0.6, dt);
    p.x += p.vx * dt; p.y += p.vy * dt;
    p.life -= dt;
  }
  fx.particles = fx.particles.filter(p => p.life > 0);

  for (const r of fx.rings) { r.life -= dt; r.r = r.size * easeOut(1 - r.life / r.max); }
  fx.rings = fx.rings.filter(r => r.life > 0);

  if (fx.deathT >= 0) fx.deathT += dt;

  // クリア: 花火が次々と上がる
  if (fx.clearT >= 0) {
    fx.clearT += dt;
    if (fx.clearT < 6 && fx.clearT >= fx.clearNext) {
      fx.clearNext += 0.3;
      const cols = ['#ff3ea5', '#4cc9f0', '#ffd166', '#2ef2b1', '#b388ff', '#ff7b3d'];
      const x = rand(80, W - 80), y = rand(90, H * 0.5), col = cols[(Math.random() * cols.length) | 0];
      sparks(x, y, { n: 50, color: col, speed: 330, life: 1.3, size: 3, gravity: 160 });
      shockRing(x, y, { color: col, size: 140, life: 0.6, width: 3 });
    }
  }
}

// =========================================================================
//  描画
// =========================================================================
let vignette = null, scanlines = null;
function makeStatic() {
  vignette = ctx.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, H * 0.85);
  vignette.addColorStop(0, 'rgba(0,0,0,0)');
  vignette.addColorStop(1, 'rgba(0,0,0,0.55)');
  const s = document.createElement('canvas');
  s.width = 4; s.height = 3;
  const g = s.getContext('2d');
  g.fillStyle = 'rgba(0,0,0,0.13)';
  g.fillRect(0, 0, 4, 1);
  scanlines = ctx.createPattern(s, 'repeat');
}

function drawScene() {
  if (!vignette) makeStatic();
  const T = scene === 'title' ? titleClock() : songTime;
  const look = curLook = lookAt(T);
  const bp = scene === 'title' ? titleBeat() : beatPos(T);
  const k = kickOf(bp);                          // 拍の頭で 1 → すぐ 0 に落ちる
  const bk = kickOf(bp / 4);                     // 小節の頭で 1

  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = 1;
  drawBackground(T, look, k, bk, bp);

  // ---- カメラ: 拍ごとのズーム・揺れ・ゆっくり回転 ----
  const zoom = look.zoom + look.pulse * k * fxScale + fx.punch;
  const rot = (look.sway * Math.PI / 180) * Math.sin(bp * Math.PI / 4) * fxScale;
  const sx = (Math.random() * 2 - 1) * fx.shake, sy = (Math.random() * 2 - 1) * fx.shake;
  ctx.save();
  ctx.translate(W / 2 + sx, H * 0.55 + sy);
  ctx.rotate(rot);
  ctx.scale(zoom, zoom);
  ctx.translate(-W / 2, -H * 0.55);

  drawStage(look, k, bp);
  if (scene === 'title') drawTitleOrbits(look, k, bp);
  else drawBullets(T, look, k);
  drawRings();
  drawParticles();
  drawHero(look, k);
  ctx.restore();

  drawScreenFx(T, look, k);
}

// ---- 背景 -----------------------------------------------------------------
function drawBackground(T, look, k, bk, bp) {
  const lowE = scene === 'title' ? 0.3 * k : songEnv(0, T);
  const boost = (lowE * 0.10 + k * 0.04) * (scene === 'play' ? 1 : 0.6);
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, rgba(mixC(look.skyTop, look.color, boost * 1.4), 1));
  g.addColorStop(1, rgba(mixC(look.skyBot, look.color, boost * 0.6), 1));
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  ctx.globalCompositeOperation = 'lighter';

  // 星（プレイヤーと逆向きに少しずれる = 奥行き）
  const par = (playerXY().x - W / 2) * -0.05;
  const hi = scene === 'title' ? 0.3 : songEnv(6, T);
  for (const s of fx.stars || []) {
    const a = 0.15 + 0.55 * s.z * (0.6 + 0.4 * Math.sin(s.tw + T * 3)) + hi * 0.3 * s.z;
    ctx.fillStyle = `rgba(220,230,255,${Math.min(1, a).toFixed(3)})`;
    const sz = 0.6 + s.z * 1.6;
    ctx.fillRect(((s.x + par * s.z) % W + W) % W, s.y, sz, sz);
  }

  // 光の柱（サビなど）: 地面から伸びて、小節に合わせて首をふる
  if (look.beams > 0.01) {
    for (let i = 0; i < 4; i++) {
      const bx = W * (0.14 + i * 0.24);
      const ang = -Math.PI / 2 + Math.sin(bp * Math.PI / 8 + i * 1.7) * 0.55;
      const len = 950, wdt = 0.09;
      const gr = ctx.createLinearGradient(bx, GROUND_Y, bx + Math.cos(ang) * len, GROUND_Y + Math.sin(ang) * len);
      gr.addColorStop(0, rgba(look.color, 0.16 * look.beams * (0.55 + 0.45 * k)));
      gr.addColorStop(1, rgba(look.color, 0));
      ctx.fillStyle = gr;
      ctx.beginPath();
      ctx.moveTo(bx, GROUND_Y);
      ctx.lineTo(bx + Math.cos(ang - wdt) * len, GROUND_Y + Math.sin(ang - wdt) * len);
      ctx.lineTo(bx + Math.cos(ang + wdt) * len, GROUND_Y + Math.sin(ang + wdt) * len);
      ctx.closePath();
      ctx.fill();
    }
  }

  // 大きな図形（セクションごとに角の数が変わる）がゆっくり回る
  if (look.shape >= 3) {
    const cx = W / 2, cy = H * 0.38;
    for (const [R, dir, a] of [[250, 1, 0.13], [165, -1.4, 0.10], [95, 2, 0.08]]) {
      const rad = R * (1 + 0.06 * bk + 0.03 * k);
      const rot = bp * 0.05 * dir;
      ctx.strokeStyle = rgba(look.color, a + 0.08 * k);
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let i = 0; i <= look.shape; i++) {
        const t = rot + (i / look.shape) * TAU - Math.PI / 2;
        const x = cx + Math.cos(t) * rad, y = cy + Math.sin(t) * rad;
        i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
      }
      ctx.stroke();
    }
  }

  // 小節ごとに広がる輪
  for (const r of fx.bgRings) {
    ctx.strokeStyle = rgba(look.color, r.a * 0.5);
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(W / 2, H * 0.38, r.r, 0, TAU);
    ctx.stroke();
  }

  // イコライザー（曲の音量で伸び縮み。低音がまん中）
  const nb = 32, bw = W / nb;
  for (let i = 0; i < nb; i++) {
    const d = Math.abs(i - (nb - 1) / 2) / (nb / 2);        // 0 = まん中, 1 = はし
    const band = Math.min(7, Math.floor(d * 8));
    const e = scene === 'title'
      ? 0.25 + 0.25 * Math.sin(T * 3 + i * 0.7) * Math.sin(T * 1.3 + i) + 0.35 * k * (1 - d)
      : songEnv(band, T);
    const h = 14 + e * 170;
    ctx.fillStyle = rgba(look.color, 0.07 + e * 0.08);
    ctx.fillRect(i * bw + 3, GROUND_Y - h, bw - 6, h);
    ctx.fillStyle = rgba(look.color, 0.25 + e * 0.3);
    ctx.fillRect(i * bw + 3, GROUND_Y - h - 3, bw - 6, 2);
  }
  ctx.globalCompositeOperation = 'source-over';
}

// ---- 地面と足場 ----------------------------------------------------------
function drawStage(look, k, bp) {
  // 地面（回転しても角が見えないよう広めに塗る）
  const g = ctx.createLinearGradient(0, GROUND_Y, 0, H + 200);
  g.addColorStop(0, rgba(mixC(look.skyBot, [0, 0, 0], 0.4), 1));
  g.addColorStop(1, '#000');
  ctx.fillStyle = g;
  ctx.fillRect(-400, GROUND_Y, W + 800, H - GROUND_Y + 400);

  // 奥へ流れていくグリッド（拍に合わせて手前へ進む）
  ctx.save();
  ctx.beginPath();
  ctx.rect(-400, GROUND_Y, W + 800, H - GROUND_Y + 400);
  ctx.clip();
  ctx.strokeStyle = rgba(look.color, 0.22);
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let i = -16; i <= 16; i++) {
    ctx.moveTo(W / 2 + i * 22, GROUND_Y);
    ctx.lineTo(W / 2 + i * 130, H + 60);
  }
  ctx.stroke();
  const f = bp - Math.floor(bp);
  for (let j = 0; j < 6; j++) {
    const p = (j + f) / 6;
    const y = GROUND_Y + (H + 60 - GROUND_Y) * p * p;
    ctx.strokeStyle = rgba(look.color, 0.08 + 0.3 * p);
    ctx.beginPath(); ctx.moveTo(-400, y); ctx.lineTo(W + 400, y); ctx.stroke();
  }
  ctx.restore();

  // 地面のふちのネオン
  ctx.globalCompositeOperation = 'lighter';
  ctx.strokeStyle = rgba(look.color, 0.18 + 0.2 * k);
  ctx.lineWidth = 10;
  ctx.beginPath(); ctx.moveTo(-400, GROUND_Y); ctx.lineTo(W + 400, GROUND_Y); ctx.stroke();
  ctx.globalCompositeOperation = 'source-over';
  ctx.strokeStyle = rgba(mixC(look.color, [255, 255, 255], 0.5), 0.95);
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(-400, GROUND_Y + 1); ctx.lineTo(W + 400, GROUND_Y + 1); ctx.stroke();

  // 浮いている足場
  for (const p of platforms) {
    if (p.ground) continue;
    roundRect(p.x, p.y, p.w, p.h, 5);
    ctx.fillStyle = 'rgba(8,10,24,0.85)';
    ctx.fill();
    ctx.strokeStyle = rgba(look.color, 0.55 + 0.3 * k);
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.globalCompositeOperation = 'lighter';
    const gl = ctx.createLinearGradient(0, p.y + p.h, 0, p.y + p.h + 40);
    gl.addColorStop(0, rgba(look.color, 0.18 + 0.15 * k));
    gl.addColorStop(1, rgba(look.color, 0));
    ctx.fillStyle = gl;
    ctx.fillRect(p.x + 6, p.y + p.h, p.w - 12, 40);
    ctx.fillStyle = rgba([255, 255, 255], 0.55 + 0.35 * k);
    ctx.fillRect(p.x + 5, p.y + 1, p.w - 10, 2);
    ctx.globalCompositeOperation = 'source-over';
  }
}

// ---- 弾 --------------------------------------------------------------------
function drawBullets(T, look, k) {
  // 警告（溜め中）: 回転する3本の弧 ＋ だんだん満ちる中身 ＋ 進む向きのガイド線
  for (const b of bullets) {
    if (b.delay <= 0) continue;
    const c = bulletColor(b);
    const p = b.delayMax > 0 ? 1 - b.delay / b.delayMax : 1;
    if (b.lane) {
      const [dx, dy] = b.lane;
      const len = 1400;
      const gr = ctx.createLinearGradient(b.x, b.y, b.x + dx * len, b.y + dy * len);
      gr.addColorStop(0, rgba(c, 0.10 + 0.22 * p));
      gr.addColorStop(1, rgba(c, 0));
      ctx.strokeStyle = gr;
      ctx.lineWidth = b.r * 2 * (0.3 + 0.7 * p);
      ctx.beginPath(); ctx.moveTo(b.x, b.y); ctx.lineTo(b.x + dx * len, b.y + dy * len); ctx.stroke();
    }
    const R = b.r * (1.3 + 0.15 * k) + 3 * (1 - p);
    const rot = T * 5 + b.x * 0.013;
    ctx.strokeStyle = rgba(c, 0.35 + 0.5 * p);
    ctx.lineWidth = 2;
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.arc(b.x, b.y, R, rot + i * TAU / 3, rot + i * TAU / 3 + TAU / 6);
      ctx.stroke();
    }
    ctx.fillStyle = rgba(c, 0.12 + 0.3 * p);
    ctx.beginPath(); ctx.arc(b.x, b.y, b.r * p, 0, TAU); ctx.fill();
  }

  // 光のにじみ ＋ しっぽ（加算合成で明るく）
  ctx.globalCompositeOperation = 'lighter';
  ctx.lineCap = 'round';
  for (const b of bullets) {
    if (b.delay > 0) continue;
    const c = bulletColor(b);
    if (b.px != null) {
      const dx = b.x - b.px, dy = b.y - b.py;
      if (dx * dx + dy * dy > 3) {
        ctx.strokeStyle = rgba(c, 0.28);
        ctx.lineWidth = b.r * 1.2;
        ctx.beginPath(); ctx.moveTo(b.x, b.y); ctx.lineTo(b.x - dx * 5, b.y - dy * 5); ctx.stroke();
      }
    }
    const R = b.r * (2.5 + 0.9 * k);
    ctx.drawImage(glowSprite(c), b.x - R, b.y - R, R * 2, R * 2);
  }
  ctx.globalCompositeOperation = 'source-over';

  // 本体: 色つきの円 ＋ 白い芯（当たり判定は色つきの円と同じ大きさ）
  for (const b of bullets) {
    if (b.delay > 0) continue;
    const c = bulletColor(b);
    ctx.fillStyle = rgba(c, 1);
    ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.92)';
    ctx.beginPath(); ctx.arc(b.x, b.y, b.r * 0.58, 0, TAU); ctx.fill();
  }
}

function drawRings() {
  ctx.globalCompositeOperation = 'lighter';
  for (const r of fx.rings) {
    const a = r.life / r.max;
    ctx.strokeStyle = rgba(r.c, a * 0.9);
    ctx.lineWidth = r.width * a + 0.5;
    ctx.beginPath(); ctx.arc(r.x, r.y, Math.max(0.1, r.r), 0, TAU); ctx.stroke();
  }
  ctx.globalCompositeOperation = 'source-over';
}

function drawParticles() {
  ctx.globalCompositeOperation = 'lighter';
  for (const p of fx.particles) {
    const a = p.life / p.max;
    const s = p.size * (0.4 + 0.6 * a);
    ctx.fillStyle = rgba(p.c, a);
    ctx.fillRect(p.x - s / 2, p.y - s / 2, s, s);
  }
  ctx.globalCompositeOperation = 'source-over';
}

// ---- タイトル画面: 回る光の輪 ------------------------------------------
function drawTitleOrbits(look, k, bp) {
  const cx = W / 2, cy = H * 0.38;
  const cols = [rgb('#ff3ea5'), rgb('#4cc9f0'), rgb('#ffd166')];
  ctx.globalCompositeOperation = 'lighter';
  [[110, 10, 0.5], [180, 16, -0.32], [255, 22, 0.2]].forEach(([R, n, sp], ri) => {
    const rad = R * (1 + 0.07 * k);
    for (let i = 0; i < n; i++) {
      const a = bp * sp * 0.5 + (i / n) * TAU;
      const x = cx + Math.cos(a) * rad, y = cy + Math.sin(a) * rad;
      const r = 5 + ri;
      const G = r * (2.6 + k);
      ctx.drawImage(glowSprite(cols[ri]), x - G, y - G, G * 2, G * 2);
    }
  });
  ctx.globalCompositeOperation = 'source-over';
  [[110, 10, 0.5], [180, 16, -0.32], [255, 22, 0.2]].forEach(([R, n, sp], ri) => {
    const rad = R * (1 + 0.07 * k);
    for (let i = 0; i < n; i++) {
      const a = bp * sp * 0.5 + (i / n) * TAU;
      const x = cx + Math.cos(a) * rad, y = cy + Math.sin(a) * rad;
      const r = 5 + ri;
      ctx.fillStyle = rgba(cols[ri], 1);
      ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      ctx.beginPath(); ctx.arc(x, y, r * 0.55, 0, TAU); ctx.fill();
    }
  });
}

// ---- 主人公 ----------------------------------------------------------------
function drawHero(look, k) {
  if (scene === 'over' && fx.deathT > 0.05) return;         // やられたら消える

  // 残像
  for (const g of fx.ghosts) {
    roundRect(g.x, g.y, player.w, player.h, 5);
    ctx.fillStyle = rgba(look.color, g.a * 0.45);
    ctx.fill();
  }
  // やわらかい光
  const p = playerXY();
  ctx.globalCompositeOperation = 'lighter';
  const G = 30 + 6 * k;
  ctx.globalAlpha = 0.45;
  ctx.drawImage(glowSprite(rgb('#7fb4ff')), p.x - G, p.y - G, G * 2, G * 2);
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';

  // 無敵中は点滅
  if (invuln > 0 && Math.floor(invuln * 12) % 2 === 0) return;

  // タイトル画面では拍に合わせて小さく跳ねる
  const bob = scene === 'title' ? -Math.abs(Math.sin(titleBeat() * Math.PI)) * 6 : 0;

  const s = player.squash;
  const sx = 1 - s * 0.18, sy = 1 + s * 0.18;
  const cx = player.x + player.w / 2;
  const baseY = player.y + player.h + bob;
  const w = player.w * sx, h = player.h * sy;
  const x = cx - w / 2, y = baseY - h;

  ctx.save();
  if (player.onGround) {
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath();
    ctx.ellipse(cx, player.y + player.h + 2, w * 0.55, 4, 0, 0, TAU);
    ctx.fill();
  }
  const f = player.facing;
  const bodyTop = y + h * 0.45;
  roundRect(x, bodyTop, w, h - (bodyTop - y), 5);
  ctx.fillStyle = '#3b6cf0'; ctx.fill();
  roundRect(x + w * 0.08, y + h * 0.06, w * 0.84, h * 0.46, 6);
  ctx.fillStyle = '#f4c9a0'; ctx.fill();
  roundRect(x + w * 0.02, y, w * 0.96, h * 0.20, 5);
  ctx.fillStyle = '#e24b4a'; ctx.fill();
  ctx.fillStyle = '#c43a39';
  ctx.beginPath();
  if (f >= 0) ctx.rect(x + w * 0.55, y + h * 0.16, w * 0.55, h * 0.06);
  else        ctx.rect(x - w * 0.10, y + h * 0.16, w * 0.55, h * 0.06);
  ctx.fill();
  ctx.fillStyle = '#222a3a';
  const eyeY = y + h * 0.30, eyeR = Math.max(1.6, w * 0.07), ex = cx + f * w * 0.10;
  ctx.beginPath(); ctx.arc(ex - w * 0.12, eyeY, eyeR, 0, TAU); ctx.fill();
  ctx.beginPath(); ctx.arc(ex + w * 0.12, eyeY, eyeR, 0, TAU); ctx.fill();
  ctx.fillStyle = '#5a3a22';
  const footW = w * 0.34, footH = h * 0.10, footY = baseY - footH;
  const moving = player.onGround && Math.abs(player.vx) > 20;
  const wob = moving ? Math.sin(elapsed * 18) * 2 : 0;
  roundRect(x + w * 0.06, footY - wob, footW, footH, 3); ctx.fill();
  roundRect(x + w * 0.60, footY + wob, footW, footH, 3); ctx.fill();
  ctx.restore();
}

// ---- 画面全体にかける演出（カメラの外）-------------------------------------
function drawScreenFx(T, look, k) {
  // ノイズ（グリッチ）: 横長の帯をずらす ＋ 色のにじみ
  if (fx.glitch > 0.02) {
    const n = 2 + Math.floor(fx.glitch * 9);
    for (let i = 0; i < n; i++) {
      const y = Math.random() * H, h = 4 + Math.random() * 26;
      const dx = (Math.random() * 2 - 1) * 40 * fx.glitch;
      ctx.drawImage(cv, 0, y, W, h, dx, y, W, h);
    }
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < n; i++) {
      ctx.fillStyle = Math.random() < 0.5 ? `rgba(0,255,255,${0.10 * fx.glitch})` : `rgba(255,0,170,${0.10 * fx.glitch})`;
      ctx.fillRect(0, Math.random() * H, W, 2 + Math.random() * 6);
    }
    ctx.globalCompositeOperation = 'source-over';
  }

  // やられた: 色が抜けて暗くなる
  if (fx.deathT >= 0) {
    const a = clamp01(fx.deathT / 0.8);
    ctx.globalCompositeOperation = 'saturation';
    ctx.fillStyle = `rgba(0,0,0,${a.toFixed(3)})`;
    ctx.fillRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = `rgba(0,0,0,${(0.3 * a).toFixed(3)})`;
    ctx.fillRect(0, 0, W, H);
  }

  if (flashT > 0) {
    ctx.fillStyle = `rgba(255,255,255,${(0.4 * flashT).toFixed(3)})`;
    ctx.fillRect(0, 0, W, H);
  }
  if (fx.hurt > 0) {
    const g = ctx.createRadialGradient(W / 2, H / 2, H * 0.25, W / 2, H / 2, H * 0.8);
    g.addColorStop(0, 'rgba(255,0,60,0)');
    g.addColorStop(1, `rgba(255,0,60,${(0.55 * fx.hurt).toFixed(3)})`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  }

  ctx.fillStyle = vignette; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = scanlines; ctx.fillRect(0, 0, W, H);

  if (scene !== 'title') { drawProgress(T, look, k); drawBanner(); }
}

// 上のふちの進みぐあいバー（セクションの区切り付き）
function drawProgress(T, look, k) {
  const p = clamp01(T / SONG_END);
  ctx.fillStyle = 'rgba(255,255,255,0.08)';
  ctx.fillRect(0, 0, W, 4);
  const g = ctx.createLinearGradient(0, 0, W * p, 0);
  g.addColorStop(0, rgba(look.color, 0.3));
  g.addColorStop(1, rgba(mixC(look.color, [255, 255, 255], 0.4), 1));
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W * p, 4);
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  for (const s of SECTIONS) if (s.t > 0) ctx.fillRect(W * s.t / SONG_END - 1, 0, 2, 7);
  ctx.globalCompositeOperation = 'lighter';
  const G = 10 + 8 * k;
  ctx.drawImage(glowSprite(look.color), W * p - G, 2 - G, G * 2, G * 2);
  ctx.globalCompositeOperation = 'source-over';
}

// セクション名のバナー（すべり込んで、少し止まって、消える）
function drawBanner() {
  const bn = fx.banner;
  if (!bn) return;
  const e = bn.age, DUR = 2.4;
  if (e > DUR) { fx.banner = null; return; }
  const a = e < 0.2 ? e / 0.2 : e > DUR - 0.5 ? (DUR - e) / 0.5 : 1;
  const y = 118;
  const open = easeOut(e / 0.45);

  ctx.save();
  ctx.globalAlpha = clamp01(a);
  const g = ctx.createLinearGradient(0, 0, W, 0);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(0.5, 'rgba(0,0,0,0.45)');
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, y - 40, W, 80);
  ctx.fillStyle = rgba(bn.c, 0.9);
  ctx.fillRect(W / 2 - (W / 2) * open, y - 40, W * open, 2);
  ctx.fillRect(W / 2 - (W / 2) * open, y + 38, W * open, 2);

  const slide = (1 - easeOut(e / 0.35)) * 90;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = '900 42px "Segoe UI", system-ui, sans-serif';
  if ('letterSpacing' in ctx) ctx.letterSpacing = '10px';
  if (e < 0.45) {                                              // 出だしは色がずれる
    const j = (0.45 - e) * 26;
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = 'rgba(0,255,255,0.7)';  ctx.fillText(bn.name, W / 2 - slide - j, y - 6);
    ctx.fillStyle = 'rgba(255,0,170,0.7)';  ctx.fillText(bn.name, W / 2 - slide + j, y - 6);
    ctx.globalCompositeOperation = 'source-over';
  }
  ctx.fillStyle = '#fff';
  ctx.shadowColor = rgba(bn.c, 1);
  ctx.shadowBlur = 18;
  ctx.fillText(bn.name, W / 2 - slide, y - 6);
  ctx.shadowBlur = 0;
  if ('letterSpacing' in ctx) ctx.letterSpacing = '2px';
  ctx.font = '700 15px system-ui, sans-serif';
  ctx.fillStyle = rgba(mixC(bn.c, [255, 255, 255], 0.35), 1);
  ctx.fillText(bn.sub, W / 2 + slide * 0.5, y + 24);
  if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';
  ctx.restore();
}
