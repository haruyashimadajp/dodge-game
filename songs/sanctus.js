"use strict";

/* =========================================================================
   曲㉒  SANCTUS（オリジナル曲）  —  拍・場面・譜面
   神聖で厳格な曲。大聖堂のパイプオルガンのフーガ・聖歌隊・鐘・ティンパニ。120 BPM、ニ短調（最後の「アーメン」だけニ長調）。
   曲は songs/sanctus-compose.py で作曲・合成した（歌詞はなく、聖歌隊は母音だけ）。難易度は少しむずかしめ。
   演出は visuals-sanctus.js（夜の大聖堂、ステンドグラスのバラ窓、上にパイプオルガン、光の筋、ろうそく）。

   ★「厳格」な弾幕★
   ・フーガの音は、上に並んだパイプオルガンの「その音の高さのパイプ」から、まっすぐ下へ落ちる（左が低い音・右が高い音）。
     主題（と応答）は大きな光の弾、対旋律は小さな弾。声部ごとに色がちがう（金・青・白・赤）。だから弾の並びが、そのままフーガの旋律になる
   ・聖歌・怒りの日・聖歌隊の弾は、いつも左右対称（まん中を軸に、鏡に映したように出る）
   ・弾はまっすぐ・一定の速さで進む。曲がったり加速したりしない

   音 → 弾:
     鐘                 = バラ窓から光の輪が広がる
     聖歌（INTROITUS）   = 文字の入った光が、左右対称にゆっくり落ちる（音の高さ = まん中からのきょり）
     フーガの主題・応答   = その音のパイプから落ちる大きな光（8分以上の音）／ 16分は小さな光
     対旋律              = 小さな光（16分は 2つに 1つ）
     ペダル（低音）の主題 = 床から天井までの光の柱（音の高さの所）
     キリエ（聖歌隊）     = バラ窓から、回りながら広がる 8 本の光（花の模様）
     怒りの日の旋律       = 左右対称に落ちる文字の光 ／ 旋律の最後の長い「レ」= 床を走る光（跳ぶ）
     トッカータの 16分    = パイプを左右に行き来しながら落ちる小さな光
     ティンパニ（ニ）     = あなたの所へ落ちる審判の剣（縦のビーム）
     反行形（怒りの日の後半・ストレット）= 同じ音が、左右反対のパイプからも落ちる（鏡に映した旋律）
     全休止              = すべての弾が止まる（止まっている弾にも当たる）
     アーメン            = 光の輪が何重にも広がって終わる
   ========================================================================= */

// 120 BPM: 1拍 = 0.5 秒、1小節 = 2 秒。0拍目 = 0.5秒
const SN_BEAT = 0.5;
function snBeatTime(n) { return 0.5 + n * SN_BEAT; }
function snBeatPos(t)  { return (t - 0.5) / SN_BEAT; }
const snBar = k => snBeatTime(k * 4);
// パイプの位置: 音の高さ m → 横の位置（左が低い）
const SN_PIPE_LO = 50, SN_PIPE_HI = 90;
function snPipeX(m) { return 64 + (W - 128) * Math.max(0, Math.min(1, (m - SN_PIPE_LO) / (SN_PIPE_HI - SN_PIPE_LO))); }
const SN_ROSE = { x: W / 2, y: 210 };            // バラ窓のまん中（輪が広がる所）
const SN_PIPE_Y = 128;                           // パイプの口（弾が出る高さ）

const SN_SECTIONS = [
  { t: snBar(0),  tier: 0.5, name: 'SANCTUS',     sub: '鐘が鳴る',                     sky: ['#05061a', '#141a3a'], color: '#ffd98a', pulse: 0.004, sway: 0.05, stars: 30 },
  { t: snBar(4),  tier: 1,   name: 'INTROITUS',   sub: '入祭唱',                       sky: ['#060820', '#1a2048'], color: '#bcd4ff', pulse: 0.006, sway: 0.05, stars: 30 },
  { t: snBar(12), tier: 2,   name: 'FUGA',        sub: 'ひとつの主題が、声部をわたっていく', sky: ['#070a24', '#22285a'], color: '#ffd98a', pulse: 0.012, sway: 0.1, stars: 20 },
  { t: snBar(28), tier: 1.5, name: 'KYRIE',       sub: '憐れみの賛歌',                 sky: ['#080a28', '#2a1f5a'], color: '#d8b8ff', pulse: 0.008, sway: 0.05, stars: 30 },
  { t: snBar(32), tier: 3.5, name: 'DIES IRAE',   sub: '怒りの日',                     sky: ['#1a0408', '#4a0e1a'], color: '#ff5a4a', pulse: 0.02,  sway: 0.15, stars: 0 },
  { t: snBar(48), tier: 4,   name: 'STRETTO',     sub: '主題が重なり合う',             sky: ['#100418', '#3a1240'], color: '#ffd98a', pulse: 0.024, sway: 0.15, stars: 0 },
  { t: snBar(56), tier: 2,   name: 'AMEN',        sub: '',                             sky: ['#20263a', '#fff2d0'], color: '#fff2b0', pulse: 0.012, sway: 0.05, stars: 40 },
];

