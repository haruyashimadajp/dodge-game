"use strict";

/* =========================================================================
   VISUALS  —  見た目の演出だけを担当するファイル
   背景・カメラ（ゆれ / ズーム / 回転）・パーティクル・弾とキャラの描画・
   セクション名のバナー・タイトル画面のアニメーション。
   当たり判定やゲームの進行には一切影響しません（game.js のあとに読み込む）。

   曲ごとに「見た目のセット」（song.theme）があり、描き方を切りかえる:
       neon  … the EmpErroR: ネオンの図形・光の柱・丸い弾・白い光（このファイル）
       night … Re:Unknown X: 月夜・三色の UFO・探照灯・弾幕らしい弾（visuals-night.js）
       dusk  … モラトリウム: 夕暮れの時計塔・歯車・振り子・音符の弾（visuals-dusk.js）
   セットは THEMES に「ここだけ描き方を変える」関数を登録するしくみ。
   登録されていない所は、このファイルの描き方（neon）がそのまま使われる。

   画質（設定の 高 / 中 / 低）: gfx = 2 / 1 / 0。低いほど光のにじみ・しっぽ・
   火花の数・背景の飾りをへらす。低ではキャンバスの解像度も 70% にする。

   game.js の弾幕から使える演出:
       flash(0〜1)          画面が光る               （game.js）
       shake(強さ)          画面がゆれる（10〜20 くらい）
       punch(強さ)          一瞬ズームインする（0.03〜0.08 くらい）
       glitch(0〜1)         画面がノイズで乱れる（曲名 the EmpErroR っぽく）
       sparks(x, y, {...})  火花が飛び散る
       shockRing(x, y, {...}) 輪が広がる
   ========================================================================= */

// ---- 曲の音量データ（songs/*-env.js）を読む --------------------------------
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
  const key = c.map(v => v | 0).join(',');
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

// ---- 見た目のセット -------------------------------------------------------
// THEMES.名前 = { background, floor, platform, title, bullet, laser, flash, banner, update, reset, clearColors }
// どれも書かなくてよい（書かなければ neon の描き方）。visuals-night.js が night を登録する。
const THEMES = {};
const theme = () => (song && THEMES[song.theme]) || {};

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
  blips: [],        // ブリンク弾が瞬間移動した跡
  freeze: 0,        // 時間停止の見た目の強さ（0〜1）
  rewindT: 0,       // 巻き戻しの演出の残り時間
};
const PART_CAP = () => [150, 500, 1200][gfx];          // 火花の上限（画質しだい）

function fxReset() {
  fx.particles.length = 0; fx.rings.length = 0; fx.bgRings.length = 0; fx.ghosts.length = 0;
  fx.blips.length = 0;
  fx.shake = fx.punch = fx.glitch = fx.hurt = 0;
  fx.banner = null; fx.secIdx = -1; fx.lastBar = -99;
  fx.deathT = -1; fx.clearT = -1;
  fx.freeze = 0; fx.rewindT = 0;
  if (theme().reset) theme().reset();
}

// ---- 弾幕やエンジンから呼ぶ演出 ----------------------------------------
function shake(amount)  { fx.shake  = Math.max(fx.shake,  amount * fxScale); }
function punch(amount)  { fx.punch  = Math.max(fx.punch,  amount * fxScale); }
function glitch(amount) { fx.glitch = Math.max(fx.glitch, amount * fxScale); }

function sparks(x, y, { n = 16, color = '#ffffff', speed = 260, life = 0.6, size = 3, gravity = 300, spread = TAU, dir = 0 } = {}) {
  const c = rgb(color), cap = PART_CAP();
  n = Math.max(1, Math.round(n * [0.35, 0.6, 1][gfx]));
  for (let i = 0; i < n && fx.particles.length < cap; i++) {
    const a = dir + (Math.random() - 0.5) * spread;
    const v = speed * (0.35 + Math.random() * 0.65);
    fx.particles.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: life * (0.6 + Math.random() * 0.4), max: life, size: size * (0.6 + Math.random() * 0.8), c, g: gravity });
  }
}
function shockRing(x, y, { color = '#ffffff', size = 120, life = 0.5, width = 4 } = {}) {
  if (fx.rings.length > 260) return;
  fx.rings.push({ x, y, r: 0, size, life, max: life, width, c: rgb(color) });
}
// ブリンク弾が瞬間移動した: 元の場所に輪の跡が残る
function blip(x, y, b) {
  if (fx.blips.length < 300) fx.blips.push({ x, y, r: b.r, c: bulletColor(b), a: 1 });
}

