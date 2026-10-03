"use strict";

/* =========================================================================
   曲②  Re:Unknown X（まらしぃ）  —  拍・場面・譜面（弾幕）  ※リメイク版
   東方ダンマクカグラの曲。原曲は ZUN の「アンノウンX ～ Unfound Adventure」で、格闘ゲーム『東方非想天則』の
   最終ステージの曲。物語では、幻想郷に「巨大な影」が現れ、早苗は「巨大ロボ」、チルノは「ダイダラボッチ」、
   美鈴は「太歳星君」だと思って追いかける。正体は、河童が作った宣伝用の巨大な人形「非想天則」だった。
   リメイクでは、東方の弾幕シューティングの画面を再現: ボス「Unknown X」と体力のバー、スペルカードの宣言と
   「Get Spell Card Bonus!!」、グレイズ（かすり）の数。
   赤・緑・青の UFO は『東方星蓮船』の UFO。見た目は visuals-touhou.js（theme: 'touhou'）。

   曲の形（解析で分かったこと。4小節 ≈ 5秒をひとかたまりとして比べた）:
       0.9〜 16.1  イントロ     しずか → 盛り上がって 11.0 秒でバンドが入る
      16.1〜 36.3  Aメロ        同じフレーズ4回
      36.3〜 56.5  サビ         （46.4〜51.4 だけ少し変化）
      56.5〜 66.6  Aメロ 2（決まった場所で交差する X の光線）
      66.6〜 76.7  サビ 2
      76.7〜 86.8  転調したサビ ← 最初の山場
      86.8〜 96.9  ブレイク     ほぼ無音。ピアノがぽつぽつ
      96.9〜107.0  ため         だんだん戻ってくる（104.5 秒にドンと一撃）
     107.0〜127.2  大サビ       ← いちばんの山場
     127.2〜137.3  アウトロ     Aメロを上げたもの。まだ激しい
     137.3〜145.0  エンディング 142.4 秒の最後の一撃で終わり

   この曲は「盛り上がりの段階」tier（0〜5）で、弾の量と演出の強さを決めている:
       0 しずか / 1 気配 / 2 Aメロ / 3 サビ / 4 山場 / 5 最高潮
   ========================================================================= */

// ---- 拍のきざみ ------------------------------------------------------------
// 190 BPM: 1拍 = 60/190 ≈ 0.316秒。最初の拍 = 0.275秒。
// 小節（4拍）の頭は 2拍目から: bar(0) = 0.907秒。
const UNKNOWN_BEAT = 60 / 190;
function unknownBeatTime(n) { return 0.275 + n * UNKNOWN_BEAT; }    // n拍目の時刻
function unknownBeatPos(t)  { return (t - 0.275) / UNKNOWN_BEAT; }  // t秒は何拍目か（小数）

/* ---- 場面（セクション）------------------------------------------------------
   曲①と同じ書き方（t / name / sub / sky / color / pulse / sway / zoom）に加えて
     tier … 盛り上がりの段階 0〜5。UFO・探照灯・月・ホタル・空の点滅がこれで変わる
   -------------------------------------------------------------------------- */
