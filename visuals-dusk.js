"use strict";

/* =========================================================================
   見た目のセット「dusk」  —  曲③「モラトリウム」用
   テーマは「止まったままの夕暮れ」。沈みかけの大きな太陽の前に、大きな時計の文字盤。
   時計の針は拍ごとにカチッと進み、時間停止（timeStop）中はぴたりと止まる。
   場面の tier（盛り上がりの段階 0〜5）で、太陽の明るさ・歯車の速さ・光の粒の数が変わる。
   ========================================================================= */

(function () {
  const CX = W / 2, CY = 270, CR = 205;               // 大きな時計の中心と半径
  const SERIF = '"Hiragino Mincho ProN", "Yu Mincho", "Noto Serif JP", serif';
  const GOLD = rgb('#ffd27a'), CREAM = rgb('#fff1d6');

  // ---- 1回だけ作る絵 -------------------------------------------------------
  let face = null, gears = null, streaks = null;
  function makeArt() {
    // 時計の文字盤: 外の輪・60の目盛り・ローマ数字
    face = document.createElement('canvas');
    face.width = face.height = CR * 2 + 20;
    let g = face.getContext('2d');
    const c = CR + 10;
    g.strokeStyle = 'rgba(255,241,214,0.9)';
    g.lineWidth = 3; g.beginPath(); g.arc(c, c, CR, 0, TAU); g.stroke();
    g.lineWidth = 1; g.beginPath(); g.arc(c, c, CR - 12, 0, TAU); g.stroke();
    for (let i = 0; i < 60; i++) {
      const a = i / 60 * TAU, big = i % 5 === 0, r0 = CR - (big ? 30 : 20), r1 = CR - 12;
      g.lineWidth = big ? 3 : 1;
      g.beginPath(); g.moveTo(c + Math.cos(a) * r0, c + Math.sin(a) * r0); g.lineTo(c + Math.cos(a) * r1, c + Math.sin(a) * r1); g.stroke();
    }
    g.fillStyle = 'rgba(255,241,214,0.95)';
    g.font = `600 24px ${SERIF}`;
    g.textAlign = 'center'; g.textBaseline = 'middle';
    ['XII', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI'].forEach((t, i) => {
      const a = i / 12 * TAU - Math.PI / 2;
      g.fillText(t, c + Math.cos(a) * (CR - 52), c + Math.sin(a) * (CR - 52));
    });
    // 歯車（3つ。歯の数ちがい）
    gears = [[72, 14], [54, 11], [96, 18]].map(([r, teeth]) => {
      const cv2 = document.createElement('canvas');
      cv2.width = cv2.height = r * 2 + 16;
      const gg = cv2.getContext('2d'), m = r + 8;
      gg.fillStyle = 'rgba(60,32,40,0.9)';
      gg.strokeStyle = 'rgba(255,210,122,0.55)';
      gg.lineWidth = 2;
      gg.beginPath();
      for (let i = 0; i < teeth * 2; i++) {
        const a0 = i / (teeth * 2) * TAU, a1 = (i + 1) / (teeth * 2) * TAU, rr = i % 2 ? r - 8 : r;
        gg.lineTo(m + Math.cos(a0) * rr, m + Math.sin(a0) * rr); gg.lineTo(m + Math.cos(a1) * rr, m + Math.sin(a1) * rr);
      }
      gg.closePath(); gg.fill(); gg.stroke();
      gg.globalCompositeOperation = 'destination-out';
      gg.beginPath(); gg.arc(m, m, r * 0.32, 0, TAU); gg.fill();
      for (let i = 0; i < 5; i++) { const a = i / 5 * TAU; gg.beginPath(); gg.arc(m + Math.cos(a) * r * 0.6, m + Math.sin(a) * r * 0.6, r * 0.13, 0, TAU); gg.fill(); }
      return cv2;
    });
    // 夕焼けの細い雲（横長の光の帯）
    streaks = document.createElement('canvas');
    streaks.width = 600; streaks.height = 40;
    g = streaks.getContext('2d');
    const gr = g.createLinearGradient(0, 0, 600, 0);
    gr.addColorStop(0, 'rgba(255,230,200,0)'); gr.addColorStop(0.5, 'rgba(255,230,200,0.6)'); gr.addColorStop(1, 'rgba(255,230,200,0)');
    g.fillStyle = gr;
    g.beginPath(); g.ellipse(300, 20, 300, 7, 0, 0, TAU); g.fill();
  }

  // ---- 状態: 時計の時刻（時間停止中は進まない）と光の粒 ----------------------
  const st = { clock: 0, motes: [], streakX: [0, 210, 420, 120, 520] };
  function reset() { st.motes.length = 0; }
  const frozen = () => scene === 'play' && typeof timeFrozen === 'function' && timeFrozen();

  function update(dt, T, look) {
    if (!face) makeArt();
    st.clock = scene === 'title' ? titleBeat() : (frozen() ? st.clock : beatPos(T));
    if (frozen()) return;                                       // 時間停止中は全部止まる
    const tier = look.tier;
    const want = Math.round([26, 20, 14, 10, 8, 8][Math.round(tier)] * [0.4, 0.7, 1][gfx]);
    if (st.motes.length < want && Math.random() < dt * 10) {
      st.motes.push({ x: Math.random() * W, y: GROUND_Y - Math.random() * 120, vy: -(14 + Math.random() * 22 + tier * 6), ph: Math.random() * TAU, life: 5 + Math.random() * 4, age: 0, s: 1 + Math.random() * 1.5 });
    }
    for (const m of st.motes) { m.age += dt; m.y += m.vy * dt; m.x += Math.sin(m.age * 1.2 + m.ph) * 10 * dt; }
    st.motes = st.motes.filter(m => m.age < m.life);
    for (let i = 0; i < st.streakX.length; i++) st.streakX[i] = (st.streakX[i] - (6 + i * 2) * (1 + tier * 0.3) * dt + 900) % 900;
  }

  // 拍の頭ですばやく進んで止まる「カチッ」とした角度
  const tickAng = (beats, per, step) => { const n = beats / per, k = Math.floor(n); return (k + Math.min(1, (n - k) * 6)) * step; };

  // ---- 背景 ----------------------------------------------------------------
  function background(T, look, k, bk, bp) {
    if (!face) makeArt();
    const tier = look.tier;
    vGradient([[0, rgba(look.skyTop, 1)], [0.65, rgba(mixC(look.skyTop, look.skyBot, 0.6), 1)], [1, rgba(mixC(look.skyBot, [255, 255, 255], 0.08 * k * clamp01(tier - 2)), 1)]], GROUND_Y);

    ctx.globalCompositeOperation = 'lighter';
    drawStars(T, [20, 40, 60][gfx]);

    // 沈みかけの太陽（盛り上がるほど明るく、拍で少しふくらむ）
    const sunR = 150 * (1 + 0.02 * k * clamp01(tier - 1));
    const sunC = mixC(look.skyBot, [255, 236, 170], 0.5 + 0.08 * tier);
    if (gfx === 2) {                                     // 太陽の大きなにじみ（「高」だけ）
      ctx.globalAlpha = 0.35 + 0.08 * tier;
      ctx.drawImage(glowSprite(sunC), CX - sunR * 2.6, GROUND_Y - 40 - sunR * 2.6, sunR * 5.2, sunR * 5.2);
      ctx.globalAlpha = 1;
    }
    ctx.globalCompositeOperation = 'source-over';
    const sg = ctx.createRadialGradient(CX, GROUND_Y - 40, sunR * 0.2, CX, GROUND_Y - 40, sunR);
    sg.addColorStop(0, rgba(mixC(sunC, [255, 255, 255], 0.5), 0.95));
    sg.addColorStop(1, rgba(sunC, 0.55));
    ctx.fillStyle = sg;
    ctx.beginPath(); ctx.arc(CX, GROUND_Y - 40, sunR, 0, TAU); ctx.fill();

    // 夕焼けの細い雲（「高」だけ）
    if (gfx === 2) {
      st.streakX.forEach((x, i) => {
        ctx.globalAlpha = 0.25 + 0.05 * i;
        ctx.drawImage(streaks, x - 300, 120 + i * 70 + (i % 2) * 20, 600 - i * 40, 26);
      });
      ctx.globalAlpha = 1;
    }

    // 歯車（拍ごとにカチッと回る。時間停止中は止まる）
    if (gfx > 0) {
      const spots = [[70, 470, 0, 1], [W - 60, 180, 1, -1.3], [W - 90, 520, 2, 0.8]];
      ctx.globalAlpha = 0.38;
      for (const [x, y, i, dir] of spots) {
        const img = gears[i], a = tickAng(st.clock, 1, Math.PI / 18) * dir;
        ctx.save(); ctx.translate(x, y); ctx.rotate(a); ctx.drawImage(img, -img.width / 2, -img.height / 2); ctx.restore();
      }
      ctx.globalAlpha = 1;
    }

    // 大きな時計: 文字盤 ＋ 針（秒針 = 1拍ごと、長針 = 1小節ごと、短針 = 曲全体で1周）
    const fz = fx.freeze, shiver = fz > 0.5 ? Math.sin(performance.now() / 30) * 0.01 : 0;
    ctx.globalAlpha = 0.28 + 0.06 * tier + 0.25 * fz;
    ctx.drawImage(face, CX - face.width / 2, CY - face.height / 2);
    ctx.globalAlpha = 1;
    const hand = (ang, len, w, c, a) => {
      ctx.strokeStyle = rgba(c, a); ctx.lineWidth = w; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(CX - Math.cos(ang) * 18, CY - Math.sin(ang) * 18); ctx.lineTo(CX + Math.cos(ang) * len, CY + Math.sin(ang) * len); ctx.stroke();
    };
    const up = -Math.PI / 2;
    const hourA = up + (scene === 'title' ? st.clock * 0.01 : clamp01(T / SONG_END) * TAU);
    const minA = up + tickAng(st.clock, 4, TAU / 16) + shiver;
    const secA = up + tickAng(st.clock, 1, TAU / 60) + shiver;
    hand(hourA, CR * 0.5, 8, CREAM, 0.55 + 0.2 * fz);
    hand(minA, CR * 0.78, 5, CREAM, 0.6 + 0.2 * fz);
    hand(secA, CR * 0.9, 2, mixC(look.color, [255, 255, 255], 0.3), 0.8);
    ctx.fillStyle = rgba(GOLD, 0.9);
    ctx.beginPath(); ctx.arc(CX, CY, 9, 0, TAU); ctx.fill();
    // 小節の頭で文字盤から光の輪
    ctx.globalCompositeOperation = 'lighter';
    for (const r of fx.bgRings) {
      ctx.strokeStyle = rgba(look.color, r.a * 0.35 * clamp01(tier / 2));
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(CX, CY, CR + r.r * 0.4, 0, TAU); ctx.stroke();
    }

    // 立ちのぼる光の粒
    for (const m of st.motes) {
      const f = Math.sin(Math.PI * m.age / m.life);
      ctx.fillStyle = rgba(mixC(GOLD, look.color, 0.3), 0.7 * f);
      ctx.fillRect(m.x - m.s / 2, m.y - m.s / 2, m.s, m.s);
    }
    ctx.globalCompositeOperation = 'source-over';
  }

  // ---- 足場: 真鍮（しんちゅう）の板 ＋ びょう ---------------------------------
  function platform(p, look, k) {
    const g = ctx.createLinearGradient(0, p.y, 0, p.y + p.h);
    g.addColorStop(0, '#c8954a'); g.addColorStop(1, '#5a3a22');
    ctx.fillStyle = g;
    ctx.fillRect(p.x, p.y, p.w, p.h);
    ctx.fillStyle = rgba([255, 236, 190], 0.7 + 0.3 * k);
    ctx.fillRect(p.x + 3, p.y + 1, p.w - 6, 2);
    ctx.fillStyle = '#3a2416';
    for (let x = p.x + 10; x < p.x + p.w - 5; x += 24) { ctx.beginPath(); ctx.arc(x, p.y + p.h * 0.6, 2, 0, TAU); ctx.fill(); }
  }

  // ---- 弾: 小さい弾は光る玉、大きい弾は小さな時計、旋律の弾は音符 ------------------
  function bullet(b, c, k) {
    if (b.style === 'note') {                        // 八分音符の形（当たり判定は玉の部分）
      ctx.fillStyle = rgba(c, 1);
      ctx.beginPath(); ctx.ellipse(b.x, b.y, b.r * 1.25, b.r * 0.9, -0.45, 0, TAU); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      ctx.beginPath(); ctx.ellipse(b.x, b.y, b.r * 0.7, b.r * 0.45, -0.45, 0, TAU); ctx.fill();
      const sx = b.x + b.r * 1.05, sy = b.y - b.r * 0.3;
      ctx.strokeStyle = rgba(c, 1); ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx, sy - b.r * 3.2); ctx.quadraticCurveTo(sx + b.r * 1.4, sy - b.r * 2.4, sx + b.r * 1.1, sy - b.r * 1.5); ctx.stroke();
      return;
    }
    if (b.r >= 10) {                                 // 小さな時計（針がくるくる回る）
      ctx.fillStyle = rgba(c, 1);
      ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, TAU); ctx.fill();
      ctx.fillStyle = 'rgba(255,248,232,0.95)';
      ctx.beginPath(); ctx.arc(b.x, b.y, b.r * 0.72, 0, TAU); ctx.fill();
      ctx.strokeStyle = rgba(mixC(c, [40, 20, 20], 0.5), 1);
      ctx.lineWidth = Math.max(1.5, b.r * 0.12); ctx.lineCap = 'round';
      const a1 = b.age * 6, a2 = b.age * 0.8;
      ctx.beginPath();
      ctx.moveTo(b.x, b.y); ctx.lineTo(b.x + Math.cos(a1) * b.r * 0.6, b.y + Math.sin(a1) * b.r * 0.6);
      ctx.moveTo(b.x, b.y); ctx.lineTo(b.x + Math.cos(a2) * b.r * 0.4, b.y + Math.sin(a2) * b.r * 0.4);
      ctx.stroke();
      return;
    }
    ctx.fillStyle = rgba(c, 1);
    ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgba(255,250,235,0.95)';
    ctx.beginPath(); ctx.arc(b.x, b.y, b.r * 0.58, 0, TAU); ctx.fill();
    ctx.strokeStyle = rgba(mixC(c, [255, 255, 255], 0.6), 0.7);
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(b.x, b.y, b.r + 0.5, 0, TAU); ctx.stroke();
  }

  // ---- 光る演出: あたたかい金色 ---------------------------------------------
  function flash(look) {
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = rgba(mixC(look.color, [255, 240, 210], 0.6), 0.42 * flashT);
    ctx.fillRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'source-over';
  }

  // ---- 場面の名前: 明朝体 ＋ 小さな時計の飾り --------------------------------
  function banner() {
    const bn = fx.banner;
    if (!bn) return;
    const e = bn.age, DUR = 2.6;
    if (e > DUR) { fx.banner = null; return; }
    const a = e < 0.4 ? e / 0.4 : e > DUR - 0.6 ? (DUR - e) / 0.6 : 1;
    const y = 120, open = easeOut(e / 0.9);
    ctx.save();
    ctx.globalAlpha = clamp01(a);
    const g = ctx.createLinearGradient(0, 0, W, 0);
    g.addColorStop(0, 'rgba(30,14,30,0)'); g.addColorStop(0.5, 'rgba(30,14,30,0.5)'); g.addColorStop(1, 'rgba(30,14,30,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, y - 46, W, 92);
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = `600 34px ${SERIF}`;
    if ('letterSpacing' in ctx) ctx.letterSpacing = '10px';
    ctx.fillStyle = '#fff6e6';
    if (gfx === 2) { ctx.shadowColor = rgba(bn.c, 1); ctx.shadowBlur = 14; }
    ctx.fillText(bn.name, W / 2, y - 8);
    ctx.shadowBlur = 0;
    const lw = 220 * open;
    ctx.fillStyle = rgba(bn.c, 0.9);
    ctx.fillRect(W / 2 - lw, y + 16, lw - 14, 1.5);
    ctx.fillRect(W / 2 + 14, y + 16, lw - 14, 1.5);
    // 小さな時計の飾り（針が名前の出るあいだに1周する）
    ctx.strokeStyle = rgba(bn.c, 0.95); ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(W / 2, y + 16.5, 7, 0, TAU); ctx.stroke();
    const ha = -Math.PI / 2 + e / DUR * TAU;
    ctx.beginPath(); ctx.moveTo(W / 2, y + 16.5); ctx.lineTo(W / 2 + Math.cos(ha) * 5, y + 16.5 + Math.sin(ha) * 5); ctx.stroke();
    if ('letterSpacing' in ctx) ctx.letterSpacing = '4px';
    ctx.font = `600 15px ${SERIF}`;
    ctx.fillStyle = rgba(mixC(bn.c, [255, 255, 255], 0.55), clamp01((e - 0.3) / 0.5));
    ctx.fillText(bn.sub, W / 2, y + 36);
    if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';
    ctx.restore();
  }

  // ---- タイトル: 文字盤の数字の位置に、小さな時計がならんでゆっくり回る ---------------
  function title(look, k, bp) {
    const cols = ['#ffd27a', '#ff9f6b', '#ff7aa8'].map(rgb);
    for (let i = 0; i < 12; i++) {
      const a = i / 12 * TAU - Math.PI / 2 + tickAng(bp, 2, TAU / 48);
      const r = CR + 34 + 6 * k, x = CX + Math.cos(a) * r, y = CY + Math.sin(a) * r;
      const c = cols[i % 3];
      if (gfx > 0) {
        ctx.globalCompositeOperation = 'lighter';
        ctx.drawImage(glowSprite(c), x - 26, y - 26, 52, 52);
        ctx.globalCompositeOperation = 'source-over';
      }
      bullet({ x, y, r: 11, age: bp * 0.4 + i }, c, k);
    }
  }

  THEMES.dusk = {
    noTrails: true, noScanlines: true, glow: 1.8,
    clearColors: ['#ffd27a', '#ff9f6b', '#ff7aa8', '#fff1d6', '#c9b6ff'],
    reset, update, background, platform, bullet, flash, banner, title,
  };
})();
