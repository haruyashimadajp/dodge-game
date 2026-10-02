"use strict";

/* =========================================================================
   見た目のセット「prism」  —  曲⑪「Prism」用
   美術館の暗い展示室。ステージは1枚の「キャンバス」で、ビームは光の絵の具。
     予告      … 鉛筆で下書きするように、細い線が先へ伸びていく（危ない帯は最初から全部見える）
     発射      … 光が三原色（赤・緑・青）にずれて重なり、まん中は白く光る。光の粒が線の上を走る
     光の絵    … 撃たれたビームは消えずに、うすくキャンバスに描き残される（長時間露光の写真のように）。
                  曲の最後には、ここまでのビームがぜんぶ重なった1枚の絵になり、金の額縁に入る
     交差      … ビームとビームが交わる所に、星のような光
     床        … みがいた黒い床。光の絵とビームが映りこむ
     プリズム  … 七色の扇の上には、ガラスのプリズム。白い光が入って、七色に分かれて出ていく
     光の筆    … 空をリサジュー曲線で舞いながら、七色の線を描く（リードの音でビームを撃ってくる）
     ザップ    … 大きな白い光が落ちて、七色に砕ける（曲の「ザップ」の音）
     アルペジオ … 音に合わせて、描かれた絵のあちこちがキラッと光る
   ========================================================================= */

