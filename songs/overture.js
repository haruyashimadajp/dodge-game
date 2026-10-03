"use strict";

/* =========================================================================
   曲⑮  Grand Overture（オリジナル曲）  —  拍・場面・譜面
   オーケストラ。132 BPM の勇ましい序曲（ニ短調 → 最後はニ長調）。
   曲は songs/overture-compose.py で作曲・合成した。弦楽器（バイオリン・ビオラ・チェロ・コントラバス）、
   金管（ホルン・トランペット・トロンボーン・チューバ）、木管（フルート・オーボエ・クラリネット・ファゴット）、
   ティンパニ・大太鼓・シンバル・小太鼓・トライアングル、ハープ・チェレスタ・チューブラーベル、合唱、パイプオルガン。
   難易度はふつう〜むずかしめ。演出は visuals-hall.js（コンサートホール。弾いている楽器のパートに光が当たる）。

   楽器ごとに攻撃がちがう:
     バイオリンの旋律 = 楽譜の音符が右から流れてくる（低い音 A4〜C5 は床を走るので跳ぶ）
     トランペットの旋律 = 金色の音符が左から ／ ホルン = 上のすみから音の輪 ／ 金管の一撃 = ベルから扇のビーム
     はねる弓（スピッカート）= 音の高さの所に雨 ／ ピチカート = 小さな粒 ／ ティンパニ = 太鼓から放物線
     シンバル = 左右から円盤がぶつかる ／ ハープ = 弦が光る ／ フルート・オーボエ = ゆれる弾 ／ チェレスタ = 星
     合唱 = 上から光の輪 ／ オルガン = 音の柱 ／ 鐘 = 金の輪 ／ 全員が休む（G.P.）= 時間が止まる ／ 指揮棒 = 光の棒
   ========================================================================= */

// 132 BPM: 1拍 = 60/132 秒（約0.45秒）、1小節 = 約1.82秒。0拍目 = 0.5秒
const OV_BEAT = 60 / 132;
function ovBeatTime(n) { return 0.5 + n * OV_BEAT; }
function ovBeatPos(t)  { return (t - 0.5) / OV_BEAT; }
const ovBar = k => ovBeatTime(k * 4);

const OV_SECTIONS = [
  { t: ovBar(0),  tier: 0.5, no: 'I',   name: 'FANFARE',   sub: 'Allegro maestoso ─ 幕が上がる',        sky: ['#1a0608', '#3a0e12'], color: '#ffcf6b', pulse: 0.004, sway: 0.1, stars: 0 },
  { t: ovBar(8),  tier: 1.5, no: 'II',  name: 'THEME',     sub: 'バイオリンが主題をうたう',               sky: ['#1c0709', '#42121a'], color: '#ffd98a', pulse: 0.008, sway: 0.2, stars: 0 },
  { t: ovBar(16), tier: 2.5, no: 'III', name: 'BATTLE',    sub: 'はねる弓、打ちこむ金管',                 sky: ['#200608', '#4a0e10'], color: '#ff9a4a', pulse: 0.014, sway: 0.3, stars: 0 },
  { t: ovBar(24), tier: 3,   no: 'IV',  name: 'TUTTI',     sub: '全員で、主題を',                        sky: ['#240a08', '#5a1a10'], color: '#ffc94d', pulse: 0.018, sway: 0.4, stars: 0 },
  { t: ovBar(32), tier: 1,   no: 'V',   name: 'NOCTURNE',  sub: 'ハープとフルートの夜想曲',               sky: ['#060a1c', '#101a3a'], color: '#9fc8ff', pulse: 0.004, sway: 0.2, stars: 0 },
  { t: ovBar(40), tier: 2.5, no: 'VI',  name: 'CRESCENDO', sub: 'だんだん強く',                          sky: ['#140610', '#3a0e20'], color: '#ff7a8a', pulse: 0.012, sway: 0.3, stars: 0 },
  { t: ovBar(48), tier: 4,   no: 'VII', name: 'FINALE',    sub: 'ニ長調 ─ すべての楽器が',                sky: ['#2a1206', '#6a3a10'], color: '#ffe08a', pulse: 0.022, sway: 0.5, stars: 0 },
  { t: ovBar(60), tier: 3,   no: '',    name: 'CODA',      sub: '',                                     sky: ['#2a1206', '#6a3a10'], color: '#fff0c0', pulse: 0.02,  sway: 0.3, stars: 0 },
];

// 弾の速さ: 1.0〜1.36倍
function ovSpeedAt(t) {
  let i = 0;
  while (i + 1 < OV_SECTIONS.length && OV_SECTIONS[i + 1].t <= t) i++;
  return 1.0 + 0.09 * OV_SECTIONS[i].tier;
}

