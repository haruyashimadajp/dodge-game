"use strict";

/* =========================================================================
   曲②  Re:Unknown X  —  拍・場面・譜面（弾幕）
   テーマは「正体不明のデータ X に侵入されたシステム」。
   丸い弾ではなく四角いブロック（データ）、そしてレーザー（ビーム）が主役。
   強い音ではかならず「X の字」のレーザーが走って、画面の色が反転する。
   ========================================================================= */

// ---- 拍のきざみ ------------------------------------------------------------
// 190 BPM: 1拍 = 60/190 ≈ 0.316秒。最初の拍 = 0.275秒。
// 小節（4拍）の頭は 2拍目から: bar(0) = 0.907秒。4小節 ≈ 5.05秒ごとにフレーズが変わる。
const UNKNOWN_BEAT = 60 / 190;
function unknownBeatTime(n) { return 0.275 + n * UNKNOWN_BEAT; }    // n拍目の時刻
function unknownBeatPos(t)  { return (t - 0.275) / UNKNOWN_BEAT; }  // t秒は何拍目か（小数）

/* ---- 場面（セクション）ごとの見た目 ---------------------------------------
   曲①と同じ書き方（t / name / sub / sky / color / pulse / zoom）に加えて、
   この曲の見た目（visuals.js の cyber）だけが使う値:
     rain   … 背景を流れる文字の雨の速さ（0 で止まる）
     emblem … 真ん中の大きな X の濃さ（0〜1）
     snap   … 2拍ごとに画面がカクッと傾く角度（度）
     tiles  … 拍ごとに背景のマス目が光る
     noise  … 画面にずっと少しノイズが乗る（0〜1）
   -------------------------------------------------------------------------- */
const UNKNOWN_SECTIONS = [
  { t: 0,      name: 'BOOT',         sub: '未確認の信号',           sky: ['#04140f', '#010605'], color: '#39ff88', pulse: 0.004, rain: 0.25, emblem: 0.25, noise: 0.15 },
  { t: 5.96,   name: 'SCAN',         sub: 'ビームを跳び越えろ',     sky: ['#031a22', '#01070b'], color: '#00e5ff', pulse: 0.008, rain: 0.6,  emblem: 0.4 },
  { t: 11.01,  name: 'X-STRIKE',     sub: 'X の字から逃げろ',       sky: ['#22030f', '#080104'], color: '#ff2a6d', pulse: 0.014, rain: 1.0,  emblem: 0.9, tiles: true, snap: 0.6 },
  { t: 16.06,  name: 'PACKET',       sub: '瞬間移動するブロック',   sky: ['#03180e', '#010604'], color: '#39ff88', pulse: 0.010, rain: 1.0,  emblem: 0.5, tiles: true },
  { t: 26.17,  name: 'SPLIT',        sub: '割れるブロック',         sky: ['#1c1803', '#070601'], color: '#ffe14d', pulse: 0.010, rain: 0.9,  emblem: 0.5, tiles: true },
  { t: 36.28,  name: 'CROSS',        sub: 'サビ ─ 回る X',          sky: ['#24031a', '#090108'], color: '#ff2a6d', pulse: 0.020, rain: 1.6,  emblem: 1.0, tiles: true, snap: 1.2 },
  { t: 46.38,  name: 'COLUMN',       sub: '柱の波をくぐれ',         sky: ['#03141f', '#01060a'], color: '#00e5ff', pulse: 0.016, rain: 1.4,  emblem: 0.7, tiles: true, snap: 0.8 },
  { t: 56.49,  name: 'ROUTER',       sub: '追いかけるパケット',     sky: ['#12052a', '#05010e'], color: '#b26bff', pulse: 0.012, rain: 1.0,  emblem: 0.5, tiles: true },
  { t: 66.59,  name: 'CROSS II',     sub: 'X の連打',               sky: ['#2a0412', '#0b0105'], color: '#ff2a6d', pulse: 0.022, rain: 1.8,  emblem: 1.0, tiles: true, snap: 1.4 },
  { t: 76.70,  name: 'FIREWALL',     sub: '穴をくぐれ',             sky: ['#241004', '#0a0401'], color: '#ff8a3d', pulse: 0.014, rain: 1.2,  emblem: 0.6, tiles: true, zoom: [1, 1.04] },
  { t: 86.80,  name: '???',          sub: '……',                    sky: ['#05080b', '#000000'], color: '#7d93a8', pulse: 0.002, rain: 0.12, emblem: 0.15, noise: 0.35 },
  { t: 96.91,  name: 'REBOOT',       sub: '再起動',                 sky: ['#04140f', '#010605'], color: '#39ff88', pulse: 0.010, rain: 0.8,  emblem: 0.5, zoom: [1, 1.06], noise: 0.1 },
  { t: 104.48, name: 'Re:Unknown X', sub: '最後のサビ',             sky: ['#2c0318', '#0b0106'], color: '#ff2a6d', pulse: 0.024, rain: 2.0,  emblem: 1.0, tiles: true, snap: 1.6 },
  { t: 117.12, name: 'OVERRIDE',     sub: 'すべての形態',           sky: ['#03161f', '#01060a'], color: '#00e5ff', pulse: 0.020, rain: 1.8,  emblem: 0.9, tiles: true, snap: 1.0 },
  { t: 127.22, name: 'DECODE',       sub: '拍に合わせて跳べ',       sky: ['#1d1803', '#080601'], color: '#ffe14d', pulse: 0.020, rain: 1.6,  emblem: 0.9, tiles: true, snap: 0.8 },
  { t: 137.33, name: 'EOF',          sub: 'ファイルの終わり',       sky: ['#060d14', '#000000'], color: '#e8f6ff', pulse: 0.008, rain: 0.5,  emblem: 0.6, noise: 0.2 },
];

