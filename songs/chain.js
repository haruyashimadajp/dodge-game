"use strict";

/* =========================================================================
   曲㉑  CHAIN REACTION（オリジナル曲）  —  拍・場面・譜面
   「スイッチを入れると、ぜんぶが動き出す」。ピタゴラ装置のような、からくりの部屋のアイワナ風の耐久。
   144 BPM の明るいエレクトロ・ポップ（ニ長調。最後のサビは全音上がってホ長調）。歌はなし。
   曲は songs/chain-compose.py で作曲・合成した。リズムはぜんぶ「からくり」の音:
   スイッチの「カチッ」・時計のチクタク・ドミノ（倒れるたびに木琴の音）・転がるビー玉・ばね・ベル・オルゴール。
   難易度はふつう〜むずかしめ。演出は visuals-chain.js（パステルの部屋、大きなスイッチ、拍で動く図形）。

   ★この曲の弾は「拍に合わせて動く」★
   弾はなめらかに進まず、拍（または 8分）が来るたびに「カクッ」と一歩進んで止まる（stepper）。
   だから、どこに弾が来るかは「次の拍」を数えればわかる。画面も拍に合わせてゆれ、大きなスイッチで一回転する。

   音 → 弾:
     メロディ（リード・サビ）= 音の高さの所に、さくらんぼが落ちてくる（8分ごとに一段ずつ）
     大きなスイッチ「カチッ」 = まん中から星の輪が、1拍ごとに一段ずつ広がる ＋ 画面が一回転
     サビの小節の頭         = 左右の歯車から、四角の輪が 1拍ごとに広がる
     ドミノ（木琴の速い音）   = 上のドミノが順に倒れて、さくらんぼを落とす（ドミノとドミノの間に立つ）
     ビー玉                 = 床を転がってくる（跳び越える）
     ばね「ボヨン」          = 1拍ごとに跳ねながら進むボール（着地する所をよける）
     キック（サビ・1拍ごと）  = 床を一歩ずつ進むブロック（来る拍の直前に跳ぶ）
     スネアの連打           = 左右の壁が 1拍ごとに一歩ずつせまる（まん中へ）
     カチカチ（ビルドアップ） = 上から落ちる細いレーザー（順に横へ進む。レーザーの間に立つ）
     最後の「カチッ」（OFF）  = ぜんぶの弾が止まって消える
   ========================================================================= */

// 144 BPM: 1拍 = 60/144 秒（約0.42秒）、1小節 = 約1.67秒。0拍目 = 0.5秒
const CR_BEAT = 60 / 144;
function crBeatTime(n) { return 0.5 + n * CR_BEAT; }
function crBeatPos(t)  { return (t - 0.5) / CR_BEAT; }
const crBar = k => crBeatTime(k * 4);
// 拍で「カクッ」と進む時計: 拍の頭から sh 拍のあいだに一歩ぶん進み、あとは止まっている
function crSnap(x, sh = 0.3) { const n = Math.floor(x), f = x - n; return n + 1 - Math.pow(1 - Math.min(1, f / sh), 3); }

