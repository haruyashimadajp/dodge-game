"use strict";

/* =========================================================================
   曲⑰  Echoes（オリジナル曲）  —  拍・場面・譜面
   テーマは「反響・残響」。100 BPM、ニ短調。曲は songs/echo-compose.py で作曲・合成した。
   洞窟のしずく、ガラスの鈴（FM ベル）、はじく弦、サビのリード、合唱、ドラム。
   すべての音はピンポン・ディレイ（付点8分 = 0.45秒ごとに 左 → 右 → 左 … とはね返る）と、長い残響に送られている。
   ドラムは 8 小節目から入り、16 小節目で少し、32 小節目でいちばん盛り上がる。
   難易度はふつう。演出は visuals-cave.js（反響する洞窟。水の床・結晶・こだまの光）。

   音ごとに攻撃がちがう（こだまの1つ1つが、曲で実際に聞こえる時刻に出る）:
     しずく        = 天井から落ちる水滴。床に着いた所から左右に水の波紋（跳び越える）
     ガラスの鈴    = 結晶が光って音の輪。そのこだまが聞こえるたびに、輪がもう一度（数が減っていく）
     はじく弦      = 音の高さの所へ水滴（長い音だけ波紋）
     リムショット  = すみから、こだまを2つ連れた弾が自分をねらう
     スネア        = 壁・天井・床ではね返る輪（反響） ／ ねらう弾 ＋ こだま
     スネアロール  = 水滴の雨（だんだん速く）
     逆再生の残響  = まわりから音が吸いこまれて、はじける
     サビの旋律    = 横から流れる音の波と、そのこだま（低い音は床を走るので跳ぶ。高い音は頭の上）
     ダブのスネア  = 鈴が、こだまのたびに輪を出す
   ========================================================================= */

// 100 BPM: 1拍 = 0.6秒、1小節 = 2.4秒。0拍目 = 0.5秒
const RV_BEAT = 0.6;
function rvBeatTime(n) { return 0.5 + n * RV_BEAT; }
function rvBeatPos(t)  { return (t - 0.5) / RV_BEAT; }
const rvBar = k => rvBeatTime(k * 4);

const RV_SECTIONS = [
  { t: 0,          tier: 0, name: 'ECHOES',        sub: 'しずくの音が、洞窟にひびく',        sky: ['#010309', '#030a16'], color: '#8fe9ff', pulse: 0.002, stars: 0 },
  { t: rvBar(8),   tier: 1, name: 'RIPPLE',        sub: '波紋 ─ リズムが目をさます',          sky: ['#011014', '#04202a'], color: '#6ff0e0', pulse: 0.008, stars: 0 },
  { t: rvBar(16),  tier: 2, name: 'RESONANCE',     sub: '共鳴 ─ 音が壁にはね返る',            sky: ['#05081e', '#121a42'], color: '#b9a4ff', pulse: 0.012, stars: 0 },
  { t: rvBar(24),  tier: 1, name: 'SILENCE',       sub: '静寂 ─ 残響だけが残る',              sky: ['#000000', '#04050b'], color: '#e8f0ff', pulse: 0,     stars: 0 },
  { t: rvBar(28),  tier: 2, name: 'RISING',        sub: '高まる',                            sky: ['#06061a', '#1a1040'], color: '#c9a8ff', pulse: 0.014, stars: 0, zoom: [1, 1.03] },
  { t: rvBar(32),  tier: 3, name: 'REVERBERATION', sub: '残響 ─ すべての音がこだまする',      sky: ['#0b0622', '#2c1052'], color: '#ff9ae8', pulse: 0.02,  stars: 0, sway: 0.4 },
  { t: rvBar(44),  tier: 1, name: 'FADE',          sub: 'こだまが遠ざかる',                  sky: ['#010309', '#05101e'], color: '#8fe9ff', pulse: 0.004, stars: 0 },
];

// 弾の速さ: 1.0〜1.18倍
function rvSpeedAt(t) {
  let i = 0;
  while (i + 1 < RV_SECTIONS.length && RV_SECTIONS[i + 1].t <= t) i++;
  return 1.0 + 0.06 * RV_SECTIONS[i].tier;
}

