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

// 色ごとの小さな絵を覚えておく入れ物。max 枚を超えたら、いちばん古い絵を「描き直して」使い回す。
// （キャンバスを作っては捨てるのをくり返すと、スマホではメモリがすぐに返されず、
//   曲をやるたびに重さが積み重なってしまう。開き直すまで治らない）
function spritePool(max, w, h, draw) {
  const m = new Map();
  const get = c => {
    const key = c.join(',');
    let s = m.get(key);
    if (s) return s;
    if (m.size >= max) {
      const [old, cv] = m.entries().next().value;
      m.delete(old);
      s = cv;
      s.getContext('2d').clearRect(0, 0, w, h);
    } else {
      s = document.createElement('canvas');
      s.width = w; s.height = h;
    }
    draw(s.getContext('2d'), c);
    m.set(key, s);
    return s;
  };
  get.clear = () => { for (const s of m.values()) releaseCanvas(s); m.clear(); };   // 全部手放す
  return get;
}

// 光のにじみ用の画像（色ごとに1回だけ作って使い回す。色は少しまるめる）
const glowPool = spritePool(96, 64, 64, (g, c) => {
  const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, rgba(c, 0.9));
  gr.addColorStop(0.35, rgba(c, 0.35));
  gr.addColorStop(1, rgba(c, 0));
  g.fillStyle = gr;
  g.fillRect(0, 0, 64, 64);
});
const glowSprite = c => glowPool(c.map(v => Math.round(v / 16) * 16));

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
const PART_CAP = () => [150, 400, 700][gfx];           // 火花の上限（画質しだい。多すぎると重いので控えめ）

function fxReset() {
  fx.particles.length = 0; fx.rings.length = 0; fx.bgRings.length = 0; fx.ghosts.length = 0;
  fx.blips.length = 0;
  fx.shake = fx.punch = fx.glitch = fx.hurt = 0;
  fx.banner = null; fx.secIdx = -1; fx.lastBar = -99;
  fx.deathT = -1; fx.clearT = -1;
  fx.freeze = 0; fx.rewindT = 0;
  dirtyLayers();
  if (theme().reset) theme().reset();
}

// ---- 弾幕やエンジンから呼ぶ演出 ----------------------------------------
function shake(amount)  { fx.shake  = Math.max(fx.shake,  amount * fxScale); }
function punch(amount)  { fx.punch  = Math.max(fx.punch,  amount * fxScale); }
function glitch(amount) { fx.glitch = Math.max(fx.glitch, amount * fxScale); }

function sparks(x, y, { n = 16, color = '#ffffff', speed = 260, life = 0.6, size = 3, gravity = 300, spread = TAU, dir = 0, shape } = {}) {
  const c = rgb(color), cap = PART_CAP();
  n = Math.max(1, Math.round(n * [0.35, 0.6, 1][gfx]));
  for (let i = 0; i < n && fx.particles.length < cap; i++) {
    const a = dir + (Math.random() - 0.5) * spread;
    const v = speed * (0.35 + Math.random() * 0.65);
    fx.particles.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: life * (0.6 + Math.random() * 0.4), max: life, size: size * (0.6 + Math.random() * 0.8), c, g: gravity, shape });
  }
}
function shockRing(x, y, { color = '#ffffff', size = 120, life = 0.5, width = 4 } = {}) {
  if (fx.rings.length > 120) return;
  fx.rings.push({ x, y, r: 0, size, life, max: life, width, c: rgb(color) });
}
// ブリンク弾が瞬間移動した: 元の場所に輪の跡が残る
function blip(x, y, b) {
  if (fx.blips.length < 300) fx.blips.push({ x, y, r: b.r, c: bulletColor(b), a: 1 });
}

