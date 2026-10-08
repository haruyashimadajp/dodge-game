"use strict";

/* =========================================================================
   曲⑳  NEON BAILE（オリジナル曲）  —  拍・場面・譜面
   ブラジリアン・ファンク（バイレ・ファンク / フォンク）。130 BPM、G マイナー。
   曲は songs/baile-compose.py で作曲・合成した。音はぜんぶこの曲だけのもの:
   タンボルザォン（ファンク・カリオカのドラム: キックが 16分の 0・3・6・10・12）・歪んだ 808（音から音へすべる）・
   フォンクのカウベル（旋律をひく）・声のチョップ（母音 a / e / i / o / u の合成の声を、短く切ってくり返す）・
   トゥイン（落ちていくレーザーの音）・SLOWED（半分の速さになって、最後はテープが止まる）。
   難易度はふつう〜むずかしい。演出は visuals-baile.js（夜のネオン街、丘の上のファヴェーラの灯り、車）。

   音 → 弾:
     カウベルの旋律 = 音の高さの所に、カウベルが落ちてくる
     声のチョップ   = 母音の文字の入ったシャボン（ゆらゆら落ちる。長い声は輪になって広がる。ドロップでは出さない）
     クラップ       = 上のスピーカーから 3〜5 発
     トゥイン       = 上から落ちるレーザー（予告の所をよける）
     808 の長い音   = 車高の低い車が床を横切る（跳び越える）。車はキックではねる
     キックの連打（13・14・15）= 床から噴き上がる
     808 の長い「ヴゥゥン」（ドロップの頭）= 床を走るビーム（跳ぶ）
     シンセの「ビューン」（落ちていく音）= 上のすみからのななめのビーム
   ========================================================================= */

// 130 BPM: 1拍 = 60/130 秒（約0.46秒）、1小節 = 約1.85秒。0拍目 = 0.5秒
const BL_BEAT = 60 / 130;
function blBeatTime(n) { return 0.5 + n * BL_BEAT; }
function blBeatPos(t)  { return (t - 0.5) / BL_BEAT; }
const blBar = k => blBeatTime(k * 4);

const BL_SECTIONS = [
  { t: blBar(0),  tier: 0.5, name: 'NEON BAILE', sub: '夜のバイレへ',                 sky: ['#0a0418', '#2a0838'], color: '#ff3ea5', pulse: 0.008, sway: 0.1, stars: 60 },
  { t: blBar(8),  tier: 1.5, name: 'AQUECIMENTO', sub: 'ウォーミングアップ',          sky: ['#0c0420', '#3a0a4a'], color: '#c77dff', pulse: 0.014, sway: 0.2, stars: 50 },
  { t: blBar(16), tier: 3,   name: 'MONTAGEM',    sub: 'カウベルが鳴る',              sky: ['#120428', '#5a0a5a'], color: '#ff3ea5', pulse: 0.03,  sway: 0.5, stars: 30 },
  { t: blBar(32), tier: 0.8, name: 'SLOWED',      sub: '+ reverb',                    sky: ['#06041a', '#1a0a3a'], color: '#8a7dff', pulse: 0.01,  sway: 0.2, stars: 80 },
  { t: blBar(40), tier: 2,   name: 'SOBE',        sub: 'もう一度、上がっていく',      sky: ['#0c0420', '#4a0a4a'], color: '#22e6ff', pulse: 0.016, sway: 0.3, stars: 40 },
  { t: blBar(48), tier: 4,   name: 'MANDELÃO',    sub: 'いちばん激しいところ',        sky: ['#160424', '#6a0a3a'], color: '#ffe066', pulse: 0.036, sway: 0.6, stars: 20 },
  { t: blBar(64), tier: 1,   name: 'FIM',         sub: '',                            sky: ['#0a0418', '#2a0838'], color: '#ff3ea5', pulse: 0.01,  sway: 0.2, stars: 60 },
];

// 弾の速さ: 1.0〜1.36倍。SLOWED はゆっくり
function blSpeedAt(t) {
  let i = 0;
  while (i + 1 < BL_SECTIONS.length && BL_SECTIONS[i + 1].t <= t) i++;
  if (i === 3) return 0.72;
  return 1.0 + 0.09 * BL_SECTIONS[i].tier;
}

