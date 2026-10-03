"use strict";

/* =========================================================================
   曲①  the EmpErroR（sasakure.UK）  —  拍・場面・譜面（弾幕）  ※リメイク版
   maimai FiNALE の「PANDORA BOXXX」6曲目（maimai ORANGE を表す曲）。BPM 240（この譜面は半分の 120 で数える）。
   タイトルは Emperor（皇帝）と Error（エラー）をかけた言葉。曲の中で、sasakure.UK の昔の曲を引用している:
     0:03 と 0:43「麒麟」／ 0:28「神威」／ 0:42「Jack-the-Ripper◆」／ 0:43「ガラクタドールプレイ」／ 2:00「ガラテアの螺旋」
   リメイクでは、画面のまん中に maimai のまるい画面（8 つのボタンと判定の輪）を置き、弾を maimai のノートにした
   （TAP / EACH / BREAK / スライドの☆ / TOUCH）。引用の場所には、その曲にちなんだ弾幕が出る。
   見た目は visuals-emperror.js（theme: 'emperror'）。
   ========================================================================= */

// ---- 拍のきざみ ------------------------------------------------------------
// 120 BPM: 1拍 = 0.5秒、最初の小節の頭 = 0.865秒。106秒あたりで拍が
// 約0.12秒前にずれるので、そこで基準を切りかえている。
function emperrorBeatTime(n) { return (n <= 210 ? 0.865 : 0.75) + n * 0.5; }   // n拍目の時刻
function emperrorBeatPos(t) {                                                 // t秒は何拍目か（小数）
  if (t <= 105.865) return (t - 0.865) / 0.5;
  if (t < 106.25) return 210 + (t - 105.865) / 0.385;
  return (t - 0.75) / 0.5;
}

/* ---- 場面（セクション）ごとの見た目 -----------------------------------
   曲の場面が変わると、画面の色・背景の図形・カメラの動きが切りかわり、
   上に場面の名前（バナー）が出ます。visuals.js がこの表を読んで描きます。
     t      … 始まる時刻（秒）            name / sub … バナーの文字
     sky    … 空の色 [上, 下]             color      … 弾と光の色
     shape  … 背景で回る図形の角の数（0 で無し）
     pulse  … 拍ごとのズーム（0.01 = 1%）  sway … 画面がゆっくり傾く角度（度）
     zoom   … [始め, 終わり] だんだんズーム  beams … 光の柱   stars … 星の流れる速さ
   -------------------------------------------------------------------------- */
