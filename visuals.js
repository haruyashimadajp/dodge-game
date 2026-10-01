"use strict";

/* =========================================================================
   VISUALS  —  見た目の演出だけを担当するファイル
   背景・カメラ（ゆれ / ズーム / 回転）・パーティクル・弾とキャラの描画・
   セクション名のバナー・タイトル画面のアニメーション。
   当たり判定やゲームの進行には一切影響しません（game.js のあとに読み込む）。

   曲ごとに「見た目のセット」（song.theme）があり、描き方を切りかえる:
       neon  … the EmpErroR: ネオンの図形・光の柱・丸い弾・白い光
       cyber … Re:Unknown X: 文字の雨・巨大な X・四角い弾・レーザー・色の反転

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
// band: 0=低音 … 7=高音。t 秒での強さ 0〜1（選んでいる曲のデータ）
function songEnv(band, t) {
  const env = song && song.env;
  if (!env) return 0;
  const f = t * env.fps, i = Math.floor(f);
  if (i < 0 || i >= env.frames - 1) return 0;
  const s = env.bands[band];
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
  blips: [],        // ブリンク弾が消えた跡（四角）
  tiles: [],        // 背景で光るマス目（cyber）
  lastBeat: -99,
  rain: null,       // 文字の雨（cyber）
};
const cyber = () => song && song.theme === 'cyber';

function fxReset() {
  fx.particles.length = 0; fx.rings.length = 0; fx.bgRings.length = 0; fx.ghosts.length = 0;
  fx.blips.length = 0; fx.tiles.length = 0; fx.lastBeat = -99;
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
  if (b.kind === 'laser') {                   // ビーム: 両はしで火花、画面が少しゆれる
    const c = bulletColor(b);
    for (const [x, y] of [[b.x1, b.y1], [b.x2, b.y2], [b.x, b.y]]) {
      if (x > -20 && x < W + 20 && y > -20 && y < H + 20) sparks(x, y, { n: 10, color: c, speed: 260, life: 0.4, size: 3, gravity: 0 });
    }
    shake(b.r > 20 ? 6 : 4); glitch(0.12);
    return;
  }
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
function fxSongChange() { flash(0.6); glitch(0.6); }   // タイトルで曲を切りかえた
// ブリンク弾が瞬間移動した: 元の場所に四角い跡が残る
function blip(x, y, b) {
  if (fx.blips.length < 300) fx.blips.push({ x, y, r: b.r, c: bulletColor(b), a: 1 });
}

// ---- セクション（曲の場面）ごとの見た目 --------------------------------
// タイトル画面の見た目は、選んでいる曲の titleLook（songs/*.js）

function sectionIndex(t) {
  let i = 0;
  while (i + 1 < SECTIONS.length && SECTIONS[i + 1].t <= t) i++;
  return i;
}
// 前のセクションから 0.8秒かけて色などをなめらかに切りかえる
function lookAt(t) {
  if (scene === 'title') {
    const L = song.titleLook;
    return { skyTop: rgb(L.sky[0]), skyBot: rgb(L.sky[1]), color: rgb(L.color),
             shape: L.shape || 0, pulse: L.pulse || 0, sway: 0, beams: L.beams ? 1 : 0, stars: L.stars || 30, zoom: 1,
             rain: L.rain || 0, emblem: L.emblem || 0, snap: 0, tiles: L.tiles ? 1 : 0, noise: L.noise || 0 };
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
    rain:   lerp(p.rain || 0, s.rain || 0, k),
    emblem: lerp(p.emblem || 0, s.emblem || 0, k),
    snap:   lerp(p.snap || 0, s.snap || 0, k),
    tiles:  lerp(p.tiles ? 1 : 0, s.tiles ? 1 : 0, k),
    noise:  lerp(p.noise || 0, s.noise || 0, k),
  };
}
let curLook = null;
function bulletColor(b) { return b.color ? rgb(b.color) : (curLook ? curLook.color : rgb('#ff4d6d')); }

// タイトル画面用の時計（音楽なしで曲の BPM を刻む）
const titleClock = () => performance.now() / 1000;
const titleBeat = () => titleClock() * (song.titleBpm || song.bpm) / 60;
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

  if (cyber()) updateCyber(dt, T, look);

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

  for (const b of fx.blips) b.a -= dt * 3.5;
  fx.blips = fx.blips.filter(b => b.a > 0);

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
      const cols = cyber() ? ['#39ff88', '#00e5ff', '#ff2a6d', '#ffe14d', '#ffffff']
                           : ['#ff3ea5', '#4cc9f0', '#ffd166', '#2ef2b1', '#b388ff', '#ff7b3d'];
      const x = rand(80, W - 80), y = rand(90, H * 0.5), col = cols[(Math.random() * cols.length) | 0];
      sparks(x, y, { n: 50, color: col, speed: 330, life: 1.3, size: 3, gravity: 160 });
      shockRing(x, y, { color: col, size: 140, life: 0.6, width: 3 });
    }
  }
}

// cyber: 文字の雨と、拍で光るマス目を進める
const GLYPH_CHARS = '0123456789ABCDEFｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉX?';
const RAIN_COLS = 30, RAIN_STEP = 18;
function updateCyber(dt, T, look) {
  if (!fx.rain) {
    fx.rain = Array.from({ length: RAIN_COLS }, (_, i) => ({
      x: (i + 0.5) * (W / RAIN_COLS), y: Math.random() * H, v: 0.5 + Math.random(), len: 4 + (Math.random() * 8 | 0),
      g: Array.from({ length: 16 }, () => Math.random() * GLYPH_CHARS.length | 0),
    }));
  }
  const hi = scene === 'title' ? 0.4 : songEnv(5, T);
  for (const c of fx.rain) {
    c.y += look.rain * (90 + 160 * hi) * c.v * dt;
    if (c.y - c.len * RAIN_STEP > H) { c.y = -Math.random() * 120; c.v = 0.5 + Math.random(); c.len = 4 + (Math.random() * 8 | 0); }
    if (Math.random() < dt * 6) c.g[Math.random() * 16 | 0] = Math.random() * GLYPH_CHARS.length | 0;   // 文字がちらちら変わる
  }
  const b = Math.floor(scene === 'title' ? titleBeat() : beatPos(T));
  if (b !== fx.lastBeat) {
    fx.lastBeat = b;
    const n = look.tiles > 0.5 ? 5 + Math.round(songEnv(0, T) * 8) : 0;
    for (let i = 0; i < n; i++) fx.tiles.push({ i: Math.random() * 20 | 0, j: Math.random() * 15 | 0, a: 1 });
  }
  for (const t of fx.tiles) t.a -= dt * 2.8;
  fx.tiles = fx.tiles.filter(t => t.a > 0);
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
  if (cyber()) drawCyberBackground(T, look, k, bk, bp);
  else drawBackground(T, look, k, bk, bp);

  // ---- カメラ: 拍ごとのズーム・揺れ・ゆっくり回転 ----
  // cyber は、なめらかに揺れるかわりに2拍ごとに左右へ「カクッ」と傾く
  const zoom = look.zoom + look.pulse * k * fxScale + fx.punch;
  let rot = (look.sway * Math.PI / 180) * Math.sin(bp * Math.PI / 4) * fxScale;
  if (look.snap > 0) {
    const half = bp / 2, sgn = Math.floor(half) % 2 ? 1 : -1;
    rot = (look.snap * Math.PI / 180) * sgn * (2 * easeOut((half - Math.floor(half)) * 7) - 1) * fxScale;
  }
  const sx = (Math.random() * 2 - 1) * fx.shake, sy = (Math.random() * 2 - 1) * fx.shake;
  ctx.save();
  ctx.translate(W / 2 + sx, H * 0.55 + sy);
  ctx.rotate(rot);
  ctx.scale(zoom, zoom);
  ctx.translate(-W / 2, -H * 0.55);

  drawStage(look, k, bp);
  if (scene === 'title') (cyber() ? drawTitleX : drawTitleOrbits)(look, k, bp);
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

// ---- 背景（cyber: Re:Unknown X）----------------------------------------------
// 文字の雨 → 拍で光るマス目 → 真ん中の巨大な X ＋ まわりの円形イコライザー ＋ 回る四角
// 文字の絵を1枚にまとめておく（色ごとに1回だけ作る。色は少し丸めて数を減らす）
const glyphAtlases = {};
function glyphAtlas(c) {
  const q = c.map(v => Math.min(255, Math.round(v / 24) * 24));
  const key = q.join(',');
  if (glyphAtlases[key]) return glyphAtlases[key];
  const a = document.createElement('canvas');
  a.width = GLYPH_CHARS.length * 16; a.height = 18;
  const g = a.getContext('2d');
  g.fillStyle = rgba(q, 1);
  g.font = '700 15px ui-monospace, "Menlo", "Consolas", monospace';
  g.textAlign = 'center'; g.textBaseline = 'middle';
  [...GLYPH_CHARS].forEach((ch, i) => g.fillText(ch, i * 16 + 8, 9));
  return (glyphAtlases[key] = a);
}

function drawCyberBackground(T, look, k, bk, bp) {
  const play = scene === 'play';
  const lowE = play ? songEnv(0, T) : 0.3 * k;
  const boost = lowE * 0.08 + k * 0.05;
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, rgba(mixC(look.skyTop, look.color, boost), 1));
  g.addColorStop(1, rgba(mixC(look.skyBot, look.color, boost * 0.5), 1));
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  // 文字の雨（先頭の文字がいちばん明るく、うしろほど消えていく）
  if (fx.rain && look.rain > 0.01) {
    const atlas = glyphAtlas(mixC(look.color, [255, 255, 255], 0.15));
    const base = Math.min(1, 0.22 + 0.25 * look.rain / 2 + 0.15 * k);
    for (const c of fx.rain) {
      for (let j = 0; j < c.len; j++) {
        const y = c.y - j * RAIN_STEP;
        if (y < -RAIN_STEP || y > GROUND_Y) continue;
        ctx.globalAlpha = base * (j === 0 ? 0.95 : 0.5 * (1 - j / c.len));
        ctx.drawImage(atlas, c.g[j % 16] * 16, 0, 16, 18, c.x - 8, y - 9, 16, 18);
      }
    }
    ctx.globalAlpha = 1;
  }

  ctx.globalCompositeOperation = 'lighter';

  // マス目: 拍ごとにいくつかのマスがパッと光る
  const cw = W / 20, ch = GROUND_Y / 15;
  for (const t of fx.tiles) {
    ctx.fillStyle = rgba(look.color, 0.10 * t.a * look.tiles);
    ctx.fillRect(t.i * cw + 1, t.j * ch + 1, cw - 2, ch - 2);
  }
  ctx.strokeStyle = rgba(look.color, 0.035 + 0.03 * k);
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let i = 1; i < 20; i++) { ctx.moveTo(i * cw, 0); ctx.lineTo(i * cw, GROUND_Y); }
  for (let j = 1; j < 15; j++) { ctx.moveTo(0, j * ch); ctx.lineTo(W, j * ch); }
  ctx.stroke();

  // 真ん中の巨大な X（小節ごとにカクッと 90° 回る）
  const cx = W / 2, cy = H * 0.38;
  const em = look.emblem;
  if (em > 0.01) {
    const barPos = bp / 4, nb = Math.floor(barPos);
    const ang = Math.PI / 4 + (nb + easeOut((barPos - nb) * 5)) * (Math.PI / 2);
    const len = 230 * (1 + 0.06 * bk + 0.04 * k);
    const off = fx.glitch * 14;                                 // ノイズのときは色がずれる
    for (const [dx, col, a] of [[-off, [255, 40, 110], 0.5], [off, [0, 229, 255], 0.5], [0, look.color, 1]]) {
      if (a < 1 && off < 0.5) continue;
      ctx.beginPath();                                          // X の2本をまとめて1回で
      for (const s of [0, 1]) {
        const t = ang + s * Math.PI / 2;
        const ex = Math.cos(t) * len, ey = Math.sin(t) * len;
        ctx.moveTo(cx - ex + dx, cy - ey); ctx.lineTo(cx + ex + dx, cy + ey);
      }
      ctx.strokeStyle = rgba(col, em * a * (0.08 + 0.06 * k));
      ctx.lineWidth = 34;
      ctx.stroke();
      ctx.strokeStyle = rgba(col, em * a * (0.16 + 0.14 * k));
      ctx.lineWidth = 12;
      ctx.stroke();
    }
    // 円形のイコライザー（曲の音量。上下左右対称）。まとめて1回で描く
    const nBars = 48;
    ctx.strokeStyle = rgba(look.color, em * (0.3 + 0.15 * k));
    ctx.lineWidth = 5;
    ctx.beginPath();
    for (let i = 0; i < nBars; i++) {
      const a = (i / nBars) * TAU - Math.PI / 2;
      const d = Math.abs(((i / nBars) * 4) % 2 - 1);             // 0〜1 を4回くりかえす
      const e = play ? songEnv(Math.min(7, Math.floor(d * 8)), T) : 0.3 + 0.3 * Math.sin(T * 4 + i);
      const r0 = 150 + 10 * k, r1 = r0 + 8 + e * 70;
      ctx.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0); ctx.lineTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1);
    }
    ctx.stroke();
    // 照準のような四角（逆向きに回る・点線）
    ctx.setLineDash([14, 10]);
    for (const [R, dir] of [[300, 1], [118, -1.6]]) {
      const rr = R * (1 + 0.05 * bk);
      const rot = bp * 0.06 * dir;
      ctx.strokeStyle = rgba(look.color, em * (0.12 + 0.1 * k));
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let i = 0; i <= 4; i++) {
        const t = rot + i * Math.PI / 2;
        const x = cx + Math.cos(t) * rr, y = cy + Math.sin(t) * rr;
        i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
      }
      ctx.stroke();
    }
    ctx.setLineDash([]);
  }

  // 小節ごとに広がる四角
  for (const r of fx.bgRings) {
    ctx.strokeStyle = rgba(look.color, r.a * 0.4);
    ctx.lineWidth = 3;
    ctx.strokeRect(cx - r.r, cy - r.r, r.r * 2, r.r * 2);
  }
  ctx.globalCompositeOperation = 'source-over';

  // 隅の小さな文字（それっぽいデータ表示。拍ごとに変わる）
  ctx.font = '600 11px ui-monospace, "Menlo", "Consolas", monospace';
  ctx.textAlign = 'left'; ctx.textBaseline = 'top';
  ctx.fillStyle = rgba(look.color, 0.45);
  const n = Math.floor(bp) >>> 0;
  const hex = v => ('000' + ((v * 2654435761) >>> 0).toString(16).toUpperCase()).slice(-4);
  ctx.fillText('0x' + hex(n) + ' ' + hex(n + 7), 14, 16);
  ctx.fillText('SIG ' + (play ? (songEnv(0, T) * 99 | 0) : 42) + '%', 14, 30);
  ctx.textAlign = 'right';
  const rx = scene === 'play' ? W - 72 : W - 14;          // 遊んでいる間は右上の一時停止ボタンをよける
  ctx.fillText('UNKNOWN_X', rx, 16);
  ctx.fillText('BEAT ' + String(Math.max(0, n)).padStart(4, '0'), rx, 30);
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
  if (cyber()) ctx.setLineDash([3, 5]);                 // cyber: 点線の回路
  ctx.beginPath();
  for (let i = -16; i <= 16; i++) {
    ctx.moveTo(W / 2 + i * 22, GROUND_Y);
    ctx.lineTo(W / 2 + i * 130, H + 60);
  }
  ctx.stroke();
  ctx.setLineDash([]);
  if (cyber()) {                                         // 回路を手前へ走る光（データ）
    ctx.globalCompositeOperation = 'lighter';
    for (let i = -16; i <= 16; i++) {
      const q = ((bp * 0.5 + ((i * 7919) % 13) / 13) % 1 + 1) % 1, qq = q * q;
      const x = W / 2 + i * (22 + 108 * qq), y = GROUND_Y + (H + 60 - GROUND_Y) * qq;
      ctx.fillStyle = rgba(mixC(look.color, [255, 255, 255], 0.4), 0.7 * (1 - q) + 0.2);
      ctx.fillRect(x - 2, y - 2, 4 + 3 * qq, 4 + 3 * qq);
    }
    ctx.globalCompositeOperation = 'source-over';
  }
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
    if (cyber()) { drawCyberPlatform(p, look, k); continue; }
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

// cyber の足場: 角ばった板 ＋ 四すみのカギかっこ
function drawCyberPlatform(p, look, k) {
  ctx.fillStyle = 'rgba(2,10,8,0.88)';
  ctx.fillRect(p.x, p.y, p.w, p.h);
  ctx.strokeStyle = rgba(look.color, 0.5 + 0.3 * k);
  ctx.lineWidth = 1.5;
  ctx.strokeRect(p.x + 0.5, p.y + 0.5, p.w - 1, p.h - 1);
  const L = 10, o = 4;
  ctx.strokeStyle = rgba(mixC(look.color, [255, 255, 255], 0.5), 0.9);
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (const [x, y, sx, sy] of [[p.x - o, p.y - o, 1, 1], [p.x + p.w + o, p.y - o, -1, 1], [p.x - o, p.y + p.h + o, 1, -1], [p.x + p.w + o, p.y + p.h + o, -1, -1]]) {
    ctx.moveTo(x + sx * L, y); ctx.lineTo(x, y); ctx.lineTo(x, y + sy * L);
  }
  ctx.stroke();
  ctx.globalCompositeOperation = 'lighter';
  const gl = ctx.createLinearGradient(0, p.y + p.h, 0, p.y + p.h + 36);
  gl.addColorStop(0, rgba(look.color, 0.16 + 0.15 * k));
  gl.addColorStop(1, rgba(look.color, 0));
  ctx.fillStyle = gl;
  ctx.fillRect(p.x + 6, p.y + p.h, p.w - 12, 36);
  // 板の上を流れる光
  const bpNow = scene === 'title' ? titleBeat() : beatPos(songTime);
  const q = ((bpNow * 0.25 + p.x * 0.01) % 1 + 1) % 1;
  ctx.fillStyle = rgba([255, 255, 255], 0.5 + 0.3 * k);
  ctx.fillRect(p.x + 4 + (p.w - 30) * q, p.y + 1, 22, 2);
  ctx.globalCompositeOperation = 'source-over';
}

// ---- 弾 --------------------------------------------------------------------
// 回った四角（ブロック）の形を作る。s = 中心から角までの長さ
function blockPath(x, y, s, rot) {
  ctx.beginPath();
  for (let i = 0; i < 4; i++) {
    const a = rot + i * Math.PI / 2;
    const px = x + Math.cos(a) * s, py = y + Math.sin(a) * s;
    i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
  }
  ctx.closePath();
}
const isBlock = b => b.shape === 'block' || cyber();
function blockRot(b) {
  if (b.every) return Math.PI / 4 + (b.n0 != null ? beatIndex(songTime, b.every) - b.n0 : 0) * Math.PI / 4;   // ブリンク: 跳ぶたびに45°
  return Math.PI / 4 + b.age * 2.4 + b.x * 0.004;
}

function drawBullets(T, look, k) {
  // レーザー（予告もビームも）は弾の下に描く
  for (const b of bullets) if (b.kind === 'laser') drawLaser(b, T, k);

  // 警告（溜め中）: 回転する3本の弧（cyber はカギかっこ）＋ だんだん満ちる中身 ＋ 進む向きのガイド線
  for (const b of bullets) {
    if (b.delay <= 0 || b.kind === 'laser') continue;
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
    if (isBlock(b)) {                                   // カギかっこが外から閉じてくる
      const R = b.r * (1.5 + 1.6 * (1 - p)), L = R * 0.5;
      ctx.strokeStyle = rgba(c, 0.35 + 0.55 * p);
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
        const x = b.x + sx * R, y = b.y + sy * R;
        ctx.moveTo(x - sx * L, y); ctx.lineTo(x, y); ctx.lineTo(x, y - sy * L);
      }
      ctx.stroke();
      ctx.fillStyle = rgba(c, 0.12 + 0.3 * p);
      blockPath(b.x, b.y, b.r * 1.2 * p, Math.PI / 4);
      ctx.fill();
      continue;
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

  // ブリンク弾の跡（四角が少し広がって消える）
  ctx.globalCompositeOperation = 'lighter';
  ctx.lineWidth = 2;
  for (const q of fx.blips) {
    ctx.strokeStyle = rgba(q.c, q.a * 0.6);
    blockPath(q.x, q.y, q.r * (1.2 + (1 - q.a) * 0.9), Math.PI / 4);
    ctx.stroke();
  }

  // 光のにじみ ＋ しっぽ（加算合成で明るく）
  ctx.lineCap = 'round';
  for (const b of bullets) {
    if (b.delay > 0 || b.kind === 'laser') continue;
    const c = bulletColor(b);
    if (b.px != null && !b.noTrail) {
      const dx = b.x - b.px, dy = b.y - b.py;
      if (dx * dx + dy * dy > 3 && dx * dx + dy * dy < 2500) {
        ctx.strokeStyle = rgba(c, 0.28);
        ctx.lineWidth = b.r * 1.2;
        ctx.beginPath(); ctx.moveTo(b.x, b.y); ctx.lineTo(b.x - dx * 5, b.y - dy * 5); ctx.stroke();
      }
    }
    const R = b.r * (2.5 + 0.9 * k);
    ctx.drawImage(glowSprite(c), b.x - R, b.y - R, R * 2, R * 2);
  }
  ctx.globalCompositeOperation = 'source-over';

  // 本体: 色つきの円 ＋ 白い芯（当たり判定は色つきの円と同じ大きさ）。cyber は回る四角
  for (const b of bullets) {
    if (b.delay > 0 || b.kind === 'laser') continue;
    const c = bulletColor(b);
    if (isBlock(b)) {
      const rot = blockRot(b);
      ctx.fillStyle = rgba(c, 1);
      blockPath(b.x, b.y, b.r * 1.22, rot); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.92)';
      blockPath(b.x, b.y, b.r * 0.62, rot); ctx.fill();
      if (b.nx != null) {                               // ブリンク: 次に跳ぶ場所の予告
        ctx.strokeStyle = rgba(c, 0.4);
        ctx.lineWidth = 1.5;
        ctx.setLineDash([3, 3]);
        blockPath(b.nx, b.ny, b.r * 1.22, rot + Math.PI / 4); ctx.stroke();
        ctx.setLineDash([]);
      }
      continue;
    }
    ctx.fillStyle = rgba(c, 1);
    ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.92)';
    ctx.beginPath(); ctx.arc(b.x, b.y, b.r * 0.58, 0, TAU); ctx.fill();
  }
}

// レーザー: 予告中は「点滅する点線 ＋ うすい危険地帯」、発射したら太い光、そのあと細くなって消える
function drawLaser(b, T, k) {
  const c = bulletColor(b);
  const line = () => { ctx.beginPath(); ctx.moveTo(b.x1, b.y1); ctx.lineTo(b.x2, b.y2); ctx.stroke(); };
  ctx.lineCap = 'round';
  if (b.delay > 0) {
    // 予告: 当たる範囲のふちを細い線で囲む（中はうすく）＋ 真ん中に流れる点線。だんだん濃くなる
    const p = b.delayMax > 0 ? 1 - b.delay / b.delayMax : 1;
    const on = p > 0.7 || Math.floor(T * 14) % 2 === 0;
    const len = Math.hypot(b.x2 - b.x1, b.y2 - b.y1) || 1;
    const nx = -(b.y2 - b.y1) / len * b.r, ny = (b.x2 - b.x1) / len * b.r;
    ctx.lineCap = 'butt';
    ctx.strokeStyle = rgba(c, 0.04 + 0.08 * p);
    ctx.lineWidth = b.r * 2;
    line();
    ctx.strokeStyle = rgba(c, on ? 0.3 + 0.5 * p : 0.12);
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(b.x1 + nx, b.y1 + ny); ctx.lineTo(b.x2 + nx, b.y2 + ny);
    ctx.moveTo(b.x1 - nx, b.y1 - ny); ctx.lineTo(b.x2 - nx, b.y2 - ny);
    ctx.stroke();
    ctx.strokeStyle = rgba(c, on ? 0.25 + 0.35 * p : 0.1);
    ctx.lineWidth = 1;
    ctx.setLineDash([12, 8]);
    ctx.lineDashOffset = -T * 160;
    line();
    ctx.setLineDash([]);
    if (b.lane) {                                       // 走る向きの矢印（スキャナー）
      const [dx] = b.lane, ax = b.x1 + dx * 26, ay = (b.y1 + b.y2) / 2;
      ctx.fillStyle = rgba(c, on ? 0.9 : 0.3);
      ctx.beginPath(); ctx.moveTo(ax + dx * 12, ay); ctx.lineTo(ax, ay - 10); ctx.lineTo(ax, ay + 10); ctx.closePath(); ctx.fill();
    }
    if (b.label) {                                      // 「JUMP」などの文字
      ctx.font = '800 15px ui-monospace, "Menlo", "Consolas", monospace';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillStyle = rgba(mixC(c, [255, 255, 255], 0.4), on ? 0.95 : 0.4);
      for (const fx_ of [0.2, 0.5, 0.8]) ctx.fillText(b.label, W * fx_, b.y1 - 26 - 6 * p);
    }
    return;
  }
  const fade = b.safe ? clamp01(1 - (b.age - b.hold) / 0.3) : 1;
  const w = b.r * 2 * (b.safe ? fade : 1 + 0.1 * Math.sin(b.age * 80));
  ctx.globalCompositeOperation = 'lighter';
  ctx.strokeStyle = rgba(c, 0.22 * fade); ctx.lineWidth = w * 2.2 + 6; line();
  ctx.strokeStyle = rgba(c, 0.8 * fade);  ctx.lineWidth = w; line();
  ctx.strokeStyle = rgba([255, 255, 255], 0.9 * fade); ctx.lineWidth = Math.max(1, w * 0.35); line();
  ctx.globalCompositeOperation = 'source-over';
}

function drawRings() {
  ctx.globalCompositeOperation = 'lighter';
  for (const r of fx.rings) {
    const a = r.life / r.max;
    ctx.strokeStyle = rgba(r.c, a * 0.9);
    ctx.lineWidth = r.width * a + 0.5;
    if (cyber()) { blockPath(r.x, r.y, Math.max(0.1, r.r) * 1.2, Math.PI / 4 + (1 - a) * 0.6); ctx.stroke(); continue; }
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

// ---- タイトル画面（cyber）: 拍でカクッと回る X と、まわりを回るブロックの四角 ----
function drawTitleX(look, k, bp) {
  const cx = W / 2, cy = H * 0.38;
  const red = rgb('#ff2a6d'), green = rgb('#39ff88'), cyan = rgb('#00e5ff');
  const pts = [];
  const nb = Math.floor(bp), turn = (nb + easeOut((bp - nb) * 5)) * Math.PI / 4;
  for (let a = 0; a < 4; a++) {
    for (let j = 0; j < 5; j++) {
      const ang = Math.PI / 4 + a * Math.PI / 2 + turn, rad = (40 + j * 30) * (1 + 0.08 * k);
      pts.push([cx + Math.cos(ang) * rad, cy + Math.sin(ang) * rad, 8, red, ang]);
    }
  }
  const sq = 230 * (1 + 0.05 * k);                      // ブロックが四角い道を回る
  for (let i = 0; i < 24; i++) {
    const u = ((i / 24 - bp * 0.03) % 1 + 1) % 1, side = Math.floor(u * 4), f = u * 4 - side;
    const c = [[-1, -1], [1, -1], [1, 1], [-1, 1], [-1, -1]];
    const x = cx + sq * lerp(c[side][0], c[side + 1][0], f), y = cy + sq * 0.8 * lerp(c[side][1], c[side + 1][1], f);
    pts.push([x, y, 6, i % 3 ? green : cyan, bp * 0.5]);
  }
  ctx.globalCompositeOperation = 'lighter';
  for (const [x, y, r, c] of pts) { const G = r * (2.6 + k); ctx.drawImage(glowSprite(c), x - G, y - G, G * 2, G * 2); }
  ctx.globalCompositeOperation = 'source-over';
  for (const [x, y, r, c, rot] of pts) {
    ctx.fillStyle = rgba(c, 1); blockPath(x, y, r * 1.22, rot); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.9)'; blockPath(x, y, r * 0.62, rot); ctx.fill();
  }
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

  // cyber: ずっと少し乗っているノイズ（砂嵐の点 ＋ ときどき画面がずれる）。やられたら砂嵐が強くなる
  if (cyber()) {
    const nz = Math.min(1, look.noise + (fx.deathT >= 0 ? Math.max(0, 1 - fx.deathT / 1.5) : 0)) * Math.max(0.3, fxScale);
    if (nz > 0.01) {
      for (let i = 0, n = nz * 60; i < n; i++) {
        ctx.fillStyle = Math.random() < 0.5 ? 'rgba(255,255,255,0.25)' : rgba(look.color, 0.3);
        ctx.fillRect(Math.random() * W, Math.random() * H, 1 + Math.random() * 3, 1 + Math.random() * 2);
      }
      if (Math.random() < nz * 0.12) {
        const y = Math.random() * H, h = 3 + Math.random() * 14;
        ctx.drawImage(cv, 0, y, W, h, (Math.random() * 2 - 1) * 24 * nz, y, W, h);
      }
    }
  }

  if (flashT > 0) {
    if (cyber()) {                                      // cyber: 白く光るかわりに色が反転する
      ctx.globalCompositeOperation = 'difference';
      ctx.fillStyle = `rgba(255,255,255,${Math.min(1, 0.95 * flashT).toFixed(3)})`;
      ctx.fillRect(0, 0, W, H);
      ctx.globalCompositeOperation = 'source-over';
    } else {
      ctx.fillStyle = `rgba(255,255,255,${(0.4 * flashT).toFixed(3)})`;
      ctx.fillRect(0, 0, W, H);
    }
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
  if (cyber()) {                                        // cyber: 読み込み中のような区切りバー
    const n = 64, sw = W / n;
    for (let i = 0; i < n; i++) {
      const on = (i + 1) / n <= p, edge = !on && i / n < p;
      ctx.fillStyle = on ? rgba(look.color, 0.55 + 0.35 * (i / n > p - 0.05 ? k : 0)) : edge ? rgba([255, 255, 255], 0.8) : 'rgba(255,255,255,0.08)';
      ctx.fillRect(i * sw + 1, 0, sw - 2, 5);
    }
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    for (const s of SECTIONS) if (s.t > 0) ctx.fillRect(W * s.t / SONG_END - 1, 5, 2, 4);
    return;
  }
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
  if (cyber()) { drawTerminalBanner(bn, e, DUR); return; }
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

// cyber のバナー: ターミナルに1文字ずつ打ちこまれるように出る
function drawTerminalBanner(bn, e, DUR) {
  const a = e > DUR - 0.4 ? (DUR - e) / 0.4 : 1;
  const y = 118;
  const open = easeOut(e / 0.25);
  ctx.save();
  ctx.globalAlpha = clamp01(a);
  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  ctx.fillRect(W / 2 - 250 * open, y - 38, 500 * open, 76);
  ctx.strokeStyle = rgba(bn.c, 0.9);
  ctx.lineWidth = 1.5;
  ctx.setLineDash([6, 4]);
  ctx.strokeRect(W / 2 - 250 * open, y - 38, 500 * open, 76);
  ctx.setLineDash([]);
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  const mono = 'ui-monospace, "Menlo", "Consolas", monospace';
  ctx.font = `600 11px ${mono}`;
  ctx.fillStyle = rgba(bn.c, 0.8);
  const idx = String(Math.max(1, fx.secIdx)).padStart(2, '0');
  ctx.fillText(`[SECTOR ${idx}/${String(SECTIONS.length - 1).padStart(2, '0')}]  LOAD PATTERN`, W / 2 - 236, y - 25);
  const typed = bn.name.slice(0, Math.floor(e * 22));
  const cursor = Math.floor(e * 4) % 2 === 0 ? '_' : ' ';
  ctx.font = `800 34px ${mono}`;
  ctx.fillStyle = '#fff';
  ctx.shadowColor = rgba(bn.c, 1);
  ctx.shadowBlur = 14;
  const jx = e < 0.3 ? (Math.random() * 2 - 1) * 6 : 0;   // 出だしは少しぶれる
  ctx.fillText('> ' + typed + cursor, W / 2 - 236 + jx, y + 2);
  ctx.shadowBlur = 0;
  const sub = bn.sub.slice(0, Math.max(0, Math.floor((e - 0.35) * 18)));
  ctx.font = '700 14px system-ui, sans-serif';
  ctx.fillStyle = rgba(mixC(bn.c, [255, 255, 255], 0.35), 1);
  ctx.fillText(sub, W / 2 - 236, y + 26);
  ctx.restore();
}
