"use strict";

/* =========================================================================
   見た目のセット「night」  —  曲②「Re:Unknown X」用
   テーマは「正体不明の夜」。月夜の町の上を、赤・緑・青の三つの UFO が飛ぶ。
   場面（SECTIONS）の tier（盛り上がりの段階 0〜5）で、ほとんど全部が変わる:
     0 しずか   … 月と星と霧だけ。ホタルのような光がただよう
     1 気配     … 遠くに UFO が小さく現れて、ゆっくり漂う
     2 接近     … UFO が三角形の編隊で回りはじめる。雲が流れ出す
     3 サビ     … UFO が近づいて、地面を探照灯で照らす。月が拍で光る
     4 山場     … 拍ごとに三色の光がまたたき、星のきらめきが飛ぶ
     5 最高潮   … すべてが最大。空の色まで三色に点滅する
   visuals.js の THEMES に登録するだけで、ほかの部分は visuals.js の描き方を使う。
   ========================================================================= */

(function () {
  const UFO_COLS = ['#ff4d6d', '#5cf2a4', '#4cc9f0'].map(rgb);   // 赤・緑・青
  const MOON = { x: W * 0.87, y: 112, r: 46 };    // 場面の名前（まん中の帯）とかさならない位置
  const SERIF = '"Hiragino Mincho ProN", "Yu Mincho", "Noto Serif JP", serif';

  // ---- 1回だけ作る絵（月・雲・町の影・床の模様）----------------------------
  let moonImg = null, cloudImgs = null, skyline = null, wavePat = null;
  function makeArt() {
    // 月: うすい黄色の円 ＋ ぼんやりした模様
    moonImg = document.createElement('canvas');
    moonImg.width = moonImg.height = MOON.r * 2 + 4;
    let g = moonImg.getContext('2d');
    const c = MOON.r + 2;
    const gr = g.createRadialGradient(c - 12, c - 14, 6, c, c, MOON.r);
    gr.addColorStop(0, '#fffbe8'); gr.addColorStop(0.7, '#f3ecc8'); gr.addColorStop(1, '#d9cfa4');
    g.fillStyle = gr;
    g.beginPath(); g.arc(c, c, MOON.r, 0, TAU); g.fill();
    g.fillStyle = 'rgba(160,150,110,0.22)';
    for (const [x, y, r] of [[-14, -8, 11], [12, 10, 8], [16, -16, 6], [-6, 18, 7], [-22, 12, 4]]) {
      g.beginPath(); g.arc(c + x, c + y, r, 0, TAU); g.fill();
    }

    // 雲: やわらかいだ円を重ねた白いもや（3種類）
    cloudImgs = [0, 1, 2].map(i => {
      const cv2 = document.createElement('canvas');
      cv2.width = 320; cv2.height = 110;
      const g2 = cv2.getContext('2d');
      for (let j = 0; j < 9; j++) {
        const x = 50 + j * 26 + Math.sin(i * 3 + j) * 12, y = 60 + Math.cos(i * 5 + j * 1.7) * 14, r = 34 + ((i + j) % 3) * 9;
        const gg = g2.createRadialGradient(x, y, 0, x, y, r);
        gg.addColorStop(0, 'rgba(255,255,255,0.55)'); gg.addColorStop(1, 'rgba(255,255,255,0)');
        g2.fillStyle = gg;
        g2.fillRect(x - r, y - r, r * 2, r * 2);
      }
      return cv2;
    });

    // 町の影: 屋根・五重塔・鳥居のシルエット（窓にぽつぽつ明かり）
    skyline = document.createElement('canvas');
    skyline.width = W + 200; skyline.height = 180;
    g = skyline.getContext('2d');
    const base = 180;
    g.fillStyle = '#0b0a1f';
    const roof = (x, w, h, y0 = base) => {          // 瓦屋根の家（反った屋根）
      g.beginPath();
      g.moveTo(x, y0); g.lineTo(x, y0 - h);
      g.quadraticCurveTo(x - 10, y0 - h - 4, x - 14, y0 - h - 10);
      g.lineTo(x + w / 2, y0 - h - 26);
      g.lineTo(x + w + 14, y0 - h - 10);
      g.quadraticCurveTo(x + w + 10, y0 - h - 4, x + w, y0 - h);
      g.lineTo(x + w, y0); g.closePath(); g.fill();
    };
    for (let x = -20; x < W + 200; x += 70 + ((x * 7) % 40)) roof(x, 50 + ((x * 13) % 30), 30 + ((x * 11) % 30));
    // 五重塔
    const px = 180;
    g.fillRect(px - 4, base - 175, 8, 30);
    for (let i = 0; i < 5; i++) {
      const y = base - 30 - i * 28, w = 64 - i * 8;
      g.fillRect(px - w / 2 + 8, y, w - 16, 28);
      g.beginPath(); g.moveTo(px - w / 2 - 6, y + 4); g.lineTo(px, y - 10); g.lineTo(px + w / 2 + 6, y + 4); g.closePath(); g.fill();
    }
    // 鳥居
    const tx = W - 60;
    g.fillRect(tx - 40, base - 70, 7, 70); g.fillRect(tx + 33, base - 70, 7, 70);
    g.fillRect(tx - 52, base - 78, 104, 9); g.fillRect(tx - 44, base - 60, 88, 6);
    // 窓の明かり
    for (let i = 0; i < 26; i++) {
      const x = (i * 97) % (W + 180), y = base - 12 - (i * 37) % 30;
      g.fillStyle = i % 3 ? 'rgba(255,196,120,0.55)' : 'rgba(255,230,170,0.75)';
      g.fillRect(x, y, 4, 5);
    }

    // 床の模様: 青海波（せいがいは。重なった波の半円）
    const tile = document.createElement('canvas');
    tile.width = 40; tile.height = 20;
    g = tile.getContext('2d');
    g.strokeStyle = 'rgba(200,210,255,0.16)';
    g.lineWidth = 1;
    for (const [x, y] of [[0, 20], [40, 20], [20, 10], [0, 0], [40, 0]]) {
      for (const r of [18, 13, 8]) { g.beginPath(); g.arc(x, y, r, Math.PI, 0); g.stroke(); }
    }
    wavePat = ctx.createPattern(tile, 'repeat');
  }

  // ---- 状態 ----------------------------------------------------------------
  const st = { clouds: null, wisps: [], moonRings: [], lastBeat: -99, lastBar: -99 };
  function reset() { st.wisps.length = 0; st.moonRings.length = 0; st.lastBeat = st.lastBar = -99; }

  // 三つの UFO の位置（tier しだいで、遠く小さく → 近く大きく → 速く）
  function ufoAt(i, bp, tier) {
    const cx = W / 2 + Math.sin(bp * Math.PI / 32) * 110;
    const cy = 215 - 14 * tier + Math.sin(bp * Math.PI / 16) * 18;
    const R = 175 - 8 * tier;
    const a = bp * (0.03 + 0.025 * tier) + i * TAU / 3;
    return { x: cx + Math.cos(a) * R, y: cy + Math.sin(a) * R * 0.32, front: Math.sin(a) };
  }
  const ufoAlpha = tier => clamp01((tier - 0.4) / 1.2);
  const ufoSize = tier => 0.32 + 0.12 * tier;

  function update(dt, T, look) {
    if (!moonImg) makeArt();
    const tier = look.tier;
    if (!st.clouds) {
      st.clouds = Array.from({ length: 6 }, (_, i) => ({ x: Math.random() * (W + 300) - 150, y: 60 + (i % 3) * 70 + Math.random() * 30, img: i % 3, v: 8 + Math.random() * 10, layer: i < 3 ? 0 : 1 }));
    }
    for (const c of st.clouds) {
      c.x -= c.v * (1 + tier * 0.5) * (c.layer ? 1.6 : 1) * dt;      // 盛り上がるほど風が強い
      if (c.x < -340) { c.x = W + 20; c.y = 50 + Math.random() * 200; }
    }
    // ホタルのような光（しずかな所ほど多い）
    const want = Math.round([22, 16, 10, 6, 3, 2][Math.round(tier)] * [0.4, 0.7, 1][gfx]);
    if (st.wisps.length < want && Math.random() < dt * 8) {
      st.wisps.push({ x: Math.random() * W, y: GROUND_Y - Math.random() * 60, ph: Math.random() * TAU, vy: -(10 + Math.random() * 18), life: 5 + Math.random() * 4, age: 0 });
    }
    for (const w of st.wisps) { w.age += dt; w.y += w.vy * dt; w.x += Math.sin(w.age * 1.3 + w.ph) * 12 * dt; }
    st.wisps = st.wisps.filter(w => w.age < w.life);

    const bp = scene === 'title' ? titleBeat() : beatPos(T);
    const beat = Math.floor(bp), bar = Math.floor(bp / 4);
    // 山場（tier 4〜）: 拍ごとに UFO のまわりで星がきらめく
    if (beat !== st.lastBeat) {
      st.lastBeat = beat;
      if (tier >= 3.5 && scene === 'play') {
        const i = beat % 3, u = ufoAt(i, bp, tier);
        sparks(u.x, u.y, { n: 6 + Math.round((tier - 3.5) * 6), color: ['#ff9db0', '#a8ffd4', '#a8e6ff'][i], speed: 200, life: 0.6, size: 2.5, gravity: 60 });
      }
    }
    // サビ（tier 3〜）: 小節ごとに月から光の輪
    if (bar !== st.lastBar) {
      st.lastBar = bar;
      if (tier >= 2.5) st.moonRings.push({ r: MOON.r, a: 0.5 });
    }
    for (const r of st.moonRings) { r.r += 160 * dt; r.a -= dt * 0.5; }
    st.moonRings = st.moonRings.filter(r => r.a > 0);
  }

  // ---- 背景 ----------------------------------------------------------------
  function background(T, look, k, bk, bp) {
    if (!moonImg) makeArt();
    const tier = look.tier;
    // 空: 盛り上がるほど明るく。最高潮では拍ごとに三色に染まる
    let top = mixC(look.skyTop, look.color, 0.04 * tier * (0.6 + 0.4 * k));
    if (tier > 4) top = mixC(top, UFO_COLS[Math.floor(bp) % 3], 0.18 * (tier - 4) * k);
    const a = ufoAlpha(tier);
    const us = [0, 1, 2].map(i => ({ i, ...ufoAt(i, bp, tier) })).sort((p, q) => p.front - q.front);
    // 空・星・月・雲・探照灯・町・霧はゆっくりしか変わらないので、2コマに1回だけ描き直した絵を貼る（毎コマ全部描くと重い）
    ctx.drawImage(cachedLayer('nightSky', 2, 0, g => {
      vGradient([[0, rgba(top, 1)], [1, rgba(look.skyBot, 1)]], GROUND_Y, g);
      g.globalCompositeOperation = 'lighter';
      drawStars(T, [40, 90, 140][gfx], g);

      // 月 ＋ にじみ（サビでは拍で光る）＋ 小節ごとの光の輪
      const pulse = tier >= 2 ? 0.25 * k * clamp01(tier - 1.5) : 0;
      const halo = MOON.r * (3.2 + 0.4 * bk * clamp01(tier - 2) + pulse);
      if (gfx > 0) {
        g.globalAlpha = 0.35 + 0.1 * tier / 5 + pulse;
        g.drawImage(glowSprite(mixC([255, 244, 214], look.color, 0.1 * tier)), MOON.x - halo, MOON.y - halo, halo * 2, halo * 2);
        g.globalAlpha = 1;
      }
      g.lineWidth = 2;
      for (const r of st.moonRings) {
        g.strokeStyle = rgba(mixC([255, 244, 214], look.color, 0.5), r.a * 0.6);
        g.beginPath(); g.arc(MOON.x, MOON.y, r.r, 0, TAU); g.stroke();
      }
      g.globalCompositeOperation = 'source-over';
      g.drawImage(moonImg, MOON.x - MOON.r - 2, MOON.y - MOON.r - 2);

      // 雲（画質「低」では無し・「中」では奥の層だけ）
      if (gfx > 0) {
        for (const c of st.clouds || []) {
          if (gfx === 1 && c.layer) continue;
          g.globalAlpha = c.layer ? 0.16 : 0.10;
          g.drawImage(cloudImgs[c.img], c.x, c.y, c.layer ? 380 : 300, c.layer ? 130 : 100);
        }
        g.globalAlpha = 1;
      }

      // サビから: UFO の探照灯が地面を照らして首をふる（町より奥）
      if (a > 0.01 && tier > 2.6 && gfx > 0) {
        g.globalCompositeOperation = 'lighter';
        for (const u of us) {
          const gx = u.x + Math.sin(bp * Math.PI / 8 + u.i * 2.1) * 230, w = 60 + 10 * tier;
          const gr = g.createLinearGradient(u.x, u.y, gx, GROUND_Y);
          gr.addColorStop(0, rgba(UFO_COLS[u.i], 0.20 * clamp01(tier - 2.6) * (0.7 + 0.3 * k)));
          gr.addColorStop(1, rgba(UFO_COLS[u.i], 0.02));
          g.fillStyle = gr;
          g.beginPath(); g.moveTo(u.x - 6, u.y); g.lineTo(u.x + 6, u.y); g.lineTo(gx + w, GROUND_Y); g.lineTo(gx - w, GROUND_Y); g.closePath(); g.fill();
        }
        g.globalCompositeOperation = 'source-over';
      }

      // 町の影（プレイヤーと逆に少しずれる）＋ 手前の霧
      const par = (playerXY().x - W / 2) * -0.04;
      g.drawImage(skyline, -100 + par, GROUND_Y - 178);
      const fog = g.createLinearGradient(0, GROUND_Y - 120, 0, GROUND_Y);
      fog.addColorStop(0, rgba(mixC(look.skyBot, look.color, 0.15), 0));
      fog.addColorStop(1, rgba(mixC(look.skyBot, look.color, 0.25), 0.55 - 0.05 * tier));
      g.fillStyle = fog;
      g.fillRect(0, GROUND_Y - 120, W, 120);
    }), 0, 0, W, H);

    // UFO の編隊。奥にいるものから描く（UFO は町より上を飛ぶので、町のあとに描いても見た目は同じ）
    if (a > 0.01) {
      for (const u of us) {
        const s = ufoSize(tier) * (0.85 + 0.15 * (u.front + 1) / 2);
        drawUfo(u.x, u.y, s, UFO_COLS[u.i], a * (0.55 + 0.45 * (u.front + 1) / 2), T, k, tier > 3.5 && Math.floor(bp) % 3 === u.i ? k : 0);
      }
    }

    // ホタルのような光
    ctx.globalCompositeOperation = 'lighter';
    for (const w of st.wisps) {
      const f = Math.sin(Math.PI * w.age / w.life) * (0.6 + 0.4 * Math.sin(w.age * 4 + w.ph));
      const c = mixC([255, 240, 190], look.color, 0.3);
      if (gfx > 0) { ctx.globalAlpha = f * 0.7; ctx.drawImage(glowSprite(c), w.x - 9, w.y - 9, 18, 18); ctx.globalAlpha = 1; }
      ctx.fillStyle = rgba([255, 250, 220], f);
      ctx.fillRect(w.x - 1, w.y - 1, 2, 2);
    }
    ctx.globalCompositeOperation = 'source-over';
  }

  // ---- 地面: 青海波の模様（拍でゆっくり流れる）--------------------------------
  function floor(look, k, bp) {
    ctx.save();
    ctx.beginPath(); ctx.rect(-400, GROUND_Y + 2, W + 800, H - GROUND_Y + 400); ctx.clip();
    ctx.translate((bp * 3) % 40, GROUND_Y + 2);
    ctx.fillStyle = wavePat;
    ctx.globalAlpha = 0.7 + 0.3 * k * clamp01(look.tier - 2);
    ctx.fillRect(-440, 0, W + 880, H - GROUND_Y + 400);
    ctx.restore();
  }

  // ---- 足場: 黒い板 ＋ 朱色のふち ＋ 両はしの灯籠 ------------------------------
  function platform(p, look, k) {
    ctx.fillStyle = '#140f22';
    ctx.fillRect(p.x, p.y, p.w, p.h);
    ctx.fillStyle = '#e8473f';
    ctx.fillRect(p.x - 4, p.y, p.w + 8, 3);
    ctx.fillStyle = 'rgba(232,71,63,0.5)';
    ctx.fillRect(p.x, p.y + p.h - 2, p.w, 2);
    const glowA = 0.5 + 0.5 * k * clamp01(look.tier - 1);
    for (const x of [p.x + 6, p.x + p.w - 6]) {
      if (gfx > 0) {
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = glowA;
        ctx.drawImage(glowSprite([255, 190, 110]), x - 16, p.y - 22, 32, 32);
        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = 'source-over';
      }
      ctx.fillStyle = '#ffcf7a';
      ctx.fillRect(x - 3, p.y - 10, 6, 8);
      ctx.fillStyle = '#e8473f';
      ctx.fillRect(x - 4, p.y - 11, 8, 2);
    }
  }

  // ---- 弾: 弾幕らしい形（丸玉・米つぶ・星・大玉）。当たり判定はどれも同じ丸 ------
  function bullet(b, c, k) {
    const style = b.style || (b.r >= 13 ? 'big' : 'orb');
    if (style === 'rice') {                          // 進む向きを向いた米つぶ
      const ang = b.px != null && (b.x !== b.px || b.y !== b.py) ? Math.atan2(b.y - b.py, b.x - b.px) : Math.atan2(b.vy || 1, b.vx || 0);
      ctx.fillStyle = rgba(c, 1);
      ctx.beginPath(); ctx.ellipse(b.x, b.y, b.r * 1.6, b.r * 1.0, ang, 0, TAU); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.95)';
      ctx.beginPath(); ctx.ellipse(b.x, b.y, b.r * 1.0, b.r * 0.5, ang, 0, TAU); ctx.fill();
      return;
    }
    if (style === 'star') {                          // 回る星
      const rot = b.age * 4 + b.x * 0.01;
      ctx.fillStyle = rgba(c, 1);
      ctx.beginPath();
      for (let i = 0; i < 10; i++) {
        const r = i % 2 ? b.r * 0.6 : b.r * 1.45, a = rot + i * Math.PI / 5;
        i ? ctx.lineTo(b.x + Math.cos(a) * r, b.y + Math.sin(a) * r) : ctx.moveTo(b.x + Math.cos(a) * r, b.y + Math.sin(a) * r);
      }
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.95)';
      ctx.beginPath(); ctx.arc(b.x, b.y, b.r * 0.45, 0, TAU); ctx.fill();
      return;
    }
    // 丸玉: 色のふち ＋ 白い中身 ＋ 細い白の外線（明るい背景でも見える）
    ctx.fillStyle = rgba(c, 1);
    ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.95)';
    ctx.beginPath(); ctx.arc(b.x, b.y, b.r * (style === 'big' ? 0.7 : 0.6), 0, TAU); ctx.fill();
    ctx.strokeStyle = rgba(mixC(c, [255, 255, 255], 0.6), 0.7);
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(b.x, b.y, b.r + 0.5, 0, TAU); ctx.stroke();
  }

  // ---- レーザー: 上から下への柱は「UFO の光線」。上に UFO が現れて光を落とす ----
  function laser(b, c, T, k) {
    if (b.x1 !== b.x2 || b.y1 > 0) return;          // 縦の柱だけ
    const fade = b.delay > 0 ? clamp01(1 - b.delay / (b.delayMax || 1)) * 2 : b.safe ? clamp01(1 - (b.age - b.hold) / 0.3) : 1;
    drawUfo(b.x1, 34, Math.min(0.9, b.r / 40 + 0.4), c, Math.min(1, fade), T, k, b.delay > 0 ? 0 : 1);
  }

  // ---- 光る演出: 白ではなく場面の色の光（最高潮では三色が順番に）----------------
  function flash(look) {
    const tier = curLook ? curLook.tier : 0;
    const bp = scene === 'title' ? titleBeat() : beatPos(songTime);
    const c = tier > 3.5 ? UFO_COLS[Math.floor(bp) % 3] : look.color;
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = rgba(mixC(c, [255, 255, 255], 0.35), 0.45 * flashT);
    ctx.fillRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'source-over';
  }

  // ---- 場面の名前: 明朝体で静かにあらわれる ----------------------------------
  function banner() {
    const bn = fx.banner;
    if (!bn) return;
    const e = bn.age, DUR = 2.6;
    if (e > DUR) { fx.banner = null; return; }
    const a = e < 0.5 ? e / 0.5 : e > DUR - 0.6 ? (DUR - e) / 0.6 : 1;
    const y = 120, rise = (1 - easeOut(e / 0.8)) * 12, open = easeOut(e / 0.9);
    ctx.save();
    ctx.globalAlpha = clamp01(a);
    const g = ctx.createLinearGradient(0, 0, W, 0);
    g.addColorStop(0, 'rgba(5,4,20,0)'); g.addColorStop(0.5, 'rgba(5,4,20,0.5)'); g.addColorStop(1, 'rgba(5,4,20,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, y - 46, W, 92);
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = `600 36px ${SERIF}`;
    if ('letterSpacing' in ctx) ctx.letterSpacing = '12px';
    ctx.fillStyle = '#fbf7ff';
    if (gfx === 2) { ctx.shadowColor = rgba(bn.c, 1); ctx.shadowBlur = 16; }
    ctx.fillText(bn.name, W / 2, y - 8 + rise);
    ctx.shadowBlur = 0;
    // 細い線と、まん中のひし形
    const lw = 230 * open;
    ctx.fillStyle = rgba(bn.c, 0.9);
    ctx.fillRect(W / 2 - lw, y + 16, lw - 10, 1.5);
    ctx.fillRect(W / 2 + 10, y + 16, lw - 10, 1.5);
    ctx.beginPath(); ctx.moveTo(W / 2, y + 11); ctx.lineTo(W / 2 + 5, y + 16.5); ctx.lineTo(W / 2, y + 22); ctx.lineTo(W / 2 - 5, y + 16.5); ctx.closePath(); ctx.fill();
    if ('letterSpacing' in ctx) ctx.letterSpacing = '4px';
    ctx.font = `600 15px ${SERIF}`;
    ctx.fillStyle = rgba(mixC(bn.c, [255, 255, 255], 0.55), clamp01((e - 0.3) / 0.5));
    ctx.fillText(bn.sub, W / 2, y + 36);
    if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';
    ctx.restore();
  }

  // ---- タイトル: 弾幕の魔法陣（三色の玉の輪がゆっくり回る）----------------------
  function title(look, k, bp) {
    const cx = W / 2, cy = H * 0.38;
    const rings = [[240, 18, 0.05, 'orb', 7], [165, 12, -0.08, 'rice', 6], [95, 6, 0.12, 'star', 7]];
    for (const [R, n, sp, style, r] of rings) {
      for (let i = 0; i < n; i++) {
        const a = bp * sp + (i / n) * TAU, rad = R * (1 + 0.04 * k);
        const x = cx + Math.cos(a) * rad, y = cy + Math.sin(a) * rad;
        const c = UFO_COLS[i % 3];
        if (gfx > 0) {
          ctx.globalCompositeOperation = 'lighter';
          const G = r * (2 + k);
          ctx.drawImage(glowSprite(c), x - G, y - G, G * 2, G * 2);
          ctx.globalCompositeOperation = 'source-over';
        }
        // 米つぶは輪にそって進む向きを向く
        bullet({ x, y, r, style, age: bp * 0.3, px: x - Math.sin(a) * sp, py: y + Math.cos(a) * sp }, c, k);
      }
    }
  }

  THEMES.night = {
    noTrails: true, noScanlines: true, glow: 1.8,
    clearColors: ['#ff4d6d', '#5cf2a4', '#4cc9f0', '#fff3c4', '#c4b5fd'],
    reset, update, background, floor, platform, bullet, laser, flash, banner, title,
  };
  // 曲が変わったら、この見た目のセットの絵を手放す（次に使うときに作り直す。メモリがふくらんで重くならないように）
  THEMES.night.release = () => {
    freeArt({ a: [moonImg, cloudImgs, skyline] });
    moonImg = cloudImgs = skyline = wavePat = null;
  };
})();
