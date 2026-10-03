"use strict";

/* =========================================================================
   曲⑥  ExtremeEX（オリジナル曲）  —  拍・場面・譜面  ※リメイク版（3分のメドレー）
   いちばん難しい曲を、3分に作り直した。曲は songs/extremeex-remake-compose.py で作曲・合成した。
   ExtremeEX の「ヴイーン」とハードコアのまま、8小節ごとに「ほかの曲の衣装」に着がえる。
   譜面も同じで、その場面ではその曲の攻撃が、200 BPM の速さでやってくる。最後の EXTREME EX は全部入り。
     WARNING / EXTREME     … ExtremeEX: REV弾・ロックオン・EXエコー
     FIRST STEP            … 音符の雨・床の光・うず・転がる車輪
     the EmpErroR          … maimai の TAP / スライド / TOUCH・ERROR の帯・ナイフ・王冠
     Re:Unknown X          … 鉄の輪・カエル・UFO の柱・X の光線・巨大な足
     モラトリウム           … 振り子・時計の針・オルゴールの音符 → 時間停止 → 巻き戻し
     segment               … ガラスの板・ひび・鍵盤ブロック・プリズム弾
     Vertigo               … 傾く世界・流れる床・穴・せまる壁
     CHARGE                … ため（REV弾のうず・ロックオン）
     Malware               … ウイルス・ワーム・エラー画面・重力バグ・ループバグ
     Abyss                 … 暗闇とソナー・クラゲ・リヴァイアサン
     Ward 13               … 懐中電灯の暗闇・ストーカー・はうもの・ドア・血のしずく
     Prism                 … 虹の扇・万華鏡・はね返る光・光の線
     四季                   … 墨の線・花火・つらら・鯉・紅葉・大波
     Candy Pop Parade      … グミ・キャンディケイン・ハート・グミのクマ・ドーナツ・しゃぼん玉・ぺろぺろキャンディ
     REVERSAL              … さかさまの画面で EXエコー
     EXTREME EX            … 全部入り（1小節ごとに、ちがう曲の攻撃が旋律のREV弾にまざる）
     LIMIT BREAK           … 1小節ごとに左右反転
   見た目は visuals-exr.js（theme: 'exr'）。背景は ExtremeEX のまま、弾やビームの形は場面の曲のものになる。
   ========================================================================= */

// 200 BPM: 1拍 = 0.3秒、1小節 = 1.2秒。0拍目 = 0.5秒
const EXR_BEAT = 0.3;
function exrBeatTime(n) { return 0.5 + n * EXR_BEAT; }
function exrBeatPos(t)  { return (t - 0.5) / EXR_BEAT; }
const exrBar = k => 0.5 + k * 4 * EXR_BEAT;

/* ---- 場面（guest = その場面で衣がえする見た目のセット）----------------------------------- */
const EXR_SECTIONS = [
  { t: exrBar(0),   tier: 1,   name: 'WARNING',        sub: 'ExtremeEX ─ REMAKE',             sky: ['#0a0000', '#2a0006'], color: '#ff2a3a', pulse: 0.012, sway: 0.3, stars: 10 },
  { t: exrBar(8),   tier: 2.5, name: 'EXTREME',        sub: 'ヴイーン',                        sky: ['#100004', '#3a000c'], color: '#ff3b5c', pulse: 0.018, sway: 0.5, stars: 20 },
  { t: exrBar(16),  tier: 2.5, name: 'FIRST STEP',     sub: 'MEDLEY 01 ─ はじまりの一歩',        sky: ['#04101c', '#0e3150'], color: '#7fd8ff', pulse: 0.016, sway: 0.4, stars: 20, guest: 'day' },
  { t: exrBar(24),  tier: 3,   name: 'the EmpErroR',   sub: 'MEDLEY 02 ─ TAP / SLIDE / TOUCH',  sky: ['#2a0a06', '#120403'], color: '#ff5fa2', pulse: 0.02,  sway: 0.5, stars: 20, guest: 'emperror' },
  { t: exrBar(32),  tier: 3,   name: 'Re:Unknown X',   sub: 'MEDLEY 03 ─ 幻想郷の夜',            sky: ['#0b0a2a', '#271646'], color: '#c4b5fd', pulse: 0.02,  sway: 0.5, stars: 24, guest: 'touhou' },
  { t: exrBar(40),  tier: 2,   name: 'モラトリウム',     sub: 'MEDLEY 04 ─ 止まる時計',           sky: ['#241a44', '#b8645a'], color: '#ffc27a', pulse: 0.012, sway: 0.3, stars: 12, guest: 'dusk' },
  { t: exrBar(48),  tier: 3,   name: 'segment',        sub: 'MEDLEY 05 ─ ガラスの部屋',          sky: ['#0d1428', '#2b3f6c'], color: '#9fe6ff', pulse: 0.018, sway: 0.4, stars: 20, guest: 'glass' },
  { t: exrBar(56),  tier: 3,   name: 'Vertigo',        sub: 'MEDLEY 06 ─ めまい',               sky: ['#071522', '#163c55'], color: '#7ff6ff', pulse: 0.016, sway: 0,   stars: 16, guest: 'gyro' },
  { t: exrBar(64),  tier: 3.5, name: 'CHARGE',         sub: 'ため ─ 全部の曲が、ここに集まる',     sky: ['#120008', '#40001a'], color: '#ffd23f', pulse: 0.02,  sway: 0.6, stars: 24, zoom: [1, 1.05] },
  { t: exrBar(72),  tier: 4.5, name: 'Malware',        sub: 'MEDLEY 07 ─ EX DRIVE',             sky: ['#001a0c', '#00351a'], color: '#38ff7a', pulse: 0.03,  sway: 0.8, stars: 30, guest: 'virus' },
  { t: exrBar(80),  tier: 3.5, name: 'Abyss',          sub: 'MEDLEY 08 ─ ソナーで見る',          sky: ['#000a14', '#002233'], color: '#5cffc8', pulse: 0.02,  sway: 0.4, stars: 10, guest: 'abyss' },
  { t: exrBar(88),  tier: 2.5, name: 'Ward 13',        sub: 'MEDLEY 09 ─ 灯りを消さないで',      sky: ['#0a0606', '#1a0a0a'], color: '#c0303a', pulse: 0.01,  sway: 0.2, stars: 4,  guest: 'horror' },
  { t: exrBar(96),  tier: 4,   name: 'Prism',          sub: 'MEDLEY 10 ─ 光の絵',               sky: ['#0a0820', '#241a4a'], color: '#ffffff', pulse: 0.024, sway: 0.6, stars: 40, guest: 'prism' },
  { t: exrBar(104), tier: 4,   name: '四季',            sub: 'MEDLEY 11 ─ 春夏秋冬',              sky: ['#1a0a14', '#3a1a2a'], color: '#ff8fb0', pulse: 0.022, sway: 0.6, stars: 30, guest: 'shiki' },
  { t: exrBar(112), tier: 3.5, name: 'Candy Pop Parade', sub: 'MEDLEY 12 ─ おかしの国',           sky: ['#2a0a24', '#4a1a3a'], color: '#ff9ad5', pulse: 0.022, sway: 0.7, stars: 30, guest: 'candy' },
  { t: exrBar(120), tier: 3.5, name: 'REVERSAL',       sub: 'ため ─ さかさま',                  sky: ['#10000c', '#3a0030'], color: '#ff6bd5', pulse: 0.02,  sway: 0.5, stars: 24, zoom: [1, 1.06] },
  { t: exrBar(128), tier: 5,   name: 'EXTREME EX',     sub: '全部入り',                         sky: ['#1a0004', '#6a0010'], color: '#ff1f3d', pulse: 0.034, sway: 1.1, stars: 60 },
  { t: exrBar(144), tier: 5,   name: 'LIMIT BREAK',    sub: '最後 ─ 左右反転',                   sky: ['#200006', '#80001a'], color: '#ffffff', pulse: 0.036, sway: 1.2, stars: 70 },
  { t: exrBar(148), tier: 0.5, name: 'CLEAR?',         sub: '',                                sky: ['#05000a', '#1a0020'], color: '#ffd23f', pulse: 0.004, sway: 0.1, stars: 8 },
];

