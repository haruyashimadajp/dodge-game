"use strict";

/* =========================================================================
   曲⑯  怨撃（細江慎治）  —  拍・場面・譜面（弾幕）
   オンゲキ bright MEMORY（2022）の「Memories of O.N.G.E.K.I.」で出てくるボス曲。BPM 220、2:15。
   オンゲキで初めての「LUNATIC だけの曲」で、初めてのレベル15。弾をよけるのがとても難しい「弾幕曲」として有名。
   相手は あかニャン Lv.60（黒いネコの音ゲーキャラ。火の属性）。もう一度勝つと「怨撃・真」が出てきて、
   相手は金色で王冠をかぶった こんじきニャン Lv.1 になる。最後には「YOU ARE A SUPER SHOOTER!!」の文字が左右に流れる。

   この譜面は、原作の LUNATIC 譜面の「地帯」の並びを再現している（小節の番号は原作と同じ。1小節目 = 曲の頭）:
     3〜27   はじまり（ノーツが中心）          28〜29  ブレイク（WARNING）
     30〜36  誘導地帯 I（右はじへ → 左へ）      37〜44  誘導地帯 II（右 → 左 → ゆっくり右へ）
     45〜60  切り返し                           61〜68  鍵盤地帯（むずかしいノーツ）
     69〜76  イライラ棒地帯（くねくねのすき間）  77〜84  鍵盤地帯 II（ノーツだけ）
     85〜92  ボコボコにしてやるニャン地帯（ネコパンチ）
     93〜100 隕石地帯                           101〜108 いもむし地帯（ここで こんじきニャン に変身 =「怨撃・真」）
     109〜116 逆走地帯（弾が下から上へ）        117〜124 高速地帯（ラストスパート）
     125〜   YOU ARE A SUPER SHOOTER!!
   オンゲキの決まり: 弾はピンク（小）・紫（中）・オレンジ（大きい危険弾）。金色のベルはさわると取れる（当たりではない）。
   ノーツ（赤・緑・青の板）は判定ライン（床）に拍ぴったりで着く。
   音の解析: 1拍目 = 0.122秒、1小節 ≒ 1.09秒。songs/ongeki-score.js（キック・ハイハット・シンセの16分音符の位置）。
   見た目は visuals-ongeki.js（theme: 'ongeki'。オンゲキの奥へのびるレーンと、あかニャン）。
   ========================================================================= */

const OG_BEAT = 60 / 220, OG_T0 = 0.122;
function ogBeatTime(n) { return OG_T0 + n * OG_BEAT; }
function ogBeatPos(t)  { return (t - OG_T0) / OG_BEAT; }
const ogBar = k => ogBeatTime((k - 1) * 4);             // k 小節目の頭（原作の譜面と同じく 1 から数える）
const OG_CAT = { x: 400, y: 112 };                      // あかニャンのいる所（弾の出どころ）

const OG_SECTIONS = [
  { t: 0,          tier: 0, name: 'BATTLE START',  sub: 'あかニャン Lv.60 があらわれた',  sky: ['#12030a', '#2a0610'], color: '#ff5fb4', pulse: 0.004, stars: 0 },
  { t: ogBar(12),  tier: 1, name: '怨撃',          sub: '細江慎治 ─ 220 BPM ─ LUNATIC',  sky: ['#1a040c', '#3a0814'], color: '#ff5fb4', pulse: 0.012, stars: 0 },
  { t: ogBar(28),  tier: 1, name: 'WARNING',       sub: '弾幕が来る',                    sky: ['#2a0306', '#0a0003'], color: '#ff3b3b', pulse: 0.004, stars: 0 },
  { t: ogBar(30),  tier: 2, name: '誘導地帯 I',     sub: 'ベルの道をたどれ ─ まずは右はじへ', sky: ['#200410', '#46081c'], color: '#ff5fb4', pulse: 0.016, stars: 0 },
  { t: ogBar(37),  tier: 2, name: '誘導地帯 II',    sub: '紫の弾に気をつけて',             sky: ['#1a0420', '#3a0a46'], color: '#b36bff', pulse: 0.016, stars: 0 },
  { t: ogBar(45),  tier: 3, name: '切り返し',       sub: '右へ、左へ',                    sky: ['#240612', '#520e22'], color: '#ff6a9a', pulse: 0.018, stars: 0, sway: 0.4 },
  { t: ogBar(61),  tier: 3, name: '鍵盤地帯',       sub: 'ノーツが降ってくる',             sky: ['#08061e', '#1a1048'], color: '#6ad1ff', pulse: 0.016, stars: 0 },
  { t: ogBar(69),  tier: 3, name: 'イライラ棒地帯', sub: 'すき間からはみ出すな',            sky: ['#1e0418', '#44083a'], color: '#ff5fb4', pulse: 0.012, stars: 0 },
  { t: ogBar(77),  tier: 2, name: '鍵盤地帯 II',    sub: 'ノーツとホールドの壁',           sky: ['#06081e', '#121a48'], color: '#6ad1ff', pulse: 0.014, stars: 0 },
  { t: ogBar(85),  tier: 4, name: 'ボコボコにしてやるニャン地帯', sub: 'ネコパンチ',       sky: ['#2a0406', '#5a0a0e'], color: '#ff3b4f', pulse: 0.022, stars: 0, sway: 0.6 },
  { t: ogBar(93),  tier: 4, name: '隕石地帯',       sub: '床の「！」から離れろ',           sky: ['#2a0a02', '#5a1a04'], color: '#ff8a1f', pulse: 0.02,  stars: 0 },
  { t: ogBar(101), tier: 5, name: 'いもむし地帯',   sub: '怨撃・真 ─ こんじきニャン Lv.1',  sky: ['#1e1402', '#4a3204'], color: '#ffd23a', pulse: 0.02,  stars: 0 },
  { t: ogBar(109), tier: 5, name: '逆走地帯',       sub: '弾が下からのぼってくる',          sky: ['#1a0e02', '#3e2604'], color: '#ffb02e', pulse: 0.02,  stars: 0, sway: 0.5 },
  { t: ogBar(117), tier: 6, name: '高速地帯',       sub: 'ラストスパート',                 sky: ['#260806', '#5a1608'], color: '#ffd23a', pulse: 0.026, stars: 0, sway: 0.7 },
  { t: ogBar(125), tier: 0, name: '',               sub: '',                              sky: ['#120a02', '#2a1a04'], color: '#ffe9a0', pulse: 0.006, stars: 0 },
];

