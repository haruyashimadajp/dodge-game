"use strict";

/* =========================================================================
   曲⑲  And Revive The Melody（黒魔 / Chroma）  —  拍・場面・譜面（弾幕）
   BPM 220、2:52。オンゲキ bright MEMORY Act.3 の曲で、「Don't Fight The Music」の続編。
   KING of Performai The 5th の決勝の課題曲として作られ、MASTER 譜面（Lv.15）は 5 人の譜面作者の合作
   （0〜25秒 ロシェ＠ペンギン / 25〜63秒 ものくろっく / 63〜89秒 じゃこレモン / 89〜123秒 アマリリス / 123秒〜 みそかつ侍）。
   最後は作者いわく「思い出ボムラッシュ」。

   この譜面は、MASTER 譜面の画像（sdvx.in）から、床の広さ・長い音・弾・金色の音・横に払う矢印の位置を
   1 小節ずつ読み取って（songs/arm-data.js）、このゲームのルールに置きかえたもの。
   オンゲキの見た目（レーン・ノーツの板・キャラクター）は使わず、「止まってしまったメロディを生き返らせる」
   という曲名から作った、燃えた楽譜の世界で遊ぶ:
     床の広さ       … 左右の壁（燃えた楽譜のカーテン）。上から、これから先の形が下りてくる
     長い音（ホールド）… 空から下りてくるリボン。床や足場にふれた所が熱い → その上にいないか、跳びこえる
     短い音（タップ） … 床に落ちて光るだけ（当たらない。拍がわかる）
     弾             … 上から落ちてくる黒い音符。ふつうの弾と同じ
     金色の音（ベル） … 「メロディのかけら」。さわると取れる（当たりではない）。最後に、いくつ取れたかが出る
     横に払う矢印    … 大きいものだけ、床をすべる光の波（グリッサンド）になる → 跳びこえる
   音の解析: 1小節目の頭 = 1.21秒（イントロのメロディが 3 小節目、最初の盛り上がりが 7 小節目から）。
   拍は最後まで 220 BPM のまま（途中の「止まる所」は休符）。
   見た目は visuals-revive.js（theme: 'revive'）。
   ========================================================================= */

const ARM_BEAT = 60 / 220, ARM_T0 = 1.21;
function armBeatTime(n) { return ARM_T0 + n * ARM_BEAT; }
function armBeatPos(t) { return (t - ARM_T0) / ARM_BEAT; }
const armBar = b => ARM_T0 + (b - 1) * 4 * ARM_BEAT;          // b 小節目（1 から。小数も可）の時刻
const ARM_FALL = 600;                                         // 楽譜（リボン・弾・金色の音）が落ちてくる速さ px/秒
const ARM_HOT = 22;                                           // リボンが床や足場にふれている所の、熱い高さ（px）
const armX = u => W / 2 + (u - 0.5) * 1120;                   // 譜面の横の位置 u → 画面の x（ふつうの床の広さ ≒ 画面いっぱい）
const ARM_STATS = { got: 0, total: 0 };                       // メロディのかけら（金色の音）

// 読み取ったデータを、秒と px に直しておく（ページを開いたときに 1 回だけ）
const ARM = (() => {
  const D = ARM_DATA;
  const line = pts => ({ t: pts.map(p => armBar(p[0])), x: pts.map(p => armX(p[1])) });
  const holds = D.holds.map(([c, pts]) => { const l = line(pts); return { c, t: l.t, x: l.x, t0: l.t[0], t1: l.t[l.t.length - 1] }; })
    .sort((a, b) => a.t0 - b.t0);
  return {
    L: line(D.field.L), R: line(D.field.R), holds,
    taps: D.taps.map(([b, u, c]) => ({ t: armBar(b), x: armX(u), c })),
    flicks: D.flicks.map(([b, u0, u1, d]) => ({ t: armBar(b), x0: armX(u0), x1: armX(u1), d })),
    walls: D.walls.map(([b, u]) => ({ t: armBar(b), side: u < 0.5 ? -1 : 1 })),
    melody: D.melody.map(([b, u, w]) => ({ t: armBar(b), x: armX(u), w: w * 1120 })),
  };
})();

