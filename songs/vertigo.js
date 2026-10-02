"use strict";

/* =========================================================================
   曲⑤  Vertigo（オリジナル曲）  —  拍・場面・譜面
   「めまい」。弾はほとんど出さず、ステージそのものが敵になる曲。
   世界が傾いてすべり、床が流れ、穴が開き、壁がせまり、画面がさかさま・左右反転になる。

   曲は songs/vertigo-compose.py（Python）で作曲・合成した。
   画面がさかさまになる所では曲も全音（2半音）沈んでこもり、左右反転の所では音の左右も入れかわる。

   使う仕掛け（game.js の「Vertigo」の所）:
     stageTo({ tilt, spin, mirror, zoom, follow, conveyor, wl, wr, shock }, 秒, ease)
     floorHole({ x, w, open, close, warn })   床の穴（落ちると当たり）
     stageHint('◀◀ SLIDE')                    画面のまん中に出す予告
   ========================================================================= */

// ---- 拍のきざみ ------------------------------------------------------------
// 128 BPM: 1拍 = 0.46875秒、1小節 = 1.875秒。0拍目 = 0.5秒
const VERT_BEAT = 0.46875;
function vertBeatTime(n) { return 0.5 + n * VERT_BEAT; }
function vertBeatPos(t)  { return (t - 0.5) / VERT_BEAT; }

/* ---- 場面 ---------------------------------------------------------------------
   小節: 0 イントロ（ゆれる）/ 8 傾き / 16 ベルトコンベア＋穴 / 24 せまる壁 / 28 サビ（傾き＋コンベア）/
   36 上下さかさま / 40 左右反転 / 44 ズーム（せまい視界）/ 48 最後のサビ（ぜんぶ）/ 60 アウトロ（水平にもどる）
   -------------------------------------------------------------------------- */
const VERT_SECTIONS = [
  { t: 0,     tier: 0,   name: 'LEVEL',       sub: '水平',                       sky: ['#06121c', '#123247'], color: '#7ff6ff', pulse: 0.004, sway: 0, stars: 10 },
  { t: 15.45, tier: 1.5, name: 'TILT',        sub: '傾く世界 ─ 低いほうへすべる',     sky: ['#071522', '#163c55'], color: '#7ff6ff', pulse: 0.008, sway: 0, stars: 14 },
  { t: 30.45, tier: 2,   name: 'CONVEYOR',    sub: '流れる床 ─ 穴に落ちるな',        sky: ['#0b1424', '#203a5a'], color: '#ffe36e', pulse: 0.01,  sway: 0, stars: 18 },
  { t: 45.45, tier: 2.5, name: 'SQUEEZE',     sub: 'せまる壁',                     sky: ['#140f26', '#3a2552'], color: '#ff7ac8', pulse: 0.012, sway: 0, stars: 20 },
  { t: 52.95, tier: 4,   name: 'VERTIGO',     sub: 'サビ ─ めまい',                 sky: ['#160c28', '#45215e'], color: '#ff5fa2', pulse: 0.02,  sway: 0, stars: 34 },
  { t: 67.95, tier: 1,   name: 'UPSIDE DOWN', sub: '上下さかさま ─ ←→ が逆に見える',  sky: ['#0a0a1e', '#22224a'], color: '#a9b4ff', pulse: 0.006, sway: 0, stars: 12 },
  { t: 75.45, tier: 3,   name: 'MIRROR',      sub: '左右反転',                     sky: ['#0c1626', '#1f4256'], color: '#7fffd0', pulse: 0.014, sway: 0, stars: 22 },
  { t: 82.95, tier: 3,   name: 'TUNNEL',      sub: 'せまい視界',                   sky: ['#100a1c', '#2c1840'], color: '#ffb36e', pulse: 0.012, sway: 0, stars: 14 },
  { t: 90.45, tier: 5,   name: 'FREEFALL',    sub: '最後のサビ ─ ぜんぶ',            sky: ['#1a0a26', '#5a1f5e'], color: '#ff4f8b', pulse: 0.028, sway: 0, stars: 50 },
  { t: 112.95, tier: 1,  name: 'STEADY',      sub: '水平にもどる',                  sky: ['#08182a', '#1d4766'], color: '#bff8ff', pulse: 0.005, sway: 0, stars: 10 },
];

// 弾は少ないので、速さの倍率は控えめ（0.95〜1.35倍）
function vertSpeedAt(t) {
  let i = 0;
  while (i + 1 < VERT_SECTIONS.length && VERT_SECTIONS[i + 1].t <= t) i++;
  return 0.95 + 0.08 * VERT_SECTIONS[i].tier;
}

