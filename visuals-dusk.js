"use strict";

/* =========================================================================
   見た目のセット「dusk」  —  曲③「モラトリウム」用
   テーマは「夕暮れの時計塔の中」。石の壁にあいた大きなバラ窓（ステンドグラス）が、
   そのまま時計の文字盤になっている。窓の向こうには沈みかけの太陽と遠くの町、渡り鳥。
   窓から床へ光の筋が落ち、床には窓の模様の光が映る。左右には細長いアーチ窓、すみでは真鍮の歯車。
   時計の針は拍ごとにカチッと進み、時間停止（timeStop）中は針も鳥も光の粒もぴたりと止まる。
   場面の tier（盛り上がりの段階 0〜5）で、光の筋の強さ・歯車の速さ・光の粒の数が変わる。
   重くならないよう、壁と窓はまとめて cachedLayer（3コマに1回描き直す）に描く。
   ========================================================================= */

(function () {
  const CX = W / 2, CY = 285, CR = 212;               // バラ窓（= 時計）の中心と、ガラスの半径
  const RING = 250;                                   // 窓のまわりの石の輪の外側
  const SERIF = '"Hiragino Mincho ProN", "Yu Mincho", "Noto Serif JP", serif';
  const GOLD = rgb('#ffd27a'), CREAM = rgb('#fff1d6'), STONE = rgb('#2a1822'), IRON = rgb('#1a0f14');
  const GLASS = ['#d8344a', '#f2a23a', '#3a5bd8', '#2f9e74', '#9b4fd0', '#f2d06a'].map(rgb);

  // ---- 1回だけ作る絵 -------------------------------------------------------
  let wall = null, gears = null, shafts = null, floorArt = null, glassMul = null, glassLit = null, tracery = null;
  // 花びら形（とがったアーチ）のガラス: 角度 a、半径 r0〜r1、はば w（ラジアン）
  function petal(g, a, r0, r1, w) {
    const P = (ang, r) => [CX + Math.cos(ang) * r, CY + Math.sin(ang) * r];
    const rm = r0 + (r1 - r0) * 0.55;
    g.beginPath();
    g.arc(CX, CY, r0, a + w, a - w, true);
    g.lineTo(...P(a - w, rm));
    const [tx, ty] = P(a, r1), [c1x, c1y] = P(a - w * 0.9, r1 - (r1 - rm) * 0.25), [c2x, c2y] = P(a + w * 0.9, r1 - (r1 - rm) * 0.25);
    g.quadraticCurveTo(c1x, c1y, tx, ty);
    g.quadraticCurveTo(c2x, c2y, ...P(a + w, rm));
    g.closePath();
  }
  // とがったアーチの窓（左右の細長い窓）
  function lancet(g, x, y, w, h, keep) {
    if (!keep) g.beginPath();
    g.moveTo(x, y + h); g.lineTo(x, y + w * 0.6);
    g.quadraticCurveTo(x, y, x + w / 2, y - w * 0.2);
    g.quadraticCurveTo(x + w, y, x + w, y + w * 0.6);
    g.lineTo(x + w, y + h); g.closePath();
  }
  const SIDE = [[26, 190, 74, 400], [W - 100, 190, 74, 400]];

  function makeArt() {
    // 石の壁（ブロックを少しずつ明るさを変えて積む）
    wall = document.createElement('canvas');
    wall.width = W; wall.height = H;
    let g = wall.getContext('2d');
    g.fillStyle = rgba(STONE, 1); g.fillRect(0, 0, W, H);
    for (let row = 0, y = 0; y < H; row++, y += 34) {
      for (let x = -(row % 2) * 38; x < W; x += 76) {
        const l = 0.75 + Math.random() * 0.5;
        g.fillStyle = rgba(STONE.map(v => v * l), 1);
        g.fillRect(x + 2, y + 2, 72, 30);
        g.fillStyle = 'rgba(255,220,200,0.05)'; g.fillRect(x + 2, y + 2, 72, 2);
      }
    }
    // 窓のくぼみ（石の輪のかげ）＋ 左右の窓のかげ
    g.fillStyle = 'rgba(0,0,0,0.35)';
    g.beginPath(); g.arc(CX, CY, RING + 14, 0, TAU); g.fill();
    for (const [x, y, w, h] of SIDE) { lancet(g, x - 8, y - 6, w + 16, h + 10); g.fill(); }
    // 窓のまわりの石の輪（彫りこんだ溝 ＋ 金のローマ数字）
    g.fillStyle = '#4a2d34';
    g.beginPath(); g.arc(CX, CY, RING, 0, TAU); g.arc(CX, CY, CR - 2, 0, TAU, true); g.fill();
    g.strokeStyle = 'rgba(255,214,170,0.25)'; g.lineWidth = 2;
    g.beginPath(); g.arc(CX, CY, RING - 4, 0, TAU); g.stroke();
    g.strokeStyle = 'rgba(0,0,0,0.5)';
    g.beginPath(); g.arc(CX, CY, CR + 3, 0, TAU); g.stroke();
    for (let i = 0; i < 60; i++) {
      const a = i / 60 * TAU, big = i % 5 === 0, r0 = RING - (big ? 14 : 8), r1 = RING - 3;
      g.strokeStyle = big ? 'rgba(255,214,140,0.85)' : 'rgba(255,214,140,0.35)'; g.lineWidth = big ? 3 : 1.5;
      g.beginPath(); g.moveTo(CX + Math.cos(a) * r0, CY + Math.sin(a) * r0); g.lineTo(CX + Math.cos(a) * r1, CY + Math.sin(a) * r1); g.stroke();
    }
    g.font = `700 21px ${SERIF}`; g.textAlign = 'center'; g.textBaseline = 'middle';
    ['XII', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI'].forEach((t, i) => {
      const a = i / 12 * TAU - Math.PI / 2, x = CX + Math.cos(a) * (CR + 15), y = CY + Math.sin(a) * (CR + 15);
      g.save(); g.translate(x, y); g.rotate(a + Math.PI / 2);
      g.fillStyle = 'rgba(0,0,0,0.6)'; g.fillText(t, 1, 2);
      g.fillStyle = '#ffd27a'; g.fillText(t, 0, 0);
      g.restore();
    });
    // 下の方ほど暗い（床に近い所は光が届かない）
    const gr = g.createLinearGradient(0, 0, 0, H);
    gr.addColorStop(0, 'rgba(0,0,0,0.25)'); gr.addColorStop(0.5, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,0,0.45)');
    g.fillStyle = gr; g.fillRect(0, 0, W, H);

    // ステンドグラスの色（multiply で空に重ねる。ガラスの外は白 = 変わらない）・光の当たり・石と鉛の線
    const mk = () => { const c = document.createElement('canvas'); c.width = W; c.height = H; return c; };
    glassMul = mk(); glassLit = mk(); tracery = mk();
    g = glassMul.getContext('2d');
    g.fillStyle = '#fff'; g.fillRect(0, 0, W, H);
    const lit = glassLit.getContext('2d');
    for (let i = 0; i < 12; i++) {
      const a = i / 12 * TAU - Math.PI / 2;
      petal(g, a, 122, 206, 0.2);
      g.fillStyle = rgba(mixC(GLASS[i % 6], [255, 230, 210], 0.3), 1); g.fill();
      g.beginPath(); g.arc(CX + Math.cos(a + Math.PI / 12) * 98, CY + Math.sin(a + Math.PI / 12) * 98, 18, 0, TAU);
      g.fillStyle = rgba(mixC(GLASS[(i + 3) % 6], [255, 230, 210], 0.3), 1); g.fill();
      petal(lit, a, 122, 206, 0.2);                               // 光の当たる下側のガラスほど明るい
      lit.fillStyle = rgba(mixC(GLASS[i % 6], [255, 255, 255], 0.3), 0.1 + 0.15 * Math.max(0, Math.sin(a))); lit.fill();
    }
    g.beginPath(); g.arc(CX, CY, 64, 0, TAU); g.fillStyle = 'rgb(255,236,200)'; g.fill();
    for (const [x, y, w, h] of SIDE) {
      g.save(); lancet(g, x, y, w, h); g.clip();
      g.fillStyle = rgba(mixC(GLASS[x < CX ? 1 : 4], [255, 255, 255], 0.45), 1); g.fillRect(x, y - 20, w, h + 20);
      g.restore();
    }
    g = tracery.getContext('2d');
    g.strokeStyle = '#3a2329'; g.lineWidth = 7; g.lineJoin = 'round';
    g.beginPath();
    for (let i = 0; i < 12; i++) { const a = i / 12 * TAU - Math.PI / 2 + Math.PI / 12; g.moveTo(CX + Math.cos(a) * 64, CY + Math.sin(a) * 64); g.lineTo(CX + Math.cos(a) * CR, CY + Math.sin(a) * CR); }
    g.stroke();
    g.lineWidth = 5;
    for (let i = 0; i < 12; i++) {
      const a = i / 12 * TAU - Math.PI / 2;
      petal(g, a, 122, 206, 0.2); g.stroke();
      g.beginPath(); g.arc(CX + Math.cos(a + Math.PI / 12) * 98, CY + Math.sin(a + Math.PI / 12) * 98, 18, 0, TAU); g.stroke();
    }
    g.beginPath(); g.arc(CX, CY, 64, 0, TAU); g.stroke();
    g.beginPath(); g.arc(CX, CY, 118, 0, TAU); g.lineWidth = 4; g.stroke();
    g.strokeStyle = 'rgba(20,10,14,0.55)'; g.lineWidth = 1.2;           // ガラスの中の鉛の線
    g.beginPath();
    for (let i = 0; i < 12; i++) {
      const a = i / 12 * TAU - Math.PI / 2;
      for (const r of [150, 178]) { g.moveTo(CX + Math.cos(a - 0.19) * r, CY + Math.sin(a - 0.19) * r); g.lineTo(CX + Math.cos(a + 0.19) * r, CY + Math.sin(a + 0.19) * r); }
      g.moveTo(CX + Math.cos(a) * 124, CY + Math.sin(a) * 124); g.lineTo(CX + Math.cos(a) * 200, CY + Math.sin(a) * 200);
    }
    g.stroke();
    g.strokeStyle = 'rgba(90,50,30,0.8)'; g.lineWidth = 2;                // まん中の文字盤の目盛り
    g.beginPath();
    for (let i = 0; i < 12; i++) { const a = i / 12 * TAU; g.moveTo(CX + Math.cos(a) * 50, CY + Math.sin(a) * 50); g.lineTo(CX + Math.cos(a) * 60, CY + Math.sin(a) * 60); }
    g.stroke();
    g.fillStyle = 'rgba(20,8,16,0.16)';                                // 弾が見やすいよう、窓を少しだけ暗く
    g.beginPath(); g.arc(CX, CY, CR, 0, TAU); g.fill();
    for (const [x, y, w, h] of SIDE) {                                 // 左右の窓: ひし形の格子 ＋ 石の枠
      g.save(); lancet(g, x, y, w, h); g.clip();
      g.strokeStyle = 'rgba(30,14,20,0.7)'; g.lineWidth = 1.5;
      g.beginPath();
      for (let d = -h; d < h + w; d += 18) { g.moveTo(x, y + d); g.lineTo(x + w, y + d + w); g.moveTo(x + w, y + d); g.lineTo(x, y + d + w); }
      g.stroke();
      g.restore();
      g.strokeStyle = '#4a2d34'; g.lineWidth = 6; lancet(g, x, y, w, h); g.stroke();
      g.beginPath(); g.moveTo(x + w / 2, y - w * 0.2); g.lineTo(x + w / 2, y + h); g.lineWidth = 4; g.stroke();
    }

    // 歯車（3つ。歯の数ちがい）: 真鍮
    gears = [[72, 14], [54, 11], [110, 20]].map(([r, teeth]) => {
      const cv2 = document.createElement('canvas');
      cv2.width = cv2.height = r * 2 + 16;
      const gg = cv2.getContext('2d'), m = r + 8;
      const bg = gg.createRadialGradient(m - r * 0.3, m - r * 0.3, r * 0.1, m, m, r);
      bg.addColorStop(0, '#c99a52'); bg.addColorStop(1, '#5a3a22');
      gg.fillStyle = bg;
      gg.strokeStyle = 'rgba(255,224,150,0.7)';
      gg.lineWidth = 2;
      gg.beginPath();
      for (let i = 0; i < teeth * 2; i++) {
        const a0 = i / (teeth * 2) * TAU, a1 = (i + 1) / (teeth * 2) * TAU, rr = i % 2 ? r - 9 : r;
        gg.lineTo(m + Math.cos(a0) * rr, m + Math.sin(a0) * rr); gg.lineTo(m + Math.cos(a1) * rr, m + Math.sin(a1) * rr);
      }
      gg.closePath(); gg.fill(); gg.stroke();
      gg.strokeStyle = 'rgba(40,20,10,0.6)'; gg.lineWidth = 3;
      gg.beginPath(); gg.arc(m, m, r * 0.78, 0, TAU); gg.stroke();
      gg.globalCompositeOperation = 'destination-out';
      gg.beginPath(); gg.arc(m, m, r * 0.22, 0, TAU); gg.fill();
      for (let i = 0; i < 6; i++) { const a = i / 6 * TAU; gg.beginPath(); gg.ellipse(m + Math.cos(a) * r * 0.5, m + Math.sin(a) * r * 0.5, r * 0.17, r * 0.11, a, 0, TAU); gg.fill(); }
      return cv2;
    });

    // 窓から床へ落ちる光の筋（あたたかい白。明るさは毎コマ alpha で変える）
    shafts = document.createElement('canvas');
    shafts.width = W; shafts.height = H;
    g = shafts.getContext('2d');
    for (let i = 0; i < 7; i++) {
      const u = (i - 3) / 3, x0 = CX + u * 150, x1 = CX + u * 380, w0 = 22, w1 = 70;
      const sg = g.createLinearGradient(0, CY + 60, 0, GROUND_Y);
      sg.addColorStop(0, 'rgba(255,226,180,0.0)'); sg.addColorStop(0.25, 'rgba(255,226,180,0.55)'); sg.addColorStop(1, 'rgba(255,226,180,0.12)');
      g.fillStyle = sg;
      g.beginPath();
      g.moveTo(x0 - w0, CY + 60 + Math.abs(u) * 40); g.lineTo(x0 + w0, CY + 60 + Math.abs(u) * 40);
      g.lineTo(x1 + w1, GROUND_Y + 10); g.lineTo(x1 - w1, GROUND_Y + 10); g.closePath(); g.fill();
    }

    // 床: 木の板 ＋ 窓の模様の光（床に映ったバラ窓）
    floorArt = document.createElement('canvas');
    floorArt.width = W + 200; floorArt.height = H - GROUND_Y + 40;
    g = floorArt.getContext('2d');
    const fh = floorArt.height, fw = floorArt.width;
    g.fillStyle = '#2a170f'; g.fillRect(0, 0, fw, fh);
    for (let y = 0, row = 0; y < fh; y += 12, row++) {
      for (let x = -(row * 53 % 160); x < fw; x += 160) {
        const l = 0.8 + Math.random() * 0.4;
        g.fillStyle = `rgb(${(92 * l) | 0},${(56 * l) | 0},${(34 * l) | 0})`;
        g.fillRect(x + 1, y + 1, 158, 10);
      }
    }
    g.save();
    g.translate(fw / 2, 26); g.scale(1, 0.13);
    const lg = g.createRadialGradient(0, 0, 10, 0, 0, 330);
    lg.addColorStop(0, 'rgba(255,224,170,0.75)'); lg.addColorStop(1, 'rgba(255,224,170,0)');
    g.fillStyle = lg; g.beginPath(); g.arc(0, 0, 330, 0, TAU); g.fill();
    g.globalCompositeOperation = 'destination-out';          // 窓の石の仕切りのかげ
    g.lineWidth = 16;
    g.beginPath();
    for (let i = 0; i < 12; i++) { const a = i / 12 * TAU + Math.PI / 12; g.moveTo(Math.cos(a) * 70, Math.sin(a) * 70); g.lineTo(Math.cos(a) * 330, Math.sin(a) * 330); }
    g.strokeStyle = 'rgba(0,0,0,0.7)'; g.stroke();
    g.beginPath(); g.arc(0, 0, 70, 0, TAU); g.lineWidth = 12; g.stroke();
    g.restore();
  }

  // ---- 状態: 時計の時刻（時間停止中は進まない）・光の粒・渡り鳥 ----------------------
  const st = { clock: 0, motes: [], streakX: [0, 210, 420, 120, 520], birds: [], birdT: 3 };
  function reset() { st.motes.length = 0; st.birds.length = 0; st.birdT = 3; }
  const frozen = () => scene === 'play' && typeof timeFrozen === 'function' && timeFrozen();

  function update(dt, T, look) {
    if (!wall) makeArt();
    st.clock = scene === 'title' ? titleBeat() : (frozen() ? st.clock : beatPos(T));
    if (frozen()) return;                                       // 時間停止中は全部止まる
    const tier = look.tier;
    const want = Math.round([26, 22, 18, 16, 14, 14][Math.round(tier)] * [0.4, 0.7, 1][gfx]);
    if (st.motes.length < want && Math.random() < dt * 10) {   // 光の筋の中を舞うほこり
      const u = (Math.random() - 0.5) * 2;
      st.motes.push({ x: CX + u * 300, y: CY + 120 + Math.random() * 280, vy: -(4 + Math.random() * 10 + tier * 3), ph: Math.random() * TAU, life: 5 + Math.random() * 4, age: 0, s: 1 + Math.random() * 1.6 });
    }
    for (const m of st.motes) { m.age += dt; m.y += m.vy * dt; m.x += Math.sin(m.age * 0.9 + m.ph) * 9 * dt; }
    st.motes = st.motes.filter(m => m.age < m.life);
    for (let i = 0; i < st.streakX.length; i++) st.streakX[i] = (st.streakX[i] - (6 + i * 2) * (1 + tier * 0.3) * dt + 900) % 900;
    // 渡り鳥の群れ（ときどき窓の向こうを横切る）
    st.birdT -= dt;
    if (st.birdT < 0) {
      st.birdT = 7 + Math.random() * 6;
      const dir = Math.random() < 0.5 ? 1 : -1, y = CY + 20 + Math.random() * 110, n = 5 + Math.floor(Math.random() * 4);
      for (let i = 0; i < n; i++) st.birds.push({ x: CX - dir * (CR + 40 + i * 22 + Math.random() * 10), y: y + (i % 2 ? 1 : -1) * i * 7 + Math.random() * 6, v: dir * (42 + Math.random() * 8), ph: Math.random() * TAU, s: 0.7 + Math.random() * 0.5 });
    }
    for (const q of st.birds) { q.x += q.v * dt; q.ph += dt * 9; q.y += Math.sin(q.ph * 0.2) * 3 * dt; }
    st.birds = st.birds.filter(q => Math.abs(q.x - CX) < CR + 260);
  }

  // 拍の頭ですばやく進んで止まる「カチッ」とした角度
  const tickAng = (beats, per, step) => { const n = beats / per, k = Math.floor(n); return (k + Math.min(1, (n - k) * 6)) * step; };

  // ---- 窓の向こう: 夕焼けの空・沈む太陽・遠くの町・鳥（窓の形で切り抜いた中に描く）------------
  function drawSky(g, look, x0, y0, w, h) {
    const tier = look.tier;
    const gr = g.createLinearGradient(0, y0, 0, y0 + h);
    gr.addColorStop(0, rgba(look.skyTop, 1)); gr.addColorStop(0.7, rgba(mixC(look.skyTop, look.skyBot, 0.75), 1)); gr.addColorStop(1, rgba(mixC(look.skyBot, [255, 236, 190], 0.3), 1));
    g.fillStyle = gr; g.fillRect(x0, y0, w, h);
  }
  function drawRose(g, look) {
    const tier = look.tier, sunC = mixC(look.skyBot, [255, 236, 170], 0.5 + 0.08 * tier);
    g.save();
    g.beginPath(); g.arc(CX, CY, CR, 0, TAU); g.clip();
    drawSky(g, look, CX - CR, CY - CR, CR * 2, CR * 2);
    // 沈みかけの太陽
    const sy = CY + 150, sr = 92;
    const hg = g.createRadialGradient(CX, sy, sr * 0.5, CX, sy, sr * 3);
    hg.addColorStop(0, rgba(sunC, 0.55)); hg.addColorStop(1, rgba(sunC, 0));
    g.fillStyle = hg; g.fillRect(CX - CR, CY - CR, CR * 2, CR * 2);
    const sg = g.createRadialGradient(CX, sy, sr * 0.2, CX, sy, sr);
    sg.addColorStop(0, rgba(mixC(sunC, [255, 255, 255], 0.6), 1)); sg.addColorStop(1, rgba(sunC, 0.9));
    g.fillStyle = sg; g.beginPath(); g.arc(CX, sy, sr, 0, TAU); g.fill();
    // 夕焼けの細い雲
    st.streakX.forEach((x, i) => {
      g.fillStyle = rgba(mixC(look.skyBot, [255, 255, 255], 0.4), 0.22 + 0.04 * i);
      g.beginPath(); g.ellipse(CX - CR + (x % (CR * 2 + 300)) - 150, CY - 120 + i * 48, 120 - i * 8, 4, 0, 0, TAU); g.fill();
    });
    // 渡り鳥（くの字のかげ）
    g.strokeStyle = 'rgba(30,14,24,0.85)'; g.lineWidth = 2; g.lineCap = 'round';
    g.beginPath();
    for (const q of st.birds) {
      const f = Math.sin(q.ph) * 5 * q.s, w = 8 * q.s;
      g.moveTo(q.x - w, q.y - f); g.quadraticCurveTo(q.x - w * 0.4, q.y - 2, q.x, q.y + 1); g.quadraticCurveTo(q.x + w * 0.4, q.y - 2, q.x + w, q.y - f);
    }
    g.stroke();
    // 遠くの町（屋根と尖塔のかげ）
    g.fillStyle = rgba(mixC(look.skyTop, [10, 4, 12], 0.6), 1);
    g.beginPath(); g.moveTo(CX - CR, CY + CR);
    const roofs = [[-212, 178], [-190, 168], [-170, 172], [-150, 150], [-140, 120], [-132, 150], [-110, 160], [-84, 170], [-60, 158], [-40, 166], [-20, 176], [6, 168], [30, 160], [44, 132], [52, 104], [60, 132], [74, 160], [100, 168], [124, 156], [150, 166], [170, 152], [190, 170], [212, 176]];
    for (const [dx, dy] of roofs) g.lineTo(CX + dx, CY + dy);
    g.lineTo(CX + CR, CY + CR); g.closePath(); g.fill();
    g.fillStyle = rgba(GOLD, 0.8);                               // 町の窓あかり
    for (let i = 0; i < 14; i++) g.fillRect(CX - 180 + i * 26 + (i * 7) % 11, CY + 182 + (i * 13) % 14, 2, 3);

    g.restore();
  }

  // ---- 背景 ----------------------------------------------------------------
  function background(T, look, k, bk, bp) {
    if (!wall) makeArt();
    const tier = look.tier, fz = fx.freeze;
    // 石の壁（色が変わるのは場面の変わり目だけなので、8コマに1回）
    ctx.drawImage(cachedLayer('moraWall', 8, 0, g => {
      g.drawImage(wall, 0, 0);
      g.fillStyle = rgba(look.skyTop, 0.35); g.fillRect(0, 0, W, H);
      // 窓のまわりの石に、夕日が少し当たっている
      g.globalCompositeOperation = 'lighter';
      const wg = g.createRadialGradient(CX, CY + 40, CR, CX, CY + 40, CR + 260);
      wg.addColorStop(0, rgba(look.skyBot, 0.35)); wg.addColorStop(1, rgba(look.skyBot, 0));
      g.fillStyle = wg; g.fillRect(0, 0, W, H);
    }), 0, 0, W, H);
    // 窓（空・太陽・町・鳥 ＋ 色ガラス ＋ 石の仕切り）: 3コマに1回
    ctx.drawImage(cachedLayer('moraWin', 3, 1, g => {
      g.save();
      g.beginPath(); g.arc(CX, CY, CR, 0, TAU);
      for (const [x, y, w, h] of SIDE) lancet(g, x, y, w, h, true);
      g.clip();
      for (const [x, y, w, h] of SIDE) drawSky(g, look, x, y - 20, w, h + 20);
      drawRose(g, look);
      g.globalCompositeOperation = 'multiply'; g.drawImage(glassMul, 0, 0);
      g.globalCompositeOperation = 'lighter'; g.globalAlpha = 0.8 + 0.1 * look.tier; g.drawImage(glassLit, 0, 0);
      g.restore();
      g.drawImage(tracery, 0, 0);
    }), 0, 0, W, H);

    ctx.globalCompositeOperation = 'lighter';
    // 窓から床へ落ちる光の筋（盛り上がるほど強く、キックで少し明るく。時間停止中はうすい）
    if (gfx > 0) {
      ctx.globalAlpha = (0.16 + 0.05 * tier + 0.06 * k) * (1 - 0.6 * fz);
      ctx.drawImage(shafts, 0, 0);
      ctx.globalAlpha = 1;
    }
    // 小節の頭で、窓のふちから光の輪
    for (const r of fx.bgRings) {
      ctx.strokeStyle = rgba(look.color, r.a * 0.35 * clamp01(tier / 2));
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(CX, CY, RING + r.r * 0.35, 0, TAU); ctx.stroke();
    }
    ctx.globalCompositeOperation = 'source-over';

    // 歯車（すみの真鍮の歯車。拍ごとにカチッと回る。時間停止中は止まる）
    if (gfx > 0) {
      const spots = [[40, 650, 2, 1], [150, 690, 0, -1.53], [W - 40, 640, 2, -1], [W - 140, 700, 1, 2], [W / 2 - 330, 40, 1, 1.4], [W / 2 + 330, 30, 0, -1]];
      ctx.globalAlpha = 0.6;
      for (const [x, y, i, dir] of spots) {
        const img = gears[i], a = tickAng(st.clock, 1, Math.PI / 18) * dir;
        ctx.save(); ctx.translate(x, y); ctx.rotate(a); ctx.drawImage(img, -img.width / 2, -img.height / 2); ctx.restore();
      }
      ctx.globalAlpha = 1;
    }

    // 時計の針（鉄の針 ＋ 金のふち）: 短針 = 曲全体で1周、長針 = 1小節ごと、秒針 = 1拍ごと
    const shiver = fz > 0.5 ? Math.sin(performance.now() / 30) * 0.01 : 0;
    const up = -Math.PI / 2;
    const hourA = up + (scene === 'title' ? st.clock * 0.01 : clamp01(T / SONG_END) * TAU);
    const minA = up + tickAng(st.clock, 4, TAU / 16) + shiver;
    const secA = up + tickAng(st.clock, 1, TAU / 60) + shiver;
    const ornate = (ang, len, w, loop) => {        // 先の近くに丸い飾り（ブレゲ針）のある針
      ctx.save(); ctx.translate(CX, CY); ctx.rotate(ang);
      ctx.beginPath();
      ctx.moveTo(-26, -w * 0.7); ctx.lineTo(len * loop - 14, -w * 0.5); ctx.lineTo(len * loop - 14, w * 0.5); ctx.lineTo(-26, w * 0.7); ctx.closePath();
      ctx.moveTo(len * loop + 14, 0); ctx.arc(len * loop, 0, 14, 0, TAU);
      ctx.moveTo(len * loop + 14, -w * 0.4); ctx.lineTo(len, 0); ctx.lineTo(len * loop + 14, w * 0.4);
      ctx.fillStyle = rgba(IRON, 0.95); ctx.fill();
      ctx.strokeStyle = rgba(GOLD, 0.9); ctx.lineWidth = 1.5; ctx.stroke();
      ctx.beginPath(); ctx.arc(len * loop, 0, 8, 0, TAU);
      ctx.fillStyle = rgba(mixC(look.skyBot, CREAM, 0.6), 0.9); ctx.fill();
      ctx.restore();
    };
    ornate(hourA, CR * 0.55, 10, 0.66);
    ornate(minA, CR * 0.86, 7, 0.74);
    ctx.strokeStyle = rgba(mixC(look.color, [255, 80, 80], 0.4), 0.95); ctx.lineWidth = 2; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(CX - Math.cos(secA) * 40, CY - Math.sin(secA) * 40); ctx.lineTo(CX + Math.cos(secA) * CR * 0.95, CY + Math.sin(secA) * CR * 0.95); ctx.stroke();
    ctx.fillStyle = rgba(GOLD, 1);
    ctx.beginPath(); ctx.arc(CX, CY, 11, 0, TAU); ctx.fill();
    ctx.fillStyle = rgba(IRON, 1);
    ctx.beginPath(); ctx.arc(CX, CY, 4, 0, TAU); ctx.fill();

    // 舞うほこり（光の筋の中できらめく）
    ctx.globalCompositeOperation = 'lighter';
    for (const m of st.motes) {
      const f = Math.sin(Math.PI * m.age / m.life);
      ctx.fillStyle = rgba(mixC(GOLD, look.color, 0.3), 0.75 * f);
      ctx.fillRect(m.x - m.s / 2, m.y - m.s / 2, m.s, m.s);
    }
    ctx.globalCompositeOperation = 'source-over';
  }

  // ---- 床: 木の床 ＋ 床に映ったバラ窓の光 ----------------------------------------
  function floor(look, k) {
    if (!wall) makeArt();
    ctx.drawImage(floorArt, -100, GROUND_Y);
    ctx.fillStyle = '#1a0d08'; ctx.fillRect(-400, GROUND_Y + floorArt.height, W + 800, 400);
    ctx.fillRect(-400, GROUND_Y, 300, H - GROUND_Y + 400); ctx.fillRect(W + 100, GROUND_Y, 300, H - GROUND_Y + 400);
    ctx.fillStyle = rgba(look.skyTop, 0.3); ctx.fillRect(-400, GROUND_Y, W + 800, H - GROUND_Y + 400);
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = rgba(look.skyBot, 0.12 + 0.1 * k);
    ctx.fillRect(-400, GROUND_Y, W + 800, 2);
    ctx.globalCompositeOperation = 'source-over';
  }

  // ---- 足場: 彫りのある木の梁 ＋ 真鍮の金具 ---------------------------------------
  function platform(p, look, k) {
    const g = ctx.createLinearGradient(0, p.y, 0, p.y + p.h);
    g.addColorStop(0, '#8a5a34'); g.addColorStop(0.5, '#5e3a22'); g.addColorStop(1, '#3a2214');
    ctx.fillStyle = g;
    ctx.fillRect(p.x, p.y, p.w, p.h);
    ctx.fillStyle = rgba([255, 226, 170], 0.55 + 0.35 * k);
    ctx.fillRect(p.x + 2, p.y, p.w - 4, 2);
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.fillRect(p.x + 4, p.y + p.h * 0.55, p.w - 8, 1);
    ctx.fillStyle = '#c99a52';                                   // 両はしの真鍮の金具
    ctx.fillRect(p.x, p.y, 7, p.h); ctx.fillRect(p.x + p.w - 7, p.y, 7, p.h);
    ctx.fillStyle = '#3a2416';
    for (const x of [p.x + 3.5, p.x + p.w - 3.5]) { ctx.beginPath(); ctx.arc(x, p.y + p.h / 2, 1.6, 0, TAU); ctx.fill(); }
  }

  // ---- 弾: 小さい弾は光る玉、大きい弾は小さな時計、旋律の弾は音符 ------------------
  function bullet(b, c, k) {
    if (b.style === 'note') {                        // 八分音符の形（当たり判定は玉の部分）
      ctx.fillStyle = rgba(c, 1);
      ctx.beginPath(); ctx.ellipse(b.x, b.y, b.r * 1.25, b.r * 0.9, -0.45, 0, TAU); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      ctx.beginPath(); ctx.ellipse(b.x, b.y, b.r * 0.7, b.r * 0.45, -0.45, 0, TAU); ctx.fill();
      const sx = b.x + b.r * 1.05, sy = b.y - b.r * 0.3;
      ctx.strokeStyle = rgba(c, 1); ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx, sy - b.r * 3.2); ctx.quadraticCurveTo(sx + b.r * 1.4, sy - b.r * 2.4, sx + b.r * 1.1, sy - b.r * 1.5); ctx.stroke();
      return;
    }
    if (b.r >= 10) {                                 // 小さな時計（針がくるくる回る）
      ctx.fillStyle = rgba(c, 1);
      ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, TAU); ctx.fill();
      ctx.fillStyle = 'rgba(255,248,232,0.95)';
      ctx.beginPath(); ctx.arc(b.x, b.y, b.r * 0.72, 0, TAU); ctx.fill();
      ctx.strokeStyle = rgba(mixC(c, [40, 20, 20], 0.5), 1);
      ctx.lineWidth = Math.max(1.5, b.r * 0.12); ctx.lineCap = 'round';
      const a1 = b.age * 6, a2 = b.age * 0.8;
      ctx.beginPath();
      ctx.moveTo(b.x, b.y); ctx.lineTo(b.x + Math.cos(a1) * b.r * 0.6, b.y + Math.sin(a1) * b.r * 0.6);
      ctx.moveTo(b.x, b.y); ctx.lineTo(b.x + Math.cos(a2) * b.r * 0.4, b.y + Math.sin(a2) * b.r * 0.4);
      ctx.stroke();
      return;
    }
    ctx.fillStyle = rgba(c, 1);
    ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgba(255,250,235,0.95)';
    ctx.beginPath(); ctx.arc(b.x, b.y, b.r * 0.58, 0, TAU); ctx.fill();
    ctx.strokeStyle = rgba(mixC(c, [255, 255, 255], 0.6), 0.7);
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(b.x, b.y, b.r + 0.5, 0, TAU); ctx.stroke();
  }

  // ---- 光る演出: あたたかい金色 ---------------------------------------------
  function flash(look) {
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = rgba(mixC(look.color, [255, 240, 210], 0.6), 0.42 * flashT);
    ctx.fillRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'source-over';
  }

  // ---- 場面の名前: 明朝体 ＋ 小さな時計の飾り --------------------------------
  function banner() {
    const bn = fx.banner;
    if (!bn) return;
    const e = bn.age, DUR = 2.6;
    if (e > DUR) { fx.banner = null; return; }
    const a = e < 0.4 ? e / 0.4 : e > DUR - 0.6 ? (DUR - e) / 0.6 : 1;
    const y = 120, open = easeOut(e / 0.9);
    ctx.save();
    ctx.globalAlpha = clamp01(a);
    const g = ctx.createLinearGradient(0, 0, W, 0);
    g.addColorStop(0, 'rgba(30,14,30,0)'); g.addColorStop(0.5, 'rgba(30,14,30,0.5)'); g.addColorStop(1, 'rgba(30,14,30,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, y - 46, W, 92);
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = `600 34px ${SERIF}`;
    if ('letterSpacing' in ctx) ctx.letterSpacing = '10px';
    ctx.fillStyle = '#fff6e6';
    if (gfx === 2) { ctx.shadowColor = rgba(bn.c, 1); ctx.shadowBlur = 14; }
    ctx.fillText(bn.name, W / 2, y - 8);
    ctx.shadowBlur = 0;
    const lw = 220 * open;
    ctx.fillStyle = rgba(bn.c, 0.9);
    ctx.fillRect(W / 2 - lw, y + 16, lw - 14, 1.5);
    ctx.fillRect(W / 2 + 14, y + 16, lw - 14, 1.5);
    // 小さな時計の飾り（針が名前の出るあいだに1周する）
    ctx.strokeStyle = rgba(bn.c, 0.95); ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(W / 2, y + 16.5, 7, 0, TAU); ctx.stroke();
    const ha = -Math.PI / 2 + e / DUR * TAU;
    ctx.beginPath(); ctx.moveTo(W / 2, y + 16.5); ctx.lineTo(W / 2 + Math.cos(ha) * 5, y + 16.5 + Math.sin(ha) * 5); ctx.stroke();
    if ('letterSpacing' in ctx) ctx.letterSpacing = '4px';
    ctx.font = `600 15px ${SERIF}`;
    ctx.fillStyle = rgba(mixC(bn.c, [255, 255, 255], 0.55), clamp01((e - 0.3) / 0.5));
    ctx.fillText(bn.sub, W / 2, y + 36);
    if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';
    ctx.restore();
  }

  // ---- タイトル: 文字盤の数字の位置に、小さな時計がならんでゆっくり回る ---------------
  function title(look, k, bp) {
    const cols = ['#ffd27a', '#ff9f6b', '#ff7aa8'].map(rgb);
    for (let i = 0; i < 12; i++) {
      const a = i / 12 * TAU - Math.PI / 2 + tickAng(bp, 2, TAU / 48);
      const r = RING + 26 + 6 * k, x = CX + Math.cos(a) * r, y = CY + Math.sin(a) * r;
      const c = cols[i % 3];
      if (gfx > 0) {
        ctx.globalCompositeOperation = 'lighter';
        ctx.drawImage(glowSprite(c), x - 26, y - 26, 52, 52);
        ctx.globalCompositeOperation = 'source-over';
      }
      bullet({ x, y, r: 11, age: bp * 0.4 + i }, c, k);
    }
  }

  THEMES.dusk = {
    noTrails: true, noScanlines: true, glow: 1.8,
    clearColors: ['#ffd27a', '#ff9f6b', '#ff7aa8', '#fff1d6', '#c9b6ff'],
    reset, update, background, floor, platform, bullet, flash, banner, title,
  };
})();
