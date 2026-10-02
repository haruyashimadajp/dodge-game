"use strict";

/* =========================================================================
   見た目のセット「ex」  —  曲⑥「ExtremeEX」用
   黒と赤の警告色。奥へ吸いこまれる赤いトンネルの格子、まん中で回る「EX」の紋章、
   上下を流れる「WARNING」の帯。キックのたびに赤く脈打ち、場面の名前は色ずれして出る。
   ========================================================================= */

(function () {
  const CX = W / 2, CY = 250;
  const FONT = '"Orbitron", system-ui, sans-serif';
  const WHITE = [255, 255, 255], RED = rgb('#ff2a3a'), GOLD = rgb('#ffd23f');
  const st = { rot: 0, tape: 0 };

  function reset() {}
  function update(dt, T, look) {
    st.rot += dt * (0.2 + 0.18 * look.tier);
    st.tape += dt * (40 + 25 * look.tier);
  }

  function background(T, look, k, bk, bp) {
    const tier = look.tier;
    const g = ctx.createRadialGradient(CX, CY, 20, CX, CY, 700);
    g.addColorStop(0, rgba(mixC(look.skyBot, look.color, 0.25 * k), 1));
    g.addColorStop(1, rgba(look.skyTop, 1));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    ctx.globalCompositeOperation = 'lighter';
    // 奥へ吸いこまれる四角いトンネル（拍で手前へ進む）
    const f = bp - Math.floor(bp);
    ctx.lineWidth = 1.5;
    const n = [4, 7, 9][gfx];
    for (let i = 0; i < n; i++) {
      const p = (i + f) / n, s = 0.04 + p * p * 1.6;
      ctx.strokeStyle = rgba(look.color, (0.05 + 0.25 * p) * (0.6 + 0.4 * clamp01(tier / 4)));
      ctx.save(); ctx.translate(CX, CY); ctx.rotate(st.rot * 0.15 * (i % 2 ? 1 : -1) * 0.2);
      ctx.strokeRect(-W * s / 2, -H * s / 2, W * s, H * s);
      ctx.restore();
    }
    ctx.strokeStyle = rgba(look.color, 0.12);
    ctx.beginPath();
    for (const [x, y] of [[0, 0], [W, 0], [0, H], [W, H], [CX, 0], [CX, H], [0, CY], [W, CY]]) { ctx.moveTo(CX, CY); ctx.lineTo(x, y); }
    ctx.stroke();

    // 回る「EX」の紋章（六角形の輪 ＋ 文字）
    const R = 150 + 10 * k;
    for (let j = 0; j < 2; j++) {
      ctx.strokeStyle = rgba(j ? GOLD : look.color, 0.18 + 0.15 * k);
      ctx.lineWidth = j ? 2 : 4;
      ctx.beginPath();
      for (let i = 0; i <= 6; i++) { const a = st.rot * (j ? -1 : 1) + i / 6 * TAU; ctx.lineTo(CX + Math.cos(a) * (R + j * 26), CY + Math.sin(a) * (R + j * 26)); }
      ctx.stroke();
    }
    ctx.font = `900 ${110 + 12 * k}px ${FONT}`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = rgba(look.color, 0.1 + 0.12 * k);
    ctx.fillText('EX', CX, CY + 6);
    ctx.globalCompositeOperation = 'source-over';

    // 上下を流れる WARNING の帯
    const tape = (y, dir) => {
      ctx.fillStyle = rgba(GOLD, 0.12 + 0.1 * k);
      ctx.fillRect(0, y, W, 22);
      ctx.font = `800 13px ${FONT}`;
      ctx.fillStyle = rgba([10, 0, 0], 0.85);
      ctx.textAlign = 'left';
      const text = 'WARNING ◆ EXTREME ◆ ', w = 210, off = ((st.tape * dir) % w + w) % w;
      for (let x = -w + off; x < W + w; x += w) ctx.fillText(text, x, y + 12);
    };
    if (gfx > 0) tape(40, 1);
  }

  function floor(look, k) {
    const y = GROUND_Y, off = ((stage.scroll % 40) + 40) % 40;
    ctx.save();
    ctx.beginPath(); ctx.rect(-400, y, W + 800, H - y + 400); ctx.clip();
    ctx.fillStyle = '#0b0002';
    ctx.fillRect(-400, y, W + 800, H - y + 400);
    ctx.fillStyle = rgba(look.color, 0.55 + 0.35 * k);
    for (let x = -440 + off; x < W + 440; x += 40) {
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 18, y); ctx.lineTo(x + 8, y + 9); ctx.lineTo(x - 10, y + 9); ctx.closePath(); ctx.fill();
    }
    ctx.restore();
  }

  function platform(p, look, k) {
    ctx.fillStyle = '#14000a';
    ctx.fillRect(p.x, p.y, p.w, p.h);
    ctx.strokeStyle = rgba(look.color, 0.8 + 0.2 * k);
    ctx.lineWidth = 2;
    ctx.strokeRect(p.x + 1, p.y + 1, p.w - 2, p.h - 2);
    ctx.fillStyle = rgba(GOLD, 0.8);
    for (let x = p.x + 8; x < p.x + p.w - 8; x += 20) ctx.fillRect(x, p.y + p.h / 2 - 1, 10, 2);
  }

  function bullet(b, c, k) {
    if (b.style === 'roller') {
      ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(b.x / b.r);
      ctx.fillStyle = rgba(c, 1);
      ctx.beginPath();
      for (let i = 0; i < 16; i++) { const r = i % 2 ? b.r * 0.75 : b.r * 1.2, t = i / 16 * TAU; ctx.lineTo(Math.cos(t) * r, Math.sin(t) * r); }
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(0, 0, b.r * 0.5, 0, TAU); ctx.fill();
      ctx.restore();
      return;
    }
    if (b.style === 'rev') {                         // REV弾: うなっている間はふるえる → 飛ぶと長い光の尾
      const x = b.x + (b.shiver || 0), k2 = b.revK || 0;
      if (k2 > 0) {
        const sp = Math.hypot(b.vx, b.vy) || 1, L = Math.min(90, sp * 0.09);
        ctx.strokeStyle = rgba(c, 0.8); ctx.lineWidth = b.r * 1.4; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(x, b.y); ctx.lineTo(x - b.vx / sp * L, b.y - b.vy / sp * L); ctx.stroke();
      } else {
        ctx.strokeStyle = rgba(c, 0.8); ctx.lineWidth = 1.5;
        const R = b.r * (1.6 + 1.6 * (1 - Math.min(1, b.age / b.hang)));
        ctx.beginPath(); ctx.arc(x, b.y, R, 0, TAU); ctx.stroke();
      }
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.arc(x, b.y, b.r, 0, TAU); ctx.fill();
      ctx.strokeStyle = rgba(c, 1); ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.arc(x, b.y, b.r, 0, TAU); ctx.stroke();
      return;
    }
    if (b.style === 'shard') {                       // 割れたガラス → とがったひし形
      const a = Math.atan2(b.vy, b.vx);
      ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(a);
      ctx.fillStyle = rgba(c, 1);
      ctx.beginPath(); ctx.moveTo(b.r * 1.9, 0); ctx.lineTo(0, -b.r * 0.8); ctx.lineTo(-b.r * 1.2, 0); ctx.lineTo(0, b.r * 0.8); ctx.closePath(); ctx.fill();
      ctx.restore();
      return;
    }
    ctx.fillStyle = rgba(c, 1);                      // ふつうの弾: 色のふち ＋ 白い芯 ＋ 黒い輪
    ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, TAU); ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(b.x, b.y, b.r * 0.55, 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.6)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(b.x, b.y, b.r * 0.55, 0, TAU); ctx.stroke();
  }

  function flash(look) {
    ctx.fillStyle = rgba(mixC(look.color, WHITE, 0.3), 0.38 * flashT);
    ctx.fillRect(0, 0, W, H);
  }

  // 場面の名前: 赤と青に色ずれして、ガタガタ出てくる
  function banner() {
    const bn = fx.banner;
    if (!bn) return;
    const e = bn.age, DUR = 2.2;
    if (e > DUR) { fx.banner = null; return; }
    const a = e < 0.15 ? e / 0.15 : e > DUR - 0.4 ? (DUR - e) / 0.4 : 1;
    const y = 120, jit = e < 0.5 ? (Math.random() - 0.5) * 14 * (1 - e / 0.5) : 0;
    ctx.save();
    ctx.globalAlpha = clamp01(a);
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(0, y - 40, W, 80);
    ctx.fillStyle = rgba(GOLD, 0.9);
    ctx.fillRect(0, y - 40, W, 3); ctx.fillRect(0, y + 37, W, 3);
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = `900 38px ${FONT}`;
    if ('letterSpacing' in ctx) ctx.letterSpacing = '6px';
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = 'rgba(255,0,40,0.9)'; ctx.fillText(bn.name, W / 2 - 4 + jit, y - 6);
    ctx.fillStyle = 'rgba(0,200,255,0.8)'; ctx.fillText(bn.name, W / 2 + 4 - jit, y - 6);
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = '#fff'; ctx.fillText(bn.name, W / 2 + jit * 0.3, y - 6);
    if ('letterSpacing' in ctx) ctx.letterSpacing = '2px';
    ctx.font = `700 14px system-ui, sans-serif`;
    ctx.fillStyle = rgba(GOLD, clamp01((e - 0.2) / 0.3));
    ctx.fillText(bn.sub, W / 2, y + 24);
    if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';
    ctx.restore();
  }

  function title(look, k, bp) {
    for (let j = 0; j < 3; j++) {
      ctx.strokeStyle = rgba(j === 1 ? GOLD : look.color, 0.5 + 0.4 * k);
      ctx.lineWidth = 3 - j;
      ctx.beginPath();
      for (let i = 0; i <= 6; i++) { const a = bp * 0.08 * (j % 2 ? -1 : 1) + i / 6 * TAU + j * 0.3; ctx.lineTo(CX + Math.cos(a) * (180 + j * 24 + 8 * k), 270 + Math.sin(a) * (180 + j * 24 + 8 * k)); }
      ctx.stroke();
    }
  }

  THEMES.ex = {
    noTrails: true, noScanlines: false, glow: 1.6,
    clearColors: ['#ff2a3a', '#ffd23f', '#ffffff', '#ff6bd5', '#c86bff'],
    reset, update, background, floor, platform, bullet, flash, banner, title,
  };
})();
