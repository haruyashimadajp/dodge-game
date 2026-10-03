"use strict";

/* =========================================================================
   見た目のセット「ex」  —  曲⑥「ExtremeEX」用
   テーマは「暴走する炉心（リアクター）」。黒と赤の警告色の部屋の奥へ、六角形のトンネルが拍ごとに流れこむ。
   まん中には回るタービンと、キックのたびに白熱する炉心（中に「EX」）。そのまわりを曲の音量で動くスペクトラムの輪。
   左右には計器: 左は曲の進み具合の「DANGER」ゲージ、右は音の高さごとのレベルメーター。上を「WARNING」の帯が流れる。
   ここぞという所の演出:
     ドロップの瞬間 … 巨大な「EX」が色ずれしながら叩きつけられ、画面にヒビ ＋ 衝撃波 ＋ 白黒反転の一瞬
     ため（ビルド） … 上下に黒い帯（シネマスコープ）＋ 最後の小節で 3・2・1 のカウントダウン
     ドロップ中     … 中心から飛び出す集中線、稲妻、炉心のまわりの放電、画面のふちが赤く脈打つ
   ========================================================================= */

(function () {
  const CX = W / 2, CY = 250;
  const FONT = '"Orbitron", system-ui, sans-serif';
  const WHITE = [255, 255, 255], RED = rgb('#ff2a3a'), GOLD = rgb('#ffd23f');
  const st = { rot: 0, tape: 0, lastBeat: -99, slam: null, count: null, lines: [], bolts: [], cracks: null, box: 0, inv: 0 };
  // 演出の予定（拍）: ドロップ（叩きつけ）とカウントダウン、黒い帯の区間
  // 曲が exFx を持っていれば、そちらの予定を使う（3分のリメイク版など）
  const FX0 = {
    slams: { 128: 'EX', 256: 'EX', 352: 'EX', 384: 'EX' },
    counts: { 125: '3', 126: '2', 127: '1', 253: '3', 254: '2', 255: '1', 349: '3', 350: '2', 351: '1' },
    box: [[96, 128], [224, 256], [344, 352]],
    drops: [[128, 192], [256, 352], [352, 384]],
  };
  const sched = () => (typeof song !== 'undefined' && song && song.exFx) || FX0;
  const inside = (b, list) => list.some(([a, z]) => b >= a && b < z);

  function reset() { Object.assign(st, { lastBeat: -99, slam: null, count: null, lines: [], bolts: [], cracks: null, box: 0, inv: 0 }); }

  function onBeat(b) {
    if (sched().slams[b]) {                                  // ドロップ: 叩きつけ
      st.slam = { t: 0, text: sched().slams[b] };
      st.inv = 1;
      window.flash(0.65); shake(22); punch(0.08); glitch(0.8);   // （この中の flash は見た目のセット用なので、ゲームの flash を呼ぶ）
      shockRing(W / 2, H * 0.45, { color: '#ffffff', size: 900, life: 0.7, width: 10 });
      shockRing(W / 2, H * 0.45, { color: '#ff2a3a', size: 650, life: 0.9, width: 6 });
      const lines = [];                              // 画面のヒビ（中心から放射状）
      for (let i = 0; i < 14; i++) {
        let a = i / 14 * TAU + Math.random() * 0.3, x = W / 2, y = H * 0.45;
        const pts = [[x, y]];
        for (let j = 0; j < 9; j++) { a += (Math.random() - 0.5) * 0.6; x += Math.cos(a) * (40 + Math.random() * 60); y += Math.sin(a) * (40 + Math.random() * 60); pts.push([x, y]); }
        lines.push(pts);
      }
      st.cracks = { t: 0, lines };
    }
    if (sched().counts[b]) { st.count = { t: 0, text: sched().counts[b] }; shake(6); }
    if (inside(b, sched().drops) && b % 8 === 0 && gfx > 0) {   // 稲妻（2小節ごと）
      const x0 = Math.random() * W, pts = [[x0, -10]];
      let x = x0, y = -10;
      while (y < CY) { y += 30 + Math.random() * 30; x += (Math.random() - 0.5) * 80 + (CX - x) * 0.15; pts.push([x, y]); }
      st.bolts.push({ t: 0, pts });
    }
  }

  function update(dt, T, look) {
    st.rot += dt * (0.2 + 0.18 * look.tier);
    st.tape += dt * (40 + 25 * look.tier);
    if (scene !== 'play') return;
    const b = Math.floor(beatPos(T) + 0.02);
    if (b !== st.lastBeat) { if (b === st.lastBeat + 1) onBeat(b); st.lastBeat = b; }
    if (st.slam) { st.slam.t += dt; if (st.slam.t > 0.6) st.slam = null; }
    if (st.count) { st.count.t += dt; if (st.count.t > 0.3) st.count = null; }
    if (st.cracks) { st.cracks.t += dt; if (st.cracks.t > 1.4) st.cracks = null; }
    st.inv = Math.max(0, st.inv - dt * 9);
    for (const q of st.bolts) q.t += dt;
    st.bolts = st.bolts.filter(q => q.t < 0.35);
    const bp = beatPos(T);
    st.box += ((inside(bp, sched().box) ? 1 : 0) - st.box) * Math.min(1, dt * 6);
    // 集中線（ドロップ中）
    if (inside(bp, sched().drops) && st.lines.length < [0, 24, 48][gfx] && Math.random() < dt * 60) {
      const a = Math.random() * TAU;
      st.lines.push({ a, r: 80 + Math.random() * 60, v: 900 + Math.random() * 900, len: 60 + Math.random() * 140 });
    }
    for (const l of st.lines) l.r += l.v * dt;
    st.lines = st.lines.filter(l => l.r < 900);
  }

  // 1回だけ作る絵: うすいハニカム模様
  let comb = null;
  function makeComb() {
    comb = document.createElement('canvas'); comb.width = W; comb.height = H;
    const g = comb.getContext('2d'), r = 22, hw = r * Math.sqrt(3);
    g.strokeStyle = 'rgba(255,60,80,0.07)'; g.lineWidth = 1;
    g.beginPath();
    for (let row = 0, y = 0; y < H + r * 2; row++, y += r * 1.5) {
      for (let x = (row % 2) * hw / 2; x < W + hw; x += hw) {
        for (let i = 0; i < 6; i++) { const a = i / 6 * TAU + Math.PI / 6; const px = x + Math.cos(a) * r, py = y + Math.sin(a) * r; i ? g.lineTo(px, py) : g.moveTo(px, py); }
        g.closePath();
      }
    }
    g.stroke();
  }
  const hexPath = (g, x, y, r, rot) => { g.moveTo(x + Math.cos(rot) * r, y + Math.sin(rot) * r); for (let i = 1; i <= 6; i++) { const a = rot + i / 6 * TAU; g.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); } };

  function background(T, look, k, bk, bp) {
    if (!comb) makeComb();
    const tier = look.tier, drop = scene === 'play' && inside(bp, sched().drops);
    // 部屋（色がゆっくり変わるだけなので4コマに1回）
    ctx.drawImage(cachedLayer('exRoom', 4, 0, g => {
      const gr = g.createRadialGradient(CX, CY, 20, CX, CY, 700);
      gr.addColorStop(0, rgba(look.skyBot, 1)); gr.addColorStop(1, rgba(look.skyTop, 1));
      g.fillStyle = gr; g.fillRect(0, 0, W, H);
      g.drawImage(comb, 0, 0);
    }), 0, 0, W, H);

    ctx.globalCompositeOperation = 'lighter';
    // 奥から流れこむ六角形のトンネル（拍で手前へ進む）＋ 角から中心へのびる線
    const f = bp - Math.floor(bp);
    const n = [4, 7, 10][gfx];
    ctx.lineWidth = 2;
    for (let i = 0; i < n; i++) {
      const p = (i + f) / n, s2 = 0.04 + p * p * 1.7, a = (0.05 + 0.3 * p) * (0.6 + 0.4 * clamp01(tier / 4));
      ctx.strokeStyle = rgba((Math.floor(bp) - i) % 4 === 0 ? GOLD : look.color, a);
      ctx.beginPath(); hexPath(ctx, CX, CY, 480 * s2, Math.PI / 6 + st.rot * 0.05 * (i % 2 ? 1 : -1)); ctx.stroke();
    }
    ctx.strokeStyle = rgba(look.color, 0.1);
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (let i = 0; i < 6; i++) { const a = Math.PI / 6 + i / 6 * TAU; ctx.moveTo(CX + Math.cos(a) * 30, CY + Math.sin(a) * 30); ctx.lineTo(CX + Math.cos(a) * 1000, CY + Math.sin(a) * 1000); }
    ctx.stroke();

    // 炉心: 外のタービン（12枚の羽）・目盛りの輪・六角の枠・白熱する芯
    const R = 150 + 10 * k;
    ctx.fillStyle = rgba(look.color, 0.12 + 0.12 * k);
    ctx.beginPath();
    for (let i = 0; i < 12; i++) {
      const a0 = st.rot * 1.5 + i / 12 * TAU, a1 = a0 + TAU / 12 * 0.62;
      ctx.moveTo(CX + Math.cos(a0) * (R - 34), CY + Math.sin(a0) * (R - 34));
      ctx.arc(CX, CY, R - 8, a0 + 0.08, a1);
      ctx.arc(CX, CY, R - 34, a1 - 0.1, a0, true);
      ctx.closePath();
    }
    ctx.fill();
    ctx.strokeStyle = rgba(GOLD, 0.25 + 0.2 * k);
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i < 48; i++) { const a = -st.rot * 0.8 + i / 48 * TAU, l = i % 4 === 0 ? 10 : 4; ctx.moveTo(CX + Math.cos(a) * (R - 50), CY + Math.sin(a) * (R - 50)); ctx.lineTo(CX + Math.cos(a) * (R - 50 - l), CY + Math.sin(a) * (R - 50 - l)); }
    ctx.stroke();
    for (let j = 0; j < 2; j++) {
      ctx.strokeStyle = rgba(j ? GOLD : look.color, 0.2 + 0.18 * k);
      ctx.lineWidth = j ? 2 : 4;
      ctx.beginPath(); hexPath(ctx, CX, CY, R + j * 26, st.rot * (j ? -1 : 1)); ctx.stroke();
    }
    const core = 46 + 14 * k + 8 * clamp01(tier - 3);
    if (gfx > 0) { ctx.globalAlpha = 0.3 + 0.25 * k; ctx.drawImage(glowSprite(look.color), CX - core * 2.6, CY - core * 2.6, core * 5.2, core * 5.2); ctx.globalAlpha = 1; }
    ctx.globalCompositeOperation = 'source-over';
    const cg = ctx.createRadialGradient(CX, CY, 2, CX, CY, core);
    cg.addColorStop(0, 'rgba(255,255,255,0.9)'); cg.addColorStop(0.45, rgba(mixC(look.color, WHITE, 0.3), 0.7)); cg.addColorStop(1, rgba(look.color, 0));
    ctx.fillStyle = cg; ctx.beginPath(); ctx.arc(CX, CY, core, 0, TAU); ctx.fill();
    ctx.font = `900 ${34 + 8 * k}px ${FONT}`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = rgba([60, 0, 8], 0.55);
    ctx.fillText('EX', CX, CY + 2);
    ctx.globalCompositeOperation = 'lighter';
    // ドロップ中: 炉心のまわりの放電（短いギザギザの線）
    if (drop && gfx > 0) {
      ctx.strokeStyle = rgba(mixC(look.color, WHITE, 0.5), 0.7);
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      for (let j = 0; j < 3; j++) {
        let a = Math.random() * TAU, r = core * 0.8;
        ctx.moveTo(CX + Math.cos(a) * r, CY + Math.sin(a) * r);
        while (r < R - 10) { r += 10 + Math.random() * 14; a += (Math.random() - 0.5) * 0.5; ctx.lineTo(CX + Math.cos(a) * r, CY + Math.sin(a) * r); }
      }
      ctx.stroke();
    }

    // スペクトラムの輪（曲の音量データで動く。低音 → 高音が輪をぐるっと一周、左右対称）
    if (gfx > 0 && scene === 'play') {
      const NB = gfx === 2 ? 64 : 32, r0 = R + 40;
      ctx.lineWidth = gfx === 2 ? 4 : 6;
      ctx.lineCap = 'butt';
      for (let i = 0; i < NB; i++) {
        const u = i < NB / 2 ? i / (NB / 2) : (NB - i) / (NB / 2);       // 0〜1〜0（左右対称）
        const fb = u * 7, i0 = Math.floor(fb), e0 = songEnv(i0, T), e1 = songEnv(Math.min(7, i0 + 1), T);
        const v = (e0 + (e1 - e0) * (fb - i0)) * (0.7 + 0.3 * Math.sin(i * 1.7 + T * 9));
        const len = 6 + v * (40 + 50 * clamp01((tier - 2) / 3)) + 18 * k * (1 - u);
        const a = -Math.PI / 2 + i / NB * TAU + st.rot * 0.3;
        ctx.strokeStyle = rgba(mixC(look.color, GOLD, u), 0.35 + 0.5 * v);
        ctx.beginPath();
        ctx.moveTo(CX + Math.cos(a) * r0, CY + Math.sin(a) * r0);
        ctx.lineTo(CX + Math.cos(a) * (r0 + len), CY + Math.sin(a) * (r0 + len));
        ctx.stroke();
      }
    }
    // 集中線
    ctx.strokeStyle = rgba(WHITE, 0.35);
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (const l of st.lines) {
      const c = Math.cos(l.a), sn = Math.sin(l.a);
      ctx.moveTo(CX + c * l.r, CY + sn * l.r); ctx.lineTo(CX + c * (l.r + l.len), CY + sn * (l.r + l.len));
    }
    ctx.stroke();
    // 稲妻
    for (const q of st.bolts) {
      const a = 1 - q.t / 0.35;
      for (const [w, c] of [[8, rgba(look.color, 0.35 * a)], [2.5, rgba(WHITE, 0.95 * a)]]) {
        ctx.strokeStyle = c; ctx.lineWidth = w;
        ctx.beginPath(); q.pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.stroke();
      }
    }
    ctx.globalCompositeOperation = 'source-over';

    // 左右の計器（画質「中」以上）: 左 = DANGER ゲージ（曲の進み具合）、右 = レベルメーター
    if (gfx > 0) {
      const gy0 = 190, gh = 380, segs = 24, prog = scene === 'play' ? clamp01(T / SONG_END) : 0.5 + 0.5 * Math.sin(T * 0.5);
      ctx.font = `700 10px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillStyle = rgba(GOLD, 0.55);
      ctx.fillText('DANGER', 30, gy0 - 14);
      ctx.fillText('LV.EX', W - 30, gy0 - 14);
      for (let i = 0; i < segs; i++) {
        const y = gy0 + gh - (i + 1) * gh / segs, on = i / segs < prog;
        ctx.fillStyle = on ? rgba(mixC(GOLD, RED, i / segs), 0.55 + 0.3 * k) : 'rgba(255,40,60,0.1)';
        ctx.fillRect(20, y + 2, 20, gh / segs - 4);
      }
      for (let b = 0; b < 8; b++) {
        const e = scene === 'play' ? songEnv(7 - b, T) : 0.4 + 0.3 * Math.sin(T * 3 + b), y = gy0 + b * gh / 8;
        const lit = Math.round(e * 6);
        for (let j = 0; j < 6; j++) {
          ctx.fillStyle = j < lit ? rgba(j > 4 ? WHITE : j > 3 ? GOLD : look.color, 0.6) : 'rgba(255,40,60,0.1)';
          ctx.fillRect(W - 50 + j * 6, y + 4, 4, gh / 8 - 10);
        }
      }
      ctx.fillStyle = rgba(GOLD, 0.45);
      ctx.fillText('200', 30, gy0 + gh + 14); ctx.fillText('BPM', W - 30, gy0 + gh + 14);
    }

    // 上を流れる WARNING の帯
    const tape = (y, dir) => {
      ctx.fillStyle = rgba(GOLD, 0.12 + 0.1 * k);
      ctx.fillRect(0, y, W, 22);
      ctx.font = `800 13px ${FONT}`;
      ctx.fillStyle = rgba([10, 0, 0], 0.85);
      ctx.textAlign = 'left';
      const text = 'WARNING ◆ EXTREME ◆ ', w = 210, off = ((st.tape * dir) % w + w) % w;
      for (let x = -w + off; x < W + w; x += w) ctx.fillText(text, x, y + 12);
    };
    if (gfx > 0) tape(40, 1);
  }

  function floor(look, k) {
    const y = GROUND_Y, off = ((stage.scroll % 40) + 40) % 40;
    ctx.save();
    ctx.beginPath(); ctx.rect(-400, y, W + 800, H - y + 400); ctx.clip();
    ctx.fillStyle = '#0b0002';
    ctx.fillRect(-400, y, W + 800, H - y + 400);
    ctx.fillStyle = rgba(look.color, 0.55 + 0.35 * k);
    for (let x = -440 + off; x < W + 440; x += 40) {
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 18, y); ctx.lineTo(x + 8, y + 9); ctx.lineTo(x - 10, y + 9); ctx.closePath(); ctx.fill();
    }
    ctx.restore();
  }

  function platform(p, look, k) {
    ctx.fillStyle = '#14000a';
    ctx.fillRect(p.x, p.y, p.w, p.h);
    ctx.strokeStyle = rgba(look.color, 0.8 + 0.2 * k);
    ctx.lineWidth = 2;
    ctx.strokeRect(p.x + 1, p.y + 1, p.w - 2, p.h - 2);
    ctx.fillStyle = rgba(GOLD, 0.8);
    for (let x = p.x + 8; x < p.x + p.w - 8; x += 20) ctx.fillRect(x, p.y + p.h / 2 - 1, 10, 2);
  }

  function bullet(b, c, k) {
    if (b.style === 'roller') {
      ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(b.x / b.r);
      ctx.fillStyle = rgba(c, 1);
      ctx.beginPath();
      for (let i = 0; i < 16; i++) { const r = i % 2 ? b.r * 0.75 : b.r * 1.2, t = i / 16 * TAU; ctx.lineTo(Math.cos(t) * r, Math.sin(t) * r); }
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(0, 0, b.r * 0.5, 0, TAU); ctx.fill();
      ctx.restore();
      return;
    }
    if (b.style === 'rev') {                         // REV弾: うなっている間はふるえる → 飛ぶと長い光の尾
      const x = b.x + (b.shiver || 0), k2 = b.revK || 0;
      if (k2 > 0) {
        const sp = Math.hypot(b.vx, b.vy) || 1, L = Math.min(90, sp * 0.09);
        ctx.strokeStyle = rgba(c, 0.8); ctx.lineWidth = b.r * 1.4; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(x, b.y); ctx.lineTo(x - b.vx / sp * L, b.y - b.vy / sp * L); ctx.stroke();
      } else {
        ctx.strokeStyle = rgba(c, 0.8); ctx.lineWidth = 1.5;
        const R = b.r * (1.6 + 1.6 * (1 - Math.min(1, b.age / b.hang)));
        ctx.beginPath(); ctx.arc(x, b.y, R, 0, TAU); ctx.stroke();
      }
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.arc(x, b.y, b.r, 0, TAU); ctx.fill();
      ctx.strokeStyle = rgba(c, 1); ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.arc(x, b.y, b.r, 0, TAU); ctx.stroke();
      return;
    }
    if (b.style === 'shard') {                       // 割れたガラス → とがったひし形
      const a = Math.atan2(b.vy, b.vx);
      ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(a);
      ctx.fillStyle = rgba(c, 1);
      ctx.beginPath(); ctx.moveTo(b.r * 1.9, 0); ctx.lineTo(0, -b.r * 0.8); ctx.lineTo(-b.r * 1.2, 0); ctx.lineTo(0, b.r * 0.8); ctx.closePath(); ctx.fill();
      ctx.restore();
      return;
    }
    ctx.fillStyle = rgba(c, 1);                      // ふつうの弾: 色のふち ＋ 白い芯 ＋ 黒い輪
    ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, TAU); ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(b.x, b.y, b.r * 0.55, 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.6)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(b.x, b.y, b.r * 0.55, 0, TAU); ctx.stroke();
  }

  function flash(look) {
    ctx.fillStyle = rgba(mixC(look.color, WHITE, 0.3), 0.38 * flashT);
    ctx.fillRect(0, 0, W, H);
  }

  // 場面の名前: 赤と青に色ずれして、ガタガタ出てくる
  // 画面のいちばん上の演出: 黒い帯・カウントダウン・叩きつけの「EX」・ヒビ・白黒反転
  function overlay() {
    if (st.box > 0.01) {                             // シネマスコープの黒い帯（＋ 黄色いしま）
      const h = 46 * st.box;
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, W, h); ctx.fillRect(0, H - h, W, h);
      ctx.fillStyle = rgba(GOLD, 0.8 * st.box);
      const off = (st.tape * 2) % 40;
      for (let x = -40 + off; x < W + 40; x += 40) {
        ctx.beginPath(); ctx.moveTo(x, h); ctx.lineTo(x + 20, h); ctx.lineTo(x + 14, h + 6); ctx.lineTo(x - 6, h + 6); ctx.closePath(); ctx.fill();
        ctx.beginPath(); ctx.moveTo(x, H - h); ctx.lineTo(x + 20, H - h); ctx.lineTo(x + 14, H - h - 6); ctx.lineTo(x - 6, H - h - 6); ctx.closePath(); ctx.fill();
      }
    }
    const bp = beatPos(songTime);
    if (scene === 'play' && inside(bp, sched().drops) && gfx > 0) {   // ドロップ中: キックのたびに画面のふちが赤く脈打つ
      const kk = kickOf(bp);
      const g = ctx.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, H * 0.8);
      g.addColorStop(0, 'rgba(255,20,50,0)'); g.addColorStop(1, `rgba(255,20,50,${(0.4 * kk).toFixed(3)})`);
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    }
    if (st.cracks) {                                 // 画面のヒビ（すぐ広がって、ゆっくり消える）
      const g = clamp01(st.cracks.t / 0.08), a = 1 - st.cracks.t / 1.4;
      ctx.strokeStyle = rgba(WHITE, 0.8 * a); ctx.lineWidth = 1.5;
      ctx.beginPath();
      for (const l of st.cracks.lines) {
        const n = Math.max(1, Math.round((l.length - 1) * g));
        ctx.moveTo(l[0][0], l[0][1]);
        for (let i = 1; i <= n; i++) ctx.lineTo(l[i][0], l[i][1]);
      }
      ctx.stroke();
    }
    if (st.inv > 0) {                                // 一瞬の白黒反転
      ctx.globalCompositeOperation = 'difference';
      ctx.fillStyle = rgba(WHITE, st.inv);
      ctx.fillRect(0, 0, W, H);
      ctx.globalCompositeOperation = 'source-over';
    }
    const big = (text, size, a, dx) => {             // 色ずれした大きな文字
      ctx.font = `900 ${size}px ${FONT}`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = `rgba(255,0,40,${(0.85 * a).toFixed(3)})`; ctx.fillText(text, W / 2 - dx, H * 0.45);
      ctx.fillStyle = `rgba(0,200,255,${(0.75 * a).toFixed(3)})`; ctx.fillText(text, W / 2 + dx, H * 0.45);
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = `rgba(255,255,255,${a.toFixed(3)})`; ctx.fillText(text, W / 2, H * 0.45);
    };
    if (st.count) {
      const p = st.count.t / 0.3;
      big(st.count.text, 220 - 60 * p, clamp01(1 - p) * 0.9, 6 * (1 - p));
    }
    if (st.slam) {                                   // 巨大な EX が叩きつけられて、ふるえて、消える
      const t = st.slam.t, p = clamp01(t / 0.12);
      const size = 520 - 300 * easeOut(p), a = t < 0.25 ? 1 : 1 - (t - 0.25) / 0.35;   // すぐ消える（弾を隠さない）
      const dx = 14 * (1 - p) + (t > 0.12 ? (Math.random() - 0.5) * 8 * a : 0);
      ctx.save();
      ctx.translate(W / 2, H * 0.45); ctx.rotate(-0.08 * (1 - p)); ctx.translate(-W / 2, -H * 0.45);
      big(st.slam.text, size, clamp01(a) * 0.6, dx);
      ctx.restore();
    }
  }

  function banner() {
    overlay();
    const bn = fx.banner;
    if (!bn) return;
    const e = bn.age, DUR = 2.2;
    if (e > DUR) { fx.banner = null; return; }
    const a = e < 0.15 ? e / 0.15 : e > DUR - 0.4 ? (DUR - e) / 0.4 : 1;
    const y = 120, jit = e < 0.5 ? (Math.random() - 0.5) * 14 * (1 - e / 0.5) : 0;
    ctx.save();
    ctx.globalAlpha = clamp01(a);
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(0, y - 40, W, 80);
    ctx.fillStyle = rgba(GOLD, 0.9);
    ctx.fillRect(0, y - 40, W, 3); ctx.fillRect(0, y + 37, W, 3);
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = `900 38px ${FONT}`;
    if ('letterSpacing' in ctx) ctx.letterSpacing = '6px';
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = 'rgba(255,0,40,0.9)'; ctx.fillText(bn.name, W / 2 - 4 + jit, y - 6);
    ctx.fillStyle = 'rgba(0,200,255,0.8)'; ctx.fillText(bn.name, W / 2 + 4 - jit, y - 6);
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = '#fff'; ctx.fillText(bn.name, W / 2 + jit * 0.3, y - 6);
    if ('letterSpacing' in ctx) ctx.letterSpacing = '2px';
    ctx.font = `700 14px system-ui, sans-serif`;
    ctx.fillStyle = rgba(GOLD, clamp01((e - 0.2) / 0.3));
    ctx.fillText(bn.sub, W / 2, y + 24);
    if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';
    ctx.restore();
  }

  function title(look, k, bp) {
    for (let j = 0; j < 3; j++) {
      ctx.strokeStyle = rgba(j === 1 ? GOLD : look.color, 0.5 + 0.4 * k);
      ctx.lineWidth = 3 - j;
      ctx.beginPath();
      for (let i = 0; i <= 6; i++) { const a = bp * 0.08 * (j % 2 ? -1 : 1) + i / 6 * TAU + j * 0.3; ctx.lineTo(CX + Math.cos(a) * (180 + j * 24 + 8 * k), 270 + Math.sin(a) * (180 + j * 24 + 8 * k)); }
      ctx.stroke();
    }
  }

  THEMES.ex = {
    noTrails: true, noScanlines: false, glow: 1.6,
    clearColors: ['#ff2a3a', '#ffd23f', '#ffffff', '#ff6bd5', '#c86bff'],
    reset, update, background, floor, platform, bullet, flash, banner, title,
  };
})();
