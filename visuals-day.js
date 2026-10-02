"use strict";

/* =========================================================================
   見た目のセット「day」  —  曲⑧「First Step」（初心者用）
   明るい昼の空。拍に合わせて光る太陽、流れる雲、遠くの丘、花の咲いた草の床、木の足場。
   弾はカラフルなキャンディのような丸（白いふち ＋ 影で、明るい空でも見やすい）。
   「やること」のヒントは白い吹き出しで出る。
   ========================================================================= */

(function () {
  const WHITE = [255, 255, 255], INK = [40, 44, 70];
  const SUN = { x: 640, y: 130 };
  const st = { clouds: null, flowers: null, t: 0 };

  function makeScene() {
    st.clouds = Array.from({ length: 6 }, (_, i) => ({ x: Math.random() * W, y: 60 + Math.random() * 260, s: 0.6 + Math.random() * 0.8, v: 8 + Math.random() * 14 }));
    st.flowers = Array.from({ length: 22 }, () => ({ x: Math.random() * W, c: ['#ff6b8b', '#ffd84d', '#ffffff', '#9b6bff'][(Math.random() * 4) | 0], y: 10 + Math.random() * 30 }));
  }
  function reset() { st.t = 0; }
  function update(dt) {
    if (!st.clouds) makeScene();
    st.t += dt;
    for (const c of st.clouds) { c.x += c.v * dt; if (c.x > W + 120) { c.x = -120; c.y = 60 + Math.random() * 260; } }
  }

  function cloud(x, y, s, a) {
    ctx.fillStyle = `rgba(255,255,255,${a})`;
    ctx.beginPath();
    for (const [dx, dy, r] of [[-40, 6, 26], [-12, -8, 34], [22, -2, 30], [48, 8, 22], [6, 12, 28]]) {
      ctx.moveTo(x + dx * s + r * s, y + dy * s); ctx.arc(x + dx * s, y + dy * s, r * s, 0, TAU);
    }
    ctx.fill();
  }

  function background(T, look, k, bk, bp) {
    if (!st.clouds) makeScene();
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, rgba(look.skyTop, 1));
    g.addColorStop(1, rgba(look.skyBot, 1));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    // 太陽: 拍で少しふくらみ、光の線がゆっくり回る
    const R = 46 + 6 * k;
    ctx.save(); ctx.translate(SUN.x, SUN.y); ctx.rotate(bp * 0.12);
    ctx.fillStyle = `rgba(255,236,150,${0.35 + 0.2 * k})`;
    for (let i = 0; i < 12; i++) {
      ctx.rotate(TAU / 12);
      ctx.beginPath(); ctx.moveTo(-7, R + 10); ctx.lineTo(7, R + 10); ctx.lineTo(0, R + 34 + 10 * k); ctx.closePath(); ctx.fill();
    }
    ctx.restore();
    const sg = ctx.createRadialGradient(SUN.x, SUN.y, 10, SUN.x, SUN.y, R * 2.2);
    sg.addColorStop(0, 'rgba(255,250,200,0.9)'); sg.addColorStop(1, 'rgba(255,240,180,0)');
    ctx.fillStyle = sg; ctx.beginPath(); ctx.arc(SUN.x, SUN.y, R * 2.2, 0, TAU); ctx.fill();
    ctx.fillStyle = '#fff3a8'; ctx.beginPath(); ctx.arc(SUN.x, SUN.y, R, 0, TAU); ctx.fill();
    ctx.fillStyle = '#5a4630';                                         // にこにこの顔
    ctx.beginPath(); ctx.arc(SUN.x - 14, SUN.y - 6, 4, 0, TAU); ctx.arc(SUN.x + 14, SUN.y - 6, 4, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#5a4630'; ctx.lineWidth = 3; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.arc(SUN.x, SUN.y + 4, 14, 0.2 * Math.PI, 0.8 * Math.PI); ctx.stroke();
    // 雲
    for (const c of st.clouds) cloud(c.x, c.y, c.s, 0.85);
    // 遠くの丘（2段）
    for (const [y0, col, amp, f] of [[GROUND_Y - 90, 'rgba(120,200,140,0.55)', 40, 0.006], [GROUND_Y - 40, 'rgba(90,180,110,0.8)', 26, 0.011]]) {
      ctx.fillStyle = col;
      ctx.beginPath(); ctx.moveTo(-400, H);
      for (let x = -400; x <= W + 400; x += 20) ctx.lineTo(x, y0 - amp * (0.5 + 0.5 * Math.sin(x * f + y0)));
      ctx.lineTo(W + 400, H); ctx.closePath(); ctx.fill();
    }
  }

  // 草の床 ＋ 花（拍でゆれる）
  function floor(look, k, bp) {
    const y = GROUND_Y;
    ctx.fillStyle = '#7a5236'; ctx.fillRect(-400, y, W + 800, H - y + 400);
    ctx.fillStyle = '#5fc46a'; ctx.fillRect(-400, y, W + 800, 16);
    ctx.fillStyle = '#4aa957';
    for (let x = -400; x < W + 400; x += 14) { ctx.beginPath(); ctx.moveTo(x, y + 16); ctx.lineTo(x + 7, y + 24); ctx.lineTo(x + 14, y + 16); ctx.fill(); }
    ctx.fillStyle = 'rgba(0,0,0,0.12)';
    for (let x = -380; x < W + 400; x += 60) ctx.fillRect(x, y + 34, 18, 6);
    if (!st.flowers) makeScene();
    const sw = Math.sin(bp * Math.PI) * 2;
    for (const f of st.flowers) {
      const fx = f.x + sw, fy = y - 2;
      ctx.strokeStyle = '#3f9a4c'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(f.x, y + 4); ctx.lineTo(fx, fy - 6); ctx.stroke();
      ctx.fillStyle = f.c;
      for (let i = 0; i < 5; i++) { const a = i / 5 * TAU; ctx.beginPath(); ctx.arc(fx + Math.cos(a) * 3.5, fy - 8 + Math.sin(a) * 3.5, 2.6, 0, TAU); ctx.fill(); }
      ctx.fillStyle = '#ffd84d'; ctx.beginPath(); ctx.arc(fx, fy - 8, 2, 0, TAU); ctx.fill();
    }
  }

  // 木の足場
  function platform(p, look, k) {
    roundRect(p.x, p.y, p.w, p.h, 5);
    ctx.fillStyle = '#b97a45'; ctx.fill();
    ctx.fillStyle = '#5fc46a'; roundRect(p.x, p.y - 2, p.w, 7, 4); ctx.fill();
    ctx.strokeStyle = 'rgba(80,45,20,0.6)'; ctx.lineWidth = 1.5;
    roundRect(p.x, p.y - 2, p.w, p.h + 2, 5); ctx.stroke();
    ctx.beginPath();
    for (let x = p.x + 30; x < p.x + p.w - 10; x += 34) { ctx.moveTo(x, p.y + 6); ctx.lineTo(x, p.y + p.h - 2); }
    ctx.stroke();
  }

  // カラフルなキャンディ玉（影 ＋ 白いふち ＋ つや）。転がるボールはビーチボール
  function bullet(b, c, k) {
    const r = b.r;
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    ctx.beginPath(); ctx.arc(b.x + 2, b.y + 3, r + 1, 0, TAU); ctx.fill();
    if (b.style === 'roller') {
      ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(b.x / r);
      const cols = ['#ff5f8f', '#ffffff', '#3c9dff', '#ffffff', '#ffc93c', '#ffffff'];
      for (let i = 0; i < 6; i++) { ctx.fillStyle = cols[i]; ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, r * 1.15, i / 6 * TAU, (i + 1) / 6 * TAU); ctx.fill(); }
      ctx.strokeStyle = 'rgba(40,44,70,0.8)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, 0, r * 1.15, 0, TAU); ctx.stroke();
      ctx.restore();
      return;
    }
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(b.x, b.y, r + 2.5, 0, TAU); ctx.fill();
    ctx.fillStyle = rgba(c, 1);
    ctx.beginPath(); ctx.arc(b.x, b.y, r, 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    ctx.beginPath(); ctx.arc(b.x - r * 0.35, b.y - r * 0.35, r * 0.32, 0, TAU); ctx.fill();
    if (b.style === 'note') {                        // 音符の印
      ctx.fillStyle = 'rgba(255,255,255,0.95)';
      ctx.beginPath(); ctx.ellipse(b.x - 1, b.y + 3, 3.2, 2.4, -0.4, 0, TAU); ctx.fill();
      ctx.fillRect(b.x + 1.5, b.y - 6, 1.6, 9);
    }
  }

  function flash(look) {
    ctx.fillStyle = `rgba(255,255,240,${(0.35 * flashT).toFixed(3)})`;
    ctx.fillRect(0, 0, W, H);
  }

  // ヒント: 白い吹き出し
  function hint(h, a, T) {
    ctx.save();
    ctx.globalAlpha = clamp01(a);
    ctx.font = '800 26px "Hiragino Maru Gothic ProN", "Hiragino Sans", system-ui, sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const w = ctx.measureText(h.text).width + 48, x = W / 2 - w / 2, y = H * 0.35 - 28 + Math.sin(T * 4) * 3;
    ctx.fillStyle = 'rgba(40,44,70,0.25)'; roundRect(x + 4, y + 5, w, 56, 28); ctx.fill();
    ctx.fillStyle = '#ffffff'; roundRect(x, y, w, 56, 28); ctx.fill();
    ctx.strokeStyle = '#ffc93c'; ctx.lineWidth = 4; ctx.stroke();
    ctx.fillStyle = rgba(INK, 1);
    ctx.fillText(h.text, W / 2, y + 29);
    ctx.restore();
  }

  // 場面の名前: 丸いラベルがぽんと出る
  function banner() {
    const bn = fx.banner;
    if (!bn) return;
    const e = bn.age, DUR = 2.2;
    if (e > DUR) { fx.banner = null; return; }
    const a = e > DUR - 0.4 ? (DUR - e) / 0.4 : 1, pop = e < 0.25 ? 0.6 + 0.4 * easeOut(e / 0.25) + 0.08 * Math.sin(e / 0.25 * Math.PI) : 1;
    ctx.save();
    ctx.globalAlpha = clamp01(a);
    ctx.translate(W / 2, 110); ctx.scale(pop, pop);
    ctx.font = '900 34px "Segoe UI", system-ui, sans-serif';
    const w = Math.max(240, ctx.measureText(bn.name).width + 70);
    ctx.fillStyle = 'rgba(40,44,70,0.25)'; roundRect(-w / 2 + 4, -34, w, 72, 36); ctx.fill();
    ctx.fillStyle = '#fff'; roundRect(-w / 2, -38, w, 72, 36); ctx.fill();
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = rgba(mixC(bn.c, INK, bn.c[0] > 230 && bn.c[1] > 230 ? 0.8 : 0.2), 1);
    ctx.fillText(bn.name, 0, -10);
    ctx.font = '700 14px system-ui, sans-serif';
    ctx.fillStyle = rgba(INK, 0.8);
    ctx.fillText(bn.sub, 0, 18);
    ctx.restore();
  }

  function title(look, k, bp) {
    const cols = ['#ff5f8f', '#ff8a3c', '#ffc93c', '#3ccf6e', '#3c9dff', '#9b6bff'];
    for (let i = 0; i < 6; i++) {
      const a = bp * 0.25 + i / 6 * TAU, x = W / 2 + Math.cos(a) * 210, y = 280 + Math.sin(a) * 120 - Math.abs(Math.sin(bp * Math.PI + i)) * 10;
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(x, y, 14, 0, TAU); ctx.fill();
      ctx.fillStyle = cols[i]; ctx.beginPath(); ctx.arc(x, y, 11, 0, TAU); ctx.fill();
    }
  }

  THEMES.day = {
    noTrails: true, noScanlines: true, glow: 1.2,
    clearColors: ['#ff5f8f', '#ffc93c', '#3ccf6e', '#3c9dff', '#9b6bff'],
    reset, update, background, floor, platform, bullet, flash, hint, banner, title,
  };
})();