(function () {
  const WHITE = [255, 255, 255];
  const GOLD = [232, 196, 120];
  const SPEC = SPECTRUM.map(rgb);
  const PS = 0.5;                                           // 光の絵は半分の大きさで描く（やわらかく、軽い）
  const M = 360;                                            // 光の絵は画面より M だけ広い（世界が回っても、絵のはしが見えない）
  const st = { pc: null, px: null, lastBeat: -99, strokes: [], twinkles: [], zaps: [], blooms: null, brushPrev: null, tex: null, end: 0 };
  let ARP = null;
  const inSong = () => scene !== 'title';
  const hash = (a, b = 0) => { const s = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return s - Math.floor(s); };

  function make() {
    st.pc = document.createElement('canvas'); st.pc.width = (W + 2 * M) * PS; st.pc.height = (H + 2 * M) * PS;
    st.px = st.pc.getContext('2d');
    st.blooms = Array.from({ length: 6 }, (_, i) => ({ x: Math.random() * W, y: 120 + Math.random() * 420, r: 220 + Math.random() * 200, c: SPEC[(i * 3) % 7], ph: Math.random() * TAU, sp: 0.04 + Math.random() * 0.05 }));
    // キャンバスの布目（小さな模様をくり返す）
    const t = document.createElement('canvas'); t.width = t.height = 96;
    const g = t.getContext('2d');
    for (let i = 0; i < 900; i++) { g.fillStyle = `rgba(255,255,255,${(Math.random() * 0.035).toFixed(3)})`; g.fillRect(Math.random() * 96, Math.random() * 96, 1, 1 + (Math.random() < 0.3 ? 1 : 0)); }
    g.strokeStyle = 'rgba(255,255,255,0.018)';
    for (let i = 0; i < 96; i += 3) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, 96); g.stroke(); g.beginPath(); g.moveTo(0, i + 1); g.lineTo(96, i + 1); g.stroke(); }
    st.tex = ctx.createPattern(t, 'repeat');
  }
  function reset() {
    if (!st.pc) make();
    st.px.clearRect(0, 0, st.pc.width, st.pc.height);
    Object.assign(st, { lastBeat: -99, strokes: [], twinkles: [], zaps: [], brushPrev: null, end: 0 });
  }

  // ---- 光の絵に描く --------------------------------------------------------
  function paintLine(x1, y1, x2, y2, c, w, a) {
    const g = st.px;
    g.globalCompositeOperation = 'lighter';
    g.lineCap = 'round';
    g.strokeStyle = rgba(c, a); g.lineWidth = w * PS;
    x1 = (x1 + M) * PS; y1 = (y1 + M) * PS; x2 = (x2 + M) * PS; y2 = (y2 + M) * PS;
    g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.stroke();
    g.strokeStyle = rgba(mixC(c, WHITE, 0.6), a * 2.2); g.lineWidth = Math.max(0.6, Math.min(3, w * 0.15) * PS);
    g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.stroke();
  }
  // 光の絵のキャンバスに入っている部分だけにする（m = 画面の外にはみ出してよい幅）
  function clipToScreen(x1, y1, x2, y2, m = M) {
    let t0 = 0, t1 = 1; const dx = x2 - x1, dy = y2 - y1;
    for (const [p, q] of [[-dx, x1 + m], [dx, W + m - x1], [-dy, y1 + m], [dy, GROUND_Y + 4 - y1]]) {
      if (Math.abs(p) < 1e-9) { if (q < 0) return null; continue; }
      const r = q / p;
      if (p < 0) t0 = Math.max(t0, r); else t1 = Math.min(t1, r);
    }
    return t0 < t1 ? [x1 + dx * t0, y1 + dy * t0, x1 + dx * t1, y1 + dy * t1] : null;
  }

  // 発射の瞬間: 光の絵に描き残す ＋ 両はしに七色の粒（ふつうの火花・ゆれのかわり）
  function fire(b) {
    if (b.kind !== 'laser') return false;
    const c = bulletColor(b);
    const s = clipToScreen(b.x1, b.y1, b.x2, b.y2);
    if (s) {
      paintLine(s[0], s[1], s[2], s[3], c, Math.min(18, b.r * 1.8), b.hold > 5 ? 0.015 : 0.04);
      const v = clipToScreen(b.x1, b.y1, b.x2, b.y2, 0);
      if (v) st.strokes.push({ s: v, c });
      if (st.strokes.length > 80) st.strokes.shift();
      for (const [x, y] of [[s[0], s[1]], [s[2], s[3]]]) if (y > -10 && y < GROUND_Y + 10 && x > -10 && x < W + 10) sparks(x, y, { n: 6, color: SPECTRUM[(Math.random() * 7) | 0], speed: 170, life: 0.45, size: 2.2, gravity: 0 });
      // 床に当たった所: 光のしぶき
      const gx = groundHit(b);
      if (gx != null) sparks(gx, GROUND_Y - 2, { n: 8, color: b.color || '#ffffff', speed: 220, life: 0.4, size: 2.2, gravity: 500, dir: -Math.PI / 2, spread: 2.2 });
    }
    shake(b.r > 20 ? 4 : 1.5);
    return true;
  }
  function groundHit(b) {
    const dy = b.y2 - b.y1;
    if (Math.abs(dy) < 1e-6) return null;
    const t = (GROUND_Y - b.y1) / dy;
    if (t < 0 || t > 1) return null;
    const x = b.x1 + (b.x2 - b.x1) * t;
    return x > -20 && x < W + 20 ? x : null;
  }

  // 大きな白い光が落ちて、七色に砕ける（譜面から呼ぶ）
  window.prismZap = function (x) {
    st.zaps.push({ t: 0, x });
    window.flash(0.55); shake(9); punch(0.04);
    const y = GROUND_Y;
    for (let i = 0; i < 7; i++) sparks(x, y - 4, { n: 14, color: SPECTRUM[i], speed: 520, life: 1.0, size: 3, gravity: 260, dir: -Math.PI / 2 + (i - 3) * 0.32, spread: 0.35 });
    shockRing(x, y, { color: '#ffffff', size: 420, life: 0.7, width: 5 });
    for (let i = 0; i < 14; i++) {                                     // 光の絵: 足もとから放射状の線
      const a = -Math.PI + (i + 0.5) * Math.PI / 14;
      paintLine(x, y, x + Math.cos(a) * 900, y + Math.sin(a) * 900, SPEC[i % 7], 2, 0.03);
    }
  };

  function update(dt, T, look) {
    if (!st.pc) make();
    if (scene === 'play') {
      if (!ARP) ARP = new Map(SCORE_PRISM.arp.map(a => [Math.round(a[0] * 4), a[1]]));
      const q = Math.floor(beatPos(T) * 4 + 0.05);                       // 16分音符ごと
      if (q !== st.lastBeat) {
        if (q === st.lastBeat + 1 && ARP.has(q) && st.strokes.length) {    // アルペジオ: 絵のどこかがキラッ
          const s = st.strokes[(Math.random() * st.strokes.length) | 0].s, u = Math.random();
          st.twinkles.push({ x: s[0] + (s[2] - s[0]) * u, y: s[1] + (s[3] - s[1]) * u, t: 0, c: SPEC[(ARP.get(q) * 5) % 7], r: 10 + Math.random() * 12 });
        }
        st.lastBeat = q;
      }
      // 動くビーム（スキャナー・光の壁）は、動いた跡が長時間露光のように残る
      for (const b of bullets) if (b.kind === 'laser' && b.delay <= 0 && !b.safe && b.slide) {
        const s = clipToScreen(b.x1, b.y1, b.x2, b.y2);
        if (s) paintLine(s[0], s[1], s[2], s[3], bulletColor(b), Math.min(14, b.r * 1.5), 0.008);
      }
      // 光の筆: 空にリサジュー曲線を描きながら、光の絵にも描く
      if (stage.brush > 0.02) {
        const p = brushPos(T), hue = SPEC[Math.floor(T * 2) % 7];
        if (st.brushPrev) paintLine(st.brushPrev.x, st.brushPrev.y, p.x, p.y, hue, 4, 0.05 * stage.brush);
        st.brushPrev = p;
      } else st.brushPrev = null;
    }
    for (const t of st.twinkles) t.t += dt;
    st.twinkles = st.twinkles.filter(t => t.t < 0.6);
    for (const z of st.zaps) z.t += dt;
    st.zaps = st.zaps.filter(z => z.t < 1.4);
    if (inSong() && beatPos(T) >= 240) st.end = Math.min(1, st.end + dt / 2.5); else if (scene === 'play') st.end = 0;
  }

  // ---- 背景: 暗い展示室 ＋ 水彩のにじみ ＋ 布目 -------------------------------------
  function background(T, look, k, bk, bp) {
    if (!st.pc) make();
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, rgba(look.skyTop, 1)); g.addColorStop(1, rgba(look.skyBot, 1));
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    if (gfx > 0) {
      const lowE = inSong() ? songEnv(1, T) : 0.3;
      ctx.globalCompositeOperation = 'lighter';
      for (const b of st.blooms) {                                       // 水彩のにじみ（ゆっくり漂う）
        const x = b.x + Math.sin(T * b.sp + b.ph) * 120, y = b.y + Math.cos(T * b.sp * 1.3 + b.ph) * 60;
        const gr = ctx.createRadialGradient(x, y, 0, x, y, b.r);
        gr.addColorStop(0, rgba(b.c, 0.05 + 0.05 * lowE)); gr.addColorStop(1, rgba(b.c, 0));
        ctx.fillStyle = gr; ctx.fillRect(x - b.r, y - b.r, b.r * 2, b.r * 2);
      }
      // 盛り上がる所: 上から七色の光の筋がゆっくり首をふる（舞台の照明）
      const hot = clamp01((look.tier - 2.5) / 1.5);
      if (hot > 0) {
        for (let i = 0; i < 7; i++) {
          const a = Math.PI / 2 + Math.sin(T * 0.4 + i * 0.9) * 0.6 + (i - 3) * 0.12;
          const len = 900, w = 0.05;
          const gr = ctx.createLinearGradient(W / 2, -40, W / 2 + Math.cos(a) * len, -40 + Math.sin(a) * len);
          gr.addColorStop(0, rgba(SPEC[i], (0.07 + 0.05 * k) * hot)); gr.addColorStop(1, rgba(SPEC[i], 0));
          ctx.fillStyle = gr;
          ctx.beginPath(); ctx.moveTo(W / 2, -40);
          ctx.lineTo(W / 2 + Math.cos(a - w) * len, -40 + Math.sin(a - w) * len);
          ctx.lineTo(W / 2 + Math.cos(a + w) * len, -40 + Math.sin(a + w) * len);
          ctx.closePath(); ctx.fill();
        }
      }
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = st.tex; ctx.fillRect(0, 0, W, H);
    }
  }

  // ---- 床: みがいた黒い床。光の絵が映りこむ ＋ その上に光の絵（カメラの中なので、世界といっしょに回る）----
  function floor(look, k) {
    const y = GROUND_Y;
    const g = ctx.createLinearGradient(0, y, 0, H);
    g.addColorStop(0, '#0d0b14'); g.addColorStop(1, '#030206');
    ctx.fillStyle = g; ctx.fillRect(-400, y, W + 800, H - y + 400);
    if (st.pc) {
      // 映りこみ（上下さかさまに、うすく）
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.22;
      const R = H - y + 60;
      ctx.translate(0, 2 * y); ctx.scale(1, -1);
      ctx.drawImage(st.pc, 0, (y - R + M) * PS, (W + 2 * M) * PS, R * PS, -M, y - R, W + 2 * M, R);
      ctx.restore();
      // 光の絵
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.5;
      ctx.drawImage(st.pc, -M, -M, W + 2 * M, H + 2 * M);
      ctx.restore();
    }
    ctx.strokeStyle = rgba(mixC(look.color, WHITE, 0.5), 0.35 + 0.3 * k); ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(-400, y); ctx.lineTo(W + 400, y); ctx.stroke();
  }
  // 足場: ガラスの板（ふちが七色）
  function platform(p, look, k) {
    ctx.fillStyle = 'rgba(200,220,255,0.07)';
    ctx.fillRect(p.x, p.y, p.w, p.h);
    const g = ctx.createLinearGradient(p.x, 0, p.x + p.w, 0);
    SPECTRUM.forEach((c, i) => g.addColorStop(i / 6, c));
    ctx.fillStyle = g; ctx.globalAlpha = 0.55 + 0.3 * k;
    ctx.fillRect(p.x, p.y, p.w, 2);
    ctx.globalAlpha = 1;
    ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.fillRect(p.x + 6, p.y + 4, p.w * 0.3, 1);
  }

  // ---- ビーム ------------------------------------------------------------------------
  function laser(b, c, T, k) {
    const L = Math.hypot(b.x2 - b.x1, b.y2 - b.y1) || 1;
    const ux = (b.x2 - b.x1) / L, uy = (b.y2 - b.y1) / L, nx = -uy, ny = ux;
    const line = (o = 0, f0 = 0, f1 = 1) => {
      ctx.beginPath();
      ctx.moveTo(b.x1 + ux * L * f0 + nx * o, b.y1 + uy * L * f0 + ny * o);
      ctx.lineTo(b.x1 + ux * L * f1 + nx * o, b.y1 + uy * L * f1 + ny * o);
      ctx.stroke();
    };
    if (b.delay > 0) {
      // 予告: 危ない帯（最初から全部）＋ 鉛筆の下書き（先へ伸びていく）＋ 筆先の光
      const p = b.delayMax > 0 ? 1 - b.delay / b.delayMax : 1;
      const head = Math.min(1, p * 1.7);
      ctx.lineCap = 'butt';
      ctx.strokeStyle = rgba(c, 0.05 + 0.1 * p); ctx.lineWidth = b.r * 2; line();
      ctx.strokeStyle = rgba(c, 0.18 + 0.3 * p); ctx.lineWidth = 1;
      ctx.setLineDash([3, 7]); ctx.lineDashOffset = -T * 60;
      line(b.r); line(-b.r);
      ctx.setLineDash([]);
      const pen = mixC(c, WHITE, 0.55), seed = (b.x1 * 13 + b.y2 * 7) % 10;
      ctx.lineCap = 'round';
      ctx.strokeStyle = rgba(pen, 0.55 + 0.4 * p); ctx.lineWidth = 1.3;
      line(Math.sin(seed) * 1.2, 0, head);
      ctx.strokeStyle = rgba(pen, 0.25 + 0.3 * p); ctx.lineWidth = 0.8;
      line(Math.cos(seed) * 2.4, 0.02, head * 0.97);
      if (head < 1) {
        const hx = b.x1 + ux * L * head, hy = b.y1 + uy * L * head;
        ctx.globalCompositeOperation = 'lighter';
        ctx.drawImage(glowSprite(c), hx - 14, hy - 14, 28, 28);
        ctx.fillStyle = 'rgba(255,255,255,0.9)'; ctx.beginPath(); ctx.arc(hx, hy, 2.2, 0, TAU); ctx.fill();
        ctx.globalCompositeOperation = 'source-over';
      }
      if (b.lane) {                                                      // 走る向き（スキャナー）
        const [dx] = b.lane, ax = b.x1 + dx * 26, ay = (b.y1 + b.y2) / 2;
        ctx.fillStyle = rgba(pen, 0.4 + 0.5 * p);
        ctx.beginPath(); ctx.moveTo(ax + dx * 12, ay); ctx.lineTo(ax, ay - 9); ctx.lineTo(ax, ay + 9); ctx.closePath(); ctx.fill();
      }
      if (b.label) {
        ctx.font = 'italic 600 15px Georgia, "Times New Roman", serif';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillStyle = rgba(pen, 0.5 + 0.5 * p);
        for (const f of [0.2, 0.5, 0.8]) ctx.fillText(b.label, b.x1 + (b.x2 - b.x1) * f, b.y1 - 26);
      }
      return true;
    }
    // 発射: 開く瞬間に太く → 三原色のずれ ＋ 白い芯 ＋ 走る光の粒。当たらなくなったら細くなって消える
    const fade = b.safe ? clamp01(1 - (b.age - b.hold) / 0.3) : 1;
    const open = 1 + 0.7 * Math.exp(-b.age * 18);
    const w = b.r * 2 * (b.safe ? fade * 0.6 : open * (1 + 0.06 * Math.sin(b.age * 70)));
    ctx.lineCap = 'round';
    ctx.globalCompositeOperation = 'lighter';
    if (gfx > 0) { ctx.strokeStyle = rgba(c, 0.16 * fade); ctx.lineWidth = w * 3 + 10; line(); }
    ctx.strokeStyle = rgba(c, 0.55 * fade); ctx.lineWidth = w; line();
    const sp = Math.max(1.5, w * 0.22);
    ctx.lineWidth = w * 0.45;
    ctx.strokeStyle = `rgba(255,40,90,${(0.6 * fade).toFixed(3)})`;  line(-sp);
    ctx.strokeStyle = `rgba(40,255,140,${(0.45 * fade).toFixed(3)})`; line(0);
    ctx.strokeStyle = `rgba(60,120,255,${(0.6 * fade).toFixed(3)})`; line(sp);
    ctx.strokeStyle = rgba(WHITE, 0.95 * fade); ctx.lineWidth = Math.max(1, w * 0.28); line();
    if (gfx > 0 && !b.safe) {                                            // 光の粒が線の上を走る
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      const n = Math.min(10, Math.ceil(L / 120));
      for (let i = 0; i < n; i++) {
        const f = ((b.age * 1.6 + i / n) % 1);
        const x = b.x1 + ux * L * f, y = b.y1 + uy * L * f;
        ctx.beginPath(); ctx.arc(x, y, 1.5 + w * 0.12, 0, TAU); ctx.fill();
      }
      const gx = groundHit(b);                                         // 床に当たった所が明るく光る
      if (gx != null) {
        ctx.drawImage(glowSprite(c), gx - 40, GROUND_Y - 22, 80, 44);
        ctx.fillStyle = rgba(mixC(c, WHITE, 0.5), 0.8);
        ctx.beginPath(); ctx.ellipse(gx, GROUND_Y, 16 + w, 3, 0, 0, TAU); ctx.fill();
      }
    }
    if (b.gx != null && !b.safe) {
      ctx.strokeStyle = rgba(c, 0.35); ctx.lineWidth = 1.5; ctx.setLineDash([8, 8]);
      ctx.beginPath(); ctx.moveTo(b.gx1, b.gy1); ctx.lineTo(b.gx, b.gy); ctx.stroke(); ctx.setLineDash([]);
    }
    ctx.globalCompositeOperation = 'source-over';
    return true;
  }

  // 4つの角の星（交差・キラキラ）
  function starFlare(x, y, r, c, a) {
    ctx.fillStyle = rgba(mixC(c, WHITE, 0.5), a);
    ctx.beginPath();
    for (let i = 0; i < 8; i++) {
      const ang = i * Math.PI / 4, rr = i % 2 ? r * 0.16 : r;
      ctx.lineTo(x + Math.cos(ang) * rr, y + Math.sin(ang) * rr);
    }
    ctx.closePath(); ctx.fill();
    ctx.drawImage(glowSprite(c), x - r, y - r, r * 2, r * 2);
  }

  // ---- カメラの中、いちばん上: プリズム・光の筆・交差の星・ザップ・キラキラ ---------------------------
  function world(T, look, k) {
    ctx.globalCompositeOperation = 'lighter';
    // 交差の星
    const live = bullets.filter(b => b.kind === 'laser' && b.delay <= 0 && !b.safe);
    if (live.length > 1 && gfx > 0) {
      let n = 0;
      for (let i = 0; i < live.length && n < 40; i++) for (let j = i + 1; j < live.length && n < 40; j++) {
        const a = live[i], b = live[j];
        const d1x = a.x2 - a.x1, d1y = a.y2 - a.y1, d2x = b.x2 - b.x1, d2y = b.y2 - b.y1;
        const den = d1x * d2y - d1y * d2x;
        if (Math.abs(den) < 1e-6) continue;
        const s = ((b.x1 - a.x1) * d2y - (b.y1 - a.y1) * d2x) / den, u = ((b.x1 - a.x1) * d1y - (b.y1 - a.y1) * d1x) / den;
        if (s < 0 || s > 1 || u < 0 || u > 1) continue;
        const x = a.x1 + d1x * s, y = a.y1 + d1y * s;
        if (x < -20 || x > W + 20 || y < -20 || y > GROUND_Y + 10) continue;
        n++;
        starFlare(x, y, 16 + 8 * k + 4 * Math.sin(T * 20 + i), mixC(bulletColor(a), bulletColor(b), 0.5), 0.85);
      }
    }
    // プリズム（七色の扇の出どころ）
    const prisms = new Map();
    for (const b of bullets) if (b.prism) {
      const key = b.prism.x + ',' + b.prism.y, on = b.delay <= 0 && !b.safe;
      const v = prisms.get(key) || { ...b.prism, on: 0, warn: 0 };
      if (on) v.on++; else if (b.delay > 0) v.warn++;
      prisms.set(key, v);
    }
    for (const p of prisms.values()) drawPrism(p.x, p.y, T, p.on > 0 ? 1 : 0.45, true);
    // 光の筆
    if (inSong() && stage.brush > 0.02) {
      const a = stage.brush;
      ctx.lineCap = 'round';
      let prev = brushPos(T);
      for (let i = 1; i < 50; i++) {
        const p = brushPos(T - i * 0.025), f = 1 - i / 50;
        ctx.strokeStyle = rgba(SPEC[Math.floor((T - i * 0.025) * 2 + 70) % 7], 0.5 * f * a);
        ctx.lineWidth = 1 + 7 * f;
        ctx.beginPath(); ctx.moveTo(prev.x, prev.y); ctx.lineTo(p.x, p.y); ctx.stroke();
        prev = p;
      }
      const p = brushPos(T);
      starFlare(p.x, p.y, 22 + 10 * k, WHITE, 0.9 * a);
    }
    // ザップ: 白い柱が落ちて、足もとで七色に砕ける
    for (const z of st.zaps) {
      const p = z.t;
      if (p < 0.5) {
        const w = 70 * (1 - p / 0.5) + 6;
        const g = ctx.createLinearGradient(z.x - w, 0, z.x + w, 0);
        g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.5, `rgba(255,255,255,${(0.9 * (1 - p / 0.5)).toFixed(3)})`); g.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = g; ctx.fillRect(z.x - w, -200, w * 2, GROUND_Y + 200);
      }
      const a = clamp01(1 - p / 1.4);
      for (let i = 0; i < 7; i++) {                                     // 七色の扇（上へ）
        const ang = -Math.PI / 2 + (i - 3) * 0.2 * (0.6 + p);
        const len = 260 + 900 * easeOut(p / 0.6);
        const gr = ctx.createLinearGradient(z.x, GROUND_Y, z.x + Math.cos(ang) * len, GROUND_Y + Math.sin(ang) * len);
        gr.addColorStop(0, rgba(SPEC[i], 0.5 * a)); gr.addColorStop(1, rgba(SPEC[i], 0));
        ctx.strokeStyle = gr; ctx.lineWidth = 14 * a + 2;
        ctx.beginPath(); ctx.moveTo(z.x, GROUND_Y); ctx.lineTo(z.x + Math.cos(ang) * len, GROUND_Y + Math.sin(ang) * len); ctx.stroke();
      }
    }
    // アルペジオのキラキラ
    for (const t of st.twinkles) {
      const a = Math.sin(Math.PI * clamp01(t.t / 0.6));
      starFlare(t.x, t.y, t.r * (0.6 + 0.6 * a), t.c, 0.9 * a);
    }
    ctx.globalCompositeOperation = 'source-over';
  }

  // ガラスのプリズム（三角形）。白い光が左上から入って、七色の光が下へ出ていく
  function drawPrism(x, y, T, glow, beamIn) {
    const r = 30, rot = Math.sin(T * 0.8) * 0.12;
    const pts = [0, 1, 2].map(i => [x + Math.cos(rot - Math.PI / 2 + i * TAU / 3) * r, y + 4 + Math.sin(rot - Math.PI / 2 + i * TAU / 3) * r]);
    if (beamIn) {                                                      // 入ってくる白い光（当たらない、飾り）
      ctx.strokeStyle = `rgba(255,255,255,${(0.25 + 0.45 * glow).toFixed(3)})`; ctx.lineWidth = 3 + 3 * glow;
      ctx.beginPath(); ctx.moveTo(x - 420, y - 140); ctx.lineTo(x - 10, y); ctx.stroke();
      ctx.strokeStyle = `rgba(255,255,255,${(0.12 * glow).toFixed(3)})`; ctx.lineWidth = 16;
      ctx.beginPath(); ctx.moveTo(x - 420, y - 140); ctx.lineTo(x - 10, y); ctx.stroke();
    }
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = 'rgba(180,200,255,0.12)';
    ctx.beginPath(); pts.forEach(p => ctx.lineTo(p[0], p[1])); ctx.closePath(); ctx.fill();
    ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createLinearGradient(pts[1][0], 0, pts[2][0], 0);   // 中の七色
    SPECTRUM.forEach((c, i) => g.addColorStop(i / 6, c));
    ctx.fillStyle = g; ctx.globalAlpha = 0.25 * glow;
    ctx.beginPath(); ctx.moveTo(x - 4, y); pts.slice(1).forEach(p => ctx.lineTo(p[0], p[1])); ctx.closePath(); ctx.fill();
    ctx.globalAlpha = 1;
    ctx.strokeStyle = `rgba(255,255,255,${(0.5 + 0.4 * glow).toFixed(3)})`; ctx.lineWidth = 1.5;
    ctx.beginPath(); pts.forEach(p => ctx.lineTo(p[0], p[1])); ctx.closePath(); ctx.stroke();
    ctx.drawImage(glowSprite(WHITE), x - 30 * glow - 10, y - 30 * glow - 6, 60 * glow + 20, 60 * glow + 20);
  }

  function flash(look) {
    ctx.fillStyle = `rgba(255,252,245,${(0.42 * flashT).toFixed(3)})`;
    ctx.fillRect(0, 0, W, H);
    if (gfx > 0) {                                                     // ふちが七色ににじむ
      ctx.globalCompositeOperation = 'lighter';
      const g = ctx.createLinearGradient(0, 0, W, 0);
      SPECTRUM.forEach((c, i) => g.addColorStop(i / 6, c));
      ctx.globalAlpha = 0.18 * flashT;
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, 10); ctx.fillRect(0, H - 10, W, 10);
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
    }
  }

  // ヒント（傾く向き・MIRROR など）: 細いセリフ体
  function hint(h, a, T) {
    ctx.save();
    ctx.globalAlpha = clamp01(a);
    ctx.font = 'italic 400 30px Georgia, "Times New Roman", "Hiragino Mincho ProN", serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    if ('letterSpacing' in ctx) ctx.letterSpacing = '6px';
    ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillText(h.text, W / 2 + 2, H * 0.3 + 2);
    ctx.fillStyle = '#fff6e0'; ctx.fillText(h.text, W / 2, H * 0.3);
    if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';
    ctx.restore();
  }

  // 額縁（画面のふち）。最後は太い金の額縁になる
  function frame(e) {
    const m = 10 + 8 * e, t = 2 + 22 * e;
    ctx.strokeStyle = rgba(GOLD, 0.22 + 0.6 * e); ctx.lineWidth = 1;
    ctx.strokeRect(m, m + 4, W - 2 * m, H - 2 * m - 4);
    if (e <= 0.01) return;
    const g = ctx.createLinearGradient(0, 0, W, H);
    g.addColorStop(0, rgba([140, 100, 40], e)); g.addColorStop(0.3, rgba([250, 220, 150], e)); g.addColorStop(0.5, rgba([170, 125, 55], e));
    g.addColorStop(0.75, rgba([245, 210, 140], e)); g.addColorStop(1, rgba([120, 85, 35], e));
    ctx.strokeStyle = g; ctx.lineWidth = t;
    ctx.strokeRect(t / 2, t / 2 + 4, W - t, H - t - 4);
    ctx.strokeStyle = rgba([60, 40, 10], 0.6 * e); ctx.lineWidth = 2;
    ctx.strokeRect(t + 1, t + 5, W - 2 * t - 2, H - 2 * t - 6);
  }

  // 場面の名前（セリフ体 ＋ 筆で引いたような下線）、額縁、最後の「絵の完成」
  function banner() {
    const T = songTime, bp = beatPos(T);
    if (inSong() && st.end > 0) {
      // 最後: まわりが暗くなり、光の絵がはっきり浮かぶ → 金の額縁 ＋ 作品のプレート
      const e = easeOut(st.end);
      ctx.fillStyle = `rgba(4,3,8,${(0.8 * e).toFixed(3)})`; ctx.fillRect(0, 0, W, H);
      ctx.save(); ctx.globalAlpha = 0.9 * e;
      ctx.drawImage(st.pc, M * PS, M * PS, W * PS, H * PS, 0, 0, W, H);
      ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.3 * e;
      ctx.drawImage(st.pc, M * PS, M * PS, W * PS, H * PS, 0, 0, W, H);
      ctx.restore();
      frame(e);
      const pa = clamp01((st.end - 0.5) / 0.5);
      if (pa > 0 && scene === 'play') {
        ctx.save(); ctx.globalAlpha = pa;
        const x = W / 2, y = H - 92;
        ctx.fillStyle = 'rgba(20,16,10,0.85)'; ctx.fillRect(x - 130, y - 26, 260, 52);
        ctx.strokeStyle = rgba(GOLD, 0.8); ctx.lineWidth = 1; ctx.strokeRect(x - 126, y - 22, 252, 44);
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#f2dfb0';
        ctx.font = 'italic 600 17px Georgia, "Times New Roman", serif';
        ctx.fillText('“Prism”', x, y - 8);
        ctx.font = '400 11px Georgia, "Times New Roman", serif';
        ctx.fillText('light on canvas · 2026 · by you', x, y + 11);
        ctx.restore();
      }
    } else frame(0);
    const bn = fx.banner;
    if (!bn) return;
    const e = bn.age, DUR = 3.2;
    if (e > DUR) { fx.banner = null; return; }
    const a = e < 0.5 ? e / 0.5 : e > DUR - 0.8 ? (DUR - e) / 0.8 : 1;
    ctx.save();
    ctx.globalAlpha = clamp01(a);
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = '400 40px Georgia, "Times New Roman", "Hiragino Mincho ProN", serif';
    if ('letterSpacing' in ctx) ctx.letterSpacing = `${10 + e * 2}px`;
    ctx.fillStyle = '#fbf6ec';
    if (gfx === 2) { ctx.shadowColor = rgba(bn.c, 0.9); ctx.shadowBlur = 18; }
    ctx.fillText(bn.name, W / 2, 112);
    ctx.shadowBlur = 0;
    if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';
    // 筆で引いた七色の下線（左から右へ伸びる）
    const u = easeOut(e / 0.9), x0 = W / 2 - 170, len = 340 * u;
    for (let i = 0; i < 7; i++) {
      ctx.fillStyle = rgba(SPEC[i], 0.75);
      ctx.fillRect(x0, 140 + i * 1.6, len * (1 - i * 0.03), 1.6);
    }
    ctx.font = 'italic 400 15px Georgia, "Times New Roman", "Hiragino Mincho ProN", serif';
    ctx.fillStyle = 'rgba(245,238,225,0.85)';
    ctx.fillText(bn.sub, W / 2, 166);
    ctx.restore();
  }

  // タイトル画面: ゆっくり回るプリズム。白い光が入って、七色に分かれて床へ
  function title(look, k, bp) {
    const T = titleClock(), x = W / 2 - 40, y = 110;
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 7; i++) {
      const a = Math.PI / 2 - 0.3 + (i - 3) * 0.075 + Math.sin(T * 0.5) * 0.05;
      const len = 700;
      const gr = ctx.createLinearGradient(x, y, x + Math.cos(a) * len, y + Math.sin(a) * len);
      gr.addColorStop(0, rgba(SPEC[i], 0.75)); gr.addColorStop(1, rgba(SPEC[i], 0.05));
      ctx.strokeStyle = gr; ctx.lineWidth = 5 + 2 * k;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(a) * len, y + Math.sin(a) * len); ctx.stroke();
    }
    drawPrism(x, y, T, 0.8 + 0.2 * k, true);
    ctx.globalCompositeOperation = 'source-over';
  }

  THEMES.prism = {
    noTrails: true, glow: 2.2, noScanlines: true,
    clearColors: SPECTRUM,
    reset, update, background, floor, platform, laser, fire, world, flash, hint, banner, title,
  };
})();
