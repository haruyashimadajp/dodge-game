"use strict";

/* =========================================================================
   見た目のセット「ongeki」  —  曲⑯「怨撃」用
   オンゲキの画面を再現: 奥（地平線）から手前の判定ライン（床）へのびる 6 本のレーン、左右の WALL（ピンク・紫）、
   奥にいる相手キャラ「あかニャン」（黒くて丸いネコ。とがった耳がヘッドホンのようにつながり、手袋の手が左右に浮いている。
   火の属性なので炎をまとう）。101小節からは「怨撃・真」の こんじきニャン（金色で王冠）に変身する。
     弾       … ピンク（小）/ 紫（中）/ オレンジ（大きい危険弾）。オンゲキの弾のように、白い芯 ＋ ふち
     ベル     … 金色の鈴（取ると「チン」と鳴って、右上の数が増える）
     ノーツ   … 赤・緑・青の TAP と HOLD、横はしの WALL。判定ラインに着くと「CRITICAL BREAK」
     ネコパンチ・隕石・いもむし … それぞれの形で描く
   上の左はしに相手の名前と体力（曲が進むと減っていき、最後に 0 → WIN）。右上にベルの数。
   最後は「YOU ARE A SUPER SHOOTER!!」の文字が左右に流れる（原作の最後の演出）。
   ========================================================================= */

