"use strict";

/* =========================================================================
   曲④  segment（オリジナル曲）  —  拍・場面・譜面（弾幕）
   ピアノ・鉄琴・ガラスの割れる音でできた曲。テーマは「ガラスの部屋」。
   ひびが入り、割れて、破片（segment）になって、また光を通す。

   曲は songs/segment-compose.py（Python）で作曲・合成した。
   音符・ガラスの割れる時刻は songs/segment-score.js に書き出してあるので、
   弾は「実際に鳴っている音」とぴったりそろう。

   この曲だけの仕掛け:
     pane      … ガラスの板。ひびがだんだん広がり、割れる音と同時に破片が飛び散る
     crack     … ひび割れ。根もとから伸びていく線に当たる（伸びる前にうすく予告）
     keyDrop   … 鍵盤ブロック。ピアノの音が鳴る瞬間に地面に着く。長い音ほど長いブロック
     prism     … プリズム弾。鉄琴の音。拍ごとに光のようにカクッと曲がる
     shard     … ガラスの破片（とがった三角の弾）
   ========================================================================= */

// ---- 拍のきざみ ------------------------------------------------------------
// 160 BPM: 1拍 = 0.375秒、1小節 = 1.5秒。0拍目 = 0.5秒
const SEG_BEAT = 0.375;
function segBeatTime(n) { return 0.5 + n * SEG_BEAT; }
function segBeatPos(t)  { return (t - 0.5) / SEG_BEAT; }

/* ---- 場面（セクション）------------------------------------------------------
   小節: 0 イントロ（ピアノと鉄琴だけ）/ 8 ひび（リズムが入る）/ 16 Aメロ（最初に割れる）/
   24 Aメロ後半（ピアノの旋律）/ 32 サビ前（氷のひび）/ 40 サビ / 56 間奏（割れて静かになる）/
   62 ため / 64 最後のサビ（半音上がる）/ 80 アウトロ（最後に割れる）
   tier = 盛り上がりの段階 0〜5（弾の速さ・光の強さ・プリズムの虹）
   -------------------------------------------------------------------------- */
const SEG_SECTIONS = [
  { t: 0,     tier: 0,   name: 'GLASS',     sub: 'ガラスの部屋',             sky: ['#0b1324', '#1d3550'], color: '#bfefff', pulse: 0.003, sway: 0.15, stars: 10 },
  { t: 12.45, tier: 1,   name: 'FRACTURE',  sub: 'ひび',                     sky: ['#0d1428', '#233c5e'], color: '#9fe6ff', pulse: 0.006, sway: 0.25, stars: 14 },
  { t: 24.45, tier: 2,   name: 'SEGMENT',   sub: 'Aメロ ─ 割れた破片',        sky: ['#101530', '#2b3f6c'], color: '#c6b3ff', pulse: 0.01,  sway: 0.35, stars: 18, zoom: [1, 1.02] },
  { t: 36.45, tier: 2.5, name: 'KEYS',      sub: 'Aメロ ─ 鍵盤',              sky: ['#121634', '#344577'], color: '#a8d8ff', pulse: 0.011, sway: 0.4,  stars: 22 },
  { t: 48.45, tier: 3,   name: 'PRISM',     sub: 'サビ前 ─ 光の屈折',          sky: ['#16173a', '#3d4682'], color: '#ff9ad5', pulse: 0.014, sway: 0.5,  stars: 26, zoom: [1, 1.035] },
  { t: 60.45, tier: 4,   name: 'SHATTER',   sub: 'サビ ─ 砕け散る',            sky: ['#1b1740', '#4a4890'], color: '#9cf2ff', pulse: 0.022, sway: 0.8,  stars: 36 },
  { t: 84.45, tier: 0.5, name: 'SILENCE',   sub: '間奏 ─ しずかな破片',        sky: ['#0a1020', '#1a2a44'], color: '#dff6ff', pulse: 0.002, sway: 0.1,  stars: 8 },
  { t: 93.45, tier: 1.5, name: '',          sub: '',                         sky: ['#121634', '#30406c'], color: '#c6b3ff', pulse: 0.012, sway: 0.3,  stars: 14, zoom: [1, 1.05] },
  { t: 96.45, tier: 5,   name: 'SEGMENTS',  sub: '最後のサビ ─ ひとつひとつの欠片', sky: ['#1f1546', '#5a4aa0'], color: '#ffb3e6', pulse: 0.028, sway: 1.1,  stars: 50 },
  { t: 120.45, tier: 1,  name: 'CLEAR',     sub: '透明',                     sky: ['#16203c', '#5f7fb0'], color: '#f2fbff', pulse: 0.005, sway: 0.2,  stars: 12 },
];

