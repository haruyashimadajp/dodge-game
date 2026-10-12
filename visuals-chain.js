"use strict";

/* =========================================================================
   見た目のセット「chain」  —  曲㉑「CHAIN REACTION」用
   パステルのからくり部屋。まん中の上に大きなスイッチがあり、「カチッ」と押されると輪が飛び出す。
   背景の図形（三角・四角・星・丸の線）は、拍が来るたびに 45度ずつ「カクッ」と回る。
   ビー玉が背景のレールを転がり、床のタイルは拍ごとに一枚ずつ光って進む。
   画面（カメラ）も拍に合わせて動く: Aメロはチクタク左右にかたむき、サビは拍ごとに大きくゆれて、
   スイッチで一回転（stage.spin）。MACHINE ではカメラがプレイヤーに寄って追いかける。
   まわりのガラスの窓わくは画面に固定（部屋だけが回る）。
   弾: さくらんぼ（アイワナの「デリシャスフルーツ」）／ 音符 ／ 線の図形 ／ ドミノのブロック ／ ばねのボール ／ ビー玉。
   明るい背景でも見えるように、弾はぜんぶ濃い色のふちどり。
   ========================================================================= */

(function () {
  const INK = [52, 46, 82], WHITE = [255, 255, 255];
  const PASTEL = ['#ff8fb8', '#8fc4ff', '#ffd27a', '#b8a4ff', '#8fe8c4'].map(rgb);
  const VIVID = ['#ff4f8b', '#2f8cff', '#ffa400', '#7c5cff', '#14b885'].map(rgb);
  const FONT = '"Hiragino Maru Gothic ProN", "Arial Rounded MT Bold", "Segoe UI", system-ui, sans-serif';
  const SW = { x: W / 2, y: 170 };                                       // 大きなスイッチ（弾の輪が出てくる所）
  const st = { made: false, bokeh: null, shapes: null, lastBeat: -99, press: -9, pops: [] };
  let SWITCHES = null, OFF = null;
  const inSong = () => scene !== 'title';
  const hsh = (a, b = 0) => { const v = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return v - Math.floor(v); };
  const nowT = () => inSong() ? songTime : titleClock();
  const bpAt = T => inSong() ? crBeatPos(T) : T / CR_BEAT;
  const powered = T => !inSong() || (T >= crBar(4) - 0.05 && !(OFF && T >= crBeatTime(OFF[0])));

  function make() {
    st.made = true;
    st.bokeh = Array.from({ length: 12 }, (_, i) => ({ x: hsh(i, 1) * W, y: hsh(i, 2) * (GROUND_Y - 80), r: 40 + hsh(i, 3) * 90, c: PASTEL[i % 5], v: 4 + hsh(i, 4) * 8, p: hsh(i, 5) * TAU }));
    st.shapes = Array.from({ length: 12 }, (_, i) => ({ x: 60 + hsh(i, 11) * (W - 120), y: 60 + hsh(i, 12) * (GROUND_Y - 200), s: 30 + hsh(i, 13) * 34, kind: ['triangle', 'square', 'star', 'circle'][i % 4], c: PASTEL[(i * 3) % 5], rot: hsh(i, 14) * TAU, dir: i % 2 ? 1 : -1 }));
  }
  function reset() {
    if (!st.made) make();
    st.lastBeat = -99; st.press = -9; st.pops = [];
    SWITCHES = new Set(SCORE_CHAIN.switch); OFF = SCORE_CHAIN.off;
  }
  function onBeat(b, T) {
    if (!SWITCHES) reset();
    if (SWITCHES.has(b)) {
      st.press = T;
      for (let i = 0; i < 18; i++) {
        const a = i / 18 * TAU;
        st.pops.push({ x: SW.x, y: SW.y, vx: Math.cos(a) * (180 + hsh(b, i) * 120), vy: Math.sin(a) * (180 + hsh(i, b) * 120), t: 0, kind: ['triangle', 'square', 'star', 'circle'][i % 4], c: VIVID[i % 5], rot: a });
      }
    }
  }
  function update(dt, T) {
    if (!st.made) make();
    if (scene === 'play') {
      const b = Math.floor(crBeatPos(T) + 0.02);
      if (b !== st.lastBeat) { if (b === st.lastBeat + 1) onBeat(b, T); st.lastBeat = b; }
    } else if (scene === 'title') {
      const b = Math.floor(T / CR_BEAT);
      if (b !== st.lastBeat) { st.lastBeat = b; if (b % 8 === 0) st.press = T; }
    }
    for (const q of st.pops) { q.t += dt; q.x += q.vx * dt; q.y += q.vy * dt; q.vx *= 0.97; q.vy = q.vy * 0.97 + 300 * dt; q.rot += dt * 5; }
    st.pops = st.pops.filter(q => q.t < 0.9);
  }

  // ---- 図形（線だけ）。どれも半径 s くらいの大きさ ------------------------------------------------
  function shapePath(g, kind, s) {
    g.beginPath();
    if (kind === 'triangle') { for (let i = 0; i < 3; i++) { const a = -Math.PI / 2 + i * TAU / 3; i ? g.lineTo(Math.cos(a) * s * 1.15, Math.sin(a) * s * 1.15) : g.moveTo(Math.cos(a) * s * 1.15, Math.sin(a) * s * 1.15); } g.closePath(); }
    else if (kind === 'square') g.rect(-s * 0.85, -s * 0.85, s * 1.7, s * 1.7);
    else if (kind === 'star') { for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? s * 0.5 : s * 1.15; i ? g.lineTo(Math.cos(a) * r, Math.sin(a) * r) : g.moveTo(Math.cos(a) * r, Math.sin(a) * r); } g.closePath(); }
    else g.arc(0, 0, s, 0, TAU);
  }

  // ---- 背景 ---------------------------------------------------------------------------------
  function skyLayer(g, T, look) {
    vGradient(rgba(look.skyTop, 1), rgba(look.skyBot, 1), g);
    // 方眼紙
    g.strokeStyle = rgba(INK, 0.06); g.lineWidth = 1; g.beginPath();
    for (let x = 0; x <= W; x += 40) { g.moveTo(x, 0); g.lineTo(x, H); }
    for (let y = 0; y <= H; y += 40) { g.moveTo(0, y); g.lineTo(W, y); }
    g.stroke();
    // ふわふわの丸（ぼけた風船）
    for (const q of st.bokeh) {
      const y = ((q.y - T * q.v) % (GROUND_Y + 200) + GROUND_Y + 200) % (GROUND_Y + 200) - 100;
      g.fillStyle = rgba(q.c, 0.22); g.beginPath(); g.arc(q.x + Math.sin(T * 0.3 + q.p) * 20, y, q.r, 0, TAU); g.fill();
    }
    // ビー玉のレール（ジグザグ）
    g.strokeStyle = rgba(INK, 0.18); g.lineWidth = 5; g.lineCap = 'round'; g.beginPath();
    RAIL.forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y)); g.stroke();
    g.strokeStyle = rgba(WHITE, 0.6); g.lineWidth = 2; g.stroke();
  }
  const RAIL = [[40, 120], [260, 200], [60, 300], [300, 400], [80, 500], [250, 580]];
  const railAt = u => {                                                 // レールの上の位置（u = 0〜1）
    const segs = RAIL.length - 1, f = Math.min(segs - 1e-6, u * segs), i = Math.floor(f), p = f - i;
    return [RAIL[i][0] + (RAIL[i + 1][0] - RAIL[i][0]) * p, RAIL[i][1] + (RAIL[i + 1][1] - RAIL[i][1]) * p];
  };
  function background(T, look, k, bk, bp) {
    if (!st.made) make();
    ctx.drawImage(cachedLayer('chainSky', 4, 0, g => skyLayer(g, T, look)), 0, 0, W, H);
    const on = powered(T);
    // 拍で 45度ずつ回る図形
    const v = crSnap(bp, 0.25), n = on ? Math.round(6 + 1.5 * (look.tier || 0)) : 5;
    ctx.save(); ctx.lineJoin = 'round';
    for (let i = 0; i < Math.min(n, st.shapes.length); i++) {
      const q = st.shapes[i], sc = 1 + 0.18 * k * (on ? 1 : 0);
      ctx.save(); ctx.translate(q.x, q.y); ctx.rotate(q.rot + (on ? q.dir * v * Math.PI / 4 : 0)); ctx.scale(sc, sc);
      shapePath(ctx, q.kind, q.s); ctx.strokeStyle = rgba(q.c, on ? 0.42 : 0.22); ctx.lineWidth = 6; ctx.stroke();   // 背景の図形は大きく、うすく（弾とまちがえないように）
      ctx.restore();
    }
    ctx.restore();
    // レールのビー玉（2小節で一往復）
    if (on) {
      const u = (bp / 8) % 1, [mx, my] = railAt(u);
      marble(mx, my - 9, 8, VIVID[1]);
    }
  }

  // ---- 床・スイッチ・足場（カメラの中） --------------------------------------------------------------
  function floor(look, k, bp) {
    const y = GROUND_Y, T = nowT(), on = powered(T);
    ctx.fillStyle = '#f7f5fb'; ctx.fillRect(-400, y, W + 800, H - y + 400);
    const tw = 50, lit = Math.floor(bp) % 16;
    for (let i = -8; i < 24; i++) {
      const x = i * tw;
      if (on && ((i % 16) + 16) % 16 === lit) { ctx.fillStyle = rgba(look.color, 0.35 + 0.3 * k); ctx.fillRect(x, y, tw, 24); }
      else if ((i + 100) % 2 === 0) { ctx.fillStyle = 'rgba(52,46,82,0.05)'; ctx.fillRect(x, y, tw, 24); }
    }
    ctx.strokeStyle = rgba(INK, 0.15); ctx.lineWidth = 1; ctx.beginPath();
    for (let i = -8; i < 24; i++) { ctx.moveTo(i * tw, y); ctx.lineTo(i * tw, y + 24); }
    ctx.moveTo(-400, y + 24); ctx.lineTo(W + 400, y + 24); ctx.stroke();
    ctx.fillStyle = rgba(look.color, 0.9); ctx.fillRect(-400, y, W + 800, 4);
    if (inSong()) drawSwitch(T, k, on);
  }
  function drawSwitch(T, k, on) {
    const press = clamp01(1 - (T - st.press) / 0.22), x = SW.x, y = SW.y;
    // 台（土台の箱）
    ctx.fillStyle = 'rgba(52,46,82,0.12)'; roundRect(x - 52, y - 8, 104, 46, 12); ctx.fill();
    ctx.fillStyle = '#ffffff'; roundRect(x - 50, y - 12, 100, 44, 12); ctx.fill();
    ctx.strokeStyle = rgba(INK, 0.8); ctx.lineWidth = 3; ctx.stroke();
    // ボタン（押されると沈む）。ON は赤く光る
    const by = y - 12 + press * 9, col = on ? VIVID[0] : [170, 176, 192];
    ctx.fillStyle = rgba(mixC(col, INK, 0.35), 1); ctx.beginPath(); ctx.ellipse(x, by + 6, 32, 12, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = rgba(col, 1); ctx.beginPath(); ctx.ellipse(x, by, 32, 12, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = rgba(INK, 0.8); ctx.lineWidth = 2.5; ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.7)'; ctx.beginPath(); ctx.ellipse(x - 10, by - 3, 10, 3.5, -0.2, 0, TAU); ctx.fill();
    ctx.font = `900 13px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = rgba(INK, 0.85); ctx.fillText(on ? 'ON' : 'OFF', x, y + 20);
    if (on && press > 0) {                                              // 押した時の「カチッ」の線
      ctx.strokeStyle = rgba(VIVID[2], press); ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.beginPath();
      for (let i = 0; i < 6; i++) { const a = -Math.PI * (0.15 + i * 0.14); ctx.moveTo(x + Math.cos(a) * 46, by + Math.sin(a) * 30); ctx.lineTo(x + Math.cos(a) * 64, by + Math.sin(a) * 44); }
      ctx.stroke();
    }
  }
  function platform(p, look, k) {
    ctx.fillStyle = 'rgba(52,46,82,0.12)'; roundRect(p.x + 3, p.y + 4, p.w, p.h, 6); ctx.fill();
    ctx.fillStyle = rgba(mixC(look.color, WHITE, 0.72), 0.95); roundRect(p.x, p.y, p.w, p.h, 6); ctx.fill();
    ctx.strokeStyle = rgba(INK, 0.75); ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = rgba(INK, 0.5);
    for (const bx of [p.x + 8, p.x + p.w - 8]) { ctx.beginPath(); ctx.arc(bx, p.y + p.h / 2, 2.2, 0, TAU); ctx.fill(); }
    ctx.fillStyle = 'rgba(255,255,255,0.8)'; ctx.fillRect(p.x + 14, p.y + 3, p.w - 28, 2);
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
  function bullet(b, c, k) {
    const T = nowT(), st_ = b.st || 0;
    if (b.style === 'cherry') { cherryShape(b.x, b.y, b.r, c, Math.sin(st_ * 1.7) * 2); return; }
    if (b.style === 'note') { noteShape(b.x, b.y, b.r, c); return; }
    if (b.style === 'roller') { marble(b.x, b.y, b.r, c); return; }
    if (b.style === 'shape') {
      const rot = b.rot0 + crSnap(bpAt(T), 0.25) * Math.PI / 4;
      ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(rot); ctx.lineJoin = 'round';
      shapePath(ctx, b.shape || 'circle', b.r * 1.15);
      ctx.fillStyle = 'rgba(255,255,255,0.9)'; ctx.fill();
      ctx.strokeStyle = rgba(INK, 0.9); ctx.lineWidth = 5.5; ctx.stroke();
      ctx.strokeStyle = rgba(c, 1); ctx.lineWidth = 3.5; ctx.stroke();
      ctx.restore();
      return;
    }
    if (b.style === 'block') {                                          // ドミノのブロック（目が2つ）
      ctx.fillStyle = rgba(c, 1); roundRect(b.x - b.r, b.y - b.r, b.r * 2, b.r * 2, 4); ctx.fill();
      ctx.strokeStyle = rgba(INK, 0.95); ctx.lineWidth = 2; ctx.stroke();
      ctx.fillStyle = '#fff'; for (const dy of [-0.45, 0.45]) { ctx.beginPath(); ctx.arc(b.x, b.y + dy * b.r, b.r * 0.22, 0, TAU); ctx.fill(); }
      return;
    }
    if (b.style === 'spring') {                                         // ばねのボール: 下にコイル
      const top = b.y + b.r, len = Math.max(4, GROUND_Y - top);
      ctx.strokeStyle = rgba(INK, 0.8); ctx.lineWidth = 2; ctx.beginPath();
      for (let i = 0; i <= 8; i++) { const yy = top + len * i / 8, xx = b.x + (i % 2 ? 7 : -7) * (i === 0 || i === 8 ? 0 : 1); i ? ctx.lineTo(xx, yy) : ctx.moveTo(xx, yy); }
      ctx.stroke();
      marble(b.x, b.y, b.r, c);
      return;
    }
    if (b.style === 'wall') {
      ctx.fillStyle = rgba(c, 1); roundRect(b.x - b.r, b.y - b.r, b.r * 2, b.r * 2, 3); ctx.fill();
      ctx.strokeStyle = rgba(INK, 0.9); ctx.lineWidth = 2; ctx.stroke();
      return;
    }
    ctx.fillStyle = rgba(c, 1); ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, TAU); ctx.fill();
    ctx.strokeStyle = rgba(INK, 0.9); ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.8)'; ctx.beginPath(); ctx.arc(b.x - b.r * 0.3, b.y - b.r * 0.3, b.r * 0.3, 0, TAU); ctx.fill();
  }
  // ドミノ（飾り。当たらない）: 倒れる時刻に、根元を軸にパタンと倒れる
  function dominoK(b, T) {
    const c = bulletColor(b), w = 14, h = 34;
    const p = clamp01((T - b.fall) / 0.12), a = p * p * Math.PI / 2 * b.dir;
    const wob = T < b.fall ? Math.sin(T * 40) * 0.05 * clamp01(1 - (b.fall - T) / 0.4) : 0;
    ctx.save(); ctx.globalAlpha = clamp01(1.4 - (T - b.fall) / 0.6);
    ctx.translate(b.x + (b.dir > 0 ? w / 2 : -w / 2), b.y + h / 2); ctx.rotate(a + wob);
    ctx.fillStyle = rgba(c, 1); roundRect(b.dir > 0 ? -w : 0, -h, w, h, 3); ctx.fill();
    ctx.strokeStyle = rgba(INK, 0.9); ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc((b.dir > 0 ? -w / 2 : w / 2), -h * 0.7, 2, 0, TAU); ctx.arc((b.dir > 0 ? -w / 2 : w / 2), -h * 0.3, 2, 0, TAU); ctx.fill();
    ctx.restore();
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

  // ---- カメラの中の手前: スイッチから飛び出す図形 ----------------------------------------------------
  function world(T, look, k) {
    ctx.lineJoin = 'round';
    for (const q of st.pops) {
      ctx.save(); ctx.globalAlpha = clamp01(1 - q.t / 0.9); ctx.translate(q.x, q.y); ctx.rotate(q.rot);
      shapePath(ctx, q.kind, 7); ctx.strokeStyle = rgba(q.c, 1); ctx.lineWidth = 3; ctx.stroke();
      ctx.restore();
    }
    ctx.globalAlpha = 1;
  }
  function flash(look) {
    ctx.fillStyle = `rgba(255,255,255,${(0.45 * flashT).toFixed(3)})`; ctx.fillRect(0, 0, W, H);
  }

  // 画面に固定: スイッチが切れている間は灰色 ／ ドロップ前の無音は暗く → 白く光る ／ ガラスの窓わく
  function overlay(T) {
    if (inSong()) {
      const off = T < crBar(4) - 0.05 ? 1 : OFF && T >= crBeatTime(OFF[0]) ? clamp01((T - crBeatTime(OFF[0])) / 0.4) : 0;
      if (off > 0) { ctx.fillStyle = `rgba(110,112,130,${(0.22 * off).toFixed(3)})`; ctx.fillRect(0, 0, W, H); }
      for (const g of SCORE_CHAIN.gap) {
        const t0 = crBeatTime(g), t1 = crBeatTime(g + 0.5);
        if (T >= t0 - 0.05 && T < t1) { ctx.fillStyle = `rgba(30,26,52,${(0.5 * clamp01((T - t0 + 0.05) / 0.08)).toFixed(3)})`; ctx.fillRect(0, 0, W, H); }
        else if (T >= t1 && T < t1 + 0.3) { ctx.fillStyle = `rgba(255,255,255,${(0.6 * (1 - (T - t1) / 0.3)).toFixed(3)})`; ctx.fillRect(0, 0, W, H); }
      }
    }
    // ガラスの窓わく（部屋が回っても、わくは動かない）
    ctx.save();
    ctx.strokeStyle = 'rgba(196,208,224,0.95)'; ctx.lineWidth = 14; ctx.strokeRect(7, 7, W - 14, H - 14);
    ctx.strokeStyle = rgba(INK, 0.35); ctx.lineWidth = 2; ctx.strokeRect(14, 14, W - 28, H - 28);
    ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = 2; ctx.strokeRect(3, 3, W - 6, H - 6);
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
  // 場面の名前: 白いラベルが「カチッ」と出る（少し回ってから止まる）
  function banner() {
    overlay(songTime);
    const bn = fx.banner;
    if (!bn) return;
    const e = bn.age, DUR = 2.4;
    if (e > DUR) { fx.banner = null; return; }
    const a = e > DUR - 0.4 ? (DUR - e) / 0.4 : 1, pop = e < 0.2 ? 0.5 + 0.5 * easeOut(e / 0.2) : 1, rot = e < 0.25 ? (1 - e / 0.25) * -0.25 : 0;
    ctx.save(); ctx.globalAlpha = clamp01(a); ctx.translate(W / 2, 110); ctx.rotate(rot); ctx.scale(pop, pop);
    ctx.font = `900 32px ${FONT}`;
    const w = Math.max(260, ctx.measureText(bn.name).width + 70);
    ctx.fillStyle = 'rgba(52,46,82,0.25)'; roundRect(-w / 2 + 5, -32, w, 70, 20); ctx.fill();
    ctx.fillStyle = '#fff'; roundRect(-w / 2, -36, w, 70, 20); ctx.fill();
    ctx.strokeStyle = rgba(bn.c, 1); ctx.lineWidth = 4; ctx.stroke();
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = rgba(mixC(bn.c, INK, 0.25), 1); ctx.fillText(bn.name, 0, -10);
    if (bn.sub) { ctx.font = `700 14px ${FONT}`; ctx.fillStyle = rgba(INK, 0.8); ctx.fillText(bn.sub, 0, 18); }
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