const UNKNOWN_SECTIONS = [
  { t: 0,      tier: 0,   name: 'FINAL STAGE',  sub: '幻想郷の夜空',                sky: ['#0b0a2a', '#1a1238'], color: '#c4b5fd', pulse: 0.002, sway: 0.2, stars: 6 },
  { t: 5.96,   tier: 1,   name: '',             sub: '',             sky: ['#0c0c30', '#1d1540'], color: '#8fd3ff', pulse: 0.005, sway: 0.3, stars: 10, zoom: [1, 1.02] },
  { t: 11.01,  tier: 2.5, name: 'Unknown X',    sub: '♪ アンノウンX ～ Unfound Adventure',       sky: ['#130b33', '#271646'], color: '#ff4d6d', pulse: 0.010, sway: 0.4, stars: 18 },
  { t: 16.06,  tier: 2,   name: '',             sub: '',   sky: ['#0a1030', '#14203f'], color: '#5cf2a4', pulse: 0.008, sway: 0.4, stars: 14 },
  { t: 26.17,  tier: 2,   name: '',             sub: '',   sky: ['#100c2e', '#211a42'], color: '#ffd166', pulse: 0.008, sway: 0.4, stars: 14 },
  { t: 33.75,  tier: 2.5, name: '',             sub: '',                     sky: ['#140c33', '#291848'], color: '#ffd166', pulse: 0.012, sway: 0.5, stars: 22, zoom: [1, 1.03] },
  { t: 36.28,  tier: 3.5, name: '',             sub: '',     sky: ['#1a0b38', '#33164e'], color: '#ff4d6d', pulse: 0.018, sway: 0.7, stars: 40 },
  { t: 46.38,  tier: 3,   name: '',             sub: '',       sky: ['#120a36', '#26154c'], color: '#c4b5fd', pulse: 0.016, sway: 0.7, stars: 34 },
  { t: 56.49,  tier: 2,   name: '',             sub: '', sky: ['#0a1030', '#14203f'], color: '#5cf2a4', pulse: 0.008, sway: 0.4, stars: 14 },
  { t: 66.59,  tier: 3.5, name: '',             sub: '',       sky: ['#081236', '#11254d'], color: '#4cc9f0', pulse: 0.018, sway: 0.7, stars: 40 },
  { t: 76.70,  tier: 4.5, name: '',             sub: '',     sky: ['#220a33', '#40164a'], color: '#ffb347', pulse: 0.024, sway: 1.0, stars: 70, zoom: [1, 1.04] },
  { t: 86.80,  tier: 0,   name: '……',         sub: 'ボスが消えた',                 sky: ['#05051a', '#0c0a24'], color: '#9aa4c8', pulse: 0,     sway: 0.15, stars: 4 },
  { t: 96.91,  tier: 1.5, name: '足音',         sub: '巨大な足が踏みつける',       sky: ['#0c0c30', '#1d1540'], color: '#8fd3ff', pulse: 0.008, sway: 0.3, stars: 14, zoom: [1, 1.05] },
  { t: 104.48, tier: 5,   name: '',             sub: '',               sky: ['#22082f', '#45124a'], color: '#ff4d6d', pulse: 0.030, sway: 1.3, stars: 110 },
  { t: 117.12, tier: 5,   name: '',             sub: '',   sky: ['#0a0e36', '#182a55'], color: '#4cc9f0', pulse: 0.030, sway: 1.3, stars: 110 },
  { t: 127.22, tier: 4,   name: '神楽',         sub: 'ダンマクカグラ ─ 拍に合わせて跳べ', sky: ['#1c0e2c', '#3a1a40'], color: '#ffd166', pulse: 0.022, sway: 0.9, stars: 60 },
  { t: 137.33, tier: 3,   name: '',             sub: '',       sky: ['#0b0a2a', '#1a1238'], color: '#c4b5fd', pulse: 0.006, sway: 0.3, stars: 10 },
];

// 弾の速さの倍率: 弾の数はあまり変えずに、盛り上がりは「速さ」で出す。
// tier 0（静寂）= 0.85倍 … tier 2（Aメロ）≈ 1.07倍 … tier 5（大サビ）= 1.4倍
function unknownSpeedAt(t) {
  let i = 0;
  while (i + 1 < UNKNOWN_SECTIONS.length && UNKNOWN_SECTIONS[i + 1].t <= t) i++;
  return 0.85 + 0.11 * UNKNOWN_SECTIONS[i].tier;
}

/* ---- 譜面 -------------------------------------------------------------------
   盛り上がりは主に「弾の速さ」で表す（上の unknownSpeedAt）。弾の量は大きくは変えず、「主役」を変えている:
     tier 0〜1  … 1つずつゆっくり。よけ方を覚える時間
     tier 2     … Aメロ。テンポよく、でも詰めすぎない
     tier 3〜   … サビ。三つの UFO が現れて、拍ごとに順番に撃つ
     tier 5     … 大サビ。回る光のスプリンクラー ＋ UFO ＋ 強い音のたびに X の光線

   ● 強い音（解析で目立った瞬間）には「交差する探照灯」（crash）
       11.0 / 33.0 / 38.8 / 41.3 / 43.9 / 51.1 / 73.5 / 86.3 / 104.5 / 109.5 / 114.6 / 122.2 / 132.9 / 142.4 秒
       （交差する位置はプレイヤーの横の位置と高さの両方を追う。足場の上にいても逃げられない）
   -------------------------------------------------------------------------- */