(function () {
  const WHITE = [255, 255, 255];
  const PINK = [255, 95, 180], PURPLE = [179, 107, 255], ORANGE = [255, 138, 31], GOLD = [255, 210, 58], RED = [255, 48, 64];
  const BTN = ['#ff4d6d', '#5cff8a', '#4da6ff', '#ff4d6d', '#5cff8a', '#4da6ff'].map(rgb);
  const FONT = '"M PLUS Rounded 1c", "Hiragino Maru Gothic ProN", "Arial Rounded MT Bold", system-ui, sans-serif';
  const HY = 168, TOPW = 64, BOTW = 430;                   // レーンの地平線の高さ / 奥のはば（半分）/ 手前のはば（半分）
  const st = {};
  const inSong = () => scene !== 'title';
  const hs = (a, b = 0) => { const v = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return v - Math.floor(v); };
  const BAR = k => (typeof ogBar === 'function' ? ogBar(k) : 0);

  function reset() {
    Object.assign(st, {
      fired: 0, handL: 0, handR: 0, laneLit: new Array(6).fill(0), judges: [], pops: [], warn: -1, nyan: -1, awaken: -1, defeat: -1, shooter: -1,
      punchSide: 0, appear: -1, flame: [], bellT: 0, lastBells: 0,
    });
  }
  reset();

  // ---- 譜面から呼ぶ ------------------------------------------------------------------------------
  window.ogFx = function (type, arg) {
    const T = songTime;
    if (type === 'appear') st.appear = T;
    if (type === 'fire') { st.fired = 1; if (arg < 0) st.handL = 1; if (arg > 0) st.handR = 1; }
    if (type === 'warning') { st.warn = T; shake(6); }
    if (type === 'nyan') st.nyan = T;
    if (type === 'punch') { if (arg <= 0) st.handL = 1; if (arg >= 0) st.handR = 1; }
    if (type === 'awaken') { st.awaken = T; flash(1); shake(16); punch(0.06); glitch(0.6); sparks(OG_CAT.x, OG_CAT.y, { n: 60, color: '#ffd23a', speed: 520, life: 1.0, size: 4, gravity: 0 }); shockRing(OG_CAT.x, OG_CAT.y, { color: '#ffe9a0', size: 420, life: 0.8, width: 8 }); }
    if (type === 'defeat') { st.defeat = T; flash(1); shake(20); punch(0.08); sparks(OG_CAT.x, OG_CAT.y, { n: 90, color: '#ffd23a', speed: 600, life: 1.2, size: 4, gravity: 200 }); sparks(OG_CAT.x, OG_CAT.y, { n: 50, color: '#ff5fb4', speed: 420, life: 1.0, size: 3, gravity: 200 }); shockRing(OG_CAT.x, OG_CAT.y, { color: '#ffffff', size: 500, life: 0.9, width: 10 }); }
    if (type === 'shooter') st.shooter = T;
  };
  window.ogBellGot = function (b) {
    st.pops.push({ x: b.x, y: b.y - 14, t: 0, text: 'BELL' });
    sparks(b.x, b.y, { n: 8, color: '#ffe36e', speed: 160, life: 0.35, size: 2.5, gravity: 0 });
    st.bellT = 1;
    if (typeof beep === 'function') beep(2093, 0.09, 'sine', 0.45);
  };
  window.ogNoteHit = function (b) {
    const lane = Math.max(0, Math.min(5, Math.round((b.x - 66) / 133.6)));
    if (!b.wall) st.laneLit[lane] = 1;
    if (st.judges.length < 12) st.judges.push({ x: b.x, t: 0, text: b.hold ? 'BREAK' : 'CRITICAL BREAK', c: rgb(b.color || '#ffffff') });
    sparks(b.x, GROUND_Y - 4, { n: 7, color: b.color || '#ffffff', speed: 200, life: 0.3, size: 2.5, gravity: 300, dir: -Math.PI / 2, spread: 2 });
  };
  window.ogPunchFx = function (b) {
    shake(9); punch(0.03);
    if (b.y1 >= GROUND_Y - 40) {
      sparks(b.x1, GROUND_Y - 4, { n: 18, color: '#ffd0d0', speed: 320, life: 0.45, size: 3, gravity: 700, dir: -Math.PI / 2, spread: 2.4 });
      shockRing(b.x1, GROUND_Y, { color: '#ff7a7a', size: 120, life: 0.35, width: 5 });
    }
    st.pops.push({ x: b.x1, y: b.y1 - 46, t: 0, text: 'ドカッ', big: true });
  };
  window.ogMeteorFx = function (b) {
    flash(0.35); shake(12); punch(0.035);
    sparks(b.tx, GROUND_Y, { n: 30, color: '#ffb347', speed: 420, life: 0.7, size: 4, gravity: 700, dir: -Math.PI / 2, spread: 2.6 });
    shockRing(b.tx, GROUND_Y, { color: '#ffd9a0', size: 200, life: 0.5, width: 6 });
  };

  // ---- 前もって描く絵 ------------------------------------------------------------------------------
  const laneX = (u, i) => {                                 // 奥行き u（0 = 地平線, 1 = 判定ライン）での、レーンの線 i（0〜6）の x
    const hw = TOPW + (BOTW - TOPW) * u;
    return W / 2 - hw + (i / 6) * hw * 2;
  };
  const depthY = u => HY + (GROUND_Y - HY) * u;
  function make() {
    st.made = true;
    const c = document.createElement('canvas'); c.width = W; c.height = H;
    const g = c.getContext('2d');
    // レーンの床（半とうめい）
    g.beginPath(); g.moveTo(laneX(0, 0), HY); g.lineTo(laneX(0, 6), HY); g.lineTo(laneX(1, 6), GROUND_Y); g.lineTo(laneX(1, 0), GROUND_Y); g.closePath();
    const fg = g.createLinearGradient(0, HY, 0, GROUND_Y);
    fg.addColorStop(0, 'rgba(20,6,20,0.15)'); fg.addColorStop(1, 'rgba(14,4,18,0.62)');
    g.fillStyle = fg; g.fill();
    // レーンの線
    for (let i = 1; i < 6; i++) {
      g.strokeStyle = i === 3 ? 'rgba(255,255,255,0.22)' : 'rgba(255,255,255,0.10)'; g.lineWidth = i === 3 ? 2 : 1;
      g.beginPath(); g.moveTo(laneX(0, i), HY); g.lineTo(laneX(1, i), GROUND_Y); g.stroke();
    }
    // 左右の WALL（左 = ピンク、右 = 紫）
    for (const [i, col] of [[0, '255,95,210'], [6, '160,91,255']]) {
      g.shadowColor = `rgba(${col},1)`; g.shadowBlur = 14;
      g.strokeStyle = `rgba(${col},0.85)`; g.lineWidth = 5;
      g.beginPath(); g.moveTo(laneX(0, i), HY); g.lineTo(laneX(1, i), GROUND_Y); g.stroke();
      g.shadowBlur = 0;
      g.strokeStyle = `rgba(${col},0.18)`; g.lineWidth = 26;
      g.beginPath(); g.moveTo(laneX(0, i), HY); g.lineTo(laneX(1, i), GROUND_Y); g.stroke();
    }
    st.field = c;
    // 背景の大きな「怨」
    const kc = document.createElement('canvas'); kc.width = 420; kc.height = 420;
    const k2 = kc.getContext('2d');
    k2.font = '900 380px "Hiragino Mincho ProN", "Yu Mincho", serif'; k2.textAlign = 'center'; k2.textBaseline = 'middle';
    k2.shadowColor = 'rgba(255,40,60,1)'; k2.shadowBlur = 30;
    k2.fillStyle = 'rgba(255,60,80,1)'; k2.fillText('怨', 210, 225);
    st.kanji = kc;
  }

  // ---- ネコ（あかニャン / こんじきニャン）---------------------------------------------------------------
  function drawGlove(x, y, r, side, gold, a = 1, fist = 0) {
    ctx.save(); ctx.globalAlpha *= a;
    ctx.translate(x, y); ctx.scale(side < 0 ? -1 : 1, 1);
    const body = gold ? ['#fff6cf', '#e8b52c'] : ['#ffffff', '#cfcfd8'];
    const gr = ctx.createRadialGradient(-r * 0.3, -r * 0.3, r * 0.1, 0, 0, r);
    gr.addColorStop(0, body[0]); gr.addColorStop(1, body[1]);
    ctx.fillStyle = gr; ctx.strokeStyle = '#1a0a10'; ctx.lineWidth = Math.max(2, r * 0.09);
    ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.fill(); ctx.stroke();               // こぶし
    ctx.beginPath(); ctx.ellipse(r * 0.55, -r * 0.55, r * 0.32, r * 0.42, 0.6, 0, TAU); ctx.fill(); ctx.stroke();   // 親指
    ctx.fillStyle = gold ? '#b8860b' : '#ff3048';                                         // そで口
    ctx.beginPath(); ctx.ellipse(-r * 0.78, r * 0.45, r * 0.34, r * 0.5, 0.7, 0, TAU); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = 'rgba(0,0,0,0.25)'; ctx.lineWidth = Math.max(1.5, r * 0.06);
    for (let i = -1; i <= 1; i++) { ctx.beginPath(); ctx.moveTo(r * 0.1 + i * r * 0.28, -r * 0.2); ctx.lineTo(r * 0.2 + i * r * 0.28, r * (0.45 + fist * 0.2)); ctx.stroke(); }
    ctx.restore();
  }
  function drawCat(x, y, s, gold, T, k, mood = 0) {
    const R = 46 * s;
    // 炎（あかニャン）/ 金の光（こんじきニャン）
    ctx.globalCompositeOperation = 'lighter';
    if (gfx > 0) {
      if (gold) {
        for (let i = 0; i < 12; i++) {
          const a = T * 0.6 + i * TAU / 12, L = R * (2.2 + 0.4 * Math.sin(T * 3 + i));
          ctx.fillStyle = rgba(GOLD, 0.10 + 0.08 * k);
          ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(a - 0.08) * L, y + Math.sin(a - 0.08) * L); ctx.lineTo(x + Math.cos(a + 0.08) * L, y + Math.sin(a + 0.08) * L); ctx.closePath(); ctx.fill();
        }
      } else {
        if (!st.flameImg) {                                            // 炎の舌 1 枚（前もって描いておく）
          const fc = document.createElement('canvas'); fc.width = 48; fc.height = 128;
          const g = fc.getContext('2d'), gr = g.createLinearGradient(0, 128, 0, 0);
          gr.addColorStop(0, 'rgba(255,80,40,0.55)'); gr.addColorStop(1, 'rgba(255,40,20,0)');
          g.fillStyle = gr; g.beginPath(); g.moveTo(4, 128); g.quadraticCurveTo(24, 60, 24, 0); g.quadraticCurveTo(24, 64, 44, 128); g.closePath(); g.fill();
          st.flameImg = fc;
        }
        const m0 = ctx.getTransform();
        for (let i = 0; i < 9; i++) {
          const a = -Math.PI / 2 + (i - 4) * 0.36, f = 0.7 + 0.3 * Math.sin(T * 9 + i * 2.1) + 0.3 * k;
          const L = R * (0.9 + 0.6 * f) * (1 - Math.abs(i - 4) * 0.08);
          ctx.translate(x + Math.cos(a) * R * 0.8, y + Math.sin(a) * R * 0.8); ctx.rotate(a + Math.PI / 2);
          ctx.drawImage(st.flameImg, -R * 0.28 + Math.sin(T * 7 + i) * 2, -L, R * 0.56, L);
          ctx.setTransform(m0);
        }
      }
    }
    ctx.drawImage(glowSprite(gold ? GOLD : RED), x - R * 2.4, y - R * 2.4, R * 4.8, R * 4.8);
    ctx.globalCompositeOperation = 'source-over';
    // 耳（とがった円すい）＋ ヘッドホンのように耳をつなぐ電波
    const ear = sgn => {
      const a = -Math.PI / 2 + sgn * 0.62, bx = x + Math.cos(a) * R * 0.78, by = y + Math.sin(a) * R * 0.78;
      const tx = x + Math.cos(a) * R * 1.62, ty = y + Math.sin(a) * R * 1.62;
      ctx.fillStyle = gold ? '#e3a51c' : '#141018'; ctx.strokeStyle = gold ? '#7a4a06' : '#ff3048'; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.moveTo(bx + Math.cos(a + 1.57) * R * 0.34, by + Math.sin(a + 1.57) * R * 0.34); ctx.lineTo(tx, ty); ctx.lineTo(bx + Math.cos(a - 1.57) * R * 0.34, by + Math.sin(a - 1.57) * R * 0.34); ctx.closePath(); ctx.fill(); ctx.stroke();
      return [tx, ty];
    };
    const [lx, ly] = ear(-1), [rx, ry] = ear(1);
    ctx.strokeStyle = gold ? rgba(GOLD, 0.7) : rgba(PINK, 0.65); ctx.lineWidth = 2; ctx.setLineDash([4, 5]); ctx.lineDashOffset = -T * 30;
    ctx.beginPath(); ctx.moveTo(lx, ly); ctx.quadraticCurveTo(x, y - R * 2.3, rx, ry); ctx.stroke(); ctx.setLineDash([]);
    // 頭（丸い体）
    const gr = ctx.createRadialGradient(x - R * 0.35, y - R * 0.4, R * 0.1, x, y, R);
    if (gold) { gr.addColorStop(0, '#fff8d0'); gr.addColorStop(0.45, '#f2c232'); gr.addColorStop(1, '#8a5a08'); }
    else { gr.addColorStop(0, '#4a4452'); gr.addColorStop(0.5, '#1c1820'); gr.addColorStop(1, '#060508'); }
    ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(x, y, R, 0, TAU); ctx.fill();
    ctx.strokeStyle = gold ? '#fff0a0' : '#ff3048'; ctx.lineWidth = 2.5; ctx.stroke();
    // 王冠（こんじきニャン）
    if (gold) {
      const cy = y - R * 0.98, cw = R * 0.9;
      ctx.fillStyle = '#ffd23a'; ctx.strokeStyle = '#7a4a06'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(x - cw / 2, cy); ctx.lineTo(x - cw / 2, cy - R * 0.32); ctx.lineTo(x - cw / 4, cy - R * 0.12); ctx.lineTo(x, cy - R * 0.42); ctx.lineTo(x + cw / 4, cy - R * 0.12); ctx.lineTo(x + cw / 2, cy - R * 0.32); ctx.lineTo(x + cw / 2, cy); ctx.closePath(); ctx.fill(); ctx.stroke();
      for (const [dx, col] of [[-0.25, '#ff4d6d'], [0, '#4da6ff'], [0.25, '#5cff8a']]) { ctx.fillStyle = col; ctx.beginPath(); ctx.arc(x + dx * cw, cy - R * 0.08, R * 0.06, 0, TAU); ctx.fill(); }
    }
    // 目（つり目。光る）＋ 口
    const blink = (Math.floor(T * 0.7) % 5 === 0 && (T * 0.7) % 1 < 0.08) ? 0.15 : 1;
    for (const sgn of [-1, 1]) {
      const ex = x + sgn * R * 0.36, ey = y - R * 0.08;
      ctx.save(); ctx.translate(ex, ey); ctx.rotate(sgn * 0.32); ctx.scale(1, blink);
      ctx.fillStyle = gold ? '#fffbe8' : '#ff2a3a';
      ctx.beginPath(); ctx.ellipse(0, 0, R * 0.2, R * 0.12, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = gold ? '#7a4a06' : '#1a0004';
      ctx.beginPath(); ctx.ellipse(sgn * R * 0.03, 0, R * 0.05, R * 0.1, 0, 0, TAU); ctx.fill();
      ctx.restore();
    }
    if (!gold && gfx > 0) { ctx.globalCompositeOperation = 'lighter'; for (const sgn of [-1, 1]) ctx.drawImage(glowSprite(RED), x + sgn * R * 0.36 - 16, y - R * 0.08 - 16, 32, 32); ctx.globalCompositeOperation = 'source-over'; }
    const open = clamp01(st.fired + mood);
    ctx.strokeStyle = gold ? '#5a3404' : '#ff5a6a'; ctx.lineWidth = 2.2; ctx.fillStyle = gold ? '#5a3404' : '#3a0008';
    if (open > 0.15) { ctx.beginPath(); ctx.ellipse(x, y + R * 0.38, R * 0.14, R * 0.1 + R * 0.12 * open, 0, 0, TAU); ctx.fill(); ctx.stroke(); }
    else { ctx.beginPath(); ctx.arc(x - R * 0.1, y + R * 0.3, R * 0.1, 0.2, Math.PI - 0.2); ctx.arc(x + R * 0.1, y + R * 0.3, R * 0.1, 0.2, Math.PI - 0.2); ctx.stroke(); }
  }

  // ---- 更新 ---------------------------------------------------------------------------------------
  function update(dt, T, look) {
    if (!st.made) make();
    st.fired = Math.max(0, st.fired - dt * 5);
    st.handL = Math.max(0, st.handL - dt * 4); st.handR = Math.max(0, st.handR - dt * 4);
    st.bellT = Math.max(0, st.bellT - dt * 3);
    for (let i = 0; i < 6; i++) st.laneLit[i] = Math.max(0, st.laneLit[i] - dt * 4);
    for (const j of st.judges) j.t += dt;
    st.judges = st.judges.filter(j => j.t < 0.5);
    for (const p of st.pops) p.t += dt;
    st.pops = st.pops.filter(p => p.t < 0.6);
    if (!inSong()) return;
    // 炎の粉（画面の下から立ちのぼる。弾とまちがえないよう、細い線）
    if (gfx > 0 && st.flame.length < 40 && Math.random() < dt * 30) st.flame.push({ x: Math.random() * W, y: H + 10, v: 60 + Math.random() * 90, life: 2 + Math.random() * 2, ph: Math.random() * TAU });
    for (const f of st.flame) { f.y -= f.v * dt; f.life -= dt; }
    st.flame = st.flame.filter(f => f.life > 0);
  }

  const isShin = () => !!(song && song.shin);                     // 怨撃・真: はじめから こんじきニャン
  const goldAt = T => isShin() || (inSong() && st.awaken >= 0 && T >= st.awaken);
  function catPos(T, k) {
    let y = OG_CAT.y;
    if (inSong() && st.appear >= 0 && T - st.appear < 2.2) y = OG_CAT.y - 220 * Math.pow(1 - easeOut((T - st.appear) / 2.2), 1);
    return { x: OG_CAT.x + Math.sin(T * 1.3) * 4, y: y + Math.sin(T * 2.6) * 3 - 3 * k };
  }

  // ---- 背景 ---------------------------------------------------------------------------------------
  function background(T, look, k, bk, bp) {
    if (!st.made) make();
    const lo = inSong() ? songEnv(0, T) : 0.3 + 0.4 * k;
    const gold = goldAt(T);
    const bg = cachedLayer('ongekiBg', 3, 0, g => {
      const sk = g.createLinearGradient(0, 0, 0, H);
      sk.addColorStop(0, rgba(look.skyTop, 1)); sk.addColorStop(0.55, rgba(look.skyBot, 1)); sk.addColorStop(1, rgba(mixC(look.skyBot, [0, 0, 0], 0.5), 1));
      g.fillStyle = sk; g.fillRect(0, 0, W, H);
      const rg = g.createRadialGradient(W / 2, OG_CAT.y, 20, W / 2, OG_CAT.y, 520);
      rg.addColorStop(0, rgba(gold ? GOLD : RED, 0.22 + 0.25 * lo * lo)); rg.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = rg; g.fillRect(0, 0, W, H);
      g.globalAlpha = 0.07 + 0.12 * lo * lo;
      g.drawImage(st.kanji, W / 2 - 230, 30, 460, 460);
      g.globalAlpha = 1;
      g.drawImage(st.field, 0, 0, W, H);                            // レーン（動かないので、背景の絵にいっしょに入れておく）
    });
    ctx.drawImage(bg, 0, 0, W, H);
    // 炎の粉
    if (st.flame.length) {
      ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round'; ctx.lineWidth = 2;
      for (const f of st.flame) {
        const a = clamp01(f.life / 2) * 0.35, x = f.x + Math.sin(f.ph + f.y * 0.02) * 10;
        ctx.strokeStyle = gold ? rgba(GOLD, a) : `rgba(255,90,40,${a.toFixed(3)})`;
        ctx.beginPath(); ctx.moveTo(x, f.y); ctx.lineTo(x, f.y + 10); ctx.stroke();
      }
      ctx.globalCompositeOperation = 'source-over';
    }
    // レーン ＋ 手前へ流れる小節線（拍に合わせて進む）
    const f = bp - Math.floor(bp);
    ctx.lineWidth = 1.5;
    for (let j = 0; j < 4; j++) {
      const u = Math.pow((j + f) / 4, 1.8), y = depthY(u), isBar = (Math.floor(bp) - j) % 4 === 0;
      ctx.strokeStyle = isBar ? `rgba(255,255,255,${(0.08 + 0.3 * u).toFixed(3)})` : `rgba(255,255,255,${(0.03 + 0.1 * u).toFixed(3)})`;
      ctx.beginPath(); ctx.moveTo(laneX(u, 0), y); ctx.lineTo(laneX(u, 6), y); ctx.stroke();
    }
    // ノーツが着いたレーンが光る
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 6; i++) {
      const a = st.laneLit[i];
      if (a < 0.02) continue;
      ctx.fillStyle = rgba(BTN[i], 0.22 * a);
      ctx.beginPath(); ctx.moveTo(laneX(0, i), HY); ctx.lineTo(laneX(0, i + 1), HY); ctx.lineTo(laneX(1, i + 1), GROUND_Y); ctx.lineTo(laneX(1, i), GROUND_Y); ctx.closePath(); ctx.fill();
    }
    ctx.globalCompositeOperation = 'source-over';
    // 地平線の光
    ctx.fillStyle = rgba(mixC(look.color, WHITE, 0.4), 0.25 + 0.4 * k);
    ctx.fillRect(laneX(0, 0) - 30, HY - 1, (TOPW + 30) * 2, 2);
  }

  // 床 = 判定ラインの下。6 つのボタン（赤・緑・青 / 赤・緑・青）の色が光る
  function floor(look, k, bp) {
    const bw = W / 6;
    for (let i = 0; i < 6; i++) {
      const a = 0.08 + 0.4 * st.laneLit[i];
      const g = ctx.createLinearGradient(0, GROUND_Y, 0, H);
      g.addColorStop(0, rgba(BTN[i], a)); g.addColorStop(1, rgba(BTN[i], 0));
      ctx.fillStyle = g; ctx.fillRect(i * bw + 6, GROUND_Y + 4, bw - 12, H - GROUND_Y);
    }
    for (const j of st.judges) {                         // CRITICAL BREAK
      const a = 1 - j.t / 0.5;
      ctx.font = `800 ${j.text.length > 6 ? 11 : 13}px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillStyle = rgba(mixC(j.c, WHITE, 0.55), a);
      ctx.fillText(j.text, j.x, GROUND_Y + 20 - j.t * 14);
    }
  }
  function platform(p, look, k) {
    roundRect(p.x, p.y, p.w, p.h, 4);
    ctx.fillStyle = 'rgba(16,6,20,0.88)'; ctx.fill();
    ctx.strokeStyle = rgba(look.color, 0.6 + 0.3 * k); ctx.lineWidth = 1.5; ctx.stroke();
    ctx.fillStyle = rgba(WHITE, 0.5 + 0.3 * k); ctx.fillRect(p.x + 4, p.y + 1, p.w - 8, 2);
  }

  // ---- 弾 ----------------------------------------------------------------------------------------
  // 弾は、形と色ごとに 1 度だけ小さな絵に描いておき、毎コマはそれを貼るだけ（円を 3 つ描くより、ずっと軽い）
  const spriteCache = new Map();
  function bulletSprite(s, r, c) {
    const key = s + r + c.join(','), hit = spriteCache.get(key);
    if (hit) return hit;
    const R = Math.ceil(r + 3), cv2 = document.createElement('canvas'); cv2.width = cv2.height = R * 4;
    const g = cv2.getContext('2d'); g.scale(2, 2); g.translate(R, R);   // 2倍の大きさで描いて、なめらかに
    drawOgBullet(g, s, 0, 0, r, c);
    const out = { cv: cv2, R };
    spriteCache.set(key, out);
    return out;
  }
  function drawOgBullet(ctx, s, x, y, r, c) {
    ctx.fillStyle = 'rgba(20,0,16,0.85)';                          // 暗いふち（背景から浮かせる）
    ctx.beginPath(); ctx.arc(x, y, r + 2, 0, TAU); ctx.fill();
    ctx.fillStyle = rgba(c, 1);
    ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
    if (s === 'og-l') {                                            // 危険弾: 二重の輪 ＋ まん中が白い
      ctx.strokeStyle = 'rgba(255,240,200,0.95)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(x, y, r * 0.72, 0, TAU); ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.95)'; ctx.beginPath(); ctx.arc(x, y, r * 0.38, 0, TAU); ctx.fill();
    } else {
      ctx.fillStyle = 'rgba(255,255,255,0.95)';
      ctx.beginPath(); ctx.arc(x, y, r * (s === 'og-m' ? 0.5 : 0.55), 0, TAU); ctx.fill();
      if (s === 'og-m') { ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(x, y, r * 0.78, 0, TAU); ctx.stroke(); }
    }
  }
  function bullet(b, c, k) {
    const s = b.style;
    if (s === 'og-s' || s === 'og-m' || s === 'og-l') {
      const sp = bulletSprite(s, b.r, c);
      ctx.drawImage(sp.cv, b.x - sp.R, b.y - sp.R, sp.R * 2, sp.R * 2);
      return;
    }
    ctx.fillStyle = rgba(c, 1);
    ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.beginPath(); ctx.arc(b.x, b.y, b.r * 0.55, 0, TAU); ctx.fill();
  }

  // ベル（金色の鈴。ゆらゆら）
  function bellKind(b, T, k) {
    if (b.delay > 0) return;
    const r = b.r, sw = Math.sin(T * 8 + b.x * 0.05) * 0.25;
    if (gfx > 0) { ctx.globalCompositeOperation = 'lighter'; ctx.drawImage(glowSprite(GOLD), b.x - r * 2.4, b.y - r * 2.4, r * 4.8, r * 4.8); ctx.globalCompositeOperation = 'source-over'; }
    ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(sw);
    const g = ctx.createLinearGradient(-r, -r, r, r); g.addColorStop(0, '#fff6c0'); g.addColorStop(0.5, '#ffd23a'); g.addColorStop(1, '#b07a08');
    ctx.fillStyle = g; ctx.strokeStyle = '#5a3a02'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(-r * 0.95, r * 0.55); ctx.quadraticCurveTo(-r * 0.85, -r * 0.95, 0, -r); ctx.quadraticCurveTo(r * 0.85, -r * 0.95, r * 0.95, r * 0.55); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#ffe9a0'; ctx.fillRect(-r * 1.05, r * 0.45, r * 2.1, r * 0.25);
    ctx.fillStyle = '#7a5004'; ctx.beginPath(); ctx.arc(0, r * 0.82, r * 0.22, 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.8)'; ctx.beginPath(); ctx.ellipse(-r * 0.35, -r * 0.35, r * 0.15, r * 0.3, 0.5, 0, TAU); ctx.fill();
    ctx.restore();
  }

  // ノーツ（TAP / HOLD / WALL）: 着く所のレーンにうすい光の柱と、判定ラインの上の影
  function noteKind(b, T, k) {
    const c = rgb(b.color || '#ff4d6d'), w = b.w, x0 = b.x - w / 2;
    const p = clamp01((b.y + 12) / (GROUND_Y + 12));
    ctx.fillStyle = rgba(c, 0.05 + 0.08 * p);
    ctx.fillRect(x0, 0, w, GROUND_Y);
    ctx.strokeStyle = rgba(c, 0.25 + 0.6 * p); ctx.lineWidth = 2;
    ctx.strokeRect(x0 + (1 - p) * w * 0.3, GROUND_Y - 6, w - (1 - p) * w * 0.6, 6);
    if (b.delay > 0) return;
    const bot = Math.min(b.y, GROUND_Y), top = b.y - b.h;
    if (bot <= top) return;
    if (b.wall) {                                                    // WALL: ななめのしま
      ctx.fillStyle = rgba(c, 0.55); ctx.fillRect(x0, top, w, bot - top);
      ctx.save(); ctx.beginPath(); ctx.rect(x0, top, w, bot - top); ctx.clip();
      ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 5;
      for (let y = top - w; y < bot; y += 18) { ctx.beginPath(); ctx.moveTo(x0, y + w); ctx.lineTo(x0 + w, y); ctx.stroke(); }
      ctx.restore();
      ctx.strokeStyle = rgba(mixC(c, WHITE, 0.5), 1); ctx.lineWidth = 2; ctx.strokeRect(x0, top, w, bot - top);
      return;
    }
    if (b.hold > 0) {                                                // HOLD の胴体
      ctx.fillStyle = rgba(c, 0.35); ctx.fillRect(x0 + 10, top, w - 20, bot - top);
      ctx.strokeStyle = rgba(c, 0.9); ctx.lineWidth = 2; ctx.strokeRect(x0 + 10, top, w - 20, bot - top);
      ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.fillRect(b.x - 2, top, 4, bot - top);
    }
    const hy = b.y - 16;                                             // TAP の頭（板）
    if (hy < GROUND_Y) {
      roundRect(x0, hy, w, 16, 7);
      const g = ctx.createLinearGradient(0, hy, 0, hy + 16); g.addColorStop(0, rgba(mixC(c, WHITE, 0.5), 1)); g.addColorStop(1, rgba(c, 1));
      ctx.fillStyle = g; ctx.fill();
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2; ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.9)'; ctx.fillRect(x0 + 12, hy + 6, w - 24, 3);
    }
  }

  // ネコパンチ: 予告 = 通り道の帯 ＋「!」。飛ぶときは腕（ばね）がのびる
  function gloveKind(b, T, k) {
    const gold = goldAt(T), c = rgb(b.color || '#ff3b4f');
    const fromSide = b.x0 < 0 || b.x0 > W;
    const ang = Math.atan2(b.y1 - b.y0, b.x1 - b.x0);
    if (b.delay > 0) {
      const p = b.delayMax > 0 ? 1 - b.delay / b.delayMax : 1, on = p > 0.6 || Math.floor(T * 14) % 2 === 0;
      const L = Math.hypot(b.x1 - b.x0, b.y1 - b.y0);
      ctx.save(); ctx.translate(b.x0, b.y0); ctx.rotate(ang);
      ctx.fillStyle = rgba(c, on ? 0.10 + 0.22 * p : 0.06); ctx.fillRect(0, -b.r, L, b.r * 2);
      ctx.strokeStyle = rgba(c, on ? 0.5 + 0.4 * p : 0.2); ctx.lineWidth = 2; ctx.setLineDash([8, 6]); ctx.lineDashOffset = -T * 80;
      ctx.strokeRect(0, -b.r, L, b.r * 2); ctx.setLineDash([]);
      ctx.restore();
      ctx.strokeStyle = rgba(c, on ? 0.9 : 0.3); ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(b.x1, b.y1, b.r * (1.6 - 0.6 * p), 0, TAU); ctx.stroke();
      ctx.font = `900 ${Math.round(b.r * 1.2)}px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillStyle = rgba(WHITE, on ? 0.95 : 0.4); ctx.fillText('!', b.x1, b.y1);
      if (!fromSide) drawGlove(b.x0 + (Math.random() - 0.5) * 4 * p, b.y0, b.r * 0.9, b.x0 < W / 2 ? -1 : 1, gold, 1, p);
      else drawGlove(b.x0 < 0 ? 26 : W - 26, b.y0, b.r * 0.8, b.x0 < 0 ? 1 : -1, gold, 0.4 + 0.6 * p, p);
      return;
    }
    if (!fromSide) {                                                 // 腕（ジグザグのばね）
      const L = Math.hypot(b.x - b.x0, b.y - b.y0), n = Math.max(2, Math.floor(L / 22));
      ctx.strokeStyle = gold ? '#e3a51c' : '#2a2030'; ctx.lineWidth = 6;
      ctx.beginPath(); ctx.moveTo(b.x0, b.y0);
      for (let i = 1; i < n; i++) { const u = i / n, o = (i % 2 ? 1 : -1) * 10; ctx.lineTo(b.x0 + (b.x - b.x0) * u - Math.sin(ang) * o, b.y0 + (b.y - b.y0) * u + Math.cos(ang) * o); }
      ctx.lineTo(b.x, b.y); ctx.stroke();
    } else if (gfx > 0) {                                            // 横からのパンチ: 風のすじ
      ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 2;
      for (let i = -1; i <= 1; i++) { ctx.beginPath(); ctx.moveTo(b.x - Math.cos(ang) * (b.r + 10), b.y + i * b.r * 0.5); ctx.lineTo(b.x - Math.cos(ang) * (b.r + 70), b.y + i * b.r * 0.5); ctx.stroke(); }
    }
    drawGlove(b.x, b.y, b.r, Math.cos(ang) < -0.2 ? -1 : 1, gold, 1, 1);
  }

  // 隕石: 予告 = 床の照準と「!」、空からの点線。落ちてくるのは燃える岩
  function meteorKind(b, T, k) {
    if (b.delay > 0) {
      const p = b.delayMax > 0 ? 1 - b.delay / b.delayMax : 1, on = p > 0.6 || Math.floor(T * 14) % 2 === 0;
      ctx.strokeStyle = rgba(ORANGE, on ? 0.35 + 0.5 * p : 0.15); ctx.lineWidth = 2; ctx.setLineDash([6, 8]);
      ctx.beginPath(); ctx.moveTo(b.x0, 0); ctx.lineTo(b.tx, GROUND_Y - 4); ctx.stroke(); ctx.setLineDash([]);
      const R = b.r * (2.2 - 1.0 * p);
      ctx.strokeStyle = rgba(ORANGE, on ? 0.95 : 0.35); ctx.lineWidth = 3;
      ctx.beginPath(); ctx.ellipse(b.tx, GROUND_Y - 4, R, R * 0.3, 0, 0, TAU); ctx.stroke();
      ctx.fillStyle = rgba(ORANGE, on ? 0.95 : 0.4);
      ctx.beginPath(); ctx.moveTo(b.tx, GROUND_Y - 62); ctx.lineTo(b.tx - 15, GROUND_Y - 36); ctx.lineTo(b.tx + 15, GROUND_Y - 36); ctx.closePath(); ctx.fill();
      ctx.font = `900 18px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#2a0a00'; ctx.fillText('!', b.tx, GROUND_Y - 44);
      return;
    }
    const sp = Math.hypot(b.vx, b.vy) || 1, ux = b.vx / sp, uy = b.vy / sp;
    ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createLinearGradient(b.x, b.y, b.x - ux * 150, b.y - uy * 150);
    g.addColorStop(0, 'rgba(255,170,60,0.8)'); g.addColorStop(1, 'rgba(255,60,20,0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.moveTo(b.x - uy * b.r, b.y + ux * b.r); ctx.lineTo(b.x - ux * 150, b.y - uy * 150); ctx.lineTo(b.x + uy * b.r, b.y - ux * b.r); ctx.closePath(); ctx.fill();
    ctx.drawImage(glowSprite(ORANGE), b.x - b.r * 2.6, b.y - b.r * 2.6, b.r * 5.2, b.r * 5.2);
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = '#3a1406'; ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#ffb347'; ctx.lineWidth = 3; ctx.stroke();
    ctx.fillStyle = '#ffd27f'; ctx.beginPath(); ctx.arc(b.x + ux * b.r * 0.3, b.y + uy * b.r * 0.3, b.r * 0.45, 0, TAU); ctx.fill();
  }

  // いもむし: 弾の節がつながる。頭には目と触角
  function wormKind(b, T, k) {
    const c = rgb(b.color || '#ff5fb4');
    if (b.delay > 0) return;
    const segs = b.segs;
    for (let i = segs.length - 1; i >= 0; i--) {
      const s = segs[i], r = i ? b.r * 0.85 : b.r;
      const pul = 1 + 0.08 * Math.sin(T * 12 - i * 0.9);
      ctx.fillStyle = 'rgba(20,0,16,0.85)'; ctx.beginPath(); ctx.arc(s.x, s.y, r * pul + 2, 0, TAU); ctx.fill();
      ctx.fillStyle = rgba(c, 1); ctx.beginPath(); ctx.arc(s.x, s.y, r * pul, 0, TAU); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.9)'; ctx.beginPath(); ctx.arc(s.x, s.y, r * 0.45, 0, TAU); ctx.fill();
    }
    const h = segs[0], n = segs[1] || { x: h.x - b.dir, y: h.y };
    const a = Math.atan2(h.y - n.y, h.x - n.x);
    ctx.strokeStyle = rgba(mixC(c, WHITE, 0.3), 1); ctx.lineWidth = 2;
    for (const sgn of [-1, 1]) {
      const bx = h.x + Math.cos(a + sgn * 0.6) * b.r * 0.8, by = h.y + Math.sin(a + sgn * 0.6) * b.r * 0.8;
      ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(bx + Math.cos(a + sgn * 0.9) * 10, by + Math.sin(a + sgn * 0.9) * 10 - 4); ctx.stroke();
      ctx.fillStyle = '#1a0010'; ctx.beginPath(); ctx.arc(h.x + Math.cos(a + sgn * 0.5) * b.r * 0.45, h.y + Math.sin(a + sgn * 0.5) * b.r * 0.45, 2.2, 0, TAU); ctx.fill();
    }
  }

  function fire(b) {
    if (b.style && b.style.startsWith('og-') && !b.rise) st.fired = Math.max(st.fired, 0.6);
    if (b.kind === 'glove') { shake(3); return true; }
    if (b.kind === 'ogmeteor' || b.kind === 'imomushi' || b.kind === 'bell' || b.kind === 'ognote') return true;
    return false;
  }

  // ---- カメラの中: ネコ ＋ 浮いている手袋 ------------------------------------------------------------
  function world(T, look, k) {
    if (!inSong()) return;
    if (st.defeat >= 0 && T >= st.defeat + 0.6) return;              // たおした
    const gold = goldAt(T), p = catPos(T, k);
    let s = 1;
    if (st.awaken >= 0 && T >= st.awaken && T < st.awaken + 0.8) s = 1 + 0.35 * Math.sin((T - st.awaken) / 0.8 * Math.PI);
    if (st.defeat >= 0 && T >= st.defeat) { s *= 1 + (T - st.defeat) * 0.8; ctx.globalAlpha = clamp01(1 - (T - st.defeat) / 0.6); }
    // 手袋（その側の手がパンチ中なら描かない）
    const busy = [false, false];
    for (const b of bullets) if (b.kind === 'glove' && b.x0 > 0 && b.x0 < W) busy[b.x0 < W / 2 ? 0 : 1] = true;
    for (const [i, sgn, pump] of [[0, -1, st.handL], [1, 1, st.handR]]) {
      if (busy[i]) continue;
      const hx = p.x + sgn * (96 + 8 * pump) + Math.sin(T * 2 + i) * 4, hy = p.y + 14 + Math.cos(T * 2.4 + i) * 5 + 6 * pump;
      drawGlove(hx, hy, 20 * s, sgn, gold, 1, pump);
    }
    drawCat(p.x, p.y, s, gold, T, k);
    if (st.defeat >= 0 && T >= st.defeat) { ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = `rgba(255,255,255,${clamp01(1 - (T - st.defeat) / 0.4).toFixed(3)})`; ctx.beginPath(); ctx.arc(p.x, p.y, 60 * s, 0, TAU); ctx.fill(); ctx.globalCompositeOperation = 'source-over'; }
    ctx.globalAlpha = 1;
    // ふき出し: 「ボコボコにしてやるニャン！」
    if (st.nyan >= 0 && T >= st.nyan && T < st.nyan + 1.6) {
      const e = T - st.nyan, a = clamp01(e / 0.15) * clamp01((1.6 - e) / 0.3), bx = p.x - 120, by = p.y + 92;
      ctx.save(); ctx.globalAlpha = a;
      ctx.translate(bx, by); ctx.scale(0.85 + 0.15 * easeOut(e / 0.2), 0.85 + 0.15 * easeOut(e / 0.2));
      roundRect(-120, -26, 240, 44, 14); ctx.fillStyle = '#ffffff'; ctx.fill(); ctx.strokeStyle = '#1a0a10'; ctx.lineWidth = 3; ctx.stroke();
      ctx.beginPath(); ctx.moveTo(70, -24); ctx.lineTo(118, -52); ctx.lineTo(96, -24); ctx.closePath(); ctx.fillStyle = '#ffffff'; ctx.fill();
      ctx.font = `900 19px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#d0102a';
      ctx.fillText('ボコボコにしてやるニャン！', 0, -3 + Math.sin(e * 30) * 1.5);
      ctx.restore();
    }
    // とった物・殴った所の文字
    for (const q of st.pops) {
      const a = 1 - q.t / 0.6;
      ctx.font = q.big ? `900 22px ${FONT}` : `800 11px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillStyle = q.big ? `rgba(255,240,240,${a.toFixed(3)})` : rgba(GOLD, a);
      ctx.fillText(q.text, q.x, q.y - q.t * 30);
    }
  }

  function flash() {
    ctx.fillStyle = goldAt(songTime) ? `rgba(255,236,170,${(0.4 * flashT).toFixed(3)})` : `rgba(255,190,210,${(0.38 * flashT).toFixed(3)})`;
    ctx.fillRect(0, 0, W, H);
  }

  // ---- 画面の上: 相手の体力・ベル・場面の名前・WARNING・変身・YOU ARE A SUPER SHOOTER!! ----------------
  function hpAt(T) {
    const t3 = BAR(3), t101 = BAR(101), t125 = BAR(125);
    if (T < t3) return 1;
    if (isShin()) return 1 - clamp01((T - t3) / (t125 - t3));
    if (st.awaken < 0 || T < st.awaken) return 1 - 0.88 * clamp01((T - t3) / (t101 - t3));
    return 1 - clamp01((T - st.awaken - 0.8) / (t125 - st.awaken - 0.8)) * (T - st.awaken < 0.8 ? 0 : 1);
  }
  function banner() {
    const T = songTime, gold = goldAt(T);
    if (scene === 'play' && typeof dragMode === 'function' && dragMode()) {
      // オンゲキのレバー: 画面の下に、いまの左右の位置を示すつまみ（ドラッグで動かす）
      const px = player.x + player.w / 2, y = H - 18;
      ctx.fillStyle = 'rgba(10,2,10,0.7)'; roundRect(30, y - 6, W - 60, 12, 6); ctx.fill();
      ctx.strokeStyle = rgba(GOLD, 0.5); ctx.lineWidth = 1.5; ctx.stroke();
      const g = ctx.createLinearGradient(0, y - 14, 0, y + 14); g.addColorStop(0, '#fff3c0'); g.addColorStop(1, '#c08a10');
      ctx.fillStyle = g; roundRect(px - 22, y - 13, 44, 26, 9); ctx.fill();
      ctx.strokeStyle = '#5a3a02'; ctx.lineWidth = 2; ctx.stroke();
      ctx.fillStyle = 'rgba(90,58,2,0.8)'; for (const dx of [-8, 0, 8]) ctx.fillRect(px + dx - 1, y - 7, 2, 14);
      if (T < 4.5) {                                                   // はじめだけ: 操作の説明
        const a = clamp01((4.5 - T) / 0.6) * (0.75 + 0.25 * Math.sin(T * 6));
        ctx.font = `800 20px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillStyle = `rgba(255,243,192,${a.toFixed(3)})`;
        ctx.fillText('⟵  画面をドラッグして移動  ⟶', W / 2, 470);
        ctx.font = `700 14px ${FONT}`; ctx.fillText('動かしたぶんだけ、一瞬で動く ─ ジャンプはいつものボタン', W / 2, 498);
      }
    }
    if (scene === 'play' || scene === 'over' || scene === 'clear') {
      // 相手の名前と体力
      const hp = st.defeat >= 0 && T >= st.defeat ? 0 : (st.awaken >= 0 && T >= st.awaken && T < st.awaken + 0.8 ? clamp01((T - st.awaken) / 0.8) : hpAt(T));
      const x = 14, y = 14;
      ctx.fillStyle = 'rgba(10,2,10,0.72)'; roundRect(x, y, 270, 46, 8); ctx.fill();
      ctx.strokeStyle = gold ? rgba(GOLD, 0.8) : rgba(PINK, 0.7); ctx.lineWidth = 1.5; ctx.stroke();
      ctx.font = `800 15px ${FONT}`; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
      ctx.fillStyle = gold ? '#ffe9a0' : '#ffd0e4'; ctx.fillText(gold ? 'こんじきニャン' : 'あかニャン', x + 12, y + 15);
      ctx.font = `700 12px ${FONT}`; ctx.fillStyle = 'rgba(255,255,255,0.75)';
      ctx.fillText(gold ? 'Lv.1 ─ 怨撃・真' : 'Lv.60 ─ 火', x + (gold ? 132 : 108), y + 15);
      ctx.fillStyle = 'rgba(255,255,255,0.12)'; ctx.fillRect(x + 12, y + 29, 246, 8);
      const hg = ctx.createLinearGradient(x + 12, 0, x + 258, 0);
      if (gold) { hg.addColorStop(0, '#ffb02e'); hg.addColorStop(1, '#fff3a0'); } else { hg.addColorStop(0, '#ff2a4a'); hg.addColorStop(1, '#ff8ab8'); }
      ctx.fillStyle = hg; ctx.fillRect(x + 12, y + 29, 246 * hp, 8);
      // ベル
      const bx = W - 150, by = 14;
      ctx.fillStyle = 'rgba(10,2,10,0.72)'; roundRect(bx, by, 136, 34, 8); ctx.fill();
      ctx.strokeStyle = rgba(GOLD, 0.6 + 0.4 * st.bellT); ctx.lineWidth = 1.5; ctx.stroke();
      bellKind({ x: bx + 20, y: by + 17, r: 9 * (1 + 0.25 * st.bellT), delay: 0 }, 0, 0);
      ctx.font = `800 15px ${FONT}`; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#ffe9a0';
      ctx.fillText(`${ogStats.got} / ${ogStats.total}`, bx + 38, by + 18);
    }
    // WARNING（ブレイク）
    if (st.warn >= 0 && T >= st.warn && T < st.warn + 2.2) {
      const e = T - st.warn, a = clamp01(e / 0.1) * clamp01((2.2 - e) / 0.3), on = Math.floor(e * 6) % 2 === 0;
      ctx.save(); ctx.globalAlpha = a;
      for (const y of [262, 332]) {
        ctx.fillStyle = 'rgba(40,0,0,0.75)'; ctx.fillRect(0, y, W, 22);
        ctx.save(); ctx.beginPath(); ctx.rect(0, y, W, 22); ctx.clip();
        ctx.fillStyle = '#ffd23a';
        for (let x = -40 + ((e * 160) % 40) * (y > 300 ? -1 : 1); x < W + 40; x += 40) { ctx.beginPath(); ctx.moveTo(x, y + 22); ctx.lineTo(x + 20, y); ctx.lineTo(x + 34, y); ctx.lineTo(x + 14, y + 22); ctx.closePath(); ctx.fill(); }
        ctx.restore();
      }
      ctx.font = `900 46px Impact, "Arial Black", ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillStyle = on ? '#ff2a3a' : '#ffffff'; ctx.fillText('WARNING', W / 2, 307);
      ctx.restore();
    }
    // 変身: 怨撃・真
    if (st.awaken >= 0 && T >= st.awaken && T < st.awaken + 2.6) {
      const e = T - st.awaken, a = clamp01(e / 0.15) * clamp01((2.6 - e) / 0.5);
      ctx.save(); ctx.globalAlpha = a; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      const sc = 1 + 0.6 * (1 - easeOut(e / 0.35));
      ctx.translate(W / 2, 300); ctx.scale(sc, sc);
      ctx.font = '900 92px "Hiragino Mincho ProN", "Yu Mincho", serif';
      ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillText('怨撃・真', 4, 5);
      const g = ctx.createLinearGradient(0, -46, 0, 46); g.addColorStop(0, '#fffbe0'); g.addColorStop(0.5, '#ffd23a'); g.addColorStop(1, '#b07a08');
      ctx.fillStyle = g; ctx.fillText('怨撃・真', 0, 0);
      ctx.font = `800 18px ${FONT}`; ctx.fillStyle = '#fff3c0'; ctx.fillText('こんじきニャン Lv.1 があらわれた', 0, 66);
      ctx.restore();
    }
    // 場面の名前
    const bn = fx.banner;
    if (bn && scene === 'play') {
      const e = bn.age, DUR = 2.4;
      if (e > DUR) fx.banner = null;
      else if (!(st.awaken >= 0 && Math.abs(T - st.awaken) < 2.6) && bn.name !== 'WARNING') {
        const a = (e < 0.2 ? e / 0.2 : e > DUR - 0.5 ? (DUR - e) / 0.5 : 1), sl = (1 - easeOut(e / 0.35)) * 120;
        ctx.save(); ctx.globalAlpha = clamp01(a);
        ctx.font = `900 ${bn.name.length > 10 ? 30 : 40}px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        const tw = ctx.measureText(bn.name).width + 70, y = 124;
        ctx.translate(sl, 0);
        ctx.fillStyle = 'rgba(14,2,12,0.78)';
        ctx.beginPath(); ctx.moveTo(W / 2 - tw / 2 - 16, y + 26); ctx.lineTo(W / 2 - tw / 2 + 4, y - 26); ctx.lineTo(W / 2 + tw / 2 + 16, y - 26); ctx.lineTo(W / 2 + tw / 2 - 4, y + 26); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = rgba(bn.c, 0.9); ctx.lineWidth = 2; ctx.stroke();
        ctx.fillStyle = '#ffffff'; ctx.fillText(bn.name, W / 2, y - 2);
        if (bn.sub) { ctx.font = `700 14px ${FONT}`; ctx.fillStyle = rgba(mixC(bn.c, WHITE, 0.6), 0.95); ctx.fillText(bn.sub, W / 2, y + 42); }
        ctx.restore();
      }
    }
    // たおした → WIN ＋ YOU ARE A SUPER SHOOTER!!（左右に流れる）
    if (st.defeat >= 0 && T >= st.defeat + 0.3 && scene !== 'title') {
      const e = T - st.defeat - 0.3, a = clamp01(e / 0.2);
      ctx.save(); ctx.globalAlpha = a; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      const sc = 1 + 0.5 * (1 - easeOut(e / 0.3));
      ctx.translate(W / 2, 230); ctx.scale(sc, sc);
      ctx.font = '900 84px Impact, "Arial Black", sans-serif';
      ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillText('WIN', 4, 5);
      const g = ctx.createLinearGradient(0, -40, 0, 40); g.addColorStop(0, '#ffffff'); g.addColorStop(0.5, '#ffd23a'); g.addColorStop(1, '#ff5fb4');
      ctx.fillStyle = g; ctx.fillText('WIN', 0, 0);
      ctx.restore();
    }
    if (st.shooter >= 0 && T >= st.shooter) {
      const e = T - st.shooter, text = 'YOU ARE A SUPER SHOOTER!!';
      ctx.save(); ctx.font = `900 34px Impact, "Arial Black", ${FONT}`; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
      const tw = ctx.measureText(text).width + 60;
      for (const [y, dir, col] of [[360, -1, '#ff5fb4'], [420, 1, '#ffd23a']]) {
        ctx.fillStyle = 'rgba(10,2,10,0.6)'; ctx.fillRect(0, y - 24, W, 48);
        const off = ((e * 260) % tw) * dir;
        ctx.fillStyle = col;
        for (let x = -tw * 2 + off; x < W + tw; x += tw) ctx.fillText(text, x, y);
      }
      ctx.restore();
    }
  }

  // タイトル: あかニャンが大きく、拍に合わせてはねる
  function title(look, k, bp) {
    if (!st.made) make();
    const T = titleClock();
    ctx.globalAlpha = 0.12 + 0.08 * k; ctx.drawImage(st.kanji, W / 2 - 200, 110, 400, 400); ctx.globalAlpha = 1;
    const y = 300 - 8 * k;
    for (const sgn of [-1, 1]) drawGlove(W / 2 + sgn * (150 + 10 * k), y + 30 + Math.sin(T * 2 + sgn) * 6, 32, sgn, isShin(), 1, k);
    drawCat(W / 2, y, 1.6, isShin(), T, k);
  }

  THEMES.ongeki = {
    noTrails: true, glow: 1.6, noGlow: true,
    clearColors: ['#ff5fb4', '#ffd23a', '#b36bff', '#ff8a1f', '#ffffff', '#5cff8a'],
    kinds: { bell: bellKind, ognote: noteKind, glove: gloveKind, ogmeteor: meteorKind, imomushi: wormKind },
    reset, update, background, floor, platform, bullet, fire, world, flash, banner, title,
  };
})();