/* ---- 譜面 -------------------------------------------------------------------
   "Re-Unknown_X.mp3"  190 BPM / 約145秒で終わり（そこまで生き残ればクリア）
       0.9〜  6.0  BOOT      … 瞬間移動しながら落ちてくるブロック（ブリンク）
       6.0〜 11.0  SCAN      … 横に走るビーム（低い → 跳ぶ / 高い → 跳ばない）
      11.0〜 16.1  X-STRIKE  … X の字のレーザー ＋ 縦の柱
      16.1〜 26.2  PACKET    … 横から瞬間移動してくるブロック ＋ データの滝
      26.2〜 36.3  SPLIT     … 2拍ごとに X の形に割れるブロック
      36.3〜 46.4  CROSS     … サビ: 拍でカクッと回る X ＋ プレイヤーに X
      46.4〜 56.5  COLUMN    … 左右に走る柱の波
      56.5〜 66.6  ROUTER    … 縦横にカクカク追いかけてくるパケット
      66.6〜 76.7  CROSS II  … X の連打 ＋ 回転する X のスプリンクラー
      76.7〜 86.8  FIREWALL  … 穴の空いたビームの壁が下りてくる
      86.8〜 96.9  ???       … 音が消える。ピアノの音で「?」がゆっくり降る
      96.9〜104.5  REBOOT    … データの滝がだんだん激しく ＋ 床のビームの練習
     104.5〜117.1  Re:Unknown X … 最後のサビ。回転 X のスプリンクラー ＋ 全部
     117.1〜127.2  OVERRIDE  … いろいろな形態のメドレー
     127.2〜137.3  DECODE    … 拍に合わせて床にビーム → リズムよく跳ぶ
     137.3〜145.0  EOF       … しずかに終わる。142.4秒の最後の一撃で巨大な X

   ● 強い音（解析で目立った瞬間）には X の字のレーザー（crash）
       11.0 / 15.1 / 33.0 / 41.3 / 51.1 / 73.5 / 86.3 / 104.5 / 132.9 / 142.4 秒
   -------------------------------------------------------------------------- */
