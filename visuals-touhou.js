"use strict";

/* =========================================================================
   見た目のセット「touhou」  —  曲②「Re:Unknown X」（リメイク）用
   東方の弾幕シューティングの画面を再現:
     ボス     … 「Unknown X」。正体の見えない影 ＋ 回る魔法陣。上に名前と体力のバー（残りのスペルカードは★）
     スペルカード … 宣言すると、ななめの帯が横切ってスペル名が出て、右上に名前と残り時間。
                    1回も当たらずに終われば「Get Spell Card Bonus!!」、当たれば「Bonus Failed...」。
                    スペル中は背景に大きな魔法陣が回る
     グレイズ … 弾のすぐ近くをかすめると、白い火花と「Graze」の数が増える
   背景は『東方非想天則』の幻想郷: 夜空と月、妖怪の山の上の守矢神社、湖。山の向こうを「巨大な影」が歩く。
   静かな所（ブレイク）では影が近づいて目が光り、足音とともに巨大な足が踏みつけてくる。最後に正体がわかる。
   赤・緑・青の UFO（『東方星蓮船』の UFO）は visuals.js の drawUfo で描く。
   ========================================================================= */

(function () {
  const WHITE = [255, 255, 255];
  const SERIF = '"Hiragino Mincho ProN", "Yu Mincho", "Noto Serif JP", serif';
  const st = { cutin: null, result: null, reveal: 0, grazed: new WeakSet(), graze: 0, lastHits: 0, spells: 0, mtn: null };
  const inSong = () => scene !== 'title';

  function reset() {
    Object.assign(st, { cutin: null, result: null, reveal: 0, grazed: new WeakSet(), graze: 0, lastHits: 0, spells: 0 });
    Object.assign(THB, { x: W / 2, y: -60, tx: W / 2, ty: 140, on: 0, hp: 1, spell: null, graze: 0 });
  }
  window.thSpell = function (sp) { st.cutin = { t: 0, name: sp.name }; st.spells++; flash(0.4); };
  window.thReveal = function () { st.reveal = 0.001; flash(0.6); };

  function make() {
    // 妖怪の山（3枚）＋ 頂上の守矢神社
    st.mtn = [0, 1, 2].map(i => {
      const c = document.createElement('canvas'); c.width = W + 200; c.height = 360;
      const g = c.getContext('2d');
      const col = ['#2a2350', '#1c1838', '#120f24'][i];
      g.fillStyle = col; g.beginPath(); g.moveTo(0, 360);
      for (let x = 0; x <= W + 200; x += 10) {
        const u = x / (W + 200);
        const y = i === 0 ? 120 + 160 * Math.pow(Math.abs(u - 0.62) * 2.2, 1.3) + Math.sin(x * 0.05) * 6 : (i === 1 ? 200 : 260) - 40 * Math.sin(u * 7 + i) - 20 * Math.sin(u * 17);
        g.lineTo(x, Math.min(360, y));
      }
      g.lineTo(W + 200, 360); g.closePath(); g.fill();
      if (i === 0) {                                                        // 頂上の神社（鳥居 ＋ 社）
        const x = (W + 200) * 0.62, y = 112;
        g.fillStyle = '#c0392b'; g.fillRect(x - 22, y - 26, 3, 26); g.fillRect(x + 19, y - 26, 3, 26); g.fillRect(x - 28, y - 30, 56, 4); g.fillRect(x - 22, y - 22, 44, 2);
        g.fillStyle = '#1a1530'; g.beginPath(); g.moveTo(x + 30, y); g.lineTo(x + 46, y - 22); g.lineTo(x + 62, y); g.closePath(); g.fill(); g.fillRect(x + 34, y - 4, 24, 6);
        g.fillStyle = 'rgba(255,200,120,0.8)'; g.fillRect(x + 44, y - 8, 4, 4);
      }
      return c;
    });
  }

  function update(dt, T, look) {
    if (!st.mtn) make();
    THB.x += (THB.tx - THB.x) * Math.min(1, dt * 2.5); THB.y += (THB.ty - THB.y) * Math.min(1, dt * 2.5);
    if (st.cutin) { st.cutin.t += dt; if (st.cutin.t > 2.2) st.cutin = null; }
    if (st.result) { st.result.t += dt; if (st.result.t > 2.4) st.result = null; }
    if (st.reveal > 0) st.reveal += dt;
    if (scene !== 'play') return;
    const sp = THB.spell;
    if (sp && !sp.done) {                                                  // スペルカードの体力・終わり
      THB.hp = clamp01(1 - (songTime - sp.start) / Math.max(0.1, sp.end - sp.start));
      if (songTime >= sp.end) {
        sp.done = true;
        const ok = hitsTaken === sp.hits0;
        st.result = { t: 0, ok, bonus: (sp.no * 3 + 7) * 1234560 };
        if (ok) { flash(0.5); sparks(W / 2, 200, { n: 40, color: '#ffffff', speed: 360, life: 0.9, size: 3, gravity: 0 }); }
      }
    } else THB.hp = Math.min(1, THB.hp + dt * 0.8);
    const p = playerXY();                                                  // グレイズ
    for (const b of bullets) {
      if (b.delay > 0 || b.safe || b.kind || st.grazed.has(b)) continue;
      const d = Math.hypot(b.x - p.x, b.y - p.y) - b.r - 12;
      if (d > 0 && d < 18) { st.grazed.add(b); st.graze++; sparks(p.x + (b.x - p.x) * 0.5, p.y + (b.y - p.y) * 0.5, { n: 4, color: '#ffffff', speed: 140, life: 0.25, size: 2, gravity: 0 }); }
    }
  }

  // ---- 背景 -------------------------------------------------------------------------------
  // 巨大な影「非想天則」: 丸い頭・大きな肩・マント。scale で近さ、eyes で目の光
  function giant(x, base, s, a, eyes, lit) {
    ctx.save(); ctx.translate(x, base); ctx.scale(s, s);
    ctx.fillStyle = lit > 0 ? rgba(mixC([20, 16, 36], [190, 150, 90], lit), a) : `rgba(10,8,22,${a.toFixed(3)})`;
    ctx.beginPath();                                                      // マント ＋ 体
    ctx.moveTo(-150, 0); ctx.lineTo(-120, -260); ctx.quadraticCurveTo(-110, -330, -60, -340); ctx.lineTo(60, -340); ctx.quadraticCurveTo(110, -330, 120, -260); ctx.lineTo(150, 0); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.ellipse(-130, -300, 46, 30, -0.3, 0, TAU); ctx.ellipse(130, -300, 46, 30, 0.3, 0, TAU); ctx.fill();   // 肩
    ctx.beginPath(); ctx.arc(0, -390, 62, 0, TAU); ctx.fill();               // 頭
    ctx.fillRect(-8, -480, 16, 40); ctx.beginPath(); ctx.arc(0, -484, 12, 0, TAU); ctx.fill();   // 頭の上
    if (eyes > 0.01) {
      ctx.globalCompositeOperation = 'lighter';
      for (const ex of [-24, 24]) { ctx.globalAlpha = eyes * a; ctx.drawImage(glowSprite([255, 90, 60]), ex - 30, -400 - 30, 60, 60); ctx.fillStyle = `rgba(255,220,180,${(eyes * a).toFixed(3)})`; ctx.fillRect(ex - 9, -398, 18, 5); }
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    }
    if (lit > 0.3) {                                                       // 正体: 宣伝の文字
      ctx.fillStyle = rgba([255, 240, 200], lit); ctx.font = `700 34px ${SERIF}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('未来水妖バザー', 0, -180); ctx.font = `700 22px ${SERIF}`; ctx.fillText('河童 開催', 0, -140);
    }
    ctx.restore();
  }
  function background(T, look, k, bk, bp) {
    if (!st.mtn) make();
    const bpS = inSong() ? bp : 40;
    // 近さ: はじめは遠く、ブレイク（276拍〜）で近づき、足音（306拍〜）でいちばん近い
    const near = st.reveal > 0 ? 0.6 : clamp01((bpS - 270) / 30) * (bpS < 330 ? 1 : clamp01(1 - (bpS - 330) / 10));
    const gs = 0.45 + 0.4 * near, gx = W * 0.32 + Math.sin(T * 0.05) * 140, gb = 380 + 160 * near;
    const eyes = bpS > 270 && bpS < 330 ? 0.6 + 0.4 * k : look.tier >= 4 ? 0.4 * k : 0;
    const lit = clamp01(st.reveal / 1.5);
    ctx.drawImage(cachedLayer('thSky', 3, 0, g => {
      const gr = g.createLinearGradient(0, 0, 0, GROUND_Y);
      gr.addColorStop(0, rgba(look.skyTop, 1)); gr.addColorStop(1, rgba(look.skyBot, 1));
      g.fillStyle = gr; g.fillRect(0, 0, W, H);
      g.fillStyle = '#fff';                                                // 星
      for (let i = 0; i < 80; i++) { g.globalAlpha = 0.25 + 0.5 * Math.abs(Math.sin(T * 0.8 + i * 3.1)); g.fillRect((i * 97.3) % W, (i * 53.7) % 360, 1.5, 1.5); }
      g.globalAlpha = 1;
      const mg = g.createRadialGradient(640, 110, 0, 640, 110, 160);       // 月
      mg.addColorStop(0, 'rgba(255,248,220,0.35)'); mg.addColorStop(1, 'rgba(255,248,220,0)');
      g.fillStyle = mg; g.fillRect(480, -50, 320, 320);
      g.fillStyle = '#fff6dc'; g.beginPath(); g.arc(640, 110, 40, 0, TAU); g.fill();
    }), 0, 0, W, H);
    giant(gx, gb, gs, 0.9, eyes, lit);                                      // 巨大な影（山のうしろ）
    ctx.drawImage(cachedLayer('thLand', 3, 1, g => {
      st.mtn.forEach((m, i) => g.drawImage(m, -((T * (2 + i * 4)) % 200), GROUND_Y - 360 + i * 30));
      const lg = g.createLinearGradient(0, GROUND_Y - 70, 0, GROUND_Y);  // 湖
      lg.addColorStop(0, 'rgba(60,70,130,0.35)'); lg.addColorStop(1, 'rgba(20,20,50,0.8)');
      g.fillStyle = lg; g.fillRect(0, GROUND_Y - 70, W, 70);
      g.fillStyle = 'rgba(255,246,220,0.35)'; for (let i = 0; i < 6; i++) g.fillRect(620 - (20 - i * 3), GROUND_Y - 60 + i * 10, 40 - i * 6, 2);
    }), 0, 0, W, H);
    // スペル中: 大きな魔法陣が回る
    if (THB.spell && !THB.spell.done && inSong()) magicCircle(W / 2, 300, 300, T * 0.25, rgba(look.color, 0.18), 1);
    // ボス
    if (THB.on || THB.y > -50) drawBoss(T, look, k);
  }
  function magicCircle(x, y, R, rot, col, lw) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
    ctx.strokeStyle = col; ctx.lineWidth = lw;
    for (const r of [R, R * 0.9, R * 0.55]) { ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.stroke(); }
    ctx.beginPath();                                                      // 六芒星
    for (let i = 0; i <= 6; i++) { const a = i * 2 * TAU / 6 - Math.PI / 2; ctx.lineTo(Math.cos(a) * R * 0.9, Math.sin(a) * R * 0.9); }
    for (let i = 0; i <= 6; i++) { const a = i * 2 * TAU / 6 + Math.PI / 6; ctx.lineTo(Math.cos(a) * R * 0.9, Math.sin(a) * R * 0.9); }
    ctx.stroke();
    for (let i = 0; i < 36; i++) { const a = i * TAU / 36; ctx.beginPath(); ctx.moveTo(Math.cos(a) * R * 0.9, Math.sin(a) * R * 0.9); ctx.lineTo(Math.cos(a) * R * (i % 3 ? 0.95 : 1), Math.sin(a) * R * (i % 3 ? 0.95 : 1)); ctx.stroke(); }
    ctx.restore();
  }
  function drawBoss(T, look, k) {
    const x = THB.x, y = THB.y + Math.sin(T * 2) * 4;
    magicCircle(x, y, 46 + 4 * k, T * 1.5, 'rgba(255,120,160,0.7)', 1.5);
    magicCircle(x, y, 30, -T * 2.2, 'rgba(160,200,255,0.6)', 1);
    ctx.fillStyle = '#120c20';                                            // 正体の見えない影（フード）
    ctx.beginPath(); ctx.moveTo(x - 18, y + 26); ctx.quadraticCurveTo(x - 20, y - 18, x, y - 24); ctx.quadraticCurveTo(x + 20, y - 18, x + 18, y + 26); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#ff4d6d'; ctx.fillRect(x - 8, y - 8, 5, 3); ctx.fillRect(x + 3, y - 8, 5, 3);
    ctx.font = `900 18px ${SERIF}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = `rgba(255,240,200,${(0.6 + 0.4 * k).toFixed(3)})`; ctx.fillText('?', x, y + 10);
  }

  // ---- 床・足場 ----------------------------------------------------------------------------
  function floor(look, k) {
    ctx.fillStyle = '#100c1e'; ctx.fillRect(-400, GROUND_Y, W + 800, H - GROUND_Y + 400);
    ctx.strokeStyle = rgba(look.color, 0.5 + 0.3 * k); ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(-400, GROUND_Y); ctx.lineTo(W + 400, GROUND_Y); ctx.stroke();
    ctx.strokeStyle = 'rgba(200,210,255,0.12)'; ctx.lineWidth = 1;          // 石だたみ
    for (let x = -400; x < W + 400; x += 48) { ctx.beginPath(); ctx.moveTo(x, GROUND_Y); ctx.lineTo(x - 30, H); ctx.stroke(); }
  }
  function platform(p, look, k) {                                          // 神社の木の板 ＋ しめ縄
    ctx.fillStyle = '#5a3a24'; ctx.fillRect(p.x, p.y, p.w, p.h);
    ctx.fillStyle = '#e8dcc0'; ctx.fillRect(p.x, p.y, p.w, 3);
    ctx.fillStyle = '#fff';
    for (let x = p.x + 14; x < p.x + p.w - 6; x += 28) { ctx.beginPath(); ctx.moveTo(x, p.y + p.h); ctx.lineTo(x + 5, p.y + p.h + 6); ctx.lineTo(x, p.y + p.h + 12); ctx.lineTo(x + 5, p.y + p.h + 18); ctx.stroke(); }
  }

  // ---- 弾: 東方の弾の形 ---------------------------------------------------------------------
  function bullet(b, c, k) {
    const style = b.style || (b.r >= 13 ? 'big' : 'orb');
    const ang = () => (b.px != null && (b.x !== b.px || b.y !== b.py)) ? Math.atan2(b.y - b.py, b.x - b.px) : Math.atan2(b.vy || 1, b.vx || 0);
    if (style === 'rice') {                                                // 米つぶ弾
      const a = ang();
      ctx.fillStyle = rgba(c, 1); ctx.beginPath(); ctx.ellipse(b.x, b.y, b.r * 1.6, b.r, a, 0, TAU); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.95)'; ctx.beginPath(); ctx.ellipse(b.x, b.y, b.r, b.r * 0.5, a, 0, TAU); ctx.fill();
      return;
    }
    if (style === 'amulet') {                                              // お札
      const a = ang();
      ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(a + Math.PI / 2);
      ctx.fillStyle = '#fff8f0'; ctx.fillRect(-b.r * 0.8, -b.r * 1.3, b.r * 1.6, b.r * 2.6);
      ctx.strokeStyle = rgba(c, 1); ctx.lineWidth = 2; ctx.strokeRect(-b.r * 0.8, -b.r * 1.3, b.r * 1.6, b.r * 2.6);
      ctx.fillStyle = rgba(c, 1); ctx.beginPath(); ctx.arc(0, 0, b.r * 0.4, 0, TAU); ctx.fill();
      ctx.restore();
      return;
    }
    if (style === 'star') {
      const rot = b.age * 4 + b.x * 0.01;
      ctx.fillStyle = rgba(c, 1); ctx.beginPath();
      for (let i = 0; i < 10; i++) { const r = i % 2 ? b.r * 0.6 : b.r * 1.45, a = rot + i * Math.PI / 5; ctx.lineTo(b.x + Math.cos(a) * r, b.y + Math.sin(a) * r); }
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.95)'; ctx.beginPath(); ctx.arc(b.x, b.y, b.r * 0.45, 0, TAU); ctx.fill();
      return;
    }
    if (style === 'ironring') {                                            // 洩矢の鉄の輪（とげのある鉄の輪）
      ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(b.spin || 0);
      ctx.strokeStyle = '#9aa3b5'; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(0, 0, b.r * 0.8, 0, TAU); ctx.stroke();
      ctx.strokeStyle = '#e8ecf5'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, 0, b.r * 0.8, 0, TAU); ctx.stroke();
      ctx.fillStyle = '#c8cdd8';
      for (let i = 0; i < 8; i++) { const a = i * TAU / 8; ctx.beginPath(); ctx.moveTo(Math.cos(a - 0.15) * b.r * 0.8, Math.sin(a - 0.15) * b.r * 0.8); ctx.lineTo(Math.cos(a) * b.r * 1.25, Math.sin(a) * b.r * 1.25); ctx.lineTo(Math.cos(a + 0.15) * b.r * 0.8, Math.sin(a + 0.15) * b.r * 0.8); ctx.fill(); }
      ctx.restore();
      return;
    }
    if (style === 'frog') {                                                // カエル
      const sq = b.squash || 0;
      ctx.save(); ctx.translate(b.x, b.y); ctx.scale(1 + 0.3 * sq, 1 - 0.25 * sq);
      ctx.fillStyle = rgba(c, 1); ctx.beginPath(); ctx.ellipse(0, 0, b.r * 1.3, b.r, 0, 0, TAU); ctx.fill();
      for (const sx of [-1, 1]) { ctx.beginPath(); ctx.arc(sx * b.r * 0.6, -b.r * 0.85, b.r * 0.45, 0, TAU); ctx.fill(); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(sx * b.r * 0.6, -b.r * 0.85, b.r * 0.3, 0, TAU); ctx.fill(); ctx.fillStyle = '#111'; ctx.beginPath(); ctx.arc(sx * b.r * 0.6, -b.r * 0.85, b.r * 0.14, 0, TAU); ctx.fill(); ctx.fillStyle = rgba(c, 1); }
      ctx.strokeStyle = 'rgba(20,60,20,0.8)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(0, 0, b.r * 0.6, 0.2, Math.PI - 0.2); ctx.stroke();
      ctx.restore();
      return;
    }
    // 丸玉（大きいものは大玉）: 色のふち ＋ 白い中身
    if (gfx > 0 && style === 'big') { ctx.globalCompositeOperation = 'lighter'; ctx.drawImage(glowSprite(c), b.x - b.r * 2.2, b.y - b.r * 2.2, b.r * 4.4, b.r * 4.4); ctx.globalCompositeOperation = 'source-over'; }
    ctx.fillStyle = rgba(c, 1); ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.95)'; ctx.beginPath(); ctx.arc(b.x, b.y, b.r * (style === 'big' ? 0.7 : 0.6), 0, TAU); ctx.fill();
  }
  // 巨大な足（踏みつけ）。ほかのレーザーはふつうの見た目
  function laser(b, c, T, k) {
    if (!b.foot) {
      if (b.x1 === b.x2 && b.y1 <= 0 && !b.lane) { drawUfo(b.x1, 34, Math.min(0.9, b.r / 40 + 0.4), c, b.delay > 0 ? clamp01(1 - b.delay / (b.delayMax || 1)) * 2 : 1, T, k, b.delay > 0 ? 0 : 1); }
      return false;
    }
    const w = b.r * 2, x = b.x1;
    if (b.delay > 0) {                                                     // 予告: 床に大きな影
      const p = 1 - b.delay / b.delayMax;
      ctx.fillStyle = `rgba(0,0,0,${(0.2 + 0.4 * p).toFixed(3)})`; ctx.beginPath(); ctx.ellipse(x, GROUND_Y + 4, w * 0.6 * (0.5 + 0.5 * p), 10, 0, 0, TAU); ctx.fill();
      ctx.strokeStyle = `rgba(255,80,80,${(0.3 + 0.5 * p).toFixed(3)})`; ctx.setLineDash([8, 8]); ctx.lineWidth = 2; ctx.strokeRect(x - w / 2, 0, w, GROUND_Y); ctx.setLineDash([]);
      return true;
    }
    const down = clamp01(b.age / 0.12), up = b.safe ? clamp01((b.age - b.hold) / 0.3) : 0, bottom = GROUND_Y * down - GROUND_Y * up;
    ctx.fillStyle = '#16102a';
    ctx.fillRect(x - w * 0.35, bottom - 600, w * 0.7, 600);                   // 足
    ctx.beginPath(); ctx.ellipse(x + w * 0.1, bottom - 20, w * 0.65, 24, 0, 0, TAU); ctx.fill();   // つま先
    ctx.fillStyle = 'rgba(120,100,180,0.4)'; ctx.fillRect(x - w * 0.35, bottom - 600, 6, 580);
    return true;
  }
  function fire(b) { if (b.foot) { shake(14); punch(0.04); sparks(b.x1, GROUND_Y, { n: 24, color: '#b8a8e8', speed: 300, life: 0.6, size: 3, gravity: 600, dir: -Math.PI / 2, spread: 2.6 }); return true; } return false; }

  function flash(look) { ctx.fillStyle = `rgba(255,255,255,${(0.4 * flashT).toFixed(3)})`; ctx.fillRect(0, 0, W, H); }

  // ---- 画面の情報（東方の画面の再現）: ボスの名前と体力、スペルの名前と時間、グレイズ、ENEMY、宣言の帯、結果 -------
  function banner() {
    const T = songTime;
    if (inSong() && (THB.on || (THB.spell && !THB.spell.done))) {
      ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
      ctx.font = `700 13px ${SERIF}`; ctx.fillStyle = '#fff'; ctx.fillText('Unknown X', 14, 18);
      const stars = 4 - st.spells;                                       // 残りのスペルカード
      ctx.fillStyle = '#ffd84d'; ctx.fillText('★'.repeat(Math.max(0, stars)), 96, 18);
      ctx.fillStyle = 'rgba(255,255,255,0.25)'; ctx.fillRect(14, 28, W - 120, 4);
      ctx.fillStyle = '#ff4d6d'; ctx.fillRect(14, 28, (W - 120) * THB.hp, 4);
      ctx.font = `700 12px ${SERIF}`; ctx.fillStyle = 'rgba(255,255,255,0.8)'; ctx.fillText(`Graze  ${st.graze}`, 14, 46);
      const sp = THB.spell;
      if (sp && !sp.done) {
        ctx.textAlign = 'right';
        ctx.font = `700 22px ${SERIF}`; ctx.fillStyle = '#fff'; ctx.fillText(Math.max(0, sp.end - T).toFixed(2), W - 14, 20);
        if (!st.cutin || st.cutin.t > 1.2) {
          ctx.font = `700 15px ${SERIF}`; ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(0,0,0,0.7)';
          ctx.strokeText(sp.name, W - 14, 48); ctx.fillStyle = '#fff'; ctx.fillText(sp.name, W - 14, 48);
          ctx.fillStyle = 'rgba(255,255,255,0.7)'; ctx.fillRect(W - 14 - ctx.measureText(sp.name).width, 58, ctx.measureText(sp.name).width, 1);
        }
      }
      if (THB.on) {                                                        // 画面の下のふちの ENEMY
        ctx.fillStyle = 'rgba(255,60,90,0.85)'; ctx.fillRect(THB.x - 22, H - 12, 44, 12);
        ctx.font = `700 9px ${SERIF}`; ctx.textAlign = 'center'; ctx.fillStyle = '#fff'; ctx.fillText('ENEMY', THB.x, H - 6);
      }
    }
    if (st.cutin) {                                                        // スペルカード宣言: ななめの帯 ＋ 名前
      const e = st.cutin.t, a = e < 0.2 ? e / 0.2 : clamp01(1 - (e - 1.5) / 0.6);
      ctx.save(); ctx.globalAlpha = a;
      ctx.translate(W / 2, 260); ctx.rotate(-0.12);
      ctx.fillStyle = 'rgba(160,20,60,0.55)'; ctx.fillRect(-W, -40, W * 2, 80);
      ctx.fillStyle = 'rgba(255,255,255,0.25)'; for (let i = 0; i < 12; i++) ctx.fillRect(((i * 150 - e * 600) % (W * 2)) - W, -40, 40, 80);
      ctx.font = `900 64px ${SERIF}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillStyle = 'rgba(255,255,255,0.18)'; ctx.fillText('Spell Card', -e * 120, -60);
      ctx.restore();
      ctx.save(); ctx.globalAlpha = a;
      const x = W - 14 - (1 - easeOut(e / 0.4)) * 300;
      ctx.font = `700 22px ${SERIF}`; ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
      ctx.lineWidth = 5; ctx.strokeStyle = 'rgba(0,0,0,0.75)'; ctx.strokeText(st.cutin.name, x, 330); ctx.fillStyle = '#fff'; ctx.fillText(st.cutin.name, x, 330);
      ctx.restore();
    }
    if (st.result) {                                                       // スペルの結果
      const e = st.result.t, a = e < 0.2 ? e / 0.2 : clamp01(1 - (e - 1.8) / 0.6);
      ctx.save(); ctx.globalAlpha = a; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      if (st.result.ok) {
        ctx.font = `900 30px ${SERIF}`; ctx.lineWidth = 6; ctx.strokeStyle = 'rgba(120,0,30,0.9)';
        ctx.strokeText('Get Spell Card Bonus!!', W / 2, 190); ctx.fillStyle = '#fff'; ctx.fillText('Get Spell Card Bonus!!', W / 2, 190);
        ctx.font = `700 18px ${SERIF}`; ctx.fillStyle = '#ffd84d'; ctx.fillText(st.result.bonus.toLocaleString(), W / 2, 226);
      } else {
        ctx.font = `700 22px ${SERIF}`; ctx.fillStyle = 'rgba(220,220,230,0.9)'; ctx.fillText('Bonus Failed...', W / 2, 200);
      }
      ctx.restore();
    }
    if (st.reveal > 0) {                                                   // 正体
      const a = clamp01(st.reveal / 1.2);
      ctx.save(); ctx.globalAlpha = a; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.font = `900 30px ${SERIF}`; ctx.lineWidth = 6; ctx.strokeStyle = 'rgba(0,0,0,0.7)';
      ctx.strokeText('正体：非想天則', W / 2, 150); ctx.fillStyle = '#ffe9b0'; ctx.fillText('正体：非想天則', W / 2, 150);
      ctx.font = `700 15px ${SERIF}`; ctx.strokeText('（河童が作った、宣伝用の巨大な人形だった）', W / 2, 186); ctx.fillStyle = '#fff'; ctx.fillText('（河童が作った、宣伝用の巨大な人形だった）', W / 2, 186);
      ctx.restore();
    }
    const bn = fx.banner;                                                  // 場面の名前（明朝体）
    if (!bn) return;
    const e = bn.age, DUR = 2.6;
    if (e > DUR) { fx.banner = null; return; }
    const a = e < 0.5 ? e / 0.5 : e > DUR - 0.6 ? (DUR - e) / 0.6 : 1;
    ctx.save(); ctx.globalAlpha = clamp01(a);
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = `700 34px ${SERIF}`; if ('letterSpacing' in ctx) ctx.letterSpacing = '8px';
    ctx.lineWidth = 6; ctx.strokeStyle = 'rgba(0,0,0,0.6)'; ctx.strokeText(bn.name, W / 2, 112); ctx.fillStyle = '#fff'; ctx.fillText(bn.name, W / 2, 112);
    if ('letterSpacing' in ctx) ctx.letterSpacing = '2px';
    ctx.font = `600 15px ${SERIF}`; ctx.lineWidth = 4; ctx.strokeText(bn.sub, W / 2, 148); ctx.fillStyle = rgba(mixC(bn.c, WHITE, 0.6), 1); ctx.fillText(bn.sub, W / 2, 148);
    if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';
    ctx.restore();
  }

  function title(look, k, bp) {
    magicCircle(W / 2, H * 0.38, 230, bp * 0.05, 'rgba(255,140,180,0.35)', 1.5);
    const cols = ['#ff4d6d', '#5cf2a4', '#4cc9f0'].map(rgb);
    for (let i = 0; i < 18; i++) {
      const a = bp * 0.05 + i / 18 * TAU, x = W / 2 + Math.cos(a) * 200, y = H * 0.38 + Math.sin(a) * 200;
      bullet({ x, y, r: 7, style: i % 3 === 1 ? 'amulet' : i % 3 === 2 ? 'star' : 'rice', age: bp * 0.3, px: x - Math.sin(a), py: y + Math.cos(a) }, cols[i % 3], k);
    }
  }

  THEMES.touhou = {
    noTrails: true, noScanlines: true, glow: 1.6,
    clearColors: ['#ff4d6d', '#5cf2a4', '#4cc9f0', '#fff3c4', '#c4b5fd'],
    reset, update, background, floor, platform, bullet, laser, fire, flash, banner, title,
  };
})();
