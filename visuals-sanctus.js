"use strict";

/* =========================================================================
   見た目のセット「sanctus」  —  曲㉒「SANCTUS」用
   天界。雲の海の上、空の高い所。まん中には光の門（回る光の輪と光の筋）、遠くには浮かぶ島の神殿、
   ゆっくり飛んでいく天使のかげ、上からさす光の筋と、舞う金のつぶ・羽根。床は雲。両はしに白い柱と聖なる火。
   画面のいちばん上には、大きな金のハープ（左が低い音・右が高い音。本物のハープと同じく、ドの弦は赤・ファの弦は青）。
   弾を出す弦は、予告のあいだ光り、出た瞬間にふるえて強く光る。主題・応答が入ると、その弦の下に
   「SUBJECT / ANSWER」と楽器の名前（PIANO / VIOLIN / VIOLIN SOLO / BASS）が出る（フーガの形が見える）。
   鐘が鳴ると光の門が明るく脈打ち、光の輪が広がる。KYRIE では空にオーロラ、DIES IRAE では空が赤黒い嵐になり、
   ティンパニで稲妻が落ちる。全休止では画面が灰色になって止まり、フェルマータ（𝄐）が出る。AMEN では上から光があふれる。
   弾: 光のひし形（ハープの音）／ 文字の光（ラテン文字入りの丸）／ 光の輪のつぶ（後光）。剣と柱のビームに飾り。
   動かない絵（光の門・雲・神殿・ハープ）は前もって描いておく。
   ========================================================================= */

