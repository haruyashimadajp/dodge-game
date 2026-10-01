"use strict";

/* =========================================================================
   曲③  モラトリウム（オリジナル曲）  —  拍・場面・譜面（弾幕）
   「猶予（モラトリアム）」＋「〜ium（場所）」= 時間が止まったままの場所。
   夕暮れの時計塔で、止まった時計がまた動き出すまでの2分間。

   曲は songs/moratorium-compose.py（Python）で作曲・合成した。
   音符や太鼓の時刻は songs/moratorium-score.js に書き出してあるので、
   弾は「実際に鳴っている音」とぴったりそろう（旋律の音符が、鳴る瞬間に地面へ落ちる）。

   この曲だけの仕掛け:
     timeStop(秒) … 時間停止。弾がすべてその場で止まる（止まった弾にも当たる）
     rewind()     … 巻き戻し。まっすぐ飛ぶ弾がいっせいに来た道を戻る
     pendulum     … 振り子。いちばん下では地面すれすれ → 跳び越える
     clockHand    … 時計の針のビーム。1拍ごとにカチッと進む（次の位置がうすく見える）
     noteDrop     … 音符の雨。旋律の音が、鳴る瞬間に地面へ落ちてくる
   ========================================================================= */

// ---- 拍のきざみ ------------------------------------------------------------
// 150 BPM: 1拍 = 0.4秒、1小節 = 1.6秒。0拍目 = 0.5秒（曲の頭の0.5秒は無音）。
const MORA_BEAT = 0.4;
function moraBeatTime(n) { return 0.5 + n * MORA_BEAT; }
function moraBeatPos(t)  { return (t - 0.5) / MORA_BEAT; }

/* ---- 場面（セクション）------------------------------------------------------
   曲を作ったときの区切りそのまま（小節: 0 イントロ / 4 ねじ巻き / 12 Aメロ / 20 Aメロ後半 /
   28 サビ前 / 36 サビ / 52 間奏（時間停止）/ 60 最後のサビ（半音上がる）/ 76 アウトロ）
   tier = 盛り上がりの段階 0〜5（弾の速さ・太陽の明るさ・歯車の速さ・光の粒）
   -------------------------------------------------------------------------- */
const MORA_SECTIONS = [
  { t: 0,     tier: 0,   name: 'TICK TOCK',  sub: '止まった時計',           sky: ['#241a44', '#b8645a'], color: '#ffd9a0', pulse: 0.003, sway: 0.2, stars: 6 },
  { t: 6.9,   tier: 1,   name: 'WIND-UP',    sub: 'ねじを巻く',             sky: ['#2b1f4c', '#cf7258'], color: '#ffc27a', pulse: 0.006, sway: 0.3, stars: 10, zoom: [1, 1.03] },
  { t: 19.7,  tier: 2,   name: 'SANDGLASS',  sub: 'Aメロ ─ 砂時計',          sky: ['#311f4e', '#dd7f5c'], color: '#ffcf70', pulse: 0.009, sway: 0.4, stars: 12 },
  { t: 32.5,  tier: 2.5, name: 'PENDULUM',   sub: 'Aメロ ─ 振り子',          sky: ['#371e51', '#e5845e'], color: '#ff9f6b', pulse: 0.011, sway: 0.5, stars: 14 },
  { t: 45.3,  tier: 3,   name: 'COUNTDOWN',  sub: 'サビ前 ─ 時計の針',       sky: ['#3f1c55', '#ec885d'], color: '#ff8fb0', pulse: 0.014, sway: 0.6, stars: 18, zoom: [1, 1.035] },
  { t: 58.1,  tier: 4,   name: 'CHIME',      sub: 'サビ ─ 鐘の音符',         sky: ['#481a58', '#f3985c'], color: '#ffd166', pulse: 0.022, sway: 0.9, stars: 30 },
  { t: 83.7,  tier: 0,   name: 'MORATORIUM', sub: '時間停止',               sky: ['#1b1c3a', '#5d5f8a'], color: '#bcd0ff', pulse: 0,     sway: 0.15, stars: 4 },
  { t: 93.3,  tier: 1.5, name: '',           sub: '',                       sky: ['#2c1f4e', '#b86a62'], color: '#ffc27a', pulse: 0.01,  sway: 0.3, stars: 10, zoom: [1, 1.05] },
  { t: 96.5,  tier: 5,   name: 'ETERNITY',   sub: '最後のサビ ─ 動き出す時', sky: ['#52175a', '#ffa45e'], color: '#ff7aa8', pulse: 0.028, sway: 1.2, stars: 50 },
  { t: 122.1, tier: 1,   name: 'DAWN',       sub: '夜明け',                 sky: ['#3a3a6c', '#ffcf96'], color: '#fff1c4', pulse: 0.006, sway: 0.3, stars: 6 },
];

