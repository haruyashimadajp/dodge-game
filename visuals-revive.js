"use strict";

/* =========================================================================
   見た目のセット「revive」  —  曲⑲「And Revive The Melody」用
   止まってしまったメロディを、もう一度鳴らす世界。
     奥          … 大きなオルゴールの円盤（ピンが渦巻きにならぶ）。曲が進むと回り出し、ピンが光る。
                   109 小節で止まって真っ暗になり、111 小節のひとつの音から、もう一度回り出す
     盛り上がり  … 円盤のうしろに、光の羽（不死鳥の翼）が開く。下から火の粉がのぼる
     床の広さ    … 左右の壁は、燃えた楽譜のカーテン。これから先の形が上から下りてくる（ふちが燃えている）
     長い音      … 空から下りてくる絹のリボン（ばら色・金色・空色）。床や足場にふれた所が熱く光る
     短い音      … 小さな音符が床に落ちて、光の輪になる（当たらない）
     弾          … 黒い音符（色のふち）。流れの弾 = すみれ色の玉、最後のラッシュ = 炎・すみれ・羽根
     金色の音    … 金色の八分音符（メロディのかけら）。取ると、左上の五線に音符がたまる
     グリッサンド … 床をすべる光の波
     バナー      … 五線の上に、細い明朝体の文字
   ========================================================================= */

