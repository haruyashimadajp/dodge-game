"use strict";

/* =========================================================================
   曲⑭  TECTONIC（オリジナル曲）  —  拍・場面・譜面
   重低音・地震。140 BPM のヘヴィなダブステップ（2回目のサビの後半は、倍の速さのドラムンベース）。
   曲は songs/tectonic-compose.py で作曲・合成した。音はぜんぶこの曲だけのもの: のどうた（ホーミー: 低いうなりの上で倍音が口笛のように
   旋律を歌う）・石がこすれるようなベース・808のブーム・金床のスネア・砂利のシェイカー・石のマリンバ・弓でひくのこぎり・BRAAM（映画の金管）。
   音階は F のフリジアン・ドミナント（F Gb A Bb C Db Eb）。
   難易度はむずかしい。演出は visuals-quake.js。

   ベースの音の形が、そのまま弾の形になる:
     yoi（ヨイッ）= 上のすみから狙う3発 ／ wob（ワブワブ）= スピーカーがゆれの数だけ音の輪 ／ stab（短い一発）= 岩
     down（下がる）= ななめのビーム ／ wow（ワァオ）= イコライザーの棒 ／ up（上がる）= 床から噴き上がる
     stut（ダダダ）= 縦の連なり ／ dive（落ちる）= 隕石 ／ screech（金切り声）= X のビーム
   この曲だけの形（game.js の「TECTONIC」の所）: quakeWave（地割れの波）／ speaker（スピーカー）／ eqBars（イコライザー）
   ========================================================================= */

// 140 BPM: 1拍 = 60/140 秒（約0.43秒）、1小節 = 約1.71秒。0拍目 = 0.5秒
const TC_BEAT = 60 / 140;
function tcBeatTime(n) { return 0.5 + n * TC_BEAT; }
function tcBeatPos(t)  { return (t - 0.5) / TC_BEAT; }
const tcBar = k => tcBeatTime(k * 4);

const TC_SECTIONS = [
  { t: tcBar(0),  tier: 0.5, name: 'RUMBLE',       sub: '地鳴り',                  sky: ['#07040a', '#1a0d0a'], color: '#ff7a2a', pulse: 0.006, sway: 0.1, stars: 0 },
  { t: tcBar(8),  tier: 1.5, name: 'PRESSURE',     sub: '地下で圧力が高まっていく',  sky: ['#0a0508', '#2a110a'], color: '#ff8a3a', pulse: 0.012, sway: 0.2, stars: 0 },
  { t: tcBar(16), tier: 3,   name: 'TECTONIC',     sub: 'プレートが動く',            sky: ['#100406', '#3a0d06'], color: '#ff4a1a', pulse: 0.03,  sway: 0.5, stars: 0 },
  { t: tcBar(32), tier: 1,   name: 'AFTERSHOCK',   sub: '余震',                     sky: ['#05040a', '#140c14'], color: '#c86bff', pulse: 0.008, sway: 0.2, stars: 0 },
  { t: tcBar(40), tier: 2,   name: 'MAGMA RISING', sub: 'マグマが上がってくる',       sky: ['#0c0406', '#3a1206'], color: '#ffb02e', pulse: 0.014, sway: 0.3, stars: 0 },
  { t: tcBar(48), tier: 4,   name: 'MEGAQUAKE',    sub: '巨大地震',                  sky: ['#140306', '#4a0a08'], color: '#ff2d3a', pulse: 0.034, sway: 0.6, stars: 0 },
  { t: tcBar(56), tier: 4.5, name: 'FAULT LINE',   sub: '断層が走る（倍速）',         sky: ['#0a0310', '#3a0a2a'], color: '#ff3d8a', pulse: 0.028, sway: 0.4, stars: 0 },
  { t: tcBar(64), tier: 1,   name: 'COLLAPSE',     sub: '',                         sky: ['#060406', '#1a0a08'], color: '#ff7a2a', pulse: 0.01,  sway: 0.2, stars: 0 },
];

// 弾の速さ: 1.0〜1.4倍（むずかしい）
function tcSpeedAt(t) {
  let i = 0;
  while (i + 1 < TC_SECTIONS.length && TC_SECTIONS[i + 1].t <= t) i++;
  return 1.0 + 0.09 * TC_SECTIONS[i].tier;
}

