"use strict";

/* =========================================================================
   曲⑨  Abyss（オリジナル曲）  —  拍・場面・譜面
   深海。90 BPM のゆったりした曲で、弾はどの曲よりも遅い。でも、むずかしい。
   遅い弾が画面にたくさん残るので、すき間を見つけて「通り抜ける」のが大事。
   曲は songs/abyss-compose.py で作曲・合成した（ソナー・クジラの声・カリンバ・心臓の音）。

   この曲だけの仕掛け（game.js の「Abyss」の所）:
     クラゲ         … 拍ごとにこちらへグッと泳いで止まる。触手も当たる
     マリンスノー   … ゆれながらゆっくり沈む小さな粒。画面じゅうに降る
     暗い海         … 自分のまわりしか見えない。弾はうっすら光り、ソナーの輪が通ると一瞬はっきり見える
     リヴァイアサン … 巨大な長い生き物が、うねりながら画面を横切る
   ========================================================================= */

// 90 BPM: 1拍 = 0.6667秒、1小節 = 2.667秒。0拍目 = 0.5秒
const AB_BEAT = 60 / 90;
function abBeatTime(n) { return 0.5 + n * AB_BEAT; }
function abBeatPos(t)  { return (t - 0.5) / AB_BEAT; }

const AB_SECTIONS = [
  { t: 0,      tier: 0.5, name: 'SURFACE',    sub: '水面',                            sky: ['#0a3a5c', '#0e5a7a'], color: '#7fe8ff', pulse: 0.004, sway: 0.2, stars: 30 },
  { t: 11.17,  tier: 1.5, name: 'DESCENT',    sub: '沈んでいく ─ 光る粒の雨',          sky: ['#06263f', '#0a3d5a'], color: '#7fe8ff', pulse: 0.006, sway: 0.3, stars: 50 },
  { t: 32.5,   tier: 2.5, name: 'JELLYFISH',  sub: 'クラゲ ─ 拍ごとに泳いでくる',      sky: ['#04182c', '#0a2c48'], color: '#ff8ad8', pulse: 0.008, sway: 0.35, stars: 60 },
  { t: 53.83,  tier: 3,   name: 'DARK WATER', sub: '暗い海 ─ ソナーで見る',            sky: ['#010812', '#03121f'], color: '#5cffc8', pulse: 0.006, sway: 0.2, stars: 20 },
  { t: 75.17,  tier: 3,   name: 'RISING',     sub: '何かが上がってくる',              sky: ['#020c18', '#062238'], color: '#ffd27f', pulse: 0.01,  sway: 0.4, stars: 40, zoom: [1, 1.04] },
  { t: 80.5,   tier: 4,   name: 'LEVIATHAN',  sub: '深海の主',                         sky: ['#04101e', '#0c2e4a'], color: '#7fe8ff', pulse: 0.014, sway: 0.5, stars: 70 },
  { t: 107.17, tier: 0.5, name: 'ABYSS',      sub: '',                                sky: ['#000408', '#020c16'], color: '#7fe8ff', pulse: 0.003, sway: 0.1, stars: 20 },
];

// 弾の速さ: 0.6倍〜 0.75倍（どの曲よりも遅い）
function abSpeedAt(t) {
  let i = 0;
  while (i + 1 < AB_SECTIONS.length && AB_SECTIONS[i + 1].t <= t) i++;
  return 0.6 + 0.04 * AB_SECTIONS[i].tier;
}