const CR_SECTIONS = [
  { t: crBar(0),  tier: 0.5, name: 'SWITCH: OFF',      sub: 'からくりの部屋',                 sky: ['#d6dbe6', '#e8ebf2'], color: '#7c8aa0', pulse: 0.004, sway: 0, stars: 0 },
  { t: crBar(4),  tier: 1.5, name: 'SWITCH ON!',       sub: 'ぜんぶが動き出す',               sky: ['#bfe3ff', '#ffe1f0'], color: '#ff4f8b', pulse: 0.014, sway: 0, stars: 0 },
  { t: crBar(12), tier: 2,   name: 'CHAIN',            sub: 'ドミノ・ビー玉・ばね',           sky: ['#c9f2e0', '#fff1c4'], color: '#16a874', pulse: 0.012, sway: 0, stars: 0 },
  { t: crBar(20), tier: 3,   name: 'CHAIN REACTION',   sub: '拍に合わせて、一歩ずつ',         sky: ['#c4d8ff', '#ffd3ea'], color: '#2f7cff', pulse: 0.03,  sway: 0, stars: 0 },
  { t: crBar(36), tier: 1.5, name: 'MACHINE',          sub: 'からくりだけが動いている',       sky: ['#eadfff', '#d3e9ff'], color: '#7c5cff', pulse: 0.01,  sway: 0, stars: 0 },
  { t: crBar(44), tier: 2.5, name: 'CLICK CLICK CLICK', sub: 'スイッチが、だんだん速く',      sky: ['#ffe4c2', '#ffcfe0'], color: '#ff8a00', pulse: 0.02,  sway: 0, stars: 0 },
  { t: crBar(52), tier: 4,   name: 'ALL SWITCHES ON',  sub: 'いちばん高い所へ',               sky: ['#ffd0ee', '#c2efff'], color: '#ff2f7a', pulse: 0.036, sway: 0, stars: 0 },
  { t: crBar(68), tier: 1,   name: 'SWITCH: OFF',      sub: '',                               sky: ['#d6dbe6', '#e8ebf2'], color: '#7c8aa0', pulse: 0.008, sway: 0, stars: 0 },
];

function crSpeedAt(t) {
  let i = 0;
  while (i + 1 < CR_SECTIONS.length && CR_SECTIONS[i + 1].t <= t) i++;
  return 1.0 + 0.06 * CR_SECTIONS[i].tier;
}