// エンジンからのフック -----------------------------------------------------
function fxFire(b) {                          // 警告が終わって弾が飛び出した瞬間
  if (theme().fire && theme().fire(b) === true) return;   // 見た目のセットが、発射の瞬間を自分で演出する
  if (b.kind === 'ufo' || b.kind === 'key') return;
  if (b.kind === 'popup') { shake(2); return; }
  if (b.kind === 'worm') { sparks(b.x, b.y, { n: 12, color: bulletColor(b), speed: 240, life: 0.4, size: 3, gravity: 0 }); return; }
  if (b.kind === 'crack') { sparks(b.x, b.y, { n: 10, color: bulletColor(b), speed: 220, life: 0.35, size: 2.5, gravity: 0 }); shake(3); return; }
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
function fxShatter(b) {                       // ガラスの板が割れた
  const s = b.size || 1, c = bulletColor(b);
  sparks(b.hx, b.hy, { n: Math.round(30 * s), color: '#ffffff', speed: 420, life: 0.6, size: 2.5, gravity: 300 });
  sparks(b.hx, b.hy, { n: Math.round(16 * s), color: c, speed: 300, life: 0.8, size: 3, gravity: 300 });
  shockRing(b.hx, b.hy, { color: '#ffffff', size: 160 + 140 * s, life: 0.5, width: 4 });
  flash(0.2 + 0.25 * s); shake(5 + 7 * s); punch(0.015 * s);
  if (theme().shatter) theme().shatter(b);
}
function fxSplat(x, y, b) {                   // ウイルスが床に着いた（感染のはじまり）
  sparks(x, y, { n: 10, color: bulletColor(b), speed: 200, life: 0.4, size: 3, gravity: 0, dir: y < H / 2 ? Math.PI / 2 : -Math.PI / 2, spread: 2.4 });
}
function fxKey(b) {                           // 鍵盤ブロックが地面（鍵盤）に着いた
  sparks(b.x, GROUND_Y - 2, { n: 6, color: bulletColor(b), speed: 170, life: 0.35, size: 2.5, gravity: 400, dir: -Math.PI / 2, spread: 2.2 });
  if (theme().keyHit) theme().keyHit(b);
}

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
// ★軽くするための道具★ ゆっくりしか変わらない層を1枚の絵にしておき、every コマに1回だけ描き直して、毎コマはそれを貼るだけにする。
// 　（グラデーションや模様で画面いっぱいを塗るのは重いが、同じ大きさの絵を貼るのはとても軽い）
// 　draw(g) の中では、g に 800×750 のつもりで描く。phase をずらすと、重い描き直しが同じコマに重ならない
const layerCaches = {};
let layerFrame = 0;
function cachedLayer(name, every, phase, draw) {
  let c = layerCaches[name];
  if (!c || c.width !== cv.width || c.height !== cv.height) { releaseCanvas(c); c = layerCaches[name] = document.createElement('canvas'); c.width = cv.width; c.height = cv.height; c.dirty = true; }
  if (c.dirty || layerFrame % every === phase) {
    const g = c.getContext('2d');
    g.setTransform(renderScale, 0, 0, renderScale, 0, 0);
    g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
    g.clearRect(0, 0, W, H);
    draw(g);
    c.dirty = false;
  }
  return c;
}
function dirtyLayers() { for (const k in layerCaches) layerCaches[k].dirty = true; }
// キャンバスの大きさを 0 にすると、中の絵のメモリがすぐに返される（ただ捨てるだけだと、スマホではなかなか返されない）
function releaseCanvas(c) { if (c) c.width = c.height = 0; }
function releaseLayers() { for (const k in layerCaches) { releaseCanvas(layerCaches[k]); delete layerCaches[k]; } }
// 見た目のセットが持っている絵（st の中のキャンバスと模様）を手放す。st の欄は null にもどすので、次に使うときに作り直される
function freeArt(st) {
  const free = (v, d) => {
    if (v instanceof HTMLCanvasElement) { releaseCanvas(v); return true; }
    if (v instanceof CanvasPattern) return true;
    let had = false;
    const plain = v && (Array.isArray(v) || Object.getPrototypeOf(v) === Object.prototype);   // ふつうの配列・オブジェクトの中だけ見る
    if (d < 4 && plain) for (const k in v) if (free(v[k], d + 1)) had = true;
    return had;
  };
  for (const k in st) if (free(st[k], 0)) st[k] = null;
}
// 曲（見た目のセット）が変わったら、ほかの見た目のセットの絵と、画面の大きさの層を全部手放す。
// 残しておくと、曲をやるたびにメモリがふくらんで、だんだん重くなる（開き直すまで治らない）
let artOwner = null;
function releaseOtherArt() {
  const now = song && song.theme;
  if (now === artOwner) return;
  artOwner = now;
  releaseLayers(); glowPool.clear();
  for (const k in THEMES) if (k !== now && THEMES[k].release) THEMES[k].release();
}
// タイトルにもどったら、今の曲の絵も含めて全部手放す（次に描くときに作り直す）。曲の途中で作った絵が残らないように
function releaseAllArt() {
  artOwner = null;
  releaseLayers(); glowPool.clear();
  for (const k in THEMES) if (THEMES[k].release) THEMES[k].release();
}
// たての2色グラデーション: 1px 幅の細い絵に描いてから横にのばす（画面いっぱいをグラデーションで塗るより、ずっと軽い。見た目は同じ）
const vgStrip = document.createElement('canvas'); vgStrip.width = 1; vgStrip.height = H;
//   vGradient(上の色, 下の色) か、vGradient([[0, 色], [0.65, 色], [1, 色]], グラデーションが終わる高さ)
//   to = 描く先（書かなければ画面）
function vGradient(top, bot, to = ctx) {
  const stops = Array.isArray(top) ? top : [[0, top], [1, bot]], gh = Array.isArray(top) ? (bot || H) : H;
  const g = vgStrip.getContext('2d');
  const gr = g.createLinearGradient(0, 0, 0, gh);
  for (const [p, c] of stops) gr.addColorStop(p, c);
  g.fillStyle = gr; g.fillRect(0, 0, 1, H);
  to.drawImage(vgStrip, 0, 0, W, H);
}

// 周辺減光と走査線は毎コマ同じなので、1枚の絵にしておいて貼るだけにする（グラデーションや模様で塗るより、ずっと軽い）
const overlayCache = {};
function screenOverlay(withScan) {
  const key = withScan ? 'scan' : 'plain';
  if (overlayCache[key]) return overlayCache[key];
  if (!vignette) makeStatic();
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d');
  g.fillStyle = vignette; g.fillRect(0, 0, W, H);
  if (withScan) { g.fillStyle = scanlines; g.fillRect(0, 0, W, H); }
  return (overlayCache[key] = c);
}

function drawScene() {
  if (!vignette) makeStatic();
  releaseOtherArt();
  layerFrame++;
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
  // ステージの傾き・回転・反転・ズーム（曲④ Vertigo）。傾いたら少し引いて、ステージ全体が見えるようにする
  const turn = stage.tilt + stage.spin;
  const c = Math.abs(Math.cos(turn)), sn = Math.abs(Math.sin(turn));
  const fit = Math.min(W / (W * c + H * sn), H / (W * sn + H * c));
  const zoom = (look.zoom + look.pulse * k * fxScale + fx.punch) * (1 - 0.8 * (1 - fit)) * stage.zoom;
  const rot = (look.sway * Math.PI / 180) * Math.sin(bp * Math.PI / 4) * fxScale + turn;
  const sx = (Math.random() * 2 - 1) * fx.shake, sy = (Math.random() * 2 - 1) * fx.shake;
  const pc = playerXY(), fo = scene === 'play' ? stage.follow : 0;
  const mir = (Math.abs(stage.mirror) < 0.03 ? 0.03 * Math.sign(stage.mirror || 1) : stage.mirror) * (scene === 'play' && runMods.mirror ? -1 : 1);   // ひねり「鏡の世界」
  ctx.save();
  ctx.translate(W / 2 + sx, H * 0.55 + sy);
  const cam = th.camera ? th.camera(T, bp, k) : null;      // 見た目のセットが決めるカメラの動き（Circle Pit のヘッドバンギングなど）
  if (cam) { ctx.translate((cam.x || 0) * fxScale, (cam.y || 0) * fxScale); ctx.rotate((cam.rot || 0) * fxScale); }
  ctx.rotate(rot);
  ctx.scale(zoom * mir, zoom);
  ctx.translate(-(W / 2 + (pc.x - W / 2) * fo), -(H * 0.55 + (pc.y - H * 0.55) * fo));

  drawStage(look, k, bp);
  if (scene === 'title') (th.title || drawTitleOrbits)(look, k, bp);
  else drawBullets(T, look, k);
  drawRings();
  drawParticles();
  drawEcho(T);
  drawHero(look, k);
  drawWalls(T, look, k);
  if (th.world) th.world(T, look, k);            // 見た目のセットが、カメラの中（ゲームの世界）に描きたいもの
  if (runMods.dark && scene === 'play') drawDarkness();   // ひねり「暗やみ」: 自分のまわりしか見えない
  ctx.restore();
  drawHint(T, look);

  drawScreenFx(T, look, k);
}

// ---- 背景（neon）------------------------------------------------------------
function drawBackground(T, look, k, bk, bp) {
  const lowE = scene === 'title' ? 0.3 * k : songEnv(0, T);
  const boost = (lowE * 0.10 + k * 0.04) * (scene === 'play' ? 1 : 0.6);
  vGradient(rgba(mixC(look.skyTop, look.color, boost * 1.4), 1), rgba(mixC(look.skyBot, look.color, boost * 0.6), 1));

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
function drawStars(T, n, to = ctx) {           // to = 描く先（書かなければ画面）
  const par = (playerXY().x - W / 2) * -0.05;
  const hi = scene === 'title' ? 0.3 : songEnv(6, T);
  const stars = fx.stars || [];
  for (let i = 0; i < Math.min(n, stars.length); i++) {
    const s = stars[i];
    const a = 0.15 + 0.55 * s.z * (0.6 + 0.4 * Math.sin(s.tw + T * 3)) + hi * 0.3 * s.z;
    to.fillStyle = `rgba(220,230,255,${Math.min(1, a).toFixed(3)})`;
    const sz = 0.6 + s.z * 1.6;
    to.fillRect(((s.x + par * s.z) % W + W) % W, s.y, sz, sz);
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

  drawHoles(songTime, look);
  drawCeiling(look, k);

  // 浮いている足場
  for (const p of platforms) {
    if (p.ground) continue;
    // この足場の「くずれ」だけを見る（ほかの足場が先にくずれていても、予告を見落とさない）。消えている最中を優先
    const mine = stage.drops.filter(d => d.p === p && songTime >= d.open - d.warn && songTime <= d.close);
    const drop = mine.find(d => songTime >= d.open) || mine[0];
    if (drop) {
      if (songTime >= drop.open) {                           // くずれて消えている: 点線のわくだけ
        ctx.strokeStyle = 'rgba(255,90,110,0.35)'; ctx.lineWidth = 1.5; ctx.setLineDash([5, 5]);
        ctx.strokeRect(p.x, p.y, p.w, p.h); ctx.setLineDash([]);
        continue;
      }
      ctx.save();                                            // もうすぐくずれる: ふるえて赤く点滅
      ctx.translate((Math.random() - 0.5) * 3, 0);
      if (th.platform) th.platform(p, look, k);
      const on = Math.floor(songTime * 10) % 2 === 0;
      ctx.fillStyle = `rgba(255,60,90,${on ? 0.55 : 0.2})`;
      ctx.fillRect(p.x, p.y, p.w, p.h);
      ctx.restore();
      if (th.platform) continue;
    }
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
  drawInfect(songTime, look);
}

// 天井（曲⑦ Malware の重力バグのあいだだけ出てくる）
function drawCeiling(look, k) {
  if (stage.ceil <= 0.01) return;
  const th = theme();
  if (th.ceiling) { th.ceiling(look, k, stage.ceil); return; }
  const a = stage.ceil, y = CEIL_Y * a - 200 * (1 - a);
  ctx.fillStyle = rgba(mixC(look.skyTop, [0, 0, 0], 0.4), a);
  ctx.fillRect(-400, -400, W + 800, y + 400);
  ctx.strokeStyle = rgba(look.color, 0.9 * a); ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(-400, y); ctx.lineTo(W + 400, y); ctx.stroke();
}

// 感染した床（曲⑦ Malware）: 潜伏中は点滅するわく → トゲ → 治ると消える
function drawInfect(T, look) {
  if (!malware.tiles.length) return;
  const th = theme();
  for (const t of malware.tiles) {
    if (T < t.on) continue;
    const ceil = !!t.p.ceil, y = ceil ? CEIL_Y : t.p.y, dir = ceil ? 1 : -1, w = t.x1 - t.x0;
    if (th.infect) { th.infect(t, T, y, dir); continue; }
    if (T < t.live) {
      const p = (T - t.on) / (t.live - t.on), on = p > 0.6 || Math.floor(T * 14) % 2 === 0;
      ctx.fillStyle = `rgba(160,255,90,${on ? 0.18 + 0.3 * p : 0.08})`;
      ctx.fillRect(t.x0 + 1, ceil ? y : y - 6, w - 2, 6);
      continue;
    }
    const a = T > t.off ? 1 - (T - t.off) / 0.3 : 1, grow = clamp01((T - t.live) / 0.08);
    ctx.fillStyle = `rgba(120,255,80,${(0.9 * a).toFixed(3)})`;
    ctx.beginPath();
    for (let x = t.x0; x < t.x1 - 2; x += 10) {
      ctx.moveTo(x, y); ctx.lineTo(x + 5, y + dir * 12 * grow); ctx.lineTo(Math.min(t.x1, x + 10), y);
    }
    ctx.fill();
  }
}

// ---- 床の穴・電気の壁・予告の文字（曲④ Vertigo）--------------------------------
function drawHoles(T, look) {
  for (const h of stage.holes) {
    if (T >= h.open && T <= h.close) {                       // 開いている: まっ暗なすき間
      ctx.fillStyle = '#000';
      ctx.fillRect(h.x, GROUND_Y - 1, h.w, H - GROUND_Y + 400);
      const g = ctx.createLinearGradient(0, GROUND_Y, 0, H);
      g.addColorStop(0, rgba([255, 60, 90], 0.35)); g.addColorStop(1, 'rgba(255,60,90,0)');
      ctx.fillStyle = g;
      ctx.fillRect(h.x, GROUND_Y, 3, H - GROUND_Y); ctx.fillRect(h.x + h.w - 3, GROUND_Y, 3, H - GROUND_Y);
    } else if (T >= h.open - h.warn && T < h.open) {          // もうすぐ開く: 赤く点滅
      const p = 1 - (h.open - T) / h.warn, on = p > 0.7 || Math.floor(T * 10) % 2 === 0;
      ctx.fillStyle = `rgba(255,60,90,${(on ? 0.18 + 0.3 * p : 0.08).toFixed(3)})`;
      ctx.fillRect(h.x, GROUND_Y, h.w, H - GROUND_Y);
      ctx.strokeStyle = `rgba(255,90,110,${(on ? 0.9 : 0.35).toFixed(3)})`;
      ctx.lineWidth = 2;
      ctx.setLineDash([8, 6]);
      ctx.strokeRect(h.x + 1, GROUND_Y + 1, h.w - 2, H - GROUND_Y);
      ctx.setLineDash([]);
    }
  }
}
function drawWalls(T, look, k) {
  if (theme().walls) { theme().walls(T, look, k); return; }   // 見た目のセットが壁を描く（And Revive The Melody の燃えた楽譜のカーテン）
  const zap = stage.shock;
  for (const [x, dir] of [[stage.wl, -1], [stage.wr, 1]]) {
    if (zap <= 0 && x > -1 && x < W + 1) continue;
    ctx.fillStyle = 'rgba(0,0,0,0.55)';                       // 壁の外は暗く
    ctx.fillRect(dir < 0 ? x - 1200 : x, -600, 1200, H + 1200);
    if (zap <= 0) continue;
    const on = zap >= 1 || Math.floor(T * 12) % 2 === 0;
    const a = zap >= 1 ? 0.9 : 0.25 + 0.4 * zap * (on ? 1 : 0.3);
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = rgba(rgb('#7ff6ff'), a * 0.35);
    ctx.lineWidth = zap >= 1 ? 14 : 6;
    ctx.beginPath(); ctx.moveTo(x, -600); ctx.lineTo(x, GROUND_Y); ctx.stroke();
    if (zap >= 1) {                                            // 電気のギザギザ
      ctx.strokeStyle = rgba(rgb('#e8fdff'), 0.9);
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      for (let y = -40; y <= GROUND_Y; y += 18) ctx.lineTo(x + (Math.random() - 0.5) * 12, y);
      ctx.stroke();
    }
    ctx.globalCompositeOperation = 'source-over';
  }
}
// EXエコー: 少し前の自分の位置にいる、赤くザラついた分身
function drawEcho(T) {
  if (echo.a <= 0 || scene !== 'play') return;
  const x = echo.x, y = echo.y, w = player.w, h = player.h, solid = echo.a >= 1;
  ctx.save();
  ctx.globalAlpha = solid ? 0.95 : 0.25 + 0.3 * echo.a * (Math.floor(T * 12) % 2);
  ctx.fillStyle = '#ff1f3d';
  for (let i = 0; i < 4; i++) {                              // 横にずれた細い帯（グリッチ）
    const dy = i * h / 4, dx = (Math.random() - 0.5) * (solid ? 3 : 8);
    ctx.fillRect(x + dx, y + dy, w, h / 4 - 1);
  }
  ctx.fillStyle = '#000';
  ctx.fillRect(x + w * 0.55, y + h * 0.3, 3, 3);
  ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = 1;
  ctx.strokeRect(x - 2, y - 2, w + 4, h + 4);
  ctx.restore();
}
// ロックオン: 追いかける照準 → 止まって点滅 → 爆発
function drawLock(b, T) {
  const c = bulletColor(b), locked = b.age >= b.track;
  if (b.blown) {
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = rgba(c, 0.7); ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.8)'; ctx.beginPath(); ctx.arc(b.x, b.y, b.r * 0.6, 0, TAU); ctx.fill();
    ctx.globalCompositeOperation = 'source-over';
    return;
  }
  const p = locked ? (b.age - b.track) / b.lock : 0, on = !locked || Math.floor(T * 16) % 2 === 0;
  ctx.strokeStyle = rgba(c, on ? 0.9 : 0.35);
  ctx.lineWidth = locked ? 3 : 2;
  ctx.fillStyle = rgba(c, locked ? 0.12 + 0.25 * p : 0.05);
  ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, TAU); ctx.fill(); ctx.stroke();
  const R = b.r * (locked ? 1 - 0.6 * p : 1.25), a = locked ? 0 : T * 4;
  ctx.beginPath();
  for (let i = 0; i < 4; i++) {
    const t = a + i * Math.PI / 2;
    ctx.moveTo(b.x + Math.cos(t) * (R + 10), b.y + Math.sin(t) * (R + 10)); ctx.lineTo(b.x + Math.cos(t) * (R - 8), b.y + Math.sin(t) * (R - 8));
  }
  ctx.stroke();
  if (locked) {
    ctx.font = '800 12px ui-monospace, Menlo, monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = rgba(c, on ? 1 : 0.4);
    ctx.fillText('LOCK', b.x, b.y - b.r - 12);
  }
}
// ワーム: 節の四角がつながった長い体。予告中は出てくる穴（ノイズの円）だけ
function drawWorm(b, T, k) {
  const c = bulletColor(b), th = theme();
  if (b.delay > 0) {
    const p = 1 - b.delay / b.delayMax, on = p > 0.6 || Math.floor(T * 14) % 2 === 0;
    ctx.strokeStyle = rgba(c, on ? 0.9 : 0.35); ctx.lineWidth = 2; ctx.setLineDash([4, 4]);
    ctx.beginPath(); ctx.arc(b.x, b.y, b.r * (2.6 - 1.2 * p), 0, TAU); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = rgba(c, 0.15 + 0.3 * p); ctx.beginPath(); ctx.arc(b.x, b.y, b.r * p, 0, TAU); ctx.fill();
    return;
  }
  if (th.worm) { th.worm(b, c, T, k); return; }
  for (let i = b.segs.length - 1; i >= 0; i--) {
    const s = b.segs[i], R = i ? b.r * 0.8 : b.r;
    ctx.fillStyle = i ? rgba(i % 2 ? c : mixC(c, [255, 255, 255], 0.4), 1) : '#fff';
    ctx.fillRect(s.x - R, s.y - R, R * 2, R * 2);
  }
}
// エラー画面: 予告 = 点線のわく ＋ 読みこみ中のバー → 開く（少し大きくなって止まる）→ 閉じる（縮む）
function drawPopup(b, T, k) {
  const c = bulletColor(b), th = theme();
  const x = b.x - b.w / 2, y = b.y - b.h / 2;
  if (b.delay > 0) {
    const p = 1 - b.delay / b.delayMax, on = p > 0.6 || Math.floor(T * 14) % 2 === 0;
    ctx.strokeStyle = rgba(c, on ? 0.85 : 0.3); ctx.lineWidth = 2; ctx.setLineDash([6, 5]);
    ctx.strokeRect(x, y, b.w, b.h); ctx.setLineDash([]);
    ctx.fillStyle = rgba(c, 0.06 + 0.1 * p); ctx.fillRect(x, y, b.w, b.h);
    ctx.fillStyle = rgba(c, 0.8); ctx.fillRect(x + 12, b.y - 3, (b.w - 24) * p, 6);
    return;
  }
  const open = clamp01(b.age / 0.07), close = b.age > b.hold ? clamp01(1 - (b.age - b.hold) / 0.15) : 1;
  const sc = (0.85 + 0.15 * easeOut(open)) * close;
  ctx.save();
  ctx.translate(b.x, b.y); ctx.scale(sc, sc); ctx.translate(-b.x, -b.y);
  ctx.globalAlpha = b.safe ? 0.6 : 1;
  if (th.popup) th.popup(b, c, x, y, T, k);
  else {
    ctx.fillStyle = '#c0c0c0'; ctx.fillRect(x, y, b.w, b.h);
    ctx.fillStyle = rgba(c, 1); ctx.fillRect(x + 3, y + 3, b.w - 6, 20);
    ctx.font = '700 13px system-ui, sans-serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.fillStyle = '#fff'; ctx.fillText(b.title, x + 9, y + 13);
  }
  ctx.restore();
}
function drawHint(T) {
  const h = stage.hint;
  if (!h || scene !== 'play') return;
  const p = (T - h.t0) / (h.t1 - h.t0);
  if (p < 0 || p > 1) return;
  const a = p < 0.15 ? p / 0.15 : p > 0.75 ? (1 - p) / 0.25 : 1;
  if (theme().hint) { theme().hint(h, a, T); return; }   // 見た目のセットが、ヒントの出し方を決めている
  ctx.save();
  ctx.globalAlpha = clamp01(a) * (Math.floor(T * 8) % 2 ? 1 : 0.75);
  ctx.font = '800 30px ui-monospace, Menlo, Consolas, monospace';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.lineWidth = 5; ctx.strokeStyle = 'rgba(0,0,0,0.6)';
  ctx.strokeText(h.text, W / 2, H * 0.3);
  ctx.fillStyle = '#ffe36e';
  ctx.fillText(h.text, W / 2, H * 0.3);
  ctx.restore();
}

// ---- 弾 --------------------------------------------------------------------
function drawBullets(T, look, k) {
  const th = theme();
  // UFO とレーザー（予告もビームも）は弾の下に描く
  for (const b of bullets) {
    if (b.kind === 'laser') drawLaser(b, T, k);
    else if (b.kind === 'ufo') drawUfo(b.x, b.y, b.size, bulletColor(b), 1, T, k, b.firedAt != null ? clamp01(1 - (b.age - b.firedAt) * 4) : 0);
    else if (b.kind === 'pane') drawPane(b, T, k);
    else if (b.kind === 'crack') drawCrack(b, T, k);
    else if (b.kind === 'key') drawKey(b, T, k);
    else if (b.kind === 'lock') drawLock(b, T);
    else if (b.kind === 'worm') drawWorm(b, T, k);
    else if (b.kind === 'popup') drawPopup(b, T, k);
    else if (th.kinds && th.kinds[b.kind]) th.kinds[b.kind](b, T, k);   // 見た目のセットだけが描く形（深海の生き物など）
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
    if (!th.noGlow && (gfx === 2 || (gfx === 1 && b.r >= 12))) {   // noGlow: その見た目のセットは光のにじみを描かない（軽くする）
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
    if (b.tx != null) {                            // プリズム弾: 次に曲がる向き
      ctx.strokeStyle = rgba(c, 0.5);
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 4]);
      ctx.beginPath(); ctx.moveTo(b.x, b.y); ctx.lineTo(b.x + b.tx * 46, b.y + b.ty * 46); ctx.stroke();
      ctx.setLineDash([]);
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
  if (theme().laser && theme().laser(b, c, T, k) === true) return;    // 見た目のセットの飾り（UFO など）。true なら、ビームも全部そちらが描く
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
      for (const f of [0.2, 0.5, 0.8]) ctx.fillText(b.label, b.x1 + (b.x2 - b.x1) * f, b.y1 - 26 - 6 * p);
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

// ガラスの板: うすい板 ＋ ふちの光 ＋ 中心から広がっていくひび（全部広がったら割れる）。当たらない
function drawPane(b, T, k) {
  const c = bulletColor(b), R = b.rect, p = b.p || 0;
  const jit = p > 0.85 ? (Math.random() - 0.5) * 3 * (p - 0.85) / 0.15 : 0;
  ctx.save();
  ctx.translate(jit, jit * 0.5);
  ctx.fillStyle = rgba(c, 0.05 + 0.07 * p);
  ctx.fillRect(R.x, R.y, R.w, R.h);
  ctx.strokeStyle = rgba(mixC(c, [255, 255, 255], 0.5), 0.35 + 0.4 * p);
  ctx.lineWidth = 2;
  ctx.strokeRect(R.x, R.y, R.w, R.h);
  ctx.strokeStyle = rgba([255, 255, 255], 0.12 + 0.1 * p);       // 光の映りこみ（ななめの2本線）
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(R.x + R.w * 0.12, R.y + R.h); ctx.lineTo(R.x + R.w * 0.32, R.y);
  ctx.moveTo(R.x + R.w * 0.22, R.y + R.h); ctx.lineTo(R.x + R.w * 0.36, R.y);
  ctx.stroke();
  // ひび: 進みぐあい p に合わせて、中心から伸びる
  const reach = p * 7;
  ctx.strokeStyle = rgba([255, 255, 255], 0.55 + 0.4 * p);
  ctx.lineWidth = 1.2 + p;
  ctx.lineJoin = 'miter';
  ctx.beginPath();
  for (const pts of b.cracks) {
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length && i - 1 < reach; i++) {
      const f = Math.min(1, reach - (i - 1));
      ctx.lineTo(pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * f, pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * f);
    }
  }
  b.rings.forEach((ring, j) => {
    if (p < 0.45 + j * 0.3) return;
    ring.forEach((q, i) => { if (i === 0) ctx.moveTo(q[0], q[1]); else ctx.lineTo(q[0], q[1]); });
    ctx.closePath();
  });
  ctx.stroke();
  ctx.fillStyle = rgba([255, 255, 255], 0.5 + 0.5 * p);          // ひびの中心（当たったところ）
  ctx.beginPath(); ctx.arc(b.hx, b.hy, 3 + 4 * p, 0, TAU); ctx.fill();
  ctx.restore();
}

// ひび割れ: 予告中はうすいギザギザの線。始まったら根もとから明るい線が伸びる
function drawCrack(b, T, k) {
  const c = bulletColor(b);
  const path = full => {
    ctx.beginPath();
    for (const s of b.segs) {
      if (full) { ctx.moveTo(s[0], s[1]); ctx.lineTo(s[2], s[3]); continue; }
      if (s[4] >= b.reach) continue;
      const l = Math.hypot(s[2] - s[0], s[3] - s[1]), f = Math.min(1, (b.reach - s[4]) / l);
      ctx.moveTo(s[0], s[1]); ctx.lineTo(s[0] + (s[2] - s[0]) * f, s[1] + (s[3] - s[1]) * f);
    }
  };
  ctx.lineCap = 'round';
  if (b.delay > 0) {
    const p = b.delayMax > 0 ? 1 - b.delay / b.delayMax : 1, on = p > 0.6 || Math.floor(T * 14) % 2 === 0;
    ctx.strokeStyle = rgba(c, 0.06 + 0.1 * p); ctx.lineWidth = b.r * 2; path(true); ctx.stroke();
    ctx.strokeStyle = rgba(c, on ? 0.3 + 0.45 * p : 0.12); ctx.lineWidth = 1.2; path(true); ctx.stroke();
    ctx.fillStyle = rgba(c, 0.5 + 0.4 * p);
    ctx.beginPath(); ctx.arc(b.x, b.y, 4 + 3 * p, 0, TAU); ctx.fill();
    return;
  }
  const fade = b.safe ? clamp01(1 - (b.reach - b.reachMax - b.hold * b.speed) / (0.3 * b.speed)) : 1;
  ctx.globalCompositeOperation = 'lighter';
  if (gfx > 0) { ctx.strokeStyle = rgba(c, 0.25 * fade); ctx.lineWidth = b.r * 2 + 8; path(false); ctx.stroke(); }
  ctx.strokeStyle = rgba(c, 0.85 * fade); ctx.lineWidth = b.r * 2 * (b.safe ? fade : 1); path(false); ctx.stroke();
  ctx.strokeStyle = rgba([255, 255, 255], 0.95 * fade); ctx.lineWidth = Math.max(1, b.r * 0.6); path(false); ctx.stroke();
  ctx.globalCompositeOperation = 'source-over';
}

// 鍵盤ブロック: 予告中は落ちてくる列がうすく光る。落ちてきたら縦長の光るブロック（地面より下は見えない）
function drawKey(b, T, k) {
  const c = bulletColor(b), x0 = b.x - b.w / 2;
  if (b.delay > 0) {
    const p = b.delayMax > 0 ? 1 - b.delay / b.delayMax : 1;
    const g = ctx.createLinearGradient(0, 0, 0, GROUND_Y);
    g.addColorStop(0, rgba(c, 0.02)); g.addColorStop(1, rgba(c, 0.08 + 0.14 * p));
    ctx.fillStyle = g;
    ctx.fillRect(x0, 0, b.w, GROUND_Y);
    ctx.fillStyle = rgba(c, 0.4 + 0.5 * p);
    ctx.fillRect(x0 + 3, GROUND_Y - 4, b.w - 6, 3);
    return;
  }
  const top = b.y - b.h, bot = Math.min(b.y, GROUND_Y);
  if (bot <= top) return;
  if (gfx > 0) {
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = rgba(c, 0.16);
    ctx.fillRect(x0 - 6, top - 6, b.w + 12, bot - top + 6);
    ctx.globalCompositeOperation = 'source-over';
  }
  const g = ctx.createLinearGradient(0, top, 0, bot);
  g.addColorStop(0, rgba(mixC(c, [255, 255, 255], 0.5), 0.95)); g.addColorStop(1, rgba(c, 0.85));
  ctx.fillStyle = g;
  roundRect(x0, top, b.w, bot - top, 5);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.9)';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  if (b.landed) {                                        // 鍵盤が押されている光
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = rgba(c, 0.5);
    ctx.fillRect(x0 - 4, GROUND_Y - 3, b.w + 8, 6);
    ctx.globalCompositeOperation = 'source-over';
  }
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

// ひねり「暗やみ」: 自分のまわりだけ明るい。穴のあいた黒い絵（1 回だけ作る）を、プレイヤーの位置に貼る
let darkSprite = null;
function drawDarkness() {
  const R = 520;
  if (!darkSprite) {
    darkSprite = document.createElement('canvas'); darkSprite.width = darkSprite.height = 256;
    const g = darkSprite.getContext('2d'), gr = g.createRadialGradient(128, 128, 0, 128, 128, 128);
    gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(0.3, 'rgba(0,0,0,0.05)'); gr.addColorStop(0.55, 'rgba(0,0,0,0.92)'); gr.addColorStop(1, 'rgba(0,0,0,0.97)');
    g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
  }
  const p = playerXY(), x = p.x - R, y = p.y - R;
  ctx.drawImage(darkSprite, x, y, R * 2, R * 2);
  ctx.fillStyle = 'rgba(0,0,0,0.97)';
  ctx.fillRect(x - 3000, y - 3000, 3000, R * 2 + 6000); ctx.fillRect(x + R * 2, y - 3000, 3000, R * 2 + 6000);
  ctx.fillRect(x, y - 3000, R * 2, 3000); ctx.fillRect(x, y + R * 2, R * 2, 3000);
}

// 形のある粒（スキンの「動いた跡」で使う）
const PARTICLE_SHAPES = {
  heart(x, y, s) { ctx.beginPath(); ctx.moveTo(x, y + s * 0.45); ctx.bezierCurveTo(x - s, y - s * 0.2, x - s * 0.45, y - s * 0.9, x, y - s * 0.35); ctx.bezierCurveTo(x + s * 0.45, y - s * 0.9, x + s, y - s * 0.2, x, y + s * 0.45); ctx.fill(); },
  note(x, y, s) { ctx.beginPath(); ctx.ellipse(x - s * 0.2, y + s * 0.3, s * 0.32, s * 0.24, -0.4, 0, TAU); ctx.fill(); ctx.fillRect(x + s * 0.06, y - s * 0.6, s * 0.12, s * 0.9); ctx.fillRect(x + s * 0.06, y - s * 0.6, s * 0.4, s * 0.14); },
  star(x, y, s) { ctx.beginPath(); for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4, r = i % 2 ? s * 0.18 : s * 0.6; ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); } ctx.fill(); },
  leaf(x, y, s) { ctx.beginPath(); ctx.ellipse(x, y, s * 0.5, s * 0.22, x * 0.05, 0, TAU); ctx.fill(); },
  bolt(x, y, s) { ctx.beginPath(); ctx.moveTo(x + s * 0.1, y - s * 0.6); ctx.lineTo(x - s * 0.3, y + s * 0.05); ctx.lineTo(x, y + s * 0.05); ctx.lineTo(x - s * 0.1, y + s * 0.6); ctx.lineTo(x + s * 0.3, y - s * 0.1); ctx.lineTo(x, y - s * 0.1); ctx.closePath(); ctx.fill(); },
  snow(x, y, s) { const t = s * 0.1; for (let i = 0; i < 3; i++) { ctx.save(); ctx.translate(x, y); ctx.rotate(i * Math.PI / 3); ctx.fillRect(-s * 0.45, -t / 2, s * 0.9, t); ctx.restore(); } },
};
function drawParticles() {
  ctx.globalCompositeOperation = 'lighter';
  let last = null;
  for (const p of fx.particles) {                // 色の文字列は粒ごとに 1 回だけ作り、うすさは globalAlpha で（毎コマ文字列を作らない）
    const a = p.life / p.max;
    const s = p.size * (0.4 + 0.6 * a);
    const cs = p.cs || (p.cs = `rgb(${p.c[0] | 0},${p.c[1] | 0},${p.c[2] | 0})`);
    if (cs !== last) { ctx.fillStyle = cs; last = cs; }
    ctx.globalAlpha = Math.max(0, Math.min(1, a));
    if (p.shape) PARTICLE_SHAPES[p.shape](p.x, p.y, s);
    else ctx.fillRect(p.x - s / 2, p.y - s / 2, s, s);
  }
  ctx.globalAlpha = 1;
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
const heroEcho = [];
function drawHero(look, k) {
  if (scene === 'over' && fx.deathT > 0.05) return;         // やられたら消える
  const skin = typeof heroSkin === 'function' ? heroSkin() : HERO_DEFAULT;

  // 残像
  for (const g of fx.ghosts) {
    roundRect(g.x, g.y, player.w, player.h, 5);
    ctx.fillStyle = rgba(look.color, g.a * 0.45);
    ctx.fill();
  }
  // やわらかい光（スキンの色）
  const p = playerXY();
  if (gfx > 0) {
    ctx.globalCompositeOperation = 'lighter';
    const G = 30 + 6 * k;
    ctx.globalAlpha = 0.45;
    ctx.drawImage(glowSprite(rgb(skin.glow)), p.x - G, p.y - G, G * 2, G * 2);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
  }
  heroTrail(skin, p);

  // 無敵中は点滅
  if (invuln > 0 && Math.floor(invuln * 12) % 2 === 0) return;

  // タイトル画面では拍に合わせて小さく跳ねる
  const bob = scene === 'title' ? -Math.abs(Math.sin(titleBeat() * Math.PI)) * 6 : 0;

  ctx.save();
  if (stage.gravVis < 0.999) {                                   // 重力バグ: 上下さかさまに立つ
    const cy = player.y + player.h / 2;
    ctx.translate(0, cy); ctx.scale(1, Math.abs(stage.gravVis) < 0.05 ? 0.05 * Math.sign(stage.gravVis || 1) : stage.gravVis); ctx.translate(0, -cy);
  }
  const s = player.squash;
  const sx = 1 - s * 0.18, sy = 1 + s * 0.18;
  const cx = player.x + player.w / 2;
  const baseY = player.y + player.h + bob;
  const w = player.w * sx, h = player.h * sy;
  const x = cx - w / 2, y = baseY - h;

  if (player.onGround) {
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath();
    ctx.ellipse(cx, player.y + player.h + 2, w * 0.55, 4, 0, 0, TAU);
    ctx.fill();
  }
  const moving = player.onGround && Math.abs(player.vx) > 20;
  if (skin.fx === 'echo') {                                       // 残像のスキン: 少し前の位置に、うすい自分が 2 人ついてくる
    heroEcho.push({ x, y, baseY, f: player.facing });
    if (heroEcho.length > 12) heroEcho.shift();
    for (const [i, a] of [[0, 0.18], [5, 0.32]]) {
      const e = heroEcho[i];
      if (!e || (Math.abs(e.x - x) < 2 && Math.abs(e.y - y) < 2)) continue;
      ctx.save(); ctx.globalAlpha = a; paintHero(ctx, e.x, e.y, w, h, e.f, e.baseY, 0, skin); ctx.restore();
    }
  }
  paintHero(ctx, x, y, w, h, player.facing, baseY, moving ? Math.sin(elapsed * 18) * 2 : 0, skin);
  ctx.restore();
}

// プレイヤーの絵（スキンの色・頭の飾り・うしろの飾り・光）。コレクションの画面の見本も、これで描く
//   acc は 1 つでも配列でもよい。うしろに描くもの: wings 羽 / cape マント / katana 刀
//   前に描くもの: crown halo horns mohawk phones ribbon ears / visor バイザー / mask 忍者の覆面 / scarf マフラー / headband はちまき / flamehair 燃える髪
//   hair: ぼうしのかわりに髪（色）、aura: まわりに光るふち（色）、fx: 'rainbow' = 服の色が虹色に変わり続ける
const HERO_DEFAULT = { body: '#3b6cf0', cap: '#e24b4a', brim: '#c43a39', skin: '#f4c9a0', shoe: '#5a3a22', glow: '#7fb4ff' };
function paintHero(g, x, y, w, h, f, baseY, wob, sk) {
  const rr = (X, Y, W2, H2, R) => { g.beginPath(); g.roundRect ? g.roundRect(X, Y, W2, H2, R) : g.rect(X, Y, W2, H2); };
  const acc = [].concat(sk.acc || []), has = k => acc.includes(k);
  const t = performance.now() / 1000;
  const cx = x + w / 2, bodyTop = y + h * 0.45;
  const body = sk.fx === 'rainbow' ? `hsl(${(t * 90) % 360}, 85%, 62%)` : sk.body;
  g.save();
  if (sk.alpha) g.globalAlpha *= sk.alpha;
  // ---- うしろ ----
  if (sk.magicCircle) paintMagicCircle(g, cx, y + h * 0.55, w, h, sk.magicCircle, t);
  if (sk.orbs) paintOrbs(g, sk.orbs, cx, y, w, h, t, -1);
  if (sk.sig) paintSig(g, sk, x, y, w, h, f, cx, bodyTop, baseY, t, false);
  if (has('tails')) paintTails(g, sk, cx, f, w, h, baseY, t);
  if (has('bigbow')) paintBigBow(g, sk.bigbow || '#ff5c8a', cx - f * w * 0.42, bodyTop + h * 0.2, w, h, t);
  if (sk.aura) {                                                 // 光るふち（ゆっくり脈打つ）
    const pulse = 0.55 + 0.45 * Math.sin(t * 4);
    g.save(); g.globalCompositeOperation = 'lighter';
    g.strokeStyle = sk.aura; g.globalAlpha *= 0.18 + 0.12 * pulse; g.lineWidth = 9;
    rr(x - 3, y - 3, w + 6, baseY - y + 5, 9); g.stroke();
    g.globalAlpha = (sk.alpha || 1) * (0.35 + 0.25 * pulse); g.lineWidth = 2.5; g.stroke();
    g.restore();
  }
  if (has('wings')) {                                            // 羽（はばたく）。wingStyle: feather / bat / butterfly / mech / light
    const st = sk.wingStyle || 'feather', flap = Math.sin(t * (st === 'butterfly' ? 10 : 7)) * (st === 'mech' ? 0.08 : 0.25), wc = sk.wing || '#ffffff';
    for (const sgn of [-1, 1]) {
      g.save(); g.translate(cx + sgn * w * 0.3, bodyTop + h * 0.08); g.rotate(sgn * (-0.35 + flap)); g.scale(sgn, 1);
      if (st !== 'feather') { paintWing(g, st, w, h, wc, t); g.restore(); continue; }
      g.fillStyle = wc; g.beginPath(); g.moveTo(0, 0);
      g.quadraticCurveTo(w * 0.9, -h * 0.55, w * 1.15, -h * 0.25);
      g.quadraticCurveTo(w * 0.95, -h * 0.1, w * 1.05, h * 0.05);
      g.quadraticCurveTo(w * 0.8, h * 0.05, w * 0.85, h * 0.25);
      g.quadraticCurveTo(w * 0.5, h * 0.2, 0, h * 0.2); g.closePath(); g.fill();
      g.strokeStyle = 'rgba(0,0,0,0.18)'; g.lineWidth = 1;
      for (const k of [0.45, 0.7]) { g.beginPath(); g.moveTo(w * 0.2, h * 0.05); g.lineTo(w * (0.5 + k * 0.5), -h * 0.25 * k + h * 0.08); g.stroke(); }
      g.restore();
    }
  }
  if (has('cape')) {                                             // マント（進む向きと反対へなびく）
    const sway = Math.sin(t * 5) * w * 0.1, back = cx - f * w * 0.5;     // 背中側
    g.fillStyle = sk.cape || '#c8102e'; g.beginPath();
    g.moveTo(cx + f * w * 0.25, bodyTop - h * 0.02);
    g.quadraticCurveTo(back - f * w * 0.35, bodyTop + h * 0.1, back - f * w * 0.7 + sway, baseY + 2);
    g.lineTo(back - f * w * 0.1 + sway * 0.5, baseY + 4);
    g.lineTo(cx + f * w * 0.1, baseY - h * 0.2);
    g.closePath(); g.fill();
    g.strokeStyle = 'rgba(0,0,0,0.25)'; g.lineWidth = 1;
    g.beginPath(); g.moveTo(back, bodyTop + h * 0.1); g.lineTo(back - f * w * 0.4 + sway, baseY); g.stroke();
  }
  if (has('backpack')) {                                         // リュック
    g.fillStyle = sk.pack || '#e0a030'; rr(cx - f * w * 0.62 - w * 0.2, bodyTop - h * 0.02, w * 0.4, h * 0.42, 5); g.fill();
    g.fillStyle = 'rgba(0,0,0,0.2)'; g.fillRect(cx - f * w * 0.62 - w * 0.14, bodyTop + h * 0.2, w * 0.28, h * 0.08);
  }
  if (has('jetpack')) {                                          // ジェットパック（炎がゆれる）
    const jx = cx - f * w * 0.6;
    for (const dx of [-w * 0.14, w * 0.14]) {
      g.fillStyle = '#8a94a8'; rr(jx + dx - w * 0.11, bodyTop - h * 0.05, w * 0.22, h * 0.42, 4); g.fill();
      const fl = h * (0.18 + 0.1 * Math.sin(t * 30 + dx));
      g.fillStyle = '#ff8a1a'; g.beginPath(); g.moveTo(jx + dx - w * 0.09, bodyTop + h * 0.37); g.lineTo(jx + dx, bodyTop + h * 0.37 + fl); g.lineTo(jx + dx + w * 0.09, bodyTop + h * 0.37); g.fill();
      g.fillStyle = '#ffe066'; g.beginPath(); g.moveTo(jx + dx - w * 0.045, bodyTop + h * 0.37); g.lineTo(jx + dx, bodyTop + h * 0.37 + fl * 0.6); g.lineTo(jx + dx + w * 0.045, bodyTop + h * 0.37); g.fill();
    }
  }
  if (has('guitar')) {                                           // 背中のギター
    g.save(); g.translate(cx - f * w * 0.3, bodyTop + h * 0.3); g.rotate(f * 0.6);
    g.fillStyle = '#3a2418'; g.fillRect(-1.5, -h * 0.85, 3, h * 0.7);
    g.fillStyle = sk.guitar || '#d81e1e'; g.beginPath(); g.ellipse(0, 0, w * 0.3, h * 0.2, 0, 0, TAU); g.fill();
    g.beginPath(); g.ellipse(0, -h * 0.2, w * 0.22, h * 0.13, 0, 0, TAU); g.fill();
    g.fillStyle = '#111'; g.beginPath(); g.arc(0, -h * 0.08, w * 0.07, 0, TAU); g.fill();
    g.restore();
  }
  if (has('katana')) {                                           // 背中の刀
    g.save(); g.translate(cx - f * w * 0.15, bodyTop + h * 0.25); g.rotate(-f * 0.85);
    g.fillStyle = sk.blade || '#d8dde8'; g.fillRect(-1.5, -h * 1.05, 3, h * 0.78);
    g.fillStyle = '#ffffff'; g.fillRect(-0.5, -h * 1.05, 1, h * 0.78);
    g.fillStyle = '#d9a520'; g.fillRect(-4, -h * 0.29, 8, 2.5);
    g.fillStyle = '#2a1018'; g.fillRect(-2, -h * 0.27, 4, h * 0.3);
    g.restore();
  }
  if (sk.hairStyle) paintHairBack(g, x, y, w, h, f, cx, sk, t);
  // ---- 体 ----
  rr(x, bodyTop, w, h - (bodyTop - y), 5); g.fillStyle = body; g.fill();
  if (sk.dress || sk.armor || sk.gown || sk.sleeves) paintOutfit(g, x, y, w, h, f, cx, bodyTop, baseY, sk, t);
  rr(x + w * 0.08, y + h * 0.06, w * 0.84, h * 0.46, 6); g.fillStyle = sk.skin; g.fill();
  if (has('mohawk')) {                                           // モヒカン（ぼうしのかわり）
    g.fillStyle = sk.cap; g.beginPath(); g.moveTo(cx - w * 0.22, y + h * 0.1);
    for (let i = 0; i <= 4; i++) g.lineTo(cx - w * 0.22 + i * w * 0.11 + w * 0.055, y - h * (i % 2 ? 0.05 : 0.22));
    g.lineTo(cx + w * 0.3, y + h * 0.1); g.closePath(); g.fill();
  } else if (has('flamehair')) {                                 // 燃える髪（ゆらゆら）
    const [c1, c2] = sk.flame || ['#ff4a1a', '#ffe066'];
    for (const [col, k] of [[c1, 1], [c2, 0.55]]) {
      g.fillStyle = col; g.beginPath(); g.moveTo(x + w * 0.04, y + h * 0.16);
      for (let i = 0; i <= 5; i++) {
        const px = x + w * (0.04 + i * 0.184), tip = y - h * k * (0.18 + 0.12 * Math.sin(t * 13 + i * 1.7) + (i % 2 ? 0 : 0.08));
        g.quadraticCurveTo(px - w * 0.05, y, px, tip);
      }
      g.lineTo(x + w * 0.96, y + h * 0.16); g.closePath(); g.fill();
    }
  } else if (sk.hairStyle) {                                     // ガチャ限定スキンの髪（前髪・横の髪）
    paintHairFront(g, x, y, w, h, f, cx, sk);
  } else if (sk.hair) {                                          // 髪（ぼうしなし）
    rr(x + w * 0.04, y - 1, w * 0.92, h * 0.17, 6); g.fillStyle = sk.hair; g.fill();
    g.beginPath(); g.rect(f >= 0 ? x + w * 0.04 : x + w * 0.66, y + h * 0.1, w * 0.3, h * 0.08); g.fill();
  } else {
    rr(x + w * 0.02, y, w * 0.96, h * 0.20, 5); g.fillStyle = sk.cap || sk.body; g.fill();   // ぼうしの色がないスキン（髪のスキンにパーツを重ねた時など）は服の色
    g.fillStyle = sk.brim || sk.cap || sk.body; g.beginPath();
    if (f >= 0) g.rect(x + w * 0.55, y + h * 0.16, w * 0.55, h * 0.06);
    else        g.rect(x - w * 0.10, y + h * 0.16, w * 0.55, h * 0.06);
    g.fill();
  }
  const eyeY = y + h * 0.30, eyeR = Math.max(1.6, w * 0.07), ex = cx + f * w * 0.10;
  if (has('visor')) {                                            // 光るバイザー（目のかわり）
    g.fillStyle = '#0c0c14'; rr(x + w * 0.06, eyeY - h * 0.07, w * 0.88, h * 0.13, 3); g.fill();
    g.save(); g.globalCompositeOperation = 'lighter'; g.fillStyle = sk.visor || '#22e6ff';
    g.globalAlpha *= 0.75 + 0.25 * Math.sin(t * 6);
    g.fillRect(x + w * 0.12, eyeY - h * 0.02, w * 0.76, Math.max(1.5, h * 0.04));
    g.fillRect(ex - w * 0.06 + f * w * 0.12, eyeY - h * 0.035, w * 0.12, h * 0.07);
    g.restore();
  } else if (sk.eyes) {
    paintEyes(g, sk, ex, eyeY, eyeR, w, cx, t);
  } else {
    g.fillStyle = '#222a3a';
    g.beginPath(); g.arc(ex - w * 0.12, eyeY, eyeR, 0, TAU); g.fill();
    g.beginPath(); g.arc(ex + w * 0.12, eyeY, eyeR, 0, TAU); g.fill();
  }
  if (has('mask')) { g.fillStyle = sk.maskColor || '#14141e'; rr(x + w * 0.08, y + h * 0.37, w * 0.84, h * 0.15, 3); g.fill(); }
  paintFace(g, has, x, y, w, h, f, cx, eyeY, ex, sk, t);
  if (has('headband')) {                                         // はちまき（うしろに結び目のはし）
    g.fillStyle = sk.band || '#d81e1e';
    g.fillRect(x + w * 0.04, y + h * 0.15, w * 0.92, h * 0.06);
    const bx = f >= 0 ? x + w * 0.04 : x + w * 0.96, wv = Math.sin(t * 9) * h * 0.04;
    g.beginPath(); g.moveTo(bx, y + h * 0.16); g.lineTo(bx - f * w * 0.42, y + h * 0.12 + wv); g.lineTo(bx - f * w * 0.38, y + h * 0.2 + wv); g.closePath(); g.fill();
  }
  if (has('scarf')) {                                            // マフラー（うしろへなびく）
    g.fillStyle = sk.scarf || '#d81e1e';
    g.fillRect(x - 1, bodyTop - h * 0.02, w + 2, h * 0.09);
    const sx2 = f >= 0 ? x : x + w, wv = Math.sin(t * 8) * h * 0.05;
    g.beginPath(); g.moveTo(sx2, bodyTop); g.quadraticCurveTo(sx2 - f * w * 0.4, bodyTop + wv, sx2 - f * w * 0.75, bodyTop + h * 0.04 - wv);
    g.lineTo(sx2 - f * w * 0.7, bodyTop + h * 0.12 - wv); g.quadraticCurveTo(sx2 - f * w * 0.35, bodyTop + h * 0.1 + wv, sx2, bodyTop + h * 0.08); g.closePath(); g.fill();
  }
  g.fillStyle = sk.gown ? 'rgba(0,0,0,0)' : sk.shoe;                // ロングドレスは足までかくれる
  const footW = w * 0.34, footH = h * 0.10, footY = baseY - footH;
  rr(x + w * 0.06, footY - wob, footW, footH, 3); g.fill();
  rr(x + w * 0.60, footY + wob, footW, footH, 3); g.fill();
  // 頭の飾り
  paintHat(g, has, x, y, w, h, f, cx, sk, t);
  if (has('crown')) {
    g.fillStyle = sk.crownColor || '#ffd23f'; g.strokeStyle = 'rgba(0,0,0,0.35)'; g.lineWidth = 1;
    g.beginPath(); g.moveTo(cx - w * 0.3, y + 1); g.lineTo(cx - w * 0.3, y - h * 0.2); g.lineTo(cx - w * 0.15, y - h * 0.08);
    g.lineTo(cx, y - h * 0.26); g.lineTo(cx + w * 0.15, y - h * 0.08); g.lineTo(cx + w * 0.3, y - h * 0.2); g.lineTo(cx + w * 0.3, y + 1); g.closePath(); g.fill(); g.stroke();
    g.fillStyle = '#ff3b6b'; g.beginPath(); g.arc(cx, y - h * 0.06, Math.max(1.5, w * 0.06), 0, TAU); g.fill();
  }
  if (has('halo')) {
    g.strokeStyle = sk.haloColor || '#fff1a8'; g.lineWidth = 2.5;
    g.beginPath(); g.ellipse(cx, y - h * (has('crown') ? 0.36 : 0.16), w * 0.36, h * 0.07, 0, 0, TAU); g.stroke();
  }
  if (has('horns')) {
    g.fillStyle = sk.hornColor || '#2a0a10';
    for (const sgn of [-1, 1]) { g.beginPath(); g.moveTo(cx + sgn * w * 0.18, y + 2); g.lineTo(cx + sgn * w * 0.42, y - h * 0.22); g.lineTo(cx + sgn * w * 0.34, y + 3); g.closePath(); g.fill(); }
  }
  if (has('phones')) {
    g.strokeStyle = '#e8e8f0'; g.lineWidth = 2.5;
    g.beginPath(); g.arc(cx, y + h * 0.22, w * 0.52, Math.PI * 1.08, Math.PI * 1.92); g.stroke();
    g.fillStyle = '#ff4fa3';
    for (const sgn of [-1, 1]) { rr(cx + sgn * w * 0.5 - w * 0.1, y + h * 0.18, w * 0.2, h * 0.2, 3); g.fill(); }
  }
  if (has('ears')) {                                             // ねこみみ
    for (const sgn of [-1, 1]) {
      g.fillStyle = sk.cap; g.beginPath(); g.moveTo(cx + sgn * w * 0.12, y + 2); g.lineTo(cx + sgn * w * 0.4, y - h * 0.2); g.lineTo(cx + sgn * w * 0.46, y + 3); g.closePath(); g.fill();
      g.fillStyle = '#ffb3c4'; g.beginPath(); g.moveTo(cx + sgn * w * 0.22, y + 1); g.lineTo(cx + sgn * w * 0.39, y - h * 0.11); g.lineTo(cx + sgn * w * 0.41, y + 2); g.closePath(); g.fill();
    }
  }
  if (has('ribbon')) {
    g.fillStyle = sk.ribbonColor || '#ff5c8a'; const rx = cx - f * w * 0.32, ry = y + h * 0.05, R = w * 0.16;
    g.beginPath(); g.moveTo(rx, ry); g.lineTo(rx - R * 1.6, ry - R); g.lineTo(rx - R * 1.6, ry + R); g.closePath(); g.fill();
    g.beginPath(); g.moveTo(rx, ry); g.lineTo(rx + R * 1.6, ry - R); g.lineTo(rx + R * 1.6, ry + R); g.closePath(); g.fill();
    g.beginPath(); g.arc(rx, ry, R * 0.5, 0, TAU); g.fill();
  }
  if (has('tiara')) paintTiara(g, cx, y, w, h, sk, t);
  if (sk.orbs) paintOrbs(g, sk.orbs, cx, y, w, h, t, 1);
  if (sk.sig) paintSig(g, sk, x, y, w, h, f, cx, bodyTop, baseY, t, true);
  if (sk.sparkle) {                                              // まわりを回る、きらきらの星
    g.save(); g.globalCompositeOperation = 'lighter'; g.fillStyle = sk.sparkle;
    for (let i = 0; i < 4; i++) {
      const a = t * 1.3 + i * TAU / 4, px = cx + Math.cos(a) * w * 0.85, py = y + h * 0.45 + Math.sin(a) * h * 0.6;
      const r = w * 0.13 * (0.35 + 0.65 * Math.abs(Math.sin(t * 4 + i * 1.9)));
      g.beginPath(); g.moveTo(px, py - r); g.quadraticCurveTo(px, py, px + r, py); g.quadraticCurveTo(px, py, px, py + r);
      g.quadraticCurveTo(px, py, px - r, py); g.quadraticCurveTo(px, py, px, py - r); g.fill();
    }
    g.restore();
  }
  g.restore();
}

// ---- ガチャ限定スキンの髪・目・服 ----
// うしろの髪（体より先に描く）: long 長い髪 / twin ツインテール / pony ポニーテール
function paintHairBack(g, x, y, w, h, f, cx, sk, t) {
  const st = sk.hairStyle, sw = Math.sin(t * 5) * w * 0.06;
  g.fillStyle = sk.hair;
  if (st === 'long') {
    const bot = y + h * 0.8;
    g.beginPath(); g.moveTo(x - w * 0.02, y + h * 0.08);
    g.quadraticCurveTo(x - w * 0.14, y + h * 0.45, x - w * 0.1 + sw, bot);
    for (let i = 1; i <= 4; i++) g.quadraticCurveTo(x - w * 0.1 + w * 1.2 * (i - 0.5) / 4 + sw, bot + h * 0.07, x - w * 0.1 + w * 1.2 * i / 4 + sw, bot);
    g.quadraticCurveTo(x + w * 1.14, y + h * 0.45, x + w * 1.02, y + h * 0.08); g.closePath(); g.fill();
    g.fillStyle = 'rgba(0,0,0,0.14)'; g.fillRect(x - w * 0.06, y + h * 0.5, w * 1.12, h * 0.05);
  } else if (st === 'drill') {                                   // 縦ロール（くるくる）
    for (const sgn of [-1, 1]) {
      const bx = cx + sgn * w * 0.56, bob = Math.sin(t * 5 + sgn) * h * 0.015;
      for (let i = 0; i < 5; i++) {
        const yy = y + h * (0.16 + i * 0.13) + bob * i, rx = w * (0.17 - i * 0.022), ry = h * 0.085;
        g.fillStyle = sk.hair; g.beginPath(); g.ellipse(bx, yy, rx, ry, sgn * 0.3, 0, TAU); g.fill();
        g.strokeStyle = 'rgba(0,0,0,0.18)'; g.lineWidth = 1; g.beginPath(); g.ellipse(bx, yy, rx, ry, sgn * 0.3, 0.2, 2.6); g.stroke();
        g.fillStyle = 'rgba(255,255,255,0.35)'; g.beginPath(); g.ellipse(bx - sgn * rx * 0.3, yy - ry * 0.4, rx * 0.35, ry * 0.25, 0, 0, TAU); g.fill();
      }
    }
    g.fillStyle = sk.hair; g.beginPath(); g.ellipse(cx, y + h * 0.2, w * 0.56, h * 0.2, 0, Math.PI, 0); g.fill();
  } else if (st === 'twin' || st === 'pony') {
    const tails = st === 'twin' ? [[-1, cx - w * 0.5], [1, cx + w * 0.5]] : [[-(f || 1), cx - f * w * 0.42]];
    for (const [sgn, tx] of tails) {
      g.save(); g.translate(tx, y + h * (st === 'pony' ? 0.04 : 0.12)); g.scale(sgn, 1); g.rotate(0.2 + Math.sin(t * 6 + sgn) * 0.14);
      g.fillStyle = sk.hair; g.beginPath(); g.moveTo(-w * 0.06, 0);
      g.quadraticCurveTo(w * 0.5, h * 0.2, w * 0.16, h * 0.74); g.quadraticCurveTo(w * 0.02, h * 0.4, -w * 0.06, 0); g.fill();
      g.fillStyle = 'rgba(255,255,255,0.22)'; g.beginPath(); g.moveTo(w * 0.04, h * 0.06); g.quadraticCurveTo(w * 0.3, h * 0.22, w * 0.14, h * 0.55); g.quadraticCurveTo(w * 0.12, h * 0.3, w * 0.04, h * 0.06); g.fill();
      g.fillStyle = sk.tie || '#ff5c8a'; g.beginPath(); g.arc(0, 0, w * 0.1, 0, TAU); g.fill();
      g.restore();
    }
  }
}
// 前髪・横の髪（顔の上に描く）。spiky は、つんつんの髪
function paintHairFront(g, x, y, w, h, f, cx, sk) {
  g.fillStyle = sk.hair;
  if (sk.hairStyle === 'spiky') {
    g.beginPath(); g.moveTo(x - w * 0.06, y + h * 0.22);
    const pts = [[-0.1, -0.06], [0.08, -0.2], [0.22, -0.02], [0.4, -0.26], [0.55, -0.04], [0.72, -0.22], [0.86, -0.02], [1.1, -0.1]];
    for (const [px, py] of pts) g.lineTo(x + w * (f >= 0 ? px : 1 - px), y + h * py);
    g.lineTo(x + w * 1.06, y + h * 0.22);
    for (const k of [0.84, 0.62, 0.4, 0.18]) { g.lineTo(x + w * (k + 0.06), y + h * 0.14); g.lineTo(x + w * k, y + h * 0.25); }
    g.closePath(); g.fill();
    g.fillStyle = 'rgba(255,255,255,0.25)'; g.beginPath(); g.moveTo(x + w * 0.3, y + h * 0.02); g.lineTo(x + w * 0.4, y - h * 0.2); g.lineTo(x + w * 0.46, y + h * 0.04); g.fill();
    return;
  }
  rr0(g, x + w * 0.02, y - 1, w * 0.96, h * 0.18, 7); g.fill();
  g.beginPath(); g.moveTo(x + w * 0.04, y + h * 0.12);                    // 前髪（ぎざぎざ）
  for (let i = 0; i <= 5; i++) { const px = x + w * (0.04 + i * 0.184); g.lineTo(px - w * 0.09, y + h * (i % 2 ? 0.25 : 0.21)); g.lineTo(px, y + h * 0.13); }
  g.closePath(); g.fill();
  for (const sx of [x + w * 0.0, x + w * 0.86]) { rr0(g, sx, y + h * 0.08, w * 0.14, h * 0.4, 4); g.fill(); }   // 横の髪
  g.fillStyle = 'rgba(255,255,255,0.35)'; g.beginPath(); g.ellipse(cx - w * 0.15, y + h * 0.06, w * 0.18, h * 0.025, -0.15, 0, TAU); g.fill();   // つや
}
function rr0(g, X, Y, W, H, R) { g.beginPath(); g.roundRect ? g.roundRect(X, Y, W, H, R) : g.rect(X, Y, W, H); }
function shadeHex(hex, k) {                                       // 色を明るく(+)・暗く(-)
  const n = parseInt(hex.slice(1), 16), c = v => Math.max(0, Math.min(255, Math.round(k < 0 ? v * (1 + k) : v + (255 - v) * k)));
  return `rgb(${c(n >> 16)},${c(n >> 8 & 255)},${c(n & 255)})`;
}
// 足もとでゆっくり回る魔法陣
function paintMagicCircle(g, cx, cy, w, h, col, t) {
  g.save(); g.translate(cx, cy); g.globalCompositeOperation = 'lighter'; g.strokeStyle = col; g.fillStyle = col;
  const R = w * 1.0, a = t * 0.6;
  g.globalAlpha *= 0.55 + 0.2 * Math.sin(t * 3);
  g.lineWidth = 1.6; g.beginPath(); g.arc(0, 0, R, 0, TAU); g.stroke();
  g.lineWidth = 1; g.beginPath(); g.arc(0, 0, R * 0.82, 0, TAU); g.stroke();
  for (const off of [0, Math.PI]) {                               // 六芒星
    g.beginPath(); for (let i = 0; i <= 3; i++) { const q = a + off + i * TAU / 3; g[i ? 'lineTo' : 'moveTo'](Math.cos(q) * R * 0.82, Math.sin(q) * R * 0.82); } g.stroke();
  }
  for (let i = 0; i < 12; i++) { const q = -a * 1.5 + i * TAU / 12; g.fillRect(Math.cos(q) * R * 0.91 - 1, Math.sin(q) * R * 0.91 - 1, 2.2, 2.2); }
  g.restore();
}
// ---- スキンごとの「しるし」の演出（sk.sig）。魔法陣ばかりにならないよう、スキンの名前に合わせた動きを 1 つずつ ----
//   front = false … 体よりうしろ / true … 体より前。sk.sigColor で色を変えられる
const SIG_RAINBOW = ['#ff4d4d', '#ff9f43', '#ffe66d', '#5cff9d', '#4dd2ff', '#6c7bff', '#c77dff'];
const sigHash = n => { const v = Math.sin(n * 127.1) * 43758.5453; return v - Math.floor(v); };
function paintSig(g, sk, x, y, w, h, f, cx, bodyTop, baseY, t, front) {
  const S = sk.sig, c = sk.sigColor || sk.glow || '#ffffff', cy = y + h * 0.5;
  const star4 = (px, py, r) => { g.beginPath(); g.moveTo(px, py - r); g.quadraticCurveTo(px, py, px + r, py); g.quadraticCurveTo(px, py, px, py + r); g.quadraticCurveTo(px, py, px - r, py); g.quadraticCurveTo(px, py, px, py - r); g.fill(); };
  g.save();
  if (!front) {
    if (S === 'flames') {                                        // 体のうしろから、ゆらめく炎が立ちのぼる
      g.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 5; i++) {
        const px = cx + (i - 2) * w * 0.28, ph = t * 9 + i * 1.7, fh = h * (0.55 + 0.25 * Math.sin(ph) + (i % 2 ? 0 : 0.2)), fw = w * 0.2;
        for (const [col, k] of [[c, 1], ['#ffe066', 0.55]]) {
          g.fillStyle = col; g.globalAlpha = k === 1 ? 0.55 : 0.6;
          const top = baseY - h * 0.25 - fh * k, sway = Math.sin(ph * 0.7) * w * 0.08;
          g.beginPath(); g.moveTo(px - fw * k, baseY - h * 0.2); g.quadraticCurveTo(px - fw * k, top + fh * 0.4 * k, px + sway, top); g.quadraticCurveTo(px + fw * k, top + fh * 0.4 * k, px + fw * k, baseY - h * 0.2); g.fill();
        }
      }
    } else if (S === 'smoke') {                                  // 黒いけむり（ふちだけ色がにじむ）が、ゆらゆら立ちのぼる
      g.lineCap = 'round';
      for (let i = 0; i < 4; i++) {                                // 細くうねる筋が、体の両わきから上へ
        const side = i % 2 ? 1 : -1, p = (t * 0.5 + i / 4) % 1, x0 = cx + side * w * (0.45 + 0.1 * (i >> 1)), y0 = baseY - h * 0.1;
        const L = h * (0.9 + 0.5 * p), sw = Math.sin(t * 2.5 + i) * w * 0.35;
        g.globalAlpha = 0.65 * Math.sin(p * Math.PI);
        for (const [col, lw] of [[c, w * 0.13], ['#05030a', w * 0.05]]) {
          g.strokeStyle = col; g.lineWidth = lw; g.beginPath(); g.moveTo(x0, y0);
          g.bezierCurveTo(x0 + side * w * 0.3 + sw, y0 - L * 0.35, x0 - side * w * 0.2 - sw, y0 - L * 0.7, x0 + side * w * 0.15 + sw * 0.5, y0 - L); g.stroke();
        }
      }
    } else if (S === 'rays') {                                   // うしろで回る、日の光の筋
      g.globalCompositeOperation = 'lighter'; g.fillStyle = c;
      const R = w * 1.35;
      for (let i = 0; i < 12; i++) {
        const a = t * 0.4 + i * TAU / 12, L = R * (i % 2 ? 0.75 : 1) * (0.9 + 0.1 * Math.sin(t * 3 + i));
        g.globalAlpha = 0.28; g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + Math.cos(a - 0.09) * L, cy + Math.sin(a - 0.09) * L); g.lineTo(cx + Math.cos(a + 0.09) * L, cy + Math.sin(a + 0.09) * L); g.fill();
      }
      g.globalAlpha = 0.35; g.beginPath(); g.arc(cx, cy, w * 0.55, 0, TAU); g.fill();
    } else if (S === 'stars') {                                  // 星座: 星を線でつなぐ。星はまたたく
      const pts = [[-1, -0.7], [-0.55, -1.05], [0.1, -0.85], [0.75, -1.1], [1.05, -0.45], [0.85, 0.35], [-1.1, 0.2]].map(([a, b]) => [cx + a * w * 0.95, cy + b * h * 0.75]);
      g.strokeStyle = c; g.globalAlpha = 0.45; g.lineWidth = 0.8; g.beginPath(); pts.forEach(([px, py], i) => g[i ? 'lineTo' : 'moveTo'](px, py)); g.stroke();
      g.globalCompositeOperation = 'lighter'; g.fillStyle = '#ffffff';
      pts.forEach(([px, py], i) => { g.globalAlpha = 0.5 + 0.5 * Math.sin(t * 4 + i * 1.3); star4(px, py, w * (0.07 + 0.05 * Math.abs(Math.sin(t * 2 + i)))); });
    } else if (S === 'prism') {                                  // 虹色の光の帯が、ゆっくり回る
      g.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 7; i++) {
        const a = -t * 0.5 + i * TAU / 7, L = w * 1.2;
        g.fillStyle = SIG_RAINBOW[i]; g.globalAlpha = 0.2;
        g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + Math.cos(a - 0.14) * L, cy + Math.sin(a - 0.14) * L); g.lineTo(cx + Math.cos(a + 0.14) * L, cy + Math.sin(a + 0.14) * L); g.fill();
      }
    } else if (S === 'clock') {                                  // 時計の文字盤: 歯車のふちが回り、針が進む
      g.translate(cx, cy); g.strokeStyle = c; g.fillStyle = c; g.globalAlpha = 0.6;
      const R = w * 0.95;
      g.lineWidth = 1.4; g.beginPath(); g.arc(0, 0, R, 0, TAU); g.stroke();
      for (let i = 0; i < 12; i++) { const a = i * TAU / 12, k = i % 3 ? 0.9 : 0.8; g.lineWidth = i % 3 ? 1 : 2; g.beginPath(); g.moveTo(Math.cos(a) * R * k, Math.sin(a) * R * k); g.lineTo(Math.cos(a) * R * 0.98, Math.sin(a) * R * 0.98); g.stroke(); }
      for (let i = 0; i < 20; i++) { const a = t * 0.3 + i * TAU / 20; g.fillRect(Math.cos(a) * R * 1.1 - 1.5, Math.sin(a) * R * 1.1 - 1.5, 3, 3); }   // 歯車の歯
      g.lineCap = 'round';
      for (const [sp, L, lw] of [[2.4, 0.85, 1.2], [0.2, 0.55, 2]]) { const a = t * sp - Math.PI / 2; g.lineWidth = lw; g.beginPath(); g.moveTo(0, 0); g.lineTo(Math.cos(a) * R * L, Math.sin(a) * R * L); g.stroke(); }
    } else if (S === 'code') {                                   // 0 と 1 が、うしろを流れ落ちる
      g.fillStyle = c; g.font = `700 ${Math.max(6, w * 0.24) | 0}px monospace`; g.textAlign = 'center';
      for (let col = 0; col < 6; col++) {
        const px = cx + (col - 2.5) * w * 0.36, sp = 0.6 + sigHash(col) * 0.6;
        for (let k = 0; k < 4; k++) {
          const p = (t * sp + k / 4 + sigHash(col + 9)) % 1, py = y - h * 0.5 + p * h * 1.9;
          g.globalAlpha = 0.7 * Math.sin(p * Math.PI); g.fillText(sigHash(col * 7 + k + Math.floor(t * 4)) < 0.5 ? '0' : '1', px, py);
        }
      }
    } else if (S === 'moon') {                                   // 大きな三日月
      const mx = cx - f * w * 0.35, my = y - h * 0.05, R = w * 0.75;
      g.globalAlpha = 0.85; g.fillStyle = c; g.beginPath(); g.arc(mx, my, R, 0, TAU); g.fill();
      g.globalCompositeOperation = 'destination-out'; g.globalAlpha = 1; g.beginPath(); g.arc(mx + R * 0.45, my - R * 0.2, R * 0.9, 0, TAU); g.fill();
    } else if (S === 'radar') {                                  // レーダー: 回る線と、映った点
      g.translate(cx, cy); g.strokeStyle = c; g.globalAlpha = 0.5; g.lineWidth = 1;
      const R = w * 1.0, a = t * 2.2;
      for (const k of [1, 0.6]) { g.beginPath(); g.arc(0, 0, R * k, 0, TAU); g.stroke(); }
      g.beginPath(); g.moveTo(-R, 0); g.lineTo(R, 0); g.moveTo(0, -R); g.lineTo(0, R); g.stroke();
      g.fillStyle = c; g.globalAlpha = 0.3; g.beginPath(); g.moveTo(0, 0); g.arc(0, 0, R, a - 0.7, a); g.closePath(); g.fill();
      for (let i = 0; i < 3; i++) { const b = sigHash(i) * TAU, d = (a - b) % TAU; g.globalAlpha = Math.max(0, 1 - ((d + TAU) % TAU) / 3); g.beginPath(); g.arc(Math.cos(b) * R * (0.4 + i * 0.2), Math.sin(b) * R * (0.4 + i * 0.2), 2.2, 0, TAU); g.fill(); }
    } else if (S === 'ecg') {                                    // 心電図の線が流れる（止まらない鼓動）
      g.strokeStyle = c; g.lineWidth = 1.6; g.globalCompositeOperation = 'lighter';
      const L = w * 2.6, x0 = cx - L / 2, my = cy, ph = (t * 0.9) % 1;
      g.beginPath();
      for (let i = 0; i <= 52; i++) {
        const u = i / 52, k = ((u - ph) % 0.5 + 0.5) % 0.5 / 0.5;
        const beat = k > 0.42 && k < 0.58 ? [0, -0.9, 1, -0.3, 0][Math.min(4, Math.floor((k - 0.42) / 0.032))] : 0;
        g[i ? 'lineTo' : 'moveTo'](x0 + u * L, my + beat * h * 0.45);
      }
      g.globalAlpha = 0.75; g.stroke();
    } else if (S === 'ring') {                                   // 土星の輪（うしろ半分）
      g.strokeStyle = c; g.lineWidth = 2.5; g.globalAlpha = 0.7;
      g.beginPath(); g.ellipse(cx, cy, w * 1.05, h * 0.22, -0.25 + Math.sin(t) * 0.08, Math.PI, TAU); g.stroke();
    } else if (S === 'eyes') {                                   // 暗やみに、赤い目がいくつも開いては閉じる
      for (let i = 0; i < 5; i++) {
        const a = i * TAU / 5 + 0.4, px = cx + Math.cos(a) * w * 0.95, py = cy + Math.sin(a) * h * 0.75, o = Math.max(0, Math.sin(t * 1.3 + i * 2.1));
        const ew = w * 0.16, eh = ew * 0.55 * o;
        if (eh < 0.3) continue;
        g.fillStyle = '#ffffff'; g.globalAlpha = 0.85; g.beginPath(); g.ellipse(px, py, ew, eh, 0, 0, TAU); g.fill();
        g.fillStyle = c; g.beginPath(); g.arc(px + Math.sin(t * 2 + i) * ew * 0.3, py, Math.min(eh, ew * 0.45), 0, TAU); g.fill();
      }
    } else if (S === 'speed') {                                  // うしろへ流れる、速さの線
      g.strokeStyle = c; g.lineCap = 'round'; g.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 7; i++) {
        const p = (t * 2.2 + sigHash(i)) % 1, py = y + h * (0.05 + i * 0.15), L = w * (0.5 + sigHash(i + 3) * 0.6);
        const px = cx - f * (w * 0.4 + p * w * 1.6);
        g.globalAlpha = 0.8 * (1 - p); g.lineWidth = 1.5; g.beginPath(); g.moveTo(px, py); g.lineTo(px - f * L, py); g.stroke();
      }
    } else if (S === 'flag') {                                   // 背中の旗（はためく）
      const px = cx - f * w * 0.55, top = y - h * 0.9;
      g.strokeStyle = '#d8d8d8'; g.lineWidth = 1.6; g.beginPath(); g.moveTo(px, baseY - h * 0.3); g.lineTo(px, top); g.stroke();
      g.fillStyle = c; g.beginPath(); g.moveTo(px, top);
      for (let i = 0; i <= 8; i++) { const u = i / 8; g.lineTo(px - f * u * w * 0.9, top + Math.sin(t * 6 - u * 4) * h * 0.06 * u); }
      for (let i = 8; i >= 0; i--) { const u = i / 8; g.lineTo(px - f * u * w * 0.9, top + h * 0.45 + Math.sin(t * 6 - u * 4) * h * 0.06 * u); }
      g.fill();
      g.fillStyle = '#ffd23f'; star4(px - f * w * 0.42, top + h * 0.22 + Math.sin(t * 6 - 2) * h * 0.03, w * 0.13);
    }
  } else {
    if (S === 'snowflakes' || S === 'shuriken' || S === 'shards') {   // まわりを回る（雪の結晶 / 手裏剣 / 水晶のかけら）
      g.fillStyle = c; g.strokeStyle = c;
      for (let i = 0; i < 3; i++) {
        const a = t * (S === 'shuriken' ? 2.2 : 0.9) + i * TAU / 3, px = cx + Math.cos(a) * w * 0.95, py = cy + Math.sin(a) * h * 0.55, r = w * 0.15, spin = t * (S === 'shuriken' ? 14 : 1.5) + i;
        g.save(); g.translate(px, py); g.rotate(spin); g.globalAlpha = 0.9;
        if (S === 'snowflakes') { g.lineWidth = 1.1; g.beginPath(); for (let k = 0; k < 6; k++) { const q = k * TAU / 6; g.moveTo(0, 0); g.lineTo(Math.cos(q) * r, Math.sin(q) * r); g.moveTo(Math.cos(q) * r * 0.55, Math.sin(q) * r * 0.55); g.lineTo(Math.cos(q + 0.5) * r * 0.75, Math.sin(q + 0.5) * r * 0.75); } g.stroke(); }
        else if (S === 'shuriken') { g.beginPath(); for (let k = 0; k < 8; k++) { const q = k * TAU / 8, rr2 = k % 2 ? r * 0.3 : r; g.lineTo(Math.cos(q) * rr2, Math.sin(q) * rr2); } g.fill(); g.fillStyle = '#111'; g.beginPath(); g.arc(0, 0, r * 0.18, 0, TAU); g.fill(); }
        else { g.beginPath(); g.moveTo(0, -r * 1.2); g.lineTo(r * 0.55, 0); g.lineTo(0, r * 1.2); g.lineTo(-r * 0.55, 0); g.fill(); g.fillStyle = '#ffffff'; g.globalAlpha = 0.7; g.beginPath(); g.moveTo(0, -r * 1.2); g.lineTo(r * 0.2, 0); g.lineTo(0, r * 0.3); g.fill(); }
        g.restore();
      }
    } else if (S === 'petals' || S === 'feathers') {             // 舞う花びら / 落ちる羽根
      for (let i = 0; i < 5; i++) {
        const p = (t * (S === 'petals' ? 0.35 : 0.25) + i / 5) % 1, a = p * TAU * (S === 'petals' ? 1.5 : 0.5) + i;
        const px = S === 'petals' ? cx + Math.cos(a) * w * (0.6 + p * 0.5) : cx + (sigHash(i) - 0.5) * w * 2 + Math.sin(t * 2 + i) * w * 0.2;
        const py = S === 'petals' ? cy + Math.sin(a) * h * 0.5 - p * h * 0.3 : y - h * 0.6 + p * h * 1.8;
        g.save(); g.translate(px, py); g.rotate(t * 2 + i); g.globalAlpha = Math.sin(p * Math.PI); g.fillStyle = c;
        const r = w * (S === 'petals' ? 0.11 : 0.16);
        g.beginPath(); g.ellipse(0, 0, r, r * (S === 'petals' ? 0.55 : 0.32), 0, 0, TAU); g.fill();
        if (S === 'feathers') { g.strokeStyle = 'rgba(0,0,0,0.25)'; g.lineWidth = 0.6; g.beginPath(); g.moveTo(-r, 0); g.lineTo(r * 1.3, 0); g.stroke(); }
        g.restore();
      }
    } else if (S === 'notes' || S === 'arrows') {                // 浮かぶ音符 / リズムゲームの矢印
      for (let i = 0; i < 4; i++) {
        const p = (t * 0.5 + i / 4) % 1, px = cx + (i - 1.5) * w * 0.55 + Math.sin(t * 2 + i) * w * 0.12, py = y + h * 0.4 - p * h * 1.3, r = w * 0.12;
        const col = sk.sigColors ? sk.sigColors[i % sk.sigColors.length] : c;
        g.globalAlpha = Math.sin(p * Math.PI); g.fillStyle = col; g.strokeStyle = col;
        if (S === 'notes') {
          g.beginPath(); g.ellipse(px, py, r, r * 0.75, -0.4, 0, TAU); g.fill();
          g.lineWidth = 1.3; g.beginPath(); g.moveTo(px + r * 0.9, py); g.lineTo(px + r * 0.9, py - r * 3); g.quadraticCurveTo(px + r * 2, py - r * 2.4, px + r * 1.7, py - r * 1.4); g.stroke();
        } else {
          g.save(); g.translate(px, py); g.rotate([0, Math.PI / 2, Math.PI, -Math.PI / 2][i]);
          g.beginPath(); g.moveTo(0, -r * 1.4); g.lineTo(r * 1.3, 0); g.lineTo(r * 0.5, 0); g.lineTo(r * 0.5, r * 1.3); g.lineTo(-r * 0.5, r * 1.3); g.lineTo(-r * 0.5, 0); g.lineTo(-r * 1.3, 0); g.closePath(); g.fill();
          g.restore();
        }
      }
    } else if (S === 'waves' || S === 'shout') {                 // 広がる音の輪（shout はギザギザ）
      g.strokeStyle = c; g.lineWidth = 1.5;
      for (let i = 0; i < 3; i++) {
        const p = (t * 0.8 + i / 3) % 1, R = w * (0.5 + p * 0.9);
        g.globalAlpha = 0.8 * (1 - p); g.beginPath();
        if (S === 'waves') g.ellipse(cx, cy, R, R * 0.85, 0, 0, TAU);
        else for (let k = 0; k <= 24; k++) { const q = k * TAU / 24, rr2 = R * (k % 2 ? 0.85 : 1.05); g.lineTo(cx + Math.cos(q) * rr2, cy + Math.sin(q) * rr2 * 0.85); }
        g.stroke();
      }
    } else if (S === 'bubbles' || S === 'motes') {               // 立ちのぼる泡 / 光のつぶ
      for (let i = 0; i < 6; i++) {
        const p = (t * 0.4 + i / 6) % 1, px = cx + (sigHash(i) - 0.5) * w * 1.8 + Math.sin(t * 3 + i) * w * 0.08, py = baseY - p * h * 1.7, r = w * (0.06 + sigHash(i + 5) * 0.07);
        g.globalAlpha = Math.sin(p * Math.PI);
        if (S === 'bubbles') { g.strokeStyle = c; g.lineWidth = 1; g.beginPath(); g.arc(px, py, r, 0, TAU); g.stroke(); g.fillStyle = '#ffffff'; g.beginPath(); g.arc(px - r * 0.35, py - r * 0.35, r * 0.25, 0, TAU); g.fill(); }
        else { g.globalCompositeOperation = 'lighter'; g.fillStyle = c; g.beginPath(); g.arc(px, py, r * 1.8, 0, TAU); g.globalAlpha *= 0.35; g.fill(); g.globalAlpha = Math.sin(p * Math.PI); g.beginPath(); g.arc(px, py, r * 0.7, 0, TAU); g.fill(); }
      }
    } else if (S === 'steam') {                                  // 頭から湯気
      g.fillStyle = c;
      for (let i = 0; i < 4; i++) {
        const p = (t * 0.6 + i / 4) % 1, px = cx + Math.sin(t * 2 + i * 2) * w * 0.25, py = y - h * 0.35 - p * h * 0.9;
        g.globalAlpha = 0.5 * Math.sin(p * Math.PI); g.beginPath(); g.arc(px, py, w * (0.1 + p * 0.18), 0, TAU); g.fill();
      }
    } else if (S === 'bolts') {                                  // 体のまわりに走る稲妻
      g.strokeStyle = c; g.lineWidth = 1.6; g.lineJoin = 'round'; g.globalCompositeOperation = 'lighter';
      const seed = Math.floor(t * 10);
      for (let i = 0; i < 3; i++) {
        if (sigHash(seed + i * 13) < 0.35) continue;
        const a = sigHash(seed * 3 + i) * TAU, R0 = w * 0.6, R1 = w * 1.25;
        g.globalAlpha = 0.95; g.beginPath(); g.moveTo(cx + Math.cos(a) * R0, cy + Math.sin(a) * R0 * 0.8);
        for (let k = 1; k <= 4; k++) { const rr2 = R0 + (R1 - R0) * k / 4, q = a + (sigHash(seed + i + k * 7) - 0.5) * 0.6; g.lineTo(cx + Math.cos(q) * rr2, cy + Math.sin(q) * rr2 * 0.8); }
        g.stroke();
      }
    } else if (S === 'wind') {                                   // まわりを巻く風の筋
      g.strokeStyle = c; g.lineCap = 'round';
      for (let i = 0; i < 3; i++) {
        const a = t * 3 + i * TAU / 3, R = w * (0.85 + i * 0.12);
        g.lineWidth = 1.8 - i * 0.3; g.globalAlpha = 0.75;
        g.beginPath(); g.ellipse(cx, cy + (i - 1) * h * 0.25, R, R * 0.3, 0, a, a + 2); g.stroke();
      }
    } else if (S === 'barrier') {                                // 六角形のバリア（ゆっくり光が走る）
      g.strokeStyle = c; g.lineWidth = 1;
      const R = w * 0.32;
      for (let i = -2; i <= 2; i++) for (let j = -2; j <= 2; j++) {
        const px = cx + i * R * 1.5, py = cy + j * R * 1.73 + (i % 2 ? R * 0.87 : 0), d = Math.hypot((px - cx) / w, (py - cy) / h);
        if (d > 1.15) continue;
        g.globalAlpha = 0.15 + 0.5 * Math.max(0, Math.sin(t * 3 - d * 5));
        g.beginPath(); for (let k = 0; k <= 6; k++) { const q = k * TAU / 6; g.lineTo(px + Math.cos(q) * R * 0.95, py + Math.sin(q) * R * 0.95); } g.stroke();
      }
    } else if (S === 'glitch') {                                 // 画面がこわれたような、ずれた色の帯
      const seed = Math.floor(t * 12);
      for (let i = 0; i < 5; i++) {
        if (sigHash(seed + i * 5) < 0.4) continue;
        const py = y + sigHash(seed * 2 + i) * h * 1.2 - h * 0.1, bw = w * (0.4 + sigHash(seed + i * 3) * 1.2), px = cx + (sigHash(seed + i * 11) - 0.5) * w * 2;
        g.globalAlpha = 0.7; g.fillStyle = i % 2 ? c : '#ff2ea6'; g.fillRect(px - bw / 2, py, bw, Math.max(1.5, h * 0.05));
      }
    } else if (S === 'medals') {                                 // 胸の勲章（リボン＋メダル。キラッと光る）
      const cols = sk.sigColors || ['#ffd23f', '#e0e0e8', '#d08a4a'];
      cols.forEach((col, i) => {
        const px = cx + f * w * (0.05 + i * 0.18) - f * w * 0.1, py = bodyTop + h * 0.12;
        g.fillStyle = ['#c8102e', '#2c54c4', '#2a8a4a'][i % 3]; g.fillRect(px - w * 0.06, py, w * 0.12, h * 0.1);
        g.fillStyle = col; g.beginPath(); g.arc(px, py + h * 0.15, w * 0.075, 0, TAU); g.fill();
        g.fillStyle = '#ffffff'; g.globalAlpha = Math.max(0, Math.sin(t * 3 - i)); g.beginPath(); g.arc(px - w * 0.025, py + h * 0.13, w * 0.025, 0, TAU); g.fill(); g.globalAlpha = 1;
      });
    } else if (S === 'shield') {                                 // 前に構えた盾（紋章入り）
      const px = cx + f * w * 0.42, py = bodyTop + h * 0.05 + Math.sin(t * 3) * h * 0.02, sw = w * 0.42, sh = h * 0.55;
      g.fillStyle = '#d8dde8'; g.beginPath(); g.moveTo(px - sw / 2, py); g.lineTo(px + sw / 2, py); g.lineTo(px + sw / 2, py + sh * 0.5); g.quadraticCurveTo(px + sw / 2, py + sh * 0.85, px, py + sh); g.quadraticCurveTo(px - sw / 2, py + sh * 0.85, px - sw / 2, py + sh * 0.5); g.closePath(); g.fill();
      g.save(); g.clip(); g.fillStyle = c; g.fillRect(px - sw * 0.38, py + sh * 0.08, sw * 0.76, sh * 0.82); g.restore();
      g.fillStyle = '#ffd23f'; g.fillRect(px - sw * 0.07, py + sh * 0.15, sw * 0.14, sh * 0.65); g.fillRect(px - sw * 0.3, py + sh * 0.35, sw * 0.6, sh * 0.12);
    } else if (S === 'ring') {                                   // 土星の輪（前半分）
      g.strokeStyle = c; g.lineWidth = 2.5; g.globalAlpha = 0.9;
      g.beginPath(); g.ellipse(cx, cy, w * 1.05, h * 0.22, -0.25 + Math.sin(t) * 0.08, 0, Math.PI); g.stroke();
    }
  }
  g.restore();
}

