"use strict";

/* =========================================================================
   見た目のセット「glass」  —  曲④「segment」用
   テーマは「ガラスの部屋」。夜の青い空間に、ゆっくり回るガラスの結晶が浮かぶ。
   地面はピアノの鍵盤（鍵盤ブロックが着くとその鍵が光る）。
   板が割れると、画面全体にひびが走ってしばらく残る。
   盛り上がる場面（tier 3 以上）では、上からプリズムの虹の光が差しこむ（画質「高」だけ）。
   ========================================================================= */

(function () {
  const CX = W / 2;
  const SANS = '"Helvetica Neue", "Hiragino Sans", "Noto Sans JP", system-ui, sans-serif';
  const WHITE = [255, 255, 255];
  const RAINBOW = ['#ff8fa3', '#ffd27a', '#9cffb0', '#7fd8ff', '#b69cff'].map(rgb);

  // ---- 状態 -------------------------------------------------------------------
  const st = { crystals: [], webs: [], lit: new Float32Array(32), motes: [] };
  const KEYS = 22, KW = W / KEYS;                         // 地面の白鍵の数と幅

  function makeCrystals() {
    st.crystals = Array.from({ length: 16 }, (_, i) => {
      const n = 5 + (i % 3), R = 26 + Math.random() * 70;
      const pts = Array.from({ length: n }, (_, j) => {
        const a = j / n * TAU + (Math.random() - 0.5) * 0.6, r = R * (0.55 + Math.random() * 0.6) * (j % 2 ? 1 : 1.5);
        return [Math.cos(a) * r, Math.sin(a) * r * 1.4];
      });
      return { x: Math.random() * W, y: 40 + Math.random() * (GROUND_Y - 160), z: 0.3 + Math.random() * 0.7, rot: Math.random() * TAU,
        spin: (Math.random() - 0.5) * 0.25, vy: -(3 + Math.random() * 6), pts, c: RAINBOW[i % 5] };
    });
  }

  function reset() { st.webs.length = 0; st.lit.fill(0); st.motes.length = 0; }

  function update(dt, T, look) {
    if (!st.crystals.length) makeCrystals();
    const tier = look.tier;
    for (const c of st.crystals) {
      c.rot += c.spin * dt * (1 + tier * 0.3);
      c.y += c.vy * dt * (1 + tier * 0.4) * c.z;
      if (c.y < -120) { c.y = GROUND_Y + 60; c.x = Math.random() * W; }
    }
    for (const w of st.webs) w.age += dt;
    st.webs = st.webs.filter(w => w.age < w.life);
    for (let i = 0; i < st.lit.length; i++) st.lit[i] = Math.max(0, st.lit[i] - dt * 2.5);
    // ゆっくり舞う小さなきらめき
    const want = Math.round([10, 14, 18, 22, 26, 30][Math.round(tier)] * [0.3, 0.6, 1][gfx]);
    if (st.motes.length < want && Math.random() < dt * 8) {
      st.motes.push({ x: Math.random() * W, y: -10, vy: 20 + Math.random() * 30, vx: (Math.random() - 0.5) * 16, ph: Math.random() * TAU, age: 0, life: 6 + Math.random() * 6 });
    }
    for (const m of st.motes) { m.age += dt; m.y += m.vy * dt; m.x += m.vx * dt; }
    st.motes = st.motes.filter(m => m.age < m.life && m.y < GROUND_Y);
  }

  // 板が割れた: 画面いっぱいにひびが走って、しばらく残る
  function shatter(b) {
    const s = b.size || 1, arms = 8 + Math.round(s * 6), lines = [];
    for (let i = 0; i < arms; i++) {
      let a = (i + Math.random() * 0.6) / arms * TAU, x = b.hx, y = b.hy;
      const pts = [[x, y]];
      const steps = 6 + Math.round(s * 6);
      for (let j = 0; j < steps; j++) {
        a += (Math.random() - 0.5) * 0.7;
        x += Math.cos(a) * (40 + Math.random() * 60); y += Math.sin(a) * (40 + Math.random() * 60);
        pts.push([x, y]);
      }
      lines.push(pts);
    }
    const rings = [0.2, 0.42, 0.7].map(f => lines.map(l => l[Math.round(f * (l.length - 1))]));
    st.webs.push({ lines, rings, age: 0, life: 1.6 + s * 0.8, s });
    if (st.webs.length > 4) st.webs.shift();
  }
  function keyHit(b) {
    const i = Math.max(0, Math.min(KEYS - 1, Math.floor(b.x / KW)));
    st.lit[i] = 1;
  }

  // ---- 背景 ----------------------------------------------------------------
  function background(T, look, k, bk, bp) {
    if (!st.crystals.length) makeCrystals();
    const tier = look.tier;
    vGradient([[0, rgba(look.skyTop, 1)], [1, rgba(mixC(look.skyBot, WHITE, 0.05 * k * clamp01(tier - 2)), 1)]], GROUND_Y);

    ctx.globalCompositeOperation = 'lighter';
    drawStars(T, [16, 30, 50][gfx]);

    // プリズムの虹の光（盛り上がる場面、画質「高」だけ）
    if (gfx === 2 && tier >= 2.5) {
      const a = clamp01((tier - 2.5) / 2) * (0.5 + 0.5 * k);
      RAINBOW.forEach((c, i) => {
        const ang = 0.9 + i * 0.07 + Math.sin(bp * Math.PI / 16) * 0.12, len = 1200;
        const x0 = -60, y0 = -60;
        const gr = ctx.createLinearGradient(x0, y0, x0 + Math.cos(ang) * len, y0 + Math.sin(ang) * len);
        gr.addColorStop(0, rgba(c, 0.10 * a)); gr.addColorStop(1, rgba(c, 0));
        ctx.fillStyle = gr;
        ctx.beginPath();
        ctx.moveTo(x0, y0);
        ctx.lineTo(x0 + Math.cos(ang - 0.03) * len, y0 + Math.sin(ang - 0.03) * len);
        ctx.lineTo(x0 + Math.cos(ang + 0.03) * len, y0 + Math.sin(ang + 0.03) * len);
        ctx.closePath(); ctx.fill();
      });
    }

    // 浮かぶガラスの結晶（奥のものほどうすく小さい）
    const n = [6, 11, 16][gfx];
    for (let i = 0; i < n; i++) {
      const c = st.crystals[i], a = (0.05 + 0.05 * clamp01(tier / 4)) * (0.5 + c.z) + 0.04 * k * c.z;
      ctx.save();
      ctx.translate(c.x, c.y);
      ctx.rotate(c.rot);
      ctx.scale(c.z, c.z);
      ctx.beginPath();
      c.pts.forEach(([x, y], j) => (j ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
      ctx.closePath();
      ctx.fillStyle = rgba(mixC(c.c, look.color, 0.5), a);
      ctx.fill();
      ctx.strokeStyle = rgba(WHITE, a * 2.2);
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.beginPath(); ctx.moveTo(c.pts[0][0], c.pts[0][1]); ctx.lineTo(c.pts[2][0], c.pts[2][1]); ctx.stroke();   // 面の境目
      ctx.restore();
    }

    // きらめき
    for (const m of st.motes) {
      const f = Math.sin(Math.PI * m.age / m.life) * (0.5 + 0.5 * Math.sin(m.age * 5 + m.ph));
      ctx.fillStyle = rgba(mixC(look.color, WHITE, 0.6), 0.8 * f);
      ctx.fillRect(m.x - 1, m.y - 3, 2, 6); ctx.fillRect(m.x - 3, m.y - 1, 6, 2);
    }

    // 小節の頭で、まん中から光の輪（ガラスを指ではじいたような）
    for (const r of fx.bgRings) {
      ctx.strokeStyle = rgba(look.color, r.a * 0.25 * clamp01(tier / 2));
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(CX, 280, 60 + r.r * 0.8, 0, TAU); ctx.stroke();
    }
    ctx.globalCompositeOperation = 'source-over';
  }

  // ---- 地面: ピアノの鍵盤（ブロックが着いた鍵が光る）------------------------------
  function floor(look, k) {
    const y = GROUND_Y + 2, h = H - GROUND_Y;
    for (let i = 0; i < KEYS; i++) {
      const x = i * KW, l = st.lit[i];
      ctx.fillStyle = rgba(mixC([200, 214, 235], WHITE, l * 0.8), 0.3 + 0.1 * k + 0.5 * l);
      ctx.fillRect(x + 1, y, KW - 2, h);
      if (l > 0 && gfx > 0) {
        ctx.globalCompositeOperation = 'lighter';
        ctx.fillStyle = rgba(look.color, 0.35 * l);
        ctx.fillRect(x - 4, y - 30 * l, KW + 8, 30 * l);
        ctx.globalCompositeOperation = 'source-over';
      }
    }
    ctx.fillStyle = 'rgba(6,10,22,0.92)';                    // 黒鍵（2つ・3つのならび）
    for (let i = 0; i < KEYS; i++) {
      const n = i % 7;
      if (n === 2 || n === 6) continue;
      ctx.fillRect((i + 1) * KW - KW * 0.3, y, KW * 0.6, h * 0.55);
    }
  }

  // ---- 足場: ガラスの板 ---------------------------------------------------------
  function platform(p, look, k) {
    ctx.fillStyle = rgba(mixC(look.color, WHITE, 0.4), 0.14 + 0.08 * k);
    ctx.fillRect(p.x, p.y, p.w, p.h);
    ctx.strokeStyle = rgba(mixC(look.color, WHITE, 0.6), 0.7 + 0.3 * k);
    ctx.lineWidth = 1.5;
    ctx.strokeRect(p.x + 0.5, p.y + 0.5, p.w - 1, p.h - 1);
    ctx.fillStyle = rgba(WHITE, 0.75);
    ctx.fillRect(p.x + 4, p.y + 2, p.w * 0.4, 1.5);
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = rgba(WHITE, 0.25);                        // 映りこみの斜線
    for (const f of [0.6, 0.68]) {
      ctx.beginPath();
      ctx.moveTo(p.x + p.w * f, p.y + p.h); ctx.lineTo(p.x + p.w * f + 6, p.y); ctx.lineTo(p.x + p.w * f + 9, p.y); ctx.lineTo(p.x + p.w * f + 3, p.y + p.h);
      ctx.fill();
    }
    ctx.globalCompositeOperation = 'source-over';
  }

  // ---- 弾: 破片はとがった三角、ほかはガラス玉 -----------------------------------
  function bullet(b, c, k) {
    if (b.style === 'shard') {
      const a = Math.atan2(b.vy, b.vx) + (b.spin || 0) * 0.15 * Math.sin(b.age * 4), r = b.r;
      ctx.save();
      ctx.translate(b.x, b.y);
      ctx.rotate(a);
      ctx.beginPath();
      ctx.moveTo(r * 2.0, 0); ctx.lineTo(-r * 1.1, -r * 0.95); ctx.lineTo(-r * 0.6, r * 1.05);
      ctx.closePath();
      ctx.fillStyle = rgba(c, 0.9);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.95)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.8)';
      ctx.beginPath(); ctx.moveTo(r * 1.4, 0); ctx.lineTo(-r * 0.4, -r * 0.45); ctx.lineTo(-r * 0.2, r * 0.1); ctx.closePath(); ctx.fill();
      ctx.restore();
      return;
    }
    ctx.fillStyle = rgba(c, 0.85);
    ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.beginPath(); ctx.arc(b.x - b.r * 0.3, b.y - b.r * 0.3, b.r * 0.35, 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.8)';
    ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, TAU); ctx.stroke();
  }

  // ---- 割れたあとのひび（画面の上に、しばらく残る）＋ 光る演出 ---------------------------
  function flash(look) {
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = rgba(mixC(look.color, WHITE, 0.6), 0.4 * flashT);
    ctx.fillRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'source-over';
  }
  function drawWebs() {
    for (const w of st.webs) {
      const a = 1 - w.age / w.life, grow = clamp01(w.age / 0.12);
      ctx.strokeStyle = rgba(WHITE, 0.55 * a);
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      for (const l of w.lines) {
        const n = Math.max(1, Math.round((l.length - 1) * grow));
        ctx.moveTo(l[0][0], l[0][1]);
        for (let i = 1; i <= n; i++) ctx.lineTo(l[i][0], l[i][1]);
      }
      if (grow >= 1) for (const r of w.rings) { r.forEach((q, i) => (i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1]))); ctx.closePath(); }
      ctx.stroke();
    }
  }

  // ---- 場面の名前: 細い文字が、ななめのひびで2つにずれている -----------------------
  function banner() {
    drawWebs();                                     // （画面の上の演出として、ここでいっしょに描く）
    const bn = fx.banner;
    if (!bn) return;
    const e = bn.age, DUR = 2.6;
    if (e > DUR) { fx.banner = null; return; }
    const a = e < 0.3 ? e / 0.3 : e > DUR - 0.6 ? (DUR - e) / 0.6 : 1;
    const y = 120, slip = 4 * (1 - easeOut(e / 1.2)) + 2;
    ctx.save();
    ctx.globalAlpha = clamp01(a);
    const g = ctx.createLinearGradient(0, 0, W, 0);
    g.addColorStop(0, 'rgba(10,16,34,0)'); g.addColorStop(0.5, 'rgba(10,16,34,0.5)'); g.addColorStop(1, 'rgba(10,16,34,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, y - 44, W, 88);
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = `300 34px ${SANS}`;
    if ('letterSpacing' in ctx) ctx.letterSpacing = '14px';
    const half = (top, dx, dy) => {               // ななめの線の上半分 / 下半分だけ描く
      ctx.save();
      ctx.beginPath();
      if (top) { ctx.moveTo(0, y - 60); ctx.lineTo(W, y - 60); ctx.lineTo(W, y - 22); ctx.lineTo(0, y + 6); }
      else { ctx.moveTo(0, y + 6); ctx.lineTo(W, y - 22); ctx.lineTo(W, y + 40); ctx.lineTo(0, y + 40); }
      ctx.closePath(); ctx.clip();
      ctx.fillStyle = '#f4fbff';
      if (gfx === 2) { ctx.shadowColor = rgba(bn.c, 1); ctx.shadowBlur = 12; }
      ctx.fillText(bn.name, W / 2 + dx, y - 8 + dy);
      ctx.restore();
    };
    half(true, -slip, -slip * 0.4);
    half(false, slip, slip * 0.4);
    ctx.strokeStyle = rgba(WHITE, 0.6);           // ひびの線
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(W / 2 - 200, y - 22 + 28 * (1 - (W / 2 - 200) / W)); ctx.lineTo(W / 2 + 200, y - 22 + 28 * (1 - (W / 2 + 200) / W)); ctx.stroke();
    if ('letterSpacing' in ctx) ctx.letterSpacing = '4px';
    ctx.font = `400 15px ${SANS}`;
    ctx.fillStyle = rgba(mixC(bn.c, WHITE, 0.55), clamp01((e - 0.3) / 0.5));
    ctx.fillText(bn.sub, W / 2, y + 30);
    if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';
    ctx.restore();
  }

  // ---- タイトル: 割れた輪のように、破片がならんでゆっくり回る -----------------------
  function title(look, k, bp) {
    const N = 18;
    for (let i = 0; i < N; i++) {
      const gap = i % 6 === 5;                     // ところどころ欠けている
      if (gap) continue;
      const a = i / N * TAU + bp * 0.06, r = 190 + 8 * Math.sin(bp * Math.PI / 2 + i) + 6 * k;
      const x = CX + Math.cos(a) * r, y = 270 + Math.sin(a) * r * 0.9;
      const c = RAINBOW[i % 5];
      if (gfx > 0) {
        ctx.globalCompositeOperation = 'lighter';
        ctx.drawImage(glowSprite(c), x - 22, y - 22, 44, 44);
        ctx.globalCompositeOperation = 'source-over';
      }
      bullet({ x, y, r: 9, vx: Math.cos(a + Math.PI / 2), vy: Math.sin(a + Math.PI / 2), style: 'shard', spin: 0, age: 0 }, c, k);
    }
  }

  THEMES.glass = {
    noTrails: true, noScanlines: true, glow: 1.6,
    clearColors: ['#ff8fa3', '#ffd27a', '#9cffb0', '#7fd8ff', '#b69cff', '#ffffff'],
    reset, update, background, floor, platform, bullet, flash, banner, title, shatter, keyHit,
  };
})();
