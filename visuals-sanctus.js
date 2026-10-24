"use strict";

/* =========================================================================
   見た目のセット「sanctus」  —  曲㉒「SANCTUS」用
   夜の大聖堂。奥にとがったアーチと柱、両わきに細長いステンドグラスの窓、まん中の上に大きなバラ窓。
   画面のいちばん上にはパイプオルガン（左が低い音・右が高い音）。弾を出すパイプは、予告のあいだ光り、出た瞬間に強く光る。
   主題・応答が入ると、そのパイプの下に「SUBJECT / ANSWER」と、何番目の声部かが出る（フーガの形が見える）。
   鐘が鳴るとバラ窓が明るく脈打ち、光の輪が広がる。バラ窓からの光の筋には、ほこりが舞う。床は大理石、両はしに燭台。
   KYRIE ではバラ窓がゆっくり回る。DIES IRAE では窓が赤くなり、火の粉が降り、ティンパニで赤く光る。
   全休止では画面が灰色になって止まり、フェルマータ（𝄐）が出る。AMEN では上から白い光があふれ、羽根が舞う。
   弾: パイプの光（細長いひし形）／ 文字の光（ラテン文字入りの丸）／ 光の輪のつぶ（後光）。剣と柱のビームに飾り。
   動かない絵（奥の建物・バラ窓・オルガン）は前もって描いておく。
   ========================================================================= */