function unknownChart() {
  const cues = [];
  const cx = W / 2, cy = H / 3;
  const burst = (t, fn) => cues.push({ t, fn });
  const beat = unknownBeatTime;                       // n拍目
  const bar  = k => beat(2 + k * 4);                  // k小節目の頭（小数もOK: 0.5 = 2拍目）
  const fire = (t, warn, fn) => burst(t - warn, () => fn(warn));
  const B2 = UNKNOWN_BEAT * 2;                        // 2拍 ≈ 0.63秒（予告の基本の長さ）

  // ---- この曲の部品 ----
  const COL = { green: '#39ff88', cyan: '#00e5ff', red: '#ff2a6d', yellow: '#ffe14d', violet: '#b26bff', orange: '#ff8a3d' };
  const LOW = GROUND_Y - 12, MID = GROUND_Y - 62;
  // 上から瞬間移動しながら落ちるブロック
  const drip = (delay, o = {}) => blink({ x: rand(40, W - 40), y: 30, vy: o.vy || 190, vx: o.vx || 0, r: o.r || 9, step: 1, delay, color: o.color });
  // 横から瞬間移動してくるブロック（LOW = 跳ぶ / MID = 跳ばない）
  const side = (fromLeft, y, delay, color) => blink({ x: fromLeft ? 14 : W - 14, y, vx: fromLeft ? 260 : -260, vy: 0, r: 10, step: 1, delay, color });
  // 画面が光る（この曲では色が反転する）
  const hit = (t, amount = 0.5) => burst(t, () => { flash(amount); punch(0.02 * amount); });
  // ★強い音★ プレイヤーのいる所に X の字のレーザー ＋ 交点からブロックが X 方向へ飛ぶ
  const crash = (t, { at = 'player', blocks = 8 } = {}) => {
    let p = null;                                     // X の交点（予告を出した瞬間に決まる）
    fire(t, B2, delay => {
      p = at === 'player' ? { x: playerXY().x, y: GROUND_Y - 40 } : { x: cx, y: H * 0.42 };
      xStrike({ x: p.x, y: p.y, delay });
    });
    burst(t, () => {
      flash(0.9); shake(16); punch(0.06); glitch(0.9);
      for (let i = 0; p && i < blocks; i++) {
        const a = Math.PI / 4 + (i % 4) * (Math.PI / 2), v = i < 4 ? 260 : 170;
        spawn({ x: p.x, y: p.y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, r: 8, shape: 'block', color: COL.red });
      }
    });
  };

  // ===== BOOT 0.9〜6.0 ｜ 瞬間移動しながら落ちるブロック =====================
  hit(bar(0), 0.25);
  for (let n = 10; n < 20; n += 2) fire(beat(n), B2, delay => drip(delay, { vy: 150 }));

  // ===== SCAN 6.0〜11.0 ｜ 横に走るビーム ====================================
  // 低いビーム（地面〜46px）は跳び越える。高いビーム（地面の58px上から上全部）は跳ばずに地面で待つ
  const lowScan  = (fromLeft, delay) => scanner({ fromLeft, y1: GROUND_Y - 46, y2: GROUND_Y + 10, speed: 400, delay, color: COL.cyan });
  const highScan = (fromLeft, delay) => scanner({ fromLeft, y1: -30, y2: GROUND_Y - 58, speed: 400, delay, color: COL.yellow });
  fire(bar(4), B2, delay => lowScan(true, delay));
  fire(bar(5), B2, delay => lowScan(false, delay));
  fire(bar(6), B2, delay => highScan(true, delay));
  fire(bar(7), B2, delay => lowScan(true, delay));
  for (const k of [4, 5, 6]) fire(bar(k + 0.5), B2, delay => drip(delay, { vy: 160 }));
  hit(beat(30), 0.2); hit(beat(32), 0.3);                             // 9.7〜10.4s 盛り上がり

  // ===== X-STRIKE 11.0〜16.1 ｜ X の字 ＋ 縦の柱 ==============================
  crash(bar(8));                                                     // 11.0s 本編スタート
  // 2拍ごとに8列のうち2列へ柱。場所は左から右へずれていく
  for (let i = 0; i < 6; i++) {
    const c = (i * 3 + 1) % 8;
    fire(bar(8.5 + i * 0.5), B2, delay => columns({ cols: [c, (c + 4) % 8], delay, color: COL.red }));
  }
  crash(beat(47), { at: 'center', blocks: 4 });                      // 15.1s 強い音（画面の真ん中）

  // ===== PACKET 16.1〜26.2 ｜ 横から瞬間移動 ＋ データの滝 ===================
  for (let k = 12; k < 16; k++) {
    const L = k % 2 === 0;
    fire(bar(k),       B2, delay => side(L,  LOW, delay, COL.green));     // 低い → 跳ぶ
    fire(bar(k + 0.5), B2, delay => side(!L, MID, delay, COL.cyan));      // 高い → 跳ばない
    fire(bar(k + 0.25), B2, delay => stream({ x: rand(60, W - 60), count: 4, vy: 300, delay, color: COL.green }));
  }
  for (let k = 16; k < 20; k++) {
    // ななめに瞬間移動しながら降るブロック3つ ＋ プレイヤーの頭上にデータの滝
    for (const i of [0, 2]) {
      const fromLeft = (k + i / 2) % 2 === 0;
      fire(bar(k + i / 4), B2, delay => {
        for (let j = 0; j < 3; j++) blink({ x: fromLeft ? rand(20, W * 0.45) : rand(W * 0.55, W - 20), y: 30, vx: fromLeft ? 110 : -110, vy: 200, r: 9, delay, color: COL.green });
      });
    }
    fire(bar(k + 0.75), B2, delay => stream({ x: playerXY().x, count: 5, vy: 320, delay, color: COL.cyan }));
  }
  hit(beat(55.5), 0.5); hit(beat(64), 0.6);                          // 17.8s / 20.5s

  // ===== SPLIT 26.2〜36.3 ｜ 割れるブロック ===================================
  for (let k = 20; k < 28; k++) {
    const x = k % 2 === 0 ? W * 0.3 : W * 0.7;
    fire(bar(k), B2, delay => splitter({ x, y: 40, vy: 150, r: 20, gen: 2, every: 2, speed: 140, delay, color: COL.yellow }));
    if (k % 2 === 1) fire(bar(k + 0.5), B2, delay => drip(delay, { color: COL.yellow }));
  }
  crash(beat(103.5));                                                // 33.0s 強い音

  // ===== CROSS 36.3〜46.4 ｜ サビ: 拍でカクッと回る X ＋ プレイヤーに X =======
  for (let k = 28; k < 36; k++) {
    const left = k % 2 === 0;
    // 上すみから、拍ごとに 45° カクッと回る X がななめに横切る
    fire(bar(k), B2, delay => spinX({ x: left ? 40 : W - 40, y: -30, vx: left ? 150 : -150, vy: 150, per: 3, gap: 24, inner: 16, snap: Math.PI / 4, r: 8, delay, color: COL.red }));
    for (const i of [1, 3]) fire(beat(2 + k * 4 + i), B2, delay => drip(delay, { color: COL.red }));
  }
  crash(bar(32));                                                    // 41.3s サビの後半
  crash(bar(30)); crash(bar(34));

  // ===== COLUMN 46.4〜56.5 ｜ 左右に走る柱の波 ================================
  // 1拍に1列ずつ、柱が左→右（次は右→左）へ走る。柱が通り過ぎた直後の列へ逃げる
  for (let w = 0; w < 4; w++) {
    for (let i = 0; i < 8; i++) {
      const c = w % 2 === 0 ? i : 7 - i;
      fire(beat(2 + (36 + w * 2) * 4 + i), B2, delay => columns({ cols: [c], delay, hold: 0.2, color: COL.cyan }));
    }
    fire(bar(37 + w * 2), B2, delay => drip(delay, { color: COL.cyan }));
  }
  crash(beat(161));                                                  // 51.1s

  // ===== ROUTER 56.5〜66.6 ｜ 縦横にカクカク追いかけてくるパケット ===========
  for (let k = 44; k < 52; k++) {
    const left = k % 2 === 0;
    fire(bar(k), B2, delay => router({ x: left ? 60 : W - 60, y: 40, cell: 56, hops: 8, r: 10, delay, color: COL.violet }));
    if (k % 2 === 1) fire(bar(k + 0.5), B2, delay => side(left, LOW, delay, COL.violet));
    fire(bar(k + 0.75), B2, delay => stream({ x: rand(60, W - 60), count: 3, vy: 300, delay, color: COL.violet }));
  }
  hit(beat(189), 0.5); hit(beat(193), 0.6);                          // 60.0s / 61.2s

  // ===== CROSS II 66.6〜76.7 ｜ X の連打 ＋ 回転する X のスプリンクラー =========
  // 真ん中から、拍ごとに 45° ずつ向きを変える4方向の弾（X が回って見える）
  for (let n = 0; n < 32; n++) {
    fire(beat(2 + 52 * 4 + n), 0.3, delay => ring({ x: cx, y: cy, count: 4, speed: 200, r: 7, start: Math.PI / 4 + n * Math.PI / 8, delay, color: COL.red }));
  }
  for (let k = 52; k < 60; k += 2) crash(bar(k + 1), { blocks: 4 });
  for (const k of [52, 56]) fire(bar(k), B2, delay => splitter({ x: rand(150, W - 150), y: 40, vy: 140, r: 18, gen: 1, every: 2, speed: 150, delay, color: COL.red }));
  crash(beat(232), { at: 'center' });                                // 73.5s

  // ===== FIREWALL 76.7〜86.8 ｜ 穴の空いたビームの壁が下りてくる ===============
  for (let k = 60; k < 68; k += 2) {
    fire(bar(k), B2, delay => firewall({ gapX: rand(120, W - 120), gapW: 130, steps: 6, step: 1, delay, color: COL.orange }));
    fire(bar(k + 1), B2, delay => drip(delay, { color: COL.orange }));
  }
  hit(beat(266), 0.5);                                               // 84.3s
  crash(beat(272.5), { at: 'center', blocks: 8 });                   // 86.3s ブレイク前の一撃

  // ===== ??? 86.8〜96.9 ｜ 音が消える。ピアノの音で「?」がゆっくり降る =========
  [87.72, 89.93, 91.83, 92.94, 94.98, 96.43].forEach((t, i) =>
    fire(t, 0.5, delay => glyph({ ch: '?', x: i % 2 ? rand(W * 0.55, W - 80) : rand(80, W * 0.45), y: -50, cell: 20, vy: 75, r: 6, delay, color: '#9fb4c8' })));

  // ===== REBOOT 96.9〜104.5 ｜ データの滝がだんだん激しく ＋ 床のビーム ========
  hit(98.12, 0.3); hit(bar(78), 0.5); hit(bar(79), 0.6);
  for (let n = 0; n < 16; n++) fire(beat(2 + 76 * 4 + n * 2), B2, delay => stream({ x: rand(40, W - 40), count: 3, vy: 280, delay, color: COL.green }));
  for (let n = 0; n < 16; n++) fire(beat(2 + 80 * 4 + n * 0.5), B2, delay => stream({ x: rand(40, W - 40), count: 2, vy: 340, delay, color: COL.green }));
  fire(bar(80), B2 * 1.5, delay => floorStrike({ delay }));         // 102.0s 床のビーム（跳ぶ練習）
  fire(bar(81), B2 * 1.5, delay => floorStrike({ delay }));

  // ===== Re:Unknown X 104.5〜117.1 ｜ 最後のサビ ===============================
  crash(bar(82), { blocks: 12 });                                    // 104.5s ドロップ
  crash(bar(82), { at: 'center', blocks: 0 });
  for (let n = 0; n < 40; n++) {                                     // 回転 X のスプリンクラー
    fire(beat(2 + 82 * 4 + n), 0.3, delay => ring({ x: cx, y: cy, count: 4, speed: 210, r: 7, start: n * Math.PI / 8, delay, color: COL.red }));
  }
  for (let k = 84; k < 88; k++) fire(bar(k + 0.5), B2, delay => side(k % 2 === 0, k % 4 < 2 ? LOW : MID, delay, COL.cyan));
  for (let k = 88; k < 92; k++) fire(bar(k), B2, delay => router({ x: k % 2 ? 60 : W - 60, y: 40, hops: 6, delay, color: COL.violet }));
  hit(beat(336.5), 0.6);                                             // 106.5s
  crash(bar(86)); crash(bar(90));

  // ===== OVERRIDE 117.1〜127.2 ｜ いろいろな形態のメドレー ======================
  for (let k = 92; k < 100; k++) {
    const m = k % 4;
    if (m === 0) fire(bar(k), B2, delay => splitter({ x: rand(150, W - 150), y: 40, vy: 150, r: 18, gen: 2, every: 2, speed: 140, delay, color: COL.cyan }));
    if (m === 1) fire(bar(k), B2, delay => columns({ cols: [0, 3, 6], delay }));
    if (m === 2) fire(bar(k), B2, delay => spinX({ x: k % 8 < 4 ? 40 : W - 40, y: -30, vx: k % 8 < 4 ? 150 : -150, vy: 150, per: 3, gap: 24, inner: 16, snap: Math.PI / 4, r: 8, delay, color: COL.red }));
    if (m === 3) fire(bar(k), B2, delay => columns({ cols: [1, 4, 7], delay }));
    fire(bar(k + 0.5), B2, delay => drip(delay, { color: COL.cyan }));
  }
  crash(bar(96)); hit(beat(398), 0.5);                               // 122.2s / 126.0s

  // ===== DECODE 127.2〜137.3 ｜ 拍に合わせて跳べ ================================
  // 小節の頭で床にビーム（空中か足場の上ならセーフ）。3拍目は足場の列に柱（足場にずっといられない）
  for (let k = 100; k < 108; k++) {
    if (k !== 104) fire(bar(k), B2 * 1.5, delay => floorStrike({ delay, color: COL.yellow }));
    fire(bar(k + 0.5), B2, delay => columns({ cols: k % 2 ? [1, 2] : [5, 6], delay, color: COL.yellow }));
    if (k % 2 === 0) fire(bar(k + 0.75), B2, delay => drip(delay, { color: COL.yellow }));
  }
  crash(beat(420));                                                  // 132.9s
  hit(beat(406), 0.5);

  // ===== EOF 137.3〜145 ｜ しずかに終わる → 最後の一撃 ==========================
  for (let n = 0; n < 6; n++) fire(bar(108 + n * 0.5), B2, delay => drip(delay, { vy: 140, color: '#e8f6ff' }));
  fire(bar(110), B2, delay => columns({ cols: [0, 7], delay, color: '#e8f6ff' }));
  fire(bar(111), B2, delay => columns({ cols: [1, 6], delay, color: '#e8f6ff' }));
  // 142.4s 最後の一撃: 真ん中に巨大な X ＋ ブロックの X が四方へはじける
  crash(bar(112), { at: 'center', blocks: 12 });
  fire(bar(112), 0.8, delay => glyph({ ch: 'X', x: cx, y: cy, cell: 34, vx: 0, vy: 0, r: 9, delay, color: COL.red }));
  burst(bar(112) + 0.5, () => {
    for (const b of bullets) if (b.shape === 'block' && !b.kind && b.vx === 0 && b.vy === 0) {
      const a = Math.atan2(b.y - cy, b.x - cx); b.vx = Math.cos(a) * 240; b.vy = Math.sin(a) * 240;
    }
    shake(12); glitch(0.6);
  });

  return cues.sort((a, b) => a.t - b.t);
}

addSong({
  id: 'unknown',
  title: 'Re:Unknown X',
  meta: '190 BPM · 2:25 · データとレーザー',
  file: 'Re-Unknown_X.mp3',
  bpm: 190, beat: UNKNOWN_BEAT, end: 145.0,
  beatTime: unknownBeatTime,
  beatPos: unknownBeatPos,
  env: ENV_UNKNOWN,                // 曲の音量データ（songs/unknown-env.js）
  sections: UNKNOWN_SECTIONS,
  build: unknownChart,
  theme: 'cyber',                  // visuals.js の見た目のセット（文字の雨・X・四角い弾）
  titleLook: { sky: ['#04140f', '#010605'], color: '#39ff88', pulse: 0.01, rain: 0.8, emblem: 0.8, tiles: true },
  titleBpm: 95,                    // タイトル画面は半分の速さでゆったり刻む
  preview: 104.48,                 // 試聴は最後のサビから
  clearText: 'SYSTEM RESTORED ─ X を解読した！',
  bestKey: 'dodge_best_unknown',
});