const EMPERROR_SECTIONS = [
  { t: 0,       name: 'PANDORA BOXXX', sub: 'Phase 6 ─ maimai ORANGE',     sky: ['#140a06', '#050304'], color: '#ff8c1a', pulse: 0.004, stars: 0 },
  { t: 8.865,   name: 'TAP',           sub: 'まんなかから 8 つのボタンへ',      sky: ['#2a1206', '#0a0503'], color: '#ff5fa2', pulse: 0.010, stars: 0 },
  { t: 16.865,  name: 'EACH',          sub: '2 つ同時',                     sky: ['#2b1a05', '#0b0703'], color: '#ffd84d', pulse: 0.010, stars: 0 },
  { t: 24.865,  name: 'SLIDE',         sub: '☆ が道すじを走る',              sky: ['#071a2b', '#03070d'], color: '#4fd6ff', pulse: 0.008, stars: 0 },
  { t: 32.865,  name: 'TOUCH',         sub: 'ふれた所がはじける',              sky: ['#160b2b', '#06040c'], color: '#b388ff', pulse: 0.010, stars: 0 },
  { t: 40.865,  name: 'the EmpErroR',  sub: 'サビ ─ ◆ と ガラクタの人形',      sky: ['#3a0710', '#100205'], color: '#ff3b5c', pulse: 0.020, stars: 0, beams: true },
  { t: 48.865,  name: 'BREAK',         sub: 'サビ ─ 赤 → 紫',                sky: ['#2a0838', '#0b0310'], color: '#c04dff', pulse: 0.018, stars: 0, beams: true, sway: 0.6 },
  { t: 56.865,  name: 'CRITICAL',      sub: 'サビ ─ 赤 → 白',                sky: ['#3a0a0a', '#100303'], color: '#ffffff', pulse: 0.018, stars: 0, beams: true },
  { t: 63.8,    name: '',              sub: '',                             sky: ['#000000', '#000000'], color: '#666666', pulse: 0,     stars: 0 },
  { t: 65.865,  name: 'FATAL ERROR',   sub: 'こわれた画面',                   sky: ['#1a0303', '#050000'], color: '#ff2a2a', pulse: 0.012, stars: 0 },
  { t: 72.865,  name: 'SYSTEM HALT',   sub: 'すき間を探せ',                   sky: ['#160606', '#050101'], color: '#ff6a3d', pulse: 0.010, stars: 0 },
  { t: 80.865,  name: 'REBOOT',        sub: '再起動',                         sky: ['#1f1206', '#070402'], color: '#ffb21a', pulse: 0.012, stars: 0, zoom: [1, 1.025] },
  { t: 88.865,  name: 'OVERCLOCK',     sub: 'TOUCH の花火',                   sky: ['#2a1606', '#0a0502'], color: '#ff8c1a', pulse: 0.014, stars: 0, zoom: [1.025, 1.06] },
  { t: 96.865,  name: 'EMPEROR',       sub: 'サビ 2 ─ 王冠',                  sky: ['#3a1a03', '#120701'], color: '#ffd84d', pulse: 0.022, stars: 0, beams: true, sway: 1.2 },
  { t: 104.865, name: 'ALL PERFECT?',  sub: 'サビ 2 ─ ぜんぶ',                 sky: ['#3a0a24', '#10030a'], color: '#ff5fa2', pulse: 0.020, stars: 0, beams: true, sway: 1.0 },
  { t: 112.75,  name: 'CLOSING',       sub: 'まるい画面がとじる',              sky: ['#0d0a1a', '#020106'], color: '#e0e7ff', pulse: 0.014, stars: 0, sway: 0.5 },
  { t: 119.9,   name: 'ガラテアの螺旋', sub: "Galatea's spiral",            sky: ['#0b0a1a', '#000000'], color: '#ffd84d', pulse: 0.006, stars: 0 },
];

/* ---- 譜面 -------------------------------------------------------------------
   曲の形（解析）: 0.9 イントロ / 8.9 A / 24.9 B（少ししずか）/ 40.9〜62.9 サビ1 / 63.8 音が消える /
   65.9 C（低音の暗い所）/ 80.9 盛り上げ / 96.9〜112.7 サビ2（110秒あたりがいちばん大きい）/ 112.7 アウトロ / 120 ガラテアの螺旋
   ほとんどの弾は maimai のノート（game.js の maiTap / maiSpin / maiSlide / maiTouch）。
   ボタン 4 と 5 は画面の下（地面のあたり）、3 と 6 は横の下、1・2・7・8 は上。
   -------------------------------------------------------------------------- */