// 怨撃・真: 場面は同じで、相手と説明だけちがう
const OG_SECTIONS_SHIN = OG_SECTIONS.map((s, i) => ({ ...s,
  ...(i === 0 ? { sub: 'こんじきニャン Lv.1 ─ 画面をドラッグして移動！', sky: ['#1a1002', '#3a2606'], color: '#ffd23a' } : {}),
  ...(s.name === 'いもむし地帯' ? { sub: 'いもむしが両側から' } : {}) }));

// 弾の速さ: 1.0〜1.36倍（怨撃・真は 1.05〜1.47倍）
function ogSpeedAt(t) {
  let i = 0;
  while (i + 1 < OG_SECTIONS.length && OG_SECTIONS[i + 1].t <= t) i++;
  return 1.0 + 0.06 * OG_SECTIONS[i].tier;
}
function ogShinSpeedAt(t) { return 1.05 + 0.07 * ((ogSpeedAt(t) - 1) / 0.06); }

function ongekiChart(shin = false) {
  const cues = [];
  const burst = (t, fn) => cues.push({ t, fn });
  const B = OG_BEAT;
  const beat = ogBeatTime;
  const bar = ogBar;
  const bt = (k, i) => beat((k - 1) * 4 + i);              // k 小節目の i 拍目（0 から）
  const fire = (t, warn, fn) => burst(t - warn, () => fn(warn));
  const SC = SCORE_ONGEKI;
  const CX = OG_CAT.x, CY = OG_CAT.y;
  const PINK = '#ff5fb4', PURPLE = '#b36bff', ORANGE = '#ff8a1f', GOLD = '#ffd23a';
  const NOTE_C = ['#ff4d6d', '#5cff8a', '#4da6ff'];         // オンゲキの左手・右手のボタン: 赤・緑・青
  const PY = GROUND_Y - 10;                                  // プレイヤー（床に立っている）の高さ
  const hsh = (a, b = 0) => { const v = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return v - Math.floor(v); };
  const ogfx = (t, k, arg) => burst(t, () => { if (typeof ogFx === 'function') ogFx(k, arg); });
  const s16 = i => OG_T0 + i * B / 4;
  const pX = () => playerXY().x;
  const clampX = (x, m = 30) => Math.max(m, Math.min(W - m, x));
  ogStats.bells = 0; ogStats.got = 0; ogStats.total = 0;

  // ---- 部品 ----
  // ネコの口から撃つ（mouth）・左右の手から撃つ（hand: -1 / 1）
  const MOUTH = { x: CX, y: CY + 26 };
  const HAND = s => ({ x: CX + s * 96, y: CY + 14 });
  const shot = (t, o) => burst(t - (o.delay || 0), () => { ogShot({ ...o }); if (typeof ogFx === 'function') ogFx('fire', o.hand || 0); });
  const aimed = (t, { from = MOUTH, size = 's', v = 300, n = 1, spread = 0.22, warn = 0.25, accel = 1, hand = 0 } = {}) => {
    for (let i = 0; i < n; i++) shot(t, { x: from.x, y: from.y, v, size, aim: true, spread: (i - (n - 1) / 2) * spread, delay: warn, accel, hand });
  };
  // ベル（金色の鈴）: 時刻 t に高さ y（ふつうはプレイヤーの高さ）の x に来るように落とす
  const bell = (t, x, { vy = 280, y = PY } = {}) => {
    ogStats.total++;
    const y0 = -14, travel = (y - y0) / vy;
    burst(t - travel, () => ogBell({ x, y: y0, vy }));
  };
  // ノーツ（判定ラインに t ちょうどに着く）。lane = 0〜5（左手 赤緑青・右手 赤緑青）
  const LANE_X = l => 66 + l * 133.6;
  const note = (t, lane, o = {}) => { const n = ogNote(t, LANE_X(lane), { color: NOTE_C[lane % 3], ...o }); burst(n.at, n.go); };
  const wallNote = (t, side, hold) => { const n = ogNote(t, side < 0 ? 24 : W - 24, { w: 40, hold, color: side < 0 ? '#ff5fd2' : '#a05bff', wall: true }); burst(n.at, n.go); };
  // 横一列の弾（上から落ちて、時刻 t にプレイヤーの高さへ着く）。xs = 弾を置く x の列
  const row = (t, xs, { vy = 440, size = 's', color } = {}) => {
    const y0 = -10, travel = (PY - y0) / vy;
    burst(t - travel, () => { for (const x of xs) ogShot({ x, y: y0, v: vy, size, color, spd: 1 }); });
  };
  // 誘導の壁: 100px のレーン 8 本のうち、safe 以外のレーンに弾を 3 つずつ
  const laneRow = (t, safe, o) => { const xs = []; for (let l = 0; l < 8; l++) if (!safe.includes(l)) xs.push(l * 100 + 17, l * 100 + 50, l * 100 + 83); row(t, xs, o); };
  // すき間つきの列: gapX を中心に gapW だけあける
  const gapRow = (t, gapX, gapW, o = {}) => { const sp = o.sp || 34, xs = []; for (let x = sp / 2; x < W; x += sp) if (Math.abs(x - gapX) > gapW / 2) xs.push(x); row(t, xs, o); };
  // かべ（半分）: x0〜x1 をうめる
  const blockRow = (t, x0, x1, o = {}) => { const sp = o.sp || 30, xs = []; for (let x = x0 + sp / 2; x < x1; x += sp) xs.push(x); row(t, xs, o); };
  const ringFrom = (t, from, count, v, { size = 's', start = 0, warn = 0.3, accel = 1 } = {}) => burst(t - warn, () => {
    for (let i = 0; i < count; i++) ogShot({ x: from.x, y: from.y, a: start + i / count * TAU, v, size, delay: warn, accel });
    if (typeof ogFx === 'function') ogFx('fire', 0);
  });
  const L = new Map(SC.L.map(([i, v]) => [i, v]));
  const onsetsIn = (map, k0, k1, grid = 2, min = 0.8) => {     // k0〜k1 小節（k1 はふくまない）の、grid（16分の何個ぶん）ごとの強い音
    const out = [];
    for (let i = (k0 - 1) * 16; i < (k1 - 1) * 16; i += grid) {
      let v = 0; for (let j = 0; j < grid; j++) v = Math.max(v, map.get(i + j) || 0);
      if (v >= min) out.push(i);
    }
    return out;
  };

  const TAPS = [[1, 4], [0, 3], [2, 5], [1, 4], [0, 5], [2, 3], [1, 3], [2, 4]];
  if (shin) {                                                   // 怨撃・真（下の shinZones）
    shinZones();
    ogfx(bar(125) - 0.05, 'defeat');
    ogfx(bar(125) + 0.6, 'shooter');
    return cues.sort((a, b) => a.t - b.t);
  }

  // ===== 1〜11 小節 ｜ BATTLE START: あかニャンが降りてくる。ゆっくりのねらい撃ち ＋ ベル ======================
  ogfx(0.1, 'appear');
  for (let k = 3; k <= 11; k++) {
    aimed(bar(k), { n: 3, v: 210, spread: 0.3, warn: 0.35 });
    if (k % 2 === 1) for (let i = 0; i < 4; i++) bell(bt(k, 1 + i * 0.5), 120 + ((k * 3 + i) % 6) * 112, { vy: 230 });
  }
  ringFrom(bt(7, 2), MOUTH, 14, 150, { start: 0.1 });
  ringFrom(bt(10, 2), MOUTH, 16, 160, { start: 0.3 });
  aimed(bt(11, 2), { from: HAND(-1), n: 1, size: 'm', v: 260, hand: -1 });
  aimed(bt(11, 3), { from: HAND(1), n: 1, size: 'm', v: 260, hand: 1 });

  // ===== 12〜27 小節 ｜ ビートが入る: TAP ノーツ ＋ 2拍ごとのねらい撃ち ＋ ベルの列 ============================
  for (let k = 12; k <= 27; k++) {
    const pr = TAPS[k % 8], dense = k >= 20;
    note(bar(k), pr[0]);
    note(bt(k, 2), pr[1]);
    if (dense) { note(bt(k, 1), (pr[0] + 3) % 6); note(bt(k, 3), (pr[1] + 3) % 6); }
    aimed(bt(k, 1), { n: dense ? 3 : 1, v: dense ? 300 : 260, spread: 0.26 });
    if (dense && k % 2 === 0) aimed(bt(k, 3), { from: HAND(k % 4 ? 1 : -1), size: 'm', v: 280, hand: k % 4 ? 1 : -1 });
    if (k % 4 === 2) for (let i = 0; i < 6; i++) bell(bt(k, i * 0.5), LANE_X((k / 2 + i) % 6), { vy: 300 });
  }
  ringFrom(bar(20), MOUTH, 20, 190, { start: 0.15 });
  ringFrom(bt(27, 2), MOUTH, 24, 200, { start: 0 });

  // ===== 28〜29 小節 ｜ ブレイク: WARNING。大きい危険弾が 2 つ ＋ ベルのシャワー ===============================
  ogfx(bar(28), 'warning');
  aimed(bt(28, 2), { from: HAND(-1), size: 'l', v: 260, warn: 0.6, hand: -1 });
  aimed(bt(29, 0), { from: HAND(1), size: 'l', v: 260, warn: 0.6, hand: 1 });
  for (let i = 0; i < 8; i++) bell(bt(29, i * 0.5), 560 + (i % 4) * 60, { vy: 320 });     // 右へ誘う（次は右はじから）

  // ===== 30〜36 小節 ｜ 誘導地帯 I: 8 本のレーンのうち、あいたレーンだけが安全。まず右はじ → 少しずつ左へ ======
  // safe = その拍に、プレイヤーの高さへ着く列であいているレーン（0 = 左はし、7 = 右はし）
  const ROUTE1 = [
    [4, [2, 3, 4, 5, 6, 7]], [2, [4, 5, 6, 7]], [2, [5, 6, 7]], [4, [6, 7]], [4, [7]],
    [2, [5, 6, 7]], [2, [5]], [2, [3, 4, 5]], [2, [3]], [2, [1, 2, 3]], [2, [1]],
  ];
  {
    let j = 0;
    for (const [n, safe] of ROUTE1) {
      for (let q = 0; q < n * 2; q++) {                         // 8分音符ごとに 1 列
        const t = bt(30, j + q / 2);
        laneRow(t, safe, { vy: 440 });
        if (q % 2 === 0) bell(t, safe[Math.floor(safe.length / 2)] * 100 + 50, { vy: 440 });
      }
      j += n;
    }
  }

  // ===== 37〜44 小節 ｜ 誘導地帯 II: 1拍ごとの壁 ＋ 紫の強い弾（ねらい撃ち）。右 → 左 → ゆっくり右へ =========
  const ROUTE2 = [
    [4, [0, 1, 2, 3, 4, 5, 6]], [4, [4, 5, 6]], [4, [5, 6]], [4, [4, 5]],
    [4, [2, 3, 4]], [4, [1, 2]], [4, [2, 3, 4]], [4, [3, 4, 5]],
  ];
  {
    let j = 0;
    for (const [n, safe] of ROUTE2) {
      for (let q = 0; q < n; q++) {
        const t = bt(37, j + q);
        laneRow(t, safe, { vy: 400 });
        if (q % 2 === 1) bell(t, safe[Math.floor(safe.length / 2)] * 100 + 50, { vy: 400 });
      }
      j += n;
    }
    for (let i = 2; i < 32; i += 4) aimed(bt(37, i), { from: HAND(i % 8 === 2 ? -1 : 1), size: 'm', v: 300, warn: 0.3, hand: i % 8 === 2 ? -1 : 1 });
  }

  // ===== 45〜60 小節 ｜ 切り返し: 左半分のかべ（1拍目）と 右半分のかべ（3拍目）が交互に。境目が少しずつ動く ====
  // （半小節で動ける距離 ≒ 140px。境目は 1 小節に 30px まで動かす）
  const D = [400, 430, 460, 490, 460, 430, 400, 370, 340, 310, 340, 370, 400, 430, 400, 400];
  for (let k = 45; k <= 60; k++) {
    const d = D[k - 45];
    if (k === 53) { ringFrom(bar(53), MOUTH, 22, 210, { start: 0.12 }); continue; }
    blockRow(bt(k, 0), 0, d, { vy: 460 });                         // 1拍目: 左のかべ（境目 d より右へ）
    blockRow(bt(k, 2), d - 30, W, { vy: 460 });                    // 3拍目: 右のかべ（境目より 30px 左へ）
    bell(bt(k, 1), d + 60, { vy: 460 });
    bell(bt(k, 3), d - 150, { vy: 460 });
  }

  // ===== 61〜68 小節 ｜ 鍵盤地帯: シンセの音に合わせて TAP が階段のように降る ＋ 横はしの HOLD ================
  {
    const STAIR = [0, 1, 2, 3, 4, 5, 4, 3, 2, 1];
    let s = 0;
    for (const i of onsetsIn(L, 61, 69, 2, 0.75)) {
      note(s16(i), STAIR[s % STAIR.length], { v: 820 });
      s++;
    }
    for (let k = 61; k <= 68; k++) {
      aimed(bar(k), { size: 'm', v: 300, n: k >= 65 ? 2 : 1, spread: 0.5 });
      if (k >= 65) wallNote(bar(k), k % 2 ? -1 : 1, 2 * B);
    }
  }

  // ===== 69〜76 小節 ｜ イライラ棒地帯: 8分ごとに横一列。すき間（はば 104）がくねくね動く（裏拍で切り返す） ======
  {
    // すき間の中心の道すじ（拍 → x）。動きは 1 秒に 175px まで（プレイヤーは 260px）
    const P = [[0, 400], [4, 400], [5.5, 330], [7, 400], [8.5, 330], [10, 260], [11.5, 330], [13, 400], [14.5, 470], [16, 540],
               [17.5, 470], [19, 540], [20.5, 610], [22, 540], [23.5, 470], [25, 400], [26.5, 330], [28, 400], [30, 400], [32, 400]];
    const gapAt = j => { for (let i = 1; i < P.length; i++) if (j <= P[i][0]) { const [a, xa] = P[i - 1], [b2, xb] = P[i]; return xa + (xb - xa) * (j - a) / (b2 - a); } return 400; };
    for (let q = 0; q < 64; q++) {
      // 入り口: はじめの 1拍半は列なし → すき間が 700 から 104 まで 2 小節弱でせまくなる
      const j = q / 2, w = j < 1.5 ? 0 : j < 5 ? Math.max(104, 700 - (j - 1.5) * 170) : j >= 30 ? 104 + (j - 30) * 120 : 104;
      if (w) gapRow(bt(69, j), gapAt(j), w, { vy: 380, sp: 34 });
      if (q % 4 === 0) bell(bt(69, j), gapAt(j), { vy: 380 });
    }
  }

  // ===== 77〜84 小節 ｜ 鍵盤地帯 II: ノーツだけ（弾なし）。左右の WALL（ホールド）が場所をせばめる ===========
  {
    const PAIRS = [[0, 2], [3, 5], [1, 4], [0, 5], [2, 3], [1, 5], [0, 4], [2, 5]];
    for (let k = 77; k <= 84; k++) {
      for (let i = 0; i < 4; i++) {
        const p = PAIRS[(k * 4 + i) % 8];
        note(bt(k, i), p[i % 2], { v: 780 });
        if (i % 2 === 1) note(bt(k, i + 0.5), p[(i + 1) % 2], { v: 780 });
      }
      if (k % 2 === 1) { note(bar(k), k % 4 === 1 ? 1 : 4, { hold: 2 * B, v: 780 }); }
      wallNote(bar(k), k % 2 ? -1 : 1, 4 * B - 0.05);
      bell(bt(k, 1.5), 400 + (k % 2 ? 120 : -120), { vy: 300 });
      bell(bt(k, 3.5), 400 + (k % 2 ? -60 : 60), { vy: 300 });
    }
  }

  // ===== 85〜92 小節 ｜ ボコボコにしてやるニャン地帯: グローブが、予告の帯の上を一気に殴りにくる =====================
  ogfx(bar(84), 'nyan');
  for (let k = 85; k <= 92; k++) {
    for (const [i, s] of [[0, -1], [2, 1]]) {
      // 上から: グローブがプレイヤーのいた所の床を殴る（予告 0.6秒のあいだに横へ逃げる）
      fire(bt(k, i), 0.6, delay => {
        const h = HAND(s), x1 = clampX(pX(), 40);
        ogPunch({ x0: h.x, y0: h.y, x1, y1: GROUND_Y - 30, r: 30, delay, color: s < 0 ? '#ff3b4f' : '#ff7a3b' });
        if (typeof ogFx === 'function') ogFx('punch', s);
      });
    }
    if (k % 2 === 0) {                                          // 横から: 床すれすれのパンチ（跳びこえる）
      const s = k % 4 === 0 ? -1 : 1;
      fire(bt(k, 3), 0.7, delay => ogPunch({ x0: s < 0 ? -40 : W + 40, y0: GROUND_Y - 24, x1: s < 0 ? W + 60 : -60, y1: GROUND_Y - 24, r: 24, v: 2200, delay, back: false, color: '#ffb02e' }));
    }
    aimed(bt(k, 1), { n: 2, v: 280, spread: 0.6 });
    bell(bt(k, 3), 120 + (k % 4) * 180, { vy: 300 });
  }
  // 92 小節の 3拍目: 両手で同時に。青い HOLD の所（まん中）だけが安全
  fire(bt(92, 2), 0.7, delay => {
    for (const s of [-1, 1]) ogPunch({ x0: HAND(s).x, y0: HAND(s).y, x1: s < 0 ? 170 : W - 170, y1: GROUND_Y - 30, r: 34, delay, color: '#ff3b4f' });
    if (typeof ogFx === 'function') ogFx('punch', 0);
  });

  // ===== 93〜100 小節 ｜ 隕石地帯: 床の「！」の所へ火の玉が落ちて、はじける ===================================
  for (let k = 93; k <= 100; k++) {
    for (const i of [0, 2]) {
      fire(bt(k, i) - 0.5, 0.75, delay => {
        const tx = clampX(pX() + (k <= 95 ? 40 : 0), 50), x0 = clampX(tx + (hsh(k, i) - 0.5) * 500, 40);
        ogMeteor({ x0, tx, delay, fall: 1100 + 40 * (k - 93) });
      });
    }
    if (k % 2 === 0) aimed(bt(k, 1), { from: HAND(k % 4 ? 1 : -1), size: 'm', v: 300, hand: k % 4 ? 1 : -1 });
    for (let i = 0; i < 2; i++) bell(bt(k, 1 + i * 2), 80 + hsh(k, i + 7) * 640, { vy: 280 });
  }

  // ===== 101〜108 小節 ｜ 怨撃・真: こんじきニャンに変身 → いもむし地帯 ======================================
  ogfx(bar(101), 'awaken');
  const RAIN = [400, 260, 400, 540, 400, 260, 400];   // すき間の場所（小節ごと）
  for (let k = 102; k <= 108; k++) {
    const s = k % 2 ? 1 : -1;
    fire(bar(k), 0.6, delay => ogWorm({ x: s < 0 ? 150 : W - 150, dir: s < 0 ? 1 : -1, delay, n: 5, gap: 12, amp: 90, crawl: 380, color: k >= 105 ? GOLD : PINK }));
    if (k === 105 || k === 107) fire(bt(k, 2), 0.6, delay => ogWorm({ x: CX + s * 60, dir: s, delay, n: 5, gap: 12, amp: 120, freq: 0.9, crawl: 380, color: PURPLE }));
    // ピンクの雨（すき間つき。1小節に1列）
    const g1 = RAIN[k - 102];
    gapRow(bt(k, 1), g1, 240, { vy: 300, sp: 44 });
    bell(bt(k, 1), g1, { vy: 300 });
  }
  ringFrom(bt(101, 2), MOUTH, 30, 170, { start: 0.1, size: 's' });

  // ===== 109〜116 小節 ｜ 逆走地帯: 床の下から弾がのぼってくる（予告 = 床から上への光の帯） ========================
  for (let k = 109; k <= 116; k++) {
    for (let i = 0; i < 4; i++) {
      // プレイヤーのいる所 ＋ 左右 120px の所からのぼる（1拍ごと）
      fire(bt(k, i), 0.55, delay => {
        const x = clampX(pX(), 30);
        ogRise({ x, v: 560, size: i % 2 ? 's' : 'm', delay });
        if (k >= 113) for (const dx of [-150, 150]) if (x + dx > 20 && x + dx < W - 20) ogRise({ x: x + dx, v: 520, size: 's', delay });
      });
    }
    // ななめにのぼる列（左下 → 右上 / 右下 → 左上）
    if (k % 2 === 1) for (let i = 0; i < 6; i++) fire(bt(k, 1.5) + i * B / 4, 0.5, delay => ogRise({ x: k % 4 === 1 ? 40 + i * 30 : W - 40 - i * 30, a: k % 4 === 1 ? -Math.PI / 2 + 0.55 : -Math.PI / 2 - 0.55, v: 600, size: 's', delay }));
    aimed(bt(k, 2), { n: 3, v: 300, spread: 0.32 });
    bell(bt(k, 0.5), 400 + (k % 2 ? 200 : -200), { vy: 300 });
  }

  // ===== 117〜124 小節 ｜ 高速地帯: 速い雨（すき間つき）＋ 速いねらい撃ち ＋ 小節ごとの輪 =========================
  {
    const G = [400, 300, 200, 300, 450, 600, 500, 400];
    for (let k = 117; k <= 124; k++) {
      const g0 = G[k - 117], g1 = G[(k - 116) % 8];
      for (let q = 0; q < 8; q++) {
        const j = q / 2, gx = g0 + (g1 - g0) * (q / 8);
        if (q % 2 === 0 && !(k === 117 && q === 0)) gapRow(bt(k, j), gx, k === 117 && q === 2 ? 420 : 170, { vy: 640, sp: 40 });   // 入り口は広め
      }
      aimed(bt(k, 1), { from: HAND(-1), size: 'm', v: 420, hand: -1 });
      aimed(bt(k, 3), { from: HAND(1), size: 'm', v: 420, hand: 1 });
      if (k % 2 === 0) ringFrom(bt(k, 2), MOUTH, 18, 260, { start: k * 0.17 });
      bell(bt(k, 2), g0 + (g1 - g0) * 0.5, { vy: 640 });
    }
    aimed(bt(124, 2), { size: 'l', v: 360, n: 3, spread: 0.45, warn: 0.4 });
  }

  // ===== 125〜 ｜ WIN: あかニャンをたおした → YOU ARE A SUPER SHOOTER!! =====================================
  ogfx(bar(125) - 0.05, 'defeat');
  ogfx(bar(125) + 0.6, 'shooter');

  return cues.sort((a, b) => a.t - b.t);

  /* ========================================================================================================
     怨撃・真（別の譜面）: 操作はドラッグ移動（指 / マウスを動かしたぶんだけ、一瞬で動ける）。
     そのぶん弾の密度を原作に近づけた。すき間が1拍で遠くへ飛ぶ所もある（ドラッグでさっと動かす）。
     ======================================================================================================== */
  function shinZones() {
    const rnd = (a, b) => hsh(a, b);
    const gapX = (a, b) => 110 + rnd(a, b) * 580;                 // すき間の場所（110〜690）

    // ===== 1〜11 小節 ｜ こんじきニャン、はじめから本気 ======================================================
    ogfx(0.1, 'appear');
    for (let k = 3; k <= 11; k++) {
      aimed(bar(k), { n: 5, v: 250, spread: 0.24, warn: 0.35 });
      aimed(bt(k, 2), { n: 3, v: 280, spread: 0.3 });
      if (k % 2 === 1) for (let i = 0; i < 4; i++) bell(bt(k, 1 + i * 0.5), 120 + ((k * 3 + i) % 6) * 112, { vy: 230 });
    }
    for (const [k, i, n] of [[5, 2, 18], [7, 2, 22], [9, 2, 24], [10, 2, 26], [11, 0, 28]]) ringFrom(bt(k, i), MOUTH, n, 170, { start: k * 0.13 });

    // ===== 12〜27 小節 ｜ ノーツ ＋ 毎拍のねらい撃ち ＋ 手からの紫 ＋ 2小節ごとの輪 ============================
    for (let k = 12; k <= 27; k++) {
      const pr = TAPS[k % 8];
      note(bar(k), pr[0]); note(bt(k, 2), pr[1]);
      note(bt(k, 1), (pr[0] + 3) % 6); note(bt(k, 3), (pr[1] + 3) % 6);
      if (k >= 20) { note(bt(k, 1.5), (pr[0] + 1) % 6); note(bt(k, 3.5), (pr[1] + 2) % 6); }
      for (let i = 0; i < 4; i++) aimed(bt(k, i), { n: 3, v: 340, spread: 0.2 });
      aimed(bt(k, 2), { from: HAND(k % 2 ? 1 : -1), size: 'm', v: 300, n: 2, spread: 0.35, hand: k % 2 ? 1 : -1 });
      if (k % 2 === 0) ringFrom(bt(k, 0), MOUTH, 24, 210, { start: k * 0.21 });
      if (k % 4 === 2) for (let i = 0; i < 6; i++) bell(bt(k, i * 0.5), LANE_X((k / 2 + i) % 6), { vy: 300 });
    }

    // ===== 28〜29 小節 ｜ WARNING: 危険弾の扇 ＋ 輪 ========================================================
    ogfx(bar(28), 'warning');
    aimed(bt(28, 2), { from: HAND(-1), size: 'l', n: 3, spread: 0.5, v: 280, warn: 0.6, hand: -1 });
    aimed(bt(29, 0), { from: HAND(1), size: 'l', n: 3, spread: 0.5, v: 280, warn: 0.6, hand: 1 });
    ringFrom(bt(29, 2), MOUTH, 32, 190, { start: 0.05 });
    for (let i = 0; i < 8; i++) bell(bt(29, i * 0.5), 560 + (i % 4) * 60, { vy: 320 });

    // ===== 30〜44 小節 ｜ 誘導地帯: あいているのは 1 本のレーンだけ。2拍ごとに遠くのレーンへ飛ぶ ================
    // （飛ぶときの 1 列は、前のレーンから次のレーンまでが全部あいている）
    const routeZone = (k0, lanes, vy) => {
      lanes.forEach((ln, si) => {
        for (let q = 0; q < 4; q++) {
          const t = bt(k0, si * 2 + q / 2);
          const lo = Math.min(lanes[Math.max(0, si - 1)], ln), hi = Math.max(lanes[Math.max(0, si - 1)], ln);
          const safe = q <= 1 ? Array.from({ length: hi - lo + 1 }, (_, m) => lo + m) : [ln];   // 飛ぶ列: あいだのレーンも全部あく
          laneRow(t, safe, { vy });
          if (q === 1) bell(t, ln * 100 + 50, { vy });
        }
      });
    };
    routeZone(30, [7, 7, 4, 1, 3, 6, 3, 0, 2, 5, 7, 4, 1, 3], 440);          // 1回に飛ぶのは 3 レーン（300px）まで
    routeZone(37, [3, 6, 3, 0, 2, 5, 2, 5, 7, 4, 1, 4, 6, 3, 0, 2], 460);
    for (let j = 2; j < 56; j += 2) aimed(bt(30, j), { from: HAND(j % 4 ? 1 : -1), size: 'm', v: 330, hand: j % 4 ? 1 : -1 });

    // ===== 45〜60 小節 ｜ 切り返し: 毎拍、左右のかべが交互に（境目はばらばら）＋ 4拍目はすき間の列 =================
    for (let k = 45; k <= 60; k++) {
      for (let i = 0; i < 4; i++) {
        const t = bt(k, i), d = 330 + rnd(k, i) * 140;             // 1拍で動くのは最大 250px くらい
        if (k === 45 && i === 0) continue;                         // 入り口（誘導地帯の最後は左寄り）
        if (i === 3) gapRow(t, 250 + rnd(k, 9) * 300, 130, { vy: 470, sp: 32 });
        else if ((k * 4 + i) % 2 === 0) blockRow(t, 0, d, { vy: 470 });
        else blockRow(t, d, W, { vy: 470 });
      }
      if (k % 2 === 0) aimed(bt(k, 1), { n: 3, v: 340, spread: 0.18 });
      bell(bt(k, 1), (k * 4 + 1) % 2 === 0 ? 760 : 40, { vy: 470 });
    }

    // ===== 61〜68 小節 ｜ 鍵盤地帯: 16分のシンセ全部に TAP。キックで 2 つ同時。手から紫 ==========================
    {
      let last = -1, s = 0;
      for (const i of onsetsIn(L, 61, 69, 1, 0.7)) {
        let ln = Math.floor(rnd(i, 3) * 6); if (ln === last) ln = (ln + 3) % 6;
        note(s16(i), ln, { v: 860 }); last = ln; s++;
        if (i % 8 === 0) note(s16(i), (ln + 2 + (s % 3)) % 6, { v: 860 });
      }
      for (let k = 61; k <= 68; k++) {
        for (const i of [1, 3]) aimed(bt(k, i), { from: HAND(i === 1 ? -1 : 1), size: 'm', v: 340, hand: i === 1 ? -1 : 1 });
        wallNote(bar(k), k % 2 ? -1 : 1, 2 * B);
      }
    }

    // ===== 69〜76 小節 ｜ イライラ棒地帯: すき間 84px が、1拍ごとに 50〜120px 動く（となりの列のすき間は必ず重なる） ========================================
    {
      const pts = [400];
      for (let j = 1; j <= 33; j++) pts.push(Math.max(110, Math.min(690, pts[j - 1] + (rnd(j, 69) < 0.5 ? -1 : 1) * (50 + rnd(j, 70) * 70))));
      const at = j => { const a = Math.floor(j), f = j - a; return pts[a] + (pts[a + 1] - pts[a]) * f; };
      for (let q = 0; q < 64; q++) {
        const j = q / 2, w = j < 1.5 ? 0 : j < 4 ? Math.max(84, 600 - (j - 1.5) * 210) : 84;
        if (w) gapRow(bt(69, j), at(j), w, { vy: 400, sp: 30 });
        if (q % 4 === 1) bell(bt(69, j), at(j), { vy: 400 });
      }
    }

    // ===== 77〜84 小節 ｜ 鍵盤地帯 II: 8分のノーツ ＋ WALL ＋ ねらい撃ち =================================================
    {
      const PAIRS = [[0, 2], [3, 5], [1, 4], [0, 5], [2, 3], [1, 5], [0, 4], [2, 5]];
      for (let k = 77; k <= 84; k++) {
        for (let q = 0; q < 8; q++) {
          const p = PAIRS[(k * 8 + q) % 8];
          note(bt(k, q / 2), p[q % 2], { v: 800 });
        }
        if (k % 2 === 1) note(bar(k), k % 4 === 1 ? 1 : 4, { hold: 2 * B, v: 800 });
        wallNote(bar(k), -1, 4 * B - 0.05); wallNote(bar(k), 1, 4 * B - 0.05);
        aimed(bt(k, 1), { n: 3, v: 320, spread: 0.2 });
        aimed(bt(k, 3), { n: 3, v: 320, spread: 0.2 });
        bell(bt(k, 1.5), 400 + (k % 2 ? 120 : -120), { vy: 300 });
      }
    }

    // ===== 85〜92 小節 ｜ ボコボコにしてやるニャン地帯: 毎拍のパンチ ＋ 毎小節の横パンチ ＋ ねらい撃ち =================
    ogfx(bar(84), 'nyan');
    for (let k = 85; k <= 92; k++) {
      for (let i = 0; i < 4; i++) {
        if (k === 92 && i >= 2) break;
        const s = i % 2 ? 1 : -1;
        fire(bt(k, i), 0.55, delay => {
          const h = HAND(s);
          ogPunch({ x0: h.x, y0: h.y, x1: clampX(pX(), 40), y1: GROUND_Y - 30, r: 30, delay, v: 2000, color: s < 0 ? '#ff3b4f' : '#ff7a3b' });
          if (typeof ogFx === 'function') ogFx('punch', s);
        });
      }
      const s = k % 2 ? -1 : 1;
      if (k < 92) fire(bt(k, 3), 0.7, delay => ogPunch({ x0: s < 0 ? -40 : W + 40, y0: GROUND_Y - 24, x1: s < 0 ? W + 60 : -60, y1: GROUND_Y - 24, r: 24, v: 2200, delay, back: false, color: '#ffb02e' }));
      aimed(bt(k, 1), { n: 3, v: 320, spread: 0.45 });
      aimed(bt(k, 3), { n: 3, v: 320, spread: 0.45 });
      bell(bt(k, 3), 120 + (k % 4) * 180, { vy: 300 });
    }
    fire(bt(92, 2), 0.7, delay => {
      for (const s of [-1, 1]) ogPunch({ x0: HAND(s).x, y0: HAND(s).y, x1: s < 0 ? 170 : W - 170, y1: GROUND_Y - 30, r: 34, delay, color: '#ff3b4f' });
      if (typeof ogFx === 'function') ogFx('punch', 0);
    });

    // ===== 93〜100 小節 ｜ 隕石地帯: 毎拍の隕石（小さい弾 9 つ）＋ 手からの紫 =========================================
    for (let k = 93; k <= 100; k++) {
      for (let i = 0; i < 4; i++) {
        fire(bt(k, i) - 0.5, 0.7, delay => {
          const tx = clampX(pX(), 50), x0 = clampX(tx + (rnd(k, i) - 0.5) * 600, 40);
          ogMeteor({ x0, tx, delay, fall: 1200 + 40 * (k - 93), shards: 9 });
        });
      }
      aimed(bt(k, 1), { from: HAND(-1), size: 'm', v: 320, hand: -1 });
      aimed(bt(k, 3), { from: HAND(1), size: 'm', v: 320, hand: 1 });
      for (let i = 0; i < 2; i++) bell(bt(k, 1 + i * 2), 80 + rnd(k, i + 7) * 640, { vy: 280 });
    }

    // ===== 101〜108 小節 ｜ いもむし地帯: 両側からいもむし ＋ 2拍ごとのすき間の雨 ＋ 輪 ===============================
    ringFrom(bt(101, 0), MOUTH, 36, 180, { start: 0.1 });
    ringFrom(bt(101, 2), MOUTH, 36, 200, { start: 0.19 });
    for (let k = 102; k <= 108; k++) {
      for (const s of [-1, 1]) fire(bar(k) + (s > 0 ? 2 * B : 0), 0.6, delay => ogWorm({ x: s < 0 ? 150 : W - 150, dir: s < 0 ? 1 : -1, delay, n: 5, gap: 12, amp: 100, crawl: 400, color: s < 0 ? GOLD : PURPLE }));
      for (const i of [1, 3]) gapRow(bt(k, i), gapX(k, i), 200, { vy: 320, sp: 40 });
      aimed(bt(k, 0), { n: 3, v: 300, spread: 0.3 });
      bell(bt(k, 1), gapX(k, 1), { vy: 320 });
    }

    // ===== 109〜116 小節 ｜ 逆走地帯: 毎拍、自分の足もと ＋ 3 か所から上へ。ななめの列は毎小節 ==========================
    for (let k = 109; k <= 116; k++) {
      for (let i = 0; i < 4; i++) {
        fire(bt(k, i), 0.5, delay => {
          const x = clampX(pX(), 30);
          ogRise({ x, v: 600, size: i % 2 ? 's' : 'm', delay });
          for (let m = 0; m < 3; m++) { const xx = 40 + rnd(k * 4 + i, m) * 720; if (Math.abs(xx - x) > 60) ogRise({ x: xx, v: 560, size: 's', delay }); }
        });
      }
      for (let i = 0; i < 6; i++) fire(bt(k, 1.5) + i * B / 4, 0.5, delay => ogRise({ x: k % 2 ? 40 + i * 30 : W - 40 - i * 30, a: k % 2 ? -Math.PI / 2 + 0.55 : -Math.PI / 2 - 0.55, v: 640, size: 's', delay }));
      aimed(bt(k, 2), { n: 5, v: 320, spread: 0.22 });
      bell(bt(k, 0.5), 400 + (k % 2 ? 200 : -200), { vy: 300 });
    }

    // ===== 117〜124 小節 ｜ 高速地帯: 8分ごとの速い列（すき間 120px が1拍ごとに飛ぶ）＋ ねらい撃ち ＋ 輪 ================
    for (let k = 117; k <= 124; k++) {
      for (let q = 0; q < 8; q++) {
        if (k === 117 && q < 2) continue;                              // 入り口
        const t = bt(k, q / 2), g = gapX(k, Math.floor(q / 2));
        if (q % 2 === 0 && !(k === 117 && q === 2)) { const gp = gapX(q === 0 ? k - 1 : k, q === 0 ? 3 : q / 2 - 1); const xs = []; for (let x = 20; x < W; x += 40) if (Math.abs(x - g) > 60 && Math.abs(x - gp) > 60) xs.push(x); row(t, xs, { vy: 680 }); }
        else gapRow(t, g, 120, { vy: 680, sp: 40 });
      }
      for (let i = 0; i < 4; i++) aimed(bt(k, i + 0.5), { from: HAND(i % 2 ? 1 : -1), size: 'm', v: 440, hand: i % 2 ? 1 : -1 });
      ringFrom(bt(k, 2), MOUTH, 24, 270, { start: k * 0.17 });
      bell(bt(k, 1), gapX(k, 1), { vy: 680 });
    }
    aimed(bt(124, 2), { size: 'l', v: 380, n: 5, spread: 0.35, warn: 0.4 });
  }
}

