"use strict";

/* =========================================================================
   見た目のセット「quake」  —  曲⑭「TECTONIC」用
   地下の巨大な空洞が、そのままライブ会場になっている。岩の壁にはマグマの割れ目（低音で赤く光る）、
   両はしには岩に埋めこまれたスピーカーの山（コーンが低音でドンと押し出す）、上には地震計の針が描く線。
   床は玄武岩で、割れ目からマグマの光。足場は石の板。
   弾は「岩」（ごつごつ・中が赤熱）、「音の輪」（水色のリング）、ほかは溶けた玉。
   この曲だけの形: 地割れの波（quake）・スピーカー（speaker）・イコライザーの棒（eqBars のビーム）。
   ここぞという所の演出:
     ドロップの瞬間（衝撃音）… 画面が大きくゆれて、背景にひびが走り、天井から岩くずが降る
     サブドロップ          … 画面がぐっと沈む（ズーム）
     右はし               … 震度メーター（いまの低音の強さ）
   重くならないよう、岩の壁とマグマの割れ目は前もって描いた絵を使い、背景は cachedLayer で2コマに1回だけ描き直す。
   ========================================================================= */

(function () {
  const WHITE = [255, 255, 255];
  const MAGMA = [255, 90, 31], EMBER = [255, 176, 46], SONIC = [54, 226, 255];
  const st = { made: false, back: null, veins: null, floorImg: null, box: null, cone: null, dust: [], debris: [], seis: new Float32Array(200), seisI: 0,
    lastBeat: -99, quake: 0, kick: 0, sub: 0, crack: null, mag: 0, lava: [], ripples: [], bass: 0, slice: 0, gi: 0, edge: null, buf: null };
  let IMPACTS = null, KICKS = null, SUBDROPS = null, CRASHES = null, GROWLS = null;
  const DROPS = [64, 192];                                   // ドロップの拍（その直前の1拍半は、背景が真っ暗になる）
  const inSong = () => scene !== 'title';
  const hs = (a, b = 0) => { const v = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return v - Math.floor(v); };

  // ---- 前もって描く絵 ----------------------------------------------------------------------
  function jagged(g, pts) { g.beginPath(); g.moveTo(pts[0][0], pts[0][1]); for (const p of pts) g.lineTo(p[0], p[1]); g.closePath(); }
  function make() {
    st.made = true;
    // 岩の壁（奥 → 手前の2段）＋ 天井のつらら石
    const c = document.createElement('canvas'); c.width = W; c.height = H;
    let g = c.getContext('2d');
    const layer = (base, amp, col, seed, top) => {
      const pts = [[0, H]];
      for (let x = 0; x <= W; x += 20) pts.push([x, base - amp * (0.5 + 0.5 * Math.sin(x * 0.009 + seed)) - 30 * hs(x, seed)]);
      pts.push([W, H]);
      jagged(g, pts); g.fillStyle = col; g.fill();
      if (top) { g.strokeStyle = top; g.lineWidth = 2; g.beginPath(); for (let i = 1; i < pts.length - 1; i++) g.lineTo(pts[i][0], pts[i][1]); g.stroke(); }
    };
    layer(470, 120, '#1a0e10', 1, 'rgba(255,110,50,0.12)');
    layer(560, 90, '#110809', 4, 'rgba(255,120,60,0.18)');
    // 天井
    const top = [[0, 0]];
    for (let x = 0; x <= W; x += 16) {
      const d = 34 + 26 * hs(x, 7);
      top.push([x, d]);
      if (hs(x, 9) > 0.72) { top.push([x + 5, d + 40 + 70 * hs(x, 3)]); top.push([x + 10, d]); }
    }
    top.push([W, 0]);
    jagged(g, top); g.fillStyle = '#0b0607'; g.fill();
    st.back = c;

    // マグマの割れ目（白っぽい線で描いておき、低音の強さで明るさを変えて足し算で貼る）
    const v = document.createElement('canvas'); v.width = W; v.height = H;
    g = v.getContext('2d'); g.lineCap = 'round'; g.lineJoin = 'round';
    const vein = (x, y, a, len, w, depth) => {
      let px = x, py = y;
      g.lineWidth = w; g.beginPath(); g.moveTo(px, py);
      for (let d = 0; d < len; d += 18) {
        a += (Math.random() - 0.5) * 0.7; px += Math.cos(a) * 18; py += Math.sin(a) * 18;
        g.lineTo(px, py);
        if (depth < 2 && Math.random() < 0.08) { g.stroke(); vein(px, py, a + (Math.random() < 0.5 ? -1 : 1) * 0.9, len * 0.4, w * 0.6, depth + 1); g.lineWidth = w; g.beginPath(); g.moveTo(px, py); }
      }
      g.stroke();
    };
    g.strokeStyle = 'rgba(255,120,40,0.75)'; g.shadowColor = 'rgba(255,90,20,1)'; g.shadowBlur = 10;
    for (let i = 0; i < 5; i++) vein(60 + i * 115 + Math.random() * 40, 420 + Math.random() * 120, -Math.PI / 2 + (Math.random() - 0.5) * 1.2, 160 + Math.random() * 160, 3, 0);
    for (let i = 0; i < 5; i++) vein(Math.random() * W, 40, Math.PI / 2 + (Math.random() - 0.5), 60 + Math.random() * 60, 2, 1);
    st.veins = v;

    // 床（玄武岩の六角の柱を上から見たような割れ目）
    const f = document.createElement('canvas'); f.width = W + 200; f.height = H - GROUND_Y + 60;
    g = f.getContext('2d');
    const fg = g.createLinearGradient(0, 0, 0, f.height); fg.addColorStop(0, '#2a1a18'); fg.addColorStop(1, '#070405');
    g.fillStyle = fg; g.fillRect(0, 0, f.width, f.height);
    g.strokeStyle = 'rgba(0,0,0,0.6)'; g.lineWidth = 2;
    for (let row = 0; row < 4; row++) {
      const y = 8 + row * row * 9 + row * 6, hgt = 8 + row * 7;
      for (let x = (row % 2) * 30; x < f.width; x += 60 + row * 10) { g.strokeRect(x, y, 60 + row * 10, hgt); }
    }
    st.floorImg = f;

    // スピーカーの箱（1つぶん: 大きいウーファー2つ）
    const bx = document.createElement('canvas'); bx.width = 120; bx.height = 300;
    g = bx.getContext('2d');
    g.fillStyle = '#141012'; g.fillRect(0, 0, 120, 300);
    g.strokeStyle = '#2c2226'; g.lineWidth = 4; g.strokeRect(2, 2, 116, 296);
    g.fillStyle = 'rgba(255,255,255,0.04)'; for (let y = 6; y < 296; y += 4) g.fillRect(6, y, 108, 1);
    for (const y of [80, 220]) {
      g.fillStyle = '#060405'; g.beginPath(); g.arc(60, y, 52, 0, TAU); g.fill();
      g.strokeStyle = '#3a2e30'; g.lineWidth = 3; g.beginPath(); g.arc(60, y, 52, 0, TAU); g.stroke();
      for (let i = 0; i < 8; i++) { const a = i * TAU / 8; g.fillStyle = '#5a4a48'; g.beginPath(); g.arc(60 + Math.cos(a) * 56, y + Math.sin(a) * 56, 2.5, 0, TAU); g.fill(); }
    }
    st.box = bx;
    // コーン（押し出すと大きく・明るく）
    const cn = document.createElement('canvas'); cn.width = cn.height = 100;
    g = cn.getContext('2d');
    const cg = g.createRadialGradient(50, 50, 4, 50, 50, 46);
    cg.addColorStop(0, '#5a4a4c'); cg.addColorStop(0.25, '#1c1517'); cg.addColorStop(0.85, '#2a2023'); cg.addColorStop(1, '#0a0708');
    g.fillStyle = cg; g.beginPath(); g.arc(50, 50, 46, 0, TAU); g.fill();
    g.strokeStyle = 'rgba(255,255,255,0.08)'; g.lineWidth = 2;
    for (const r of [18, 30, 42]) { g.beginPath(); g.arc(50, 50, r, 0, TAU); g.stroke(); }
    g.fillStyle = '#0d0a0b'; g.beginPath(); g.arc(50, 50, 13, 0, TAU); g.fill();
    g.fillStyle = 'rgba(255,255,255,0.18)'; g.beginPath(); g.arc(46, 46, 5, 0, TAU); g.fill();
    st.cone = cn;
    // 低音で画面のふちが赤く脈打つ（前もって1枚の絵にしておく）
    const ed = document.createElement('canvas'); ed.width = 200; ed.height = 188;
    g = ed.getContext('2d');
    const eg = g.createRadialGradient(100, 94, 50, 100, 94, 140);
    eg.addColorStop(0, 'rgba(255,60,20,0)'); eg.addColorStop(1, 'rgba(255,60,20,1)');
    g.fillStyle = eg; g.fillRect(0, 0, 200, 188);
    st.edge = ed;
  }

  function reset() {
    Object.assign(st, { dust: [], debris: [], lastBeat: -99, quake: 0, kick: 0, sub: 0, crack: null, mag: 0, seisI: 0, lava: [], ripples: [], bass: 0, slice: 0, gi: -1 });
    st.seis.fill(0);
  }

  // 背景に走るひび（衝撃音のたび）
  function newCrack() {
    const segs = [];
    const grow = (x, y, a, n, w) => {
      for (let i = 0; i < n; i++) {
        const nx = x + Math.cos(a) * (30 + Math.random() * 30), ny = y + Math.sin(a) * (30 + Math.random() * 30);
        segs.push([x, y, nx, ny, w]); x = nx; y = ny; a += (Math.random() - 0.5) * 0.8;
        if (Math.random() < 0.15 && w > 1.5) grow(x, y, a + (Math.random() < 0.5 ? -1 : 1), n - i - 1, w * 0.6);
      }
    };
    const cx = 200 + Math.random() * 400, cy = 260 + Math.random() * 160;
    for (let i = 0; i < 6; i++) grow(cx, cy, i * TAU / 6 + Math.random() * 0.5, 9, 4);
    return { segs, x: cx, y: cy };
  }

  function onBeat(b) {
    if (!IMPACTS) {
      const S = SCORE_TECTONIC;
      IMPACTS = new Set(S.impact); KICKS = new Set(S.kick.map(x => Math.round(x * 4) / 4)); SUBDROPS = new Set(S.subdrop); CRASHES = new Set(S.crash);
    }
    if (IMPACTS.has(b)) {
      st.quake = 1; st.crack = newCrack();
      shake(b >= 64 ? 18 : 12); punch(0.05); window.flash(b === 0 ? 0.2 : 0.45);
      if (b > 0) {
        st.slice = 1;
        shockRing(W / 2, GROUND_Y, { color: '#ffb02e', size: 900, life: 0.9, width: 10 });
        shockRing(W / 2, GROUND_Y, { color: '#ffffff', size: 520, life: 0.5, width: 4 });
        for (let j = 0; j < 7; j++) {                                       // 割れ目からマグマが噴き上がる（背景）
          const x = 60 + j * 113 + (Math.random() - 0.5) * 40;
          for (let i = 0; i < [8, 14, 20][gfx]; i++) st.lava.push({ x, y: GROUND_Y - 60 - Math.random() * 60, vx: (Math.random() - 0.5) * 160, vy: -(380 + Math.random() * 520), life: 1.4 + Math.random() * 0.8, r: 2 + Math.random() * 4 });
        }
      }
      for (let i = 0; i < 40; i++) st.debris.push({ x: Math.random() * W, y: 30 + Math.random() * 40, vx: (Math.random() - 0.5) * 40, vy: 40 + Math.random() * 120, r: 1.5 + Math.random() * 4, rot: Math.random() * TAU });
    }
    if (SUBDROPS.has(b)) st.sub = 1;
    if (CRASHES.has(b)) for (let i = 0; i < 14; i++) st.debris.push({ x: Math.random() * W, y: 40, vx: 0, vy: 80 + Math.random() * 80, r: 1 + Math.random() * 2.5, rot: 0 });
  }

  function update(dt, T, look) {
    if (!st.made) make();
    const bp = inSong() ? beatPos(T) : titleBeat();
    if (scene === 'play') {
      const b = Math.floor(bp + 0.02);
      if (b !== st.lastBeat) { if (b === st.lastBeat + 1 || st.lastBeat < 0) onBeat(b); st.lastBeat = b; }
      const q = Math.round(bp * 4) / 4;
      if (KICKS && KICKS.has(q) && Math.abs(bp - q) < 0.05 && st.kickQ !== q) { st.kickQ = q; st.kick = 1; st.ripples.push({ t: 0 }); }
      // ベースが鳴るたび: 画面のふちが脈打つ。重い音（ワァオ・落ちる・金切り声）は画面が横にずれる
      if (!GROWLS) GROWLS = SCORE_TECTONIC.growl;
      if (st.gi < 0) { st.gi = 0; while (st.gi < GROWLS.length && GROWLS[st.gi][0] < bp - 0.05) st.gi++; }
      while (st.gi < GROWLS.length && GROWLS[st.gi][0] <= bp) {
        const sh = GROWLS[st.gi][3];
        st.bass = 1;
        if (sh === 'wow' || sh === 'dive' || sh === 'screech') { st.slice = Math.max(st.slice, 0.45); shake(5); } else shake(2.5);
        st.gi++;
      }
    }
    st.quake = Math.max(0, st.quake - dt * 0.7);
    st.kick = Math.max(0, st.kick - dt * 5);
    st.sub = Math.max(0, st.sub - dt * 1.2);
    st.bass = Math.max(0, st.bass - dt * 4);
    st.slice = Math.max(0, st.slice - dt * 3);
    for (const r of st.ripples) r.t += dt;
    st.ripples = st.ripples.filter(r => r.t < 0.6);
    for (const p of st.lava) { p.vy += 900 * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; }
    st.lava = st.lava.filter(p => p.life > 0 && p.y < GROUND_Y + 10);
    const lo = inSong() ? songEnv(0, T) : 0.4 + 0.4 * kickOf(bp);
    st.mag += ((2 + 7.2 * Math.pow(lo, 1.4)) - st.mag) * Math.min(1, dt * 4);
    // 地震計: 低音の強さ × ぶるぶる
    const mid = inSong() ? songEnv(2, T) : 0.2;
    st.seis[st.seisI] = (Math.random() * 2 - 1) * (0.08 + lo * 0.8 + mid * 0.3);
    st.seisI = (st.seisI + 1) % st.seis.length;
    // 空中のちり・岩くず
    if (st.dust.length < 70 && Math.random() < dt * 30) st.dust.push({ x: Math.random() * W, y: -5, v: 10 + Math.random() * 30, z: 0.3 + Math.random() * 0.7 });
    for (const d of st.dust) { d.y += d.v * dt * (1 + 3 * st.quake); d.x += Math.sin(T + d.y * 0.02) * 6 * dt; }
    st.dust = st.dust.filter(d => d.y < GROUND_Y);
    for (const d of st.debris) { d.vy += 600 * dt; d.x += d.vx * dt; d.y += d.vy * dt; d.rot += dt * 4; }
    st.debris = st.debris.filter(d => d.y < GROUND_Y);
    // サブドロップ: ぐっと沈む
    if (st.sub > 0) punch(0.035 * st.sub);
  }

  // ---- 背景 ------------------------------------------------------------------------------
  function background(T, look, k, bk, bp) {
    if (!st.made) make();
    const lo = inSong() ? songEnv(0, T) : 0.3 + 0.4 * k;
    const bg = cachedLayer('quakeBg', 2, 0, g => {
      const sk = g.createLinearGradient(0, 0, 0, H);
      sk.addColorStop(0, rgba(look.skyTop, 1)); sk.addColorStop(0.7, rgba(look.skyBot, 1)); sk.addColorStop(1, rgba(mixC(look.skyBot, MAGMA, 0.35), 1));
      g.fillStyle = sk; g.fillRect(0, 0, W, H);
      // 下からのマグマの光（低音で強くなる）
      const mg = g.createRadialGradient(W / 2, GROUND_Y + 120, 40, W / 2, GROUND_Y + 120, 620);
      mg.addColorStop(0, rgba(mixC(MAGMA, look.color, 0.4), 0.16 + 0.3 * lo * lo)); mg.addColorStop(1, 'rgba(255,60,20,0)');
      g.fillStyle = mg; g.fillRect(0, 0, W, H);
      g.drawImage(st.back, 0, 0, W, H);
      g.globalCompositeOperation = 'lighter';
      g.globalAlpha = Math.min(1, 0.08 + 0.5 * lo * lo * lo + 0.5 * st.quake);
      g.drawImage(st.veins, 0, 0, W, H);
      g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
    });
    ctx.drawImage(bg, 0, 0, W, H);
    // ドロップの直前: 背景が真っ暗になって、音が吸いこまれる（弾は暗くしない）
    const pre = inSong() ? Math.max(...DROPS.map(D => bp >= D - 1.5 && bp < D ? (bp - (D - 1.5)) / 1.5 : 0)) : 0;
    if (pre > 0) { ctx.fillStyle = `rgba(0,0,0,${(0.85 * pre).toFixed(3)})`; ctx.fillRect(0, 0, W, H); }
    // 噴き上がるマグマ
    if (st.lava.length) {
      ctx.globalCompositeOperation = 'lighter';
      ctx.lineCap = 'round';
      for (const p of st.lava) {                                          // 細い光のすじ（弾とまちがえないよう、丸にしない・うすく）
        const a = clamp01(p.life / 1.2);
        ctx.strokeStyle = rgba(mixC([200, 40, 10], MAGMA, a), 0.4 * a); ctx.lineWidth = p.r * 0.7;
        ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x - p.vx * 0.05, p.y - p.vy * 0.05); ctx.stroke();
      }
      ctx.globalCompositeOperation = 'source-over';
    }

    // 衝撃のひび（白く光ってから赤く冷えていく）
    if (st.crack && st.quake > 0.02) {
      const a = st.quake;
      ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = rgba(mixC(MAGMA, WHITE, a * 0.7), a); ctx.lineCap = 'round';
      ctx.globalAlpha = 0.7;
      for (const s of st.crack.segs) { ctx.lineWidth = s[4] * (0.3 + 0.7 * a); ctx.beginPath(); ctx.moveTo(s[0], s[1]); ctx.lineTo(s[2], s[3]); ctx.stroke(); }
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    }

    // 地震計の線（上のほう）
    ctx.strokeStyle = rgba(mixC(look.color, WHITE, 0.3), 0.35 + 0.3 * lo); ctx.lineWidth = 1.5;
    ctx.beginPath();
    const n = st.seis.length;
    for (let i = 0; i < n; i++) { const v = st.seis[(st.seisI + i) % n]; ctx.lineTo(120 + i * (W - 240) / n, 86 + v * 26); }
    ctx.stroke();
    ctx.fillStyle = rgba(look.color, 0.5); ctx.fillRect(W - 122, 74, 2, 24);

    // スピーカーの山（左右）: コーンが低音で押し出す
    const pump = Math.min(1, lo * 0.9 + st.kick * 0.5);
    for (const side of [0, 1]) {
      const x0 = side ? W - 110 : -10;
      for (const [y0, s] of [[GROUND_Y - 300, 1], [GROUND_Y - 560, 0.75]]) {
        ctx.drawImage(st.box, x0 + (side ? 0 : 0), y0, 120 * s, 300 * s);
        for (const cy of [80, 220]) {
          const R = (46 + 7 * pump) * s, cx = x0 + 60 * s, yy = y0 + cy * s;
          ctx.drawImage(st.cone, cx - R, yy - R, R * 2, R * 2);
          if (pump > 0.4 && gfx > 0) {
            ctx.strokeStyle = rgba(look.color, (pump - 0.4) * 0.6); ctx.lineWidth = 2;
            ctx.beginPath(); ctx.arc(cx, yy, R + 8 + 20 * (1 - st.kick), 0, TAU); ctx.stroke();
          }
        }
      }
    }

    // ちり（ゆっくり）・岩くず（衝撃のあと）
    ctx.fillStyle = 'rgba(255,190,150,0.35)';
    for (const d of st.dust) ctx.fillRect(d.x, d.y, 1 + d.z, 1 + d.z);
    ctx.fillStyle = '#3a2a26';
    for (const d of st.debris) {
      ctx.beginPath(); ctx.moveTo(d.x + Math.cos(d.rot) * d.r, d.y + Math.sin(d.rot) * d.r);
      ctx.lineTo(d.x + Math.cos(d.rot + 2.2) * d.r, d.y + Math.sin(d.rot + 2.2) * d.r); ctx.lineTo(d.x + Math.cos(d.rot + 4.1) * d.r, d.y + Math.sin(d.rot + 4.1) * d.r);
      ctx.closePath(); ctx.fill();
    }
  }

  // ---- 床と足場 ----------------------------------------------------------------------------
  function floor(look, k) {
    const T = inSong() ? songTime : titleClock();
    const lo = inSong() ? songEnv(0, T) : 0.3;
    ctx.drawImage(st.floorImg, -100, GROUND_Y);
    ctx.fillStyle = '#070405'; ctx.fillRect(-400, GROUND_Y + st.floorImg.height - 1, W + 800, 500);
    ctx.fillRect(-400, GROUND_Y, 300, 500); ctx.fillRect(W + 100, GROUND_Y, 300, 500);
    // 割れ目からマグマの光（キックで明るく）
    ctx.globalCompositeOperation = 'lighter';
    const glow = 0.2 + 0.5 * lo + 0.4 * st.kick;
    ctx.strokeStyle = rgba(mixC(MAGMA, EMBER, 0.3), glow); ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i < 9; i++) {
      let x = 40 + i * 90 + 20 * hs(i, 1), y = GROUND_Y + 4;
      ctx.moveTo(x, y);
      for (let j = 0; j < 4; j++) { x += (hs(i, j) - 0.5) * 30; y += 10 + j * 6; ctx.lineTo(x, y); }
    }
    ctx.stroke();
    // キック: 床の上を光の波が左右へ走る
    for (const r of st.ripples) {
      const a = 1 - r.t / 0.6, d = r.t * 900;
      ctx.fillStyle = rgba(mixC(EMBER, WHITE, 0.3), 0.6 * a);
      for (const x of [W / 2 - d, W / 2 + d]) ctx.fillRect(x - 40, GROUND_Y - 1, 80, 3);
      ctx.fillStyle = rgba(MAGMA, 0.25 * a);
      for (const x of [W / 2 - d, W / 2 + d]) ctx.fillRect(x - 70, GROUND_Y + 2, 140, 10);
    }
    ctx.globalCompositeOperation = 'source-over';
  }
  function platform(p, look, k) {
    ctx.fillStyle = '#231817';
    ctx.beginPath(); ctx.moveTo(p.x, p.y);
    for (let x = p.x; x <= p.x + p.w; x += 14) ctx.lineTo(x, p.y + ((x * 7) % 3) - 1);
    ctx.lineTo(p.x + p.w, p.y + p.h); ctx.lineTo(p.x + 4, p.y + p.h + 3); ctx.closePath(); ctx.fill();
    ctx.fillStyle = rgba(mixC(MAGMA, EMBER, 0.4), 0.35 + 0.4 * st.kick);
    ctx.fillRect(p.x + 4, p.y + p.h - 2, p.w - 8, 2);
  }

  // ---- 弾 ----------------------------------------------------------------------------------
  function rockPath(x, y, r, rot, seed) {
    ctx.beginPath();
    for (let i = 0; i < 7; i++) {
      const a = rot + i * TAU / 7, rr = r * (0.82 + 0.3 * hs(seed, i));
      if (i === 0) ctx.moveTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); else ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
    }
    ctx.closePath();
  }
  function bullet(b, c, k) {
    if (b.style === 'sonic') {                                         // 音の輪
      ctx.strokeStyle = rgba(c, 1); ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, TAU); ctx.stroke();
      ctx.fillStyle = rgba(c, 0.25); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.9)'; ctx.beginPath(); ctx.arc(b.x, b.y, b.r * 0.35, 0, TAU); ctx.fill();
      return;
    }
    if (b.style === 'rock') {                                          // 岩: ごつごつ ＋ 赤熱した割れ目
      const seed = b.seed || (b.seed = Math.random() * 100), rot = (b.age || 0) * 3 + seed;
      rockPath(b.x, b.y, b.r * 1.1, rot, seed);
      ctx.fillStyle = rgba(mixC(c, [40, 24, 20], 0.55), 1); ctx.fill();
      ctx.strokeStyle = rgba(mixC(c, WHITE, 0.45), 1); ctx.lineWidth = 2.5; ctx.stroke();
      ctx.fillStyle = rgba(mixC(c, WHITE, 0.5), 0.9);
      ctx.beginPath(); ctx.arc(b.x, b.y, b.r * 0.35, 0, TAU); ctx.fill();
      return;
    }
    // 溶けた玉: 黒いかさぶた ＋ 中が光る
    ctx.fillStyle = rgba(c, 1);
    ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgba(255,240,200,0.95)';
    ctx.beginPath(); ctx.arc(b.x, b.y, b.r * 0.5, 0, TAU); ctx.fill();
  }

  // 地割れの波: 予告 = 地面に光るひび（進む向きに矢印）。走りだすと、とがった岩の山がマグマを散らしながら進む
  function quake(b, T, k) {
    const c = bulletColor(b), y = GROUND_Y;
    if (b.delay > 0) {
      const p = b.delayMax > 0 ? 1 - b.delay / b.delayMax : 1, on = p > 0.7 || Math.floor(T * 14) % 2 === 0;
      const x0 = Math.max(0, Math.min(W, b.x0)), len = Math.min(260, 120 + 200 * p);
      ctx.strokeStyle = rgba(c, on ? 0.35 + 0.55 * p : 0.15); ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(x0, y - 2);
      for (let d = 0; d <= len; d += 14) ctx.lineTo(x0 + b.dir * d, y - 2 - (d % 28 ? 4 : 0) * p);
      ctx.stroke();
      ctx.fillStyle = rgba(c, on ? 0.9 : 0.3);
      const ax = x0 + b.dir * (len + 12);
      ctx.beginPath(); ctx.moveTo(ax + b.dir * 14, y - 18); ctx.lineTo(ax, y - 28); ctx.lineTo(ax, y - 8); ctx.closePath(); ctx.fill();
      ctx.font = '800 13px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('▲', x0 + b.dir * 40, y - 30 - 4 * p);
      return;
    }
    const h = b.h, HALF = 34;
    ctx.fillStyle = '#2a1a16';
    ctx.beginPath(); ctx.moveTo(b.x - HALF, y);
    ctx.lineTo(b.x - HALF * 0.55, y - h * 0.45); ctx.lineTo(b.x - HALF * 0.2, y - h * 0.75); ctx.lineTo(b.x, y - h);
    ctx.lineTo(b.x + HALF * 0.25, y - h * 0.7); ctx.lineTo(b.x + HALF * 0.6, y - h * 0.4); ctx.lineTo(b.x + HALF, y); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = rgba(c, 1); ctx.lineWidth = 2.5; ctx.stroke();
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = rgba(mixC(c, WHITE, 0.4), 0.9); ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(b.x, y - h * 0.9); ctx.lineTo(b.x - 4, y - h * 0.5); ctx.lineTo(b.x + 3, y - h * 0.2); ctx.lineTo(b.x, y); ctx.stroke();
    ctx.globalCompositeOperation = 'source-over';
    if (Math.random() < 0.5) sparks(b.x - b.dir * HALF * 0.6, y - 4, { n: 2, color: '#ff8a3a', speed: 160, life: 0.4, size: 2.5, gravity: 700, dir: -Math.PI / 2 - b.dir * 0.6, spread: 0.8 });
  }

  // スピーカー（宙に浮かぶ）: 予告 = うすく現れる。鳴るたびにコーンが押し出し、輪が広がる
  function speakerKind(b, T, k) {
    const c = bulletColor(b);
    const p = b.delay > 0 ? (b.delayMax > 0 ? 1 - b.delay / b.delayMax : 1) : 1;
    const fade = b.beats && !b.beats.length ? clamp01(1 - b.out / 0.5) : 1;
    const R = b.size, x = b.x, y = b.y;
    ctx.save(); ctx.globalAlpha = (0.25 + 0.75 * p) * fade;
    ctx.fillStyle = '#120d0f'; roundRect(x - R * 1.25, y - R * 1.25, R * 2.5, R * 2.5, 10); ctx.fill();
    ctx.strokeStyle = rgba(c, 0.6 + 0.4 * (b.pump || 0)); ctx.lineWidth = 2; ctx.stroke();
    const rr = R * (0.95 + 0.14 * (b.pump || 0));
    ctx.drawImage(st.cone, x - rr, y - rr, rr * 2, rr * 2);
    if (b.delay > 0) {
      const on = p > 0.7 || Math.floor(T * 14) % 2 === 0;
      ctx.strokeStyle = rgba(c, on ? 0.7 : 0.2); ctx.lineWidth = 2; ctx.setLineDash([6, 6]); ctx.lineDashOffset = -T * 60;
      ctx.beginPath(); ctx.arc(x, y, R * 1.7 - 16 * p, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
    } else if (b.pump > 0.05) {
      ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = rgba(c, b.pump * 0.8); ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(x, y, R + (1 - b.pump) * 50, 0, TAU); ctx.stroke();
    }
    ctx.restore();
  }

  // イコライザーの棒: LED のブロックが積み上がる。予告 = 点線のわく ＋ 低い棒には「▲」
  function laser(b, c, T, k) {
    if (!b.eq) return false;
    const x = b.x1, w = b.bw, top = GROUND_Y - b.eq, SEG = 14;
    if (b.delay > 0) {
      const p = b.delayMax > 0 ? 1 - b.delay / b.delayMax : 1, on = p > 0.7 || Math.floor(T * 14) % 2 === 0;
      ctx.fillStyle = rgba(c, 0.05 + 0.12 * p); ctx.fillRect(x - w / 2, top, w, b.eq);
      ctx.strokeStyle = rgba(c, on ? 0.35 + 0.5 * p : 0.12); ctx.lineWidth = 1.5; ctx.setLineDash([5, 5]);
      ctx.strokeRect(x - w / 2, top, w, b.eq); ctx.setLineDash([]);
      if (b.eq < 80) {
        ctx.font = '800 14px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillStyle = rgba(mixC(c, WHITE, 0.5), on ? 0.95 : 0.4); ctx.fillText('▲', x, top - 16 - 5 * p);
      }
      return true;
    }
    const fade = b.safe ? clamp01(1 - (b.age - b.hold) / 0.3) : 1;
    const grow = clamp01(b.age / 0.05);
    const n = Math.max(1, Math.round(b.eq * grow / SEG));
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < n; i++) {
      const u = i / Math.max(1, b.eq / SEG), col = u > 0.7 ? mixC(c, [255, 60, 60], 0.8) : u > 0.45 ? mixC(c, [255, 230, 80], 0.5) : c;
      ctx.fillStyle = rgba(col, 0.85 * fade);
      ctx.fillRect(x - w / 2 + 2, GROUND_Y - (i + 1) * SEG + 2, w - 4, SEG - 4);
    }
    if (gfx > 0) { ctx.fillStyle = rgba(c, 0.15 * fade); ctx.fillRect(x - w / 2 - 6, top - 6, w + 12, b.eq + 6); }
    ctx.globalCompositeOperation = 'source-over';
    return true;
  }

  function fire(b) {
    if (b.kind === 'quake') { shake(4); sparks(b.x, GROUND_Y - 6, { n: 14, color: '#ff8a3a', speed: 300, life: 0.5, size: 3, gravity: 800, dir: -Math.PI / 2, spread: 1.6 }); return true; }
    if (b.kind === 'speaker') { shockRing(b.x, b.y, { color: '#36e2ff', size: 120, life: 0.4, width: 3 }); return true; }
    if (b.eq) { if (b.eq > 100) shake(2); return false; }
    return false;
  }

  function flash() {
    ctx.fillStyle = `rgba(255,200,150,${(0.38 * flashT).toFixed(3)})`;
    ctx.fillRect(0, 0, W, H);
  }

  // 場面の名前（ずっしり・ゆれる）＋ 右はしの震度メーター
  function banner() {
    if (scene === 'play' && gfx === 2 && st.slice > 0.03) {              // 重い音: 画面が横の帯ごとにずれる
      const Rs = renderScale, amp = 18 * st.slice;
      if (!st.buf) st.buf = document.createElement('canvas');
      if (st.buf.width !== cv.width || st.buf.height !== cv.height) { st.buf.width = cv.width; st.buf.height = cv.height; }
      st.buf.getContext('2d').drawImage(cv, 0, 0);
      const seed = Math.floor(songTime * 30);
      for (let y = 0; y < H; y += 60) {
        const dx = (hs(seed, y) - 0.5) * 2 * amp;
        if (Math.abs(dx) > 2) ctx.drawImage(st.buf, 0, y * Rs, W * Rs, 60 * Rs, dx, y, W, 60);
      }
    }
    if (scene === 'play' && gfx > 0 && st.bass > 0.03) {               // ベースで画面のふちが赤く脈打つ
      ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.28 * st.bass;
      ctx.drawImage(st.edge, 0, 0, W, H);
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    }
    if (scene === 'play') {
      const m = st.mag, p = clamp01((m - 2) / 7.2), x = W - 20, y0 = 120, hgt = 240;
      ctx.fillStyle = 'rgba(255,255,255,0.08)'; ctx.fillRect(x - 3, y0, 6, hgt);
      const g = ctx.createLinearGradient(0, y0 + hgt, 0, y0);
      g.addColorStop(0, '#ffb02e'); g.addColorStop(0.6, '#ff5a1f'); g.addColorStop(1, '#ff2d55');
      ctx.fillStyle = g; ctx.fillRect(x - 3, y0 + hgt * (1 - p), 6, hgt * p);
      ctx.font = '800 12px ui-monospace, Menlo, monospace'; ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
      ctx.fillStyle = rgba(mixC(MAGMA, WHITE, 0.5), 0.9);
      ctx.fillText(`M ${m.toFixed(1)}`, x - 8, y0 + hgt * (1 - p));
    }
    const bn = fx.banner;
    if (!bn) return;
    const e = bn.age, DUR = 2.6;
    if (e > DUR) { fx.banner = null; return; }
    const a = e < 0.15 ? e / 0.15 : e > DUR - 0.6 ? (DUR - e) / 0.6 : 1;
    const j = Math.max(0, 0.5 - e) * 16;                                   // 出だしはガタガタゆれる
    ctx.save();
    ctx.globalAlpha = clamp01(a);
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = '900 50px Impact, "Arial Black", system-ui, sans-serif';
    if ('letterSpacing' in ctx) ctx.letterSpacing = '6px';
    const x = W / 2 + (Math.random() - 0.5) * j, y = 128 + (Math.random() - 0.5) * j;
    ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillText(bn.name, x + 3, y + 4);
    const g = ctx.createLinearGradient(0, y - 26, 0, y + 26);
    g.addColorStop(0, '#fff3d6'); g.addColorStop(0.5, rgba(mixC(bn.c, EMBER, 0.3), 1)); g.addColorStop(1, rgba(mixC(bn.c, [80, 0, 0], 0.4), 1));
    ctx.fillStyle = g; ctx.fillText(bn.name, x, y);
    if ('letterSpacing' in ctx) ctx.letterSpacing = '3px';
    if (bn.sub) { ctx.font = '600 14px system-ui, sans-serif'; ctx.fillStyle = 'rgba(255,225,200,0.85)'; ctx.fillText(bn.sub, W / 2, 168); }
    if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';
    ctx.restore();
  }

  // タイトル画面: まんなかに大きなスピーカーが1つ、拍に合わせて押し出す
  function title(look, k, bp) {
    if (!st.made) make();
    const R = 70 + 12 * k, x = W / 2, y = 300;
    ctx.fillStyle = '#120d0f'; roundRect(x - 100, y - 100, 200, 200, 14); ctx.fill();
    ctx.strokeStyle = rgba(look.color, 0.5 + 0.4 * k); ctx.lineWidth = 2; ctx.stroke();
    ctx.drawImage(st.cone, x - R, y - R, R * 2, R * 2);
    for (let i = 0; i < 3; i++) {
      const p = ((bp + i / 3) % 1);
      ctx.strokeStyle = rgba(look.color, 0.5 * (1 - p)); ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(x, y, 90 + p * 200, 0, TAU); ctx.stroke();
    }
  }

  THEMES.quake = {
    noTrails: true, glow: 1.8,
    clearColors: ['#ff5a1f', '#ffb02e', '#ff2d55', '#36e2ff', '#fff3d6'],
    kinds: { quake, speaker: speakerKind },
    reset, update, background, floor, platform, bullet, laser, fire, flash, banner, title,
  };
  // 曲が変わったら、この見た目のセットの絵を手放す（次に使うときに作り直す。メモリがふくらんで重くならないように）
  THEMES.quake.release = () => { freeArt(st); st.made = false; };
})();