function vertigoChart() {
  const cues = [];
  const burst = (t, fn) => cues.push({ t, fn });
  const B = VERT_BEAT;
  const beat = vertBeatTime;
  const bar = k => beat(k * 4);
  const fire = (t, warn, fn) => burst(t - warn, () => fn(warn));
  const SC = SCORE_VERTIGO;
  const CYAN = '#7ff6ff', PINK = '#ff5fa2', YELLOW = '#ffe36e', WHITE = '#f0fbff';

  // 画面の上で、プレイヤーから見て「右」に見える向き（左右反転・さかさまを考える）
  const screenDir = d => d * Math.sign(stage.mirror || 1) * (Math.cos(stage.spin) < 0 ? -1 : 1);
  const arrow = d => (d > 0 ? '▶ ▶ ▶' : '◀ ◀ ◀');
  // t に世界が a まで傾く（1拍前に、すべる向きを矢印で予告）
  const tilt = (t, a, beats = 1, ease = 'snap') => {
    burst(t - B, () => { if (a !== 0) stageHint(arrow(screenDir(Math.sign(a))), B * 1.6); });
    burst(t, () => stageTo({ tilt: a }, beats * B, ease));
  };
  // t に床が v で流れ始める（1拍前に予告）
  const belt = (t, v, beats = 1) => {
    burst(t - B, () => { if (v !== 0) stageHint(arrow(screenDir(Math.sign(v))) + ' BELT', B * 1.6); });
    burst(t, () => stageTo({ conveyor: v }, beats * B));
  };
  // プレイヤーの足もとに、warn 秒後に開く穴（len 秒で閉じる）。dx = プレイヤーからのずれ
  // 足場の上にいたら、その足場もくずれる（足場に逃げれば安全、にはならない）
  const holeAtPlayer = (t, { w = 120, len = 2 * B * 4, warn = 4 * B, dx = 0 } = {}) => burst(t - warn, () => {
    const p = playerXY();
    floorHole({ x: Math.max(stage.wl, Math.min(stage.wr - w, p.x - w / 2 + dx)), w, open: t, close: t + len, warn });
    const plat = dx === 0 && platformUnderPlayer();
    if (plat) dropPlatform(plat, { open: t, close: t + len, warn });
  });
  const hole = (t, x, { w = 120, len = 2 * B * 4, warn = 4 * B } = {}) => burst(t - warn, () => floorHole({ x, w, open: t, close: t + len, warn }));
  // 狙い撃ち（上のどこかから）
  const shot = (t, x, v = 230, color = PINK, r = 9) => fire(t, 0.5, delay => { const a = aimVel(x, 24, v); spawn({ x, y: 24, vx: a.vx, vy: a.vy, r, delay, color }); });
  const shock = (t, on, beats = 4) => burst(t - (on ? beats * B : 0), () => stageTo({ shock: on ? 1 : 0 }, on ? beats * B : 0.01, 'linear'));
  const hit = (t, a = 0.5) => burst(t, () => { flash(a); shake(6); });
  // 坂の上から転がってくるトゲ車（傾いていなければ dir の向きへ）
  const roll = (t, { v = 130, dir = 0, color = YELLOW, r = 15 } = {}) => fire(t, 0.7, delay => {
    const d = dir || Math.sign(stage.tilt) || (Math.random() < 0.5 ? 1 : -1);
    roller({ x: d > 0 ? stage.wl + r + 4 : stage.wr - r - 4, vx: d * v, r, delay, color });
  });
  // プレイヤーのまわりの床に電気（跳ぶか、足場へ逃げる）
  const zap = (t, w = 280) => fire(t, 0.9, delay => {
    const p = playerXY();
    zapFloor({ x: Math.max(stage.wl, Math.min(stage.wr - w, p.x - w / 2)), w, delay });
  });
  // プレイヤーの真上からピストン
  const pist = (t, w = 70) => fire(t, 0.8, delay => piston({ x: playerXY().x, w, delay }));

  // ===== LEVEL 0〜8小節 ｜ ゆっくりゆれる（すべる感覚に慣れる）===========================
  for (let k = 2; k < 8; k += 2) tilt(bar(k), (k % 4 ? -1 : 1) * (0.06 + 0.02 * k), 4, 'smooth');
  for (const k of [3, 5, 7]) shot(bar(k), k === 5 ? W - 60 : 60, 170, CYAN);
  roll(bar(5) + 2 * B, { v: 150, dir: 1 }); roll(bar(7) + 2 * B, { v: 150, dir: -1 });
  tilt(bar(8) - 0.01, 0, 1);

  // ===== TILT 8〜16小節 ｜ 両はしの壁に電気。2小節ごとに逆へ傾く ===========================
  shock(bar(8), true, 4);
  hit(bar(8), 0.6);
  [[8, 0.30], [10, -0.30], [12, 0.36], [14, -0.36]].forEach(([k, a]) => tilt(bar(k), a));
  SC.snare.filter(b => b >= 32 && b < 64).forEach((b, i) => {
    const up = Math.floor((b - 32) / 8) % 2 === 0 ? 0 : W;             // 坂の上のすみから撃つ
    shot(beat(b), up === 0 ? 40 : W - 40, 200 + i * 4, PINK, 9);
  });
  for (let k = 8; k < 16; k++) roll(bar(k) + (k % 2 ? 2.5 : 1) * B, { v: 90 });     // 坂を転がり落ちてくる

  // ===== CONVEYOR 16〜24小節 ｜ 床が流れる ＋ 足もとに穴 ＋ 低いビームを跳ぶ =================
  tilt(bar(16), 0, 2, 'smooth');
  belt(bar(16), 150); belt(bar(20), -150);
  belt(bar(22), 190);
  for (let k = 17; k < 24; k++) holeAtPlayer(bar(k), { w: 110 + (k - 17) * 4, len: 1.5 * 4 * B });
  for (const k of [17, 19, 21, 23]) holeAtPlayer(bar(k) + 2 * B, { w: 100, len: 3 * B, dx: Math.sign(k < 20 || k >= 22 ? 1 : -1) * 170 });   // 流れの先にも穴
  zap(bar(19) + 3 * B); zap(bar(22) + 3 * B);
  for (const k of [18.5, 21.5, 23]) fire(bar(k), 0.9, delay => scanner({ fromLeft: k !== 21.5, y1: GROUND_Y - 46, y2: GROUND_Y, speed: 460, delay, color: YELLOW }));

  // ===== SQUEEZE 24〜28小節 ｜ 両側の壁が1小節ごとにせまってくる ＋ 上から玉 =================
  belt(bar(24), 0, 1);
  for (let k = 24; k < 28; k++) burst(bar(k), () => stageTo({ wl: 75 * (k - 23), wr: W - 75 * (k - 23) }, B, 'snap'));
  for (const k of [25.5, 26.5, 27.25, 27.75]) pist(bar(k), 60);
  for (let b = 104; b < 112; b++) fire(beat(b), 0.45, delay => {
    const x = rand(stage.wl + 20, stage.wr - 20);
    spawn({ x, y: -10, vy: 330, r: 10, delay, color: WHITE, lane: [0, 1] });
  });
  burst(bar(28), () => stageTo({ wl: 0, wr: W }, B, 'snap'));

  // ===== VERTIGO 28〜36小節 ｜ 1小節ごとに大きく傾く → 後半は傾き＋コンベア ==================
  hit(bar(28), 1);
  [0.38, -0.38, 0.30, -0.40].forEach((a, i) => tilt(bar(28 + i), a, 0.5));
  [[32, 0.24, -80], [33, -0.26, -80], [34, -0.22, 90], [35, 0.26, -60]].forEach(([k, a, v]) => { tilt(bar(k), a, 0.5); belt(bar(k), v, 0.5); });
  SC.snare.filter(b => b >= 112 && b < 144).forEach((b, i) => shot(beat(b), i % 2 ? W - 60 : 60, 250, PINK, 10));
  for (let k = 29; k < 36; k++) holeAtPlayer(bar(k) + 2 * B, { w: 120, len: 3 * B });
  for (let k = 28; k < 36; k++) roll(bar(k) + B, { v: 110, color: PINK });

  // ===== UPSIDE DOWN 36〜40小節 ｜ 画面が上下さかさま（重力はそのまま。←→ が逆に見える）=======
  tilt(bar(36), 0, 1, 'smooth');
  belt(bar(36), 0, 1);
  burst(bar(36), () => { stageHint('↻ UPSIDE DOWN', B * 3); stageTo({ spin: Math.PI }, 2 * B); });
  for (const k of [37, 38, 39]) {
    holeAtPlayer(bar(k), { w: 130, len: 3 * B });
    shot(bar(k) + 2 * B, k % 2 ? 60 : W - 60, 190, '#a9b4ff', 10);
  }
  zap(bar(37) + 3 * B, 320); zap(bar(38) + 3 * B, 320);
  roll(bar(38), { v: 200, dir: 1, color: '#a9b4ff' }); roll(bar(39), { v: 200, dir: -1, color: '#a9b4ff' });
  burst(bar(39) + 2 * B, () => stageTo({ spin: 0 }, 2 * B));   // 曲の音程がもどるのといっしょに

  // ===== MIRROR 40〜44小節 ｜ 1小節ごとに左右反転 ＋ 流れる床 ＋ 低いビーム =================
  for (let k = 40; k < 44; k++) {
    burst(bar(k), () => stageTo({ mirror: k % 2 ? 1 : -1 }, B * 0.75));
    belt(bar(k) + B, k % 2 ? -140 : 140, 0.5);
    holeAtPlayer(bar(k) + B, { w: 110, len: 2 * B, warn: 3 * B });
    fire(bar(k) + 2.5 * B, 0.9, delay => scanner({ fromLeft: k % 2 === 0, y1: GROUND_Y - 46, y2: GROUND_Y, speed: 480, delay, color: '#7fffd0' }));
  }
  burst(bar(44), () => stageTo({ mirror: 1, conveyor: 0 }, B));

  // ===== TUNNEL 44〜48小節 ｜ カメラがプレイヤーに寄る（まわりが見えない）＋ 穴 ＋ 画面の外から玉 ==
  shock(bar(44), false);
  burst(bar(44), () => stageTo({ zoom: 1.9, follow: 1 }, 2 * B));
  for (let b = 178; b < 192; b += 2) holeAtPlayer(beat(b), { w: 100, len: 2.5 * B, warn: 3 * B });
  for (let b = 177; b < 192; b += 2) fire(beat(b), 0.6, delay => {
    const left = b % 4 === 1, x = left ? -10 : W + 10, y = rand(GROUND_Y - 120, GROUND_Y - 20), a = aimVel(x, y, 280);
    spawn({ x, y, vx: a.vx, vy: a.vy, r: 10, delay, color: YELLOW });
  });
  for (const k of [45, 46, 47]) pist(bar(k) + 2 * B, 80);
  burst(bar(47) + 2 * B, () => stageTo({ zoom: 1, follow: 0 }, 2 * B));

  // ===== FREEFALL 48〜60小節 ｜ 画面がゆっくり1回転しながら、傾き＋穴＋コンベア → 最後は反転も ====
  shock(bar(48), true, 2);
  hit(bar(48), 1);
  burst(bar(48), () => stageTo({ spin: TAU }, 8 * 4 * B, 'linear'));
  burst(bar(56) + 0.05, () => { stage.spin = 0; });                    // 1回転して元どおり（見た目は同じ）
  [[48, 0.32], [50, -0.34], [52, 0.30], [54, -0.36]].forEach(([k, a]) => tilt(bar(k), a));
  [[52, -90], [54, 70]].forEach(([k, v]) => belt(bar(k), v, 0.5));
  for (const k of [49, 51, 53, 55]) holeAtPlayer(bar(k) + 2 * B, { w: 120, len: 4 * B });
  for (let k = 56; k < 60; k++) {
    burst(bar(k), () => stageTo({ mirror: k % 2 ? 1 : -1 }, B * 0.75));
    tilt(bar(k), (k % 2 ? -1 : 1) * 0.3, 0.5);
    holeAtPlayer(bar(k) + 2 * B, { w: 120, len: 3 * B });
  }
  belt(bar(56), 0, 1);
  for (let k = 48; k < 60; k++) roll(bar(k) + B, { v: 120, color: k % 2 ? PINK : YELLOW });
  for (const k of [50, 54]) zap(bar(k) + 3 * B, 300);
  for (const k of [57, 59]) pist(bar(k) + 3 * B, 80);
  SC.snare.filter(b => b >= 192 && b < 240 && b % 1 === 0 && Math.floor(b / 4) % 2 === 1).forEach((b, i) => shot(beat(b), i % 2 ? W - 60 : 60, 270, PINK, 10));

  // ===== STEADY 60〜 ｜ すべてが水平にもどる ==============================================
  burst(bar(60), () => stageTo({ tilt: 0, spin: 0, mirror: 1, zoom: 1, follow: 0, conveyor: 0, wl: 0, wr: W }, 2 * B));
  shock(bar(60), false);
  hit(bar(60), 0.8);

  return cues.sort((a, b) => a.t - b.t);
}

addSong({
  id: 'vertigo',
  title: 'Vertigo',
  meta: '128 BPM · 2:04 · オリジナル曲',
  file: 'Vertigo.mp3',
  bpm: 128, beat: VERT_BEAT, end: 122.5,
  beatTime: vertBeatTime,
  beatPos: vertBeatPos,
  speedAt: vertSpeedAt,
  env: ENV_VERTIGO,
  sections: VERT_SECTIONS,
  build: vertigoChart,
  theme: 'gyro',                   // visuals-gyro.js の見た目のセット
  titleLook: { sky: ['#071522', '#163c55'], color: '#7ff6ff', tier: 2, pulse: 0.006, stars: 12 },
  titleBpm: 64,
  preview: 53.0,                   // 試聴はサビから
  clearText: 'めまいがおさまって、世界は水平にもどった。',
  bestKey: 'dodge_best_vertigo',
});
