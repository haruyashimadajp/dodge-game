"use strict";

/* =========================================================================
   見た目のセット「abyss」  —  曲⑨「Abyss」用
   深海。上から差しこむ光の筋（深くなると消える）、ゆれる海藻、のぼる泡、砂の海底と岩の足場。
   弾は生き物のように光る玉。右はしに深さのメーター（曲が進むほど深くなる）。
   暗い海（stage.dark）では自分のまわりだけが見え、弾はうっすら光る点になる。
   ソナー（stage.pings）の輪が通ると、その所の弾が一瞬はっきり光る。
   ========================================================================= */

(function () {
  const WHITE = [255, 255, 255];
  const st = { kelp: null, bubbles: [], motes: null };
  const PING_V = 650;                                     // ソナーの輪が広がる速さ（px/秒）

  function make() {
    st.kelp = Array.from({ length: 9 }, (_, i) => ({ x: 40 + i * 92 + Math.random() * 40, h: 90 + Math.random() * 110, ph: Math.random() * TAU }));
    st.motes = Array.from({ length: 70 }, () => ({ x: Math.random() * W, y: Math.random() * H, z: 0.3 + Math.random() * 0.7 }));
  }
  function reset() { st.bubbles = []; }
  function update(dt, T, look) {
    if (!st.kelp) make();
    if (Math.random() < dt * 3) st.bubbles.push({ x: Math.random() * W, y: GROUND_Y, r: 2 + Math.random() * 4, v: 40 + Math.random() * 60 });
    for (const b of st.bubbles) { b.y -= b.v * dt; b.x += Math.sin(b.y * 0.05) * 0.3; }
    st.bubbles = st.bubbles.filter(b => b.y > -10);
    for (const m of st.motes) { m.y += 8 * m.z * dt; m.x += Math.sin(T * 0.5 + m.y * 0.01) * 4 * dt; if (m.y > H) { m.y = 0; m.x = Math.random() * W; } }
  }

  function background(T, look, k, bk, bp) {
    if (!st.kelp) make();
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, rgba(look.skyBot, 1)); g.addColorStop(1, rgba(look.skyTop, 1));
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    // 光の筋（浅いほど明るい）
    const depth = scene === 'play' ? clamp01(T / SONG_END) : 0.2;
    const ray = 0.10 * (1 - depth) + 0.02;
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 5; i++) {
      const x = 120 + i * 150 + Math.sin(T * 0.3 + i) * 40, w = 40 + 20 * Math.sin(T * 0.5 + i * 2);
      const gr = ctx.createLinearGradient(0, 0, 0, H * 0.9);
      gr.addColorStop(0, `rgba(160,230,255,${(ray * (1 + 0.5 * k)).toFixed(3)})`); gr.addColorStop(1, 'rgba(160,230,255,0)');
      ctx.fillStyle = gr;
      ctx.beginPath(); ctx.moveTo(x - w / 2, 0); ctx.lineTo(x + w / 2, 0); ctx.lineTo(x + w * 2 - 120, H); ctx.lineTo(x - w - 120, H); ctx.closePath(); ctx.fill();
    }
    // ただよう粒（プランクトン）
    for (const m of st.motes) {
      ctx.fillStyle = rgba(look.color, 0.12 + 0.2 * m.z);
      ctx.fillRect(m.x, m.y, 1.5 + m.z, 1.5 + m.z);
    }
    ctx.globalCompositeOperation = 'source-over';
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
    for (let i = b.segs.length - 1; i >= 0; i--) {
      const s = b.segs[i];
      if (!s.on) continue;
      ctx.fillStyle = rgba(mixC(c, [0, 0, 0], 0.55 + 0.02 * i), 1);
      ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, TAU); ctx.fill();
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
    if (scene === 'play') {
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
})();
