"use strict";

/* =========================================================================
   曲㉒  SANCTUS（オリジナル曲）  —  拍・場面・譜面
   神聖で厳格な曲。イメージは天界。バイオリン・ハープ・ピアノが主役のフーガ（うしろに小さく聖歌隊・鐘・ティンパニ）。
   120 BPM、ニ短調（最後の「アーメン」だけニ長調）。曲は songs/sanctus-compose.py で作曲・合成した（歌詞はなく、聖歌隊は母音だけ）。
   難易度は少しむずかしめ。演出は visuals-sanctus.js（雲の上の天界、光の門、上に大きな金のハープ、浮かぶ神殿、天使）。

   ★「厳格」な弾幕★
   ・フーガの音は、上の大きなハープの「その音の高さの弦」から、まっすぐ下へ落ちる（左が低い音・右が高い音）。
     主題（と応答）は大きな光の弾、対旋律は小さな弾。声部ごとに色がちがう（I ピアノ = 金・II バイオリン = 青・III ソロのバイオリン = 白・低音 = 赤）。
     だから弾の並びが、そのままフーガの旋律になる
   ・聖歌・怒りの日・聖歌隊の弾は、いつも左右対称（まん中を軸に、鏡に映したように出る）
   ・弾はまっすぐ・一定の速さで進む。曲がったり加速したりしない

   ★この曲だけの攻撃（楽器と天界）★
     ピアノ（フーガの声部 I・低音） = 床が鍵盤になり、その音の鍵が「ぽこっ」と飛び出す（pkey。跳び越える。旋律どおりに床を走る）
     バイオリン（声部 II・III）      = 上の金のハープの、その音の高さの弦から光が落ちる（主題は大きな光）
     ソロのバイオリンの長い音（聖歌）= 大きな弓がななめに置かれ、拍ごとに左右へ「ギーコ」と動く（bow。床にとどく先に近づかない）
     ハープのアルペジオ              = はじかれた弦の下のはしが、床をむちのように左右に払う（whip。ふれる範囲から出る）
     キリエ（聖歌隊）                = 両はしの天使の翼が羽ばたいて風が吹き（stage.wind）、羽根が風に流される
     怒りの日の旋律                  = 五線が出て、音符が横に流れてくる（ド・レは床の高さ → 跳ぶ。ミより上は頭の上 → 跳ばない）
     怒りの日（4小節ごと）            = 審判の天秤があなたの側にかたむき、その側の床に重りが落ちる（反対側へ走るか、跳ぶ）
     ティンパニ（怒りの日）           = 嵐の雲から、ぎざぎざの稲妻が落ちる
     鐘                              = 光の門から光の輪が広がる
     反行形（後半・ストレット）       = 同じ音が、左右反対の弦からも落ちる
     全休止                          = すべての弾が止まる（止まっている弾にも当たる）
     アーメン                        = 天の門が開き、光の輪が何重にも広がって終わる
   ========================================================================= */

// 120 BPM: 1拍 = 0.5 秒、1小節 = 2 秒。0拍目 = 0.5秒
const SN_BEAT = 0.5;
function snBeatTime(n) { return 0.5 + n * SN_BEAT; }
function snBeatPos(t)  { return (t - 0.5) / SN_BEAT; }
const snBar = k => snBeatTime(k * 4);
// ハープの弦の位置: 音の高さ m → 横の位置（左が低い）
const SN_PIPE_LO = 50, SN_PIPE_HI = 90;
function snPipeX(m) { return 64 + (W - 128) * Math.max(0, Math.min(1, (m - SN_PIPE_LO) / (SN_PIPE_HI - SN_PIPE_LO))); }
const SN_ROSE = { x: W / 2, y: 210 };            // 光の門のまん中（輪が広がる所）
const SN_PIPE_Y = 128;                           // ハープの弦の下のはし（弾が出る高さ）