// 弾の速さ: 盛り上がりに合わせて 0.85倍（静か）〜 1.4倍（最後のサビ）
function moraSpeedAt(t) {
  let i = 0;
  while (i + 1 < MORA_SECTIONS.length && MORA_SECTIONS[i + 1].t <= t) i++;
  return 0.85 + 0.11 * MORA_SECTIONS[i].tier;
}

/* ---- 譜面 -------------------------------------------------------------------
   時刻は「拍」で書いている（beat(n) = n拍目の秒数、bar(k) = k小節目の頭）。
     0〜 12小節  イントロ   オルゴールの音で時計から玉 → 振り子が現れる → 鐘のリング
    12〜 20      砂時計     上から砂がこぼれ続ける（落ちる場所がゆっくり左右に動く）
    20〜 28      振り子     大きな振り子 ＋ 旋律の音符が落ちてくる
    28〜 36      時計の針   針のビームが1拍ごとにカチッと回る。最後の1拍だけ時間が止まる
    36〜 52      サビ       音符の雨 ＋ 小節ごとのリング ＋ 4小節ごとに巻き戻し
    52〜 60      間奏       曲が止まる音と同時に「時間停止」→ 2小節後に動き出す → 巻き戻し
    60〜 76      最後のサビ 2本の針 ＋ 速い音符の雨 ＋ 巻き戻し
    76〜 80      アウトロ   最後の鐘
   -------------------------------------------------------------------------- */
