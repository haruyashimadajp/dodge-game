"use strict";

/* =========================================================================
   見た目のセット「cave」  —  曲⑰「Echoes」用
   反響する洞窟。天井からつらら石が下がり、岩の壁には結晶が埋まっている。床は鏡のような水面。
   音が鳴ると、その音が「どこではね返ったか」が光で見える:
     こだま     … 聞こえるこだまに合わせて、左右の壁が交互に光る（ピンポン・ディレイ）。壁から光の弧が内側へ
     音の波     … 画面を横切る音の波形の線。その後ろに、少しおくれた「こだまの線」が何本も、うすくなって続く
     しずく     … 水面に波紋の輪。落ちた所がぽっと明るくなる
     キック     … 水面がふるえ、結晶が少し光る
     反射       … 弾が壁ではね返ると、そこに小さな音の輪
   ここぞという所の演出:
     ECHOES        … まっ暗。しずくの光だけで、洞窟がうっすら見える
     RESONANCE     … 結晶が目をさまして光りはじめる
     SILENCE       … 明かりが落ち、ほこりが光りながら舞う。逆再生の残響で、光が中心へ吸いこまれる
     REVERBERATION … オーロラのような音の波、結晶がすべて光る、つらら石の先から光のしずく
     FADE          … 光が少しずつ遠ざかる
     バナー        … 文字がこだまする（左右に少しずつずれて、うすくなって3回くり返す）
   重くならないよう、洞窟の岩と結晶は前もって描いた絵を使い、光っている結晶は「光った絵」を重ねるだけにする。
   ========================================================================= */