function unknownChart() {
  const cues = [];
  const cx = W / 2, cy = H / 3;
  const burst = (t, fn) => cues.push({ t, fn });
  const beat = unknownBeatTime;                       // n拍目
  const bar  = k => beat(2 + k * 4);                  // k小節目の頭（小数もOK: 0.5 = 3拍目）
  const fire = (t, warn, fn) => burst(t - warn, () => fn(warn));
  const B = UNKNOWN_BEAT, B2 = B * 2;                 // 1拍 / 2拍（予告の基本の長さ）
  // ---- ボスとスペルカード（東方の再現）----
  const boss = (t, x, y) => burst(t, () => bossTo(x, y));
  const bossOn = (t, on) => burst(t, () => { THB.on = on; if (on) { THB.x = THB.tx = cx; THB.y = -60; THB.ty = 140; } else THB.ty = -140; });   // 消えるときは上へ飛んでいく
  const spell = (t, name, end, no) => burst(t, () => spellCard(name, end, no));
  // ボスから、自機ねらいの米つぶ弾（扇）
  const bossFan = (t, n = 5, spread = 0.22, v = 210, color = '#ff4d6d') => fire(t, B2, delay => {
    const p = playerXY(), a0 = Math.atan2(p.y - THB.y, p.x - THB.x);
    for (let j = 0; j < n; j++) { const a = a0 + (j - (n - 1) / 2) * spread; spawn({ x: THB.x, y: THB.y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, r: 7, delay, color, style: 'rice' }); }
  });
  // ボスから、お札（アミュレット）の輪
  const bossRing = (t, n = 16, v = 150, color = '#ff6a6a', start = 0) => fire(t, B2, delay => ring({ x: THB.x, y: THB.y, count: n, speed: v, r: 7, start, delay, color, style: 'amulet' }));

  // ---- この曲の部品 ----
  const RED = '#ff4d6d', GREEN = '#5cf2a4', BLUE = '#4cc9f0', MOON = '#fff3c4', VIOLET = '#c4b5fd', GOLD = '#ffd166';
  const TRI = [RED, GREEN, BLUE];
  const LOW = GROUND_Y - 30, MID = GROUND_Y - 75, PLAT = GROUND_Y - 120;
  const anyH = () => [LOW, MID, PLAT][(Math.random() * 3) | 0];
  // 正体不明の光: 拍ごとに瞬間移動しながら落ちてくる（次の場所が点線で見える）
  const drip = (delay, o = {}) => blink({ x: o.x ?? rand(40, W - 40), y: 30, vy: o.vy || 190, vx: o.vx || 0, r: o.r || 9, step: 1, delay, color: o.color || VIOLET });
  // 横から瞬間移動してくる光。高さは毎回少しずつランダム（LOW = 跳ぶ高さ / MID = 頭の上 / PLAT = 足場の高さ）
  // → 同じ高さにいれば当たらない、ということがない
  const side = (fromLeft, y, delay, color) => blink({ x: fromLeft ? 14 : W - 14, y: y + rand(-24, 24), vx: fromLeft ? 260 : -260, vy: 0, r: 10, step: 1, delay, color });
  // ゆっくり落ちる大玉
  const orb = (delay, o = {}) => spawn({ x: o.x ?? rand(60, W - 60), y: -16, vy: o.vy || 90, r: o.r || 14, delay, color: o.color || MOON, lane: [0, 1] });
  // 画面が光る（場面の色。山場では三色）
  const hit = (t, amount = 0.5) => burst(t, () => { flash(amount); punch(0.02 * amount); });
  // ★強い音★ 交差する2本の探照灯（X の字）＋ 交点から三色の星が飛ぶ。予告は4拍（約1.3秒）
  //   at: 'player' = プレイヤーの位置（横も高さも）/ 'center' = 画面の真ん中 / { x, y } = その場所
  //   light: true = 光とゆれを控えめに（連打するときに使う）
  const XWARN = B * 4;
  const crash = (t, { at = 'player', stars = 6, light = false } = {}) => {
    let p = null;                                     // X の交点（予告を出した瞬間に決まる）
    fire(t, XWARN, delay => {
      p = at === 'player' ? playerXY() : at === 'center' ? { x: cx, y: H * 0.42 } : at;
      xStrike({ x: p.x, y: p.y, delay, color: MOON });
    });
    burst(t, () => {
      if (light) { flash(0.25); shake(6); } else { flash(0.8); shake(14); punch(0.05); }
      for (let i = 0; p && i < stars; i++) {
        const a = Math.PI / 4 + (i % 4) * (Math.PI / 2) + (i >= 4 ? Math.PI / 4 : 0), v = i < 4 ? 240 : 170;
        spawn({ x: p.x, y: p.y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, r: 8, style: 'star', color: TRI[i % 3] });
      }
    });
  };

  // ★三つの UFO★ 三角形の編隊で回りながら、拍ごとに 赤→緑→青 の順で1機ずつ撃つ
  //   t0 = 撃ちはじめ / beats = 何拍いるか / shots = 色ごとの撃ち方 [赤, 緑, 青]
  const trio = (t0, beats, shots, { y = 150, R = 230, every = 1 } = {}) => {
    const life = 1.2 + beats * B + 1.0;               // 入ってくる1.2秒 ＋ 撃つ時間 ＋ 帰る1秒
    [0, 1, 2].forEach(i => burst(t0 - 1.2, () => ufo({
      x: cx, y: -60, color: TRI[i], life, every, size: 1,
      path: age => {
        const a = beatPos(songTime) * 0.06 + i * TAU / 3;
        const sx = cx + Math.cos(a) * R, sy = y + Math.sin(a) * R * 0.28;
        const inK = easeOut(age / 1.2), outK = easeOut((age - (life - 1.0)) / 1.0);
        return { x: sx, y: lerp(-60, sy, inK) - 260 * outK };
      },
      shot: (u, n) => { if (u.age > 1.15 && u.age < life - 1.0 && (n + i) % 3 === 0) shots[i](u, n); },
    })));
  };
  // UFO が横切りながら、拍ごとに下へ光の玉を落とす
  const dash = (t0, fromLeft, { y = 210, bars = 2, color = BLUE, drop = 150 } = {}) => {
    const dur = bars * 4 * B;
    burst(t0, () => ufo({
      x: fromLeft ? -60 : W + 60, y, color, life: dur, every: 1,
      path: age => ({ x: fromLeft ? lerp(-60, W + 60, age / dur) : lerp(W + 60, -60, age / dur), y: y + Math.sin(age * 5) * 8 }),
      shot: u => { if (u.x > 20 && u.x < W - 20) spawn({ x: u.x, y: u.y + 10, vy: drop, r: 10, color }); },
    }));
  };
  // 撃ち方の部品（UFO の u.x, u.y から）
  const aimFan = (n, spread, speed, style = 'rice') => (u) => {
    const p = playerXY(), base = Math.atan2(p.y - u.y, p.x - u.x);
    for (let j = 0; j < n; j++) {
      const a = base + (j - (n - 1) / 2) * spread;
      spawn({ x: u.x, y: u.y, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed, r: 7, style, color: u.color });
    }
  };
  const burstRing = (n, speed, style = 'orb') => (u, k) => ring({ x: u.x, y: u.y, count: n, speed, r: 7, start: k * 0.3, color: u.color, style });
  const starDrop = (n) => (u) => { for (let j = 0; j < n; j++) spawn({ x: u.x + (j - (n - 1) / 2) * 30, y: u.y, vx: (j - (n - 1) / 2) * 40, vy: 170, r: 8, style: 'star', color: u.color }); };

  // ===== UNKNOWN 0.9〜6.0 ｜ tier 0: 月夜。大玉がひとつずつ、ゆっくり ===========
  hit(bar(0), 0.15);
  for (const k of [0.5, 2, 3]) fire(bar(k), B2 * 1.5, delay => orb(delay));
  fire(bar(3.5), B2, delay => drip(delay, { vy: 140 }));

  // ===== SIGNAL 6.0〜11.0 ｜ tier 1: UFO の探照灯が地面をなめる（跳び越える）====
  const lowScan  = (fromLeft, delay) => scanner({ fromLeft, y1: GROUND_Y - 46, y2: GROUND_Y + 10, speed: 400, delay, color: BLUE });
  const highScan = (fromLeft, delay) => scanner({ fromLeft, y1: -30, y2: GROUND_Y - 58, speed: 400, delay, color: GOLD });
  fire(bar(4), B2, delay => lowScan(true, delay));
  fire(bar(5), B2, delay => lowScan(true, delay));
  fire(bar(6), B2, delay => highScan(true, delay));
  fire(bar(7), B2, delay => lowScan(true, delay));
  for (const k of [4.5, 5.5, 6.5]) fire(bar(k), B2, delay => drip(delay, { vy: 160 }));
  for (let n = 0; n < 4; n++) fire(bar(7.5) + n * B / 2, B2, delay => drip(delay, { vy: 220, color: RED }));   // 10.4s〜 ため
  hit(beat(30), 0.2); hit(beat(32), 0.35);

  // ===== CONTACT 11.0〜16.1 ｜ tier 2.5: バンドが入る。最初の UFO が現れる =======
  crash(bar(8), { stars: 8 });                                       // 11.0s
  bossOn(bar(8) - 1.0, 1);                                           // ボス「Unknown X」登場
  dash(bar(8.5), true,  { color: RED,  y: 200 });                    // 赤い UFO が左から
  dash(bar(10),  false, { color: BLUE, y: 250 });                    // 青い UFO が右から
  for (const k of [9, 10, 11]) fire(bar(k + 0.5), B2, delay => drip(delay, { color: GREEN }));
  hit(beat(47), 0.5);                                                // 15.1s

  // ===== DRIFT 16.1〜26.2 ｜ tier 2: Aメロ。横から・上から、正体不明の光 =========
  for (let k = 12; k < 16; k++) {
    const L = k % 2 === 0;
    fire(bar(k),        B2, delay => side(L,  LOW, delay, GREEN));    // 低め → 跳ぶ
    fire(bar(k + 0.5),  B2, delay => side(!L, k % 2 ? PLAT : MID, delay, BLUE));   // 頭の上 / 足場の高さ
    fire(bar(k + 0.25), B2, delay => stream({ x: rand(60, W - 60), count: 4, vy: 300, delay, color: GREEN }));
  }
  for (let k = 16; k < 20; k++) {
    for (const i of [0, 2]) {                                         // ななめに瞬間移動しながら降る光3つ
      const fromLeft = (k + i / 2) % 2 === 0;
      fire(bar(k + i / 4), B2, delay => {
        for (let j = 0; j < 3; j++) blink({ x: fromLeft ? rand(20, W * 0.45) : rand(W * 0.55, W - 20), y: 30, vx: fromLeft ? 110 : -110, vy: 200, r: 9, delay, color: GREEN });
      });
    }
    fire(bar(k + 0.75), B2, delay => stream({ x: playerXY().x, count: 5, vy: 320, delay, color: BLUE }));
  }
  hit(beat(55.5), 0.4); hit(beat(64), 0.5);                          // 17.8s / 20.5s
  for (let k = 12; k < 20; k += 2) { boss(bar(k), k % 4 === 0 ? 260 : 540, 130 + (k % 3) * 20); bossFan(bar(k + 1), 3, 0.25, 200); }

  // ===== SPLIT 26.2〜36.3 ｜ tier 2→2.5: 2拍ごとに X の形に分かれる光 ===========
  for (let k = 20; k < 26; k++) {
    const x = k % 2 === 0 ? W * 0.3 : W * 0.7;
    fire(bar(k), B2, delay => splitter({ x, y: 40, vy: 150, r: 18, gen: 2, every: 2, speed: 140, delay, color: GOLD, bits: 'star' }));
    if (k % 2 === 1) fire(bar(k + 0.5), B2, delay => drip(delay, { color: GOLD }));
  }
  crash(beat(103.5));                                                // 33.0s 強い音
  // 33.7〜36.3s サビ前のため: 8分音符で光が降り、最後に大玉の輪
  for (let n = 0; n < 12; n++) fire(bar(26.5) + n * B / 2, B2, delay => drip(delay, { vy: 230, color: TRI[n % 3] }));
  fire(bar(27.5), B2, delay => ring({ x: cx, y: cy, count: 12, speed: 150, r: 9, delay, color: MOON }));

  // ===== UFO 36.3〜46.4 ｜ tier 3.5: サビ。三つの UFO が順番に撃つ ================
  spell(bar(28) - 0.3, '神具「洩矢の鉄の輪」', bar(44), 1);
  boss(bar(28), cx, 120);
  trio(bar(28), 32, [aimFan(3, 0.28, 220), burstRing(8, 150), starDrop(2)]);
  for (const [k, L] of [[29, true], [33, false], [37, true], [41, false]]) fire(bar(k), B2 * 1.5, delay => ironRing({ x: L ? 80 : W - 80, y: 160, vx: L ? 170 : -170, vy: 140, r: 18, life: 8, delay }));
  crash(bar(30)); crash(bar(32)); crash(bar(34));                   // 38.8 / 41.3 / 43.9s

  // ===== PHANTOM 46.4〜56.5 ｜ tier 3: サビ後半。UFO が横切って光を落とす ========
  dash(bar(36), true,  { color: RED,   y: 190 });
  dash(bar(38), false, { color: GREEN, y: 230 });
  for (let k = 36; k < 40; k++) fire(bar(k + 0.5), B2, delay => drip(delay, { color: VIOLET }));
  crash(beat(161));                                                  // 51.1s
  for (let k = 40; k < 44; k++) {                                    // 拍ごとに 45° カクッと回る X
    const left = k % 2 === 0;
    fire(bar(k), B2, delay => spinX({ x: left ? 40 : W - 40, y: -30, vx: left ? 150 : -150, vy: 150, per: 3, gap: 24, inner: 16, snap: Math.PI / 4, r: 8, delay, color: TRI[k % 3] }));
  }

  // ===== DRIFT II 56.5〜66.6 ｜ tier 2: Aメロ 2。決まった場所で交差する X の光線 =========
  // プレイヤーは狙わない。地面すれすれで交差する X（交点の近くが危ない）と、
  // 高い所で交差する X（ななめの線が地面に届く2か所が危ない）が、場所を変えながら続く。
  // 前半は1小節に1つ、後半は2拍ごとに2つ同時。すき間に光の滝
  const G0 = GROUND_Y - 30, GH = GROUND_Y - 250;
  const firstHalf = [{ x: 200, y: G0 }, { x: 600, y: G0 }, { x: 400, y: GH }, { x: 400, y: G0 }];
  firstHalf.forEach((at, i) => crash(bar(44 + i), { at, stars: 4, light: true }));
  const sweep = [120, 280, 440, 600, 680, 520, 360, 200];
  sweep.forEach((x, i) => {
    crash(bar(48 + i * 0.5), { at: { x, y: G0 }, stars: 0, light: true });
    crash(bar(48 + i * 0.5), { at: { x: W - x, y: GH }, stars: 0, light: true });
  });
  for (let k = 45; k < 52; k += 2) fire(bar(k + 0.25), B2, delay => stream({ x: rand(60, W - 60), count: 3, vy: 300, delay, color: GREEN }));
  hit(beat(189), 0.4); hit(beat(193), 0.5);                          // 60.0s / 61.2s

  // ===== UFO II 66.6〜76.7 ｜ tier 3.5: サビ 2。UFO の光線が降る ==================
  // 2拍ごとに、2本の光線（左右どちらかに寄る）。左右交互なので、反対側へ逃げる。
  // 光線を落とした UFO は、そのまま米つぶ弾をばらまく（逃げた先にも弾が来る）
  spell(bar(52) - 0.3, '機械「巨大ロボの目からビーム」', bar(60), 2);
  boss(bar(52), cx, 110);
  for (let i = 0; i < 15; i++) {
    const c = i % 2 === 0 ? [1, 2] : [5, 6];
    fire(bar(52 + i * 0.5), B2, delay => columns({ cols: c, delay, hold: 0.22, color: TRI[i % 3] }));
    burst(bar(52 + i * 0.5), () => {
      const p = playerXY();
      for (const col of c) {
        const x = (col + 0.5) * W / 8, base = Math.atan2(p.y - 40, p.x - x);
        for (let j = -2; j <= 2; j++) {
          const a = base + j * 0.22, v = 190;
          spawn({ x, y: 40, vx: Math.cos(a) * v, vy: Math.sin(a) * v, r: 7, style: 'rice', color: TRI[(i + 1) % 3] });
        }
      }
    });
  }
  for (let k = 52; k < 60; k += 2) fire(bar(k + 1), B2, delay => ring({ x: cx, y: cy, count: 10, speed: 160, r: 8, start: k * 0.2, delay, color: BLUE }));
  crash(beat(232), { at: 'center' });                                // 73.5s

  // ===== ASCENSION 76.7〜86.8 ｜ tier 4.5: 転調したサビ。最初の山場 ==============
  // 穴の空いた光の壁が下りてくる ＋ UFO の編隊が2拍ごとに撃つ
  spell(bar(60) - 0.3, '土着神「ケロちゃん風雨に負けず」', bar(68), 3);
  boss(bar(60), cx, 130);
  for (let k = 60; k < 68; k++) fire(bar(k), B2, delay => frogHop({ fromLeft: k % 2 === 0, apex: 110 + (k % 3) * 25, v: 180, delay }));
  for (let n = 0; n < 32; n++) fire(bar(60) + n * B, B, delay => {                // 風雨: ななめに降る雨（米つぶ）
    for (let j = 0; j < 2; j++) spawn({ x: rand(0, W + 200) - 100, y: -10, vx: -70, vy: 330, r: 5, delay, color: '#9fd8ff', style: 'rice' });
  });
  trio(bar(60), 30, [aimFan(2, 0.2, 200), burstRing(6, 140, 'rice'), aimFan(2, 0.2, 200)], { y: 130, every: 2 });
  hit(beat(266), 0.5);                                               // 84.3s
  crash(beat(272.5), { at: 'center', stars: 8 });                    // 86.3s ブレイク前の一撃

  // ===== …… 86.8〜96.9 ｜ tier 0: 音が消える。ボスが消えて、ゆっくりの玉が現れる ======
  bossOn(beat(276), 0);
  // 拍ごとに、空のあちこち（プレイヤーから離れた所）に玉がふわっと現れて、ゆっくり漂いながら落ちる。
  // 数が多く、そこそこの速さで漂う。すき間を見てよける。ピアノの音では大きな「?」
  for (let n = 0; n < 31; n++) {
    fire(beat(276 + n), 0.6, delay => {
      for (let j = 0; j < (n % 2 ? 3 : 2); j++) {
        let x, y, tries = 0;
        do { x = rand(30, W - 30); y = rand(40, GROUND_Y - 260); } while (Math.hypot(x - playerXY().x, y - playerXY().y) < 220 && ++tries < 8);
        const a = Math.PI / 2 + rand(-0.9, 0.9), v = rand(110, 170);
        spawn({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, r: rand(7, 12), delay, color: ['#b8c2e8', '#c4b5fd', '#8fd3ff'][n % 3] });
      }
    });
  }

  // ===== APPROACH 96.9〜104.5 ｜ tier 1.5: ため。光の雨がだんだん激しく =========
  hit(98.12, 0.25); hit(bar(78), 0.4); hit(bar(79), 0.5);
  for (let n = 0; n < 16; n++) fire(beat(2 + 76 * 4 + n * 2), B2, delay => stream({ x: rand(40, W - 40), count: 3, vy: 280, delay, color: VIOLET }));
  for (let n = 0; n < 16; n++) fire(beat(2 + 80 * 4 + n * 0.5), B2, delay => stream({ x: rand(40, W - 40), count: 2, vy: 340, delay, color: TRI[n % 3] }));
  for (const k of [77, 78, 79]) fire(bar(k), 1.0, delay => stomp({ x: Math.max(80, Math.min(W - 80, playerXY().x)), delay }));   // 巨大な足が踏みつける
  fire(bar(80), B2 * 1.5, delay => floorStrike({ delay, color: GOLD }));   // 102.0s 床の光（跳ぶ練習）
  fire(bar(81), B2 * 1.5, delay => floorStrike({ delay, color: GOLD }));

  // ===== Re:Unknown X 104.5〜117.1 ｜ tier 5: 大サビ ================================
  bossOn(bar(81.5), 1);
  spell(bar(82) - 0.2, 'Last Spell「アンノウンX ～ Unfound Adventure」', bar(100), 4);
  crash(bar(82), { stars: 8 });                                      // 104.5s ドロップ
  for (let k = 84; k < 100; k += 2) { boss(bar(k), k % 4 === 0 ? 220 : 580, 120); bossRing(bar(k + 1), 14, 150, TRI[k % 3], k * 0.2); }
  crash(bar(82), { at: 'center', stars: 0 });
  for (let n = 0; n < 40; n++) {                                     // 回る光のスプリンクラー（4方向、拍ごとに 22.5° 回る）
    fire(beat(2 + 82 * 4 + n), 0.3, delay => ring({ x: cx, y: cy, count: 4, speed: 210, r: 7, start: n * Math.PI / 8, delay, color: TRI[n % 3], style: 'rice' }));
  }
  trio(bar(84), 28, [starDrop(1), aimFan(1, 0, 230), starDrop(1)], { y: 120, R: 260, every: 2 });
  for (let k = 84; k < 88; k++) fire(bar(k + 0.5), B2, delay => side(k % 2 === 0, anyH(), delay, MOON));
  hit(beat(336.5), 0.6);                                             // 106.5s
  crash(bar(86)); crash(bar(90));                                    // 109.5 / 114.6s

  // ===== UNIDENTIFIED 117.1〜127.2 ｜ tier 5: 大サビ後半。すべての形態 ===============
  for (let k = 92; k < 100; k++) {
    const m = k % 4;
    if (m === 0) fire(bar(k), B2, delay => splitter({ x: rand(150, W - 150), y: 40, vy: 150, r: 18, gen: 2, every: 2, speed: 140, delay, color: GREEN, bits: 'star' }));
    if (m === 1) fire(bar(k), B2, delay => columns({ cols: [0, 3, 6], delay, color: BLUE }));
    if (m === 2) dash(bar(k), k % 8 < 4, { color: RED, y: 200, bars: 2 });
    if (m === 3) fire(bar(k), B2, delay => columns({ cols: [1, 4, 7], delay, color: BLUE }));
    fire(bar(k + 0.5), B2, delay => drip(delay, { color: TRI[k % 3] }));
  }
  crash(bar(96)); hit(beat(398), 0.5);                               // 122.2s / 126.0s

  // ===== KAGURA 127.2〜137.3 ｜ tier 4: 神楽。拍に合わせて跳べ =========================
  // 小節の頭で床に光（空中か足場の上ならセーフ）。3拍目は足場の列に光線（足場にずっといられない）
  for (let k = 100; k < 108; k++) {
    if (k !== 104) fire(bar(k), B2 * 1.5, delay => floorStrike({ delay, color: GOLD }));
    fire(bar(k + 0.5), B2, delay => columns({ cols: k % 2 ? [1, 2] : [5, 6], delay, color: TRI[k % 3] }));
    if (k % 2 === 0) fire(bar(k + 0.75), B2, delay => drip(delay, { color: GOLD }));
  }
  crash(beat(420));                                                  // 132.9s
  hit(beat(406), 0.5);

  // ===== FAREWELL 137.3〜142.4 ｜ ため: ボスがまん中に陣取り、規則正しい弾幕を撃ちつづける ==========
  //   108〜110小節: 1拍ごとにお札の輪（1つおきに半分ずらす → 花の形）
  //   110〜112小節: 半拍ごとに米つぶ弾の輪が少しずつ回る（うずを巻く腕）＋ 1拍ごとに左右の UFO から交互に扇
  //   最後の1拍は弾が止み、まん中に「X」の予告がならぶ
  boss(bar(107.5), cx, 140);
  for (let n = 0; n < 8; n++) bossRing(bar(108) + n * B, 16, 140, TRI[n % 3], n % 2 ? Math.PI / 16 : 0);
  for (let n = 0; n < 14; n++) {
    const t = bar(110) + n * B / 2;
    fire(t, B2, delay => ring({ x: THB.x, y: THB.y, count: 14, speed: 150, r: 7, start: n * 0.16, delay, color: TRI[n % 3], style: 'rice' }));
    if (n % 2 === 0) fire(t, B2, delay => {
      const left = n % 4 === 0, x = left ? 60 : W - 60, p = playerXY(), a0 = Math.atan2(p.y - 60, p.x - x);
      for (let j = 0; j < 5; j++) { const a = a0 + (j - 2) * 0.2; spawn({ x, y: 60, vx: Math.cos(a) * 200, vy: Math.sin(a) * 200, r: 7, delay, color: MOON, style: 'star' }); }
    });
  }
  for (let n = 0; n < 4; n++) hit(bar(110) + n * B * 2, 0.15 + n * 0.08);   // だんだん強く光る

  // ===== FINALE 142.4〜 ｜ 最後の一撃: X の光線がいっせいに7本 → 夜空に X の花火 ==========================
  // 7つの X を同時に（予告は4拍）。地面に届く線は 8 本で、そのすき間（約150px）に立っていればよけられる
  const finaleX = (t, x, y, len, stars, { light = false, color = MOON, warn = XWARN } = {}) => {
    fire(t, warn, delay => xStrike({ x, y, len, delay, color }));
    burst(t, () => {
      for (let i = 0; i < stars; i++) {
        const a = Math.PI / 4 + i * TAU / stars, v = 150 + (i % 2) * 70;
        spawn({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, r: 8, style: 'star', color: TRI[i % 3] });
      }
      if (light) { flash(0.2); shake(4); }
    });
  };
  const T0 = bar(112);
  bossOn(T0 + 0.2, 0);                                               // ボスは最後の一撃で去っていく
  finaleX(T0, cx, 315, 1100, 8);                                     // まん中（いちばん大きい X）
  for (const x of [130, 400, 670]) finaleX(T0, x, 180, 1500, 4);    // 上の段の3つ
  for (const x of [250, 550]) finaleX(T0, x, 470, 700, 4);          // 下の段の2つ
  burst(T0, () => { flash(1); shake(18); punch(0.06); });
  fire(T0, 0.8, delay => glyph({ ch: '?', x: cx, y: cy, cell: 30, vx: 0, vy: 0, r: 9, delay, color: MOON, style: 'star' }));
  burst(T0 + 0.5, () => {
    for (const b of bullets) if (b.style === 'star' && !b.kind && b.vx === 0 && b.vy === 0) {
      const a = Math.atan2(b.y - cy, b.x - cx); b.vx = Math.cos(a) * 240; b.vy = Math.sin(a) * 240; b.color = TRI[(Math.random() * 3) | 0];
    }
    flash(0.6); shake(10);
  });
  // 余韻: 拍ごとに夜空で X の花火（高い所だけ。線は地面に届かない）
  for (let n = 1; n <= 7; n++) {
    const xs = n % 2 ? [cx] : [cx - 140, cx + 140];
    for (const x of xs) finaleX(T0 + n * B, x + rand(-30, 30), 110 + (n % 3) * 40, 600, 6, { light: true, color: TRI[n % 3], warn: B * 2 });
  }

  return cues.sort((a, b) => a.t - b.t);
}