// 弾の速さ: 盛り上がりに合わせて 0.92倍（静か）〜 1.47倍（最後のサビ）
function segSpeedAt(t) {
  let i = 0;
  while (i + 1 < SEG_SECTIONS.length && SEG_SECTIONS[i + 1].t <= t) i++;
  return 0.92 + 0.11 * SEG_SECTIONS[i].tier;
}

/* ---- 譜面 -------------------------------------------------------------------
     0〜  8小節  イントロ   鉄琴の音 = ゆっくり曲がるプリズム弾 ／ ピアノの分散和音 = 破片の雨
     8〜 16      ひび       8分のピアノ = 破片の雨 ／ 鉄琴 = すみからプリズム ／ 天井からひび → 16小節目で割れる
    16〜 24      Aメロ      ピアノの和音（3-3-2のリズム）= 3つの破片 ／ 鉄琴 = プリズム ／ 横からひび
    24〜 32      Aメロ後半  ピアノの旋律 = 鍵盤ブロック
    32〜 40      サビ前     ピアノの旋律 = 鍵盤ブロック ／ 和音 = 横からプリズム ／ すみからひび → 割れる
    40〜 56      サビ       速い鍵盤ブロック ／ ひび ／ すみから破片 ／ 48小節目でもう一枚割れる
    56〜 64      間奏       割れて静かに → ゆっくりの鍵盤 ／ 62〜 破片が中心へ集まってくる（逆再生）
    64〜 80      最後のサビ もっと速い鍵盤 ／ 4小節ごとに左・右・まん中の板が割れる
    80〜 84      アウトロ   いちばん大きな板が割れる
   -------------------------------------------------------------------------- */
// サビの和音（作曲プログラムと同じ。MIDI 番号）
const SEG_CHORDS = { Dm: [50, 53, 57], Bb: [46, 50, 53], F: [53, 57, 60], C: [48, 52, 55], Gm: [55, 58, 62], A: [57, 61, 64], Am: [57, 60, 64] };
const SEG_CHORUS = ['Bb', 'C', 'Am', 'Dm', 'Bb', 'C', 'Am', 'Dm', 'Bb', 'C', 'Am', 'Dm', 'Gm', 'A', 'Bb', 'A'];

