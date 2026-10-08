"use strict";

/* =========================================================================
   見た目のセット「baile」  —  曲⑳「NEON BAILE」用
   夜のブラジルの街のバイレ（ストリートのダンスパーティー）。紫からピンクの空、大きな月、
   丘の上のファヴェーラ（家の灯りがびっしり）と、丘のてっぺんの像のシルエット。手前はネオンの看板のビル。
   床はぬれたアスファルト（ネオンが映る）、両はしにスピーカーの山（キックでコーンが押し出される）。
   パーティーのレーザーが拍でふれる。SLOWED では画面がゆがんだ VHS のようになり、テープが止まる所で一瞬止まる。
   弾: カウベル（金色の、口の開いた鐘）／ 声のシャボン（母音の文字入り）／ ふつうの弾はネオンの丸。
   車（lowrider）はネオンのアンダーグロー付きで、キックではねる。
   重くならないよう、ゆっくりしか変わらない背景は cachedLayer（visuals.js）で 4 コマに 1 回だけ描き直す。
   ========================================================================= */

(function () {
  const WHITE = [255, 255, 255];
  const NEON = ['#ff3ea5', '#22e6ff', '#ffe066', '#b36bff', '#7dff6a'].map(rgb);
  const FONT = '"Arial Black", "Helvetica Neue", system-ui, sans-serif';
  const st = { made: false, hills: null, city: null, sign: null, stars: null, lastBeat: -99, flashes: [], confetti: [] };
  let KICK = null, CLAP = null, STOP = null;
  const inSong = () => scene !== 'title';
  const hsh = (a, b = 0) => { const v = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return v - Math.floor(v); };
  const bpNow = T => inSong() ? beatPos(T) : T / BL_BEAT;

  // ---- 前もって描く絵 ----------------------------------------------------------------------
  function make() {
    st.made = true;
    // 丘（2段）＋ ファヴェーラの家の灯り。いちばん高い丘のてっぺんに、両腕を広げた像
    st.hills = [0, 1].map(i => {
      const w = W + 160, h = 360, c = document.createElement('canvas'); c.width = w; c.height = h;
      const g = c.getContext('2d');
      const yAt = x => i === 0 ? 120 + 90 * Math.pow(Math.abs(Math.sin(x * 0.0042 + 0.6)), 1.5) - 70 * Math.exp(-(((x - 560) / 90) ** 2))
                               : 190 + 50 * Math.sin(x * 0.009 + 1.3) + 20 * Math.sin(x * 0.023);
      g.fillStyle = i === 0 ? '#1a0a2e' : '#120624';
      g.beginPath(); g.moveTo(0, h); for (let x = 0; x <= w; x += 6) g.lineTo(x, yAt(x)); g.lineTo(w, h); g.closePath(); g.fill();
      // 家の灯り（あたたかい色の小さな四角が、丘の斜面にびっしり）
      const cols = ['#ffd27a', '#ffb35c', '#ff8ac8', '#fff0b0', '#9fe8ff'];
      for (let n = 0; n < (i === 0 ? 900 : 700); n++) {
        const x = hsh(n, i) * w, top = yAt(x) + 6, y = top + Math.pow(hsh(n + 3, i), 0.8) * (h - top);
        if (hsh(n, 7 + i) < 0.35) continue;
        g.fillStyle = cols[(hsh(n, 11) * cols.length) | 0]; g.globalAlpha = 0.35 + 0.6 * hsh(n, 13);
        g.fillRect(x, y, 2 + (hsh(n, 17) * 2 | 0), 2);
      }
      g.globalAlpha = 1;
      if (i === 0) {                                                     // 丘の上の像（シルエット）＋ うしろの光
        const sx = 560, sy = yAt(560);
        const gr = g.createRadialGradient(sx, sy - 30, 0, sx, sy - 30, 70); gr.addColorStop(0, 'rgba(255,220,240,0.35)'); gr.addColorStop(1, 'rgba(255,220,240,0)');
        g.fillStyle = gr; g.fillRect(sx - 70, sy - 100, 140, 140);
        g.fillStyle = '#f4e8ff';
        g.fillRect(sx - 2.5, sy - 40, 5, 32);                            // 体
        g.fillRect(sx - 22, sy - 36, 44, 4);                             // 広げた腕
        g.beginPath(); g.arc(sx, sy - 44, 4, 0, TAU); g.fill();          // 頭
        g.fillRect(sx - 5, sy - 10, 10, 10);                             // 台
      }
      return c;
    });
    // 手前のビル（窓の灯り）
    const c = document.createElement('canvas'); c.width = W + 200; c.height = 300;
    const g = c.getContext('2d');
    let x = 0, n = 0;
    while (x < c.width) {
      const bw = 50 + hsh(n, 1) * 70, bh = 90 + hsh(n, 2) * 170;
      g.fillStyle = n % 2 ? '#0c0618' : '#100820'; g.fillRect(x, 300 - bh, bw - 4, bh);
      for (let wy = 300 - bh + 10; wy < 290; wy += 14) for (let wx = x + 6; wx < x + bw - 12; wx += 11) {
        if (hsh(wx, wy) < 0.55) continue;
        g.fillStyle = hsh(wx, wy + 1) < 0.2 ? '#ff8ac8' : hsh(wx, wy + 2) < 0.3 ? '#9fe8ff' : '#ffd27a';
        g.globalAlpha = 0.3 + 0.5 * hsh(wx + 1, wy); g.fillRect(wx, wy, 5, 7);
      }
      g.globalAlpha = 1;
      x += bw; n++;
    }
    st.city = c;
    st.stars = Array.from({ length: 70 }, (_, i) => ({ x: hsh(i, 21) * W, y: hsh(i, 22) * 260, s: 1 + hsh(i, 23) * 1.5, p: hsh(i, 24) * TAU }));
  }

  function reset() {
    if (!st.made) make();
    Object.assign(st, { lastBeat: -99, flashes: [], confetti: [] });
  }
  function onBeat(b) {
    if (!KICK) { KICK = SCORE_BAILE.kick; CLAP = new Set(SCORE_BAILE.clap); STOP = SCORE_BAILE.stop; }
    if (CLAP.has(b)) st.flashes.push({ t: 0, x: 90 + hsh(b) * (W - 180) });
    for (const s of BL_SECTIONS) if (Math.abs(blBeatPos(s.t) - b) < 0.01 && b > 0) {
      for (let i = 0; i < 60; i++) st.confetti.push({ x: hsh(b, i) * W, y: -10 - hsh(i, b) * 200, vx: (hsh(i, 3) - 0.5) * 60, vy: 120 + hsh(i, 4) * 120, a: hsh(i, 5) * TAU, c: NEON[i % 5] });
    }
  }
  function update(dt, T) {
    if (!st.made) make();
    if (scene === 'play') {
      const b = Math.floor(beatPos(T) + 0.02);
      if (b !== st.lastBeat) { if (b === st.lastBeat + 1) onBeat(b); st.lastBeat = b; }
    }
    for (const f of st.flashes) f.t += dt;
    st.flashes = st.flashes.filter(f => f.t < 0.35);
    for (const q of st.confetti) { q.x += q.vx * dt; q.y += q.vy * dt; q.a += dt * 6; }
    st.confetti = st.confetti.filter(q => q.y < GROUND_Y);
  }

  // SLOWED の強さ（0〜1）とテープが止まる所（1 に近いほど止まっている）
  const slowAmt = T => inSong() ? clamp01((T - blBar(32) + 0.6) / 1.2) * clamp01((blBar(40) - T) / 0.4) : 0;
  const tapeStop = T => { const b0 = blBar(39) + 2 * BL_BEAT; return inSong() && T > b0 && T < blBar(40) ? (T - b0) / (blBar(40) - b0) : 0; };

  // ---- 背景 ---------------------------------------------------------------------------------
  function skyLayer(g, T, look) {
    vGradient(rgba(look.skyTop, 1), rgba(look.skyBot, 1), g);
    // 月（ピンクがかった大きな月）
    const mx = 170, my = 120;
    const gr = g.createRadialGradient(mx, my, 0, mx, my, 150); gr.addColorStop(0, 'rgba(255,190,230,0.45)'); gr.addColorStop(1, 'rgba(255,190,230,0)');
    g.fillStyle = gr; g.fillRect(mx - 150, my - 150, 300, 300);
    g.fillStyle = '#ffe8f4'; g.beginPath(); g.arc(mx, my, 46, 0, TAU); g.fill();
    g.fillStyle = 'rgba(230,180,220,0.5)';
    for (const [dx, dy, r] of [[-14, -10, 9], [12, 8, 7], [16, -16, 5]]) { g.beginPath(); g.arc(mx + dx, my + dy, r, 0, TAU); g.fill(); }
    g.fillStyle = '#fff';
    for (const s of st.stars) { g.globalAlpha = 0.3 + 0.3 * Math.sin(T * 2 + s.p); g.fillRect(s.x, s.y, s.s, s.s); }
    g.globalAlpha = 1;
    // 丘（ゆっくり横に流れる）
    st.hills.forEach((h, i) => { const off = -((T * (4 + i * 6)) % 160); g.drawImage(h, off, GROUND_Y - 380 + i * 30); });
    g.drawImage(st.city, -((T * 14) % 200), GROUND_Y - 300);
  }
  function background(T, look, k, bk, bp) {
    if (!st.made) make();
    ctx.drawImage(cachedLayer('baileSky', 4, 0, g => skyLayer(g, T, look)), 0, 0, W, H);
    const low = inSong() ? songEnv(0, T) : 0.4 + 0.3 * k;
    // ネオンの看板（ビルの上）: B A I L E が順に点く。クラップで全部が光る
    const signX = 560, signY = GROUND_Y - 250;
    ctx.save(); ctx.font = `900 34px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const word = 'BAILE', lit = Math.floor(bp * 2) % 6;
    for (let i = 0; i < 5; i++) {
      const on = (i < lit || k > 0.6) && !(hsh(Math.floor(T * 12), i) < 0.04);
      const col = NEON[i % 5], x = signX + (i - 2) * 34;
      ctx.globalAlpha = on ? 1 : 0.25;
      if (on && gfx > 0) { ctx.globalCompositeOperation = 'lighter'; ctx.drawImage(glowSprite(col), x - 30, signY - 30, 60, 60); ctx.globalCompositeOperation = 'source-over'; }
      ctx.fillStyle = on ? rgba(mixC(col, WHITE, 0.5), 1) : rgba(col, 1); ctx.fillText(word[i], x, signY);
    }
    ctx.restore();
    // パーティーのレーザー: 床の両はしから、拍でふれる
    if (gfx > 0) {
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
      const n = scene === 'play' ? Math.round(2 + 4 * look.tier / 4) : 3;
      for (let i = 0; i < n; i++) {
        const left = i % 2 === 0, ox = left ? 70 : W - 70, oy = GROUND_Y - 120;
        const a = -Math.PI / 2 + (left ? 1 : -1) * (0.35 + 0.5 * Math.sin(bp * Math.PI / 2 + i * 1.3));
        const col = NEON[(((i + Math.floor(bp / 4)) % 5) + 5) % 5];
        ctx.strokeStyle = rgba(col, 0.12 + 0.25 * k); ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(ox, oy); ctx.lineTo(ox + Math.cos(a) * 900, oy + Math.sin(a) * 900); ctx.stroke();
      }
      ctx.restore();
    }
    // クラップの光（ストロボ）
    for (const f of st.flashes) { ctx.fillStyle = `rgba(255,255,255,${(0.12 * (1 - f.t / 0.35)).toFixed(3)})`; ctx.fillRect(0, 0, W, GROUND_Y); }
    // スピーカーの山（左右）。キックでコーンが押し出される
    for (const left of [true, false]) speakers(left ? 8 : W - 88, GROUND_Y, low, k);
  }
  function speakers(x, base, low, k) {
    for (let r = 0; r < 2; r++) {
      const y = base - 64 * (r + 1);
      ctx.fillStyle = '#16101e'; ctx.fillRect(x, y, 80, 62);
      ctx.strokeStyle = 'rgba(255,62,165,0.5)'; ctx.lineWidth = 1.5; ctx.strokeRect(x + 1, y + 1, 78, 60);
      const cx = x + 40, cy = y + 31, R = 22 + 3 * low * (0.5 + 0.5 * k);
      ctx.fillStyle = '#0a0610'; ctx.beginPath(); ctx.arc(cx, cy, 25, 0, TAU); ctx.fill();
      ctx.fillStyle = '#2a2034'; ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.fill();
      ctx.fillStyle = '#3a2e48'; ctx.beginPath(); ctx.arc(cx, cy, R * 0.45, 0, TAU); ctx.fill();
      ctx.strokeStyle = rgba(NEON[1], 0.35 + 0.5 * k); ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(cx, cy, R + 1, 0, TAU); ctx.stroke();
    }
  }

  // ---- 床: ぬれたアスファルト。ネオンが映り、白い線が流れる -------------------------------------------
  function floor(look, k, bp) {
    const y = GROUND_Y, T = inSong() ? songTime : titleClock();
    ctx.fillStyle = '#0c0814'; ctx.fillRect(-400, y, W + 800, H - y + 400);
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 5; i++) {                                       // ネオンの映りこみ（縦にのびる、ゆらゆら）
      const x = 520 + (i - 2) * 34, col = NEON[i % 5];
      ctx.fillStyle = rgba(col, 0.1 + 0.08 * k);
      ctx.fillRect(x - 10 + Math.sin(T * 3 + i) * 2, y + 4, 20, 60);
    }
    ctx.fillStyle = rgba(look.color, 0.08 + 0.1 * k); ctx.fillRect(-400, y, W + 800, 6);
    ctx.restore();
    ctx.fillStyle = 'rgba(255,255,255,0.55)';                          // 車線の白い線（流れる）
    const off = (T * 220) % 120;
    for (let x = -120 + off; x < W + 120; x += 120) ctx.fillRect(x, y + 40, 60, 4);
    ctx.fillStyle = rgba(look.color, 0.9); ctx.fillRect(-400, y, W + 800, 2);
  }

  // ---- 弾 -------------------------------------------------------------------------------------
  function cowbellShape(x, y, r, c) {
    // 口が下に開いた鐘（台形）＋ 上の取っ手 ＋ ふちのつや
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.moveTo(x - r * 0.75 - 2, y - r - 2); ctx.lineTo(x + r * 0.75 + 2, y - r - 2); ctx.lineTo(x + r * 1.15 + 2, y + r + 2); ctx.lineTo(x - r * 1.15 - 2, y + r + 2); ctx.closePath(); ctx.fill();
    ctx.fillStyle = rgba(c, 1); ctx.beginPath(); ctx.moveTo(x - r * 0.75, y - r); ctx.lineTo(x + r * 0.75, y - r); ctx.lineTo(x + r * 1.15, y + r); ctx.lineTo(x - r * 1.15, y + r); ctx.closePath(); ctx.fill();
    ctx.fillStyle = rgba(mixC(c, [0, 0, 0], 0.45), 1); ctx.fillRect(x - r * 1.15, y + r * 0.6, r * 2.3, r * 0.4);
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, y - r - 2, r * 0.35, Math.PI, TAU); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.7)'; ctx.fillRect(x - r * 0.5, y - r * 0.7, r * 0.22, r * 1.2);
  }
  function bullet(b, c, k) {
    if (b.style === 'bell') {
      const sw = Math.sin(b.age * 18) * 0.15;                          // カンカン鳴ってゆれる
      ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(sw); cowbellShape(0, 0, b.r, c); ctx.restore();
      return;
    }
    if (b.style === 'vox') {                                           // 声のシャボン: 丸 ＋ 母音の文字
      ctx.fillStyle = rgba(c, 0.85); ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, TAU); ctx.fill();
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke();
      if (b.r >= 8) {
        ctx.fillStyle = '#fff'; ctx.font = `900 ${Math.round(b.r * 1.1)}px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText((b.vowel || 'a').toUpperCase(), b.x, b.y + 1);
      }
      return;
    }
    ctx.fillStyle = rgba(c, 1); ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.92)'; ctx.beginPath(); ctx.arc(b.x, b.y, b.r * 0.58, 0, TAU); ctx.fill();
  }

  // 車（lowrider）: 予告は床の上のヘッドライトの光と矢印。走っている間はアンダーグローとホイールのリム
  function carK(b, T, k) {
    const c = bulletColor(b), dir = Math.sign(b.v);
    if (b.delay > 0) {
      const p = 1 - b.delay / b.delayMax, on = p > 0.6 || Math.floor(T * 10) % 2 === 0;
      const ex = dir > 0 ? 0 : W;
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      const gr = ctx.createLinearGradient(ex, 0, ex + dir * 320, 0); gr.addColorStop(0, rgba(c, 0.35 * p + 0.1)); gr.addColorStop(1, rgba(c, 0));
      ctx.fillStyle = gr; ctx.fillRect(Math.min(ex, ex + dir * 320), GROUND_Y - b.h - 6, 320, b.h + 6);
      ctx.restore();
      if (on) { ctx.fillStyle = rgba(c, 1); ctx.font = `900 18px ${FONT}`; ctx.textAlign = dir > 0 ? 'left' : 'right'; ctx.fillText(dir > 0 ? '▶▶ CAR' : 'CAR ◀◀', dir > 0 ? 14 : W - 14, GROUND_Y - b.h - 16); }
      return;
    }
    const x = b.x, y = GROUND_Y - b.hop, w = b.w, h = b.h;
    ctx.save(); ctx.translate(x, y); ctx.scale(dir, 1);
    if (gfx > 0) { ctx.globalCompositeOperation = 'lighter'; ctx.drawImage(glowSprite(c), -w * 0.7, -14, w * 1.4, 28); ctx.globalCompositeOperation = 'source-over'; }
    ctx.fillStyle = '#140a1e';                                         // 車体（低くて長い）
    ctx.beginPath(); ctx.moveTo(-w / 2, -8); ctx.lineTo(-w / 2 + 4, -h + 10); ctx.lineTo(-w * 0.18, -h + 8); ctx.lineTo(-w * 0.05, -h); ctx.lineTo(w * 0.22, -h); ctx.lineTo(w * 0.32, -h + 10); ctx.lineTo(w / 2, -h + 13); ctx.lineTo(w / 2, -8); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = rgba(c, 1); ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = rgba(mixC(c, WHITE, 0.4), 0.7); ctx.fillRect(-w * 0.03, -h + 3, w * 0.22, 7);   // 窓
    ctx.fillStyle = '#fff6c0'; ctx.fillRect(w / 2 - 5, -h + 15, 5, 4);                             // ヘッドライト
    ctx.fillStyle = '#ff2a3a'; ctx.fillRect(-w / 2, -h + 14, 4, 4);
    for (const wx of [-w * 0.3, w * 0.3]) {                            // ホイール（回るリム）
      ctx.fillStyle = '#05030a'; ctx.beginPath(); ctx.arc(wx, -6, 8, 0, TAU); ctx.fill();
      ctx.strokeStyle = rgba(c, 1); ctx.lineWidth = 1.5; ctx.beginPath();
      for (let s = 0; s < 4; s++) { const a = b.age * 20 + s * Math.PI / 2; ctx.moveTo(wx, -6); ctx.lineTo(wx + Math.cos(a) * 6, -6 + Math.sin(a) * 6); }
      ctx.stroke();
    }
    ctx.restore();
  }

  // ---- カメラの中: 紙ふぶき ／ SLOWED のゆがみ（VHS のノイズ帯）--------------------------------------------
  function world(T, look, k) {
    for (const q of st.confetti) { ctx.fillStyle = rgba(q.c, 0.9); ctx.save(); ctx.translate(q.x, q.y); ctx.rotate(q.a); ctx.fillRect(-4, -2, 8, 4); ctx.restore(); }
  }
  function flash(look) {
    ctx.fillStyle = `rgba(255,62,165,${(0.35 * flashT).toFixed(3)})`; ctx.fillRect(0, 0, W, H);
  }

  // 画面の上にかぶせる: SLOWED の紫のもや ＋ VHS のノイズ帯 ＋ テープが止まる所の表示
  function overlay(T) {
    const s = slowAmt(T), ts = tapeStop(T);
    if (s <= 0.01) return;
    ctx.fillStyle = `rgba(60,20,120,${(0.22 * s).toFixed(3)})`; ctx.fillRect(0, 0, W, H);
    if (gfx > 0) {
      for (let i = 0; i < 3; i++) {
        const y = ((T * 90 + i * 260) % (H + 60)) - 30;
        ctx.fillStyle = `rgba(255,255,255,${(0.05 * s).toFixed(3)})`; ctx.fillRect(0, y, W, 6 + i * 3);
      }
    }
    ctx.save(); ctx.globalAlpha = 0.7 * s; ctx.fillStyle = '#fff'; ctx.font = `700 20px ${FONT}`; ctx.textAlign = 'left';
    ctx.fillText(ts > 0 ? '■ STOP' : '▶ SLOWED + REVERB', 22, H - 30);
    ctx.restore();
  }

  // 場面の名前: ネオン管の文字。点くとき、ちかちかする
  function banner() {
    const T = songTime;
    overlay(T);
    const bn = fx.banner;
    if (!bn) return;
    const e = bn.age, DUR = 2.8;
    if (e > DUR) { fx.banner = null; return; }
    const a = e < 0.5 ? (hsh(Math.floor(e * 30)) < e * 2 ? 1 : 0.15) : e > DUR - 0.5 ? (DUR - e) / 0.5 : 1;
    ctx.save(); ctx.globalAlpha = clamp01(a); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = `900 60px ${FONT}`;
    ctx.lineWidth = 10; ctx.strokeStyle = rgba(bn.c, 0.35); ctx.strokeText(bn.name, W / 2, 190);
    ctx.lineWidth = 3; ctx.strokeStyle = rgba(bn.c, 1); ctx.strokeText(bn.name, W / 2, 190);
    ctx.fillStyle = rgba(mixC(bn.c, WHITE, 0.75), 1); ctx.fillText(bn.name, W / 2, 190);
    if (bn.sub) { ctx.font = `700 17px ${FONT}`; ctx.fillStyle = '#fff'; ctx.fillText(bn.sub, W / 2, 240); }
    ctx.restore();
  }

  // タイトル: 車が床ではねる ＋ カウベルがくるくる
  function title(look, k, bp) {
    const T = titleClock();
    for (let i = 0; i < 8; i++) {
      const a = bp * 0.25 + i / 8 * TAU, x = W / 2 + Math.cos(a) * 240, y = 250 + Math.sin(a) * 90;
      ctx.save(); ctx.translate(x, y); ctx.rotate(Math.sin(T * 6 + i) * 0.2); cowbellShape(0, 0, 9, NEON[i % 5]); ctx.restore();
    }
    carK({ v: 1, w: 84, h: 28, x: W / 2 + Math.sin(T * 0.5) * 200, hop: Math.abs(Math.sin(bp * Math.PI)) * 8 * (k + 0.2), age: T, delay: 0, color: '#ff3ea5' }, T, k);
  }

  THEMES.baile = {
    noTrails: true, noScanlines: false, glow: 1.6,
    clearColors: ['#ff3ea5', '#22e6ff', '#ffe066', '#b36bff', '#7dff6a'],
    kinds: { car: carK },
    reset, update, background, floor, bullet, world, flash, banner, title,
  };
  // 曲が変わったら、この見た目のセットの絵を手放す（次に使うときに作り直す。メモリがふくらんで重くならないように）
  THEMES.baile.release = () => { freeArt(st); st.made = false; };
})();
