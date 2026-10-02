"use strict";

/* =========================================================================
   曲⑪  Prism（オリジナル曲）  —  拍・場面・譜面
   ビームが主役の曲。撃たれた光は消えずに「光の絵」としてキャンバスに残り、曲の最後に1枚の絵になる。
   128 BPM のメロディック・トランス。曲は songs/prism-compose.py で作曲・合成した
   （ピアノ・ガラスのアルペジオ・スーパーソウの和音・リード・ビームの「ザップ」音）。
   難易度はふつう。演出は visuals-prism.js。

   使う形（game.js の「Prism」の所）:
     prismFan   … プリズムで分かれた七色の光が、扇のように地面へ（光と光のすき間に立つ）
     kaleido    … 万華鏡の星（まん中の円の中は安全）
     bounceBeam … 壁と床で反射しながら走る光
     brushPos   … 空を舞う「光の筆」。リードの音で、筆からこちらへビームが飛んでくる
   画面の動き（Vertigo と同じ stageTo）: 万華鏡で画面が1回転 / 傾く世界 / 左右反転 / ズーム
   ========================================================================= */

// 128 BPM: 1拍 = 0.46875秒、1小節 = 1.875秒。0拍目 = 0.5秒
const PR_BEAT = 60 / 128;
function prBeatTime(n) { return 0.5 + n * PR_BEAT; }
function prBeatPos(t)  { return (t - 0.5) / PR_BEAT; }

const PR_SECTIONS = [
  { t: 0,      tier: 0.5, name: 'PRELUDE',      sub: 'I ─ 白いキャンバス',              sky: ['#07060d', '#13101f'], color: '#f4efe6', pulse: 0.003, sway: 0,   stars: 0 },
  { t: 15.5,   tier: 1.5, name: 'SPECTRUM',     sub: 'II ─ 光を七つの色に',             sky: ['#08061a', '#1a1030'], color: '#ffe66d', pulse: 0.008, sway: 0.1, stars: 0 },
  { t: 30.5,   tier: 2,   name: 'STRING ART',   sub: 'III ─ 光の糸かけ',               sky: ['#060a1a', '#0f1c34'], color: '#4dd2ff', pulse: 0.01,  sway: 0.1, stars: 0 },
  { t: 45.5,   tier: 1.5, name: 'KALEIDOSCOPE', sub: 'IV ─ 万華鏡 ─ 世界がまわる',       sky: ['#120720', '#2a0f3a'], color: '#c77dff', pulse: 0.004, sway: 0,   stars: 0 },
  { t: 53.0,   tier: 2,   name: '',             sub: '',                               sky: ['#0d0618', '#1e0c2c'], color: '#ffffff', pulse: 0.006, sway: 0,   stars: 0 },
  { t: 56.75,  tier: 3,   name: 'OPUS',         sub: 'V ─ 光の作品',                   sky: ['#0a0614', '#1c0e2a'], color: '#ff9f43', pulse: 0.02,  sway: 0.2, stars: 0 },
  { t: 79.25,  tier: 3,   name: 'MIRROR',       sub: 'VI ─ 鏡の世界 ─ 左右反転',         sky: ['#04101a', '#0c2a36'], color: '#5cff9d', pulse: 0.014, sway: 0.1, stars: 0 },
  { t: 86.75,  tier: 1,   name: 'NOCTURNE',     sub: 'VII ─ 夜想曲',                   sky: ['#030308', '#0a0a16'], color: '#9fb4ff', pulse: 0.003, sway: 0,   stars: 0 },
  { t: 94.25,  tier: 4,   name: 'MASTERPIECE',  sub: 'VIII ─ 最高傑作',                sky: ['#100616', '#2a0c30'], color: '#ff4d6d', pulse: 0.024, sway: 0.25, stars: 0 },
  { t: 113.0,  tier: 0.5, name: 'FIN',          sub: '',                               sky: ['#07060d', '#13101f'], color: '#ffffff', pulse: 0.003, sway: 0,   stars: 0 },
];

// 弾の速さ（ビームの予告の長さには関係しない。スキャナーと筆の光だけ）: 0.95〜1.25倍
function prSpeedAt(t) {
  let i = 0;
  while (i + 1 < PR_SECTIONS.length && PR_SECTIONS[i + 1].t <= t) i++;
  return 0.95 + 0.075 * PR_SECTIONS[i].tier;
}