// 弾の速さ: 1.15倍（イントロ）〜 1.55倍（最後）
function exrSpeedAt(t) {
  let i = 0;
  while (i + 1 < EXR_SECTIONS.length && EXR_SECTIONS[i + 1].t <= t) i++;
  return 1.05 + 0.1 * EXR_SECTIONS[i].tier;
}

function extremeRemakeChart() {
  const cues = [];
  const burst = (t, fn) => cues.push({ t, fn });
  const B = EXR_BEAT;
  const beat = exrBeatTime;
  const bar = k => beat(k * 4);
  const fire = (t, warn, fn) => burst(t - warn, () => fn(warn));
  const SC = SCORE_EXREMAKE, M = SC.motif;
  const CX = W / 2;
  const RED = '#ff2a3a', WHITE = '#ffffff', GOLD = '#ffd23f', VIOLET = '#c86bff', PINK = '#ff6bd5', CYAN = '#7fe3ff', GREEN = '#38ff7a';
  const inBars = (list, k0, k1) => list.filter(n => (Array.isArray(n) ? n[0] : n) >= k0 * 4 && (Array.isArray(n) ? n[0] : n) < k1 * 4);
  const px = (m, lo, hi) => 50 + (W - 100) * Math.max(0, Math.min(1, (m - lo) / (hi - lo)));
  const clampX = (x, m = 30) => Math.max(m, Math.min(W - m, x));

  // ---- いつもの小道具（ExtremeEX）----
  const hit = (t, a = 0.6) => burst(t, () => { flash(a); shake(8); punch(0.03); });
  const corner = (t, left, v = 300, color = RED, r = 8) => fire(t, 0.35, delay => {
    const x = left ? 24 : W - 24, a = aimVel(x, 24, v); spawn({ x, y: 24, vx: a.vx, vy: a.vy, r, delay, color });
  });
  const lock = (t, o = {}) => burst(t - (o.track || 0.9) - (o.lock || 0.45), () => lockOn(o));
  const rev = (t, x, y, o = {}) => { const hang = o.hang || 0.4; fire(t - hang, 0.2, delay => revShot({ x, y, hang, delay, ...o })); };
  const revRingAt = (t, x, y, o = {}) => { const hang = o.hang || 0.45; fire(t - hang, 0.2, delay => revRing({ x, y, hang, delay, ...o })); };
  const revMelody = (list, v, lo, hi, color, step = 1) => list.forEach(([b, len, m], i) => {
    if (i % step) return;
    rev(beat(b), px(m, lo, hi), 26, { v, hang: len >= 1 ? 0.5 : 0.3, rise: 0.12, r: len >= 1 ? 9 : 7, lead: i % 2 === 1, color: typeof color === 'function' ? color(i) : color });
  });
  const echoOn = (t, d) => { burst(t - 2 * B, () => stageHint('EX ECHO  ── 止まるな', B * 4)); burst(t, () => echoSet(true, d)); };
  const echoOff = t => burst(t, () => echoSet(false));
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
  // 場面の変わり目: ステージを元にもどし、前の場面の長生きする敵（カエル・ストーカー・クラゲ …）を光のかけらにして消す
  const LONG_KINDS = ['stalker', 'jelly', 'leviathan', 'bear', 'donut', 'aurora', 'door', 'cane', 'koi', 'worm'];
  const LONG_STYLES = ['frog', 'gumdrop', 'ironring', 'doll'];
  const sweep = (t, stageToo = true) => burst(t, () => {
    for (const b of bullets) {
      if (b.dead || b.delay > 0 || b.age < 0.8) continue;
      if (LONG_KINDS.includes(b.kind) || LONG_STYLES.includes(b.style) || b.pendulum || (b.kind === 'laser' && b.life > 3)) {
        b.dead = true;
        if (typeof sparks === 'function') sparks(b.x || W / 2, b.y || 300, { n: 8, color: b.color || '#fff', speed: 160, life: 0.4, size: 2, gravity: 0 });
      }
    }
    echoSet(false);
    if (stageToo) stageTo({ tilt: 0, conveyor: 0, wl: 0, wr: W, spin: 0, mirror: 1, dark: 0, zoom: 1, follow: 0, shock: 0 }, B);
  });

  // ExtremeEX の下地: メドレーの場面にも、2拍ごとにすみからねらうREV弾 ＋ 2小節ごとにロックオン
  const exLayer = (k0, k1, o = {}) => {
    for (let k = k0; k < k1; k++) {
      rev(bar(k) + 3 * B, k % 2 ? W - 24 : 24, 24, { v: o.v || 600, hang: 0.35, lead: k % 4 === 3, color: k % 2 ? WHITE : RED });
      rev(bar(k) + 1 * B, k % 2 ? 24 : W - 24, 24, { v: o.v || 600, hang: 0.35, lead: k % 4 === 1, color: GOLD });
      if (o.lock !== false && k % 2 === 1) lock(bar(k) + 1 * B, { track: 0.8, lock: 0.4 });
    }
  };
  exLayer(16, 40); exLayer(40, 48, { lock: false }); exLayer(48, 64); exLayer(96, 120);

  // ===== WARNING 0〜8小節 ｜ うなり上がる音 = REV弾のリング ／ ロックオン ===================
  for (let k = 0; k < 8; k += 2) { revRingAt(bar(k) + 0.3, CX, 260, { count: 12 + k * 2, v: 380 + k * 20, start: k * 0.2, color: RED }); hit(bar(k) + 0.3, 0.4); }
  SC.kick.filter(b => b < 32 && b % 4 !== 0).forEach((b, i) => corner(beat(b), i % 2 === 0, 260, WHITE, 7));
  for (const k of [3, 5, 6, 7]) lock(bar(k) + 2 * B);

  // ===== EXTREME 8〜16小節 ｜ ヴイーンの刻み = すみでうなって飛ぶREV弾 ／ 壁 ／ EXエコー ========
  hit(bar(8), 1);
  SC.stab.forEach(([b], i) => rev(beat(b) + 0.45, i % 2 ? W - 30 : 30, 30, { v: 620, hang: 0.45, lead: i % 3 === 2, color: i % 5 === 0 ? GOLD : RED }));
  SC.kick.filter(b => b >= 32 && b < 64 && b % 2 === 1).forEach((b, i) => corner(beat(b), i % 2 === 0, 320, i % 4 === 3 ? GOLD : RED, 8));
  for (const k of [10, 14]) fire(bar(k), 1.0, delay => firewall({ gapX: rand(140, W - 140), gapW: 130, steps: 6, step: 1, delay, color: VIOLET }));
  for (let k = 9; k < 16; k += 2) revRingAt(bar(k) + 2 * B, CX, 120, { count: 10, v: 420, start: k * 0.3, color: WHITE });
  echoOn(bar(12), 1.5);
  sweep(bar(16));

  // ===== FIRST STEP 16〜24 ｜ アルペジオ = 音符の雨 ／ 小節の頭に床の光 ／ うず ／ 転がる車輪 ======
  hit(bar(16), 0.7);
  inBars(M.firststep, 16, 24).forEach(([b, m], i) => {
    if (i % 2) return;                                                // 4分音符ごと（8分だと多すぎる）
    const d = noteDrop(beat(b), px(m, 60, 86) + (i % 4 ? 18 : -18), 460, { r: 9, color: ['#7fd8ff', '#ffd27a', '#ff8fb0'][i % 3], warn: 0.5 });
    burst(d.at, d.go);
  });
  for (const k of [18, 20, 22]) fire(bar(k), 1.0, delay => floorStrike({ delay, hold: 0.2, color: '#7fd8ff' }));
  for (const k of [17, 21]) fire(bar(k), 0.8, delay => spiral({ x: CX, y: 120, count: 24, speed: 150, r: 8, turns: k === 17 ? 1 : -1, gap: 0.04, delay, color: '#ffd27a' }));
  for (const k of [19, 23]) fire(bar(k), 0.8, delay => roller({ x: k === 19 ? 30 : W - 30, vx: k === 19 ? 280 : -280, delay, life: 4, color: '#7fd8ff' }));
  sweep(bar(24));

  // ===== the EmpErroR 24〜32 ｜ maimai: TAP（1拍ごとに回る）／ スライド ／ TOUCH ／ ERROR の帯 ／ ナイフ ／ 王冠 ===
  hit(bar(24), 0.8);
  for (let n = 0; n < 32; n++) fire(beat(96 + n), 0.45, delay => maiTap({ lane: 1 + (n * 3) % 8, speed: 320, delay, type: n % 8 === 7 ? 'break' : n % 4 === 2 ? 'each' : 'tap' }));
  for (let n = 0; n < 32; n += 4) fire(beat(96 + n + 2), 0.45, delay => maiTap({ lane: 1 + (n * 3 + 4) % 8, speed: 320, delay, type: 'each' }));
  for (const [k, a, b2, d] of [[26, 1, 5, 1], [30, 3, 7, -1]]) fire(bar(k), 1.0, delay => maiSlide({ path: slideArc(a, b2, d), speed: 460, delay }));
  for (const k of [27, 31]) fire(bar(k), 0.8, delay => { const p = playerXY(); maiTouch({ x: p.x, y: p.y - 10, delay, n: 8, speed: 180 }); });
  for (const k of [25, 29]) fire(bar(k), 0.8, delay => errorBand({ y: GROUND_Y - 20, h: 34, delay, hold: 0.3 }));   // 低い帯 → 跳ぶ
  SC.tick.filter(b => b >= 96 && b < 128).forEach((b, i) => { if (i % 4 === 0) fire(beat(b), 0.45, delay => knives({ x: i % 8 ? 60 : W - 60, y: 60, count: 4, spread: 0.45, delay })); });
  fire(bar(28), 0.8, delay => crownBeams({ x: CX, y: 110, n: 5, spread: 1.0, aim: Math.PI / 2, delay }));
  sweep(bar(32));

  // ===== Re:Unknown X 32〜40 ｜ 鉄の輪 ／ カエル ／ UFO の柱 ／ X の光線 ／ 巨大な足 ／ 米つぶ弾 =========
  hit(bar(32), 0.8);
  for (const [k, L] of [[32, true], [36, false]]) fire(bar(k), 0.9, delay => ironRing({ x: L ? 80 : W - 80, y: 150, vx: L ? 190 : -190, vy: 150, r: 18, life: 7, delay }));
  for (let k = 33; k < 40; k += 2) fire(bar(k), 0.6, delay => frogHop({ fromLeft: k % 4 === 1, apex: 120 + (k % 3) * 25, v: 200, delay }));
  for (const [k, c] of [[34.5, [0, 3, 6]], [36.5, [1, 4, 7]], [38.5, [2, 5]]]) fire(bar(k), 0.6, delay => columns({ cols: c, delay, hold: 0.22, color: ['#ff4d6d', '#5cf2a4', '#4cc9f0'][Math.floor(k) % 3] }));
  for (const k of [35, 39]) fire(bar(k), 1.0, delay => { const p = playerXY(); xStrike({ x: p.x, y: p.y, delay, hold: 0.25, color: '#fff3c4' }); });
  fire(bar(37.5), 1.0, delay => stomp({ x: clampX(playerXY().x, 80), delay }));
  inBars(M.unknown, 32, 40).forEach(([b], i) => { if (i % 8 === 0) fire(beat(b), 0.5, delay => {
    const p = playerXY(), x = i % 16 ? 120 : W - 120, a0 = Math.atan2(p.y - 90, p.x - x);
    for (let j = 0; j < 5; j++) { const a = a0 + (j - 2) * 0.2; spawn({ x, y: 90, vx: Math.cos(a) * 230, vy: Math.sin(a) * 230, r: 7, delay, color: '#ff4d6d', style: 'rice' }); }
  }); });
  sweep(bar(40));

  // ===== モラトリウム 40〜48 ｜ 振り子 ／ 時計の針 ／ オルゴールの音符 → 時間停止 → 巻き戻し ============
  hit(bar(40), 0.6);
  fire(bar(40), 1.0, delay => pendulum({ px: CX - 200, py: 90, amp: 0.65, beats: 8, life: 7 * 4 * B - 0.4, r: 20, delay, color: '#ffd27a' }));
  fire(bar(40) + 4 * B, 1.0, delay => pendulum({ px: CX + 200, py: 90, amp: -0.65, beats: 8, life: 6 * 4 * B - 0.4, r: 20, delay, color: '#ff8fb0' }));
  fire(bar(43), 1.0, delay => clockHand({ cx: CX, cy: 300, len: 380, a0: -Math.PI / 2, step: Math.PI / 16, life: 4 * 4 * B - 0.2, width: 12, delay, color: '#ff8fb0' }));
  inBars(M.moratorium, 40, 48).forEach(([b, m], i) => {
    const d = noteDrop(beat(b), px(m, 70, 96), 420, { r: 10, color: ['#ffd27a', '#ff8fb0', '#c9b6ff'][i % 3], warn: 0.5 });
    burst(d.at, d.go);
  });
  SC.tick.filter(b => b >= 160 && b < 190 && b % 2 === 1).forEach((b, i) => fire(beat(b), 0.4, delay => { const x = i % 2 ? 40 : W - 40, p = playerXY(), a = Math.atan2(p.y - 40, p.x - x); for (const o of [-0.15, 0.15]) spawn({ x, y: 40, vx: Math.cos(a + o) * 280, vy: Math.sin(a + o) * 280, r: 8, delay, color: '#ffd27a' }); }));
  burst(beat(SC.stop[0]) - 2 * B, () => stageHint('TIME STOP', 3 * B));
  burst(beat(SC.stop[0]), () => timeStop(2 * B));                    // 曲が止まる2拍: 時間停止
  for (let i = 0; i < 6; i++) fire(beat(SC.stop[0]) - 0.6, 0.5, delay => spawn({ x: CX + (i - 2.5) * 110, y: 40, vx: 0, vy: 260, r: 9, delay, color: '#fff1d6' }));
  burst(bar(48) - 0.02, () => rewind());                               // 動き出すと同時に巻き戻し
  sweep(bar(48));

  // ===== segment 48〜56 ｜ ガラスの板（割れる音で割れる）／ 和音 = 鍵盤ブロック ／ 鉄琴 = プリズム弾 ／ ひび ===
  const glassAt = (t, warn, o) => burst(t - warn, () => pane({ ...(typeof o === 'function' ? o() : o), at: t }));
  glassAt(beat(SC.glass[0]), 1.6, { x: CX, y: 200, w: 520, h: 200, n: 30, speed: 260, size: 1, color: WHITE });
  glassAt(beat(SC.glass[1]), 1.4, () => ({ x: playerXY().x < CX ? 230 : W - 230, y: 220, w: 320, h: 220, n: 24, speed: 270, size: 0.8, color: CYAN }));
  glassAt(beat(SC.glass[2]), 1.2, { x: CX, y: 240, w: 700, h: 260, n: 40, speed: 280, size: 1.3, color: WHITE });
  inBars(M.segment, 48, 56).forEach(([b, m], i) => { const d = keyDrop(beat(b), px(m, 60, 74) + (i % 3) * 30 - 30, 0.25, 560, { color: ['#c6b3ff', '#7fe3ff', '#ff9ad5'][i % 3], w: 36 }); burst(d.at, d.go); });
  inBars(SC.ping, 48, 56).forEach((b, i) => fire(beat(b), 0.4, delay => prism({ x: i % 2 ? 40 : W - 40, y: -8, a: Math.PI / 2 + (i % 2 ? -0.35 : 0.35), v: 150, turn: 0.75, every: 1, r: 6.5, delay, color: i % 2 ? '#bfefff' : '#9cffd9' })));
  for (const k of [50, 54]) fire(bar(k) + 2 * B, 0.8, delay => {
    const left = k === 50, x = left ? 0 : W, y = rand(140, GROUND_Y - 180), p = playerXY();
    crack({ x, y, arms: 2, a0: Math.atan2(p.y - y, p.x - x), spread: 0.5, len: 600, speed: 1100, delay, color: WHITE });
  });
  sweep(bar(56));

  // ===== Vertigo 56〜64 ｜ 傾く ／ 流れる床 ／ 足もとの穴 ／ せまる壁 ／ 急降下の音 = 転がる車輪 =================
  [[56, 0.18], [58, -0.2], [60, 0.22], [62, -0.18]].forEach(([k, a]) => tilt(bar(k), a));
  belt(bar(57), 150); belt(bar(59), -170); belt(bar(61), 0); belt(bar(63), 190);
  for (const k of [58.5, 62.5]) holeAtPlayer(bar(k));
  burst(bar(60) - 2 * B, () => stageHint('▶ ▶ 壁がせまる ◀ ◀', 3 * B));
  burst(bar(60), () => stageTo({ wl: 140, wr: W - 140 }, 4 * B));
  burst(bar(62), () => stageTo({ wl: 0, wr: W }, 2 * B));
  inBars(M.vertigo, 56, 64).forEach(([b], i) => fire(beat(b), 0.6, delay => {
    const d = Math.sign(stage.tilt) || (i % 2 ? 1 : -1);
    roller({ x: d > 0 ? stage.wl + 19 : stage.wr - 19, vx: d * 220, delay, life: 4, color: GOLD });
  }));
  sweep(bar(64));

  // ===== CHARGE 64〜72 ｜ スネア連打 = REV弾のうず ／ ロックオン ／ 3・2・1 =======================
  SC.snare.filter(b => b >= 256 && b < 286).forEach((b, i) => { if (i % 2) return;
    fire(beat(b), 0.2, delay => { for (const o of [0, Math.PI]) revShot({ x: CX, y: 240, a: i * 0.45 + o, v: 360 + i * 3, hang: 0.5, aim: false, delay, color: i % 4 ? GOLD : RED }); }); });
  for (let k = 66; k < 72; k++) lock(bar(k) + 2 * B, { track: 0.7, lock: 0.35, r: 50 });
  sweep(bar(72));

  // ===== Malware 72〜80 ｜ EX DRIVE: 旋律 = REV弾 ／ ウイルス ／ ワーム ／ エラー画面 ／ 重力バグ ／ ループバグ ==
  hit(bar(72), 1);
  revMelody(inBars(SC.drop1, 72, 80), 680, 74, 90, i => (i % 2 ? GREEN : WHITE));
  SC.kick.filter(b => b >= 288 && b < 320 && b % 2 === 1).forEach((b, i) => corner(beat(b), i % 2 === 0, 340, i % 4 === 3 ? GOLD : GREEN, 8));
  const virus = (t, dx = 0, o = {}) => {
    const fall = 0.75, warn = 0.3;
    burst(t - fall - warn, () => {
      const p = playerXY(), x = clampX(p.x + dx);
      if (o.up) { const y0 = GROUND_Y - 12, d = y0 - CEIL_Y, g = -2 * d / (fall * fall); spore({ x, y: y0, vy: 0, g, delay: warn, color: '#ff4fd8', reach: 2, inc: 0.6, life: 1.8, spd: 1 }); }
      else { const y0 = 30, d = GROUND_Y - y0, g = 2 * d / (fall * fall); spore({ x, y: y0, vy: 0, g, delay: warn, color: GREEN, reach: 2, inc: 0.6, life: 1.8, spd: 1 }); }
    });
  };
  for (let k = 72; k < 80; k++) virus(bar(k) + 2 * B, (k % 2 ? 1 : -1) * 90, { up: k >= 76 && k < 79 });
  for (const [k, side] of [[73, -1], [77, 1]]) fire(bar(k), 0.7, delay => worm({ x: side < 0 ? 30 : W - 30, y: 170, n: 12, v: 200, turn: 2.0, life: 4, r: 10, delay, color: GREEN }));
  fire(bar(75), 0.6, delay => { const p = playerXY(); popup({ x: clampX(p.x, 80), y: p.y - 10, w: 150, h: 90, delay, hold: 1.0, title: 'ERROR', text: 'EXTREME.EXE', color: RED }); });
  fire(bar(79), 0.6, delay => cascade({ x: 81, y: 150, n: 6, dx: 74, dy: 70, every: B / 2, delay, hold: 1.0, w: 150, h: 86, title: 'ERROR', text: 'MEDLEY.DLL', color: RED }));
  burst(bar(76) - 3 * B, () => stageHint('↑ GRAVITY.DLL NOT FOUND ↑', 3 * B)); burst(bar(76), () => gravityFlip(true));
  burst(bar(79) - 2 * B, () => stageHint('↓ GRAVITY RESTORED ↓', 2 * B)); burst(bar(79), () => gravityFlip(false));
  burst(bar(74) + 2 * B, () => glitchLoop(4 * B, B / 2, 0.82));
  sweep(bar(80));

  // ===== Abyss 80〜88 ｜ 暗闇（ソナーの音で見える）／ クラゲ ／ リヴァイアサン ／ ゆっくりの雪 =================
  burst(bar(80) - 2 * B, () => stageHint('ソナーで見る', 4 * B));
  burst(bar(80), () => stageTo({ dark: 1 }, 2 * B));
  inBars(SC.ping, 80, 88).forEach(b => burst(beat(b), () => { const p = playerXY(); sonar(p.x, p.y); }));
  for (const [k, x] of [[80.5, 160], [82.5, W - 160], [84.5, CX]]) fire(bar(k), 0.8, delay => jelly({ x, y: 60, v: 280, every: 1, life: 6, delay, color: '#ff8fd0' }));
  fire(bar(83), 1.6, delay => leviathan({ y: 360, dir: 1, v: 210, amp: 160, wave: 0.32, delay, color: '#4a7dff' }));
  for (let n = 0; n < 16; n++) fire(bar(80) + n * 2 * B, 0.5, delay => snow({ x: rand(40, W - 40), y: -8, vy: 120, amp: 50, freq: 0.5, r: 7, delay, color: '#bff8ff' }));
  sweep(bar(88));

  // ===== Ward 13 88〜96 ｜ 懐中電灯の暗闇 ／ ストーカー ／ はうもの（心臓の音）／ ドア ／ 血のしずく =============
  burst(bar(88), () => stageTo({ dark: 0.92 }, 0.3));
  burst(bar(88) - 2 * B, () => stageHint('灯りを消さないで', 4 * B));
  fire(bar(88), 1.0, delay => stalker({ x: W - 40, v: 95, life: 8 * 4 * B - 1.2, delay, color: '#d8d0c0' }));
  inBars(SC.heart, 88, 96).filter(b => b % 4 === 0).forEach((b, i) => fire(beat(b), 0.9, delay => crawler({ fromLeft: i % 2 === 0, v: 320, delay, color: '#d8d0c0' })));
  for (const k of [90, 94]) fire(bar(k), 0.9, delay => doorSlam({ x: clampX(playerXY().x, 40), delay, color: '#8a3a2a' }));
  inBars(M.ward13, 88, 96).forEach(([b]) => fire(beat(b), 0.6, delay => { const p = playerXY(); for (let i = 0; i < 3; i++) bloodDrop({ x: clampX(p.x + (i - 1) * 120 + rand(-20, 20), 20), delay }); }));
  for (const k of [92]) burst(bar(k) + 2 * B, () => { stalkerBlink(160); if (typeof horrorBlink === 'function') horrorBlink(); });
  burst(bar(96), () => { stageTo({ dark: 0 }, 0.2); flash(0.8); shake(12); });
  sweep(bar(96), false);
  burst(bar(96), () => stageTo({ tilt: 0, conveyor: 0, wl: 0, wr: W, spin: 0, mirror: 1, zoom: 1, follow: 0 }, B));

  // ===== Prism 96〜104 ｜ 虹の扇 ／ 万華鏡 ／ はね返る光 ／ 光の線（ゲートの刻み）／ 床をなめる光 =====================
  hit(bar(96), 0.8);
  for (const [k, rev2] of [[96, false], [100, true]]) fire(bar(k), 0.9, delay => prismFan({ x: CX, y: 96, xs: Array.from({ length: 7 }, (_, i) => 80 + i * 107), delay, step: B / 2, reverse: rev2 }));
  for (const k of [98, 102]) fire(bar(k), 0.8, delay => kaleido({ cx: CX, cy: 300, d: 120, rot: k * 0.3, n: 6, step: B / 2, delay, width: 10 }));
  for (const [k, x, a] of [[97, 40, 0.7], [101, W - 40, Math.PI - 0.7]]) fire(bar(k), 0.85, delay => bounceBeam({ x, y: 60, ang: a, bounces: 5, delay, step: 0.07 }));
  inBars(M.prism, 96, 104).forEach(([b], i) => { if (i % 6 === 0) fire(beat(b), 0.8, delay => { const x = 80 + ((i * 97) % (W - 160)); ray({ x1: x + 60, y1: -30, x2: x - 60, y2: GROUND_Y + 40, width: 14, delay, hold: 0.25, color: WHITE }); }); });
  for (const k of [99, 103]) fire(bar(k), 0.7, delay => scanner({ fromLeft: k === 99, y1: GROUND_Y - 46, y2: GROUND_Y + 10, speed: 450, width: 12, delay, color: '#ffffff' }));
  sweep(bar(104));

  // ===== 四季 104〜112 ｜ 春: 墨の線 ／ 夏: 花火 ／ 秋: 紅葉 ／ 冬: つらら ／ 鯉 ／ 大波 ===========================
  hit(bar(104), 0.8);
  const INK = '#16121c';
  fire(bar(104), 0.8, delay => inkStroke({ pts: bezierPts({ x: -20, y: 160 }, { x: 260, y: 40 }, { x: 540, y: 420 }, { x: W + 20, y: 260 }, 24), width: 18, speed: 1000, delay, color: INK }));
  fire(bar(105), 0.8, delay => inkStroke({ pts: bezierPts({ x: W + 20, y: 120 }, { x: 520, y: 380 }, { x: 260, y: 60 }, { x: -20, y: 340 }, 24), width: 18, speed: 1000, delay, color: INK }));
  for (const [k, x] of [[106, 240], [106.5, W - 240]]) fire(bar(k), 1.2, delay => fireworkRays({ x, y: 160, n: 12, r1: 420, rot: k, delay, color: k % 1 ? '#ff8fb0' : '#ffd27f' }));
  for (let i = 0; i < 8; i++) burst(bar(104.5 + i), () => { for (let j = 0; j < 5; j++) mapleLeaf({ x: i % 2 ? W + 20 + j * 40 : -20 - j * 40, y: 80 + j * 70, vx: (i % 2 ? -1 : 1) * 220, vy: 40, delay: 0.5, color: j % 2 ? '#d8452a' : '#f0a030' }); });
  inBars(SC.taiko, 104, 112).forEach((b, i) => { if (b % 4 !== 0 || (b >= 432 && b < 440)) fire(beat(b), 0.7, delay => icicle({ x: clampX(playerXY().x + (i % 2 ? 60 : -60), 30), delay, len: 60, color: '#cfeaff' })); });
  for (const [k, sd] of [[109, 1], [109.5, -1]]) fire(bar(k), 0.9, delay => { const x1 = clampX(playerXY().x, 60); koi({ x0: x1 - sd * 340, x1, h: 240, dur: 1.2, delay, color: sd > 0 ? '#ff6a3a' : '#f4f0e8' }); });
  burst(bar(110) - 2 * B, () => stageHint('大波 ── 跳べ', 3 * B));
  fire(bar(110) + 2 * B, 1.0, delay => greatWave({ fromLeft: true, delay }));
  sweep(bar(112));

  // ===== Candy Pop Parade 112〜120 ｜ グミ ／ キャンディケイン ／ ハート ／ グミのクマ ／ ドーナツ ／ しゃぼん玉 ／ ぺろぺろキャンディ ==
  hit(bar(112), 0.7);
  const CANDY = ['#ff6fae', '#ffd166', '#7fd8ff', '#9cffb0', '#c9a0ff', '#ff9f43'];
  for (let k = 112; k < 120; k++) fire(bar(k), 0.7, delay => gumdrop({ x: k % 2 ? W - 30 : 30, vx: (k % 2 ? -1 : 1) * 180, apex: 180 + (k % 3) * 30, delay, color: CANDY[k % 6], bounces: 4 }));
  inBars(M.candy, 112, 120).forEach(([b], i) => { if (i % 3 === 0) fire(beat(b), 0.6, delay => candyCane({ x: clampX(playerXY().x + (i % 2 ? 70 : -70)), vy: 300, delay, color: '#ff4d7a' })); });
  for (const k of [113, 117]) fire(bar(k), 0.8, delay => heartRing({ x: k === 113 ? 200 : W - 200, y: 140, n: 22, speed: 130, delay, color: '#ff6fae' }));
  for (const k of [114, 118]) fire(bar(k), 1.0, delay => jellyBear({ fromLeft: k === 114, v: 170, delay, color: k === 114 ? '#ff9f43' : '#9cffb0' }));
  fire(bar(116), 1.0, delay => donut({ x: CX, y: 280, gapA: Math.atan2(playerXY().y - 280, playerXY().x - CX), gap: 1.2, dur: 3.5, delay, color: '#ffb3d1' }));
  for (let i = 0; i < 4; i++) fire(bar(112.5 + i * 2), 0.4, delay => bubble({ x: 120 + i * 180, popAt: bar(113.5 + i * 2), delay, color: '#bfe8ff', starColor: CANDY[i] }));
  fire(bar(115), 1.0, delay => { const h = clockHand({ cx: CX, cy: 120, len: 330, a0: Math.PI / 2 - 0.9, step: Math.PI / 12, life: 3 * 4 * B, delay, color: '#ff6fae', hub: 30 }); h.lolli = true; });
  sweep(bar(120));

  // ===== REVERSAL 120〜128 ｜ さかさまの画面で EXエコー ＋ 3本のREVうず ／ 3・2・1 ======================
  burst(bar(120), () => { stageHint('↻ UPSIDE DOWN', B * 4); stageTo({ spin: Math.PI }, 2 * B); });
  echoOn(bar(121), 1.3);
  for (let b = 484; b < 504; b += 2) fire(beat(b), 0.2, delay => {
    const a = (b - 484) * 0.35;
    for (const o of [0, TAU / 3, 2 * TAU / 3]) revShot({ x: CX, y: 220, a: a + o, v: 420, hang: 0.45, aim: false, delay, color: PINK });
  });
  burst(bar(126), () => stageTo({ spin: 0 }, 2 * B));
  echoOff(bar(127));
  revRingAt(bar(128), CX, 260, { count: 24, v: 480, color: WHITE });

  // ===== EXTREME EX 128〜144 ｜ 全部入り: 旋律のREV弾 ＋ EXエコー ＋ 1小節ごとに、ちがう曲の攻撃 ===============
  hit(bar(128), 1);
  echoOn(bar(129), 1.2);
  revMelody(SC.drop2, 740, 75, 93, i => (i % 2 ? RED : GOLD));
  SC.snare.filter(b => b >= 512 && b < 576).forEach((b, i) => { if (i % 2) return;
    const x = i % 4 === 0 ? 24 : W - 24;
    fire(beat(b) - 0.3, 0.2, delay => { for (const o of [-0.18, 0, 0.18]) revShot({ x, y: 24, v: 600, hang: 0.3, aim: true, lead: i % 4 === 2, spread: o, delay, color: i % 3 ? RED : WHITE }); });
  });
  const CAMEO = [
    k => fire(bar(k), 0.45, delay => { for (let j = 0; j < 4; j++) maiTap({ lane: 1 + ((k + j * 2) % 8), speed: 340, delay: delay + j * B / 2, type: 'tap' }); }),            // the EmpErroR
    k => fire(bar(k), 0.6, delay => frogHop({ fromLeft: k % 2 === 0, apex: 140, v: 220, delay })),                                                                          // Re:Unknown X
    k => { const d = noteDrop(bar(k) + 2 * B, clampX(playerXY().x), 480, { r: 10, color: '#ffd27a', warn: 0.5 }); burst(d.at, d.go); },                                   // モラトリウム
    k => burst(bar(k) - 1.0, () => pane({ x: CX, y: 210, w: 420, h: 180, at: bar(k) + 2 * B, n: 24, speed: 280, size: 0.8, color: WHITE })),                              // segment
    k => holeAtPlayer(bar(k) + 2 * B, { w: 110, len: 4 * B, warn: 4 * B }),                                                                                                // Vertigo
    k => virus(bar(k) + 2 * B, 0),                                                                                                                                          // Malware
    k => fire(bar(k), 0.8, delay => jelly({ x: k % 2 ? 140 : W - 140, y: 60, v: 280, every: 1, life: 3, delay, color: '#ff8fd0' })),                                     // Abyss
    k => fire(bar(k), 0.9, delay => crawler({ fromLeft: k % 2 === 1, v: 340, delay, color: '#d8d0c0' })),                                                                  // Ward 13
    k => fire(bar(k), 0.85, delay => kaleido({ cx: CX, cy: 280, d: 110, rot: k * 0.4, n: 6, step: B / 2, delay, width: 9 })),                                                // Prism
    k => fire(bar(k), 0.9, delay => { const x1 = clampX(playerXY().x, 60), sd = k % 2 ? 1 : -1; koi({ x0: x1 - sd * 340, x1, h: 240, dur: 1.2, delay, color: '#ff6a3a' }); }), // 四季
    k => fire(bar(k), 0.7, delay => gumdrop({ x: k % 2 ? W - 30 : 30, vx: (k % 2 ? -1 : 1) * 200, apex: 190, delay, color: '#ff6fae', bounces: 3 })),                     // Candy
    k => fire(bar(k), 1.0, delay => { const p = playerXY(); xStrike({ x: p.x, y: p.y, delay, hold: 0.25, color: '#fff3c4' }); }),                                         // Re:Unknown X
    k => fire(bar(k), 0.5, delay => knives({ x: k % 2 ? 60 : W - 60, y: 60, count: 5, spread: 0.5, delay })),                                                               // the EmpErroR
    k => fire(bar(k), 1.0, delay => floorStrike({ delay, hold: 0.2, color: '#7fd8ff' })),                                                                                   // FIRST STEP
    k => fire(bar(k), 0.8, delay => heartRing({ x: CX, y: 140, n: 20, speed: 140, delay, color: '#ff6fae' })),                                                             // Candy
    k => fire(bar(k), 1.2, delay => fireworkRays({ x: k % 2 ? 220 : W - 220, y: 160, n: 12, r1: 420, rot: k, delay, color: '#ffd27f' })),                                  // 四季
  ];
  for (let k = 128; k < 144; k++) CAMEO[k - 128](k);
  for (let k = 129; k < 144; k += 4) lock(bar(k) + 3 * B, { track: 0.8, lock: 0.4 });
  [[132, 0.18], [136, -0.18], [140, 0]].forEach(([k, a]) => tilt(bar(k), a));
  echoOff(bar(144));
  sweep(bar(144), false);

  // ===== LIMIT BREAK 144〜148 ｜ 1小節ごとに左右反転 ＋ EXエコー（0.9秒）＋ 半拍ごとのREV弾 =====================
  hit(bar(144), 1);
  burst(bar(144), () => stageTo({ tilt: 0, conveyor: 0 }, B));
  echoOn(bar(144), 0.9);
  for (let k = 144; k < 148; k++) {
    burst(bar(k), () => stageTo({ mirror: k % 2 ? 1 : -1 }, B * 0.6));
    for (let h = 0; h < 8; h++) rev(bar(k) + h * B * 0.5, h % 2 === 0 ? 24 : W - 24, 24, { v: 620, hang: 0.3, lead: h % 4 === 3, color: h % 2 ? WHITE : RED });
    if (k % 2 === 0) lock(bar(k) + 3 * B, { track: 0.7, lock: 0.35 });
  }
  echoOff(bar(148));

  // ===== おわり 148〜 ｜ 最後のドーン ===========================================================
  burst(bar(148), () => stageTo({ mirror: 1, tilt: 0, conveyor: 0, spin: 0, wl: 0, wr: W }, B));
  hit(bar(148), 1);
  revRingAt(bar(148), CX, 260, { count: 40, v: 520, color: WHITE });
  revRingAt(bar(148), CX, 260, { count: 20, v: 340, start: 0.13, r: 11, color: RED });

  return cues.sort((a, b) => a.t - b.t);
}