// まわりを回る光の玉（side -1 = うしろ半分、1 = 前半分）
function paintOrbs(g, cols, cx, y, w, h, t, side) {
  g.save(); g.globalCompositeOperation = 'lighter';
  cols.forEach((c, i) => {
    const a = t * 1.6 + i * TAU / cols.length, z = Math.sin(a);
    if ((z >= 0) !== (side > 0)) return;
    const px = cx + Math.cos(a) * w * 0.95, py = y + h * 0.42 + z * h * 0.12 + Math.sin(t * 3 + i) * h * 0.05, r = w * (0.08 + 0.03 * z);
    g.fillStyle = c; g.globalAlpha = 0.3; g.beginPath(); g.arc(px, py, r * 2.2, 0, TAU); g.fill();
    g.globalAlpha = 0.95; g.beginPath(); g.arc(px, py, r, 0, TAU); g.fill();
    g.fillStyle = '#ffffff'; g.beginPath(); g.arc(px, py, r * 0.45, 0, TAU); g.fill();
  });
  g.restore();
}
// きつねのしっぽ（扇のように広がる、先が白い）
function paintTails(g, sk, cx, f, w, h, baseY, t) {
  const n = sk.tails || 1, col = sk.tailColor || '#f2a65a', bx = cx - f * w * 0.3, by = baseY - h * 0.28;
  for (let i = 0; i < n; i++) {
    const spread = n === 1 ? 0 : (i / (n - 1) - 0.5) * 2.2, a = -Math.PI / 2 - f * 0.9 + spread * 0.6 + Math.sin(t * 3 + i * 0.8) * 0.12;
    g.save(); g.translate(bx, by); g.rotate(a + Math.PI / 2);
    const L = h * (0.85 - Math.abs(spread) * 0.08), W2 = w * 0.2;
    g.fillStyle = col; g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(W2 * 1.6, -L * 0.5, 0, -L); g.quadraticCurveTo(-W2 * 1.6, -L * 0.5, 0, 0); g.fill();
    g.fillStyle = sk.tailTip || '#ffffff'; g.beginPath(); g.moveTo(-W2 * 0.75, -L * 0.72); g.quadraticCurveTo(0, -L * 0.62, W2 * 0.75, -L * 0.72); g.quadraticCurveTo(W2 * 0.4, -L * 0.92, 0, -L); g.quadraticCurveTo(-W2 * 0.4, -L * 0.92, -W2 * 0.75, -L * 0.72); g.fill();
    g.restore();
  }
}
// 背中の大きなリボン
function paintBigBow(g, col, bx, by, w, h, t) {
  const R = w * 0.32, sw = Math.sin(t * 4) * 0.08;
  g.fillStyle = col;
  for (const sgn of [-1, 1]) {
    g.save(); g.translate(bx, by); g.rotate(sgn * (0.25 + sw));
    g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(sgn * R * 1.6, -R * 1.3, sgn * R * 1.5, 0); g.quadraticCurveTo(sgn * R * 1.6, R * 0.9, 0, 0); g.fill();
    g.fillRect(sgn > 0 ? 0 : -R * 0.3, R * 0.2, R * 0.3, R * 1.6);
    g.restore();
  }
  g.fillStyle = 'rgba(0,0,0,0.15)'; g.beginPath(); g.arc(bx, by, R * 0.35, 0, TAU); g.fill();
}
// ティアラ（宝石つき、きらっと光る）
function paintTiara(g, cx, y, w, h, sk, t) {
  const c = sk.tiaraColor || '#e8eef8';
  g.fillStyle = c; g.strokeStyle = 'rgba(0,0,0,0.25)'; g.lineWidth = 0.8;
  g.beginPath(); g.moveTo(cx - w * 0.36, y + h * 0.06);
  const pk = [[-0.24, -0.08], [-0.12, -0.02], [0, -0.17], [0.12, -0.02], [0.24, -0.08]];
  for (const [px, py] of pk) g.lineTo(cx + w * px, y + h * py);
  g.lineTo(cx + w * 0.36, y + h * 0.06); g.quadraticCurveTo(cx, y, cx - w * 0.36, y + h * 0.06); g.fill(); g.stroke();
  for (const [px, col] of [[-0.2, '#4dd2ff'], [0, '#ff3b6b'], [0.2, '#5cff9d']]) { g.fillStyle = col; g.beginPath(); g.arc(cx + w * px, y + h * (px ? 0.0 : -0.07), w * (px ? 0.045 : 0.065), 0, TAU); g.fill(); }
  g.save(); g.globalCompositeOperation = 'lighter'; g.fillStyle = '#ffffff'; g.globalAlpha *= Math.max(0, Math.sin(t * 2.5)) ** 6;
  const sx = cx, sy = y - h * 0.07, r = w * 0.2;
  g.beginPath(); g.moveTo(sx, sy - r); g.lineTo(sx + r * 0.15, sy); g.lineTo(sx, sy + r); g.lineTo(sx - r * 0.15, sy); g.closePath(); g.fill();
  g.beginPath(); g.moveTo(sx - r, sy); g.lineTo(sx, sy + r * 0.15); g.lineTo(sx + r, sy); g.lineTo(sx, sy - r * 0.15); g.closePath(); g.fill();
  g.restore();
}
// 目: cute 大きくてきらきら / sharp するどく光る
function paintEyes(g, sk, ex, eyeY, eyeR, w, cx, t) {
  for (const sx of [ex - w * 0.12, ex + w * 0.12]) {
    if (sk.eyes === 'cute') {
      g.fillStyle = '#1a1424'; g.beginPath(); g.ellipse(sx, eyeY, eyeR * 1.1, eyeR * 1.5, 0, 0, TAU); g.fill();
      g.fillStyle = sk.eyeColor || '#4a6aff'; g.beginPath(); g.ellipse(sx, eyeY + eyeR * 0.35, eyeR * 0.8, eyeR * 0.95, 0, 0, TAU); g.fill();
      g.fillStyle = '#ffffff'; g.beginPath(); g.arc(sx + eyeR * 0.35, eyeY - eyeR * 0.55, eyeR * 0.45, 0, TAU); g.fill();
      g.beginPath(); g.arc(sx - eyeR * 0.4, eyeY + eyeR * 0.6, eyeR * 0.22, 0, TAU); g.fill();
      const out = sx < cx ? -1 : 1;                                // ほっぺ（目の外側の下）
      g.fillStyle = 'rgba(255,110,150,0.5)'; g.beginPath(); g.ellipse(sx + out * eyeR * 1.1, eyeY + eyeR * 2.1, eyeR * 1.1, eyeR * 0.5, 0, 0, TAU); g.fill();
    } else {
      g.save(); g.translate(sx, eyeY); g.rotate(sx < cx ? 0.28 : -0.28);
      g.fillStyle = '#0a0a10'; g.fillRect(-eyeR * 1.35, -eyeR * 0.55, eyeR * 2.7, eyeR * 1.1);
      g.globalCompositeOperation = 'lighter'; g.fillStyle = sk.eyeColor || '#ff3b3b'; g.globalAlpha *= 0.8 + 0.2 * Math.sin(t * 6);
      g.fillRect(-eyeR * 1.1, -eyeR * 0.3, eyeR * 2.2, eyeR * 0.6);
      g.globalAlpha *= 0.35; g.fillRect(-eyeR * 1.8, -eyeR * 0.7, eyeR * 3.6, eyeR * 1.4);
      g.restore();
    }
  }
}
// 服: dress スカート（フリルとむねのリボン） / armor よろい（かたとむね、光る紋章）
function paintOutfit(g, x, y, w, h, f, cx, bodyTop, baseY, sk, t) {
  if (sk.gown) {                                                 // ロングドレス: 足もとまで広がる、3 段のすそと金のふち
    const yS = bodyTop + h * 0.1, sway = Math.sin(t * 3) * w * 0.04, tr = sk.gownTrim || '#ffd23f';
    for (let k = 0; k < 3; k++) {
      const top = yS + (baseY - yS) * k * 0.3, bot = baseY + 1, wid = 0.08 + k * 0.12;
      g.fillStyle = k === 1 ? shadeHex(sk.gown, -0.12) : sk.gown;
      g.beginPath(); g.moveTo(x + w * (0.1 - k * 0.05), top); g.lineTo(x + w * (0.9 + k * 0.05), top);
      g.lineTo(x + w * (1 + wid + 0.12) + sway, bot); g.quadraticCurveTo(cx + sway, bot + h * 0.05, x - w * (wid + 0.12) + sway, bot); g.closePath(); g.fill();
      g.strokeStyle = tr; g.lineWidth = 1.3; g.beginPath(); g.moveTo(x - w * (wid + 0.12) + sway, bot); g.quadraticCurveTo(cx + sway, bot + h * 0.05, x + w * (1 + wid + 0.12) + sway, bot); g.stroke();
    }
    g.fillStyle = tr; g.fillRect(x + w * 0.1, yS - h * 0.02, w * 0.8, h * 0.04);
    g.save(); g.globalCompositeOperation = 'lighter'; g.fillStyle = '#ffffff';
    for (let i = 0; i < 4; i++) { const a = Math.abs(Math.sin(t * 3 + i * 1.7)); g.globalAlpha = 0.6 * a; g.beginPath(); g.arc(x + w * (0.1 + i * 0.27), yS + (baseY - yS) * (0.35 + (i % 2) * 0.35), w * 0.03 + a, 0, TAU); g.fill(); }
    g.restore();
  }
  if (sk.sleeves) {                                              // 着物の大きな袖（ゆれる）
    for (const sgn of [-1, 1]) {
      const sx = cx + sgn * w * 0.42, sw = Math.sin(t * 4 + sgn) * w * 0.04;
      g.fillStyle = sk.sleeves; g.beginPath(); g.moveTo(sx, bodyTop + h * 0.02);
      g.lineTo(sx + sgn * w * 0.38 + sw, bodyTop + h * 0.08); g.lineTo(sx + sgn * w * 0.42 + sw, bodyTop + h * 0.42);
      g.quadraticCurveTo(sx + sgn * w * 0.2 + sw, bodyTop + h * 0.5, sx + sgn * w * 0.02, bodyTop + h * 0.36); g.closePath(); g.fill();
      g.strokeStyle = sk.sleeveTrim || '#ffffff'; g.lineWidth = 1.5; g.beginPath();
      g.moveTo(sx + sgn * w * 0.42 + sw, bodyTop + h * 0.42); g.quadraticCurveTo(sx + sgn * w * 0.2 + sw, bodyTop + h * 0.5, sx + sgn * w * 0.02, bodyTop + h * 0.36); g.stroke();
    }
    g.fillStyle = sk.sleeveTrim || '#ffffff'; g.beginPath(); g.moveTo(cx - w * 0.2, bodyTop); g.lineTo(cx, bodyTop + h * 0.16); g.lineTo(cx + w * 0.2, bodyTop); g.lineTo(cx + w * 0.12, bodyTop); g.lineTo(cx, bodyTop + h * 0.1); g.lineTo(cx - w * 0.12, bodyTop); g.closePath(); g.fill();
    g.fillStyle = sk.obi || sk.sleeveTrim || '#d81e1e'; g.fillRect(x, bodyTop + h * 0.24, w, h * 0.08);
  }
  if (sk.dress) {
    const yS = bodyTop + (baseY - bodyTop) * 0.36, yB = baseY - h * 0.1;
    g.fillStyle = sk.dress; g.beginPath(); g.moveTo(x + w * 0.04, yS); g.lineTo(x + w * 0.96, yS); g.lineTo(x + w * 1.14, yB); g.lineTo(x - w * 0.14, yB); g.closePath(); g.fill();
    g.fillStyle = sk.frill || '#ffffff';
    for (let i = 0; i < 6; i++) { g.beginPath(); g.arc(x - w * 0.14 + w * 1.28 * (i + 0.5) / 6, yB, w * 1.28 / 12, 0, Math.PI); g.fill(); }
    g.fillRect(x + w * 0.04, yS - h * 0.02, w * 0.92, h * 0.035);
    g.fillStyle = sk.bow || '#ff5c8a'; const by = bodyTop + h * 0.07, R = w * 0.13;
    g.beginPath(); g.moveTo(cx, by); g.lineTo(cx - R * 1.5, by - R); g.lineTo(cx - R * 1.5, by + R); g.closePath(); g.fill();
    g.beginPath(); g.moveTo(cx, by); g.lineTo(cx + R * 1.5, by - R); g.lineTo(cx + R * 1.5, by + R); g.closePath(); g.fill();
    g.beginPath(); g.arc(cx, by, R * 0.45, 0, TAU); g.fill();
  }
  if (sk.armor) {
    g.fillStyle = sk.armor; g.strokeStyle = sk.trim || '#d9a520'; g.lineWidth = 1.3;
    rr0(g, x + w * 0.14, bodyTop + h * 0.03, w * 0.72, h * 0.24, 4); g.fill(); g.stroke();
    for (const sgn of [-1, 1]) { rr0(g, cx + sgn * w * 0.5 - w * 0.21, bodyTop - h * 0.05, w * 0.42, h * 0.13, 5); g.fill(); g.stroke(); }
    g.fillStyle = sk.trim || '#d9a520'; g.fillRect(x, bodyTop + h * 0.3, w, h * 0.04);
    g.save(); g.globalCompositeOperation = 'lighter'; g.fillStyle = sk.glow; g.globalAlpha *= 0.7 + 0.3 * Math.sin(t * 4);
    const ey = bodyTop + h * 0.15, r = w * 0.09;
    g.beginPath(); g.moveTo(cx, ey - r * 1.4); g.lineTo(cx + r, ey); g.lineTo(cx, ey + r * 1.4); g.lineTo(cx - r, ey); g.closePath(); g.fill();
    g.restore();
  }
}

