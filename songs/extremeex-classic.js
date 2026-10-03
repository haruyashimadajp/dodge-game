"use strict";

/* =========================================================================
   ExtremeEX 【旧譜面（CLASSIC）】
   リメイク前の譜面と曲（1分58秒）を、そのまま残したもの。タイトル画面の「譜面」ボタンで
   リメイク版（songs/extremeex.js）と切りかえられる。
   名前がリメイク版とぶつからないよう、ファイル全体を (function () { ... })() で包んでいる。
   ========================================================================= */
(function () {

  /* =========================================================================
     曲⑥  ExtremeEX（オリジナル曲）  —  拍・場面・譜面
     いちばん難しい曲。200 BPM のハードコア。主役は「ヴイーン」と1オクターブ下から
     しゃくり上がって鳴るシンセ（songs/extremeex-compose.py の vwoon）。
     この曲だけの仕掛け（game.js の「ExtremeEX」の所）:
       EXエコー  … 少し前の自分の位置に赤い分身。さわると当たる → 止まれない・引き返すなら跳び越える
       ロックオン … 照準が追いかけてきて、止まって、爆発する → 止まった円から出る
       REV弾     … 「ヴイーン」の弾。うなりながら止まっていて、音がしゃくり上がるのと同時に一気に飛ぶ
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

    // ---- この曲だけの仕掛け ----
    const echoOn = (t, d) => { burst(t - 2 * B, () => stageHint('EX ECHO  ── 止まるな', B * 4)); burst(t, () => echoSet(true, d)); };
    const echoOff = t => burst(t, () => echoSet(false));
    const lock = (t, o = {}) => burst(t - (o.track || 0.9) - (o.lock || 0.45), () => lockOn(o));   // t に爆発する
    // REV弾を「t ちょうどに飛び出す」ように出す（hang 秒前から、うなりながら待っている）
    const rev = (t, x, y, o = {}) => { const hang = o.hang || 0.4; fire(t - hang, 0.2, delay => revShot({ x, y, hang, delay, ...o })); };
    const revRingAt = (t, x, y, o = {}) => { const hang = o.hang || 0.45; fire(t - hang, 0.2, delay => revRing({ x, y, hang, delay, ...o })); };
    // ヴイーンの旋律 → 音の高さの場所から、音が鳴る瞬間に飛び出すREV弾
    const revMelody = (list, v, lo, hi, color) => list.forEach(([b, len, m], i) =>
      rev(beat(b), px(m, lo, hi), 26, { v, hang: len >= 1 ? 0.5 : 0.3, rise: 0.12, r: len >= 1 ? 9 : 7, lead: i % 2 === 1, color: typeof color === 'function' ? color(i) : color }));

    // ===== WARNING 0〜8小節 ｜ ヴイーン（うなり上がる音）= REV弾のリング ／ ロックオン ==========
    for (let k = 0; k < 8; k += 2) { revRingAt(bar(k) + 0.3, CX, 260, { count: 12 + k * 2, v: 380 + k * 20, start: k * 0.2, color: RED }); hit(bar(k) + 0.3, 0.4); }
    SC.kick.filter(b => b < 32 && b % 4 !== 0).forEach((b, i) => corner(beat(b), i % 2 === 0, 260, WHITE, 7));
    for (const k of [3, 5, 6, 7]) lock(bar(k) + 2 * B);

    // ===== EXTREME 8〜24小節 ｜ ヴイーンの刻み = すみでうなって飛ぶREV弾 ／ 16小節目から EXエコー =====
    hit(bar(8), 1);
    SC.stab.filter(([b]) => b >= 32 && b < 96).forEach(([b], i) =>
      rev(beat(b) + 0.45, i % 2 ? W - 30 : 30, 30, { v: 640, hang: 0.45, lead: i % 3 === 2, color: i % 5 === 0 ? GOLD : RED }));
    for (const k of [10, 14]) fire(bar(k), 1.0, delay => firewall({ gapX: rand(140, W - 140), gapW: 120, steps: 6, step: 1, delay, color: VIOLET }));
    for (let k = 9; k < 24; k += 2) revRingAt(bar(k) + 2 * B, CX, 120, { count: 10, v: 420, start: k * 0.3, color: WHITE });
    echoOn(bar(16), 1.5);
    for (let k = 16; k < 24; k += 2) lock(bar(k) + 3 * B);
    echoOff(bar(24));

    // ===== CHARGE 24〜32小節 ｜ スネア連打 = REV弾のうず（うなってから一気に外へ）／ ロックオンの連打 ==
    SC.snare.filter(b => b >= 96 && b < 126).forEach((b, i) =>
      fire(beat(b), 0.2, delay => { for (const o of [0, Math.PI]) revShot({ x: CX, y: 240, a: i * 0.45 + o, v: 360 + i * 4, hang: 0.5, aim: false, delay, color: i % 2 ? GOLD : RED }); }));
    for (let k = 26; k < 32; k++) lock(bar(k) + 2 * B, { track: 0.7, lock: 0.35, r: 50 });
    burst(beat(127), () => { flash(0.6); shake(10); });

    // ===== EX DRIVE 32〜48小節 ｜ 旋律 = REV弾 ／ EXエコー（1.5秒）／ リング ／ ロックオン ==============
    hit(bar(32), 1);
    echoOn(bar(32), 1.5);
    revMelody(SC.drop1, 700, 74, 90, i => (i % 2 ? RED : WHITE));
    SC.kick.filter(b => b >= 128 && b < 192 && b % 2 === 1).forEach((b, i) => corner(beat(b), i % 2 === 0, 340, i % 4 === 3 ? GOLD : RED, 8));
    for (let k = 32; k < 48; k += 2) revRingAt(bar(k), CX, 140, { count: 14, v: 440, start: k * 0.37, color: GOLD });
    for (let k = 33; k < 48; k += 2) lock(bar(k) + 2 * B);
    echoOff(bar(48));

    // ===== OVERLOAD 48〜56小節 ｜ 重い2拍目 = 3連ロックオン ／ 足もとからREV弾 ／ 穴 =================
    hit(bar(48), 0.8);
    for (let k = 48; k < 56; k++) {
      for (let j = 0; j < 3; j++) lock(bar(k) + (2 + j * 0.5) * B, { track: 0.55 + j * 0.15, lock: 0.3, r: 46, color: j === 1 ? VIOLET : RED });
      for (const x of [60, W - 60]) rev(bar(k) + 3 * B, x, GROUND_Y - 16, { v: 560, hang: 0.35, color: VIOLET });
    }
    for (const k of [49, 53]) holeAtPlayer(bar(k));

    // ===== REVERSAL 56〜64小節 ｜ さかさまの画面で EXエコー ＋ 3本のREVうず ===========================
    burst(bar(56), () => { stageHint('↻ UPSIDE DOWN', B * 4); stageTo({ spin: Math.PI }, 2 * B); });
    echoOn(bar(57), 1.3);
    for (let b = 228; b < 252; b += 2) fire(beat(b), 0.2, delay => {
      const a = (b - 228) * 0.35;
      for (const o of [0, TAU / 3, 2 * TAU / 3]) revShot({ x: CX, y: 220, a: a + o, v: 420, hang: 0.45, aim: false, delay, color: PINK });
    });
    burst(bar(62), () => stageTo({ spin: 0 }, 2 * B));
    echoOff(bar(63));
    revRingAt(bar(64), CX, 260, { count: 24, v: 480, color: WHITE });
    revRingAt(bar(64), CX, 260, { count: 12, v: 300, start: 0.13, r: 11, color: RED });

    // ===== EXTREME EX 64〜88小節 ｜ EXエコー（1.2秒）＋ 旋律のREV弾 ＋ REVの扇 ＋ ロックオン ＋ 傾き =====
    hit(bar(64), 1);
    echoOn(bar(65), 1.2);
    revMelody(SC.drop2, 760, 75, 93, i => (i % 2 ? RED : GOLD));
    SC.snare.filter(b => b >= 256 && b < 352).forEach((b, i) => {
      const x = i % 2 === 0 ? 24 : W - 24;
      fire(beat(b) - 0.3, 0.2, delay => { for (const o of [-0.18, 0, 0.18]) revShot({ x, y: 24, v: 600, hang: 0.3, aim: true, lead: i % 2 === 1, spread: o, delay, color: i % 3 ? RED : WHITE }); });
    });
    for (let k = 64; k < 88; k++) if (k % 2 === 1) lock(bar(k) + 3 * B, { track: 0.8, lock: 0.4 });
    for (let k = 68; k < 88; k += 4) revRingAt(bar(k), CX, 110, { count: 18, v: 460, start: k * 0.29, color: WHITE });
    [[72, 0.2], [76, -0.2], [80, 0.22], [84, -0.22], [87, 0]].forEach(([k, a]) => tilt(bar(k), a));
    echoOff(bar(88));

    // ===== LIMIT BREAK 88〜96小節 ｜ 1小節ごとに左右反転 ＋ EXエコー（0.9秒）＋ 半拍ごとのREV弾 ========
    hit(bar(88), 1);
    burst(bar(88), () => stageTo({ tilt: 0, conveyor: 0 }, B));
    echoOn(bar(88), 0.9);
    for (let k = 88; k < 96; k++) {
      burst(bar(k), () => stageTo({ mirror: k % 2 ? 1 : -1 }, B * 0.6));
      for (let h = 0; h < 8; h++) rev(bar(k) + h * B * 0.5, h % 2 === 0 ? 24 : W - 24, 24, { v: 620, hang: 0.3, lead: h % 4 === 3, color: h % 2 ? WHITE : RED });
      if (k % 2 === 0) lock(bar(k) + 3 * B, { track: 0.7, lock: 0.35 });
    }
    echoOff(bar(96));

    // ===== おわり 96〜 ｜ 最後のドーン ===========================================================
    burst(bar(96), () => stageTo({ mirror: 1, tilt: 0, conveyor: 0, spin: 0, wl: 0, wr: W }, B));
    hit(bar(96), 1);
    revRingAt(bar(96), CX, 260, { count: 40, v: 520, color: WHITE });
    revRingAt(bar(96), CX, 260, { count: 20, v: 340, start: 0.13, r: 11, color: RED });

    return cues.sort((a, b) => a.t - b.t);
  }

  addSong({
    id: 'extremeex-classic',
    variantOf: 'extremeex',          // リメイク版（id: 'extremeex'）の別の譜面
    variant: '旧譜面',
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
    bestKey: 'dodge_best_extremeex',   // ベストタイムの保存先（リメイク前からの記録はこちら）
  });
})();
