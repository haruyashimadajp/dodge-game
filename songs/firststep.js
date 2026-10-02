"use strict";

/* =========================================================================
   曲⑧  First Step（オリジナル曲・初心者用）  —  拍・場面・譜面
   はじめての人のための、いちばんやさしい曲。108 BPM の明るいポップス（ハ長調）。
   ベルの旋律・はじく和音・やさしいドラム。曲は songs/firststep-compose.py で作曲・合成した。

   進みながら、遊び方を1つずつ覚えられるようになっている（画面のまん中に「やること」が出る）:
     0〜 8小節  左右に動く   … ゆっくり落ちてくる弾・音符をよける
     8〜12      ジャンプ     … 床を転がってくるボールを跳び越える
    12〜20      まわりを見る … まん中から広がる輪
    20〜28      足場に乗る   … 床が光ったら、跳ぶか足場の上へ
    28〜32      ひと休み     … ゆっくりの渦
    32〜40      ぜんぶ       … いままでの全部（でも、ゆっくり）
   弾はどれも遅く、出る前の予告（点滅する輪・線）も長い。
   ========================================================================= */

// 108 BPM: 1拍 = 0.5556秒、1小節 = 2.222秒。0拍目 = 0.5秒
const FS_BEAT = 60 / 108;
function fsBeatTime(n) { return 0.5 + n * FS_BEAT; }
function fsBeatPos(t)  { return (t - 0.5) / FS_BEAT; }

const FS_SECTIONS = [
  { t: 0,     tier: 0,   name: 'FIRST STEP', sub: 'はじめての曲',                sky: ['#5fb4ff', '#cfeaff'], color: '#ffffff', pulse: 0.004, sway: 0,    stars: 0 },
  { t: 9.39,  tier: 0.5, name: 'MOVE',       sub: '左右に動いて、よけよう',       sky: ['#55a8ff', '#c6e6ff'], color: '#ffd84d', pulse: 0.006, sway: 0.1,  stars: 0 },
  { t: 18.28, tier: 1,   name: 'JUMP',       sub: 'ジャンプで跳び越えよう',       sky: ['#4f9ef8', '#bfe1ff'], color: '#ff8a5c', pulse: 0.008, sway: 0.1,  stars: 0 },
  { t: 27.17, tier: 1.5, name: 'LOOK',       sub: 'まわりをよく見よう',           sky: ['#5a8ff0', '#cbd8ff'], color: '#b48cff', pulse: 0.01,  sway: 0.15, stars: 0 },
  { t: 44.94, tier: 2,   name: 'PLATFORM',   sub: '床が光ったら、足場の上へ',     sky: ['#ff9a6b', '#ffe0b8'], color: '#ff6b8b', pulse: 0.012, sway: 0.2,  stars: 0 },
  { t: 62.72, tier: 1,   name: 'BREAK',      sub: 'ひと休み',                     sky: ['#7a6bd6', '#f2c4e6'], color: '#ffffff', pulse: 0.006, sway: 0.1,  stars: 0 },
  { t: 71.61, tier: 2.5, name: 'ALL TOGETHER', sub: 'いままでの全部',             sky: ['#ff8a5c', '#ffd98a'], color: '#ffe14d', pulse: 0.014, sway: 0.25, stars: 0 },
  { t: 89.39, tier: 0,   name: 'GOAL!',      sub: '',                             sky: ['#3d6fd8', '#ffc6a8'], color: '#ffffff', pulse: 0.004, sway: 0,    stars: 0 },
];

// 弾の速さ: 0.8倍〜 0.92倍（どの曲よりも遅い）
function fsSpeedAt(t) {
  let i = 0;
  while (i + 1 < FS_SECTIONS.length && FS_SECTIONS[i + 1].t <= t) i++;
  return 0.8 + 0.05 * FS_SECTIONS[i].tier;
}