// 羽のいろいろな形（feather 以外）。原点 = 肩、右へ広がる向きで描く
function featherWing(g, w, h, wc, tip) {
  g.fillStyle = wc; g.beginPath(); g.moveTo(0, 0);
  g.quadraticCurveTo(w * 0.9, -h * 0.55, w * 1.15, -h * 0.25);
  g.quadraticCurveTo(w * 0.95, -h * 0.1, w * 1.05, h * 0.05);
  g.quadraticCurveTo(w * 0.8, h * 0.05, w * 0.85, h * 0.25);
  g.quadraticCurveTo(w * 0.5, h * 0.2, 0, h * 0.2); g.closePath(); g.fill();
  if (tip) { g.strokeStyle = tip; g.lineWidth = 1.6; g.stroke(); }
  g.strokeStyle = 'rgba(0,0,0,0.15)'; g.lineWidth = 1;
  for (const k of [0.45, 0.7]) { g.beginPath(); g.moveTo(w * 0.2, h * 0.05); g.lineTo(w * (0.5 + k * 0.5), -h * 0.25 * k + h * 0.08); g.stroke(); }
}
function paintWing(g, st, w, h, wc, t) {
  if (st === 'seraph') {                                         // 熾天使: 3 対の羽、金のふち、光
    g.save(); g.globalCompositeOperation = 'lighter'; g.fillStyle = 'rgba(255,240,180,0.18)';
    g.beginPath(); g.ellipse(w * 0.6, -h * 0.1, w * 0.9, h * 0.6, -0.3, 0, TAU); g.fill(); g.restore();
    for (const [rot, sc] of [[-0.55, 0.8], [0.45, 0.7], [0, 1.05]]) {
      g.save(); g.rotate(rot + Math.sin(t * 6 + rot) * 0.06); g.scale(sc, sc); featherWing(g, w, h, wc, '#ffd23f'); g.restore();
    }
    return;
  }
  if (st === 'crystal') {                                        // 水晶: すけた結晶のかけら
    const shards = [[0.2, -0.5, 0.95], [0.5, -0.3, 1.2], [0.85, -0.05, 1.05], [1.2, 0.15, 0.75]];
    g.save();
    for (const [a, b, L] of shards) {
      const tx = w * L * Math.cos(b - 0.6), ty = -h * L * 0.7 * Math.sin(a + 0.4);
      g.fillStyle = wc; g.globalAlpha = 0.55;
      g.beginPath(); g.moveTo(0, 0); g.lineTo(tx * 0.55 - w * 0.08, ty * 0.55); g.lineTo(tx, ty); g.lineTo(tx * 0.55 + w * 0.08, ty * 0.55 + h * 0.06); g.closePath(); g.fill();
      g.globalAlpha = 0.9; g.strokeStyle = '#ffffff'; g.lineWidth = 1; g.stroke();
    }
    g.globalCompositeOperation = 'lighter'; g.globalAlpha = 0.5 + 0.4 * Math.sin(t * 5); g.fillStyle = '#ffffff';
    g.beginPath(); g.arc(w * 0.62, -h * 0.42, w * 0.06, 0, TAU); g.fill();
    g.restore(); return;
  }
  if (st === 'flame') {                                          // 炎: ゆらめく炎の羽
    g.save(); g.globalCompositeOperation = 'lighter';
    for (const [col, k] of [['#ff3b1a', 1], ['#ff8a1a', 0.8], ['#ffe066', 0.55]]) {
      g.fillStyle = col; g.globalAlpha = 0.85; g.beginPath(); g.moveTo(0, h * 0.15);
      for (let i = 0; i <= 4; i++) {
        const a = -0.2 - i * 0.28, L = w * k * (1.05 + 0.18 * Math.sin(t * 14 + i * 2.1));
        g.quadraticCurveTo(Math.cos(a + 0.12) * L * 0.6, Math.sin(a + 0.12) * L * 0.6, Math.cos(a) * L, Math.sin(a) * L * 0.85);
      }
      g.quadraticCurveTo(w * 0.1, -h * 0.2, 0, 0); g.closePath(); g.fill();
    }
    g.restore(); return;
  }
  if (st === 'bat') {                                            // コウモリ: 骨とまくのぎざぎざ
    g.fillStyle = wc; g.beginPath(); g.moveTo(0, 0); g.lineTo(w * 0.5, -h * 0.45); g.lineTo(w * 1.2, -h * 0.3);
    g.quadraticCurveTo(w * 1.0, -h * 0.05, w * 1.05, h * 0.12); g.quadraticCurveTo(w * 0.8, h * 0.0, w * 0.68, h * 0.2);
    g.quadraticCurveTo(w * 0.5, h * 0.06, w * 0.32, h * 0.22); g.quadraticCurveTo(w * 0.2, h * 0.08, 0, h * 0.15); g.closePath(); g.fill();
    g.strokeStyle = 'rgba(0,0,0,0.35)'; g.lineWidth = 1.2;
    for (const [a, b] of [[1.05, 0.12], [0.68, 0.2], [0.32, 0.22]]) { g.beginPath(); g.moveTo(w * 0.5, -h * 0.45); g.lineTo(w * a, h * b); g.stroke(); }
  } else if (st === 'butterfly') {                               // ちょう: 上と下の 2 まい、もよう
    g.fillStyle = wc; g.beginPath(); g.ellipse(w * 0.55, -h * 0.22, w * 0.55, h * 0.3, -0.5, 0, TAU); g.fill();
    g.beginPath(); g.ellipse(w * 0.4, h * 0.15, w * 0.35, h * 0.2, 0.5, 0, TAU); g.fill();
    g.fillStyle = 'rgba(255,255,255,0.75)'; g.beginPath(); g.arc(w * 0.7, -h * 0.28, w * 0.12, 0, TAU); g.fill();
    g.fillStyle = 'rgba(0,0,0,0.3)'; g.beginPath(); g.arc(w * 0.45, h * 0.15, w * 0.08, 0, TAU); g.fill();
  } else if (st === 'mech') {                                    // 機械: かくばった板と光る線
    for (let i = 0; i < 3; i++) {
      g.fillStyle = i % 2 ? '#5a6478' : wc; g.beginPath();
      g.moveTo(w * 0.1, -h * 0.05 * i); g.lineTo(w * (0.9 + 0.15 * i), -h * (0.4 - 0.18 * i)); g.lineTo(w * (1.0 + 0.15 * i), -h * (0.3 - 0.18 * i)); g.lineTo(w * 0.15, h * 0.1 - h * 0.05 * i); g.closePath(); g.fill();
    }
    g.save(); g.globalCompositeOperation = 'lighter'; g.fillStyle = '#22e6ff'; g.globalAlpha *= 0.6 + 0.4 * Math.sin(t * 8);
    g.fillRect(w * 0.2, -h * 0.08, w * 0.85, 1.5); g.restore();
  } else if (st === 'light') {                                   // 光: すけた光の羽
    g.save(); g.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 4; i++) {
      g.fillStyle = wc; g.globalAlpha = 0.28 + 0.1 * Math.sin(t * 5 + i);
      g.beginPath(); g.ellipse(w * (0.35 + 0.18 * i), -h * (0.12 + 0.06 * i), w * (0.42 - 0.05 * i), h * 0.08, -0.5 - 0.15 * i, 0, TAU); g.fill();
    }
    g.restore();
  }
}
// 帽子など（頭の上）
function paintHat(g, has, x, y, w, h, f, cx, sk, t) {
  const hc = sk.hat || '#d81e1e';
  if (has('knit')) {                                             // ニット帽（しま ＋ ぼんぼん）
    g.fillStyle = hc; g.beginPath(); g.ellipse(cx, y + h * 0.1, w * 0.52, h * 0.22, 0, Math.PI, 0); g.fill();
    g.fillRect(x - 1, y + h * 0.08, w + 2, h * 0.08);
    g.fillStyle = 'rgba(255,255,255,0.35)'; g.fillRect(x, y + h * 0.0, w, h * 0.035);
    g.fillStyle = '#ffffff'; g.beginPath(); g.arc(cx, y - h * 0.13, w * 0.11, 0, TAU); g.fill();
  }
  if (has('party')) {                                            // パーティ帽（三角 ＋ しま）
    g.save(); g.translate(cx + f * w * 0.12, y + h * 0.02); g.rotate(f * 0.2);
    g.fillStyle = hc; g.beginPath(); g.moveTo(-w * 0.24, 0); g.lineTo(0, -h * 0.42); g.lineTo(w * 0.24, 0); g.closePath(); g.fill();
    g.fillStyle = '#ffe066'; for (const k of [0.3, 0.62]) { g.beginPath(); g.moveTo(-w * 0.24 * (1 - k), -h * 0.42 * k); g.lineTo(w * 0.24 * (1 - k), -h * 0.42 * k); g.lineTo(w * 0.24 * (1 - k) * 0.82, -h * 0.42 * (k + 0.08)); g.lineTo(-w * 0.24 * (1 - k) * 0.82, -h * 0.42 * (k + 0.08)); g.fill(); }
    g.beginPath(); g.arc(0, -h * 0.44, w * 0.07, 0, TAU); g.fill();
    g.restore();
  }
  if (has('tophat')) {                                           // シルクハット
    g.fillStyle = '#141418'; g.fillRect(x - w * 0.08, y + h * 0.02, w * 1.16, h * 0.06);
    g.fillRect(cx - w * 0.3, y - h * 0.34, w * 0.6, h * 0.38);
    g.fillStyle = hc; g.fillRect(cx - w * 0.3, y - h * 0.06, w * 0.6, h * 0.07);
  }
  if (has('bunny')) {                                            // うさみみ（ぴょこぴょこ）
    for (const sgn of [-1, 1]) {
      g.save(); g.translate(cx + sgn * w * 0.2, y + 2); g.rotate(sgn * (0.15 + 0.06 * Math.sin(t * 6 + sgn)));
      g.fillStyle = hc; g.beginPath(); g.ellipse(0, -h * 0.28, w * 0.11, h * 0.3, 0, 0, TAU); g.fill();
      g.fillStyle = '#ffb3c4'; g.beginPath(); g.ellipse(0, -h * 0.28, w * 0.05, h * 0.2, 0, 0, TAU); g.fill();
      g.restore();
    }
  }
  if (has('antenna')) {                                          // アンテナ（光る玉がゆれる）
    const sw = Math.sin(t * 5) * w * 0.12;
    g.strokeStyle = '#c8d0de'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(cx, y + 1); g.quadraticCurveTo(cx, y - h * 0.2, cx + sw, y - h * 0.34); g.stroke();
    g.save(); g.globalCompositeOperation = 'lighter'; g.fillStyle = hc; g.beginPath(); g.arc(cx + sw, y - h * 0.36, w * 0.09, 0, TAU); g.fill(); g.restore();
  }
  if (has('chef')) {                                             // コック帽
    g.fillStyle = '#ffffff'; g.fillRect(x + w * 0.12, y - h * 0.08, w * 0.76, h * 0.16);
    for (const dx of [-0.24, 0, 0.24]) { g.beginPath(); g.arc(cx + dx * w, y - h * 0.16, w * 0.2, 0, TAU); g.fill(); }
    g.fillStyle = 'rgba(0,0,0,0.08)'; g.fillRect(x + w * 0.12, y + h * 0.04, w * 0.76, h * 0.04);
  }
  if (has('propeller')) {                                        // プロペラ帽（まわる）
    g.fillStyle = hc; g.beginPath(); g.ellipse(cx, y + h * 0.06, w * 0.48, h * 0.16, 0, Math.PI, 0); g.fill();
    g.fillStyle = '#333'; g.fillRect(cx - 1, y - h * 0.18, 2, h * 0.12);
    const sx = Math.cos(t * 25);
    g.fillStyle = '#ffe066'; g.beginPath(); g.ellipse(cx, y - h * 0.19, Math.abs(sx) * w * 0.4 + 1, h * 0.035, 0, 0, TAU); g.fill();
  }
  if (has('witch')) {                                            // 魔女の帽子（先が折れた三角 ＋ 広いつば）
    g.fillStyle = hc; g.beginPath(); g.ellipse(cx, y + h * 0.08, w * 0.72, h * 0.07, 0, 0, TAU); g.fill();
    g.beginPath(); g.moveTo(cx - w * 0.32, y + h * 0.06); g.lineTo(cx + f * w * 0.05, y - h * 0.32); g.lineTo(cx - f * w * 0.32, y - h * 0.22); g.lineTo(cx + f * w * 0.02, y - h * 0.4); g.lineTo(cx + w * 0.32, y + h * 0.06); g.closePath(); g.fill();
    g.fillStyle = '#ffd23f'; g.fillRect(cx - w * 0.3, y - h * 0.02, w * 0.6, h * 0.05);
  }
}
// 顔の飾り
function paintFace(g, has, x, y, w, h, f, cx, eyeY, ex, sk, t) {
  const L = ex - w * 0.12, R = ex + w * 0.12, r = Math.max(2.4, w * 0.12);
  if (has('blush')) { g.fillStyle = 'rgba(255,110,150,0.55)'; for (const sx of [L - w * 0.08, R + w * 0.08]) { g.beginPath(); g.ellipse(sx, eyeY + h * 0.09, w * 0.08, h * 0.035, 0, 0, TAU); g.fill(); } }
  if (has('glasses')) {
    g.strokeStyle = sk.frame || '#222'; g.lineWidth = 1.4;
    for (const sx of [L, R]) { g.beginPath(); g.arc(sx, eyeY, r, 0, TAU); g.stroke(); }
    g.beginPath(); g.moveTo(L + r, eyeY); g.lineTo(R - r, eyeY); g.stroke();
  }
  if (has('shades')) {                                           // サングラス（光が走る）
    g.fillStyle = '#0a0a10';
    for (const sx of [L, R]) { g.beginPath(); g.ellipse(sx, eyeY + 0.5, r * 1.15, r * 0.85, 0, 0, TAU); g.fill(); }
    g.fillRect(L, eyeY - 1, R - L, 2);
    g.fillStyle = 'rgba(255,255,255,0.55)'; const sh = ((t * 0.6) % 1.4) - 0.2;
    if (sh > 0 && sh < 1) g.fillRect(L - r + (R - L + 2 * r) * sh, eyeY - r * 0.6, 1.5, r * 1.1);
  }
  if (has('eyepatch')) {
    g.strokeStyle = '#111'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(x, y + h * 0.18); g.lineTo(x + w, y + h * 0.32); g.stroke();
    g.fillStyle = '#111'; g.beginPath(); g.ellipse(f >= 0 ? R : L, eyeY, r * 1.2, r, 0, 0, TAU); g.fill();
  }
  if (has('monocle')) {
    const mx = f >= 0 ? R : L;
    g.strokeStyle = '#d9a520'; g.lineWidth = 1.5; g.beginPath(); g.arc(mx, eyeY, r * 1.25, 0, TAU); g.stroke();
    g.beginPath(); g.moveTo(mx + r * 1.2, eyeY + r * 0.5); g.quadraticCurveTo(mx + r * 2, eyeY + h * 0.2, mx + r * 0.5, eyeY + h * 0.3); g.stroke();
  }
  if (has('foxmask')) {                                          // きつねのお面（顔の上半分）
    g.fillStyle = '#fbf6ec'; rr2(g, x + w * 0.06, y + h * 0.12, w * 0.88, h * 0.3, 6); g.fill();
    for (const sgn of [-1, 1]) { g.beginPath(); g.moveTo(cx + sgn * w * 0.2, y + h * 0.14); g.lineTo(cx + sgn * w * 0.4, y - h * 0.1); g.lineTo(cx + sgn * w * 0.44, y + h * 0.16); g.fill(); }
    g.fillStyle = '#d81e1e';
    for (const sx of [L, R]) { g.beginPath(); g.ellipse(sx, eyeY, r * 1.1, r * 0.35, sx < cx ? 0.35 : -0.35, 0, TAU); g.fill(); }
    g.fillRect(cx - 1, y + h * 0.16, 2, h * 0.07);
  }
}
const rr2 = (g, X, Y, W2, H2, R) => { g.beginPath(); g.roundRect ? g.roundRect(X, Y, W2, H2, R) : g.rect(X, Y, W2, H2); };

