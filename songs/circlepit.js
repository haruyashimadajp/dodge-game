"use strict";

/* =========================================================================
   曲⑱  Circle Pit（オリジナル曲）  —  拍・場面・譜面
   ハードコア・パンク。180 BPM、ホ短調。曲は songs/circlepit-compose.py で作曲・合成した。
   左右に分けた2本のひずんだギター（パワーコード）、ひずんだベース、ドラム、みんなの叫び（HEY! / OI! / GO!）。
   ビートは場面ごとに変わる: Dビート（Aメロ）、スカンク・ビート（サビ）、ツーステップ、ハーフタイムのブレイクダウン、ブラスト。
   難易度はむずかしい。演出は visuals-punk.js（地下のライブハウス。アンプの山、モッシュする観客、コピーしたチラシ）。

   音ごとに攻撃がちがう:
     ブリッジミュートの刻み = アンプから鋲（びょう）の弾が自分をねらって飛ぶ（刻みの数だけ）
     開放のコード          = 上から太い音の柱がたたきつけられる（コードの根音で位置が決まる）
     Aメロの小節の終わりのコード = 床すれすれのアンプの音の柱（跳ぶ）
     みんなの叫び          = HEY! / OI! / GO! の切り抜き文字が飛んでくる
     サビ（スカンク・ビート） = サークル・ピット: とげの輪が床を転がってくる（跳び越える）
     ステージ・ダイブ      = 人が放物線をえがいて飛んでくる
     タムのフィル          = ドラムスティックが降ってくる
     ブレイクダウン        = 遅く重い音の柱と、床の柱。画面がヘッドバンギングする
     リードギター          = 音の高さの所に鋲が降る
   ========================================================================= */

// 180 BPM: 1拍 = 1/3秒、1小節 = 4/3秒。0拍目 = 0.5秒
const HC_BEAT = 1 / 3;
function hcBeatTime(n) { return 0.5 + n * HC_BEAT; }
function hcBeatPos(t)  { return (t - 0.5) / HC_BEAT; }
const hcBar = k => hcBeatTime(k * 4);

const HC_SECTIONS = [
  { t: 0,          tier: 0, name: 'FEEDBACK',     sub: 'アンプがうなる',                  sky: ['#050505', '#120808'], color: '#ff2e3a', pulse: 0.004, stars: 0 },
  { t: hcBar(4),   tier: 1, name: 'KICK IT',      sub: 'カウント 1・2・3・4！',           sky: ['#0a0a0a', '#1c0a0a'], color: '#ff2e3a', pulse: 0.02,  stars: 0 },
  { t: hcBar(12),  tier: 2, name: 'D-BEAT',       sub: 'Dビート ─ 刻みが止まらない',      sky: ['#0b0b0b', '#221010'], color: '#f4f4f4', pulse: 0.02,  stars: 0 },
  { t: hcBar(28),  tier: 2, name: 'TWO-STEP',     sub: 'ツーステップ ─ はずめ',            sky: ['#0b0b0b', '#1f1a08'], color: '#ffd23f', pulse: 0.025, stars: 0 },
  { t: hcBar(36),  tier: 3, name: 'CIRCLE PIT',   sub: 'サビ ─ 輪になって走れ',            sky: ['#140406', '#3a0a10'], color: '#ff2e3a', pulse: 0.03,  stars: 0, sway: 0.3 },
  { t: hcBar(44),  tier: 3, name: 'D-BEAT II',    sub: 'もっと速く',                      sky: ['#0b0b0b', '#221010'], color: '#f4f4f4', pulse: 0.025, stars: 0 },
  { t: hcBar(52),  tier: 3, name: 'STAGE DIVE',   sub: 'サビ ─ ステージから飛べ',          sky: ['#140406', '#3a0a10'], color: '#ff4fa3', pulse: 0.03,  stars: 0, sway: 0.3 },
  { t: hcBar(60),  tier: 2, name: 'STOP',         sub: '止まって ─ ため',                 sky: ['#000000', '#0a0a0a'], color: '#f4f4f4', pulse: 0,     stars: 0 },
  { t: hcBar(64),  tier: 3, name: 'BREAKDOWN',    sub: 'ブレイクダウン ─ 頭を振れ',        sky: ['#0a0000', '#2a0000'], color: '#ff2e3a', pulse: 0.04,  stars: 0, zoom: [1, 1.02] },
  { t: hcBar(72),  tier: 3, name: 'MOSH',         sub: 'モッシュ ─ もっと重く',            sky: ['#0a0000', '#300404'], color: '#ff2e3a', pulse: 0.05,  stars: 0 },
  { t: hcBar(80),  tier: 4, name: 'CIRCLE PIT',   sub: '最後のサビ ─ 全員でぶつかれ',      sky: ['#18040a', '#4a0a18'], color: '#ffd23f', pulse: 0.04,  stars: 0, sway: 0.4 },
  { t: hcBar(88),  tier: 1, name: 'NO FUTURE',    sub: 'ラスト・コード',                   sky: ['#050505', '#140808'], color: '#f4f4f4', pulse: 0.01,  stars: 0 },
];

