"use strict";

/* =========================================================================
   見た目のセット「virus」  —  曲⑦「Malware」用
   黒と緑のターミナル画面。流れ落ちる16進数のコード、まん中で回るウイルスの粒子
   （トゲの長さが曲の音量で動く）、基板の床、ICチップの足場、昔のパソコンのエラー画面。
   ここぞという所の演出:
     ドロップの瞬間   … 画面が横にずれて裂け（データ破損）、「SYSTEM INFECTED」が色ずれして出る
     ため（ビルド）   … 「INSTALLING」の進みぐあいバーが 0% → 100%
     ドロップ中       … 拍ごとに画面のあちこちが壊れたブロックになる
     ブレイクの頭     … ブルースクリーン（すべての弾と感染が消える）
     最後             … ブラウン管のテレビが消えるように、画面が横線 → 点になって消える
   ========================================================================= */

(function () {
  const CX = W / 2, CY = 250;
  const MONO = 'ui-monospace, Menlo, Consolas, monospace';
  const WHITE = [255, 255, 255], GREEN = rgb('#39ff6a'), PINK = rgb('#ff2bd6'), CYAN = rgb('#4dfcff');
  const st = { rot: 0, lastBeat: -99, blocks: [], tear: null, codeY: 0, code: null };
  // 演出の予定（拍）
  const TEARS = { 96: 'SYSTEM INFECTED', 208: 'SYSTEM CRASH', 272: 'FORMAT C:' };
  const BUILDS = [[80, 96], [192, 208]];
  const DROPS = [[96, 160], [208, 288]];
  const BSOD = 160, OFF = 288;
  const inside = (b, list) => list.some(([a, z]) => b >= a && b < z);
  const LOG = [
    [0, '> dial 555-0404 ...'], [16, '> CONNECT 56000'], [32, '> payload.exe loaded'], [80, '> installing rootkit'],
    [96, '> !! OUTBREAK !!'], [160, '> *** STOP 0x0000007E'], [192, '> rebooting ... gravity.dll ??'], [208, '> SYSTEM CRASH'],
    [272, '> format c: /y'], [288, '> shutting down'],
  ];

  // 流れ落ちる16進数（1枚の絵を作っておいて、ずらして2回描くだけ = 軽い）
  function makeCode() {
    const c = document.createElement('canvas');
    c.width = W; c.height = H;
    const g = c.getContext('2d');
    g.font = `13px ${MONO}`; g.textBaseline = 'top';
    for (let x = 6; x < W; x += 26) {
      for (let y = 0; y < H; y += 16) {
        if (Math.random() < 0.35) continue;
        const v = Math.random();
        g.fillStyle = `rgba(57,255,106,${(0.05 + 0.18 * v * v).toFixed(3)})`;
        g.fillText(((Math.random() * 256) | 0).toString(16).toUpperCase().padStart(2, '0'), x, y);
      }
    }
    return c;
  }

  function reset() { Object.assign(st, { lastBeat: -99, blocks: [], tear: null }); }

  function onBeat(b) {
    if (TEARS[b]) {
      st.tear = { t: 0, text: TEARS[b], cuts: Array.from({ length: 9 }, () => [Math.random() * H, 10 + Math.random() * 60, (Math.random() - 0.5) * 140]) };
      window.flash(0.6); shake(18); punch(0.07); glitch(1);
    }
    if (b === BSOD) { st.bsod = 0; shake(10); }
    if (b === OFF) st.off = 0;
    if (inside(b, DROPS) && gfx > 0) {                    // 拍ごとに、壊れたブロック
      for (let i = 0; i < (gfx === 2 ? 3 : 1) + (b % 4 === 0 ? 2 : 0); i++) {
        st.blocks.push({ t: 0, x: Math.random() * W, y: Math.random() * GROUND_Y, w: 30 + Math.random() * 160, h: 6 + Math.random() * 40, c: Math.random() < 0.5 ? PINK : GREEN, dx: (Math.random() - 0.5) * 60 });
      }
    }
  }

  function update(dt, T, look) {
    st.rot += dt * (0.25 + 0.15 * look.tier);
    st.codeY = (st.codeY + dt * (30 + 30 * look.tier)) % H;
    if (scene !== 'play') { st.bsod = st.off = null; return; }
    const b = Math.floor(beatPos(T) + 0.02);
    if (b !== st.lastBeat) { if (b === st.lastBeat + 1) onBeat(b); st.lastBeat = b; }
    if (st.tear) { st.tear.t += dt; if (st.tear.t > 0.7) st.tear = null; }
    if (st.bsod != null) { st.bsod += dt; if (st.bsod > 1.6) st.bsod = null; }
    if (st.off != null) st.off += dt;
    for (const q of st.blocks) q.t += dt;
    st.blocks = st.blocks.filter(q => q.t < 0.14);
  }

  // ウイルスの粒子: 膜の輪 ＋ 曲の音量で伸び縮みするトゲ
  function virusCore(x, y, R, look, k, T, a = 1) {
    const n = gfx === 0 ? 12 : 20;
    ctx.lineCap = 'round';
    for (let i = 0; i < n; i++) {
      const ang = st.rot + i / n * TAU;
      const band = Math.min(7, Math.floor((i % (n / 2)) / (n / 2) * 8));
      const v = scene === 'play' ? songEnv(band, T) : 0.4 + 0.3 * Math.sin(T * 3 + i);
      const L = R * (0.25 + 0.55 * v) + 10 * k;
      const x1 = x + Math.cos(ang) * R, y1 = y + Math.sin(ang) * R, x2 = x + Math.cos(ang) * (R + L), y2 = y + Math.sin(ang) * (R + L);
      ctx.strokeStyle = rgba(look.color, (0.25 + 0.4 * v) * a); ctx.lineWidth = 4;
      ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
      ctx.fillStyle = rgba(mixC(look.color, WHITE, 0.4), (0.3 + 0.5 * v) * a);
      ctx.beginPath(); ctx.arc(x2, y2, 5 + 3 * v, 0, TAU); ctx.fill();
    }
    ctx.strokeStyle = rgba(look.color, 0.45 * a); ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(x, y, R, 0, TAU); ctx.stroke();
    ctx.strokeStyle = rgba(look.color, 0.2 * a); ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(x, y, R * 0.72, st.rot * 2, st.rot * 2 + TAU * 0.8); ctx.stroke();
    ctx.beginPath(); ctx.arc(x, y, R * 0.45, -st.rot * 3, -st.rot * 3 + TAU * 0.6); ctx.stroke();
    ctx.fillStyle = rgba(look.color, (0.08 + 0.12 * k) * a);
    ctx.beginPath(); ctx.arc(x, y, R, 0, TAU); ctx.fill();
  }

  function background(T, look, k, bk, bp) {
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, rgba(look.skyTop, 1));
    g.addColorStop(1, rgba(look.skyBot, 1));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    if (gfx > 0) {
      if (!st.code) st.code = makeCode();
      ctx.globalAlpha = 0.7 + 0.3 * k;
      ctx.drawImage(st.code, 0, st.codeY - H); ctx.drawImage(st.code, 0, st.codeY);
      ctx.globalAlpha = 1;
    }
    ctx.globalCompositeOperation = 'lighter';
    virusCore(CX, CY, 78 + 8 * k + 6 * bk, look, k, T);
    ctx.globalCompositeOperation = 'source-over';
    // 走査線のような横のしま（ゆっくり下へ）
    ctx.fillStyle = rgba(look.color, 0.04);
    const yy = (T * 120) % H;
    ctx.fillRect(0, yy, W, 3); ctx.fillRect(0, (yy + H / 2) % H, W, 2);
  }

  // 基板の床: 緑の配線と、流れる光の点
  function floor(look, k, bp) {
    const y = GROUND_Y;
    ctx.save();
    ctx.beginPath(); ctx.rect(-400, y, W + 800, H - y + 400); ctx.clip();
    ctx.fillStyle = '#001a0c';
    ctx.fillRect(-400, y, W + 800, H - y + 400);
    ctx.strokeStyle = rgba(look.color, 0.35); ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i < 12; i++) {
      const x = -60 + i * 80, yy = y + 14 + (i % 3) * 12;
      ctx.moveTo(x, yy); ctx.lineTo(x + 30, yy); ctx.lineTo(x + 42, yy + 12); ctx.lineTo(x + 80, yy + 12);
    }
    ctx.stroke();
    ctx.fillStyle = rgba(mixC(look.color, WHITE, 0.5), 0.6 + 0.4 * k);
    const f = bp - Math.floor(bp);
    for (let i = 0; i < 12; i++) ctx.fillRect(-60 + i * 80 + f * 80, y + 13 + (i % 3) * 12 + (f > 0.5 ? 12 : 0), 4, 4);
    ctx.restore();
  }

  // ICチップの足場
  function platform(p, look, k) {
    ctx.fillStyle = '#0a0f0c';
    ctx.fillRect(p.x, p.y, p.w, p.h);
    ctx.fillStyle = 'rgba(190,200,195,0.85)';
    for (let x = p.x + 6; x < p.x + p.w - 4; x += 12) { ctx.fillRect(x, p.y - 4, 5, 4); ctx.fillRect(x, p.y + p.h, 5, 4); }
    ctx.strokeStyle = rgba(look.color, 0.6 + 0.3 * k); ctx.lineWidth = 1.5;
    ctx.strokeRect(p.x + 0.5, p.y + 0.5, p.w - 1, p.h - 1);
    ctx.font = `700 9px ${MONO}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = rgba(look.color, 0.8);
    ctx.fillText('VX-404', p.x + p.w / 2, p.y + p.h / 2 + 1);
  }

  // 天井（重力バグのあいだ）: 基板をさかさまにした帯
  function ceiling(look, k, a) {
    const y = CEIL_Y * a - 200 * (1 - a);
    ctx.fillStyle = `rgba(0,26,12,${a.toFixed(3)})`;
    ctx.fillRect(-400, -400, W + 800, y + 400);
    ctx.strokeStyle = rgba(PINK, 0.9 * a); ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(-400, y); ctx.lineTo(W + 400, y); ctx.stroke();
    ctx.fillStyle = rgba(PINK, 0.7 * a);
    ctx.font = `700 11px ${MONO}`; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    for (let x = 10; x < W; x += 200) ctx.fillText('GRAVITY.DLL ▲', x, y - 14);
  }

  // 感染した床: 潜伏中 = ちらつく緑のノイズ、発症 = ギザギザのトゲ
  function infect(t, T, y, dir) {
    const w = t.x1 - t.x0;
    if (T < t.live) {
      const p = (T - t.on) / (t.live - t.on);
      for (let x = t.x0; x < t.x1 - 3; x += 5) {
        if (Math.random() > 0.35 + 0.5 * p) continue;
        ctx.fillStyle = Math.random() < 0.3 ? rgba(PINK, 0.8) : rgba(GREEN, 0.4 + 0.5 * p);
        ctx.fillRect(x, y + dir * (2 + Math.random() * 8 * p), 4, 3);
      }
      return;
    }
    const a = T > t.off ? 1 - (T - t.off) / 0.3 : 1, grow = clamp01((T - t.live) / 0.08);
    const jit = Math.floor(T * 20) % 3 === 0 ? 1 : 0;
    ctx.fillStyle = rgba(GREEN, 0.95 * a);
    for (let x = t.x0; x < t.x1 - 2; x += 10) {            // 階段状のトゲ（ドット絵）
      const hgt = (12 + ((x / 10 + jit) % 2) * 4) * grow;
      ctx.fillRect(x + 1, dir < 0 ? y - hgt * 0.4 : y, 8, hgt * 0.4);
      ctx.fillRect(x + 3, dir < 0 ? y - hgt * 0.75 : y + hgt * 0.4, 4, hgt * 0.35);
      ctx.fillRect(x + 4, dir < 0 ? y - hgt : y + hgt * 0.75, 2, hgt * 0.25);
    }
    ctx.fillStyle = rgba(PINK, 0.5 * a);
    ctx.fillRect(t.x0, dir < 0 ? y - 2 : y, w, 2);
  }

  function bullet(b, c, k) {
    const draw = (x, y, cc, a) => {
      if (b.style === 'spore') {                       // ウイルス: トゲのある丸
        ctx.strokeStyle = rgba(cc, a); ctx.lineWidth = 2.5;
        ctx.beginPath();
        for (let i = 0; i < 8; i++) {
          const t = i / 8 * TAU + b.age * 4;
          ctx.moveTo(x + Math.cos(t) * b.r, y + Math.sin(t) * b.r); ctx.lineTo(x + Math.cos(t) * b.r * 1.6, y + Math.sin(t) * b.r * 1.6);
        }
        ctx.stroke();
        ctx.fillStyle = rgba(cc, a); ctx.beginPath(); ctx.arc(x, y, b.r, 0, TAU); ctx.fill();
        ctx.fillStyle = `rgba(0,0,0,${0.6 * a})`; ctx.beginPath(); ctx.arc(x, y, b.r * 0.45, 0, TAU); ctx.fill();
        return;
      }
      const R = b.r;                                   // ふつうの弾: ドット絵の四角 ＋ 白い芯
      ctx.fillStyle = rgba(cc, a); ctx.fillRect(x - R, y - R, R * 2, R * 2);
      ctx.fillStyle = `rgba(255,255,255,${0.9 * a})`; ctx.fillRect(x - R * 0.5, y - R * 0.5, R, R);
    };
    if (b.loop) {                                      // ループバグ中: 赤と青に色ずれ
      ctx.globalCompositeOperation = 'lighter';
      draw(b.x - 4, b.y, [255, 0, 80], 0.8); draw(b.x + 4, b.y, [0, 220, 255], 0.8);
      ctx.globalCompositeOperation = 'source-over';
    }
    draw(b.x, b.y, c, 1);
  }

  // ワーム: ドット絵の節 ＋ 目とあごのある頭
  function worm(b, c, T, k) {
    const s = b.segs;
    for (let i = s.length - 1; i >= 1; i--) {
      const R = b.r * (0.8 - 0.25 * i / s.length);
      ctx.fillStyle = rgba(i % 2 ? c : mixC(c, [0, 0, 0], 0.35), 1);
      ctx.fillRect(s[i].x - R, s[i].y - R, R * 2, R * 2);
      ctx.fillStyle = rgba(WHITE, 0.25);
      ctx.fillRect(s[i].x - R, s[i].y - R, R * 2, 2);
    }
    const h = s[0], R = b.r;
    ctx.save(); ctx.translate(h.x, h.y); ctx.rotate(b.a);
    ctx.fillStyle = rgba(mixC(c, WHITE, 0.3), 1);
    ctx.fillRect(-R, -R, R * 2, R * 2);
    const bite = Math.abs(Math.sin(T * 14)) * 0.5;
    ctx.fillStyle = rgba(c, 1);
    ctx.fillRect(R - 2, -R - 2 - bite * 4, 8, 4); ctx.fillRect(R - 2, R - 2 + bite * 4, 8, 4);
    ctx.fillStyle = '#000';
    ctx.fillRect(R * 0.2, -R * 0.6, 4, 4); ctx.fillRect(R * 0.2, R * 0.6 - 4, 4, 4);
    ctx.fillStyle = '#ff2b2b';
    ctx.fillRect(R * 0.2 + 1, -R * 0.6 + 1, 2, 2); ctx.fillRect(R * 0.2 + 1, R * 0.6 - 3, 2, 2);
    ctx.restore();
  }

  // エラー画面（昔のパソコン風）: 灰色のふち ＋ 色つきのタイトルバー ＋ × ＋ 赤い ✖ のアイコン
  function popup(b, c, x, y, T, k) {
    const w = b.w, h = b.h;
    ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(x + 5, y + 5, w, h);
    ctx.fillStyle = '#c3c7cb'; ctx.fillRect(x, y, w, h);
    ctx.fillStyle = '#fff'; ctx.fillRect(x, y, w, 2); ctx.fillRect(x, y, 2, h);
    ctx.fillStyle = '#5a5e62'; ctx.fillRect(x, y + h - 2, w, 2); ctx.fillRect(x + w - 2, y, 2, h);
    const g = ctx.createLinearGradient(x, 0, x + w, 0);
    g.addColorStop(0, rgba(mixC(c, [0, 0, 0], 0.35), 1)); g.addColorStop(1, rgba(mixC(c, WHITE, 0.25), 1));
    ctx.fillStyle = g; ctx.fillRect(x + 3, y + 3, w - 6, 18);
    ctx.font = `700 12px ${MONO}`; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.fillStyle = '#fff'; ctx.fillText(b.title, x + 8, y + 12);
    ctx.fillStyle = '#c3c7cb'; ctx.fillRect(x + w - 19, y + 5, 14, 13);
    ctx.fillStyle = '#000'; ctx.font = `700 11px ${MONO}`; ctx.textAlign = 'center'; ctx.fillText('×', x + w - 12, y + 12);
    const iy = y + 21 + (h - 21) / 2 - (h > 80 ? 8 : 0);
    ctx.fillStyle = '#e0102a'; ctx.beginPath(); ctx.arc(x + 22, iy, 11, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(x + 17, iy - 5); ctx.lineTo(x + 27, iy + 5); ctx.moveTo(x + 27, iy - 5); ctx.lineTo(x + 17, iy + 5); ctx.stroke();
    ctx.fillStyle = '#000'; ctx.font = `11px ${MONO}`; ctx.textAlign = 'left';
    ctx.fillText(b.title === 'STOP' ? 'Fatal exception' : b.title === 'FORMAT' ? 'Erasing disk...' : 'Access violation', x + 40, iy - 6);
    ctx.fillText('0x' + ((b.x * 7919 + b.y * 104729) % 0xffffff | 0).toString(16).toUpperCase().padStart(6, '0'), x + 40, iy + 8);
    if (h > 80) {
      ctx.fillStyle = '#c3c7cb'; ctx.fillRect(x + w / 2 - 26, y + h - 26, 52, 18);
      ctx.strokeStyle = '#000'; ctx.lineWidth = 1; ctx.strokeRect(x + w / 2 - 26 + 0.5, y + h - 26 + 0.5, 51, 17);
      ctx.fillStyle = '#000'; ctx.textAlign = 'center'; ctx.fillText('OK', x + w / 2, y + h - 17);
    }
  }

  function flash(look) {
    ctx.fillStyle = rgba(mixC(look.color, WHITE, 0.4), 0.32 * flashT);
    ctx.fillRect(0, 0, W, H);
  }

  // 画面のいちばん上の演出（カメラの外）
  function overlay() {
    const T = songTime, bp = beatPos(T);
    for (const q of st.blocks) {                       // 壊れたブロック
      if (gfx === 2) {
        const R = renderScale;
        ctx.drawImage(cv, q.x * R, q.y * R, q.w * R, q.h * R, q.x + q.dx, q.y, q.w, q.h);
      }
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = rgba(q.c, 0.25);
      ctx.fillRect(q.x, q.y, q.w, q.h);
      ctx.globalCompositeOperation = 'source-over';
    }
    if (st.tear && gfx > 0) {                          // ドロップ: 画面が横に裂けてずれる ＋ 大きな文字
      const a = 1 - st.tear.t / 0.7, R = renderScale;
      if (st.tear.t < 0.3) for (const [y, h, dx] of st.tear.cuts) ctx.drawImage(cv, 0, y * R, W * R, h * R, dx * a, y, W, h);
      ctx.font = `900 64px ${MONO}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      const j = (Math.random() - 0.5) * 16 * a;
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = `rgba(255,0,120,${(0.7 * a).toFixed(3)})`; ctx.fillText(st.tear.text, W / 2 - 6 + j, H * 0.42);
      ctx.fillStyle = `rgba(0,255,140,${(0.7 * a).toFixed(3)})`; ctx.fillText(st.tear.text, W / 2 + 6 - j, H * 0.42);
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = `rgba(255,255,255,${(0.6 * a).toFixed(3)})`; ctx.fillText(st.tear.text, W / 2, H * 0.42);
    }
    for (const [b0, b1] of BUILDS) {                   // インストール中のバー
      if (bp < b0 || bp >= b1 || scene !== 'play') continue;
      const p = (bp - b0) / (b1 - b0), x = W / 2 - 160, y = 178;
      ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(x - 10, y - 26, 340, 50);
      ctx.strokeStyle = rgba(PINK, 0.9); ctx.lineWidth = 2; ctx.strokeRect(x, y, 320, 14);
      ctx.fillStyle = rgba(PINK, 0.9);
      for (let i = 0; i < Math.floor(p * 32); i++) ctx.fillRect(x + 3 + i * 10, y + 3, 7, 8);
      ctx.font = `700 13px ${MONO}`; ctx.textAlign = 'left'; ctx.textBaseline = 'bottom';
      ctx.fillStyle = '#fff'; ctx.fillText(`INSTALLING virus.exe ... ${Math.floor(p * 100)}%`, x, y - 6);
    }
    // 感染率（曲の進みぐあい）＋ ターミナルのログ
    if (scene === 'play') {
      ctx.font = `700 12px ${MONO}`; ctx.textBaseline = 'top'; ctx.textAlign = 'right';
      const pct = clamp01(T / SONG_END) * 100;
      ctx.fillStyle = Math.floor(T * 2) % 2 ? rgba(PINK, 0.95) : rgba(GREEN, 0.95);
      ctx.fillText(`■ INFECTED ${pct.toFixed(1)}%`, W - 14, 16);
      let line = LOG[0];
      for (const l of LOG) if (bp >= l[0]) line = l;
      const n = Math.min(line[1].length, Math.floor((bp - line[0]) * 10) + 1);
      ctx.textAlign = 'left';
      ctx.fillStyle = rgba(GREEN, 0.85);
      ctx.fillText(line[1].slice(0, n) + (Math.floor(T * 3) % 2 ? '█' : ''), 14, 16);
    }
    if (st.bsod != null) {                             // ブルースクリーン
      const t = st.bsod, a = t < 0.7 ? 1 : 1 - (t - 0.7) / 0.9;
      ctx.fillStyle = `rgba(0,0,170,${(0.92 * a).toFixed(3)})`;
      ctx.fillRect(0, 0, W, H);
      ctx.font = `700 18px ${MONO}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillStyle = `rgba(170,170,170,${a.toFixed(3)})`; ctx.fillRect(W / 2 - 70, 230, 140, 26);
      ctx.fillStyle = `rgba(0,0,170,${a.toFixed(3)})`; ctx.fillText(' MALWARE ', W / 2, 244);
      ctx.fillStyle = `rgba(255,255,255,${a.toFixed(3)})`;
      ctx.font = `16px ${MONO}`; ctx.textAlign = 'left';
      const L = ['A fatal exception 0E has occurred at 0028:C0DE404.', 'The current application will be terminated.', '',
        '*  All bullets have been deleted.', '*  Press any key to keep dodging.'];
      L.forEach((s, i) => ctx.fillText(s.slice(0, Math.floor(t * 120)), 90, 300 + i * 28));
    }
    if (st.off != null) {                              // ブラウン管が消える: 横線 → 点 → 真っ暗
      const t = st.off;
      const hh = Math.max(2, H * (1 - clamp01(t / 0.25))), ww = t < 0.25 ? W : Math.max(2, W * (1 - clamp01((t - 0.25) / 0.25)));
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, W, H / 2 - hh / 2); ctx.fillRect(0, H / 2 + hh / 2, W, H);
      ctx.fillRect(0, 0, W / 2 - ww / 2, H); ctx.fillRect(W / 2 + ww / 2, 0, W, H);
      if (t > 0.15) {
        ctx.fillStyle = `rgba(220,255,230,${clamp01(1 - (t - 0.5) / 0.6).toFixed(3)})`;
        ctx.fillRect(W / 2 - ww / 2, H / 2 - Math.min(hh, 4) / 2, ww, Math.min(hh, 4));
      }
    }
  }

  // 場面の名前: ターミナルに打ちこまれるように1文字ずつ ＋ 点滅するカーソル
  function banner() {
    overlay();
    const bn = fx.banner;
    if (!bn) return;
    const e = bn.age, DUR = 2.4;
    if (e > DUR) { fx.banner = null; return; }
    const a = e > DUR - 0.4 ? (DUR - e) / 0.4 : 1, y = 120;
    const n = Math.min(bn.name.length, Math.floor(e * 26));
    ctx.save();
    ctx.globalAlpha = clamp01(a);
    ctx.fillStyle = 'rgba(0,0,0,0.7)'; ctx.fillRect(0, y - 36, W, 72);
    ctx.fillStyle = rgba(bn.c, 0.9); ctx.fillRect(0, y - 36, W, 2); ctx.fillRect(0, y + 34, W, 2);
    ctx.font = `800 36px ${MONO}`; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    const text = '> ' + bn.name.slice(0, n), tw = ctx.measureText('> ' + bn.name).width, x0 = W / 2 - tw / 2;
    ctx.fillStyle = rgba(bn.c, 1); ctx.fillText(text, x0, y - 6);
    if (Math.floor(e * 4) % 2 === 0) ctx.fillRect(x0 + ctx.measureText(text).width + 4, y - 22, 18, 32);
    ctx.font = `700 14px ${MONO}`; ctx.textAlign = 'center';
    ctx.fillStyle = rgba(mixC(bn.c, WHITE, 0.5), clamp01((e - 0.4) / 0.3));
    ctx.fillText(bn.sub, W / 2, y + 22);
    ctx.restore();
  }

  function title(look, k, bp) {
    ctx.strokeStyle = rgba(look.color, 0.35 + 0.3 * k); ctx.lineWidth = 2; ctx.setLineDash([6, 8]);
    ctx.beginPath(); ctx.arc(CX, 270, 200 + 6 * k, bp * 0.1, bp * 0.1 + TAU); ctx.stroke();
    ctx.setLineDash([]);
    for (let i = 0; i < 6; i++) {
      const a = -bp * 0.15 + i / 6 * TAU, x = CX + Math.cos(a) * 200, y = 270 + Math.sin(a) * 200;
      ctx.fillStyle = rgba(i % 2 ? PINK : look.color, 0.9);
      ctx.fillRect(x - 6, y - 6, 12, 12);
    }
  }

  THEMES.virus = {
    noTrails: true, glow: 1.4,
    clearColors: ['#39ff6a', '#ff2bd6', '#4dfcff', '#ffffff', '#ffe14d'],
    reset, update, background, floor, platform, ceiling, infect, bullet, worm, popup, flash, banner, title,
  };
})();