// スキンの「動いた跡」: 動いている間（と空中）は細かく、止まっている時はたまに粒を出す
const TRAIL_RAINBOW = ['#ff4d4d', '#ff9f43', '#ffe66d', '#5cff9d', '#4dd2ff', '#6c7bff', '#c77dff'];
let trailT = 0, trailClock = 0;
function heroTrail(sk, p) {
  if (!sk.trail || gfx === 0 || (scene !== 'play' && scene !== 'title')) return;
  const now = performance.now() / 1000, dt = Math.min(0.1, now - (trailClock || now)); trailClock = now;
  const active = Math.abs(player.vx) > 20 || !player.onGround;
  trailT += dt;
  if (trailT < (active ? 0.035 : 0.22)) return;
  trailT = 0;
  const x = p.x - player.facing * player.w * 0.3 + (Math.random() - 0.5) * 8, y = p.y + (Math.random() - 0.3) * player.h * 0.6;
  const o = {
    spark:   { color: Math.random() < 0.5 ? '#ffe066' : '#ffffff', speed: 70, life: 0.35, size: 2.2, gravity: 260 },
    rainbow: { color: TRAIL_RAINBOW[Math.floor(now * 10) % 7], speed: 18, life: 0.6, size: 4, gravity: 0 },
    ember:   { color: Math.random() < 0.5 ? '#ff7a1a' : '#ffd23f', speed: 40, life: 0.6, size: 2.6, gravity: -140 },
    bubble:  { color: '#9fe8ff', speed: 20, life: 0.8, size: 2.8, gravity: -90 },
    petal:   { color: Math.random() < 0.6 ? '#ffb3cf' : '#ffffff', speed: 50, life: 0.9, size: 3, gravity: 50 },
    star:    { color: '#fff4c0', speed: 30, life: 0.5, size: 2.4, gravity: 0 },
    snow:    { color: '#ffffff', speed: 20, life: 1.0, size: 6, gravity: 40, shape: 'snow' },
    heart:   { color: '#ff5c8a', speed: 30, life: 0.8, size: 8, gravity: -40, shape: 'heart' },
    note:    { color: '#ffe066', speed: 30, life: 0.9, size: 10, gravity: -50, shape: 'note' },
    leaf:    { color: Math.random() < 0.5 ? '#7ac74f' : '#e0a030', speed: 40, life: 1.0, size: 8, gravity: 60, shape: 'leaf' },
    bolt:    { color: Math.random() < 0.7 ? '#ffe066' : '#9fe8ff', speed: 60, life: 0.3, size: 11, gravity: 0, shape: 'bolt' },
    pixel:   { color: TRAIL_RAINBOW[(Math.random() * 7) | 0], speed: 30, life: 0.6, size: 5, gravity: 0 },
    comet:   { color: '#ffffff', speed: 10, life: 0.7, size: 9, gravity: 0, shape: 'star' },
    gem:     { color: ['#4dd2ff', '#ff3b6b', '#5cff9d', '#ffd23f', '#c77dff'][(Math.random() * 5) | 0], speed: 30, life: 0.7, size: 8, gravity: 80, shape: 'star' },
    feather: { color: '#ffffff', speed: 25, life: 1.2, size: 9, gravity: 30, shape: 'leaf' },
    galaxy:  { color: ['#c77dff', '#6c7bff', '#ffffff', '#ff7ad0'][(Math.random() * 4) | 0], speed: 22, life: 0.9, size: Math.random() < 0.3 ? 8 : 3, gravity: 0, shape: Math.random() < 0.3 ? 'star' : undefined },
    gold:    { color: Math.random() < 0.6 ? '#ffd23f' : '#fff4c0', speed: 60, life: 0.7, size: 3, gravity: 200 },
    firefly: { color: '#c8ff7a', speed: 15, life: 1.3, size: 3, gravity: -30 },
  }[sk.trail];
  if (o && sk.trailColor && sk.trail !== 'rainbow' && sk.trail !== 'pixel') o.color = Math.random() < 0.7 ? sk.trailColor : '#ffffff';
  if (o) sparks(x, y, { n: 1, ...o });
}

// かすった: プレイヤーの、弾がいる側のふちから白い火花
function fxGraze(b) {
  if (theme().graze && theme().graze(b) === true) return;
  const p = playerXY(), bx = b.x != null && b.kind !== 'laser' ? b.x : p.x, by = b.y != null && b.kind !== 'laser' ? b.y : p.y - 20;
  const a = Math.atan2(by - p.y, bx - p.x);
  sparks(p.x + Math.cos(a) * 14, p.y + Math.sin(a) * 18, { n: 4, color: '#ffffff', speed: 150, life: 0.25, size: 2, gravity: 0, dir: a, spread: 1.4 });
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

  if (gfx > 0) ctx.drawImage(screenOverlay(gfx === 2 && !th.noScanlines), 0, 0, W, H);   // 周辺減光 ＋ 走査線（前もって1枚の絵にしてある）

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
