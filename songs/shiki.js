"use strict";

/* =========================================================================
   曲⑫  Shiki（四季）（オリジナル曲）  —  拍・場面・譜面
   春 → 夏 → 秋 → 冬 → また春。動く水墨画の中を、3分かけて一年が過ぎていく。
   100 BPM。琴・尺八・太鼓・鐘・風鈴・オルゴール。曲は songs/shiki-compose.py で作曲・合成した。
   丸い弾はあまり使わない。攻撃は「形」: 墨の一筆・桜の枝・花火の光の筋・円相・鯉・大波・もみじ・三日月・つらら・オーロラ・風。
   難易度はむずかしめ。演出は visuals-shiki.js。
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
  const stroke = (t, p0, c1, c2, p3, o = {}) => fire(t, o.warn || 0.75, delay => inkStroke({ pts: bezierPts(p0, c1, c2, p3, 24), width: o.width || 18, speed: o.speed || 900, delay, color: o.color || INK }));
  // 地面すれすれを横切る一筆（跳び越える）
  const lowSweep = (t, fromLeft, o = {}) => {
    const y = G - 14, a = fromLeft ? -40 : W + 40, z = fromLeft ? W + 40 : -40;
    stroke(t, { x: a, y: y - 30 }, { x: a + (z - a) * 0.3, y: y + 6 }, { x: a + (z - a) * 0.7, y: y + 4 }, { x: z, y: y - 40 }, { width: 18, speed: o.speed || 1000, color: o.color });
  };
  // 上から落ちる墨のしずく（縦の一筆）
  const drip = (t, x, o = {}) => stroke(t, { x, y: -30 }, { x: x + 20, y: 200 }, { x: x - 20, y: 450 }, { x: x + 10, y: G + 20 }, { width: o.width || 16, speed: 1300, color: o.color, warn: o.warn || 0.7 });
  // ななめに払う一筆（プレイヤーの近くを通る）
  const slash = (t, i, color = INK) => fire(t, 0.75, delay => {
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
  // 鯉: プレイヤーの横から跳んで、今いる所の近くに落ちてくる
  const carp = (t, i, o = {}) => fire(t, 0.9, delay => {
    const p = playerXY(), sd = i % 2 ? 1 : -1;
    const x1 = Math.max(40, Math.min(W - 40, p.x + sd * (hsh(i, 5) * 60 - 20)));
    koi({ x0: x1 - sd * (300 + hsh(i) * 120), x1, h: 220 + hsh(i, 2) * 80, dur: 1.2, delay, color: o.color || ['#ff6a3a', '#f4f0e8', '#ffb030'][i % 3] });
  });
  const nami = (t, fromLeft) => {
    burst(t - 1.0 - B, () => stageHint(fromLeft ? '大波 ─▶ 跳べ' : '跳べ ◀─ 大波', B * 2));
    fire(t, 1.0, delay => greatWave({ fromLeft, delay }));
  };

  // ===== 序 0〜4小節 ｜ 絵巻がひらいて、墨が一滴。最初の一筆は低く（跳ぶ）==================================
  burst(bar(1), () => stageHint('墨の一筆 ─ 墨のついた所に当たる', 4 * B));
  lowSweep(bar(2), true, { speed: 750 });
  drip(bar(3), 220); drip(bar(3) + B, CX); drip(bar(3) + 2 * B, W - 220);

  // ===== 春 4〜20小節 ｜ 桜の枝（毎小節）／ 尺八の長い音 = ななめの一筆 ／ 低い一筆 ／ 鯉が跳ぶ ============================
  for (let k = 4; k < 20; k++) {
    const L = k % 2 === 0;
    tree(bar(k), L ? -10 : W + 10, 40 + hsh(k) * 100, L ? 0.5 + hsh(k, 1) * 0.35 : Math.PI - 0.5 - hsh(k, 1) * 0.35, { len: 320 + hsh(k, 2) * 80, seed: k, speed: 700 });
  }
  SC.flute.filter(([b, L]) => inBars(b, 4, 20) && L >= 1.5).forEach(([b], i) => slash(beat(b), i, '#3a2a30'));
  for (let k = 8; k < 20; k++) lowSweep(bar(k) + 2 * B, k % 2 === 0, { color: SAKURA, speed: 1050 });
  burst(bar(9) - 2 * B, () => stageHint('鯉 ─ 水から跳んでくる', 3 * B));
  for (const k of [9, 11, 13, 15, 17, 19]) carp(bar(k) + 3 * B, k);

  // ===== 夏 20〜36小節 ｜ 夜祭り: 花火 ／ 円相 ／ 金の一筆 ／ 琴の旋律 = 墨のしずく ／ 大波 ／ 夕立 ==========================
  burst(bar(20), () => stageHint('花火 ─ 光の筋のすき間へ', 4 * B));
  SC.fw.forEach((b, i) => hanabi(beat(b), 140 + hsh(b) * (W - 280), 240 + hsh(b, 1) * 160, { n: i % 3 === 2 ? 16 : 14, rot: hsh(b, 2) * 0.5, color: ['#ffd27f', '#ff8fb0', '#8fd8ff', '#c9a0ff'][i % 4] }));
  for (const k of [23, 27, 31, 33]) fire(bar(k), 1.2, delay => { const p = playerXY(); fireworkRays({ x: Math.max(120, Math.min(W - 120, p.x + (k % 2 ? 90 : -90))), y: 330, n: 14, r1: 440, rot: k * 0.2, delay, color: '#ffe8b0' }); });
  for (const k of [21, 25, 29]) ensoAt(bar(k));
  for (let k = 21; k < 34; k++) if (k % 4 !== 1) lowSweep(bar(k) + 3 * B, k % 2 === 0, { color: GOLD, speed: 1150 });
  SC.koto.filter(([b, L]) => inBars(b, 28, 34) && L >= 1).forEach(([b, , m], i) => { if (i % 2 === 0) drip(beat(b), pitchX(m, 66, 86), { color: '#1a1830', warn: 0.65 }); });
  nami(bar(26) + 2 * B, true); nami(bar(30) + 2 * B, false);
  for (let i = 0; i < 16; i++) drip(bar(34) + i * B / 2, 60 + ((i * 5) % 16) * 45, { color: '#1a1830', warn: 0.6, width: 14 });   // 34〜36: 夕立

  // ===== 秋 36〜52小節 ｜ 強い風 ＋ もみじ ／ 尺八 = 三日月の一筆 ／ 琴 = 墨のしずく ／ 嵐の大波 ============================
  SC.wind.filter(([b]) => inBars(b, 36, 52)).forEach(([b, beats], i) => {
    const v = i % 2 ? -170 : 170;
    gust(beat(b), v, beats); leaves(beat(b), v, 13);
  });
  SC.flute.filter(([b, L]) => inBars(b, 36, 52) && L >= 1.5).forEach(([b], i) => moonSlash(beat(b), i));
  SC.koto.filter(([b, L]) => inBars(b, 44, 52) && L >= 1).forEach(([b, , m]) => drip(beat(b), pitchX(m, 50, 70), { color: '#5a1a10', warn: 0.65 }));
  nami(bar(48), false); nami(bar(50) + 2 * B, true);

  // ===== 冬 52〜66小節 ｜ オルゴール = つらら（＋ねらうつらら）／ オーロラ3枚 ／ 霜の線 ／ つららの雨 ======================
  SC.box.forEach(([b, , m], i) => {
    ice(beat(b), pitchX(m, 76, 94));
    if (i % 2 === 0) fire(beat(b) + B / 2, 0.75, delay => icicle({ x: playerXY().x, delay, len: 64, color: '#e8f4ff' }));
  });
  curtain(bar(54), 200, { ph: 0 });
  curtain(bar(56), W - 200, { ph: Math.PI, color: '#9f8bff' });
  curtain(bar(59), CX, { ph: Math.PI / 2, amp: 220, color: '#7fe0ff', life: 12 * B });
  for (let k = 58; k < 66; k++) frost(bar(k) + 2 * B);
  for (let i = 0; i < 20; i++) ice(bar(64) + i * B * 0.4, 50 + ((i * 7) % 20) * 36, 0.7);

  // ===== 輪廻 66〜74小節 ｜ また春: ぜんぶ ==========================================================================
  for (let k = 66; k < 74; k++) {
    tree(bar(k), -10, 60 + hsh(k) * 60, 0.6, { len: 340, seed: k * 7, color: '#3a2228', speed: 760 });
    tree(bar(k) + 2 * B, W + 10, 60 + hsh(k, 3) * 60, Math.PI - 0.6, { len: 340, seed: k * 11, color: '#3a2228', speed: 760 });
  }
  for (let k = 66; k < 74; k++) hanabi(bar(k) + 3 * B, 160 + ((k * 137) % 480), 250 + (k % 3) * 40, { n: 14, rot: k * 0.3, color: [SAKURA, GOLD, '#8fd8ff'][k % 3] });
  for (const k of [68, 72]) ensoAt(bar(k), { color: '#5a2030' });
  for (const k of [67, 69, 71, 73]) { lowSweep(bar(k), k % 4 === 1, { color: SAKURA, speed: 1150 }); carp(bar(k) + 2 * B, k, { color: k % 2 ? '#ff6a3a' : '#f4f0e8' }); }
  SC.flute.filter(([b, L]) => inBars(b, 66, 74) && L >= 1.5).forEach(([b], i) => slash(beat(b), i + 1, '#5a2030'));
  nami(bar(70) + 2 * B, true);
  gust(bar(70), 100, 6);

  return cues.sort((a, b) => a.t - b.t);
}

addSong({
  id: 'shiki',
  title: 'Shiki',
  meta: '100 BPM · 3:02 · オリジナル曲 · 四季の水墨画 · むずかしめ',
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