function emperrorChart() {
  const cues = [];
  const cx = W / 2, cy = MAI.y;
  const burst = (t, fn) => cues.push({ t, fn });
  const beat = beatTime;
  const bar  = k => beat(k * 4);
  const fire = (t, warn, fn) => burst(t - warn, () => fn(warn));
  const RED = '#ff3b5c', PURPLE = '#c04dff', WHITE = '#ffffff', ORANGE = '#ff8c1a', GOLD = '#ffd84d';

  // ---- 部品 ----
  const tap = (t, lane, o = {}) => fire(t, o.warn || 0.45, delay => maiTap({ lane, delay, speed: o.v || 300, type: o.type || 'tap', color: o.color }));
  const each = (t, a, b, o = {}) => { tap(t, a, { ...o, type: 'each' }); tap(t, b, { ...o, type: 'each' }); };
  const brk = (t, lanes, o = {}) => { burst(t, () => { flash(0.5); punch(0.03); if (typeof maiFx === 'function') maiFx('break'); }); lanes.forEach(l => tap(t, l, { ...o, type: 'break', v: o.v || 260 })); };
  const spin = (t, from, dir, count = 16, o = {}) => fire(t, o.warn || 0.5, delay => maiSpin({ from, count, dir, gap: o.gap || 0.0625, speed: o.v || 300, delay, type: o.type || 'tap', color: o.color }));
  const slide = (t, path, o = {}) => fire(t, o.warn || 1.0, delay => maiSlide({ path: typeof path === 'function' ? path() : path, speed: o.v || 430, delay, color: o.color }));
  const touch = (t, o = {}) => fire(t, o.warn || 0.8, delay => { const p = playerXY(); maiTouch({ x: o.x != null ? o.x : p.x, y: o.y != null ? o.y : p.y - 10, delay, n: o.n || 8, speed: o.v || 170, start: o.start || 0, color: o.color }); });
  const quote = (t, text, sub) => burst(t, () => { if (typeof maiQuote === 'function') maiQuote(text, sub); });
  const LOW = GROUND_Y - 14, MID = GROUND_Y - 70;
  const band = (t, y, h = 30, o = {}) => fire(t, o.warn || 0.8, delay => errorBand({ y, h, delay, hold: o.hold || 0.3 }));
  const METEOR_FALL = 1000, METEOR_TIME = (GROUND_Y - 28 - 40) / METEOR_FALL;
  const breakDrop = (t, warn = 0.6) => fire(t - METEOR_TIME, warn, delay => { const m = meteor({ x: playerXY().x, y: 40, fall: METEOR_FALL, r: 26, delay }); m.style = 'mai-break-big'; m.color = ORANGE; });

  // ===== PANDORA BOXXX 0.9〜8.9秒 ｜ 箱がひらいて、まるい画面が目をさます ==========================================
  burst(0.2, () => { if (typeof maiFx === 'function') maiFx('open'); });
  quote(3.0, '麒麟', 'Kirin ─ 0:03');
  for (let k = 1; k < 4; k++) { tap(bar(k), k % 2 ? 4 : 5, { v: 240 }); tap(beat(k * 4 + 2), k % 2 ? 5 : 4, { v: 240 }); }
  spin(7.0, 3, 1, 16, { gap: 1.86 / 16, v: 260 });                       // ドラムの連打 → 1周の回転
  breakDrop(7.87);

  // ===== TAP 8.9〜16.9秒 ｜ 毎拍の TAP（4 と 5 のボタンを中心に、ときどき 3・6）／ 2 小節ごとに回転 ==================
  burst(bar(4), () => flash(0.6));
  const LANES_A = [4, 5, 4, 5, 3, 6, 4.5, 4.5];
  for (let k = 4; k < 8; k++) {
    for (let i = 0; i < 4; i++) tap(beat(k * 4 + i), LANES_A[(k * 4 + i) % 8]);
    if (k % 2 === 1) spin(beat(k * 4 + 2), k % 4 === 1 ? 6 : 3, k % 4 === 1 ? -1 : 1, 8, { gap: 0.0625 });
  }

  // ===== EACH 16.9〜24.9秒 ｜ 2 つ同時の EACH（黄色）＋ 裏拍の TAP ================================================
  for (let k = 8; k < 12; k++) {
    each(bar(k), 4, 5); each(beat(k * 4 + 2), k % 2 ? 3 : 6, k % 2 ? 6 : 3);
    for (const i of [1, 3]) tap(beat(k * 4 + i), (k + i) % 2 ? 4.5 : 5.5);
  }

  // ===== SLIDE 24.9〜32.9秒 ｜ ☆ が道すじを走る（下を回るスライドは跳ぶ）／ 0:28「神威」= 稲妻 =====================
  for (let k = 12; k < 16; k++) {
    slide(bar(k), k % 2 ? slideArc(2.5, 6.5, 1) : slideArc(6.5, 2.5, -1));     // 下を回る（地面すれすれ → 跳ぶ）
    tap(beat(k * 4 + 2), k % 2 ? 5 : 4);
  }
  quote(beat(54.3), '神威', 'Kamui ─ 0:28');
  [54.5, 55.5, 56.5, 57.25].forEach((n, i) => fire(beat(n), 0.7, delay => bolt({ x: i === 3 ? playerXY().x : 140 + i * 260, delay })));
  breakDrop(beat(52));

  // ===== TOUCH 32.9〜40.9秒 ｜ TOUCH（足もとがはじける）＋ まっすぐなスライド ＋ 回るリング =========================
  burst(bar(16), () => flash(0.5));
  for (let k = 16; k < 19; k++) {
    touch(bar(k));
    slide(beat(k * 4 + 2), k % 2 ? slideLine(7, 4) : slideLine(2, 5), { v: 520, warn: 0.9 });
  }
  for (const [spinV, grow] of [[0.5, 95], [0.6, 90], [0.7, 85]]) fire(bar(19), 0.6, delay => spinShape({ x: cx, y: cy, count: 14, size: 0, spin: spinV, grow, r: 6, pulse: 14, delay, color: ORANGE }));

  // ===== the EmpErroR 40.9〜48.9秒 ｜ サビ。0:42 ◆ Jack のナイフ ／ 0:43 ガラクタの人形（振り子）と「麒麟」======
  burst(bar(20), () => { flash(1); shake(18); punch(0.08); glitch(0.8); if (typeof maiFx === 'function') maiFx('impact'); });
  fire(bar(20), 0.8, delay => ring({ x: cx, y: cy, count: 32, speed: 230, r: 9, delay, color: RED, style: 'mai-tap' }));
  quote(42.0, '◆ Jack-the-Ripper', '0:42');
  [42.0, 42.25, 42.5].forEach((t, i) => fire(t, 0.5, delay => knives({ x: i % 2 ? 60 : W - 60, y: 60, count: 5, spread: 0.5, delay })));
  quote(43.2, 'ガラクタドールプレイ / 麒麟', '0:43');
  for (const [k, px, amp] of [[21, 200, 0.7], [22, 600, -0.7], [23, 400, 0.85]]) fire(bar(k) + 0.6, 0.8, delay => { const d = pendulum({ px, py: 70, amp, beats: 4, life: 7, r: 18, delay, color: '#ffd1e0' }); d.style = 'doll'; });
  for (let k = 21; k < 24; k++) for (const i of [1, 3]) tap(beat(k * 4 + i), (k + i) % 2 ? 4 : 5, { color: RED });

  // ===== BREAK 48.9〜56.9秒 ｜ 赤 → 紫 の回転（譜面の色の決まり）＋ BREAK ===========================================
  for (let k = 24; k < 28; k++) {
    spin(bar(k), k % 2 ? 2 : 7, k % 2 ? 1 : -1, 16, { gap: 0.125, color: k % 2 ? PURPLE : RED });
    tap(beat(k * 4 + 2), k % 2 ? 4.5 : 5, { color: k % 2 ? RED : PURPLE });
  }
  brk(beat(108), [4, 5]);

  // ===== CRITICAL 56.9〜63.8秒 ｜ 赤 → 白。王冠の光 ＋ 32分の2回転 ==================================================
  for (let k = 28; k < 31; k++) {
    fire(bar(k), 0.7, delay => crownBeams({ x: cx, y: 120, n: 5, spread: 1.1, aim: Math.PI / 2 + (k % 2 ? 0.25 : -0.25), delay }));
    spin(beat(k * 4 + 2), k % 2 ? 6 : 3, k % 2 ? -1 : 1, 32, { gap: 0.03125, v: 260, color: k === 30 ? WHITE : RED });
  }
  fire(bar(31), 0.6, delay => ring({ x: cx, y: cy, count: 30, speed: 150, r: 9, delay, color: WHITE, style: 'mai-tap' }));

  // ===== （音が消える）63.8〜65.9秒 ｜ SYSTEM ERROR ===============================================================
  burst(63.9, () => { if (typeof maiFx === 'function') maiFx('error'); });
  [[128, 4], [129, 5]].forEach(([n, l]) => tap(beat(n), l, { v: 130, type: 'break' }));

  // ===== FATAL ERROR 65.9〜72.9秒 ｜ こわれた横の帯（低い帯 = 跳ぶ / 高い帯 = 跳ばない）＋ BREAK の落下 ===============
  burst(beat(130), () => { flash(1); shake(20); glitch(1); if (typeof maiFx === 'function') maiFx('impact'); });
  fire(beat(130), 0.8, delay => ring({ x: cx, y: cy, count: 28, speed: 200, r: 9, delay, color: '#ff2a2a', style: 'mai-tap' }));
  for (const [i, n] of [134, 138, 142].entries()) {
    breakDrop(beat(n));
    band(beat(n + 1.5), i % 2 ? MID : LOW, 26);
    tap(beat(n + 1), i % 2 ? 4 : 5, { color: '#ff2a2a' });
  }

  // ===== SYSTEM HALT 72.9〜80.9秒 ｜ すき間のある横一列（エラーの壁）＋ 強いキックで TOUCH ==========================
  for (const k of [36, 38]) fire(bar(k), 0.6, delay => curtain({ y: 20, gapX: rand(150, W - 150), gapW: 120, spacing: 30, vy: 150, r: 9, step: 1, delay }));
  [73.24, 73.49, 73.72, 73.86].forEach((t, i) => tap(t, i % 2 ? 4 : 5, { v: 360, warn: 0.3 }));
  [146, 150, 154, 158].forEach((n, i) => { burst(beat(n), () => flash(0.4)); touch(beat(n), { x: i % 2 ? W - 120 : 120, y: 200, n: 10 }); });

  // ===== REBOOT 80.9〜88.9秒 ｜ 再起動: 交差するスライド ＋ 毎拍の TAP ================================================
  burst(beat(162), () => { flash(1); shake(18); punch(0.08); if (typeof maiFx === 'function') maiFx('impact'); });
  fire(beat(162), 0.8, delay => ring({ x: cx, y: cy, count: 36, speed: 240, r: 9, delay, color: ORANGE, style: 'mai-tap' }));
  for (let n = 164; n < 176; n++) tap(beat(n), [3.5, 5.5, 4, 5, 4.5, 6, 3, 5][n % 8], { v: 320 });
  for (const n of [166, 170, 174]) slide(beat(n), n % 4 === 2 ? slideLine(8, 4) : slideLine(1, 5), { v: 560, warn: 0.9 });

  // ===== OVERCLOCK 88.9〜96.9秒 ｜ TOUCH の花火（足もとから）＋ 回転の連発 ==========================================
  for (let k = 44; k < 47; k++) {
    fire(bar(k), 0.7, delay => geyser({ x: playerXY().x, count: 7, gap: 0.08, speed: 520, r: 10, delay }));
    touch(beat(k * 4 + 2), { n: 10, v: 190 });
    for (const i of [1, 3]) tap(beat(k * 4 + i), (k + i) % 2 ? 4 : 5, { v: 330 });
  }
  [188, 189].forEach((n, i) => spin(beat(n), i ? 6 : 3, i ? -1 : 1, 32, { gap: 0.015, v: 280, warn: 0.5 }));

  // ===== EMPEROR 96.9〜104.9秒 ｜ 王冠の光 ＋ 左右の逆回転（EACH）＋ BREAK ========================================
  burst(bar(48), () => { flash(1); shake(18); punch(0.08); glitch(0.6); if (typeof maiFx === 'function') maiFx('impact'); });
  fire(bar(48), 0.8, delay => ring({ x: cx, y: cy, count: 30, speed: 200, r: 9, delay, color: GOLD, style: 'mai-each' }));
  for (let k = 49; k < 52; k++) {
    spin(bar(k), 2, 1, 8, { gap: 0.25, type: 'each' }); spin(bar(k), 7, -1, 8, { gap: 0.25, type: 'each' });
    if (k % 2 === 0) fire(beat(k * 4 + 2), 0.7, delay => crownBeams({ x: cx, y: 120, n: 4, spread: 1.0, delay }));
  }
  breakDrop(bar(50));

  // ===== ALL PERFECT? 104.9〜112.7秒 ｜ TOUCH の花 ＋ 下を回るスライド ＋ ナイフ（ぜんぶの引用がもういちど）==========
  for (let k = 52; k < 56; k++) {
    if (k % 2 === 0) { touch(bar(k), { x: cx, y: cy, n: 12, v: 170 }); touch(bar(k) + 0.25, { x: cx, y: cy, n: 12, v: 170, start: Math.PI / 12 }); }
    else slide(bar(k), k % 4 === 1 ? slideArc(2.5, 6.5, 1) : slideArc(6.5, 2.5, -1), { v: 520 });
    fire(beat(k * 4 + 2), 0.5, delay => knives({ x: k % 2 ? 60 : W - 60, y: 60, count: 4, spread: 0.4, delay }));
    for (const i of [1, 3]) tap(beat(k * 4 + i), (k + i) % 2 ? 4.5 : 5.5);
  }
  breakDrop(beat(214));

  // ===== CLOSING 112.7〜119.9秒 ｜ まるい画面がとじる（せまる輪からぬけ出す）========================================
  burst(bar(56), () => flash(0.8));
  spin(bar(56), 1, 1, 48, { gap: 0.03, v: 220, color: WHITE });
  [228, 230, 234].forEach((n, i) => { burst(beat(n), () => flash(0.5)); fire(beat(n), 0.7, delay => { const p = playerXY(); closeIn({ x: p.x, y: p.y, count: 14, size: 380, speed: 130, spin: i % 2 ? 0.5 : -0.5, r: 8, delay }); }); });

  // ===== ガラテアの螺旋 119.9〜 ｜ 2:00 の引用: 二重のらせん → ゆっくりの☆ ===========================================
  quote(120.0, 'ガラテアの螺旋', "Galatea's spiral ─ 2:00");
  for (const [st, dir] of [[0, 1], [Math.PI, 1]]) fire(120.3, 0.7, delay => spiral({ x: cx, y: cy, count: 28, speed: 150, r: 7, turns: 1.5 * dir, gap: 0.07, start: st, delay, color: GOLD }));
  for (let t = beat(244); t < 126; t += 1.0) burst(t, () => spawn({ x: rand(20, W - 20), y: -10, vy: rand(70, 100), r: 6, style: 'mai-star', color: '#4fd6ff' }));

  return cues.sort((a, b) => a.t - b.t);
}


