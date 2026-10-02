"use strict";

/* =========================================================================
   曲⑩  Ward 13（オリジナル曲・ホラー）  —  拍・場面・譜面
   廃病院の13病棟。懐中電灯の明かりだけをたよりに進む。100 BPM のインダストリアル・ホラー。
   曲は songs/ward13-compose.py で作曲・合成した（ドローン・ピアノ・足音・サイレン・心臓の音・おどかしの音）。
   難易度はふつう。主役は演出（visuals-horror.js）。

   この曲だけの仕掛け（game.js の「Ward 13」の所）:
     ストーカー … 背の高い化け物が床を歩いて追ってくる。明かりがチカッと消えると、近くにワープする。跳び越えられる
     はうもの   … 床をすばやくはってくる（跳び越える）
     扉         … 扉がバタンと閉まる（予告の場所から逃げる）
     血のしずく … 天井から落ちてくる
   ========================================================================= */

// 100 BPM: 1拍 = 0.6秒、1小節 = 2.4秒。0拍目 = 0.5秒
const W13_BEAT = 0.6;
function w13BeatTime(n) { return 0.5 + n * W13_BEAT; }
function w13BeatPos(t)  { return (t - 0.5) / W13_BEAT; }

const W13_SECTIONS = [
  { t: 0,     tier: 0.5, name: 'WARD 13',    sub: '廃病院 ─ 懐中電灯をつけた',     sky: ['#06070a', '#14171c'], color: '#c9d4c2', pulse: 0.002, sway: 0.05, stars: 0 },
  { t: 19.7,  tier: 1.5, name: 'CORRIDOR',   sub: '何かがいる',                   sky: ['#050608', '#121418'], color: '#c9d4c2', pulse: 0.004, sway: 0.1,  stars: 0 },
  { t: 38.9,  tier: 2,   name: 'SIREN',      sub: '',                             sky: ['#0a0404', '#1c0a0a'], color: '#ff3030', pulse: 0.008, sway: 0.15, stars: 0 },
  { t: 48.5,  tier: 3,   name: 'OTHERWORLD', sub: '裏の世界',                     sky: ['#120404', '#2a0808'], color: '#ff4a2a', pulse: 0.014, sway: 0.3,  stars: 0 },
  { t: 77.3,  tier: 1,   name: 'CAM 13',     sub: '監視カメラ',                   sky: ['#060806', '#121612'], color: '#9cff9c', pulse: 0.002, sway: 0,    stars: 0 },
  { t: 86.9,  tier: 4,   name: 'RUN',        sub: '逃げろ',                       sky: ['#160303', '#3a0606'], color: '#ff2020', pulse: 0.02,  sway: 0.4,  stars: 0 },
  { t: 110.9, tier: 0.5, name: '',           sub: '',                             sky: ['#020202', '#0a0a0a'], color: '#c9d4c2', pulse: 0.002, sway: 0,    stars: 0 },
];

// 弾の速さ: 0.9倍〜 1.2倍（ふつう）
function w13SpeedAt(t) {
  let i = 0;
  while (i + 1 < W13_SECTIONS.length && W13_SECTIONS[i + 1].t <= t) i++;
  return 0.9 + 0.075 * W13_SECTIONS[i].tier;
}