function echoesChart() {
  const cues = [];
  const burst = (t, fn) => cues.push({ t, fn });
  const B = RV_BEAT;
  const beat = rvBeatTime;
  const bar = rvBar;
  const fire = (t, warn, fn) => burst(t - warn, () => fn(warn));
  const SC = SCORE_ECHO;
  const LAG = 0.75 * B;                                                    // こだまの間隔（付点8分 = 0.45秒）
  const AQUA = '#8fe9ff', TEAL = '#6ff0e0', VIOLET = '#b9a4ff', PINK = '#ff9ae8', PEARL = '#e8f0ff', GOLD = '#ffe9a8';
  const hsh = (a, b = 0) => { const v = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return v - Math.floor(v); };
  const px = (m, lo, hi) => 90 + (W - 180) * Math.max(0, Math.min(1, (m - lo) / (hi - lo)));
  const hint = (t, text, beats = 4) => burst(t, () => stageHint(text, beats * B));
  const fx = (t, ...a) => burst(t, () => { if (typeof rvFx === 'function') rvFx(...a); });
  const inBars = (b, k0, k1) => b >= k0 * 4 && b < k1 * 4;
  // ある音の「こだま」を score から集める: [[曲の秒, 大きさ, 左右]]
  const echoesOf = (b, m, kind, minLvl = 0.12) => SC.echo
    .filter(e => e[5] === kind && e[1] === m && Math.abs(e[0] - e[4] * 0.75 - b) < 0.01 && e[2] >= minLvl)
    .map(e => [beat(e[0]), e[2], e[3]]);

  // ---- 部品 ----
  // 水滴: 曲の時刻 t（拍）に、ちょうど床に着く（しずくの音 = 着いた瞬間）
  const FALL_V0 = 120, FALL_G = 900, FALL_Y = 20;
  const fallTime = (v0 = FALL_V0) => { const d = GROUND_Y - 9 - FALL_Y; return (-v0 + Math.sqrt(v0 * v0 + 2 * FALL_G * d)) / FALL_G; };
  const drop = (b, x, o = {}) => {
    const v0 = o.v0 || FALL_V0, warn = o.warn || 0.6;
    fire(beat(b) - fallTime(v0), warn, delay => rvDrop({ x, y: FALL_Y, vy: v0, g: FALL_G, delay, ripple: o.ripple !== false, rv: o.rv || 230, rh: o.rh || 20, color: o.color || AQUA }));
  };
  // 鈴: 時刻 b に鳴り、そのこだまのたびに輪
  const bell = (b, x, y, taps, o = {}) => {
    const warn = o.warn || 0.7;
    fire(beat(b), warn, delay => rvBell({ x, y, taps: [[beat(b), 1, 0], ...taps], n: o.n || 10, v: o.v || 140, r: o.r || 7, delay, color: o.color || GOLD, bounces: o.bounces || 0, spin: o.spin || 0.5 }));
  };
  // こだまの光（当たらない。左右の壁が、聞こえるこだまに合わせて光る）
  const wallTaps = (kind, k0, k1) => SC.echo.filter(e => e[5] === kind && inBars(e[0], k0, k1)).forEach(e => fx(beat(e[0]), 'wall', e[3], e[2]));

  // ===== ECHOES 0〜8 ｜ しずくと波紋 ／ 2 小節目から鈴（こだまのたびに輪）=================================================
  SC.drip.filter(([b]) => b < 32).forEach(([b, pan], i) => {
    if (beat(b) < 2.2) { fx(beat(b), 'splash', W / 2 + pan * 300, GROUND_Y); return; }        // 最初のしずくは見せるだけ
    drop(b, W / 2 + pan * 300 + (hsh(i) - 0.5) * 60, { rh: 16, rv: 210 });
  });
  hint(beat(4), 'しずくの波紋は 跳び越える', 6);
  SC.ping.filter(([b]) => b < 32).forEach(([b, m], i) => bell(b, px(m, 67, 79), 150 + 70 * hsh(i, 1), echoesOf(b, m, 'ping', 0.25), { n: 7, v: 125 }));
  wallTaps('ping', 0, 8);

  // ===== RIPPLE 8〜16 ｜ はじく弦 = 水滴（長い音は波紋）／ リム = すみからこだまつきの弾 ／ 鈴 ===================================
  const plucks = (k0, k1, o = {}) => SC.pluck.filter(([b]) => inBars(b, k0, k1)).forEach(([b, L, m]) =>
    drop(b, px(m, o.lo || 66, o.hi || 80), { ripple: L >= 2 && !o.noRipple, rh: 18, rv: 250, color: o.color || TEAL, v0: o.v0 }));
  plucks(8, 16);
  SC.rim.filter(b => inBars(b, 8, 16)).forEach((b, i) => {
    const left = i % 2 === 0;
    fire(beat(b), 0.55, delay => rvShot({ x: left ? 40 : W - 40, y: 40, aim: true, v: 230, taps: 2, lag: LAG, delay, color: TEAL }));
  });
  SC.ping.filter(([b]) => inBars(b, 8, 16)).forEach(([b, m], i) => bell(b, i % 2 ? 560 : 240, 170, echoesOf(b, m, 'ping', 0.25), { n: 8, v: 135, color: GOLD }));
  wallTaps('pluck', 8, 16); wallTaps('ping', 8, 16);
  SC.kick.filter(b => inBars(b, 8, 32)).forEach(b => fx(beat(b), 'kick', 0.6));

  // ===== RESONANCE 16〜24 ｜ スネア = 反射する輪 ／ 1拍目のスネア = こだまつきのねらい弾 ／ 長い音 = 鈴 =========================
  fx(bar(16), 'boom', 1);
  plucks(16, 24, { color: VIOLET });
  SC.snare.filter(b => inBars(b, 16, 24)).forEach((b, i) => {
    const k = Math.floor(b / 4), onThree = b % 4 === 3;
    if (onThree) fire(beat(b), 0.6, delay => rvRing({ x: k % 2 ? 560 : 240, y: 110, n: 8, v: 165, r: 8, bounces: 1, start: k * 0.3, delay, color: VIOLET }));
    else fire(beat(b), 0.55, delay => rvShot({ x: k % 2 ? 60 : W - 60, y: 60, aim: true, v: 250, taps: 2, lag: LAG, delay, color: VIOLET }));
  });
  hint(bar(16) + 0.3, '紫の輪は 壁ではね返る', 6);
  SC.ping.filter(([b]) => inBars(b, 16, 24)).forEach(([b, m]) => bell(b, px(m, 76, 89), 140, echoesOf(b, m, 'ping', 0.15).slice(0, 2), { n: 8, v: 130, color: GOLD }));
  SC.tom.filter(([b]) => inBars(b, 16, 24)).forEach(([b, m], i) => drop(b, 160 + i * 160, { ripple: false, color: PINK, v0: 260 }));
  wallTaps('pluck', 16, 24); wallTaps('ping', 16, 24);

  // ===== SILENCE 24〜28 ｜ ドラムが止まる。最後のスネアのこだまが鈴に ／ 逆再生の残響 = 吸いこまれて、はじけて、止まる ===============
  fx(bar(24), 'silence', 1);
  bell(96, W / 2, 200, echoesOf(96, 0, 'snare', 0.15), { n: 12, v: 120, color: PEARL, warn: 0.6 });
  SC.ping.filter(([b]) => inBars(b, 24, 28)).forEach(([b, m], i) => bell(b, px(m, 72, 82), 130 + 60 * (i % 2), echoesOf(b, m, 'ping', 0.25), { n: 7, v: 110, color: PEARL }));
  wallTaps('ping', 24, 28); wallTaps('snare', 24, 28);
  // 102〜104拍: 逆再生の残響 → まわりから吸いこまれて、まんなかではじける → 一瞬止まる（残響が空中にのこる）
  fire(beat(104) - 380 / 300, 0.7, delay => closeIn({ x: W / 2, y: 330, count: 16, size: 380, speed: 300, spin: 0.4, r: 7, delay }));
  fx(beat(102), 'swell', 2 * B);
  burst(beat(104), () => { rvRing({ x: W / 2, y: 330, n: 18, v: 200, r: 8, bounces: 1, delay: 0, color: PEARL }); flash(0.6); shake(8); });
  burst(beat(104.6), () => timeStop(1.0));

  // ===== RISING 28〜32 ｜ 弦が1オクターブ上 ／ スネアロール = 水滴の雨（だんだん速く）／ 逆再生のシンバル → 吸いこまれる ==========
  fx(bar(28), 'boom', 0.7);
  plucks(28, 32, { lo: 78, hi: 92, noRipple: true, color: VIOLET });
  SC.roll.forEach((b, i) => {
    const u = (i * 0.137) % 1, x = 90 + (W - 180) * (i % 2 ? u : 1 - u);
    drop(b, x, { ripple: false, color: PINK, v0: 320, warn: 0.5 });
  });
  hint(bar(29), 'まわりから 音が吸いこまれる', 6);
  fire(bar(32) - 1.6, 0.6, delay => { const p = playerXY(); closeIn({ x: p.x, y: p.y - 40, count: 14, size: 420, speed: 420 / 1.6, spin: 0.6, r: 7, delay }); });
  fx(beat(126), 'swell', 2 * B);

  // ===== REVERBERATION 32〜44 ｜ サビ。旋律 = 音の波とそのこだま ／ スネア = 反射する輪 ＋ ねらい弾 ／ ダブ = 鈴 ======================
  fx(bar(32), 'climax', 1);
  burst(bar(32), () => { rvRing({ x: W / 2, y: 200, n: 20, v: 210, r: 8, bounces: 1, delay: 0, color: PINK }); flash(0.9); shake(14); punch(0.06); });
  let lastLow = -9;
  SC.lead.forEach(([b, L, m]) => {
    if (L < 1) return;
    const low = m <= 77 && b - lastLow >= 2;
    if (low) {
      lastLow = b;
      fire(beat(b), 0.7, delay => rvWave({ y: GROUND_Y - 13, dir: -1, v: 330, amp: 3, freq: 1.5, r: 9, taps: 1, lag: LAG, delay, color: PINK }));
    } else {
      const y = GROUND_Y - 120 - (m - 77) * 16;
      fire(beat(b), 0.7, delay => rvWave({ y, dir: b % 8 < 4 ? -1 : 1, v: 300, amp: 16, freq: 1.2, r: 9, taps: 3, lag: LAG, delay, color: GOLD }));
    }
  });
  hint(bar(33) + 0.5, 'ピンクの波（床）は跳ぶ。金の波は頭の上', 6);
  SC.snare.filter(b => inBars(b, 32, 44)).forEach(b => {
    const k = Math.floor(b / 4), h = b % 4;
    if (h === 3.5) return;                                                            // ダブのスネア（下で鈴に）
    if (h === 3) fire(beat(b), 0.6, delay => rvRing({ x: k % 2 ? 600 : 200, y: 100, n: 8, v: 175, r: 8, bounces: 1, start: k * 0.4, delay, color: VIOLET }));
    else if (k % 2 === 0) fire(beat(b), 0.55, delay => rvShot({ x: k % 4 ? 60 : W - 60, y: 60, aim: true, v: 260, taps: 2, lag: LAG, delay, color: VIOLET }));
  });
  SC.snare.filter(b => inBars(b, 32, 44) && b % 4 === 3.5).forEach(b => bell(b, W / 2, 150, echoesOf(b, 0, 'snare', 0.15), { n: 10, v: 150, color: PINK, warn: 0.6 }));
  SC.tom.filter(([b]) => inBars(b, 32, 44)).forEach(([b], i) => drop(b, 120 + (i % 5) * 140, { ripple: false, color: PINK, v0: 300, warn: 0.5 }));
  SC.crash.filter(b => inBars(b, 33, 44)).forEach(b => { fx(beat(b), 'boom', 1); burst(beat(b), () => { flash(0.5); shake(8); }); });
  SC.kick.filter(b => inBars(b, 32, 44)).forEach(b => fx(beat(b), 'kick', 1));
  wallTaps('lead', 32, 44); wallTaps('snare', 32, 44);

  // ===== FADE 44〜52 ｜ ドラムが消えていく。鈴とそのこだま、しずく。最後の鈴は長くこだまする ======================================
  fx(bar(44), 'fade', 1);
  SC.ping.filter(([b]) => inBars(b, 44, 48)).forEach(([b, m], i) => bell(b, px(m, 66, 80), 160 + 40 * (i % 2), echoesOf(b, m, 'ping', 0.25), { n: 7, v: 130, color: AQUA }));
  SC.ping.filter(([b]) => b >= 192).forEach(([b, m], i) => bell(b, [W / 2, 250, 550][i % 3], 170, echoesOf(b, m, 'ping', 0.15), { n: 10, v: 105, color: PEARL }));
  SC.drip.filter(([b]) => b >= 190).forEach(([b, pan], i) => drop(b, W / 2 + pan * 300 + (hsh(i, 7) - 0.5) * 200, { rh: 15, rv: 200 }));
  SC.kick.filter(b => inBars(b, 44, 52)).forEach(b => fx(beat(b), 'kick', 0.4));
  wallTaps('ping', 44, 52);

  return cues.sort((a, b) => a.t - b.t);
}

addSong({
  id: 'echoes',
  title: 'Echoes',
  meta: '100 BPM · 2:11 · オリジナル曲 · 反響と残響 · ふつう',
  file: 'Echoes.mp3',
  bpm: 100, beat: RV_BEAT, end: 127.0,
  beatTime: rvBeatTime,
  beatPos: rvBeatPos,
  speedAt: rvSpeedAt,
  env: ENV_ECHO,
  sections: RV_SECTIONS,
  build: echoesChart,
  theme: 'cave',                   // visuals-cave.js の見た目のセット
  titleLook: { sky: ['#011014', '#04202a'], color: '#8fe9ff', tier: 1, pulse: 0.006, stars: 0 },
  titleBpm: 100,
  preview: 77.3,
  clearTitle: 'ECHOES',
  overTitle: '…残響が消えた',
  clearText: '最後のこだまが、遠くで鳴っている。',
  bestKey: 'dodge_best_echoes',
});