addSong({
  id: 'emperror',
  title: 'the EmpErroR',
  meta: 'BPM 240 · 2:08 · sasakure.UK · maimai',
  file: 'the EmpErroR.mp3',        // 中身は AAC（MP4）。ブラウザはそのまま再生できる
  bpm: 120, beat: 0.5, end: 128.8,
  beatTime: emperrorBeatTime,
  beatPos: emperrorBeatPos,
  env: ENV_EMPERROR,               // 曲の音量データ（songs/emperror-env.js）
  sections: EMPERROR_SECTIONS,
  build: emperrorChart,
  theme: 'emperror',               // visuals-emperror.js の見た目のセット（maimai のまるい画面）
  titleLook: { sky: ['#2a1206', '#0a0503'], color: '#ff8c1a', pulse: 0.01, stars: 0 },
  get clearTitle() { return hitsTaken === 0 ? 'ALL PERFECT' : 'CLEAR'; },   // 1 回も当たらなければ maimai の「ALL PERFECT」
  overTitle: 'FATAL ERROR',
  clearText: 'Thank you for playing!',
  preview: 40.9,                   // タイトルで流す試聴の開始秒（サビ）
  variant: 'リメイク',
  bestKey: 'dodge_best_emperror_remake',   // ベストタイムの保存先（旧譜面とは別）
});
