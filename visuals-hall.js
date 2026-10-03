"use strict";

/* =========================================================================
   見た目のセット「hall」  —  曲⑮「Grand Overture」用
   コンサートホール。赤いビロードの幕と金の額縁（プロセニアム）、奥にはパイプオルガン、天井にシャンデリア、
   ひな壇にはオーケストラ（弦・木管・金管・打楽器・ハープ・チェレスタ・合唱）と、背中を見せた指揮者。
   いま音を出しているパートに、スポットライトが当たって金色に光る（譜面のデータで決まる）。
   指揮者は1小節ずつ4拍子をふる。床はみがかれた木の舞台で、手前にフットライト。
   弾は楽譜の音符（4分音符・8分音符）、弓の先、ピチカートの粒、ティンパニの銅の玉、金の玉、星、光の輪。
   ビームは金管（金色・ベルの形）、ハープの弦（ふるえる金の糸）、オルガン（パイプからの音の柱）。
   ここぞという所の演出:
     はじまり … 幕が左右に開いていく
     V. 夜想曲 … ホールの明かりが落ちて青い月明かり、天井に星
     G.P.     … 全員が休む一瞬、明かりが落ちて指揮者にだけ光、「G.P.」の文字（弾は止まる）
     VII.     … フィナーレの瞬間に光があふれ、金の紙吹雪が降りつづける。オルガンのパイプが光る
     クリア    … 幕が閉じて、バラの花が舞う
     右下      … 強弱記号（pp〜fff）がいまの音の大きさで変わる
   重くならないよう、ホールとオーケストラは前もって描いた絵を使い、光っているパートは「光った絵」を重ねるだけにする。
   ========================================================================= */