const SN_SECTIONS = [
  { t: snBar(0),  tier: 0.5, name: 'SANCTUS',     sub: '鐘が鳴る',                     sky: ['#3a4a8a', '#f4d8c0'], color: '#ffd98a', pulse: 0.004, sway: 0.05, stars: 0 },
  { t: snBar(4),  tier: 1,   name: 'INTROITUS',   sub: '入祭唱',                       sky: ['#4a6ac0', '#ffe8c8'], color: '#bcd4ff', pulse: 0.006, sway: 0.05, stars: 0 },
  { t: snBar(12), tier: 2,   name: 'FUGA',        sub: 'ひとつの主題が、声部をわたっていく', sky: ['#3a70d0', '#fff0d0'], color: '#ffd98a', pulse: 0.012, sway: 0.1, stars: 0 },
  { t: snBar(28), tier: 1.5, name: 'KYRIE',       sub: '憐れみの賛歌',                 sky: ['#5a4ab0', '#ffd8ec'], color: '#d8b8ff', pulse: 0.008, sway: 0.05, stars: 0 },
  { t: snBar(32), tier: 3.5, name: 'DIES IRAE',   sub: '怒りの日',                     sky: ['#2a0810', '#8a2a2a'], color: '#ff5a4a', pulse: 0.02,  sway: 0.15, stars: 0 },
  { t: snBar(48), tier: 4,   name: 'STRETTO',     sub: '主題が重なり合う',             sky: ['#4a3a9a', '#ffd890'], color: '#ffd98a', pulse: 0.024, sway: 0.15, stars: 0 },
  { t: snBar(56), tier: 2,   name: 'AMEN',        sub: '',                             sky: ['#8ab0ff', '#fffaf0'], color: '#fff2b0', pulse: 0.012, sway: 0.05, stars: 0 },
];

function snSpeedAt(t) {
  let i = 0;
  while (i + 1 < SN_SECTIONS.length && SN_SECTIONS[i + 1].t <= t) i++;
  return 1.0 + 0.07 * SN_SECTIONS[i].tier;
}