function segmentChart() {
  const cues = [];
  const burst = (t, fn) => cues.push({ t, fn });
  const beat = segBeatTime;
  const bar = k => beat(k * 4);
  const fire = (t, warn, fn) => burst(t - warn, () => fn(warn));
  const SC = SCORE_SEGMENT;
  const CX = W / 2;
  const ICE = '#bfefff', CYAN = '#7fe3ff', LILAC = '#c6b3ff', PINK = '#ff9ad5', WHITE = '#f4fbff', MINT = '#9cffd9';
  const RAINBOW = ['#ff8fa3', '#ffd27a', '#9cffb0', '#7fd8ff', '#b69cff'];
  const inRange = (list, b0, b1) => list.filter(n => n[0] >= b0 && n[0] < b1);
  const clamp = v => Math.max(0, Math.min(1, v));

  // 音の高さ → 横の位置（低い音ほど左。lo〜hi を画面の幅いっぱいに）
  const px = (m, lo, hi) => 50 + (W - 100) * clamp((m - lo) / (hi - lo));
  // ピアノの旋律 → 鍵盤ブロック（鳴る瞬間に地面に着く。長さ = 音の長さ）
  const keys = (list, v, lo, hi, colorOf) => list.forEach(([b, len, m], i) => {
    const d = keyDrop(beat(b), px(m, lo, hi), len * SEG_BEAT, v, { color: colorOf(b, i) });
    burst(d.at, d.go);
  });
  // 上から落ちる破片
  const drop = (t, x, v, color, r = 6) => fire(t, 0.3, delay => shard({ x, y: -10, vx: rand(-20, 20), vy: v, r, delay, color }));
  // ガラスの板: t に割れる（warn 秒前からひびが入りはじめる）。hx, hy = ひびの中心（関数ならその時のプレイヤーの位置などを使える）
  const glass = (t, warn, opts) => burst(t - warn, () => {
    const o = typeof opts === 'function' ? opts() : opts;
    pane({ ...o, at: t });
  });
  // 画面のふち（左右）のどこかから、プレイヤーへ向かうひび
  const sideCrack = (t, { arms = 1, len = 560, speed = 1000, color = WHITE, warn = 0.8, spread = 0.5 } = {}) => fire(t, warn, delay => {
    const left = Math.random() < 0.5, x = left ? 0 : W, y = rand(120, GROUND_Y - 160), p = playerXY();
    crack({ x, y, arms, a0: Math.atan2(p.y - y, p.x - x), spread, len, speed, delay, color });
  });
  // 上のすみから、プレイヤーへ3枚の破片
  const cornerFan = (t, left, v = 260, color = LILAC) => fire(t, 0.35, delay => {
    const x = left ? 20 : W - 20, y = 20, p = playerXY(), base = Math.atan2(p.y - y, p.x - x);
    for (const o of [-0.16, 0, 0.16]) shard({ x, y, vx: Math.cos(base + o) * v, vy: Math.sin(base + o) * v, r: 7, delay, color });
  });

  // ===== GLASS 0〜8小節 ｜ 鉄琴 = ゆっくり曲がるプリズム ／ 分散和音 = 破片がぽつぽつ =======
  inRange(SC.hook, 0, 32).forEach(([b, m], i) =>
    fire(beat(b), 0.4, delay => prism({ x: px(m, 76, 90), y: -8, a: Math.PI / 2 + (i % 2 ? 0.25 : -0.25), v: 120, turn: 0.75, every: 2, r: 6, delay, color: i % 3 ? ICE : LILAC })));
  inRange(SC.arp, 16, 32).filter(([b]) => b % 2 === 0).forEach(([b, m]) => drop(beat(b), px(m, 48, 72), 190, CYAN));
  SC.tink.filter(b => b < 32).forEach(b =>
    fire(beat(b), 0.4, delay => { const x = rand(120, W - 120), y = rand(60, 180); ring({ x, y, count: 6, speed: 100, r: 6, start: rand(0, 1), delay, color: WHITE, style: 'shard' }); }));
  glass(bar(8), 1.5, { x: CX, y: 190, w: 220, h: 130, n: 12, speed: 170, size: 0.4, color: ICE });

  // ===== FRACTURE 8〜16小節 ｜ 8分の破片の雨 ＋ プリズム ＋ 天井からひび → 割れる ===========
  inRange(SC.arp, 32, 64).forEach(([b, m], i) => drop(beat(b), px(m, 48, 72) + (i % 2 ? 14 : -14), 230, i % 2 ? CYAN : ICE, 5.5));
  inRange(SC.hook, 32, 64).forEach(([b, m], i) =>
    fire(beat(b), 0.4, delay => {
      const left = i % 2 === 0, x = left ? 30 : W - 30, p = playerXY();
      prism({ x, y: 40, a: Math.atan2(p.y - 40, p.x - x), v: 165, turn: 0.5, every: 1, r: 6, delay, color: LILAC });
    }));
  SC.snare.filter(b => b >= 48 && b < 60).forEach(b =>
    fire(beat(b), 0.8, delay => crack({ x: rand(140, W - 140), y: 0, arms: 2, a0: Math.PI / 2, spread: 0.9, len: 420, speed: 800, delay, color: ICE })));
  glass(bar(16), 3, () => ({ x: CX, y: 180, w: 560, h: 200, hx: CX + rand(-120, 120), n: 34, speed: 250, size: 1, color: WHITE }));

  // ===== SEGMENT 16〜24小節 ｜ ピアノの和音 = 3つの破片 ＋ 鉄琴 = プリズム ＋ 横からひび =====
  inRange(SC.stab, 64, 96).forEach(([b, ms], i) => ms.forEach((m, j) => drop(beat(b), px(m, 56, 74) + j * 6, 300, [LILAC, CYAN, PINK][j], 6)));
  SC.verseGlock.forEach(([b, m], i) =>
    fire(beat(b), 0.4, delay => prism({ x: px(m, 72, 88), y: -8, a: Math.PI / 2, v: 190, turn: 0.8, every: 1, r: 6.5, delay, color: i % 2 ? ICE : MINT })));
  SC.tink.filter(b => b >= 64 && b < 128).forEach(b => sideCrack(beat(b), { color: WHITE }));

  // ===== KEYS 24〜32小節 ｜ ピアノの旋律 = 鍵盤ブロック ＋ 小節の頭の和音 ====================
  keys(SC.versePiano, 470, 60, 76, (b, i) => (i % 2 ? LILAC : CYAN));
  inRange(SC.stab, 96, 128).filter(([b]) => b % 4 === 0).forEach(([b, ms]) => ms.forEach((m, j) => drop(beat(b), px(m, 56, 74) + j * 6, 320, PINK, 6)));

  // ===== PRISM 32〜40小節 ｜ 鍵盤ブロック ＋ 横からプリズム ＋ すみからひび → 大きく割れる ======
  keys(SC.pre, 520, 72, 90, (b, i) => RAINBOW[Math.floor(b / 4) % 5]);
  inRange(SC.stab, 128, 160).forEach(([b], i) =>
    fire(beat(b), 0.4, delay => {
      const left = i % 2 === 0, x = left ? -6 : W + 6, y = rand(90, 330);
      prism({ x, y, a: left ? 0.15 : Math.PI - 0.15, v: 210, turn: 0.55, every: 1, r: 7, delay, color: RAINBOW[i % 5] });
    }));
  for (let b = 144; b < 159; b += 2) {                        // 氷のひび: すみから中へ
    fire(beat(b), 0.8, delay => {
      const c = [[0, 0], [W, 0], [0, GROUND_Y], [W, GROUND_Y]][Math.floor(Math.random() * 4)];
      crack({ x: c[0], y: c[1], arms: 3, a0: Math.atan2(300 - c[1], CX - c[0]), spread: 1.0, len: 430, speed: 850, delay, color: ICE });
    });
  }
  glass(bar(40), 1.6, () => ({ x: CX, y: 230, w: 720, h: 300, hx: playerXY().x, hy: 300, n: 46, speed: 300, size: 1.3, color: WHITE }));

  // ===== SHATTER 40〜56小節 ｜ 速い鍵盤ブロック ＋ ひび ＋ すみから破片 ＋ 48小節目で割れる ===
  keys(SC.chorus, 600, 66, 87, b => RAINBOW[Math.floor(b / 4) % 5]);
  SC.tink.filter(b => b >= 160 && b < 224).forEach(b => sideCrack(beat(b), { arms: 2, spread: 0.5, speed: 1100 }));
  for (let k = 40; k < 56; k++) if (k % 2 === 1) cornerFan(bar(k) + 2 * SEG_BEAT, k % 4 === 1, 270, LILAC);
  for (let k = 40; k < 56; k++) for (const q of [1, 3]) {        // スネアで、和音の3音が破片になって落ちる
    const tones = SEG_CHORDS[SEG_CHORUS[k - 40]];
    tones.forEach((m, j) => drop(bar(k) + q * SEG_BEAT, px(m + 12, 56, 76) + j * 6, 340, [LILAC, CYAN, PINK][j], 6));
  }
  glass(bar(48), 1.4, () => ({ x: playerXY().x < CX ? 230 : W - 230, y: 210, w: 320, h: 220, n: 26, speed: 260, size: 0.8, color: CYAN }));

  // ===== SILENCE 56〜64小節 ｜ 割れて静かに → ゆっくりの鍵盤 → 破片が中心へ集まってくる =====
  glass(bar(56), 1.4, { x: CX, y: 190, w: 760, h: 260, n: 40, speed: 150, g: 180, size: 1.2, color: WHITE });
  keys(SC.break, 300, 70, 84, () => '#dff6ff');
  for (let k = 56; k < 62; k++) for (const q of [1, 3]) {
    fire(bar(k) + q * SEG_BEAT, 0.4, delay => prism({ x: rand(80, W - 80), y: -8, a: Math.PI / 2, v: 110, turn: 0.9, every: 2, r: 6, delay, color: LILAC }));
  }
  {                                                            // 62〜64小節: 破片が集まる（ガラスが割れる音の逆再生）
    const C = { x: CX, y: 270 }, t1 = bar(64);
    for (let i = 0; i < 32; i++) {
      const t = bar(62) + i * (t1 - bar(62)) / 32, a = i * 2.39996, R = 260 + (t1 - t) * 90;
      fire(t, 0.4, delay => {
        const x = C.x + Math.cos(a) * R, y = C.y + Math.sin(a) * R, v = R / (t1 - t);
        shard({ x, y, vx: -Math.cos(a) * v, vy: -Math.sin(a) * v, r: 6.5, delay, color: i % 2 ? PINK : LILAC, spd: 1 });
      });
    }
  }
  SC.snare.filter(b => b >= 252 && b < 256 && b % 1 === 0).forEach(b =>
    fire(beat(b), 0.7, delay => crack({ x: b % 2 ? 0 : W, y: GROUND_Y - 10, arms: 2, a0: b % 2 ? -0.5 : Math.PI + 0.5, spread: 0.6, len: 380, speed: 1000, delay, color: PINK })));
  glass(bar(64), 1.2, { x: CX, y: 270, w: 420, h: 300, n: 40, speed: 330, size: 1.4, color: WHITE });

  // ===== SEGMENTS 64〜80小節 ｜ もっと速い鍵盤 ＋ 4小節ごとに板が割れる ＋ ひび ＋ 破片 ======
  keys(SC.final, 660, 67, 88, b => RAINBOW[Math.floor(b / 4) % 5]);
  SC.tink.filter(b => b >= 256 && b < 320).forEach(b => sideCrack(beat(b), { arms: 2, spread: 0.45, speed: 1200, color: PINK }));
  for (let k = 64; k < 80; k++) if (k % 2 === 1) { cornerFan(bar(k) + 2 * SEG_BEAT, true, 290, LILAC); cornerFan(bar(k) + 2 * SEG_BEAT, false, 290, CYAN); }
  for (let k = 64; k < 80; k++) for (const q of [1, 3]) {
    const tones = SEG_CHORDS[SEG_CHORUS[k - 64]];
    tones.forEach((m, j) => drop(bar(k) + q * SEG_BEAT, px(m + 13, 56, 77) + j * 6, 370, [PINK, LILAC, CYAN][j], 6));
  }
  for (let k = 64; k < 80; k += 2) fire(bar(k), 0.4, delay => {    // 2小節ごと: 左右からプリズム
    for (const left of [true, false]) prism({ x: left ? -6 : W + 6, y: rand(120, 300), a: left ? 0.2 : Math.PI - 0.2, v: 230, turn: 0.6, every: 1, r: 7, delay, color: RAINBOW[k % 5] });
  });
  [[68, 220], [72, W - 220], [76, CX]].forEach(([k, x]) =>
    glass(bar(k), 1.3, () => ({ x, y: 210, w: 340, h: 240, hx: x + rand(-60, 60), n: 28, speed: 280, size: 0.8, color: RAINBOW[k % 5] })));

  // ===== CLEAR 80〜84小節 ｜ いちばん大きな板が割れて、破片がゆっくり落ちる ===================
  glass(bar(80), 2.4, { x: CX, y: 290, w: 780, h: 420, n: 60, speed: 260, g: 200, size: 1.6, color: WHITE });

  return cues.sort((a, b) => a.t - b.t);
}

addSong({
  id: 'segment',
  title: 'segment',
  meta: '160 BPM · 2:08 · オリジナル曲',
  file: 'Segment.mp3',
  bpm: 160, beat: SEG_BEAT, end: 127.0,
  beatTime: segBeatTime,
  beatPos: segBeatPos,
  speedAt: segSpeedAt,
  env: ENV_SEGMENT,                // 曲の音量データ（songs/segment-env.js）
  sections: SEG_SECTIONS,
  build: segmentChart,
  theme: 'glass',                  // visuals-glass.js の見た目のセット
  titleLook: { sky: ['#0d1428', '#233c5e'], color: '#bfefff', tier: 2, pulse: 0.006, stars: 14 },
  titleBpm: 80,
  preview: 60.5,                   // 試聴はサビから
  clearText: '割れた欠片が、ひとつずつ光を通した。',
  bestKey: 'dodge_best_segment',
});