(function () {
  const WHITE = [255, 255, 255], GOLD = [255, 210, 90], CRIM = [255, 74, 90];
  const SERIF = '"Times New Roman", "Hiragino Mincho ProN", "Yu Mincho", serif';
  const st = { made: false, gate: null, clouds: null, cloudFloor: null, isles: null, harp: null, motes: null, angels: null, lastBeat: -99, bellT: -9, timpT: -9, bolt: null, rings: [], labels: [], feathers: [] };
  let SC = null, BELLS = null, TIMP = null, ENTRY = null, GP = null;
  const inSong = () => scene !== 'title';
  const hsh = (a, b = 0) => { const v = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return v - Math.floor(v); };
  const nowT = () => inSong() ? songTime : titleClock();
  const bpAt = T => inSong() ? snBeatPos(T) : T / SN_BEAT;
  const sec = br => br < 4 ? 'bells' : br < 12 ? 'introitus' : br < 28 ? 'fuga' : br < 32 ? 'kyrie' : br < 48 ? 'dies' : br < 56 ? 'stretto' : 'amen';
  const R0 = 110;                                                        // 光の門の半径
  const strLen = m => 112 - (m - SN_PIPE_LO) * 1.45;                    // ハープの弦の長さ（低い音ほど長い）
  const strCol = m => (m % 12 === 0 ? '#ff4a5a' : m % 12 === 5 ? '#3a6cff' : '#f4eedc');   // ドは赤、ファは青

  function data() {
    if (SC) return;
    SC = SCORE_SANCTUS;
    BELLS = new Set(SC.bell.map(e => e[0])); TIMP = new Map(SC.timp.map(e => [e[0], e[1]]));
    ENTRY = new Map(); for (const e of SC.entry) { const a = ENTRY.get(e[0]) || []; a.push(e); ENTRY.set(e[0], a); }
    GP = SC.gp;
  }

  // ---- 前もって描く絵 ---------------------------------------------------------------------------
  function makeGate() {                                                  // 光の門: 光の筋 ＋ 3重の輪 ＋ まぶしいまん中
    const S = R0 * 4, c = document.createElement('canvas'); c.width = c.height = S;
    const g = c.getContext('2d'), cx = S / 2, cy = S / 2;
    g.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 24; i++) {
      const a = i / 24 * TAU, L = S / 2 * (i % 2 ? 0.75 : 1), wd = i % 2 ? 0.03 : 0.05;
      const gr = g.createLinearGradient(cx, cy, cx + Math.cos(a) * L, cy + Math.sin(a) * L);
      gr.addColorStop(0, 'rgba(255,240,200,0.5)'); gr.addColorStop(1, 'rgba(255,240,200,0)');
      g.fillStyle = gr; g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + Math.cos(a - wd) * L, cy + Math.sin(a - wd) * L); g.lineTo(cx + Math.cos(a + wd) * L, cy + Math.sin(a + wd) * L); g.closePath(); g.fill();
    }
    const gr = g.createRadialGradient(cx, cy, 0, cx, cy, R0 * 1.1);
    gr.addColorStop(0, 'rgba(255,255,250,1)'); gr.addColorStop(0.35, 'rgba(255,240,190,0.9)'); gr.addColorStop(1, 'rgba(255,210,120,0)');
    g.fillStyle = gr; g.beginPath(); g.arc(cx, cy, R0 * 1.1, 0, TAU); g.fill();
    g.globalCompositeOperation = 'source-over';
    for (const [r, w, a] of [[R0 * 0.62, 2, 0.9], [R0 * 0.92, 3, 0.8], [R0 * 1.22, 1.5, 0.6]]) {
      g.strokeStyle = `rgba(255,226,150,${a})`; g.lineWidth = w; g.beginPath(); g.arc(cx, cy, r, 0, TAU); g.stroke();
    }
    for (let i = 0; i < 12; i++) {                                       // 輪の上の小さな星
      const a = i / 12 * TAU, x = cx + Math.cos(a) * R0 * 0.92, y = cy + Math.sin(a) * R0 * 0.92;
      g.fillStyle = '#fff6d8'; g.beginPath(); g.moveTo(x, y - 6); g.quadraticCurveTo(x, y, x + 6, y); g.quadraticCurveTo(x, y, x, y + 6); g.quadraticCurveTo(x, y, x - 6, y); g.quadraticCurveTo(x, y, x, y - 6); g.fill();
    }
    return c;
  }
  function puff(g, x, y, r, shade) {                                     // 雲のかたまり（丸をいくつも重ねる）
    for (let i = 0; i < 7; i++) {
      const px = x + (hsh(x + i, y) - 0.5) * r * 2.2, py = y - hsh(i, x) * r * 0.6, pr = r * (0.5 + 0.5 * hsh(y, i + x));
      const gr = g.createRadialGradient(px, py - pr * 0.3, pr * 0.1, px, py, pr);
      gr.addColorStop(0, `rgba(255,255,255,${0.95 * shade})`); gr.addColorStop(1, `rgba(230,225,245,${0.6 * shade})`);
      g.fillStyle = gr; g.beginPath(); g.arc(px, py, pr, 0, TAU); g.fill();
    }
  }
  function makeClouds() {                                                // 遠くの雲の海（横につなげて流す）
    const c = document.createElement('canvas'); c.width = W * 2; c.height = 260;
    const g = c.getContext('2d');
    for (let i = 0; i < 40; i++) puff(g, (i / 40) * W * 2, 120 + hsh(i, 3) * 90, 40 + hsh(i, 4) * 40, 0.55 + 0.3 * hsh(i, 5));
    g.fillStyle = 'rgba(240,236,250,0.7)'; g.fillRect(0, 200, W * 2, 60);
    return c;
  }
  function makeCloudFloor() {                                            // 床の雲
    const c = document.createElement('canvas'); c.width = W * 2; c.height = 120;
    const g = c.getContext('2d');
    g.fillStyle = '#f4f0fa'; g.fillRect(0, 34, W * 2, 86);
    for (let i = 0; i < 46; i++) puff(g, (i / 46) * W * 2, 40 + hsh(i, 9) * 14, 22 + hsh(i, 8) * 16, 1);
    return c;
  }
  function makeIsles() {                                                 // 遠くに浮かぶ島と神殿（左右）
    const c = document.createElement('canvas'); c.width = W; c.height = 300;
    const g = c.getContext('2d');
    for (const [x, y, s] of [[120, 170, 1], [W - 130, 140, 0.8]]) {
      g.fillStyle = 'rgba(150,140,180,0.55)';
      g.beginPath(); g.moveTo(x - 90 * s, y); g.quadraticCurveTo(x, y + 110 * s, x + 90 * s, y); g.closePath(); g.fill();
      puff(g, x, y + 4, 26 * s, 0.6);
      g.fillStyle = 'rgba(250,246,236,0.75)';
      g.fillRect(x - 60 * s, y - 10 * s, 120 * s, 8 * s);                // 土台
      for (let i = 0; i < 6; i++) g.fillRect(x - 54 * s + i * 21 * s, y - 62 * s, 8 * s, 52 * s);   // 柱
      g.fillRect(x - 64 * s, y - 70 * s, 128 * s, 8 * s);
      g.beginPath(); g.moveTo(x - 66 * s, y - 70 * s); g.lineTo(x, y - 98 * s); g.lineTo(x + 66 * s, y - 70 * s); g.closePath(); g.fill();   // 三角屋根
    }
    return c;
  }
  function makeHarp() {                                                  // 金のハープ（柱 ＋ 首 ＋ 響板 ＋ 弦）
    const c = document.createElement('canvas'); c.width = W; c.height = SN_PIPE_Y + 40;
    const g = c.getContext('2d');
    const gold = g.createLinearGradient(0, 0, 0, SN_PIPE_Y + 30);
    gold.addColorStop(0, '#fff2b8'); gold.addColorStop(0.5, '#e0b050'); gold.addColorStop(1, '#a8782a');
    // 弦
    for (let m = SN_PIPE_LO; m <= SN_PIPE_HI; m++) {
      const x = snPipeX(m), top = SN_PIPE_Y - strLen(m);
      g.strokeStyle = strCol(m); g.globalAlpha = 0.85; g.lineWidth = m < 62 ? 1.8 : 1.2;
      g.beginPath(); g.moveTo(x, top); g.lineTo(x, SN_PIPE_Y); g.stroke();
    }
    g.globalAlpha = 1;
    // 首（弦の上をなぞる金の曲線。両はしは渦巻き）
    g.strokeStyle = gold; g.lineWidth = 12; g.lineCap = 'round';
    g.beginPath();
    for (let m = SN_PIPE_LO; m <= SN_PIPE_HI; m++) { const x = snPipeX(m), y = SN_PIPE_Y - strLen(m) - 6 - 8 * Math.sin((m - SN_PIPE_LO) / 40 * Math.PI); m === SN_PIPE_LO ? g.moveTo(x - 20, y) : g.lineTo(x, y); }
    g.lineTo(W - 40, SN_PIPE_Y - 70); g.stroke();
    g.strokeStyle = 'rgba(255,255,230,0.7)'; g.lineWidth = 2; g.stroke();
    g.strokeStyle = gold; g.lineWidth = 6;
    g.beginPath(); g.arc(W - 46, SN_PIPE_Y - 56, 14, -Math.PI / 2, Math.PI * 1.3); g.stroke();
    // 響板（弦の下の帯）と、左の柱（天使の彫刻のかわりに、羽の飾り）
    g.fillStyle = gold; g.fillRect(30, SN_PIPE_Y, W - 60, 12);
    g.fillStyle = 'rgba(255,255,230,0.6)'; g.fillRect(30, SN_PIPE_Y + 1, W - 60, 2);
    g.fillStyle = gold; g.fillRect(14, 0, 22, SN_PIPE_Y + 24);
    for (let i = 0; i < 5; i++) { g.fillStyle = 'rgba(255,250,230,0.85)'; g.beginPath(); g.ellipse(46 + i * 4, 20 + i * 16, 16 - i * 2, 5, -0.5, 0, TAU); g.fill(); }
    g.fillStyle = gold; g.beginPath(); g.arc(25, SN_PIPE_Y + 26, 14, 0, TAU); g.fill();
    return c;
  }
  function make() {
    st.made = true;
    st.gate = makeGate(); st.clouds = makeClouds(); st.cloudFloor = makeCloudFloor(); st.isles = makeIsles(); st.harp = makeHarp();
    st.motes = Array.from({ length: 60 }, (_, i) => ({ x: hsh(i, 1) * W, y: 160 + hsh(i, 2) * 500, v: 4 + hsh(i, 3) * 8, p: hsh(i, 4) * TAU, s: 0.8 + hsh(i, 5) * 1.8 }));
    st.angels = Array.from({ length: 3 }, (_, i) => ({ y: 250 + i * 60, v: 12 + i * 5, p: i * 2.1, s: 0.6 + i * 0.15, dir: i % 2 ? -1 : 1 }));
  }
  function reset() {
    if (!st.made) make();
    data();
    Object.assign(st, { lastBeat: -99, bellT: -9, timpT: -9, bolt: null, rings: [], labels: [], feathers: [] });
  }
  const INST = { 1: 'PIANO', 2: 'VIOLIN', 3: 'VIOLIN SOLO', 4: 'BASS' };
  function onBeat(b, T) {
    data();
    const s = sec(b / 4);
    if (BELLS.has(b)) { st.bellT = T; st.rings.push({ t: 0, c: s === 'dies' ? CRIM : GOLD }); }
    if (TIMP.has(b)) {
      st.timpT = T; if (typeof shake === 'function') shake(s === 'dies' ? 5 : 2);
      if (s === 'dies') {                                               // 稲妻（空から、ぎざぎざに）
        const x0 = 120 + hsh(b) * (W - 240), pts = [[x0, 140]];
        for (let i = 1; i < 9; i++) pts.push([pts[i - 1][0] + (hsh(b, i) - 0.5) * 70, 140 + i * 55]);
        st.bolt = { pts, t: 0 };
      }
    }
    for (const e of ENTRY.get(b) || []) {
      const [, v, kind, shift] = e, m = 62 + shift;
      st.labels.push({ t: 0, x: snPipeX(Math.max(SN_PIPE_LO, m)), text: kind === 'answer' ? 'ANSWER' : 'SUBJECT', sub: INST[v], c: v === 4 ? CRIM : v === 1 ? GOLD : v === 2 ? [159, 200, 255] : WHITE });
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
    const rate = s === 'amen' ? 10 : s === 'dies' ? 0 : 1.5;              // 羽根: いつも少し、アーメンでたくさん
    if (st.feathers.length < 40 && Math.random() < dt * rate) st.feathers.push({ x: Math.random() * W, y: 150, p: Math.random() * TAU, t: 0, v: 25 + Math.random() * 30 });
    for (const q of st.feathers) { q.t += dt; q.y += q.v * dt; q.x += Math.sin(q.t * 1.5 + q.p) * 0.8; }
    st.feathers = st.feathers.filter(q => q.y < GROUND_Y);
    for (const arr of [st.rings, st.labels]) for (const q of arr) q.t += dt;
    st.rings = st.rings.filter(q => q.t < 1.4);
    st.labels = st.labels.filter(q => q.t < 2.2);
    if (st.bolt) { st.bolt.t += dt; if (st.bolt.t > 0.35) st.bolt = null; }
  }

  // ---- 背景 ---------------------------------------------------------------------------------
  function background(T, look, k, bk, bp) {
    if (!st.made) make();
    data();
    const s = inSong() ? sec(bp / 4) : 'title', dies = s === 'dies', amen = s === 'amen';
    vGradient(rgba(look.skyTop, 1), rgba(look.skyBot, 1));
    const bell = Math.exp(-(T - st.bellT) * 1.6), lowE = inSong() ? songEnv(2, T) : 0.4;
    // オーロラ（KYRIE）
    if (s === 'kyrie' && gfx > 0) {
      const a = clamp01((bp - 112) / 2) * clamp01((128 - bp) / 2);
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      for (let j = 0; j < 3; j++) {
        ctx.fillStyle = rgba([[120, 255, 200], [180, 140, 255], [255, 160, 220]][j], 0.12 * a);
        ctx.beginPath(); ctx.moveTo(0, 200);
        for (let x = 0; x <= W; x += 20) ctx.lineTo(x, 120 + j * 40 + Math.sin(x * 0.012 + T * 0.8 + j * 2) * 30);
        for (let x = W; x >= 0; x -= 20) ctx.lineTo(x, 170 + j * 40 + Math.sin(x * 0.01 + T * 0.6 + j) * 30);
        ctx.closePath(); ctx.fill();
      }
      ctx.restore();
    }
    // 遠くの神殿の島（ゆっくり上下）と、飛んでいく天使
    ctx.globalAlpha = dies ? 0.35 : 0.9; ctx.drawImage(st.isles, 0, 120 + Math.sin(T * 0.4) * 6); ctx.globalAlpha = 1;
    if (!dies) for (const a of st.angels) {
      const x = ((a.dir > 0 ? T * a.v : -T * a.v) + a.p * 300) % (W + 200), px = a.dir > 0 ? x - 100 : W + 100 + x, py = a.y + Math.sin(T * 0.7 + a.p) * 10, fl = Math.sin(T * 6 + a.p);
      ctx.save(); ctx.translate((px % (W + 200) + W + 200) % (W + 200) - 100, py); ctx.scale(a.s * a.dir, a.s);
      ctx.fillStyle = 'rgba(255,255,255,0.55)';
      ctx.beginPath(); ctx.ellipse(0, 0, 5, 9, 0, 0, TAU); ctx.fill(); ctx.beginPath(); ctx.arc(0, -12, 4, 0, TAU); ctx.fill();
      ctx.beginPath(); ctx.moveTo(-2, -4); ctx.quadraticCurveTo(-22, -18 - fl * 10, -30, -4 - fl * 6); ctx.quadraticCurveTo(-16, -2, -2, 2); ctx.fill();
      ctx.beginPath(); ctx.moveTo(2, -4); ctx.quadraticCurveTo(22, -18 - fl * 10, 30, -4 - fl * 6); ctx.quadraticCurveTo(16, -2, 2, 2); ctx.fill();
      ctx.strokeStyle = 'rgba(255,230,150,0.7)'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.ellipse(0, -18, 5, 1.6, 0, 0, TAU); ctx.stroke();
      ctx.restore();
    }
    // 光の門（回る光の筋 ＋ 輪）
    const rx = SN_ROSE.x, ry = SN_ROSE.y, lum = 0.5 + 0.4 * bell + 0.2 * lowE + (amen ? 0.3 : 0);
    ctx.save(); ctx.translate(rx, ry); ctx.rotate(T * 0.05);
    ctx.globalAlpha = clamp01((dies ? 0.45 : 0.8) * lum + 0.15); ctx.drawImage(st.gate, -st.gate.width / 2, -st.gate.height / 2);
    ctx.restore(); ctx.globalAlpha = 1;
    if (dies) { ctx.fillStyle = `rgba(160,10,30,${(0.35 + 0.1 * bell).toFixed(3)})`; ctx.beginPath(); ctx.arc(rx, ry, R0 * 0.75, 0, TAU); ctx.fill(); }
    for (const q of st.rings) {
      const p = q.t / 1.4;
      ctx.strokeStyle = rgba(q.c, 0.55 * (1 - p)); ctx.lineWidth = 6 * (1 - p) + 1;
      ctx.beginPath(); ctx.arc(rx, ry, R0 * 0.9 + easeOut(p) * 440, 0, TAU); ctx.stroke();
    }
    // 上からさす光の筋 ＋ 金のつぶ
    if (gfx > 0) {
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 4; i++) {
        const x = 120 + i * 190 + Math.sin(T * 0.2 + i) * 30;
        const gr = ctx.createLinearGradient(x, 0, x + 120, GROUND_Y);
        gr.addColorStop(0, rgba(dies ? [255, 120, 110] : [255, 246, 220], 0.12 * (dies ? 0.5 : 1))); gr.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = gr; ctx.beginPath(); ctx.moveTo(x - 30, 0); ctx.lineTo(x + 30, 0); ctx.lineTo(x + 170, GROUND_Y); ctx.lineTo(x + 70, GROUND_Y); ctx.closePath(); ctx.fill();
      }
      ctx.fillStyle = dies ? 'rgba(255,140,100,0.7)' : 'rgba(255,236,170,0.8)';
      for (const q of st.motes) { const y = ((q.y - T * q.v) % 500 + 500) % 500 + 160, x = q.x + Math.sin(T * 0.5 + q.p) * 14; ctx.globalAlpha = 0.3 + 0.35 * Math.sin(T * 1.3 + q.p); ctx.fillRect(x, y, q.s, q.s); }
      ctx.globalAlpha = 1; ctx.restore();
    }
    // 遠くの雲の海（流れる）
    const off = (T * 10) % W;
    ctx.globalAlpha = dies ? 0.5 : 0.8; ctx.drawImage(st.clouds, -off, GROUND_Y - 230); ctx.globalAlpha = 1;
    // 嵐（DIES IRAE）: 上から赤黒い雲 ＋ 稲妻
    if (dies) {
      const gr = ctx.createLinearGradient(0, 0, 0, 380); gr.addColorStop(0, 'rgba(40,0,12,0.75)'); gr.addColorStop(1, 'rgba(40,0,12,0)');
      ctx.fillStyle = gr; ctx.fillRect(0, 0, W, 380);
      if (st.bolt) {
        const a = 1 - st.bolt.t / 0.35;
        ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineJoin = 'round';
        for (const [w, c] of [[9, `rgba(255,120,120,${(0.35 * a).toFixed(3)})`], [3, `rgba(255,240,240,${a.toFixed(3)})`]]) {
          ctx.strokeStyle = c; ctx.lineWidth = w; ctx.beginPath(); st.bolt.pts.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.stroke();
        }
        ctx.restore();
      }
    }
    // ハープ ＋ 光る弦
    ctx.drawImage(st.harp, 0, 0);
    drawPlucked(T);
    // 羽根
    for (const q of st.feathers) {
      ctx.save(); ctx.translate(q.x, q.y); ctx.rotate(Math.sin(q.t * 1.5 + q.p) * 0.6);
      ctx.fillStyle = 'rgba(255,255,250,0.85)'; ctx.beginPath(); ctx.ellipse(0, 0, 3, 9, 0, 0, TAU); ctx.fill();
      ctx.strokeStyle = 'rgba(200,190,160,0.8)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(0, -9); ctx.lineTo(0, 10); ctx.stroke();
      ctx.restore();
    }
    // 主題・応答の札
    ctx.save(); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    for (const q of st.labels) {
      const a = q.t < 0.2 ? q.t / 0.2 : q.t > 1.6 ? (2.2 - q.t) / 0.6 : 1, x = Math.max(80, Math.min(W - 80, q.x)), y = SN_PIPE_Y + 54;
      ctx.globalAlpha = clamp01(a);
      ctx.fillStyle = 'rgba(255,252,240,0.92)'; roundRect(x - 60, y - 16, 120, 34, 17); ctx.fill();
      ctx.strokeStyle = rgba(mixC(q.c, [120, 90, 30], 0.35), 0.9); ctx.lineWidth = 1.5; ctx.stroke();
      ctx.font = `700 13px ${SERIF}`; ctx.fillStyle = rgba(mixC(q.c, [90, 60, 20], 0.55), 1); ctx.fillText(q.text, x, y - 5);
      ctx.font = `700 10px ${SERIF}`; ctx.fillStyle = 'rgba(80,60,30,0.85)'; ctx.fillText(q.sub, x, y + 9);
      ctx.beginPath(); ctx.moveTo(x, y - 16); ctx.lineTo(q.x, SN_PIPE_Y + 14); ctx.strokeStyle = rgba(GOLD, 0.7); ctx.stroke();
    }
    ctx.restore();
  }
  // 弾を出す弦: 予告のあいだ光り、出た瞬間にふるえる
  const LIT = new Float32Array(SN_PIPE_HI - SN_PIPE_LO + 1), AGE = new Float32Array(SN_PIPE_HI - SN_PIPE_LO + 1), LITC = new Array(SN_PIPE_HI - SN_PIPE_LO + 1);
  function drawPlucked(T) {
    if (!inSong()) return;
    LIT.fill(0); AGE.fill(9);
    for (const b of bullets) {
      if (b.style !== 'pipe') continue;
      const i = Math.round((b.x - 64) / (W - 128) * (SN_PIPE_HI - SN_PIPE_LO));
      if (i < 0 || i >= LIT.length) continue;
      const v = b.delay > 0 ? 0.2 + 0.5 * (1 - b.delay / b.delayMax) : Math.max(0, 1 - b.age * 2.5);
      if (v > LIT[i]) { LIT[i] = v; LITC[i] = b.color; }
      if (b.delay <= 0) AGE[i] = Math.min(AGE[i], b.age);
    }
    ctx.save(); ctx.lineCap = 'round';
    for (let i = 0; i < LIT.length; i++) {
      if (LIT[i] <= 0.02) continue;
      const m = SN_PIPE_LO + i, x = snPipeX(m), top = SN_PIPE_Y - strLen(m), c = rgb(LITC[i] || '#ffd25a');
      const amp = AGE[i] < 1 ? 4 * Math.exp(-AGE[i] * 5) : 0;
      ctx.strokeStyle = rgba(mixC(c, WHITE, 0.4), 0.5 + 0.5 * LIT[i]); ctx.lineWidth = 2.2;
      ctx.beginPath();
      for (let j = 0; j <= 12; j++) { const y = top + (SN_PIPE_Y - top) * j / 12; ctx.lineTo(x + amp * Math.sin(Math.PI * j / 12) * Math.sin(T * 90 + i), y); }
      ctx.stroke();
      if (gfx > 0) { ctx.globalCompositeOperation = 'lighter'; ctx.drawImage(glowSprite(c), x - 20, SN_PIPE_Y - 20, 40, 40); ctx.globalCompositeOperation = 'source-over'; }
    }
    ctx.restore();
  }

  // ---- 床（雲）と、両はしの白い柱 ---------------------------------------------------------------------
  function floor(look, k, bp) {
    const y = GROUND_Y, T = nowT(), s = inSong() ? sec(bp / 4) : 'title';
    ctx.fillStyle = s === 'dies' ? '#d8c8d0' : '#f4f0fa'; ctx.fillRect(-400, y, W + 800, H - y + 400);
    const off = (T * 18) % W;
    ctx.drawImage(st.cloudFloor, -off - 400 + W, y - 36); ctx.drawImage(st.cloudFloor, -off - 400 - W, y - 36);
    if (gfx > 0) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = rgba(s === 'dies' ? CRIM : GOLD, 0.1 + 0.1 * Math.exp(-(T - st.bellT) * 1.6)); ctx.beginPath(); ctx.ellipse(SN_ROSE.x, y + 18, 180, 16, 0, 0, TAU); ctx.fill(); ctx.restore(); }
    for (const cx of [26, W - 26]) {                                    // 白い柱と、上の聖なる火
      ctx.fillStyle = '#fbf8f0'; ctx.fillRect(cx - 10, y - 110, 20, 110);
      ctx.fillStyle = 'rgba(200,190,170,0.5)'; for (let i = -6; i <= 6; i += 4) ctx.fillRect(cx + i, y - 106, 1.2, 102);
      ctx.fillStyle = '#e0b050'; ctx.fillRect(cx - 14, y - 116, 28, 7); ctx.fillRect(cx - 14, y - 6, 28, 6);
      const fl = 1 + 0.2 * Math.sin(T * 9 + cx) + 0.08 * Math.sin(T * 23);
      if (gfx > 0) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.drawImage(glowSprite(s === 'dies' ? [255, 90, 70] : [255, 230, 160]), cx - 26, y - 150, 52, 52); ctx.restore(); }
      ctx.fillStyle = s === 'dies' ? '#ff7050' : '#fff4c8'; ctx.beginPath(); ctx.ellipse(cx, y - 126 * 1, 5, 11 * fl, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.ellipse(cx, y - 123, 2.5, 5 * fl, 0, 0, TAU); ctx.fill();
    }
  }
  function platform(p, look, k) {                                        // 浮かぶ雲の足場（金のふち）
    ctx.fillStyle = 'rgba(255,255,255,0.95)';
    for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.arc(p.x + 12 + i * (p.w - 24) / 4, p.y + p.h * 0.5, 10 + (i % 2) * 3, 0, TAU); ctx.fill(); }
    roundRect(p.x, p.y, p.w, p.h, 8); ctx.fill();
    ctx.strokeStyle = 'rgba(224,176,80,0.9)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(p.x + 6, p.y + 1); ctx.lineTo(p.x + p.w - 6, p.y + 1); ctx.stroke();
  }

  // ---- 弾 -------------------------------------------------------------------------------------
  function bullet(b, c, k) {
    if (b.style === 'pipe') {                                           // ハープの音の光: 細長いひし形 ＋ 白い芯。主題の音は十字のきらめき
      const r = b.r, hgt = r * 1.9;
      ctx.fillStyle = rgba(c, 1); ctx.beginPath(); ctx.moveTo(b.x, b.y - hgt); ctx.lineTo(b.x + r, b.y); ctx.lineTo(b.x, b.y + hgt); ctx.lineTo(b.x - r, b.y); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = 'rgba(70,45,20,0.85)'; ctx.lineWidth = 1.6; ctx.stroke();   // 明るい雲の上でも見えるように、濃いふち
      ctx.fillStyle = 'rgba(255,255,255,0.95)'; ctx.beginPath(); ctx.moveTo(b.x, b.y - hgt * 0.6); ctx.lineTo(b.x + r * 0.45, b.y); ctx.lineTo(b.x, b.y + hgt * 0.6); ctx.lineTo(b.x - r * 0.45, b.y); ctx.closePath(); ctx.fill();
      if (b.big) { const s = r * (1.6 + 0.3 * Math.sin(b.age * 12)); ctx.strokeStyle = 'rgba(255,255,255,0.85)'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(b.x - s, b.y); ctx.lineTo(b.x + s, b.y); ctx.stroke(); }
      return;
    }
    if (b.style === 'glyph') {                                          // 文字の光: 金のふちの丸 ＋ ラテン文字
      ctx.fillStyle = rgba(mixC(c, [40, 30, 60], 0.5), 0.95); ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, TAU); ctx.fill();
      ctx.strokeStyle = rgba(c, 1); ctx.lineWidth = 2; ctx.stroke();
      ctx.fillStyle = rgba(mixC(c, WHITE, 0.6), 1); ctx.font = `700 ${Math.round(b.r * 1.3)}px ${SERIF}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(b.ch || 'S', b.x, b.y + 1);
      return;
    }
    if (b.style === 'halo') {                                           // 後光のつぶ: 白い芯 ＋ 色の輪
      ctx.fillStyle = '#fffaf0'; ctx.beginPath(); ctx.arc(b.x, b.y, b.r * 0.62, 0, TAU); ctx.fill();
      ctx.strokeStyle = rgba(c, 1); ctx.lineWidth = b.r * 0.55; ctx.beginPath(); ctx.arc(b.x, b.y, b.r * 0.78, 0, TAU); ctx.stroke();
      ctx.strokeStyle = 'rgba(70,45,20,0.8)'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.arc(b.x, b.y, b.r * 1.07, 0, TAU); ctx.stroke();
      return;
    }
    ctx.fillStyle = rgba(c, 1); ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.92)'; ctx.beginPath(); ctx.arc(b.x, b.y, b.r * 0.55, 0, TAU); ctx.fill();
  }
  // 剣（上からの縦のビーム）: 発射すると上に十字のつば。柱（床からの光）: 足もとに光の紋章
  function laser(b, c, T, k) {
    // 明るい空では光のビームが白くとけるので、うしろに暗い帯をしく（予告も、発射中も）
    if (!b.safe || b.delay > 0) {
      ctx.save(); ctx.lineCap = 'butt';
      ctx.strokeStyle = b.delay > 0 ? 'rgba(40,20,50,0.16)' : 'rgba(60,15,30,0.45)'; ctx.lineWidth = b.r * 2 + (b.delay > 0 ? 0 : 8);
      ctx.beginPath(); ctx.moveTo(b.x1, b.y1); ctx.lineTo(b.x2, b.y2); ctx.stroke(); ctx.restore();
    }
    if (b.lstyle === 'sword') {
      const x = b.x1, on = b.delay <= 0 && !b.safe, p = b.delay > 0 ? 1 - b.delay / b.delayMax : 1;
      const y = on ? 170 : 170 - 30 * (1 - p);
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

  // ---- カメラ: 厳格なので、ほとんど動かない。ティンパニで下へ「ずん」と沈み、雲の上でごくゆっくり浮き沈みする --------
  function camera(T, bp, k) {
    const d = T - st.timpT;
    const y = (d >= 0 && d < 0.4 ? 7 * Math.exp(-d * 10) * Math.cos(d * 30) : 0) + Math.sin(T * 0.35) * 3;
    return { y };
  }
  function world(T, look, k) { }
  function flash(look) {
    const T = nowT(), d = inSong() && sec(bpAt(T) / 4) === 'dies';
    ctx.fillStyle = d ? `rgba(255,40,40,${(0.3 * flashT).toFixed(3)})` : `rgba(255,250,230,${(0.45 * flashT).toFixed(3)})`; ctx.fillRect(0, 0, W, H);
  }

  // 画面に固定: 稲妻の光 ／ 全休止の灰色とフェルマータ ／ アーメンの光
  function overlay(T) {
    if (!inSong()) return;
    const bp = snBeatPos(T), s = sec(bp / 4);
    if (s === 'dies') { const d = T - st.timpT; if (d >= 0 && d < 0.3) { ctx.fillStyle = `rgba(255,220,220,${(0.18 * (1 - d / 0.3)).toFixed(3)})`; ctx.fillRect(0, 0, W, H); } }
    for (const g of GP || []) {
      const t0 = snBeatTime(g), t1 = snBeatTime(g + 1);
      if (T >= t0 && T < t1 + 0.2) {
        const a = T < t1 ? clamp01((T - t0) / 0.08) : 1 - (T - t1) / 0.2;
        ctx.fillStyle = `rgba(60,60,80,${(0.45 * a).toFixed(3)})`; ctx.fillRect(0, 0, W, H);
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
        gr.addColorStop(0, `rgba(255,252,236,${(0.6 * a).toFixed(3)})`); gr.addColorStop(1, 'rgba(255,250,230,0)');
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
    ctx.lineWidth = 6; ctx.strokeStyle = 'rgba(60,40,20,0.35)'; ctx.strokeText(name, W / 2, y);
    ctx.fillStyle = rgba(mixC(bn.c, WHITE, 0.55), 1); ctx.fillText(name, W / 2, y);
    ctx.strokeStyle = rgba(GOLD, 0.9); ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(W / 2 - tw / 2 - 30, y - 40); ctx.lineTo(W / 2 + tw / 2 + 30, y - 40); ctx.moveTo(W / 2 - tw / 2 - 30, y + 36); ctx.lineTo(W / 2 + tw / 2 + 30, y + 36); ctx.stroke();
    for (const sx of [-1, 1]) { const dx = W / 2 + sx * (tw / 2 + 30); ctx.fillStyle = rgba(GOLD, 1); ctx.beginPath(); ctx.moveTo(dx, y - 46); ctx.lineTo(dx + 4, y - 40); ctx.lineTo(dx, y - 34); ctx.lineTo(dx - 4, y - 40); ctx.closePath(); ctx.fill(); }
    if (bn.sub) { ctx.font = `400 16px ${SERIF}`; ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(60,40,20,0.4)'; ctx.strokeText(bn.sub, W / 2, y + 58); ctx.fillStyle = '#fff'; ctx.fillText(bn.sub, W / 2, y + 58); }
    ctx.restore();
  }
  // ヒント: 白と金の札
  function hint(h, a, T) {
    ctx.save(); ctx.globalAlpha = clamp01(a);
    ctx.font = `700 21px ${SERIF}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const w = ctx.measureText(h.text).width + 50, x = W / 2 - w / 2, y = H * 0.56;
    ctx.fillStyle = 'rgba(255,252,242,0.95)'; roundRect(x, y, w, 44, 22); ctx.fill();
    ctx.strokeStyle = '#d0a040'; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = '#4a3418'; ctx.fillText(h.text, W / 2, y + 23);
    ctx.restore();
  }
  // タイトル: 光の門のまわりを後光のつぶが回る
  function title(look, k, bp) {
    const T = titleClock();
    for (let i = 0; i < 12; i++) {
      const a = T * 0.3 + i / 12 * TAU, x = SN_ROSE.x + Math.cos(a) * (R0 + 50), y = SN_ROSE.y + Math.sin(a) * (R0 + 50);
      bullet({ style: 'halo', x, y, r: 8 }, i % 2 ? GOLD : [159, 200, 255], k);
    }
  }

  THEMES.sanctus = {
    noTrails: false, noScanlines: true, glow: 1.6,
    clearColors: ['#ffd25a', '#fff6e0', '#9fc8ff', '#ff8ab0', '#c79bff'],
    reset, update, background, floor, platform, bullet, laser, world, flash, hint, banner, title, camera,
  };
  THEMES.sanctus.release = () => { freeArt(st); st.made = false; };
})();