addSong({
  id: 'ongeki',
  title: '怨撃',
  meta: 'BPM 220 · 2:15 · 細江慎治 · オンゲキ bright MEMORY · LUNATIC',
  file: 'Ongeki.mp3',
  bpm: 220, beat: OG_BEAT, end: 137.6,
  beatTime: ogBeatTime,
  beatPos: ogBeatPos,
  speedAt: ogSpeedAt,
  env: ENV_ONGEKI,                 // 曲の音量データ（songs/ongeki-env.js）
  sections: OG_SECTIONS,
  build: ongekiChart,
  theme: 'ongeki',                 // visuals-ongeki.js（オンゲキのレーンと あかニャン）
  titleLook: { sky: ['#1a040c', '#3a0814'], color: '#ff5fb4', tier: 1, pulse: 0.012, stars: 0 },
  titleBpm: 220,
  get clearTitle() { return hitsTaken === 0 ? 'WIN ─ NO DAMAGE' : 'WIN'; },
  get clearText() { return ogStats.total && ogStats.got >= ogStats.total ? `FULL BELL!  YOU ARE A SUPER SHOOTER!!` : `BELL ${ogStats.got} / ${ogStats.total}  ─  YOU ARE A SUPER SHOOTER!!`; },
  overTitle: 'LOSE',
  preview: 31.7,                   // タイトルで流す試聴の開始秒（ブレイクのあとの弾幕の入り）
  bestKey: 'dodge_best_ongeki',
});

