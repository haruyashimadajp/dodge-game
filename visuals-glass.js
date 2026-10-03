"use strict";

/* =========================================================================
   見た目のセット「glass」  —  曲④「segment」用
   テーマは「ガラスの部屋」。部屋のまん中に、三角のガラスでできた大きな球がゆっくり回っている。
   球は曲といっしょに「ひび → 割れる → 破片（segment）になって広がる → 集まる → また透明な球」と変わる:
     イントロ   … きれいな球
     FRACTURE   … ガラスにひびが少しずつ増える
     最初に割れる … 三角の破片がふわっと離れる（板が割れるたびに、破片がぐっと外へ飛ぶ）
     サビ       … 破片がキックに合わせて脈打つ
     間奏       … 破片が大きく離れて止まりかける → 逆再生のように中心へ集まる
     最後のサビ … また開いて速く回る
     CLEAR      … ひとつの透明な球にもどる
   左上の高い窓から白い光が差しこみ、球を通ると虹に分かれる（盛り上がるほど虹が強い）。
   地面はピアノの鍵盤（鍵盤ブロックが着くとその鍵が光る）。板が割れると、画面全体にひびが走ってしばらく残る。
   ========================================================================= */

(function () {
  const CX = W / 2;
  const SANS = '"Helvetica Neue", "Hiragino Sans", "Noto Sans JP", system-ui, sans-serif';
  const WHITE = [255, 255, 255];
  const RAINBOW = ['#ff8fa3', '#ffd27a', '#9cffb0', '#7fd8ff', '#b69cff'].map(rgb);

  // ---- 状態 -------------------------------------------------------------------
  const st = { webs: [], lit: new Float32Array(32), motes: [], rot: 0, ex: 0, boom: 0 };
  const SX = W / 2, SY = 300, SR = 150;                     // ガラスの球の中心と半径

  // ---- ガラスの球: 正二十面体を1回こまかくした 80枚の三角 ------------------------------------
  const FACES = (() => {
    const t = (1 + Math.sqrt(5)) / 2;
    let V = [[-1, t, 0], [1, t, 0], [-1, -t, 0], [1, -t, 0], [0, -1, t], [0, 1, t], [0, -1, -t], [0, 1, -t], [t, 0, -1], [t, 0, 1], [-t, 0, -1], [-t, 0, 1]];
    const nrm = v => { const l = Math.hypot(v[0], v[1], v[2]); return [v[0] / l, v[1] / l, v[2] / l]; };
    V = V.map(nrm);
    let F = [[0, 11, 5], [0, 5, 1], [0, 1, 7], [0, 7, 10], [0, 10, 11], [1, 5, 9], [5, 11, 4], [11, 10, 2], [10, 7, 6], [7, 1, 8],
      [3, 9, 4], [3, 4, 2], [3, 2, 6], [3, 6, 8], [3, 8, 9], [4, 9, 5], [2, 4, 11], [6, 2, 10], [8, 6, 7], [9, 8, 1]].map(f => f.map(i => V[i]));
    const mid = (a, b) => nrm([(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2]);
    F = F.flatMap(([a, b, c]) => { const ab = mid(a, b), bc = mid(b, c), ca = mid(c, a); return [[a, ab, ca], [b, bc, ab], [c, ca, bc], [ab, bc, ca]]; });
    return F.map((v, i) => {
      const c = nrm([(v[0][0] + v[1][0] + v[2][0]) / 3, (v[0][1] + v[1][1] + v[2][1]) / 3, (v[0][2] + v[1][2] + v[2][2]) / 3]);
      const crack = (i * 37) % 80 / 80;                     // ひびが入る順番（0〜1）
      const k = i % 3;                                     // ひびの線: 頂点 k から向かいの辺のまん中へ
      return { v, c, crack, k, far: 0.7 + ((i * 53) % 17) / 17 * 0.6, tint: RAINBOW[i % 5] };
    });
  })();
  const LIGHT = (() => { const l = [-0.55, -0.65, 0.55], n = Math.hypot(...l); return l.map(x => x / n); })();

  // 曲の時刻 → 球の開き具合（場面ごと）と、ひびの量
  function sphereTarget(T) {
    if (scene === 'title') return { ex: 0.1 + 0.05 * Math.sin(T * 0.8), crack: 0.3 };
    const crack = clamp01((T - 12.45) / 12);
    if (T < 24.45) return { ex: 0, crack };
    if (T < 60.45) return { ex: 0.22, crack: 1 };
    if (T < 84.45) return { ex: 0.42, crack: 1 };
    if (T < 93.45) return { ex: 0.7, crack: 1 };
    if (T < 96.45) return { ex: 0.7 - 0.6 * clamp01((T - 93.45) / 3), crack: 1 };   // 逆再生のように集まる
    if (T < 120.45) return { ex: 0.5, crack: 1 };
    return { ex: 0, crack: 1 - clamp01((T - 120.45) / 3) };                            // 透明な球にもどる
  }
  const KEYS = 22, KW = W / KEYS;                         // 地面の白鍵の数と幅

  function reset() { st.webs.length = 0; st.lit.fill(0); st.motes.length = 0; st.ex = 0; st.boom = 0; }

  function update(dt, T, look) {
    const tier = look.tier;
    const tg = sphereTarget(T);
    st.crack = tg.crack;
    st.ex += (tg.ex - st.ex) * Math.min(1, dt * (T > 93.45 && T < 96.45 ? 8 : 2.5));
    st.boom *= Math.exp(-dt * 2.5);
    st.rot += dt * (0.12 + 0.05 * tier) * (T > 84.45 && T < 93.45 && scene === 'play' ? 0.3 : 1);
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
    st.boom = Math.min(0.9, st.boom + 0.35 * (b.size || 1));    // 球の破片も、ぐっと外へ飛ぶ
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

  let beams = null;
  function makeBeams() {
    const white = document.createElement('canvas'); white.width = W; white.height = H;
    let g = white.getContext('2d');
    const gr = g.createLinearGradient(50, 85, SX, SY);
    gr.addColorStop(0, rgba(WHITE, 0.0)); gr.addColorStop(0.3, rgba(WHITE, 0.09)); gr.addColorStop(1, rgba(WHITE, 0.15));
    g.fillStyle = gr;
    g.beginPath(); g.moveTo(14, 20); g.lineTo(84, 150); g.lineTo(SX + 30, SY + 40); g.lineTo(SX - 40, SY - 30); g.closePath(); g.fill();
    // 虹の扇（球の中心を 40,40 に置いた絵。右下へ広がる）
    const rainbow = document.createElement('canvas'); rainbow.width = 760; rainbow.height = 760;
    g = rainbow.getContext('2d');
    g.globalCompositeOperation = 'lighter';
    RAINBOW.forEach((c, i) => {
      const ang = 0.55 + i * 0.075, len = 900;
      const g2 = g.createLinearGradient(40, 40, 40 + Math.cos(ang) * len, 40 + Math.sin(ang) * len);
      g2.addColorStop(0, rgba(c, 0.16)); g2.addColorStop(1, rgba(c, 0));
      g.fillStyle = g2;
      g.beginPath();
      g.moveTo(60, 60);
      g.lineTo(40 + Math.cos(ang - 0.035) * len, 40 + Math.sin(ang - 0.035) * len);
      g.lineTo(40 + Math.cos(ang + 0.035) * len, 40 + Math.sin(ang + 0.035) * len);
      g.closePath(); g.fill();
    });
    beams = { white, rainbow };
  }

  // ---- ガラスの球を描く: 奥の面（うすく）→ 手前の面（光の当たる面ほど明るい）---------------
  const P = new Float32Array(2);
  function drawSphere(ctx, look, k, tier) {
    const ex = st.ex + st.boom + 0.06 * k * clamp01(tier - 3), cr = st.crack;
    const ay = st.rot, ax = 0.35 + 0.15 * Math.sin(st.rot * 0.7);
    const cy = Math.cos(ay), sy = Math.sin(ay), cx = Math.cos(ax), sx = Math.sin(ax);
    const rotV = v => { const x = v[0] * cy + v[2] * sy, z0 = -v[0] * sy + v[2] * cy, y = v[1] * cx - z0 * sx, z = v[1] * sx + z0 * cx; return [x, y, z]; };
    const proj = (x, y, z) => { const f = 900 / (900 - z * SR); P[0] = SX + x * SR * f; P[1] = SY + y * SR * f; return P; };
    const list = [];
    for (const F of FACES) {
      const c = rotV(F.c), off = ex * F.far, shrink = 1 - Math.min(0.25, ex * 0.3);
      const pts = F.v.map(v => { const r = rotV(v); return [c[0] * off + c[0] + (r[0] - c[0]) * shrink, c[1] * off + c[1] + (r[1] - c[1]) * shrink, c[2] * off + c[2] + (r[2] - c[2]) * shrink]; });
      list.push({ F, c, pts, z: c[2] });
    }
    list.sort((a, b) => a.z - b.z);
    ctx.lineJoin = 'round';
    for (const f of list) {
      const front = f.c[2] > 0;
      if (!front && gfx === 0) continue;
      const lam = Math.max(0, f.c[0] * LIGHT[0] + f.c[1] * LIGHT[1] + f.c[2] * LIGHT[2]);
      const spec = Math.pow(lam, 6);
      ctx.beginPath();
      for (let i = 0; i < 3; i++) { const q = proj(...f.pts[i]); i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1]); }
      ctx.closePath();
      const tintC = mixC(f.F.tint, look.color, 0.4);
      if (front) {
        const fade = 1 - 0.45 * clamp01(ex);                    // 開いた破片はうすく（とがった弾とまちがえないように）
        ctx.fillStyle = rgba(mixC(tintC, WHITE, 0.3 + 0.5 * spec), (0.06 + 0.1 * lam + 0.22 * spec + 0.03 * k) * fade);
        ctx.fill();
        ctx.strokeStyle = rgba(mixC(look.color, WHITE, 0.6), (0.3 + 0.4 * lam) * fade);
        ctx.lineWidth = 1;
      } else {
        ctx.fillStyle = rgba(tintC, 0.05);
        ctx.fill();
        ctx.strokeStyle = rgba(look.color, 0.14);
        ctx.lineWidth = 1;
      }
      ctx.stroke();
      // ひび（割れる前だけ。ひびの量に合わせて、入る面が増える）
      if (front && f.F.crack < cr && ex < 0.05) {
        const a = proj(...f.pts[f.F.k]), ax0 = a[0], ay0 = a[1];
        const b1 = f.pts[(f.F.k + 1) % 3], b2 = f.pts[(f.F.k + 2) % 3];
        const m = proj((b1[0] + b2[0]) / 2, (b1[1] + b2[1]) / 2, (b1[2] + b2[2]) / 2);
        ctx.strokeStyle = rgba(WHITE, 0.75 * clamp01((cr - f.F.crack) * 6));
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(ax0, ay0); ctx.lineTo(m[0], m[1]); ctx.stroke();
      }
    }
    // 球のまん中のやわらかい光（球が閉じているときほど強い）
    if (gfx > 0) {
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = (0.16 + 0.12 * k) * (1 - Math.min(0.7, ex));
      ctx.drawImage(glowSprite(mixC(look.color, WHITE, 0.4)), SX - SR * 1.4, SY - SR * 1.4, SR * 2.8, SR * 2.8);
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
    }
  }

  // ---- 背景 ----------------------------------------------------------------
  function background(T, look, k, bk, bp) {
    const tier = look.tier;
    // ガラスの部屋（奥の壁のガラス板・天井と床へのびる線・左上の高い窓）。ゆっくりしか変わらないので4コマに1回
    ctx.drawImage(cachedLayer('segRoom', 4, 0, g => {
      const gr = g.createLinearGradient(0, 0, 0, GROUND_Y);
      gr.addColorStop(0, rgba(look.skyTop, 1)); gr.addColorStop(1, rgba(look.skyBot, 1));
      g.fillStyle = gr; g.fillRect(0, 0, W, H);
      const L = 130, R = W - 130, TOP = 70, BOT = GROUND_Y - 120;           // 奥の壁
      g.strokeStyle = rgba(mixC(look.color, WHITE, 0.5), 0.09); g.lineWidth = 1;
      g.beginPath();
      for (const [x0, y0, x1, y1] of [[0, 0, L, TOP], [W, 0, R, TOP], [0, GROUND_Y, L, BOT], [W, GROUND_Y, R, BOT]]) { g.moveTo(x0, y0); g.lineTo(x1, y1); }
      g.rect(L, TOP, R - L, BOT - TOP);
      for (let x = L + 45; x < R; x += 45) { g.moveTo(x, TOP); g.lineTo(x, BOT); }        // 奥の壁のガラス板の継ぎ目
      for (let i = 1; i < 6; i++) {                                                    // 左右の壁の継ぎ目（遠近）
        const f = i / 6;
        g.moveTo(L * f, TOP * f); g.lineTo(L * f, GROUND_Y + (BOT - GROUND_Y) * f);
        g.moveTo(W - L * f, TOP * f); g.lineTo(W - L * f, GROUND_Y + (BOT - GROUND_Y) * f);
      }
      g.stroke();
      g.globalCompositeOperation = 'lighter';
      g.fillStyle = rgba(WHITE, 0.025);                                                // ガラスに映る、ななめの光の帯
      for (const x of [L + 60, L + 300, L + 420]) { g.beginPath(); g.moveTo(x, TOP); g.lineTo(x + 40, TOP); g.lineTo(x - 60, BOT); g.lineTo(x - 100, BOT); g.closePath(); g.fill(); }
      g.fillStyle = rgba(mixC(look.color, WHITE, 0.7), 0.16);                          // 左上の高い窓（光の入り口）
      g.beginPath(); g.moveTo(14, 20); g.lineTo(84, 50); g.lineTo(84, 150); g.lineTo(14, 140); g.closePath(); g.fill();
      g.strokeStyle = rgba(WHITE, 0.3); g.lineWidth = 2; g.stroke();
      g.beginPath(); g.moveTo(49, 35); g.lineTo(49, 145); g.moveTo(14, 80); g.lineTo(84, 100); g.lineWidth = 1.5; g.stroke();
      // 窓から差しこむ白い光 → 球を通って虹に分かれる（光の形は1回だけ描いておき、明るさと向きだけ変える）
      if (gfx > 0) {
        if (!beams) makeBeams();
        g.drawImage(beams.white, 0, 0);
        g.globalAlpha = 0.35 + 0.65 * clamp01((tier - 1) / 3);
        g.save(); g.translate(SX, SY); g.rotate(Math.sin(bp * Math.PI / 16) * 0.05);
        g.drawImage(beams.rainbow, -40, -40);
        g.restore();
        g.globalAlpha = 1;
      }
      g.globalCompositeOperation = 'source-over';
    }), 0, 0, W, H);

    ctx.globalCompositeOperation = 'lighter';
    drawStars(T, [16, 30, 50][gfx]);

    // ガラスの球（3コマに1回描き直す）
    ctx.drawImage(cachedLayer('segSphere', 3, 1, g => {
      g.globalCompositeOperation = 'lighter';
      drawSphere(g, look, k, tier);
    }), 0, 0, W, H);
    ctx.globalCompositeOperation = 'lighter';

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
      ctx.beginPath(); ctx.arc(SX, SY, SR + 10 + r.r * 0.6, 0, TAU); ctx.stroke();
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