function snSpeedAt(t) {
  let i = 0;
  while (i + 1 < SN_SECTIONS.length && SN_SECTIONS[i + 1].t <= t) i++;
  return 1.0 + 0.07 * SN_SECTIONS[i].tier;
}

function sanctusChart() {
  const cues = [];
  const burst = (t, fn) => cues.push({ t, fn });
  const B = SN_BEAT, beat = snBeatTime, bar = snBar;
  const fire = (t, warn, fn) => burst(t - warn, () => fn(warn));
  const SC = SCORE_SANCTUS;
  const CX = W / 2;
  const GOLD = '#ffd25a', SILVER = '#9fc8ff', WHITE = '#fff6e0', CRIMSON = '#ff4a5a', VIOLET = '#c79bff', ROSE = '#ff8ab0';
  const VOICE_COL = { 1: GOLD, 2: SILVER, 3: WHITE, 4: CRIMSON };
  const inBars = (b, k0, k1) => b >= k0 * 4 && b < k1 * 4;
  const hint = (t, text, beats = 4) => burst(t, () => stageHint(text, beats * B));
  const pX = () => playerXY().x;
  const clampX = x => Math.max(40, Math.min(W - 40, x));
  const LETTERS = 'SANCTVSDOMINEKYRIEGLORIA';

  // パイプから落ちる光（音の高さのパイプから、まっすぐ下へ）
  const pipeNote = (t, m, o = {}) => fire(t, o.warn || 0.5, delay => spawn({
    x: o.inv ? W - snPipeX(m) : snPipeX(m), y: SN_PIPE_Y, vy: o.v || 240, r: o.r || 8, delay, color: o.color || GOLD, style: 'pipe', lane: [0, 1], voice: o.voice, big: !!o.big,
  }));
  // 文字の光（左右対称に落ちる）
  const glyphPair = (t, dx, o = {}) => {
    for (const s of [-1, 1]) {
      const x = CX + s * dx;
      fire(t, o.warn || 0.6, delay => spawn({ x, y: o.y0 || -14, vy: o.v || 120, r: o.r || 10, delay, color: o.color || WHITE, style: 'glyph', ch: o.ch || 'S', lane: [0, 1] }));
    }
  };
  // バラ窓から広がる光の輪
  const halo = (t, n, v, o = {}) => fire(t, o.warn || 0.7, delay => ring({ x: SN_ROSE.x, y: SN_ROSE.y, count: n, speed: v, r: o.r || 8, delay, start: o.start || 0, color: o.color || GOLD, style: 'halo' }));
  // 縦の光（剣・柱）
  const lance = (t, x, o = {}) => fire(t, o.warn || 0.7, delay => { const b = laser({ x1: x, y1: o.y1 != null ? o.y1 : -40, x2: x, y2: GROUND_Y + 10, width: o.w || 22, delay, hold: o.hold || 0.2, color: o.color || GOLD }); b.spd = 1; b.lstyle = o.lstyle || 'sword'; });
  const beam = (t, o = {}) => fire(t, o.warn || 0.8, delay => floorStrike({ delay, hold: 0.2, color: o.color || CRIMSON }));
  const xOfPedal = m => 90 + (W - 180) * Math.max(0, Math.min(1, (m - 33) / 20));

  // フーガの音のうち、主題（応答）の中にあるものか
  const ENTRIES = SC.entry;
  const inSubject = (b, v) => ENTRIES.some(([eb, ev]) => ev === v && b >= eb - 1e-6 && b < eb + 8 - 1e-6);

  // ===== 0〜4 SANCTUS ｜ 鐘 = 光の輪（ゆっくり）=====================================================================
  hint(bar(0) + B, '鐘 ─ 光の輪のすき間へ');
  SC.bell.filter(([b]) => inBars(b, 0, 4)).forEach(([b], i) => halo(beat(b), 14, 105, { start: i * 0.11, r: 9 }));

  // ===== 4〜12 INTROITUS ｜ 聖歌 = 左右対称に落ちる文字 ／ 小さな鐘 = 輪 ==============================================
  hint(bar(4), '左右対称 ─ まん中を軸に、鏡のように落ちてくる');
  SC.chant.forEach(([b, L, m], i) => glyphPair(beat(b), 60 + (m - 50) * 15, { ch: LETTERS[i % LETTERS.length], v: 125 + (L >= 2 ? -15 : 0), r: L >= 2 ? 12 : 10 }));
  SC.bell.filter(([b]) => inBars(b, 4, 12)).forEach(([b], i) => halo(beat(b), 12, 120, { start: i * 0.26, color: SILVER }));

  // ===== 12〜20 FUGA 提示部 ｜ 主題・応答 = パイプから大きな光 ／ 対旋律 = 小さな光 ／ ペダルの主題 = 光の柱 ================
  hint(bar(12), 'フーガ ─ 音の高さのパイプから落ちてくる');
  SC.fugue.filter(([b]) => inBars(b, 12, 20)).forEach(([b, L, m, v], i) => {
    const subj = inSubject(b, v);
    if (subj) pipeNote(beat(b), m, { color: VOICE_COL[v], r: L >= 0.5 ? 9 : 6, v: L >= 0.5 ? 230 : 280, big: L >= 0.5, voice: v });
    else if (L < 1) pipeNote(beat(b), m, { color: VOICE_COL[v], r: 5, v: 320, voice: v });
  });
  hint(bar(18) - 2 * B, 'ペダルの主題 ─ 床からの光の柱', 4);
  SC.pedal.filter(([b, L]) => inBars(b, 18, 20) && L >= 0.5).forEach(([b, L, m]) => lance(beat(b), xOfPedal(m + 24), { warn: 0.75, color: CRIMSON, lstyle: 'pillar', w: 26 }));
  for (let k = 13; k < 20; k++) halo(bar(k), 10, 130, { color: GOLD, start: k * 0.31 });

  // ===== 20〜28 FUGA 嬉遊部 ｜ 主題の頭 = パイプから ／ 16分 = 4つに 1つ ／ 小節の頭 = 左右対称の光の槍 ===================
  SC.fugue.filter(([b]) => inBars(b, 20, 28)).forEach(([b, L, m, v], i) => {
    if (v === 3) pipeNote(beat(b), m, { color: WHITE, r: L >= 1 ? 9 : 7, v: 250, big: L >= 1, voice: 3 });
    else if (Math.round(b * 4) % 2 === 0) pipeNote(beat(b), m, { color: SILVER, r: 5, v: 330, voice: 2 });
  });
  for (let k = 21; k < 28; k += 2) fire(bar(k), 0.75, delay => { const x = clampX(pX()); for (const xx of [x, W - x]) { const q = laser({ x1: xx, y1: -40, x2: xx, y2: GROUND_Y + 10, width: 22, delay, hold: 0.2, color: GOLD }); q.spd = 1; q.lstyle = 'sword'; } });

  SC.pedal.filter(([b]) => inBars(b, 20, 28) && b % 4 === 0).forEach(([b, L, m]) => lance(beat(b), xOfPedal(m), { warn: 0.75, color: CRIMSON, lstyle: 'pillar', w: 26 }));

  // ===== 28〜32 KYRIE ｜ 聖歌隊 = バラ窓から回る 8本の光（花の模様）=================================================
  hint(bar(28), 'キリエ ─ 回る光の花');
  for (let b = 28 * 4; b < 32 * 4; b++) {
    fire(beat(b), 0.5, delay => ring({ x: SN_ROSE.x, y: SN_ROSE.y, count: 9, speed: 145, r: 8, delay, start: (b - 112) * 0.21, color: ROSE, style: 'halo' }));
    if (b % 2) fire(beat(b) + 0.5 * B, 0.5, delay => ring({ x: SN_ROSE.x, y: SN_ROSE.y, count: 9, speed: 125, r: 7, delay, start: -(b - 112) * 0.21 + 0.17, color: VIOLET, style: 'halo' }));
  }

  // ===== 32〜48 DIES IRAE ｜ 旋律 = 左右対称の文字 ／ 最後の長い音 = 床の光 ／ トッカータ = パイプを行き来 ／ ティンパニ = 審判の剣 ==
  hint(bar(32) - 2 * B, '怒りの日', 4);
  SC.dies.forEach(([b, L, m], i) => {
    if (L >= 2) beam(beat(b) + 0.5 * B, { warn: 0.85 });
    else glyphPair(beat(b), 80 + (m - 60) * 26, { ch: 'DIESIRAE'[i % 8], v: 200, r: 10, color: '#ffb0a0' });
  });
  SC.figura.filter(([b]) => inBars(b, 32, 48)).forEach(([b, L, m]) => {
    const step = Math.round(b * 4);
    if (step % 2 === 0) pipeNote(beat(b), m, { color: inBars(b, 40, 48) ? '#ff9a6a' : GOLD, r: 5, v: inBars(b, 40, 48) ? 330 : 300 });
    if (inBars(b, 40, 48) && step % 4 === 2) pipeNote(beat(b), m, { color: '#ffd0a0', r: 5, v: 300, inv: true });   // 反行形: 鏡のパイプからも
  });
  SC.timp.filter(([b, m]) => inBars(b, 32, 48)).forEach(([b]) => fire(beat(b), 0.75, delay => { const x = clampX(pX()); const q = laser({ x1: x, y1: -40, x2: x, y2: GROUND_Y + 10, width: 24, delay, hold: 0.2, color: CRIMSON }); q.spd = 1; q.lstyle = 'sword'; }));
  SC.bell.filter(([b]) => inBars(b, 32, 48)).forEach(([b], i) => halo(beat(b), 12, 150, { color: CRIMSON, start: i * 0.13 }));

  // ===== 48〜56 STRETTO ｜ 主題が 1小節ごとに重なって入る ／ 54〜 属音のペダル = 回る光の花 ＋ 音階 ／ 全休止 = 止まる ========
  hint(bar(48), 'ストレット ─ 主題が重なる', 4);
  SC.fugue.filter(([b]) => inBars(b, 48, 54)).forEach(([b, L, m, v]) => {
    if (L >= 0.5) { pipeNote(beat(b), m, { color: VOICE_COL[v], r: 8, v: 265, big: true, voice: v }); if (inBars(b, 50, 54)) pipeNote(beat(b), m, { color: VOICE_COL[v], r: 6, v: 240, voice: v, inv: true }); }
    else pipeNote(beat(b), m, { color: VOICE_COL[v], r: 5, v: 320, voice: v });
  });
  for (let k = 48; k < 54; k++) halo(bar(k) + 2 * B, 12, 140, { color: WHITE, start: k * 0.13 });
  SC.pedal.filter(([b, L]) => inBars(b, 51, 53) && L >= 0.5).forEach(([b, L, m]) => lance(beat(b), xOfPedal(m + 24), { warn: 0.75, color: CRIMSON, lstyle: 'pillar', w: 26 }));
  for (let b = 54 * 4; b < 55 * 4 + 3; b++) fire(beat(b), 0.5, delay => ring({ x: SN_ROSE.x, y: SN_ROSE.y, count: 10, speed: 160, r: 7, delay, start: (b - 216) * 0.17, color: GOLD, style: 'halo' }));
  SC.figura.filter(([b]) => inBars(b, 54, 56) && Math.round(b * 4) % 2 === 0).forEach(([b, L, m]) => pipeNote(beat(b), m, { color: WHITE, r: 5, v: 320 }));
  SC.gp.forEach(b => { burst(beat(b), () => timeStop(SN_BEAT * 0.98)); hint(beat(b), '全休止 ─ すべてが止まる', 2); });

  // ===== 56〜60 AMEN ｜ 光の輪が何重にも ===================================================================================
  fire(beat(224), 0.7, delay => ring({ x: SN_ROSE.x, y: SN_ROSE.y, count: 24, speed: 170, r: 8, delay, color: GOLD, style: 'halo' }));
  SC.bell.filter(([b]) => b >= 228).forEach(([b], i) => halo(beat(b), 18 - i * 2, 120 - i * 8, { color: i % 2 ? WHITE : GOLD, start: i * 0.09 }));

  return cues.sort((a, b) => a.t - b.t);
}

addSong({
  id: 'sanctus',
  title: 'SANCTUS',
  meta: '120 BPM · 2:05 · オリジナル曲 · 神聖で厳格なフーガ · 少しむずかしめ',
  file: 'Sanctus.mp3',
  bpm: 120, beat: SN_BEAT, end: snBar(60) + 0.4,
  beatTime: snBeatTime,
  beatPos: snBeatPos,
  speedAt: snSpeedAt,
  env: ENV_SANCTUS,
  sections: SN_SECTIONS,
  build: sanctusChart,
  theme: 'sanctus',                // visuals-sanctus.js の見た目のセット
  titleLook: { sky: ['#05061a', '#22285a'], color: '#ffd98a', tier: 1, pulse: 0.01, stars: 30 },
  titleBpm: 120,
  preview: snBar(32) - 0.2,
  clearTitle: 'AMEN',
  overTitle: '裁かれた…',
  clearText: '鐘が、あなたのために鳴っている',
  bestKey: 'dodge_best_sanctus',
});