function baileChart() {
  const cues = [];
  const burst = (t, fn) => cues.push({ t, fn });
  const B = BL_BEAT;
  const beat = blBeatTime;
  const bar = blBar;
  const fire = (t, warn, fn) => burst(t - warn, () => fn(warn));
  const SC = SCORE_BAILE;
  const CX = W / 2;
  const PINK = '#ff3ea5', CYAN = '#22e6ff', GOLD = '#ffd23f', VIOLET = '#b36bff', LIME = '#7dff6a', WHITE = '#ffffff';
  const VOWEL_COL = { a: PINK, e: CYAN, i: LIME, o: GOLD, u: VIOLET };
  const inBars = (b, k0, k1) => b >= k0 * 4 && b < k1 * 4;
  const px = (m, lo, hi) => 60 + (W - 120) * Math.max(0, Math.min(1, (m - lo) / (hi - lo)));
  const hsh = (a, b = 0) => { const v = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return v - Math.floor(v); };
  const hint = (t, text, beats = 4) => burst(t, () => stageHint(text, beats * B));
  const pX = () => playerXY().x;
  const clampX = x => Math.max(50, Math.min(W - 50, x));

  // 道具
  // カウベル: ちょうど t に、プレイヤーの頭の高さ（床の少し上）に着くように落とす
  const bell = (t, x, o = {}) => {
    const v = (o.v || 240) * blSpeedAt(t), y0 = -16, fall = (GROUND_Y - 30 - y0) / v;
    fire(t - fall, o.warn || 0.45, delay => spawn({ x, y: y0, vy: o.v || 240, r: o.r || 8, delay, color: o.color || GOLD, style: 'bell', lane: [0, 1] }));
  };
  // 声のシャボン: ゆらゆら落ちる。文字は母音
  const voxBub = (t, x, vowel, o = {}) => fire(t, 0.5, delay => spawn({
    x, y: -14, r: o.r || 11, delay, color: VOWEL_COL[vowel] || PINK, style: 'vox', vowel, x0: x, amp: o.amp || 40, freq: o.freq || 3.2, fall: o.fall || 150,
    move(b, dt) { b.y += b.fall * dt; b.x = b.x0 + Math.sin(b.age * b.freq) * b.amp; },
  }));
  const voxRing = (t, x, y, vowel, o = {}) => fire(t, 0.55, delay => ring({ x, y, count: o.n || 10, speed: o.v || 150, r: 8, delay, start: o.start || 0, color: VOWEL_COL[vowel] || PINK, style: 'vox' }));
  // クラップ: 上のスピーカー（左右）からプレイヤーへ向けて
  const clapFan = (t, left, o = {}) => fire(t, 0.45, delay => fan({ x: left ? 90 : W - 90, y: 70, count: o.n || 3, spread: o.spread || 0.26, speed: o.v || 300, r: 7, delay }));
  // トゥイン: 上から落ちるレーザー（細い）
  const zap = (t, x, o = {}) => fire(t, o.warn || 0.6, delay => { const b = laser({ x1: x, y1: -40, x2: x, y2: GROUND_Y + 10, width: o.w || 20, delay, hold: 0.2, color: o.color || CYAN }); b.spd = 1; });
  // 車: 床を横切る。t = 画面のはしに入ってくる時刻
  const car = (t, fromLeft, o = {}) => {
    const v = o.v || 270, kicks = SC.kick.map(beat).filter(kt => kt > t && kt < t + (W + 200) / v);
    fire(t, o.warn || 1.0, delay => lowrider({ fromLeft, v, delay, color: o.color || PINK, kicks }));
  };
  const geyserAt = (t, o = {}) => fire(t, 0.55, delay => geyser({ x: clampX(pX() + (o.dx || 0)), count: o.n || 5, gap: 0.06, speed: 540, r: 8, delay }));
  // シンセの「ビューン」（高い音から落ちる）= 上のすみから床へ、ななめのビーム（来る側へよける）
  const slam = (t, fromLeft, o = {}) => fire(t, o.warn || 0.65, delay => {
    const x1 = fromLeft ? -40 : W + 40, y1 = 40, gx = clampX(pX() + (fromLeft ? 50 : -50));
    const b = laser({ x1, y1, x2: x1 + (gx - x1) * 1.3, y2: y1 + (GROUND_Y - y1) * 1.3, width: 18, delay, hold: 0.25, color: o.color || CYAN }); b.spd = 1;
  });
  // 808 の長い「ヴゥゥン」（ドロップの1拍目）= 床を走るビーム（跳ぶ）
  const vuun = (t, o = {}) => fire(t, o.warn || 0.8, delay => floorStrike({ delay, hold: 0.22, color: o.color || PINK }));
  const DIVE = new Set(SC.dive);
  const curtainRain = (t, gx, o = {}) => fire(t, 0.8, delay => curtain({ gapX: gx, gapW: o.gw || 150, spacing: 34, vy: o.v || 300, r: 8, delay }));

  // ===== 0〜8 夜のバイレへ ｜ カウベルの旋律 = 落ちるカウベル（ゆっくり）／ 4小節から声 = シャボン ==================================
  hint(bar(1), 'カウベル ─ 音の高さの所に落ちてくる');
  SC.bell.filter(([b]) => inBars(b, 1, 8) && (b * 4) % 2 === 0).forEach(([b, m]) => bell(beat(b), px(m, 72, 92), { v: 170, r: 7 }));
  SC.vox.filter(([b]) => inBars(b, 4, 8)).forEach(([b, , m, v], i) => voxBub(beat(b), px(m, 64, 82) + (i % 2 ? 40 : -40), v, { fall: 120 }));

  // ===== 8〜16 ウォーミングアップ ｜ クラップ = 3発 ／ カウベル（ぜんぶ）／ 14〜16 連打 = 雨のカーテン ===========================
  SC.clap.filter(b => inBars(b, 8, 14)).forEach((b, i) => clapFan(beat(b), i % 2 === 0, { n: 3, v: 270 }));
  SC.bell.filter(([b]) => inBars(b, 8, 14)).forEach(([b, m]) => bell(beat(b), px(m, 72, 92), { v: 220 }));
  SC.vox.filter(([b]) => inBars(b, 12, 14) && b % 4 === 0).forEach(([b, , m, v]) => voxRing(beat(b), px(m, 64, 82), 120, v, { n: 8, v: 130 }));
  SC.byuun.filter(b => inBars(b, 8, 16)).forEach((b, i) => slam(beat(b), i % 2 === 0));
  hint(bar(14) - 2 * B, '連打 ─ すき間に入る');
  [[14, 260], [14.5, 420], [15, 300], [15.5, 460]].forEach(([k, gx]) => curtainRain(bar(k), gx, { v: 300 }));
  hint(bar(16) - 4 * B, '床のビーム → 車 ─ どちらも跳び越える');

  // ===== 16〜32 MONTAGEM ｜ 車（2小節ごと）／ カウベル ／ クラップ ／ トゥイン = レーザー ／ 20〜 声 ============================
  function dropBars(k0, k1, hard) {
    // 2小節で1組: 1小節目 = 車だけ（跳び越える）／ 2小節目 = カウベル・クラップ・トゥイン
    // ドロップの1小節目（808 が長く「ヴゥゥン」と落ちる所）だけは、車の代わりに床のビーム
    for (let k = k0; k < k1; k += 2) {
      if (DIVE.has(k * 4)) vuun(bar(k) + 3 * B);                 // 「ヴゥゥ…ン」と落ちきる所で
      else car(bar(k), (k / 2) % 2 === 0, { v: hard ? 380 : 320, color: hard ? GOLD : PINK });
    }
    // ビューン（2小節目の4拍目）= ななめのビーム。トゥインの連打がある小節は出さない
    SC.byuun.filter(b => inBars(b, k0, k1) && b % 32 !== 31 && !(hard && Math.floor(b / 4) % 4 === 3)).forEach((b, i) => slam(beat(b), i % 2 === 0, { color: hard ? GOLD : CYAN }));
    SC.bell.filter(([b]) => inBars(b, k0, k1) && b % 8 >= 4.5).forEach(([b, m]) => bell(beat(b), px(m, 72, 94), { v: hard ? 290 : 250, color: hard ? (m >= 86 ? PINK : GOLD) : GOLD }));
    SC.clap.filter(b => inBars(b, k0, k1) && b % 8 >= 4 && b % 8 < 6).forEach((b, i) => clapFan(beat(b), i % 2 === 0, { n: hard ? 5 : 3, spread: hard ? 0.34 : 0.26, v: hard ? 320 : 290 }));
    SC.tuin.filter(b => inBars(b, k0, k1) && (b * 4) % 16 === 7 && b % 8 >= 4).forEach((b, i) => zap(beat(b), clampX(pX() + (i % 2 ? 70 : -70)), { warn: 0.65 }));
  }
  dropBars(16, 32, false);
  // 31小節: トゥインの連打 = 左から右へレーザー
  SC.tuin.filter(b => inBars(b, 31, 32) && b % 4 >= 2).forEach((b, i) => zap(beat(b), 140 + i * 170, { warn: 0.7, color: PINK }));

  // ===== 32〜40 SLOWED ｜ すべてがゆっくり。大きなカウベル ／ キック = ゆっくりの輪 ／ 声 = 大きなシャボン ======================
  hint(bar(32) + B, 'SLOWED ─ ぜんぶゆっくり');
  SC.bell.filter(([b]) => inBars(b, 32, 40)).forEach(([b, m]) => bell(beat(b), px(m, 60, 82), { v: 150, r: 11, color: VIOLET }));
  SC.kick.filter(b => inBars(b, 33, 39) && b % 4 === 0).forEach((b, i) => fire(beat(b), 0.7, delay => ring({ x: i % 2 ? 200 : W - 200, y: 140, count: 12, speed: 110, r: 9, delay, start: i * 0.13, color: CYAN })));
  SC.vox.filter(([b]) => inBars(b, 34, 40)).forEach(([b, , m, v], i) => i % 2 === 0 && voxBub(beat(b), px(m, 58, 78), v, { r: 14, fall: 110, amp: 60, freq: 2 }));
  // テープが止まる: 画面ぜんぶ、上からカーテン（すき間はまんなか）
  SC.stop.forEach(b => curtainRain(beat(b), CX, { gw: 170, v: 260 }));

  // ===== 40〜48 SOBE ｜ 808 の 8分 = 上から落ちる連なり（プレイヤーへ）／ 声 = シャボン ／ 46〜 連打 + ロックオン ================
  SC.bass.filter(([b]) => inBars(b, 40, 46) && b % 1 === 0).forEach(([b], i) => fire(beat(b), 0.45, delay => stream({ x: clampX(pX() + (i % 2 ? 60 : -60)), count: 3, gap: 30, vy: 300, r: 7, delay, color: VIOLET })));
  SC.vox.filter(([b]) => inBars(b, 40, 46)).forEach(([b, L, m, v]) => voxBub(beat(b), px(m, 64, 82), v, { fall: 180 }));
  SC.clap.filter(b => inBars(b, 42, 46)).forEach((b, i) => clapFan(beat(b), i % 2 === 0, { n: 3, v: 300 }));
  SC.byuun.filter(b => inBars(b, 40, 48)).forEach((b, i) => slam(beat(b), i % 2 === 1, { color: VIOLET }));
  hint(bar(46) - 2 * B, '連打 ─ すき間に入る');
  [[46, 440], [46.5, 570], [47, 430], [47.5, 560]].forEach(([k, gx]) => curtainRain(bar(k), gx, { v: 330, gw: 140 }));

  // ===== 48〜64 MANDELÃO ｜ 車が速い ／ カウベル2本 ／ クラップ5発 ／ キックの連打 = 噴き上げ ===================================
  dropBars(48, 64, true);
  SC.kick.filter(b => inBars(b, 48, 64) && (b * 4) % 16 === 13).forEach((b, i) => geyserAt(beat(b), { dx: i % 2 ? 50 : -50, n: 5 }));
  SC.tuin.filter(b => inBars(b, 63, 64) && b % 4 >= 2).forEach((b, i) => zap(beat(b), W - 120 - i * 115, { warn: 0.7, color: GOLD }));

  // ===== 64〜 FIM ｜ 最後の一発 → カウベルだけ ================================================================================
  fire(bar(64), 0.8, delay => ring({ x: CX, y: 160, count: 20, speed: 170, r: 8, delay, color: PINK }));
  vuun(bar(64) + 3 * B, { warn: 0.9 });
  SC.bell.filter(([b]) => inBars(b, 64, 66) && (b * 4) % 2 === 0).forEach(([b, m]) => bell(beat(b), px(m, 72, 92), { v: 180 }));

  return cues.sort((a, b) => a.t - b.t);
}

addSong({
  id: 'baile',
  title: 'NEON BAILE',
  meta: '130 BPM · 2:04 · オリジナル曲 · ブラジリアン・ファンク · ふつう〜むずかしい',
  file: 'NeonBaile.mp3',
  bpm: 130, beat: BL_BEAT, end: SCORE_BAILE.end - 0.3,
  beatTime: blBeatTime,
  beatPos: blBeatPos,
  speedAt: blSpeedAt,
  env: ENV_BAILE,
  sections: BL_SECTIONS,
  build: baileChart,
  theme: 'baile',                  // visuals-baile.js の見た目のセット
  titleLook: { sky: ['#0a0418', '#3a0a4a'], color: '#ff3ea5', tier: 2, pulse: 0.02, stars: 60 },
  titleBpm: 130,
  preview: 30.0,
  clearTitle: 'BAILE!',
  overTitle: 'ノックアウト…',
  clearText: '朝まで踊りきった！',
  bestKey: 'dodge_best_baile',
});
