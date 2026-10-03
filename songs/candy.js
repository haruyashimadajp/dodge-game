"use strict";

/* =========================================================================
   曲⑬  Candy Pop Parade（オリジナル曲）  —  拍・場面・譜面
   かわいい・ファンシー。お菓子の国のパレード。150 BPM のキュートなフューチャーベース。
   曲は songs/candy-compose.py で作曲・合成した（オルゴール・鉄琴・8ビットのリード・かわいい声のチョップ・
   ゆれる和音・おもちゃの「ピュイッ」・しゃぼん玉の「ポン」）。
   難易度はふつう。演出は visuals-candy.js。

   この曲だけの形（game.js の「Candy Pop Parade」の所）:
     gumdrop / candyCane / heartRing / jellyBear / donut / bubble ＋ ペロペロキャンディの針（clockHand）
   ========================================================================= */

// 150 BPM: 1拍 = 0.4秒、1小節 = 1.6秒。0拍目 = 0.5秒
const CD_BEAT = 0.4;
function cdBeatTime(n) { return 0.5 + n * CD_BEAT; }
function cdBeatPos(t)  { return (t - 0.5) / CD_BEAT; }

const CD_SECTIONS = [
  { t: 0,     tier: 0.5, name: 'Welcome!',       sub: 'おかしの国へ ようこそ',          sky: ['#ffd6ec', '#d9f2ff'], color: '#ff7eb6', pulse: 0.004, sway: 0.2, stars: 0 },
  { t: 13.3,  tier: 1.5, name: 'Gumdrop Hop',    sub: 'グミがぴょんぴょん',            sky: ['#ffe0f0', '#e2fff2'], color: '#ff9f43', pulse: 0.01,  sway: 0.3, stars: 0 },
  { t: 26.1,  tier: 2,   name: 'Lollipop Twirl', sub: 'くるくるペロペロキャンディ',      sky: ['#ecdcff', '#ffe3f1'], color: '#b48cff', pulse: 0.012, sway: 0.3, stars: 0 },
  { t: 38.9,  tier: 3,   name: 'Candy Parade',   sub: 'パレードがやってきた！',         sky: ['#ffc8e4', '#fff1c9'], color: '#ff5fa2', pulse: 0.02,  sway: 0.5, stars: 0 },
  { t: 64.5,  tier: 1,   name: 'Bubble Bath',    sub: 'しゃぼん玉の時間',              sky: ['#d4f4ff', '#f1e4ff'], color: '#6fc8ff', pulse: 0.004, sway: 0.2, stars: 0 },
  { t: 77.3,  tier: 2,   name: 'Sugar Rush',     sub: 'もうすぐクライマックス',          sky: ['#ffe6cc', '#ffd6ec'], color: '#ffb02e', pulse: 0.012, sway: 0.3, stars: 0 },
  { t: 90.1,  tier: 4,   name: 'Sweetest Finale', sub: 'いちばん甘いフィナーレ',        sky: ['#ffb8dc', '#c9f7ff'], color: '#ff4f9a', pulse: 0.024, sway: 0.6, stars: 0 },
  { t: 115.7, tier: 0.5, name: '',               sub: '',                             sky: ['#ffe6f3', '#e6f7ff'], color: '#ff7eb6', pulse: 0.004, sway: 0.2, stars: 0 },
];

// 弾の速さ: 0.9〜1.2倍（ふつう）
function cdSpeedAt(t) {
  let i = 0;
  while (i + 1 < CD_SECTIONS.length && CD_SECTIONS[i + 1].t <= t) i++;
  return 0.9 + 0.075 * CD_SECTIONS[i].tier;
}