function abyssChart() {
  const cues = [];
  const burst = (t, fn) => cues.push({ t, fn });
  const B = AB_BEAT;
  const beat = abBeatTime;
  const bar = k => beat(k * 4);
  const fire = (t, warn, fn) => burst(t - warn, () => fn(warn));
  const SC = SCORE_ABYSS;
  const CX = W / 2;
  const CYAN = '#7fe8ff', PINK = '#ff8ad8', MINT = '#5cffc8', GOLD = '#ffd27f', WHITE = '#e8fbff', BLUE = '#5c9dff';
  const px = (m, lo, hi) => 40 + (W - 80) * Math.max(0, Math.min(1, (m - lo) / (hi - lo)));

  const ringAt = (t, x, y, n, v, color = CYAN, r = 8, start = 0, warn = 0.8) => fire(t, warn, delay => ring({ x, y, count: n, speed: v, r, start, delay, color }));
  // 旋律 → 音の高さの場所から、ゆれながら沈む光の粒
  const glitter = (list, vy, color, amp = 24) => list.forEach(([b, , m], i) =>
    fire(beat(b), 0.5, delay => snow({ x: px(m, 60, 92), y: -8, vy, amp, freq: 0.5, r: 7, delay, color: typeof color === 'function' ? color(i) : color })));
  const snowfall = (t, n, vy = 70) => burst(t, () => { for (let i = 0; i < n; i++) snow({ x: rand(20, W - 20), y: rand(-40, -8), vy: vy * rand(0.8, 1.2), amp: rand(15, 45), freq: rand(0.3, 0.7), r: 5, color: WHITE }); });
  const jellyAt = (t, x, o = {}) => fire(t, 0.8, delay => jelly({ x, y: o.y || 60, v: o.v || 260, every: o.every || 1, life: o.life || 7, delay, color: o.color || PINK }));
  const ping = (t, rings = true) => burst(t, () => { const p = playerXY(); sonar(p.x, p.y); });
  const lev = (t, o) => fire(t, 1.6, delay => leviathan({ ...o, delay, color: o.color || BLUE }));

  // ===== SURFACE 0〜4小節 ｜ ソナーの音 = 上からゆっくり広がる輪 =========================================
  for (const k of [0, 2]) ringAt(bar(k) + 0.1, CX, 40, 28, 80, CYAN, 8, k * 0.11);
  snowfall(bar(1), 10); snowfall(bar(3), 14);

  // ===== DESCENT 4〜12小節 ｜ カリンバの8分 = 光る粒の雨 ／ ソナー = 左右の上からの輪 ================
  glitter(SC.melA, 95, i => (i % 8 === 0 ? GOLD : CYAN));
  for (let k = 4; k < 12; k += 2) ringAt(bar(k) + 0.1, k % 4 ? 60 : W - 60, 60, 26, 75, MINT, 8, k * 0.2);

  // ===== JELLYFISH 12〜20小節 ｜ クラゲ ／ 旋律 = 大きな粒 ／ 輪 ======================================
  for (const [k, x] of [[12, 160], [13, W - 160], [15, CX], [16, 120], [17, W - 120], [19, CX]]) jellyAt(bar(k), x, { life: 6.5 });
  glitter(SC.melB, 85, PINK, 40);
  for (let k = 12; k < 20; k += 2) ringAt(bar(k) + 0.1, CX, 40, 32, 70, CYAN, 7, k * 0.17);
  for (let k = 12; k < 20; k++) snowfall(bar(k) + 2 * B, 4);

  // ===== DARK WATER 20〜28小節 ｜ 暗い海: 自分のまわりだけ見える ＋ ソナー（2拍ごと）＋ 雪 ＋ クラゲ =====
  burst(bar(20) - 2 * B, () => { stageHint('ソナーで見る', 4 * B); stageTo({ dark: 1 }, 2 * B); });
  SC.ping.filter(b => b >= 80 && b < 112).forEach(b => ping(beat(b)));
  for (let k = 20; k < 28; k++) {
    snowfall(bar(k), 7, 75); snowfall(bar(k) + 2 * B, 7, 75);
    if (k % 2 === 1) ringAt(bar(k), k % 4 === 1 ? 40 : W - 40, 300, 24, 70, MINT, 8, k * 0.3);
  }
  for (const [k, x] of [[21, 140], [23, W - 140], [25, CX], [26, 100]]) jellyAt(bar(k), x, { color: MINT, life: 6, v: 240 });
  burst(bar(28), () => stageTo({ dark: 0 }, 4 * B));

  // ===== RISING 28〜30小節 ｜ 下から上がる泡の柱（すき間を通る）=====================================
  for (let i = 0; i < 8; i++) fire(bar(28) + i * B, 0.7, delay => {
    const gap = 160 + i * 70;                             // すき間は1拍ごとに 70px ずつ右へ（走って追いかける）
    for (let x = 30; x < W; x += 46) if (Math.abs(x - gap) > 70) spawn({ x, y: GROUND_Y + 10, vy: -110, r: 8, delay, color: GOLD, style: 'bubble' });
  });

  // ===== LEVIATHAN 30〜40小節 ｜ リヴァイアサン ＋ 旋律の粒 ＋ うずまき ＋ クラゲ ==================
  burst(bar(30), () => { flash(0.4); shake(8); });
  lev(bar(30), { y: 330, dir: 1, v: 150, amp: 150, wave: 0.28 });
  lev(bar(34), { y: 420, dir: -1, v: 170, amp: 170, wave: 0.32, color: '#4a7dff' });
  lev(bar(38), { y: 360, dir: 1, v: 190, amp: 190, wave: 0.36, color: '#6a8dff' });
  glitter(SC.melC, 100, i => (i % 4 === 0 ? GOLD : CYAN), 20);
  for (let k = 31; k < 40; k += 2) fire(bar(k), 0.9, delay => spiral({ x: CX, y: 120, count: 28, speed: 70, r: 8, turns: k % 4 === 1 ? 1 : -1, gap: 0.06, start: k * 0.4, delay, color: PINK }));
  for (const [k, x] of [[32, 120], [36, W - 120]]) jellyAt(bar(k), x, { life: 6 });
  for (let k = 30; k < 40; k++) snowfall(bar(k), 3);

  // ===== ABYSS 40〜 ｜ 最後のソナー ==============================================================
  burst(bar(40), () => { const p = playerXY(); sonar(p.x, p.y); flash(0.3); });
  ringAt(bar(40) + 0.1, CX, 200, 36, 60, CYAN, 8);

  return cues.sort((a, b) => a.t - b.t);
}

addSong({
  id: 'abyss',
  title: 'Abyss',
  meta: '90 BPM · 1:54 · オリジナル曲 · 遅い弾、でもむずかしい',
  file: 'Abyss.mp3',
  bpm: 90, beat: AB_BEAT, end: 113.5,
  beatTime: abBeatTime,
  beatPos: abBeatPos,
  speedAt: abSpeedAt,
  env: ENV_ABYSS,
  sections: AB_SECTIONS,
  build: abyssChart,
  theme: 'abyss',                  // visuals-abyss.js の見た目のセット
  titleLook: { sky: ['#04182c', '#0a3d5a'], color: '#7fe8ff', tier: 1, pulse: 0.006, stars: 40 },
  titleBpm: 90,
  preview: 80.5,
  clearText: '深海から帰ってきた。',
  bestKey: 'dodge_best_abyss',
});