// 折れ線 {t, x} の、時刻 t での x
function armLerp(l, t) {
  const T = l.t, n = T.length;
  if (t <= T[0]) return l.x[0];
  if (t >= T[n - 1]) return l.x[n - 1];
  let lo = 0, hi = n - 1;
  while (hi - lo > 1) { const m = (lo + hi) >> 1; if (T[m] <= t) lo = m; else hi = m; }
  const k = (t - T[lo]) / Math.max(1e-6, T[hi] - T[lo]);
  return l.x[lo] + (l.x[hi] - l.x[lo]) * k;
}
// 時刻 t の床の広さ（左の壁 l・右の壁 r。画面の外にはみ出すこともある）
function armField(t) { return { l: armLerp(ARM.L, t), r: armLerp(ARM.R, t) }; }

// リボン（長い音）が床・足場にふれている所に、プレイヤーの足があるか
function armRibbonHit() {
  const feet = player.y + player.h, cx = player.x + player.w / 2;
  for (const p of platforms) {
    if (feet < p.y - ARM_HOT || feet > p.y + 2) continue;               // その面の、熱い高さにいない
    if (!p.ground && (player.x + player.w < p.x || player.x > p.x + p.w || platformGone(p))) continue;
    const tau = songTime + (GROUND_Y - p.y) / ARM_FALL;                // いまその高さを通っているのは、楽譜のどの時刻か
    for (const h of ARM.holds) {
      if (h.t0 > tau) break;
      if (h.t1 < tau) continue;
      const x = armLerp(h, tau);
      if (Math.abs(x - cx) < 9 + player.w / 2 - 2 && (p.ground || (x > p.x - 6 && x < p.x + p.w + 6))) return true;
    }
  }
  return false;
}

// ★楽譜★ 1 曲に 1 つ。壁を動かし、リボンの当たり判定を持つ（見た目は visuals-revive.js の armSheet）
function armSheet() {
  return spawn({
    kind: 'armSheet', x: W / 2, y: H / 2, r: 0, spd: 1, noFreeze: true, noTrail: true,
    move() {
      const f = armField(songTime);
      stage.wl = Math.max(0, Math.min(W / 2 - 50, f.l));
      stage.wr = Math.min(W, Math.max(W / 2 + 50, f.r));
    },
    hits: () => armRibbonHit(),
  });
}

// ★落ちる音符（弾）★ 時刻 t に、プレイヤーの高さ（床の少し上）の x に来る
function armNote(t, x, { r = 7, style = 'armNote', color, v = ARM_FALL } = {}) {
  const y0 = -14, PY = GROUND_Y - 10;
  return { at: t - (PY - y0) / v, go: () => spawn({ x, y: y0, vy: v, r, style, color, spd: 1 }) };
}

// ★メロディのかけら（金色の音）★ 時刻 t にプレイヤーの高さへ。さわると取れる
function armBell(t, x) {
  const y0 = -14, PY = GROUND_Y - 10;
  return { at: t - (PY - y0) / ARM_FALL, go: () => spawn({
    kind: 'armBell', x, y: y0, vy: ARM_FALL, r: 11, safe: true, spd: 1,
    move(b, dt) {
      b.y += b.vy * dt;
      if (scene === 'play' && circleHitsPlayer(b.x, b.y, b.r + 6)) {
        b.dead = true; ARM_STATS.got++;
        if (typeof armFx === 'function') armFx('bell', b.x, b.y);
      } else if (b.y > GROUND_Y + 4) { b.dead = true; if (typeof armFx === 'function') armFx('bellMiss', b.x); }
    },
  }) };
}

// ★グリッサンド★ 床をすべる光の波（横に払う矢印が床に着いたとき）。高さ 20px → 跳びこえる
function armGliss({ x, dir = 1, v = 720, len = 70 }) {
  return spawn({
    kind: 'armGliss', x, y: GROUND_Y - 10, dir, v, len, r: 10, spd: 1,
    move(b, dt) {
      b.x += b.dir * b.v * dt;
      if (b.x < stage.wl - b.len || b.x > stage.wr + b.len) b.dead = true;
    },
    hits: b => player.y + player.h > GROUND_Y - 20 && player.x + player.w > b.x - b.len / 2 + 4 && player.x < b.x + b.len / 2 - 4,
  });
}

