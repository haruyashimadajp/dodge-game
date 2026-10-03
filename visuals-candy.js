"use strict";

/* =========================================================================
   見た目のセット「candy」  —  曲⑬「Candy Pop Parade」用
   パステルのお菓子の国。水玉もようの空、虹、ケーキのお城、しましまの丘とペロペロキャンディの木、
   顔のあるふわふわ雲（拍でぷにっとつぶれる）、ハートの風船、丘からのぞくうさぎ（拍でぴょこぴょこ）。
   床はいちごのショートケーキ、足場はウエハース。
   弾はキャンディ（白いふち ＋ うずまき ＋ つや）、ハート、星、カラースプレー、グミ、しゃぼん玉。
   クマのグミ・キャンディケイン・ドーナツ・ペロペロキャンディ（回る針）は、それぞれの形で描く。
   重くならないよう、ゆっくりしか変わらない背景は cachedLayer（visuals.js）で3コマに1回だけ描き直す。
   ========================================================================= */

(function () {
  const WHITE = [255, 255, 255];
  const INK = [90, 60, 90];
  const PASTEL = ['#ff9ec7', '#ffd3a1', '#fff3a1', '#b9f5c8', '#a9e2ff', '#d6b8ff'].map(rgb);
  const FONT = '"Hiragino Maru Gothic ProN", "Arial Rounded MT Bold", "Varela Round", system-ui, sans-serif';
  const st = { made: false, castle: null, hills: null, cloud: null, cloudBlink: null, floorImg: null, clouds: [], balloons: [], twinkles: [], confetti: [], lastBeat: -99 };
  let SPARK = null, KICK = null;
  const inSong = () => scene !== 'title';

  // ---- 前もって描く絵 ----------------------------------------------------------------------
  function make() {
    st.made = true;
    // ケーキのお城（遠く）
    const c = document.createElement('canvas'); c.width = 300; c.height = 260;
    let g = c.getContext('2d');
    const tower = (x, w, h, col, top) => {
      g.fillStyle = col; g.fillRect(x, 260 - h, w, h);
      g.fillStyle = '#fff'; g.beginPath();                                   // クリームのたれ
      for (let i = 0; i <= 6; i++) { const xx = x + w * i / 6; g.lineTo(xx, 260 - h + 8 + (i % 2) * 8); }
      g.lineTo(x + w, 260 - h); g.lineTo(x, 260 - h); g.closePath(); g.fill();
      g.fillStyle = top; g.beginPath(); g.moveTo(x - 6, 260 - h); g.lineTo(x + w / 2, 260 - h - w * 0.9); g.lineTo(x + w + 6, 260 - h); g.closePath(); g.fill();
      g.fillStyle = '#ff4d6d'; g.beginPath(); g.arc(x + w / 2, 260 - h - w * 0.9 - 6, 7, 0, TAU); g.fill();   // さくらんぼ
      g.strokeStyle = '#5a8a3a'; g.lineWidth = 2; g.beginPath(); g.moveTo(x + w / 2, 260 - h - w * 0.9 - 12); g.quadraticCurveTo(x + w / 2 + 6, 260 - h - w * 0.9 - 22, x + w / 2 + 10, 260 - h - w * 0.9 - 24); g.stroke();
      g.fillStyle = 'rgba(255,255,255,0.7)';
      for (let y = 260 - h + 30; y < 250; y += 34) { g.beginPath(); g.ellipse(x + w / 2, y, 6, 9, 0, 0, TAU); g.fill(); }
    };
    tower(20, 50, 150, '#ffc4dc', '#ff8fbd'); tower(230, 50, 150, '#ffc4dc', '#ff8fbd');
    tower(80, 60, 190, '#ffe3b3', '#ffb3d1'); tower(160, 60, 190, '#ffe3b3', '#ffb3d1');
    tower(120, 60, 230, '#d9c4ff', '#ff8fbd');
    g.fillStyle = '#ffd6e8'; g.fillRect(10, 200, 280, 60);
    g.fillStyle = '#c98b6b'; g.beginPath(); g.arc(150, 260, 26, Math.PI, 0); g.fill();   // 門（チョコ）
    st.castle = c;

    // しましまの丘 ＋ ペロペロキャンディの木（2段）
    st.hills = [0, 1].map(i => {
      const w = W + 200, h = 320, cc = document.createElement('canvas'); cc.width = w; cc.height = h;
      const q = cc.getContext('2d');
      const base = i ? 210 : 150, amp = i ? 40 : 60, col = i ? '#b9f5c8' : '#ffd0e6', stripe = i ? '#9ee8b4' : '#ffb8d8';
      const yAt = x => base - amp * (0.5 + 0.5 * Math.sin(x * (i ? 0.011 : 0.007) + i * 2));
      q.fillStyle = col;
      q.beginPath(); q.moveTo(0, h); for (let x = 0; x <= w; x += 10) q.lineTo(x, yAt(x)); q.lineTo(w, h); q.closePath(); q.fill();
      q.save(); q.clip();
      q.strokeStyle = stripe; q.lineWidth = 14;                              // ななめのしましま
      for (let x = -h; x < w + h; x += 46) { q.beginPath(); q.moveTo(x, h); q.lineTo(x + h, 0); q.stroke(); }
      q.restore();
      q.strokeStyle = '#fff'; q.lineWidth = 6; q.lineCap = 'round';           // ふちのクリーム
      q.beginPath(); for (let x = 0; x <= w; x += 10) q.lineTo(x, yAt(x) + 3 + Math.sin(x * 0.2) * 2); q.stroke();
      for (let t = 0; t < (i ? 5 : 4); t++) {                                  // ペロペロキャンディの木
        const x = 70 + t * (w / (i ? 5 : 4)) + i * 40, y = yAt(x), r = i ? 18 : 14;
        q.strokeStyle = '#fff'; q.lineWidth = 4; q.beginPath(); q.moveTo(x, y + 4); q.lineTo(x, y - 46); q.stroke();
        q.fillStyle = rgba(PASTEL[(t + i * 2) % 6], 1);
        q.beginPath(); q.arc(x, y - 46 - r, r, 0, TAU); q.fill();
        q.strokeStyle = 'rgba(255,255,255,0.9)'; q.lineWidth = 3; q.beginPath();
        for (let a = 0; a < 10; a += 0.2) { const rr = r * a / 10; q.lineTo(x + Math.cos(a * 2) * rr, y - 46 - r + Math.sin(a * 2) * rr); }
        q.stroke();
      }
      return { img: cc, y: GROUND_Y - h + (i ? 20 : -10), speed: i ? 10 : 5 };
    });

    // ふわふわ雲（顔つき）: ふつう ／ まばたき
    const cloudImg = blink => {
      const cc = document.createElement('canvas'); cc.width = 180; cc.height = 100;
      const q = cc.getContext('2d');
      q.fillStyle = '#fff';
      q.beginPath();
      for (const [x, y, r] of [[45, 60, 30], [80, 42, 36], [120, 50, 32], [148, 64, 22], [92, 70, 30], [60, 72, 22]]) { q.moveTo(x + r, y); q.arc(x, y, r, 0, TAU); }
      q.fill();
      q.fillStyle = 'rgba(200,220,255,0.35)'; q.beginPath(); q.ellipse(95, 86, 60, 9, 0, 0, TAU); q.fill();
      q.fillStyle = '#6a4a6a'; q.strokeStyle = '#6a4a6a'; q.lineWidth = 3; q.lineCap = 'round';
      if (blink) { for (const ex of [76, 108]) { q.beginPath(); q.arc(ex, 60, 5, Math.PI * 1.1, Math.PI * 1.9); q.stroke(); } }
      else { for (const ex of [76, 108]) { q.beginPath(); q.arc(ex, 58, 4, 0, TAU); q.fill(); q.fillStyle = '#fff'; q.beginPath(); q.arc(ex + 1.5, 56.5, 1.4, 0, TAU); q.fill(); q.fillStyle = '#6a4a6a'; } }
      q.beginPath(); q.arc(92, 66, 5, 0.15 * Math.PI, 0.85 * Math.PI); q.stroke();
      q.fillStyle = 'rgba(255,140,180,0.55)'; for (const ex of [66, 118]) { q.beginPath(); q.ellipse(ex, 68, 7, 4, 0, 0, TAU); q.fill(); }
      return cc;
    };
    st.cloud = cloudImg(false); st.cloudBlink = cloudImg(true);
    st.clouds = Array.from({ length: 5 }, (_, i) => ({ x: i * 190 + Math.random() * 80, y: 60 + (i % 3) * 70 + Math.random() * 30, s: 0.6 + Math.random() * 0.5, v: 8 + Math.random() * 10, blinkAt: Math.random() * 5 }));

    // いちごのショートケーキの床
    const fw = W + 800, fh = H - GROUND_Y + 60, f = document.createElement('canvas'); f.width = fw; f.height = fh;
    g = f.getContext('2d');
    g.fillStyle = '#ffe6a8'; g.fillRect(0, 0, fw, fh);                       // スポンジ
    g.fillStyle = 'rgba(230,180,90,0.35)'; for (let i = 0; i < 300; i++) g.fillRect(Math.random() * fw, 14 + Math.random() * (fh - 14), 2, 2);
    g.fillStyle = '#ff6f91'; g.fillRect(0, 26, fw, 7);                         // いちごジャム
    g.fillStyle = '#fff'; g.fillRect(0, 33, fw, 5);
    g.fillStyle = '#fff9fb';                                                    // 上のクリーム（たれる）
    g.beginPath(); g.moveTo(0, 0); g.lineTo(fw, 0);
    for (let x = fw; x >= 0; x -= 20) g.lineTo(x, 12 + (Math.sin(x * 0.07) > 0.6 ? 10 : 0) + Math.sin(x * 0.3) * 2);
    g.closePath(); g.fill();
    for (let x = 30; x < fw; x += 120) {                                       // いちご
      g.fillStyle = '#ff3d6b'; g.beginPath(); g.moveTo(x - 9, -2); g.quadraticCurveTo(x, 22, x + 9, -2); g.quadraticCurveTo(x, -10, x - 9, -2); g.fill();
      g.fillStyle = '#ffe066'; for (const [dx, dy] of [[-3, 2], [3, 3], [0, 8]]) g.fillRect(x + dx, dy, 1.6, 1.6);
    }
    st.floorImg = f;
  }
  function reset() {
    if (!st.made) make();
    Object.assign(st, { balloons: [], twinkles: [], confetti: [], lastBeat: -99 });
  }

  function onBeat(b) {
    if (!SPARK) { SPARK = new Set(SCORE_CANDY.sparkle); KICK = new Set(SCORE_CANDY.kick); }
    if (SPARK.has(b)) for (let i = 0; i < 14; i++) st.twinkles.push({ x: Math.random() * W, y: 40 + Math.random() * 420, t: 0, r: 8 + Math.random() * 14, c: PASTEL[i % 6] });
    if (KICK.has(b) && Math.random() < 0.5) st.twinkles.push({ x: Math.random() * W, y: 40 + Math.random() * 300, t: 0, r: 6 + Math.random() * 8, c: PASTEL[(Math.random() * 6) | 0] });
  }

  function update(dt, T, look) {
    if (!st.made) make();
    const bp = inSong() ? beatPos(T) : titleBeat();
    if (scene === 'play') {
      const b = Math.floor(bp + 0.02);
      if (b !== st.lastBeat) { if (b === st.lastBeat + 1) onBeat(b); st.lastBeat = b; }
    }
    for (const c of st.clouds) { c.x += c.v * dt; if (c.x > W + 40) { c.x = -200; c.y = 50 + Math.random() * 200; } }
    if (st.balloons.length < 8 && Math.random() < dt * 0.8) st.balloons.push({ x: Math.random() * W, y: H + 40, v: 30 + Math.random() * 25, c: PASTEL[(Math.random() * 6) | 0], ph: Math.random() * TAU, s: 0.7 + Math.random() * 0.5 });
    for (const q of st.balloons) { q.y -= q.v * dt; q.x += Math.sin(T * 0.8 + q.ph) * 10 * dt; }
    st.balloons = st.balloons.filter(q => q.y > -80);
    for (const q of st.twinkles) q.t += dt;
    st.twinkles = st.twinkles.filter(q => q.t < 0.8);
    for (const q of st.confetti) { q.t += dt; q.vy += 300 * dt; q.x += q.vx * dt; q.y += q.vy * dt; q.a += q.va * dt; }
    st.confetti = st.confetti.filter(q => q.t < 2 && q.y < H);
  }

  // ---- 背景 ------------------------------------------------------------------------------
  function background(T, look, k, bk, bp) {
    if (!st.made) make();
    // 空・水玉・虹・お城・丘はゆっくりしか動かないので、3コマに1回だけ描き直した絵を貼る
    ctx.drawImage(cachedLayer('candySky', 3, 0, g => {
      const gr = g.createLinearGradient(0, 0, 0, GROUND_Y);
      gr.addColorStop(0, rgba(look.skyTop, 1)); gr.addColorStop(1, rgba(look.skyBot, 1));
      g.fillStyle = gr; g.fillRect(0, 0, W, H);
      g.fillStyle = 'rgba(255,255,255,0.28)';                                 // 水玉（ななめにゆっくり流れる）
      const off = (T * 6) % 60;
      for (let y = -60; y < GROUND_Y; y += 60) for (let x = -60; x < W + 60; x += 60) {
        const xx = x + off + ((y / 60) % 2 ? 30 : 0), yy = y + off;
        g.beginPath(); g.arc(xx, yy, 5, 0, TAU); g.fill();
      }
      g.lineWidth = 16;                                                       // 虹
      const rcx = W / 2, rcy = GROUND_Y + 60;
      PASTEL.forEach((c, i) => { g.strokeStyle = rgba(c, 0.55); g.beginPath(); g.arc(rcx, rcy, 470 - i * 16, Math.PI, TAU); g.stroke(); });
      g.drawImage(st.castle, W / 2 - 150, GROUND_Y - 300);
      for (const h of st.hills) { const o = -((T * h.speed) % 200); g.drawImage(h.img, o, h.y); }
    }), 0, 0, W, H);
    // ふわふわ雲（キックでぷにっとつぶれる。ときどきまばたき）
    for (const c of st.clouds) {
      const sq = 1 + 0.12 * k, img = (T + c.blinkAt) % 4 < 0.15 ? st.cloudBlink : st.cloud;
      const w = 180 * c.s * sq, h = 100 * c.s / sq;
      ctx.drawImage(img, c.x, c.y + (100 * c.s - h), w, h);
    }
    // ハートの風船
    for (const q of st.balloons) {                                          // まるい風船（当たるハートとまちがえないように、まる）
      ctx.fillStyle = rgba(q.c, 0.7); ctx.beginPath(); ctx.ellipse(q.x, q.y, 13 * q.s, 16 * q.s, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.beginPath(); ctx.ellipse(q.x - 5 * q.s, q.y - 6 * q.s, 3 * q.s, 5 * q.s, -0.4, 0, TAU); ctx.fill();
      ctx.strokeStyle = 'rgba(150,120,150,0.45)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(q.x, q.y + 16 * q.s); ctx.quadraticCurveTo(q.x + 6, q.y + 30 * q.s, q.x, q.y + 46 * q.s); ctx.stroke();
    }
    // 丘からのぞくうさぎ（拍でぴょこっ）
    bunny(W - 110, GROUND_Y - 150 - 14 * k * (look.tier > 2 ? 2 : 1), 1, k, T);
  }
  function bunny(x, y, s, k, T) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    ctx.fillStyle = '#fff'; ctx.strokeStyle = 'rgba(200,150,190,0.8)'; ctx.lineWidth = 2;
    for (const sx of [-1, 1]) {                                             // 耳（拍でぴくっ）
      ctx.save(); ctx.translate(sx * 12, -22); ctx.rotate(sx * (0.15 + 0.15 * k));
      ctx.beginPath(); ctx.ellipse(0, -24, 9, 26, 0, 0, TAU); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#ffc4dc'; ctx.beginPath(); ctx.ellipse(0, -24, 4, 18, 0, 0, TAU); ctx.fill(); ctx.fillStyle = '#fff';
      ctx.restore();
    }
    ctx.beginPath(); ctx.ellipse(0, 0, 30, 26, 0, 0, TAU); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#5a3a5a';
    const blink = (T % 3.7) < 0.12;
    for (const sx of [-1, 1]) { if (blink) ctx.fillRect(sx * 11 - 4, -3, 8, 2); else { ctx.beginPath(); ctx.arc(sx * 11, -3, 3.5, 0, TAU); ctx.fill(); } }
    ctx.fillStyle = 'rgba(255,130,170,0.6)'; for (const sx of [-1, 1]) { ctx.beginPath(); ctx.ellipse(sx * 18, 6, 6, 3.5, 0, 0, TAU); ctx.fill(); }
    ctx.strokeStyle = '#5a3a5a'; ctx.lineWidth = 1.8;                          // ω の口
    ctx.beginPath(); ctx.arc(-3, 6, 3, 0, Math.PI); ctx.arc(3, 6, 3, 0, Math.PI); ctx.stroke();
    ctx.restore();
  }
  function heartShape(x, y, s, c, a = 1, string = false) {
    ctx.fillStyle = rgba(c, a);
    ctx.beginPath(); ctx.moveTo(x, y + s * 0.9);
    ctx.bezierCurveTo(x - s * 1.4, y - s * 0.1, x - s * 0.7, y - s * 1.2, x, y - s * 0.45);
    ctx.bezierCurveTo(x + s * 0.7, y - s * 1.2, x + s * 1.4, y - s * 0.1, x, y + s * 0.9);
    ctx.fill();
    if (string) { ctx.strokeStyle = 'rgba(150,120,150,0.5)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x, y + s * 0.9); ctx.quadraticCurveTo(x + 6, y + s * 2, x, y + s * 3.2); ctx.stroke(); }
  }

  // ---- 床・足場 ----------------------------------------------------------------------------
  function floor(look, k) {
    ctx.drawImage(st.floorImg, -400, GROUND_Y);
  }
  function platform(p, look, k) {                                            // ウエハース ＋ クリーム ＋ スプレー
    ctx.fillStyle = '#f2c98a'; ctx.fillRect(p.x, p.y + 3, p.w, p.h - 3);
    ctx.strokeStyle = 'rgba(190,130,60,0.55)'; ctx.lineWidth = 1;
    ctx.beginPath(); for (let x = p.x + 8; x < p.x + p.w; x += 8) { ctx.moveTo(x, p.y + 4); ctx.lineTo(x, p.y + p.h); } ctx.stroke();
    ctx.fillStyle = '#fff6fa'; roundRect(p.x - 3, p.y - 3, p.w + 6, 8, 4); ctx.fill();
    for (let i = 0; i < p.w / 12; i++) { ctx.fillStyle = rgba(PASTEL[i % 6], 1); ctx.fillRect(p.x + 4 + i * 12, p.y - 1 + (i % 2), 5, 2); }
  }

  // ---- 弾 --------------------------------------------------------------------------------
  function candyBall(x, y, r, c) {
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(x, y, r + 2.5, 0, TAU); ctx.fill();
    ctx.fillStyle = rgba(c, 1); ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.75)'; ctx.lineWidth = Math.max(1.2, r * 0.18);   // うずまき
    ctx.beginPath(); ctx.arc(x, y, r * 0.55, 0.2, Math.PI * 1.3); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.9)'; ctx.beginPath(); ctx.arc(x - r * 0.38, y - r * 0.4, r * 0.22, 0, TAU); ctx.fill();
  }
  function starShape(x, y, r, c, rot) {
    ctx.beginPath();
    for (let i = 0; i < 10; i++) { const a = rot - Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * 0.5 : r * 1.25; ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
    ctx.closePath();
    ctx.lineWidth = 3; ctx.strokeStyle = '#fff'; ctx.lineJoin = 'round'; ctx.stroke();
    ctx.fillStyle = rgba(c, 1); ctx.fill();
  }
  function bullet(b, c, k) {
    const st2 = b.style;
    if (st2 === 'heart') {
      heartShape(b.x, b.y, b.r * 1.35 + 2, WHITE, 1); heartShape(b.x, b.y, b.r * 1.35, c, 1);
      ctx.fillStyle = 'rgba(255,255,255,0.85)'; ctx.beginPath(); ctx.arc(b.x - b.r * 0.45, b.y - b.r * 0.25, b.r * 0.22, 0, TAU); ctx.fill();
      return;
    }
    if (st2 === 'star') { starShape(b.x, b.y, b.r, c, b.age * 4); return; }
    if (st2 === 'sprinkle') {
      const a = Math.atan2(b.vy || 1, b.vx || 0) + Math.sin(b.age * 8) * 0.4;
      ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(a);
      ctx.fillStyle = '#fff'; roundRect(-b.r * 1.7 - 2, -b.r * 0.7 - 2, b.r * 3.4 + 4, b.r * 1.4 + 4, b.r * 0.7 + 2); ctx.fill();
      ctx.fillStyle = rgba(c, 1); roundRect(-b.r * 1.7, -b.r * 0.7, b.r * 3.4, b.r * 1.4, b.r * 0.7); ctx.fill();
      ctx.restore();
      return;
    }
    if (st2 === 'gumdrop') {                                                // グミ（はねるとつぶれる）
      const sq = b.squash || 0, w = b.r * (1.15 + 0.35 * sq), h = b.r * (1.15 - 0.4 * sq);
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.ellipse(b.x, b.y + b.r - h, w + 2.5, h + 2.5, 0, Math.PI, TAU); ctx.lineTo(b.x + w + 2.5, b.y + b.r + 2); ctx.lineTo(b.x - w - 2.5, b.y + b.r + 2); ctx.fill();
      ctx.fillStyle = rgba(c, 0.95); ctx.beginPath(); ctx.ellipse(b.x, b.y + b.r - h, w, h, 0, Math.PI, TAU); ctx.lineTo(b.x + w, b.y + b.r); ctx.lineTo(b.x - w, b.y + b.r); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.8)';
      for (const [dx, dy] of [[-0.4, -0.5], [0.2, -0.8], [0.5, -0.2], [-0.1, -0.1]]) ctx.fillRect(b.x + dx * w, b.y + b.r - h + dy * h + h * 0.8, 2, 2);
      return;
    }
    if (st2 === 'bubble') {                                                 // しゃぼん玉
      const g = ctx.createRadialGradient(b.x - b.r * 0.3, b.y - b.r * 0.3, b.r * 0.1, b.x, b.y, b.r);
      g.addColorStop(0, 'rgba(255,255,255,0.05)'); g.addColorStop(0.75, 'rgba(200,230,255,0.18)'); g.addColorStop(1, 'rgba(255,170,220,0.5)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, TAU); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.9)'; ctx.lineWidth = 2; ctx.stroke();
      ctx.beginPath(); ctx.arc(b.x, b.y, b.r * 0.7, -2.4, -1.6); ctx.stroke();
      return;
    }
    candyBall(b.x, b.y, b.r, c);
  }

  // キャンディケイン（赤白しま模様の杖）
  function cane(b, T, k) {
    const c = bulletColor(b);
    if (b.delay > 0) {
      const p = 1 - b.delay / b.delayMax;
      ctx.strokeStyle = rgba(c, 0.2 + 0.4 * p); ctx.setLineDash([4, 8]); ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(b.x, 0); ctx.lineTo(b.x, GROUND_Y); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = rgba(c, 0.6 + 0.4 * p); ctx.beginPath(); ctx.moveTo(b.x - 8, 6); ctx.lineTo(b.x + 8, 6); ctx.lineTo(b.x, 18); ctx.closePath(); ctx.fill();
      return;
    }
    ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(b.ang);
    const L = b.len / 2;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 13;
    ctx.beginPath(); ctx.moveTo(-L, 0); ctx.lineTo(L - 10, 0); ctx.arc(L - 10, -10, 10, Math.PI / 2, -Math.PI / 2, true); ctx.stroke();
    ctx.strokeStyle = rgba(c, 1); ctx.lineWidth = 9;
    ctx.beginPath(); ctx.moveTo(-L, 0); ctx.lineTo(L - 10, 0); ctx.arc(L - 10, -10, 10, Math.PI / 2, -Math.PI / 2, true); ctx.stroke();
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.lineCap = 'butt';
    ctx.beginPath(); for (let x = -L + 4; x < L - 10; x += 9) { ctx.moveTo(x, 4); ctx.lineTo(x + 5, -4); } ctx.stroke();
    ctx.restore();
  }
  // クマのグミ（すけた色 ＋ 顔）
  function bear(b, T, k) {
    const c = bulletColor(b);
    if (b.delay > 0) {
      const p = 1 - b.delay / b.delayMax, x = b.v > 0 ? 24 : W - 24;
      ctx.fillStyle = rgba(c, 0.4 + 0.5 * p * (Math.floor(T * 8) % 2 ? 1 : 0.6));
      ctx.font = `800 26px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(b.v > 0 ? '▶' : '◀', x, GROUND_Y - 30);
      return;
    }
    const x = b.x, yb = GROUND_Y - b.hop, h = b.h, w = b.w;
    ctx.save(); ctx.translate(x, yb);
    const body = rgba(c, 0.82), edge = rgba(mixC(c, [80, 30, 40], 0.3), 0.9);
    ctx.fillStyle = body; ctx.strokeStyle = edge; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(0, -h * 0.33, w * 0.5, h * 0.36, 0, 0, TAU); ctx.fill(); ctx.stroke();       // からだ
    ctx.beginPath(); ctx.arc(0, -h * 0.78, w * 0.4, 0, TAU); ctx.fill(); ctx.stroke();                         // 頭
    for (const sx of [-1, 1]) { ctx.beginPath(); ctx.arc(sx * w * 0.32, -h * 1.02, w * 0.15, 0, TAU); ctx.fill(); ctx.stroke(); }
    const step = Math.sin(b.age * 15) * 3;
    for (const sx of [-1, 1]) { ctx.beginPath(); ctx.ellipse(sx * w * 0.25, -4 + sx * step * 0.3, w * 0.16, 6, 0, 0, TAU); ctx.fill(); ctx.stroke(); }
    ctx.fillStyle = 'rgba(255,255,255,0.45)'; ctx.beginPath(); ctx.ellipse(-w * 0.18, -h * 0.85, w * 0.1, h * 0.06, -0.5, 0, TAU); ctx.fill();
    ctx.fillStyle = '#4a2a3a';
    for (const sx of [-1, 1]) { ctx.beginPath(); ctx.arc(sx * w * 0.14, -h * 0.8, 2.2, 0, TAU); ctx.fill(); }
    ctx.beginPath(); ctx.arc(0, -h * 0.72, 2, 0, TAU); ctx.fill();
    ctx.restore();
  }
  // ドーナツ（かじった所がすき間）
  function donutK(b, T, k) {
    const c = bulletColor(b);
    const R = b.delay > 0 ? b.r0 : b.ringR, a0 = b.gapA + b.gap / 2, a1 = b.gapA - b.gap / 2 + TAU;
    if (b.delay > 0) {                                                      // 予告: 広がる道すじ（点線の輪）＋ すき間の矢印
      const p = 1 - b.delay / b.delayMax;
      ctx.strokeStyle = rgba(c, 0.25 + 0.4 * p); ctx.lineWidth = 2; ctx.setLineDash([6, 8]);
      for (const rr of [120, 260, 420]) { ctx.beginPath(); ctx.arc(b.x, b.y, rr, a0, a1); ctx.stroke(); }
      ctx.setLineDash([]);
      ctx.fillStyle = rgba(WHITE, 0.6 + 0.4 * p);
      for (const rr of [140, 280]) { const x = b.x + Math.cos(b.gapA) * rr, y = b.y + Math.sin(b.gapA) * rr; ctx.beginPath(); ctx.arc(x, y, 6, 0, TAU); ctx.fill(); }
    }
    const t = b.thick;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#e8b27a'; ctx.lineWidth = t + 6; ctx.beginPath(); ctx.arc(b.x, b.y, R, a0, a1); ctx.stroke();   // 生地
    ctx.strokeStyle = rgba(c, 1); ctx.lineWidth = t - 4; ctx.beginPath(); ctx.arc(b.x, b.y, R - 2, a0 + 0.02, a1 - 0.02); ctx.stroke();   // アイシング
    const n = Math.max(6, Math.floor(R / 10));
    for (let i = 0; i < n; i++) {                                           // スプレー
      const a = a0 + (a1 - a0) * (i + 0.5) / n, rr = R - 2 + ((i * 7) % 5 - 2) * 2;
      ctx.fillStyle = rgba(PASTEL[i % 6], 1);
      ctx.save(); ctx.translate(b.x + Math.cos(a) * rr, b.y + Math.sin(a) * rr); ctx.rotate(a + i); ctx.fillRect(-3, -1, 6, 2.4); ctx.restore();
    }
  }
  // ペロペロキャンディ（回る針）。それ以外のレーザーは、ふつうの見た目
  function laser(b, c, T, k) {
    if (!b.lolli) return false;
    const tipX = b.x2, tipY = b.y2;
    if (b.delay > 0) {
      const p = 1 - b.delay / b.delayMax;
      ctx.strokeStyle = rgba(c, 0.2 + 0.4 * p); ctx.lineWidth = b.r * 2; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(b.x1, b.y1); ctx.lineTo(tipX, tipY); ctx.stroke();
    } else {
      if (b.gx != null && !b.safe) {                                        // 次に止まる所
        ctx.strokeStyle = rgba(c, 0.35); ctx.lineWidth = 2; ctx.setLineDash([6, 8]);
        ctx.beginPath(); ctx.moveTo(b.gx1, b.gy1); ctx.lineTo(b.gx, b.gy); ctx.stroke(); ctx.setLineDash([]);
        ctx.fillStyle = rgba(c, 0.25); ctx.beginPath(); ctx.arc(b.gx, b.gy, 20, 0, TAU); ctx.fill();
      }
      const fade = b.safe ? clamp01(1 - (b.age - b.hold) / 0.3) : 1;
      ctx.globalAlpha = fade;
      ctx.lineCap = 'round';
      ctx.strokeStyle = '#fff'; ctx.lineWidth = b.r * 2 + 4; ctx.beginPath(); ctx.moveTo(b.x1, b.y1); ctx.lineTo(tipX, tipY); ctx.stroke();
      ctx.strokeStyle = rgba(c, 1); ctx.lineWidth = b.r * 2 - 2; ctx.beginPath(); ctx.moveTo(b.x1, b.y1); ctx.lineTo(tipX, tipY); ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = 3; ctx.setLineDash([8, 10]); ctx.lineDashOffset = -T * 60;
      ctx.beginPath(); ctx.moveTo(b.x1, b.y1); ctx.lineTo(tipX, tipY); ctx.stroke(); ctx.setLineDash([]);
      // 先のうずまきキャンディ
      const R = 20;
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(tipX, tipY, R + 3, 0, TAU); ctx.fill();
      ctx.fillStyle = rgba(c, 1); ctx.beginPath(); ctx.arc(tipX, tipY, R, 0, TAU); ctx.fill();
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.beginPath();
      for (let a = 0; a < 12; a += 0.25) { const rr = R * a / 12; ctx.lineTo(tipX + Math.cos(a * 1.6 + T * 4) * rr, tipY + Math.sin(a * 1.6 + T * 4) * rr); }
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
    // まん中のキャンディ
    const cx = b.x1 - (b.x2 - b.x1) * (30 / Math.max(1, Math.hypot(b.x2 - b.x1, b.y2 - b.y1))), cy = b.y1 - (b.y2 - b.y1) * (30 / Math.max(1, Math.hypot(b.x2 - b.x1, b.y2 - b.y1)));
    candyBall(cx, cy, 16, c);
    return true;
  }

  window.fxPop = function (x, y, b) {
    sparks(x, y, { n: 12, color: '#ffffff', speed: 200, life: 0.4, size: 2.5, gravity: 0 });
    shockRing(x, y, { color: '#bfe8ff', size: 50, life: 0.3, width: 2 });
  };
  function fire(b) {
    if (b.kind === 'bear' || b.kind === 'donut') { sparks(b.x, b.kind === 'bear' ? GROUND_Y - 20 : b.y, { n: 14, color: '#ffb3d1', speed: 220, life: 0.5, size: 3, gravity: 200 }); return true; }
    return false;
  }

  // ---- カメラの中（いちばん上）: きらきら ------------------------------------------------------
  function world(T, look, k) {
    for (const q of st.twinkles) {
      const a = Math.sin(Math.PI * q.t / 0.8), r = q.r * (0.5 + 0.5 * a);
      ctx.globalAlpha = a;                                                  // 4つの角のきらきら（当たる星は5つの角）
      ctx.fillStyle = rgba(mixC(q.c, WHITE, 0.5), 1);
      ctx.beginPath();
      for (let i = 0; i < 8; i++) { const ang = i * Math.PI / 4, rr = i % 2 ? r * 0.12 : r * 0.6; ctx.lineTo(q.x + Math.cos(ang) * rr, q.y + Math.sin(ang) * rr); }
      ctx.closePath(); ctx.fill();
      ctx.globalAlpha = 1;
    }
  }

  function flash(look) {
    ctx.fillStyle = `rgba(255,240,250,${(0.45 * flashT).toFixed(3)})`;
    ctx.fillRect(0, 0, W, H);
  }
  function hint(h, a, T) {                                                   // ピンクの吹き出し
    ctx.save();
    ctx.globalAlpha = clamp01(a);
    ctx.font = `800 22px ${FONT}`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const w = ctx.measureText(h.text).width + 44, x = W / 2 - w / 2, y = H * 0.33 - 24 + Math.sin(T * 5) * 3;
    ctx.fillStyle = '#fff'; roundRect(x, y, w, 48, 24); ctx.fill();
    ctx.strokeStyle = '#ff8fbd'; ctx.lineWidth = 4; ctx.stroke();
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.moveTo(W / 2 - 10, y + 46); ctx.lineTo(W / 2, y + 60); ctx.lineTo(W / 2 + 10, y + 46); ctx.fill();
    ctx.fillStyle = '#c0407a'; ctx.fillText(h.text, W / 2, y + 25);
    ctx.restore();
  }
  // 場面の名前: 1文字ずつ、ぽよんと跳ねて出てくる（パステルの色 ＋ 白いふち）
  function banner() {
    const bn = fx.banner;
    if (!bn) return;
    const e = bn.age, DUR = 2.6;
    if (e > DUR) { fx.banner = null; return; }
    const a = e > DUR - 0.5 ? (DUR - e) / 0.5 : 1;
    ctx.save();
    ctx.globalAlpha = clamp01(a);
    ctx.font = `900 44px ${FONT}`;
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    const chars = [...bn.name], widths = chars.map(ch => ctx.measureText(ch).width), total = widths.reduce((p, q) => p + q, 0);
    let x = W / 2 - total / 2;
    chars.forEach((ch, i) => {
      const t = e - i * 0.05, pop = t < 0 ? 0 : t < 0.35 ? Math.sin(t / 0.35 * Math.PI) * -26 + (1 - t / 0.35) * 0 : Math.sin((t - 0.35) * 6) * 2;
      if (t >= 0) {
        const y = 112 + pop;
        ctx.lineWidth = 8; ctx.strokeStyle = '#fff'; ctx.lineJoin = 'round'; ctx.strokeText(ch, x, y);
        ctx.fillStyle = rgba(mixC(PASTEL[i % 6], [200, 60, 130], 0.35), 1); ctx.fillText(ch, x, y);
      }
      x += widths[i];
    });
    ctx.font = `800 16px ${FONT}`; ctx.textAlign = 'center';
    ctx.lineWidth = 5; ctx.strokeStyle = '#fff'; ctx.strokeText(bn.sub, W / 2, 152);
    ctx.fillStyle = '#c0407a'; ctx.fillText(bn.sub, W / 2, 152);
    ctx.restore();
  }
  // タイトル: キャンディとハートがくるくる、うさぎが手前でぴょこぴょこ
  function title(look, k, bp) {
    for (let i = 0; i < 10; i++) {
      const a = bp * 0.2 + i / 10 * TAU, x = W / 2 + Math.cos(a) * 250, y = 260 + Math.sin(a) * 110 - Math.abs(Math.sin(bp * Math.PI + i)) * 12;
      if (i % 2) heartShape(x, y, 13, PASTEL[i % 6], 1); else candyBall(x, y, 11, PASTEL[i % 6]);
    }
    bunny(120, GROUND_Y - 40 - Math.abs(Math.sin(bp * Math.PI)) * 30, 0.9, k, titleClock());
  }

  THEMES.candy = {
    noTrails: true, noScanlines: true, glow: 1.0,
    clearColors: ['#ff9ec7', '#ffd3a1', '#fff3a1', '#b9f5c8', '#a9e2ff', '#d6b8ff'],
    kinds: { cane, bear, donut: donutK },
    reset, update, background, floor, platform, bullet, laser, fire, world, flash, hint, banner, title,
  };
})();
