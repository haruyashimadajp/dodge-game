"use strict";

/* =========================================================================
   見た目のセット「chain」  —  曲㉑「CHAIN REACTION」用
   パステルのからくり部屋。ぜんぶの演出が「拍」と「からくり」でつながっている。

   ・大きなスイッチ: 上から機械のハンマーが振り下ろされて「カチッ」と押す（押す拍に、ぴったり当たるように前から振りかぶる）。
     押されると、星の輪・図形が飛び出し、部屋の色が波のように塗りかわり（色の波紋）、衝撃の輪が広がる
   ・電源 ON: 最初は灰色の部屋。最初のスイッチで、ボタンから色が丸く広がる。最後の OFF で色がボタンへ吸いこまれて消える
   ・窓わくの電球: わくに電球が並んでいて、Aメロは追いかけっこ、サビは拍ごとに全部が光り、ビルドアップは
     カチカチが速くなるほど速く走る。スイッチが切れている間は消えている
   ・ドロップ前の無音（半拍）: 窓のシャッター（横の羽板）が閉まり、ドロップで新しい色の部屋が開く
   ・文字の演出: サビは小節ごとに「SWITCH / ON / CHAIN / REACTION」が背景で跳ね、ビルドアップは「CLICK」が増えていき、
     MACHINE は振り子の横に「tick / tock」
   ・からくり: 背景のレールをビー玉が転がる（曲のビー玉の音に合わせて大きな玉が走る）、両すみの大きな歯車が拍ごとに 30度ずつ回る、
     振り子時計（拍の頭で端に来る）。MACHINE ではこれが主役になる
   ・弾: 一歩進むたびに「ぴょこっ」とふくらみ、残像を残す。次に進む場所を、点線の形でうすく見せる（拍を数えなくても読める）。
     輪の弾は線でつながって「図形」に見える。さくらんぼは床に落ちると果汁がはじける。床のタイルは、真上にさくらんぼが
     落ちてくる所ほど明るく光る（着地点の予告）
   ・カメラ: Aメロはチクタク、サビは拍ごとに大きくゆれ、スイッチで部屋が一回転（stage.spin、窓わくは動かない）
   明るい背景でも見えるように、弾はぜんぶ濃い色のふちどり。重い絵は cachedLayer で 4 コマに 1 回だけ描き直す。
   ========================================================================= */