/* ---- 場面 ------------------------------------------------------------------
   mood … 見た目の段階（0 = 灰色の止まった世界 → 3 = いちばん明るい）。dark = 1 で真っ暗
   -------------------------------------------------------------------------- */
const ARM_SECTIONS = [
  { t: 0,            mood: 0, name: '',                  sub: '',                                 sky: ['#07060f', '#120d1c'], color: '#cfc6e8', pulse: 0.002, stars: 0 },
  { t: armBar(3),    mood: 0, name: 'PRELUDE',           sub: 'メロディのかけら',                   sky: ['#0a0816', '#1a1228'], color: '#ffe3a1', pulse: 0.004, stars: 0 },
  { t: armBar(7),    mood: 1, name: 'And Revive',        sub: '黒魔 ─ 220 BPM',                    sky: ['#120a1e', '#2a1430'], color: '#ff8fb1', pulse: 0.012, stars: 0 },
  { t: armBar(15),   mood: 1, name: 'RIBBON',            sub: 'リボンの上にいないで',                sky: ['#140a22', '#2e1638'], color: '#ffd36b', pulse: 0.012, stars: 0 },
  { t: armBar(19),   mood: 1, name: 'PULSE',             sub: '',                                 sky: ['#120a22', '#2a1640'], color: '#8fd8ff', pulse: 0.014, stars: 0 },
  { t: armBar(23),   mood: 1, name: 'CADENCE',           sub: '床が右へ、左へ',                     sky: ['#100c24', '#24184a'], color: '#b7a4ff', pulse: 0.012, stars: 0 },
  { t: armBar(29),   mood: 2, name: 'REFRAIN',           sub: '黒い音符が降る',                     sky: ['#1e0a1e', '#481838'], color: '#ff8fb1', pulse: 0.018, stars: 0, sway: 0.4 },
  { t: armBar(39),   mood: 1, name: 'CROSSING',          sub: 'リボンが交差する',                   sky: ['#0c0a20', '#1c1a44'], color: '#8fd8ff', pulse: 0.008, stars: 0 },
  { t: armBar(47),   mood: 2, name: 'RESONANCE',         sub: '',                                 sky: ['#1a0c26', '#3c1846'], color: '#ffd36b', pulse: 0.016, stars: 0 },
  { t: armBar(57),   mood: 2, name: 'FORTISSIMO',        sub: '',                                 sky: ['#220a1c', '#521a34'], color: '#ff8fb1', pulse: 0.02,  stars: 0, sway: 0.5 },
  { t: armBar(73),   mood: 1, name: 'DRIFT',             sub: 'かたむいた床',                       sky: ['#0e0c22', '#22204a'], color: '#b7a4ff', pulse: 0.012, stars: 0 },
  { t: armBar(81),   mood: 1, name: 'FADING',            sub: '',                                 sky: ['#0a0818', '#18142e'], color: '#cfc6e8', pulse: 0.006, stars: 0 },
  { t: armBar(86.5), mood: 2, name: 'RISE',              sub: '',                                 sky: ['#1a0c22', '#40183e'], color: '#ffd36b', pulse: 0.018, stars: 0 },
  { t: armBar(93),   mood: 2, name: 'CRESCENDO',         sub: '',                                 sky: ['#200c1c', '#4c1a30'], color: '#ff8fb1', pulse: 0.02,  stars: 0, sway: 0.5 },
  { t: armBar(105.5),mood: 1, name: 'LAST LIGHT',        sub: '最後の光',                           sky: ['#0c0a1a', '#1c1430'], color: '#ffe3a1', pulse: 0.008, stars: 0 },
  { t: armBar(109),  mood: 0, dark: 1, name: '',         sub: '',                                 sky: ['#000000', '#040308'], color: '#6a6480', pulse: 0,     stars: 0 },
  { t: armBar(111),  mood: 0, name: 'REVIVE',            sub: 'ひとつの音から',                     sky: ['#04030a', '#0e0a1a'], color: '#ffe3a1', pulse: 0.004, stars: 0 },
  { t: armBar(119.6),mood: 3, name: 'PHOENIX',           sub: 'メロディがよみがえる',                sky: ['#2a0c10', '#6a2418'], color: '#ffb35c', pulse: 0.024, stars: 0, sway: 0.6, beams: true },
  { t: armBar(132),  mood: 3, name: 'REPRISE',           sub: '',                                 sky: ['#220c1c', '#5a1c34'], color: '#ff8fb1', pulse: 0.02,  stars: 0, sway: 0.5 },
  { t: armBar(145.2),mood: 2, name: 'UNISON',            sub: '',                                 sky: ['#160a20', '#3a1640'], color: '#ffe3a1', pulse: 0.016, stars: 0 },
  { t: armBar(149),  mood: 0, name: '',                  sub: '',                                 sky: ['#05040a', '#0c0814'], color: '#cfc6e8', pulse: 0,     stars: 0 },
  { t: armBar(150.6),mood: 3, name: 'MEMORIES',          sub: '思い出ボムラッシュ',                  sky: ['#300a14', '#7a2016'], color: '#ffb35c', pulse: 0.026, stars: 0, sway: 0.8, beams: true },
  { t: armBar(155),  mood: 3, name: '',                  sub: '',                                 sky: ['#2a1410', '#6a3a1c'], color: '#ffe3a1', pulse: 0.01,  stars: 0 },
];

