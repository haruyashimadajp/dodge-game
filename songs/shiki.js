"use strict";

/* =========================================================================
   曲⑫  Shiki（四季）（オリジナル曲）  —  拍・場面・譜面
   春 → 夏 → 秋 → 冬 → また春。動く水墨画の中を、3分かけて一年が過ぎていく。
   100 BPM。琴・尺八・太鼓・鐘・風鈴・オルゴール。曲は songs/shiki-compose.py で作曲・合成した。
   丸い弾はあまり使わない。攻撃は「形」: 墨の一筆・桜の枝・花火の光の筋・円相・もみじ・三日月・つらら・オーロラ・風。
   難易度はふつう。演出は visuals-shiki.js。
   ========================================================================= */

// 100 BPM: 1拍 = 0.6秒、1小節 = 2.4秒。0拍目 = 0.5秒
const SK_BEAT = 0.6;
function skBeatTime(n) { return 0.5 + n * SK_BEAT; }
function skBeatPos(t)  { return (t - 0.5) / SK_BEAT; }

const SK_SECTIONS = [
  { t: 0,     tier: 0.5, name: '序',   sub: 'JO ─ 墨が一滴、落ちる',          sky: ['#e9e2d0', '#d8cdb4'], color: '#2a2228', pulse: 0.002, sway: 0,   stars: 0 },
  { t: 10.1,  tier: 1.5, name: '春',   sub: 'HARU ─ 花の雲',                  sky: ['#f6e3e4', '#f1d2cf'], color: '#e8789a', pulse: 0.004, sway: 0.1, stars: 0 },
  { t: 48.5,  tier: 2.5, name: '夏',   sub: 'NATSU ─ 夜空の花火',              sky: ['#0d1430', '#1c2550'], color: '#ffd27f', pulse: 0.012, sway: 0.2, stars: 0 },
  { t: 86.9,  tier: 2.5, name: '秋',   sub: 'AKI ─ 月と風と、もみじ',           sky: ['#f0b066', '#c8583a'], color: '#d8452a', pulse: 0.006, sway: 0.15, stars: 0 },
  { t: 125.3, tier: 2,   name: '冬',   sub: 'FUYU ─ 雪の夜、光のカーテン',       sky: ['#0c1626', '#24384e'], color: '#bfe6ff', pulse: 0.003, sway: 0,   stars: 0 },
  { t: 158.9, tier: 3.5, name: '輪廻', sub: 'RINNE ─ そして、また春',           sky: ['#fff1dc', '#f6cfd6'], color: '#ff8fb0', pulse: 0.014, sway: 0.2, stars: 0 },
  { t: 178.1, tier: 0.5, name: '',     sub: '',                                sky: ['#f4ead8', '#e8d8c0'], color: '#2a2228', pulse: 0.002, sway: 0,   stars: 0 },
];

// 弾（もみじ）の速さ: 0.95〜1.2倍
function skSpeedAt(t) {
  let i = 0;
  while (i + 1 < SK_SECTIONS.length && SK_SECTIONS[i + 1].t <= t) i++;
  return 0.95 + 0.07 * SK_SECTIONS[i].tier;
}