(function () {
  const WHITE = [255, 255, 255], GOLD = [255, 210, 90], CRIM = [255, 74, 90];
  const SERIF = '"Times New Roman", "Hiragino Mincho ProN", "Yu Mincho", serif';
  const GLASS = ['#2a5cff', '#ff2a4a', '#ffc21a', '#1ab86a', '#9a3aff', '#22c8ff'];
  const st = { made: false, bg: null, rose: null, organ: null, motes: null, lastBeat: -99, bellT: -9, timpT: -9, rings: [], labels: [], embers: [], feathers: [], sparks: [] };
  let SC = null, BELLS = null, TIMP = null, ENTRY = null, GP = null;
  const inSong = () => scene !== 'title';
  const hsh = (a, b = 0) => { const v = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return v - Math.floor(v); };
  const nowT = () => inSong() ? songTime : titleClock();
  const bpAt = T => inSong() ? snBeatPos(T) : T / SN_BEAT;
  const sec = br => br < 4 ? 'bells' : br < 12 ? 'introitus' : br < 28 ? 'fuga' : br < 32 ? 'kyrie' : br < 48 ? 'dies' : br < 56 ? 'stretto' : 'amen';
  const R0 = 118;                                                        // バラ窓の半径

  function data() {
    if (SC) return;
    SC = SCORE_SANCTUS;
    BELLS = new Set(SC.bell.map(e => e[0])); TIMP = new Map(SC.timp.map(e => [e[0], e[1]]));
    ENTRY = new Map(); for (const e of SC.entry) { const a = ENTRY.get(e[0]) || []; a.push(e); ENTRY.set(e[0], a); }
    GP = SC.gp;
  }

  // ---- 前もって描く絵 ---------------------------------------------------------------------------
  function makeRose() {
    const S = R0 * 2 + 20, c = document.createElement('canvas'); c.width = c.height = S;
    const g = c.getContext('2d'), cx = S / 2, cy = S / 2;
    g.fillStyle = '#1a1626'; g.beginPath(); g.arc(cx, cy, R0 + 8, 0, TAU); g.fill();               // 石のわく
    // 外まわり: 24 枚の色ガラス（2重）
    for (let ring = 0; ring < 2; ring++) {
      const r1 = ring ? R0 * 0.62 : R0 * 0.84, r2 = ring ? R0 * 0.84 : R0, n = 24;
      for (let i = 0; i < n; i++) {
        const a0 = i / n * TAU, a1 = (i + 1) / n * TAU;
        g.fillStyle = GLASS[(i + ring * 3) % GLASS.length]; g.globalAlpha = 0.85;
        g.beginPath(); g.arc(cx, cy, r2 - 2, a0 + 0.02, a1 - 0.02); g.arc(cx, cy, r1 + 2, a1 - 0.02, a0 + 0.02, true); g.closePath(); g.fill();
      }
    }
    g.globalAlpha = 1;
    // 12 枚の花びら（とがったアーチの形）
    for (let i = 0; i < 12; i++) {
      const a = i / 12 * TAU;
      g.save(); g.translate(cx, cy); g.rotate(a);
      g.fillStyle = GLASS[(i * 2) % GLASS.length];
      g.beginPath(); g.moveTo(-R0 * 0.1, -R0 * 0.22); g.quadraticCurveTo(-R0 * 0.14, -R0 * 0.5, 0, -R0 * 0.62); g.quadraticCurveTo(R0 * 0.14, -R0 * 0.5, R0 * 0.1, -R0 * 0.22); g.closePath(); g.fill();
      g.strokeStyle = '#120e1a'; g.lineWidth = 3; g.stroke();
      g.fillStyle = 'rgba(255,255,255,0.25)'; g.beginPath(); g.arc(0, -R0 * 0.42, R0 * 0.04, 0, TAU); g.fill();
      g.restore();
    }
    // まん中の円（金色の光）と、石の線（トレーサリー）
    const gr = g.createRadialGradient(cx, cy, 0, cx, cy, R0 * 0.22); gr.addColorStop(0, '#fff6d0'); gr.addColorStop(1, '#ffb020');
    g.fillStyle = gr; g.beginPath(); g.arc(cx, cy, R0 * 0.2, 0, TAU); g.fill();
    g.strokeStyle = '#120e1a'; g.lineWidth = 4;
    for (const r of [R0 * 0.2, R0 * 0.62, R0 * 0.84, R0]) { g.beginPath(); g.arc(cx, cy, r, 0, TAU); g.stroke(); }
    g.lineWidth = 2.5;
    for (let i = 0; i < 24; i++) { const a = i / 24 * TAU; g.beginPath(); g.moveTo(cx + Math.cos(a) * R0 * 0.62, cy + Math.sin(a) * R0 * 0.62); g.lineTo(cx + Math.cos(a) * R0, cy + Math.sin(a) * R0); g.stroke(); }
    for (let i = 0; i < 6; i++) { const a = i / 6 * TAU; g.beginPath(); g.moveTo(cx + Math.cos(a) * R0 * 0.08, cy + Math.sin(a) * R0 * 0.08); g.lineTo(cx + Math.cos(a) * R0 * 0.2, cy + Math.sin(a) * R0 * 0.2); g.stroke(); }
    return c;
  }
  function makeBg() {
    const c = document.createElement('canvas'); c.width = W; c.height = H;
    const g = c.getContext('2d');
    // 奥の柱とアーチ（2段）
    for (const [row, col, a] of [[0, '#0c0e24', 1], [1, '#080a1a', 1]]) {
      const n = row ? 4 : 6, aw = W / n, top = row ? 250 : 200, base = GROUND_Y;
      g.fillStyle = col;
      for (let i = 0; i <= n; i++) g.fillRect(i * aw - (row ? 16 : 10), top, row ? 32 : 20, base - top);
      g.strokeStyle = row ? 'rgba(120,130,190,0.25)' : 'rgba(120,130,190,0.15)'; g.lineWidth = row ? 3 : 2;
      for (let i = 0; i < n; i++) {
        const x0 = i * aw, x1 = x0 + aw, mx = (x0 + x1) / 2;
        g.beginPath(); g.moveTo(x0, top); g.quadraticCurveTo(x0, top - aw * 0.55, mx, top - aw * 0.75); g.quadraticCurveTo(x1, top - aw * 0.55, x1, top); g.stroke();
      }
    }
    // 両わきの細長いステンドグラス
    for (const wx of [70, W - 70]) {
      const top = 230, bot = 520, ww = 46;
      g.fillStyle = '#05040c'; g.beginPath(); g.moveTo(wx - ww / 2 - 5, bot + 5); g.lineTo(wx - ww / 2 - 5, top); g.quadraticCurveTo(wx - ww / 2 - 5, top - 40, wx, top - 60); g.quadraticCurveTo(wx + ww / 2 + 5, top - 40, wx + ww / 2 + 5, top); g.lineTo(wx + ww / 2 + 5, bot + 5); g.closePath(); g.fill();
      for (let y = top - 30; y < bot; y += 22) for (let x = wx - ww / 2; x < wx + ww / 2; x += 15.3) {
        g.fillStyle = GLASS[Math.floor(hsh(x, y) * GLASS.length)]; g.globalAlpha = 0.55;
        g.fillRect(x + 1, Math.max(y, top - 40) + 1, 13, 20);
      }
      g.globalAlpha = 1;
    }
    return c;
  }
  function makeOrgan() {
    const c = document.createElement('canvas'); c.width = W; c.height = SN_PIPE_Y + 34;
    const g = c.getContext('2d');
    // ケース（暗い木 ＋ 金のふち ＋ 3つの塔）
    g.fillStyle = '#1a0f14'; g.fillRect(0, 0, W, SN_PIPE_Y + 26);
    g.fillStyle = '#2a1820'; for (const [x, w] of [[0, 120], [W / 2 - 70, 140], [W - 120, 120]]) g.fillRect(x, 0, w, SN_PIPE_Y + 30);
    g.strokeStyle = '#c8a050'; g.lineWidth = 2; g.strokeRect(2, 2, W - 4, SN_PIPE_Y + 22);
    g.fillStyle = '#c8a050'; g.fillRect(0, SN_PIPE_Y + 22, W, 4);
    // パイプ（左ほど長い）
    for (let m = SN_PIPE_LO; m <= SN_PIPE_HI; m++) {
      const x = snPipeX(m), len = 112 - (m - SN_PIPE_LO) * 1.45, w = 11 - (m - SN_PIPE_LO) * 0.08, top = SN_PIPE_Y - len;
      const gr = g.createLinearGradient(x - w / 2, 0, x + w / 2, 0);
      gr.addColorStop(0, '#5a6070'); gr.addColorStop(0.35, '#e8ecf4'); gr.addColorStop(0.6, '#a8b0c0'); gr.addColorStop(1, '#3a404c');
      g.fillStyle = gr; g.fillRect(x - w / 2, top, w, len + 8);
      g.fillStyle = '#20222a'; g.beginPath(); g.moveTo(x - w / 2, SN_PIPE_Y - 6); g.lineTo(x + w / 2, SN_PIPE_Y - 6); g.lineTo(x, SN_PIPE_Y - 13); g.closePath(); g.fill();   // 口
      g.fillStyle = gr; g.beginPath(); g.moveTo(x - w / 2, SN_PIPE_Y + 2); g.lineTo(x + w / 2, SN_PIPE_Y + 2); g.lineTo(x + 2, SN_PIPE_Y + 20); g.lineTo(x - 2, SN_PIPE_Y + 20); g.closePath(); g.fill();   // 足
      g.fillStyle = 'rgba(255,255,255,0.6)'; g.fillRect(x - w / 2 + 2, top + 2, 1.5, len);
    }
    return c;
  }
  function make() {
    st.made = true;
    st.rose = makeRose(); st.bg = makeBg(); st.organ = makeOrgan();
    st.motes = Array.from({ length: 50 }, (_, i) => ({ x: hsh(i, 1) * W, y: 150 + hsh(i, 2) * 500, v: 3 + hsh(i, 3) * 6, p: hsh(i, 4) * TAU, s: 0.8 + hsh(i, 5) * 1.6 }));
  }
  function reset() {
    if (!st.made) make();
    data();
    Object.assign(st, { lastBeat: -99, bellT: -9, timpT: -9, rings: [], labels: [], embers: [], feathers: [], sparks: [] });
  }
  function onBeat(b, T) {
    data();
    if (BELLS.has(b)) { st.bellT = T; st.rings.push({ t: 0, c: sec(b / 4) === 'dies' ? CRIM : GOLD }); }
    if (TIMP.has(b)) { st.timpT = T; if (typeof shake === 'function') shake(sec(b / 4) === 'dies' ? 5 : 3); }
    for (const e of ENTRY.get(b) || []) {
      const [, v, kind, shift] = e, m = 62 + shift;
      st.labels.push({ t: 0, x: snPipeX(Math.max(SN_PIPE_LO, m)), text: kind === 'answer' ? 'ANSWER' : 'SUBJECT', sub: v === 4 ? 'PEDAL' : ['', 'I', 'II', 'III'][v], c: v === 4 ? CRIM : v === 1 ? GOLD : v === 2 ? [159, 200, 255] : WHITE });
    }
  }
  function update(dt, T) {
    if (!st.made) make();
    data();
    if (scene === 'play') {
      const b = Math.floor(snBeatPos(T) + 0.02);
      if (b !== st.lastBeat) { if (b === st.lastBeat + 1) onBeat(b, T); st.lastBeat = b; }
    } else if (scene === 'title') {
      const b = Math.floor(T / SN_BEAT);
      if (b !== st.lastBeat) { st.lastBeat = b; if (b % 8 === 0) { st.bellT = T; st.rings.push({ t: 0, c: GOLD }); } }
    }
    const br = bpAt(T) / 4, s = inSong() ? sec(br) : 'title';
    if (s === 'dies' && st.embers.length < 70 && Math.random() < dt * 40) st.embers.push({ x: Math.random() * W, y: -10, vx: (Math.random() - 0.5) * 30, vy: 60 + Math.random() * 80, t: 0, s: 1 + Math.random() * 2 });
    if (s === 'amen' && br >= 57 && st.feathers.length < 30 && Math.random() < dt * 8) st.feathers.push({ x: Math.random() * W, y: -10, p: Math.random() * TAU, t: 0, v: 30 + Math.random() * 30 });
    for (const q of st.embers) { q.t += dt; q.x += q.vx * dt + Math.sin(q.t * 3) * 0.3; q.y += q.vy * dt; }
    st.embers = st.embers.filter(q => q.y < GROUND_Y);
    for (const q of st.feathers) { q.t += dt; q.y += q.v * dt; q.x += Math.sin(q.t * 1.5 + q.p) * 0.8; }
    st.feathers = st.feathers.filter(q => q.y < GROUND_Y);
    for (const arr of [st.rings, st.labels]) for (const q of arr) q.t += dt;
    st.rings = st.rings.filter(q => q.t < 1.4);
    st.labels = st.labels.filter(q => q.t < 2.2);
  }

  // ---- 背景 ---------------------------------------------------------------------------------
  function roseRot(T) {                                                 // KYRIE でゆっくり回る
    if (!inSong()) return T * 0.05;
    const bp = snBeatPos(T), k0 = 28 * 4, k1 = 32 * 4;
    return clamp01((bp - k0) / (k1 - k0)) * Math.PI / 3 + Math.max(0, bp - k1) * 0;
  }
  function background(T, look, k, bk, bp) {
    if (!st.made) make();
    data();
    vGradient(rgba(look.skyTop, 1), rgba(look.skyBot, 1));
    const s = inSong() ? sec(bp / 4) : 'title', dies = s === 'dies', amen = s === 'amen';
    const bell = Math.exp(-(T - st.bellT) * 1.6), lowE = inSong() ? songEnv(1, T) : 0.4;
    ctx.drawImage(st.bg, 0, 0);
    // バラ窓のうしろの光
    const R = R0, rx = SN_ROSE.x, ry = SN_ROSE.y;
    const lum = 0.35 + 0.45 * bell + 0.25 * lowE + (amen ? 0.4 : 0);
    if (gfx > 0) {
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      const gr = ctx.createRadialGradient(rx, ry, R * 0.5, rx, ry, R * 2.4);
      gr.addColorStop(0, rgba(dies ? CRIM : GOLD, 0.35 * lum)); gr.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = gr; ctx.fillRect(rx - R * 2.4, ry - R * 2.4, R * 4.8, R * 4.8);
      // 光の筋（バラ窓から床へ、ゆっくりゆれる）
      for (let i = 0; i < 5; i++) {
        const a = Math.PI / 2 + (i - 2) * 0.28 + Math.sin(T * 0.25 + i) * 0.04, len = 700, wd = 0.07;
        const g2 = ctx.createLinearGradient(rx, ry, rx + Math.cos(a) * len, ry + Math.sin(a) * len);
        g2.addColorStop(0, rgba(dies ? [255, 120, 100] : [255, 236, 190], 0.16 * lum)); g2.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g2; ctx.beginPath(); ctx.moveTo(rx, ry);
        ctx.lineTo(rx + Math.cos(a - wd) * len, ry + Math.sin(a - wd) * len); ctx.lineTo(rx + Math.cos(a + wd) * len, ry + Math.sin(a + wd) * len); ctx.closePath(); ctx.fill();
      }
      // ほこり（光の中で舞う）
      ctx.fillStyle = 'rgba(255,240,200,0.5)';
      for (const q of st.motes) { const y = (q.y - T * q.v) % 500 + 150, x = q.x + Math.sin(T * 0.5 + q.p) * 12; ctx.globalAlpha = 0.25 + 0.25 * Math.sin(T + q.p); ctx.fillRect(x, y < 150 ? y + 500 : y, q.s, q.s); }
      ctx.globalAlpha = 1;
      ctx.restore();
    }
    // バラ窓
    ctx.save(); ctx.translate(rx, ry); ctx.rotate(roseRot(T));
    ctx.globalAlpha = 0.55 + 0.45 * clamp01(lum);
    ctx.drawImage(st.rose, -st.rose.width / 2, -st.rose.height / 2);
    ctx.restore(); ctx.globalAlpha = 1;
    if (dies) { ctx.fillStyle = `rgba(200,20,30,${(0.25 + 0.15 * bell).toFixed(3)})`; ctx.beginPath(); ctx.arc(rx, ry, R + 8, 0, TAU); ctx.fill(); }
    // 鐘の光の輪（バラ窓から）
    for (const q of st.rings) {
      const p = q.t / 1.4;
      ctx.strokeStyle = rgba(q.c, 0.5 * (1 - p)); ctx.lineWidth = 6 * (1 - p) + 1;
      ctx.beginPath(); ctx.arc(rx, ry, R + easeOut(p) * 420, 0, TAU); ctx.stroke();
    }
    // パイプオルガン ＋ 光るパイプ
    ctx.drawImage(st.organ, 0, 0);
    drawLitPipes(T);
    // 火の粉（DIES IRAE）・羽根（AMEN）
    for (const q of st.embers) { ctx.fillStyle = `rgba(255,${(120 + 80 * Math.sin(q.t * 9)) | 0},60,${(0.8 * clamp01(1 - q.y / GROUND_Y) + 0.2).toFixed(3)})`; ctx.fillRect(q.x, q.y, q.s, q.s); }
    for (const q of st.feathers) {
      ctx.save(); ctx.translate(q.x, q.y); ctx.rotate(Math.sin(q.t * 1.5 + q.p) * 0.6);
      ctx.fillStyle = 'rgba(255,255,250,0.85)'; ctx.beginPath(); ctx.ellipse(0, 0, 3, 9, 0, 0, TAU); ctx.fill();
      ctx.strokeStyle = 'rgba(200,190,160,0.8)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(0, -9); ctx.lineTo(0, 10); ctx.stroke();
      ctx.restore();
    }
    // 主題・応答の札
    ctx.save(); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    for (const q of st.labels) {
      const a = q.t < 0.2 ? q.t / 0.2 : q.t > 1.6 ? (2.2 - q.t) / 0.6 : 1, x = Math.max(70, Math.min(W - 70, q.x)), y = SN_PIPE_Y + 52;
      ctx.globalAlpha = clamp01(a);
      ctx.fillStyle = 'rgba(10,8,20,0.75)'; roundRect(x - 52, y - 16, 104, 34, 6); ctx.fill();
      ctx.strokeStyle = rgba(q.c, 0.9); ctx.lineWidth = 1.5; ctx.stroke();
      ctx.font = `700 13px ${SERIF}`; ctx.fillStyle = rgba(q.c, 1); ctx.fillText(q.text, x, y - 5);
      ctx.font = `700 10px ${SERIF}`; ctx.fillStyle = 'rgba(255,255,255,0.8)'; ctx.fillText(q.sub ? 'VOX ' + q.sub : '', x, y + 9);
      ctx.beginPath(); ctx.moveTo(x, y - 16); ctx.lineTo(q.x, SN_PIPE_Y + 20); ctx.strokeStyle = rgba(q.c, 0.6); ctx.stroke();
    }
    ctx.restore();
  }
  // 弾を出すパイプ: 予告のあいだ明るくなり、出た瞬間にいちばん光る
  const LIT = new Float32Array(SN_PIPE_HI - SN_PIPE_LO + 1), LITC = new Array(SN_PIPE_HI - SN_PIPE_LO + 1);
  function drawLitPipes(T) {
    if (!inSong()) return;
    LIT.fill(0);
    for (const b of bullets) {
      if (b.style !== 'pipe') continue;
      const i = Math.round((b.x - 64) / (W - 128) * (SN_PIPE_HI - SN_PIPE_LO));
      if (i < 0 || i >= LIT.length) continue;
      const v = b.delay > 0 ? 0.25 + 0.5 * (1 - b.delay / b.delayMax) : Math.max(0, 1 - b.age * 3);
      if (v > LIT[i]) { LIT[i] = v; LITC[i] = b.color; }
    }
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < LIT.length; i++) {
      if (LIT[i] <= 0.02) continue;
      const m = SN_PIPE_LO + i, x = snPipeX(m), len = 112 - i * 1.45, c = rgb(LITC[i] || '#ffd25a');
      ctx.fillStyle = rgba(c, 0.55 * LIT[i]); ctx.fillRect(x - 6, SN_PIPE_Y - len, 12, len + 8);
      if (gfx > 0) { ctx.drawImage(glowSprite(c), x - 22, SN_PIPE_Y - 26, 44, 44); }
    }
    ctx.restore();
  }

  // ---- 床（大理石）と燭台 -------------------------------------------------------------------------
  function floor(look, k, bp) {
    const y = GROUND_Y, T = nowT(), s = inSong() ? sec(bp / 4) : 'title';
    ctx.fillStyle = '#0c0a16'; ctx.fillRect(-400, y, W + 800, H - y + 400);
    for (let i = -10; i < 26; i++) { ctx.fillStyle = (i % 2 + 2) % 2 ? '#1c1a2c' : '#2c2a40'; ctx.fillRect(i * 40, y, 40, 22); }
    for (let i = -10; i < 26; i++) { ctx.fillStyle = (i % 2 + 2) % 2 ? '#24223a' : '#141222'; ctx.fillRect(i * 40, y + 22, 40, 30); }
    // バラ窓の映りこみ
    if (gfx > 0) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = rgba(s === 'dies' ? CRIM : GOLD, 0.08 + 0.08 * Math.exp(-(T - st.bellT) * 1.6)); ctx.beginPath(); ctx.ellipse(SN_ROSE.x, y + 26, 150, 14, 0, 0, TAU); ctx.fill(); ctx.restore(); }
    ctx.fillStyle = '#c8a050'; ctx.fillRect(-400, y, W + 800, 2);
    // 燭台（両はし）: ろうそく 3本、炎がゆらぐ
    for (const cx of [34, W - 34]) {
      ctx.fillStyle = '#8a6a30'; ctx.fillRect(cx - 2, y - 70, 4, 70); ctx.fillRect(cx - 18, y - 70, 36, 4); ctx.fillRect(cx - 10, y - 4, 20, 4);
      for (const dx of [-16, 0, 16]) {
        const top = y - 70 - (dx ? 18 : 26);
        ctx.fillStyle = '#f4ecd8'; ctx.fillRect(cx + dx - 3, top, 6, y - 70 - top);
        const fl = 1 + 0.25 * Math.sin(T * 13 + dx) + 0.1 * Math.sin(T * 31 + cx);
        if (gfx > 0) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.drawImage(glowSprite([255, 170, 60]), cx + dx - 16, top - 24, 32, 32); ctx.restore(); }
        ctx.fillStyle = '#ffd060'; ctx.beginPath(); ctx.ellipse(cx + dx, top - 6 * fl, 3, 7 * fl, 0, 0, TAU); ctx.fill();
        ctx.fillStyle = '#fff6d0'; ctx.beginPath(); ctx.ellipse(cx + dx, top - 4 * fl, 1.5, 3.5 * fl, 0, 0, TAU); ctx.fill();
      }
    }
  }
  function platform(p, look, k) {
    ctx.fillStyle = '#2a2638'; roundRect(p.x, p.y, p.w, p.h, 3); ctx.fill();
    ctx.fillStyle = '#c8a050'; ctx.fillRect(p.x, p.y, p.w, 2); ctx.fillRect(p.x, p.y + p.h - 2, p.w, 2);
    ctx.fillStyle = 'rgba(200,160,80,0.5)'; for (let x = p.x + 10; x < p.x + p.w - 6; x += 20) { ctx.beginPath(); ctx.arc(x, p.y + p.h / 2, 2, 0, TAU); ctx.fill(); }
  }

  // ---- 弾 -------------------------------------------------------------------------------------
  function bullet(b, c, k) {
    if (b.style === 'pipe') {                                           // パイプの光: 細長いひし形 ＋ 白い芯。主題の音は十字のきらめき
      const r = b.r, hgt = r * 1.9;
      ctx.fillStyle = rgba(c, 1); ctx.beginPath(); ctx.moveTo(b.x, b.y - hgt); ctx.lineTo(b.x + r, b.y); ctx.lineTo(b.x, b.y + hgt); ctx.lineTo(b.x - r, b.y); ctx.closePath(); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.9)'; ctx.beginPath(); ctx.moveTo(b.x, b.y - hgt * 0.6); ctx.lineTo(b.x + r * 0.45, b.y); ctx.lineTo(b.x, b.y + hgt * 0.6); ctx.lineTo(b.x - r * 0.45, b.y); ctx.closePath(); ctx.fill();
      if (b.big) { const s = r * (1.6 + 0.3 * Math.sin(b.age * 12)); ctx.strokeStyle = 'rgba(255,255,255,0.75)'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(b.x - s, b.y); ctx.lineTo(b.x + s, b.y); ctx.stroke(); }
      return;
    }
    if (b.style === 'glyph') {                                          // 文字の光: 金のふちの丸 ＋ ラテン文字
      ctx.fillStyle = rgba(mixC(c, [20, 16, 40], 0.55), 0.95); ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, TAU); ctx.fill();
      ctx.strokeStyle = rgba(c, 1); ctx.lineWidth = 2; ctx.stroke();
      ctx.fillStyle = rgba(mixC(c, WHITE, 0.5), 1); ctx.font = `700 ${Math.round(b.r * 1.3)}px ${SERIF}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(b.ch || 'S', b.x, b.y + 1);
      return;
    }
    if (b.style === 'halo') {                                           // 後光のつぶ: 白い芯 ＋ 色の輪
      ctx.fillStyle = '#fffaf0'; ctx.beginPath(); ctx.arc(b.x, b.y, b.r * 0.62, 0, TAU); ctx.fill();
      ctx.strokeStyle = rgba(c, 1); ctx.lineWidth = b.r * 0.55; ctx.beginPath(); ctx.arc(b.x, b.y, b.r * 0.78, 0, TAU); ctx.stroke();
      return;
    }
    ctx.fillStyle = rgba(c, 1); ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.92)'; ctx.beginPath(); ctx.arc(b.x, b.y, b.r * 0.55, 0, TAU); ctx.fill();
  }
  // 剣（上からの縦のビーム）: 発射すると上に十字のつば。柱（床からの光）: 足もとに紋章
  function laser(b, c, T, k) {
    if (b.lstyle === 'sword') {
      const x = b.x1, on = b.delay <= 0 && !b.safe, p = b.delay > 0 ? 1 - b.delay / b.delayMax : 1;
      const y = on ? 60 : 60 - 30 * (1 - p);
      ctx.save(); ctx.globalAlpha = on ? 1 : 0.35 + 0.4 * p;
      ctx.fillStyle = rgba(mixC(c, WHITE, 0.4), 1); ctx.fillRect(x - 26, y, 52, 6); ctx.fillRect(x - 4, y - 26, 8, 26);
      ctx.beginPath(); ctx.arc(x, y - 30, 6, 0, TAU); ctx.fill();
      ctx.restore();
    } else if (b.lstyle === 'pillar') {
      const x = b.x1, p = b.delay > 0 ? 1 - b.delay / b.delayMax : 1;
      ctx.save(); ctx.strokeStyle = rgba(c, 0.4 + 0.5 * p); ctx.lineWidth = 2;
      ctx.beginPath(); ctx.ellipse(x, GROUND_Y + 4, 24 + 8 * p, 6, 0, 0, TAU); ctx.stroke();
      ctx.beginPath(); for (let i = 0; i < 6; i++) { const a = i / 6 * TAU + T * 2; ctx.moveTo(x, GROUND_Y + 4); ctx.lineTo(x + Math.cos(a) * 24, GROUND_Y + 4 + Math.sin(a) * 6); } ctx.stroke();
      ctx.restore();
    }
    return false;
  }

  // ---- カメラ: 厳格なので、ほとんど動かない。ティンパニで下へ「ずん」と沈む --------------------------------
  function camera(T, bp, k) {
    const d = T - st.timpT;
    const y = d >= 0 && d < 0.4 ? 7 * Math.exp(-d * 10) * Math.cos(d * 30) : 0;
    return { y };
  }
  function world(T, look, k) { }
  function flash(look) {
    const T = nowT(), d = inSong() && sec(bpAt(T) / 4) === 'dies';
    ctx.fillStyle = d ? `rgba(255,40,40,${(0.3 * flashT).toFixed(3)})` : `rgba(255,245,215,${(0.4 * flashT).toFixed(3)})`; ctx.fillRect(0, 0, W, H);
  }

  // 画面に固定: ティンパニの赤い光 ／ 全休止の灰色とフェルマータ ／ アーメンの光
  function overlay(T) {
    if (!inSong()) return;
    const bp = snBeatPos(T), s = sec(bp / 4);
    if (s === 'dies') { const d = T - st.timpT; if (d >= 0 && d < 0.3) { ctx.fillStyle = `rgba(255,30,30,${(0.16 * (1 - d / 0.3)).toFixed(3)})`; ctx.fillRect(0, 0, W, H); } }
    for (const g of GP || []) {
      const t0 = snBeatTime(g), t1 = snBeatTime(g + 1);
      if (T >= t0 && T < t1 + 0.2) {
        const a = T < t1 ? clamp01((T - t0) / 0.08) : 1 - (T - t1) / 0.2;
        ctx.fillStyle = `rgba(30,30,40,${(0.45 * a).toFixed(3)})`; ctx.fillRect(0, 0, W, H);
        ctx.save(); ctx.globalAlpha = a; ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.font = `400 120px ${SERIF}`; ctx.fillText('𝄐', W / 2, H * 0.42);
        ctx.font = `700 18px ${SERIF}`; ctx.fillText('G.P.', W / 2, H * 0.42 + 70);
        ctx.restore();
      }
    }
    if (s === 'amen') {
      const a = clamp01((bp - 228) / 6);
      if (a > 0) {
        const gr = ctx.createRadialGradient(W / 2, -60, 40, W / 2, -60, H * 1.1);
        gr.addColorStop(0, `rgba(255,250,230,${(0.55 * a).toFixed(3)})`); gr.addColorStop(1, 'rgba(255,250,230,0)');
        ctx.fillStyle = gr; ctx.fillRect(0, 0, W, H);
      }
    }
  }
  // 場面の名前: 金の細い線にはさまれたラテン語（ゆっくり現れて、ゆっくり消える）
  function banner() {
    overlay(songTime);
    const bn = fx.banner;
    if (!bn) return;
    const e = bn.age, DUR = 3.2;
    if (e > DUR) { fx.banner = null; return; }
    const a = e < 0.6 ? e / 0.6 : e > DUR - 0.8 ? (DUR - e) / 0.8 : 1;
    ctx.save(); ctx.globalAlpha = clamp01(a); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const y = 300, spread = 1 + 0.02 * e;
    ctx.font = `400 ${Math.round(56 * spread)}px ${SERIF}`;
    const name = bn.name.split('').join(' ');
    const tw = ctx.measureText(name).width;
    ctx.fillStyle = rgba(mixC(bn.c, WHITE, 0.4), 1); ctx.fillText(name, W / 2, y);
    ctx.strokeStyle = rgba(GOLD, 0.8); ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(W / 2 - tw / 2 - 30, y - 40); ctx.lineTo(W / 2 + tw / 2 + 30, y - 40); ctx.moveTo(W / 2 - tw / 2 - 30, y + 36); ctx.lineTo(W / 2 + tw / 2 + 30, y + 36); ctx.stroke();
    for (const sx of [-1, 1]) { const dx = W / 2 + sx * (tw / 2 + 30); ctx.fillStyle = rgba(GOLD, 1); ctx.beginPath(); ctx.moveTo(dx, y - 46); ctx.lineTo(dx + 4, y - 40); ctx.lineTo(dx, y - 34); ctx.lineTo(dx - 4, y - 40); ctx.closePath(); ctx.fill(); }
    if (bn.sub) { ctx.font = `400 16px ${SERIF}`; ctx.fillStyle = 'rgba(255,255,255,0.85)'; ctx.fillText(bn.sub, W / 2, y + 58); }
    ctx.restore();
  }
  // ヒント: 羊皮紙の札
  function hint(h, a, T) {
    ctx.save(); ctx.globalAlpha = clamp01(a);
    ctx.font = `700 21px ${SERIF}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const w = ctx.measureText(h.text).width + 50, x = W / 2 - w / 2, y = H * 0.56;
    ctx.fillStyle = 'rgba(240,226,190,0.95)'; roundRect(x, y, w, 44, 4); ctx.fill();
    ctx.strokeStyle = '#8a6a30'; ctx.lineWidth = 2; ctx.stroke();
    ctx.strokeStyle = 'rgba(138,106,48,0.5)'; ctx.lineWidth = 1; ctx.strokeRect(x + 4, y + 4, w - 8, 36);
    ctx.fillStyle = '#3a2410'; ctx.fillText(h.text, W / 2, y + 23);
    ctx.restore();
  }
  // タイトル: バラ窓のまわりを後光のつぶが回る
  function title(look, k, bp) {
    const T = titleClock();
    for (let i = 0; i < 12; i++) {
      const a = T * 0.3 + i / 12 * TAU, x = SN_ROSE.x + Math.cos(a) * (R0 + 40), y = SN_ROSE.y + Math.sin(a) * (R0 + 40);
      bullet({ style: 'halo', x, y, r: 8 }, i % 2 ? GOLD : [159, 200, 255], k);
    }
  }

  THEMES.sanctus = {
    noTrails: false, noScanlines: true, glow: 1.8,
    clearColors: ['#ffd25a', '#fff6e0', '#9fc8ff', '#ff8ab0', '#c79bff'],
    reset, update, background, floor, platform, bullet, laser, world, flash, hint, banner, title, camera,
  };
  THEMES.sanctus.release = () => { freeArt(st); st.made = false; };
})();
