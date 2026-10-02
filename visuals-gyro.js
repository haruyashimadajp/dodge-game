"use strict";

/* =========================================================================
   見た目のセット「gyro」  —  曲⑤「Vertigo」用
   テーマは「飛行機の姿勢計（水平儀）」。背景は空と地面が水平線で分かれていて、
   上の目盛りの三角が「いま世界が何度傾いているか」を指す。
   床は流れる鉄板（ベルトコンベアの矢印つき）、足場には水準器の泡があって、傾くと泡が高いほうへ動く。
   ========================================================================= */

(function () {
  const CX = W / 2, CY = H * 0.55;
  const MONO = 'ui-monospace, "SF Mono", Menlo, Consolas, monospace';
  const WHITE = [255, 255, 255], YEL = rgb('#ffe36e');
  const st = { gyro: 0 };

  function reset() {}
  function update(dt, T, look) { st.gyro += dt * (0.3 + 0.25 * look.tier); }

  // ---- 背景: 姿勢計（画面ごと回るときは、水平線もいっしょに回る）-----------------------
  function background(T, look, k, bk, bp) {
    const tier = look.tier;
    ctx.fillStyle = rgba(look.skyTop, 1);
    ctx.fillRect(0, 0, W, H);
    ctx.save();
    ctx.translate(CX, CY);
    ctx.rotate(stage.spin);
    // 空
    let g = ctx.createLinearGradient(0, -900, 0, 0);
    g.addColorStop(0, rgba(look.skyTop, 1)); g.addColorStop(1, rgba(look.skyBot, 1));
    ctx.fillStyle = g; ctx.fillRect(-1000, -1000, 2000, 1000);
    // 地面（奥行きのある格子。床が流れると格子も流れる）
    g = ctx.createLinearGradient(0, 0, 0, 900);
    g.addColorStop(0, rgba(mixC(look.skyBot, [0, 0, 0], 0.55), 1)); g.addColorStop(1, '#020208');
    ctx.fillStyle = g; ctx.fillRect(-1000, 0, 2000, 1000);
    ctx.globalCompositeOperation = 'lighter';
    if (gfx > 0) {
      ctx.strokeStyle = rgba(look.color, 0.12 + 0.08 * k);
      ctx.lineWidth = 1;
      ctx.beginPath();
      const off = ((stage.scroll % 60) + 60) % 60;
      for (let i = -24; i <= 24; i++) { const x = i * 60 + off; ctx.moveTo(x * 0.08, 0); ctx.lineTo(x * 1.6, 900); }
      const f = bp - Math.floor(bp);
      for (let j = 0; j < 7; j++) { const p = (j + f) / 7, y = 900 * p * p; ctx.moveTo(-1000, y); ctx.lineTo(1000, y); }
      ctx.stroke();
    }
    // 水平線 ＋ 目盛り（ピッチのはしご）
    ctx.strokeStyle = rgba(mixC(look.color, WHITE, 0.4), 0.75 + 0.25 * k);
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(-1000, 0); ctx.lineTo(1000, 0); ctx.stroke();
    ctx.strokeStyle = rgba(look.color, 0.3);
    ctx.lineWidth = 1.5;
    ctx.font = `600 11px ${MONO}`; ctx.textBaseline = 'middle';
    ctx.fillStyle = rgba(look.color, 0.45);
    for (const y of [-240, -160, -80, 80, 160]) {
      const w = y % 160 === 0 ? 70 : 40;
      ctx.beginPath(); ctx.moveTo(-w, y); ctx.lineTo(w, y); ctx.stroke();
      if (y % 160 === 0) { ctx.textAlign = 'left'; ctx.fillText(String(Math.abs(y / 8)), w + 6, y); ctx.textAlign = 'right'; ctx.fillText(String(Math.abs(y / 8)), -w - 6, y); }
    }
    // ジャイロの輪（回り続ける。盛り上がるほど速い）
    if (gfx > 0) {
      for (let i = 0; i < 3; i++) {
        const a = st.gyro * (1 + i * 0.4) + i;
        ctx.strokeStyle = rgba(i === 1 ? YEL : look.color, 0.08 + 0.04 * tier / 5 + 0.05 * k);
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.ellipse(0, -120, 260, 260 * Math.abs(Math.cos(a)), i * 1.05, 0, TAU); ctx.stroke();
      }
    }
    ctx.restore();

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

  // ---- 場面の名前: 計器のような等幅の文字 ----------------------------------------------
  function banner() {
    const bn = fx.banner;
    if (!bn) return;
    const e = bn.age, DUR = 2.4;
    if (e > DUR) { fx.banner = null; return; }
    const a = e < 0.2 ? e / 0.2 : e > DUR - 0.5 ? (DUR - e) / 0.5 : 1;
    const y = 130, shown = Math.min(bn.name.length, Math.floor(e * 24));
    ctx.save();
    ctx.globalAlpha = clamp01(a);
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.fillRect(W / 2 - 230, y - 34, 460, 76);
    ctx.strokeStyle = rgba(bn.c, 0.9);
    ctx.lineWidth = 2;
    const br = (x, d) => { ctx.beginPath(); ctx.moveTo(x + d * 14, y - 34); ctx.lineTo(x, y - 34); ctx.lineTo(x, y + 42); ctx.lineTo(x + d * 14, y + 42); ctx.stroke(); };
    br(W / 2 - 230, 1); br(W / 2 + 230, -1);
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = `800 32px ${MONO}`;
    if ('letterSpacing' in ctx) ctx.letterSpacing = '8px';
    ctx.fillStyle = '#f0fbff';
    ctx.fillText(bn.name.slice(0, shown) + (shown < bn.name.length ? '_' : ''), W / 2, y - 6);
    if ('letterSpacing' in ctx) ctx.letterSpacing = '2px';
    ctx.font = `600 14px ${MONO}`;
    ctx.fillStyle = rgba(mixC(bn.c, WHITE, 0.4), clamp01((e - 0.3) / 0.4));
    ctx.fillText(bn.sub, W / 2, y + 26);
    if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';
    ctx.restore();
  }

  // ---- タイトル: ジャイロスコープの輪がゆっくり回る ----------------------------------------
  function title(look, k, bp) {
    for (let i = 0; i < 3; i++) {
      const a = bp * 0.12 * (1 + i * 0.5) + i * 1.3;
      ctx.strokeStyle = rgba(i === 1 ? YEL : look.color, 0.55 + 0.3 * k);
      ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.ellipse(CX, 260, 200, 200 * Math.abs(Math.cos(a)), i * 1.05 + Math.sin(bp * 0.1) * 0.2, 0, TAU); ctx.stroke();
    }
    ctx.fillStyle = rgba(YEL, 0.95);
    ctx.beginPath(); ctx.arc(CX, 260, 6 + 3 * k, 0, TAU); ctx.fill();
  }

  THEMES.gyro = {
    noTrails: true, noScanlines: true, glow: 1.8,
    clearColors: ['#7ff6ff', '#ffe36e', '#ff5fa2', '#7fffd0', '#a9b4ff'],
    reset, update, background, floor, platform, bullet, flash, banner, title,
  };
})();
