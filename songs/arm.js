"use strict";

/* =========================================================================
   曲⑲  And Revive The Melody（黒魔 / Chroma）  —  拍・場面・譜面（弾幕）
   BPM 220、2:52。オンゲキ bright MEMORY Act.3 の曲で、「Don't Fight The Music」の続編。
   KING of Performai The 5th の決勝の課題曲として作られ、MASTER 譜面（Lv.15）は 5 人の譜面作者の合作
   （0〜25秒 ロシェ＠ペンギン / 25〜63秒 ものくろっく / 63〜89秒 じゃこレモン / 89〜123秒 アマリリス / 123秒〜 みそかつ侍）。
   最後は作者いわく「思い出ボムラッシュ」。

   この譜面は、MASTER 譜面の画像（sdvx.in）から読み取った「床の広さ」「横に払う矢印」「金色の音（ベル）」の位置だけを残し
   （songs/arm-data.js）、ほかの弾幕は曲の音に合わせたオリジナル。オンゲキの見た目（レーン・ノーツ・キャラクター）は使わず、
   「止まってしまったメロディを生き返らせる」という曲名から作った、オルゴールと燃えた楽譜の世界で遊ぶ:
     床の広さ       … 左右の壁（燃えた楽譜のカーテン）。上から、これから先の形が下りてくる。
                      原作よりなめらかにして、左右の動きを半分にしてある（最低でも 336px の広さ、壁が動くのは 140px/秒まで）
     横に払う矢印    … ぜんぶ、床をすべる光の波（グリッサンド）になる → 跳びこえる
     金色の音（ベル） … 「メロディのかけら」。さわると取れる（当たりではない）。最後に、いくつ取れたかが出る
     短い音（タップ） … 床に落ちて光るだけ（当たらない。拍がわかる）
   オリジナルの弾幕: くし（円盤の上の金属の歯）からのねらい撃ち・円盤の輪・オルゴールの渦（ARM_ONSETS のキックやメロディに合わせる）・
   ゆれて落ちる羽根・床から上がる火の粉・くしの歯（たての光）・五線のビーム（床すれすれ → 跳ぶ）・隅からの斜めの列・最後の思い出ボムラッシュ。
   音の解析: 1小節目の頭 = 1.21秒（イントロのメロディが 3 小節目、最初の盛り上がりが 7 小節目から）。
   拍は最後まで 220 BPM のまま（途中の「止まる所」は休符）。
   見た目は visuals-revive.js（theme: 'revive'）。
   ========================================================================= */

const ARM_BEAT = 60 / 220, ARM_T0 = 1.21;
function armBeatTime(n) { return ARM_T0 + n * ARM_BEAT; }
function armBeatPos(t) { return (t - ARM_T0) / ARM_BEAT; }
const armBar = b => ARM_T0 + (b - 1) * 4 * ARM_BEAT;          // b 小節目（1 から。小数も可）の時刻
const ARM_FALL = 600;                                         // 楽譜（壁の形・弾・金色の音）が落ちてくる速さ px/秒
const armX = u => W / 2 + (u - 0.5) * 1120;                   // 譜面の横の位置 u → 画面の x（ふつうの床の広さ ≒ 画面いっぱい）
const ARM_STATS = { got: 0, total: 0 };                       // メロディのかけら（金色の音）