(function () {
  const WHITE = [255, 255, 255], GOLD = [255, 211, 107], ROSE = [255, 122, 160], AZURE = [143, 216, 255], EMBER = [255, 154, 60], VIOLET = [155, 107, 255];
  const RIB = [ROSE, GOLD, AZURE];
  const hs = (a, b = 0) => { const v = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return v - Math.floor(v); };
  const inSong = () => scene !== 'title';
  const SERIF = '"Hiragino Mincho ProN", "Yu Mincho", "Noto Serif JP", Georgia, "Times New Roman", serif';
  const st = {
    made: false, disc: null, wing: null, paper: null, paperPat: null, page: null,
    mood: 0, dark: 0, darkTo: 0, spin: 0, glow: 0, swell: 0, wings: 0, last: 0, hush: 0, revived: 0,
    embers: [], pages: [], pops: [], plinks: [], notes: 0, flashC: GOLD, tapI: 0,
  };

  // ---- 前もって描く絵 ---------------------------------------------------------------------------------
  function make() {
    st.made = true;
    const mk = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
    // オルゴールの円盤: 金属の円 ＋ 渦巻きにならぶ穴（ピン）＋ まんなかの軸
    const R = 250, disc = mk(R * 2 + 8, R * 2 + 8), g = disc.getContext('2d'), c = R + 4;
    const rg = g.createRadialGradient(c, c, 20, c, c, R);
    rg.addColorStop(0, '#3a3046'); rg.addColorStop(0.7, '#241c30'); rg.addColorStop(1, '#151020');
    g.fillStyle = rg; g.beginPath(); g.arc(c, c, R, 0, TAU); g.fill();
    g.strokeStyle = 'rgba(255,230,180,0.35)'; g.lineWidth = 2; g.beginPath(); g.arc(c, c, R - 3, 0, TAU); g.stroke();
    for (const rr of [R * 0.32, R * 0.55, R * 0.78]) { g.strokeStyle = 'rgba(255,230,180,0.08)'; g.lineWidth = 1; g.beginPath(); g.arc(c, c, rr, 0, TAU); g.stroke(); }
    st.pins = [];
    for (let i = 0; i < 150; i++) {                                        // ピン（メロディの音）: 18 本の輪のどこかに
      const ring = Math.floor(hs(i, 1) * 18), rr = R * (0.24 + ring * 0.04), a = hs(i, 2) * TAU;
      st.pins.push({ a, rr, ring });
      g.fillStyle = 'rgba(10,6,14,0.9)'; g.beginPath(); g.arc(c + Math.cos(a) * rr, c + Math.sin(a) * rr, 2.6, 0, TAU); g.fill();
    }
    g.fillStyle = '#4a3c58'; g.beginPath(); g.arc(c, c, 26, 0, TAU); g.fill();
    g.fillStyle = '#120c1a'; g.beginPath(); g.arc(c, c, 9, 0, TAU); g.fill();
    st.disc = disc;
    // 光の羽（右の翼。左は反転して描く）: 長い羽根を扇形に
    const wing = mk(420, 300), w = wing.getContext('2d');
    for (let i = 0; i < 13; i++) {
      const a = -1.05 + i * 0.13, L = 330 - Math.abs(i - 4) * 18, x0 = 10, y0 = 220;
      const ex = x0 + Math.cos(a) * L, ey = y0 + Math.sin(a) * L * 0.85;
      const gr = w.createLinearGradient(x0, y0, ex, ey);
      gr.addColorStop(0, 'rgba(255,220,150,0.0)'); gr.addColorStop(0.35, 'rgba(255,190,110,0.55)'); gr.addColorStop(1, 'rgba(255,120,80,0.0)');
      w.fillStyle = gr;
      const nx = -Math.sin(a), ny = Math.cos(a), bw = 13 + (i % 3) * 3;
      w.beginPath(); w.moveTo(x0, y0);
      w.quadraticCurveTo((x0 + ex) / 2 + nx * bw, (y0 + ey) / 2 + ny * bw, ex, ey);
      w.quadraticCurveTo((x0 + ex) / 2 - nx * bw * 0.4, (y0 + ey) / 2 - ny * bw * 0.4, x0, y0);
      w.fill();
    }
    st.wing = wing;
    // 燃えた楽譜（カーテンの模様。縦にくり返す）
    const P = mk(256, 256), p = P.getContext('2d');
    p.fillStyle = '#1a1210'; p.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 900; i++) { p.fillStyle = `rgba(${hs(i, 4) < 0.5 ? '60,40,30' : '8,4,4'},${(0.25 * hs(i, 5)).toFixed(3)})`; p.fillRect(hs(i, 6) * 256, hs(i, 7) * 256, 2 + hs(i, 8) * 6, 1 + hs(i, 9) * 3); }
    p.strokeStyle = 'rgba(200,170,130,0.16)'; p.lineWidth = 1;
    for (const y0 of [40, 168]) {
      for (let l = 0; l < 5; l++) { p.beginPath(); p.moveTo(0, y0 + l * 9); p.lineTo(256, y0 + l * 9); p.stroke(); }
      for (let n = 0; n < 7; n++) {
        const x = 18 + n * 34 + hs(n, y0) * 8, y = y0 + Math.floor(hs(n, y0 + 1) * 9) * 4.5;
        p.fillStyle = 'rgba(200,170,130,0.2)'; p.beginPath(); p.ellipse(x, y, 4.5, 3.2, -0.4, 0, TAU); p.fill();
        p.fillRect(x + 3.5, y - 26, 1.2, 26);
      }
    }
    st.paper = P;
    // 浮かぶ楽譜のページ
    const pg = mk(60, 78), q = pg.getContext('2d');
    q.fillStyle = 'rgba(214,200,176,0.9)'; q.beginPath(); q.moveTo(2, 4); q.lineTo(56, 2); q.lineTo(58, 70); q.lineTo(30, 76); q.lineTo(4, 72); q.closePath(); q.fill();
    q.strokeStyle = 'rgba(40,30,30,0.5)'; q.lineWidth = 0.8;
    for (const y0 of [14, 40]) for (let l = 0; l < 5; l++) { q.beginPath(); q.moveTo(6, y0 + l * 3.5); q.lineTo(54, y0 + l * 3.5); q.stroke(); }
    q.fillStyle = 'rgba(40,30,30,0.6)'; for (let n = 0; n < 8; n++) { q.beginPath(); q.ellipse(10 + n * 6, 15 + (n * 5 % 14) + (n > 3 ? 26 : 0), 1.8, 1.3, 0, 0, TAU); q.fill(); }
    const bg = q.createLinearGradient(0, 78, 0, 50); bg.addColorStop(0, 'rgba(30,10,0,0.9)'); bg.addColorStop(1, 'rgba(30,10,0,0)');
    q.globalCompositeOperation = 'source-atop'; q.fillStyle = bg; q.fillRect(0, 0, 60, 78);
    st.page = pg;
    for (let i = 0; i < 7; i++) st.pages.push({ x: hs(i, 11) * W, y: hs(i, 12) * H, r: hs(i, 13) * TAU, s: 0.5 + hs(i, 14) * 0.5, v: 8 + hs(i, 15) * 14 });
  }

  function reset() {
    Object.assign(st, { mood: 0, dark: 0, darkTo: 0, glow: 0, swell: 0, wings: 0, last: 0, hush: 0, revived: 0, embers: [], pops: [], plinks: [], notes: 0, tapI: 0 });
  }

  // ---- 譜面から呼ばれる演出 ----------------------------------------------------------------------------
  window.armFx = function (type, a, b) {
    if (type === 'bell') {
      sparks(a, b, { n: 10, color: '#ffe3a1', speed: 200, life: 0.5, size: 2.5, gravity: 150 });
      shockRing(a, b, { color: '#ffd36b', size: 46, life: 0.3, width: 2 });
      st.pops.push({ x: a, y: b, age: 0 }); st.notes++; st.glow = Math.min(1, st.glow + 0.25);
    } else if (type === 'bellMiss') sparks(a, GROUND_Y - 4, { n: 4, color: '#8a8070', speed: 70, life: 0.4, size: 2, gravity: 200, dir: -Math.PI / 2, spread: 1.5 });
    else if (type === 'swell') { st.swell = 1; shockRing(W / 2, 300, { color: rgbHex(mixC(GOLD, WHITE, 0.3)), size: 520, life: 0.8, width: 4 }); punch(0.03 * (a || 1)); }
    else if (type === 'breath') st.glow = 0.4;
    else if (type === 'open') { shockRing(W / 2, GROUND_Y - 120, { color: '#ffe3a1', size: 700, life: 0.7, width: 5 }); flash(0.4); }
    else if (type === 'lastlight') st.last = 1;
    else if (type === 'fade') st.darkTo = 0.6;
    else if (type === 'dark') { st.darkTo = 1; st.last = 0; }
    else if (type === 'spark') {                                            // ひとつの音から、もう一度
      st.darkTo = 0.7;
      sparks(W / 2, GROUND_Y - 30, { n: 30, color: '#ffe3a1', speed: 160, life: 1.2, size: 2.5, gravity: -40 });
      shockRing(W / 2, GROUND_Y - 30, { color: '#ffe3a1', size: 260, life: 1.2, width: 2 });
    } else if (type === 'gather') st.darkTo = 0.35;
    else if (type === 'phoenix') {
      st.darkTo = 0; st.dark = 0; st.wings = 1; st.flashC = EMBER; flash(1); shake(16); punch(0.08);
      shockRing(W / 2, 300, { color: '#ffb35c', size: 1100, life: 1.1, width: 10 });
      shockRing(W / 2, 300, { color: '#ffe3a1', size: 700, life: 0.8, width: 5 });
      for (let i = 0; i < 40; i++) addEmber(true);
    } else if (type === 'unison') { flash(0.5); shockRing(W / 2, GROUND_Y - 20, { color: '#ffe3a1', size: 500, life: 0.6, width: 4 }); }
    else if (type === 'fan') { shockRing(W / 2, GROUND_Y - 20, { color: '#ffffff', size: 900, life: 0.7, width: 6 }); shake(10); }
    else if (type === 'band') { st.flashC = EMBER; flash(0.7); shake(14); }
    else if (type === 'hush') st.hush = 1;
    else if (type === 'rush') { st.hush = 0; st.wings = 1; st.flashC = EMBER; flash(1); shake(22); punch(0.1); shockRing(W / 2, 300, { color: '#ff7a3a', size: 1200, life: 1, width: 12 }); }
    else if (type === 'revived') {
      st.revived = 1; st.flashC = GOLD; flash(1); shake(18);
      for (let i = 0; i < 3; i++) shockRing(W / 2, 300, { color: ['#ffe3a1', '#ff8fb1', '#8fd8ff'][i], size: 600 + i * 300, life: 1 + i * 0.3, width: 6 });
      for (let i = 0; i < 60; i++) addEmber(true);
    }
  };
  function rgbHex(c) { return '#' + c.map(v => Math.round(v).toString(16).padStart(2, '0')).join(''); }
  function addEmber(big) {
    if (st.embers.length > [30, 70, 120][gfx]) return;
    st.embers.push({ x: Math.random() * W, y: H + 10 - (big ? Math.random() * 200 : 0), vx: (Math.random() - 0.5) * 30, vy: -(40 + Math.random() * (big ? 160 : 70)), life: 2 + Math.random() * 3, age: 0, s: 1 + Math.random() * 2, c: Math.random() < 0.7 ? EMBER : GOLD });
  }

  function update(dt, T) {
    if (!st.made) make();
    const sec = inSong() ? SECTIONS[sectionIndex(T)] || {} : { mood: 2 };
    const moodTo = sec.mood ?? 1;
    st.mood += (moodTo - st.mood) * Math.min(1, dt * 1.5);
    if (inSong()) {
      if (sec.dark) st.darkTo = 1;
      st.dark += (st.darkTo - st.dark) * Math.min(1, dt * (st.darkTo > st.dark ? 2.5 : 1.2));
    } else st.dark = 0;
    const spinV = st.dark > 0.9 ? 0 : 0.04 + 0.22 * st.mood + 0.25 * Math.max(0, st.mood - 2);
    st.spin += spinV * dt * (1 - st.dark);
    const dec = (k, r) => { st[k] = Math.max(0, st[k] - dt * r); };
    dec('glow', 0.5); dec('swell', 1.2); dec('last', 0.15); dec('hush', 0.8);
    if (st.mood < 2.5) dec('wings', 0.4);
    if (inSong() && st.revived > 0) st.revived = Math.min(1, st.revived);
    // 火の粉: 盛り上がるほど多い
    const rate = gfx === 0 ? 0 : (st.mood - 0.5) * 14 * (1 - st.dark);
    if (Math.random() < rate * dt) addEmber(false);
    for (const e of st.embers) { e.age += dt; e.x += (e.vx + Math.sin(e.age * 3 + e.s) * 14) * dt; e.y += e.vy * dt; }
    st.embers = st.embers.filter(e => e.age < e.life && e.y > -20);
    for (const p of st.pages) { p.y -= p.v * dt; p.r += dt * 0.15; p.x += Math.sin(T * 0.3 + p.s * 9) * 6 * dt; if (p.y < -60) { p.y = H + 40; p.x = Math.random() * W; } }
    for (const p of st.pops) p.age += dt;
    st.pops = st.pops.filter(p => p.age < 0.9);
  }

  // ---- 背景 ------------------------------------------------------------------------------------------------
  function background(T, look, k, bk, bp) {
    if (!st.made) make();
    const lowE = inSong() ? songEnv(0, T) : 0.3 * k, hiE = inSong() ? songEnv(5, T) : 0.2;
    vGradient(rgba(look.skyTop, 1), rgba(mixC(look.skyBot, look.color, 0.05 + 0.08 * lowE), 1));
    const lit = 1 - 0.85 * st.dark;
    // 浮かぶ楽譜のページ（灰色の世界ほどよく見える）
    ctx.globalAlpha = lit * (0.16 + 0.1 * (2 - Math.min(2, st.mood)));
    for (const p of st.pages) {
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.r); ctx.scale(p.s, p.s); ctx.drawImage(st.page, -30, -39); ctx.restore();
    }
    ctx.globalAlpha = 1;
    const cx = W / 2, cy = 300;
    // 光の羽（不死鳥）
    const wa = (st.wings * 0.8 + Math.max(0, st.mood - 2) * 0.3) * lit;
    if (wa > 0.02 && gfx > 0) {
      ctx.globalCompositeOperation = 'lighter';
      const flap = Math.sin(bp * Math.PI / 4) * 0.08 + 0.05 * k;
      for (const s of [-1, 1]) {
        ctx.save(); ctx.translate(cx + s * 40, cy + 10); ctx.scale(s * (1.05 + 0.08 * lowE), 1); ctx.rotate(-flap);
        ctx.globalAlpha = Math.min(1, wa) * (0.6 + 0.4 * k); ctx.drawImage(st.wing, -10, -220); ctx.restore();
      }
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    }
    // オルゴールの円盤（回る。ピンは高い音にあわせて光る）
    const R = 250;
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(st.spin);
    ctx.globalAlpha = (0.42 + 0.12 * st.mood) * lit + 0.08;
    ctx.drawImage(st.disc, -R - 4, -R - 4);
    ctx.globalAlpha = 1;
    if (gfx > 0 && st.dark < 0.95) {
      ctx.globalCompositeOperation = 'lighter';
      const on = clamp01((st.mood - 0.3) / 2) * lit;
      const head = (T * 1.7) % 1;                                          // くし（読み取る所）を通るピンが明るい
      for (let i = 0; i < st.pins.length; i++) {
        const p = st.pins[i], a = p.a + st.spin, rel = ((a + Math.PI / 2) % TAU + TAU) % TAU;
        const nearComb = Math.exp(-Math.min(rel, TAU - rel) * 6);
        const tw = 0.25 + 0.75 * hs(i, Math.floor(T * 4 + i));
        const al = on * (0.12 * tw + 0.8 * nearComb * (0.4 + hiE)) + st.glow * 0.25 * tw;
        if (al < 0.03) continue;
        ctx.fillStyle = rgba(i % 3 === 0 ? ROSE : i % 3 === 1 ? GOLD : AZURE, al);
        ctx.beginPath(); ctx.arc(Math.cos(p.a) * p.rr, Math.sin(p.a) * p.rr, 2.2 + 2 * nearComb, 0, TAU); ctx.fill();
      }
      ctx.globalCompositeOperation = 'source-over';
    }
    ctx.restore();
    // 円盤のふちの光（拍・盛り上がり）
    if (st.dark < 0.98) {
      ctx.strokeStyle = rgba(mixC(look.color, WHITE, 0.3), (0.12 + 0.25 * k * clamp01(st.mood) + 0.4 * st.swell) * lit);
      ctx.lineWidth = 2 + 3 * st.swell; ctx.beginPath(); ctx.arc(cx, cy, R + 6 + 30 * (1 - st.swell) * (st.swell > 0 ? 1 : 0), 0, TAU); ctx.stroke();
      // くし（円盤の上で音を読む金属の歯）
      ctx.fillStyle = rgba([150, 130, 110], 0.5 * lit);
      for (let i = 0; i < 12; i++) ctx.fillRect(cx - 60 + i * 10, cy - R - 26, 7, 24 + (i % 4) * 4 - (inSong() ? 4 * songEnv(Math.min(7, 2 + (i >> 1)), T) : 0));
    }
    // 火の粉
    if (st.embers.length) {
      ctx.globalCompositeOperation = 'lighter';
      for (const e of st.embers) {
        const a = clamp01(1 - e.age / e.life) * lit;
        ctx.fillStyle = rgba(e.c, 0.7 * a); ctx.fillRect(e.x, e.y, e.s, e.s * 1.6);
      }
      ctx.globalCompositeOperation = 'source-over';
    }
    // 最後の光（105〜109）: 上からひとすじの光
    if (st.last > 0.01) {
      const g = ctx.createLinearGradient(cx, 0, cx, H);
      g.addColorStop(0, rgba(GOLD, 0.25 * st.last)); g.addColorStop(1, rgba(GOLD, 0));
      ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(cx - 40, 0); ctx.lineTo(cx + 40, 0); ctx.lineTo(cx + 220, H); ctx.lineTo(cx - 220, H); ctx.fill();
    }
  }

  // ---- 床（五線の舞台）・足場 ------------------------------------------------------------------------------
  function floor(look, k, bp) {
    const T = inSong() ? songTime : titleClock();
    ctx.fillStyle = '#0c0910'; ctx.fillRect(-400, GROUND_Y, W + 800, H - GROUND_Y + 40);
    const lit = 1 - 0.8 * st.dark;
    ctx.strokeStyle = rgba(mixC(GOLD, look.color, 0.4), (0.18 + 0.2 * k) * lit); ctx.lineWidth = 1;
    ctx.beginPath(); for (let l = 0; l < 5; l++) { const y = GROUND_Y + 12 + l * 7; ctx.moveTo(-400, y); ctx.lineTo(W + 400, y); } ctx.stroke();
    ctx.fillStyle = rgba(mixC(GOLD, WHITE, 0.4), (0.5 + 0.4 * k) * lit); ctx.fillRect(-400, GROUND_Y, W + 800, 1.5);
    // 小節線（拍で流れる）
    ctx.fillStyle = rgba(GOLD, 0.2 * lit);
    const off = inSong() ? ((T * ARM_FALL * 0.25) % 200) : 0;
    for (let x = -off; x < W + 200; x += 200) ctx.fillRect(x, GROUND_Y + 12, 1.5, 28);
  }
  function platform(p, look, k) {
    if (p.ground) return;
    const lit = 1 - 0.8 * st.dark;
    ctx.fillStyle = '#120d18'; ctx.fillRect(p.x, p.y, p.w, p.h);
    ctx.fillStyle = rgba(mixC(GOLD, look.color, 0.3), (0.55 + 0.35 * k) * lit); ctx.fillRect(p.x, p.y, p.w, 1.5);
    ctx.fillStyle = rgba(GOLD, 0.35 * lit); ctx.fillRect(p.x, p.y, 2, p.h); ctx.fillRect(p.x + p.w - 2, p.y, 2, p.h);   // 小節線
    ctx.fillRect(p.x + 5, p.y, 1, p.h);
  }

  // ---- 楽譜（リボン・短い音・矢印・壁ぎわの音・前奏のメロディ）-----------------------------------------------
  const yOf = (t, T) => GROUND_Y - (t - T) * ARM_FALL;
  function sheetKind(b, T) {
    const ahead = (GROUND_Y + 30) / ARM_FALL, lit = 1 - 0.7 * st.dark;
    // 前奏のメロディの印（金色の帯）
    if (T < armBar(7)) {
      ctx.globalCompositeOperation = 'lighter';
      for (const m of ARM.melody) {
        if (m.t < T - 0.3 || m.t > T + ahead) continue;
        const y = yOf(m.t, T), land = T > m.t;
        const a = land ? 0.6 * (1 - (T - m.t) / 0.3) : 0.55;
        ctx.fillStyle = rgba(GOLD, a); roundRect(m.x - m.w / 2, Math.min(y, GROUND_Y) - 3, m.w, 6, 3); ctx.fill();
      }
      ctx.globalCompositeOperation = 'source-over';
    }
    // 短い音: 小さな音符が落ちて、床で輪になる
    const taps = ARM.taps;
    while (st.tapI < taps.length && taps[st.tapI].t < T - 0.4) st.tapI++;
    while (st.tapI > 0 && taps[st.tapI - 1].t >= T - 0.4) st.tapI--;
    for (let i = st.tapI; i < taps.length && taps[i].t < T + ahead; i++) {
      const n = taps[i], c = RIB[n.c];
      if (n.t > T) {
        const y = yOf(n.t, T);
        ctx.fillStyle = rgba(c, 0.38 * lit); ctx.beginPath(); ctx.ellipse(n.x, y, 4.5, 3.2, -0.45, 0, TAU); ctx.fill();
      } else {
        const p = (T - n.t) / 0.4;
        ctx.strokeStyle = rgba(c, 0.55 * (1 - p) * lit); ctx.lineWidth = 2;
        ctx.beginPath(); ctx.ellipse(n.x, GROUND_Y, 6 + p * 26, 2 + p * 5, 0, 0, TAU); ctx.stroke();
      }
    }
    // 横に払う矢印（落ちてくる）
    ctx.strokeStyle = rgba(EMBER, 0.65 * lit); ctx.lineWidth = 2.5; ctx.lineJoin = 'round';
    ctx.beginPath();
    for (const f of ARM.flicks) {
      if (f.t < T || f.t > T + ahead) continue;
      const y = yOf(f.t, T), d = f.d;
      for (let x = f.x0 + 8; x < f.x1 - 4; x += 16) { ctx.moveTo(x - d * 5, y - 6); ctx.lineTo(x + d * 3, y); ctx.lineTo(x - d * 5, y + 6); }
    }
    ctx.stroke();
    // リボン（長い音）
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    const hot = [];
    for (const h of ARM.holds) {
      if (h.t0 > T + ahead) break;
      if (h.t1 < T - 0.05) continue;
      const c = RIB[h.c];
      ctx.beginPath();
      let started = false;
      const tA = Math.max(h.t0, T), tB = Math.min(h.t1, T + ahead);
      if (tB <= tA) continue;
      ctx.moveTo(armLerp(h, tA), yOf(tA, T));
      for (let j = 0; j < h.t.length; j++) if (h.t[j] > tA && h.t[j] < tB) ctx.lineTo(h.x[j], yOf(h.t[j], T));
      ctx.lineTo(armLerp(h, tB), yOf(tB, T));
      ctx.strokeStyle = rgba(c, 0.32 * lit); ctx.lineWidth = 12; ctx.stroke();
      ctx.strokeStyle = rgba(mixC(c, WHITE, 0.15), 0.95 * lit); ctx.lineWidth = 5; ctx.stroke();
      ctx.strokeStyle = rgba(WHITE, 0.55 * lit); ctx.lineWidth = 1.5; ctx.stroke();
      if (h.t0 <= T) hot.push([armLerp(h, T), GROUND_Y, c]);
      for (const p of platforms) {                                          // 足場にふれている所
        if (p.ground || platformGone(p)) continue;
        const tau = T + (GROUND_Y - p.y) / ARM_FALL;
        if (tau < h.t0 || tau > h.t1) continue;
        const x = armLerp(h, tau);
        if (x > p.x - 6 && x < p.x + p.w + 6) hot.push([x, p.y, c]);
      }
    }
    // 熱い所（ふれている所が光る）
    ctx.globalCompositeOperation = 'lighter';
    for (const [x, y, c] of hot) {
      const R = 20 + 6 * Math.sin(T * 30 + x);
      ctx.drawImage(glowSprite(c), x - R, y - R, R * 2, R * 2);
      ctx.fillStyle = rgba(WHITE, 0.85); ctx.fillRect(x - 9, y - 3, 18, 3);
      ctx.fillStyle = rgba(c, 0.35); ctx.fillRect(x - 11, y - ARM_HOT, 22, ARM_HOT);
      if (gfx > 0 && Math.random() < 0.25) sparks(x, y - 2, { n: 1, color: rgbHex(c), speed: 160, life: 0.35, size: 2, gravity: 500, dir: -Math.PI / 2, spread: 2 });
    }
    ctx.globalCompositeOperation = 'source-over';
    // 壁ぎわの音: カーテンのふちで、すみれ色にはじける
    for (const w of ARM.walls) {
      if (w.t < T - 0.25 || w.t > T + ahead) continue;
      const f = armField(Math.max(w.t, T)), x = w.side < 0 ? f.l : f.r, y = w.t > T ? yOf(w.t, T) : GROUND_Y;
      if (w.t > T) { ctx.fillStyle = rgba(VIOLET, 0.8 * lit); ctx.beginPath(); ctx.moveTo(x, y - 8); ctx.lineTo(x - w.side * 7, y); ctx.lineTo(x, y + 8); ctx.closePath(); ctx.fill(); }
      else { const p = (T - w.t) / 0.25; ctx.strokeStyle = rgba(VIOLET, 0.8 * (1 - p) * lit); ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, y - 10, 6 + 22 * p, 0, TAU); ctx.stroke(); }
    }
  }

  // ---- 壁: 燃えた楽譜のカーテン（これから先の形が、上から下りてくる）----------------------------------------
  function walls(T, look, k) {
    if (!inSong()) return;
    if (!st.paperPat) st.paperPat = ctx.createPattern(st.paper, 'repeat');
    const lit = 1 - 0.6 * st.dark, STEP = 10, ys = [];
    for (let y = -60; y <= GROUND_Y; y += STEP) ys.push(y);
    const at = y => armField(T + (GROUND_Y - y) / ARM_FALL);
    const pts = ys.map(y => [y, at(y)]);
    const now = armField(T);
    const scroll = (T * ARM_FALL) % 256;
    for (const side of [-1, 1]) {
      const edge = p => side < 0 ? p[1].l : p[1].r;
      if (pts.every(p => side < 0 ? edge(p) < -20 : edge(p) > W + 20) && (side < 0 ? now.l < -20 : now.r > W + 20)) continue;
      ctx.beginPath();
      const far = side < 0 ? -600 : W + 600;
      ctx.moveTo(far, -60);
      for (const p of pts) ctx.lineTo(edge(p), p[0]);
      ctx.lineTo(side < 0 ? now.l : now.r, H + 60); ctx.lineTo(far, H + 60); ctx.closePath();
      if (st.paperPat.setTransform) st.paperPat.setTransform(new DOMMatrix().translate(0, scroll));
      ctx.save(); ctx.fillStyle = st.paperPat; ctx.globalAlpha = 0.93; ctx.fill(); ctx.restore();
      ctx.fillStyle = `rgba(0,0,0,${(0.25 + 0.5 * st.dark).toFixed(3)})`; ctx.fill();
      // 燃えているふち
      ctx.beginPath();
      for (let i = 0; i < pts.length; i++) { const p = pts[i]; const x = edge(p) + side * 0; i ? ctx.lineTo(x, p[0]) : ctx.moveTo(x, p[0]); }
      ctx.lineTo(side < 0 ? now.l : now.r, H + 60);
      ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = rgba(EMBER, (0.35 + 0.25 * k) * lit); ctx.lineWidth = 7; ctx.stroke();
      ctx.strokeStyle = rgba([255, 230, 170], (0.75 + 0.2 * k) * lit); ctx.lineWidth = 1.6; ctx.stroke();
      if (gfx === 2) {                                                     // ちらちらする炎
        ctx.strokeStyle = rgba(EMBER, 0.5 * lit); ctx.lineWidth = 1.2; ctx.beginPath();
        for (let i = 0; i < pts.length; i += 2) {
          const p = pts[i], x = edge(p), fl = 4 + 6 * hs(i, Math.floor(T * 12));
          ctx.moveTo(x, p[0]); ctx.lineTo(x - side * fl, p[0] - 5);
        }
        ctx.stroke();
      }
      ctx.globalCompositeOperation = 'source-over';
    }
  }

  // ---- 弾 --------------------------------------------------------------------------------------------------
  function bullet(b, c) {
    const x = b.x, y = b.y, r = b.r;
    if (b.style === 'armOrb') {
      ctx.fillStyle = rgba(mixC(c, [0, 0, 0], 0.55), 1); ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
      ctx.strokeStyle = rgba(mixC(c, WHITE, 0.3), 1); ctx.lineWidth = 2; ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.8)'; ctx.beginPath(); ctx.arc(x - r * 0.3, y - r * 0.3, r * 0.28, 0, TAU); ctx.fill();
    } else if (b.style === 'armFlame') {                                    // 下向きのしずく（炎）
      ctx.fillStyle = rgba(c, 1);
      ctx.beginPath(); ctx.moveTo(x, y - r * 1.7); ctx.quadraticCurveTo(x + r * 1.1, y - r * 0.2, x, y + r); ctx.quadraticCurveTo(x - r * 1.1, y - r * 0.2, x, y - r * 1.7); ctx.fill();
      ctx.fillStyle = 'rgba(255,240,200,0.95)'; ctx.beginPath(); ctx.arc(x, y + r * 0.1, r * 0.45, 0, TAU); ctx.fill();
    } else if (b.style === 'armFeather') {                                  // 羽根
      ctx.fillStyle = rgba(c, 1); ctx.beginPath(); ctx.ellipse(x, y, r * 0.75, r * 1.35, 0.35, 0, TAU); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.85)'; ctx.lineWidth = 1.3; ctx.beginPath(); ctx.moveTo(x + r * 0.45, y - r * 1.2); ctx.lineTo(x - r * 0.45, y + r * 1.25); ctx.stroke();
    } else {                                                                // 黒い音符（色のふち）
      ctx.fillStyle = '#100a16'; ctx.beginPath(); ctx.ellipse(x, y, r + 1, r * 0.8, -0.4, 0, TAU); ctx.fill();
      ctx.strokeStyle = rgba(c, 1); ctx.lineWidth = 2.4; ctx.stroke();
      ctx.fillStyle = rgba(c, 0.95); ctx.fillRect(x + r * 0.62, y - r * 2.6, 1.8, r * 2.4);
      ctx.fillStyle = 'rgba(255,255,255,0.75)'; ctx.beginPath(); ctx.arc(x - r * 0.25, y - r * 0.2, r * 0.25, 0, TAU); ctx.fill();
    }
  }
  function eighth(x, y, s, c, a) {                                          // 八分音符 ♪
    ctx.fillStyle = rgba(c, a); ctx.strokeStyle = rgba(c, a);
    ctx.beginPath(); ctx.ellipse(x - 3 * s, y + 6 * s, 5.5 * s, 4 * s, -0.45, 0, TAU); ctx.fill();
    ctx.fillRect(x + 1.6 * s, y - 13 * s, 2 * s, 19 * s);
    ctx.lineWidth = 2.4 * s; ctx.beginPath(); ctx.moveTo(x + 2.6 * s, y - 13 * s); ctx.quadraticCurveTo(x + 10 * s, y - 8 * s, x + 7 * s, y - 1 * s); ctx.stroke();
  }
  function bellKind(b, T) {
    const s = 1 + 0.08 * Math.sin(T * 10 + b.x);
    if (gfx > 0) { ctx.globalCompositeOperation = 'lighter'; const R = 24 * s; ctx.drawImage(glowSprite(GOLD), b.x - R, b.y - R, R * 2, R * 2); ctx.globalCompositeOperation = 'source-over'; }
    eighth(b.x, b.y, s, GOLD, 1);
  }
  function glissKind(b, T) {
    const d = b.dir, L = b.len, y = GROUND_Y;
    ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createLinearGradient(b.x - d * L, 0, b.x + d * L * 0.5, 0);
    g.addColorStop(0, 'rgba(255,154,60,0)'); g.addColorStop(1, 'rgba(255,200,120,0.9)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.moveTo(b.x - d * L, y);
    for (let i = 0; i <= 10; i++) { const xx = b.x - d * L + d * L * 1.5 * i / 10; ctx.lineTo(xx, y - 6 - 12 * Math.sin(i / 10 * Math.PI) * (0.6 + 0.4 * Math.sin(T * 40 + i))); }
    ctx.lineTo(b.x + d * L * 0.5, y); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(255,245,220,0.95)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(b.x + d * (L * 0.5 - 12), y - 18); ctx.lineTo(b.x + d * (L * 0.5 + 2), y - 9); ctx.lineTo(b.x + d * (L * 0.5 - 12), y); ctx.stroke();
    ctx.globalCompositeOperation = 'source-over';
  }

  function flash(look) {
    if (st.dark > 0.02 && inSong()) {                                      // 真っ暗: プレイヤーのまわりだけ、うっすら見える
      const p = playerXY(), a = 0.78 * st.dark;
      const g = ctx.createRadialGradient(p.x, p.y, 20, p.x, p.y, 220);
      g.addColorStop(0, `rgba(0,0,0,${(a * 0.35).toFixed(3)})`); g.addColorStop(1, `rgba(0,0,0,${a.toFixed(3)})`);
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    }
    if (st.hush > 0.01 && inSong()) { ctx.fillStyle = `rgba(0,0,0,${(0.35 * st.hush).toFixed(3)})`; ctx.fillRect(0, 0, W, H); }
    if (flashT > 0) {
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = rgba(mixC(st.flashC, WHITE, 0.5), 0.35 * flashT); ctx.fillRect(0, 0, W, H);
      ctx.globalCompositeOperation = 'source-over';
    }
    // 取ったメロディのかけら（左上の五線に音符がたまる）
    if (inSong() && ARM_STATS.total > 0) {
      const x0 = 14, y0 = 22;
      ctx.strokeStyle = 'rgba(255,227,161,0.35)'; ctx.lineWidth = 1;
      ctx.beginPath(); for (let l = 0; l < 5; l++) { ctx.moveTo(x0, y0 + l * 4); ctx.lineTo(x0 + 150, y0 + l * 4); } ctx.stroke();
      const n = Math.min(14, ARM_STATS.got);
      for (let i = 0; i < n; i++) { ctx.fillStyle = 'rgba(255,211,107,0.9)'; ctx.beginPath(); ctx.ellipse(x0 + 8 + i * 10, y0 + 16 - ((i * 3) % 5) * 4, 3, 2.2, -0.4, 0, TAU); ctx.fill(); }
      ctx.font = `600 13px ${SERIF}`; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillStyle = 'rgba(255,227,161,0.9)';
      ctx.fillText(`♪ ${ARM_STATS.got} / ${ARM_STATS.total}`, x0 + 158, y0 + 8);
      for (const p of st.pops) { const a = 1 - p.age / 0.9; eighth(p.x + 8, p.y - 30 - p.age * 60, 0.8, GOLD, a * 0.8); }
    }
  }

  // バナー: 五線の上に細い明朝の文字
  function banner() {
    const bn = fx.banner;
    if (!bn) return;
    const e = bn.age, DUR = 2.8;
    if (e > DUR) { fx.banner = null; return; }
    const a = clamp01(e / 0.35) * clamp01((DUR - e) / 0.6), y = 150;
    ctx.save();
    ctx.globalAlpha = a;
    const w = 240 + 160 * easeOut(e / 0.8);
    ctx.strokeStyle = 'rgba(255,227,161,0.4)'; ctx.lineWidth = 1;
    ctx.beginPath(); for (let l = 0; l < 5; l++) { ctx.moveTo(W / 2 - w, y - 16 + l * 8); ctx.lineTo(W / 2 + w, y - 16 + l * 8); } ctx.stroke();
    ctx.font = `500 ${bn.name.length > 12 ? 34 : 42}px ${SERIF}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(255,170,90,0.8)'; ctx.shadowBlur = 16;
    ctx.fillStyle = '#fff4dc';
    const sp = 1 + 3 * (1 - easeOut(e / 0.6));
    ctx.fillText(bn.name.split('').join(sp > 1.5 ? ' ' : ''), W / 2, y);
    ctx.shadowBlur = 0;
    if (bn.sub) { ctx.font = `italic 400 16px ${SERIF}`; ctx.fillStyle = 'rgba(255,227,161,0.9)'; ctx.fillText(bn.sub, W / 2, y + 40); }
    ctx.restore();
  }

  function title(look, k, bp) {                                             // タイトル画面: 回る円盤の前に ♪
    const T = titleClock();
    eighth(W / 2, H * 0.37 + Math.sin(T * 2) * 6, 2.4 + 0.2 * k, GOLD, 0.95);
    ctx.strokeStyle = rgba(GOLD, 0.3 + 0.3 * k); ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(W / 2, H * 0.37, 70 + 6 * k, 0, TAU); ctx.stroke();
  }

  THEMES.revive = {
    noTrails: true, glow: 1.8, noScanlines: true,
    clearColors: ['#ffd36b', '#ff7aa0', '#8fd8ff', '#fff4dc', '#ff9a3c'],
    kinds: { armSheet: sheetKind, armBell: bellKind, armGliss: glissKind },
    reset, update, background, floor, platform, bullet, flash, banner, title, walls,
  };
})();