// 怨撃・真（原作で 怨撃 に勝つと出てくる、もう 1 つの譜面）。相手は こんじきニャン Lv.1。
// 操作は原作のレバーのように、画面をドラッグして左右に動く（dragMove。game.js の「ドラッグ移動」）。弾の密度は原作に近い。
addSong({
  id: 'ongeki-shin',
  variantOf: 'ongeki',
  variant: '怨撃・真',
  title: '怨撃・真',
  meta: 'BPM 220 · 2:15 · 細江慎治 · オンゲキ · ドラッグで移動 · 鬼むずかしい',
  file: 'Ongeki.mp3',
  bpm: 220, beat: OG_BEAT, end: 137.6,
  beatTime: ogBeatTime,
  beatPos: ogBeatPos,
  speedAt: ogShinSpeedAt,
  env: ENV_ONGEKI,
  sections: OG_SECTIONS_SHIN,
  build: () => ongekiChart(true),
  theme: 'ongeki',
  shin: true,                      // visuals-ongeki.js: はじめから こんじきニャン
  dragMove: true,                  // 左右はドラッグで動く（ジャンプはいつもどおり）
  titleLook: { sky: ['#1a1002', '#3a2606'], color: '#ffd23a', tier: 1, pulse: 0.012, stars: 0 },
  titleBpm: 220,
  get clearTitle() { return hitsTaken === 0 ? 'WIN ─ NO DAMAGE' : 'WIN'; },
  get clearText() { return ogStats.total && ogStats.got >= ogStats.total ? `FULL BELL!  YOU ARE A SUPER SHOOTER!!` : `BELL ${ogStats.got} / ${ogStats.total}  ─  YOU ARE A SUPER SHOOTER!!`; },
  overTitle: 'LOSE',
  preview: 31.7,
  bestKey: 'dodge_best_ongeki_shin',
});