function shikiChart() {
  const cues = [];
  const burst = (t, fn) => cues.push({ t, fn });
  const B = SK_BEAT;
  const beat = skBeatTime;
  const bar = k => beat(k * 4);
  const fire = (t, warn, fn) => burst(t - warn, () => fn(warn));
  const SC = SCORE_SHIKI;
  const CX = W / 2, G = GROUND_Y;
  const INK = '#16121c', SAKURA = '#e8789a', GOLD = '#ffd27f', MOMIJI = '#d8452a', ICE = '#cfeaff';
  const inBars = (b, k0, k1) => b >= k0 * 4 && b < k1 * 4;
  const hsh = (a, b = 0) => { const v = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return v - Math.floor(v); };

  // 墨の一筆（ベジェ）: p0 → p3。曲がりぐあいは c1, c2
  const stroke = (t, p0, c1, c2, p3, o = {}) => fire(t, o.warn || 0.85, delay => inkStroke({ pts: bezierPts(p0, c1, c2, p3, 24), width: o.width || 18, speed: o.speed || 900, delay, color: o.color || INK }));
  // 地面すれすれを横切る一筆（跳び越える）
  const lowSweep = (t, fromLeft, o = {}) => {
    const y = G - 14, a = fromLeft ? -40 : W + 40, z = fromLeft ? W + 40 : -40;
    stroke(t, { x: a, y: y - 30 }, { x: a + (z - a) * 0.3, y: y + 6 }, { x: a + (z - a) * 0.7, y: y + 4 }, { x: z, y: y - 40 }, { width: 18, speed: o.speed || 1000, color: o.color });
  };
  // 上から落ちる墨のしずく（縦の一筆）
  const drip = (t, x, o = {}) => stroke(t, { x, y: -30 }, { x: x + 20, y: 200 }, { x: x - 20, y: 450 }, { x: x + 10, y: G + 20 }, { width: o.width || 16, speed: 1300, color: o.color, warn: o.warn || 0.7 });
  // ななめに払う一筆（プレイヤーの近くを通る）
  const slash = (t, i, color = INK) => fire(t, 0.85, delay => {
    const p = playerXY(), s = i % 2 ? 1 : -1, off = (hsh(i) - 0.5) * 160;
    const p0 = { x: p.x + off - s * 380, y: -40 }, p3 = { x: p.x + off + s * 260, y: G + 40 };
    inkStroke({ pts: bezierPts(p0, { x: p0.x + s * 140, y: 260 }, { x: p3.x - s * 220, y: 420 }, p3, 24), width: 20, speed: 1000, delay, color });
  });
  const tree = (t, x, y, ang, o = {}) => fire(t, o.warn || 0.9, delay => branch({ x, y, ang, len: o.len || 300, depth: o.depth || 3, width: o.width || 22, speed: o.speed || 620, delay, seed: o.seed || x + y, color: o.color || '#2a1c1a' }));
  const hanabi = (t, x, y, o = {}) => fire(t, 1.2, delay => fireworkRays({ x, y, n: o.n || 12, r1: o.r1 || 440, rot: o.rot || 0, delay, color: o.color || GOLD }));
  const ensoAt = (t, o = {}) => fire(t, 0.9, delay => { const p = playerXY(); enso({ cx: Math.max(150, Math.min(W - 150, p.x)), cy: G - 30, r: o.r || 130, delay, color: o.color || INK }); });
  const gust = (t, v, beats) => {
    burst(t - B, () => stageHint(v > 0 ? '風 ─▶' : '◀─ 風', B * 2));
    burst(t, () => stageTo({ wind: v }, B));
    burst(t + beats * B, () => stageTo({ wind: 0 }, 2 * B));
  };
  const leaves = (t, v, n) => burst(t, () => {
    for (let i = 0; i < n; i++) mapleLeaf({ x: v > 0 ? -20 - i * 40 : W + 20 + i * 40, y: 80 + hsh(t, i) * 420, vx: v * 1.6, vy: 30 + hsh(i, t) * 50, delay: 0.5, color: i % 3 ? MOMIJI : '#f0a030' });
  });
  const moonSlash = (t, i) => fire(t, 0.9, delay => {
    const p = playerXY(), cx = Math.max(140, Math.min(W - 140, p.x + (i % 2 ? 150 : -150))), r = 230;
    const a0 = i % 2 ? Math.PI * 0.55 : Math.PI * 0.45, a1 = i % 2 ? Math.PI * 1.25 : -Math.PI * 0.25;
    inkStroke({ pts: arcPts(cx, G - 40, r, a0, a1, 30), width: 18, speed: 1100, delay, color: GOLD });
  });
  const ice = (t, x, warn = 0.8) => fire(t, warn, delay => icicle({ x, delay, len: 50 + hsh(x) * 30, color: ICE }));
  const frost = (t) => fire(t, 0.7, delay => { const b = laser({ x1: -40, y1: G - 9, x2: W + 40, y2: G - 9, width: 18, delay, hold: 0.2, color: ICE }); b.label = '❄ JUMP ❄'; b.spd = 1; });
  const curtain = (t, x0, o = {}) => fire(t, 1.2, delay => aurora({ x0, amp: o.amp || 150, w: o.w || 70, period: o.period || 8 * B, life: o.life || 16 * B, delay, color: o.color || '#5cffb0', ph: o.ph || 0 }));
  const pitchX = (m, lo, hi) => 70 + (W - 140) * Math.max(0, Math.min(1, (m - lo) / (hi - lo)));

  // ===== 序 0〜4小節 ｜ 墨が一滴落ちて、絵が始まる。最初の一筆は低く（跳ぶ）==================================
  burst(bar(1), () => stageHint('墨の一筆 ─ 墨のついた所に当たる', 4 * B));
  lowSweep(bar(2), true, { speed: 700 });
  drip(bar(3), 220); drip(bar(3) + 2 * B, W - 220);

  // ===== 春 4〜20小節 ｜ 桜の枝がのびて、花が咲く。尺八の長い音 = ななめの一筆。12小節から低い一筆も ===========
  for (let k = 4; k < 20; k += 2) {
    const L = (k / 2) % 2 === 0;
    tree(bar(k), L ? -10 : W + 10, 40 + hsh(k) * 80, L ? 0.55 + hsh(k, 1) * 0.3 : Math.PI - 0.55 - hsh(k, 1) * 0.3, { len: 330 + hsh(k, 2) * 60, seed: k });
  }
  SC.flute.filter(([b, L]) => inBars(b, 4, 20) && L >= 1.5).forEach(([b], i) => { if (i % 2 === 0) slash(beat(b), i, '#3a2a30'); });
  for (let k = 12; k < 20; k += 2) lowSweep(bar(k) + 2 * B, k % 4 === 0, { color: SAKURA });

  // ===== 夏 20〜36小節 ｜ 夜祭り: 花火の光の筋 ／ 大太鼓 = 円相（中は安全）／ 金の一筆 ============================
  burst(bar(20), () => stageHint('花火 ─ 光の筋のすき間へ', 4 * B));
  SC.fw.forEach((b, i) => hanabi(beat(b), 140 + hsh(b) * (W - 280), 240 + hsh(b, 1) * 160, { n: i % 3 === 2 ? 16 : 12, rot: hsh(b, 2) * 0.5, color: ['#ffd27f', '#ff8fb0', '#8fd8ff', '#c9a0ff'][i % 4] }));
  for (const k of [21, 25, 29, 33]) ensoAt(bar(k));
  for (let k = 22; k < 34; k += 2) lowSweep(bar(k) + 3 * B, k % 4 === 2, { color: GOLD, speed: 1100 });
  for (let i = 0; i < 8; i++) drip(bar(34) + i * B, 80 + ((i * 3) % 8) * 92, { color: '#1a1830', warn: 0.6 });   // 34〜36: 夕立

  // ===== 秋 36〜52小節 ｜ 風（流される）＋ もみじ ／ 尺八の長い音 = 三日月の一筆 ／ 後半は琴の音で落ちる墨 =========
  SC.wind.filter(([b]) => inBars(b, 36, 52)).forEach(([b, beats], i) => {
    const v = i % 2 ? -130 : 130;
    gust(beat(b), v, beats); leaves(beat(b), v, 9);
  });
  SC.flute.filter(([b, L]) => inBars(b, 36, 52) && L >= 2).forEach(([b], i) => moonSlash(beat(b), i));
  for (let k = 44; k < 52; k += 2) drip(bar(k) + 2 * B, pitchX(40 + (k % 7) * 4, 38, 68), { color: '#5a1a10' });

  // ===== 冬 52〜66小節 ｜ オルゴールの音 = つらら ／ オーロラのカーテン ／ 62〜: 霜の線（跳ぶ）＋ つららの雨 ======
  SC.box.forEach(([b, , m]) => ice(beat(b), pitchX(m, 76, 94)));
  curtain(bar(54), 220, { ph: 0 });
  curtain(bar(57), W - 220, { ph: Math.PI, color: '#9f8bff' });
  for (const k of [62, 63, 64, 65]) frost(bar(k) + 2 * B);
  for (let i = 0; i < 12; i++) ice(bar(64) + i * B * 0.66, 60 + ((i * 5) % 12) * 62, 0.7);

  // ===== 輪廻 66〜74小節 ｜ また春: 桜の枝（左右から）＋ 花火 ＋ 円相 ＋ 一筆 ＋ 風 ============================
  for (let k = 66; k < 74; k += 2) {
    tree(bar(k), -10, 60 + hsh(k) * 60, 0.6, { len: 340, seed: k * 7, color: '#3a2228' });
    tree(bar(k) + 2 * B, W + 10, 60 + hsh(k, 3) * 60, Math.PI - 0.6, { len: 340, seed: k * 11, color: '#3a2228' });
  }
  for (const k of [67, 69, 71]) hanabi(bar(k) + 2 * B, 200 + ((k * 137) % 400), 260, { n: 14, color: SAKURA });
  for (const k of [68, 72]) ensoAt(bar(k), { color: '#5a2030' });
  for (const k of [69, 73]) lowSweep(bar(k), k === 69, { color: SAKURA });
  gust(bar(70), 90, 6);

  return cues.sort((a, b) => a.t - b.t);
}

addSong({
  id: 'shiki',
  title: 'Shiki',
  meta: '100 BPM · 3:02 · オリジナル曲 · 四季の水墨画',
  file: 'Shiki.mp3',
  bpm: 100, beat: SK_BEAT, end: 182.5,
  beatTime: skBeatTime,
  beatPos: skBeatPos,
  speedAt: skSpeedAt,
  env: ENV_SHIKI,
  sections: SK_SECTIONS,
  build: shikiChart,
  theme: 'shiki',                  // visuals-shiki.js の見た目のセット
  titleLook: { sky: ['#f6e3e4', '#ead7c4'], color: '#e8789a', tier: 1, pulse: 0.004, stars: 0 },
  titleBpm: 100,
  preview: 48.5,
  clearTitle: '四季',
  overTitle: '散',
  clearText: '一年が過ぎて、また花が咲いた。',
  bestKey: 'dodge_best_shiki',
});