function armChart() {
  const cues = [];
  const burst = (t, fn) => cues.push({ t, fn });
  const at = o => cues.push({ t: o.at, fn: o.go });
  const fx = (t, type, a, b) => burst(t, () => { if (typeof armFx === 'function') armFx(type, a, b); });
  const hsh = (a, b = 0) => { const v = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return v - Math.floor(v); };
  const D = ARM_DATA, bar = armBar;
  const PINK = '#ff5c9a', VIOLET = '#9b6bff', EMBER = '#ff9a3c';
  ARM_STATS.got = 0; ARM_STATS.total = 0;

  burst(0, () => armSheet());

  // ---- 譜面から: 弾・弾の列・弾の流れ ----
  for (const [b, u] of D.bullets) at(armNote(bar(b), armX(u)));
  for (const [b, u0, u1] of D.rows) {
    const x0 = armX(u0), x1 = armX(u1), n = Math.max(1, Math.round((x1 - x0) / 34));
    for (let i = 0; i <= n; i++) at(armNote(bar(b), x0 + (x1 - x0) * i / n, { r: 6 }));
  }
  for (const [b0, b1, u0, u1] of D.streams) {
    if (b0 >= 147.5) continue;
    for (let b = b0, i = 0; b < b1; b += 1 / 8, i++) at(armNote(bar(b), armX(u0 + (u1 - u0) * hsh(b * 7, i)), { r: 6, color: VIOLET, style: 'armOrb' }));
  }
  // ---- 金色の音（メロディのかけら）----
  for (const [b, u] of D.bells) { ARM_STATS.total++; at(armBell(bar(b), armX(u))); }
  // ---- 横に払う矢印: 大きいものだけ、床をすべる波になる（つづけて来すぎないように 3/4 小節あける）----
  let lastG = -9;
  for (const [b, u0, u1, d] of D.flicks) {
    if (u1 - u0 < 0.18 || b - lastG < 0.75 || b > 147) continue;
    lastG = b;
    const x0 = armX(u0), x1 = armX(u1);
    burst(bar(b), () => armGliss({ x: d > 0 ? x0 : x1, dir: d }));
  }

  // ---- 場面の演出 ----
  for (const b of [7, 15, 19, 23, 29, 39, 47, 57, 73, 87, 93, 121, 133]) fx(bar(b), 'swell', b >= 120 ? 1 : 0.6);
  fx(bar(2), 'breath');
  fx(bar(6.75), 'open');
  fx(bar(105.5), 'lastlight');
  fx(bar(108.6), 'fade');
  fx(bar(109), 'dark');
  fx(bar(111), 'spark');
  fx(bar(117), 'gather');
  fx(bar(119.6), 'phoenix');
  fx(bar(145.55), 'unison');
  fx(bar(146), 'fan');

  // ===== 148〜155 小節 ｜ 思い出ボムラッシュ =======================================================================
  // 148: 譜面の「爆弾の帯」= まんなか（金色の音のところ）だけあいた横一列
  {
    const t = bar(148);
    for (let x = 40; x <= W - 40; x += 32) if (Math.abs(x - W / 2) > 70) at(armNote(t, x, { r: 8, style: 'armFlame', color: EMBER }));
    ARM_STATS.total++; at(armBell(t, W / 2));
    fx(t, 'band');
  }
  // 148〜149: 羽根がぱらぱら（すき間の多い雨）
  for (let i = 1; i < 14; i++) {
    const b = 148 + i / 16, x = 80 + hsh(i, 3) * (W - 160);
    if (Math.abs(x - W / 2) < 60) continue;
    at(armNote(bar(b), x, { r: 7, style: 'armFeather', color: PINK }));
  }
  // 148.5〜149: 思い出（いろいろな弾）が空に散らばる → 149 の休符で空中に止まり、150 で音がもどると落ちてくる（まんなかは安全）
  for (let i = 0; i < 22; i++) {
    const tSpawn = bar(148.45) + i * 0.024, side = i % 2 ? 1 : -1, x = W / 2 + side * (140 + hsh(i, 21) * 230);
    const [style, color, r] = [['armFlame', EMBER, 8], ['armOrb', VIOLET, 7], ['armFeather', PINK, 7]][i % 3];
    at(armNote(tSpawn + (GROUND_Y - 10 + 14) / ARM_FALL, x, { r, style, color }));
  }
  // 149: 音が止まる → 弾も空中で止まる（時間停止）
  burst(bar(149), () => { timeStop(bar(150) - bar(149) + 0.02); });
  fx(bar(149), 'hush');
  // 150.6〜154.9: 本番。8分音符ごとに横一列が降る。すき間（幅 130px）がメロディの形に動く
  {
    const t0 = 164.45, t1 = bar(154.85);
    const gapAt = t => {
      const u = (t - t0) / (t1 - t0);
      return W / 2 + Math.sin(u * Math.PI * 2) * 160 * Math.min(1, u * 3) + Math.sin(u * Math.PI * 6) * 12;   // いちばん速くて約 240px/秒（走る速さは 260）
    };
    fx(t0, 'rush');
    const STYLES = [['armFlame', EMBER, 8], ['armOrb', VIOLET, 7], ['armFeather', PINK, 7]];
    let i = 0;
    for (let t = t0; t < t1; t += ARM_BEAT / 2, i++) {
      const g = gapAt(t + (GROUND_Y - 10 + 14) / ARM_FALL), half = 72 - 8 * Math.min(1, (t - t0) / 3);
      const [style, color, r] = STYLES[i % 3], off = (i % 2) * 17;
      for (let x = 24 + off; x <= W - 24; x += 34) if (Math.abs(x - g) > half) at(armNote(t, x, { r, style, color }));
      if (i % 4 === 2) { ARM_STATS.total++; at(armBell(t, g)); }
    }
  }
  // 155: メロディがよみがえる（残った弾は金色の光になって消える）
  burst(bar(155), () => { for (const b of bullets) if (!b.kind) { b.dead = true; sparks(b.x, b.y, { n: 3, color: '#ffe3a1', speed: 120, life: 0.6, size: 2 }); } });
  fx(bar(155), 'revived');

  return cues.sort((a, b) => a.t - b.t);
}

addSong({
  id: 'revive',
  title: 'And Revive The Melody',
  meta: '220 BPM · 2:52 · 黒魔 · オンゲキ MASTER 譜面より · むずかしい',
  file: 'AndReviveTheMelody.mp3',
  bpm: 220, beat: ARM_BEAT, end: 170.4,
  beatTime: armBeatTime,
  beatPos: armBeatPos,
  env: ENV_ARM,
  sections: ARM_SECTIONS,
  build: armChart,
  theme: 'revive',                 // visuals-revive.js の見た目のセット
  titleLook: { sky: ['#0a0816', '#2a1430'], color: '#ffd36b', tier: 1, pulse: 0.02, stars: 0 },
  titleBpm: 220,
  preview: 131.0,
  clearTitle: 'MELODY REVIVED',
  overTitle: 'メロディが止まった…',
  clearText: () => `メロディのかけら ${ARM_STATS.got} / ${ARM_STATS.total}`,
  bestKey: 'dodge_best_revive',
});