addSong({
  id: 'extremeex',
  variant: 'リメイク',
  title: 'ExtremeEX',
  meta: '200 BPM · 3:00 · オリジナル曲 · 最高難度 · 全曲メドレー',
  file: 'ExtremeEX-Remake.mp3',
  bpm: 200, beat: EXR_BEAT, end: 180.5,
  beatTime: exrBeatTime,
  beatPos: exrBeatPos,
  speedAt: exrSpeedAt,
  env: ENV_EXREMAKE,               // 曲の音量データ（songs/extremeex-remake-env.js）
  sections: EXR_SECTIONS,
  build: extremeRemakeChart,
  theme: 'exr',                    // visuals-exr.js（ExtremeEX の背景 ＋ 場面ごとに、その曲の弾の形）
  // ExtremeEX の背景の演出の予定（拍）: 叩きつけの「EX」・3・2・1・黒い帯・ドロップ
  exFx: {
    slams: { 288: 'EX', 512: 'EX', 576: 'EX', 592: 'EX' },
    counts: { 285: '3', 286: '2', 287: '1', 509: '3', 510: '2', 511: '1' },
    box: [[256, 288], [480, 512]],
    drops: [[288, 352], [512, 576], [576, 592]],
  },
  titleLook: { sky: ['#100004', '#3a000c'], color: '#ff2a3a', tier: 3, pulse: 0.014, stars: 16 },
  titleBpm: 100,
  preview: 154.1,
  clearText: '全部の曲をこえた。あなたは EX をこえた。',
  bestKey: 'dodge_best_extremeex_remake',   // 旧譜面とは別
});
