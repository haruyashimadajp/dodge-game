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
     最後             … ブラウン管のテレビが消えるように、画面が横線 → 点になって消える → ウイルス駆除のログ
   ずっと続く演出:
     乗っ取られたマウス … だれかのカーソルが勝手に動いて、エラー画面をクリックして開いていく
     画面のふちの感染   … 感染率といっしょに、画面のふちからドットのノイズが広がる（ブルースクリーンで消える）
     ドクロ             … ドロップの頭に巨大なドット絵のドクロ。ドロップ中はウイルスの顔がドクロになる
     スタッター         … ループバグのあいだ、画面そのものが少し前の絵にもどる（動画が止まったように）
     とける画面         … ドロップ中、拍ごとに画面の一部がたてに流れ落ちる
     ゲームの外まで感染 … 上の Time / Best / Lives の文字化け、タブの名前、ゲーム画面ごとガタつく
   ========================================================================= */

(function () {
  const CX = W / 2, CY = 250;
  const MONO = 'ui-monospace, Menlo, Consolas, monospace';
  const WHITE = [255, 255, 255], GREEN = rgb('#39ff6a'), PINK = rgb('#ff2bd6'), CYAN = rgb('#4dfcff');
  const st = { rot: 0, lastBeat: -99, blocks: [], tear: null, codeY: 0, code: null,
    cur: { x: W / 2, y: H / 2, vis: 0, click: 0, idle: 9 }, drips: [], skullA: 0, snap: null, loopRef: null, loopI: 0, rep: 0,
    hud: null, hudT: 0, cssT: 0, titleT: 0, intro: null, cells: null };
  const SKULL = [
    '..#######..', '.#########.', '###########', '##...#...##', '##...#...##', '##...#...##',
    '###########', '#####.#####', '.####.####.', '..#######..', '..#.#.#.#..', '..#######..',
  ];
  const SPAM = ['Access violation', 'virus.exe stopped', 'Your PC is infected', 'FREE RAM >> CLICK', 'Memory leak',
    'You won a prize!', 'DO NOT TURN OFF', 'Stack overflow', 'null pointer', 'Segmentation fault', 'Disk is full', '404 not found'];
  const BIOS = ['MALWARE BIOS v4.04', 'Memory test: 655360K OK', 'Detecting drives ... C: D: ???', 'Loading kernel ......... OK',
    'Loading gravity.dll .... FAILED', 'Gravity set to -1.00 g', 'Starting virus.exe ...', 'Press any key to panic'];
  const ENDLOG = ['C:\\> scan /all', '1 threat found: malware.exe', 'C:\\> del malware.exe', 'deleted. system clean.'];
  const GLYPH = '#$%&@!?01░▒▓█▚▞';
  const scramble = t => t.replace(/[^ ]/g, c => (Math.random() < 0.6 ? GLYPH[(Math.random() * GLYPH.length) | 0] : c));
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

  function reset() {
    Object.assign(st, { lastBeat: -99, blocks: [], tear: null, drips: [], skullA: 0, loopRef: null, rep: 0, intro: null });
    Object.assign(st.cur, { x: W / 2, y: H / 2, vis: 0, click: 0, idle: 9 });
  }

  // ドット絵のドクロ（cell = 1マスの大きさ）
  function skull(x, y, cell, color, a) {
    ctx.fillStyle = rgba(color, a);
    const x0 = x - SKULL[0].length * cell / 2, y0 = y - SKULL.length * cell / 2;
    for (let r = 0; r < SKULL.length; r++) for (let c = 0; c < SKULL[r].length; c++) {
      if (SKULL[r][c] === '#') ctx.fillRect(x0 + c * cell, y0 + r * cell, cell - 1, cell - 1);
    }
  }

  // 画面のふちの感染ぐあい（0〜1）: だんだん広がり、ブルースクリーンで消えて、再起動からまた広がる
  function corruptLevel(T) {
    if (T < 64.5) return 0.55 * T / 64.5;
    if (T < 77.3) return 0.05;
    return Math.min(1, 0.1 + 0.9 * (T - 77.3) / 38);
  }
  function makeCells() {                               // ふちのマス（20px）。外側から 0, 1, 2 段目
    const cells = [], S = 20, nx = W / S, ny = Math.ceil(H / S);
    for (let d = 0; d < 3; d++) {
      for (let i = d; i < nx - d; i++) { cells.push({ x: i * S, y: d * S, d, r: Math.random() }); cells.push({ x: i * S, y: (ny - 1 - d) * S, d, r: Math.random() }); }
      for (let j = d + 1; j < ny - 1 - d; j++) { cells.push({ x: d * S, y: j * S, d, r: Math.random() }); cells.push({ x: (nx - 1 - d) * S, y: j * S, d, r: Math.random() }); }
    }
    return cells;
  }

  // はじまりのロゴ: 「MALWARE」の文字をドットに分けておく（集まってきて、はじけ飛ぶ）
  function makeIntro() {
    const c = document.createElement('canvas'), g = c.getContext('2d');
    c.width = 420; c.height = 90;
    g.font = `900 72px ${MONO}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#fff';
    g.fillText('MALWARE', 210, 46);
    const data = g.getImageData(0, 0, 420, 90).data, out = [];
    for (let y = 0; y < 90; y += 6) for (let x = 0; x < 420; x += 6) {
      if (data[(y * 420 + x) * 4 + 3] < 128) continue;
      const a = Math.random() * TAU, d = 300 + Math.random() * 500;
      out.push({ tx: W / 2 - 210 + x, ty: H * 0.4 - 45 + y, sx: W / 2 + Math.cos(a) * d, sy: H * 0.4 + Math.sin(a) * d, c: Math.random() < 0.15 ? PINK : GREEN, k: Math.random() });
    }
    return out;
  }

  // ゲームの外（ページ）の演出: 上の文字の文字化け・タブの名前・ゲーム画面ごとガタつく
  function hudLabels() {
    if (!st.hud) st.hud = [...document.querySelectorAll('.hud .stat .label')].map(el => ({ el, text: el.textContent }));
    return st.hud;
  }
  function corruptHud(all) {
    const L = hudLabels();
    (all ? L : [L[(Math.random() * L.length) | 0]]).forEach(h => { h.el.textContent = scramble(h.text); h.el.classList.add('mw-bad'); });
    st.hudT = 0.22;
  }
  function restoreHud() {
    for (const h of hudLabels()) { h.el.textContent = h.text; h.el.classList.remove('mw-bad'); }
  }
  function shakePage() {
    document.body.classList.remove('mw-glitch');
    void document.body.offsetWidth;                    // アニメーションを最初からもう一度
    document.body.classList.add('mw-glitch');
    st.cssT = 0.35;
  }
  const TAB = document.title;

  function onBeat(b) {
    if (TEARS[b]) {
      st.tear = { t: 0, text: TEARS[b], cuts: Array.from({ length: 9 }, () => [Math.random() * H, 10 + Math.random() * 60, (Math.random() - 0.5) * 140]) };
      window.flash(0.6); shake(18); punch(0.07); glitch(1);
      corruptHud(true); shakePage();
    }
    if (b === BSOD) { st.bsod = 0; shake(10); corruptHud(true); shakePage(); }
    if (b === OFF) { st.off = 0; shakePage(); }
    if (inside(b, DROPS)) {
      if (b % 4 === 0) st.skullA = 1;
      if (Math.random() < 0.45) corruptHud(false);
      if (b >= 272 && b % 4 === 0) shakePage();         // FORMAT C: 小節ごとにガタつく
      if (b % 2 === 0 && gfx === 2) for (let i = 0; i < 4; i++) {   // とける画面
        st.drips.push({ t: 0, x: Math.random() * (W - 40), w: 12 + Math.random() * 40, y: 60 + Math.random() * 380, h: 120 + Math.random() * 160, d: 30 + Math.random() * 70 });
      }
    }
    if (inside(b, DROPS) && gfx > 0) {                    // 拍ごとに、壊れたブロック
      for (let i = 0; i < (gfx === 2 ? 3 : 1) + (b % 4 === 0 ? 2 : 0); i++) {
        st.blocks.push({ t: 0, x: Math.random() * W, y: Math.random() * GROUND_Y, w: 30 + Math.random() * 160, h: 6 + Math.random() * 40, c: Math.random() < 0.5 ? PINK : GREEN, dx: (Math.random() - 0.5) * 60 });
      }
    }
  }

  function update(dt, T, look) {
    st.rot += dt * (0.25 + 0.15 * look.tier);
    st.codeY = (st.codeY + dt * (30 + 30 * look.tier)) % H;
    if (st.cssT > 0 && (st.cssT -= dt) <= 0) document.body.classList.remove('mw-glitch');
    if (scene !== 'play') {
      st.bsod = st.off = null;
      if (st.hudT > -1) { restoreHud(); st.hudT = -1; document.title = TAB; }
      if (scene === 'title') titleGlitch(dt);
      return;
    }
    if (st.hudT > 0 && (st.hudT -= dt) <= 0) restoreHud();
    if (Math.floor(T * 4) !== Math.floor((T - dt) * 4)) document.title = `■ virus.exe — ${(clamp01(T / SONG_END) * 100).toFixed(0)}% infected`;
    st.skullA = Math.max(0, st.skullA - dt * 1.5);
    for (const q of st.drips) q.t += dt;
    st.drips = st.drips.filter(q => q.t < 0.35);
    // ループバグが始まった瞬間の画面を取っておく（くり返すたびに、うっすら重ねる）
    const L = malware.loop;
    if (L && L !== st.loopRef && gfx > 0) {
      st.loopRef = L; st.loopI = 0;
      if (!st.snap) { st.snap = document.createElement('canvas'); }
      st.snap.width = cv.width; st.snap.height = cv.height;
      st.snap.getContext('2d').drawImage(cv, 0, 0);
      if (Math.random() < 0.5) corruptHud(true);
    }
    if (L && L === st.loopRef && L.i !== st.loopI) { st.loopI = L.i; st.rep = 0.09; }
    st.rep = Math.max(0, st.rep - dt);
    // 乗っ取られたマウス: これから開くエラー画面へ飛んでいき、開く瞬間にクリックする
    const cur = st.cur;
    let tgt = null;
    for (const b of bullets) {
      if (b.kind !== 'popup') continue;
      if (b.delay > 0) { if (!tgt || b.delay < tgt.delay) tgt = b; }
      else if (!b.clicked) { b.clicked = true; cur.click = 1; }
    }
    if (tgt) { cur.idle = 0; cur.vis = Math.min(1, cur.vis + dt * 6); cur.x += (tgt.x + 6 - cur.x) * Math.min(1, dt * 14); cur.y += (tgt.y + 4 - cur.y) * Math.min(1, dt * 14); }
    else { cur.idle += dt; if (cur.idle > 1.2) cur.vis = Math.max(0, cur.vis - dt * 2); }
    cur.click = Math.max(0, cur.click - dt * 4);
    const b = Math.floor(beatPos(T) + 0.02);
    if (b !== st.lastBeat) { if (b === st.lastBeat + 1) onBeat(b); st.lastBeat = b; }
    if (st.tear) { st.tear.t += dt; if (st.tear.t > 0.7) st.tear = null; }
    if (st.bsod != null) { st.bsod += dt; if (st.bsod > 1.6) st.bsod = null; }
    if (st.off != null) st.off += dt;
    for (const q of st.blocks) q.t += dt;
    st.blocks = st.blocks.filter(q => q.t < 0.14);
  }
  // タイトル画面: ときどきロゴが文字化けする
  function titleGlitch(dt) {
    st.titleT -= dt;
    const cur = ovTitle.textContent;
    if (st.titleT <= 0) {
      if (cur === 'DODGE') { setOverlayTitle(['D0DGE', 'DØD6E', 'MALWR', 'D▒DG3', 'ERROR'][(Math.random() * 5) | 0]); st.titleT = 0.12; st.titleBad = true; }
      else if (st.titleBad) { setOverlayTitle('DODGE'); st.titleT = 1.5 + Math.random() * 2.5; st.titleBad = false; }
      else st.titleT = 1;
    }
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
    vGradient(rgba(look.skyTop, 1), rgba(look.skyBot, 1));
    if (gfx > 0) {
      if (!st.code) st.code = makeCode();
      ctx.globalAlpha = 0.7 + 0.3 * k;
      ctx.drawImage(st.code, 0, st.codeY - H); ctx.drawImage(st.code, 0, st.codeY);
      ctx.globalAlpha = 1;
    }
    ctx.globalCompositeOperation = 'lighter';
    virusCore(CX, CY, 78 + 8 * k + 6 * bk, look, k, T);
    if (scene === 'play' && inside(beatPos(T), DROPS)) skull(CX, CY + 4, 9, look.color, 0.18 + 0.6 * st.skullA);   // ドロップ中: ウイルスの顔はドクロ
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
    const msg = b.title === 'STOP' ? 'Fatal exception' : b.title === 'FORMAT' ? 'Erasing disk...' : SPAM[Math.abs((b.x * 31 + b.y * 17) | 0) % SPAM.length];
    ctx.fillText(msg, x + 40, iy - 6);
    ctx.fillText('0x' + ((b.x * 7919 + b.y * 104729) % 0xffffff | 0).toString(16).toUpperCase().padStart(6, '0'), x + 40, iy + 8);
    if (h > 80) {
      ctx.fillStyle = '#c3c7cb'; ctx.fillRect(x + w / 2 - 26, y + h - 26, 52, 18);
      ctx.strokeStyle = '#000'; ctx.lineWidth = 1; ctx.strokeRect(x + w / 2 - 26 + 0.5, y + h - 26 + 0.5, 51, 17);
      ctx.fillStyle = '#000'; ctx.textAlign = 'center'; ctx.fillText('OK', x + w / 2, y + h - 17);
    }
  }

  // 乗っ取られたマウス（カメラの中に描く。エラー画面と同じ場所に重なるように）
  function world(T) {
    const c = st.cur;
    if (c.vis <= 0.01 || scene !== 'play') return;
    if (c.click > 0) {
      ctx.strokeStyle = `rgba(255,255,255,${(0.8 * c.click).toFixed(3)})`; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(c.x, c.y, 6 + 26 * (1 - c.click), 0, TAU); ctx.stroke();
    }
    ctx.save();
    ctx.translate(c.x, c.y); ctx.scale(1.5 - 0.2 * c.click, 1.5 - 0.2 * c.click);
    ctx.globalAlpha = c.vis;
    ctx.beginPath();
    ctx.moveTo(0, 0); ctx.lineTo(0, 17); ctx.lineTo(4, 13); ctx.lineTo(7.5, 20); ctx.lineTo(10, 19); ctx.lineTo(6.5, 12); ctx.lineTo(12, 12); ctx.closePath();
    ctx.fillStyle = '#fff'; ctx.fill();
    ctx.strokeStyle = '#000'; ctx.lineWidth = 1.2; ctx.stroke();
    ctx.font = `700 7px ${MONO}`; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
    ctx.fillStyle = rgba(PINK, 0.95); ctx.fillText('virus.exe', 12, 16);
    ctx.restore();
  }

  function flash(look) {
    ctx.fillStyle = rgba(mixC(look.color, WHITE, 0.4), 0.32 * flashT);
    ctx.fillRect(0, 0, W, H);
  }

  // 画面のいちばん上の演出（カメラの外）
  function overlay() {
    const T = songTime, bp = beatPos(T), R = renderScale;
    if (scene === 'play' && gfx > 0) {
      for (const q of st.drips) {                      // とける画面: たての帯が下へずれ落ちる
        const d = q.d * easeOut(q.t / 0.2);
        ctx.globalAlpha = 1 - q.t / 0.35;
        ctx.drawImage(cv, q.x * R, q.y * R, q.w * R, q.h * R, q.x, q.y + d, q.w, q.h);
        ctx.globalAlpha = 1;
      }
      if (st.rep > 0 && st.snap) {                     // スタッター: 少し前の画面がちらっと重なる
        const dx = (Math.random() - 0.5) * 16;
        ctx.globalAlpha = 0.35;
        ctx.drawImage(st.snap, dx, 0, W, H);
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = 0.18;
        ctx.drawImage(st.snap, dx + 7, 0, W, H);
        ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
        ctx.fillStyle = 'rgba(255,255,255,0.08)';
        ctx.fillRect(0, (Math.random() * H) | 0, W, 3 + Math.random() * 20);
      }
      // 画面のふちの感染（ちらつくドット）
      if (!st.cells) st.cells = makeCells();
      const lv = corruptLevel(T), f = Math.floor(T * 10);
      for (const c of st.cells) {
        if (gfx === 1 && c.d > 1) continue;
        if (c.r > lv * 1.25 - c.d * 0.33) continue;
        const h = (c.x * 7 + c.y * 13 + f * 31) % 17;
        ctx.fillStyle = h < 2 ? 'rgba(255,43,214,0.55)' : h < 9 ? 'rgba(0,0,0,0.6)' : `rgba(57,255,106,${(0.18 + 0.05 * (h % 4)).toFixed(2)})`;
        ctx.fillRect(c.x, c.y, 20, 20);
        if (h === 5) { ctx.fillStyle = 'rgba(57,255,106,0.7)'; ctx.fillRect(c.x + 4, c.y + 8, 12, 4); }
      }
    }
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
      ctx.globalCompositeOperation = 'lighter';           // 巨大なドクロ（赤と緑にずれて）
      const sj = (Math.random() - 0.5) * 10 * a;
      skull(W / 2 - 5 + sj, H * 0.42 - 150, 16, [255, 0, 120], 0.45 * a);
      skull(W / 2 + 5 - sj, H * 0.42 - 150, 16, GREEN, 0.45 * a);
      ctx.globalCompositeOperation = 'source-over';
      ctx.font = `700 16px ${MONO}`;
      ctx.fillStyle = `rgba(255,255,255,${(0.8 * a).toFixed(3)})`;
      ctx.fillText('YOU HAVE BEEN INFECTED', W / 2, H * 0.42 + 46);
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
    if (scene === 'play' && T < 2.4) {                 // はじまり: 「MALWARE」のロゴがドットで集まって、はじける
      if (!st.intro) st.intro = makeIntro();
      const kin = easeOut((T - 0.3) / 0.6), out = clamp01((T - 1.75) / 0.5);
      if (T > 0.3) {
        for (const p of st.intro) {
          let x = lerp(p.sx, p.tx, kin), y = lerp(p.sy, p.ty, kin);
          if (out > 0) { x += (p.tx - W / 2) * out * (1 + p.k) * 1.5; y += (p.ty - H * 0.4) * out * (2 + p.k) * 1.5 + 200 * out * out * p.k; }
          if (Math.random() < 0.04) x += (Math.random() - 0.5) * 30;
          ctx.fillStyle = rgba(p.c, (1 - out) * (0.5 + 0.5 * kin));
          ctx.fillRect(x, y, 5, 5);
        }
        ctx.font = `700 14px ${MONO}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillStyle = rgba(GREEN, (1 - out) * clamp01((T - 0.9) / 0.3));
        ctx.fillText('> payload ready. executing ...', W / 2, H * 0.4 + 70);
      }
    }
    if (bp >= 192 && bp < 208 && scene === 'play') {   // 再起動: BIOS の文字が打ちこまれていく
      ctx.font = `13px ${MONO}`; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
      let left = Math.floor((bp - 192) * 14);
      BIOS.forEach((l, i) => {
        if (left <= 0) return;
        const n = Math.min(l.length, left); left -= l.length + 4;
        ctx.fillStyle = l.includes('FAILED') || l.includes('-1.00') ? 'rgba(255,43,214,0.8)' : 'rgba(170,255,190,0.55)';
        ctx.fillText(l.slice(0, n), 16, 210 + i * 18);
      });
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
      if (t > 0.7) {                                   // 真っ暗な画面に、ウイルス駆除のログ
        ctx.font = `16px ${MONO}`; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
        let left = Math.floor((t - 0.7) * 45);
        ENDLOG.forEach((l, i) => {
          if (left <= 0) return;
          const n = Math.min(l.length, left); left -= l.length + 6;
          ctx.fillStyle = i === 3 ? '#39ff6a' : 'rgba(200,255,210,0.85)';
          ctx.fillText(l.slice(0, n) + (left <= 0 && Math.floor(t * 3) % 2 ? '█' : ''), 120, 300 + i * 26);
        });
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
    reset, update, background, floor, platform, ceiling, infect, bullet, worm, popup, world, flash, banner, title,
  };
  // 曲が変わったら、この見た目のセットの絵を手放す（次に使うときに作り直す。メモリがふくらんで重くならないように）
  THEMES.virus.release = () => { freeArt(st); };
})();
