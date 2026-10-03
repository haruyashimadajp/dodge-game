"use strict";

/* =========================================================================
   曲⑬  Candy Pop Parade（オリジナル曲）  —  拍・場面・譜面
   かわいい・ファンシー。お菓子の国のパレード。150 BPM のキュートなフューチャーベース。
   曲は songs/candy-compose.py で作曲・合成した（オルゴール・鉄琴・8ビットのリード・かわいい声のチョップ・
   ゆれる和音・おもちゃの「ピュイッ」・しゃぼん玉の「ポン」）。
   難易度はむずかしめ（見た目はかわいいけど手ごわい）。演出は visuals-candy.js。

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

// 弾の速さ: 1.0〜1.3倍（むずかしめ）
function cdSpeedAt(t) {
  let i = 0;
  while (i + 1 < CD_SECTIONS.length && CD_SECTIONS[i + 1].t <= t) i++;
  return 1.0 + 0.08 * CD_SECTIONS[i].tier;
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

  // ===== Welcome! 0〜8小節 ｜ オルゴール = 上からカラースプレー ／ 4小節からグミも =========================
  SC.bell.filter(([b]) => b < 32).forEach(([b, m], i) => sprinkle(beat(b), px(m, 65, 86), CANDY[i % 6], 160));
  for (const k of [4, 6]) gum(bar(k), k === 4, CANDY[k % 6], { v: 170, apex: 190, n: 4 });

  // ===== Gumdrop Hop 8〜16小節 ｜ キック = グミ（毎小節・左右から）／ おもちゃの音 = ケイン3本 ／ リード = スプレー ======
  hint(bar(8) - 2 * B, 'グミ ─ はねる高さを見て、くぐるか跳ぶ');
  for (let k = 8; k < 16; k++) gum(bar(k), k % 2 === 0, CANDY[k % 6], { v: 190 + (k % 3) * 20, apex: 170 + (k % 4) * 20 });
  SC.squeak.filter(b => inBars(b, 8, 16)).forEach(b => { for (const dx of [-110, 0, 110]) cane(beat(b) + Math.abs(dx) / 1100, 120 + hsh(b, dx) * (W - 240), { v: 320 }); });
  SC.lead.filter(([b]) => inBars(b, 8, 16)).forEach(([b, , m], i) => sprinkle(beat(b), px(m, 64, 76), CANDY[i % 6], 210));

  // ===== Lollipop Twirl 16〜24小節 ｜ ペロペロキャンディ2本 ／ ハートの輪（毎小節）／ 盛り上がり: ケインの雨 ======
  hint(bar(16) - 2 * B, 'ペロペロキャンディ ─ 次に止まる所はうすい線');
  lolli(bar(16), 220, GROUND_Y - 170, { len: 300, a0: -Math.PI / 2, step: Math.PI / 5, life: 6 * 4 * B });
  lolli(bar(18), W - 220, GROUND_Y - 170, { len: 300, a0: -Math.PI / 2, step: -Math.PI / 5, life: 4 * 4 * B, color: GRAPE });
  for (let k = 16; k < 22; k++) hearts(bar(k) + 2 * B, k % 2 ? 220 : 580, 190, { n: 26, v: 135, color: [PINK, GRAPE, CHERRY][k % 3] });
  for (let i = 0; i < 20; i++) cane(bar(22) + i * B * 0.4, 50 + ((i * 7) % 20) * 36, { v: 340, color: i % 2 ? CHERRY : MINT });

  // ===== Candy Parade 24〜40小節 ｜ 声のチョップ = ハート（ぜんぶ）／ クマ（2小節ごと）／ ドーナツ ／ グミ ／ ハートの輪 ======
  hearts(bar(24), CX, 220, { n: 32, v: 140, color: PINK });
  SC.chop.filter(([b]) => inBars(b, 24, 40)).forEach(([b, m], i) => fire(beat(b), 0.5, delay => spawn({ x: px(m, 76, 92), y: -10, vy: 230, vx: (hsh(b) - 0.5) * 90, r: 8, delay, color: CANDY[i % 6], style: 'heart', lane: [0, 1] })));
  for (let k = 26; k < 40; k += 2) bear(bar(k), k % 4 === 2, CANDY[k % 6]);
  hint(bar(28) - 3 * B, 'ドーナツ ─ かじった所を通る');
  for (const [k, x, gap] of [[28, CX, Math.PI / 2], [31, 160, 0.3], [34, W - 160, Math.PI - 0.3], [37, CX, Math.PI / 2]]) dough(bar(k), x, GROUND_Y - 220, gap, { gap: 1.1, dur: 3.8 });
  for (let k = 25; k < 40; k++) gum(bar(k) + 2 * B, k % 2 === 1, CANDY[k % 6], { v: 220, apex: 170 });
  for (const k of [30, 36]) hearts(bar(k), k === 30 ? 200 : 600, 170, { n: 24, v: 150, color: CHERRY });

  // ===== Bubble Bath 40〜48小節 ｜ しゃぼん玉が「ポン」ではじけて星（8つ）／ スプレーの雨 ============================
  hint(bar(40), 'しゃぼん玉 ─ はじけると星がとびだす');
  SC.pop.forEach((b, i) => fire(beat(b) - 4 * B, 0.4, delay => bubble({ x: 80 + ((i * 7) % 16) * 42, popAt: beat(b), delay, color: '#bfe8ff', stars: 8, starColor: CANDY[i % 6] })));
  SC.bell.filter(([b]) => inBars(b, 40, 48)).forEach(([b, m], i) => sprinkle(beat(b), px(m, 65, 86), CANDY[i % 6], 170));

  // ===== Sugar Rush 48〜56小節 ｜ 鉄琴 = キャンディケイン（ぜんぶ）／ ペロペロキャンディ2本 ／ グミの連続 ===================
  SC.bell.filter(([b]) => inBars(b, 48, 56)).forEach(([b, m], i) => cane(beat(b), px(m, 74, 98), { v: 330, color: i % 4 ? CHERRY : GRAPE }));
  lolli(bar(48), 200, GROUND_Y - 150, { len: 270, a0: 0, step: Math.PI / 6, life: 8 * 4 * B, color: MINT });
  lolli(bar(50), W - 200, GROUND_Y - 150, { len: 270, a0: Math.PI, step: -Math.PI / 6, life: 6 * 4 * B, color: GRAPE });
  for (let i = 0; i < 12; i++) gum(bar(53) + i * B, i % 2 === 0, CANDY[i % 6], { v: 240, apex: 150, n: 3 });

  // ===== Sweetest Finale 56〜72小節 ｜ ぜんぶ（いちばん多く）==========================================================
  hearts(bar(56), CX, 200, { n: 36, v: 150, color: CHERRY });
  SC.chop.filter(([b]) => inBars(b, 56, 72)).forEach(([b, m], i) => fire(beat(b), 0.45, delay => spawn({ x: px(m, 78, 94), y: -10, vy: 260, vx: (hsh(b) - 0.5) * 110, r: 8, delay, color: CANDY[i % 6], style: 'heart', lane: [0, 1] })));
  for (let k = 58; k < 72; k += 2) bear(bar(k), k % 4 === 2, CANDY[k % 6]);
  for (const [k, x, gap] of [[59, CX, Math.PI / 2], [62, 180, 0.2], [65, W - 180, Math.PI - 0.2], [68, CX, Math.PI / 2]]) dough(bar(k), x, GROUND_Y - 220, gap, { gap: 1.0, dur: 3.5 });
  for (let k = 56; k < 72; k++) gum(bar(k) + 2 * B, k % 2 === 1, CANDY[k % 6], { v: 230, apex: 180 });
  lolli(bar(60), 220, GROUND_Y - 170, { len: 300, a0: -Math.PI / 2, step: Math.PI / 5, life: 5 * 4 * B, color: CHERRY });
  lolli(bar(66), W - 220, GROUND_Y - 170, { len: 300, a0: -Math.PI / 2, step: -Math.PI / 5, life: 5 * 4 * B, color: SODA });
  for (const k of [61, 63, 67, 69]) hearts(bar(k) + 2 * B, k % 4 === 1 ? 600 : 200, 180, { n: 24, v: 145, color: [GRAPE, SODA, LEMON, PINK][k % 4] });

  return cues.sort((a, b) => a.t - b.t);
}

addSong({
  id: 'candy',
  title: 'Candy Pop Parade',
  meta: '150 BPM · 2:00 · オリジナル曲 · かわいい · むずかしめ',
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