function chainChart() {
  const cues = [];
  const burst = (t, fn) => cues.push({ t, fn });
  const B = CR_BEAT, beat = crBeatTime, bar = crBar;
  const fire = (t, warn, fn) => burst(t - warn, () => fn(warn));
  const SC = SCORE_CHAIN;
  const CX = W / 2;
  const PINK = '#ff4f8b', BLUE = '#2f8cff', AMBER = '#ffa400', VIOLET = '#7c5cff', MINT = '#14b885', RED = '#ff3b4f', SKY = '#22b8f0';
  const SHAPE_COL = [PINK, BLUE, AMBER, VIOLET, MINT];
  const inBars = (b, k0, k1) => b >= k0 * 4 && b < k1 * 4;
  const px = (m, lo, hi) => 70 + (W - 140) * Math.max(0, Math.min(1, (m - lo) / (hi - lo)));
  const hint = (t, text, beats = 4) => burst(t, () => stageHint(text, beats * B));
  const pX = () => playerXY().x;

  // ★拍で動く弾★ t に出て（warn 秒前から予告）、次の拍（div = 2 なら次の 8分）から、拍ごとに at(s) の位置へ一歩ずつ進む。
  //   at(s) = s 歩目の位置 {x, y}（s は小数: 一歩のとちゅうも描ける）。life = 何拍で消えるか
  const stepper = (t, o) => fire(t, o.warn != null ? o.warn : 0.5, delay => {
    const a0 = crBeatPos(t) * (o.div || 1), p0 = o.at(0);
    return spawn({
      x: p0.x, y: p0.y, r: o.r || 8, delay, spd: 1, color: o.color || PINK, style: o.style || 'cherry', shape: o.shape, rot0: o.rot0 || 0,
      noTrail: true, lane: o.lane, base: Math.floor(a0 + 1e-6) + 1, div: o.div || 1, sh: o.sh || 0.3, end: crBeatPos(t) + (o.life || 64), at: o.at, grp: o.grp, gi: o.gi,
      move(b) {
        const p = crBeatPos(songTime) * b.div;
        const s = Math.max(0, crSnap(p, b.sh) - b.base);
        const q = b.at(s); b.x = q.x; b.y = q.y; b.st = s;
        if (p / b.div > b.end) b.dead = true;
        if ((b.style === 'cherry' || b.style === 'note') && b.y > GROUND_Y - b.r * 0.6) {   // 床に落ちたら、はじけて消える（見た目: visuals-chain.js）
          b.dead = true;
          if (typeof chainSplash === 'function') chainSplash(b.x, GROUND_Y, b.color, b.style === 'note');
        }
      },
    });
  });
  // まっすぐ一歩ずつ（dx, dy = 一歩の大きさ）
  const mover = (t, x, y, dx, dy, o = {}) => stepper(t, { ...o, at: s => ({ x: x + dx * s, y: y + dy * s }) });
  // 落ちるさくらんぼ（8分ごとに一段）
  const cherry = (t, x, o = {}) => mover(t, x, o.y0 != null ? o.y0 : -12, 0, o.dy || 46, { div: 2, warn: o.warn || 0.45, r: o.r || 9, color: o.color || RED, style: o.style || 'cherry', lane: [0, 1], life: 24, ...o });
  // 輪: (cx, cy) から n 個、1拍ごとに dr ずつ広がる。spin = 1歩ごとに回る角度
  let ringId = 0;
  const stepRing = (t, cx, cy, n, o = {}) => {
    const grp = ++ringId;                         // 同じ輪の弾は線でつないで描く（visuals-chain.js）
    for (let i = 0; i < n; i++) {
      const a = (o.a0 || 0) + i / n * TAU, dr = o.dr || 60, r0 = o.r0 || 24, sp = o.spin || 0;
      stepper(t, { warn: o.warn || 0.6, r: o.r || 9, color: o.color || PINK, style: 'shape', shape: o.shape || 'star', rot0: a, life: o.life || 14, grp, gi: i,
        at: s => ({ x: cx + Math.cos(a + sp * s) * (r0 + dr * s), y: cy + Math.sin(a + sp * s) * (r0 + dr * s) }) });
    }
  };
  // ドミノ: 上に並んだドミノが順に倒れ、倒れたドミノからさくらんぼが落ちる。xs = ドミノの位置（倒れる順）
  const dominoRow = (t0, xs, step, o = {}) => xs.forEach((x, i) => {
    const t = t0 + i * step * B;
    fire(t, 0.9, delay => spawn({ kind: 'domino', x, y: 58, r: 0, delay, safe: true, spd: 1, color: o.color || AMBER, fall: t, dir: o.dir || 1, life: 1.2, move(b) { if (b.age > b.life) b.dead = true; } }));
    cherry(t, x, { color: o.color || AMBER, warn: 0.9, y0: 70 });
  });
  // 床を一歩ずつ進むブロック（来る拍の直前に跳ぶ）
  const block = (t, fromLeft, o = {}) => {
    const cell = o.cell || 90, x0 = fromLeft ? 14 : W - 14, r = 11;
    mover(t, x0, GROUND_Y - r, fromLeft ? cell : -cell, 0, { warn: o.warn || 1.0, r, color: o.color || BLUE, style: 'block', lane: [fromLeft ? 1 : -1, 0], life: Math.ceil((W + 40) / cell) + 2 });
  };
  // ばねのボール: 1拍ごとに跳ねて hop だけ進む。着地する所（拍の頭）をよける。上を通る時はくぐれる
  const spring = (t, fromLeft, o = {}) => fire(t, o.warn || 0.9, delay => {
    const a0 = crBeatPos(t), dir = fromLeft ? 1 : -1, x0 = fromLeft ? 30 : W - 30, r = 13, hop = o.hop || 95, ht = o.ht || 150;
    return spawn({ x: x0, y: GROUND_Y - r, r, delay, spd: 1, color: o.color || MINT, style: 'spring', noTrail: true, lane: [dir, 0],
      move(b) {
        const p = Math.max(0, crBeatPos(songTime) - a0), f = p - Math.floor(p);
        b.x = x0 + dir * hop * p; b.y = GROUND_Y - r - ht * 4 * f * (1 - f);
        if (p > 12) b.dead = true;
      } });
  });
  // ビー玉: 床を転がってくる
  const marbleRoll = (t, fromLeft, o = {}) => fire(t, o.warn || 0.9, delay => roller({ x: fromLeft ? -10 : W + 10, vx: (fromLeft ? 1 : -1) * (o.v || 330), r: 14, delay, color: o.color || SKY, life: 6 }));
  // せまる壁: 左右の列が 1拍ごとに step ずつ内側へ。n 拍で止まり、end 拍で消える
  const walls = (t, n, step, o = {}) => {
    for (const left of [true, false]) {
      for (let y = 70; y <= GROUND_Y - 10; y += 34) {
        stepper(t, { warn: 0.8, r: 9, color: o.color || VIOLET, style: 'wall', life: o.life || n + 1,
          at: s => ({ x: (left ? 16 : W - 16) + (left ? 1 : -1) * step * Math.min(s, n), y }) });
      }
    }
  };
  // カチカチのレーザー: 上から床まで、細い光
  const zap = (t, x, o = {}) => fire(t, o.warn || 0.6, delay => { const b = laser({ x1: x, y1: -40, x2: x, y2: GROUND_Y + 10, width: o.w || 20, delay, hold: 0.18, color: o.color || AMBER }); b.spd = 1; });
  // 画面の回転（見た目だけ。重力や操作は変わらない）。「画面演出」を 0 近くにしている時は回さない
  const spinOnce = t => {
    burst(t, () => { if (fxScale > 0.3) stageTo({ spin: stage.spin + TAU }, 1.15 * B, 'snap'); });
    burst(t + 1.25 * B, () => { if (stage.spin > Math.PI) stage.spin -= TAU; });
  };
  const tiltTo = (t, a, dur = 0.35) => burst(t, () => { if (fxScale > 0.3) stageTo({ spin: a }, dur * B, 'snap'); });
  const SWITCH = new Set(SC.switch);

  // ===== 0〜4 OFF ｜ オルゴール = ゆっくり落ちる音符 ／ ビー玉 ／ ドミノ → スイッチ =========================================
  hint(bar(0) + B, '弾は拍に合わせて、一歩ずつ進む');
  SC.box.filter(([b]) => inBars(b, 0, 3)).forEach(([b, m], i) => mover(beat(b), px(m, 74, 92) + (i % 2 ? 18 : -18), -12, 0, 70, { warn: 0.5, r: 8, color: VIOLET, style: 'note', life: 14 }));
  marbleRoll(bar(2), true, { v: 300 });
  hint(bar(2) - B, 'ビー玉 ─ 跳び越える', 3);
  dominoRow(bar(3), [80, 171, 263, 354, 446, 537, 629, 720], 0.5, { color: AMBER });
  hint(bar(3) - B, 'ドミノ ─ ドミノとドミノの間に立つ', 4);

  // ===== 4〜12 SWITCH ON! ｜ スイッチ = 星の輪 ／ メロディ = 落ちるさくらんぼ ／ 8〜 床のブロック =============================
  stepRing(bar(4), CX, 170, 12, { shape: 'star', color: PINK, spin: Math.PI / 12, dr: 60, life: 12 });
  SC.lead.filter(([b]) => inBars(b, 4, 12)).forEach(([b, , m], i) => cherry(beat(b), px(m, 61, 87) + ((i * 37) % 60 - 30), { dy: 40, color: i % 4 === 3 ? PINK : RED }));
  hint(bar(8) - 2 * B, 'ブロック ─ 来る拍の直前に跳ぶ', 4);
  block(bar(8), false); block(bar(10), true);

  // ===== 12〜20 CHAIN ｜ ドミノの列 ／ ビー玉 ／ ばね ／ 18〜 せまる壁 ===========================================================
  dominoRow(bar(12), [80, 171, 263, 354, 446, 537, 629, 720], 0.5, { color: AMBER });
  dominoRow(bar(13), [720, 629, 537, 446, 354, 263, 171, 80].slice(0, 6), 0.5, { color: MINT, dir: -1 });
  marbleRoll(bar(13) + 2 * B, false, { v: 340 });
  dominoRow(bar(14), [720, 629, 537, 446, 354, 263, 171, 80], 0.5, { color: AMBER, dir: -1 });
  hint(bar(15) - B, 'ばね ─ 着地する所をよける', 4);
  spring(bar(15), true, { hop: 95 });
  dominoRow(bar(16), [80, 171, 263, 354, 446, 537, 629, 720], 0.5, { color: PINK });
  dominoRow(bar(17), [80, 171, 263, 354, 446, 537].reverse(), 0.5, { color: MINT, dir: -1 });
  marbleRoll(bar(17) + 2 * B, true, { v: 340 });
  hint(bar(18) - 2 * B, '壁がせまる ─ まん中へ', 4);
  walls(bar(18), 8, 36, { life: 9.5 });

  // ===== 20〜36 CHAIN REACTION ｜ スイッチ = 星の輪 ＋ 一回転 ／ 小節の頭 = 歯車から四角の輪 ／ メロディ ／ ブロック ================
  function chorus(k0, k1, hard) {
    for (let k = k0; k < k1; k++) {
      const B0 = k * 4;
      if (SWITCH.has(B0)) {
        stepRing(bar(k), CX, 170, hard ? 18 : 16, { shape: 'star', color: hard ? PINK : BLUE, spin: (k % 8 ? 1 : -1) * Math.PI / 16, dr: 62, life: 11 });
        spinOnce(bar(k));
      } else {
        const left = k % 2 === 0;
        stepRing(bar(k), left ? 210 : W - 210, 215, hard ? 10 : 9, { shape: 'square', color: SHAPE_COL[k % 5], dr: hard ? 72 : 66, spin: (left ? 1 : -1) * Math.PI / 10, a0: k * 0.37, life: 10, warn: 0.55 });
      }
      if ((k - k0) % 4 === 2) block(bar(k), Math.floor((k - k0) / 4) % 2 === 0, { cell: hard ? 100 : 90, color: hard ? PINK : BLUE });
      if (hard && (k - k0) % 4 === 3) block(bar(k) + 2 * B, Math.floor((k - k0) / 4) % 2 === 1, { cell: 100, color: VIOLET });
    }
    SC.hook.filter(([b]) => inBars(b, k0, k1)).forEach(([b, , m], i) => cherry(beat(b), px(m, 76, 94) + ((i * 53) % 80 - 40), { dy: hard ? 50 : 46, color: i % 3 === 2 ? PINK : RED }));
  }
  chorus(20, 36, false);

  // ===== 36〜44 MACHINE ｜ カメラが寄って追いかける ／ ビー玉 ＋ ドミノ ／ オルゴール ＋ ベル = 音符の輪 ==============================
  burst(bar(36), () => stageTo({ zoom: 1.28, follow: 0.6 }, 2 * B));
  for (let k = 36; k < 44; k++) {
    if (k % 2 === 0) {
      marbleRoll(bar(k), (k / 2) % 2 === 0, { v: 300 });
      const xs = [100, 200, 300, 400, 500, 600, 700];
      dominoRow(bar(k) + 2 * B, (k / 2) % 2 === 0 ? xs.slice(1) : xs.slice(0, 6).reverse(), 0.25, { color: AMBER });
    }
  }
  SC.box.filter(([b]) => inBars(b, 36, 44)).forEach(([b, m], i) => mover(beat(b), px(m, 76, 92), 160, 0, 60, { warn: 0.5, r: 8, color: VIOLET, style: 'note', life: 10 }));
  SC.ding.filter(b => inBars(b, 36, 44)).forEach((b, i) => stepRing(beat(b), CX, 300, 8, { shape: 'circle', color: SKY, dr: 48, spin: Math.PI / 8, life: 9 }));
  burst(bar(44) - B, () => stageTo({ zoom: 1, follow: 0 }, B));

  // ===== 44〜52 CLICK CLICK CLICK ｜ カチカチ = レーザー（4分 → 8分）／ 48〜 拍ごとの輪 ／ 50〜 せまる壁 =========================
  stepRing(bar(44), CX, 170, 12, { shape: 'star', color: AMBER, spin: Math.PI / 12, dr: 60, life: 10 });
  for (let k = 44; k < 48; k++) {
    const n = k < 46 ? 4 : 8, ltr = k % 2 === 0;
    for (let i = 0; i < n; i++) {
      const x = n === 4 ? 110 + i * 193 : 70 + i * 94;
      zap(bar(k) + i * (4 / n) * B, ltr ? x : W - x, { warn: 0.7, color: k < 46 ? AMBER : PINK });
    }
  }
  for (let b = 48 * 4; b < 50 * 4; b++) stepRing(beat(b), CX, 150, 8, { shape: 'triangle', color: SHAPE_COL[b % 5], dr: 70, a0: b * 0.41, spin: 0, life: 9, warn: 0.5 });
  hint(bar(50) - 2 * B, '壁がせまる ─ まん中へ', 4);
  walls(bar(50), 7, 38, { life: 8.5, color: AMBER });

  // ===== 52〜68 ALL SWITCHES ON ｜ サビ（強い）＋ 2小節ごとに画面がかたむく ＋ ドミノ =================================
  chorus(52, 68, true);
  for (let k = 54; k < 68; k += 4) tiltTo(bar(k), (k / 4) % 2 ? 0.14 : -0.14);
  SC.domino.filter(([b]) => inBars(b, 52, 68)).forEach(([b, m], i) => i % 2 === 0 && cherry(beat(b), px(m, 79, 97), { color: AMBER, dy: 50 }));
  tiltTo(bar(68), 0, 1);

  // ===== 68〜72 OFF ｜ 最後の輪 → オルゴール → スイッチを切ると、ぜんぶ止まる ===================================================
  stepRing(bar(68), CX, 170, 20, { shape: 'star', color: PINK, spin: Math.PI / 20, dr: 58, life: 10 });
  SC.box.filter(([b]) => inBars(b, 69, 71)).forEach(([b, m], i) => mover(beat(b), px(m, 76, 94), -12, 0, 60, { warn: 0.5, r: 8, color: VIOLET, style: 'note', life: 12 }));
  SC.off.forEach(b => burst(beat(b), () => {
    for (const q of bullets) { if (typeof sparks === 'function' && !q.kind) sparks(q.x, q.y, { n: 4, color: '#ffffff', speed: 120, life: 0.4, size: 2 }); q.dead = true; }
    flash(0.6);
  }));

  return cues.sort((a, b) => a.t - b.t);
}

addSong({
  id: 'chain',
  title: 'CHAIN REACTION',
  meta: '144 BPM · 2:01 · オリジナル曲 · 拍で動く弾幕 · ふつう〜むずかしめ',
  file: 'ChainReaction.mp3',
  bpm: 144, beat: CR_BEAT, end: SCORE_CHAIN.end - 0.3,
  beatTime: crBeatTime,
  beatPos: crBeatPos,
  speedAt: crSpeedAt,
  env: ENV_CHAIN,
  sections: CR_SECTIONS,
  build: chainChart,
  theme: 'chain',                  // visuals-chain.js の見た目のセット
  titleLook: { sky: ['#c4d8ff', '#ffd3ea'], color: '#ff4f8b', tier: 2, pulse: 0.02, stars: 0 },
  titleBpm: 144,
  preview: crBar(20) - 0.1,
  clearTitle: 'ALL ON!',
  overTitle: 'スイッチが切れた…',
  clearText: 'からくりは最後まで動いた！',
  bestKey: 'dodge_best_chain',
});