function firstStepChart() {
  const cues = [];
  const burst = (t, fn) => cues.push({ t, fn });
  const B = FS_BEAT;
  const beat = fsBeatTime;
  const bar = k => beat(k * 4);
  const fire = (t, warn, fn) => burst(t - warn, () => fn(warn));
  const SC = SCORE_FIRSTSTEP;
  const CX = W / 2;
  const YELLOW = '#ffc93c', ORANGE = '#ff8a3c', PINK = '#ff5f8f', BLUE = '#3c9dff', PURPLE = '#9b6bff', GREEN = '#3ccf6e';
  const COLORS = [PINK, ORANGE, YELLOW, GREEN, BLUE, PURPLE];
  const hint = (t, text, beats = 6) => burst(t, () => stageHint(text, beats * B));
  const px = (m, lo, hi) => 60 + (W - 120) * Math.max(0, Math.min(1, (m - lo) / (hi - lo)));
  // 旋律 → 音の高さの場所に落ちてくる音符（every 個に1つだけ。初心者用に少なめ）
  const notes = (list, v, every = 2) => list.forEach(([b, , m], i) => {
    if (i % every) return;
    const d = noteDrop(beat(b), px(m, 62, 90), v, { r: 10, color: COLORS[i % COLORS.length], warn: 0.7 });
    burst(d.at, d.go);
  });
  const drop = (t, x, v = 150, color = PINK) => fire(t, 1.0, delay => spawn({ x, y: -12, vy: v, r: 11, delay, color, lane: [0, 1] }));
  // 転がるボール: 画面を1回だけ横切って消える（はね返ってこない）
  const roll = (t, fromLeft, v = 170) => fire(t, 1.2, delay => roller({ x: fromLeft ? 20 : W - 20, vx: fromLeft ? v : -v, delay, life: (W - 50) / v, color: ORANGE }));
  const ringAt = (t, n, v, color, start = 0) => fire(t, 1.0, delay => ring({ x: CX, y: 200, count: n, speed: v, r: 10, start, delay, color }));
  const floorLight = t => fire(t, 1.8, delay => floorStrike({ delay, hold: 0.2, color: PINK }));

  // ===== はじめ 0〜4小節 ｜ 左右に動く: ゆっくり落ちてくる弾 ==========================================
  hint(beat(1), '← → で左右に動こう', 10);
  for (let k = 1; k < 4; k++) { drop(bar(k), 200 + (k % 2) * 400); drop(bar(k) + 2 * B, 400, 150, BLUE); }

  // ===== MOVE 4〜8小節 ｜ ベルの旋律 = 落ちてくる音符 ==================================================
  hint(bar(4), '落ちてくる音符をよけよう', 6);
  notes(SC.melA.filter(([b]) => b < 32), 180);

  // ===== JUMP 8〜12小節 ｜ 床を転がるボールを跳び越える ================================================
  hint(bar(8) - 2 * B, '↑ でジャンプ！ ボールを跳び越えよう', 8);
  for (let k = 8; k < 12; k++) roll(bar(k) + B, k % 2 === 0);
  notes(SC.melA.filter(([b]) => b >= 32), 180, 3);

  // ===== LOOK 12〜20小節 ｜ まん中から広がる輪 ＋ 音符 ================================================
  hint(bar(12), 'すき間を通ってよけよう', 6);
  for (let k = 12; k < 20; k += 2) ringAt(bar(k), 8, 90, COLORS[k % 6], k * 0.2);
  notes(SC.melB, 190, 3);
  roll(bar(16) + B, true); roll(bar(18) + B, false);

  // ===== PLATFORM 20〜28小節 ｜ 床が光る → 跳ぶか足場へ ＋ サビの音符 =================================
  hint(bar(20) - 3 * B, '床が光ったら、跳ぶか足場の上へ！', 8);
  for (const k of [21, 23, 25, 27]) floorLight(bar(k));
  notes(SC.chorus1, 210, 2);

  // ===== BREAK 28〜32小節 ｜ ゆっくりの渦 ===========================================================
  hint(bar(28), 'ひと休み', 6);
  fire(bar(28) + B, 1.2, delay => spiral({ x: CX, y: 200, count: 16, speed: 80, r: 10, turns: 1, gap: 0.25, delay, color: PURPLE }));
  fire(bar(30) + B, 1.2, delay => spiral({ x: CX, y: 200, count: 16, speed: 80, r: 10, turns: -1, gap: 0.25, delay, color: BLUE }));

  // ===== ALL TOGETHER 32〜40小節 ｜ いままでの全部（ゆっくり）=======================================
  hint(bar(32) - 2 * B, 'いままでの全部！ がんばれ！', 8);
  notes(SC.chorus2, 220, 2);
  for (const k of [33, 37]) floorLight(bar(k));
  for (const k of [32, 36]) ringAt(bar(k), 10, 100, COLORS[k % 6], k * 0.3);
  for (const k of [34, 38]) roll(bar(k) + B, k === 34);

  // ===== GOAL 40〜 ================================================================================
  hint(bar(40), 'ゴール！ おめでとう！', 6);
  burst(bar(40), () => { flash(0.5); });

  return cues.sort((a, b) => a.t - b.t);
}

addSong({
  id: 'firststep',
  title: 'First Step',
  meta: '108 BPM · 1:34 · オリジナル曲 · 初心者用',
  file: 'FirstStep.mp3',
  bpm: 108, beat: FS_BEAT, end: 92.5,
  beatTime: fsBeatTime,
  beatPos: fsBeatPos,
  speedAt: fsSpeedAt,
  env: ENV_FIRSTSTEP,
  sections: FS_SECTIONS,
  build: firstStepChart,
  theme: 'day',                    // visuals-day.js の見た目のセット
  titleLook: { sky: ['#5fb4ff', '#cfeaff'], color: '#ffd84d', tier: 1, pulse: 0.008, stars: 0 },
  titleBpm: 108,
  preview: 44.9,
  clearText: 'クリアおめでとう！ ほかの曲にも挑戦してみよう。',
  bestKey: 'dodge_best_firststep',
});
