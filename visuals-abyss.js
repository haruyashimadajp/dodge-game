"use strict";

/* =========================================================================
   見た目のセット「abyss」  —  曲⑨「Abyss」用
   深海。上から差しこむ光の筋（深くなると消える）、ゆれる海藻、のぼる泡、砂の海底と岩の足場。
   弾は生き物のように光る玉。右はしに深さのメーター（曲が進むほど深くなる）。
   暗い海（stage.dark）では自分のまわりだけが見え、弾はうっすら光る点になる。
   ソナー（stage.pings）の輪が通ると、その所の弾が一瞬はっきり光る。
   ここぞという所の演出:
     はじまり   … 水面に飛びこむ: 光る水面が上へ遠ざかり、泡が上へ流れていく
     ずっと     … 海底にゆれる光の網（コースティクス）、ソナーの音で背景に輪、心臓の音で画面のふちが暗く脈打つ
     クジラの声 … 遠くの暗がりを、巨大なクジラの影がゆっくり泳いでいく
     リヴァイアサンの前 … 暗闇の中で巨大な目が開き、こちらを見る → 咆哮（衝撃波・泡の爆発・水がゆがむ）
     最後       … 光が強くなって、水面へ浮かび上がっていく
   ========================================================================= */

(function () {
  const WHITE = [255, 255, 255];
  const st = { kelp: null, bubbles: [], motes: null, lastBeat: -99, whales: [], rings: [], heart: 0, roar: 0 };
  let PINGS = null, KICKS = null, WHALES = null;
  const EYE0 = 100, EYE1 = 122, ROAR = 120;               // 目が開く〜閉じる拍 / 咆哮の拍
  const PING_V = 650;
  const inSong = () => scene !== 'title';               // 遊んでいる最中 ＋ クリア・ゲームオーバーの画面（最後の見た目のまま止める）                                     // ソナーの輪が広がる速さ（px/秒）

  function make() {
    st.kelp = Array.from({ length: 9 }, (_, i) => ({ x: 40 + i * 92 + Math.random() * 40, h: 90 + Math.random() * 110, ph: Math.random() * TAU }));
    st.motes = Array.from({ length: 70 }, () => ({ x: Math.random() * W, y: Math.random() * H, z: 0.3 + Math.random() * 0.7 }));
  }
  function reset() {
    Object.assign(st, { bubbles: [], lastBeat: -99, whales: [], rings: [], heart: 0, roar: 0 });
    if (!st.buf) { st.buf = document.createElement('canvas'); st.buf.width = cv.width; st.buf.height = cv.height; st.buf.getContext('2d'); }   // 咆哮の瞬間にカクッとしないよう、先に作っておく
  }
  const bubble = (x, y, v, r = 2 + Math.random() * 4) => st.bubbles.push({ x, y, r, v });

  function onBeat(b) {
    if (!PINGS) { PINGS = new Set(SCORE_ABYSS.ping); KICKS = new Set(SCORE_ABYSS.kick); WHALES = new Map(SCORE_ABYSS.whale.map(w => [w[0], w])); }
    if (PINGS.has(b)) st.rings.push({ t: 0 });
    if (KICKS.has(b)) st.heart = 1;
    if (WHALES.has(b)) {                                   // クジラの影（声の長さの2倍かけて横切る）
      const w = WHALES.get(b), dir = Math.random() < 0.5 ? 1 : -1;
      st.whales.push({ t: 0, dur: w[1] * BEAT_SEC * 2.2, dir, y: 160 + Math.random() * 220, s: 0.8 + Math.random() * 0.5 });
    }
    if (b === ROAR) {                                      // 咆哮: 衝撃波 ＋ 泡の爆発
      st.roar = 1;
      window.flash(0.5); shake(16); punch(0.06); glitch(0.3);
      shockRing(W / 2, 300, { color: '#7fe8ff', size: 900, life: 1.0, width: 8 });
      shockRing(W / 2, 300, { color: '#ffffff', size: 600, life: 0.7, width: 4 });
      for (let i = 0; i < 90; i++) bubble(W / 2 + (Math.random() - 0.5) * 500, 300 + (Math.random() - 0.5) * 300, 200 + Math.random() * 300, 2 + Math.random() * 7);
    }
  }

  function update(dt, T, look) {
    if (!st.kelp) make();
    const bp = inSong() ? beatPos(T) : 50;
    if (scene === 'play') {
      const b = Math.floor(bp + 0.02);
      if (b !== st.lastBeat) { if (b === st.lastBeat + 1) onBeat(b); st.lastBeat = b; }
    }
    const rush = scene === 'play' || scene === 'clear' ? (bp < 48 ? 1 - bp / 48 : bp >= 160 ? 1 : 0) : 0;   // 沈むとき・浮かぶとき: 泡がいっぱい上へ流れる
    if (Math.random() < dt * (3 + 40 * rush)) bubble(Math.random() * W, rush > 0.3 ? H + 10 : GROUND_Y, 40 + Math.random() * 60 + 300 * rush);
    if (st.bubbles.length > 260) st.bubbles.splice(0, st.bubbles.length - 260);
    for (const lv of bullets) if (lv.kind === 'leviathan' && lv.delay <= 0 && lv.segs[0] && Math.random() < dt * 20) bubble(lv.segs[0].x, lv.segs[0].y, 60 + Math.random() * 80);
    for (const w of st.whales) w.t += dt;
    st.whales = st.whales.filter(w => w.t < w.dur);
    for (const r of st.rings) r.t += dt;
    st.rings = st.rings.filter(r => r.t < 2.2);
    st.heart = Math.max(0, st.heart - dt * 3);
    st.roar = Math.max(0, st.roar - dt * 0.8);
    for (const b of st.bubbles) { b.y -= b.v * dt; b.x += Math.sin(b.y * 0.05) * 0.3; }
    st.bubbles = st.bubbles.filter(b => b.y > -10);
    for (const m of st.motes) { m.y += 8 * m.z * dt; m.x += Math.sin(T * 0.5 + m.y * 0.01) * 4 * dt; if (m.y > H) { m.y = 0; m.x = Math.random() * W; } }
  }

  function background(T, look, k, bk, bp) {
    if (!st.kelp) make();
    vGradient(rgba(look.skyBot, 1), rgba(look.skyTop, 1));
    // 光の筋（浅いほど明るい）。ゆっくり動くので、いちばん明るいとき（キックの瞬間 ×1.5）の絵を2コマに1回だけ描き直し、
    // 毎コマはその絵を明るさだけ変えて貼る（足し算の光なので、明るさを変えても同じ見た目になる）
    const depth = inSong() ? clamp01(T / SONG_END) : 0.2;
    const ray = 0.10 * (1 - depth) + 0.02;
    const rays = cachedLayer('abyssRays', 2, 0, g => {
      g.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 5; i++) {
        const x = 120 + i * 150 + Math.sin(T * 0.3 + i) * 40, w = 40 + 20 * Math.sin(T * 0.5 + i * 2);
        const gr = g.createLinearGradient(0, 0, 0, H * 0.9);
        gr.addColorStop(0, `rgba(160,230,255,${(ray * 1.5).toFixed(3)})`); gr.addColorStop(1, 'rgba(160,230,255,0)');
        g.fillStyle = gr;
        g.beginPath(); g.moveTo(x - w / 2, 0); g.lineTo(x + w / 2, 0); g.lineTo(x + w * 2 - 120, H); g.lineTo(x - w - 120, H); g.closePath(); g.fill();
      }
    });
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = (1 + 0.5 * k) / 1.5;
    ctx.drawImage(rays, 0, 0, W, H);
    ctx.globalAlpha = 1;
    const bq = inSong() ? beatPos(T) : 50;
    // はじまり: 光る水面が上へ遠ざかっていく（飛びこんだところ）
    if (inSong() && bq < 20) {
      const y = 140 - bq * 14;
      const sg = ctx.createLinearGradient(0, y - 120, 0, y + 60);
      sg.addColorStop(0, 'rgba(220,250,255,0.55)'); sg.addColorStop(0.65, 'rgba(160,230,255,0.25)'); sg.addColorStop(1, 'rgba(160,230,255,0)');
      ctx.fillStyle = sg; ctx.fillRect(0, y - 120, W, 180);
      ctx.strokeStyle = 'rgba(230,252,255,0.7)'; ctx.lineWidth = 2;
      ctx.beginPath();
      for (let x = 0; x <= W; x += 16) ctx.lineTo(x, y + Math.sin(x * 0.03 + T * 2) * 6 + Math.sin(x * 0.011 - T) * 4);
      ctx.stroke();
    }
    // 海の上の方にゆれる光の網（浅いほど強い）
    ctx.lineWidth = 2;
    for (let i = 0; i < 6; i++) {
      ctx.strokeStyle = `rgba(190,245,255,${(0.05 * (1 - depth) + 0.012).toFixed(3)})`;
      ctx.beginPath();
      for (let x = 0; x <= W; x += 20) ctx.lineTo(x, 30 + i * 22 + Math.sin(x * 0.018 + T * 1.1 + i * 1.7) * 10 + Math.sin(x * 0.041 - T * 0.7 + i) * 5);
      ctx.stroke();
    }
    // ソナーの音: 背景に輪が広がる
    for (const r of st.rings) {
      const R = 40 + r.t * 420, a = 1 - r.t / 2.2;
      ctx.strokeStyle = `rgba(127,232,255,${(0.22 * a).toFixed(3)})`; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(W / 2, 300, R, 0, TAU); ctx.stroke();
      ctx.beginPath(); ctx.arc(W / 2, 300, R * 0.8, -0.3, 0.3); ctx.stroke();
    }
    // ただよう粒（プランクトン）
    for (const m of st.motes) {
      ctx.fillStyle = rgba(look.color, 0.12 + 0.2 * m.z);
      ctx.fillRect(m.x, m.y, 1.5 + m.z, 1.5 + m.z);
    }
    ctx.globalCompositeOperation = 'source-over';
    // 遠くを泳ぐクジラの影
    for (const w of st.whales) {
      const p = w.t / w.dur, x = w.dir > 0 ? -300 + p * (W + 600) : W + 300 - p * (W + 600), a = Math.sin(Math.PI * p) * 0.55;
      whaleShape(x, w.y + Math.sin(w.t * 0.6) * 20, w.s, w.dir, w.t, a);
    }
    eye(T, bq, false);
    // 海藻（ゆらゆら）
    ctx.lineCap = 'round';
    for (const kp of st.kelp) {
      ctx.strokeStyle = 'rgba(20,70,60,0.75)'; ctx.lineWidth = 7;
      ctx.beginPath(); ctx.moveTo(kp.x, GROUND_Y);
      for (let j = 1; j <= 8; j++) { const y = GROUND_Y - kp.h * j / 8; ctx.lineTo(kp.x + Math.sin(T * 1.2 + kp.ph + j * 0.6) * j * 2.5, y); }
      ctx.stroke();
    }
    // 泡
    ctx.strokeStyle = 'rgba(200,240,255,0.45)'; ctx.lineWidth = 1.2;
    for (const b of st.bubbles) { ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, TAU); ctx.stroke(); }
  }

  // クジラの影（体 ＋ 尾びれ ＋ 胸びれ ＋ うっすら光る目）
  function whaleShape(x, y, s, dir, t, a) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s * dir, s);
    ctx.fillStyle = `rgba(2,10,20,${a.toFixed(3)})`;
    ctx.beginPath();
    ctx.moveTo(150, 0); ctx.bezierCurveTo(140, -50, 40, -58, -60, -30); ctx.bezierCurveTo(-110, -18, -150, -6, -170, 0);
    ctx.bezierCurveTo(-150, 10, -100, 26, -40, 36); ctx.bezierCurveTo(40, 46, 140, 40, 150, 0); ctx.fill();
    const f = Math.sin(t * 1.4) * 18;                       // 尾びれ（上下にゆれる）
    ctx.beginPath(); ctx.moveTo(-165, 0); ctx.lineTo(-215, -40 + f); ctx.lineTo(-195, 0 + f * 0.3); ctx.lineTo(-215, 40 + f); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(40, 30); ctx.lineTo(0, 80 + f * 0.5); ctx.lineTo(-10, 34); ctx.closePath(); ctx.fill();
    ctx.fillStyle = `rgba(127,232,255,${(a * 0.6).toFixed(3)})`;
    ctx.beginPath(); ctx.arc(100, -6, 3, 0, TAU); ctx.fill();
    ctx.restore();
  }

  // 巨大な目（リヴァイアサンが来る前）。glow = 暗い海の上に、光る部分だけを重ねる
  function eye(T, bp, glow) {
    if (scene !== 'play' || bp < EYE0 || bp > EYE1) return;
    const open = bp < EYE0 + 6 ? easeOut((bp - EYE0) / 6) : bp > ROAR ? clamp01(1 - (bp - ROAR) / 2) : 1;
    const blink = Math.abs(bp - 112) < 0.3 ? 0.15 : 1;
    const h = open * blink;
    if (h <= 0.01) return;
    const x = W / 2, y = 300, w = 230, p = playerXY();
    const lx = Math.max(-40, Math.min(40, (p.x - x) * 0.08)), ly = Math.max(-20, Math.min(20, (p.y - y) * 0.05));
    ctx.save();
    ctx.beginPath(); ctx.ellipse(x, y, w, 95 * h, 0, 0, TAU); ctx.clip();
    if (!glow) { ctx.fillStyle = 'rgba(30,10,8,0.9)'; ctx.fillRect(x - w, y - 100, w * 2, 200); }
    ctx.globalCompositeOperation = 'lighter';
    const ig = ctx.createRadialGradient(x + lx, y + ly, 8, x + lx, y + ly, 90);
    ig.addColorStop(0, 'rgba(255,220,120,0.9)'); ig.addColorStop(0.6, 'rgba(255,120,40,0.55)'); ig.addColorStop(1, 'rgba(120,20,0,0)');
    ctx.fillStyle = ig; ctx.globalAlpha = glow ? 0.55 * stage.dark : 1;
    ctx.beginPath(); ctx.arc(x + lx, y + ly, 90, 0, TAU); ctx.fill();
    ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
    ctx.fillStyle = '#050000';                              // 縦長の瞳（拍で少し開く）
    ctx.beginPath(); ctx.ellipse(x + lx, y + ly, 9 + 5 * kickOf(bp), 70, 0, 0, TAU); ctx.fill();
    ctx.restore();
    if (!glow) {
      ctx.strokeStyle = `rgba(255,150,80,${(0.5 * h).toFixed(3)})`; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.ellipse(x, y, w, 95 * h, 0, 0, TAU); ctx.stroke();
    }
  }

  function floor(look, k) {
    const y = GROUND_Y;
    const g = ctx.createLinearGradient(0, y, 0, H);
    g.addColorStop(0, '#2a3a44'); g.addColorStop(1, '#0c141a');
    ctx.fillStyle = g; ctx.fillRect(-400, y, W + 800, H - y + 400);
    ctx.fillStyle = 'rgba(160,200,210,0.18)';
    for (let x = -380; x < W + 400; x += 37) ctx.fillRect(x, y + 8 + (x * 7 % 17), 3, 2);
    ctx.fillStyle = '#1c2a32';
    for (const [x, w, h] of [[60, 70, 18], [300, 50, 12], [520, 90, 22], [720, 60, 14]]) { ctx.beginPath(); ctx.ellipse(x, y + 2, w / 2, h, 0, Math.PI, 0); ctx.fill(); }
    ctx.strokeStyle = rgba(look.color, 0.25 + 0.2 * k); ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(-400, y); ctx.lineTo(W + 400, y); ctx.stroke();
    // 海底にゆれる光の網（コースティクス）
    const T = inSong() ? songTime : titleClock();
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = 'rgba(150,230,255,0.13)'; ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (let i = 0; i < 4; i++) {
      ctx.moveTo(-20, y + 6 + i * 11);
      for (let x = -20; x <= W + 20; x += 18) ctx.lineTo(x, y + 6 + i * 11 + Math.sin(x * 0.045 + T * 1.6 + i * 2.1) * 4 + Math.sin(x * 0.02 - T + i) * 3);
    }
    ctx.stroke();
    ctx.globalCompositeOperation = 'source-over';
  }

  function platform(p, look, k) {
    ctx.fillStyle = '#26363f';
    ctx.beginPath();
    ctx.moveTo(p.x, p.y + 4);
    for (let x = p.x; x <= p.x + p.w; x += 15) ctx.lineTo(x, p.y + ((x * 13) % 5) - 1);
    ctx.lineTo(p.x + p.w, p.y + p.h); ctx.lineTo(p.x + 6, p.y + p.h + 4); ctx.closePath(); ctx.fill();
    ctx.fillStyle = rgba(look.color, 0.25 + 0.15 * k);
    ctx.fillRect(p.x + 4, p.y, p.w - 8, 2);
  }

  // 生き物のように光る玉 / マリンスノー / 泡
  function bullet(b, c, k) {
    if (b.style === 'snow') {
      ctx.fillStyle = 'rgba(235,250,255,0.95)';
      ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, TAU); ctx.fill();
      ctx.strokeStyle = 'rgba(120,200,255,0.6)'; ctx.lineWidth = 1.5; ctx.stroke();
      return;
    }
    if (b.style === 'bubble') {
      ctx.strokeStyle = rgba(c, 0.95); ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, TAU); ctx.stroke();
      ctx.fillStyle = rgba(c, 0.25); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.8)'; ctx.beginPath(); ctx.arc(b.x - b.r * 0.35, b.y - b.r * 0.35, b.r * 0.25, 0, TAU); ctx.fill();
      return;
    }
    const pulse = 0.85 + 0.15 * Math.sin(songTime * 6 + b.x * 0.05);
    ctx.fillStyle = rgba(c, 0.35);
    ctx.beginPath(); ctx.arc(b.x, b.y, b.r * 1.5 * pulse, 0, TAU); ctx.fill();
    ctx.fillStyle = rgba(c, 1);
    ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.beginPath(); ctx.arc(b.x, b.y, b.r * 0.45, 0, TAU); ctx.fill();
  }

  // クラゲ: 半透明のかさ（泳ぎ出す瞬間にすぼまる）＋ 触手
  function jelly(b, T, k) {
    const c = bulletColor(b);
    if (b.delay > 0) {
      const p = 1 - b.delay / b.delayMax;
      ctx.strokeStyle = rgba(c, 0.25 + 0.5 * p); ctx.lineWidth = 2; ctx.setLineDash([4, 5]);
      ctx.beginPath(); ctx.arc(b.x, b.y, b.r * (2.2 - p), Math.PI, 0); ctx.stroke(); ctx.setLineDash([]);
      return;
    }
    ctx.strokeStyle = rgba(c, 0.75); ctx.lineWidth = 2.5; ctx.lineCap = 'round';
    const legs = b.legPts(b);
    for (let i = 0; i < b.legs; i++) {
      ctx.beginPath(); ctx.moveTo(b.x + (i - (b.legs - 1) / 2) * b.r * 0.7, b.y + b.r * 0.3);
      for (let j = 0; j < 3; j++) { const p = legs[i * 3 + j]; ctx.lineTo(p.x, p.y); }
      ctx.stroke();
      const e = legs[i * 3 + 2]; ctx.fillStyle = rgba(c, 0.9); ctx.beginPath(); ctx.arc(e.x, e.y, 3, 0, TAU); ctx.fill();
    }
    const sq = b.pulse || 0, rx = b.r * (1.25 - 0.3 * sq), ry = b.r * (0.95 + 0.35 * sq);
    if (gfx > 0) {                                         // 泳ぎ出すたびに強く光る
      ctx.globalCompositeOperation = 'lighter';
      const G = b.r * (3.2 + 2 * sq);
      ctx.globalAlpha = 0.35 + 0.5 * sq;
      ctx.drawImage(glowSprite(c), b.x - G, b.y - G, G * 2, G * 2);
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    }
    ctx.fillStyle = rgba(c, 0.3);
    ctx.beginPath(); ctx.ellipse(b.x, b.y, rx * 1.5, ry * 1.5, 0, Math.PI, 0); ctx.fill();
    ctx.fillStyle = rgba(c, 0.85);
    ctx.beginPath(); ctx.ellipse(b.x, b.y + 2, rx, ry, 0, Math.PI, 0); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.beginPath(); ctx.ellipse(b.x - rx * 0.3, b.y - ry * 0.45, rx * 0.25, ry * 0.18, 0, 0, TAU); ctx.fill();
  }

  // リヴァイアサン: 予告 = 通り道の点線、本体 = 尾から頭へ、光る斑点のある節
  function leviathan(b, T, k) {
    const c = bulletColor(b);
    if (b.delay > 0) {
      const p = 1 - b.delay / b.delayMax, on = p > 0.6 || Math.floor(T * 10) % 2 === 0;
      ctx.strokeStyle = rgba(c, on ? 0.55 : 0.2); ctx.lineWidth = 3; ctx.setLineDash([10, 10]);
      ctx.beginPath();
      for (let x = 0; x <= W; x += 20) {
        const t = (b.dir > 0 ? x + 80 : W + 80 - x) / b.v;
        ctx.lineTo(x, b.y0 + Math.sin(t * b.wave * TAU) * b.amp);
      }
      ctx.stroke(); ctx.setLineDash([]);
      ctx.font = '800 22px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillStyle = rgba(c, on ? 0.9 : 0.4);
      ctx.fillText('⚠', b.dir > 0 ? 30 : W - 30, b.y0);
      return;
    }
    if (!b.segs.length) return;                            // 予告が終わった瞬間（まだ体の位置が計算されていない1コマ）
    for (let i = b.segs.length - 1; i >= 0; i--) {
      const s = b.segs[i];
      if (!s.on) continue;
      const nx = b.segs[Math.max(0, i - 1)], ang = Math.atan2(s.y - nx.y, s.x - nx.x) - Math.PI / 2;
      ctx.fillStyle = rgba(mixC(c, [0, 0, 0], 0.4), 1);      // 背びれのトゲ
      ctx.beginPath(); ctx.moveTo(s.x + Math.cos(ang - 0.5) * s.r, s.y + Math.sin(ang - 0.5) * s.r);
      ctx.lineTo(s.x + Math.cos(ang) * s.r * 1.7, s.y + Math.sin(ang) * s.r * 1.7);
      ctx.lineTo(s.x + Math.cos(ang + 0.5) * s.r, s.y + Math.sin(ang + 0.5) * s.r); ctx.fill();
      ctx.fillStyle = rgba(mixC(c, [0, 0, 0], 0.55 + 0.02 * i), 1);
      ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, TAU); ctx.fill();
      if (gfx > 0) {                                       // 体の横の光る点（頭から尾へ光が流れる）
        const glowA = 0.5 + 0.5 * Math.sin(T * 6 - i * 0.7);
        ctx.globalCompositeOperation = 'lighter';
        ctx.fillStyle = `rgba(127,232,255,${(0.5 * glowA).toFixed(3)})`;
        ctx.beginPath(); ctx.arc(s.x, s.y + s.r * 0.3, s.r * 0.18, 0, TAU); ctx.fill();
        ctx.globalCompositeOperation = 'source-over';
      }
      ctx.strokeStyle = rgba(c, 0.6); ctx.lineWidth = 2; ctx.stroke();
      ctx.fillStyle = rgba(mixC(c, WHITE, 0.5), 0.8);
      ctx.beginPath(); ctx.arc(s.x, s.y - s.r * 0.5, s.r * 0.14, 0, TAU); ctx.fill();
    }
    const h = b.segs[0], n = b.segs[1] || h, a = Math.atan2(h.y - n.y, h.x - n.x);
    ctx.save(); ctx.translate(h.x, h.y); ctx.rotate(a);
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(h.r * 0.45, -h.r * 0.35, 6, 0, TAU); ctx.fill();
    ctx.fillStyle = '#ff4d6d'; ctx.beginPath(); ctx.arc(h.r * 0.5, -h.r * 0.35, 3, 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(h.r * 0.95, h.r * 0.1); ctx.lineTo(h.r * 0.2, h.r * 0.35); ctx.stroke();
    ctx.restore();
  }

  // 暗い海: 自分のまわりだけ明るい。弾はうっすら光る点、ソナーの輪が通った所ははっきり
  function world(T) {
    if (stage.dark <= 0.01 || scene !== 'play') return;
    const p = playerXY(), d = stage.dark;
    const g = ctx.createRadialGradient(p.x, p.y, 70, p.x, p.y, 210);
    g.addColorStop(0, 'rgba(0,4,10,0)'); g.addColorStop(1, `rgba(0,4,10,${(0.95 * d).toFixed(3)})`);
    ctx.fillStyle = g;
    ctx.fillRect(-400, -400, W + 800, H + 800);
    const pings = stage.pings;
    eye(T, beatPos(T), true);                                // 暗闇の中で光る、巨大な目
    ctx.globalCompositeOperation = 'lighter';
    for (const q of pings) {                                 // ソナーの輪
      const R = (T - q.t0) * PING_V;
      if (R < 0 || R > 1300) continue;
      ctx.strokeStyle = `rgba(92,255,200,${(0.5 * (1 - R / 1300)).toFixed(3)})`; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(q.x, q.y, R, 0, TAU); ctx.stroke();
    }
    for (const b of bullets) {
      const pts = b.segs ? b.segs.filter(s => s.on !== false) : [{ x: b.x, y: b.y, r: b.r }];
      for (const s of pts) {
        let rev = 0;
        for (const q of pings) {
          const after = (T - q.t0) - Math.hypot(s.x - q.x, s.y - q.y) / PING_V;
          if (after > 0 && after < 0.9) rev = Math.max(rev, 1 - after / 0.9);
        }
        const c = bulletColor(b), r = (s.r || b.r);
        ctx.fillStyle = rgba(c, (0.22 + 0.75 * rev) * d);
        ctx.beginPath(); ctx.arc(s.x, s.y, b.delay > 0 ? r * 0.5 : r * (0.6 + 0.5 * rev), 0, TAU); ctx.fill();
      }
    }
    ctx.globalCompositeOperation = 'source-over';
  }

  function flash(look) {
    ctx.fillStyle = `rgba(190,240,255,${(0.3 * flashT).toFixed(3)})`;
    ctx.fillRect(0, 0, W, H);
  }

  // 場面の名前 ＋ 深さのメーター（右はし）
  function banner() {
    const T = songTime, bp = beatPos(T), R = renderScale;
    if (inSong() && bp >= 160) {                                       // 最後: 水面の光へ浮かび上がっていく
      const p = clamp01((bp - 160) / 9);
      const g = ctx.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, `rgba(220,250,255,${(0.75 * p).toFixed(3)})`); g.addColorStop(1, `rgba(120,210,255,${(0.15 * p).toFixed(3)})`);
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      const y = -60 + p * 200;
      ctx.strokeStyle = `rgba(255,255,255,${(0.8 * p).toFixed(3)})`; ctx.lineWidth = 3;
      ctx.beginPath();
      for (let x = 0; x <= W; x += 16) ctx.lineTo(x, y + Math.sin(x * 0.03 + T * 2) * 7);
      ctx.stroke();
    }   // （クリア画面になっても、この明るさのまま）
    if (scene === 'play') {
      if (gfx === 2 && st.roar > 0.02) {                     // 咆哮のあと: 水がゆがむ（横の帯がずれる）
        const amp = 7 * st.roar;
        if (!st.buf) st.buf = document.createElement('canvas');      // 一度だけ別の絵にうつしてから、帯ごとにずらして描きもどす
        if (st.buf.width !== cv.width || st.buf.height !== cv.height) { st.buf.width = cv.width; st.buf.height = cv.height; }
        const bctx = st.buf.getContext('2d');
        bctx.drawImage(cv, 0, 0);
        for (let y = 0; y < H; y += 50) ctx.drawImage(st.buf, 0, y * R, W * R, 50 * R, Math.sin(y * 0.021 + T * 1.8) * amp, y, W, 50);
      }
      if (st.heart > 0.01 && bp >= 48 && gfx > 0) {          // 心臓の音: 画面のふちが暗く脈打つ
        const g = ctx.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, H * 0.78);
        g.addColorStop(0, 'rgba(0,0,10,0)'); g.addColorStop(1, `rgba(0,0,12,${(0.45 * st.heart).toFixed(3)})`);
        ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      }

      const depth = Math.round(clamp01(songTime / SONG_END) * 10920);
      ctx.fillStyle = 'rgba(127,232,255,0.25)'; ctx.fillRect(W - 18, 60, 3, 300);
      ctx.fillStyle = 'rgba(127,232,255,0.9)'; ctx.fillRect(W - 22, 60 + 300 * clamp01(songTime / SONG_END) - 2, 11, 4);
      ctx.font = '600 12px ui-monospace, Menlo, monospace'; ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
      ctx.fillText(`${depth.toLocaleString()} m`, W - 28, 60 + 300 * clamp01(songTime / SONG_END));
    }
    const bn = fx.banner;
    if (!bn) return;
    const e = bn.age, DUR = 3.0;
    if (e > DUR) { fx.banner = null; return; }
    const a = e < 0.6 ? e / 0.6 : e > DUR - 0.8 ? (DUR - e) / 0.8 : 1;
    ctx.save();
    ctx.globalAlpha = clamp01(a);
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = '300 40px "Segoe UI", system-ui, sans-serif';
    if ('letterSpacing' in ctx) ctx.letterSpacing = `${12 + e * 3}px`;
    ctx.fillStyle = rgba(mixC(bn.c, WHITE, 0.4), 1);
    if (gfx === 2) { ctx.shadowColor = rgba(bn.c, 1); ctx.shadowBlur = 20; }
    ctx.fillText(bn.name, W / 2, 116 + (1 - easeOut(e / 0.8)) * 14);
    ctx.shadowBlur = 0;
    if ('letterSpacing' in ctx) ctx.letterSpacing = '2px';
    ctx.font = '500 14px system-ui, sans-serif';
    ctx.fillStyle = 'rgba(220,245,255,0.8)';
    ctx.fillText(bn.sub, W / 2, 152);
    if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';
    ctx.restore();
  }

  function title(look, k, bp) {
    for (let i = 0; i < 3; i++) {
      const x = 180 + i * 220, y = 250 + Math.sin(bp * 0.5 + i * 2) * 30, sq = Math.max(0, Math.sin(bp * Math.PI + i));
      ctx.fillStyle = 'rgba(255,138,216,0.35)';
      ctx.beginPath(); ctx.ellipse(x, y, 26 - 6 * sq, 20 + 6 * sq, 0, Math.PI, 0); ctx.fill();
      ctx.strokeStyle = 'rgba(255,138,216,0.5)'; ctx.lineWidth = 2;
      for (let j = -1; j <= 1; j++) { ctx.beginPath(); ctx.moveTo(x + j * 10, y); ctx.quadraticCurveTo(x + j * 12 + Math.sin(bp + j) * 6, y + 30, x + j * 8, y + 60); ctx.stroke(); }
    }
  }

  THEMES.abyss = {
    noTrails: true, glow: 2.2,
    clearColors: ['#7fe8ff', '#ff8ad8', '#5cffc8', '#ffd27f', '#ffffff'],
    kinds: { jelly, leviathan },
    reset, update, background, floor, platform, bullet, world, flash, banner, title,
  };
  // 曲が変わったら、この見た目のセットの絵を手放す（次に使うときに作り直す。メモリがふくらんで重くならないように）
  THEMES.abyss.release = () => { freeArt(st); st.kelp = null; };
})();