// 音の高さ → 音符が流れる高さ。A4〜C5（72 以下）は床すれすれ（跳び越える）、それより上は頭の上（足場の上では当たる）
function ovNoteY(m) { return m <= 72 ? GROUND_Y - 11 : Math.max(250, 515 - (m - 74) * 17); }

function overtureChart() {
  const cues = [];
  const burst = (t, fn) => cues.push({ t, fn });
  const B = OV_BEAT;
  const beat = ovBeatTime;
  const bar = ovBar;
  const fire = (t, warn, fn) => burst(t - warn, () => fn(warn));
  const SC = SCORE_OVERTURE;
  const CX = W / 2;
  const GOLD = '#ffc94d', CREAM = '#fff1c9', ROSE = '#ff7a8a', IVORY = '#f4ead2', SKY = '#9fc8ff', BRONZE = '#d08a4a', SILVER = '#dfe6ff';
  const inBars = (b, k0, k1) => b >= k0 * 4 && b < k1 * 4;
  const px = (m, lo, hi) => 60 + (W - 120) * Math.max(0, Math.min(1, (m - lo) / (hi - lo)));
  const hsh = (a, b = 0) => { const v = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return v - Math.floor(v); };
  const hint = (t, text, beats = 4) => burst(t, () => stageHint(text, beats * B));
  const pX = () => playerXY().x;
  const clampX = x => Math.max(50, Math.min(W - 50, x));

  // ---- 楽器ごとの攻撃 -------------------------------------------------------------------------
  // 楽譜の音符: 音が鳴る瞬間に画面のまんなかを通るように流す
  const note = (b, m, o = {}) => {
    const t = beat(b), v = o.v || 290, travel = (W / 2 + 20) / (v * ovSpeedAt(t)), warn = 0.45;
    fire(t - travel, warn, delay => staffNote({ y: ovNoteY(m), fromLeft: !!o.left, v, r: m <= 72 ? 10 : 9, delay, color: o.color || (o.left ? GOLD : CREAM), style: m <= 72 || o.left ? 'qnote' : 'enote' }));
  };
  const rain = (b, x, o = {}) => fire(beat(b), o.warn || 0.4, delay => spawn({ x, y: -10, vy: o.v || 300, r: o.r || 6, delay, color: o.color || ROSE, style: o.style || 'bow', lane: [0, 1] }));
  const pz = (b, x) => fire(beat(b), 0.4, delay => spawn({ x, y: -10, vy: 200, r: 6, delay, color: IVORY, style: 'pizz', lane: [0, 1] }));
  // ティンパニ: 左右の太鼓（舞台のすみ）から、プレイヤーのいる方へ放物線
  const timp = (b, side, o = {}) => fire(beat(b), 0.45, delay => {
    const x0 = side < 0 ? 60 : W - 60, tx = clampX(pX() + (o.off || 0)), air = 1.15;
    lob({ x: x0, y: GROUND_Y - 40, vx: (tx - x0) / air, vy: -(0.5 * 900 * air) + 30 / air, g: 900, r: o.r || 9, delay, color: BRONZE });
  });
  const horn = (b, L, left) => fire(beat(b), 0.6, delay => ring({ x: left ? 90 : W - 90, y: 90, count: Math.round(10 + 4 * L), speed: 130, r: 7, delay, color: GOLD, style: 'gold', start: hsh(b) * TAU }));
  // 金管の一撃: 3つのベル（左・まんなか・右）のどれかから、プレイヤーのまわりへ3本の扇
  const stab = (b, i, o = {}) => fire(beat(b), o.warn || 0.65, delay => {
    const bx = [150, CX, W - 150][i % 3], by = 70, tx = clampX(pX()), base = Math.atan2(GROUND_Y - by, tx - bx);
    fanfare({ x: bx, y: by, aims: (o.n === 2 ? [-0.2, 0.2] : [-0.3, 0, 0.3]).map(d => base + d + (o.skew || 0)), delay, hold: 0.22 });
  });
  const clash = (b, y = 430) => { const v = 560, travel = (W / 2 + 30 - 13) / v; fire(beat(b) - travel, 0.55, delay => cymbalClash({ y, v, delay, n: 16, speed: 165 })); };
  const harpS = (b, x, o = {}) => fire(beat(b), o.warn || 0.6, delay => harpString({ x, delay, hold: 0.16 }));
  const flute = (b, x, o = {}) => fire(beat(b), 0.5, delay => wave({ x, y: -10, fall: 150, amp: 50, freq: 3, r: 8, delay }));
  const star = (b, x) => fire(beat(b), 0.4, delay => spawn({ x, y: -10, vy: 110, vx: (hsh(b) - 0.5) * 40, r: 6, delay, color: '#cfe4ff', style: 'star', lane: [0, 1] }));
  const halo = (b, o = {}) => fire(beat(b), 0.8, delay => ring({ x: CX, y: 60, count: o.n || 20, speed: o.v || 110, r: 7, delay, color: o.color || '#ffe7f0', style: 'halo', start: hsh(b) * TAU }));
  const organ = (b, cols) => fire(beat(b), 0.85, delay => organPipes({ cols, n: 8, delay, hold: 0.3 }));
  const bells = (b) => fire(beat(b), 0.7, delay => ring({ x: CX, y: 130, count: 22, speed: 150, r: 9, delay, color: GOLD, style: 'gold', start: hsh(b, 2) * TAU }));
  const runUp = (b, L, o = {}) => {                       // 弦の速い音階: 左から右へ、音の階段が降ってくる
    const n = 10, dir = hsh(b) < 0.5 ? 1 : -1;
    for (let i = 0; i < n; i++) rain(b + L * i / n, dir > 0 ? 70 + i * 66 : W - 70 - i * 66, { v: 330, color: CREAM, style: 'enote', r: 7 });
  };

  // ===== I. FANFARE 0〜8小節 ｜ 幕が上がる。ティンパニの連打 = 放物線 ／ ホルン = 音の輪 ／ 金管の和音 = 扇のビーム =================
  for (let b = 8; b < 32; b += 2) timp(b, (b / 2) % 2 ? 1 : -1, { r: 7 });
  hint(beat(8) - 2 * B, 'ホルン ─ 上のすみから音の輪');
  SC.horn.filter(([b]) => inBars(b, 2, 8)).forEach(([b, L], i) => horn(b, L, i % 2 === 0));
  hint(beat(24) - 1 * B, '金管 ─ ベルから金色のビーム');
  SC.stab.filter(b => inBars(b, 6, 8)).forEach((b, i) => stab(b, i, { n: 2 }));

  // ===== II. THEME 8〜16小節 ｜ バイオリンの旋律 = 楽譜の音符（右から）／ ピチカート = 粒 ／ ティンパニ ===================
  clash(32);
  hint(beat(33), '旋律 ─ 低い音符は床を走る。跳び越える');
  SC.melody.filter(([b]) => inBars(b, 8, 16)).forEach(([b, , m]) => note(b, m));
  SC.pizz.filter(([b]) => inBars(b, 8, 16)).forEach(([b, m], i) => pz(b, px(m, 36, 62) + (hsh(b) - 0.5) * 120));
  SC.timp.filter(([b]) => inBars(b, 9, 16)).forEach(([b], i) => { timp(b, -1); timp(b, 1, { off: 160 }); });
  for (const k of [10, 14]) stab(k * 4 + 2, k, { n: 2 });

  // ===== III. BATTLE 16〜24小節 ｜ はねる弓 = 音の高さの所に雨 ／ 金管の一撃 = 扇 ／ ティンパニ ／ 速い音階 ======================
  hint(beat(64) - 2 * B, 'スピッカート ─ 音の高さの所に、弓がはねる');
  SC.spic.filter(([b]) => inBars(b, 16, 24)).forEach(([b, m]) => rain(b, px(m, 72, 90) + (hsh(b) - 0.5) * 40, { v: 340 }));
  SC.stab.filter(b => inBars(b, 16, 24)).forEach((b, i) => stab(b, i, { n: i % 2 ? 2 : 3 }));
  SC.timp.filter(([b]) => inBars(b, 16, 24)).forEach(([b], i) => { timp(b, i % 2 ? 1 : -1); timp(b + 2, i % 2 ? -1 : 1, { off: (hsh(b) - 0.5) * 200 }); });
  SC.runs.filter(([b]) => inBars(b, 16, 24)).forEach(([b, L]) => runUp(b, L));

  // ===== IV. TUTTI 24〜32小節 ｜ トランペットの旋律 = 金色の音符（左から）／ シンバル ／ 速い音階 ／ ティンパニ =================
  clash(96, 420); clash(112, 400);
  SC.brassMel.filter(([b]) => inBars(b, 24, 32)).forEach(([b, , m]) => note(b, m, { left: true, v: 300 }));
  SC.runs.filter(([b]) => inBars(b, 24, 32)).forEach(([b, L]) => runUp(b, L));
  SC.timp.filter(([b]) => inBars(b, 24, 32)).forEach(([b], i) => { timp(b, i % 2 ? 1 : -1); if (i % 2) timp(b, i % 2 ? -1 : 1, { off: 140 }); });
  for (const k of [25, 27, 29, 31]) stab(k * 4 + 2, k, { n: 3 });

  // ===== V. NOCTURNE 32〜40小節 ｜ ハープ = 弦が光る ／ フルート・オーボエ = ゆれる弾 ／ チェレスタ = 星 ／ グリッサンド ===========
  hint(bar(32), 'ハープ ─ 光った弦にふれない');
  SC.harp.filter(([b]) => inBars(b, 32, 40)).forEach(([b, m]) => harpS(b, px(m, 34, 76)));
  SC.flute.concat(SC.oboe).forEach(([b, , m]) => { flute(b, px(m, 66, 86)); flute(b, W - px(m, 66, 86)); });
  SC.celesta.forEach(([b, m]) => star(b, px(m, 84, 96)));
  // グリッサンド: 弦が端から順に光っていく（1か所だけ光らない = そこに立つ）
  SC.gliss.forEach(([b, L, dir]) => {
    const gap = dir > 0 ? 5 : 2;
    for (let i = 0; i < 12; i++) if (Math.abs(i - gap) > 0) harpS(b + L * i / 12, dir > 0 ? 34 + i * 66 : W - 34 - i * 66, { warn: 0.9 });
  });

  // ===== VI. CRESCENDO 40〜48小節 ｜ 16分の弓（半分）= 雨 ／ ティンパニ ／ 合唱 = 光の輪 ／ 上がる金管 ／ G.P. = 時間が止まる ========
  SC.spic.filter(([b]) => inBars(b, 40, 48) && ((b * 4) % 2 === 0 || b >= 44 * 4)).forEach(([b, m]) => rain(b, px(m, 70, 90), { v: 350 }));
  SC.timp.filter(([b]) => inBars(b, 40, 48)).forEach(([b], i) => timp(b, i % 2 ? 1 : -1));
  SC.choir.filter(([b]) => inBars(b, 40, 48)).forEach(([b]) => halo(b, { n: 18, v: 110 }));
  SC.stab.filter(b => inBars(b, 46, 48)).forEach((b, i) => stab(b, i, { n: 2 }));
  hint(beat(188), 'G.P. ─ 全員が休む…', 3);
  SC.gp.forEach(b => burst(beat(b), () => timeStop(B * 0.95)));

  // ===== VII. FINALE 48〜60小節 ｜ 旋律 = 音符 ／ オルガン = 音の柱 ／ 鐘 = 金の輪 ／ シンバル ／ 指揮棒 ===========================
  SC.melody.filter(([b]) => inBars(b, 48, 60)).forEach(([b, , m]) => note(b, m, { v: 300 }));
  SC.cymbal.filter(b => inBars(b, 48, 60)).forEach(b => clash(b, 400));
  SC.bells.forEach(([b]) => bells(b));
  SC.organ.filter(([b]) => inBars(b, 48, 51) || inBars(b, 56, 60)).forEach(([b], i) => organ(b, [[0, 7], [3, 4], [1, 6], [2, 5]][i % 4]));
  hint(bar(51) - 2 * B, '指揮棒 ─ 光の棒が4拍子をふる。まんなかに注意');
  fire(bar(51), 1.2, delay => baton({ t0: bar(51), beats: 20, delay, len: 640 }));
  SC.timp.filter(([b]) => inBars(b, 48, 60)).forEach(([b], i) => timp(b, i % 2 ? 1 : -1));
  for (let k = 48; k < 60; k++) if (k % 2 === 1 && !(k >= 51 && k < 56)) stab(k * 4 + 2, k, { n: 3 });   // 金管の合いの手（指揮棒の間は休み）

  // ===== CODA 60〜 ｜ ファンファーレ = 金色の音符 ／ 3回の一撃 ／ 最後のシンバル =====================================================
  SC.brassMel.filter(([b]) => b >= 240).forEach(([b, , m]) => note(b, m, { left: true, v: 300 }));
  SC.stab.filter(b => b >= 240).forEach((b, i) => stab(b, i, { n: 3 }));
  clash(251, 380);

  return cues.sort((a, b) => a.t - b.t);
}

addSong({
  id: 'overture',
  title: 'Grand Overture',
  meta: '132 BPM · 2:01 · オリジナル曲 · オーケストラ · ふつう〜むずかしめ',
  file: 'GrandOverture.mp3',
  bpm: 132, beat: OV_BEAT, end: 121.4,
  beatTime: ovBeatTime,
  beatPos: ovBeatPos,
  speedAt: ovSpeedAt,
  env: ENV_OVERTURE,
  sections: OV_SECTIONS,
  build: overtureChart,
  theme: 'hall',                   // visuals-hall.js の見た目のセット
  titleLook: { sky: ['#1c0709', '#42121a'], color: '#ffd98a', tier: 1, pulse: 0.008, stars: 0 },
  titleBpm: 132,
  preview: 44.1,
  clearTitle: 'BRAVO!',
  overTitle: '演奏中止…',
  clearText: '鳴りやまない拍手。',
  bestKey: 'dodge_best_overture',
});
