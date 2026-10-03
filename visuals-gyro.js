"use strict";

/* =========================================================================
   見た目のセット「gyro」  —  曲⑤「Vertigo」用
   テーマは「めまいの階段」。ヒッチコックの映画『めまい（Vertigo）』の、鐘楼の階段を見下ろす場面と、
   ソール・バスのうずまきのタイトルへのオマージュ。
     背景   … 四角いらせん階段を真上から見下ろした所。段がうずを巻いて奥へ落ちていき、
              サビでは「めまいショット（ドリーズーム）」のように奥行きだけが伸び縮みする
     うずまき … サビや最後のサビで、ソール・バス風のうずまきの線がゆっくり回る
     傾き計 … 上の弧の目盛りの三角が「いま世界が何度傾いているか」を指す（遊ぶのに役立つので残す）
   画面ごと回る（さかさま）ときは、階段もいっしょに回る。
   床は流れる鉄板（ベルトコンベアの矢印つき）、足場には水準器の泡があって、傾くと泡が高いほうへ動く。
   ========================================================================= */

(function () {
  const CX = W / 2, CY = H * 0.55;
  const MONO = 'ui-monospace, "SF Mono", Menlo, Consolas, monospace';
  const SANS = '"Helvetica Neue", "Arial Black", "Hiragino Sans", system-ui, sans-serif';
  const WHITE = [255, 255, 255], YEL = rgb('#ffe36e'), RED = rgb('#ff4a3d');
  const st = { gyro: 0, fall: 0, twist: 0, swirl: 0 };
  const LEVELS = 22;

  function reset() { st.fall = 0; }
  function update(dt, T, look) {
    const tier = look.tier;
    st.gyro += dt * (0.3 + 0.25 * tier);
    st.fall += dt * (0.18 + 0.1 * tier);                    // 階段を落ちていく速さ
    st.twist += dt * (0.02 + 0.015 * tier);
    st.swirl += dt * (0.5 + 0.25 * tier);
  }

  // ---- 背景: らせん階段を見下ろす（2コマに1回だけ描き直す）-----------------------------------
  function stairs(g, look, k, bp, tier) {
    // めまいショット: サビ（tier 3 以上）で奥行きだけが伸び縮みする
    const dolly = Math.sin(bp * Math.PI / 8) * clamp01((tier - 3) / 1.5);
    const kd = 0.15 * (1 + 0.4 * dolly);
    const f = st.fall % 1, base = Math.floor(st.fall);
    const lv = [];
    for (let i = 0; i <= LEVELS; i++) {
      const d = i - f;                                    // 0 = 手前（画面の外）、大きいほど深い
      const sc = Math.exp(-Math.max(0, d) * kd);
      lv.push({ d, h: 640 * sc, a: (d + base) * 0.1 + st.twist, n: i + base });
    }
    const corner = (L, j) => { const a = L.a + j * Math.PI / 2 + Math.PI / 4, r = L.h * Math.SQRT2; return [Math.cos(a) * r, Math.sin(a) * r]; };
    const square = L => { for (let j = 0; j < 4; j++) { const [x, y] = corner(L, j); j ? g.lineTo(x, y) : g.moveTo(x, y); } g.closePath(); };
    // 壁（各段の輪を、奥ほど暗く塗る。ひと段ずつ明るさを変えてしましまに）
    for (let i = 0; i < LEVELS; i++) {
      const A = lv[i], B = lv[i + 1], depth = clamp01(B.d / LEVELS);
      const sh = mixC(mixC(look.skyBot, look.color, 0.12), look.skyTop, Math.pow(depth, 0.5)), band = (A.n % 2) ? 1 : 0.78;
      g.fillStyle = rgba(sh.map(v => v * band), 1);
      g.beginPath(); square(A); square(B);
      g.fill('evenodd');
    }
    // いちばん底（ずっと下の床がぼんやり光る）
    const bot = lv[LEVELS];
    g.fillStyle = rgba(mixC(look.color, [255, 255, 255], 0.1), 0.85); g.beginPath(); square(bot); g.fill();
    g.globalCompositeOperation = 'lighter';
    const R0 = lv[LEVELS - 8].h * 1.3, bg = g.createRadialGradient(0, 0, 0, 0, 0, R0);
    bg.addColorStop(0, rgba(look.color, 0.55 + 0.25 * k)); bg.addColorStop(0.35, rgba(look.color, 0.18)); bg.addColorStop(1, rgba(look.color, 0));
    g.fillStyle = bg; g.beginPath(); g.arc(0, 0, R0, 0, TAU); g.fill();
    // 段（各輪の4つの辺に、手前の辺から奥の辺へ6本ずつ）
    if (gfx > 0) {
      g.strokeStyle = rgba(mixC(look.color, WHITE, 0.3), 0.16);
      g.lineWidth = 1;
      g.beginPath();
      for (let i = 0; i < LEVELS; i++) {
        const A = lv[i], B = lv[i + 1];
        for (let j = 0; j < 4; j++) {
          const a0 = corner(A, j), a1 = corner(A, j + 1), b0 = corner(B, j), b1 = corner(B, j + 1);
          if (B.h < 30) continue;
          for (let s2 = 1; s2 < 7; s2++) { const u = s2 / 7; g.moveTo(a0[0] + (a1[0] - a0[0]) * u, a0[1] + (a1[1] - a0[1]) * u); g.lineTo(b0[0] + (b1[0] - b0[0]) * u, b0[1] + (b1[1] - b0[1]) * u); }
        }
      }
      g.stroke();
    }
    // 手すり（各段のふち。4段ごとに黄色）
    g.lineWidth = 2;
    for (const yel of [false, true]) {
      g.strokeStyle = rgba(yel ? YEL : look.color, 0.35 + 0.15 * k);
      g.beginPath();
      for (let i = 1; i <= LEVELS; i++) if (((lv[i].n % 4) === 0) === yel) square(lv[i]);
      g.stroke();
    }
    // ソール・バス風のうずまき（サビ・最後のサビ）
    const sw = clamp01((tier - 2.5) / 1.5);
    if (sw > 0.01 && gfx > 0) {
      g.strokeStyle = rgba(mixC(look.color, WHITE, 0.4), 0.22 * sw + 0.12 * k * sw);
      g.lineWidth = 2;
      g.beginPath();
      for (let arm = 0; arm < 2; arm++) {
        for (let t = 0; t < 7 * Math.PI; t += 0.2) {
          const r = 6 + t * 15 * (1 + 0.15 * dolly), a = t * (arm ? -1 : 1) + st.swirl * (arm ? 1 : -1) + arm * Math.PI;
          const x = Math.cos(a) * r, y = Math.sin(a) * r * (0.82 + 0.18 * Math.cos(st.swirl * 0.3));
          t ? g.lineTo(x, y) : g.moveTo(x, y);
        }
      }
      g.stroke();
    }
    // 小節の頭で、奥から四角い波
    for (const r of fx.bgRings) {
      g.strokeStyle = rgba(look.color, r.a * 0.3);
      const h = 20 + r.r * 0.7;
      g.save(); g.rotate(st.twist + r.r * 0.002); g.strokeRect(-h, -h, h * 2, h * 2); g.restore();
    }
    g.globalCompositeOperation = 'source-over';
  }

  function background(T, look, k, bk, bp) {
    const tier = look.tier;
    ctx.drawImage(cachedLayer('vertStairs', 2, 0, g => {
      g.fillStyle = rgba(look.skyBot, 1); g.fillRect(0, 0, W, H);
      g.translate(CX, CY); g.rotate(stage.spin);
      stairs(g, look, k, bp, tier);
    }), 0, 0, W, H);

    // ロール（傾き）の目盛り: 上の弧と、世界の傾きを指す三角（画面に固定）
    const R = 300, cy = CY - 10;
    ctx.strokeStyle = rgba(WHITE, 0.35);
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(CX, cy, R, -Math.PI / 2 - 0.8, -Math.PI / 2 + 0.8); ctx.stroke();
    for (const d of [-40, -30, -20, -10, 0, 10, 20, 30, 40]) {
      const a = -Math.PI / 2 + d * Math.PI / 180, l = d % 20 === 0 ? 16 : 9;
      ctx.beginPath(); ctx.moveTo(CX + Math.cos(a) * R, cy + Math.sin(a) * R); ctx.lineTo(CX + Math.cos(a) * (R - l), cy + Math.sin(a) * (R - l)); ctx.stroke();
    }
    const tilt = stage.tilt * Math.sign(stage.mirror || 1), pa = -Math.PI / 2 + tilt;
    const danger = Math.abs(stage.tilt) > 0.2;
    ctx.fillStyle = danger ? rgba(rgb('#ff5f7a'), 0.95) : rgba(YEL, 0.95);
    ctx.beginPath();
    ctx.moveTo(CX + Math.cos(pa) * (R - 20), cy + Math.sin(pa) * (R - 20));
    ctx.lineTo(CX + Math.cos(pa - 0.03) * (R - 38), cy + Math.sin(pa - 0.03) * (R - 38));
    ctx.lineTo(CX + Math.cos(pa + 0.03) * (R - 38), cy + Math.sin(pa + 0.03) * (R - 38));
    ctx.closePath(); ctx.fill();
    ctx.font = `700 13px ${MONO}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(`${(stage.tilt * 180 / Math.PI).toFixed(0)}°`, CX, cy - R + 50);
    ctx.globalCompositeOperation = 'source-over';
  }

  // ---- 床: 鉄板 ＋ 黄色と黒のしま ＋ 流れる矢印 -------------------------------------
  function floor(look, k) {
    const y = GROUND_Y, off = ((stage.scroll % 48) + 48) % 48;
    ctx.save();
    ctx.beginPath(); ctx.rect(-400, y, W + 800, H - y + 400); ctx.clip();
    ctx.fillStyle = '#15171f';
    ctx.fillRect(-400, y, W + 800, H - y + 400);
    ctx.fillStyle = rgba(YEL, 0.85);                         // しま模様（床といっしょに流れる）
    for (let x = -448 + off; x < W + 448; x += 48) {
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 24, y); ctx.lineTo(x + 14, y + 10); ctx.lineTo(x - 10, y + 10); ctx.closePath(); ctx.fill();
    }
    const v = stage.conveyor;
    if (Math.abs(v) > 5) {                                    // 流れる向きの矢印
      const d = Math.sign(v);
      ctx.strokeStyle = rgba(YEL, 0.35 + 0.3 * k);
      ctx.lineWidth = 3;
      ctx.beginPath();
      for (let x = -448 + off * 2 % 96; x < W + 448; x += 96) {
        ctx.moveTo(x - d * 8, y + 22); ctx.lineTo(x + d * 4, y + 32); ctx.lineTo(x - d * 8, y + 42);
      }
      ctx.stroke();
    } else {
      ctx.strokeStyle = 'rgba(255,255,255,0.06)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let x = -400 + off; x < W + 400; x += 96) { ctx.moveTo(x, y + 12); ctx.lineTo(x, H + 400); }
      ctx.stroke();
    }
    ctx.restore();
  }

  // ---- 足場: 鉄の板 ＋ 水準器（傾くと泡が高いほうへ動く）-------------------------------
  function platform(p, look, k) {
    ctx.fillStyle = '#20232e';
    ctx.fillRect(p.x, p.y, p.w, p.h);
    ctx.fillStyle = rgba(look.color, 0.7 + 0.3 * k);
    ctx.fillRect(p.x, p.y, p.w, 2);
    const vx = p.x + p.w / 2 - 30, vy = p.y + p.h / 2 - 3;
    ctx.fillStyle = 'rgba(160,255,140,0.25)';
    ctx.fillRect(vx, vy, 60, 6);
    const bx = vx + 30 - Math.max(-1, Math.min(1, Math.sin(stage.tilt) / 0.4)) * 24;
    ctx.fillStyle = 'rgba(220,255,200,0.9)';
    ctx.beginPath(); ctx.ellipse(bx, vy + 3, 6, 2.5, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.3)';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(vx + 22, vy); ctx.lineTo(vx + 22, vy + 6); ctx.moveTo(vx + 38, vy); ctx.lineTo(vx + 38, vy + 6); ctx.stroke();
  }

  // ---- 弾: 照準のような輪のついた玉 -----------------------------------------------------
  function bullet(b, c, k) {
    if (b.style === 'roller') {                    // トゲのついた車輪（転がった分だけ回る）
      const a = b.x / b.r;
      ctx.save();
      ctx.translate(b.x, b.y); ctx.rotate(a);
      ctx.fillStyle = rgba(c, 1);
      ctx.beginPath();
      for (let i = 0; i < 16; i++) {
        const r = i % 2 ? b.r * 0.78 : b.r * 1.18, t = i / 16 * TAU;
        ctx.lineTo(Math.cos(t) * r, Math.sin(t) * r);
      }
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#15171f';
      ctx.beginPath(); ctx.arc(0, 0, b.r * 0.55, 0, TAU); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.85)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(-b.r * 0.45, 0); ctx.lineTo(b.r * 0.45, 0); ctx.moveTo(0, -b.r * 0.45); ctx.lineTo(0, b.r * 0.45); ctx.stroke();
      ctx.restore();
      return;
    }
    ctx.fillStyle = rgba(c, 1);
    ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.92)';
    ctx.beginPath(); ctx.arc(b.x, b.y, b.r * 0.5, 0, TAU); ctx.fill();
    ctx.strokeStyle = rgba(c, 0.8);
    ctx.lineWidth = 1.5;
    const R = b.r + 5, a = b.age * 3;
    for (let i = 0; i < 4; i++) {
      ctx.beginPath(); ctx.arc(b.x, b.y, R, a + i * Math.PI / 2, a + i * Math.PI / 2 + 0.8); ctx.stroke();
    }
  }

  function flash(look) {
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = rgba(mixC(look.color, WHITE, 0.5), 0.38 * flashT);
    ctx.fillRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'source-over';
  }

  // ---- 場面の名前: ソール・バスのタイトルのように、横に切った文字が左右からすべりこむ ------------------
  function banner() {
    const bn = fx.banner;
    if (!bn) return;
    const e = bn.age, DUR = 2.4;
    if (e > DUR) { fx.banner = null; return; }
    const a = e < 0.15 ? e / 0.15 : e > DUR - 0.5 ? (DUR - e) / 0.5 : 1;
    const y = 130, slide = 1 - easeOut(clamp01(e / 0.7)), out = e > DUR - 0.5 ? easeOut((e - DUR + 0.5) / 0.5) : 0;
    ctx.save();
    ctx.globalAlpha = clamp01(a);
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = `900 40px ${SANS}`;
    if ('letterSpacing' in ctx) ctx.letterSpacing = '6px';
    const N = 6, top = y - 26, hh = 52 / N;
    for (let i = 0; i < N; i++) {                       // 6本の横の帯。偶数は左から、奇数は右から
      const dx = (i % 2 ? 1 : -1) * (260 * slide * (1 + i * 0.15) + 30 * out * (i - 2.5));
      ctx.save();
      ctx.beginPath(); ctx.rect(0, top + i * hh, W, hh + 0.5); ctx.clip();
      ctx.fillStyle = i === 2 || i === 3 ? '#ffffff' : rgba(mixC(bn.c, WHITE, 0.5), 1);
      ctx.fillText(bn.name, W / 2 + dx, y);
      ctx.restore();
    }
    const lw = 240 * easeOut(clamp01((e - 0.2) / 0.5));   // 赤い線と、うずまきの小さな印
    ctx.fillStyle = rgba(RED, 0.9);
    ctx.fillRect(W / 2 - lw, y + 34, lw * 2, 2);
    ctx.strokeStyle = rgba(RED, 0.9); ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (let t = 0; t < 4 * Math.PI; t += 0.2) { const r = 1 + t * 0.9, an = t + e * 4; const px = W / 2 + Math.cos(an) * r, py = y + 35 + Math.sin(an) * r; t ? ctx.lineTo(px, py) : ctx.moveTo(px, py); }
    ctx.stroke();
    if ('letterSpacing' in ctx) ctx.letterSpacing = '3px';
    ctx.font = `600 14px ${MONO}`;
    ctx.fillStyle = rgba(mixC(bn.c, WHITE, 0.4), clamp01((e - 0.4) / 0.4));
    ctx.fillText(bn.sub, W / 2, y + 56);
    if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';
    ctx.restore();
  }

  // ---- タイトル: ソール・バス風のうずまきがゆっくり回る ----------------------------------------
  function title(look, k, bp) {
    for (let arm = 0; arm < 3; arm++) {
      ctx.strokeStyle = rgba(arm === 1 ? RED : arm === 2 ? YEL : look.color, 0.5 + 0.3 * k);
      ctx.lineWidth = 2.5 - arm * 0.5;
      ctx.beginPath();
      for (let t = 0; t < 6 * Math.PI; t += 0.1) {
        const r = 4 + t * 11 * (1 + 0.05 * k), a = t * (arm % 2 ? -1 : 1) + bp * 0.15 * (arm % 2 ? 1 : -1) + arm * 2.1;
        const x = CX + Math.cos(a) * r, y = 260 + Math.sin(a) * r * (0.75 + 0.25 * Math.cos(bp * 0.05 + arm));
        t ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
      }
      ctx.stroke();
    }
    ctx.fillStyle = rgba(YEL, 0.95);
    ctx.beginPath(); ctx.arc(CX, 260, 5 + 3 * k, 0, TAU); ctx.fill();
  }

  THEMES.gyro = {
    noTrails: true, noScanlines: true, glow: 1.8,
    clearColors: ['#7ff6ff', '#ffe36e', '#ff5fa2', '#ff4a3d', '#a9b4ff'],
    reset, update, background, floor, platform, bullet, flash, banner, title,
  };
})();