// 弾の速さ: 1.0〜1.2倍
function hcSpeedAt(t) {
  let i = 0;
  while (i + 1 < HC_SECTIONS.length && HC_SECTIONS[i + 1].t <= t) i++;
  return 1.0 + 0.05 * HC_SECTIONS[i].tier;
}

function circlePitChart() {
  const cues = [];
  const burst = (t, fn) => cues.push({ t, fn });
  const beat = hcBeatTime;
  const bar = hcBar;
  const fire = (t, warn, fn) => burst(t - warn, () => fn(warn));
  const SC = SCORE_PUNK;
  const WHITE = '#f4f4f4', RED = '#ff2e3a', YEL = '#ffd23f', PINK = '#ff4fa3';
  const hsh = (a, b = 0) => { const v = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return v - Math.floor(v); };
  const px = r => 110 + (W - 220) * Math.max(0, Math.min(1, (r - 40) / 11));          // コードの根音 → 横の位置（E が左、D# が右）
  const hint = (t, text, beats = 6) => burst(t, () => stageHint(text, beats * HC_BEAT));
  const fx = (t, ...a) => burst(t, () => { if (typeof hcFx === 'function') hcFx(...a); });
  const inBars = (b, k0, k1) => b >= k0 * 4 && b < k1 * 4;
  const gtr = (k0, k1, typ) => SC.gtr.filter(g => inBars(g[0], k0, k1) && (!typ || g[3] === typ));
  const AMP = [{ x: 48, y: GROUND_Y - 168 }, { x: W - 48, y: GROUND_Y - 168 }];       // アンプの山のいちばん上のスピーカー
  const clampX = x => Math.max(70, Math.min(W - 70, x));
  const aimX = () => clampX(playerXY().x);

  // ---- 部品 ----
  // 刻み: アンプから鋲がねらって飛ぶ
  const chug = (b, side, o = {}) => (fx(beat(b), 'chug', side), fire(beat(b), o.warn || 0.35, delay => {
    const a = AMP[side];
    hcStud({ x: a.x, y: a.y + (o.dy || 0), aim: true, spread: o.spread || 0, v: o.v || 290, r: o.r || 7, delay, color: o.color || WHITE });
  }));
  const slam = (b, x, o = {}) => fire(beat(b), o.warn || 0.5, delay => hcSlam({ x: typeof x === 'function' ? x() : x, w: o.w || 76, delay, hold: o.hold || 0.18, color: o.color || WHITE }));
  const blast = (b, side, o = {}) => fire(beat(b), o.warn || 0.55, delay => hcBlast({ side, y: o.y || GROUND_Y - 8, width: o.width || 16, delay, hold: o.hold || 0.18, color: o.color || RED }));
  const shout = (b, word, o = {}) => fire(beat(b), o.warn || 0.5, delay => hcShout({ word, x: o.x || W / 2, y: o.y || 70, v: o.v || 280, size: o.size || 34, delay, color: o.color || WHITE, spread: o.spread || 0 }));
  const shoutFx = (k0, k1) => SC.shout.filter(([b]) => inBars(b, k0, k1)).forEach(([b, w]) => fx(beat(b), 'shout', w));
  const pit = (b, dir, o = {}) => fire(beat(b), o.warn || 0.8, delay => hcPit({ dir, R: o.R || 62, n: o.n || 8, v: o.v || 230, r: 9, delay, color: o.color || RED }));
  const diver = (b, fromLeft, o = {}) => fire(beat(b), o.warn || 0.7, delay => hcDiver({ fromLeft, x1: o.x1 != null ? o.x1 : clampX(playerXY().x + (fromLeft ? 40 : -40)), apex: o.apex || 200, dur: o.dur || 1.3, delay, color: o.color || YEL, burst: o.burst || 0 }));
  const drums = (k0, k1, a = 1) => {
    SC.kick.filter(b => inBars(b, k0, k1)).forEach(b => fx(beat(b), 'kick', a));
    SC.snare.filter(b => inBars(b, k0, k1)).forEach(b => fx(beat(b), 'snare', a));
    SC.crash.filter(b => inBars(b, k0, k1)).forEach(b => fx(beat(b), 'crash', a));
    SC.china.filter(b => inBars(b, k0, k1)).forEach(b => fx(beat(b), 'china', a));
  };
  const sticks = (k0, k1) => SC.tom.filter(([b]) => inBars(b, k0, k1)).forEach(([b, m], i) =>
    fire(beat(b), 0.45, delay => hcStick({ x: clampX(120 + ((m - 40) / 12) * (W - 240) + (hsh(b) - 0.5) * 60), vy: 260, delay })));
  SC.slide.forEach(([b0, b1]) => fx(beat(b0), 'slide', (b1 - b0) * HC_BEAT));

  // ===== FEEDBACK 0〜4 ｜ アンプのうなり → スティックのカウント（スティックが降ってくる）==========================
  fx(0, 'feedback', beat(12));
  hint(beat(3), '← → で動く ・ ↑ で跳ぶ', 8);
  SC.stick.forEach((b, i) => {
    fx(beat(b), 'count', i + 1);
    fire(beat(b), 0.55, delay => hcStick({ x: [200, 600, 300, 500][i], vy: 180, delay }));
  });

  // ===== KICK IT 4〜12 ｜ 刻み = アンプの鋲 ／ 開放のコード = 音の柱 ======================================================
  fx(bar(4), 'start', 1);
  burst(bar(4), () => { flash(0.8); shake(10); });
  gtr(4, 12).forEach((g, i) => {
    const [b, L, r, typ] = g, k = Math.floor(b / 4);
    if (typ === 'm') chug(b, k % 2, { spread: ((i % 3) - 1) * 0.05 });
    else slam(b, px(r), { w: 70 });
  });
  hint(bar(5), '白い柱が落ちてくる', 6);
  shout(46, 'HEY', { x: 260 }); shout(47, 'HEY', { x: 540 });
  drums(4, 12, 0.8);

  // ===== D-BEAT 12〜28 ｜ 刻み = ねらう鋲（扇に）／ 小節の終わりのコード = 床の柱（跳ぶ）／ HEY! ======================
  fx(bar(12), 'boom', 1);
  const verse = (k0, k1, o = {}) => {
    for (let k = k0; k < k1; k++) {
      const q = k % 4, side = k % 2, notes = gtr(k, k + 1);
      notes.filter(g => g[3] === 'm' && Number.isInteger(g[0] * 2)).forEach((g, j) => chug(g[0], side, { spread: (j - 2.5) * 0.05, v: o.v || 290 }));   // 16分の2連は、1つ目だけ
      const opens = notes.filter(g => g[3] === 'o');
      if (q === 0 || q === 1) opens.forEach(g => blast(g[0], side ? -1 : 1, {}));
      else if (q === 2) opens.forEach((g, j) => slam(g[0], j ? () => clampX(playerXY().x + (playerXY().x < W / 2 ? 110 : -110)) : aimX, { w: 80 }));
      else opens.forEach((g, j) => { if (g[0] % 4 === 2 && opens.length === 2) return; slam(g[0], px(g[2]) + (j % 2 ? 30 : -30), { w: 76 }); });
    }
    SC.shout.filter(([b]) => inBars(b, k0, k1)).forEach(([b, w], i) => shout(b, w, { x: i % 2 ? 600 : 200, y: 60 }));
  };
  verse(12, 28);
  hint(bar(13), '赤い床の柱は 跳ぶ', 6);
  sticks(27, 28);
  drums(12, 28);
  shoutFx(12, 28);

  // ===== TWO-STEP 28〜36 ｜ はねる弾 ／ 刻み = 降る鋲 ／ HO! ============================================================
  fx(bar(28), 'boom', 0.8);
  for (let k = 28; k < 36; k++) {
    const notes = gtr(k, k + 1), shoutBar = k % 2 === 1;
    notes.forEach((g, j) => {
      const [b, L, r, typ] = g, h = b - k * 4;
      if (typ === 'm') fire(beat(b), 0.4, delay => hcStud({ x: clampX(90 + hsh(b, 3) * (W - 180)), y: -10, a: Math.PI / 2, v: 340, r: 8, delay, color: YEL }));
      else if (h === 0) fire(beat(b), 0.6, delay => { const left = k % 2 === 0; hcHop({ x: left ? 30 : W - 30, vx: left ? 210 : -210, delay, color: YEL }); });
      else if (!shoutBar) slam(b, h === 3 ? aimX : px(r), { w: 76, color: YEL });
    });
  }
  SC.shout.filter(([b]) => inBars(b, 28, 36)).forEach(([b, w], i) => shout(b, w, { x: i % 2 ? 560 : 240, y: 60, color: YEL }));
  hint(bar(29), '黄色い弾は はねる', 6);
  drums(28, 36);
  shoutFx(28, 36);

  // ===== CIRCLE PIT 36〜44 ／ 52〜60 ｜ サークル・ピット（床を転がるとげの輪）／ OI! ／ シンバル = 鋲の輪 ===============
  const chorus = (k0, divers) => {
    fx(bar(k0), 'pit', 1);
    burst(bar(k0), () => { flash(0.7); shake(12); punch(0.05); });
    for (let k = k0; k < k0 + 8; k++) {
      const even = (k - k0) % 2 === 0, root = (SC.chord.find(c => c[0] === k * 4) || [0, 40])[1];
      if (even) {
        pit(k * 4, (k - k0) % 4 === 0 ? 1 : -1);
        fire(bar(k), 0.5, delay => hcBurst({ x: px(root), y: 60, n: 10, v: 175, start: (k % 3) * 0.2, r: 7, delay, color: RED }));
        if (divers) diver(k * 4 + 2, (k - k0) % 4 === 0, { color: PINK });
      }
    }
    SC.shout.filter(([b]) => inBars(b, k0, k0 + 8)).forEach(([b, w], i) => shout(b, w, { x: i % 2 ? 620 : 180, y: 56, v: 300 }));
    drums(k0, k0 + 8, 1);
    shoutFx(k0, k0 + 8);
  };
  chorus(36, false);
  hint(bar(36) + 0.4, 'とげの輪は 跳び越える', 6);

  // ===== D-BEAT II 44〜52 ｜ 刻みが16分の2連 =========================================================================
  fx(bar(44), 'boom', 1);
  verse(44, 52, { v: 300 });
  sticks(51, 52);
  drums(44, 52);
  shoutFx(44, 52);

  // ===== STAGE DIVE 52〜60 ｜ サビ ＋ ステージ・ダイブ ===================================================================
  chorus(52, true);
  hint(bar(52) + 0.4, 'ダイバーが飛んでくる！', 6);

  // ===== STOP 60〜64 ｜ 止まって、たたく。16分の刻み → GO! =============================================================
  fx(bar(60), 'stop', 1);
  const hits = { 240: [[200, 120], [600, 120]], 244: [[400, 170]], 246: [[110, 120], [690, 120]], 248: [[150, 80]], 249: [[316, 80]], 250: [[483, 80]], 251: [[650, 80]] };
  Object.entries(hits).forEach(([b, cols]) => {
    cols.forEach(([x, w]) => slam(+b, x, { w, warn: 0.55, hold: 0.2 }));
    burst(beat(+b), () => { flash(0.5); shake(9); });
  });
  gtr(63, 64, 'm').forEach((g, i) => { if (i % 2 === 0) chug(g[0], (i / 2) % 2, { v: 320, warn: 0.3 }); });
  shout(255, 'GO', { size: 48, v: 220, warn: 0.6, color: RED });
  hint(beat(250), 'ブレイクダウンが来る ─ 頭を振れ！', 6);
  drums(60, 64);
  shoutFx(60, 64);

  // ===== BREAKDOWN 64〜72 ｜ 重い柱（自分をねらう）／ 刻み = 鋲が2つ落ちる ／ 床の柱 ===================================
  fx(bar(64), 'breakdown', 1);
  burst(bar(64), () => { flash(1); shake(16); punch(0.07); });
  for (let k = 64; k < 72; k++) {
    gtr(k, k + 1).forEach((g, j) => {
      const [b, L, r, typ] = g, h = b - k * 4;
      if (typ === 'o' && r === 40) slam(b, aimX, { w: 118, warn: 0.6, hold: 0.22, color: RED });
      else if (typ === 'o' && h === 2) blast(b, k % 4 === 1 ? -1 : 1, { warn: 0.6 });
      else if (typ === 'o') slam(b, aimX, { w: 90, warn: 0.55, color: RED });
      else fire(beat(b), 0.45, delay => { for (const s of [-1, 1]) hcStud({ x: clampX(W / 2 + s * (120 + hsh(b, s) * 220)), y: -10, a: Math.PI / 2, v: 360, g: 300, r: 9, delay, color: WHITE }); });
    });
    SC.snare.filter(b => inBars(b, k, k + 1)).forEach(b => fx(beat(b), 'bang', 1));
  }
  drums(64, 72, 1.2);
  shoutFx(64, 72);

  // ===== MOSH 72〜80 ｜ 3つの柱（すき間に立つ）／ 16分の刻み = 鋲 ／ ダイブ ===========================================
  fx(bar(72), 'mosh', 1);
  burst(bar(72), () => { flash(0.8); shake(14); punch(0.06); });
  for (let k = 72; k < 80; k++) {
    const notes = gtr(k, k + 1);
    if (k % 2 === 0) {
      const xs = k % 4 === 0 ? [W * 0.18, W * 0.82, W * 0.5] : [W * 0.5, W * 0.15, W * 0.85];
      notes.filter(g => g[3] === 'o').forEach((g, j) => { slam(g[0], xs[j % 3], { w: 130, warn: 0.55, hold: 0.2, color: RED }); fx(beat(g[0]), 'bang', 1); });
    } else {
      notes.filter(g => g[3] === 'm').forEach((g, j) => { if (j % 2 === 0) chug(g[0], (j / 2) % 2, { v: 300, warn: 0.3 }); });
      notes.filter(g => g[3] === 'o').forEach(g => diver(g[0], k % 4 === 1, { burst: 6 }));
    }
  }
  shout(300, 'HEY', { x: 220 }); shout(302, 'HEY', { x: 580 });
  shout(318, 'GO', { size: 48, v: 220, warn: 0.6, color: RED });
  sticks(79, 80);
  drums(72, 80, 1.2);
  shoutFx(72, 80);

  // ===== CIRCLE PIT（最後）80〜88 ｜ ブラスト。輪・ダイバー・OI!・リードギターの鋲 ======================================
  fx(bar(80), 'final', 1);
  burst(bar(80), () => { flash(1); shake(18); punch(0.08); });
  for (let k = 80; k < 88; k++) {
    const root = (SC.chord.find(c => c[0] === k * 4) || [0, 40])[1];
    fire(bar(k), 0.5, delay => hcBurst({ x: px(root), y: 60, n: k % 2 ? 9 : 12, v: 185, start: k * 0.37, r: 7, delay, color: k % 2 ? YEL : RED }));
    if (k % 2 === 0) diver(k * 4 + 2, k % 4 === 0, { color: PINK });
  }
  pit(328, 1); pit(340, -1);
  SC.lead.forEach(([b, L, m]) => fire(beat(b), 0.4, delay => hcStud({ x: 110 + (W - 220) * (m - 74) / 10, y: -10, a: Math.PI / 2, v: 260, g: 260, r: 9, delay, color: YEL })));
  SC.shout.filter(([b]) => inBars(b, 80, 88)).forEach(([b, w], i) => shout(b, w, { x: i % 2 ? 620 : 180, y: 56, v: 300 }));
  drums(80, 88, 1.2);
  shoutFx(80, 88);

  // ===== NO FUTURE 88〜 ｜ 4つの一撃 → 最後のコード ===================================================================
  [[352, 160], [353, 640], [354, 320], [355, 480]].forEach(([b, x]) => { slam(b, x, { w: 100, warn: 0.5, hold: 0.2 }); burst(beat(b), () => { flash(0.6); shake(10); }); });
  sticks(88, 89);
  fire(beat(356), 0.6, delay => hcBurst({ x: W / 2, y: 120, n: 24, v: 210, r: 8, delay, color: RED }));
  burst(beat(356), () => { flash(1); shake(20); punch(0.1); });
  fx(beat(356), 'end', 1);
  drums(88, 92, 1);
  shoutFx(88, 92);

  return cues.sort((a, b) => a.t - b.t);
}

addSong({
  id: 'circlepit',
  title: 'Circle Pit',
  meta: '180 BPM · 2:04 · オリジナル曲 · ハードコア・パンク · むずかしい',
  file: 'CirclePit.mp3',
  bpm: 180, beat: HC_BEAT, end: 123.6,
  beatTime: hcBeatTime,
  beatPos: hcBeatPos,
  speedAt: hcSpeedAt,
  env: ENV_PUNK,
  sections: HC_SECTIONS,
  build: circlePitChart,
  theme: 'punk',                   // visuals-punk.js の見た目のセット
  titleLook: { sky: ['#0a0a0a', '#2a0808'], color: '#ff2e3a', tier: 2, pulse: 0.03, stars: 0 },
  titleBpm: 180,
  preview: 48.5,
  clearTitle: 'CIRCLE PIT',
  overTitle: 'ピットから放り出された…',
  clearText: '最後のコードが鳴りやまない。',
  bestKey: 'dodge_best_circlepit',
});