// エンジンからのフック -----------------------------------------------------
function fxFire(b) {                          // 警告が終わって弾が飛び出した瞬間
  if (b.kind === 'ufo') return;
  if (b.kind === 'laser') {                   // ビーム: 両はしで火花、画面が少しゆれる
    const c = bulletColor(b);
    for (const [x, y] of [[b.x1, b.y1], [b.x2, b.y2], [b.x, b.y]]) {
      if (x > -20 && x < W + 20 && y > -20 && y < H + 20) sparks(x, y, { n: 10, color: c, speed: 260, life: 0.4, size: 3, gravity: 0 });
    }
    shake(b.r > 20 ? 6 : 4);
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
function fxSongChange() { flash(0.6); glitch(0.4); }   // タイトルで曲を切りかえた
// 時間停止した / 巻き戻した（game.js の timeStop / rewind から呼ばれる）
function fxTimeStop() {
  shockRing(W / 2, H * 0.36, { color: '#cfe0ff', size: 900, life: 0.9, width: 6 });
  punch(0.05); shake(6);
}
function fxRewind() { fx.rewindT = 0.8; shake(5); }

// ---- セクション（曲の場面）ごとの見た目 --------------------------------
// タイトル画面の見た目は、選んでいる曲の titleLook（songs/*.js）
function sectionIndex(t) {
  let i = 0;
  while (i + 1 < SECTIONS.length && SECTIONS[i + 1].t <= t) i++;
  return i;
}
// 数字の項目は、前のセクションから 0.8秒かけてなめらかに切りかえる
// （tier = 盛り上がりの段階 0〜5。night の見た目はこれでほとんどが決まる）
const LOOK_NUM = { pulse: 0, sway: 0, stars: 30, tier: 0 };
function lookAt(t) {
  const fill = (s, p, k, z) => {
    const L = {
      skyTop: mixC(rgb(p.sky[0]), rgb(s.sky[0]), k),
      skyBot: mixC(rgb(p.sky[1]), rgb(s.sky[1]), k),
      color:  mixC(rgb(p.color), rgb(s.color), k),
      shape: s.shape || 0,
      beams: lerp(p.beams ? 1 : 0, s.beams ? 1 : 0, k),
      zoom: z,
    };
    for (const key in LOOK_NUM) L[key] = lerp(p[key] ?? LOOK_NUM[key], s[key] ?? LOOK_NUM[key], k);
    return L;
  };
  if (scene === 'title') { const L = song.titleLook; return fill(L, L, 1, 1); }
  const i = sectionIndex(t), s = SECTIONS[i], p = SECTIONS[Math.max(0, i - 1)];
  const k = i === 0 ? 1 : clamp01((t - s.t) / 0.8);
  const next = i + 1 < SECTIONS.length ? SECTIONS[i + 1].t : SONG_END;
  const z = s.zoom ? lerp(s.zoom[0], s.zoom[1], clamp01((t - s.t) / (next - s.t))) : 1;
  return fill(s, p, k, z);
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

  if (theme().update) theme().update(dt, T, look);

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
      if (s.name) { fx.banner = { name: s.name, sub: s.sub || '', c: rgb(s.color), age: 0 }; if (!theme().banner) glitch(0.45); }
    }
    // 弾のしっぽ（隕石の炎・花火の火花）
    for (const b of bullets) {
      if (b.delay > 0 || !b.fx) continue;
      if (b.fx === 'fire' && fx.particles.length < PART_CAP()) {
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
  const frozenNow = scene === 'play' && typeof timeFrozen === 'function' && timeFrozen();
  fx.freeze = clamp01(fx.freeze + (frozenNow ? dt * 5 : -dt * 3));
  fx.rewindT = Math.max(0, fx.rewindT - dt);

  // クリア: 花火が次々と上がる
  if (fx.clearT >= 0) {
    fx.clearT += dt;
    if (fx.clearT < 6 && fx.clearT >= fx.clearNext) {
      fx.clearNext += 0.3;
      const cols = theme().clearColors || ['#ff3ea5', '#4cc9f0', '#ffd166', '#2ef2b1', '#b388ff', '#ff7b3d'];
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
  const th = theme();
  const T = scene === 'title' ? titleClock() : songTime;
  const look = curLook = lookAt(T);
  const bp = scene === 'title' ? titleBeat() : beatPos(T);
  const k = kickOf(bp);                          // 拍の頭で 1 → すぐ 0 に落ちる
  const bk = kickOf(bp / 4);                     // 小節の頭で 1

  // 描くときは 800×750 のつもりで描く（画質「低」ではキャンバスが小さいので縮めて描く）
  ctx.setTransform(renderScale, 0, 0, renderScale, 0, 0);
  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = 1;
  (th.background || drawBackground)(T, look, k, bk, bp);

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
  if (scene === 'title') (th.title || drawTitleOrbits)(look, k, bp);
  else drawBullets(T, look, k);
  drawRings();
  drawParticles();
  drawHero(look, k);
  ctx.restore();

  drawScreenFx(T, look, k);
}

// ---- 背景（neon）------------------------------------------------------------
function drawBackground(T, look, k, bk, bp) {
  const lowE = scene === 'title' ? 0.3 * k : songEnv(0, T);
  const boost = (lowE * 0.10 + k * 0.04) * (scene === 'play' ? 1 : 0.6);
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, rgba(mixC(look.skyTop, look.color, boost * 1.4), 1));
  g.addColorStop(1, rgba(mixC(look.skyBot, look.color, boost * 0.6), 1));
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  ctx.globalCompositeOperation = 'lighter';
  drawStars(T, gfx === 0 ? 50 : 140);

  // 光の柱（サビなど）: 地面から伸びて、小節に合わせて首をふる
  if (look.beams > 0.01 && gfx > 0) {
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

  // イコライザー（曲の音量で伸び縮み。低音がまん中）。画質が低いと本数を半分に
  const nb = gfx === 2 ? 32 : 16, bw = W / nb;
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

// 星（プレイヤーと逆向きに少しずれる = 奥行き）。n = 描く数
function drawStars(T, n) {
  const par = (playerXY().x - W / 2) * -0.05;
  const hi = scene === 'title' ? 0.3 : songEnv(6, T);
  const stars = fx.stars || [];
  for (let i = 0; i < Math.min(n, stars.length); i++) {
    const s = stars[i];
    const a = 0.15 + 0.55 * s.z * (0.6 + 0.4 * Math.sin(s.tw + T * 3)) + hi * 0.3 * s.z;
    ctx.fillStyle = `rgba(220,230,255,${Math.min(1, a).toFixed(3)})`;
    const sz = 0.6 + s.z * 1.6;
    ctx.fillRect(((s.x + par * s.z) % W + W) % W, s.y, sz, sz);
  }
}

// ---- 地面と足場 ----------------------------------------------------------
function drawStage(look, k, bp) {
  const th = theme();
  // 地面（回転しても角が見えないよう広めに塗る）
  const g = ctx.createLinearGradient(0, GROUND_Y, 0, H + 200);
  g.addColorStop(0, rgba(mixC(look.skyBot, [0, 0, 0], 0.4), 1));
  g.addColorStop(1, '#000');
  ctx.fillStyle = g;
  ctx.fillRect(-400, GROUND_Y, W + 800, H - GROUND_Y + 400);

  if (th.floor) th.floor(look, k, bp);
  else {
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
  }

  // 地面のふちの光
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
    if (th.platform) { th.platform(p, look, k); continue; }
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
  const th = theme();
  // UFO とレーザー（予告もビームも）は弾の下に描く
  for (const b of bullets) {
    if (b.kind === 'laser') drawLaser(b, T, k);
    else if (b.kind === 'ufo') drawUfo(b.x, b.y, b.size, bulletColor(b), 1, T, k, b.firedAt != null ? clamp01(1 - (b.age - b.firedAt) * 4) : 0);
  }

  // 警告（溜め中）: 回転する3本の弧 ＋ だんだん満ちる中身 ＋ 進む向きのガイド線
  for (const b of bullets) {
    if (b.delay <= 0 || b.kind) continue;
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

  // 振り子のひも（予告中は、ゆれる道すじを点線で見せる）
  for (const b of bullets) {
    if (!b.pivot) continue;
    const c = bulletColor(b);
    if (b.delay > 0) {
      ctx.strokeStyle = rgba(c, 0.35);
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 6]);
      ctx.beginPath(); ctx.arc(b.pivot.x, b.pivot.y, b.len, Math.PI / 2 - b.amp, Math.PI / 2 + b.amp); ctx.stroke();
      ctx.setLineDash([]);
    }
    ctx.strokeStyle = rgba(mixC(c, [255, 255, 255], 0.3), b.delay > 0 ? 0.3 : 0.8);
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(b.pivot.x, b.pivot.y); ctx.lineTo(b.x, b.y); ctx.stroke();
    ctx.fillStyle = rgba(c, 1);
    ctx.beginPath(); ctx.arc(b.pivot.x, b.pivot.y, 5, 0, TAU); ctx.fill();
  }

  // ブリンク弾の跡（輪が少し広がって消える）
  ctx.globalCompositeOperation = 'lighter';
  ctx.lineWidth = 2;
  for (const q of fx.blips) {
    ctx.strokeStyle = rgba(q.c, q.a * 0.6);
    ctx.beginPath(); ctx.arc(q.x, q.y, q.r * (1.2 + (1 - q.a) * 0.9), 0, TAU); ctx.stroke();
  }

  // 光のにじみ ＋ しっぽ（加算合成で明るく）。画質しだいで省く
  ctx.lineCap = 'round';
  for (const b of bullets) {
    if (b.delay > 0 || b.kind) continue;
    const c = bulletColor(b);
    if (gfx === 2 && b.px != null && !b.noTrail && !th.noTrails) {
      const dx = b.x - b.px, dy = b.y - b.py;
      if (dx * dx + dy * dy > 3 && dx * dx + dy * dy < 2500) {
        ctx.strokeStyle = rgba(c, 0.28);
        ctx.lineWidth = b.r * 1.2;
        ctx.beginPath(); ctx.moveTo(b.x, b.y); ctx.lineTo(b.x - dx * 5, b.y - dy * 5); ctx.stroke();
      }
    }
    if (gfx === 2 || (gfx === 1 && b.r >= 12)) {
      const R = b.r * ((th.glow || 2.5) + 0.9 * k);
      ctx.drawImage(glowSprite(c), b.x - R, b.y - R, R * 2, R * 2);
    }
  }
  ctx.globalCompositeOperation = 'source-over';

  // 本体
  for (const b of bullets) {
    if (b.delay > 0 || b.kind) continue;
    const c = bulletColor(b);
    if (th.bullet) th.bullet(b, c, k);
    else {                                         // neon: 色つきの円 ＋ 白い芯（当たり判定は色つきの円と同じ）
      ctx.fillStyle = rgba(c, 1);
      ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, TAU); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.92)';
      ctx.beginPath(); ctx.arc(b.x, b.y, b.r * 0.58, 0, TAU); ctx.fill();
    }
    if (b.nx != null) {                            // ブリンク: 次に跳ぶ場所の予告
      ctx.strokeStyle = rgba(c, 0.45);
      ctx.lineWidth = 1.5;
      ctx.setLineDash([3, 3]);
      ctx.beginPath(); ctx.arc(b.nx, b.ny, b.r, 0, TAU); ctx.stroke();
      ctx.setLineDash([]);
    }
  }
}

// レーザー: 予告中は「ふちの細い線 ＋ うすい危険地帯 ＋ 流れる点線」、発射したら太い光、そのあと細くなって消える
function drawLaser(b, T, k) {
  const c = bulletColor(b);
  const line = () => { ctx.beginPath(); ctx.moveTo(b.x1, b.y1); ctx.lineTo(b.x2, b.y2); ctx.stroke(); };
  if (theme().laser) theme().laser(b, c, T, k);    // 見た目のセットの飾り（UFO など）
  if (b.delay > 0) {
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
      ctx.font = '800 15px system-ui, sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillStyle = rgba(mixC(c, [255, 255, 255], 0.4), on ? 0.95 : 0.4);
      for (const f of [0.2, 0.5, 0.8]) ctx.fillText(b.label, W * f, b.y1 - 26 - 6 * p);
    }
    return;
  }
  const fade = b.safe ? clamp01(1 - (b.age - b.hold) / 0.3) : 1;
  if (b.gx != null && !b.safe) {                        // 時計の針: 次に止まる場所
    ctx.strokeStyle = rgba(c, 0.35);
    ctx.lineWidth = 1.5;
    ctx.setLineDash([8, 8]);
    ctx.beginPath(); ctx.moveTo(b.gx1, b.gy1); ctx.lineTo(b.gx, b.gy); ctx.stroke();
    ctx.setLineDash([]);
  }
  const w = b.r * 2 * (b.safe ? fade : 1 + 0.1 * Math.sin(b.age * 80));
  ctx.lineCap = 'round';
  ctx.globalCompositeOperation = 'lighter';
  if (gfx > 0) { ctx.strokeStyle = rgba(c, 0.22 * fade); ctx.lineWidth = w * 2.2 + 6; line(); }
  ctx.strokeStyle = rgba(c, 0.8 * fade);  ctx.lineWidth = w; line();
  ctx.strokeStyle = rgba([255, 255, 255], 0.9 * fade); ctx.lineWidth = Math.max(1, w * 0.35); line();
  ctx.globalCompositeOperation = 'source-over';
}

// UFO（円盤）: 胴体 ＋ 丸い屋根 ＋ まわりを回るライト。s = 大きさ、a = 濃さ、fire = 撃った瞬間の光(0〜1)
function drawUfo(x, y, s, c, a, T, k, fire = 0) {
  if (a <= 0.01) return;
  ctx.save();
  ctx.globalAlpha = a;
  ctx.translate(x, y);
  ctx.scale(s, s);
  if (gfx > 0) {
    ctx.globalCompositeOperation = 'lighter';
    const G = 46 + 10 * k + 20 * fire;
    ctx.drawImage(glowSprite(c), -G, -G * 0.7, G * 2, G * 1.4);
    ctx.globalCompositeOperation = 'source-over';
  }
  // 屋根
  ctx.fillStyle = rgba(mixC(c, [255, 255, 255], 0.55), 0.85);
  ctx.beginPath(); ctx.ellipse(0, -6, 11, 10, 0, Math.PI, 0); ctx.fill();
  // 胴体
  ctx.fillStyle = rgba(mixC(c, [20, 16, 40], 0.45), 1);
  ctx.beginPath(); ctx.ellipse(0, 0, 26, 8, 0, 0, TAU); ctx.fill();
  ctx.strokeStyle = rgba(mixC(c, [255, 255, 255], 0.3), 0.9);
  ctx.lineWidth = 1.5;
  ctx.stroke();
  // 回るライト
  for (let i = 0; i < 6; i++) {
    const t = T * 3 + i * TAU / 6, lx = Math.cos(t) * 20, ly = Math.sin(t) * 4;
    if (Math.sin(t) < -0.2) continue;                        // 裏側のライトは見えない
    const on = (i + Math.floor(T * 6)) % 3 === 0;
    ctx.fillStyle = on ? '#ffffff' : rgba(c, 1);
    ctx.beginPath(); ctx.arc(lx, ly, on ? 2.6 : 2, 0, TAU); ctx.fill();
  }
  ctx.restore();
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

// ---- タイトル画面（neon）: 回る光の輪 ----------------------------------
function drawTitleOrbits(look, k, bp) {
  const cx = W / 2, cy = H * 0.38;
  const cols = [rgb('#ff3ea5'), rgb('#4cc9f0'), rgb('#ffd166')];
  const rings = [[110, 10, 0.5], [180, 16, -0.32], [255, 22, 0.2]];
  const each = fn => rings.forEach(([R, n, sp], ri) => {
    const rad = R * (1 + 0.07 * k);
    for (let i = 0; i < n; i++) {
      const a = bp * sp * 0.5 + (i / n) * TAU;
      fn(cx + Math.cos(a) * rad, cy + Math.sin(a) * rad, 5 + ri, cols[ri]);
    }
  });
  if (gfx > 0) {
    ctx.globalCompositeOperation = 'lighter';
    each((x, y, r, c) => { const G = r * (2.6 + k); ctx.drawImage(glowSprite(c), x - G, y - G, G * 2, G * 2); });
    ctx.globalCompositeOperation = 'source-over';
  }
  each((x, y, r, c) => {
    ctx.fillStyle = rgba(c, 1);
    ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.beginPath(); ctx.arc(x, y, r * 0.55, 0, TAU); ctx.fill();
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
  if (gfx > 0) {
    ctx.globalCompositeOperation = 'lighter';
    const G = 30 + 6 * k;
    ctx.globalAlpha = 0.45;
    ctx.drawImage(glowSprite(rgb('#7fb4ff')), p.x - G, p.y - G, G * 2, G * 2);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
  }

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
  const th = theme();
  // ノイズ（グリッチ）: 横長の帯をずらす（画質「低」では省く）＋ 色のにじみ
  if (fx.glitch > 0.02) {
    const n = 2 + Math.floor(fx.glitch * 9);
    if (gfx > 0) {
      const R = renderScale;
      for (let i = 0; i < n; i++) {
        const y = Math.random() * H, h = 4 + Math.random() * 26;
        const dx = (Math.random() * 2 - 1) * 40 * fx.glitch;
        ctx.drawImage(cv, 0, y * R, W * R, h * R, dx, y, W, h);
      }
    }
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < n; i++) {
      ctx.fillStyle = Math.random() < 0.5 ? `rgba(0,255,255,${0.10 * fx.glitch})` : `rgba(255,0,170,${0.10 * fx.glitch})`;
      ctx.fillRect(0, Math.random() * H, W, 2 + Math.random() * 6);
    }
    ctx.globalCompositeOperation = 'source-over';
  }

  // 時間停止: 色が抜けて青白くなる（弾は止まっていても当たる）
  if (fx.freeze > 0.01) {
    ctx.globalCompositeOperation = 'saturation';
    ctx.fillStyle = `rgba(0,0,0,${(0.75 * fx.freeze).toFixed(3)})`;
    ctx.fillRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = `rgba(120,150,255,${(0.10 * fx.freeze).toFixed(3)})`;
    ctx.fillRect(0, 0, W, H);
  }
  // 巻き戻し: 横に流れる線 ＋ ◀◀
  if (fx.rewindT > 0) {
    const a = fx.rewindT / 0.8;
    ctx.fillStyle = `rgba(255,255,255,${(0.12 * a).toFixed(3)})`;
    for (let i = 0; i < 6; i++) ctx.fillRect(0, (i * 137 + fx.rewindT * 900) % H, W, 2 + (i % 3));
    ctx.font = '800 26px system-ui, sans-serif';
    ctx.textAlign = 'left'; ctx.textBaseline = 'top';
    ctx.fillStyle = `rgba(255,255,255,${(0.9 * a).toFixed(3)})`;
    ctx.fillText('◀◀ REWIND', 24, 44);
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
    if (th.flash) th.flash(look);
    else {
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

  if (gfx > 0) { ctx.fillStyle = vignette; ctx.fillRect(0, 0, W, H); }
  if (gfx === 2 && !th.noScanlines) { ctx.fillStyle = scanlines; ctx.fillRect(0, 0, W, H); }

  if (scene !== 'title') { drawProgress(T, look, k); (th.banner || drawBanner)(); }
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
  if (gfx > 0) {
    ctx.globalCompositeOperation = 'lighter';
    const G = 10 + 8 * k;
    ctx.drawImage(glowSprite(look.color), W * p - G, 2 - G, G * 2, G * 2);
    ctx.globalCompositeOperation = 'source-over';
  }
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
  if (gfx === 2) { ctx.shadowColor = rgba(bn.c, 1); ctx.shadowBlur = 18; }
  ctx.fillText(bn.name, W / 2 - slide, y - 6);
  ctx.shadowBlur = 0;
  if ('letterSpacing' in ctx) ctx.letterSpacing = '2px';
  ctx.font = '700 15px system-ui, sans-serif';
  ctx.fillStyle = rgba(mixC(bn.c, [255, 255, 255], 0.35), 1);
  ctx.fillText(bn.sub, W / 2 + slide * 0.5, y + 24);
  if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';
  ctx.restore();
}