function moratoriumChart() {
  const cues = [];
  const burst = (t, fn) => cues.push({ t, fn });
  const beat = moraBeatTime;
  const bar = k => beat(k * 4);
  const fire = (t, warn, fn) => burst(t - warn, () => fn(warn));
  const SC = SCORE_MORATORIUM;
  const CX = W / 2, CY = 270;                         // 大きな時計の中心（visuals-dusk.js と同じ）
  const GOLD = '#ffd27a', AMBER = '#ff9f6b', ROSE = '#ff7aa8', CREAM = '#fff1d6', VIOLET = '#c9b6ff', SKY = '#bcd0ff';
  const WARM = [GOLD, AMBER, ROSE, VIOLET];
  const inRange = (list, b0, b1) => list.filter(n => n[0] >= b0 && n[0] < b1);

  // 音の高さ → 横の位置（低い音ほど左、高い音ほど右）
  const pitchX = m => 60 + (W - 120) * Math.max(0, Math.min(1, (m - 62) / 22));
  // 旋律の音符が、鳴る瞬間にちょうど地面に着くように落とす
  const notes = (list, v, colorOf) => list.forEach(([b, , m], i) => {
    const d = noteDrop(beat(b), pitchX(m), v, { color: colorOf(b, i) });
    burst(d.at, d.go);
  });
  // 時計の中心から、角度 a・速さ v で撃つ
  const fromClock = (delay, a, v, r = 7, color = GOLD) =>
    spawn({ x: CX + Math.cos(a) * 30, y: CY + Math.sin(a) * 30, vx: Math.cos(a) * v, vy: Math.sin(a) * v, r, delay, color });
  // 鐘のリング: 時計から小さな時計（大きい弾）が円に広がる
  const chime = (t, { n = 14, v = 160, r = 11, color = CREAM, start = 0 } = {}) =>
    fire(t, 0.5, delay => ring({ x: CX, y: CY, count: n, speed: v, r, start, delay, color }));
  const hit = (t, amount = 0.5) => burst(t, () => { flash(amount); punch(0.02 * amount); });
  // 上のすみからの狙い撃ち
  const corner = (t, left, v = 210, color = AMBER) =>
    fire(t, 0.4, delay => { const x = left ? 30 : W - 30, a = aimVel(x, 30, v); spawn({ x, y: 30, vx: a.vx, vy: a.vy, r: 8, delay, color }); });

  // ===== TICK TOCK 0〜4小節 ｜ オルゴールの音ごとに、時計から玉がひとつ ============
  inRange(SC.box, 0, 16).forEach(([b, m]) =>
    fire(beat(b), 0.3, delay => fromClock(delay, Math.PI / 2 + (m - 74) * 0.09, 110, 7, CREAM)));

  // ===== WIND-UP 4〜12小節 ｜ キックで狙い撃ち・振り子が現れる・鐘のリング ===========
  SC.kick.filter(b => b >= 16 && b < 40).forEach((b, i) => corner(beat(b), i % 2 === 0, 200));
  fire(bar(6), 1.2, delay => pendulum({ px: CX, py: 110, amp: 0.7, beats: 4, life: 6 * 4 * MORA_BEAT - 0.4, delay, color: GOLD }));
  SC.snare.filter(b => b >= 44 && b < 48).forEach((b, i) =>      // スネアの連打: 時計からぐるっと
    fire(beat(b), 0.3, delay => fromClock(delay, -Math.PI / 2 + i * 0.55, 150 + i * 6, 7, AMBER)));
  hit(bar(12), 0.6);
  chime(bar(12), { n: 16 });

  // ===== SANDGLASS 12〜20小節 ｜ 砂時計: 砂がこぼれ続ける ＋ スネアで狙い撃ち ==========
  for (let b = 48; b < 80; b += 0.5) {
    const x = CX + Math.sin(Math.PI * (b - 48) / 8) * 300;          // 2小節で左右を往復
    burst(beat(b), () => spawn({ x: x + rand(-14, 14), y: -6, vy: rand(230, 290), vx: rand(-15, 15), r: 4.5, color: '#fff6dc' }));
  }
  SC.snare.filter(b => b >= 48 && b < 80 && b % 2 === 1).forEach(b =>
    fire(beat(b), 0.35, delay => { const v = aimVel(CX, CY, 230); spawn({ x: CX, y: CY, vx: v.vx, vy: v.vy, r: 8, delay, color: AMBER }); }));

  // ===== PENDULUM 20〜28小節 ｜ 大きな振り子 ＋ 旋律の音符 ============================
  fire(bar(20), 1.2, delay => pendulum({ px: CX, py: 100, amp: 0.8, beats: 4, life: 8 * 4 * MORA_BEAT - 0.3, r: 22, delay, color: AMBER }));
  notes(SC.verse, 380, (b, i) => WARM[i % 4]);
  for (let k = 20; k < 28; k += 2) { corner(bar(k + 0.5), true); corner(bar(k + 1.5), false); }

  // ===== COUNTDOWN 28〜36小節 ｜ 時計の針 ＋ 音符 ＋ 最後の1拍だけ時間が止まる =========
  fire(bar(28), 1.0, delay => clockHand({ cx: CX, cy: CY, len: 430, a0: -Math.PI / 2, step: Math.PI / 12, life: 7.5 * 4 * MORA_BEAT, delay, color: ROSE }));
  fire(bar(32), 1.0, delay => clockHand({ cx: CX, cy: CY, len: 300, a0: -Math.PI / 2, step: -Math.PI / 8, life: 3.5 * 4 * MORA_BEAT, width: 10, delay, color: VIOLET }));
  notes(SC.pre, 400, (b, i) => (i % 2 ? ROSE : GOLD));
  SC.snare.filter(b => b >= 136 && b < 144).forEach((b, i) =>     // サビ前の連打: 時計からうず
    fire(beat(b), 0.3, delay => fromClock(delay, i * 0.62, 170 + i * 5, 7, ROSE)));
  burst(beat(143), () => timeStop(MORA_BEAT * 0.95));               // 「ため」の1拍: 時間が止まる

  // ===== CHIME 36〜52小節 ｜ 音符の雨 ＋ 小節ごとのリング ＋ 巻き戻し ==================
  notes(SC.chorus, 440, b => WARM[Math.floor(b / 4) % 4]);
  for (let k = 36; k < 52; k++) {
    if (k % 4 === 0) { chime(bar(k), { n: 14, v: 165, color: CREAM, start: k * 0.2 }); hit(bar(k), 0.7); }
    else fire(bar(k), 0.4, delay => ring({ x: CX, y: CY, count: 10, speed: 140, r: 7, start: k * 0.37, delay, color: WARM[k % 4] }));
  }
  for (const k of [39, 43, 47]) burst(bar(k + 0.5), () => rewind());   // 4小節ごとの「巻き戻し」
  fire(beat(206), 0.4, delay => ring({ x: CX, y: CY, count: 24, speed: 210, r: 8, delay, color: CREAM }));

  // ===== MORATORIUM 52〜60小節 ｜ 曲が止まる → 時間停止 → 動き出す → 巻き戻し =========
  burst(bar(52), () => { timeStop(2 * 4 * MORA_BEAT); flash(0.5); });   // 2小節のあいだ、すべてが止まる
  hit(bar(54), 0.6);                                                  // 時は動き出す
  inRange(SC.box, 216, 232).forEach(([b, m]) =>
    fire(beat(b), 0.3, delay => fromClock(delay, Math.PI / 2 + (m - 76) * 0.09, 130, 7, SKY)));
  SC.kick.filter(b => b >= 232 && b < 240).forEach((b, i) => corner(beat(b), i % 2 === 0, 230, ROSE));
  SC.snare.filter(b => b >= 236 && b < 240).forEach((b, i) =>
    fire(beat(b), 0.25, delay => fromClock(delay, i * 0.4, 200, 7, CREAM)));
  burst(beat(238), () => rewind());                                    // 巻き戻しの音と同時に

  // ===== ETERNITY 60〜76小節 ｜ 最後のサビ。2本の針 ＋ 速い音符の雨 ＋ 巻き戻し =======
  fire(bar(60), 1.0, delay => clockHand({ cx: CX, cy: CY, len: 430, a0: -Math.PI / 2, step: Math.PI / 16, life: 15.5 * 4 * MORA_BEAT, delay, color: ROSE }));
  fire(bar(64), 1.0, delay => clockHand({ cx: CX, cy: CY, len: 330, a0: Math.PI / 2, step: -Math.PI / 12, life: 11.5 * 4 * MORA_BEAT, width: 10, delay, color: VIOLET }));
  notes(SC.final, 480, b => WARM[Math.floor(b / 4) % 4]);
  for (let k = 60; k < 76; k++) {
    if (k % 4 === 0) { chime(bar(k), { n: 16, v: 175, color: CREAM, start: k * 0.2 }); hit(bar(k), 0.8); }
    else fire(bar(k), 0.4, delay => ring({ x: CX, y: CY, count: 10, speed: 150, r: 7, start: k * 0.37, delay, color: WARM[k % 4] }));
  }
  for (const k of [63, 67, 71]) burst(bar(k + 0.5), () => rewind());

  // ===== DAWN 76〜80小節 ｜ 最後の鐘 → オルゴール ======================================
  hit(bar(76), 1);
  chime(bar(76), { n: 24, v: 150, r: 11, color: CREAM });
  burst(bar(76), () => { shake(14); punch(0.06); });
  inRange(SC.box, 304, 320).forEach(([b, m]) =>
    fire(beat(b), 0.3, delay => fromClock(delay, Math.PI / 2 + (m - 76) * 0.09, 100, 7, CREAM)));

  return cues.sort((a, b) => a.t - b.t);
}

addSong({
  id: 'moratorium',
  title: 'モラトリウム',
  meta: '150 BPM · 2:08 · オリジナル曲',
  file: 'Moratorium.mp3',
  bpm: 150, beat: MORA_BEAT, end: 128.6,
  beatTime: moraBeatTime,
  beatPos: moraBeatPos,
  speedAt: moraSpeedAt,
  env: ENV_MORATORIUM,             // 曲の音量データ（songs/moratorium-env.js）
  sections: MORA_SECTIONS,
  build: moratoriumChart,
  theme: 'dusk',                   // visuals-dusk.js の見た目のセット
  titleLook: { sky: ['#2b1f4c', '#cf7258'], color: '#ffc27a', tier: 2, pulse: 0.006, stars: 8 },
  titleBpm: 75,                    // タイトル画面はゆったり刻む
  preview: 58.1,                   // 試聴はサビから
  clearText: '止まっていた時計が、また動き出した。',
  bestKey: 'dodge_best_moratorium',
});