(function () {
  const WHITE = [255, 255, 255], GOLD = [255, 201, 77], WARM = [255, 220, 160];
  const SERIF = 'Georgia, "Times New Roman", "Hiragino Mincho ProN", "Yu Mincho", serif';
  const st = { made: false, bg: null, groups: null, act: null, confetti: [], petals: [], lastBeat: -99, finale: 0, open: 0, gp: 0, dyn: 0 };
  const inSong = () => scene !== 'title';
  const hs = (a, b = 0) => { const v = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return v - Math.floor(v); };

  // ---- オーケストラの配置（パートごとに、絵の範囲と、だれがどこにすわるか）--------------------------------
  // 各パート: [x, y, w, h] の範囲に、楽器 inst の奏者を並べる
  const LAYOUT = {
    choir: { box: [190, 292, 420, 70], inst: 'choir' },
    organ: null,
    timp:  { box: [70, 420, 150, 70], inst: 'timp' },
    cym:   { box: [600, 410, 140, 80], inst: 'cym' },
    horns: { box: [220, 420, 120, 60], inst: 'hn' },
    brass: { box: [345, 415, 245, 66], inst: 'tp' },
    winds: { box: [255, 490, 300, 62], inst: 'fl' },
    harp:  { box: [40, 520, 110, 130], inst: 'harp' },
    cel:   { box: [660, 560, 100, 70], inst: 'cel' },
    vn:    { box: [130, 560, 235, 96], inst: 'vn' },
    low:   { box: [370, 556, 290, 104], inst: 'vc' },
  };

  // 奏者1人（lit = スポットライトが当たった色）
  function musician(g, x, y, s, inst, lit) {
    const skin = lit ? '#e8b48a' : '#3a2a2a', suit = lit ? '#1a1418' : '#0d0a0c', rim = lit ? 'rgba(255,215,140,0.9)' : 'rgba(255,200,120,0.12)';
    const wood = lit ? '#a8582a' : '#3a1e12', brass = lit ? '#ffcf5a' : '#5a4418', silver = lit ? '#e6ecf5' : '#4a4e58';
    g.lineCap = 'round';
    // 体と頭
    g.fillStyle = suit;
    g.beginPath(); g.moveTo(x - 9 * s, y + 18 * s); g.quadraticCurveTo(x - 10 * s, y - 2 * s, x, y - 4 * s); g.quadraticCurveTo(x + 10 * s, y - 2 * s, x + 9 * s, y + 18 * s); g.closePath(); g.fill();
    g.strokeStyle = rim; g.lineWidth = 1.2 * s; g.stroke();
    g.fillStyle = skin; g.beginPath(); g.arc(x, y - 10 * s, 5.5 * s, 0, TAU); g.fill();
    g.fillStyle = lit ? '#2a1a12' : '#120c0c'; g.beginPath(); g.arc(x, y - 12 * s, 5.5 * s, Math.PI, TAU); g.fill();
    if (inst === 'choir') { g.fillStyle = lit ? '#fff4e0' : '#3a3434'; g.fillRect(x - 4 * s, y - 4 * s, 8 * s, 2.5 * s); return; }
    g.lineWidth = 2 * s;
    if (inst === 'vn' || inst === 'va') {
      g.fillStyle = wood; g.save(); g.translate(x + 7 * s, y - 4 * s); g.rotate(-0.5);
      g.beginPath(); g.ellipse(0, 0, 7 * s, 3.4 * s, 0, 0, TAU); g.fill(); g.restore();
      g.strokeStyle = lit ? '#f4e6c8' : '#4a4038'; g.lineWidth = 1 * s;
      g.beginPath(); g.moveTo(x + 2 * s, y - 14 * s); g.lineTo(x + 20 * s, y + 6 * s); g.stroke();
    } else if (inst === 'vc') {
      g.fillStyle = wood; g.beginPath(); g.ellipse(x + 2 * s, y + 10 * s, 6 * s, 10 * s, 0.1, 0, TAU); g.fill();
      g.strokeStyle = wood; g.beginPath(); g.moveTo(x + 1 * s, y); g.lineTo(x - 1 * s, y - 16 * s); g.stroke();
      g.strokeStyle = lit ? '#f4e6c8' : '#4a4038'; g.lineWidth = 1 * s; g.beginPath(); g.moveTo(x - 12 * s, y + 8 * s); g.lineTo(x + 14 * s, y + 12 * s); g.stroke();
    } else if (inst === 'cb') {
      g.fillStyle = wood; g.beginPath(); g.ellipse(x + 3 * s, y + 8 * s, 8 * s, 14 * s, 0.05, 0, TAU); g.fill();
      g.strokeStyle = wood; g.beginPath(); g.moveTo(x + 2 * s, y - 4 * s); g.lineTo(x, y - 26 * s); g.stroke();
    } else if (inst === 'fl') {
      g.strokeStyle = silver; g.beginPath(); g.moveTo(x - 2 * s, y - 9 * s); g.lineTo(x + 20 * s, y - 6 * s); g.stroke();
    } else if (inst === 'ob' || inst === 'cl') {
      g.strokeStyle = inst === 'ob' ? '#2a1e1a' : '#141016'; if (lit) g.strokeStyle = inst === 'ob' ? '#5a3a2a' : '#30283a';
      g.beginPath(); g.moveTo(x, y - 8 * s); g.lineTo(x + 3 * s, y + 10 * s); g.stroke();
      g.strokeStyle = silver; g.lineWidth = 1 * s; g.beginPath(); g.moveTo(x + 1 * s, y); g.lineTo(x + 2.5 * s, y + 2 * s); g.stroke();
    } else if (inst === 'bn') {
      g.strokeStyle = wood; g.lineWidth = 3 * s; g.beginPath(); g.moveTo(x - 6 * s, y + 12 * s); g.lineTo(x + 6 * s, y - 20 * s); g.stroke();
    } else if (inst === 'hn') {
      g.strokeStyle = brass; g.lineWidth = 2.2 * s; g.beginPath(); g.arc(x + 9 * s, y + 2 * s, 6 * s, 0, TAU); g.stroke();
      g.fillStyle = brass; g.beginPath(); g.arc(x + 15 * s, y + 6 * s, 3.5 * s, 0, TAU); g.fill();
    } else if (inst === 'tp') {
      g.strokeStyle = brass; g.lineWidth = 2 * s; g.beginPath(); g.moveTo(x + 3 * s, y - 9 * s); g.lineTo(x + 18 * s, y - 13 * s); g.stroke();
      g.fillStyle = brass; g.beginPath(); g.moveTo(x + 17 * s, y - 13 * s); g.lineTo(x + 22 * s, y - 17 * s); g.lineTo(x + 22 * s, y - 9 * s); g.closePath(); g.fill();
    } else if (inst === 'tb') {
      g.strokeStyle = brass; g.lineWidth = 1.8 * s; g.beginPath(); g.moveTo(x + 3 * s, y - 9 * s); g.lineTo(x + 26 * s, y - 5 * s); g.moveTo(x + 8 * s, y - 6 * s); g.lineTo(x + 26 * s, y - 2 * s); g.stroke();
    } else if (inst === 'tu') {
      g.fillStyle = brass; g.beginPath(); g.ellipse(x + 6 * s, y + 4 * s, 7 * s, 10 * s, 0, 0, TAU); g.fill();
      g.beginPath(); g.ellipse(x + 8 * s, y - 14 * s, 8 * s, 3 * s, 0, 0, TAU); g.fill();
    }
  }
  function timpaniDrum(g, x, y, r, lit) {
    const cu = lit ? '#d0803a' : '#3a2214';
    g.fillStyle = cu; g.beginPath(); g.moveTo(x - r, y); g.quadraticCurveTo(x, y + r * 1.4, x + r, y); g.closePath(); g.fill();
    g.fillStyle = lit ? '#f6ead0' : '#4a443c'; g.beginPath(); g.ellipse(x, y, r, r * 0.28, 0, 0, TAU); g.fill();
    g.strokeStyle = lit ? '#ffd27a' : '#5a4420'; g.lineWidth = 1.5; g.stroke();
  }

  // パートの絵（暗い / 光った）を1枚ずつ作る
  function makeGroup(name, lit) {
    const L = LAYOUT[name], [bx, by, bw, bh] = L.box, pad = 20;
    const c = document.createElement('canvas'); c.width = bw + pad * 2; c.height = bh + pad * 2;
    const g = c.getContext('2d'); g.translate(pad - bx, pad - by);
    if (name === 'choir') for (let row = 0; row < 2; row++) for (let i = 0; i < 18; i++) musician(g, bx + 12 + i * 22.5 + row * 11, by + 22 + row * 26, 0.8, 'choir', lit);
    if (name === 'timp') { for (const [x, r] of [[100, 26], [160, 30]]) { timpaniDrum(g, x, by + 46, r, lit); } musician(g, 130, by + 36, 0.85, 'x', lit); }
    if (name === 'cym') {
      musician(g, 640, by + 46, 0.85, 'x', lit);
      g.fillStyle = lit ? '#ffd66a' : '#4a3c18';
      for (const dx of [-14, 14]) { g.beginPath(); g.ellipse(640 + dx, by + 40, 4, 13, 0, 0, TAU); g.fill(); }
      g.fillStyle = lit ? '#e8dcc0' : '#3a3630'; g.beginPath(); g.ellipse(700, by + 52, 22, 24, 0, 0, TAU); g.fill();      // 大太鼓
      g.strokeStyle = lit ? '#c0302a' : '#3a1414'; g.lineWidth = 3; g.stroke();
    }
    if (name === 'horns') for (let i = 0; i < 4; i++) musician(g, bx + 16 + i * 27, by + 36, 0.9, 'hn', lit);
    if (name === 'brass') { const ins = ['tp', 'tp', 'tp', 'tb', 'tb', 'tb', 'tu']; ins.forEach((s, i) => musician(g, bx + 14 + i * 33, by + 38, 0.9, s, lit)); }
    if (name === 'winds') { const ins = ['fl', 'fl', 'ob', 'ob', 'cl', 'cl', 'bn', 'bn']; ins.forEach((s, i) => musician(g, bx + 16 + i * 36, by + 34, 0.9, s, lit)); }
    if (name === 'harp') {
      g.strokeStyle = lit ? '#ffd66a' : '#4a3c18'; g.lineWidth = 5;
      g.beginPath(); g.moveTo(bx + 20, by + bh); g.lineTo(bx + 30, by + 8); g.quadraticCurveTo(bx + 70, by + 4, bx + 96, by + 40); g.lineTo(bx + 52, by + bh); g.stroke();
      g.strokeStyle = lit ? 'rgba(255,240,200,0.8)' : 'rgba(120,110,90,0.3)'; g.lineWidth = 1;
      for (let i = 1; i < 10; i++) { const u = i / 10; g.beginPath(); g.moveTo(bx + 30 + u * 66, by + 8 + u * 30); g.lineTo(bx + 22 + u * 30, by + bh - 4); g.stroke(); }
      musician(g, bx + 70, by + bh - 30, 0.95, 'x', lit);
    }
    if (name === 'cel') {
      g.fillStyle = lit ? '#5a2a1a' : '#1e100a'; g.fillRect(bx + 10, by + 30, 70, 30);
      g.fillStyle = lit ? '#f4ead2' : '#3a3630'; g.fillRect(bx + 14, by + 28, 62, 6);
      musician(g, bx + 45, by + 20, 0.9, 'x', lit);
    }
    if (name === 'vn') for (let row = 0; row < 2; row++) for (let i = 0; i < 8; i++) musician(g, bx + 16 + i * 28 + row * 14, by + 30 + row * 40, 0.95 + row * 0.1, 'vn', lit);
    if (name === 'low') {
      for (let i = 0; i < 4; i++) musician(g, bx + 16 + i * 28, by + 34, 0.95, 'va', lit);
      for (let i = 0; i < 4; i++) musician(g, bx + 130 + i * 30, by + 50, 1.05, 'vc', lit);
      for (let i = 0; i < 3; i++) musician(g, bx + 30 + i * 34, by + 76, 1.1, 'vc', lit);
      for (let i = 0; i < 3; i++) musician(g, bx + 160 + i * 40, by + 76, 1.15, 'cb', lit);
    }
    return { c, x: bx - pad, y: by - pad };
  }

  // パイプオルガン（光ったときの絵も）
  function organArt(g, lit) {
    const x0 = 250, x1 = 550, base = 270, n = 23;
    g.fillStyle = lit ? '#4a2a14' : '#1c0e08'; g.fillRect(x0 - 16, base - 10, x1 - x0 + 32, 26);
    for (let i = 0; i < n; i++) {
      const u = i / (n - 1), h = 70 + 150 * Math.pow(1 - Math.abs(u - 0.5) * 2, 0.8) + (i % 2) * 14, x = x0 + u * (x1 - x0), w = 9;
      const gr = g.createLinearGradient(x - w, 0, x + w, 0);
      if (lit) { gr.addColorStop(0, '#8a6a30'); gr.addColorStop(0.5, '#fff0b8'); gr.addColorStop(1, '#8a6a30'); }
      else { gr.addColorStop(0, '#2a2420'); gr.addColorStop(0.5, '#6a6050'); gr.addColorStop(1, '#2a2420'); }
      g.fillStyle = gr; g.fillRect(x - w / 2, base - h, w, h);
      g.beginPath(); g.moveTo(x - w / 2, base - h); g.lineTo(x, base - h - 6); g.lineTo(x + w / 2, base - h); g.closePath(); g.fill();
      g.fillStyle = lit ? '#2a1a08' : '#0a0806'; g.fillRect(x - 2.5, base - 24, 5, 7);                 // 口
    }
  }

  function make() {
    st.made = true;
    // ホールの奥（いつも同じ）
    const c = document.createElement('canvas'); c.width = W; c.height = H;
    const g = c.getContext('2d');
    // 壁: 深い赤 ＋ 金の柱
    const wall = g.createLinearGradient(0, 0, 0, H); wall.addColorStop(0, '#1a0608'); wall.addColorStop(1, '#2c0c10');
    g.fillStyle = wall; g.fillRect(0, 0, W, H);
    for (let i = 0; i < 9; i++) {
      const x = 40 + i * 90;
      const pg = g.createLinearGradient(x - 8, 0, x + 8, 0); pg.addColorStop(0, 'rgba(120,80,30,0.25)'); pg.addColorStop(0.5, 'rgba(255,210,120,0.28)'); pg.addColorStop(1, 'rgba(120,80,30,0.25)');
      g.fillStyle = pg; g.fillRect(x - 8, 40, 16, 360);
    }
    // バルコニー席（左右に2段、観客の頭）
    for (const side of [0, 1]) for (let tier = 0; tier < 2; tier++) {
      const y = 150 + tier * 110, x0 = side ? W - 190 : 0;
      g.fillStyle = '#12050a'; g.fillRect(x0, y, 190, 70);
      for (let i = 0; i < 9; i++) { g.fillStyle = '#0a0306'; g.beginPath(); g.arc(x0 + 14 + i * 20, y + 26, 7, 0, TAU); g.fill(); }
      g.fillStyle = '#7a5a20'; g.fillRect(x0, y + 36, 190, 6);
      g.fillStyle = '#4a1a1c'; g.fillRect(x0, y + 42, 190, 28);
      g.strokeStyle = 'rgba(255,210,120,0.35)'; g.lineWidth = 1;
      for (let i = 0; i < 12; i++) { g.beginPath(); g.arc(x0 + 8 + i * 16, y + 56, 6, Math.PI, 0); g.stroke(); }
    }
    organArt(g, false);
    // ひな壇（3段）
    for (const [y, h, col] of [[400, 100, '#2a140e'], [480, 90, '#321810'], [550, 144, '#3a1c12']]) {
      g.fillStyle = col; g.beginPath(); g.ellipse(W / 2, y + h, 420, h, 0, Math.PI, 0); g.fill();
      g.strokeStyle = 'rgba(255,200,120,0.15)'; g.lineWidth = 2; g.beginPath(); g.ellipse(W / 2, y + h, 420, h, 0, Math.PI, 0); g.stroke();
    }
    st.bg = c;
    st.groups = {};
    for (const name of Object.keys(LAYOUT)) if (LAYOUT[name]) st.groups[name] = { dark: makeGroup(name, false), lit: makeGroup(name, true) };
    const oc = document.createElement('canvas'); oc.width = W; oc.height = 300; organArt(oc.getContext('2d'), true); st.organLit = oc;
    // 額縁（プロセニアム）と幕の飾り（手前・いつも同じ）
    const f = document.createElement('canvas'); f.width = W; f.height = H;
    const q = f.getContext('2d');
    const drape = (x0, w, flip) => {
      const gr = q.createLinearGradient(x0, 0, x0 + w, 0);
      for (let i = 0; i <= 6; i++) gr.addColorStop(i / 6, i % 2 ? '#5a0a14' : '#8a1422');
      q.fillStyle = gr;
      q.beginPath(); q.moveTo(x0, 0); q.lineTo(x0 + w, 0);
      q.quadraticCurveTo(x0 + w * (flip ? 0.2 : 0.8), H * 0.5, x0 + (flip ? 0 : w) * 0.6 + (flip ? w * 0.4 : 0), H); q.lineTo(flip ? x0 + w : x0, H); q.closePath(); q.fill();
    };
    drape(0, 46, false); drape(W - 46, 46, true);
    const val = q.createLinearGradient(0, 0, 0, 44); val.addColorStop(0, '#5a0a14'); val.addColorStop(1, '#8a1422');
    q.fillStyle = val; q.beginPath(); q.moveTo(0, 0); q.lineTo(W, 0); q.lineTo(W, 28);
    for (let i = 10; i >= 0; i--) q.quadraticCurveTo(i * W / 10 + W / 20, 52, i * W / 10, 28);
    q.closePath(); q.fill();
    q.strokeStyle = '#d4a63a'; q.lineWidth = 3; q.beginPath(); q.moveTo(0, 26);
    for (let i = 0; i <= 10; i++) q.quadraticCurveTo(i * W / 10 - W / 20, 50, i * W / 10, 26);
    q.stroke();
    for (let i = 0; i <= 10; i++) { q.fillStyle = '#d4a63a'; q.beginPath(); q.arc(i * W / 10, 30, 4, 0, TAU); q.fill(); }
    st.frame = f;
    // 幕（開く・閉じる）1枚ぶん
    const cu = document.createElement('canvas'); cu.width = W / 2 + 40; cu.height = H;
    const r = cu.getContext('2d');
    const cg = r.createLinearGradient(0, 0, cu.width, 0);
    for (let i = 0; i <= 12; i++) cg.addColorStop(i / 12, i % 2 ? '#4a0812' : '#8e1626');
    r.fillStyle = cg; r.fillRect(0, 0, cu.width, H);
    const sh = r.createLinearGradient(0, 0, 0, H); sh.addColorStop(0, 'rgba(0,0,0,0.35)'); sh.addColorStop(0.4, 'rgba(0,0,0,0)'); sh.addColorStop(1, 'rgba(0,0,0,0.3)');
    r.fillStyle = sh; r.fillRect(0, 0, cu.width, H);
    r.fillStyle = '#d4a63a'; r.fillRect(0, H - 30, cu.width, 6);
    st.curtain = cu;
  }

  // ---- だれがいつ弾いているか（1秒に20コマの表を、最初に1回だけ作る）------------------------------
  function buildActivity() {
    const S = SCORE_OVERTURE, FPS = 20, n = Math.ceil((S.end + 2) * FPS), Bt = OV_BEAT;
    const A = {}; for (const k of ['vn', 'low', 'winds', 'horns', 'brass', 'timp', 'cym', 'harp', 'cel', 'choir', 'organ']) A[k] = new Float32Array(n);
    const t = b => ovBeatTime(b);
    const span = (g, t0, t1, v = 1) => { for (let i = Math.max(0, Math.floor(t0 * FPS)); i < Math.min(n, t1 * FPS); i++) A[g][i] = Math.max(A[g][i], v); };
    const hit = (g, t0, dec = 0.35, v = 1) => { for (let i = Math.max(0, Math.floor(t0 * FPS)); i < Math.min(n, (t0 + dec * 3) * FPS); i++) A[g][i] = Math.max(A[g][i], v * Math.exp(-(i / FPS - t0) / dec)); };
    const note = (g, b, L, v = 1) => span(g, t(b) - 0.03, t(b + L) + 0.15, v);
    S.melody.forEach(([b, L]) => note('vn', b, L)); S.spic.forEach(([b]) => note('vn', b, 0.4, 0.9)); S.runs.forEach(([b, L]) => note('vn', b, L));
    S.pizz.forEach(([b]) => hit('low', t(b), 0.3, 0.9));
    S.flute.concat(S.oboe).forEach(([b, L]) => note('winds', b, L));
    S.horn.forEach(([b, L]) => note('horns', b, L));
    S.brassMel.forEach(([b, L]) => note('brass', b, L)); S.stab.forEach(b => { hit('brass', t(b), 0.3); hit('horns', t(b), 0.3, 0.7); });
    S.timp.forEach(([b]) => hit('timp', t(b), 0.3)); S.roll.forEach(([b0, b1]) => span('timp', t(b0), t(b1), 0.75));
    S.cymbal.forEach(b => hit('cym', t(b), 0.8)); S.bassdrum.forEach(b => hit('cym', t(b), 0.25, 0.7));
    S.swell.forEach(([b0, b1]) => { for (let i = Math.floor(t(b0) * FPS); i < t(b1) * FPS; i++) A.cym[i] = Math.max(A.cym[i], 0.8 * ((i / FPS - t(b0)) / (t(b1) - t(b0)))); });
    S.harp.forEach(([b]) => hit('harp', t(b), 0.45, 0.9)); S.gliss.forEach(([b, L]) => note('harp', b, L));
    S.celesta.forEach(([b]) => hit('cel', t(b), 0.4));
    S.choir.forEach(([b, L]) => note('choir', b, L, 0.9)); S.organ.forEach(([b, L]) => note('organ', b, L));
    // 和音をのばしているだけのパート（ずっと少し光る）
    const base = { vn: [0, 0, 0, 0.45, 0.15, 0.3, 0.5, 0.7], low: [0.55, 0.35, 0.6, 0.55, 0.35, 0.6, 0.6, 0.7], winds: [0, 0.45, 0, 0.35, 0, 0, 0.35, 0.3],
      horns: [0, 0.3, 0, 0.4, 0, 0.45, 0.6, 0.7], brass: [0, 0, 0.2, 0.3, 0, 0.2, 0.45, 0.6] };
    OV_SECTIONS.forEach((sec, i) => { const t1 = i + 1 < OV_SECTIONS.length ? OV_SECTIONS[i + 1].t : S.end; for (const g in base) span(g, sec.t, t1, base[g][i]); });
    for (const b of S.gp) for (const g in A) for (let i = Math.floor(t(b) * FPS); i < t(b + 1) * FPS; i++) A[g][i] = 0;   // G.P. は全員が休む
    st.act = A; st.FPS = FPS;
  }
  const act = (g, T) => { if (!st.act) return 0; const a = st.act[g], f = T * st.FPS, i = Math.floor(f); if (i < 0 || i >= a.length - 1) return 0; return a[i] + (a[i + 1] - a[i]) * (f - i); };

  function reset() {
    Object.assign(st, { confetti: [], petals: [], lastBeat: -99, finale: 0, gp: 0, open: 0 });
  }

  function onBeat(b) {
    if (b === 192) {                                          // フィナーレ: 光があふれ、金の紙吹雪
      st.finale = 1; window.flash(0.7); shake(10); punch(0.05);
      shockRing(W / 2, 360, { color: '#fff1c0', size: 900, life: 1.1, width: 8 });
      for (let i = 0; i < 160; i++) st.confetti.push(confetto(true));
    }
  }
  function confetto(burst) {
    return { x: burst ? W / 2 + (Math.random() - 0.5) * 200 : Math.random() * W, y: burst ? 300 : -10, vx: burst ? (Math.random() - 0.5) * 700 : (Math.random() - 0.5) * 30,
      vy: burst ? -200 - Math.random() * 400 : 40 + Math.random() * 50, rot: Math.random() * TAU, vr: (Math.random() - 0.5) * 10, s: 3 + Math.random() * 4,
      c: ['#ffd36b', '#fff1c0', '#ffb84d', '#ffe9a8'][Math.floor(Math.random() * 4)] };
  }

  function update(dt, T, look) {
    if (!st.made) make();
    if (!st.act && typeof SCORE_OVERTURE !== 'undefined') buildActivity();
    const bp = inSong() ? beatPos(T) : titleBeat();
    if (scene === 'play') {
      const b = Math.floor(bp + 0.02);
      if (b !== st.lastBeat) { if (b === st.lastBeat + 1) onBeat(b); st.lastBeat = b; }
    }
    st.finale = Math.max(0, st.finale - dt * 0.5);
    // 幕: はじまりに開き、クリアで閉じる
    const target = scene === 'clear' ? 0 : scene === 'title' ? 1 : clamp01((bp + 1) / 6);
    st.open += (target - st.open) * Math.min(1, dt * (scene === 'clear' ? 1.6 : 6));
    st.gp = inSong() && SCORE_OVERTURE.gp.some(g => bp >= g - 0.15 && bp < g + 1.1) ? Math.min(1, st.gp + dt * 6) : Math.max(0, st.gp - dt * 4);
    // 紙吹雪（フィナーレのあいだ降りつづける）・バラ（クリア）
    if (inSong() && bp >= 192 && bp < 258 && st.confetti.length < [60, 120, 200][gfx] && Math.random() < dt * 30) st.confetti.push(confetto(false));
    for (const p of st.confetti) { p.vy += (p.vy < 60 ? 500 : 0) * dt; p.vx *= Math.pow(0.4, dt); p.x += p.vx * dt + Math.sin(p.rot) * 20 * dt; p.y += p.vy * dt; p.rot += p.vr * dt; }
    st.confetti = st.confetti.filter(p => p.y < GROUND_Y + 10);
    if (scene === 'clear' && st.petals.length < 40 && Math.random() < dt * 20) st.petals.push({ x: Math.random() * W, y: -10, vy: 90 + Math.random() * 90, vx: (Math.random() - 0.5) * 60, rot: Math.random() * TAU, vr: (Math.random() - 0.5) * 6 });
    for (const p of st.petals) { p.x += p.vx * dt; p.y += p.vy * dt; p.rot += p.vr * dt; }
    st.petals = st.petals.filter(p => p.y < H + 20);
    const lv = inSong() ? (songEnv(1, T) + songEnv(3, T) + songEnv(5, T)) / 3 : 0.4;
    st.dyn += (lv - st.dyn) * Math.min(1, dt * 3);
  }

  // ---- 背景 --------------------------------------------------------------------------------------
  function background(T, look, k, bk, bp) {
    if (!st.made) make();
    if (!st.act && typeof SCORE_OVERTURE !== 'undefined') buildActivity();
    const night = inSong() ? clamp01((T - ovBar(32) + 0.3) / 0.8) * clamp01((ovBar(40) - T + 0.3) / 0.8) : 0;    // 夜想曲のあいだ
    const hall = cachedLayer('hallBg', 3, 0, g => {
      g.drawImage(st.bg, 0, 0, W, H);
      const og = act('organ', T);                                       // オルガンのパイプが光る
      if (og > 0.02) { g.globalAlpha = og * 0.55; g.drawImage(st.organLit, 0, 0); g.globalAlpha = 1; }
      // 部屋の明かり（場面の色 ＋ フィナーレであふれる光）
      g.globalCompositeOperation = 'lighter';
      const lg = g.createRadialGradient(W / 2, 360, 40, W / 2, 360, 560);
      lg.addColorStop(0, rgba(look.color, 0.10 + 0.12 * st.finale)); lg.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = lg; g.fillRect(0, 0, W, H);
      g.globalCompositeOperation = 'source-over';
      if (night > 0.01) {                                              // 夜想曲: 青い月明かり ＋ 天井の星
        g.fillStyle = `rgba(10,20,60,${(0.55 * night).toFixed(3)})`; g.fillRect(0, 0, W, H);
        g.fillStyle = `rgba(220,235,255,${(0.8 * night).toFixed(3)})`;
        for (let i = 0; i < 60; i++) { const x = hs(i, 1) * W, y = 40 + hs(i, 2) * 220, tw = 0.5 + 0.5 * Math.sin(T * 2 + i); g.fillRect(x, y, 1.5 + tw, 1.5 + tw); }
      }
    });
    ctx.drawImage(hall, 0, 0, W, H);

    // オーケストラ: 暗い絵 ＋ いま弾いているパートだけ光った絵を重ねる。スポットライトも
    const lights = [];
    for (const name in st.groups) {
      const G = st.groups[name], a = inSong() ? act(name, T) * (1 - st.gp) : 0.35 + 0.3 * Math.sin(T * 1.3 + name.length);
      ctx.drawImage(G.dark.c, G.dark.x, G.dark.y);
      if (a > 0.02) { ctx.globalAlpha = Math.min(1, a); ctx.drawImage(G.lit.c, G.lit.x, G.lit.y); ctx.globalAlpha = 1; }
      lights.push([a, name]);
    }
    // スポットライト: いちばん強い3つのパートへ、天井から光の円すい
    if (gfx > 0) {
      lights.sort((p, q) => q[0] - p[0]);
      ctx.globalCompositeOperation = 'lighter';
      for (const [a, name] of lights.slice(0, 3)) {
        if (a < 0.15) continue;
        const [bx, by, bw, bh] = LAYOUT[name].box, cx = bx + bw / 2, cy = by + bh * 0.6;
        const src = cx < W / 2 ? 140 : W - 140;
        const gr = ctx.createLinearGradient(src, 30, cx, cy);
        gr.addColorStop(0, rgba(WARM, 0.0)); gr.addColorStop(1, rgba(WARM, 0.13 * a));
        ctx.fillStyle = gr;
        ctx.beginPath(); ctx.moveTo(src - 6, 30); ctx.lineTo(src + 6, 30); ctx.lineTo(cx + bw * 0.55, cy); ctx.lineTo(cx - bw * 0.55, cy); ctx.closePath(); ctx.fill();
        ctx.fillStyle = rgba(WARM, 0.1 * a);
        ctx.beginPath(); ctx.ellipse(cx, cy + bh * 0.3, bw * 0.6, bh * 0.35, 0, 0, TAU); ctx.fill();
      }
      ctx.globalCompositeOperation = 'source-over';
    }

    // 指揮者（背中）と指揮棒: 1小節ずつ4拍子をふる。G.P. では棒を高く上げて止まる
    conductor(T, bp);
    // シャンデリア
    chandelier(210, T, 0); chandelier(590, T, 1.7);
    // 奥を少し暗く（弾が見やすいように）
    ctx.fillStyle = 'rgba(12,4,6,0.3)'; ctx.fillRect(0, 0, W, GROUND_Y);
    confettiDraw();                                                     // 紙吹雪は弾のうしろ（弾とまちがえないように）
    ctx.drawImage(st.frame, 0, 0, W, H);
  }

  function conductor(T, bp) {
    const x = W / 2, y = 640;
    ctx.fillStyle = '#1a1012'; ctx.fillRect(x - 26, y + 22, 52, 14);                   // 指揮台
    ctx.fillStyle = '#d4a63a'; ctx.fillRect(x - 26, y + 22, 52, 2);
    ctx.fillStyle = '#060406';                                                       // 燕尾服の背中
    ctx.beginPath(); ctx.moveTo(x - 14, y + 22); ctx.lineTo(x - 12, y - 8); ctx.quadraticCurveTo(x, y - 14, x + 12, y - 8); ctx.lineTo(x + 14, y + 22); ctx.lineTo(x + 4, y + 10); ctx.lineTo(x - 4, y + 10); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#d8d0c8'; ctx.beginPath(); ctx.arc(x, y - 19, 8, 0, TAU); ctx.fill();          // 白髪
    // 指揮棒（右手）: 4拍子の形
    const p = st.gp > 0.5 ? { ang: Math.PI * 0.82, len: 1 } : batonPose(inSong() ? bp : titleBeat());
    const hx = x + 14, hy = y - 4;
    const a = st.gp > 0.5 ? -2.2 : -Math.PI / 2 + p.ang * 0.9 - (1 - p.len) * 1.2;
    const L = 46;
    ctx.strokeStyle = '#060406'; ctx.lineWidth = 5; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x + 10, y - 6); ctx.lineTo(hx + Math.cos(a) * 14, hy + Math.sin(a) * 14); ctx.stroke();
    ctx.strokeStyle = '#fff8e6'; ctx.lineWidth = 2;
    const tx = hx + Math.cos(a) * L, ty = hy + Math.sin(a) * L;
    ctx.beginPath(); ctx.moveTo(hx + Math.cos(a) * 14, hy + Math.sin(a) * 14); ctx.lineTo(tx, ty); ctx.stroke();
    if (gfx > 0) { ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = 'rgba(255,240,200,0.5)'; ctx.beginPath(); ctx.arc(tx, ty, 4, 0, TAU); ctx.fill(); ctx.globalCompositeOperation = 'source-over'; }
  }
  function chandelier(x, T, ph) {
    const sway = Math.sin(T * 0.8 + ph) * 0.03, y = 92;
    ctx.save(); ctx.translate(x, 0); ctx.rotate(sway);
    ctx.strokeStyle = '#8a6a2a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, y - 20); ctx.stroke();
    ctx.fillStyle = '#b08a3a'; ctx.beginPath(); ctx.ellipse(0, y, 46, 10, 0, 0, TAU); ctx.fill();
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 9; i++) {
      const cx = -40 + i * 10, cy = y + 6 + (i % 2) * 8, tw = 0.5 + 0.5 * Math.sin(T * 5 + i * 1.7 + ph * 3);
      ctx.fillStyle = `rgba(255,236,190,${(0.35 + 0.45 * tw).toFixed(3)})`;
      ctx.beginPath(); ctx.moveTo(cx, cy - 4); ctx.lineTo(cx + 2.5, cy + 3); ctx.lineTo(cx, cy + 9); ctx.lineTo(cx - 2.5, cy + 3); ctx.closePath(); ctx.fill();
    }
    if (gfx > 0) {
      const gr = ctx.createRadialGradient(0, y, 4, 0, y, 80); gr.addColorStop(0, 'rgba(255,220,150,0.35)'); gr.addColorStop(1, 'rgba(255,220,150,0)');
      ctx.fillStyle = gr; ctx.fillRect(-80, y - 80, 160, 160);
    }
    ctx.globalCompositeOperation = 'source-over';
    ctx.restore();
  }

  // ---- 床と足場 ------------------------------------------------------------------------------------
  function floor(look, k) {
    const y = GROUND_Y;
    const g = ctx.createLinearGradient(0, y, 0, H);
    g.addColorStop(0, '#5a3218'); g.addColorStop(1, '#1e0e06');
    ctx.fillStyle = g; ctx.fillRect(-400, y, W + 800, H - y + 400);
    ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = 1;                              // 板の継ぎ目
    for (let i = -10; i <= 10; i++) { ctx.beginPath(); ctx.moveTo(W / 2 + i * 50, y); ctx.lineTo(W / 2 + i * 120, H + 40); ctx.stroke(); }
    ctx.fillStyle = 'rgba(255,220,160,0.08)'; ctx.fillRect(-400, y, W + 800, 8);         // つや
    ctx.fillStyle = '#d4a63a'; ctx.fillRect(-400, y, W + 800, 2);
    // フットライト（拍で少し明るく）
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 14; i++) {
      const x = 30 + i * 57, a = 0.35 + 0.25 * k;
      ctx.fillStyle = `rgba(255,230,170,${a.toFixed(3)})`; ctx.beginPath(); ctx.ellipse(x, y + 16, 9, 4, 0, 0, TAU); ctx.fill();
      if (gfx > 0) { ctx.fillStyle = `rgba(255,220,150,${(a * 0.18).toFixed(3)})`; ctx.beginPath(); ctx.ellipse(x, y + 8, 30, 12, 0, 0, TAU); ctx.fill(); }
    }
    ctx.globalCompositeOperation = 'source-over';
  }
  function platform(p, look, k) {
    const g = ctx.createLinearGradient(0, p.y, 0, p.y + p.h);
    g.addColorStop(0, '#6a3a1c'); g.addColorStop(1, '#2a1408');
    ctx.fillStyle = g; ctx.fillRect(p.x, p.y, p.w, p.h);
    ctx.fillStyle = '#d4a63a'; ctx.fillRect(p.x, p.y, p.w, 2); ctx.fillRect(p.x, p.y + p.h - 2, p.w, 2);
    ctx.fillStyle = 'rgba(255,220,150,0.5)'; for (let x = p.x + 10; x < p.x + p.w; x += 24) ctx.fillRect(x, p.y + p.h / 2 - 1, 8, 2);
  }

  // ---- 弾 ------------------------------------------------------------------------------------------
  function noteShape(b, c, flag) {
    const r = b.r, dir = b.vx >= 0 ? 1 : -1;
    ctx.save(); ctx.translate(b.x, b.y);
    ctx.fillStyle = rgba(mixC(c, WHITE, 0.15), 1);
    ctx.beginPath(); ctx.ellipse(0, 0, r * 1.25, r * 0.92, -0.38, 0, TAU); ctx.fill();
    ctx.strokeStyle = rgba(mixC(c, WHITE, 0.6), 0.95); ctx.lineWidth = 1.5; ctx.stroke();
    ctx.strokeStyle = rgba(c, 0.85); ctx.lineWidth = 2;                                 // 棒（飾り。当たりは玉だけ）
    ctx.beginPath(); ctx.moveTo(r * 1.1, -r * 0.2); ctx.lineTo(r * 1.1, -r * 3.2); ctx.stroke();
    if (flag) { ctx.beginPath(); ctx.moveTo(r * 1.1, -r * 3.2); ctx.quadraticCurveTo(r * 2.4, -r * 2.2, r * 1.8, -r * 1.2); ctx.stroke(); }
    ctx.restore();
  }
  function bullet(b, c, k) {
    // どの弾も、まわりに暗いふち（金色の背景の上でも見えるように）
    ctx.fillStyle = 'rgba(24,8,6,0.75)'; ctx.beginPath(); ctx.arc(b.x, b.y, b.r + 3, 0, TAU); ctx.fill();
    if (b.style === 'qnote' || b.style === 'enote') return noteShape(b, c, b.style === 'enote');
    if (b.style === 'bow') {                                                            // 弓の先（ひし形）
      ctx.fillStyle = rgba(c, 1);
      ctx.beginPath(); ctx.moveTo(b.x, b.y - b.r * 1.6); ctx.lineTo(b.x + b.r, b.y); ctx.lineTo(b.x, b.y + b.r * 1.6); ctx.lineTo(b.x - b.r, b.y); ctx.closePath(); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.85)'; ctx.beginPath(); ctx.arc(b.x, b.y, b.r * 0.35, 0, TAU); ctx.fill();
      return;
    }
    if (b.style === 'star') {
      const r = b.r * 1.6, a = songTime * 3 + b.x;
      ctx.fillStyle = rgba(c, 1); ctx.beginPath();
      for (let i = 0; i < 8; i++) { const rr = i % 2 ? r * 0.35 : r, aa = a + i * Math.PI / 4; ctx.lineTo(b.x + Math.cos(aa) * rr, b.y + Math.sin(aa) * rr); }
      ctx.closePath(); ctx.fill();
      return;
    }
    if (b.style === 'halo') {
      ctx.strokeStyle = rgba(c, 1); ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, TAU); ctx.stroke();
      ctx.fillStyle = rgba(c, 0.3); ctx.fill();
      return;
    }
    // 金の玉・銅の玉・ピチカート・ほか: 金属の玉（つや）
    const rim = b.style === 'timp' ? [255, 190, 120] : b.style === 'pizz' ? [255, 250, 235] : mixC(c, WHITE, 0.4);
    ctx.fillStyle = rgba(c, 1); ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, TAU); ctx.fill();
    ctx.strokeStyle = rgba(rim, 0.95); ctx.lineWidth = 1.5; ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.85)'; ctx.beginPath(); ctx.arc(b.x - b.r * 0.3, b.y - b.r * 0.3, b.r * 0.35, 0, TAU); ctx.fill();
  }

  // シンバル（回る金の円盤）
  function cymbalKind(b, T, k) {
    const c = bulletColor(b);
    if (b.delay > 0) {
      const p = b.delayMax > 0 ? 1 - b.delay / b.delayMax : 1, on = p > 0.7 || Math.floor(T * 14) % 2 === 0;
      const ex = b.side < 0 ? 26 : W - 26;
      ctx.fillStyle = rgba(c, on ? 0.9 : 0.3);
      ctx.beginPath(); ctx.moveTo(ex - b.side * 14, b.y); ctx.lineTo(ex, b.y - 10); ctx.lineTo(ex, b.y + 10); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = rgba(c, 0.15 + 0.3 * p); ctx.lineWidth = b.r * 1.6; ctx.setLineDash([10, 10]);
      ctx.beginPath(); ctx.moveTo(ex, b.y); ctx.lineTo(W / 2, b.y); ctx.stroke(); ctx.setLineDash([]);
      return;
    }
    const sq = 0.35 + 0.15 * Math.sin(b.spin);
    ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(0.3 * b.side);
    const gr = ctx.createRadialGradient(-b.r * 0.3, -b.r * 0.1, 2, 0, 0, b.r * 1.2);
    gr.addColorStop(0, '#fff6d0'); gr.addColorStop(0.5, rgba(c, 1)); gr.addColorStop(1, '#8a5a10');
    ctx.fillStyle = gr; ctx.beginPath(); ctx.ellipse(0, 0, b.r * sq * 1.1, b.r * 1.15, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(120,80,10,0.6)'; ctx.lineWidth = 1;
    for (const f of [0.35, 0.65, 0.9]) { ctx.beginPath(); ctx.ellipse(0, 0, b.r * sq * f, b.r * 1.1 * f, 0, 0, TAU); ctx.stroke(); }
    ctx.restore();
  }

  // 指揮棒（光の棒）: 予告 = 次の動きのうすい残像
  function batonKind(b, T, k) {
    const c = bulletColor(b);
    const seg = (ang, L, a, w) => { ctx.strokeStyle = rgba(c, a); ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(b.px, b.py); ctx.lineTo(b.px + Math.sin(ang) * L, b.py + Math.cos(ang) * L); ctx.stroke(); };
    ctx.lineCap = 'round';
    const bp = (songTime - b.t0) / song.beat;
    if (b.delay > 0) {
      const p = b.delayMax > 0 ? 1 - b.delay / b.delayMax : 1;
      for (let i = 0; i < 4; i++) { const q = batonPose(i); seg(q.ang, b.len * q.len, 0.08 + 0.12 * p, 3); }
      const q = batonPose(0); seg(q.ang, b.len * q.len, 0.3 + 0.6 * p * (Math.floor(T * 12) % 2 ? 1 : 0.4), b.r * 2);
      return;
    }
    for (let i = 1; i <= 4; i++) { const q = batonPose(bp + i * 0.25); if (bp + i * 0.25 < b.beats) seg(q.ang, b.len * q.len, 0.1, 2); }   // これから動く所
    for (let i = 5; i >= 1; i--) { const q = batonPose(bp - i * 0.04); seg(q.ang, b.len * q.len, 0.05 * (6 - i), b.r * 2); }           // 残像
    ctx.strokeStyle = 'rgba(40,30,20,0.9)'; ctx.lineWidth = b.r * 2.4; ctx.beginPath(); ctx.moveTo(b.px, b.py); ctx.lineTo(b.px + (b.tipX - b.px) * 0.18, b.py + (b.tipY - b.py) * 0.18); ctx.stroke();
    ctx.strokeStyle = rgba(c, 1); ctx.lineWidth = b.r * 2;
    ctx.beginPath(); ctx.moveTo(b.px + (b.tipX - b.px) * 0.18, b.py + (b.tipY - b.py) * 0.18); ctx.lineTo(b.tipX, b.tipY); ctx.stroke();
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = 'rgba(255,240,200,0.8)'; ctx.beginPath(); ctx.arc(b.tipX, b.tipY, 10 + 4 * k, 0, TAU); ctx.fill();
    ctx.globalCompositeOperation = 'source-over';
  }

  // 金管・ハープ・オルガンのビーム
  function laser(b, c, T, k) {
    if (!b.brass && !b.harp && !b.organ) return false;
    const p = b.delay > 0 ? (b.delayMax > 0 ? 1 - b.delay / b.delayMax : 1) : 1;
    const on = p > 0.7 || Math.floor(T * 14) % 2 === 0;
    const fade = b.delay > 0 ? 1 : b.safe ? clamp01(1 - (b.age - b.hold) / 0.3) : 1;
    ctx.lineCap = 'butt';
    if (b.harp) {
      if (b.delay > 0) {
        ctx.strokeStyle = rgba(c, on ? 0.2 + 0.4 * p : 0.08); ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(b.x1, 40); ctx.lineTo(b.x2, b.y2); ctx.stroke();
        return true;
      }
      const amp = 6 * Math.exp(-b.age * 8);                                         // はじいた弦がふるえる
      ctx.globalCompositeOperation = 'lighter';
      for (const [w, a] of [[b.r * 2.2, 0.25], [b.r * 0.8, 1]]) {
        ctx.strokeStyle = rgba(mixC(c, WHITE, 0.3), a * fade); ctx.lineWidth = w;
        ctx.beginPath(); for (let y = 30; y <= b.y2; y += 20) ctx.lineTo(b.x1 + Math.sin(y * 0.05 + T * 60) * amp * Math.sin(Math.PI * (y - 30) / (b.y2 - 30)), y); ctx.stroke();
      }
      ctx.globalCompositeOperation = 'source-over';
      return true;
    }
    if (b.organ) {
      const w = b.r * 2;
      if (b.delay > 0) {
        ctx.fillStyle = rgba(c, 0.04 + 0.1 * p); ctx.fillRect(b.x1 - w / 2, 0, w, GROUND_Y);
        ctx.strokeStyle = rgba(c, on ? 0.35 + 0.5 * p : 0.12); ctx.lineWidth = 1.5; ctx.setLineDash([6, 6]);
        ctx.strokeRect(b.x1 - w / 2, 0, w, GROUND_Y); ctx.setLineDash([]);
        return true;
      }
      ctx.globalCompositeOperation = 'lighter';
      const gr = ctx.createLinearGradient(b.x1 - w / 2, 0, b.x1 + w / 2, 0);
      gr.addColorStop(0, rgba(c, 0.15 * fade)); gr.addColorStop(0.5, rgba(mixC(c, WHITE, 0.5), 0.85 * fade)); gr.addColorStop(1, rgba(c, 0.15 * fade));
      ctx.fillStyle = gr; ctx.fillRect(b.x1 - w / 2, 0, w, GROUND_Y);
      ctx.globalCompositeOperation = 'source-over';
      return true;
    }
    // 金管: 金色のビーム ＋ ベルの形
    if (b.delay > 0) {
      ctx.strokeStyle = rgba(c, on ? 0.25 + 0.5 * p : 0.1); ctx.lineWidth = 1.5; ctx.setLineDash([10, 8]); ctx.lineDashOffset = -T * 120;
      ctx.beginPath(); ctx.moveTo(b.x1, b.y1); ctx.lineTo(b.x2, b.y2); ctx.stroke(); ctx.setLineDash([]);
    } else {
      ctx.globalCompositeOperation = 'lighter';
      for (const [w, a] of [[b.r * 3, 0.2], [b.r * 2, 0.5], [b.r * 0.8, 1]]) {
        ctx.strokeStyle = rgba(a === 1 ? mixC(c, WHITE, 0.6) : c, a * fade); ctx.lineWidth = w;
        ctx.beginPath(); ctx.moveTo(b.x1, b.y1); ctx.lineTo(b.x2, b.y2); ctx.stroke();
      }
      ctx.globalCompositeOperation = 'source-over';
    }
    const ang = Math.atan2(b.y2 - b.y1, b.x2 - b.x1);                                // ベル
    ctx.save(); ctx.translate(b.x1, b.y1); ctx.rotate(ang);
    ctx.fillStyle = rgba([255, 207, 90], 0.5 + 0.5 * p);
    ctx.beginPath(); ctx.moveTo(-26, -3); ctx.lineTo(-4, -4); ctx.quadraticCurveTo(4, -6, 8, -16); ctx.lineTo(8, 16); ctx.quadraticCurveTo(4, 6, -4, 4); ctx.lineTo(-26, 3); ctx.closePath(); ctx.fill();
    ctx.restore();
    return true;
  }

  function fire(b) {
    if (b.brass && b.x1 != null) { sparks(b.x1, b.y1, { n: 8, color: '#ffe08a', speed: 200, life: 0.4, size: 2.5, gravity: 100 }); return false; }
    return false;
  }

  // 紙吹雪
  function confettiDraw() {
    if (st.confetti.length) {
      for (const p of st.confetti) {
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot);
        ctx.fillStyle = p.c; ctx.globalAlpha = 0.6; ctx.fillRect(-p.s / 2, -p.s * Math.abs(Math.cos(p.rot * 2)) / 2, p.s, p.s * Math.abs(Math.cos(p.rot * 2)) + 1);
        ctx.restore();
      }
      ctx.globalAlpha = 1;
    }
  }
  function flash() {
    ctx.fillStyle = `rgba(255,240,205,${(0.4 * flashT).toFixed(3)})`;
    ctx.fillRect(0, 0, W, H);
  }

  // 場面の名前（演奏会のプログラム風）＋ 右下の強弱記号 ＋ G.P. ＋ 幕
  function banner() {
    if (st.gp > 0.01 && scene === 'play') {
      const g = ctx.createRadialGradient(W / 2, 600, 40, W / 2, 600, 420);
      g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, `rgba(0,0,0,${(0.7 * st.gp).toFixed(3)})`);
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      ctx.save(); ctx.globalAlpha = st.gp; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.font = `italic 700 64px ${SERIF}`; ctx.fillStyle = '#fff1c9'; ctx.fillText('G.P.', W / 2, 250);
      ctx.font = `400 15px ${SERIF}`; ctx.fillText('─ Generalpause ─', W / 2, 296);
      ctx.restore();
    }
    if (scene === 'play') {                                                    // 強弱記号
      const d = st.dyn, marks = ['pp', 'p', 'mp', 'mf', 'f', 'ff', 'fff'];
      const m = marks[Math.max(0, Math.min(6, Math.floor(d * 7.5)))];
      ctx.save(); ctx.textAlign = 'right'; ctx.textBaseline = 'alphabetic';
      ctx.font = `italic 700 34px ${SERIF}`; ctx.fillStyle = 'rgba(255,228,170,0.85)';
      ctx.fillText(m, W - 58, H - 16);
      ctx.restore();
    }
    if (st.open < 0.995 || scene === 'clear') {                                // 幕
      const o = st.open, cw = st.curtain.width, sway = Math.sin(performance.now() / 600) * 3;
      ctx.drawImage(st.curtain, -o * cw + sway, 0);
      ctx.save(); ctx.translate(W, 0); ctx.scale(-1, 1); ctx.drawImage(st.curtain, -o * cw - sway, 0); ctx.restore();
      if (scene === 'clear') for (const p of st.petals) {                        // バラの花びら
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.fillStyle = '#e0303e';
        ctx.beginPath(); ctx.ellipse(0, 0, 7, 4, 0, 0, TAU); ctx.fill(); ctx.fillStyle = '#ff6a78'; ctx.beginPath(); ctx.ellipse(-2, -1, 3, 2, 0, 0, TAU); ctx.fill();
        ctx.restore();
      }
    }
    const bn = fx.banner;
    if (!bn) return;
    const e = bn.age, DUR = 3.0;
    if (e > DUR) { fx.banner = null; return; }
    const a = e < 0.5 ? e / 0.5 : e > DUR - 0.7 ? (DUR - e) / 0.7 : 1;
    const sec = SECTIONS[fx.secIdx] || {};
    ctx.save();
    ctx.globalAlpha = clamp01(a);
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const y = 132;
    if (sec.no) { ctx.font = `400 22px ${SERIF}`; ctx.fillStyle = 'rgba(255,228,170,0.9)'; ctx.fillText(sec.no, W / 2, y - 34); }
    ctx.font = `italic 400 44px ${SERIF}`;
    if ('letterSpacing' in ctx) ctx.letterSpacing = `${6 + e * 2}px`;
    ctx.fillStyle = '#fff1c9';
    if (gfx === 2) { ctx.shadowColor = 'rgba(255,200,100,0.8)'; ctx.shadowBlur = 18; }
    ctx.fillText(bn.name, W / 2, y);
    ctx.shadowBlur = 0;
    if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';
    const w = 150 * easeOut(e / 0.8);                                          // 飾りの線とひし形
    ctx.strokeStyle = 'rgba(212,166,58,0.9)'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(W / 2 - 20 - w, y + 30); ctx.lineTo(W / 2 - 20, y + 30); ctx.moveTo(W / 2 + 20, y + 30); ctx.lineTo(W / 2 + 20 + w, y + 30); ctx.stroke();
    ctx.fillStyle = '#d4a63a'; ctx.beginPath(); ctx.moveTo(W / 2, y + 24); ctx.lineTo(W / 2 + 6, y + 30); ctx.lineTo(W / 2, y + 36); ctx.lineTo(W / 2 - 6, y + 30); ctx.closePath(); ctx.fill();
    if (bn.sub) { ctx.font = `italic 400 15px ${SERIF}`; ctx.fillStyle = 'rgba(255,236,200,0.85)'; ctx.fillText(bn.sub, W / 2, y + 54); }
    ctx.restore();
  }

  function title(look, k, bp) { /* タイトル画面: ホールと指揮者がそのまま見える（背景で描いている） */ }

  THEMES.hall = {
    noTrails: true, glow: 1.6, noScanlines: true,
    clearColors: ['#ffd36b', '#fff1c0', '#ff7a8a', '#9fc8ff', '#ffffff'],
    kinds: { cymbal: cymbalKind, baton: batonKind },
    reset, update, background, floor, platform, bullet, laser, fire, flash, banner, title,
  };
})();