function ward13Chart() {
  const cues = [];
  const burst = (t, fn) => cues.push({ t, fn });
  const B = W13_BEAT;
  const beat = w13BeatTime;
  const bar = k => beat(k * 4);
  const fire = (t, warn, fn) => burst(t - warn, () => fn(warn));
  const SC = SCORE_WARD13;
  const CX = W / 2;
  const PALE = '#d8e0d0', RED = '#c0101a', RUST = '#ff5a2a', EYE = '#ff2a2a', GREEN = '#9cff9c';
  const scares = SC.scare.map(beat);
  const calm = b => scares.every(t => !(beat(b) > t - 1.2 && beat(b) < t + 1.2));

  const drops = (t, n = 3, spread = 140) => fire(t, 0.6, delay => { const p = playerXY(); for (let i = 0; i < n; i++) bloodDrop({ x: Math.max(20, Math.min(W - 20, p.x + (i - (n - 1) / 2) * spread / Math.max(1, n - 1) * 2 + rand(-20, 20))), delay: delay + i * 0.08 }); });
  const crawl = (t, fromLeft, v = 300) => fire(t, 0.9, delay => crawler({ fromLeft, v, delay, color: PALE }));
  const door = (t, x) => fire(t, 0.9, delay => doorSlam({ x: x === 'player' ? Math.max(40, Math.min(W - 40, playerXY().x)) : x, delay, color: RUST }));
  const stalk = (t, side, o = {}) => fire(t, 1.0, delay => stalker({ x: side < 0 ? 40 : W - 40, v: o.v || 85, life: o.life || 12, delay, color: o.color || PALE }));
  const blink = (t, d = 150) => burst(t, () => { stalkerBlink(d); if (typeof horrorBlink === 'function') horrorBlink(); });
  const eyes = (t, n, v, x = CX, y = 180, start = 0) => fire(t, 0.7, delay => ring({ x, y, count: n, speed: v, r: 8, start, delay, color: EYE, style: 'eye' }));
  const ash = (t, n) => burst(t, () => { for (let i = 0; i < n; i++) snow({ x: rand(20, W - 20), y: rand(-40, -8), vy: rand(50, 80), amp: rand(10, 30), freq: rand(0.2, 0.5), r: 4, color: '#bbbbbb' }); });
  const cam = (t, zoom, follow) => burst(t, () => { stageTo({ zoom, follow }, 0.01); if (typeof horrorCut === 'function') horrorCut(); });

  // ===== WARD 13 0〜8小節 ｜ 真っ暗 ＋ 懐中電灯。ピアノ = 血のしずく ／ 足音 → 6小節目に何かが現れる ======
  burst(0, () => stageTo({ dark: 1 }, 0.01));
  SC.piano.filter(([b]) => b < 32).forEach(([b], i) => drops(beat(b), 2 + (i % 2), 160));
  stalk(bar(6), 1, { v: 60, life: 9 });
  door(beat(15.5), 120); door(beat(31.5), W - 120);

  // ===== CORRIDOR 8〜16小節 ｜ 心臓の音 = はうもの ／ 金属音 = 扉 ／ ストーカー ======================
  SC.heart.filter(b => b >= 32 && b < 64 && b % 4 === 0).forEach((b, i) => crawl(beat(b), i % 2 === 0, 280));
  SC.piano.filter(([b]) => b >= 32 && b < 64).forEach(([b]) => drops(beat(b), 3, 180));
  SC.bang.filter(b => b >= 32 && b < 64).forEach(b => door(beat(b), 'player'));
  stalk(bar(11), -1, { v: 75, life: 11 });
  for (const k of [12, 14]) blink(bar(k) + 2 * B);

  // ===== SIREN 16〜20小節 ｜ サイレン: 赤い光 ＋ 灰が降る ＋ 明かりが消えるたびにストーカーが近づく ====
  burst(bar(16), () => stageTo({ dark: 0.6 }, 2));
  for (let k = 16; k < 20; k++) { ash(bar(k), 10); blink(bar(k) + 3 * B, 120); }
  stalk(bar(16), 1, { v: 80, life: 9 });
  for (const k of [17, 18, 19]) crawl(bar(k) + B, k % 2 === 0, 300);

  // ===== OTHERWORLD 20〜32小節 ｜ 裏の世界: キック = 血の雨 ／ 小節 = 目玉のリング ／ はうもの ／ ストーカー ==
  burst(bar(20), () => { stageTo({ dark: 0 }, 0.2); flash(0.8); shake(14); });
  SC.kick.filter(b => b >= 80 && b < 128 && b % 2 === 0 && calm(b)).forEach(b => fire(beat(b), 0.5, delay => bloodDrop({ x: rand(30, W - 30), delay, r: 7 })));
  for (let k = 20; k < 32; k++) if (calm(k * 4)) eyes(bar(k), 12, 140, CX, 160, k * 0.31);
  SC.bang.filter(b => b >= 80 && b < 128 && calm(b)).forEach((b, i) => crawl(beat(b), i % 2 === 1, 320));
  for (let k = 21; k < 32; k += 2) if (calm(k * 4 + 2)) door(bar(k) + 2 * B, 'player');
  stalk(bar(21), -1, { v: 90, life: 10, color: RUST });
  stalk(bar(26), 1, { v: 95, life: 10, color: RUST });
  for (const k of [22, 25, 28, 30]) blink(bar(k), 140);

  // ===== CAM 13 32〜36小節 ｜ 監視カメラの映像: カメラが1小節ごとに切りかわる ／ ストーカーが歩いてくる ====
  burst(bar(32), () => { stageTo({ cctv: 1, dark: 0 }, 0.01); });
  const cams = [[1.35, 0.8], [0.92, 0], [1.6, 1], [1.15, 0.4]];
  for (let k = 32; k < 36; k++) cam(bar(k), ...cams[k - 32]);
  stalk(bar(32), -1, { v: 70, life: 14, color: GREEN });
  for (const k of [33, 34, 35]) drops(bar(k) + 2 * B, 2, 120);
  burst(bar(36) - 0.05, () => stageTo({ cctv: 0, zoom: 1, follow: 0 }, 0.01));

  // ===== RUN 36〜46小節 ｜ 逃げろ: はうもの ／ 扉 ／ 血の雨 ／ 目玉 ／ 速いストーカー ========================
  stalk(bar(37), 1, { v: 140, life: 8, color: RUST });
  stalk(bar(41), -1, { v: 150, life: 8, color: RUST });
  for (let k = 37; k < 46; k++) {
    if (k < 45) crawl(bar(k) + B, k % 2 === 0, 340);         // 最後の小節は、にせのフリーズの前なので出さない
    if (k % 2 === 0) eyes(bar(k) + 2 * B, 14, 160, CX, 150, k * 0.27);
    fire(bar(k) + 3 * B, 0.5, delay => { for (let i = 0; i < 4; i++) bloodDrop({ x: rand(30, W - 30), delay: delay + i * 0.1, r: 7 }); });
    if (k % 3 === 1) door(bar(k) + 2.5 * B, 'player');
  }
  for (const k of [39, 42, 44]) blink(bar(k), 160);

  // ===== 最後 46〜 ｜ 真っ暗 → 最後のおどかし =======================================================
  burst(bar(46), () => stageTo({ dark: 1 }, 0.3));

  return cues.sort((a, b) => a.t - b.t);
}

addSong({
  id: 'ward13',
  title: 'Ward 13',
  meta: '100 BPM · 1:56 · オリジナル曲 · ホラー',
  file: 'Ward13.mp3',
  bpm: 100, beat: W13_BEAT, end: 115.5,
  beatTime: w13BeatTime,
  beatPos: w13BeatPos,
  speedAt: w13SpeedAt,
  env: ENV_WARD13,
  sections: W13_SECTIONS,
  build: ward13Chart,
  theme: 'horror',                 // visuals-horror.js の見た目のセット
  titleLook: { sky: ['#06070a', '#14171c'], color: '#c9d4c2', tier: 0.5, pulse: 0.003, stars: 0 },
  titleBpm: 50,
  preview: 86.9,
  overTitle: 'YOU DIED',
  clearTitle: 'SURVIVED',
  clearText: '夜が明けた。……あれは、まだ病院の中にいる。',
  bestKey: 'dodge_best_ward13',
});
