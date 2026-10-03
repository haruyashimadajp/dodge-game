"use strict";

/* =========================================================================
   見た目のセット「emperror」  —  曲①「the EmpErroR」（リメイク）用
   maimai の筐体を再現: 画面のまん中に、まるい画面（判定の輪）と 8 つのボタン。ノートが輪を通ると、そのボタンが光る。
   PANDORA BOXXX の箱が開いて始まり、エラー（EmpErroR）でこわれていく。王冠をかぶった皇帝の紋章が、まん中でゆらぐ。
     弾       … TAP（ピンクの輪）/ EACH（黄色の輪）/ BREAK（オレンジ ＋ 星のきらめき）/ スライドの☆（青い星）/ TOUCH（三角）
     スライド … 予告は maimai の「＞＞＞」の矢印の道すじ。☆ が走りぬけた所から矢印が消えていく
     引用     … 曲の中で昔の曲を引用する所（麒麟・神威・Jack-the-Ripper◆・ガラクタドールプレイ・ガラテアの螺旋）で、大きな文字
     判定     … 弾のすぐ近くをかすめると「CRITICAL PERFECT」「PERFECT」。右上に達成率（当たるたびに下がる）と COMBO
   ========================================================================= */

(function () {
  const WHITE = [255, 255, 255];
  const ORANGE = [255, 140, 26];
  const PINK = rgb('#ff5fa2'), YELLOW = rgb('#ffd84d'), CYAN = rgb('#4fd6ff');
  const FONT = '"M PLUS Rounded 1c", "Hiragino Maru Gothic ProN", "Arial Rounded MT Bold", system-ui, sans-serif';
  const st = { quotes: [], judges: [], lit: new Array(9).fill(0), open: 0, err: 0, impact: 0, lastBeat: -99, combo: 0, lastHits: 0, grazed: new WeakSet(), passed: new WeakSet(), achieve: 101 };
  const inSong = () => scene !== 'title';
  const LED = ['#ff5fa2', '#ff8c1a', '#ffd84d', '#5fe0b0', '#4fd6ff', '#b388ff'].map(rgb);

  function reset() {
    Object.assign(st, { quotes: [], judges: [], lit: new Array(9).fill(0), open: 0, err: 0, impact: 0, lastBeat: -99, combo: 0, lastHits: 0, grazed: new WeakSet(), passed: new WeakSet(), achieve: 101 });
  }
  // 譜面から呼ぶ: 演出
  window.maiFx = function (type) {
    if (type === 'open') st.open = 0.001;
    if (type === 'impact') { st.impact = 1; for (let i = 1; i <= 8; i++) st.lit[i] = 1; }
    if (type === 'break') st.impact = Math.max(st.impact, 0.5);
    if (type === 'error') { st.err = 1; glitch(1); shake(8); }
  };
  window.maiQuote = function (text, sub) { st.quotes = []; st.quotes.push({ text, sub, t: 0 }); glitch(0.5); };   // 新しい引用が出たら、前のは消す

  function update(dt, T, look) {
    if (st.open > 0) st.open += dt;
    st.impact = Math.max(0, st.impact - dt * 1.5);
    st.err = Math.max(0, st.err - dt * 0.5);
    for (let i = 1; i <= 8; i++) st.lit[i] = Math.max(0, st.lit[i] - dt * 3);
    for (const q of st.quotes) q.t += dt;
    st.quotes = st.quotes.filter(q => q.t < 2.2);
    for (const j of st.judges) j.t += dt;
    st.judges = st.judges.filter(j => j.t < 0.6);
    if (scene !== 'play') return;
    // ノートが判定の輪を通ったら、そのボタンが光る
    for (const b of bullets) {
      if (b.maiLane == null || b.delay > 0 || st.passed.has(b)) continue;
      if (Math.hypot(b.x - MAI.x, b.y - MAI.y) >= MAI.R) {
        st.passed.add(b);
        const l = ((Math.round(b.maiLane) - 1) % 8 + 8) % 8 + 1;
        st.lit[l] = 1;
        sparks(b.x, b.y, { n: 5, color: bulletColor(b), speed: 120, life: 0.3, size: 2.2, gravity: 0 });
      }
    }
    // かすめた弾: CRITICAL PERFECT / PERFECT / GREAT
    const p = playerXY();
    for (const b of bullets) {
      if (b.delay > 0 || b.safe || b.kind || st.grazed.has(b)) continue;
      const d = Math.hypot(b.x - p.x, b.y - p.y) - b.r - 12;
      if (d < 26 && d > 0) {
        st.grazed.add(b);
        const txt = d < 8 ? 'CRITICAL PERFECT' : d < 16 ? 'PERFECT' : 'GREAT';
        st.judges.push({ x: p.x, y: p.y - 34, t: 0, txt });
        st.combo++;
      }
    }
    if (hitsTaken > st.lastHits) { st.combo = 0; st.achieve = Math.max(0, st.achieve - 2.5 * (hitsTaken - st.lastHits)); st.judges.push({ x: p.x, y: p.y - 34, t: 0, txt: 'MISS' }); }
    st.lastHits = hitsTaken;
    const bp = beatPos(T), b0 = Math.floor(bp);
    if (b0 !== st.lastBeat) { st.lastBeat = b0; if (look.beams) st.lit[(b0 % 8) + 1] = Math.max(st.lit[(b0 % 8) + 1], 0.7); }
  }

  // ---- 背景: 筐体（ゆっくりしか変わらない所は、3コマに1回だけ描いた絵）+ 判定の輪・ボタン・王冠 ---------------------
  function background(T, look, k, bk, bp) {
    ctx.drawImage(cachedLayer('maiCab', 3, 0, g => {
      const gr = g.createLinearGradient(0, 0, 0, H);
      gr.addColorStop(0, rgba(look.skyTop, 1)); gr.addColorStop(1, rgba(look.skyBot, 1));
      g.fillStyle = gr; g.fillRect(0, 0, W, H);
      g.fillStyle = rgba(mixC(ORANGE, look.color, 0.4), 0.07);                  // ORANGE の水玉
      for (let y = 20; y < H; y += 46) for (let x = (y / 46 % 2) * 23; x < W; x += 46) { g.beginPath(); g.arc(x + (T * 8) % 46, y, 6, 0, TAU); g.fill(); }
      // まるい画面（中は暗く）
      const rg = g.createRadialGradient(MAI.x, MAI.y, 40, MAI.x, MAI.y, MAI.R + 20);
      rg.addColorStop(0, rgba(mixC([20, 12, 30], look.color, 0.18), 0.92)); rg.addColorStop(1, 'rgba(6,4,10,0.9)');
      g.fillStyle = rg; g.beginPath(); g.arc(MAI.x, MAI.y, MAI.R + 22, 0, TAU); g.fill();
      // 白い枠（筐体のふち）
      g.lineWidth = 26; g.strokeStyle = 'rgba(235,235,245,0.9)';
      g.beginPath(); g.arc(MAI.x, MAI.y, MAI.R + 36, 0, TAU); g.stroke();
      g.lineWidth = 3; g.strokeStyle = 'rgba(150,150,170,0.9)';
      g.beginPath(); g.arc(MAI.x, MAI.y, MAI.R + 23, 0, TAU); g.stroke();
      g.beginPath(); g.arc(MAI.x, MAI.y, MAI.R + 49, 0, TAU); g.stroke();
      // 8 本のレーンの線（うすく）
      g.strokeStyle = 'rgba(255,255,255,0.06)'; g.lineWidth = 2;
      for (let l = 1; l <= 8; l++) { const p = maiPos(l); g.beginPath(); g.moveTo(MAI.x, MAI.y); g.lineTo(p.x, p.y); g.stroke(); }
    }), 0, 0, W, H);

    // 枠の LED（サビで七色に回る）
    if (look.beams && gfx > 0) {
      ctx.lineWidth = 8;
      for (let i = 0; i < 24; i++) {
        const a0 = i / 24 * TAU + bp * 0.2, c = LED[(i + Math.floor(bp)) % 6];
        ctx.strokeStyle = rgba(c, 0.55 + 0.4 * k);
        ctx.beginPath(); ctx.arc(MAI.x, MAI.y, MAI.R + 36, a0, a0 + TAU / 24 - 0.04); ctx.stroke();
      }
    }
    // 判定の輪（拍でふくらむ）
    const R = MAI.R * (1 + 0.006 * k);
    ctx.strokeStyle = rgba(WHITE, 0.55 + 0.35 * k); ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(MAI.x, MAI.y, R, 0, TAU); ctx.stroke();
    ctx.strokeStyle = rgba(look.color, 0.25 + 0.3 * st.impact); ctx.lineWidth = 10;
    ctx.beginPath(); ctx.arc(MAI.x, MAI.y, R - 8, 0, TAU); ctx.stroke();
    // 8 つのボタン（ノートが通ると光る）
    for (let l = 1; l <= 8; l++) {
      const p = maiPos(l, MAI.R + 36), lit = st.lit[l];
      ctx.fillStyle = rgba(mixC([255, 230, 120], WHITE, lit * 0.6), 0.35 + 0.65 * lit);
      ctx.beginPath(); ctx.arc(p.x, p.y, 15 + 4 * lit, 0, TAU); ctx.fill();
      ctx.strokeStyle = 'rgba(120,110,90,0.9)'; ctx.lineWidth = 2; ctx.stroke();
      if (lit > 0.05 && gfx > 0) { ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = lit; ctx.drawImage(glowSprite([255, 220, 120]), p.x - 40, p.y - 40, 80, 80); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; }
    }
    // まん中: 王冠の紋章（エラーでゆらぐ）／ はじまりは PANDORA BOXXX の箱
    if (inSong() && st.open > 0 && st.open < 3.5) pandoraBox(st.open);
    else emblem(T, look, k);
    // 衝撃: まるい画面いっぱいの光の輪
    if (st.impact > 0.02) {
      ctx.strokeStyle = rgba(WHITE, st.impact * 0.8); ctx.lineWidth = 6 * st.impact;
      ctx.beginPath(); ctx.arc(MAI.x, MAI.y, MAI.R * (1.25 - 0.25 * st.impact), 0, TAU); ctx.stroke();
    }
  }
  // 皇帝の紋章: 王冠 ＋ 「EmpErroR」。ときどき文字がずれて「Emperor」と「Error」に分かれる
  function emblem(T, look, k) {
    const x = MAI.x, y = MAI.y - 10, gl = (Math.sin(T * 7) > 0.92 || st.err > 0.3) ? (Math.random() - 0.5) * 12 : 0;
    ctx.save(); ctx.translate(x + gl, y);
    const s = 1 + 0.05 * k;
    ctx.scale(s, s);
    ctx.fillStyle = rgba(mixC([255, 190, 60], look.color, 0.25), 0.9);         // 王冠
    ctx.beginPath(); ctx.moveTo(-46, 10); ctx.lineTo(-52, -28); ctx.lineTo(-24, -6); ctx.lineTo(0, -40); ctx.lineTo(24, -6); ctx.lineTo(52, -28); ctx.lineTo(46, 10); ctx.closePath(); ctx.fill();
    ctx.fillRect(-46, 12, 92, 10);
    ctx.fillStyle = '#fff';
    for (const [px, py] of [[-52, -28], [0, -40], [52, -28]]) { ctx.beginPath(); ctx.arc(px, py, 5, 0, TAU); ctx.fill(); }
    ctx.fillStyle = rgba(PINK, 1); ctx.beginPath(); ctx.arc(0, 2, 6, 0, TAU); ctx.fill();
    ctx.font = `900 22px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    if (gl !== 0 && gfx > 0) {                                               // ずれる: 赤と青に分かれる
      ctx.fillStyle = 'rgba(255,40,80,0.8)'; ctx.fillText('Emperor', -4, 46);
      ctx.fillStyle = 'rgba(40,200,255,0.8)'; ctx.fillText('Error', 6, 50);
    } else { ctx.fillStyle = 'rgba(255,255,255,0.85)'; ctx.fillText('the EmpErroR', 0, 46); }
    ctx.restore();
  }
  // PANDORA BOXXX の箱: 黒い箱の「XXX」がほどけて、ふたが開き、光があふれる
  function pandoraBox(t) {
    const x = MAI.x, y = MAI.y + 20, open = clamp01((t - 1.0) / 1.2), fade = clamp01(1 - (t - 2.6) / 0.9);
    ctx.save(); ctx.globalAlpha = fade;
    if (open > 0) {                                                          // あふれる光
      ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 9; i++) {
        const a = -Math.PI / 2 + (i - 4) * 0.18, len = 420 * easeOut(open);
        const g = ctx.createLinearGradient(x, y - 40, x + Math.cos(a) * len, y - 40 + Math.sin(a) * len);
        g.addColorStop(0, 'rgba(255,200,120,0.6)'); g.addColorStop(1, 'rgba(255,200,120,0)');
        ctx.strokeStyle = g; ctx.lineWidth = 10;
        ctx.beginPath(); ctx.moveTo(x, y - 40); ctx.lineTo(x + Math.cos(a) * len, y - 40 + Math.sin(a) * len); ctx.stroke();
      }
      ctx.globalCompositeOperation = 'source-over';
    }
    ctx.fillStyle = '#111'; ctx.strokeStyle = '#ff8c1a'; ctx.lineWidth = 3;
    ctx.fillRect(x - 50, y - 40, 100, 80); ctx.strokeRect(x - 50, y - 40, 100, 80);
    ctx.save(); ctx.translate(x - 54, y - 40); ctx.rotate(-1.4 * easeOut(open));   // ふた
    ctx.fillStyle = '#1a1a1a'; ctx.fillRect(0, -14, 108, 14); ctx.strokeRect(0, -14, 108, 14);
    ctx.restore();
    ctx.font = `900 30px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = `rgba(255,140,26,${(1 - open).toFixed(3)})`; ctx.fillText('XXX', x, y);
    ctx.font = `800 13px ${FONT}`; ctx.fillStyle = 'rgba(255,255,255,0.8)'; ctx.fillText('PANDORA BOXXX', x, y + 56);
    ctx.restore();
  }

  // ---- 床・足場 ----------------------------------------------------------------------------
  function floor(look, k) {
    ctx.fillStyle = '#0c0a10'; ctx.fillRect(-400, GROUND_Y, W + 800, H - GROUND_Y + 400);
    ctx.fillStyle = rgba(look.color, 0.6 + 0.3 * k); ctx.fillRect(-400, GROUND_Y, W + 800, 3);
    ctx.fillStyle = 'rgba(255,255,255,0.06)';
    for (let x = -400; x < W + 400; x += 40) ctx.fillRect(x, GROUND_Y + 10, 20, 3);
  }
  function platform(p, look, k) {
    ctx.fillStyle = 'rgba(240,240,250,0.92)'; roundRect(p.x, p.y, p.w, p.h, 8); ctx.fill();
    ctx.fillStyle = rgba(look.color, 0.8); ctx.fillRect(p.x + 8, p.y + p.h / 2 - 1.5, p.w - 16, 3);
  }

  // ---- 弾: maimai のノート ------------------------------------------------------------------
  function noteRing(x, y, r, c, inner = true) {
    ctx.lineWidth = Math.max(3, r * 0.42); ctx.strokeStyle = rgba(c, 1);
    ctx.beginPath(); ctx.arc(x, y, r * 0.78, 0, TAU); ctx.stroke();
    ctx.lineWidth = 1.5; ctx.strokeStyle = '#fff';
    ctx.beginPath(); ctx.arc(x, y, r * 1.0, 0, TAU); ctx.stroke();
    if (inner) { ctx.beginPath(); ctx.arc(x, y, r * 0.52, 0, TAU); ctx.stroke(); }
  }
  function star(x, y, r, c, rot, fill = false) {
    ctx.beginPath();
    for (let i = 0; i < 10; i++) { const a = rot - Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * 0.45 : r; ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
    ctx.closePath();
    if (fill) { ctx.fillStyle = rgba(c, 0.35); ctx.fill(); }
    ctx.lineWidth = 3; ctx.strokeStyle = rgba(c, 1); ctx.stroke();
    ctx.lineWidth = 1.2; ctx.strokeStyle = '#fff'; ctx.stroke();
  }
  function bullet(b, c, k) {
    const s = b.style || '';
    if (s === 'mai-tap' || s === 'mai-each' || s === '') { noteRing(b.x, b.y, b.r, c); return; }
    if (s === 'mai-break' || s === 'mai-break-big') {
      noteRing(b.x, b.y, b.r, c, false);
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      const tw = 0.6 + 0.4 * Math.sin(b.age * 20);                          // きらめき
      ctx.beginPath(); for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4, rr = i % 2 ? b.r * 0.15 : b.r * 0.55 * tw; ctx.lineTo(b.x + Math.cos(a) * rr, b.y + Math.sin(a) * rr); } ctx.closePath(); ctx.fill();
      return;
    }
    if (s === 'mai-star') { star(b.x, b.y, b.r * 1.5, c, b.age * 4); return; }
    if (s === 'mai-touch') {                                                // TOUCH のかけら: 小さな三角
      const a = Math.atan2(b.vy, b.vx);
      ctx.fillStyle = rgba(c, 1); ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(b.x + Math.cos(a) * b.r * 1.4, b.y + Math.sin(a) * b.r * 1.4);
      ctx.lineTo(b.x + Math.cos(a + 2.3) * b.r, b.y + Math.sin(a + 2.3) * b.r); ctx.lineTo(b.x + Math.cos(a - 2.3) * b.r, b.y + Math.sin(a - 2.3) * b.r); ctx.closePath(); ctx.fill(); ctx.stroke();
      return;
    }
    if (s === 'knife') {                                                    // ◆ Jack のナイフ
      const a = Math.atan2(b.vy, b.vx);
      ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(a);
      ctx.fillStyle = '#e8eaf6'; ctx.beginPath(); ctx.moveTo(16, 0); ctx.lineTo(-4, -4); ctx.lineTo(-4, 4); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#b0102a'; ctx.fillRect(-12, -2.5, 8, 5);
      ctx.fillStyle = '#ff3b5c'; ctx.beginPath(); ctx.moveTo(-14, 0); ctx.lineTo(-18, -4); ctx.lineTo(-22, 0); ctx.lineTo(-18, 4); ctx.closePath(); ctx.fill();   // ◆
      ctx.restore();
      return;
    }
    if (s === 'doll') {                                                     // ガラクタの人形（糸でつられて、ゆれる）
      if (b.pivot) { ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(b.pivot.x, b.pivot.y); ctx.lineTo(b.x, b.y - b.r); ctx.stroke(); }
      ctx.fillStyle = '#ffe0ea'; ctx.beginPath(); ctx.arc(b.x, b.y - b.r * 0.35, b.r * 0.55, 0, TAU); ctx.fill();     // 顔
      ctx.fillStyle = rgba(c, 1); ctx.beginPath(); ctx.moveTo(b.x - b.r * 0.8, b.y + b.r); ctx.lineTo(b.x, b.y); ctx.lineTo(b.x + b.r * 0.8, b.y + b.r); ctx.closePath(); ctx.fill();   // 服
      ctx.fillStyle = '#222'; ctx.fillRect(b.x - b.r * 0.25, b.y - b.r * 0.45, 3, 3); ctx.fillRect(b.x + b.r * 0.15, b.y - b.r * 0.45, 3, 3);
      ctx.strokeStyle = '#222'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(b.x - 4, b.y - b.r * 0.15); ctx.lineTo(b.x + 4, b.y - b.r * 0.15); ctx.stroke();   // ぬい目の口
      ctx.strokeStyle = '#ff3b5c'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(b.x, b.y, b.r + 2, 0, TAU); ctx.stroke();
      return;
    }
    noteRing(b.x, b.y, b.r, c);
  }
  // スライド: 予告は「＞」の矢印の道すじ。☆ は道を走る
  function slide(b, T, k) {
    const c = bulletColor(b), from = b.delay > 0 ? 0 : (b.prog || 0);
    const p = b.delay > 0 ? 1 - b.delay / b.delayMax : 1;
    ctx.strokeStyle = rgba(c, 0.35 + 0.5 * p); ctx.lineWidth = 3;
    for (let d = Math.ceil(from / 28) * 28; d < b.total; d += 28) {
      let i = 1; while (i < b.path.length - 1 && b.cum[i] < d) i++;
      const p0 = b.path[i - 1], p1 = b.path[i], f = (d - b.cum[i - 1]) / ((b.cum[i] - b.cum[i - 1]) || 1);
      const x = p0.x + (p1.x - p0.x) * f, y = p0.y + (p1.y - p0.y) * f, a = Math.atan2(p1.y - p0.y, p1.x - p0.x);
      ctx.beginPath(); ctx.moveTo(x - Math.cos(a - 0.6) * 9, y - Math.sin(a - 0.6) * 9); ctx.lineTo(x, y); ctx.lineTo(x - Math.cos(a + 0.6) * 9, y - Math.sin(a + 0.6) * 9); ctx.stroke();
    }
    const x = b.delay > 0 ? b.path[0].x : b.x, y = b.delay > 0 ? b.path[0].y : b.y;
    star(x, y, b.r * 1.35, c, b.rot || T * 3, b.delay <= 0);
  }
  // TOUCH: 4 つの三角が、まん中へ集まる → はじけた所に四角い輪
  function touch(b, T, k) {
    const c = bulletColor(b);
    if (b.delay > 0) {
      const p = 1 - b.delay / b.delayMax, d = 46 * (1 - p) + 10;
      ctx.fillStyle = rgba(c, 0.5 + 0.5 * p); ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5;
      for (let i = 0; i < 4; i++) {
        const a = i * Math.PI / 2 + Math.PI / 4, x = b.x + Math.cos(a) * d, y = b.y + Math.sin(a) * d;
        ctx.beginPath(); ctx.moveTo(x - Math.cos(a) * 9, y - Math.sin(a) * 9); ctx.lineTo(x + Math.cos(a + 1.9) * 8, y + Math.sin(a + 1.9) * 8); ctx.lineTo(x + Math.cos(a - 1.9) * 8, y + Math.sin(a - 1.9) * 8); ctx.closePath(); ctx.fill(); ctx.stroke();
      }
      ctx.fillStyle = rgba(c, 0.9); ctx.beginPath(); ctx.arc(b.x, b.y, 4, 0, TAU); ctx.fill();
      return;
    }
    const e = clamp01(b.age / 0.35);
    ctx.strokeStyle = rgba(c, 1 - e); ctx.lineWidth = 3;
    ctx.strokeRect(b.x - 10 - 40 * e, b.y - 10 - 40 * e, 20 + 80 * e, 20 + 80 * e);
  }
  // こわれた帯・稲妻・王冠の光
  function laser(b, c, T, k) {
    if (!b.glitch && !b.bolt && !b.crown) return false;
    const warn = b.delay > 0, p = warn ? 1 - b.delay / b.delayMax : 1, fade = b.safe ? clamp01(1 - (b.age - b.hold) / 0.3) : 1;
    if (b.glitch) {
      const y = b.y1, h = b.r * 2;
      if (warn) {
        ctx.fillStyle = rgba(c, 0.08 + 0.12 * p); ctx.fillRect(0, y - h / 2, W, h);
        ctx.font = `900 14px ${FONT}`; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
        ctx.fillStyle = rgba(c, Math.floor(T * 10) % 2 ? 0.9 : 0.4);
        for (let x = 10; x < W; x += 160) ctx.fillText(y > GROUND_Y - 40 ? '▲ ERROR ▲ JUMP' : '▼ ERROR ▼', x, y - h / 2 - 12);
        return true;
      }
      for (let i = 0; i < 16; i++) {                                         // こわれたブロック
        const x = Math.random() * W, w = 20 + Math.random() * 120;
        ctx.fillStyle = i % 3 === 0 ? rgba(WHITE, 0.8 * fade) : i % 3 === 1 ? rgba(c, 0.85 * fade) : `rgba(40,200,255,${(0.6 * fade).toFixed(3)})`;
        ctx.fillRect(x, y - h / 2 + Math.random() * h * 0.6, w, h * 0.4);
      }
      ctx.fillStyle = rgba(c, 0.35 * fade); ctx.fillRect(0, y - h / 2, W, h);
      return true;
    }
    if (b.bolt) {
      if (warn) {
        ctx.strokeStyle = rgba(c, 0.2 + 0.5 * p); ctx.lineWidth = 2; ctx.setLineDash([4, 6]);
        ctx.beginPath(); ctx.moveTo(b.x1, 0); ctx.lineTo(b.x1, GROUND_Y); ctx.stroke(); ctx.setLineDash([]);
        ctx.fillStyle = rgba(c, 0.15 * p); ctx.fillRect(b.x1 - b.r, 0, b.r * 2, GROUND_Y);
        return true;
      }
      ctx.globalCompositeOperation = 'lighter';
      const pts = []; let x = b.x1;
      for (let y = -20; y <= GROUND_Y; y += 28) { pts.push([x, y]); x = b.x1 + (Math.sin(y * 0.05 + b.seed + T * 30) * 0.5 + (Math.random() - 0.5)) * b.r * 1.4; }
      for (const [w, a] of [[b.r * 2.4, 0.25], [b.r, 0.7], [3, 1]]) {
        ctx.strokeStyle = a === 1 ? rgba(WHITE, fade) : rgba(c, a * fade); ctx.lineWidth = w;
        ctx.beginPath(); pts.forEach(([px, py], i) => (i ? ctx.lineTo(px, py) : ctx.moveTo(px, py))); ctx.stroke();
      }
      ctx.globalCompositeOperation = 'source-over';
      return true;
    }
    // 王冠の光
    if (warn) {
      ctx.strokeStyle = rgba(c, 0.15 + 0.4 * p); ctx.lineWidth = b.r * 2;
      ctx.beginPath(); ctx.moveTo(b.x1, b.y1); ctx.lineTo(b.x2, b.y2); ctx.stroke();
      return true;
    }
    ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
    ctx.strokeStyle = rgba(c, 0.35 * fade); ctx.lineWidth = b.r * 3.5; ctx.beginPath(); ctx.moveTo(b.x1, b.y1); ctx.lineTo(b.x2, b.y2); ctx.stroke();
    ctx.strokeStyle = rgba(c, 0.9 * fade); ctx.lineWidth = b.r * 2; ctx.stroke();
    ctx.strokeStyle = rgba(WHITE, fade); ctx.lineWidth = b.r * 0.6; ctx.stroke();
    ctx.globalCompositeOperation = 'source-over';
    return true;
  }

  // ---- 手前: 判定の文字 -----------------------------------------------------------------------
  function world(T, look, k) {
    for (const j of st.judges) {
      const a = 1 - j.t / 0.6, y = j.y - j.t * 30;
      ctx.font = `900 ${j.txt.length > 10 ? 13 : 16}px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.lineWidth = 4; ctx.strokeStyle = `rgba(0,0,0,${(0.5 * a).toFixed(3)})`; ctx.strokeText(j.txt, j.x, y);
      const c = j.txt === 'MISS' ? [180, 180, 190] : j.txt === 'GREAT' ? [255, 120, 200] : j.txt === 'PERFECT' ? [255, 210, 80] : [255, 240, 150];
      ctx.fillStyle = rgba(c, a); ctx.fillText(j.txt, j.x, y);
    }
  }

  function flash(look) {
    ctx.fillStyle = `rgba(255,236,210,${(0.42 * flashT).toFixed(3)})`;
    ctx.fillRect(0, 0, W, H);
  }

  // 場面の名前 ＋ 引用の大きな文字 ＋ 達成率・COMBO（右上）＋ SYSTEM ERROR
  function banner() {
    if (scene === 'play' || scene === 'clear' || scene === 'over') {
      ctx.textAlign = 'right'; ctx.textBaseline = 'top';
      ctx.font = `800 11px ${FONT}`; ctx.fillStyle = 'rgba(255,255,255,0.7)'; ctx.fillText('ACHIEVEMENT', W - 16, 14);
      ctx.font = `900 22px ${FONT}`;
      ctx.fillStyle = st.achieve >= 100.5 ? '#ffd84d' : st.achieve >= 97 ? '#ff8c1a' : '#ff5fa2';
      ctx.fillText(st.achieve.toFixed(4) + '%', W - 16, 26);
      if (st.combo > 4) { ctx.font = `900 16px ${FONT}`; ctx.fillStyle = 'rgba(255,255,255,0.85)'; ctx.fillText(`${st.combo} COMBO`, W - 16, 52); }
    }
    for (const q of st.quotes) {                                             // 引用: 大きな文字が、ずれながら出て消える
      const a = q.t < 0.15 ? q.t / 0.15 : clamp01(1 - (q.t - 1.2) / 1.0), jit = q.t < 0.4 ? (Math.random() - 0.5) * 16 : 0;
      ctx.save(); ctx.globalAlpha = a;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.font = `900 ${q.text.length > 8 ? 34 : 72}px "Hiragino Mincho ProN", "Yu Mincho", ${FONT}`;
      if (gfx > 0) { ctx.fillStyle = 'rgba(255,40,80,0.7)'; ctx.fillText(q.text, W / 2 - 4 + jit, 210); ctx.fillStyle = 'rgba(40,200,255,0.7)'; ctx.fillText(q.text, W / 2 + 4 - jit, 214); }
      ctx.fillStyle = '#fff'; ctx.fillText(q.text, W / 2 + jit * 0.3, 212);
      ctx.font = `800 13px ${FONT}`; ctx.fillStyle = 'rgba(255,220,180,0.9)'; ctx.fillText('quote: ' + q.sub, W / 2, 256);
      ctx.restore();
    }
    if (st.err > 0.05) {                                                     // 音が消える所: SYSTEM ERROR
      ctx.fillStyle = `rgba(0,0,0,${(0.5 * st.err).toFixed(3)})`; ctx.fillRect(0, 0, W, H);
      ctx.font = `900 40px ui-monospace, Menlo, monospace`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillStyle = `rgba(255,50,50,${st.err.toFixed(3)})`; ctx.fillText('SYSTEM ERROR', W / 2 + (Math.random() - 0.5) * 8, 300);
      ctx.font = `700 14px ui-monospace, Menlo, monospace`; ctx.fillStyle = `rgba(255,200,200,${(0.8 * st.err).toFixed(3)})`;
      ctx.fillText('0xE3PE7R0R : the emperor has no clothes', W / 2, 340);
      for (let i = 0; i < 6; i++) { ctx.fillStyle = `rgba(255,255,255,${(0.15 * st.err).toFixed(3)})`; ctx.fillRect(0, Math.random() * H, W, 2 + Math.random() * 6); }
    }
    const bn = fx.banner;
    if (!bn) return;
    const e = bn.age, DUR = 2.4;
    if (e > DUR) { fx.banner = null; return; }
    const a = e < 0.2 ? e / 0.2 : e > DUR - 0.5 ? (DUR - e) / 0.5 : 1, sl = (1 - easeOut(e / 0.3)) * 60;
    ctx.save(); ctx.globalAlpha = clamp01(a);
    ctx.font = `900 30px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const w = Math.max(260, ctx.measureText(bn.name).width + 60);
    ctx.fillStyle = 'rgba(255,255,255,0.95)'; roundRect(W / 2 - w / 2 + sl, 64, w, 50, 25); ctx.fill();
    ctx.strokeStyle = rgba(bn.c, 1); ctx.lineWidth = 4; ctx.stroke();
    ctx.fillStyle = rgba(mixC(bn.c, [40, 20, 40], 0.35), 1); ctx.fillText(bn.name, W / 2 + sl, 90);
    ctx.font = `800 14px ${FONT}`; ctx.fillStyle = '#fff'; ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(0,0,0,0.5)';
    ctx.strokeText(bn.sub, W / 2, 132); ctx.fillText(bn.sub, W / 2, 132);
    ctx.restore();
  }

  function title(look, k, bp) {
    for (let i = 0; i < 8; i++) {                                           // ノートが輪のまわりを回る
      const a = bp * 0.3 + i / 8 * TAU, x = MAI.x + Math.cos(a) * (MAI.R - 60), y = MAI.y + Math.sin(a) * (MAI.R - 60);
      if (i % 2) noteRing(x, y, 12, i % 4 === 1 ? PINK : YELLOW); else star(x, y, 16, CYAN, bp);
    }
  }

  THEMES.emperror = {
    noTrails: true, noScanlines: false, glow: 1.4,
    clearColors: ['#ff5fa2', '#ffd84d', '#4fd6ff', '#ff8c1a', '#ffffff'],
    kinds: { slide, touch },
    reset, update, background, floor, platform, bullet, laser, world, flash, banner, title,
  };
})();