(function () {
  const INK = [52, 46, 82], WHITE = [255, 255, 255];
  const PASTEL = ['#ff8fb8', '#8fc4ff', '#ffd27a', '#b8a4ff', '#8fe8c4'].map(rgb);
  const VIVID = ['#ff4f8b', '#2f8cff', '#ffa400', '#7c5cff', '#14b885'].map(rgb);
  const FONT = '"Hiragino Maru Gothic ProN", "Arial Rounded MT Bold", "Segoe UI", system-ui, sans-serif';
  const SW = { x: W / 2, y: 170 };                                       // 大きなスイッチ（弾の輪が出てくる所）
  const ARM = { x: 540, y: 52, len: 158 };                               // スイッチを押すハンマーの支点と長さ
  const st = { made: false, bokeh: null, shapes: null, bulbs: null, lastBeat: -99, lastSub: -99, press: -9, pops: [], ripples: [], shocks: [], stamps: [], splashes: [], wordI: 0 };
  let SC = null, SWITCHES = null, SW_LIST = null, OFF = null, GAPS = null, MARBLES = null;
  const inSong = () => scene !== 'title';
  const hsh = (a, b = 0) => { const v = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return v - Math.floor(v); };
  const nowT = () => inSong() ? songTime : titleClock();
  const bpAt = T => inSong() ? crBeatPos(T) : T / CR_BEAT;
  const offT = () => OFF ? crBeatTime(OFF[0]) : 1e9;
  const powered = T => !inSong() || (T >= crBar(4) - 0.05 && T < offT());
  const barOf = T => bpAt(T) / 4;
  const section = br => br < 4 ? 'off' : br < 12 ? 'verse' : br < 20 ? 'pre' : br < 36 ? 'chorus' : br < 44 ? 'machine' : br < 52 ? 'build' : br < 68 ? 'chorus2' : 'outro';

  function data() {
    if (SC) return;
    SC = SCORE_CHAIN; SWITCHES = new Set(SC.switch); SW_LIST = SC.switch.slice().sort((a, b) => a - b); OFF = SC.off; GAPS = SC.gap; MARBLES = SC.marble;
  }
  function make() {
    st.made = true;
    st.bokeh = Array.from({ length: 12 }, (_, i) => ({ x: hsh(i, 1) * W, y: hsh(i, 2) * (GROUND_Y - 80), r: 40 + hsh(i, 3) * 90, c: PASTEL[i % 5], v: 4 + hsh(i, 4) * 8, p: hsh(i, 5) * TAU }));
    st.shapes = Array.from({ length: 12 }, (_, i) => ({ x: 60 + hsh(i, 11) * (W - 120), y: 60 + hsh(i, 12) * (GROUND_Y - 200), s: 30 + hsh(i, 13) * 34, kind: ['triangle', 'square', 'star', 'circle'][i % 4], c: PASTEL[(i * 3) % 5], rot: hsh(i, 14) * TAU, dir: i % 2 ? 1 : -1 }));
    // 窓わくの電球（まわりを一周。左上から時計回り）
    const b = [], m = 9, gap = 38;
    for (let x = m; x < W - m; x += gap) b.push([x, m]);
    for (let y = m; y < H - m; y += gap) b.push([W - m, y]);
    for (let x = W - m; x > m; x -= gap) b.push([x, H - m]);
    for (let y = H - m; y > m; y -= gap) b.push([m, y]);
    st.bulbs = b;
  }
  function reset() {
    if (!st.made) make();
    data();
    Object.assign(st, { lastBeat: -99, lastSub: -99, press: -9, pops: [], ripples: [], shocks: [], stamps: [], splashes: [], wordI: 0 });
  }
  // 弾から呼ばれる: さくらんぼ（や音符）が床に落ちて、はじける
  window.chainSplash = (x, y, c, note) => {
    if (st.splashes.length > 120) return;
    const col = rgb(c || '#ff3b4f');
    for (let i = 0; i < (note ? 4 : 7); i++) {
      const a = -Math.PI * (0.1 + 0.8 * hsh(x + i, y)), v = 90 + 160 * hsh(i, x);
      st.splashes.push({ x, y: y - 3, vx: Math.cos(a) * v, vy: Math.sin(a) * v, t: 0, c: col, s: note ? 3 : 2 + 2.5 * hsh(i, y), note });
    }
    st.splashes.push({ x, y: y - 1, vx: 0, vy: 0, t: 0, c: col, ring: true });
  };

  function stamp(text, x, y, o = {}) {
    if (st.stamps.length > 14) st.stamps.shift();
    st.stamps.push({ text, x, y, t: 0, life: o.life || 0.9, size: o.size || 60, c: o.c || VIVID[st.stamps.length % 5], rot: o.rot != null ? o.rot : (hsh(x, y) - 0.5) * 0.4, a: o.a || 0.35 });
  }
  function onSwitch(b, T) {
    st.press = T;
    if (typeof punch === 'function') punch(0.035);
    for (let i = 0; i < 18; i++) {
      const a = i / 18 * TAU;
      st.pops.push({ x: SW.x, y: SW.y, vx: Math.cos(a) * (180 + hsh(b, i) * 120), vy: Math.sin(a) * (180 + hsh(i, b) * 120), t: 0, kind: ['triangle', 'square', 'star', 'circle'][i % 4], c: VIVID[i % 5], rot: a });
    }
    st.ripples.push({ t: 0, c: VIVID[(b / 4 | 0) % 5] });
    st.shocks.push({ t: 0 }, { t: -0.08 });
  }
  function onBeat(b, T) {
    data();
    if (SWITCHES.has(b) && T < offT()) onSwitch(b, T);
    const sec = section(b / 4);
    if ((sec === 'chorus' || sec === 'chorus2') && b % 4 === 0) {                  // サビ: 小節ごとに大きな文字
      const words = ['SWITCH', 'ON!', 'CHAIN', 'REACTION'];
      stamp(words[st.wordI++ % 4], 140 + hsh(b) * (W - 280), 260 + hsh(b, 2) * 260, { size: 92, life: 4 * CR_BEAT * 0.95, a: 0.28, c: VIVID[(b / 4) % 5] });
    }
    if (sec === 'machine') stamp(b % 2 ? 'tock' : 'tick', W - 150 + (b % 2 ? 40 : -40), 300, { size: 26, life: 0.5, a: 0.55, rot: 0, c: INK });
    if (sec === 'off' && b >= 0) stamp(b % 2 ? 'tock' : 'tick', W - 150 + (b % 2 ? 40 : -40), 300, { size: 22, life: 0.45, a: 0.4, rot: 0, c: INK });
  }
  function onSub(s8, T) {                                                         // 32分ごと: ビルドアップの「CLICK」
    const bp = s8 / 8, br = bp / 4;
    if (section(br) !== 'build') return;
    const j = Math.floor(br - 44), div = j < 2 ? 1 : j < 4 ? 2 : j < 6 ? 4 : 8;
    if (s8 % (8 / div)) return;
    const n = Math.floor(bp * div);
    stamp('CLICK', 90 + hsh(n, 3) * (W - 180), 230 + hsh(n, 4) * 330, { size: 30 + j * 6, life: 0.5, a: 0.3 + j * 0.03, c: VIVID[n % 5] });
  }
  function update(dt, T) {
    if (!st.made) make();
    data();
    if (scene === 'play') {
      const bp = crBeatPos(T), b = Math.floor(bp + 0.02), s8 = Math.floor(bp * 8 + 0.02);
      if (b !== st.lastBeat) { if (b === st.lastBeat + 1) onBeat(b, T); st.lastBeat = b; }
      if (s8 !== st.lastSub) { if (s8 > st.lastSub && s8 - st.lastSub < 4) for (let s = st.lastSub + 1; s <= s8; s++) onSub(s, T); st.lastSub = s8; }
    } else if (scene === 'title') {
      const b = Math.floor(T / CR_BEAT);
      if (b !== st.lastBeat) { st.lastBeat = b; if (b % 8 === 0) { st.press = T; st.shocks.push({ t: 0 }); } }
    }
    for (const q of st.pops) { q.t += dt; q.x += q.vx * dt; q.y += q.vy * dt; q.vx *= 0.97; q.vy = q.vy * 0.97 + 300 * dt; q.rot += dt * 5; }
    st.pops = st.pops.filter(q => q.t < 0.9);
    for (const q of st.splashes) { q.t += dt; if (!q.ring) { q.x += q.vx * dt; q.y += q.vy * dt; q.vy += 700 * dt; } }
    st.splashes = st.splashes.filter(q => q.t < (q.ring ? 0.3 : 0.5));
    for (const arr of [st.ripples, st.shocks, st.stamps]) for (const q of arr) q.t += dt;
    st.ripples = st.ripples.filter(q => q.t < 0.8);
    st.shocks = st.shocks.filter(q => q.t < 0.6);
    st.stamps = st.stamps.filter(q => q.t < q.life);
  }

  // ---- 図形（線だけ）。どれも半径 s くらいの大きさ ------------------------------------------------
  function shapePath(g, kind, s) {
    g.beginPath();
    if (kind === 'triangle') { for (let i = 0; i < 3; i++) { const a = -Math.PI / 2 + i * TAU / 3; i ? g.lineTo(Math.cos(a) * s * 1.15, Math.sin(a) * s * 1.15) : g.moveTo(Math.cos(a) * s * 1.15, Math.sin(a) * s * 1.15); } g.closePath(); }
    else if (kind === 'square') g.rect(-s * 0.85, -s * 0.85, s * 1.7, s * 1.7);
    else if (kind === 'star') { for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? s * 0.5 : s * 1.15; i ? g.lineTo(Math.cos(a) * r, Math.sin(a) * r) : g.moveTo(Math.cos(a) * r, Math.sin(a) * r); } g.closePath(); }
    else g.arc(0, 0, s, 0, TAU);
  }
  function gearPath(g, R, teeth) {
    g.beginPath();
    for (let i = 0; i < teeth * 2; i++) {
      const a0 = i / (teeth * 2) * TAU, a1 = (i + 1) / (teeth * 2) * TAU, r = i % 2 ? R * 0.84 : R;
      g.arc(0, 0, r, a0, a1);
    }
    g.closePath();
  }

  // ---- 背景 ---------------------------------------------------------------------------------
  const RAIL = [[40, 120], [260, 200], [60, 300], [300, 400], [80, 500], [250, 580]];
  const railAt = u => {                                                 // レールの上の位置（u = 0〜1）
    const segs = RAIL.length - 1, f = Math.min(segs - 1e-6, Math.max(0, u) * segs), i = Math.floor(f), p = f - i;
    return [RAIL[i][0] + (RAIL[i + 1][0] - RAIL[i][0]) * p, RAIL[i][1] + (RAIL[i + 1][1] - RAIL[i][1]) * p];
  };
  function skyLayer(g, T, look) {
    vGradient(rgba(look.skyTop, 1), rgba(look.skyBot, 1), g);
    g.strokeStyle = rgba(INK, 0.06); g.lineWidth = 1; g.beginPath();      // 方眼紙
    for (let x = 0; x <= W; x += 40) { g.moveTo(x, 0); g.lineTo(x, H); }
    for (let y = 0; y <= H; y += 40) { g.moveTo(0, y); g.lineTo(W, y); }
    g.stroke();
    for (const q of st.bokeh) {                                         // ふわふわの丸（ぼけた風船）
      const y = ((q.y - T * q.v) % (GROUND_Y + 200) + GROUND_Y + 200) % (GROUND_Y + 200) - 100;
      g.fillStyle = rgba(q.c, 0.22); g.beginPath(); g.arc(q.x + Math.sin(T * 0.3 + q.p) * 20, y, q.r, 0, TAU); g.fill();
    }
    g.lineCap = 'round'; g.lineJoin = 'round';                          // ビー玉のレール（2本の線）
    for (const [col, lw, dy] of [[rgba(INK, 0.22), 4, -3], [rgba(INK, 0.22), 4, 3], [rgba(WHITE, 0.7), 1.5, -3]]) {
      g.strokeStyle = col; g.lineWidth = lw; g.beginPath(); RAIL.forEach(([x, y], i) => i ? g.lineTo(x, y + dy) : g.moveTo(x, y + dy)); g.stroke();
    }
    g.fillStyle = rgba(INK, 0.2);                                        // レールの支柱
    for (const [x, y] of RAIL) g.fillRect(x - 2, y + 4, 4, 30);
  }
  function machineAmt(T) {                                              // からくり（歯車・振り子）の濃さ: MACHINE と OFF で濃い
    if (!inSong()) return 0.5;
    const br = barOf(T);
    return clamp01(1 - Math.abs(br - 40) / 4.6) * 0.75 + (br < 4 || br >= 70 ? 0.55 : 0.25);
  }
  function background(T, look, k, bk, bp) {
    if (!st.made) make();
    data();
    ctx.drawImage(cachedLayer('chainSky', 4, 0, g => skyLayer(g, T, look)), 0, 0, W, H);
    const on = powered(T), mA = machineAmt(T);
    // 色の波紋（スイッチで、部屋の色が丸く塗りかわる）
    for (const q of st.ripples) {
      const p = q.t / 0.8, R = 40 + easeOut(p) * 1000;
      ctx.fillStyle = rgba(mixC(q.c, WHITE, 0.55), 0.3 * (1 - p)); ctx.beginPath(); ctx.arc(SW.x, SW.y, R, 0, TAU); ctx.fill();
      ctx.strokeStyle = rgba(q.c, 0.5 * (1 - p)); ctx.lineWidth = 10 * (1 - p) + 2; ctx.stroke();
    }
    // 大きな歯車（両すみ）: 拍ごとに 30度ずつ回る
    const v = crSnap(bp, 0.22);
    ctx.save(); ctx.lineJoin = 'round';
    for (const [gx, gy, R, dir, n] of [[70, GROUND_Y - 70, 120, 1, 12], [W - 60, GROUND_Y - 150, 90, -1, 10], [W - 150, GROUND_Y - 30, 55, 1, 8]]) {
      ctx.save(); ctx.translate(gx, gy); ctx.rotate(dir * v * TAU / n);   // 1拍で歯1つぶん
      gearPath(ctx, R, n); ctx.fillStyle = rgba(WHITE, 0.25 * mA + 0.1); ctx.fill();
      ctx.strokeStyle = rgba(INK, 0.35 * mA); ctx.lineWidth = 3; ctx.stroke();
      ctx.beginPath(); ctx.arc(0, 0, R * 0.25, 0, TAU); ctx.stroke();
      for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2; ctx.beginPath(); ctx.moveTo(Math.cos(a) * R * 0.25, Math.sin(a) * R * 0.25); ctx.lineTo(Math.cos(a) * R * 0.75, Math.sin(a) * R * 0.75); ctx.stroke(); }
      ctx.restore();
    }
    // 振り子時計（右上）: 拍の頭で端に来る
    {
      const px = W - 150, py = 120, L = 150, a = 0.42 * Math.cos(Math.PI * bp);
      ctx.globalAlpha = 0.25 + 0.6 * mA;
      ctx.fillStyle = '#fff'; roundRect(px - 46, py - 74, 92, 80, 14); ctx.fill(); ctx.strokeStyle = rgba(INK, 0.8); ctx.lineWidth = 2.5; ctx.stroke();
      ctx.beginPath(); ctx.arc(px, py - 34, 28, 0, TAU); ctx.stroke();
      const hr = bp * TAU / 48, mn = crSnap(bp, 0.2) * TAU / 16;
      ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(px, py - 34); ctx.lineTo(px + Math.sin(hr) * 14, py - 34 - Math.cos(hr) * 14); ctx.moveTo(px, py - 34); ctx.lineTo(px + Math.sin(mn) * 22, py - 34 - Math.cos(mn) * 22); ctx.stroke();
      const bx = px + Math.sin(a) * L, by = py + Math.cos(a) * L;
      ctx.strokeStyle = rgba(INK, 0.7); ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(px, py + 4); ctx.lineTo(bx, by); ctx.stroke();
      ctx.fillStyle = rgba(VIVID[2], 1); ctx.beginPath(); ctx.arc(bx, by, 14, 0, TAU); ctx.fill(); ctx.stroke();
      ctx.globalAlpha = 1;
    }
    // 拍で 45度ずつ回る図形
    const n = on ? Math.round(6 + 1.5 * (look.tier || 0)) : 5;
    for (let i = 0; i < Math.min(n, st.shapes.length); i++) {
      const q = st.shapes[i], sc = 1 + 0.18 * k * (on ? 1 : 0);
      ctx.save(); ctx.translate(q.x, q.y); ctx.rotate(q.rot + (on ? q.dir * v * Math.PI / 4 : 0)); ctx.scale(sc, sc);
      shapePath(ctx, q.kind, q.s); ctx.strokeStyle = rgba(q.c, on ? 0.42 : 0.22); ctx.lineWidth = 6; ctx.stroke();   // 背景の図形は大きく、うすく（弾とまちがえないように）
      ctx.restore();
    }
    ctx.restore();
    // 文字の演出（スタンプ）: ポンと出て、少し大きくなりながら消える
    ctx.save(); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
    for (const q of st.stamps) {
      const p = q.t / q.life, pop = p < 0.12 ? 0.6 + 0.4 * easeOut(p / 0.12) + 0.15 * Math.sin(p / 0.12 * Math.PI) : 1 + 0.08 * (p - 0.12);
      ctx.save(); ctx.translate(q.x, q.y); ctx.rotate(q.rot); ctx.scale(pop, pop);
      ctx.globalAlpha = q.a * (p > 0.7 ? (1 - p) / 0.3 : 1);
      ctx.font = `900 ${q.size}px ${FONT}`;
      ctx.lineWidth = Math.max(3, q.size * 0.08); ctx.strokeStyle = rgba(q.c, 1); ctx.strokeText(q.text, 0, 0);
      ctx.fillStyle = '#ffffff'; ctx.fillText(q.text, 0, 0);
      ctx.restore();
    }
    ctx.restore();
    // レールのビー玉: 曲にビー玉の音がある間は大きな玉が上から下へ走る。ほかは小さな玉がゆっくり回る
    const mb = MARBLES && MARBLES.find(([b0, L]) => bp >= b0 && bp < b0 + L + 0.5);
    if (mb) { const u = (bp - mb[0]) / mb[1], [mx, my] = railAt(u); marble(mx, my - 12, 12, VIVID[1]); }
    else if (on) { const [mx, my] = railAt((bp / 8) % 1); ctx.globalAlpha = 0.6; marble(mx, my - 8, 7, VIVID[1]); ctx.globalAlpha = 1; }
  }

  // ---- 床・スイッチ・ハンマー・足場（カメラの中）。弾より先に描く ---------------------------------------------
  const GLOW = new Float32Array(16), GROUPS = new Map();
  function floor(look, k, bp) {
    const y = GROUND_Y, T = nowT(), on = powered(T);
    ctx.fillStyle = '#f7f5fb'; ctx.fillRect(-400, y, W + 800, H - y + 400);
    const tw = 50, lit = Math.floor(bp) % 16;
    // 着地点の予告: 真上にさくらんぼが落ちてくるタイルほど明るい
    const glow = GLOW; glow.fill(0);
    if (inSong()) for (const b of bullets) {
      if (b.delay > 0 || (b.style !== 'cherry' && b.style !== 'note') || b.y < 0) continue;
      const i = Math.floor(b.x / tw); if (i >= 0 && i < 16) glow[i] = Math.max(glow[i], clamp01((b.y - 120) / (GROUND_Y - 160)));
    }
    for (let i = -8; i < 24; i++) {
      const x = i * tw, ii = ((i % 16) + 16) % 16;
      if (i >= 0 && i < 16 && glow[i] > 0.02) { ctx.fillStyle = rgba(VIVID[0], 0.12 + 0.45 * glow[i]); ctx.fillRect(x, y, tw, 24); }
      else if (on && ii === lit) { ctx.fillStyle = rgba(look.color, 0.35 + 0.3 * k); ctx.fillRect(x, y, tw, 24); }
      else if ((i + 100) % 2 === 0) { ctx.fillStyle = 'rgba(52,46,82,0.05)'; ctx.fillRect(x, y, tw, 24); }
    }
    ctx.strokeStyle = rgba(INK, 0.15); ctx.lineWidth = 1; ctx.beginPath();
    for (let i = -8; i < 24; i++) { ctx.moveTo(i * tw, y); ctx.lineTo(i * tw, y + 24); }
    ctx.moveTo(-400, y + 24); ctx.lineTo(W + 400, y + 24); ctx.stroke();
    ctx.fillStyle = rgba(look.color, 0.9); ctx.fillRect(-400, y, W + 800, 4);
    if (inSong()) { drawSwitch(T, k, on); drawArm(T, bp); drawLinks(T, bp); }
  }
  function drawSwitch(T, k, on) {
    const press = clamp01(1 - (T - st.press) / 0.22), x = SW.x, y = SW.y;
    ctx.fillStyle = 'rgba(52,46,82,0.12)'; roundRect(x - 52, y - 8, 104, 46, 12); ctx.fill();
    ctx.fillStyle = '#ffffff'; roundRect(x - 50, y - 12, 100, 44, 12); ctx.fill();
    ctx.strokeStyle = rgba(INK, 0.8); ctx.lineWidth = 3; ctx.stroke();
    const by = y - 12 + press * 9, col = on ? VIVID[0] : [170, 176, 192];
    ctx.fillStyle = rgba(mixC(col, INK, 0.35), 1); ctx.beginPath(); ctx.ellipse(x, by + 6, 32, 12, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = rgba(col, 1); ctx.beginPath(); ctx.ellipse(x, by, 32, 12, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = rgba(INK, 0.8); ctx.lineWidth = 2.5; ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.7)'; ctx.beginPath(); ctx.ellipse(x - 10, by - 3, 10, 3.5, -0.2, 0, TAU); ctx.fill();
    ctx.font = `900 13px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = rgba(on ? VIVID[0] : INK, 0.9); ctx.fillText(on ? 'ON' : 'OFF', x, y + 20);
    if (on) {                                                            // ON のランプ
      ctx.fillStyle = rgba(VIVID[4], 0.6 + 0.4 * k); ctx.beginPath(); ctx.arc(x + 38, y + 20, 4, 0, TAU); ctx.fill();
    }
    if (press > 0) {                                                     // 押した時の「カチッ」の線
      ctx.strokeStyle = rgba(VIVID[2], press); ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.beginPath();
      for (let i = 0; i < 6; i++) { const a = -Math.PI * (0.15 + i * 0.14); ctx.moveTo(x + Math.cos(a) * 46, by + Math.sin(a) * 30); ctx.lineTo(x + Math.cos(a) * 64, by + Math.sin(a) * 44); }
      ctx.stroke();
      ctx.font = `900 ${Math.round(16 + 8 * press)}px ${FONT}`; ctx.fillStyle = rgba(VIVID[2], press); ctx.fillText('カチッ', x - 86, by - 30 - 10 * (1 - press));
    }
  }
  // スイッチを押すハンマー: 押す拍の 0.4 拍前から振りかぶり、ぴったりその拍に当たる
  function drawArm(T, bp) {
    if (!SW_LIST) return;
    let nb = null, pb = null;
    for (const s of SW_LIST) { if (s >= bp - 0.6 && nb == null && s >= bp) nb = s; if (s <= bp && s > bp - 0.6) pb = s; }
    const A_HIT = Math.atan2(SW.y - 22 - ARM.y, SW.x - ARM.x), A_UP = A_HIT + 0.95;
    let a = A_UP;
    if (pb != null) { const p = (bp - pb) / 0.6; a = A_HIT + (A_UP - A_HIT) * easeOut(p); }
    else if (nb != null && nb - bp < 0.4) { const p = 1 - (nb - bp) / 0.4; a = A_UP + (A_HIT - A_UP) * p * p * p; }
    if (inSong() && T >= offT() + 0.4) a = A_UP;
    const hx = ARM.x + Math.cos(a) * ARM.len, hy = ARM.y + Math.sin(a) * ARM.len;
    ctx.save(); ctx.lineCap = 'round';
    ctx.strokeStyle = rgba(INK, 0.85); ctx.lineWidth = 7; ctx.beginPath(); ctx.moveTo(ARM.x, ARM.y); ctx.lineTo(hx, hy); ctx.stroke();
    ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 3; ctx.stroke();
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(ARM.x, ARM.y, 9, 0, TAU); ctx.fill(); ctx.strokeStyle = rgba(INK, 0.85); ctx.lineWidth = 2.5; ctx.stroke();
    ctx.translate(hx, hy); ctx.rotate(a);                                // ハンマーの頭（棒に直角）
    ctx.fillStyle = rgba(VIVID[3], 1); roundRect(-10, -20, 22, 40, 6); ctx.fill(); ctx.strokeStyle = rgba(INK, 0.9); ctx.lineWidth = 2.5; ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.fillRect(-6, -16, 4, 32);
    ctx.restore();
  }
  // 輪の弾どうしを線でつなぐ（図形に見える）＋ 次に進む所を点線でうすく見せる
  function drawLinks(T, bp) {
    const groups = GROUPS; groups.clear();
    for (const b of bullets) {
      if (b.delay > 0 || b.grp == null) continue;
      let g = groups.get(b.grp); if (!g) groups.set(b.grp, g = []); g.push(b);
    }
    ctx.save(); ctx.lineJoin = 'round';
    for (const g of groups.values()) {
      if (g.length < 3) continue;
      g.sort((a, b) => a.gi - b.gi);
      const fr = (g[0].st || 0) % 1, c = bulletColor(g[0]);
      const edge = Math.hypot(g[1].x - g[0].x, g[1].y - g[0].y), fade = clamp01(1 - (edge - 70) / 90);   // 輪が広がったら線は消す（画面を横切る線にならないように）
      if (fade <= 0) continue;
      ctx.strokeStyle = rgba(c, (0.2 + 0.35 * (1 - Math.min(1, fr / 0.4))) * fade); ctx.lineWidth = 2;
      ctx.beginPath(); g.forEach((b, i) => i ? ctx.lineTo(b.x, b.y) : ctx.moveTo(b.x, b.y)); ctx.closePath(); ctx.stroke();
    }
    // 次の一歩の場所（拍の後半だけ）
    const f = bp - Math.floor(bp);
    if (f > 0.45) {
      ctx.setLineDash([3, 4]); ctx.lineWidth = 1.5;
      for (const b of bullets) {
        if (b.delay > 0 || !b.at || b.style === 'cherry' || b.style === 'note') continue;
        const s = b.st || 0, n = Math.round(s) + 1, q = b.at(n);
        if (b.div !== 1) continue;
        ctx.strokeStyle = rgba(bulletColor(b), (f - 0.45) * 1.2);
        if (b.style === 'shape') { ctx.save(); ctx.translate(q.x, q.y); ctx.rotate((b.rot0 || 0) + (Math.floor(bp) + 1) * Math.PI / 4); shapePath(ctx, b.shape || 'circle', b.r * 1.15); ctx.stroke(); ctx.restore(); }
        else { ctx.strokeRect(q.x - b.r, q.y - b.r, b.r * 2, b.r * 2); }
      }
      ctx.setLineDash([]);
    }
    ctx.restore();
  }
  function platform(p, look, k) {
    ctx.fillStyle = 'rgba(52,46,82,0.12)'; roundRect(p.x + 3, p.y + 4, p.w, p.h, 6); ctx.fill();
    ctx.fillStyle = rgba(mixC(look.color, WHITE, 0.72), 0.95); roundRect(p.x, p.y, p.w, p.h, 6); ctx.fill();
    ctx.strokeStyle = rgba(INK, 0.75); ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = rgba(INK, 0.5);
    for (const bx of [p.x + 8, p.x + p.w - 8]) { ctx.beginPath(); ctx.arc(bx, p.y + p.h / 2, 2.2, 0, TAU); ctx.fill(); }
    // 拍で光が足場の上を走る
    const f = (bpAt(nowT()) % 1);
    ctx.fillStyle = rgba(look.color, 0.5 * (1 - f)); ctx.fillRect(p.x + 6 + (p.w - 24) * f, p.y + 3, 12, 2);
    ctx.fillStyle = 'rgba(255,255,255,0.8)'; ctx.fillRect(p.x + 14, p.y + 3, p.w - 28, 1.5);
  }

  // ---- 弾 -------------------------------------------------------------------------------------
  function marble(x, y, r, c) {
    ctx.fillStyle = rgba(c, 1); ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
    ctx.fillStyle = rgba(mixC(c, WHITE, 0.55), 1); ctx.beginPath(); ctx.arc(x - r * 0.15, y - r * 0.15, r * 0.6, 0, TAU); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(x - r * 0.38, y - r * 0.38, r * 0.22, 0, TAU); ctx.fill();
    ctx.strokeStyle = rgba(INK, 0.9); ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.stroke();
  }
  function cherryShape(x, y, r, c, sway) {
    // アイワナのデリシャスフルーツ: まるい実 ＋ つや ＋ くき ＋ 葉っぱ
    ctx.strokeStyle = rgba(INK, 0.95); ctx.lineWidth = 2; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x + r * 0.1, y - r * 0.8); ctx.quadraticCurveTo(x + r * 0.2 + sway, y - r * 1.5, x + r * 0.7 + sway, y - r * 1.75); ctx.stroke();
    ctx.fillStyle = '#3fbf6a'; ctx.beginPath(); ctx.ellipse(x + r * 0.75 + sway, y - r * 1.65, r * 0.45, r * 0.2, -0.5, 0, TAU); ctx.fill();
    ctx.fillStyle = rgba(c, 1); ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
    ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.85)'; ctx.beginPath(); ctx.ellipse(x - r * 0.38, y - r * 0.32, r * 0.26, r * 0.18, -0.6, 0, TAU); ctx.fill();
  }
  function noteShape(x, y, r, c) {
    ctx.strokeStyle = rgba(INK, 0.95); ctx.lineWidth = 2;
    ctx.fillStyle = rgba(c, 1);
    ctx.beginPath(); ctx.moveTo(x + r * 0.8, y); ctx.lineTo(x + r * 0.8, y - r * 2.3); ctx.quadraticCurveTo(x + r * 1.9, y - r * 1.9, x + r * 1.8, y - r * 1.1); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(x, y, r, r * 0.8, -0.35, 0, TAU); ctx.fill(); ctx.stroke();
  }
  function body(b, c, x, y, sc, T) {
    if (b.style === 'cherry') { ctx.save(); ctx.translate(x, y); ctx.scale(1 / sc, sc); cherryShape(0, 0, b.r, c, Math.sin((b.st || 0) * 1.7) * 2); ctx.restore(); return; }
    if (b.style === 'note') { ctx.save(); ctx.translate(x, y); ctx.scale(sc, sc); noteShape(0, 0, b.r, c); ctx.restore(); return; }
    if (b.style === 'shape') {
      const rot = (b.rot0 || 0) + crSnap(bpAt(T), 0.25) * Math.PI / 4;
      ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(sc, sc); ctx.lineJoin = 'round';
      shapePath(ctx, b.shape || 'circle', b.r * 1.15);
      ctx.fillStyle = 'rgba(255,255,255,0.9)'; ctx.fill();
      ctx.strokeStyle = rgba(INK, 0.9); ctx.lineWidth = 5.5; ctx.stroke();
      ctx.strokeStyle = rgba(c, 1); ctx.lineWidth = 3.5; ctx.stroke();
      ctx.restore();
      return;
    }
    if (b.style === 'block') {                                          // ドミノのブロック（目が2つ）。一歩ごとに、つぶれてのびる
      const sx = 1 + (sc - 1) * 1.4, sy = 1 / sx;
      ctx.save(); ctx.translate(x, y + b.r * (1 - sy)); ctx.scale(sx, sy);
      ctx.fillStyle = rgba(c, 1); roundRect(-b.r, -b.r, b.r * 2, b.r * 2, 4); ctx.fill();
      ctx.strokeStyle = rgba(INK, 0.95); ctx.lineWidth = 2; ctx.stroke();
      ctx.fillStyle = '#fff'; for (const dy of [-0.45, 0.45]) { ctx.beginPath(); ctx.arc(0, dy * b.r, b.r * 0.22, 0, TAU); ctx.fill(); }
      ctx.restore();
      return;
    }
    if (b.style === 'wall') {
      ctx.save(); ctx.translate(x, y); ctx.scale(sc, sc);
      ctx.fillStyle = rgba(c, 1); roundRect(-b.r, -b.r, b.r * 2, b.r * 2, 3); ctx.fill();
      ctx.strokeStyle = rgba(INK, 0.9); ctx.lineWidth = 2; ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.fillRect(-b.r + 3, -b.r + 3, b.r * 0.6, 2);
      ctx.restore();
      return;
    }
    ctx.fillStyle = rgba(c, 1); ctx.beginPath(); ctx.arc(x, y, b.r, 0, TAU); ctx.fill();
    ctx.strokeStyle = rgba(INK, 0.9); ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.8)'; ctx.beginPath(); ctx.arc(x - b.r * 0.3, y - b.r * 0.3, b.r * 0.3, 0, TAU); ctx.fill();
  }
  function bullet(b, c, k) {
    const T = nowT();
    if (b.style === 'roller') { marble(b.x, b.y, b.r, c); return; }
    if (b.style === 'spring') {                                         // ばねのボール: 下にコイル。着地の所に影
      const top = b.y + b.r, len = Math.max(4, GROUND_Y - top), sh = clamp01(1 - len / 160);
      ctx.fillStyle = `rgba(52,46,82,${(0.1 + 0.25 * sh).toFixed(3)})`; ctx.beginPath(); ctx.ellipse(b.x, GROUND_Y - 1, b.r * (0.6 + 0.6 * sh), 4, 0, 0, TAU); ctx.fill();
      ctx.strokeStyle = rgba(INK, 0.8); ctx.lineWidth = 2; ctx.beginPath();
      for (let i = 0; i <= 8; i++) { const yy = top + len * i / 8, xx = b.x + (i % 2 ? 7 : -7) * (i === 0 || i === 8 ? 0 : 1); i ? ctx.lineTo(xx, yy) : ctx.moveTo(xx, yy); }
      ctx.stroke();
      marble(b.x, b.y, b.r, c);
      return;
    }
    // 一歩のとちゅう: ふくらんで、うしろに残像
    const s = b.st || 0, fr = s - Math.floor(s), moving = b.at && fr > 0.001 && fr < 0.999;
    const sc = moving ? 1 + 0.22 * Math.sin(Math.PI * fr) : 1;
    if (moving && gfx > 0) {
      for (const [d, a] of [[0.35, 0.18], [0.18, 0.3]]) {
        const q = b.at(Math.max(Math.floor(s), s - d));
        ctx.globalAlpha = a; body(b, c, q.x, q.y, 1, T);
      }
      ctx.globalAlpha = 1;
    }
    body(b, c, b.x, b.y, sc, T);
  }
  // ドミノ（飾り。当たらない）: 棚の上に立ち、倒れる時刻に根元を軸にパタンと倒れる
  function dominoK(b, T) {
    const c = bulletColor(b), w = 14, h = 34;
    const p = clamp01((T - b.fall) / 0.12), a = p * p * Math.PI / 2 * b.dir;
    const wob = T < b.fall ? Math.sin(T * 40) * 0.05 * clamp01(1 - (b.fall - T) / 0.4) : 0;
    const al = clamp01(1.4 - (T - b.fall) / 0.6);
    ctx.save(); ctx.globalAlpha = al;
    ctx.fillStyle = rgba(INK, 0.5); ctx.fillRect(b.x - 30, b.y + h / 2, 60, 4);       // 棚
    ctx.translate(b.x + (b.dir > 0 ? w / 2 : -w / 2), b.y + h / 2); ctx.rotate(a + wob);
    ctx.fillStyle = rgba(c, 1); roundRect(b.dir > 0 ? -w : 0, -h, w, h, 3); ctx.fill();
    ctx.strokeStyle = rgba(INK, 0.9); ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc((b.dir > 0 ? -w / 2 : w / 2), -h * 0.7, 2, 0, TAU); ctx.arc((b.dir > 0 ? -w / 2 : w / 2), -h * 0.3, 2, 0, TAU); ctx.fill();
    ctx.restore();
    if (p > 0 && p < 1) { ctx.strokeStyle = rgba(c, 1 - p); ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(b.x, b.y + h / 2, 10 + 14 * p, Math.PI, TAU); ctx.stroke(); }
  }

  // ---- カメラ: 拍に合わせて部屋が動く（見た目だけ）---------------------------------------------------
  function camera(T, bp, k) {
    if (!inSong()) return { y: -5 * k, rot: 0.02 * Math.cos(Math.PI * crSnap(bp, 0.25)) };
    const br = bp / 4;
    if (br < 4 || br >= 68) return null;
    const v = crSnap(bp, 0.25);
    if (br < 12) return { rot: 0.022 * Math.cos(Math.PI * v), y: -5 * k };                       // チクタク: 拍ごとに左右へ
    if (br < 20) return { rot: 0.03 * Math.sin(bp * Math.PI / 4), x: 12 * Math.sin(bp * Math.PI / 4) };   // ゆっくりゆれる
    if (br < 36 || br >= 52) {                                                                     // サビ: 拍ごとに大きく
      const A = br >= 52 ? 0.045 : 0.035;
      return { rot: A * Math.cos(Math.PI * v), y: -9 * k, x: 14 * Math.cos(Math.PI * crSnap(bp / 2, 0.15)) };
    }
    if (br < 44) return { rot: 0.012 * Math.sin(bp * Math.PI / 8) };
    const j = br - 44, div = j < 2 ? 1 : j < 4 ? 2 : j < 6 ? 4 : 8;                                // ビルドアップ: カチカチが速くなる
    return { rot: (0.01 + 0.004 * j) * Math.cos(Math.PI * crSnap(bp * div, 0.3)), y: -4 * k };
  }

  // ---- カメラの中の手前: スイッチから飛び出す図形・衝撃の輪・果汁 ---------------------------------------------
  function world(T, look, k) {
    ctx.lineJoin = 'round';
    for (const q of st.shocks) {
      if (q.t < 0) continue;
      const p = q.t / 0.6;
      ctx.strokeStyle = rgba(VIVID[2], 0.7 * (1 - p)); ctx.lineWidth = 6 * (1 - p) + 1;
      ctx.beginPath(); ctx.arc(SW.x, SW.y, 30 + easeOut(p) * 260, 0, TAU); ctx.stroke();
    }
    for (const q of st.pops) {
      ctx.save(); ctx.globalAlpha = clamp01(1 - q.t / 0.9); ctx.translate(q.x, q.y); ctx.rotate(q.rot);
      shapePath(ctx, q.kind, 7); ctx.strokeStyle = rgba(q.c, 1); ctx.lineWidth = 3; ctx.stroke();
      ctx.restore();
    }
    for (const q of st.splashes) {
      if (q.ring) { const p = q.t / 0.3; ctx.strokeStyle = rgba(q.c, 0.7 * (1 - p)); ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(q.x, q.y, 6 + 22 * p, 3 + 5 * p, 0, 0, TAU); ctx.stroke(); continue; }
      ctx.globalAlpha = clamp01(1 - q.t / 0.5); ctx.fillStyle = rgba(q.c, 1);
      ctx.beginPath(); ctx.arc(q.x, q.y, q.s, 0, TAU); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
  function flash(look) {
    ctx.fillStyle = `rgba(255,255,255,${(0.45 * flashT).toFixed(3)})`; ctx.fillRect(0, 0, W, H);
  }

  // ---- 画面に固定（いちばん上）: 電源の色 ／ シャッター ／ 窓わくと電球 ---------------------------------------
  function overlay(T) {
    const bp = bpAt(T);
    if (inSong()) {
      // 電源: スイッチが切れている間は灰色。ON でボタンから色が丸く広がり、OFF でボタンへ吸いこまれる
      const tOn = crBar(4), tOff = offT();
      let R = -1;
      if (T < tOn) R = 0;
      else if (T < tOn + 0.7) R = easeOut((T - tOn) / 0.7) * 1100;
      else if (T >= tOff) R = Math.max(0, 1 - (T - tOff) / 0.5) * 1100;
      if (R >= 0 && R < 1100) {
        ctx.save(); ctx.beginPath(); ctx.rect(0, 0, W, H); if (R > 0) { ctx.moveTo(SW.x + R, SW.y); ctx.arc(SW.x, SW.y, R, 0, TAU, true); }
        ctx.fillStyle = 'rgba(120,122,140,0.32)'; ctx.fill('evenodd');
        if (R > 0) { ctx.strokeStyle = 'rgba(255,255,255,0.9)'; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(SW.x, SW.y, R, 0, TAU); ctx.stroke(); }
        ctx.restore();
      }
      // ドロップ前の無音: 窓のシャッター（横の羽板）が閉まり、ドロップで開く。羽板どうしにはすき間を残す（弾が見えるように）
      for (const g of GAPS || []) {
        const t0 = crBeatTime(g), t1 = crBeatTime(g + 0.5);
        let c = 0;
        if (T >= t0 - 0.03 && T < t1) c = easeOut((T - t0 + 0.03) / (t1 - t0) * 1.4);
        else if (T >= t1 && T < t1 + 0.28) c = 1 - easeOut((T - t1) / 0.28);
        if (c <= 0.01) continue;
        const n = 10, sh = H / n, col = VIVID[Math.round(g) % 5];
        for (let i = 0; i < n; i++) {
          const hgt = sh * 0.5 * clamp01(c), y = i * sh + (T < t1 ? 0 : sh * 0.5 - hgt);
          ctx.fillStyle = rgba(mixC(col, WHITE, i % 2 ? 0.35 : 0.15), 0.72); ctx.fillRect(0, y, W, hgt);
          ctx.fillStyle = rgba(INK, 0.25); ctx.fillRect(0, y + hgt - 2, W, 2);
        }
        if (c > 0.8 && T < t1) { ctx.font = `900 64px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#fff'; ctx.strokeStyle = rgba(INK, 0.8); ctx.lineWidth = 6; ctx.strokeText('READY…', W / 2, H * 0.45); ctx.fillText('READY…', W / 2, H * 0.45); }
      }
    }
    // ガラスの窓わく（部屋が回っても、わくは動かない）
    ctx.save();
    ctx.strokeStyle = 'rgba(196,208,224,0.95)'; ctx.lineWidth = 16; ctx.strokeRect(8, 8, W - 16, H - 16);
    ctx.strokeStyle = rgba(INK, 0.35); ctx.lineWidth = 2; ctx.strokeRect(16, 16, W - 32, H - 32);
    ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = 2; ctx.strokeRect(3, 3, W - 6, H - 6);
    // 電球: 区間ごとに光り方が変わる
    const on = powered(T), br = bp / 4, sec = inSong() ? section(br) : 'chorus', N = st.bulbs.length;
    const k = kickOf(bp);
    for (let i = 0; i < N; i++) {
      const [x, y] = st.bulbs[i];
      let lit = 0, col = VIVID[i % 5];
      if (on) {
        if (sec === 'verse') lit = (i + Math.floor(bp * 2)) % 4 === 0 ? 1 : 0.15;
        else if (sec === 'pre') lit = Math.abs(((i / N + bp / 8) % 1) - 0.5) < 0.12 ? 1 : 0.15;                 // 光の帯が一周する
        else if (sec === 'chorus' || sec === 'chorus2') lit = (i + Math.floor(bp)) % 2 === 0 ? 0.35 + 0.65 * k : 0.25;
        else if (sec === 'machine') lit = (i % 8 === Math.floor(bp) % 8) ? 1 : 0.12;
        else if (sec === 'build') { const j = Math.max(0, Math.floor(br - 44)), div = j < 2 ? 2 : j < 4 ? 4 : j < 6 ? 8 : 16; lit = (i + Math.floor(bp * div)) % 6 === 0 ? 1 : 0.15; }
        else lit = 0.35;
      }
      ctx.fillStyle = lit > 0.3 ? rgba(mixC(col, WHITE, 0.25), lit) : 'rgba(150,156,175,0.6)';
      ctx.beginPath(); ctx.arc(x, y, 4.2, 0, TAU); ctx.fill();
      if (lit > 0.6 && gfx > 0) { ctx.fillStyle = rgba(col, 0.25 * lit); ctx.beginPath(); ctx.arc(x, y, 9, 0, TAU); ctx.fill(); }
    }
    ctx.restore();
  }
  // ヒント: 白い吹き出し
  function hint(h, a, T) {
    ctx.save(); ctx.globalAlpha = clamp01(a);
    ctx.font = `800 24px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const w = ctx.measureText(h.text).width + 48, x = W / 2 - w / 2, y = H * 0.36 - 26 + Math.sin(T * 4) * 3;
    ctx.fillStyle = 'rgba(52,46,82,0.2)'; roundRect(x + 4, y + 5, w, 52, 26); ctx.fill();
    ctx.fillStyle = '#fff'; roundRect(x, y, w, 52, 26); ctx.fill();
    ctx.strokeStyle = rgba(INK, 0.8); ctx.lineWidth = 3; ctx.stroke();
    ctx.fillStyle = rgba(INK, 1); ctx.fillText(h.text, W / 2, y + 27);
    ctx.restore();
  }
  // 場面の名前: 白いラベルが「カチッ」と出る（少し回ってから止まる）。文字は一文字ずつ跳ねる
  function banner() {
    overlay(songTime);
    const bn = fx.banner;
    if (!bn) return;
    const e = bn.age, DUR = 2.4;
    if (e > DUR) { fx.banner = null; return; }
    const a = e > DUR - 0.4 ? (DUR - e) / 0.4 : 1, pop = e < 0.2 ? 0.5 + 0.5 * easeOut(e / 0.2) : 1, rot = e < 0.25 ? (1 - e / 0.25) * -0.25 : 0;
    ctx.save(); ctx.globalAlpha = clamp01(a); ctx.translate(W / 2, 112); ctx.rotate(rot); ctx.scale(pop, pop);
    ctx.font = `900 32px ${FONT}`;
    const tw = ctx.measureText(bn.name).width, w = Math.max(260, tw + 70);
    ctx.fillStyle = 'rgba(52,46,82,0.25)'; roundRect(-w / 2 + 5, -32, w, 70, 20); ctx.fill();
    ctx.fillStyle = '#fff'; roundRect(-w / 2, -36, w, 70, 20); ctx.fill();
    ctx.strokeStyle = rgba(bn.c, 1); ctx.lineWidth = 4; ctx.stroke();
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    let x = -tw / 2;
    const bp = bpAt(songTime);
    for (let i = 0; i < bn.name.length; i++) {
      const ch = bn.name[i], cw = ctx.measureText(ch).width, jump = Math.max(0, Math.sin((bp * 2 - i * 0.25) * Math.PI)) * 4;
      ctx.fillStyle = rgba(mixC(VIVID[i % 5], INK, 0.15), 1); ctx.fillText(ch, x, -10 - jump);
      x += cw;
    }
    if (bn.sub) { ctx.textAlign = 'center'; ctx.font = `700 14px ${FONT}`; ctx.fillStyle = rgba(INK, 0.8); ctx.fillText(bn.sub, 0, 18); }
    ctx.restore();
  }

  // タイトル: スイッチのまわりを図形とさくらんぼが回る
  function title(look, k, bp) {
    const T = titleClock();
    for (let i = 0; i < 10; i++) {
      const a = crSnap(bp, 0.25) * Math.PI / 8 + i / 10 * TAU, x = W / 2 + Math.cos(a) * 250, y = 280 + Math.sin(a) * 110;
      if (i % 2) cherryShape(x, y, 10, VIVID[i % 5], 0);
      else { ctx.save(); ctx.translate(x, y); ctx.rotate(crSnap(bp, 0.25) * Math.PI / 4); shapePath(ctx, ['triangle', 'square', 'star', 'circle', 'star'][i / 2], 11); ctx.fillStyle = '#fff'; ctx.fill(); ctx.strokeStyle = rgba(VIVID[i % 5], 1); ctx.lineWidth = 3.5; ctx.stroke(); ctx.restore(); }
    }
    world(T, look, k);
  }

  THEMES.chain = {
    noTrails: true, noScanlines: true, noGlow: true, glow: 1.2,
    clearColors: ['#ff4f8b', '#2f8cff', '#ffa400', '#7c5cff', '#14b885'],
    kinds: { domino: dominoK },
    reset, update, background, floor, platform, bullet, world, flash, hint, banner, title, camera,
  };
  THEMES.chain.release = () => { freeArt(st); st.made = false; };
})();