(function () {
  const WHITE = [255, 255, 255], AQUA = [143, 233, 255], VIOLET = [185, 164, 255], PINK = [255, 154, 232], PEARL = [232, 240, 255];
  const st = {
    made: false, rock: null, crystals: null, crystalsLit: null, cr: [], wall: [0, 0], arcs: [], ripples: [], lights: [], motes: [], swirl: [],
    kick: 0, boom: 0, glow: 0, silence: 0, climax: 0, fade: 0, swell: null, hist: [], histT: 0, drips: [],
  };
  const inSong = () => scene !== 'title';
  const hs = (a, b = 0) => { const v = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return v - Math.floor(v); };

  // ---- 前もって描く絵: 岩（遠い層・近い層）、結晶（暗い / 光った）---------------------------------
  function make() {
    st.made = true;
    const mk = () => { const c = document.createElement('canvas'); c.width = W; c.height = H; return c; };
    const rock = mk(), g = rock.getContext('2d');
    // 遠い層: 青黒い岩のかべ（左右）と天井
    const layer = (shade, depth, seed) => {
      g.fillStyle = shade;
      g.beginPath(); g.moveTo(0, 0);
      for (let x = 0; x <= W; x += 20) {                                     // 天井とつらら石
        const n = hs(x * 0.37, seed);
        const len = n > 0.82 ? 60 + 120 * hs(x, seed + 1) * depth : 20 + 26 * n * depth;
        g.lineTo(x - 8, 30 + 14 * hs(x, seed + 2)); g.lineTo(x, 30 + len); g.lineTo(x + 8, 30 + 14 * hs(x + 3, seed + 2));
      }
      g.lineTo(W, 0); g.closePath(); g.fill();
      for (const side of [0, 1]) {                                            // 左右の壁
        g.beginPath(); g.moveTo(side ? W : 0, 0);
        for (let y = 0; y <= GROUND_Y + 10; y += 24) {
          const d = (40 + 60 * hs(y * 0.21, seed + side * 9)) * depth + 30 * Math.sin(y * 0.012 + seed);
          g.lineTo(side ? W - d : d, y);
        }
        g.lineTo(side ? W : 0, GROUND_Y + 10); g.closePath(); g.fill();
      }
    };
    layer('#060c18', 1.6, 3); layer('#03070f', 1.0, 7);
    // 岩のすじ（うすい明るい線）
    g.strokeStyle = 'rgba(120,170,220,0.07)'; g.lineWidth = 1;
    for (let i = 0; i < 40; i++) {
      const side = i % 2, y = 60 + hs(i, 4) * (GROUND_Y - 80), x = side ? W - 20 - hs(i, 5) * 70 : 20 + hs(i, 5) * 70;
      g.beginPath(); g.moveTo(x, y); g.lineTo(x + (side ? -1 : 1) * (10 + 30 * hs(i, 6)), y + 20 + 30 * hs(i, 7)); g.stroke();
    }
    st.rock = rock;
    // 結晶: 壁と天井に、細長い六角形の柱が束になって生えている
    st.cr = [];
    const spots = [[44, 200, 1.25], [76, 330, 1.45], [36, 470, 1.15], [70, 590, 1.5], [W - 44, 180, -1.25], [W - 72, 310, -1.45], [W - 38, 460, -1.15], [W - 66, 600, -1.5],
                   [170, 50, Math.PI], [330, 44, Math.PI], [500, 48, Math.PI], [650, 46, Math.PI]];
    spots.forEach(([x, y, a], i) => {
      const n = 3 + Math.floor(hs(i, 11) * 3);
      for (let j = 0; j < n; j++) st.cr.push({ x: x + (hs(i, j + 50) - 0.5) * 10, y: y + (hs(i, j + 60) - 0.5) * 10, a: a + (j - (n - 1) / 2) * 0.32 + (hs(i, j + 20) - 0.5) * 0.2,
        len: 34 + 46 * hs(i, j + 30) * (j === Math.floor(n / 2) ? 1.4 : 1), w: 9 + 6 * hs(i, j + 40), c: [AQUA, VIOLET, PINK][i % 3], side: x < W / 2 ? -1 : 1 });
    });
    const drawCrystals = (lit) => {
      const c = mk(), q = c.getContext('2d');
      for (const s of st.cr) {
        q.save(); q.translate(s.x, s.y); q.rotate(s.a);
        const col = lit ? mixC(s.c, WHITE, 0.25) : mixC(s.c, [0, 0, 0], 0.78);
        q.fillStyle = rgba(col, lit ? 0.95 : 1);
        q.beginPath(); q.moveTo(-s.w / 2, 0); q.lineTo(-s.w / 2, -s.len * 0.8); q.lineTo(0, -s.len); q.lineTo(s.w / 2, -s.len * 0.8); q.lineTo(s.w / 2, 0); q.closePath(); q.fill();
        q.fillStyle = rgba(lit ? WHITE : mixC(s.c, [0, 0, 0], 0.6), lit ? 0.7 : 0.6);
        q.beginPath(); q.moveTo(-s.w / 2 + 1.5, -2); q.lineTo(-s.w / 2 + 1.5, -s.len * 0.78); q.lineTo(-0.5, -s.len * 0.95); q.lineTo(-0.5, -2); q.closePath(); q.fill();
        q.restore();
      }
      return c;
    };
    st.crystals = drawCrystals(false); st.crystalsLit = drawCrystals(true);
    // 壁の光（左 = 水色 / 右 = 紫 / サビの右 = ピンク）と、水面の光の帯: 小さな絵にして、のばして貼る
    st.side = [[AQUA, 0], [VIOLET, 1], [PINK, 1]].map(([c, right]) => {
      const cv = document.createElement('canvas'); cv.width = 150; cv.height = 1; const q = cv.getContext('2d');
      const gr = q.createLinearGradient(right ? 150 : 0, 0, right ? 0 : 150, 0); gr.addColorStop(0, rgba(c, 1)); gr.addColorStop(1, rgba(c, 0));
      q.fillStyle = gr; q.fillRect(0, 0, 150, 1); return cv;
    });
    st.streak = [AQUA, VIOLET, PINK].map(c => {
      const cv = document.createElement('canvas'); cv.width = 1; cv.height = 50; const q = cv.getContext('2d');
      const gr = q.createLinearGradient(0, 0, 0, 50); gr.addColorStop(0, rgba(c, 1)); gr.addColorStop(1, rgba(c, 0));
      q.fillStyle = gr; q.fillRect(0, 0, 1, 50); return cv;
    });
    // つらら石の先（光のしずくが落ちる所）
    st.tips = [];
    for (let x = 30; x < W - 20; x += 20) { const n = hs(x * 0.37, 7); if (n > 0.82) st.tips.push({ x, y: 30 + 60 + 120 * hs(x, 8) }); }
  }

  function reset() {
    Object.assign(st, { wall: [0, 0], arcs: [], ripples: [], lights: [], motes: [], swirl: [], kick: 0, boom: 0, glow: 0, silence: 0, climax: 0, fade: 0, swell: null, hist: [], histT: 0, drips: [] });
  }

  // ---- 譜面から呼ばれる演出 ----------------------------------------------------------------------
  window.rvFx = function (type, a, b, c, d, e) {
    if (type === 'wall') {                                    // こだまが聞こえた: その側の壁が光り、光の弧が内側へ
      const side = a, lvl = b, i = side < 0 ? 0 : 1;
      st.wall[i] = Math.min(1, Math.max(st.wall[i], 0.35 + lvl));
      if (st.arcs.length < 40) st.arcs.push({ side, x: 0, a: Math.min(1, 0.3 + lvl), c: st.climax > 0.5 ? PINK : st.silence > 0.5 ? PEARL : AQUA });
    } else if (type === 'tap') {                              // 鈴が鳴った（こだま）
      const x = a, y = b, lvl = d, side = e;
      shockRing(x, y, { color: side < 0 ? '#8fe9ff' : side > 0 ? '#ff9ae8' : '#ffe9a8', size: 70 + 90 * lvl, life: 0.5, width: 2 + 2 * lvl });
      if (side) { const i = side < 0 ? 0 : 1; st.wall[i] = Math.min(1, Math.max(st.wall[i], 0.3 + lvl * 0.7)); }
      st.glow = Math.max(st.glow, 0.3 * lvl);
    } else if (type === 'bounce') {                           // 弾が壁ではね返った
      shockRing(a, b, { color: '#b9a4ff', size: 34, life: 0.3, width: 2 });
      if (a < 30) st.wall[0] = Math.max(st.wall[0], 0.4); else if (a > W - 30) st.wall[1] = Math.max(st.wall[1], 0.4);
    } else if (type === 'splash') {                           // しずくが水面に落ちた
      if (st.ripples.length < 40) st.ripples.push({ x: a, r: 4, a: 1 });
      if (st.lights.length < 20) st.lights.push({ x: a, y: GROUND_Y - 40, a: 1 });
      sparks(a, GROUND_Y - 2, { n: 8, color: '#bff4ff', speed: 170, life: 0.45, size: 2.2, gravity: 600, dir: -Math.PI / 2, spread: 1.6 });
    } else if (type === 'kick') {
      st.kick = Math.max(st.kick, a);
      if (st.ripples.length < 40 && a > 0.5) st.ripples.push({ x: W / 2, r: 30, a: 0.35 * a, wide: true });
    } else if (type === 'boom') {
      st.boom = Math.max(st.boom, a); st.glow = Math.max(st.glow, a);
      shockRing(W / 2, GROUND_Y - 200, { color: '#e8f0ff', size: 700, life: 1.0, width: 5 });
      for (let i = 0; i < 6; i++) st.ripples.push({ x: 80 + i * 130, r: 10, a: 0.6 });
    } else if (type === 'silence') {
      st.silenceOn = true;
    } else if (type === 'swell') {                            // 逆再生の残響: 光の粒がまわりから中心へ吸いこまれる
      st.swell = { t0: songTime, dur: a };
      for (let i = 0; i < [30, 60, 90][gfx]; i++) {
        const ang = Math.random() * TAU, R = 300 + Math.random() * 300;
        st.swirl.push({ ang, R, R0: R, sp: 0.6 + Math.random() * 0.8, c: Math.random() < 0.5 ? PEARL : VIOLET });
      }
    } else if (type === 'climax') {
      st.climaxOn = true; st.glow = 1; st.boom = 1;
      shockRing(W / 2, 330, { color: '#ff9ae8', size: 900, life: 1.2, width: 8 });
    } else if (type === 'fade') {
      st.fadeOn = true;
    }
  };

  function update(dt, T, look) {
    if (!st.made) make();
    const sec = inSong() ? sectionIndex(T) : 1;
    const name = inSong() ? (SECTIONS[sec] || {}).name : 'RIPPLE';
    const want = (n) => (name === n ? 1 : 0);
    st.silence += (want('SILENCE') - st.silence) * Math.min(1, dt * 2);
    st.climax += (want('REVERBERATION') - st.climax) * Math.min(1, dt * 2.5);
    st.fade += ((name === 'FADE' ? 1 : 0) - st.fade) * Math.min(1, dt * 0.5);
    const wake = name === 'ECHOES' ? 0.15 : name === 'RIPPLE' ? 0.35 : name === 'SILENCE' ? 0.2 : name === 'FADE' ? 0.35 * (1 - st.fade) + 0.1 : 0.6;
    st.wake = (st.wake == null ? wake : st.wake + (wake - st.wake) * Math.min(1, dt * 1.5));
    st.wall[0] = Math.max(0, st.wall[0] - dt * 2.2); st.wall[1] = Math.max(0, st.wall[1] - dt * 2.2);
    st.kick = Math.max(0, st.kick - dt * 5); st.boom = Math.max(0, st.boom - dt * 1.2); st.glow = Math.max(0, st.glow - dt * 1.5);
    for (const q of st.arcs) { q.x += dt * 520; q.a -= dt * 0.9; }
    st.arcs = st.arcs.filter(q => q.a > 0 && q.x < W * 0.7);
    for (const r of st.ripples) { r.r += dt * (r.wide ? 260 : 120); r.a -= dt * (r.wide ? 1.0 : 0.7); }
    st.ripples = st.ripples.filter(r => r.a > 0);
    for (const l of st.lights) l.a -= dt * 1.4;
    st.lights = st.lights.filter(l => l.a > 0);
    // 舞うほこり（静寂で多く、サビでは光の粒）
    const moteMax = [15, 30, 50][gfx] * (0.3 + st.silence + 0.6 * st.climax);
    if (st.motes.length < moteMax && Math.random() < dt * 12) st.motes.push({ x: Math.random() * W, y: GROUND_Y - Math.random() * 40, vy: -10 - Math.random() * 25, vx: (Math.random() - 0.5) * 12, a: 0, life: 4 + Math.random() * 4, age: 0, c: st.climax > 0.5 ? PINK : PEARL });
    for (const m of st.motes) { m.age += dt; m.x += m.vx * dt + Math.sin(m.age * 1.3 + m.y * 0.01) * 6 * dt; m.y += m.vy * dt; m.a = Math.min(1, m.age / 0.8) * clamp01((m.life - m.age) / 1.2); }
    st.motes = st.motes.filter(m => m.age < m.life);
    // 逆再生の残響の粒
    if (st.swell) {
      const u = (songTime - st.swell.t0) / st.swell.dur;
      for (const s of st.swirl) { s.R = s.R0 * Math.max(0, 1 - Math.pow(clamp01(u), 1.6) * s.sp * 1.0); s.ang += dt * 1.5; }
      if (u > 1.05) { st.swell = null; st.swirl = []; }
    }
    // サビ: つらら石の先から光のしずく（見せるだけ）
    if (st.climax > 0.5 && st.drips.length < 14 && Math.random() < dt * 3) { const t = st.tips[Math.floor(Math.random() * st.tips.length)]; if (t) st.drips.push({ x: t.x, y: t.y, vy: 0 }); }
    for (const p of st.drips) { p.vy += 700 * dt; p.y += p.vy * dt; }
    st.drips = st.drips.filter(p => { if (p.y >= GROUND_Y) { if (st.ripples.length < 40) st.ripples.push({ x: p.x, r: 3, a: 0.5 }); return false; } return true; });
    // 音の波形の履歴（こだまの線を、少しおくれて描くため）
    st.histT += dt;
    if (st.histT > 0.05) {
      st.histT = 0;
      const lv = inSong() ? [songEnv(1, T), songEnv(3, T), songEnv(5, T), songEnv(6, T)] : [0.3, 0.3, 0.2, 0.2];
      st.hist.unshift(lv); if (st.hist.length > 40) st.hist.pop();
    }
  }

  // ---- 背景 --------------------------------------------------------------------------------------
  function background(T, look, k, bk, bp) {
    if (!st.made) make();
    const dark = 1 - 0.55 * st.silence;
    const lgA = (0.10 + 0.12 * st.wake + 0.12 * st.kick + 0.2 * st.boom) * dark;
    const lit = clamp01((st.wake * 0.6 + 0.35 * k * st.wake + st.glow * 0.6 + 0.5 * st.climax) * dark);
    // 空・奥の光・岩・結晶は1枚の絵にまとめて、2コマに1回だけ描き直す（重くならないように）
    const cave = cachedLayer('caveBg', 4, 0, g => {
      const sky = g.createLinearGradient(0, 0, 0, H);
      sky.addColorStop(0, rgba(mixC(look.skyTop, [0, 0, 0], 0.2), 1)); sky.addColorStop(1, rgba(look.skyBot, 1));
      g.fillStyle = sky; g.fillRect(0, 0, W, H);
      g.globalCompositeOperation = 'lighter';
      const lg = g.createRadialGradient(W / 2, 380, 30, W / 2, 380, 520);
      lg.addColorStop(0, rgba(look.color, lgA)); lg.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = lg; g.fillRect(0, 0, W, H);
      g.globalCompositeOperation = 'source-over';
      g.drawImage(st.rock, 0, 0, W, H);
      g.drawImage(st.crystals, 0, 0, W, H);
      if (lit > 0.02) {
        g.globalAlpha = lit; g.drawImage(st.crystalsLit, 0, 0, W, H); g.globalAlpha = 1;
        if (gfx > 0) {
          g.globalCompositeOperation = 'lighter';
          for (let i = 0; i < st.cr.length; i += 3) {
            const s = st.cr[i], G = 26 + 16 * lit;
            g.globalAlpha = lit * 0.5;
            g.drawImage(glowSprite(s.c), s.x - G, s.y - G - 10, G * 2, G * 2);
          }
          g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
        }
      }
    });
    ctx.drawImage(cave, 0, 0, W, H);
    // 音の波形の線と、そのこだま（おくれて、うすく）。これも2コマに1回だけ描き直す
    const wv = cachedLayer('caveWaves', 2, 1, g => waves(g, T, look, dark));
    const y0 = 110, y1 = 540, sc = wv.width / W;                         // 波がある帯だけを貼る
    ctx.globalCompositeOperation = 'lighter'; ctx.drawImage(wv, 0, y0 * sc, wv.width, (y1 - y0) * sc, 0, y0, W, y1 - y0); ctx.globalCompositeOperation = 'source-over';
    // 左右の壁の光（こだま）と、壁から内側へ進む光の弧
    ctx.globalCompositeOperation = 'lighter';
    for (const i of [0, 1]) {
      const v = st.wall[i]; if (v < 0.02) continue;
      ctx.globalAlpha = clamp01(0.45 * v);
      ctx.drawImage(st.side[i ? (st.climax > 0.5 ? 2 : 1) : 0], i ? W - 150 : 0, 0, 150, GROUND_Y);
    }
    ctx.globalAlpha = 1;
    ctx.lineWidth = 3;
    for (const q of st.arcs) {
      const x = q.side < 0 ? q.x : W - q.x, R = 420;
      ctx.strokeStyle = rgba(q.c, q.a * 0.5);
      ctx.beginPath();
      if (q.side < 0) ctx.arc(x - R, GROUND_Y / 2, R, -0.55, 0.55); else ctx.arc(x + R, GROUND_Y / 2, R, Math.PI - 0.55, Math.PI + 0.55);
      ctx.stroke();
    }
    // しずくが落ちた所の明かり
    for (const l of st.lights) {
      const G = 110;
      ctx.globalAlpha = l.a * 0.5; ctx.drawImage(glowSprite(AQUA), l.x - G, l.y - G, G * 2, G * 2);
    }
    ctx.globalAlpha = 1;
    // 逆再生の残響: 吸いこまれる光の粒
    for (const s of st.swirl) {
      const x = W / 2 + Math.cos(s.ang) * s.R, y = 330 + Math.sin(s.ang) * s.R * 0.8;
      ctx.fillStyle = rgba(s.c, 0.8); ctx.fillRect(x - 1.5, y - 1.5, 3, 3);
      ctx.strokeStyle = rgba(s.c, 0.25); ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(W / 2 + Math.cos(s.ang - 0.12) * s.R * 1.12, 330 + Math.sin(s.ang - 0.12) * s.R * 0.9); ctx.stroke();
    }
    // サビの光のしずく ／ ほこり
    for (const p of st.drips) { ctx.fillStyle = 'rgba(255,200,240,0.8)'; ctx.fillRect(p.x - 1, p.y - 4, 2, 8); }
    for (const m of st.motes) { ctx.fillStyle = rgba(m.c, m.a * 0.55); ctx.fillRect(m.x, m.y, 2, 2); }
    ctx.globalCompositeOperation = 'source-over';
    // 静寂: 暗く
    if (st.silence > 0.01) { ctx.fillStyle = `rgba(0,0,0,${(0.35 * st.silence).toFixed(3)})`; ctx.fillRect(0, 0, W, H); }
  }

  // 音の波形: 4本の帯の強さで波打つ線。後ろに「こだまの線」が、履歴のおくれた値で何本も続く
  function waves(ctx, T, look, dark) {
    if (!st.hist.length) return;
    const copies = [2, 4, 6][gfx], amp = 18 + 60 * st.climax + 20 * st.wake;
    ctx.globalCompositeOperation = 'lighter';
    ctx.lineWidth = 2;
    const cols = [AQUA, VIOLET, PINK];
    for (let line = 0; line < 3; line++) {
      const y0 = 230 + line * 90;
      for (let e = copies; e >= 0; e--) {
        const h = st.hist[Math.min(st.hist.length - 1, e * 3)] || st.hist[0];
        const lvl = h[line] || 0;
        const a = (0.22 + 0.4 * st.climax) * Math.pow(0.62, e) * dark * (0.4 + lvl);
        if (a < 0.01) continue;
        ctx.strokeStyle = rgba(cols[line], a);
        ctx.beginPath();
        const ph = T * (1.2 + line * 0.4) - e * 0.35, off = e * 10 * (e % 2 ? 1 : -1);
        for (let i = 0; i <= 36; i++) {
          const x = i * W / 36;
          const y = y0 + off + Math.sin(i * 0.5 + ph * 2 + line) * amp * lvl * Math.sin(i / 36 * Math.PI);
          if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y);
        }
        ctx.stroke();
      }
    }
    ctx.globalCompositeOperation = 'source-over';
  }

  // ---- 床: 鏡のような水面 -------------------------------------------------------------------------
  function floor(look, k, bp) {
    const T = inSong() ? songTime : titleClock();
    // 水面に映る光（結晶と場面の色。前もって描いた縦の光の帯を、のばして貼る）
    ctx.globalCompositeOperation = 'lighter';
    const refl = 0.12 + 0.2 * st.wake + 0.2 * st.kick + 0.3 * st.climax;
    ctx.globalAlpha = clamp01(refl * 0.35);
    for (let i = 0; i < 9; i++) {
      const x = 60 + i * 85 + Math.sin(T * 0.8 + i) * 6;
      ctx.drawImage(st.streak[i % 3], x - 3 - st.kick * 4, GROUND_Y, 6 + st.kick * 8, 50);
    }
    ctx.globalAlpha = 1;
    // ゆれる水面のすじ
    ctx.strokeStyle = rgba(look.color, 0.18 + 0.25 * st.kick); ctx.lineWidth = 1;
    for (let j = 0; j < 4; j++) {
      const y = GROUND_Y + 6 + j * 11;
      ctx.beginPath();
      for (let x = 0; x <= W; x += 20) { const yy = y + Math.sin(x * 0.04 + T * (2 + j) + j) * (1 + 2 * st.kick); if (x) ctx.lineTo(x, yy); else ctx.moveTo(x, yy); }
      ctx.stroke();
    }
    // 波紋の輪（だ円）
    for (const r of st.ripples) {
      ctx.strokeStyle = rgba(AQUA, r.a * 0.8); ctx.lineWidth = r.wide ? 1.5 : 2;
      ctx.beginPath(); ctx.ellipse(r.x, GROUND_Y + 8, r.r, r.r * 0.16, 0, 0, TAU); ctx.stroke();
      if (!r.wide && r.r > 16) { ctx.strokeStyle = rgba(AQUA, r.a * 0.4); ctx.beginPath(); ctx.ellipse(r.x, GROUND_Y + 8, r.r * 0.6, r.r * 0.1, 0, 0, TAU); ctx.stroke(); }
    }
    // 自分の影が水に映る
    if (inSong()) {
      ctx.globalCompositeOperation = 'source-over';
      const h = Math.max(0, GROUND_Y - (player.y + player.h));
      const a = 0.35 * clamp01(1 - h / 200);
      if (a > 0.01) {
        ctx.fillStyle = `rgba(80,140,255,${a.toFixed(3)})`;
        const y = GROUND_Y + h + 2;
        for (let i = 0; i < 5; i++) ctx.fillRect(player.x + Math.sin(T * 6 + i) * 2, y + i * 4, player.w, 3);
      }
    }
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = rgba(mixC(look.color, WHITE, 0.4), 0.35 + 0.3 * st.kick); ctx.fillRect(-400, GROUND_Y, W + 800, 1.5);
  }

  function platform(p, look, k) {
    if (p.ground) return;
    const g = ctx.createLinearGradient(0, p.y, 0, p.y + p.h);
    g.addColorStop(0, '#1a2436'); g.addColorStop(1, '#070b14');
    ctx.fillStyle = g; ctx.fillRect(p.x, p.y, p.w, p.h);
    ctx.fillStyle = rgba(look.color, 0.55 + 0.3 * k * st.wake); ctx.fillRect(p.x, p.y, p.w, 2);
    ctx.fillStyle = rgba(look.color, 0.25);
    for (let x = p.x + 8; x < p.x + p.w - 6; x += 22) { ctx.beginPath(); ctx.moveTo(x, p.y + p.h); ctx.lineTo(x + 3, p.y + p.h + 7 + (x % 5)); ctx.lineTo(x + 6, p.y + p.h); ctx.fill(); }
  }

  // ---- 弾 ------------------------------------------------------------------------------------------
  function orb(x, y, r, c, a) {
    ctx.fillStyle = `rgba(2,6,14,${(0.75 * a).toFixed(3)})`; ctx.beginPath(); ctx.arc(x, y, r + 2.5, 0, TAU); ctx.fill();
    ctx.fillStyle = rgba(c, a); ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
    ctx.fillStyle = `rgba(255,255,255,${(0.9 * a).toFixed(3)})`; ctx.beginPath(); ctx.arc(x, y, r * 0.5, 0, TAU); ctx.fill();
  }
  function bullet(b, c, k) {
    const a = b.lvl != null ? 0.55 + 0.45 * b.lvl : 1;
    if (b.style === 'rv-drop') {                                                       // しずく（上がとがった形）
      ctx.fillStyle = 'rgba(2,6,14,0.7)';
      ctx.beginPath(); ctx.arc(b.x, b.y, b.r + 2.5, 0, TAU); ctx.fill();
      ctx.fillStyle = rgba(c, 1);
      ctx.beginPath(); ctx.moveTo(b.x, b.y - b.r * 2.2); ctx.quadraticCurveTo(b.x + b.r * 1.05, b.y - b.r * 0.4, b.x + b.r, b.y);
      ctx.arc(b.x, b.y, b.r, 0, Math.PI); ctx.quadraticCurveTo(b.x - b.r * 1.05, b.y - b.r * 0.4, b.x, b.y - b.r * 2.2); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.85)'; ctx.beginPath(); ctx.arc(b.x - b.r * 0.3, b.y - b.r * 0.1, b.r * 0.32, 0, TAU); ctx.fill();
      return;
    }
    orb(b.x, b.y, b.r, c, a);
    ctx.strokeStyle = rgba(mixC(c, WHITE, 0.5), 0.5 * a); ctx.lineWidth = 1.2;           // 音の輪（ふちの外側にうすい線）
    ctx.beginPath(); ctx.arc(b.x, b.y, b.r + 4 + 2 * k, 0, TAU); ctx.stroke();
  }
  // こだま（同じ道をおくれて追いかける弾）: ふちの輪 ＋ うすい中身
  function echoKind(b, T, k) {
    if (b.delay > 0) return;
    const c = bulletColor(b), a = 0.35 + 0.6 * (b.lvl || 0.5);
    if (gfx > 0) { ctx.globalCompositeOperation = 'lighter'; const G = b.r * 2.4; ctx.globalAlpha = a * 0.6; ctx.drawImage(glowSprite(c), b.x - G, b.y - G, G * 2, G * 2); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; }
    ctx.fillStyle = `rgba(2,6,14,${(0.6 * a).toFixed(3)})`; ctx.beginPath(); ctx.arc(b.x, b.y, b.r + 2, 0, TAU); ctx.fill();
    ctx.fillStyle = rgba(c, a * 0.45); ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, TAU); ctx.fill();
    ctx.strokeStyle = rgba(mixC(c, WHITE, 0.4), a); ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = `rgba(255,255,255,${(0.7 * a).toFixed(3)})`; ctx.beginPath(); ctx.arc(b.x, b.y, b.r * 0.3, 0, TAU); ctx.fill();
  }
  // 床を走る水の波（左右に2つの山）
  function rippleKind(b, T, k) {
    if (b.delay > 0) return;
    const c = bulletColor(b), hh = b.h0 * Math.exp(-b.age / b.decay), HALF = b.half;
    for (const f of [b.x0 - b.d, b.x0 + b.d]) {
      if (f < -HALF || f > W + HALF) continue;
      const gr = ctx.createLinearGradient(0, GROUND_Y - hh, 0, GROUND_Y);
      gr.addColorStop(0, rgba(mixC(c, WHITE, 0.5), 0.95)); gr.addColorStop(1, rgba(c, 0.35));
      ctx.fillStyle = gr;
      ctx.beginPath(); ctx.moveTo(f - HALF, GROUND_Y);
      ctx.quadraticCurveTo(f - HALF * 0.45, GROUND_Y - hh * 0.2, f, GROUND_Y - hh);
      ctx.quadraticCurveTo(f + HALF * 0.45, GROUND_Y - hh * 0.2, f + HALF, GROUND_Y); ctx.closePath(); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.9)'; ctx.beginPath(); ctx.arc(f, GROUND_Y - hh + 2, 2.5, 0, TAU); ctx.fill();
      ctx.strokeStyle = rgba(c, 0.5); ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.ellipse(f, GROUND_Y + 8, HALF * 1.2, 4, 0, 0, TAU); ctx.stroke();
    }
  }
  // 音の鳴る結晶（本体は当たらない）
  function bellKind(b, T, k) {
    const c = bulletColor(b);
    const p = b.delay > 0 ? (b.delayMax > 0 ? 1 - b.delay / b.delayMax : 1) : 1;
    const s = b.size * (0.5 + 0.5 * easeOut(p)) * (1 + 0.35 * b.pulse);
    const fade = b.taps.length ? 1 : clamp01(1 - b.out / 0.6);
    ctx.save(); ctx.globalAlpha = (b.delay > 0 ? 0.35 + 0.5 * p : 1) * fade;
    if (gfx > 0) { ctx.globalCompositeOperation = 'lighter'; const G = s * (2.2 + 2 * b.pulse); ctx.drawImage(glowSprite(c), b.x - G, b.y - G, G * 2, G * 2); ctx.globalCompositeOperation = 'source-over'; }
    ctx.translate(b.x, b.y); ctx.rotate(Math.sin(T * 1.5 + b.x) * 0.15);
    ctx.fillStyle = rgba(mixC(c, WHITE, 0.2 + 0.5 * b.pulse), 0.95);
    ctx.beginPath(); ctx.moveTo(0, -s * 1.4); ctx.lineTo(s * 0.7, -s * 0.3); ctx.lineTo(s * 0.5, s); ctx.lineTo(-s * 0.5, s); ctx.lineTo(-s * 0.7, -s * 0.3); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.75)'; ctx.beginPath(); ctx.moveTo(0, -s * 1.3); ctx.lineTo(-s * 0.55, -s * 0.3); ctx.lineTo(-s * 0.15, s * 0.9); ctx.lineTo(0, -s * 0.2); ctx.closePath(); ctx.fill();
    ctx.restore();
    if (b.delay > 0) {                                                                  // 予告: 輪がしぼんでくる
      ctx.strokeStyle = rgba(c, 0.25 + 0.5 * p); ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(b.x, b.y, 20 + 70 * (1 - p), 0, TAU); ctx.stroke();
    }
  }

  function fire(b) {
    if (b.kind === 'rvEcho' || b.kind === 'rvRipple') return true;
    if (b.kind === 'rvBell') { shockRing(b.x, b.y, { color: '#ffe9a8', size: 50, life: 0.4, width: 2 }); return true; }
    if (b.style === 'rv-drop') return true;
  }

  function flash(look) {
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = rgba(mixC(look.color, WHITE, 0.5), 0.35 * flashT);
    ctx.fillRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'source-over';
  }

  // バナー: 文字がこだまする（左 → 右 → 左 … に少しずつずれて、うすくなりながら3回）
  function banner() {
    const bn = fx.banner;
    if (!bn) return;
    const e = bn.age, DUR = 3.2;
    if (e > DUR) { fx.banner = null; return; }
    const y = 128;
    ctx.save();
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = '300 40px "Segoe UI", system-ui, sans-serif';
    if ('letterSpacing' in ctx) ctx.letterSpacing = `${8 + e * 3}px`;
    for (let i = 3; i >= 0; i--) {
      const t = e - i * 0.27;                                                 // こだまは 0.27 秒ずつおくれて出る
      if (t < 0) continue;
      const a = (t < 0.3 ? t / 0.3 : 1) * clamp01((DUR - e) / 0.7) * Math.pow(0.5, i);
      const dx = i === 0 ? 0 : (i % 2 ? 1 : -1) * i * 10;                   // こだまは下へ、左右に少しずつずれて、小さく
      ctx.fillStyle = rgba(i ? bn.c : mixC(bn.c, WHITE, 0.6), a);
      if (i === 0 && gfx === 2) { ctx.shadowColor = rgba(bn.c, 0.9); ctx.shadowBlur = 16; }
      ctx.save(); ctx.translate(W / 2 + dx, y + i * 30); ctx.scale(Math.pow(0.82, i), Math.pow(0.82, i) * (i ? 0.8 : 1));
      ctx.fillText(bn.name, 0, 0); ctx.restore();
      ctx.shadowBlur = 0;
    }
    if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';
    if (bn.sub) {
      const a = clamp01((e - 0.5) / 0.4) * clamp01((DUR - e) / 0.7);
      ctx.font = '400 15px "Segoe UI", system-ui, sans-serif'; ctx.fillStyle = `rgba(220,240,255,${(0.85 * a).toFixed(3)})`;
      ctx.fillText(bn.sub, W / 2, y - 36);
    }
    const w = 180 * easeOut(e / 0.9);
    ctx.strokeStyle = rgba(bn.c, 0.6 * clamp01((DUR - e) / 0.7)); ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(W / 2 - w, y - 22); ctx.lineTo(W / 2 + w, y - 22); ctx.stroke();
    ctx.restore();
  }

  function title(look, k, bp) {                                     // タイトル画面: 鈴が拍ごとに鳴って、こだまの輪
    const T = titleClock(), cx = W / 2, cy = H * 0.36;
    for (let i = 0; i < 4; i++) {
      const u = ((bp + i * 0.75) % 3) / 3;
      ctx.strokeStyle = rgba(i % 2 ? PINK : AQUA, 0.5 * (1 - u) * Math.pow(0.7, i));
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(cx + (i % 2 ? 14 : -14) * i, cy, 30 + u * 260, 0, TAU); ctx.stroke();
    }
    bellKind({ x: cx, y: cy, size: 20, delay: 0, delayMax: 1, pulse: k * 0.6, taps: [1], out: 0, color: '#ffe9a8' }, T, k);
  }

  THEMES.cave = {
    noTrails: true, glow: 2.0, noScanlines: true,
    clearColors: ['#8fe9ff', '#b9a4ff', '#ff9ae8', '#ffe9a8', '#ffffff'],
    kinds: { rvEcho: echoKind, rvRipple: rippleKind, rvBell: bellKind },
    reset, update, background, floor, platform, bullet, fire, flash, banner, title,
  };
  // 曲が変わったら、この見た目のセットの絵を手放す（次に使うときに作り直す。メモリがふくらんで重くならないように）
  THEMES.cave.release = () => { freeArt(st); st.made = false; };
})();