function candyChart() {
  const cues = [];
  const burst = (t, fn) => cues.push({ t, fn });
  const B = CD_BEAT;
  const beat = cdBeatTime;
  const bar = k => beat(k * 4);
  const fire = (t, warn, fn) => burst(t - warn, () => fn(warn));
  const SC = SCORE_CANDY;
  const CX = W / 2;
  const PINK = '#ff6fae', MINT = '#5fe0b0', LEMON = '#ffd84d', GRAPE = '#b48cff', SODA = '#6fc8ff', ORANGE = '#ff9f43', CHERRY = '#ff4d6d';
  const CANDY = [PINK, MINT, LEMON, GRAPE, SODA, ORANGE];
  const inBars = (b, k0, k1) => b >= k0 * 4 && b < k1 * 4;
  const px = (m, lo, hi) => 60 + (W - 120) * Math.max(0, Math.min(1, (m - lo) / (hi - lo)));
  const hsh = (a, b = 0) => { const v = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return v - Math.floor(v); };

  const sprinkle = (t, x, color, v = 150) => fire(t, 0.5, delay => spawn({ x, y: -10, vy: v, r: 6, delay, color, style: 'sprinkle', lane: [0, 1] }));
  const gum = (t, fromLeft, color, o = {}) => fire(t, 0.7, delay => gumdrop({ x: fromLeft ? 30 : W - 30, vx: (fromLeft ? 1 : -1) * (o.v || 170), apex: o.apex || 200, delay, color, bounces: o.n || 5 }));
  const cane = (t, x, o = {}) => fire(t, 0.6, delay => candyCane({ x, vy: o.v || 270, delay, color: o.color || CHERRY }));
  const hearts = (t, x, y, o = {}) => fire(t, 0.8, delay => heartRing({ x, y, n: o.n || 24, speed: o.v || 110, delay, color: o.color || PINK }));
  const bear = (t, fromLeft, color) => fire(t, 1.0, delay => jellyBear({ fromLeft, v: 160, delay, color }));
  const dough = (t, x, y, gapA, o = {}) => fire(t, 1.0, delay => donut({ x, y, gapA, gap: o.gap || 1.3, dur: o.dur || 4.5, delay, color: o.color || '#ffb3d1' }));
  const lolli = (t, cx, cy, o = {}) => fire(t, 1.0, delay => { const h = clockHand({ cx, cy, len: o.len || 330, a0: o.a0 != null ? o.a0 : -Math.PI / 2, step: o.step || Math.PI / 8, life: o.life || 8 * B * 4 / 2, delay, color: o.color || PINK, hub: 30 }); h.lolli = true; });
  const bub = (t, x, popB) => fire(t, 0.4, delay => bubble({ x, popAt: beat(popB), delay, color: '#bfe8ff', starColor: CANDY[(Math.round(x) >> 4) % 6] }));
  const hint = (t, text, beats = 4) => burst(t, () => stageHint(text, beats * B));

  // ===== Welcome! 0〜8小節 ｜ オルゴール = 上からカラースプレー（ゆっくり）================================
  SC.bell.filter(([b]) => b < 32).forEach(([b, m], i) => { if (i % 2 === 0) sprinkle(beat(b), px(m, 65, 86), CANDY[i % 6], 130); });

  // ===== Gumdrop Hop 8〜16小節 ｜ キック = グミがはねてくる ／ おもちゃの音 = キャンディケイン ／ リード = スプレー ======
  hint(bar(8) - 2 * B, 'グミ ─ はねる高さを見て、くぐるか跳ぶ');
  for (let k = 8; k < 16; k += 2) gum(bar(k), k % 4 === 0, CANDY[k % 6]);
  SC.squeak.filter(b => inBars(b, 8, 16)).forEach((b, i) => { cane(beat(b), 120 + hsh(b) * (W - 240)); });
  SC.lead.filter(([b]) => inBars(b, 8, 16)).forEach(([b, , m], i) => { if (i % 3 === 0) sprinkle(beat(b), px(m, 64, 76), CANDY[i % 6], 170); });

  // ===== Lollipop Twirl 16〜24小節 ｜ ペロペロキャンディ（拍ごとに回る）／ ハートの輪 ／ 盛り上がり: ケインの雨 ======
  hint(bar(16) - 2 * B, 'ペロペロキャンディ ─ 次に止まる所はうすい線');
  lolli(bar(16), CX, GROUND_Y - 170, { len: 300, a0: -Math.PI / 2, step: Math.PI / 6, life: 6 * 4 * B });
  for (const k of [17, 19, 21]) hearts(bar(k), k === 19 ? 200 : 600, 200, { color: [PINK, GRAPE, CHERRY][(k - 17) / 2] });
  for (let i = 0; i < 12; i++) cane(bar(22) + i * B * 0.66, 60 + ((i * 5) % 12) * 62, { v: 300, color: i % 2 ? CHERRY : MINT });

  // ===== Candy Parade 24〜40小節 ｜ 声のチョップ = 小さなハート ／ クマのグミが行進 ／ ドーナツ ／ グミ ====================
  hearts(bar(24), CX, 220, { n: 28, v: 120, color: PINK });
  SC.chop.filter(([b]) => inBars(b, 24, 40)).forEach(([b, m], i) => { if (i % 2 === 0) fire(beat(b), 0.55, delay => spawn({ x: px(m, 76, 92), y: -10, vy: 190, vx: (hsh(b) - 0.5) * 60, r: 8, delay, color: CANDY[i % 6], style: 'heart', lane: [0, 1] })); });
  for (const [k, L] of [[26, true], [30, false], [34, true], [38, false]]) bear(bar(k), L, [ORANGE, MINT, GRAPE, CHERRY][(k - 26) / 4]);
  hint(bar(28) - 3 * B, 'ドーナツ ─ かじった所を通る');
  for (const [k, x, gap] of [[28, CX, Math.PI / 2], [32, 160, 0.3], [36, W - 160, Math.PI - 0.3]]) dough(bar(k), x, GROUND_Y - 220, gap);
  for (const k of [25, 27, 29, 31, 33, 35, 37, 39]) gum(bar(k) + 2 * B, k % 4 === 1, CANDY[k % 6], { v: 200, apex: 180 });

  // ===== Bubble Bath 40〜48小節 ｜ しゃぼん玉が上って、「ポン」ではじけて星になる ===================================
  hint(bar(40), 'しゃぼん玉 ─ はじけると星がとびだす');
  SC.pop.forEach((b, i) => bub(beat(b) - 4 * B, 80 + ((i * 7) % 16) * 42, b));
  SC.bell.filter(([b]) => inBars(b, 40, 48)).forEach(([b, m], i) => { if (i % 3 === 0) sprinkle(beat(b), px(m, 65, 86), CANDY[i % 6], 120); });

  // ===== Sugar Rush 48〜56小節 ｜ 鉄琴 = キャンディケイン ／ ペロペロキャンディ2本 ／ 盛り上がり ===========================
  SC.bell.filter(([b]) => inBars(b, 48, 56)).forEach(([b, m], i) => { if (i % 2 === 0) cane(beat(b), px(m, 74, 98), { color: i % 4 ? CHERRY : GRAPE }); });
  lolli(bar(48), 200, GROUND_Y - 150, { len: 260, a0: 0, step: Math.PI / 8, life: 4 * 4 * B, color: MINT });
  lolli(bar(52), W - 200, GROUND_Y - 150, { len: 260, a0: Math.PI, step: -Math.PI / 8, life: 4 * 4 * B, color: GRAPE });
  for (let i = 0; i < 8; i++) gum(bar(54) + i * B, i % 2 === 0, CANDY[i % 6], { v: 220, apex: 160, n: 3 });

  // ===== Sweetest Finale 56〜72小節 ｜ ぜんぶ ====================================================================
  hearts(bar(56), CX, 200, { n: 32, v: 130, color: CHERRY });
  SC.chop.filter(([b]) => inBars(b, 56, 72)).forEach(([b, m], i) => { if (i % 2 === 0) fire(beat(b), 0.5, delay => spawn({ x: px(m, 78, 94), y: -10, vy: 220, vx: (hsh(b) - 0.5) * 80, r: 8, delay, color: CANDY[i % 6], style: 'heart', lane: [0, 1] })); });
  for (const [k, L] of [[58, true], [62, false], [66, true], [70, false]]) bear(bar(k), L, CANDY[k % 6]);
  for (const [k, x, gap] of [[60, CX, Math.PI / 2], [64, 180, 0.2], [68, W - 180, Math.PI - 0.2]]) dough(bar(k), x, GROUND_Y - 220, gap, { dur: 4 });
  for (let k = 57; k < 72; k += 2) gum(bar(k) + 2 * B, k % 4 === 1, CANDY[k % 6], { v: 210, apex: 190 });
  lolli(bar(64), CX, GROUND_Y - 170, { len: 300, a0: -Math.PI / 2, step: -Math.PI / 6, life: 4 * 4 * B, color: CHERRY });
  for (const k of [61, 65, 69]) hearts(bar(k) + 2 * B, k === 65 ? 600 : 200, 180, { n: 20, v: 120, color: [GRAPE, SODA, LEMON][(k - 61) / 4] });

  return cues.sort((a, b) => a.t - b.t);
}

addSong({
  id: 'candy',
  title: 'Candy Pop Parade',
  meta: '150 BPM · 2:00 · オリジナル曲 · かわいい',
  file: 'CandyPop.mp3',
  bpm: 150, beat: CD_BEAT, end: 118.5,
  beatTime: cdBeatTime,
  beatPos: cdBeatPos,
  speedAt: cdSpeedAt,
  env: ENV_CANDY,
  sections: CD_SECTIONS,
  build: candyChart,
  theme: 'candy',                  // visuals-candy.js の見た目のセット
  titleLook: { sky: ['#ffd6ec', '#d9f2ff'], color: '#ff7eb6', tier: 1, pulse: 0.008, stars: 0 },
  titleBpm: 150,
  preview: 38.9,
  clearTitle: 'SWEET♡',
  overTitle: 'とけちゃった…',
  clearText: 'パレード、だいせいこう！',
  bestKey: 'dodge_best_candy',
});
