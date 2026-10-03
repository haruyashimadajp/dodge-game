"use strict";

/* =========================================================================
   見た目のセット「shiki」  —  曲⑫「Shiki（四季）」用
   動く水墨画。和紙の上に、遠い山なみ（墨のにじみ ＋ 霧）、左の大きな木、水面の床。
   季節がかわるたびに、墨が一滴落ちて画面に広がり、大きな筆文字（春・夏・秋・冬）と赤い落款が押される。
     序   … 白い和紙。木は枝だけ
     春   … 夜明けの薄紅の空、かすんだ日。桜が満開で、花びらが舞う
     夏   … 夜。満月と星、水面に灯籠が流れ、ホタルが飛ぶ。花火が夜空に咲く（背景にも、たくさん）
     秋   … 夕焼け。大きな月が山の向こうに。もみじが風に舞い、水辺にすすき
     冬   … 雪の夜。三日月、山に雪、水面は氷。空にはオーロラ、雪がふる
     輪廻 … 金色の朝日と光の筋。花びらと金の粉が舞う
   攻撃の見た目:
     墨の一筆 … 予告はうすい墨のにじみ（危ない所が全部見える）。そのあと筆が走り、かすれのある太い線になる。
                 夜の季節には、月の光のような白い墨になる
     桜の枝   … 枝の先に花がひらく。乾くと花びらになって散る
     花火     … 玉が上がって、光の筋がひらく
     つらら・オーロラ・もみじ・霜の線 … それぞれの形で描く
   ========================================================================= */