// 床の鍵盤（フーガの間、床がピアノの鍵盤になる）: 音の高さ m → 鍵の横の位置。2オクターブ（G3〜G5）を画面いっぱいに
const SN_KEY_LO = 55, SN_KEY_HI = 79;
function snKeyX(m) { return 60 + (W - 120) * Math.max(0, Math.min(1, (m - SN_KEY_LO) / (SN_KEY_HI - SN_KEY_LO))); }
function snBassX(m) { return 70 + (W - 140) * Math.max(0, Math.min(1, (m - 36) / 26)); }
const snIsBlack = m => [1, 3, 6, 8, 10].includes(((m % 12) + 12) % 12);
// 五線（DIES IRAE）: 旋律の音 → 高さ。ド・レは床の高さ（跳び越える）、ミより上は頭の上（跳ぶと当たる）
const SN_STAFF_Y = { 60: GROUND_Y - 10, 61: GROUND_Y - 10, 62: GROUND_Y - 22, 64: GROUND_Y - 46, 65: GROUND_Y - 64, 67: GROUND_Y - 82 };

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
  const hsh = (a, b = 0) => { const v = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return v - Math.floor(v); };
  const LETTERS = 'SANCTVSDOMINEKYRIEGLORIA';

  // ---- 道具 -------------------------------------------------------------------------------------------
  // ハープの弦から落ちる光（音の高さの弦から、まっすぐ下へ。o.inv = 左右反対の弦から = 反行形）
  const pipeNote = (t, m, o = {}) => fire(t, o.warn || 0.5, delay => spawn({
    x: o.inv ? W - snPipeX(m) : snPipeX(m), y: SN_PIPE_Y, vy: o.v || 240, r: o.r || 8, delay, color: o.color || GOLD, style: 'pipe', lane: [0, 1], voice: o.voice, big: !!o.big,
  }));
  // 文字の光（左右対称に落ちる）
  const glyphPair = (t, dx, o = {}) => {
    for (const s of [-1, 1]) fire(t, o.warn || 0.6, delay => spawn({ x: CX + s * dx, y: -14, vy: o.v || 120, r: o.r || 10, delay, color: o.color || WHITE, style: 'glyph', ch: o.ch || 'S', lane: [0, 1] }));
  };
  // 光の門から広がる光の輪
  const halo = (t, n, v, o = {}) => fire(t, o.warn || 0.7, delay => ring({ x: SN_ROSE.x, y: SN_ROSE.y, count: n, speed: v, r: o.r || 8, delay, start: o.start || 0, color: o.color || GOLD, style: 'halo' }));

  // ★ピアノの鍵★ 床の鍵盤の、その音の鍵が「ぽこっ」と飛び出す（高さ 30px。跳び越える）。音の長さだけ出ている
  const pianoKey = (t, x, dur, o = {}) => fire(t, o.warn || 0.55, delay => spawn({
    kind: 'pkey', x, y: GROUND_Y - 15, r: 0, w: o.w || 26, h: o.h || 30, curH: 0, hold: Math.max(0.16, dur), delay, spd: 1, color: o.color || GOLD, black: !!o.black,
    move(b) {
      const a = b.age;
      b.curH = a < b.hold ? b.h * Math.min(1, a / 0.05) : b.h * Math.max(0, 1 - (a - b.hold) / 0.1);
      b.safe = b.curH < 3;
      if (a > b.hold + 0.12) b.dead = true;
    },
    hits: b => b.curH >= 3 && player.x + player.w > b.x - b.w / 2 && player.x < b.x + b.w / 2 && player.y + player.h > GROUND_Y - b.curH,
  }));
  // ★バイオリンの弓★ 長い弓がななめに置かれ（先が床にとどく）、拍ごとに左右へ「ギーコ」と動く。床にとどく先には近づかない（跳び越える）
  //   lowLeft = 左はしが床につく / x0 = まん中 / amp = 動くはば / beats = 何拍ひくか
  const bow = (t, beats, o = {}) => fire(t, o.warn || 1.0, delay => spawn({
    kind: 'bow', x: o.x0 || CX, y: GROUND_Y - 150, r: 0, delay, spd: 1, color: o.color || GOLD, x0: o.x0 || CX, amp: o.amp || 100, span: o.span || 360,
    lowLeft: !!o.lowLeft, yLow: GROUND_Y - 6, yHigh: GROUND_Y - 290, life: beats * B, lift: 0, xc: (o.x0 || CX) + (o.amp || 100),
    move(b) {
      const p = b.age / B;
      b.xc = b.x0 + b.amp * Math.cos(Math.PI * Math.min(p, b.life / B));
      b.lift = b.age > b.life ? Math.min(1, (b.age - b.life) / 0.3) : 0;
      b.safe = b.lift > 0.05;
      if (b.lift >= 1) b.dead = true;
    },
    ends(b) { const L = b.lift * 260; return b.lowLeft ? [b.xc - b.span / 2, b.yLow - L, b.xc + b.span / 2, b.yHigh - L] : [b.xc - b.span / 2, b.yHigh - L, b.xc + b.span / 2, b.yLow - L]; },
    hits: b => { const [x1, y1, x2, y2] = b.ends(b); return segmentHitsPlayer(x1, y1, x2, y2, 5); },
  }));
  // ★ハープの弦のむち★ はじかれた弦（上のハープからのびる）の下のはしが、床の上を大きく左右にふれる。ふれる範囲から出る
  const whip = (t, x0, o = {}) => fire(t, o.warn || 0.85, delay => spawn({
    kind: 'whip', x: x0, y: 420, r: 0, delay, spd: 1, color: o.color || WHITE, x0, A: o.A || 150, dir: o.dir || 1, xb: x0,
    move(b) { const a = b.age; b.xb = b.x0 + b.dir * b.A * Math.sin(TAU * 1.1 * a) * Math.exp(-a / 0.9); b.safe = a > 1.5; if (a > 1.8) b.dead = true; },
    hits: b => segmentHitsPlayer(b.x0, SN_PIPE_Y + 12, b.xb, GROUND_Y + 4, 4),
  }));
  // ★天使の羽ばたき★ 両はしの大きな翼が羽ばたいて、風が dir の向きに吹く（stage.wind。押し流される）。予告は翼が持ち上がる
  const gust = (t, dir, o = {}) => {
    fire(t, 0.7, delay => spawn({ kind: 'gust', x: CX, y: 300, r: 0, delay, safe: true, spd: 1, dir, move(b) { if (b.age > 1.4 * B) b.dead = true; } }));
    burst(t, () => stageTo({ wind: dir * (o.v || 150) }, 0.12 * B, 'snap'));
    burst(t + (o.len || 1.3) * B, () => stageTo({ wind: 0 }, 0.5 * B));
  };
  // 羽根: ゆらゆら落ちながら、風に流される
  const feather = (t, x, o = {}) => fire(t, o.warn || 0.5, delay => spawn({
    x, y: -12, r: 6, delay, spd: 1, color: o.color || WHITE, style: 'feather', vx: 0, vy: o.v || 85, ph: hsh(t, x) * TAU,
    move(b, dt) { b.vx += (stage.wind * 1.35 - b.vx) * Math.min(1, dt * 1.6); b.x += (b.vx + Math.sin(b.age * 2.6 + b.ph) * 40) * dt; b.y += b.vy * dt; b.rot = Math.sin(b.age * 2.6 + b.ph) * 0.7; },
  }));
  // ★五線の音符★ 五線の上を、旋律の音符が横に流れてくる（ド・レは床の高さ → 跳び越える。ミより上は頭の上 → 跳ばない）
  const staffNote = (t, m, L, dir, o = {}) => fire(t, o.warn || 0.5, delay => spawn({
    x: dir > 0 ? -16 : W + 16, y: SN_STAFF_Y[m] || GROUND_Y - 46, vx: dir * (o.v || 270), r: L >= 2 ? 12 : 10, delay, spd: 1, color: o.color || '#ffe0a0',
    style: 'snote', long: L >= 2, sharp: m % 12 === 1, low: m <= 62, lane: [dir, 0], noTrail: true,
  }));
  // ★審判の天秤★ 上の天秤が、あなたのいる側へかたむき、その側の床（半分）に重りが落ちる。反対側へ走るか、跳び越える
  const judgment = (t, o = {}) => fire(t, o.warn || 1.4, delay => {
    const left = pX() < CX;
    const q = laser({ x1: left ? -20 : CX + 12, y1: GROUND_Y - 28, x2: left ? CX - 12 : W + 20, y2: GROUND_Y - 28, width: 56, delay, hold: 0.3, color: '#ffcf5a' });
    q.spd = 1; q.lstyle = 'scale'; q.left = left;
  });
  // ★稲妻★ 嵐の雲から、ぎざぎざの道すじで落ちる（予告で道すじが見える）。あなたの所へ
  const bolt = (t, o = {}) => fire(t, o.warn || 0.75, delay => {
    const x0 = clampX(pX() + (o.dx || 0)), pts = [];
    for (let i = 0; i <= 6; i++) pts.push([x0 + (i === 6 ? 0 : (hsh(t, i) - 0.5) * 90), 150 + i * (GROUND_Y + 6 - 150) / 6]);
    return spawn({
      kind: 'bolt', x: x0, y: 420, r: 0, delay, spd: 1, color: o.color || '#ffe8f0', pts, hold: 0.2,
      move(b) { b.safe = b.age > b.hold; if (b.age > b.hold + 0.3) b.dead = true; },
      hits: b => { for (let i = 0; i < 6; i++) if (segmentHitsPlayer(b.pts[i][0], b.pts[i][1], b.pts[i + 1][0], b.pts[i + 1][1], 9)) return true; return false; },
    });
  });

  // フーガの音のうち、主題（応答）の中にあるものか
  const ENTRIES = SC.entry;
  const inSubject = (b, v) => ENTRIES.some(([eb, ev]) => ev === v && b >= eb - 1e-6 && b < eb + 8 - 1e-6);
  // ピアノ（声部 I）と低音（声部 4）の音 = 床の鍵 ／ バイオリン（II・III）の音 = 弦から落ちる光
  const fugueBars = (k0, k1, o = {}) => {
    SC.fugue.filter(([b]) => inBars(b, k0, k1)).forEach(([b, L, m, v]) => {
      const subj = inSubject(b, v);
      if (v === 1) { if (L >= 0.5) pianoKey(beat(b), snKeyX(m), L * B * 0.9, { black: snIsBlack(m), color: GOLD }); }
      else if (subj || o.all) {
        pipeNote(beat(b), m, { color: VOICE_COL[v], r: L >= 0.5 ? 9 : 6, v: L >= 0.5 ? 240 : 290, big: L >= 0.5, voice: v });
        if (o.inv && L >= 0.5) pipeNote(beat(b), m, { color: VOICE_COL[v], r: 6, v: 230, voice: v, inv: true });
      } else if (L < 1 && Math.round(b * 4) % 2 === 0) pipeNote(beat(b), m, { color: VOICE_COL[v], r: 5, v: 320, voice: v });
    });
    SC.pedal.filter(([b, L]) => inBars(b, k0, k1) && L <= 1 && ENTRIES.some(([eb, ev]) => ev === 4 && b >= eb && b < eb + 8))
      .forEach(([b, L, m]) => L >= 0.5 && pianoKey(beat(b), snBassX(m), L * B * 0.9, { w: 34, h: 34, black: true, color: CRIMSON }));
  };

  // ===== 0〜4 SANCTUS ｜ 鐘 = 光の輪 ／ 羽根が舞いおりる =================================================================
  hint(bar(0) + B, '天界 ─ 羽根と光の輪');
  SC.bell.filter(([b]) => inBars(b, 0, 4)).forEach(([b], i) => halo(beat(b), 14, 105, { start: i * 0.11, r: 9 }));
  for (let b = 2; b < 16; b += 2) feather(beat(b), 80 + hsh(b) * (W - 160));

  // ===== 4〜12 INTROITUS ｜ 聖歌（ソロのバイオリン）: 短い音 = 左右対称の文字 ／ 長い音 = 弓 ===========================
  hint(bar(4), 'バイオリンの弓 ─ 床にとどく先に近づかない');
  SC.chant.forEach(([b, L, m], i) => {
    if (L >= 2) bow(beat(b), Math.min(L, 4), { lowLeft: i % 2 === 0, x0: i % 2 === 0 ? CX + 60 : CX - 60, amp: 90 });
    else glyphPair(beat(b), 60 + (m - 50) * 15, { ch: LETTERS[i % LETTERS.length], v: 125 });
  });
  SC.bell.filter(([b]) => inBars(b, 4, 12)).forEach(([b], i) => halo(beat(b), 12, 120, { start: i * 0.26, color: SILVER }));

  // ===== 12〜20 FUGA 提示部 ｜ ピアノ = 床の鍵が飛び出す ／ バイオリン = ハープの弦から光 ／ 低音 = 大きな鍵 =================
  hint(bar(12), 'ピアノ ─ 床の鍵盤が、旋律どおりに飛び出す');
  fugueBars(12, 20);
  hint(bar(14), 'バイオリン ─ 音の高さの弦から落ちる', 3);
  for (let k = 13; k < 20; k += 2) halo(bar(k), 10, 130, { color: GOLD, start: k * 0.31 });

  // ===== 20〜28 FUGA 嬉遊部 ｜ ソロのバイオリン = 弦から ／ ハープのアルペジオ = 弦のむち ／ ピアノの低音 = 鍵 ===============
  hint(bar(20) - B, 'ハープ ─ はじかれた弦が、床をむちのように払う', 4);
  SC.fugue.filter(([b, L, m, v]) => inBars(b, 20, 28) && v === 3).forEach(([b, L, m]) => pipeNote(beat(b), m, { color: WHITE, r: L >= 1 ? 9 : 7, v: 250, big: L >= 1, voice: 3 }));
  for (let k = 20; k < 28; k++) {
    const arp = SC.fugue.find(([b, L, m, v]) => v === 2 && Math.abs(b - k * 4) < 1e-6);
    if (arp) whip(bar(k) + (k % 2 ? 2 * B : 0), snPipeX(arp[2] + 12), { dir: k % 2 ? -1 : 1, A: 140 });
  }
  SC.pedal.filter(([b, L]) => inBars(b, 20, 28) && L === 1 && (b % 4 === 0 || b % 4 === 2)).forEach(([b, L, m]) => pianoKey(beat(b), snBassX(m), 0.4, { w: 34, h: 30, black: true, color: CRIMSON }));

  // ===== 28〜32 KYRIE ｜ 天使の羽ばたき = 風 ＋ 風に流される羽根 ／ 光の花 =====================================================
  hint(bar(28), 'キリエ ─ 天使の羽ばたきで、風が吹く');
  for (let b = 112 + 1; b < 126; b += 2) gust(beat(b), ((b - 113) / 2) % 2 === 0 ? 1 : -1, { v: 150 });
  for (let b = 112; b < 127; b++) for (let i = 0; i < 3; i++) feather(beat(b) + i * 0.33 * B, 60 + hsh(b, i) * (W - 120), { v: 90 });
  for (let b = 112; b < 128; b += 2) fire(beat(b), 0.5, delay => ring({ x: SN_ROSE.x, y: SN_ROSE.y, count: 10, speed: 125, r: 8, delay, start: (b - 112) * 0.19, color: ROSE, style: 'halo' }));

  // ===== 32〜48 DIES IRAE ｜ 旋律 = 五線を流れる音符 ／ 審判の天秤 ／ ティンパニ = 稲妻 ／ 16分 = 弦から ======================
  hint(bar(32) - 2 * B, '怒りの日 ─ 五線の音符: ド・レは跳ぶ、ミより上は跳ばない', 6);
  SC.dies.forEach(([b, L, m]) => { const half = Math.floor((b - 128) / 8); staffNote(beat(b) - 400 / 270, m, L, half % 2 === 0 ? -1 : 1); });
  for (const k of [33, 37, 41, 45]) judgment(bar(k) + 2 * B);
  hint(bar(33) - 2 * B, '審判の天秤 ─ かたむいた側の床に重りが落ちる', 4);
  SC.timp.filter(([b, m]) => inBars(b, 32, 48) && m === 38).forEach(([b], i) => bolt(beat(b) + B, { dx: i % 2 ? 30 : -30 }));
  SC.figura.filter(([b]) => inBars(b, 32, 48)).forEach(([b, L, m]) => {
    const step = Math.round(b * 4);
    if (step % 4 === 0) pipeNote(beat(b), m, { color: inBars(b, 40, 48) ? '#ff9a6a' : GOLD, r: 5, v: 300 });
    if (inBars(b, 40, 48) && step % 8 === 4) pipeNote(beat(b), m, { color: '#ffd0a0', r: 5, v: 300, inv: true });
  });

  // ===== 48〜56 STRETTO ｜ ぜんぶが重なる: 鍵 ＋ 弦の光（反行形も）＋ 弦のむち（左右対称）／ 全休止 = 止まる ================
  hint(bar(48), 'ストレット ─ 主題が重なる', 4);
  fugueBars(48, 54, { inv: true });
  for (const k of [49, 51, 53]) { whip(bar(k) + 2 * B, 130, { dir: 1, A: 120 }); whip(bar(k) + 2 * B, W - 130, { dir: -1, A: 120 }); }
  for (let k = 48; k < 54; k += 2) halo(bar(k) + 2 * B, 12, 140, { color: WHITE, start: k * 0.13 });
  for (let b = 54 * 4; b < 55 * 4 + 3; b++) fire(beat(b), 0.5, delay => ring({ x: SN_ROSE.x, y: SN_ROSE.y, count: 10, speed: 160, r: 7, delay, start: (b - 216) * 0.17, color: GOLD, style: 'halo' }));
  SC.figura.filter(([b]) => inBars(b, 54, 56) && Math.round(b * 4) % 2 === 0).forEach(([b, L, m]) => pipeNote(beat(b), m, { color: WHITE, r: 5, v: 320 }));
  SC.gp.forEach(b => { burst(beat(b), () => timeStop(SN_BEAT * 0.98)); hint(beat(b), '全休止 ─ すべてが止まる', 2); });

  // ===== 56〜60 AMEN ｜ 天の門が開く ／ 光の輪が何重にも ======================================================================
  fire(beat(224), 0.7, delay => ring({ x: SN_ROSE.x, y: SN_ROSE.y, count: 24, speed: 170, r: 8, delay, color: GOLD, style: 'halo' }));
  SC.bell.filter(([b]) => b >= 228).forEach(([b], i) => halo(beat(b), 16 - i * 2, 115 - i * 8, { color: i % 2 ? WHITE : GOLD, start: i * 0.09 }));

  return cues.sort((a, b) => a.t - b.t);
}

addSong({
  id: 'sanctus',
  title: 'SANCTUS',
  meta: '120 BPM · 2:05 · オリジナル曲 · 天界のフーガ（バイオリン・ハープ・ピアノ） · 少しむずかしめ',
  file: 'Sanctus.mp3',
  bpm: 120, beat: SN_BEAT, end: snBar(60) + 0.4,
  beatTime: snBeatTime,
  beatPos: snBeatPos,
  speedAt: snSpeedAt,
  env: ENV_SANCTUS,
  sections: SN_SECTIONS,
  build: sanctusChart,
  theme: 'sanctus',                // visuals-sanctus.js の見た目のセット
  titleLook: { sky: ['#3a70d0', '#fff0d0'], color: '#ffd98a', tier: 1, pulse: 0.01, stars: 0 },
  titleBpm: 120,
  preview: snBar(32) - 0.2,
  clearTitle: 'AMEN',
  overTitle: '裁かれた…',
  clearText: '天の鐘が、あなたのために鳴っている',
  bestKey: 'dodge_best_sanctus',
});