// 読み取ったデータを、秒と px に直しておく（ページを開いたときに 1 回だけ）
const ARM = (() => {
  const D = ARM_DATA;
  const line = pts => ({ t: pts.map(p => armBar(p[0])), x: pts.map(p => armX(p[1])) });
  return {
    L: line(D.field.L), R: line(D.field.R),
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

// ★楽譜★ 1 曲に 1 つ。毎コマ、左右の壁を譜面の床の広さに合わせる（見た目は visuals-revive.js の armSheet）
function armSheet() {
  return spawn({
    kind: 'armSheet', x: W / 2, y: H / 2, r: 0, spd: 1, noFreeze: true, noTrail: true,
    move() {
      const f = armField(songTime);
      stage.wl = Math.max(0, Math.min(W, f.l));                         // 見た目の壁と同じ位置（押されたら、ちゃんと壁のふちまで動く）
      stage.wr = Math.max(stage.wl + 40, Math.min(W, f.r));
    },
    safe: true,
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

// ★グリッサンド★ 床をすべる光の波（横に払う矢印が床に着いたとき）。高さ 16px → 跳びこえる
function armGliss({ x, dir = 1, v = 600, len = 64 }) {
  return spawn({
    kind: 'armGliss', x, y: GROUND_Y - 10, dir, v, len, r: 10, spd: 1,
    move(b, dt) {
      b.x += b.dir * b.v * dt;
      if (b.x < stage.wl - b.len || b.x > stage.wr + b.len) b.dead = true;
    },
    hits: b => player.y + player.h > GROUND_Y - 16 && player.x + player.w > b.x - b.len / 2 + 10 && player.x < b.x + b.len / 2 - 10,
  });
}

/* ---- 場面 ------------------------------------------------------------------
   mood … 見た目の段階（0 = 灰色の止まった世界 → 3 = いちばん明るい）。dark = 1 で真っ暗
   -------------------------------------------------------------------------- */
const ARM_SECTIONS = [
  { t: 0,            mood: 0, name: '',                  sub: '',                                 sky: ['#07060f', '#120d1c'], color: '#cfc6e8', pulse: 0.002, stars: 0 },
  { t: armBar(3),    mood: 0, name: 'PRELUDE',           sub: 'メロディのかけら',                   sky: ['#0a0816', '#1a1228'], color: '#ffe3a1', pulse: 0.004, stars: 0 },
  { t: armBar(7),    mood: 1, name: 'And Revive',        sub: '黒魔 ─ 220 BPM',                    sky: ['#120a1e', '#2a1430'], color: '#ff8fb1', pulse: 0.012, stars: 0 },
  { t: armBar(15),   mood: 1, name: 'FEATHERS',          sub: '羽根がゆれて落ちる',                sky: ['#140a22', '#2e1638'], color: '#ffd36b', pulse: 0.012, stars: 0 },
  { t: armBar(19),   mood: 1, name: 'PULSE',             sub: '',                                 sky: ['#120a22', '#2a1640'], color: '#8fd8ff', pulse: 0.014, stars: 0 },
  { t: armBar(23),   mood: 1, name: 'CADENCE',           sub: 'くしの歯が鳴る',                     sky: ['#100c24', '#24184a'], color: '#b7a4ff', pulse: 0.012, stars: 0 },
  { t: armBar(29),   mood: 2, name: 'REFRAIN',           sub: '黒い音符が降る',                     sky: ['#1e0a1e', '#481838'], color: '#ff8fb1', pulse: 0.018, stars: 0, sway: 0.4 },
  { t: armBar(39),   mood: 1, name: 'CROSSING',          sub: 'オルゴールの渦',                   sky: ['#0c0a20', '#1c1a44'], color: '#8fd8ff', pulse: 0.008, stars: 0 },
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

  // ---- 金色の音（メロディのかけら）: 譜面のベルの位置 ----
  for (const [b, u] of D.bells) { ARM_STATS.total++; at(armBell(bar(b), armX(u))); }
  // ---- 横に払う矢印: ぜんぶ床をすべる波になる。
  //      すぐ続けて来る矢印（間が 1/8 小節より短い）はひとまとまりにして、向きごとに 1 つの波にまとめる（1 回跳べばこえられる）----
  {
    const fl = D.flicks.filter(f => f[0] <= 147).sort((p, q) => p[0] - q[0]), runs = [];
    for (const f of fl) { const r = runs[runs.length - 1]; if (r && f[0] - r[r.length - 1][0] < 0.125) r.push(f); else runs.push([f]); }
    for (const r of runs) for (const d of [-1, 1]) {
      const fs = r.filter(f => f[3] === d);
      if (!fs.length) continue;
      const x = d > 0 ? Math.min(...fs.map(f => armX(f[1]))) : Math.max(...fs.map(f => armX(f[2])));
      burst(bar(r[0][0]), () => armGliss({ x: Math.max(stage.wl + 10, Math.min(stage.wr - 10, x)), dir: d }));
    }
  }

  // ===== ここから下はオリジナルの弾幕（曲の音に合わせて、オルゴール・不死鳥のことばで作った）=====================
  const ON = ARM_ONSETS, s16 = i => ARM_T0 + i * ARM_BEAT / 4;
  const onsIn = (key, b0, b1) => ON[key].filter(i => i >= (b0 - 1) * 16 && i < (b1 - 1) * 16);
  const COMB = { x: W / 2, y: 40 }, DISC = { x: W / 2, y: 300 };
  const glissT = D.flicks.map(f => bar(f[0]));                    // 床の波が来る時刻（ほかの攻撃と重ねすぎないように使う）
  const ROSE = '#ff7aa0', GOLD = '#ffd36b', AZURE = '#8fd8ff';
  const VOICE = [ROSE, GOLD, AZURE];
  const fieldMid = t => { const f = armField(t); return (Math.max(0, f.l) + Math.min(W, f.r)) / 2; };
  const fieldW = t => { const f = armField(t); return Math.min(W, f.r) - Math.max(0, f.l); };
  // くし（円盤の上）から、ねらって撃つ音符。n 個を spread ずつ開く
  const comb = (t, { n = 1, spread = 0.22, v = 230, warn = 0.3, color = GOLD, style = 'armNote', from = COMB } = {}) =>
    burst(t - warn, () => { for (let i = 0; i < n; i++) { const a0 = Math.atan2(playerXY().y - from.y, playerXY().x - from.x) + (i - (n - 1) / 2) * spread;
      spawn({ x: from.x, y: from.y, vx: Math.cos(a0) * v, vy: Math.sin(a0) * v, r: 7, delay: warn, color, style }); } });
  // 円盤のまん中から広がる輪（count 個。start でずらす）。0.3 秒前からまん中が光って予告 → 拍ぴったりに飛び出す
  const discRing = (t, count, v, { start = 0, color = AZURE, style = 'armNote', r = 6, warn = 0.3 } = {}) => burst(t - warn, () => {
    for (let i = 0; i < count; i++) { const a = start + i / count * TAU; spawn({ x: DISC.x + Math.cos(a) * 14, y: DISC.y + Math.sin(a) * 14, vx: Math.cos(a) * v, vy: Math.sin(a) * v, r, color, style, delay: warn }); }
    if (typeof armFx === 'function') armFx('ring');
  });
  // オルゴールの渦: 円盤のまん中から 1 つずつ、角度を回しながら（1 拍に per 個、turn = 1 拍で回る角度）
  const swirl = (b0, b1, { per = 2, turn = 0.9, v = 150, arms = 1, color = AZURE, style = 'armOrb', R = 16, a0 = 0 } = {}) => {
    for (let i = 0, t = bar(b0); t < bar(b1) - 1e-6; i++, t += ARM_BEAT / per) {
      const a = a0 + i * turn / per;
      burst(t, () => { for (let k = 0; k < arms; k++) { const aa = a + k * TAU / arms; spawn({ x: DISC.x + Math.cos(aa) * R, y: DISC.y + Math.sin(aa) * R, vx: Math.cos(aa) * v, vy: Math.sin(aa) * v, r: 6, color, style }); } });
    }
  };
  // 羽根: 上からゆれながら落ちる
  const feather = (t, x, { vy = 170, sw = 40, color = ROSE } = {}) => burst(t, () => spawn({
    x, y: -16, x0: x, vy, sw, ph: hsh(x, t) * TAU, r: 7, style: 'armFeather', color,
    move(b, dt) { b.y += b.vy * dt; b.x = b.x0 + Math.sin(b.age * 2.2 + b.ph) * b.sw; },
  }));
  // 火の粉: 床の下から上へ（予告 = 光の筋）
  const emberNow = (x, { v = 560, warn = 0.55 } = {}) => spawn({ x, y: GROUND_Y + 12, vy: -v, r: 7, delay: warn, style: 'armFlame', color: EMBER, lane: [0, -1] });
  const ember = (t, x, o = {}) => burst(t - (o.warn || 0.55), () => emberNow(x, o));
  // くしの歯（たての光）: 上から床まで
  const tooth = (t, x, { w = 30, warn = 0.6, hold = 0.2, color = GOLD } = {}) => glissT.some(g => Math.abs(g - t) < 0.4) ? null : burst(t - warn, () => laser({ x1: x, y1: -40, x2: x, y2: GROUND_Y + 30, width: w, delay: warn, hold, color }));
  // 五線のビーム: 床すれすれの横の光 → 跳ぶ
  const staff = (t, { warn = 0.7, hold = 0.16, color = ROSE } = {}) => glissT.some(g => Math.abs(g - t) < 0.8) ? null : burst(t - warn, () => laser({ x1: -40, y1: GROUND_Y - 6, x2: W + 40, y2: GROUND_Y - 6, width: 10, delay: warn, hold, color }));
  // 斜めの音符の列（隅から、床の xT のあたりへ）
  const slant = (t, fromLeft, xT, { n = 6, gap = ARM_BEAT / 2, v = 300, color = AZURE } = {}) => {
    for (let i = 0; i < n; i++) burst(t + i * gap, () => { const x0 = fromLeft ? -10 : W + 10, y0 = 60, a = Math.atan2(GROUND_Y - y0, xT - x0);
      spawn({ x: x0, y: y0, vx: Math.cos(a) * v, vy: Math.sin(a) * v, r: 7, color, style: 'armNote' }); });
  };

  // ===== 3〜6 ｜ PRELUDE: 2 拍ごとに、くしから 1 つだけ（ゆっくり）==================================================
  for (let b = 3; b < 7; b += 0.5) comb(bar(b), { v: 150, warn: 0.4, color: GOLD });

  // ===== 7〜14 ｜ AWAKENING: 小節の頭に円盤の輪、2・4 拍目にくしから 3 つ ============================================
  for (let k = 7; k < 15; k++) {
    discRing(bar(k), 12, 140, { start: k * 0.37, color: VOICE[k % 3] });
    comb(bar(k + 0.25), { n: 3, spread: 0.3, v: 220 });
    comb(bar(k + 0.75), { n: 3, spread: 0.3, v: 220, color: ROSE });
  }

  // ===== 15〜18 ｜ RIBBON: 羽根の流れ（8 分音符ごと。落ちる場所が波の形にゆれる。波の外側はあいている）=================
  for (let i = 0, t = bar(15); t < bar(19); i++, t += ARM_BEAT / 2) {
    const m = fieldMid(t), wv = fieldW(t) * 0.32;
    feather(t, m + Math.sin(i * 0.42) * wv, { color: i % 2 ? ROSE : GOLD });
  }
  for (let k = 15; k < 19; k++) comb(bar(k + 0.5), { n: 1, v: 260, color: AZURE });

  // ===== 19〜22 ｜ PULSE: 階段のように落ちる音符（8 分）＋ キックの輪 =================================================
  for (let i = 0, t = bar(19); t < bar(23); i++, t += ARM_BEAT / 2) {
    const step = i % 16, dir = Math.floor(i / 16) % 2 ? -1 : 1;
    at(armNote(t + 1.15, fieldMid(t) + dir * (step - 7.5) * fieldW(t) / 18, { color: VOICE[step % 3] }));
  }
  for (const i of onsIn('K', 19, 23).filter((v, j, a) => j === 0 || v - a[j - 1] >= 8)) discRing(s16(i), 10, 160, { start: i * 0.21, color: GOLD });

  // ===== 23〜28 ｜ CADENCE: くしの歯（たての光）が小節ごとに 3 本。左・まんなか・右の順に、あく場所が変わる ===========
  for (let k = 23; k < 29; k++) {
    const t = bar(k), m = fieldMid(t), w = fieldW(t), safe = k % 3;
    for (let j = 0; j < 4; j++) if (j !== safe && j !== safe + 1) tooth(t, m + (j - 1.5) * w / 4.2, { color: VOICE[j % 3] });
    comb(bar(k + 0.5), { n: 2, spread: 0.5, v: 240, color: AZURE });
  }

  // ===== 29〜38 ｜ REFRAIN: 2 本腕のオルゴールの渦 ＋ 小節の頭にねらい撃ち。31〜36 は羽根も =============================
  swirl(29, 39, { per: 2, turn: 0.55, v: 150, arms: 2, color: AZURE });
  for (let k = 29; k < 39; k++) comb(bar(k), { n: 3, spread: 0.18, v: 260, color: ROSE });
  for (let k = 31; k < 37; k++) for (let q = 0; q < 4; q++) feather(bar(k + q / 4 + 0.125), fieldMid(bar(k)) + (q % 2 ? 1 : -1) * (120 + 60 * hsh(k, q)), { color: GOLD });
  staff(bar(39) - 0.02);

  // ===== 39〜46 ｜ CROSSING: キックが消える所。円盤からゆっくり 4 本腕の渦が回る（右回り → 43 から左回り）=================
  swirl(39.25, 43, { per: 2, turn: 0.3, v: 110, arms: 3, color: AZURE, a0: 0.4 });
  swirl(43, 47, { per: 2, turn: -0.3, v: 115, arms: 3, color: ROSE, a0: 0.1 });
  discRing(bar(47), 20, 120, { color: GOLD, start: 0.15 });
  staff(bar(47.75), { color: GOLD });

  // ===== 48〜56 ｜ RESONANCE: キックごとに円盤の輪（大きい音だけ）＋ 2 小節ごとに床から火の粉 ===========================
  {
    let last = -99;
    for (const i of onsIn('K', 48, 57)) { if (i - last < 8) continue; last = i; discRing(s16(i), 9, 150, { start: i * 0.33, color: VOICE[(i >> 3) % 3] }); }
    for (let k = 48; k < 57; k += 2) for (let j = 0; j < 3; j++) burst(bar(k + 1) + j * ARM_BEAT - 0.55, () => emberNow(Math.max(stage.wl + 20, Math.min(stage.wr - 20, playerXY().x))));   // 自分の足もとをねらう
  }

  // ===== 57〜72 ｜ FORTISSIMO: 2 小節ずつ「くしの歯が左から右へ歩く」と「すき間つきの羽根のカーテン」を交互に ==============
  for (let k = 57; k < 73; k += 2) {
    const t = bar(k), m = fieldMid(t), w = fieldW(t);
    if ((k - 57) % 4 === 0) {
      const dir = (k - 57) % 8 === 0 ? 1 : -1;
      for (let j = 0; j < 6; j++) tooth(bar(k + j * 0.25), m + dir * (j - 2.5) * w / 6.5, { w: 26, warn: 0.5, hold: 0.16, color: VOICE[j % 3] });
      comb(bar(k + 1.5), { n: 3, spread: 0.22, v: 240, color: ROSE });
    } else {
      for (let r = 0; r < 4; r++) {
        const tt = bar(k + r * 0.5), g = m + Math.sin(k * 0.7 + r * 0.45) * w * 0.22;   // すき間は 1 列ごとに少しずつ動く
        for (let x = 30; x < W - 20; x += 44) if (Math.abs(x - g) > 88) at(armNote(tt + 1.1, x, { r: 6, style: 'armFeather', color: r % 2 ? GOLD : ROSE }));
      }
      discRing(bar(k + 1), 14, 150, { color: AZURE });
    }
  }
  staff(bar(73) - 0.02, { color: AZURE });

  // ===== 73〜80 ｜ DRIFT: 床がかたむく所。隅から斜めに音符の列（1 小節ごとに左右が入れかわる）==========================
  for (let k = 73; k < 81; k++) slant(bar(k), k % 2 === 1, fieldMid(bar(k + 0.5)) + (k % 2 ? 1 : -1) * 60, { n: 6, v: 320, color: k % 2 ? AZURE : ROSE });

  // ===== 81〜86 ｜ FADING: 音がうすくなる。ゆっくりの音符だけ ==========================================================
  for (let b = 81; b < 86; b += 0.5) comb(bar(b), { v: 170, color: '#cfc6e8' });
  staff(bar(86.5), { color: GOLD });

  // ===== 86.5〜92 ｜ RISE: 火の粉が床から、左 → 右 → 左へ行進 ＋ 小節の頭にねらい撃ち =================================
  for (let i = 0, t = bar(86.5); t < bar(92.5); i++, t += ARM_BEAT) {
    const m = fieldMid(t), w = fieldW(t) - 60, ph = (i % 16) / 15, x = m - w / 2 + w * (Math.floor(i / 16) % 2 ? 1 - ph : ph);
    ember(t, x, { v: 600, warn: 0.6 });
  }
  for (let k = 87; k < 93; k++) comb(bar(k), { n: 3, spread: 0.24, v: 260, color: GOLD });

  // ===== 93〜105 ｜ CRESCENDO: 2 本腕の渦が速くなっていく ＋ 4 小節ごとに輪が重なる ====================================
  swirl(93, 99, { per: 2, turn: 0.62, v: 165, arms: 2, color: ROSE });
  swirl(99, 105, { per: 3, turn: 0.62, v: 180, arms: 2, color: GOLD, a0: 1 });
  for (let k = 93; k < 105; k++) if (k % 2) comb(bar(k + 0.5), { n: 2, spread: 0.6, v: 250, color: AZURE });
  for (const k of [97, 101, 103, 104]) { discRing(bar(k), 16, 150, { color: AZURE }); discRing(bar(k) + ARM_BEAT, 16, 150, { color: AZURE, start: TAU / 32 }); }

  // ===== 105.5〜108.5 ｜ LAST LIGHT: 最後の光。上からゆっくり、まばらな音符 ============================================
  for (let b = 105.75; b < 108.5; b += 0.25) at(armNote(bar(b) + 1.1, fieldMid(bar(b)) + Math.sin(b * 5.1) * 230, { v: 380, color: '#ffe3a1' }));

  // ===== 111〜119 ｜ REVIVE: ひとつの音から。メロディの音ごとに小さな音符が 1 つ（だんだん増える）=======================
  {
    let last = -99;
    for (const i of onsIn('M', 113, 119.5)) { if (i - last < 4) continue; last = i; comb(s16(i), { v: 150, color: '#ffe3a1', warn: 0.35 }); }
  }

  // ===== 119.6〜131 ｜ PHOENIX: 翼から羽根が扇に降る ＋ 床から火の粉 ＋ 円盤の輪 =========================================
  for (let i = 0, t = bar(120); t < bar(132); i++, t += ARM_BEAT / 2) {
    const side = i % 2 ? 1 : -1, wx = W / 2 + side * 250, a = Math.PI / 2 - side * (0.25 + 0.5 * ((i >> 1) % 6) / 5);
    burst(t - 0.35, () => spawn({ x: wx, y: 300, vx: Math.cos(a) * 190, vy: Math.sin(a) * 190, r: 7, delay: 0.35, style: 'armFeather', color: side < 0 ? ROSE : GOLD }));   // 翼の先が光ってから
  }
  for (let k = 120; k < 132; k++) {
    discRing(bar(k), 10, 160, { start: k * 0.5, color: AZURE });
    if (k % 2 === 0) ember(bar(k + 0.5), Math.max(40, Math.min(W - 40, fieldMid(bar(k)) + (k % 4 ? 160 : -160))));
  }
  staff(bar(132) - 0.02, { color: ROSE });

  // ===== 132〜144 ｜ REPRISE: サビをもう一度。渦 ＋ くしの歯 ＋ ねらい撃ち =============================================
  swirl(132, 138, { per: 2, turn: 0.55, v: 160, arms: 2, color: AZURE });
  for (let k = 138; k < 145; k += 2) {
    const t = bar(k), m = fieldMid(t), w = fieldW(t);
    for (let j = 0; j < 6; j++) tooth(bar(k + j * 0.25), m + (k % 4 ? -1 : 1) * (j - 2.5) * w / 6.5, { w: 26, warn: 0.5, hold: 0.16, color: VOICE[j % 3] });
    discRing(bar(k + 1.5), 14, 155, { color: GOLD });
  }
  for (let k = 132; k < 145; k++) comb(bar(k + 0.5), { n: 3, spread: 0.2, v: 270, color: ROSE });

  // ===== 145.2〜148 ｜ UNISON: 音が集まって止まる → 下向きの扇 → 斜めの列が交差 =======================================
  burst(bar(146) - 0.4, () => { for (let i = 0; i < 21; i++) { const a = Math.PI / 2 + (i - 10) * 0.12; spawn({ x: DISC.x, y: DISC.y, vx: Math.cos(a) * 230, vy: Math.sin(a) * 230, r: 7, delay: 0.4, color: GOLD, style: 'armNote' }); } });
  slant(bar(147), true, W * 0.7, { n: 4, v: 340, color: ROSE });
  slant(bar(147), false, W * 0.3, { n: 4, v: 340, color: AZURE });

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
    for (let x = 40; x <= W - 40; x += 32) if (Math.abs(x - W / 2) > 120) at(armNote(t, x, { r: 8, style: 'armFlame', color: EMBER, v: 430 }));   // ゆっくり落とす（すみからでも間に合う）
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
      const g = gapAt(t), half = 72 - 8 * Math.min(1, (t - t0) / 3);
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