(function () {
  const PAPER = [244, 236, 220];
  const WHITE = [255, 255, 255];
  const MOONINK = [236, 232, 255];
  const st = { made: false, mtn: null, tree: null, canopy: null, tex: null, stars: null, petals: [], leaves: [], snow: [], flies: [], lanterns: [], fws: [], blooms: [], lastBeat: -99, gone: [],
    stains: null, splats: [], shooters: [], geese: [], streaks: [], gold: [], ripples: [], snowDepth: 0, lastHits: 0, torii: null, frame: null };
  let FW = null, TAIKO_BIG = null;
  const inSong = () => scene !== 'title';
  const hsh = (a, b = 0) => { const v = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return v - Math.floor(v); };

  // ---- 季節の重み（境目の前後 1.5 拍で、なめらかに入れかわる）--------------------------------
  const BOUNDS = [[16, 'spring'], [80, 'summer'], [144, 'autumn'], [208, 'winter'], [264, 'rebirth'], [296, 'end']];
  function seasons(bp) {
    const w = { paper: 1, spring: 0, summer: 0, autumn: 0, winter: 0, rebirth: 0, end: 0 };
    if (!inSong()) { w.paper = 0; w.spring = 1; return w; }
    for (const [s, name] of BOUNDS) {
      const k = clamp01((bp - s + 1.5) / 3);
      if (k <= 0) break;
      for (const key in w) w[key] *= 1 - k;
      w[name] += k;
    }
    return w;
  }
  let SW = seasons(0);
  const springish = () => SW.spring + SW.rebirth + SW.end * 0.6;
  const night = () => SW.summer + SW.winter;

  // ---- 前もって描いておく絵（山なみ・木・樹冠・和紙）----------------------------------------------
  function make() {
    st.made = true;
    // 和紙の繊維
    const t = document.createElement('canvas'); t.width = t.height = 128;
    const g = t.getContext('2d');
    for (let i = 0; i < 700; i++) {
      g.strokeStyle = `rgba(120,100,80,${(Math.random() * 0.06).toFixed(3)})`; g.lineWidth = 0.6;
      const x = Math.random() * 128, y = Math.random() * 128, a = Math.random() * TAU, l = 2 + Math.random() * 9;
      g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + Math.cos(a + 0.6) * l * 0.5, y + Math.sin(a + 0.6) * l * 0.5, x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke();
    }
    for (let i = 0; i < 900; i++) { g.fillStyle = `rgba(90,70,50,${(Math.random() * 0.05).toFixed(3)})`; g.fillRect(Math.random() * 128, Math.random() * 128, 1, 1); }
    st.tex = ctx.createPattern(t, 'repeat');

    // 山なみ: 3つの層 × 昼の墨 / 夜の青 / 雪
    st.mtn = [0, 1, 2].map(i => {
      const w = W * 1.6, h = 360, base = [250, 300, 360][i], amp = [120, 95, 70][i];
      const ridge = [];
      for (let x = 0; x <= w; x += 8) {
        const u = x / w * TAU;
        ridge.push(base - amp * (0.55 * Math.abs(Math.sin(u * (1.5 + i * 0.7) + i)) + 0.3 * Math.sin(u * (4.1 + i) + i * 2) ** 2 + 0.15 * Math.sin(u * 11 + i * 5)));
      }
      const draw = (col, a, snow) => {
        const c = document.createElement('canvas'); c.width = w; c.height = h + 40;
        const q = c.getContext('2d');
        const gr = q.createLinearGradient(0, 40, 0, h);
        gr.addColorStop(0, rgba(col, a)); gr.addColorStop(0.55, rgba(col, a * 0.45)); gr.addColorStop(1, rgba(col, 0));
        q.fillStyle = gr;
        q.beginPath(); q.moveTo(0, h + 40);
        ridge.forEach((y, j) => q.lineTo(j * 8, y));
        q.lineTo(w, h + 40); q.closePath(); q.fill();
        q.strokeStyle = rgba(col, Math.min(1, a * 1.3)); q.lineWidth = 2.2 - i * 0.5;    // 稜線の筆の線
        q.beginPath(); ridge.forEach((y, j) => q.lineTo(j * 8, y + Math.sin(j * 1.7) * 0.8)); q.stroke();
        q.strokeStyle = rgba(col, a * 0.35); q.lineWidth = 1;                        // しわ（皴法）
        for (let j = 4; j < ridge.length - 4; j += 3) {
          if ((j * 7) % 5 > 1) continue;
          q.beginPath(); q.moveTo(j * 8, ridge[j] + 4); q.quadraticCurveTo(j * 8 + 6, ridge[j] + 30, j * 8 - 4, ridge[j] + 60 + (j % 4) * 10); q.stroke();
        }
        if (snow) {                                                             // 雪をかぶった頂
          q.fillStyle = 'rgba(245,250,255,0.85)';
          const top = Math.min(...ridge), lo = Math.max(...ridge);
          q.beginPath();
          ridge.forEach((y, j) => q.lineTo(j * 8, y));
          for (let j = ridge.length - 1; j >= 0; j--) {
            const hgt = clamp01((lo - ridge[j]) / (lo - top) - 0.45) / 0.55;      // 高い所ほど、雪が厚い
            q.lineTo(j * 8, ridge[j] + hgt * (14 + 10 * Math.abs(Math.sin(j * 0.9))));
          }
          q.closePath(); q.fill();
        }
        return c;
      };
      return { day: draw([28, 22, 30], 0.32 + i * 0.12, false), night: draw([120, 140, 200], 0.18 + i * 0.07, false), snow: draw([170, 190, 225], 0.2 + i * 0.08, true), w, speed: 3 + i * 4 };
    });

    // 左の大きな木（枝は墨）＋ 季節ごとの樹冠
    const tc = document.createElement('canvas'); tc.width = 420; tc.height = 620;
    const q = tc.getContext('2d');
    const tips = [];
    const limb = (x, y, a, len, w, d) => {
      const ex = x + Math.cos(a) * len, ey = y + Math.sin(a) * len;
      const mx = (x + ex) / 2 + Math.cos(a + 1.57) * len * 0.12 * (d % 2 ? 1 : -1), my = (y + ey) / 2 + Math.sin(a + 1.57) * len * 0.12;
      q.strokeStyle = `rgba(26,20,24,${(0.85).toFixed(2)})`; q.lineWidth = w; q.lineCap = 'round';
      q.beginPath(); q.moveTo(x, y); q.quadraticCurveTo(mx, my, ex, ey); q.stroke();
      q.strokeStyle = 'rgba(244,236,220,0.25)'; q.lineWidth = Math.max(0.5, w * 0.12);         // かすれ
      q.beginPath(); q.moveTo(x + w * 0.2, y); q.quadraticCurveTo(mx + w * 0.2, my, ex, ey); q.stroke();
      if (d <= 0 || len < 14) { tips.push([ex, ey]); return; }
      const n = d > 3 ? 2 : 3;
      for (let i = 0; i < n; i++) limb(ex, ey, a + (i - (n - 1) / 2) * (0.5 + 0.1 * d) + Math.sin(d * 3 + i) * 0.2, len * (0.68 + 0.08 * Math.sin(i + d)), w * 0.62, d - 1);
    };
    limb(70, 620, -1.45, 170, 30, 6);
    st.tree = tc;
    const canopyFor = (cols, n, rmin, rmax, shape) => {
      const c = document.createElement('canvas'); c.width = 420; c.height = 620;
      const z = c.getContext('2d');
      for (let i = 0; i < n; i++) {
        const [x, y] = tips[(i * 7) % tips.length];
        const px = x + (hsh(i) - 0.5) * 50, py = y + (hsh(i, 1) - 0.5) * 40, r = rmin + hsh(i, 2) * (rmax - rmin);
        z.fillStyle = cols[i % cols.length];
        if (shape === 'flower') {
          for (let p = 0; p < 5; p++) { const a = p * TAU / 5 + i; z.beginPath(); z.ellipse(px + Math.cos(a) * r * 0.55, py + Math.sin(a) * r * 0.55, r * 0.55, r * 0.35, a, 0, TAU); z.fill(); }
          z.fillStyle = 'rgba(200,60,90,0.6)'; z.beginPath(); z.arc(px, py, r * 0.18, 0, TAU); z.fill();
        } else if (shape === 'snow') {
          z.beginPath(); z.ellipse(px, py - 3, r, r * 0.4, 0, Math.PI, TAU); z.fill();
        } else { z.globalAlpha = 0.55 + 0.4 * hsh(i, 3); z.beginPath(); z.arc(px, py, r, 0, TAU); z.fill(); z.globalAlpha = 1; }
      }
      return c;
    };
    st.canopy = {
      spring: canopyFor(['rgba(255,214,226,0.95)', 'rgba(248,180,200,0.95)', 'rgba(255,236,242,0.95)'], 260, 5, 9, 'flower'),
      summer: canopyFor(['#2f5a3a', '#3f7a48', '#24462e', '#4f8a50'], 240, 7, 14, 'dot'),
      autumn: canopyFor(['#d8452a', '#f08a2a', '#b8281e', '#f0b030'], 240, 6, 12, 'dot'),
      winter: canopyFor(['rgba(250,252,255,0.95)'], 120, 6, 12, 'snow'),
    };
    st.stars = Array.from({ length: 90 }, (_, i) => ({ x: hsh(i, 9) * W, y: hsh(i, 8) * 380, s: 0.6 + hsh(i, 7) * 1.4, p: hsh(i, 6) * TAU }));
    st.lanterns = Array.from({ length: 6 }, (_, i) => ({ x: i * 150 + hsh(i) * 80, v: 8 + hsh(i, 1) * 10 }));
    st.flies = Array.from({ length: 36 }, (_, i) => ({ x: hsh(i, 4) * W, y: 380 + hsh(i, 5) * 300, p: hsh(i, 6) * TAU }));
    // 墨の跡（乾いた一筆が、紙にうすく残る）。半分の大きさ
    st.stains = document.createElement('canvas'); st.stains.width = W / 2; st.stains.height = H / 2;
    // 水の中に立つ鳥居
    const tr = document.createElement('canvas'); tr.width = 200; tr.height = 230;
    const z = tr.getContext('2d');
    z.fillStyle = '#c0391f';
    z.fillRect(42, 40, 14, 190); z.fillRect(144, 40, 14, 190);                 // 柱
    z.fillRect(26, 62, 148, 10);                                               // 貫
    z.beginPath(); z.moveTo(6, 22); z.quadraticCurveTo(100, 34, 194, 22); z.lineTo(190, 38); z.quadraticCurveTo(100, 48, 10, 38); z.closePath(); z.fill();   // 笠木
    z.fillStyle = '#1c1416';
    z.beginPath(); z.moveTo(0, 14); z.quadraticCurveTo(100, 28, 200, 14); z.lineTo(196, 24); z.quadraticCurveTo(100, 36, 4, 24); z.closePath(); z.fill();
    z.fillRect(94, 38, 12, 26);                                                // 額束
    z.fillStyle = 'rgba(255,255,255,0.18)'; z.fillRect(44, 40, 3, 190); z.fillRect(146, 40, 3, 190);
    st.torii = tr;
    // 画面のふちの墨のにじみ（昼の季節だけ、うすく）
    const fr = document.createElement('canvas'); fr.width = W; fr.height = H;
    const q2 = fr.getContext('2d');
    for (let i = 0; i < 160; i++) {
      const side = i % 4, u = hsh(i, 21) * (side < 2 ? W : H), d = hsh(i, 22) * 26;
      const x = side === 0 ? u : side === 1 ? u : side === 2 ? d : W - d, y = side === 0 ? d : side === 1 ? H - d : u;
      const r = 14 + hsh(i, 23) * 30;
      const gr = q2.createRadialGradient(x, y, 0, x, y, r);
      gr.addColorStop(0, 'rgba(30,20,26,0.09)'); gr.addColorStop(1, 'rgba(30,20,26,0)');
      q2.fillStyle = gr; q2.fillRect(x - r, y - r, r * 2, r * 2);
    }
    st.frame = fr;
  }
  function reset() {
    if (!st.made) make();
    Object.assign(st, { petals: [], leaves: [], snow: [], fws: [], blooms: [], lastBeat: -99, gone: [], splats: [], shooters: [], geese: [], streaks: [], gold: [], ripples: [], snowDepth: 0, lastHits: 0 });
    st.stains.getContext('2d').clearRect(0, 0, st.stains.width, st.stains.height); st.stainN = 0;
    for (const n of ['skyC', 'mtnC', 'frontC']) if (st[n]) st[n].dirty = true;
  }

  // ---- 粒（花びら・もみじ・雪）・背景の花火・季節のかわり目 ------------------------------------------
  function bgFirework(x, y, big) {
    const n = big ? 70 : 40, col = rgb(['#ffd27f', '#ff8fb0', '#8fd8ff', '#c9a0ff', '#ffffff'][(Math.random() * 5) | 0]);
    const kind = ['peony', 'willow', 'ring', 'peony', 'double'][(Math.random() * 5) | 0];
    const willow = kind === 'willow';
    const parts = Array.from({ length: n }, (_, i) => { const a = i * TAU / n + Math.random() * 0.05, v = (big ? 170 : 110) * (kind === 'ring' ? 1 : 0.85 + Math.random() * 0.3) * (kind === 'double' && i % 2 ? 0.55 : 1); return { vx: Math.cos(a) * v, vy: Math.sin(a) * v }; });
    st.fws.push({ x, y, t: 0, parts, col: willow ? rgb('#ffcf70') : col, col2: rgb(['#ffffff', '#8fffd0', '#ff8fb0'][(Math.random() * 3) | 0]), willow, kind, life: willow ? 2.8 : 1.8 });
  }
  function onBeat(b) {
    if (!FW) { FW = new Set(SCORE_SHIKI.fw); TAIKO_BIG = new Set(SCORE_SHIKI.taiko.filter(x => x % 4 === 0)); }
    if (FW.has(b)) for (let i = 0; i < 2; i++) bgFirework(100 + Math.random() * (W - 200), 90 + Math.random() * 180, true);
    if (b >= 80 && b < 144 && TAIKO_BIG.has(b)) bgFirework(80 + Math.random() * (W - 160), 70 + Math.random() * 160, false);
    if (b >= 264 && b < 296 && b % 4 === 2) bgFirework(80 + Math.random() * (W - 160), 70 + Math.random() * 160, false);
    if (b >= 208 && b < 264 && b % 6 === 3) st.shooters.push({ t: 0, x: 200 + Math.random() * 500, y: 30 + Math.random() * 120, a: 2.6 + Math.random() * 0.3 });
    if (b === 150 || b === 172 || b === 194) st.geese.push({ t: 0, dir: b === 172 ? -1 : 1, y: 120 + Math.random() * 80 });
    for (const [s] of BOUNDS) if (b === s && s < 296) st.blooms.push({ t: 0, x: 200 + Math.random() * 400, y: 200 + Math.random() * 200, seed: Math.random() * 100 });
  }

  // 墨の一筆の点（筆が通った所まで）
  function strokeHead(b) {
    let i = 1;
    while (i < b.pts.length && b.cum[i] < b.head) i++;
    if (i >= b.pts.length) return b.pts[b.pts.length - 1];
    const a = b.pts[i - 1], z = b.pts[i], f = (b.head - b.cum[i - 1]) / ((b.cum[i] - b.cum[i - 1]) || 1);
    return { x: a.x + (z.x - a.x) * f, y: a.y + (z.y - a.y) * f };
  }

  function update(dt, T, look) {
    if (!st.made) make();
    const bp = inSong() ? beatPos(T) : 40;
    SW = seasons(bp);
    if (scene === 'play') {
      const b = Math.floor(bp + 0.02);
      if (b !== st.lastBeat) { if (b === st.lastBeat + 1) onBeat(b); st.lastBeat = b; }
      // 桜の枝が乾いたら、花が花びらになって散る
      for (const s of bullets) if (s.kind === 'ink' && s.branch && s.branch.depth === 1 && s.safe && !s.scattered) {
        s.scattered = true;
        const e = s.pts[s.pts.length - 1];
        for (let i = 0; i < 6; i++) st.petals.push({ x: e.x + (Math.random() - 0.5) * 30, y: e.y + (Math.random() - 0.5) * 20, vx: (Math.random() - 0.3) * 60, vy: 20 + Math.random() * 40, r: 3 + Math.random() * 3, a: Math.random() * TAU, front: true });
      }
    }
    const wind = stage.wind || 0;
    const sp = springish(), au = SW.autumn, wi = SW.winter;
    if (Math.random() < dt * 14 * sp && st.petals.length < 140) st.petals.push({ x: Math.random() * (W + 200) - 100, y: -10, vx: 20 + Math.random() * 30, vy: 30 + Math.random() * 30, r: 3 + Math.random() * 3, a: Math.random() * TAU, front: Math.random() < 0.3 });
    if (Math.random() < dt * 6 * au && st.leaves.length < 60) st.leaves.push({ x: Math.random() * W, y: -10, vx: 0, vy: 40 + Math.random() * 30, r: 3.5 + Math.random() * 2.5, a: Math.random() * TAU, c: rgb(['#d8452a', '#f08a2a', '#b8281e', '#f0b030'][(Math.random() * 4) | 0]) });
    if (Math.random() < dt * 60 * wi && st.snow.length < 220) st.snow.push({ x: Math.random() * (W + 200) - 100, y: -10, z: 0.3 + Math.random() * 0.7, p: Math.random() * TAU });
    for (const p of st.petals) { p.vx += ((22 + wind * 1.4) - p.vx) * dt * 0.8; p.x += (p.vx + Math.sin(T * 2 + p.a) * 25) * dt; p.y += p.vy * dt; p.a += dt * 2.4; }
    for (const p of st.leaves) { p.vx += (wind * 1.6 - p.vx) * dt; p.x += (p.vx + Math.sin(T * 1.6 + p.a) * 40) * dt; p.y += p.vy * dt; p.a += dt * 2; }
    for (const p of st.snow) { p.x += (Math.sin(T + p.p) * 12 + wind * 0.5) * p.z * dt; p.y += 45 * p.z * dt; }
    st.petals = st.petals.filter(p => p.y < H && p.x > -120 && p.x < W + 120);
    st.leaves = st.leaves.filter(p => p.y < GROUND_Y + 10 && p.x > -60 && p.x < W + 60);
    st.snow = st.snow.filter(p => p.y < H);
    for (const f of st.fws) f.t += dt;
    st.fws = st.fws.filter(f => f.t < f.life);
    for (const bl of st.blooms) bl.t += dt;
    st.blooms = st.blooms.filter(bl => bl.t < 2.4);
    for (const l of st.lanterns) { l.x += l.v * dt; if (l.x > W + 30) l.x = -30; }
    // 乾いた一筆は、紙に墨の跡として残る（昼の季節）。季節がかわると、広がる墨の下で紙が新しくなる
    if (scene === 'play') {
      const g = st.stains.getContext('2d');
      for (const s of bullets) if (s.kind === 'ink' && s.safe && !s.stained) {
        s.stained = true;
        if (night() > 0.5) continue;
        st.stainN = (st.stainN || 0) + 1;
        g.strokeStyle = 'rgba(40,30,36,0.035)'; g.lineWidth = s.r * 0.8; g.lineCap = 'round'; g.lineJoin = 'round';
        g.beginPath(); s.pts.forEach((q, i) => (i ? g.lineTo(q.x / 2, q.y / 2) : g.moveTo(q.x / 2, q.y / 2))); g.stroke();
        g.fillStyle = 'rgba(40,30,36,0.06)';
        const e = s.pts[s.pts.length - 1];
        for (let i = 0; i < 4; i++) { g.beginPath(); g.arc((e.x + (Math.random() - 0.5) * 30) / 2, (e.y + (Math.random() - 0.5) * 30) / 2, 1 + Math.random() * 3, 0, TAU); g.fill(); }
      }
      for (const bl of st.blooms) if (bl.t > 0.55 && !bl.wiped) { bl.wiped = true; g.clearRect(0, 0, st.stains.width, st.stains.height); st.stainN = 0; }
      if (hitsTaken > st.lastHits) {                                         // 当たった: 画面に墨がとびちる
        const p = playerXY();
        st.splats.push({ t: 0, x: p.x, y: p.y, seed: Math.random() * 100, drops: Array.from({ length: 14 }, () => [(Math.random() - 0.5) * 260, (Math.random() - 0.5) * 200, 3 + Math.random() * 10]) });
      }
      st.lastHits = hitsTaken;
    } else if (scene === 'title') st.lastHits = 0;
    for (const sp of st.splats) sp.t += dt;
    st.splats = st.splats.filter(sp => sp.t < 1.6);
    // 風の筋
    if (Math.abs(wind) > 40 && Math.random() < dt * 14 && st.streaks.length < 30) st.streaks.push({ x: wind > 0 ? -200 : W + 200, y: 60 + Math.random() * 560, len: 120 + Math.random() * 200, v: wind * 6, a: Math.random() * TAU, t: 0 });
    for (const q of st.streaks) { q.x += q.v * dt; q.t += dt; }
    st.streaks = st.streaks.filter(q => q.t < 2.5 && q.x > -500 && q.x < W + 500);
    for (const q of st.shooters) q.t += dt;
    st.shooters = st.shooters.filter(q => q.t < 1.2);
    for (const q of st.geese) q.t += dt;
    st.geese = st.geese.filter(q => q.t < 16);
    for (const q of st.ripples) q.t += dt;
    st.ripples = st.ripples.filter(q => q.t < 1.4);
    // 冬は床に雪が積もり、春になると消える
    st.snowDepth = clamp01(st.snowDepth + dt * (SW.winter > 0.5 ? 0.05 : -0.4));
    // 輪廻: 四季がいっしょに舞う（もみじ・雪・金の粉も）
    const rb = SW.rebirth;
    if (rb > 0.3) {
      if (Math.random() < dt * 4 && st.leaves.length < 60) st.leaves.push({ x: Math.random() * W, y: -10, vx: 0, vy: 50 + Math.random() * 30, r: 3.5 + Math.random() * 2.5, a: Math.random() * TAU, c: rgb(['#d8452a', '#f08a2a'][(Math.random() * 2) | 0]) });
      if (Math.random() < dt * 20 && st.snow.length < 120) st.snow.push({ x: Math.random() * (W + 200) - 100, y: -10, z: 0.3 + Math.random() * 0.7, p: Math.random() * TAU });
      if (Math.random() < dt * 10 && st.gold.length < 80) st.gold.push({ x: Math.random() * W, y: -10, vy: 30 + Math.random() * 40, a: Math.random() * TAU, s: 2 + Math.random() * 4 });
    }
    for (const q of st.gold) { q.y += q.vy * dt; q.x += Math.sin(T + q.a) * 20 * dt + wind * 0.4 * dt; q.a += dt * 3; }
    st.gold = st.gold.filter(q => q.y < H);
  }

  // ---- 背景 ---------------------------------------------------------------------------------
  /* ---- 背景は「ゆっくりしか変わらない層」を3枚の絵（キャッシュ）にしておき、毎コマはそれを貼るだけにする ----
     空（日・月・星・オーロラ）／ 山なみと霧 ／ 鳥居・木・墨の跡・和紙 の3枚。4コマに1回ずつ、順番に描き直す
     （山の動きは1秒に数px なので、描き直しが少なくても見た目は同じ）。花火・流れ星・雁・ホタル・花びらは毎コマ描く */
  function layerCanvas(name) {
    let c = st[name];
    if (!c || c.width !== cv.width || c.height !== cv.height) { c = st[name] = document.createElement('canvas'); c.width = cv.width; c.height = cv.height; c.dirty = true; }
    return c;
  }
  function refresh(name, phase, fn, T, look) {
    const c = layerCanvas(name);
    if (c.dirty || st.fc % 4 === phase) {
      const g = c.getContext('2d');
      g.setTransform(renderScale, 0, 0, renderScale, 0, 0);
      g.clearRect(0, 0, W, H);
      fn(g, T, look);
      c.dirty = false;
    }
    ctx.drawImage(c, 0, 0, W, H);
  }
  function skyLayer(ctx, T, look) {
    const nt = night();
    const g = ctx.createLinearGradient(0, 0, 0, GROUND_Y);
    g.addColorStop(0, rgba(look.skyTop, 1)); g.addColorStop(1, rgba(look.skyBot, 1));
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    // 星（夏・冬）
    if (nt > 0.02) {
      ctx.fillStyle = '#fff';
      for (const s of st.stars) { ctx.globalAlpha = nt * (0.35 + 0.35 * Math.sin(T * 2 + s.p)); ctx.fillRect(s.x, s.y, s.s, s.s); }
      ctx.globalAlpha = 1;
    }
    // 日と月
    if (SW.spring > 0.01 || SW.paper > 0.01) {                              // 春: かすんだ日（序ではうすい朱の丸）
      const a = SW.spring * 0.8 + SW.paper * 0.35;
      const gr = ctx.createRadialGradient(610, 170, 0, 610, 170, 150);
      gr.addColorStop(0, `rgba(232,90,90,${(0.75 * a).toFixed(3)})`); gr.addColorStop(0.42, `rgba(232,90,90,${(0.6 * a).toFixed(3)})`); gr.addColorStop(0.5, `rgba(240,150,140,${(0.12 * a).toFixed(3)})`); gr.addColorStop(1, 'rgba(240,150,140,0)');
      ctx.fillStyle = gr; ctx.fillRect(460, 20, 300, 300);
    }
    if (SW.summer > 0.01) moon(600, 140, 52, SW.summer, 1, ctx);
    if (SW.autumn > 0.01) {                                                 // 秋: 山の向こうの大きな月
      const a = SW.autumn;
      const gr = ctx.createRadialGradient(560, 300, 0, 560, 300, 260);
      gr.addColorStop(0, `rgba(255,236,190,${(0.95 * a).toFixed(3)})`); gr.addColorStop(0.45, `rgba(255,220,160,${(0.9 * a).toFixed(3)})`); gr.addColorStop(0.5, `rgba(255,200,130,${(0.25 * a).toFixed(3)})`); gr.addColorStop(1, 'rgba(255,180,110,0)');
      ctx.fillStyle = gr; ctx.fillRect(300, 40, 520, 520);
    }
    if (SW.winter > 0.01) moon(620, 120, 40, SW.winter, 0.35, ctx);
    if (SW.rebirth + SW.end > 0.01) {                                       // 輪廻: 金の朝日と光の筋
      const a = SW.rebirth + SW.end * 0.7;
      const x = W / 2, y = 330;
      if (!st.rays) {                                                       // 光の筋は一度だけ描いておく
        st.rays = document.createElement('canvas'); st.rays.width = 1200; st.rays.height = 620;
        const z = st.rays.getContext('2d'), ox = 600, oy = 600;
        for (let i = 0; i < 14; i++) {
          const ang = -Math.PI / 2 + (i - 6.5) * 0.17;
          const gr = z.createLinearGradient(ox, oy, ox + Math.cos(ang) * 600, oy + Math.sin(ang) * 600);
          gr.addColorStop(0, 'rgba(255,220,150,0.22)'); gr.addColorStop(1, 'rgba(255,220,150,0)');
          z.fillStyle = gr;
          z.beginPath(); z.moveTo(ox, oy); z.lineTo(ox + Math.cos(ang - 0.04) * 600, oy + Math.sin(ang - 0.04) * 600); z.lineTo(ox + Math.cos(ang + 0.04) * 600, oy + Math.sin(ang + 0.04) * 600); z.closePath(); z.fill();
        }
      }
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = Math.min(1, a);
      ctx.translate(x, y); ctx.rotate(Math.sin(T * 0.3) * 0.03); ctx.drawImage(st.rays, -600, -600);
      ctx.restore();
      const gr = ctx.createRadialGradient(x, y, 0, x, y, 120);
      gr.addColorStop(0, `rgba(255,250,230,${a.toFixed(3)})`); gr.addColorStop(0.5, `rgba(255,214,140,${(0.8 * a).toFixed(3)})`); gr.addColorStop(1, 'rgba(255,190,120,0)');
      ctx.fillStyle = gr; ctx.fillRect(x - 120, y - 120, 240, 240);
    }
    // オーロラ（冬の空）
    if (SW.winter > 0.02 && gfx > 0) {
      ctx.globalCompositeOperation = 'lighter';
      for (let r = 0; r < 3; r++) {
        const base = 70 + r * 40;
        for (let x = 0; x < W; x += 6) {
          const y = base + Math.sin(x * 0.008 + T * 0.4 + r * 2) * 30 + Math.sin(x * 0.021 + T * 0.7) * 12;
          const h = 90 + 50 * Math.sin(x * 0.013 + T * 0.5 + r);
          const gr = ctx.createLinearGradient(0, y, 0, y + h);
          const c = r === 1 ? [160, 120, 255] : [80, 255, 170];
          gr.addColorStop(0, rgba(c, 0)); gr.addColorStop(0.3, rgba(c, 0.11 * SW.winter)); gr.addColorStop(1, rgba(c, 0));
          ctx.fillStyle = gr; ctx.fillRect(x, y, 6, h);
        }
      }
      ctx.globalCompositeOperation = 'source-over';
    }
  }
  function mountainLayer(ctx, T, look) {
    const nt = night();
    // 山なみ（遠い → 近い）
    st.mtn.forEach((m, i) => {
      const off = -((T * m.speed) % (m.w - W)), y = 160 + i * 40;
      const day = 1 - nt;
      if (day > 0.01) { ctx.globalAlpha = day; ctx.drawImage(m.day, off, y); }
      if (nt - SW.winter > 0.01) { ctx.globalAlpha = nt - SW.winter; ctx.drawImage(m.night, off, y); }
      if (SW.winter > 0.01) { ctx.globalAlpha = SW.winter; ctx.drawImage(m.snow, off, y); }
      ctx.globalAlpha = 1;
      // 霧の帯
      const my = y + 210, gr = ctx.createLinearGradient(0, my - 50, 0, my + 50);
      const mc = nt > 0.5 ? [40, 50, 90] : mixC(rgb('#ffffff'), look.skyBot, 0.4);
      gr.addColorStop(0, rgba(mc, 0)); gr.addColorStop(0.5, rgba(mc, 0.35)); gr.addColorStop(1, rgba(mc, 0));
      ctx.fillStyle = gr; ctx.fillRect(0, my - 50, W, 100);
    });
  }
  function frontLayer(ctx, T, look) {
    const nt = night();
    // 水の中に立つ鳥居（遠く）
    {
      const tx = 470, ty = GROUND_Y - 200;
      ctx.globalAlpha = nt > 0.5 ? 0.75 : 0.9;
      ctx.drawImage(st.torii, tx, ty, 170, 196);
      if (SW.winter > 0.01) { ctx.fillStyle = `rgba(250,252,255,${(0.95 * SW.winter).toFixed(3)})`; ctx.beginPath(); ctx.ellipse(tx + 85, ty + 13, 86, 6, 0, Math.PI, TAU); ctx.fill(); }
      ctx.globalAlpha = 1;
    }
    // 左の大きな木（風でゆれる）＋ 樹冠
    ctx.save();
    ctx.translate(-30, GROUND_Y - 610);
    ctx.translate(70, 620); ctx.rotate(Math.sin(T * 0.6) * 0.01 + (stage.wind || 0) * 0.00012); ctx.translate(-70, -620);
    ctx.globalAlpha = nt > 0.5 ? 0.85 : 1;
    ctx.drawImage(st.tree, 0, 0);
    const cw = { spring: springish(), summer: SW.summer, autumn: SW.autumn, winter: SW.winter };
    for (const key in cw) if (cw[key] > 0.01) { ctx.globalAlpha = Math.min(1, cw[key]); ctx.drawImage(st.canopy[key], 0, 0); }
    ctx.globalAlpha = 1;
    ctx.restore();
    // 墨の跡（紙に残った一筆）
    if (st.stainN > 0) ctx.drawImage(st.stains, 0, 0, W, H);
    // 和紙の質感
    if (gfx === 2) { ctx.fillStyle = st.tex; ctx.globalAlpha = 1 - nt * 0.6; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1; }
  }
  function background(T, look, k, bk, bp) {
    if (!st.made) make();
    const nt = night();
    st.fc = (st.fc || 0) + 1;
    refresh('skyC', 0, skyLayer, T, look);
    // 背景の花火
    for (const f of st.fws) drawBgFirework(f);
    // 流れ星（冬）
    for (const q of st.shooters) {
      const p = q.t / 1.2, x = q.x + Math.cos(q.a) * 420 * p, y = q.y + Math.sin(q.a) * 420 * p;
      const g2 = ctx.createLinearGradient(x, y, x - Math.cos(q.a) * 120, y - Math.sin(q.a) * 120);
      g2.addColorStop(0, `rgba(255,255,255,${(0.9 * (1 - p)).toFixed(3)})`); g2.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.strokeStyle = g2; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - Math.cos(q.a) * 120, y - Math.sin(q.a) * 120); ctx.stroke();
    }
    // 雁の列（秋の月の前を横切る）
    for (const q of st.geese) {
      const x0 = q.dir > 0 ? -120 + q.t * 70 : W + 120 - q.t * 70;
      ctx.strokeStyle = `rgba(40,20,20,${(0.75 * SW.autumn).toFixed(3)})`; ctx.lineWidth = 1.6;
      for (let i = 0; i < 9; i++) {
        const row = Math.ceil(i / 2), side = i % 2 ? 1 : -1;
        const x = x0 - q.dir * row * 22, y = q.y + (i ? side * row * 13 : 0) + Math.sin(q.t * 3 + i) * 2, f = Math.sin(q.t * 7 + i) * 4;
        ctx.beginPath(); ctx.moveTo(x - 7, y - 3 + f); ctx.quadraticCurveTo(x - 2, y - 1, x, y + 1); ctx.quadraticCurveTo(x + 2, y - 1, x + 7, y - 3 + f); ctx.stroke();
      }
    }
    refresh('mtnC', 1, mountainLayer, T, look);
    refresh('frontC', 2, frontLayer, T, look);
    // ホタル（夏）
    const flyA = SW.summer + SW.rebirth * 0.6;
    if (flyA > 0.02) {
      ctx.globalCompositeOperation = 'lighter';
      for (const f of st.flies) {
        const x = f.x + Math.sin(T * 0.7 + f.p) * 40, y = f.y + Math.sin(T * 1.1 + f.p * 2) * 25, a = flyA * (0.5 + 0.5 * Math.sin(T * 3 + f.p * 5));
        ctx.globalAlpha = a; ctx.drawImage(glowSprite([200, 255, 120]), x - 9, y - 9, 18, 18);
      }
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    }
    // 粒（奥の層）
    drawParticles(false, T);
  }
  function moon(x, y, r, a, glow, ctx) {
    const gr = ctx.createRadialGradient(x, y, 0, x, y, r * 3);
    gr.addColorStop(0, `rgba(255,250,225,${(0.35 * a * glow).toFixed(3)})`); gr.addColorStop(1, 'rgba(255,250,225,0)');
    ctx.fillStyle = gr; ctx.fillRect(x - r * 3, y - r * 3, r * 6, r * 6);
    ctx.fillStyle = `rgba(255,250,228,${(0.95 * a).toFixed(3)})`;
    ctx.beginPath(); ctx.arc(x, y, r, 0, TAU);
    if (glow < 0.5) { ctx.save(); ctx.clip();                              // 三日月: 欠けた所は、うしろの空がそのまま見える
      ctx.beginPath(); ctx.rect(x - r - 2, y - r - 2, r * 2 + 4, r * 2 + 4); ctx.arc(x + r * 0.45, y - r * 0.2, r * 0.92, 0, TAU, true); ctx.fill(); ctx.restore(); }
    else ctx.fill();
    if (glow >= 0.5) {                                                      // 満月のもよう
      ctx.fillStyle = `rgba(200,195,170,${(0.25 * a).toFixed(3)})`;
      for (const [dx, dy, rr] of [[-12, -8, 10], [10, 12, 8], [16, -14, 6]]) { ctx.beginPath(); ctx.arc(x + dx, y + dy, rr, 0, TAU); ctx.fill(); }
    }
  }
  function drawBgFirework(f) {
    const p = f.t / f.life, a = clamp01(1 - p * p);
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = rgba(f.col, (f.kind === 'ring' ? 0.3 : 0.75) * a); ctx.lineWidth = f.willow ? 1.4 : 2;
    const g = f.willow ? 70 : 40, drag = 1.4;
    const pos = tt => { const e = (1 - Math.exp(-drag * tt)) / drag; return [e, 0.5 * g * tt * tt]; };
    const [e1, g1] = pos(f.t), [e0, g0] = pos(Math.max(0, f.t - (f.willow ? 0.6 : 0.25)));
    ctx.beginPath();
    for (const q of f.parts) { ctx.moveTo(f.x + q.vx * e0, f.y + q.vy * e0 + g0); ctx.lineTo(f.x + q.vx * e1, f.y + q.vy * e1 + g1); }
    ctx.stroke();
    for (let i = 0; i < f.parts.length; i++) {                              // 光の粒の頭（二重の花火は内と外で色がちがう。色がかわっていく）
      const q = f.parts[i], c2 = f.kind === 'double' && i % 2 ? f.col2 : mixC(f.col, f.col2, clamp01(p * 1.5 - 0.3));
      ctx.fillStyle = rgba(mixC(c2, WHITE, 0.4), a);
      const sz = f.kind === 'ring' ? 3.5 : 3;
      ctx.fillRect(f.x + q.vx * e1 - sz / 2, f.y + q.vy * e1 + g1 - sz / 2, sz, sz);
    }
    if (f.t < 0.15) { ctx.globalAlpha = 1 - f.t / 0.15; ctx.drawImage(glowSprite(f.col), f.x - 60, f.y - 60, 120, 120); ctx.globalAlpha = 1; }
    if (gfx > 0) {                                                          // きらきら
      ctx.fillStyle = rgba(WHITE, 0.8 * a);
      for (let i = 0; i < f.parts.length; i += 3) if (Math.random() < 0.5) { const q = f.parts[i]; ctx.fillRect(f.x + q.vx * e1 - 1, f.y + q.vy * e1 + g1 - 1, 2, 2); }
    }
    ctx.globalCompositeOperation = 'source-over';
  }
  function petalShape(x, y, r, a, col, alpha) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(a); ctx.scale(1, 0.55 + 0.45 * Math.sin(a * 1.7));
    ctx.fillStyle = rgba(col, alpha);
    ctx.beginPath(); ctx.moveTo(0, -r); ctx.quadraticCurveTo(r, -r * 0.2, 0, r); ctx.quadraticCurveTo(-r, -r * 0.2, 0, -r); ctx.fill();
    ctx.restore();
  }
  function mapleShape(x, y, r, a, col, alpha) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(a);
    ctx.fillStyle = rgba(col, alpha);
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const ang = -Math.PI / 2 + i * TAU / 10, rr = i % 2 ? r * 0.45 : r * (i === 4 || i === 6 ? 0.8 : 1);
      ctx.lineTo(Math.cos(ang) * rr, Math.sin(ang) * rr);
    }
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = rgba(mixC(col, [60, 10, 0], 0.5), alpha * 0.8); ctx.lineWidth = 0.8;
    ctx.beginPath(); ctx.moveTo(0, r * 1.2); ctx.lineTo(0, -r * 0.8); ctx.moveTo(0, 0); ctx.lineTo(r * 0.8, -r * 0.3); ctx.moveTo(0, 0); ctx.lineTo(-r * 0.8, -r * 0.3); ctx.stroke();
    ctx.restore();
  }
  function drawParticles(front, T) {
    for (const p of st.petals) if (!!p.front === front) petalShape(p.x, p.y, p.r * (front ? 1.4 : 1), p.a, [255, 196, 214], front ? 0.95 : 0.8);
    if (!front) for (const p of st.leaves) mapleShape(p.x, p.y, p.r, p.a, mixC(p.c, [120, 70, 50], 0.35), 0.55);
    if (st.snow.length) {
      ctx.fillStyle = '#fff';
      for (const p of st.snow) if ((p.z > 0.75) === front) { ctx.globalAlpha = 0.5 + 0.5 * p.z; ctx.beginPath(); ctx.arc(p.x, p.y, 1 + p.z * 2.2, 0, TAU); ctx.fill(); }
      ctx.globalAlpha = 1;
    }
  }

  // ---- 床: 水面（冬は氷）。灯籠（夏）、すすき（秋）-----------------------------------------------
  function floor(look, k) {
    const y = GROUND_Y, nt = night(), T = inSong() ? songTime : titleClock();
    const g = ctx.createLinearGradient(0, y, 0, H);
    g.addColorStop(0, rgba(mixC(look.skyBot, [20, 20, 30], 0.35), 1)); g.addColorStop(1, rgba(mixC(look.skyTop, [10, 10, 20], 0.6), 1));
    ctx.fillStyle = g; ctx.fillRect(-400, y, W + 800, H - y + 400);
    // さざなみ
    ctx.strokeStyle = rgba(nt > 0.5 ? [190, 210, 255] : [255, 255, 255], 0.25 + 0.15 * k); ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = 0; i < 9; i++) {
      const yy = y + 6 + i * 6, x0 = ((i * 97 + T * (10 + i * 3)) % (W + 200)) - 100;
      ctx.moveTo(x0, yy); ctx.lineTo(x0 + 40 + i * 6, yy);
      ctx.moveTo((x0 + 380) % (W + 200) - 100, yy + 2); ctx.lineTo((x0 + 380) % (W + 200) - 60, yy + 2);
    }
    ctx.stroke();
    // 月の映りこみ
    const mx = SW.summer * 600 + SW.autumn * 560 + SW.winter * 620 + (SW.rebirth + SW.end) * W / 2 + (SW.spring + SW.paper) * 610;
    ctx.fillStyle = `rgba(255,240,200,${(0.5 * (SW.summer + SW.autumn + 0.5 * (SW.rebirth + SW.end)) + 0.2 * SW.spring).toFixed(3)})`;
    for (let i = 0; i < 8; i++) { const w = 40 - i * 4 + Math.sin(T * 3 + i) * 6; ctx.fillRect(mx - w / 2, y + 4 + i * 6, w, 2); }
    // 花火が水面に映る
    if (st.fws.length) {
      ctx.globalCompositeOperation = 'lighter';
      for (const f of st.fws) { const a = clamp01(1 - f.t / f.life) * 0.5; ctx.globalAlpha = a; ctx.drawImage(glowSprite(f.col), f.x - 90, y - 10, 180, 60); }
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    }
    // 鯉が落ちた所の波紋
    for (const q of st.ripples) {
      const p = q.t / 1.4;
      ctx.strokeStyle = `rgba(255,255,255,${(0.6 * (1 - p)).toFixed(3)})`; ctx.lineWidth = 1.5;
      for (const m of [1, 0.6]) { ctx.beginPath(); ctx.ellipse(q.x, y + 6, 70 * p * m + 6, 8 * p * m + 2, 0, 0, TAU); ctx.stroke(); }
    }
    // 冬: 氷
    if (SW.winter > 0.01) {
      ctx.fillStyle = `rgba(220,240,255,${(0.35 * SW.winter).toFixed(3)})`; ctx.fillRect(-400, y, W + 800, H - y + 400);
      ctx.strokeStyle = `rgba(255,255,255,${(0.5 * SW.winter).toFixed(3)})`; ctx.lineWidth = 1;
      ctx.beginPath();
      for (let i = 0; i < 12; i++) { const x = i * 73 + 20; ctx.moveTo(x, y + 4); ctx.lineTo(x + 18, y + 20); ctx.lineTo(x + 6, y + 40); }
      ctx.stroke();
    }
    // 夏: 灯籠流し
    if (SW.summer > 0.01) {
      for (const l of st.lanterns) {
        const lx = l.x, ly = y + 14 + Math.sin(T * 1.5 + lx) * 1.5;
        ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = SW.summer;
        ctx.drawImage(glowSprite([255, 190, 110]), lx - 26, ly - 26, 52, 52);
        ctx.globalCompositeOperation = 'source-over';
        ctx.fillStyle = '#ffe0a8'; ctx.fillRect(lx - 7, ly - 14, 14, 14);
        ctx.fillStyle = '#7a2a18'; ctx.fillRect(lx - 9, ly - 16, 18, 3); ctx.fillRect(lx - 9, ly, 18, 3);
        ctx.globalAlpha = 1;
      }
    }
    ctx.strokeStyle = rgba(nt > 0.5 ? [200, 210, 240] : [40, 30, 40], 0.5); ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(-400, y); ctx.lineTo(W + 400, y); ctx.stroke();
    if (st.snowDepth > 0.01) {                                              // 積もった雪（見た目だけ。足もとは同じ高さ）
      ctx.fillStyle = 'rgba(248,251,255,0.95)';
      ctx.beginPath(); ctx.moveTo(-400, y + 2);
      for (let x = -400; x <= W + 400; x += 20) ctx.lineTo(x, y + 2 - st.snowDepth * (5 + 3 * Math.sin(x * 0.05)));
      ctx.lineTo(W + 400, y + 4); ctx.lineTo(-400, y + 4); ctx.closePath(); ctx.fill();
    }
    // 秋: すすき（手前の水辺）
    if (SW.autumn > 0.01) {
      ctx.strokeStyle = `rgba(90,50,30,${(0.85 * SW.autumn).toFixed(3)})`; ctx.lineWidth = 1.2;
      const wind = (stage.wind || 0) * 0.15;
      for (let i = 0; i < 26; i++) {
        const x = (i * 37 + 11) % W, h = 40 + (i * 13) % 30, sw = Math.sin(T * 1.4 + i) * 6 + wind;
        ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + sw * 0.5, y - h * 0.6, x + sw, y - h); ctx.stroke();
        ctx.fillStyle = `rgba(230,200,150,${(0.8 * SW.autumn).toFixed(3)})`;
        ctx.beginPath(); ctx.ellipse(x + sw, y - h, 2.5, 8, sw * 0.05, 0, TAU); ctx.fill();
      }
    }
  }
  // 足場: 朱塗りの橋の板（冬は雪がのる）
  function platform(p, look, k) {
    ctx.fillStyle = '#b8321e'; ctx.fillRect(p.x, p.y, p.w, p.h * 0.55);
    ctx.fillStyle = '#2a1414'; ctx.fillRect(p.x + 3, p.y + p.h * 0.55, p.w - 6, p.h * 0.45);
    ctx.fillStyle = '#d8b04a'; ctx.fillRect(p.x - 3, p.y - 2, 6, p.h + 2); ctx.fillRect(p.x + p.w - 3, p.y - 2, 6, p.h + 2);
    ctx.fillStyle = 'rgba(255,255,255,0.3)'; ctx.fillRect(p.x + 4, p.y + 1, p.w - 8, 1.5);
    if (SW.winter > 0.05) { ctx.fillStyle = `rgba(250,252,255,${(0.95 * SW.winter).toFixed(3)})`; ctx.beginPath(); ctx.ellipse(p.x + p.w / 2, p.y, p.w / 2 + 2, 5, 0, Math.PI, TAU); ctx.fill(); }
  }

  // ---- 攻撃の見た目 ------------------------------------------------------------------------
  // 夜の季節は、暗い墨を「月の光の白い墨」に
  function inkColor(b) {
    const c = bulletColor(b), lum = (0.3 * c[0] + 0.59 * c[1] + 0.11 * c[2]) / 255;
    return lum < 0.35 ? mixC(c, MOONINK, night() * 0.9) : c;
  }
  // 筆の線: 点の列 pts を、太さ w(u) で（かすれつき）
  function brushPath(pts, cum, total, upto, r, c, alpha, taper) {
    if (pts.length < 2) return;
    const L = [], R = [];
    let last = 0;
    for (let i = 0; i < pts.length; i++) {
      if (i > 0 && cum[i - 1] >= upto) break;
      let p = pts[i];
      if (cum[i] > upto && i > 0) { const a = pts[i - 1], f = (upto - cum[i - 1]) / ((cum[i] - cum[i - 1]) || 1); p = { x: a.x + (p.x - a.x) * f, y: a.y + (p.y - a.y) * f }; }
      const q = pts[Math.min(pts.length - 1, i + 1)], o = pts[Math.max(0, i - 1)];
      const dx = q.x - o.x, dy = q.y - o.y, d = Math.hypot(dx, dy) || 1;
      const w = r * (taper ? inkTaper(Math.min(cum[i], upto) / total) : 1) * (1 + 0.08 * Math.sin(i * 2.3));
      L.push([p.x - dy / d * w, p.y + dx / d * w]); R.push([p.x + dy / d * w, p.y - dx / d * w]);
      last = i;
    }
    if (L.length < 2) return;
    ctx.fillStyle = rgba(c, alpha);
    ctx.beginPath();
    L.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    for (let i = R.length - 1; i >= 0; i--) ctx.lineTo(R[i][0], R[i][1]);
    ctx.closePath(); ctx.fill();
    if (gfx === 2) {                                                        // かすれ（筆の毛の白い筋）
      const bg = night() > 0.5 ? [20, 24, 50] : PAPER;
      ctx.strokeStyle = rgba(bg, 0.35 * alpha); ctx.lineWidth = 1.1;
      for (const f of [-0.55, -0.2, 0.3, 0.62]) {
        ctx.beginPath();
        let on = false;
        for (let i = Math.floor(L.length * 0.45); i < L.length; i++) {
          const x = L[i][0] + (R[i][0] - L[i][0]) * (0.5 + f / 2), y = L[i][1] + (R[i][1] - L[i][1]) * (0.5 + f / 2);
          if (!on) { ctx.moveTo(x, y); on = true; } else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
    }
  }
  function ink(b, T, k) {
    const c = inkColor(b);
    if (b.delay > 0) {                                                      // 予告: うすい墨のにじみ ＋ 細い下書き
      const p = b.delayMax > 0 ? 1 - b.delay / b.delayMax : 1;
      brushPath(b.pts, b.cum, b.total, b.total, b.r * 1.15, c, 0.14 + 0.2 * p, b.taper);
      ctx.strokeStyle = rgba(c, 0.4 + 0.45 * p); ctx.lineWidth = 1.4; ctx.setLineDash([3, 6]);
      ctx.beginPath(); b.pts.forEach((q, i) => (i ? ctx.lineTo(q.x, q.y) : ctx.moveTo(q.x, q.y))); ctx.stroke(); ctx.setLineDash([]);
      return;
    }
    const fade = b.safe ? clamp01(1 - (b.age - b.total / b.speed - b.hold) / 0.6) : 1;
    if (b.safe) brushPath(b.pts, b.cum, b.total, b.total, b.r * (1.1 + 0.4 * (1 - fade)), c, 0.18 * fade, b.taper);   // 乾いて、にじむ
    else brushPath(b.pts, b.cum, b.total, b.head, b.r, c, 0.95, b.taper);
    if (!b.safe && b.head < b.total) {                                      // 筆先と、とびちる墨
      const h = strokeHead(b);
      ctx.fillStyle = rgba(c, 0.9);
      ctx.beginPath(); ctx.arc(h.x, h.y, b.r * 0.9, 0, TAU); ctx.fill();
      if (Math.random() < 0.5) for (let i = 0; i < 2; i++) { ctx.beginPath(); ctx.arc(h.x + (Math.random() - 0.5) * b.r * 4, h.y + (Math.random() - 0.5) * b.r * 4, 1 + Math.random() * 2.5, 0, TAU); ctx.fill(); }
    }
    if (b.branch && b.branch.depth === 1 && b.head >= b.total) {            // 枝の先に花が咲く
      const e = b.pts[b.pts.length - 1], m = b.pts[b.pts.length >> 1];
      const grow = clamp01((b.age - b.total / b.speed) / 0.3) * fade;
      for (const [q, s] of [[e, 1], [m, 0.7]]) for (let i = 0; i < 3; i++) {
        const x = q.x + (hsh(b.branch.seed, i) - 0.5) * 26, y = q.y + (hsh(i, b.branch.seed) - 0.5) * 20, r = 6 * s * grow;
        if (r < 0.5) continue;
        ctx.fillStyle = rgba(night() > 0.5 ? [255, 220, 235] : [255, 190, 210], 0.95 * fade);
        for (let pp = 0; pp < 5; pp++) { const a = pp * TAU / 5 + i; ctx.beginPath(); ctx.ellipse(x + Math.cos(a) * r * 0.6, y + Math.sin(a) * r * 0.6, r * 0.6, r * 0.38, a, 0, TAU); ctx.fill(); }
        ctx.fillStyle = rgba([200, 50, 80], 0.8 * fade); ctx.beginPath(); ctx.arc(x, y, r * 0.2, 0, TAU); ctx.fill();
      }
    }
    if (b.enso && !b.safe && b.head >= b.total) {                           // 円相: 描き終えたら、中がほのかに光る
      ctx.globalCompositeOperation = 'lighter';
      const q = b.pts[0], cx = (b.pts[0].x + b.pts[20].x) / 2, cy = (b.pts[0].y + b.pts[20].y) / 2;
      ctx.globalAlpha = 0.25; ctx.drawImage(glowSprite([255, 230, 180]), cx - 120, cy - 120, 240, 240); ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
    }
  }
  function shell(b, T, k) {                                                 // 花火の玉が上がる
    if (b.delay <= 0) return;
    const p = 1 - b.delay / b.delayMax, e = 1 - Math.pow(1 - p, 2.2);
    const y = GROUND_Y + (b.y - GROUND_Y) * e;
    const c = bulletColor(b);
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = rgba(c, 0.5); ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(b.x + Math.sin(T * 30) * 1.5, Math.min(GROUND_Y, y + 60)); ctx.lineTo(b.x, y); ctx.stroke();
    ctx.drawImage(glowSprite(c), b.x - 12, y - 12, 24, 24);
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(b.x, y, 2.5, 0, TAU); ctx.fill();
    ctx.strokeStyle = rgba(c, 0.25 * p); ctx.setLineDash([3, 6]); ctx.lineWidth = 1;   // 開く場所の予告（うすい輪）
    ctx.beginPath(); ctx.arc(b.x, b.y, 26 + 10 * p, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
    ctx.globalCompositeOperation = 'source-over';
  }
  function icicleK(b, T, k) {
    const c = bulletColor(b);
    if (b.delay > 0) {                                                      // 予告: 天井で光る ＋ 落ちる線
      const p = 1 - b.delay / b.delayMax;
      ctx.strokeStyle = rgba(c, 0.15 + 0.35 * p); ctx.lineWidth = 1; ctx.setLineDash([3, 7]);
      ctx.beginPath(); ctx.moveTo(b.x, 0); ctx.lineTo(b.x, GROUND_Y); ctx.stroke(); ctx.setLineDash([]);
      const y = -b.len + b.len * 0.6 * p;
      drawSpike(b.x, y, b.len, c, 0.5 + 0.5 * p, Math.sin(T * 40) * p);
      return;
    }
    drawSpike(b.x, b.y - b.len, b.len, c, 1, 0);
  }
  function drawSpike(x, y, len, c, a, jit) {
    ctx.save(); ctx.translate(x + jit, y);
    const g = ctx.createLinearGradient(-8, 0, 8, 0);
    g.addColorStop(0, rgba(c, 0.6 * a)); g.addColorStop(0.5, rgba(WHITE, 0.95 * a)); g.addColorStop(1, rgba(mixC(c, [80, 140, 200], 0.4), 0.8 * a));
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.moveTo(-8, 0); ctx.lineTo(8, 0); ctx.lineTo(0, len); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = rgba(WHITE, 0.8 * a); ctx.lineWidth = 1; ctx.stroke();
    ctx.restore();
  }
  function auroraK(b, T, k) {
    const c = bulletColor(b);
    const life = b.delay > 0 ? 0 : b.safe ? clamp01(1 - (b.age - b.life) / 0.8) : 1;
    const warn = b.delay > 0 ? 1 - b.delay / b.delayMax : 0;
    // ゆれる範囲の目じるし（地面）
    ctx.strokeStyle = rgba(c, 0.35 * (b.delay > 0 ? warn : life)); ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(b.x0 - b.amp, GROUND_Y - 4); ctx.lineTo(b.x0 + b.amp, GROUND_Y - 4); ctx.stroke();
    const x = b.delay > 0 ? b.x0 + b.amp * Math.sin(b.ph) : b.x;
    const a = b.delay > 0 ? 0.25 * warn : life;
    ctx.globalCompositeOperation = 'lighter';
    const NS = Math.ceil(GROUND_Y / 20);
    for (let i = 0; i < NS; i++) {                                          // 波うつ光の帯（たてに 20px ずつ。重ならないように整数で）
      const y0 = i * 20, y1 = Math.min(GROUND_Y, y0 + 20);
      const off = Math.sin(y0 * 0.012 + T * 2) * 14;
      const g = ctx.createLinearGradient(x + off - b.w / 2, 0, x + off + b.w / 2, 0);
      const cc = mixC(c, [180, 120, 255], i / NS);
      g.addColorStop(0, rgba(cc, 0)); g.addColorStop(0.5, rgba(cc, 0.55 * a * (0.4 + 0.6 * i / NS))); g.addColorStop(1, rgba(cc, 0));
      ctx.fillStyle = g; ctx.fillRect(x + off - b.w / 2, y0, b.w, y1 - y0);
    }
    if (b.delay > 0) { ctx.strokeStyle = rgba(c, 0.4 * warn); ctx.setLineDash([4, 6]); ctx.lineWidth = 1; ctx.strokeRect(x - b.w * 0.4, 0, b.w * 0.8, GROUND_Y); ctx.setLineDash([]); }
    ctx.globalCompositeOperation = 'source-over';
  }
  // 鯉: 予告は跳ぶ道すじ（点線の弧）と、水面のさざなみ。跳んだら、ひれをゆらして弧をえがく
  function koiK(b, T, k) {
    const c = bulletColor(b);
    if (b.delay > 0) {
      const p = 1 - b.delay / b.delayMax;
      ctx.strokeStyle = rgba(c, 0.25 + 0.45 * p); ctx.lineWidth = 2; ctx.setLineDash([4, 8]); ctx.lineDashOffset = -T * 40;
      ctx.beginPath();
      for (let i = 0; i <= 30; i++) { const q = b.at(b.dur * i / 30); i ? ctx.lineTo(q.x, q.y) : ctx.moveTo(q.x, q.y); }
      ctx.stroke(); ctx.setLineDash([]);
      ctx.strokeStyle = `rgba(255,255,255,${(0.3 + 0.5 * p).toFixed(3)})`; ctx.lineWidth = 1.5;
      for (const m of [0.5, 1]) { ctx.beginPath(); ctx.ellipse(b.x0, GROUND_Y + 6, 30 * m * (0.6 + 0.4 * Math.sin(T * 10)), 4 * m, 0, 0, TAU); ctx.stroke(); }
      const e = b.at(b.dur);                                                // 落ちる所に×
      ctx.strokeStyle = rgba(c, 0.6 * p); ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(e.x - 8, GROUND_Y - 8); ctx.lineTo(e.x + 8, GROUND_Y + 8); ctx.moveTo(e.x + 8, GROUND_Y - 8); ctx.lineTo(e.x - 8, GROUND_Y + 8); ctx.stroke();
      return;
    }
    ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(b.ang || 0);
    const L = b.r * 3.2, wag = Math.sin(T * 18) * 0.25;
    ctx.fillStyle = rgba(mixC(c, WHITE, 0.2), 1);
    ctx.beginPath(); ctx.moveTo(L * 0.5, 0); ctx.quadraticCurveTo(L * 0.2, -b.r, -L * 0.4, -b.r * 0.35); ctx.lineTo(-L * 0.4, b.r * 0.35); ctx.quadraticCurveTo(L * 0.2, b.r, L * 0.5, 0); ctx.fill();
    ctx.save(); ctx.translate(-L * 0.4, 0); ctx.rotate(wag);                 // 尾びれ
    ctx.fillStyle = rgba(c, 0.85);
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(-L * 0.25, -b.r * 1.1, -L * 0.45, -b.r * 0.9); ctx.quadraticCurveTo(-L * 0.3, 0, -L * 0.45, b.r * 0.9); ctx.quadraticCurveTo(-L * 0.25, b.r * 1.1, 0, 0); ctx.fill();
    ctx.restore();
    ctx.fillStyle = rgba(c, 0.95);                                           // 模様
    ctx.beginPath(); ctx.ellipse(L * 0.05, -b.r * 0.15, L * 0.18, b.r * 0.45, 0.3, 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.beginPath(); ctx.ellipse(L * 0.1, -b.r * 0.6, L * 0.25, 2, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#111'; ctx.beginPath(); ctx.arc(L * 0.36, -b.r * 0.25, 2, 0, TAU); ctx.fill();
    ctx.restore();
    if (Math.random() < 0.5) sparks(b.tail.x, b.tail.y, { n: 1, color: '#cfe8ff', speed: 40, life: 0.4, size: 2, gravity: 400 });
  }
  // 大波（北斎の波のように）: 予告は画面のはしの矢印とうねり。走ってくる波頭は、白い爪のようなしぶき
  function waveK(b, T, k) {
    if (b.delay > 0) {
      const p = 1 - b.delay / b.delayMax, x = b.dir > 0 ? 30 : W - 30;
      ctx.fillStyle = `rgba(230,240,255,${(0.3 + 0.6 * p * (Math.floor(T * 8) % 2 ? 1 : 0.5)).toFixed(3)})`;
      ctx.font = '700 30px "Hiragino Mincho ProN", "Yu Mincho", serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(b.dir > 0 ? '波▶' : '◀波', x + b.dir * 20, GROUND_Y - 90);
      ctx.strokeStyle = `rgba(200,225,255,${(0.3 + 0.4 * p).toFixed(3)})`; ctx.lineWidth = 2;
      ctx.beginPath();
      for (let i = 0; i <= 40; i++) { const xx = b.dir > 0 ? i * 8 : W - i * 8; ctx.lineTo(xx, GROUND_Y - 4 - 6 * p * Math.sin(i * 0.6 - T * 8)); }
      ctx.stroke();
      return;
    }
    const pts = [];
    for (let x = b.x - 140 * b.dir; b.dir > 0 ? x <= b.x + 60 : x >= b.x - 60; x += 4 * b.dir) pts.push([x, GROUND_Y - b.height(b, x)]);
    const g = ctx.createLinearGradient(0, GROUND_Y - b.h, 0, GROUND_Y);
    g.addColorStop(0, '#2f6fa8'); g.addColorStop(1, '#183a66');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.moveTo(pts[0][0], GROUND_Y);
    for (const [x, y] of pts) ctx.lineTo(x, y);
    ctx.lineTo(pts[pts.length - 1][0], GROUND_Y); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.9)'; ctx.lineWidth = 2;               // 波の線（北斎のすじ）
    for (let j = 1; j <= 3; j++) {
      ctx.beginPath();
      pts.forEach(([x, y], i) => { const yy = y + j * 9; if (yy < GROUND_Y) (i ? ctx.lineTo(x, yy) : ctx.moveTo(x, yy)); });
      ctx.stroke();
    }
    const cx = b.x, cy = GROUND_Y - b.h;                                      // 波頭がまるまって、白い爪
    ctx.fillStyle = '#f4f8ff';
    ctx.beginPath(); ctx.arc(cx + b.dir * 10, cy + 12, 16, Math.PI, TAU); ctx.fill();
    for (let i = 0; i < 6; i++) {
      const a = -Math.PI / 2 + b.dir * (0.2 + i * 0.22), r = 22 + (i % 2) * 6;
      const fx2 = cx + b.dir * 10 + Math.cos(a) * r, fy = cy + 12 + Math.sin(a) * r;
      ctx.beginPath(); ctx.arc(fx2, fy, 4 - i * 0.4, 0, TAU); ctx.fill();
    }
    if (Math.random() < 0.7) sparks(cx + b.dir * 20, cy + 10, { n: 2, color: '#e8f4ff', speed: 140, life: 0.5, size: 2.5, gravity: 500, dir: -Math.PI / 2 + b.dir * 0.6, spread: 1.2 });
  }
  window.fxSplash = function (x, y, b) {
    sparks(x, y - 2, { n: 18, color: '#d8ecff', speed: 260, life: 0.6, size: 2.6, gravity: 700, dir: -Math.PI / 2, spread: 1.6 });
    st.ripples.push({ x, t: 0 });
  };
  // 花火の光の筋・霜の線（レーザー）
  function laser(b, c, T, k) {
    const line = () => { ctx.beginPath(); ctx.moveTo(b.x1, b.y1); ctx.lineTo(b.x2, b.y2); ctx.stroke(); };
    if (b.fw) {
      if (b.delay > 0) {
        const p = 1 - b.delay / b.delayMax;
        ctx.strokeStyle = rgba(c, 0.12 + 0.25 * p); ctx.lineWidth = b.r * 2; ctx.lineCap = 'round'; line();
        ctx.strokeStyle = rgba(c, 0.3 + 0.3 * p); ctx.lineWidth = 1; ctx.setLineDash([2, 8]); line(); ctx.setLineDash([]);
        return true;
      }
      const fade = b.safe ? clamp01(1 - (b.age - b.hold) / 0.3) : 1, grow = clamp01(b.age / 0.08);
      const x2 = b.x1 + (b.x2 - b.x1) * grow, y2 = b.y1 + (b.y2 - b.y1) * grow;
      ctx.globalCompositeOperation = 'lighter';
      const g = ctx.createLinearGradient(b.x1, b.y1, x2, y2);
      g.addColorStop(0, rgba(WHITE, 0.95 * fade)); g.addColorStop(0.5, rgba(c, 0.85 * fade)); g.addColorStop(1, rgba(c, 0.2 * fade));
      ctx.strokeStyle = g; ctx.lineCap = 'round';
      ctx.lineWidth = b.r * 2 * (b.safe ? fade : 1); ctx.beginPath(); ctx.moveTo(b.x1, b.y1); ctx.lineTo(x2, y2); ctx.stroke();
      ctx.lineWidth = b.r * 5; ctx.strokeStyle = rgba(c, 0.12 * fade); ctx.stroke();
      ctx.fillStyle = rgba(WHITE, 0.9 * fade);
      for (let i = 0; i < 6; i++) { const f = Math.random() * grow; ctx.fillRect(b.x1 + (b.x2 - b.x1) * f - 1, b.y1 + (b.y2 - b.y1) * f - 1, 2, 2); }
      ctx.globalCompositeOperation = 'source-over';
      return true;
    }
    if (b.label && b.label.includes('❄')) {                                // 霜の線: 氷の結晶が並ぶ
      if (b.delay > 0) {
        const p = 1 - b.delay / b.delayMax, on = p > 0.7 || Math.floor(T * 12) % 2 === 0;
        ctx.strokeStyle = rgba(c, on ? 0.35 + 0.4 * p : 0.12); ctx.lineWidth = 1.5; ctx.setLineDash([6, 6]); line(); ctx.setLineDash([]);
        ctx.font = '600 15px "Hiragino Mincho ProN", "Yu Mincho", serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillStyle = rgba(WHITE, on ? 0.95 : 0.4);
        for (const f of [0.2, 0.5, 0.8]) ctx.fillText(b.label, W * f, b.y1 - 28);
        return true;
      }
      const fade = b.safe ? clamp01(1 - (b.age - b.hold) / 0.3) : 1;
      ctx.fillStyle = rgba([220, 240, 255], 0.75 * fade); ctx.fillRect(-40, b.y1 - b.r, W + 80, b.r * 2);
      ctx.strokeStyle = rgba(WHITE, 0.95 * fade); ctx.lineWidth = 1.2;
      ctx.beginPath();
      for (let x = 10; x < W; x += 34) for (let j = 0; j < 3; j++) { const a = j * Math.PI / 3; ctx.moveTo(x - Math.cos(a) * 8, b.y1 - Math.sin(a) * 8); ctx.lineTo(x + Math.cos(a) * 8, b.y1 + Math.sin(a) * 8); }
      ctx.stroke();
      return true;
    }
    return false;
  }
  function fire(b) {
    if (b.fw && b.delay <= 0 && !st.gone.includes(b.fw)) {                 // 花火が開いた: 光の粒 ＋ 背景にも大きな花火
      st.gone.push(b.fw); if (st.gone.length > 20) st.gone.shift();
      sparks(b.fw.x, b.fw.y, { n: 40, color: b.color, speed: 320, life: 0.9, size: 2.5, gravity: 120 });
      shockRing(b.fw.x, b.fw.y, { color: b.color, size: 200, life: 0.5, width: 3 });
      window.flash(0.2); shake(5);
      return true;
    }
    if (b.fw) return true;
    if (b.kind === 'ink') { shake(1.5); return true; }
    if (b.kind === 'aurora') return true;
    if (b.kind === 'shell') return true;
    if (b.kind === 'koi') { fxSplash(b.x, GROUND_Y, b); return true; }
    if (b.kind === 'wave') { shake(4); return true; }
    return false;
  }
  // もみじ（弾）
  function bullet(b, c, k) {
    if (b.style === 'leaf') {                                               // 当たるもみじ: 大きく、白いふちどり
      ctx.save(); ctx.shadowColor = 'rgba(255,250,230,0.95)'; ctx.shadowBlur = gfx > 0 ? 8 : 0;
      mapleShape(b.x, b.y, b.r * 1.7, b.rot, c, 1);
      ctx.restore();
      return;
    }
    ctx.fillStyle = rgba(c, 1); ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, TAU); ctx.fill();
  }

  // ---- カメラの中、いちばん上: 手前の粒・季節のかわり目の墨 --------------------------------------------
  function world(T, look, k) {
    drawParticles(true, T);
    if (st.streaks.length) {                                                // 風の筋（筆で払ったような白い線）
      ctx.lineCap = 'round';
      for (const q of st.streaks) {
        const a = Math.sin(Math.PI * clamp01(q.t / 2.5)) * 0.45, dir = Math.sign(q.v);
        ctx.strokeStyle = night() > 0.5 ? `rgba(220,230,255,${a.toFixed(3)})` : `rgba(255,255,255,${a.toFixed(3)})`; ctx.lineWidth = 1.6;
        ctx.beginPath(); ctx.moveTo(q.x, q.y);
        ctx.bezierCurveTo(q.x - dir * q.len * 0.3, q.y - 10 * Math.sin(q.a), q.x - dir * q.len * 0.7, q.y + 12 * Math.cos(q.a), q.x - dir * q.len, q.y + 4);
        ctx.stroke();
      }
    }
    for (const q of st.gold) {                                              // 金の粉（金箔）
      ctx.fillStyle = `rgba(255,214,120,${(0.6 + 0.4 * Math.sin(q.a * 2)).toFixed(3)})`;
      ctx.save(); ctx.translate(q.x, q.y); ctx.rotate(q.a); ctx.scale(1, Math.abs(Math.sin(q.a)) + 0.2); ctx.fillRect(-q.s / 2, -q.s / 2, q.s, q.s); ctx.restore();
    }
  }

  // つららが割れた
  window.fxShatter = function (x, y, b) {
    sparks(x, y - 4, { n: 14, color: '#e8f6ff', speed: 220, life: 0.5, size: 2.4, gravity: 600, dir: -Math.PI / 2, spread: 2.6 });
  };

  function flash(look) {
    ctx.fillStyle = night() > 0.5 ? `rgba(255,240,210,${(0.35 * flashT).toFixed(3)})` : `rgba(255,250,240,${(0.5 * flashT).toFixed(3)})`;
    ctx.fillRect(0, 0, W, H);
  }
  function hint(h, a, T) {
    ctx.save();
    ctx.globalAlpha = clamp01(a);
    ctx.font = '600 24px "Hiragino Mincho ProN", "Yu Mincho", "Noto Serif JP", serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    if ('letterSpacing' in ctx) ctx.letterSpacing = '4px';
    const nt = night() > 0.5;
    ctx.fillStyle = nt ? 'rgba(0,0,20,0.4)' : 'rgba(255,250,240,0.6)'; ctx.fillRect(W / 2 - 230, H * 0.3 - 22, 460, 44);
    ctx.fillStyle = nt ? '#f4eedc' : '#2a1c22'; ctx.fillText(h.text, W / 2, H * 0.3);
    if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';
    ctx.restore();
  }

  // 落款（赤い四角のはんこ）
  function seal(x, y, s, text, a) {
    ctx.save(); ctx.globalAlpha = a; ctx.translate(x, y); ctx.rotate(-0.04);
    ctx.fillStyle = '#b8231c'; ctx.fillRect(-s / 2, -s / 2, s, s);
    ctx.strokeStyle = '#f4ecdc'; ctx.lineWidth = 2; ctx.strokeRect(-s / 2 + 4, -s / 2 + 4, s - 8, s - 8);
    ctx.fillStyle = '#f4ecdc'; ctx.font = `700 ${Math.round(s * 0.42)}px "Hiragino Mincho ProN", "Yu Mincho", serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    if (text.length === 2) { ctx.fillText(text[0], 0, -s * 0.2); ctx.fillText(text[1], 0, s * 0.22); } else ctx.fillText(text, 0, 2);
    ctx.restore();
  }
  // 墨のにじみ（ぎざぎざのふち）
  function inkBlot(x, y, r, a, seed) {
    ctx.fillStyle = `rgba(18,14,22,${a.toFixed(3)})`;
    ctx.beginPath();
    for (let i = 0; i <= 48; i++) {
      const ang = i * TAU / 48, rr = r * (1 + 0.12 * Math.sin(ang * 5 + seed) + 0.07 * Math.sin(ang * 13 + seed * 2));
      ctx.lineTo(x + Math.cos(ang) * rr, y + Math.sin(ang) * rr);
    }
    ctx.closePath(); ctx.fill();
  }

  // 場面の名前: 墨が広がって、大きな筆文字 ＋ 落款。最後は「四季」の落款
  function banner() {
    const bp0 = inSong() ? beatPos(songTime) : 99;
    if (gfx === 2 && night() < 0.5) { ctx.globalAlpha = 1 - night() * 2; ctx.drawImage(st.frame, 0, 0); ctx.globalAlpha = 1; }
    for (const sp of st.splats) {                                           // 当たった: 墨がとびちる
      const a = sp.t < 0.1 ? 1 : clamp01(1 - (sp.t - 0.1) / 1.5), e = easeOut(Math.min(1, sp.t / 0.12));
      inkBlot(sp.x, sp.y, 34 * e, 0.75 * a, sp.seed);
      ctx.fillStyle = `rgba(18,14,22,${(0.7 * a).toFixed(3)})`;
      for (const [dx, dy, r] of sp.drops) { ctx.beginPath(); ctx.arc(sp.x + dx * e, sp.y + dy * e + sp.t * 20, r * (0.6 + 0.4 * e), 0, TAU); ctx.fill(); }
    }
    if (inSong() && bp0 < 8) {                                              // はじまり: 絵巻物がひらく
      const rx = W * easeOut(clamp01((bp0 + 1) / 7));
      ctx.fillStyle = '#2a1c1a'; ctx.fillRect(rx, 0, W - rx + 2, H);
      ctx.fillStyle = 'rgba(184,140,60,0.5)'; for (let y = 12; y < H; y += 24) ctx.fillRect(rx + 30, y, W, 1);
      const g = ctx.createLinearGradient(rx - 14, 0, rx + 14, 0);
      g.addColorStop(0, '#5a3a20'); g.addColorStop(0.45, '#d8b070'); g.addColorStop(1, '#3a2414');
      ctx.fillStyle = g; ctx.fillRect(rx - 14, -10, 28, H + 20);
      ctx.fillStyle = '#c8a050'; ctx.fillRect(rx - 18, -10, 36, 14); ctx.fillRect(rx - 18, H - 4, 36, 14);
    }
    for (const bl of st.blooms) {                                           // 季節のかわり目: 墨が一滴、ひろがって消える
      const p = bl.t / 2.4, r = 40 + 1100 * easeOut(Math.min(1, p * 1.6)), a = p < 0.35 ? 0.9 : clamp01(0.9 * (1 - (p - 0.35) / 0.65));
      inkBlot(bl.x, bl.y, r, a * 0.85, bl.seed);
      inkBlot(bl.x + 30, bl.y - 20, r * 0.6, a * 0.5, bl.seed + 3);
    }
    if (inSong() && SW.end > 0.01) {                                        // 最後: 「四季」の落款
      seal(W - 90, H - 140, 74, '四季', clamp01(SW.end * 1.5));
    }
    const bn = fx.banner;
    if (!bn) return;
    const e = bn.age, DUR = 3.6;
    if (e > DUR) { fx.banner = null; return; }
    const a = e < 0.4 ? e / 0.4 : e > DUR - 0.9 ? (DUR - e) / 0.9 : 1;
    const nt = night() > 0.5;
    ctx.save();
    ctx.globalAlpha = clamp01(a);
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const big = bn.name.length === 1 ? 150 : 96;
    ctx.font = `700 ${big}px "Hiragino Mincho ProN", "Yu Mincho", "Noto Serif JP", serif`;
    const reveal = easeOut(e / 0.9);                                        // 上から下へ、筆で書くように見えてくる
    ctx.save();
    ctx.beginPath(); ctx.rect(0, 200 - big * 0.7, W, big * 1.4 * reveal); ctx.clip();
    ctx.fillStyle = nt ? 'rgba(244,238,220,0.92)' : 'rgba(22,16,22,0.88)';
    ctx.fillText(bn.name, W / 2, 200);
    ctx.restore();
    if (e > 0.6) seal(W / 2 + big * (bn.name.length * 0.5) + 30, 200 + big * 0.35, 46, bn.name.length === 1 ? bn.name : '春', clamp01((e - 0.6) / 0.15));
    ctx.font = '500 16px "Hiragino Mincho ProN", "Yu Mincho", serif';
    if ('letterSpacing' in ctx) ctx.letterSpacing = '4px';
    ctx.fillStyle = nt ? 'rgba(244,238,220,0.85)' : 'rgba(40,28,34,0.85)';
    ctx.fillText(bn.sub, W / 2, 300);
    if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';
    ctx.restore();
  }

  // タイトル画面: 春の木と花びら（背景がもう描いている）＋ ゆっくり落ちる墨のしずく
  function title(look, k, bp) {
    const T = titleClock();
    seal(W - 80, 110, 52, '四季', 0.9);
    const p = (T % 6) / 6;
    if (p < 0.5) { ctx.fillStyle = `rgba(22,16,22,${(0.8 * (1 - p * 2)).toFixed(3)})`; ctx.beginPath(); ctx.arc(W / 2 + 160, 300 + p * 20, 3 + p * 60, 0, TAU); ctx.fill(); }
  }

  THEMES.shiki = {
    noTrails: true, glow: 1.6, noScanlines: true,
    clearColors: ['#ff8fb0', '#ffd27f', '#8fd8ff', '#d8452a', '#ffffff'],
    kinds: { ink, shell, icicle: icicleK, aurora: auroraK, koi: koiK, wave: waveK },
    reset, update, background, floor, platform, bullet, laser, fire, world, flash, hint, banner, title,
  };
})();
