"use strict";

/* =========================================================================
   曲⑥  ExtremeEX（オリジナル曲）  —  拍・場面・譜面
   いちばん難しい曲。200 BPM のハードコア。主役は「ヴイーン」と1オクターブ下から
   しゃくり上がって鳴るシンセ（songs/extremeex-compose.py の vwoon）。
   これまでの5曲の仕掛けを、ほぼ全部まぜて出してくる「ボスラッシュ」。
     光線（X・ファイアウォール・スキャナー）… 曲②
     時計の針・振り子・時間停止・巻き戻し    … 曲③
     ガラスの板・ひび・鍵盤ブロック          … 曲④
     傾き・コンベア・穴・電気の壁・トゲ車・反転 … 曲⑤
   ========================================================================= */

// 200 BPM: 1拍 = 0.3秒、1小節 = 1.2秒。0拍目 = 0.5秒
const EX_BEAT = 0.3;
function exBeatTime(n) { return 0.5 + n * EX_BEAT; }
function exBeatPos(t)  { return (t - 0.5) / EX_BEAT; }

/* 小節: 0 警告 / 8 A / 24 ため / 32 1回目のドロップ / 48 ブレイク（重い）/ 56 ため（さかさま）/
   64 EXドロップ（半音上がる）/ 88 最後（反転）/ 96 おわり */
const EX_SECTIONS = [
  { t: 0,      tier: 1,   name: 'WARNING',    sub: 'これより先、最高難度',          sky: ['#0a0000', '#2a0006'], color: '#ff2a3a', pulse: 0.012, sway: 0.3, stars: 10 },
  { t: 10.05,  tier: 2.5, name: 'EXTREME',    sub: 'ヴイーン',                     sky: ['#100004', '#3a000c'], color: '#ff3b5c', pulse: 0.018, sway: 0.5, stars: 20 },
  { t: 29.25,  tier: 3,   name: 'CHARGE',     sub: 'ため ─ せまる壁',              sky: ['#120008', '#40001a'], color: '#ffd23f', pulse: 0.02,  sway: 0.6, stars: 24, zoom: [1, 1.05] },
  { t: 38.85,  tier: 4.5, name: 'EX DRIVE',   sub: '1回目のドロップ',              sky: ['#18000a', '#55001c'], color: '#ff2a3a', pulse: 0.03,  sway: 0.9, stars: 40 },
  { t: 58.05,  tier: 3,   name: 'OVERLOAD',   sub: 'ブレイク ─ 重低音',            sky: ['#0c0010', '#2c0040'], color: '#c86bff', pulse: 0.026, sway: 0.4, stars: 18 },
  { t: 67.65,  tier: 3.5, name: 'REVERSAL',   sub: 'ため ─ さかさま',              sky: ['#10000c', '#3a0030'], color: '#ff6bd5', pulse: 0.02,  sway: 0.5, stars: 24, zoom: [1, 1.06] },
  { t: 77.25,  tier: 5,   name: 'EXTREME EX', sub: 'EXドロップ ─ すべての仕掛け',   sky: ['#1a0004', '#6a0010'], color: '#ff1f3d', pulse: 0.034, sway: 1.1, stars: 60 },
  { t: 106.05, tier: 5,   name: 'LIMIT BREAK', sub: '最後 ─ 左右反転',             sky: ['#200006', '#80001a'], color: '#ffffff', pulse: 0.036, sway: 1.2, stars: 70 },
  { t: 115.65, tier: 0.5, name: 'CLEAR?',     sub: '',                            sky: ['#05000a', '#1a0020'], color: '#ffd23f', pulse: 0.004, sway: 0.1, stars: 8 },
];

// 弾の速さ: 1.2倍（イントロ）〜 1.7倍（EXドロップ）
function exSpeedAt(t) {
  let i = 0;
  while (i + 1 < EX_SECTIONS.length && EX_SECTIONS[i + 1].t <= t) i++;
  return 1.1 + 0.12 * EX_SECTIONS[i].tier;
}