function prismChart() {
  const cues = [];
  const burst = (t, fn) => cues.push({ t, fn });
  const B = PR_BEAT;
  const beat = prBeatTime;
  const bar = k => beat(k * 4);
  const fire = (t, warn, fn) => burst(t - warn, () => fn(warn));
  const SC = SCORE_PRISM;
  const CX = W / 2;
  const WHITE = '#f4efe6';
  const inBars = (b, k0, k1) => b >= k0 * 4 && b < k1 * 4;
  const px = (m, lo, hi) => 70 + (W - 140) * Math.max(0, Math.min(1, (m - lo) / (hi - lo)));

  // 鉛筆で引くような、1本の白い線（ピアノの音）
  const sketch = (t, x, lean, o = {}) => fire(t, o.warn || 0.9, delay => ray({ x1: x + lean, y1: -30, x2: x - lean, y2: GROUND_Y + 40, width: o.width || 14, delay, hold: 0.3, color: o.color || WHITE }));
  // 七色の扇: 地面の x0 から gap おきに n 本
  const fan = (t, x, x0, gap = 112, n = 7, o = {}) => fire(t, o.warn || 0.8, delay =>
    prismFan({ x, y: o.y || 96, xs: Array.from({ length: n }, (_, i) => x0 + i * gap), delay, step: o.step != null ? o.step : B / 2, reverse: o.reverse }));
  // 光の筆からこちらへ（予告が始まった時のプレイヤーの場所をねらう）
  const brushShot = (t, color, warn = 0.75) => fire(t, warn, delay => { const s = brushPos(t), p = playerXY(); rayThrough(s.x, s.y, p.x, p.y, { delay, width: 12, color }); });
  const star = (t, cx, cy, d, rot, o = {}) => fire(t, o.warn || 0.8, delay => kaleido({ cx, cy, d, rot, n: o.n || 6, step: o.step != null ? o.step : B / 2, delay, width: o.width || 10, colors: o.colors }));
  const bounce = (t, x, y, ang, o = {}) => fire(t, o.warn || 0.85, delay => bounceBeam({ x, y, ang, bounces: o.n || 5, delay, step: o.step || 0.07, hue: o.hue || 0 }));
  const keys = (t, cols, n = 8, warn = 0.8) => fire(t, warn, delay => cols.forEach(c => ray({ x1: (c + 0.5) * W / n, y1: -40, x2: (c + 0.5) * W / n, y2: GROUND_Y + 30, width: W / n - 14, delay, hold: 0.3, color: SPECTRUM[c % 7] })));
  const low = (t, fromLeft, color) => fire(t, 0.7, delay => scanner({ fromLeft, y1: GROUND_Y - 46, y2: GROUND_Y + 10, speed: 400, width: 12, delay, color }));
  const zap = (t, x = CX) => burst(t, () => { if (typeof prismZap === 'function') prismZap(x); });
  // 世界が a まで傾く（1拍前に、すべる向きを矢印で予告）。Vertigo と同じ
  const tilt = (t, a, beats = 2) => {
    burst(t - B, () => { if (a !== 0) stageHint(a > 0 ? '▶ ▶ ▶' : '◀ ◀ ◀', B * 1.6); });
    burst(t, () => stageTo({ tilt: a }, beats * B, 'smooth'));
  };

  // ===== PRELUDE 0〜8小節 ｜ ピアノの音 = 鉛筆の線のような白い光（ゆっくり）==============================
  SC.piano.filter(([b]) => b < 32).forEach(([b, , m], i) => sketch(beat(b), px(m, 76, 88), (i % 2 ? 1 : -1) * (40 + (i * 37) % 110)));
  low(bar(5), true, WHITE); low(bar(7), false, WHITE);

  // ===== SPECTRUM 8〜16小節 ｜ 白い光がプリズムで七色に分かれる ／ 毎小節、扇が赤→紫の順に光る ==========
  zap(bar(8));
  const fanX = [CX, 220, CX, 580, CX, 160, 640, CX];
  for (let k = 8; k < 16; k++) fan(bar(k), fanX[k - 8], k % 2 ? 100 : 46, 112, 7, { reverse: k % 4 >= 2 });
  for (const k of [11, 15]) low(bar(k) + 2 * B, k === 11, '#ffe66d');

  // ===== STRING ART 16〜24小節 ｜ 円に並んだピンを、光の糸でつなぐ（つなぎ方 = j → 2j: カージオイドが浮かぶ）=====
  zap(bar(16));
  const PINS = 32, SCX = CX, SCY = 360, SR = 380;
  const pin = j => ({ x: SCX + Math.cos(Math.PI / 2 + TAU * j / PINS) * SR, y: SCY + Math.sin(Math.PI / 2 + TAU * j / PINS) * SR });
  SC.piano.filter(([b]) => inBars(b, 16, 24)).forEach(([b], i) => {
    const j = (i * 3) % PINS, a = pin(j), z = pin(2 * j);
    if (Math.hypot(a.x - z.x, a.y - z.y) < 40) return;
    fire(beat(b), 0.8, delay => ray({ x1: a.x, y1: a.y, x2: z.x, y2: z.y, width: 11, delay, hold: 0.28, color: SPECTRUM[i % 7] }));
  });
  for (const k of [17, 19, 21]) low(bar(k) + 2 * B, k % 4 === 1, '#4dd2ff');
  // 22〜24小節（盛り上がり）: 円のピンから、こちらをねらう糸
  for (let i = 0; i < 8; i++) fire(bar(22) + i * B, 0.75, delay => {
    const p = playerXY(); const a = pin((i * 5 + 12) % PINS);
    rayThrough(a.x, Math.min(a.y, 300), p.x, p.y, { delay, width: 11, color: SPECTRUM[i % 7] });
  });

  // ===== KALEIDOSCOPE 24〜28小節 ｜ 万華鏡の星 ／ 画面がゆっくり1回転する =================================
  burst(bar(24), () => { stageHint('世界がまわる', 3 * B); stageTo({ spin: TAU }, 16 * B, 'smooth'); });
  for (let k = 24; k < 28; k++) star(bar(k), CX + (k % 2 ? 90 : -90), GROUND_Y - 150, 110, k * 0.37);
  burst(bar(28), () => stageTo({ spin: 0 }, 0.001));          // 1回転したので、見た目は同じ

  // ===== RISE 28〜30小節 ｜ 穴のあいた光の壁が、拍ごとに下りてくる ＋ ズームで息をのむ ===================
  fire(bar(28), 0.6, delay => firewall({ gapX: 260, gapW: 150, y0: 80, steps: 6, step: 1, delay, color: '#ffffff' }));
  burst(bar(28), () => stageTo({ zoom: 1.12 }, 8 * B, 'linear'));
  burst(bar(30) - 0.05, () => stageTo({ zoom: 1 }, 0.25, 'snap'));

  // ===== OPUS 30〜42小節 ｜ 大きな白い光 → 七色の爆発。リード = 光の筆からのビーム ／ 反射する光 ／ 傾く世界 ====
  zap(bar(30));
  burst(bar(30), () => stageTo({ brush: 1 }, 1));
  SC.lead.filter(([b]) => inBars(b, 30, 42)).forEach(([b], i) => brushShot(beat(b), SPECTRUM[i % 7]));
  for (const k of [31, 35, 39]) bounce(bar(k), 0, 40 + (k % 3) * 30, 0.62 + (k % 4) * 0.05, { hue: k % 7 });
  for (const k of [33, 37]) bounce(bar(k), W, 60, Math.PI - 0.7, { hue: k % 7 });
  for (const k of [32, 36]) fan(bar(k) + 2 * B, k === 32 ? 200 : 600, k === 32 ? 70 : 126, 112, 7, { step: B / 4 });
  tilt(bar(34), 0.12); tilt(bar(36), 0); tilt(bar(38), -0.12); tilt(bar(40), 0);
  for (const k of [34, 38]) zap(bar(k));
  // 40〜42小節: 光の鍵盤（2拍ごとに、偶数の列と奇数の列が入れかわる）
  for (let i = 0; i < 4; i++) keys(bar(40) + i * 2 * B, i % 2 ? [1, 3, 5, 7] : [0, 2, 4, 6]);

  // ===== MIRROR 42〜46小節 ｜ 左右反転 ＋ 七色の扇 ＋ 低い光（跳ぶ）=================================
  burst(bar(42) - 2 * B, () => stageHint('⇄ MIRROR', 2 * B));
  burst(bar(42), () => { stageTo({ mirror: -1 }, 2 * B, 'smooth'); stageTo({ brush: 0 }, 1); });
  zap(bar(42));
  for (const k of [42, 43, 44, 45]) fan(bar(k) + B, [200, 600, CX, CX][k - 42], k % 2 ? 46 : 102, 112, 7, { step: B / 4, reverse: k % 2 === 1 });
  for (const k of [43, 45]) low(bar(k) + 3 * B, k === 43, '#5cff9d');
  burst(bar(46), () => stageTo({ mirror: 1 }, 2 * B, 'smooth'));

  // ===== NOCTURNE 46〜50小節 ｜ 夜想曲: カメラが寄る ＋ ピアノの白い線 ==============================
  burst(bar(46), () => stageTo({ zoom: 1.22, follow: 0.55 }, 4 * B));
  SC.piano.filter(([b]) => inBars(b, 46, 50)).forEach(([b, , m], i) => fire(beat(b), 0.85, delay => {
    const p = playerXY(), x = Math.max(60, Math.min(W - 60, p.x + (i % 2 ? 1 : -1) * (30 + (m % 5) * 22)));
    ray({ x1: x + (i % 2 ? 60 : -60), y1: -30, x2: x - (i % 2 ? 60 : -60), y2: GROUND_Y + 40, width: 14, delay, hold: 0.3, color: '#9fb4ff' });
  }));
  burst(bar(49), () => stageTo({ zoom: 1, follow: 0 }, 4 * B));

  // ===== MASTERPIECE 50〜60小節 ｜ 最後のサビ: ぜんぶ ==============================================
  zap(bar(50));
  burst(bar(50), () => stageTo({ brush: 1 }, 0.5));
  SC.lead.filter(([b]) => inBars(b, 50, 58)).forEach(([b], i) => { if (i % 3 !== 2) brushShot(beat(b), SPECTRUM[(i * 2) % 7], 0.7); });
  for (const k of [51, 55]) bounce(bar(k), 0, 50, 0.7, { hue: k % 7, n: 6 });
  for (const k of [53]) bounce(bar(k), W, 50, Math.PI - 0.7, { hue: 3, n: 6 });
  for (const k of [52, 54, 56]) fan(bar(k) + 2 * B, [CX, 180, 620][(k - 52) / 2], k % 4 ? 70 : 126, 112, 7, { step: B / 4 });
  tilt(bar(52), -0.1); tilt(bar(54), 0.1); tilt(bar(56), 0);
  for (const k of [54, 58]) zap(bar(k));
  // 58〜60小節: 万華鏡の大きな星（12本）が2つ ＋ 左右の扇
  burst(bar(58), () => stageTo({ brush: 0 }, 1));
  star(bar(58), CX, GROUND_Y - 170, 130, 0.2, { n: 12, step: B / 4 });
  fan(bar(59), 120, 90, 120, 6, { step: B / 4 });
  fan(bar(59) + 2 * B, W - 120, 110, 120, 6, { step: B / 4, reverse: true });

  // ===== FIN 60〜 ｜ 最後の光 → 絵が完成する ==========================================================
  zap(bar(60));

  return cues.sort((a, b) => a.t - b.t);
}

addSong({
  id: 'prism',
  title: 'Prism',
  meta: '128 BPM · 1:58 · オリジナル曲 · 光の芸術',
  file: 'Prism.mp3',
  bpm: 128, beat: PR_BEAT, end: 117.5,
  beatTime: prBeatTime,
  beatPos: prBeatPos,
  speedAt: prSpeedAt,
  env: ENV_PRISM,
  sections: PR_SECTIONS,
  build: prismChart,
  theme: 'prism',                  // visuals-prism.js の見た目のセット
  titleLook: { sky: ['#07060d', '#13101f'], color: '#f4efe6', tier: 1, pulse: 0.006, stars: 0 },
  titleBpm: 128,
  preview: 56.75,
  clearTitle: 'MASTERPIECE',
  overTitle: 'UNFINISHED',
  clearText: '光の絵が完成した。',
  bestKey: 'dodge_best_prism',
});
