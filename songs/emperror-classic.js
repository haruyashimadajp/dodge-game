"use strict";

/* =========================================================================
   the EmpErroR 【旧譜面（CLASSIC）】
   リメイク前の譜面と見た目（ネオン）を、そのまま残したもの。タイトル画面の「譜面」ボタンで
   リメイク版（songs/emperror.js）と切りかえられる。
   名前がリメイク版とぶつからないよう、ファイル全体を (function () { ... })() で包んでいる。
   ========================================================================= */
(function () {

  /* =========================================================================
     曲①  the EmpErroR  —  拍・場面・譜面（弾幕）
     このファイルを丸ごとまねすれば、新しい曲を追加できます（MANUAL.md 参照）。
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
    { t: 0,       name: 'INTRO',       sub: 'すみからの狙い撃ち',   sky: ['#1a0f3a', '#07050f'], color: '#ff4d6d', shape: 3,  pulse: 0.006, stars: 25 },
    { t: 8.865,   name: 'HEXAGON',     sub: '回る六角形',           sky: ['#0b2447', '#050b1a'], color: '#4cc9f0', shape: 6,  pulse: 0.010, stars: 45 },
    { t: 16.865,  name: 'FIREWORKS',   sub: '花火',                 sky: ['#2b1045', '#0b0514'], color: '#ffd166', shape: 5,  pulse: 0.010, stars: 45 },
    { t: 24.865,  name: 'CROSSFIRE',   sub: '跳ぶ弾・跳ばない弾',   sky: ['#0f2e2b', '#04100e'], color: '#2ef2b1', shape: 4,  pulse: 0.008, stars: 35 },
    { t: 32.865,  name: 'BOUNCE',      sub: 'はね玉',               sky: ['#1d2b53', '#070b19'], color: '#7aa2ff', shape: 8,  pulse: 0.010, stars: 40 },
    { t: 40.865,  name: 'VORTEX',      sub: 'サビ ─ 渦',            sky: ['#3a0a2e', '#10030c'], color: '#ff3ea5', shape: 6,  pulse: 0.020, stars: 90,  beams: true },
    { t: 48.865,  name: 'SWEEP',       sub: '首ふり連射',           sky: ['#2d0b45', '#0c0318'], color: '#b388ff', shape: 7,  pulse: 0.018, stars: 90,  beams: true, sway: 0.8 },
    { t: 56.865,  name: 'HUNTER',      sub: '追尾弾',               sky: ['#40120c', '#120403'], color: '#ff7b3d', shape: 3,  pulse: 0.018, stars: 90,  beams: true },
    { t: 63.8,    name: '',            sub: '',                     sky: ['#07070d', '#000000'], color: '#8888aa', shape: 0,  pulse: 0,     stars: 8 },
    { t: 65.865,  name: 'METEOR',      sub: '隕石',                 sky: ['#3b1204', '#0e0402'], color: '#ffb347', shape: 3,  pulse: 0.012, stars: 60 },
    { t: 72.865,  name: 'CURTAIN',     sub: 'すき間をくぐれ',       sky: ['#06283d', '#020b12'], color: '#47e5ff', shape: 4,  pulse: 0.010, stars: 50 },
    { t: 80.865,  name: 'RISE',        sub: 'ななめの雨',           sky: ['#1b1b3a', '#06060f'], color: '#9d4edd', shape: 5,  pulse: 0.012, stars: 80,  zoom: [1, 1.025] },
    { t: 88.865,  name: 'GEYSER',      sub: '足元に注意',           sky: ['#062b27', '#010a09'], color: '#00f5d4', shape: 6,  pulse: 0.014, stars: 120, zoom: [1.025, 1.07] },
    { t: 96.865,  name: 'CHORUS II',   sub: '逆回転の渦',           sky: ['#4a0d1f', '#12030a'], color: '#ff2e63', shape: 6,  pulse: 0.022, stars: 140, beams: true, sway: 1.6 },
    { t: 104.865, name: 'BLOOM',       sub: '花と花火',             sky: ['#3d0b3f', '#0f0312'], color: '#ff8fe5', shape: 8,  pulse: 0.020, stars: 140, beams: true, sway: 1.2 },
    { t: 112.75,  name: 'CLOSING IN',  sub: 'せまる輪から逃げろ',   sky: ['#0a1a2f', '#02060d'], color: '#e0e7ff', shape: 12, pulse: 0.014, stars: 70,  sway: 0.6 },
    { t: 120.25,  name: 'FADE',        sub: '',                     sky: ['#0b0b1a', '#000000'], color: '#a0a8ff', shape: 3,  pulse: 0.004, stars: 20 },
  ];

  /* ---- 譜面（曲のどの時間に弾を出すか）-----------------------------------
     "the EmpErroR.mp3"  全長128.8秒 / 120 BPM（1拍0.5秒・1小節=4拍=2秒）
     最初の小節の頭 = 0.865秒。曲は 8秒（4小節）ごとにフレーズが変わります。

     ● フレーズごとに「主役の攻撃」を変えています（同じ主役は2回使わない）
         0.9〜  8.9  イントロ   … すみからの大玉狙い撃ち
         8.9〜 16.9  A1         … 回る六角形 ＋ 雨
        16.9〜 24.9  A2         … 花火 ＋ 3方向の狙い撃ち
        24.9〜 32.9  B1         … 横から「低い弾(跳ぶ)」「高い弾(跳ばない)」
        32.9〜 40.9  B2         … はね玉 ＋ 揺れる弾
        40.9〜 48.9  サビ1-1    … 真ん中からの渦
        48.9〜 56.9  サビ1-2    … 上すみからの首ふり連射
        56.9〜 63.8  サビ1-3    … 追尾弾 ＋ 裏拍の扇
        63.8〜 65.9  ブレイク   … ゆっくり落ちる大玉だけ
        65.9〜 72.9  C1         … 隕石（強いキックのたびに落ちてくる）
        72.9〜 80.9  C2         … すき間のある横一列
        80.9〜 88.9  盛り上げ1  … ななめに交差する雨
        88.9〜 96.9  盛り上げ2  … 足元からの噴水 ＋ 細かい雨
        96.9〜104.9  サビ2-1    … 左右の逆回転の渦
       104.9〜112.7  サビ2-2    … 広がる花 ＋ 花火
       112.7〜120.2  アウトロ   … せまってくる輪
       120.2〜128.8  フェード   … ゆっくりの雪

     ● 強い音（解析で目立った瞬間）には特別な弾幕
         impact(t) … 画面が光る ＋ 真ん中から大きなリング ＋ 地面の衝撃波（いちばん強い音）
         meteor    … 隕石がちょうどその音で地面に落ちる（強い音）
         hit(t)    … 画面が少し光るだけ

     タイムラインは曲の再生時刻で動くので、キューは拍にそろって発動します。
         burst(時刻, () => { spawn(...) });          ← その時刻に1回だけ実行
         fire(時刻, 警告秒, delay => ring({ ..., delay }));
                                                    ← 警告を出して、ちょうど「時刻」に発射
         beat(n) = n拍目の時刻 / bar(k) = k小節目の頭の時刻

     ● 曲に合わせて動く弾
         step: 1    … 拍ごとに「グッ」と進む（イントロの大玉・CURTAIN の横一列・CLOSING IN の輪）
         step: 0.5  … 8分音符ごと（VORTEX の渦）
         pulse: 12  … 拍のたびにふくらむ図形（HEXAGON・38.9秒の3重リング・BLOOM の花）
     -------------------------------------------------------------------------- */
  function emperrorChart() {
    const cues = [];
    const cx = W / 2, cy = H / 3;          // 上の方の中心（ここから撃つ）

    // 時刻 t に弾を出す命令を予約する（時間順は最後の sort が直してくれる）
    const burst = (t, fn) => cues.push({ t, fn });

    // 拍の時刻（上の emperrorBeatTime と同じ。106秒あたりで拍のずれを直している）
    const beat = beatTime;                                     // n拍目（0始まり、小数もOK）
    const bar  = k => beat(k * 4);                             // k小節目の頭

    // ちょうど t 秒に「発射」させる: warn 秒前に召喚して、警告リングを warn 秒出す。
    const fire = (t, warn, fn) => burst(t - warn, () => fn(warn));

    // この譜面でよく使う部品 -------------------------------------------------
    // 上から降る雨つぶ（大きさ・速さは少しランダム）
    const drop = (delay, { rMin = 7, rMax = 12, vMin = 180, vMax = 240 } = {}) => {
      const r = rand(rMin, rMax);
      spawn({ x: rand(r, W - r), y: 20, vy: rand(vMin, vMax), r, delay });
    };
    // 画面の横はしから地面ぞいに飛んでくる弾
    //   LOW = 地面すれすれ → ジャンプでよける / MID = 頭の上 → 跳ばずにやりすごす
    const LOW = GROUND_Y - 10, MID = GROUND_Y - 70;
    const wall = (fromLeft, y, speed, delay) =>
      spawn({ x: fromLeft ? 10 : W - 10, y, vx: fromLeft ? speed : -speed, r: 10, delay, lane: [fromLeft ? 1 : -1, 0] });

    // ---- 強い音用の特別な弾幕 ----
    // 画面が光って、少しズームする
    const hit = (t, amount = 0.5) => burst(t, () => { flash(amount); punch(0.02 * amount); });
    // いちばん強い音: 光る・ゆれる・ノイズ ＋ 真ん中から大きなリング ＋ 地面を左右に走る衝撃波
    const impact = (t, { count = 32, speed = 230 } = {}) => {
      hit(t, 1);
      burst(t, () => {
        shake(20); punch(0.08); glitch(0.8);
        shockRing(cx, cy, { color: '#ffffff', size: 520, life: 0.8, width: 10 });
        sparks(cx, cy, { n: 60, color: '#ffffff', speed: 520, life: 0.8, size: 3, gravity: 0 });
      });
      fire(t, 0.8, delay => ring({ x: cx, y: cy, count, speed, r: 7, delay }));
      fire(t, 0.8, delay => { wall(true, LOW, 230, delay); wall(false, LOW, 230, delay); });
    };
    // 隕石がちょうど t 秒に地面へ落ちる（プレイヤーの今いる所をねらう）
    const METEOR_FALL = 1000, METEOR_TIME = (GROUND_Y - 28 - 40) / METEOR_FALL;
    const meteorAt = (t, warn = 0.6) =>
      fire(t - METEOR_TIME, warn, delay => meteor({ x: playerXY().x, y: 40, fall: METEOR_FALL, r: 28, delay }));

    // ===== イントロ 0.9〜8.9秒 ｜ すみからの大玉狙い撃ち ======================
    hit(bar(0), 0.8);                                                  // 0.9s 曲の始まり（光るだけ）
    for (let k = 1; k < 4; k++) {
      const x = k % 2 === 0 ? 120 : W - 120;
      // step: 1 → 拍に合わせて「ドン、ドン」と迫ってくる
      fire(bar(k), 0.6, delay => { const v = aimVel(x, 40, 260); spawn({ x, y: 40, vx: v.vx, vy: v.vy, r: 16, delay, step: 1 }); });
      fire(beat(k * 4 + 2), 0.4, delay => drop(delay, { rMin: 6, rMax: 8 }));
    }
    // 7.0〜8.9秒 ドラムの連打 → 渦がぐるっと1周 ＋ 7.9s の強いキックで隕石
    fire(7.0, 0.5, delay => spiral({ x: cx, y: cy, count: 24, speed: 180, r: 6, turns: 1, gap: 1.86 / 24, delay }));
    meteorAt(7.87);

    // ===== A1 8.9〜16.9秒 ｜ 回る六角形 ＋ 雨 =================================
    hit(bar(4), 0.7);                                                  // 8.9s Aメロ突入
    for (let k = 4; k < 8; k++) {
      for (let i = 0; i < 4; i++) fire(beat(k * 4 + i), 0.35, delay => drop(delay));   // 毎拍の雨
      const left = k % 2 === 0;                                        // 毎小節、左右交互・回転も逆
      fire(bar(k), 0.5, delay => spinShape({ x: left ? W * 0.3 : W * 0.7, y: -40, vy: 200, count: 6, size: 42, spin: left ? 2.6 : -2.6, pulse: 12, delay }));
    }

    // ===== A2 16.9〜24.9秒 ｜ 花火 ＋ 3方向の狙い撃ち =========================
    for (let k = 8; k < 12; k++) {
      const x = k % 2 === 0 ? W * 0.25 : W * 0.75;                     // 地面から打ち上がって空中で破裂
      fire(bar(k), 0.6, delay => firework({ x, y: GROUND_Y - 12, vx: k % 2 === 0 ? 60 : -60, vy: -560, fuse: 0.9, count: 16, speed: 150, delay }));
      for (const i of [1, 3]) {
        fire(beat(k * 4 + i), 0.4, delay => fan({ x: rand(100, W - 100), y: 30, count: 3, spread: 0.35, speed: 230, r: 7, delay }));
      }
      fire(beat(k * 4 + 2), 0.35, delay => drop(delay, { rMin: 6, rMax: 9 }));
    }

    // ===== B1 24.9〜32.9秒 ｜ 横から低い弾・高い弾 ============================
    // 低い弾（跳ぶ）と高い弾（跳ばない）が交互に来る。足場の上は安全地帯。
    for (let k = 12; k < 16; k++) {
      const L = k % 2 === 0;                                           // 小節ごとに左右を入れかえ
      fire(bar(k),          0.5, delay => wall(L,  LOW, 240, delay));
      fire(beat(k * 4 + 2), 0.5, delay => wall(!L, MID, 240, delay));
      // 足場にずっといられないように、回りながら降ってくる正方形
      if (k % 2 === 1) fire(bar(k), 0.5, delay => spinShape({ x: rand(150, W - 150), y: -40, count: 4, size: 38, spin: 2.4, vy: 210, delay }));
    }
    meteorAt(beat(52));                                                // 26.9s 強いキック

    // ===== B2 32.9〜40.9秒 ｜ はね玉 ＋ 揺れる弾 ===============================
    hit(bar(16), 0.7);                                                 // 32.9s
    fire(bar(16), 0.5, delay => bouncer({ x: 40,     y: 60, vx:  170, hop: 640, r: 13, life: 7, delay }));
    fire(bar(18), 0.5, delay => bouncer({ x: W - 40, y: 60, vx: -170, hop: 640, r: 13, life: 6, delay }));
    fire(bar(17), 0.5, delay => bouncer({ x: cx,     y: 60, vx: rand(-120, 120), hop: 700, r: 11, life: 6, delay }));
    for (let k = 16; k < 19; k++) {
      for (let i = 0; i < 4; i++) fire(beat(k * 4 + i), 0.4, delay => wave({ x: rand(80, W - 80), y: 20, fall: 150, amp: 50, freq: 4, r: 8, delay }));
    }
    // 38.9s サビ前のため: 回りながら広がる3重リング
    for (const [spin, grow] of [[0.5, 95], [0.6, 90], [0.7, 85]]) {
      fire(bar(19), 0.6, delay => spinShape({ x: cx, y: cy, count: 14, size: 0, spin, grow, r: 6, pulse: 14, delay }));
    }

    // ===== サビ1-1 40.9〜48.9秒 ｜ 真ん中からの渦 ==============================
    impact(bar(20));                                                   // 40.9s サビ突入
    for (let k = 21; k < 24; k++) {
      // 16分音符ごとに1発、1小節で1周する渦（小節ごとに回る向きが逆）
      // step: 0.5 → 8分音符ごとに全部の弾がそろって「グッ」と進む
      fire(bar(k), 0.4, delay => spiral({ x: cx, y: cy, count: 16, speed: 190, r: 6, turns: k % 2 ? -1 : 1, gap: 0.125, start: k * 0.4, step: 0.5, delay }));
      for (const i of [1, 3]) fire(beat(k * 4 + i), 0.35, delay => drop(delay, { rMin: 6, rMax: 10 }));
    }

    // ===== サビ1-2 48.9〜56.9秒 ｜ 上すみからの首ふり連射 ======================
    for (let k = 24; k < 28; k++) {
      const left = k % 2 === 0;                                        // 小節ごとに左すみ / 右すみ
      fire(bar(k), 0.5, delay => sweep({
        x: left ? 40 : W - 40, y: 40, count: 16, speed: 230, r: 7, gap: 0.125,
        aim: left ? 1.0 : Math.PI - 1.0, swing: 0.6, swings: 1, delay,
      }));
      fire(beat(k * 4 + 2), 0.35, delay => drop(delay, { rMin: 6, rMax: 9 }));
    }
    meteorAt(beat(108));                                               // 54.9s 強い音

    // ===== サビ1-3 56.9〜63.8秒 ｜ 追尾弾 ＋ 裏拍の扇 ==========================
    for (let k = 28; k < 31; k++) {
      fire(bar(k), 0.5, delay => homing({ x: k % 2 ? 60 : W - 60, y: 40, speed: 170, turn: 1.6, seek: 2.2, r: 10, delay }));
      fire(beat(k * 4 + 1.5), 0.4, delay => fan({ x: 60,     y: 40, count: 3, spread: 0.3, speed: 240, r: 7, delay }));
      fire(beat(k * 4 + 3.5), 0.4, delay => fan({ x: W - 60, y: 40, count: 3, spread: 0.3, speed: 240, r: 7, delay }));
    }
    fire(bar(31), 0.6, delay => ring({ x: cx, y: cy, count: 30, speed: 150, r: 9, delay }));   // 62.9s サビ1のしめ

    // ===== ブレイク 63.8〜65.9秒（音が消える）｜ ゆっくり落ちる大玉だけ ======
    [[128, 0.2], [129, 0.8]].forEach(([n, fx]) =>
      fire(beat(n), 0.5, delay => spawn({ x: W * fx, y: -10, vy: 110, r: 22, delay })));

    // ===== C1 65.9〜72.9秒 ｜ 隕石 ============================================
    impact(beat(130), { count: 28, speed: 200 });                      // 65.9s 音が戻る（いちばん強い音）
    // 67.9 / 69.9 / 71.9s: 強いキックのたびに隕石が落ちてくる。その間は揺れる弾
    for (const n of [134, 138, 142]) {
      meteorAt(beat(n));
      fire(beat(n + 1), 0.4, delay => wave({ x: rand(80, W / 2 - 40),     y: 20, fall: 160, amp: 50, freq: 4, r: 8, delay }));
      fire(beat(n + 2), 0.4, delay => wave({ x: rand(W / 2 + 40, W - 80), y: 20, fall: 160, amp: 50, freq: 4, r: 8, delay }));
    }
    hit(beat(134), 0.8);                                               // 67.9s はとくに強いので強めに光る

    // ===== C2 72.9〜80.9秒 ｜ すき間のある横一列 ==============================
    // 2小節ごとに、穴がひとつだけ空いた横一列が拍ごとにガクッ、ガクッと降りてくる → 穴の下に入る
    for (const k of [36, 38]) {
      fire(bar(k), 0.6, delay => curtain({ y: 20, gapX: rand(150, W - 150), gapW: 120, spacing: 30, vy: 150, r: 9, step: 1, delay }));
    }
    // 73.2〜73.9s ドラムのフィル: 素早い狙い撃ち4連
    [73.24, 73.49, 73.72, 73.86].forEach(t =>
      fire(t, 0.3, delay => { const v = aimVel(cx, -10, 300); spawn({ x: cx, y: -10, vx: v.vx, vy: v.vy, r: 8, delay }); }));
    // 73.9 / 75.9 / 77.9 / 79.9s の強いキック: 光って、左右の上すみから小さなリング
    [146, 150, 154, 158].forEach((n, i) => {
      hit(beat(n), 0.5);
      fire(beat(n), 0.5, delay => ring({ x: i % 2 ? W - 60 : 60, y: 60, count: 12, speed: 170, r: 7, start: i * 0.3, delay }));
    });

    // ===== 盛り上げ1 80.9〜88.9秒 ｜ ななめに交差する雨 ========================
    impact(beat(162), { count: 36, speed: 240 });                      // 81.9s いちばん強い一撃
    for (let n = 164; n < 176; n++) {                                  // 毎拍、左上と右上から交互にななめの雨
      const fromLeft = n % 2 === 0;
      fire(beat(n), 0.35, delay => {
        for (let j = 0; j < 2; j++) {
          const x = fromLeft ? rand(0, W * 0.5) : rand(W * 0.5, W);
          spawn({ x, y: 20, vx: fromLeft ? 110 : -110, vy: 210, r: rand(7, 10), delay });
        }
      });
    }

    // ===== 盛り上げ2 88.9〜96.9秒 ｜ 足元からの噴水 ＋ 細かい雨 ================
    for (let k = 44; k < 47; k++) {
      for (let i = 0; i < 8; i++) fire(beat(k * 4 + i / 2), 0.3, delay => drop(delay, { rMin: 5, rMax: 8, vMin: 200, vMax: 260 }));
      fire(bar(k), 0.7, delay => geyser({ x: playerXY().x, count: 7, gap: 0.08, speed: 520, r: 10, delay }));
    }
    fire(beat(183), 0.5, delay => ring({ x: W * 0.25, y: cy, count: 14, speed: 180, r: 7, delay }));  // 92.4s
    fire(beat(187), 0.5, delay => ring({ x: W * 0.75, y: cy, count: 14, speed: 180, r: 7, delay }));  // 94.4s
    // 94.9〜95.9s サビ直前: 2周する渦の連発
    [188, 189].forEach((n, i) =>
      fire(beat(n), 0.5, delay => spiral({ x: cx, y: cy, count: 36, speed: 220, r: 6, turns: 2, gap: 0.015, start: i * 1.1, delay })));

    // ===== サビ2-1 96.9〜104.9秒 ｜ 左右の逆回転の渦 ===========================
    impact(bar(48), { count: 30, speed: 200 });                        // 96.9s サビ2突入
    for (let k = 49; k < 52; k++) {
      const dir = k % 2 ? 1 : -1;                                      // 8分音符ごと、左右の2か所から逆向きに
      fire(bar(k), 0.4, delay => spiral({ x: W * 0.25, y: cy, count: 8, speed: 180, r: 6, turns:  dir, gap: 0.25, start: k * 0.5, delay }));
      fire(bar(k), 0.4, delay => spiral({ x: W * 0.75, y: cy, count: 8, speed: 180, r: 6, turns: -dir, gap: 0.25, start: k * 0.5, delay }));
      for (const i of [1, 3]) fire(beat(k * 4 + i), 0.35, delay => drop(delay));
    }
    meteorAt(bar(50));                                                 // 100.9s 強い音

    // ===== サビ2-2 104.9〜112.7秒 ｜ 広がる花 ＋ 花火 ==========================
    for (let k = 52; k < 56; k++) {
      if (k % 2 === 0) {
        fire(bar(k), 0.5, delay => spinShape({ x: cx, y: cy, count: 10, size: 0, spin:  1.2, grow: 110, r: 7, pulse: 16, delay }));
        fire(bar(k), 0.5, delay => spinShape({ x: cx, y: cy, count: 10, size: 0, spin: -1.2, grow: 110, r: 7, start: Math.PI / 10, pulse: 16, delay }));
      } else {
        fire(bar(k), 0.6, delay => firework({ x: W * 0.15, y: GROUND_Y - 12, vx:  140, vy: -600, fuse: 0.8, count: 14, speed: 160, delay }));
        fire(bar(k), 0.6, delay => firework({ x: W * 0.85, y: GROUND_Y - 12, vx: -140, vy: -600, fuse: 0.8, count: 14, speed: 160, delay }));
      }
      fire(beat(k * 4 + 2), 0.5, delay => wall(k % 2 === 0, LOW, 280, delay));
      for (const i of [1, 3]) fire(beat(k * 4 + i), 0.35, delay => drop(delay));
    }
    meteorAt(beat(214));                                               // 107.8s 強い音

    // ===== アウトロ 112.7〜120.2秒 ｜ せまってくる輪 ===========================
    // 112.7s フィナーレ: 2周の大きな渦
    hit(bar(56), 0.8);
    fire(bar(56), 0.6, delay => spiral({ x: cx, y: cy, count: 48, speed: 200, r: 7, turns: 2, gap: 0.03, delay }));
    // 114.8 / 115.8 / 117.8s の強い音: プレイヤーを囲む輪が拍ごとにグッとせまってくる → すき間から外へ出る
    [228, 230, 234].forEach((n, i) => {
      hit(beat(n), 0.6);
      fire(beat(n), 0.7, delay => {
        const p = playerXY();
        closeIn({ x: p.x, y: p.y, count: 14, size: 380, speed: 130, spin: i % 2 ? 0.5 : -0.5, r: 8, delay });
      });
    });
    fire(beat(236), 0.5, delay => bouncer({ x: 40, y: 60, vx: 150, hop: 600, r: 14, life: 5, delay }));  // 118.8s

    // ===== フェードアウト 120.2〜128.8秒 ｜ ゆっくりの雪 ======================
    fire(beat(239), 0.8, delay => ring({ x: cx, y: cy, count: 12, speed: 120, r: 10, delay }));  // 最後の一発
    // あとは雪のようにゆっくり降るだけ（曲の最後まで生き残ればクリア）
    for (let t = beat(242); t < 126; t += 1.0) {
      burst(t, () => spawn({ x: rand(20, W - 20), y: -10, vy: rand(70, 100), r: 5 }));
    }

    return cues.sort((a, b) => a.t - b.t);
  }


  addSong({
    id: 'emperror-classic',
    variantOf: 'emperror',           // リメイク版（id: 'emperror'）の別の譜面
    variant: '旧譜面',
    title: 'the EmpErroR',
    meta: '120 BPM · 2:09 · ネオンの弾幕',
    file: 'the EmpErroR.mp3',        // 中身は AAC（MP4）。ブラウザはそのまま再生できる
    bpm: 120, beat: 0.5, end: 128.8,
    beatTime: emperrorBeatTime,
    beatPos: emperrorBeatPos,
    env: ENV_EMPERROR,               // 曲の音量データ（songs/emperror-env.js）
    sections: EMPERROR_SECTIONS,
    build: emperrorChart,
    theme: 'neon',                   // visuals.js の見た目のセット
    titleLook: { sky: ['#160a33', '#05030d'], color: '#ff3ea5', shape: 6, pulse: 0.01, beams: true, stars: 40 },
    preview: 40.9,                   // タイトルで流す試聴の開始秒（サビ）
    bestKey: 'dodge_best',           // ベストタイムの保存先（リメイク前からの記録はこちら）
  });
})();