addSong({
  id: 'unknown',
  title: 'Re:Unknown X',
  meta: '190 BPM · 2:25 · まらしぃ · 東方ダンマクカグラ',
  file: 'Re-Unknown_X.mp3',
  bpm: 190, beat: UNKNOWN_BEAT, end: 145.0,
  beatTime: unknownBeatTime,
  beatPos: unknownBeatPos,
  speedAt: unknownSpeedAt,         // 盛り上がりに合わせた弾の速さ
  env: ENV_UNKNOWN,                // 曲の音量データ（songs/unknown-env.js）
  sections: UNKNOWN_SECTIONS,
  build: unknownChart,
  theme: 'touhou',                 // visuals-touhou.js の見た目のセット（東方の弾幕シューティング）
  titleLook: { sky: ['#0b0a2a', '#1a1238'], color: '#c4b5fd', tier: 2.5, pulse: 0.006, stars: 10 },
  titleBpm: 95,                    // タイトル画面は半分の速さでゆったり刻む
  preview: 107.0,                  // 試聴は大サビから
  clearText: '正体不明のまま、夜が明けた！',
  clearTitle: 'ALL CLEAR!!',
  overTitle: '満身創痍',
  variant: 'リメイク',
  bestKey: 'dodge_best_unknown_remake',   // ベストタイムの保存先（旧譜面とは別）
});