function extremeChart() {
  const cues = [];
  const burst = (t, fn) => cues.push({ t, fn });
  const B = EX_BEAT;
  const beat = exBeatTime;
  const bar = k => beat(k * 4);
  const fire = (t, warn, fn) => burst(t - warn, () => fn(warn));
  const SC = SCORE_EXTREMEEX;
  const CX = W / 2;
  const RED = '#ff2a3a', WHITE = '#ffffff', GOLD = '#ffd23f', VIOLET = '#c86bff', PINK = '#ff6bd5';
  const inRange = (list, b0, b1) => list.filter(n => n[0] >= b0 && n[0] < b1);

  // ---- 小道具 ----
  const hit = (t, a = 0.6) => burst(t, () => { flash(a); shake(8); punch(0.03); });
  const corner = (t, left, v = 300, color = RED, r = 8) => fire(t, 0.35, delay => {
    const x = left ? 24 : W - 24, a = aimVel(x, 24, v); spawn({ x, y: 24, vx: a.vx, vy: a.vy, r, delay, color });
  });
  const fanFrom = (t, x, y, n, spread, v, color = WHITE, warn = 0.35) => fire(t, warn, delay => {
    const p = playerXY(), base = Math.atan2(p.y - y, p.x - x);
    for (let j = 0; j < n; j++) { const a = base + (j - (n - 1) / 2) * spread; spawn({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, r: 7, delay, color }); }
  });
  const ringAt = (t, x, y, n, v, color = RED, r = 7, start = 0, warn = 0.4) => fire(t, warn, delay => ring({ x, y, count: n, speed: v, r, start, delay, color }));
  const xAt = (t, warn = 0.9) => fire(t, warn, delay => { const p = playerXY(); xStrike({ x: p.x, y: p.y, delay, hold: 0.25, color: RED }); });
  const xFixed = (t, x, y, warn = 0.9) => fire(t, warn, delay => xStrike({ x, y, delay, hold: 0.25, color: VIOLET }));
  const px = (m, lo, hi) => 50 + (W - 100) * Math.max(0, Math.min(1, (m - lo) / (hi - lo)));
  const keys = (list, v, lo, hi, colorOf) => list.forEach(([b, len, m], i) => {
    const d = keyDrop(beat(b), px(m, lo, hi), len * B, v, { color: colorOf(b, i), w: 36 });
    burst(d.at, d.go);
  });
  const tilt = (t, a, beats = 1) => {
    burst(t - B * 2, () => { if (a) stageHint(a > 0 ? '▶ ▶ ▶' : '◀ ◀ ◀', B * 3); });
    burst(t, () => stageTo({ tilt: a }, beats * B, 'snap'));
  };
  const belt = (t, v) => { burst(t - B * 2, () => { if (v) stageHint((v > 0 ? '▶ ▶ ▶' : '◀ ◀ ◀') + ' BELT', B * 3); }); burst(t, () => stageTo({ conveyor: v }, B)); };
  const holeAtPlayer = (t, { w = 120, len = 6 * B, warn = 5 * B } = {}) => burst(t - warn, () => {
    const p = playerXY();
    floorHole({ x: Math.max(stage.wl, Math.min(stage.wr - w, p.x - w / 2)), w, open: t, close: t + len, warn });
    const plat = platformUnderPlayer();
    if (plat) dropPlatform(plat, { open: t, close: t + len, warn });
  });
  const roll = (t, v = 160, color = GOLD) => fire(t, 0.7, delay => {
    const d = Math.sign(stage.tilt) || (Math.random() < 0.5 ? 1 : -1);
    roller({ x: d > 0 ? stage.wl + 19 : stage.wr - 19, vx: d * v, delay, color });
  });
  const pist = (t, w = 70) => fire(t, 0.7, delay => piston({ x: playerXY().x, w, delay, color: GOLD }));
  const zap = (t, w = 300) => fire(t, 0.8, delay => { const p = playerXY(); zapFloor({ x: Math.max(0, Math.min(W - w, p.x - w / 2)), w, delay, color: RED }); });
  const shock = (t, on, beats = 4) => burst(t - (on ? beats * B : 0), () => stageTo({ shock: on ? 1 : 0 }, on ? beats * B : 0.01, 'linear'));

  // ===== WARNING 0〜8小節 ｜ ヴイーンのたびに中心からリング ／ キックで両すみから =========
  for (let k = 0; k < 8; k += 2) { ringAt(bar(k), CX, 260, 14 + k * 2, 170 + k * 10, RED, 8, k * 0.2); hit(bar(k), 0.4); }
  SC.kick.filter(b => b < 32 && b % 4 !== 0).forEach((b, i) => corner(beat(b), i % 2 === 0, 260, WHITE, 7));
  xAt(bar(4)); xAt(bar(6)); xAt(bar(7) + 2 * B);

  // ===== EXTREME 8〜24小節 ｜ ヴイーンの刻み = すみから狙い撃ち ／ ファイアウォール ／ 時計の針 =
  hit(bar(8), 1);
  SC.stab.filter(([b]) => b >= 32 && b < 96).forEach(([b], i) => corner(beat(b), i % 2 === 0, 320, i % 5 === 0 ? GOLD : RED, 8));
  for (const k of [10, 14, 18, 22]) fire(bar(k), 1.0, delay => firewall({ gapX: rand(140, W - 140), gapW: 120, steps: 6, step: 1, delay, color: VIOLET }));
  fire(bar(16), 1.0, delay => clockHand({ cx: CX, cy: 120, len: 520, a0: 0.3, step: Math.PI / 9, life: 8 * 4 * B - 0.3, width: 12, delay, color: PINK }));
  for (let k = 9; k < 24; k += 2) ringAt(bar(k), CX, 120, 12, 210, WHITE, 6, k * 0.3);
  for (let k = 8; k < 24; k++) fanFrom(bar(k) + 2 * B, CX, 120, 3, 0.2, 300, GOLD);             // 3拍目: 上から3方向
  for (const k of [12, 16, 20]) xAt(bar(k) + 3 * B, 0.8);

  // ===== CHARGE 24〜32小節 ｜ スネア連打 = 中心からのうず ／ 壁がせまる ／ 最後に時間停止 =======
  SC.snare.filter(b => b >= 96 && b < 128).forEach((b, i) =>
    fire(beat(b), 0.3, delay => { for (const o of [0, Math.PI]) { const a = i * 0.45 + o; spawn({ x: CX, y: 240, vx: Math.cos(a) * (180 + i), vy: Math.sin(a) * (180 + i), r: 7, delay, color: i % 2 ? GOLD : RED }); } }));
  shock(bar(26), true, 4);
  for (let k = 28; k < 32; k++) burst(bar(k), () => stageTo({ wl: 55 * (k - 27), wr: W - 55 * (k - 27) }, B, 'snap'));
  for (const k of [29, 30, 31]) pist(bar(k) + 2 * B, 60);
  burst(beat(127), () => timeStop(B * 0.95));
  burst(bar(32), () => stageTo({ wl: 0, wr: W }, B, 'snap'));

  // ===== EX DRIVE 32〜48小節 ｜ 旋律 = 鍵盤ブロック ／ 拍ごとに狙い撃ち ／ 傾き ／ 振り子 ／ ひび ===
  hit(bar(32), 1);
  keys(SC.drop1, 720, 74, 90, (b, i) => (i % 2 ? RED : WHITE));
  SC.kick.filter(b => b >= 128 && b < 192).forEach((b, i) => corner(beat(b), i % 2 === 0, 340, i % 4 === 3 ? GOLD : RED, 8));
  for (let k = 32; k < 48; k += 2) fanFrom(bar(k) + 3 * B, k % 4 ? 30 : W - 30, 30, 5, 0.14, 330, WHITE);
  for (const k of [36, 44]) xAt(bar(k) + 2 * B, 0.8);
  for (let k = 32; k < 48; k++) ringAt(bar(k), CX, 140, 14, 220 + (k - 32) * 4, k % 2 ? GOLD : WHITE, 7, k * 0.37);
  [[34, 0.24], [38, -0.24], [42, 0.28], [46, -0.28]].forEach(([k, a]) => tilt(bar(k), a));
  fire(bar(40), 1.0, delay => pendulum({ px: CX, py: 90, amp: 0.9, beats: 4, life: 8 * 4 * B - 0.3, r: 22, delay, color: GOLD }));
  for (let k = 33; k < 48; k += 2) fire(bar(k) + 2 * B, 0.7, delay => {
    const left = k % 4 === 1, y = rand(200, GROUND_Y - 60), p = playerXY();
    crack({ x: left ? 0 : W, y, arms: 2, a0: Math.atan2(p.y - y, p.x - (left ? 0 : W)), spread: 0.5, len: 600, speed: 1300, delay, color: WHITE });
  });
  burst(bar(48), () => stageTo({ tilt: 0 }, B));

  // ===== OVERLOAD 48〜56小節 ｜ 重い2拍目 = 自機狙いの X ／ トゲ車 ／ 穴 ／ 床の電気 ==============
  hit(bar(48), 0.8);
  for (let k = 48; k < 56; k++) {
    xAt(bar(k) + 2 * B, 0.8);
    roll(bar(k), 170, k % 2 ? VIOLET : GOLD);
    if (k % 2) xFixed(bar(k) + 3 * B, k % 4 === 1 ? 200 : W - 200, GROUND_Y - 120);
  }
  for (const k of [49, 51, 53, 55]) holeAtPlayer(bar(k));
  for (const k of [50, 54]) zap(bar(k) + 3.5 * B);

  // ===== REVERSAL 56〜64小節 ｜ 画面がさかさま ＋ うず ＋ 最後にガラスが割れる =================
  burst(bar(56), () => { stageHint('↻ UPSIDE DOWN', B * 4); stageTo({ spin: Math.PI }, 2 * B); });
  for (let b = 224; b < 252; b += 1) fire(beat(b), 0.3, delay => {
    const i = b - 224, a = i * 0.5;
    for (const o of [0, TAU / 3, 2 * TAU / 3]) spawn({ x: CX, y: 220, vx: Math.cos(a + o) * 190, vy: Math.sin(a + o) * 190, r: 7, delay, color: PINK });
  });
  for (const k of [57, 59, 61]) holeAtPlayer(bar(k) + 2 * B, { w: 110, len: 4 * B });
  burst(bar(62), () => stageTo({ spin: 0 }, 2 * B));
  burst(bar(64) - 1.6, () => pane({ x: CX, y: 220, w: 720, h: 300, hx: playerXY().x, hy: 300, n: 50, speed: 340, size: 1.4, color: WHITE, at: bar(64) }));

  // ===== EXTREME EX 64〜88小節 ｜ すべて: 鍵盤 ＋ 傾き ＋ コンベア ＋ 穴 ＋ 針 ＋ 巻き戻し ＋ ビーム =====
  hit(bar(64), 1);
  shock(bar(64), true, 2);
  keys(SC.drop2, 780, 75, 93, (b, i) => (i % 2 ? RED : GOLD));
  [[66, 0.26, 0], [68, -0.26, 70], [70, 0.22, -70], [72, -0.28, 0], [74, 0.28, -60], [76, -0.24, 80], [78, 0.26, 0], [80, -0.26, -70],
   [82, 0.22, 80], [84, -0.28, 0], [86, 0, 0]].forEach(([k, a, v]) => { tilt(bar(k), a); belt(bar(k), v); });
  SC.snare.filter(b => b >= 256 && b < 352).forEach((b, i) => fanFrom(beat(b), i % 2 === 0 ? 24 : W - 24, 24, 3, 0.16, 370, i % 3 ? RED : WHITE, 0.3));
  for (let k = 66; k < 88; k += 4) xAt(bar(k) + 2 * B, 0.8);
  for (let k = 65; k < 88; k += 2) holeAtPlayer(bar(k) + 2 * B, { w: 120, len: 5 * B });
  for (let k = 64; k < 88; k += 2) roll(bar(k) + B, 150);
  fire(bar(72), 1.0, delay => clockHand({ cx: CX, cy: 110, len: 560, a0: Math.PI * 0.15, step: Math.PI / 10, life: 8 * 4 * B - 0.3, width: 12, delay, color: VIOLET }));
  fire(bar(80), 1.0, delay => clockHand({ cx: CX, cy: 110, len: 560, a0: Math.PI * 0.85, step: -Math.PI / 10, life: 8 * 4 * B - 0.3, width: 12, delay, color: PINK }));
  for (let k = 64; k < 88; k++) if (k % 2 === 0) ringAt(bar(k), CX, 110, 16, 240, k % 4 ? WHITE : GOLD, 7, k * 0.29);
  for (const k of [67, 71, 75, 79, 83, 87]) burst(bar(k) + 2 * B, () => rewind());
  for (const k of [69, 77, 85]) fire(bar(k), 0.9, delay => scanner({ fromLeft: k % 2 === 1, y1: GROUND_Y - 46, y2: GROUND_Y, speed: 520, delay, color: GOLD }));

  // ===== LIMIT BREAK 88〜96小節 ｜ 1小節ごとに左右反転 ＋ 半拍ごとの狙い撃ち ＋ ピストン ==========
  hit(bar(88), 1);
  burst(bar(88), () => stageTo({ tilt: 0, conveyor: 0 }, B));
  for (let k = 88; k < 96; k++) {
    burst(bar(k), () => stageTo({ mirror: k % 2 ? 1 : -1 }, B * 0.6));
    for (let h = 0; h < 8; h++) corner(bar(k) + h * B * 0.5, h % 2 === 0, 330, h % 2 ? WHITE : RED, 7);
    pist(bar(k) + 3 * B, 70);
  }
  inRange(SC.final, 352, 384).forEach(([b, len, m], i) => { const d = keyDrop(beat(b), px(m, 75, 93), len * B, 800, { color: GOLD, w: 40 }); burst(d.at, d.go); });

  // ===== おわり 96〜 ｜ 最後のドーン ===========================================================
  burst(bar(96), () => stageTo({ mirror: 1, tilt: 0, conveyor: 0, spin: 0, wl: 0, wr: W }, B));
  shock(bar(96), false);
  hit(bar(96), 1);
  ringAt(bar(96), CX, 260, 48, 260, WHITE, 8);
  ringAt(bar(96), CX, 260, 24, 170, RED, 12, 0.13);

  return cues.sort((a, b) => a.t - b.t);
}

addSong({
  id: 'extremeex',
  title: 'ExtremeEX',
  meta: '200 BPM · 1:58 · オリジナル曲 · 最高難度',
  file: 'ExtremeEX.mp3',
  bpm: 200, beat: EX_BEAT, end: 117.5,
  beatTime: exBeatTime,
  beatPos: exBeatPos,
  speedAt: exSpeedAt,
  env: ENV_EXTREMEEX,
  sections: EX_SECTIONS,
  build: extremeChart,
  theme: 'ex',                     // visuals-ex.js の見た目のセット
  titleLook: { sky: ['#100004', '#3a000c'], color: '#ff2a3a', tier: 3, pulse: 0.014, stars: 16 },
  titleBpm: 100,
  preview: 38.9,
  clearText: '限界突破。あなたはEXをこえた。',
  bestKey: 'dodge_best_extremeex',
});