function tectonicChart() {
  const cues = [];
  const burst = (t, fn) => cues.push({ t, fn });
  const B = TC_BEAT;
  const beat = tcBeatTime;
  const bar = tcBar;
  const fire = (t, warn, fn) => burst(t - warn, () => fn(warn));
  const SC = SCORE_TECTONIC;
  const CX = W / 2;
  const MAGMA = '#ff5a1f', EMBER = '#ffb02e', HOT = '#ff2d55', ASH = '#d8cfc4', SONIC = '#36e2ff', VIOLET = '#b36bff', ROCK = '#c98a5a';
  const inBars = (b, k0, k1) => b >= k0 * 4 && b < k1 * 4;
  const px = (m, lo, hi) => 60 + (W - 120) * Math.max(0, Math.min(1, (m - lo) / (hi - lo)));
  const hsh = (a, b = 0) => { const v = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return v - Math.floor(v); };
  const hint = (t, text, beats = 4) => burst(t, () => stageHint(text, beats * B));
  const pX = () => playerXY().x;

  // 道具
  const pebble = (t, x, o = {}) => fire(t, o.warn || 0.45, delay => spawn({ x, y: -10, vy: o.v || 200, vx: o.vx || 0, r: o.r || 6, delay, color: o.color || ASH, style: 'rock', lane: [0, 1] }));
  const boulder = (t, x, o = {}) => fire(t, 0.5, delay => spawn({ x, y: -20, vy: o.v || 330, r: o.r || 15, delay, color: o.color || ROCK, style: 'rock', lane: [0, 1] }));
  const quake = (t, fromLeft, o = {}) => fire(t, o.warn || 0.7, delay => quakeWave({ x: o.x != null ? o.x : (fromLeft ? -20 : W + 20), dir: o.dir || (fromLeft ? 1 : -1), h: o.h || 42, v: o.v || 400, delay, color: o.color || MAGMA }));
  const quakeBoth = (t, x, o = {}) => { quake(t, true, { ...o, x, dir: 1 }); quake(t, false, { ...o, x, dir: -1 }); };
  const yoi = (t, fromLeft, o = {}) => fire(t, 0.45, delay => fan({ x: fromLeft ? 70 : W - 70, y: 90, count: o.n || 3, spread: o.spread || 0.24, speed: o.v || 300, r: 8, delay }));
  // ななめのビーム: 上のすみから、いまの自分の少し先の地面へ（来る側へよける）
  const slam = (t, fromLeft, o = {}) => fire(t, 0.6, delay => {
    const x1 = fromLeft ? -40 : W + 40, y1 = 60, gx = Math.max(60, Math.min(W - 60, pX() + (fromLeft ? 40 : -40)));
    laser({ x1, y1, x2: x1 + (gx - x1) * 1.3, y2: y1 + (GROUND_Y - y1) * 1.3, width: 18, delay, hold: 0.22, color: o.color || HOT });
  });
  const eq = (t, hs, o = {}) => fire(t, o.warn || 0.85, delay => eqBars({ hs, delay, hold: o.hold || 0.3, color: o.color || EMBER }));
  const erupt = (t, o = {}) => fire(t, 0.6, delay => geyser({ x: Math.max(40, Math.min(W - 40, pX())), count: o.n || 6, gap: 0.06, speed: 560, r: 9, delay }));
  const stut = (t, o = {}) => fire(t, 0.4, delay => stream({ x: Math.max(40, Math.min(W - 40, pX() + (o.dx || 0))), count: 4, gap: 30, vy: 330, r: 7, delay, color: o.color || SONIC, style: 'rock' }));
  // 隕石: ちょうど t に地面に着くように、落ちる時間のぶん早く出す
  const rock = (t, o = {}) => { const r = o.r || 26, fall = (GROUND_Y - r - 40) / (900 * tcSpeedAt(t)); fire(t - fall, 0.6, delay => meteor({ x: Math.max(60, Math.min(W - 60, pX())), y: 40, fall: 900, r, wave: o.wave || 230, delay })); };
  const xs = (t, o = {}) => fire(t, 0.6, delay => xStrike({ x: Math.max(80, Math.min(W - 80, pX() + (o.dx || 0))), y: GROUND_Y - 120, width: 16, delay, hold: 0.22, color: o.color || VIOLET }));
  const spk = (t, x, y, beats, o = {}) => fire(t, o.warn || 0.9, delay => speaker({ x, y, size: o.size || 44, beats, n: o.n || 10, v: o.v || 165, r: 7, delay, color: o.color || SONIC, twist: o.twist || 0.5 }));

  // EQ の並び（10本）: H = 高い（よける）、L = 低い（跳び越える）、0 = なし（立てる）
  const EQS = [
    '0HHLHH0HHL', 'LHH0HHLHH0', 'L0HHLHH0HL', '0HHL0HHLH0', 'LHHL0HHLHL',      // どれも両はしは安全（壁ぎわで逃げ場がなくならない）
  ];
  const eqH = (p, k) => [...p].map((c, i) => c === 'H' ? 230 + 50 * hsh(k, i) : c === 'L' ? 52 : 0);

  // ベースの音1つ → 攻撃1つ（ドロップ）
  // wob は、その2小節ぶんの「ゆれ」をまとめて1台のスピーカーに渡す（ゆれ1回 = 音の輪1つ）
  function dropBars(k0, k1, mean) {
    const notes = SC.growl.filter(([b]) => inBars(b, k0, k1));
    for (let k = k0; k < k1; k += 2) {
      const wobs = [];
      for (const [b, L, off, shape, rate] of notes) if (b >= k * 4 && b < (k + 2) * 4 && shape === 'wob') {
        for (let u = 0; u < L - 1e-6; u += rate) wobs.push(beat(b + u));
      }
      if (!wobs.length) continue;
      const left = (k / 2) % 2 === 0;
      spk(wobs[0], left ? 130 : W - 130, 150, wobs, { n: mean ? 11 : 10, v: mean ? 180 : 165 });
      if (mean) spk(wobs[0], left ? W - 130 : 130, 150, wobs.filter((_, i) => i % 2 === 1), { n: 8, v: 150, color: VIOLET });
    }
    let side = true, eqi = 0;
    for (const [b, L, off, shape] of notes) {
      const t = beat(b);
      if (shape === 'yoi') { yoi(t, side = !side, { n: mean ? 4 : 3, spread: mean ? 0.3 : 0.24, v: mean ? 330 : 300 }); continue; }
      if (shape === 'stab') { boulder(t, px(off + hsh(b) * 4, -4, 16), { v: mean ? 380 : 340 }); continue; }
      if (shape === 'down') { slam(t, side = !side); continue; }
      if (shape === 'wow') { eq(t, eqH(EQS[eqi++ % EQS.length], b), { warn: 1.0 }); continue; }
      if (shape === 'up') { erupt(t, { n: mean ? 7 : 6 }); continue; }
      if (shape === 'stut') { stut(t); continue; }
      if (shape === 'dive') { rock(t, { wave: mean ? 260 : 230 }); continue; }
      if (shape === 'screech') { if (L >= 0.5 && Math.round(b * 2) % 2 === 0) xs(t, { dx: side ? 60 : -60 }); continue; }
    }
    // キック（小節の頭）= 地割れの波。左右かわりばんこ
    // （イコライザーの棒が立つ小節は、地割れを出さない。棒のすき間に立ったまま跳ぶことになって、よけられない）
    const eqBar = new Set(notes.filter(n => n[3] === 'wow').map(n => Math.floor(n[0] / 4)));
    for (let k = k0; k < k1; k++) if ((k % 2 === 0 || mean) && !eqBar.has(k)) quake(bar(k), k % 4 < 2, { h: 40, v: mean ? 430 : 400 });
  }

  // ===== RUMBLE 0〜8小節 ｜ 小石がぱらぱら ／ 4小節: 最初の地割れ ／ のどうたの倍音の旋律 = 小石 ==========================
  for (let k = 2; k < 8; k++) for (let i = 0; i < 3; i++) pebble(bar(k) + i * 1.33 * B, 80 + hsh(k, i) * (W - 160), { v: 150 + 30 * i });
  hint(bar(4) - 3 * B, '地割れ ─ 地面を走る岩の波は、跳び越える');
  quakeBoth(bar(4), CX, { h: 34, v: 280, warn: 1.0 });
  SC.hook.filter(([b]) => inBars(b, 4, 8)).forEach(([b, , m], i) => pebble(beat(b), px(m, 74, 86), { v: 210, color: EMBER, r: 7 }));

  // ===== PRESSURE 8〜16小節 ｜ キック = 地割れ ／ スネア = 3発 ／ 石のマリンバ（4つに1つ）→ 10小節からのこぎりの旋律 = 小石==================
  SC.kick.filter(b => inBars(b, 8, 14) && b % 4 !== 1.5).forEach((b, i) => quake(beat(b), i % 2 === 0, { h: 40, v: 380 }));
  SC.snare.filter(b => inBars(b, 8, 14)).forEach((b, i) => yoi(beat(b), i % 2 === 1, { n: 3, v: 260 }));
  SC.arp.filter(([b]) => inBars(b, 8, 10) && b % 1 === 0).forEach(([b, m]) => pebble(beat(b), px(m, 38, 56), { v: 240, color: EMBER }));
  SC.hook.filter(([b]) => inBars(b, 10, 14)).forEach(([b, , m]) => pebble(beat(b), px(m, 64, 76), { v: 250, color: EMBER, r: 7 }));      // のこぎりの旋律
  // 14〜16: スネアの連打 = 岩の雨（すき間がある）／ BRAAM のうなり = ロックオン ／ 最後の32分 = イコライザー
  hint(bar(14) - 2 * B, 'イコライザー ─ 低い棒は跳び越え、高い棒はよける');
  for (const [k, gx] of [[14, 230], [14.5, 410]]) fire(bar(k), 0.9, delay => curtain({ gapX: gx, gapW: 140, spacing: 34, vy: 320, r: 8, delay }));
  SC.siren.filter(b => b < 100).forEach(b => burst(beat(b), () => lockOn({ track: 0.6, lock: 0.35, r: 56, color: HOT })));
  eq(bar(15) + 2 * B, eqH('HHLHH0HHLH', 1), { warn: 0.8 });
  // ドロップの瞬間: 隕石がドン ＋ 両側へ地割れ
  hint(bar(16) - 4 * B, 'スピーカー ─ 低音がゆれるたびに音の輪');
  rock(bar(16), { r: 30, wave: 240 });

  // ===== TECTONIC 16〜32小節 ｜ ドロップ（ベースの音 = 弾）==============================================
  dropBars(16, 32, false);
  const wows = SC.growl.filter(g => g[3] === 'wow').map(g => g[0]);
  SC.hook.filter(([b]) => inBars(b, 24, 32) && !wows.some(w => b > w - 2 && b < w + 1.5)).forEach(([b, , m], i) => i % 2 === 0 && pebble(beat(b), px(m, 76, 88), { v: 230, color: EMBER, r: 6 }));

  // ===== AFTERSHOCK 32〜40小節 ｜ 静か。心臓の音 = まんなかのスピーカー ／ のどうたの倍音 = 小石 =========================
  for (let k = 33; k < 40; k++) for (let i = 0; i < 2; i++) pebble(bar(k) + (i * 2 + 1) * B, 80 + hsh(k, i + 9) * (W - 160), { v: 130, color: '#8a7f9a' });
  const hearts = SC.kick.filter(b => inBars(b, 34, 40)).map(beat);
  spk(hearts[0], CX, 130, hearts, { n: 14, v: 120, color: VIOLET, size: 52, warn: 1.2 });
  SC.hook.filter(([b]) => inBars(b, 36, 40)).forEach(([b, , m]) => pebble(beat(b), px(m, 74, 86), { v: 220, color: VIOLET, r: 7 }));

  // ===== MAGMA RISING 40〜48小節 ｜ 1回目より強い ==============================================================
  SC.kick.filter(b => inBars(b, 40, 46) && b % 4 !== 1.5).forEach((b, i) => quake(beat(b), i % 2 === 0, { h: 44, v: 420 }));
  SC.snare.filter(b => inBars(b, 40, 46)).forEach((b, i) => yoi(beat(b), i % 2 === 1, { n: 4, spread: 0.3, v: 290 }));
  SC.hook.filter(([b]) => inBars(b, 40, 46)).forEach(([b, , m]) => pebble(beat(b), px(m, 64, 76), { v: 270, color: EMBER, r: 7 }));
  for (let k = 42; k < 46; k++) erupt(bar(k) + 3 * B, { n: 5 });
  for (const [k, gx] of [[46, 580], [46.5, 400]]) fire(bar(k), 0.9, delay => curtain({ gapX: gx, gapW: 135, spacing: 32, vy: 330, r: 8, delay }));
  SC.siren.filter(b => b > 100).forEach(b => burst(beat(b), () => lockOn({ track: 0.6, lock: 0.35, r: 56, color: HOT })));
  eq(bar(47) + 2 * B, eqH('LHH0HHLHH0', 2), { warn: 0.8 });
  rock(bar(48), { r: 32, wave: 260 });

  // ===== MEGAQUAKE 48〜56小節 ｜ 2回目のドロップ（スピーカー2台・金切り声 = X のビーム）=================================
  dropBars(48, 56, true);

  // ===== FAULT LINE 56〜64小節 ｜ 倍速。リースの16分 = 音の高さの所に石が降る ／ スネア = 地割れ ===========================
  hint(bar(56) - 2 * B, '断層 ─ 音の高さの所に石が降る。すき間に立つ');
  SC.reese.filter(([b, L]) => inBars(b, 56, 64) && L < 1).forEach(([b, , m]) => pebble(beat(b), px(m, 36, 50), { v: 330, warn: 0.5, color: HOT, r: 7 }));
  SC.snare.filter(b => inBars(b, 56, 64) && b % 1 === 0).forEach((b, i) => quake(beat(b), i % 2 === 0, { h: 40, v: 460 }));
  for (const k of [57, 59, 61, 63]) yoi(bar(k) + 2.5 * B, k % 4 === 1, { n: 3, v: 320 });
  // 後半: まんなかに巨大なサブウーファー。キックのたびに、少しずつ回る音の輪
  const subKicks = SC.kick.filter(b => inBars(b, 60, 64)).map(beat);
  spk(subKicks[0], CX, 125, subKicks, { n: 12, v: 150, color: VIOLET, size: 58, warn: 1.2, twist: 0.3 });

  // ===== COLLAPSE 64〜 ｜ 最後の大地震 → 静かに崩れていく ============================================================
  rock(bar(64), { r: 36, wave: 280 });
  quakeBoth(bar(64) + 0.02, CX, { h: 46, v: 420, warn: 0.9 });
  eq(bar(64) + 2 * B, eqH('0HHLHH0HHL', 3), { warn: 1.0 });
  for (let k = 65; k < 67; k++) for (let i = 0; i < 3; i++) pebble(bar(k) + i * 1.33 * B, 80 + hsh(k, i + 3) * (W - 160), { v: 160 });

  return cues.sort((a, b) => a.t - b.t);
}

addSong({
  id: 'tectonic',
  title: 'TECTONIC',
  meta: '140 BPM · 1:57 · オリジナル曲 · 重低音 · むずかしい',
  file: 'Tectonic.mp3',
  bpm: 140, beat: TC_BEAT, end: 117.4,
  beatTime: tcBeatTime,
  beatPos: tcBeatPos,
  speedAt: tcSpeedAt,
  env: ENV_TECTONIC,
  sections: TC_SECTIONS,
  build: tectonicChart,
  theme: 'quake',                  // visuals-quake.js の見た目のセット
  titleLook: { sky: ['#0a0406', '#2a0d06'], color: '#ff5a1f', tier: 2, pulse: 0.02, stars: 0 },
  titleBpm: 140,
  preview: 27.9,
  clearTitle: 'SURVIVED',
  overTitle: 'のみこまれた…',
  clearText: '大地のうなりを、生きのびた。',
  bestKey: 'dodge_best_tectonic',
});
