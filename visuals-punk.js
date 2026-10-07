"use strict";

/* =========================================================================
   見た目のセット「punk」  —  曲⑱「Circle Pit」用
   地下のライブハウス。自分はステージの上にいる。
     奥          … レンガの壁に、コピー機で刷ったライブのチラシ（網点・手書きの文字）とスプレーの落書き
     天井        … トラスに照明。光の柱が拍ごとにゆれる。最後のサビはストロボ
     ステージ    … 左右にアンプの山（スピーカーが刻みに合わせてふるえる）、まんなかの奥にドラムセット（シンバルがゆれる）
     床の下      … モッシュピット。観客の頭と肩のシルエット。サビでは拳を上げ、ブレイクダウンではヘッドバンギング
   演出:
     キック      … アンプのスピーカーがふくらむ、照明が明るくなる
     スネア      … 観客の頭がいっせいに下がる（ブレイクダウンでは壁ごと「うなずく」）
     シンバル    … コピー用紙の切れはしが舞う
     叫び        … 観客の中から HEY! / OI! の切り抜き文字が飛び出す
     カウント    … 1・2・3・4 の大きなスタンプ
     ピック・スライド … 画面をななめにひっかく線
     ステージ・ダイブ … 着地すると、観客がわく
     バナー      … 脅迫状みたいな切り抜き文字（1文字ずつ箱・字体・角度がちがう）が、たたきつけられる
   重くならないよう、壁・チラシ・アンプ・ドラムは前もって描いた絵を使う。
   ========================================================================= */

(function () {
  const WHITE = [244, 244, 244], RED = [255, 46, 58], YEL = [255, 210, 63], PINK = [255, 79, 163], BLACK = [10, 10, 10];
  const WALLPAPER = ['#b8b4a8', '#a89a5a', '#9c6478', '#9a9a9a', '#9a4848', '#7c92a0'];   // 壁のチラシは、くすんだ色（弾より目立たないように）
  const PAPER = ['#f2efe6', '#f7e14a', '#ff6fa8', '#e6e6e6', '#ff3b3b', '#bfe9ff'];
  const FONTS = ['900 {s}px Impact, "Arial Black", sans-serif', '700 {s}px Georgia, "Times New Roman", serif', '700 {s}px "Courier New", monospace',
                 'italic 900 {s}px "Arial Black", sans-serif', '800 {s}px "Trebuchet MS", sans-serif'];
  const font = (i, s) => FONTS[i % FONTS.length].replace('{s}', s);
  const hs = (a, b = 0) => { const v = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return v - Math.floor(v); };
  const inSong = () => scene !== 'title';
  const st = {
    made: false, wall: null, stage: null, grain: null, beams: null,
    kick: 0, snare: 0, bang: 0, crash: 0, china: 0, nod: 0, cheer: 0, fists: 0, strobe: 0, inv: 0, dark: 0,
    papers: [], pops: [], stamps: [], scratches: [], dust: [], crowd: [], cracks: [], amp: [0, 0], fbUntil: -1, mode: '',
    quake: 0, rage: 0, screams: [], siren: null, sirenU: 0,
  };
  // どれだけ激しくゆらすか（場面ごと）
  const intensity = () => ({ FEEDBACK: 0.7, STOP: 0.35, 'NO FUTURE': 0.7, BREAKDOWN: 1.35, MOSH: 1.45 })[st.mode] || (inSong() && songTime > hcBar(80) ? 1.3 : 1);

  // ---- 前もって描く絵 ---------------------------------------------------------------------------------
  function ransomBox(g, ch, x, y, s, seed, tilt) {                        // 切り抜き文字1つ（バナー・叫び・チラシで使う）
    const bg = PAPER[Math.floor(hs(seed, 1) * PAPER.length)], dark = hs(seed, 2) < 0.28;
    const fi = Math.floor(hs(seed, 3) * FONTS.length), w = s * (0.78 + 0.25 * hs(seed, 4)), h = s * (1.0 + 0.2 * hs(seed, 5));
    g.save(); g.translate(x, y); g.rotate(tilt);
    g.fillStyle = 'rgba(0,0,0,0.55)'; g.fillRect(-w / 2 + 3, -h / 2 + 4, w, h);
    g.fillStyle = dark ? '#111' : bg; g.fillRect(-w / 2, -h / 2, w, h);
    g.fillStyle = dark ? bg : (bg === '#ff3b3b' ? '#fff' : '#111');
    g.font = font(fi, Math.round(s * 0.82)); g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(ch, 0, s * 0.04);
    g.restore();
  }

  function make() {
    st.made = true;
    const mk = (w = W, h = H) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
    // 壁: レンガ → よごれ → チラシ → 落書き → 全体を暗く（弾が見やすいように）
    const wall = mk(W, H + 20), g = wall.getContext('2d');
    g.fillStyle = '#160d0c'; g.fillRect(0, 0, W, H + 20);
    for (let row = 0; row * 22 < H + 20; row++) {
      for (let col = -1; col * 54 < W + 54; col++) {
        const x = col * 54 + (row % 2) * 27, y = row * 22, v = hs(row, col);
        g.fillStyle = `rgb(${46 + v * 22 | 0},${26 + v * 12 | 0},${22 + v * 10 | 0})`;
        g.fillRect(x + 2, y + 2, 50, 18);
      }
    }
    for (let i = 0; i < 26; i++) {                                         // しみ
      const x = hs(i, 9) * W, y = hs(i, 10) * H, r = 40 + 120 * hs(i, 11);
      const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, 'rgba(0,0,0,0.5)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2);
    }
    const WORDS = [['NO', 'FUTURE'], ['ALL', 'AGES'], ['LIVE!', 'SAT 9PM'], ['DIY', 'OR DIE'], ['HXC', 'MATINEE'], ['LOUD', 'FAST'], ['OI!', 'OI!'], ['MOSH', 'PIT'], ['RIOT', 'NIGHT'], ['THRASH', '$5'], ['STAGE', 'DIVE'], ['XXX', 'SXE']];
    for (let i = 0; i < 22; i++) {                                         // コピー機のチラシ
      const fw = 90 + 60 * hs(i, 20), fh = fw * (1.25 + 0.2 * hs(i, 21));
      const x = 40 + hs(i, 22) * (W - 80), y = 60 + hs(i, 23) * (GROUND_Y - 160);
      g.save(); g.translate(x, y); g.rotate((hs(i, 24) - 0.5) * 0.35);
      g.fillStyle = WALLPAPER[i % WALLPAPER.length]; g.fillRect(-fw / 2, -fh / 2, fw, fh);
      g.fillStyle = '#111';                                                // 網点（写真のかわり）
      const cx = (hs(i, 25) - 0.5) * fw * 0.3, cy = -fh * 0.05;
      for (let yy = -fh * 0.25; yy < fh * 0.2; yy += 6) for (let xx = -fw * 0.42; xx < fw * 0.42; xx += 6) {
        const d = Math.hypot(xx - cx, (yy - cy) * 1.2) / (fw * 0.4), r = 2.6 * Math.max(0, 1 - d) * (0.6 + 0.4 * hs(xx, yy));
        if (r > 0.3) { g.beginPath(); g.arc(xx, yy, r, 0, TAU); g.fill(); }
      }
      const [w1, w2] = WORDS[i % WORDS.length];
      g.font = font(i, Math.round(fw * 0.24)); g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText(w1, 0, -fh * 0.36);
      g.font = font(i + 2, Math.round(fw * 0.16)); g.fillText(w2, 0, fh * 0.34);
      g.fillStyle = 'rgba(200,200,190,0.55)'; g.fillRect(-14, -fh / 2 - 6, 28, 12);    // テープ
      g.restore();
    }
    g.lineCap = 'round';                                                   // スプレーの落書き
    for (let i = 0; i < 10; i++) {
      g.strokeStyle = i % 3 ? 'rgba(255,40,50,0.55)' : 'rgba(240,240,240,0.45)'; g.lineWidth = 3 + 4 * hs(i, 30);
      g.beginPath(); let x = hs(i, 31) * W, y = 80 + hs(i, 32) * 400; g.moveTo(x, y);
      for (let j = 0; j < 6; j++) { x += (hs(i, j + 40) - 0.3) * 60; y += (hs(i, j + 50) - 0.5) * 50; g.lineTo(x, y); }
      g.stroke();
    }
    g.save(); g.translate(W * 0.5, 250); g.rotate(-0.08);
    g.font = 'italic 900 92px "Arial Black", Impact, sans-serif'; g.textAlign = 'center';
    g.lineWidth = 7; g.strokeStyle = 'rgba(255,46,58,0.6)'; g.strokeText('CIRCLE PIT', 0, 0);
    g.restore();
    g.fillStyle = 'rgba(8,4,4,0.72)'; g.fillRect(0, 0, W, H + 20);                    // 暗く
    st.wall = wall;

    // ステージ: アンプの山（左右）とドラムセット
    const sc = mk(), q = sc.getContext('2d');
    const stack = (x0, flip) => {
      const w = 96, x = flip ? W - w - x0 : x0;
      const box = (y, h, head) => {
        q.fillStyle = '#0d0d0d'; q.fillRect(x, y, w, h);
        q.strokeStyle = '#2b2b2b'; q.lineWidth = 3; q.strokeRect(x + 1.5, y + 1.5, w - 3, h - 3);
        if (head) {
          q.fillStyle = '#c9b27a'; q.fillRect(x + 6, y + 8, w - 12, h - 16);
          for (let i = 0; i < 6; i++) { q.fillStyle = '#222'; q.beginPath(); q.arc(x + 16 + i * 13, y + h / 2, 3.2, 0, TAU); q.fill(); }
          return;
        }
        q.fillStyle = '#1b1b1b'; q.fillRect(x + 6, y + 6, w - 12, h - 12);              // 網の布
        q.strokeStyle = 'rgba(255,255,255,0.05)'; q.lineWidth = 1;
        for (let i = -h; i < w; i += 4) { q.beginPath(); q.moveTo(x + 6 + i, y + 6); q.lineTo(x + 6 + i + h - 12, y + h - 6); q.stroke(); }
        q.fillStyle = '#ddd'; q.fillRect(x + w / 2 - 14, y + 9, 28, 7);
      };
      box(GROUND_Y - 206, 38, true); box(GROUND_Y - 168, 84, false); box(GROUND_Y - 84, 84, false);
    };
    stack(0, false); stack(0, true);
    // ドラム: 台、バスドラム、タム、スタンド（シンバルは動くので、あとで描く）
    q.fillStyle = '#121212'; q.fillRect(300, GROUND_Y - 30, 200, 30);
    q.fillStyle = '#1e1e1e'; q.fillRect(300, GROUND_Y - 30, 200, 4);
    q.strokeStyle = '#3a3a3a'; q.lineWidth = 3;
    for (const [x, top] of [[318, GROUND_Y - 175], [482, GROUND_Y - 190], [345, GROUND_Y - 120]]) { q.beginPath(); q.moveTo(x, GROUND_Y - 30); q.lineTo(x, top); q.stroke(); }
    q.fillStyle = '#0c0c0c'; q.beginPath(); q.arc(400, GROUND_Y - 78, 48, 0, TAU); q.fill();
    q.fillStyle = '#e8e2d2'; q.beginPath(); q.arc(400, GROUND_Y - 78, 40, 0, TAU); q.fill();
    ransomBox(q, 'C', 386, GROUND_Y - 80, 26, 3, -0.15); ransomBox(q, 'P', 414, GROUND_Y - 76, 26, 8, 0.12);
    for (const [x, y, r] of [[362, GROUND_Y - 136, 18], [438, GROUND_Y - 138, 18]]) {
      q.fillStyle = '#151515'; q.beginPath(); q.ellipse(x, y, r, r * 0.6, 0, 0, TAU); q.fill();
      q.fillStyle = '#4a4a4a'; q.beginPath(); q.ellipse(x, y - 3, r, r * 0.45, 0, 0, TAU); q.fill();
    }
    st.stage = sc;
    // コピー機のざらざら（小さな絵をしきつめる）
    const gn = mk(128, 128), gq = gn.getContext('2d'), id = gq.createImageData(128, 128);
    for (let i = 0; i < id.data.length; i += 4) { const v = Math.random() < 0.5 ? 0 : 255; id.data[i] = id.data[i + 1] = id.data[i + 2] = v; id.data[i + 3] = Math.random() < 0.12 ? 40 : 0; }
    gq.putImageData(id, 0, 0);
    st.grain = gn;
    // 観客（床の下のピット）
    st.crowd = [];
    for (let row = 0; row < 2; row++) for (let i = 0; i < 26; i++) {
      st.crowd.push({ x: (i + 0.5 + (row ? 0.5 : 0) + (hs(i, row + 60) - 0.5) * 0.6) * (W / 26), row, s: 0.85 + 0.35 * hs(i, row + 61), ph: hs(i, row + 62) * TAU, arm: hs(i, row + 63) });
    }
  }
  // 画面のふちが赤くなる絵（前もって描いておき、うすさを変えて貼る。毎コマ画面いっぱいのグラデーションを塗るより軽い）
  const redEdges = {};
  function redEdge(r0, r1) {
    const key = r0 + ',' + r1;
    if (redEdges[key]) return redEdges[key];
    const c = document.createElement('canvas'); c.width = W / 2; c.height = H / 2;
    const g = c.getContext('2d'), gr = g.createRadialGradient(W / 4, H / 4, H * r0 / 2, W / 4, H / 4, H * r1 / 2);
    gr.addColorStop(0, 'rgba(255,0,20,0)'); gr.addColorStop(1, 'rgba(255,0,20,1)');
    g.fillStyle = gr; g.fillRect(0, 0, W / 2, H / 2);
    return (redEdges[key] = c);
  }
  const beamPool = spritePool(24, 120, 400, (g, c) => {
    const gr = g.createLinearGradient(0, 0, 0, 400); gr.addColorStop(0, rgba(c, 0.55)); gr.addColorStop(1, rgba(c, 0));
    g.fillStyle = gr; g.beginPath(); g.moveTo(54, 0); g.lineTo(66, 0); g.lineTo(120, 400); g.lineTo(0, 400); g.closePath(); g.fill();
  });
  const beam = c => beamPool(c.map(v => Math.round(v / 24) * 24));     // 色はまるめる（場面の色が移り変わる間も、絵がふえすぎないように）

  function reset() {
    Object.assign(st, { kick: 0, snare: 0, bang: 0, crash: 0, china: 0, nod: 0, cheer: 0, fists: 0, strobe: 0, inv: 0, dark: 0, papers: [], pops: [], stamps: [], scratches: [], dust: [], cracks: [], amp: [0, 0], fbUntil: -1, mode: '', quake: 0, rage: 0, screams: [], siren: null, sirenU: 0 });
  }

  // ---- 譜面から呼ばれる演出 ----------------------------------------------------------------------------
  window.hcFx = function (type, a, b) {
    if (type === 'kick') { st.kick = Math.max(st.kick, 0.6 + 0.4 * a); shake(3.5 * intensity()); }
    else if (type === 'boom2') { st.quake = 1; shake(18 * intensity()); punch(0.05); }
    else if (type === 'scream') {
      st.quake = Math.max(st.quake, 0.8); st.rage = 1; shake(14 * intensity());
      st.screams.push({ word: a + '!', age: 0, seed: Math.random() * 99 });
    }
    else if (type === 'chug') st.amp[a] = 1;
    else if (type === 'crack') { if (st.cracks.length < 12) st.cracks.push({ x: a, age: 0, seed: Math.random() * 99 }); }
    else if (type === 'snare') { st.snare = 1; shake(6 * intensity()); if (st.mode === 'BREAKDOWN' || st.mode === 'MOSH') st.nod = Math.max(st.nod, 0.6); }
    else if (type === 'bang') { st.bang = 1; st.nod = 1; shake(5); }
    else if (type === 'crash' || type === 'china') {
      st[type] = 1; shake((type === 'crash' ? 9 : 7) * intensity());
      const n = [2, 4, 7][gfx] * (a || 1);
      for (let i = 0; i < n && st.papers.length < [20, 45, 80][gfx]; i++)
        st.papers.push({ x: Math.random() * W, y: -10 - Math.random() * 40, vx: (Math.random() - 0.5) * 80, vy: 60 + Math.random() * 90, rot: Math.random() * TAU, vr: (Math.random() - 0.5) * 8, w: 6 + Math.random() * 7, c: PAPER[Math.floor(Math.random() * PAPER.length)] });
    } else if (type === 'shout') {
      st.fists = 1; st.cheer = Math.max(st.cheer, 0.6);
      const x = 120 + Math.random() * (W - 240);
      if (st.pops.length < 8) st.pops.push({ word: a + '!', x, y: GROUND_Y + 30, age: 0, seed: Math.random() * 99 });
    } else if (type === 'count') {
      st.stamps.push({ text: String(a), age: 0, x: W / 2 + (a % 2 ? -1 : 1) * 30, rot: (a % 2 ? -1 : 1) * 0.12 });
      st.kick = 1;
    } else if (type === 'slide') {
      st.scratches.push({ t0: songTime, dur: a, y0: 80 + Math.random() * 200, dir: Math.random() < 0.5 ? -1 : 1 });
    } else if (type === 'feedback') st.fbUntil = a;
    else if (type === 'land') {
      st.cheer = 1;
      sparks(a, GROUND_Y - 4, { n: 14, color: '#ffd23f', speed: 260, life: 0.5, size: 3, gravity: 700, dir: -Math.PI / 2, spread: 2.2 });
      shockRing(a, GROUND_Y, { color: '#ff4fa3', size: 90, life: 0.4, width: 3 });
    } else if (type === 'hop') {
      if (st.dust.length < 30) st.dust.push({ x: a, y: b, age: 0 });
    } else if (type === 'start' || type === 'boom' || type === 'pit' || type === 'final') {
      st.cheer = 1; st.fists = 1; st.dark = 0;
      shockRing(W / 2, GROUND_Y - 200, { color: '#ffffff', size: 800, life: 0.8, width: 6 });
      if (type === 'final' || type === 'pit') st.inv = 0.09;
    } else if (type === 'siren') st.siren = { t0: songTime, dur: a };            // 盛り上がり前のサイレン（だんだん強く）
    else if (type === 'drop') {                                                   // 盛り上がり: サイレンが切れて、ドカン
      st.siren = null; st.sirenU = 0; st.inv = 0.12; st.quake = 1; st.cheer = 1; st.fists = 1; st.dark = 0;
      shake(26); punch(0.1);
      shockRing(W / 2, GROUND_Y - 250, { color: '#ff2e3a', size: 1000, life: 0.9, width: 10 });
      shockRing(W / 2, GROUND_Y - 250, { color: '#ffd23f', size: 700, life: 0.7, width: 6 });
    } else if (type === 'stop') st.dark = 1;
    else if (type === 'breakdown' || type === 'mosh') { st.dark = 0; st.inv = 0.1; st.cheer = 1; st.bang = 1; st.nod = 1; }
    else if (type === 'end') { st.inv = 0.1; st.cheer = 1; st.fists = 1; }
  };

  function update(dt, T) {
    if (!st.made) make();
    st.mode = inSong() ? ((SECTIONS[sectionIndex(T)] || {}).name || '') : 'CIRCLE PIT';
    if (st.siren && inSong()) {                                                   // サイレン: ゆれもだんだん強く
      st.sirenU = clamp01((songTime - st.siren.t0) / st.siren.dur);
      shake((2 + 12 * st.sirenU * st.sirenU) * intensity());
      if (st.sirenU >= 1) st.siren = null;
    } else st.sirenU = Math.max(0, st.sirenU - dt * 4);
    const dec = (k, r) => { st[k] = Math.max(0, st[k] - dt * r); };
    st.amp[0] = Math.max(0, st.amp[0] - dt * 8); st.amp[1] = Math.max(0, st.amp[1] - dt * 8);
    for (const c of st.cracks) c.age += dt;
    st.cracks = st.cracks.filter(c => c.age < 1.2);
    dec('quake', 2.2); dec('rage', 1.6);
    for (const q of st.screams) q.age += dt;
    st.screams = st.screams.filter(q => q.age < 0.9);
    dec('kick', 6); dec('snare', 7); dec('bang', 4); dec('crash', 2); dec('china', 3); dec('nod', 5); dec('cheer', 0.8); dec('fists', 0.7); dec('inv', 1);
    st.strobe = st.mode === 'CIRCLE PIT' && T > hcBar(80) - 0.1 && T < hcBar(88) ? 1 : 0;
    for (const p of st.papers) { p.x += p.vx * dt + Math.sin(p.rot) * 20 * dt; p.y += p.vy * dt; p.rot += p.vr * dt; }
    st.papers = st.papers.filter(p => p.y < GROUND_Y + 10);
    for (const p of st.pops) { p.age += dt; p.y -= dt * (160 - p.age * 120); }
    st.pops = st.pops.filter(p => p.age < 1.1);
    for (const s of st.stamps) s.age += dt;
    st.stamps = st.stamps.filter(s => s.age < 0.7);
    st.scratches = st.scratches.filter(s => songTime < s.t0 + s.dur + 0.4);
    for (const d of st.dust) d.age += dt;
    st.dust = st.dust.filter(d => d.age < 0.4);
  }

  // ---- 背景 ------------------------------------------------------------------------------------------------
  function background(T, look, k, bk, bp) {
    if (!st.made) make();
    ctx.fillStyle = '#050303'; ctx.fillRect(0, 0, W, H);
    const lit = 1 - 0.75 * st.dark;
    // 壁（ブレイクダウンでは、スネアに合わせて壁ごと「うなずく」）
    const nodY = -10 + 10 * st.nod;
    ctx.globalAlpha = lit * (0.75 + 0.25 * st.kick);
    ctx.drawImage(st.wall, 0, nodY);
    ctx.globalAlpha = 1;
    // 照明のトラスと光の柱
    ctx.fillStyle = '#1a1a1a'; ctx.fillRect(0, 26, W, 8);
    ctx.strokeStyle = '#2a2a2a'; ctx.lineWidth = 2;
    ctx.beginPath(); for (let x = 0; x < W; x += 20) { ctx.moveTo(x, 26); ctx.lineTo(x + 10, 34); ctx.lineTo(x + 20, 26); } ctx.stroke();
    if (st.dark < 0.95) {
      ctx.globalCompositeOperation = 'lighter';
      const strobeOn = st.strobe && Math.floor(T * 16) % 2 === 0;
      const swing = st.mode === 'BREAKDOWN' || st.mode === 'MOSH' ? 0.15 : 0.35;
      for (let i = 0; i < 6; i++) {
        const x = 70 + i * 132, c = i % 2 ? mixC(look.color, WHITE, 0.5) : look.color;
        const ang = Math.sin(bp * Math.PI / 2 + i * 1.3) * swing + (i < 3 ? 0.18 : -0.18);
        const a = lit * (0.12 + 0.3 * st.kick + 0.1 * st.cheer + (strobeOn ? 0.4 : 0)) * (st.strobe && !strobeOn ? 0.3 : 1);
        if (a < 0.02) continue;
        ctx.save(); ctx.translate(x, 36); ctx.rotate(ang); ctx.globalAlpha = clamp01(a);
        ctx.drawImage(beam(c), -90, 0, 180, GROUND_Y);
        ctx.restore();
      }
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
      for (let i = 0; i < 6; i++) {                                        // 照明の本体
        const x = 70 + i * 132;
        ctx.fillStyle = '#0c0c0c'; ctx.fillRect(x - 11, 30, 22, 16);
        ctx.fillStyle = rgba(i % 2 ? WHITE : look.color, 0.5 + 0.5 * st.kick); ctx.fillRect(x - 8, 44, 16, 3);
      }
    }
    // フィードバック: 画面を横切って、ふるえる線
    if (inSong() && T < st.fbUntil) {
      const u = clamp01(T / st.fbUntil), amp = 6 + 50 * u * u;
      ctx.strokeStyle = rgba(RED, 0.25 + 0.5 * u); ctx.lineWidth = 2;
      for (let j = 0; j < 2; j++) {
        ctx.beginPath();
        for (let x = 0; x <= W; x += 10) { const y = 330 + j * 40 + Math.sin(x * 0.03 * (1 + j) + T * 30) * amp * Math.sin(x / W * Math.PI); if (x) ctx.lineTo(x, y); else ctx.moveTo(x, y); }
        ctx.stroke();
      }
    }
    // ピック・スライド: ななめにひっかく白い線
    for (const s of st.scratches) {
      const u = clamp01((songTime - s.t0) / s.dur), out = clamp01(1 - (songTime - s.t0 - s.dur) / 0.4);
      ctx.strokeStyle = `rgba(255,255,255,${(0.5 * out).toFixed(3)})`; ctx.lineWidth = 2;
      for (let j = 0; j < 4; j++) {
        const x0 = s.dir > 0 ? 0 : W, x1 = x0 + s.dir * W * u;
        ctx.beginPath(); ctx.moveTo(x0, s.y0 + j * 7); ctx.lineTo(x1, s.y0 + j * 7 + W * u * 0.35); ctx.stroke();
      }
    }
    // カウントのスタンプ
    for (const s of st.stamps) {
      const e = s.age, sc = 1.6 - 0.6 * easeOut(clamp01(e / 0.12)), a = clamp01(1 - (e - 0.3) / 0.4);
      ctx.save(); ctx.translate(s.x, 300); ctx.rotate(s.rot); ctx.scale(sc, sc);
      ctx.font = '900 150px Impact, "Arial Black", sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillStyle = `rgba(255,46,58,${(0.75 * a).toFixed(3)})`; ctx.fillText(s.text, 0, 0);
      ctx.restore();
    }
    // ステージ（アンプ・ドラム）
    ctx.globalAlpha = 0.55 + 0.45 * lit;
    ctx.drawImage(st.stage, 0, 0);
    ctx.globalAlpha = 1;
    // アンプのスピーカー（キックでふくらむ）
    const pump = st.kick * 3 + st.china * 2;
    for (const x0 of [8, W - 88]) for (const y0 of [GROUND_Y - 168, GROUND_Y - 84]) for (const [dx, dy] of [[20, 21], [60, 21], [20, 63], [60, 63]]) {
      const x = x0 + dx, y = y0 + dy, r = 15 + pump;
      ctx.fillStyle = '#060606'; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
      ctx.strokeStyle = rgba(look.color, 0.18 + 0.5 * st.kick); ctx.lineWidth = 1.5; ctx.stroke();
      ctx.fillStyle = '#2a2a2a'; ctx.beginPath(); ctx.arc(x, y, 5 + pump * 0.5, 0, TAU); ctx.fill();
    }
    // 刻みのたびに、そのアンプの上のスピーカーが光る（鋲が出てくる所）
    ctx.globalCompositeOperation = 'lighter';
    for (const i of [0, 1]) {
      if (st.amp[i] < 0.03) continue;
      const G = 40 + 30 * st.amp[i];
      ctx.globalAlpha = st.amp[i] * 0.8; ctx.drawImage(glowSprite(WHITE), (i ? W - 48 : 48) - G, GROUND_Y - 168 - G, G * 2, G * 2);
    }
    // スモーク（床の近くをただよう）
    if (gfx > 0) {
      for (let i = 0; i < 5; i++) {
        const x = ((i * 190 + T * (14 + i * 5)) % (W + 300)) - 150, y = GROUND_Y - 60 - 30 * Math.sin(T * 0.4 + i), G = 150 + 30 * i % 60;
        ctx.globalAlpha = lit * (0.07 + 0.06 * st.kick); ctx.drawImage(glowSprite(mixC(look.color, WHITE, 0.6)), x - G, y - G * 0.5, G * 2, G);
      }
    }
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    // シンバル（ゆれる）
    for (const [x, y, w, key] of [[318, GROUND_Y - 175, 38, 'crash'], [482, GROUND_Y - 190, 34, 'china'], [345, GROUND_Y - 120, 22, 'snare']]) {
      const wob = Math.sin(T * 30) * 0.25 * st[key];
      ctx.save(); ctx.translate(x, y); ctx.rotate(wob);
      ctx.fillStyle = rgba(mixC([200, 170, 90], WHITE, 0.4 * st[key]), 0.9);
      ctx.beginPath(); ctx.ellipse(0, 0, w, 4 + 2 * st[key], 0, 0, TAU); ctx.fill();
      ctx.restore();
    }
    // 舞う紙きれ
    for (const p of st.papers) {
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.scale(1, Math.abs(Math.cos(p.rot * 1.3)) + 0.15);
      ctx.fillStyle = p.c; ctx.globalAlpha = 0.4; ctx.fillRect(-p.w / 2, -p.w * 0.65, p.w, p.w * 1.3);
      ctx.restore();
    }
    ctx.globalAlpha = 1;
    // ボーカルの叫び: 巨大な切り抜き文字がたたきつけられる（弾のうしろ）
    for (const q of st.screams) {
      const e = q.age, land = easeOut(clamp01(e / 0.1)), a = clamp01(1 - (e - 0.45) / 0.45), n = q.word.length;
      ctx.save(); ctx.globalAlpha = 0.35 * a; ctx.translate(W / 2 + Math.sin(e * 70) * 6 * (1 - land), 330); ctx.scale(2.6 - 1.2 * land, 2.6 - 1.2 * land);
      [...q.word].forEach((ch, i) => ransomBox(ctx, ch, (i - (n - 1) / 2) * 52, (hs(q.seed, i) - 0.5) * 12, 60, q.seed + i * 3, (hs(q.seed, i + 9) - 0.5) * 0.5));
      ctx.restore();
    }
    if (st.rage > 0.01) {                                                 // 叫びと重低音で、画面のふちが赤く脈打つ
      ctx.globalAlpha = clamp01(0.35 * st.rage); ctx.drawImage(redEdge(0.3, 0.75), 0, 0, W, H); ctx.globalAlpha = 1;
    }
    // サイレン: 上の両すみから回転灯の光がまわり、画面が赤く脈打ち、上下のふちに工事中のしま（だんだん強く）
    if (st.sirenU > 0.01) {
      const u = st.sirenU, ph = (songTime - (st.siren ? st.siren.t0 : 0));
      ctx.globalCompositeOperation = 'lighter';
      for (const [x, dir] of [[30, 1], [W - 30, -1]]) {
        const ang = dir * ph * (3 + 10 * u * u) + Math.PI / 2;
        ctx.save(); ctx.translate(x, 30); ctx.rotate(ang - Math.PI / 2); ctx.globalAlpha = clamp01(0.15 + 0.7 * u);
        ctx.drawImage(beam(dir > 0 ? RED : [255, 140, 20]), -110, 0, 220, 900);
        ctx.restore();
        ctx.fillStyle = rgba(dir > 0 ? RED : [255, 140, 20], 0.6 + 0.4 * u); ctx.beginPath(); ctx.arc(x, 30, 10 + 4 * u, 0, TAU); ctx.fill();
      }
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
      const wob = 0.5 + 0.5 * Math.sin(ph * (8 + 28 * u * u));
      ctx.globalAlpha = clamp01((0.1 + 0.4 * u * u) * wob); ctx.drawImage(redEdge(0.2, 0.8), 0, 0, W, H); ctx.globalAlpha = 1;
      ctx.save(); ctx.globalAlpha = clamp01(u * 1.3);
      for (const y of [8, H - 22]) {
        ctx.fillStyle = '#111'; ctx.fillRect(0, y, W, 14); ctx.fillStyle = '#ffd23f';
        ctx.beginPath();
        for (let x = ((ph * 200) % 28) - 28; x < W; x += 28) { ctx.moveTo(x, y + 14); ctx.lineTo(x + 14, y); ctx.lineTo(x + 24, y); ctx.lineTo(x + 10, y + 14); ctx.closePath(); }
        ctx.fill();
      }
      ctx.restore();
    }
    // 止まった所: 暗く
    if (st.dark > 0.01) { ctx.fillStyle = `rgba(0,0,0,${(0.5 * st.dark).toFixed(3)})`; ctx.fillRect(0, 0, W, H); }
  }

  // ---- 床: ステージのふちと、その下のモッシュピット -------------------------------------------------------
  function floor(look, k, bp) {
    const T = inSong() ? songTime : titleClock();
    ctx.fillStyle = '#0b0909'; ctx.fillRect(-400, GROUND_Y, W + 800, H - GROUND_Y + 40);
    const glow = ctx.createLinearGradient(0, H, 0, GROUND_Y);
    glow.addColorStop(0, rgba(look.color, 0.38 + 0.3 * st.kick + 0.2 * st.cheer)); glow.addColorStop(1, rgba(look.color, 0));
    ctx.fillStyle = glow; ctx.fillRect(0, GROUND_Y, W, H - GROUND_Y);
    // 観客
    const mode = st.mode, banging = mode === 'BREAKDOWN' || mode === 'MOSH', pit = mode === 'CIRCLE PIT' || mode === 'STAGE DIVE';
    ctx.fillStyle = '#030303';
    ctx.beginPath();
    const arms = [];
    for (const c of st.crowd) {
      let x = c.x, jump = 0, head = 0;
      if (pit) { x = (c.x + T * (c.row ? 70 : -55) + W * 2) % (W + 40) - 20; jump = Math.abs(Math.sin(bp * Math.PI + c.ph)) * 8; }
      else jump = st.kick * 3 * (0.5 + c.arm) + st.cheer * Math.abs(Math.sin(T * 9 + c.ph)) * 6;
      if (banging) head = st.nod * 9 * c.s; else head = st.snare * 3;
      const y = GROUND_Y + 34 + c.row * 12 - jump, s = c.s * (c.row ? 1.1 : 0.9);
      ctx.moveTo(x - 17 * s, H + 10); ctx.quadraticCurveTo(x - 16 * s, y + 4, x, y + 2); ctx.quadraticCurveTo(x + 16 * s, y + 4, x + 17 * s, H + 10);
      ctx.moveTo(x + 8 * s, y - 8 * s + head); ctx.arc(x, y - 8 * s + head, 8 * s, 0, TAU);
      if (st.fists > 0.2 && c.arm < st.fists * 0.6) arms.push([x + (c.arm > 0.3 ? 9 : -9) * s, y, s, c.arm]);
    }
    ctx.fill();
    ctx.strokeStyle = '#030303'; ctx.lineCap = 'round';
    for (const [x, y, s, arm] of arms) {                                  // 拳を上げる
      const up = 26 * s + 8 * Math.sin(T * 12 + arm * 9);
      ctx.lineWidth = 5 * s; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + (arm - 0.3) * 14, y - up); ctx.stroke();
      ctx.fillStyle = '#030303'; ctx.beginPath(); ctx.arc(x + (arm - 0.3) * 14, y - up - 2, 4.5 * s, 0, TAU); ctx.fill();
    }
    // 頭のふちの光（照明の色）
    ctx.strokeStyle = rgba(look.color, 0.25 + 0.3 * st.kick); ctx.lineWidth = 1;
    ctx.beginPath(); for (let x = 0; x <= W; x += 30) { ctx.moveTo(x, GROUND_Y + 1); ctx.lineTo(x + 15, GROUND_Y + 1); } ctx.stroke();
    // 叫びの文字（観客の中から飛び出す）
    for (const p of st.pops) {
      const a = clamp01(1 - (p.age - 0.6) / 0.5), sc = 0.6 + 0.4 * easeOut(clamp01(p.age / 0.15));
      ctx.save(); ctx.globalAlpha = a * 0.85; ctx.translate(p.x, p.y); ctx.scale(sc, sc);
      [...p.word].forEach((ch, i) => ransomBox(ctx, ch, (i - (p.word.length - 1) / 2) * 24, 0, 26, p.seed + i, (hs(p.seed, i) - 0.5) * 0.5));
      ctx.restore();
    }
    // クラウド・サーフ（ダイブのサビ・最後のサビ）: 観客の手の上を、人が運ばれていく
    if (mode === 'STAGE DIVE' || (mode === 'CIRCLE PIT' && T > hcBar(80))) {
      for (let i = 0; i < 2; i++) {
        const x = ((T * (60 + 25 * i) + i * 420) % (W + 120)) - 60, y = GROUND_Y + 18 + Math.sin(T * 7 + i) * 3;
        ctx.fillStyle = '#030303'; ctx.strokeStyle = '#030303'; ctx.lineWidth = 4; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.ellipse(x, y, 16, 5, 0, 0, TAU); ctx.fill();
        ctx.beginPath(); ctx.arc(x + 19, y - 2, 5.5, 0, TAU); ctx.fill();
        ctx.beginPath(); ctx.moveTo(x + 10, y - 3); ctx.lineTo(x + 18, y - 16 + Math.sin(T * 9 + i) * 3); ctx.moveTo(x - 14, y); ctx.lineTo(x - 26, y - 6); ctx.stroke();
        for (const hx of [-12, 0, 12]) { ctx.beginPath(); ctx.moveTo(x + hx, y + 4); ctx.lineTo(x + hx + 2, y + 18); ctx.stroke(); }
      }
    }
    // 音の柱が落ちた所のひび
    ctx.lineCap = 'butt';
    for (const c of st.cracks) {
      ctx.strokeStyle = `rgba(255,255,255,${(0.7 * (1 - c.age / 1.2)).toFixed(3)})`; ctx.lineWidth = 2;
      ctx.beginPath();
      for (let j = 0; j < 5; j++) {
        let x = c.x, y = GROUND_Y; ctx.moveTo(x, y);
        for (let k = 0; k < 3; k++) { x += (hs(c.seed, j * 3 + k) - 0.5) * 50; y -= 4 + hs(c.seed + 1, j * 3 + k) * 10; ctx.lineTo(x, y); }
      }
      ctx.stroke();
    }
    // ステージのふち（黒いへりと、ガムテープの印）
    ctx.fillStyle = '#1c1717'; ctx.fillRect(-400, GROUND_Y, W + 800, 6);
    ctx.fillStyle = rgba(mixC(look.color, WHITE, 0.4), 0.55 + 0.35 * st.kick); ctx.fillRect(-400, GROUND_Y, W + 800, 1.5);
    ctx.fillStyle = 'rgba(230,230,220,0.5)';
    for (const x of [150, 400, 650]) { ctx.save(); ctx.translate(x, GROUND_Y - 2); ctx.rotate(0.6); ctx.fillRect(-9, -2, 18, 4); ctx.rotate(-1.2); ctx.fillRect(-9, -2, 18, 4); ctx.restore(); }
    for (const d of st.dust) {
      ctx.strokeStyle = `rgba(255,210,63,${(0.6 * (1 - d.age / 0.4)).toFixed(3)})`; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.ellipse(d.x, d.y, 10 + d.age * 90, 3 + d.age * 6, 0, 0, TAU); ctx.stroke();
    }
  }

  // 足場 = 機材ケース（金属の角つき）
  function platform(p, look, k) {
    if (p.ground) return;
    ctx.fillStyle = '#151515'; ctx.fillRect(p.x, p.y, p.w, p.h + 10);
    ctx.fillStyle = '#2a2a2a'; ctx.fillRect(p.x, p.y, p.w, 3);
    ctx.fillStyle = '#9a9a9a';
    for (const x of [p.x, p.x + p.w - 8]) { ctx.fillRect(x, p.y, 8, 8); ctx.fillRect(x, p.y + p.h + 2, 8, 8); }
    ctx.fillStyle = rgba(look.color, 0.6 + 0.3 * st.kick); ctx.fillRect(p.x + 8, p.y, p.w - 16, 1.5);
    ctx.fillStyle = 'rgba(240,240,230,0.7)'; ctx.font = '700 9px "Courier New", monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('FRAGILE', p.x + p.w / 2, p.y + p.h / 2 + 4);
  }

  // ---- 弾 --------------------------------------------------------------------------------------------------
  function stud(x, y, r, c) {                                             // 鋲: 黒いふち ＋ 四角すいの金属（4つの面で明るさがちがう）
    ctx.fillStyle = '#050505'; ctx.beginPath(); ctx.arc(x, y, r + 2, 0, TAU); ctx.fill();
    ctx.fillStyle = rgba(c, 1); ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
    const s = r * 0.72;
    ctx.fillStyle = rgba(mixC(c, WHITE, 0.75), 1); ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - s, y - s); ctx.lineTo(x + s, y - s); ctx.closePath(); ctx.fill();
    ctx.fillStyle = rgba(mixC(c, WHITE, 0.35), 1); ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - s, y - s); ctx.lineTo(x - s, y + s); ctx.closePath(); ctx.fill();
    ctx.fillStyle = rgba(mixC(c, BLACK, 0.45), 1); ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + s, y + s); ctx.lineTo(x - s, y + s); ctx.closePath(); ctx.fill();
    ctx.fillStyle = rgba(mixC(c, BLACK, 0.2), 1); ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + s, y - s); ctx.lineTo(x + s, y + s); ctx.closePath(); ctx.fill();
  }
  function bullet(b, c) { stud(b.x, b.y, b.r, c); }

  // 切り抜き文字の弾
  function letterKind(b, T) {
    const p = b.delay > 0 ? (b.delayMax > 0 ? 1 - b.delay / b.delayMax : 1) : 1;
    if (b.delay > 0) {
      const on = p > 0.6 || Math.floor(T * 14) % 2 === 0;
      ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(b.tilt);
      ctx.strokeStyle = `rgba(255,255,255,${on ? 0.8 : 0.3})`; ctx.lineWidth = 2; ctx.setLineDash([5, 4]);
      const s = b.size * (1.4 - 0.4 * p); ctx.strokeRect(-s * 0.45, -s * 0.55, s * 0.9, s * 1.1); ctx.setLineDash([]);
      ctx.restore();
      return;
    }
    ransomBox(ctx, b.ch, b.x, b.y, b.size, b.seed, b.tilt + Math.sin(T * 10 + b.i) * 0.08);
  }
  // ステージ・ダイバー（人のシルエット）
  function diverKind(b, T) {
    const c = bulletColor(b);
    if (b.delay > 0) {                                                    // 予告: 着地点にガムテープの × と、出てくる所の矢印
      const p = b.delayMax > 0 ? 1 - b.delay / b.delayMax : 1, on = p > 0.6 || Math.floor(T * 14) % 2 === 0;
      ctx.strokeStyle = rgba(c, on ? 0.9 : 0.35); ctx.lineWidth = 4;
      ctx.beginPath(); ctx.moveTo(b.x1 - 14, GROUND_Y - 4); ctx.lineTo(b.x1 + 14, GROUND_Y - 18); ctx.moveTo(b.x1 - 14, GROUND_Y - 18); ctx.lineTo(b.x1 + 14, GROUND_Y - 4); ctx.stroke();
      const ex = b.x0 < W / 2 ? 16 : W - 16, d = b.x0 < W / 2 ? 1 : -1;
      ctx.fillStyle = rgba(c, on ? 0.95 : 0.4);
      ctx.beginPath(); ctx.moveTo(ex + d * 16, b.y0); ctx.lineTo(ex, b.y0 - 12); ctx.lineTo(ex, b.y0 + 12); ctx.closePath(); ctx.fill();
      ctx.font = '900 14px Impact, "Arial Black", sans-serif'; ctx.textAlign = d > 0 ? 'left' : 'right'; ctx.textBaseline = 'middle';
      ctx.fillText('DIVE!', ex + d * 22, b.y0);
      return;
    }
    ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(b.spin * 0.3 + (b.sgn > 0 ? 0.3 : -0.3));
    if (gfx > 0) { ctx.globalCompositeOperation = 'lighter'; const G = 46; ctx.globalAlpha = 0.5; ctx.drawImage(glowSprite(c), -G, -G, G * 2, G * 2); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; }
    const flail = Math.sin(T * 18) * 0.4;
    ctx.strokeStyle = '#050505'; ctx.lineCap = 'round'; ctx.lineWidth = 9;
    ctx.beginPath();
    ctx.moveTo(-4, 0); ctx.lineTo(-16, -14 + flail * 10); ctx.moveTo(4, 0); ctx.lineTo(16, -14 - flail * 10);  // 腕
    ctx.moveTo(-3, 8); ctx.lineTo(-10, 22); ctx.moveTo(3, 8); ctx.lineTo(12, 20 + flail * 6);                 // 足
    ctx.stroke();
    ctx.strokeStyle = rgba(c, 1); ctx.lineWidth = 5; ctx.stroke();
    ctx.fillStyle = '#050505'; ctx.beginPath(); ctx.ellipse(0, 3, 9, 12, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = rgba(c, 1); ctx.beginPath(); ctx.ellipse(0, 3, 6.5, 9.5, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#050505'; ctx.beginPath(); ctx.arc(0, -13, 8, 0, TAU); ctx.fill();
    ctx.fillStyle = rgba(mixC(c, WHITE, 0.5), 1); ctx.beginPath(); ctx.arc(0, -13, 5.5, 0, TAU); ctx.fill();
    ctx.fillStyle = rgba(RED, 1); ctx.fillRect(-6, -21, 12, 3);                                                // 髪（モヒカン）
    ctx.restore();
  }
  // サークル・ピット（転がるとげの輪）
  function pitKind(b, T) {
    const c = bulletColor(b);
    if (b.delay > 0) {
      const p = b.delayMax > 0 ? 1 - b.delay / b.delayMax : 1, on = p > 0.6 || Math.floor(T * 14) % 2 === 0;
      const ex = b.dir > 0 ? 20 : W - 20;
      ctx.strokeStyle = rgba(c, on ? 0.85 : 0.3); ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(ex, GROUND_Y, b.R * (0.5 + 0.5 * p), Math.PI, TAU); ctx.stroke();
      ctx.font = '900 16px Impact, "Arial Black", sans-serif'; ctx.textAlign = b.dir > 0 ? 'left' : 'right'; ctx.textBaseline = 'middle';
      ctx.fillStyle = rgba(c, on ? 0.95 : 0.4); ctx.fillText(b.dir > 0 ? 'CIRCLE PIT ▶' : '◀ CIRCLE PIT', b.dir > 0 ? 8 : W - 8, GROUND_Y - b.R - 22);
      return;
    }
    ctx.strokeStyle = rgba(c, 0.35); ctx.lineWidth = 3;                    // 輪の道すじ（回る向きのしるし）
    ctx.beginPath(); ctx.arc(b.x, GROUND_Y, b.R, Math.PI, TAU); ctx.stroke();
    ctx.strokeStyle = rgba(c, 0.18); ctx.lineWidth = 8;
    ctx.beginPath(); ctx.arc(b.x, GROUND_Y, b.R, b.rot - 0.5 * b.dir, b.rot, b.dir < 0); ctx.stroke();
    for (const [x, y] of b.balls(b)) {
      ctx.fillStyle = '#050505';
      ctx.beginPath(); for (let i = 0; i < 8; i++) { const a = i * TAU / 8 + b.rot, rr = i % 2 ? b.ballR + 2 : b.ballR + 6; ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); } ctx.fill();
      stud(x, y, b.ballR, c);
    }
  }
  // ドラムスティック
  function stickKind(b, T) {
    const c = bulletColor(b);
    if (b.delay > 0) {
      const p = b.delayMax > 0 ? 1 - b.delay / b.delayMax : 1, on = p > 0.6 || Math.floor(T * 14) % 2 === 0;
      ctx.fillStyle = rgba(c, on ? 0.9 : 0.3);
      ctx.beginPath(); ctx.moveTo(b.x, 26); ctx.lineTo(b.x - 9, 12); ctx.lineTo(b.x + 9, 12); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = rgba(c, 0.12 + 0.2 * p); ctx.lineWidth = 2; ctx.setLineDash([6, 8]);
      ctx.beginPath(); ctx.moveTo(b.x, 30); ctx.lineTo(b.x, GROUND_Y); ctx.stroke(); ctx.setLineDash([]);
      return;
    }
    const dx = Math.cos(b.a) * b.len / 2, dy = Math.sin(b.a) * b.len / 2;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#050505'; ctx.lineWidth = b.r * 2 + 4; ctx.beginPath(); ctx.moveTo(b.x - dx, b.y - dy); ctx.lineTo(b.x + dx, b.y + dy); ctx.stroke();
    ctx.strokeStyle = rgba(c, 1); ctx.lineWidth = b.r * 2; ctx.stroke();
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(b.x + dx, b.y + dy, b.r * 0.8, 0, TAU); ctx.fill();
  }

  // 音の柱（上から）と、アンプの音の柱（横）
  function laser(b, c, T, k) {
    if (!b.punk) return;
    if (b.punk === 'slam') {
      const x = b.x1, w = b.r * 2;
      if (b.delay > 0) {                                                  // 予告: 黄色と黒のしま（工事中のテープ）のふち
        const p = b.delayMax > 0 ? 1 - b.delay / b.delayMax : 1, on = p > 0.65 || Math.floor(T * 14) % 2 === 0;
        ctx.fillStyle = rgba(c, 0.05 + 0.1 * p); ctx.fillRect(x - w / 2, 0, w, GROUND_Y);
        ctx.save(); ctx.globalAlpha = on ? 0.9 : 0.35;
        for (const ex of [x - w / 2, x + w / 2 - 6]) {
          ctx.fillStyle = '#111'; ctx.fillRect(ex, 0, 6, GROUND_Y);
          ctx.fillStyle = '#ffd23f'; ctx.beginPath();                     // しまは1回でまとめて塗る
          for (let y = (T * 120) % 24 - 24; y < GROUND_Y; y += 24) { ctx.moveTo(ex, y); ctx.lineTo(ex + 6, y - 6); ctx.lineTo(ex + 6, y + 6); ctx.lineTo(ex, y + 12); ctx.closePath(); }
          ctx.fill();
        }
        ctx.restore();
        const fall = GROUND_Y * (1 - p);                                    // 落ちてくる影
        ctx.fillStyle = rgba(c, 0.18 * p); ctx.fillRect(x - w / 2, 0, w, GROUND_Y - fall);
        return true;
      }
      const fade = b.safe ? clamp01(1 - (b.age - b.hold) / 0.3) : 1, sc = b.safe ? fade : 1;
      const ww = w * (b.safe ? 0.4 + 0.6 * fade : 1 + 0.15 * clamp01(1 - b.age / 0.08));
      ctx.fillStyle = `rgba(0,0,0,${(0.7 * sc).toFixed(3)})`; ctx.fillRect(x - ww / 2 - 4, 0, ww + 8, GROUND_Y);
      ctx.fillStyle = rgba(c, 0.95 * sc); ctx.fillRect(x - ww / 2, 0, ww, GROUND_Y);
      ctx.globalAlpha = 0.5 * sc; ctx.fillStyle = st.grainPat || (st.grainPat = ctx.createPattern(st.grain, 'repeat'));   // 模様は1回だけ作る（毎コマ作ると、ブラウザによっては絵のコピーがたまって、どんどん重くなる） ctx.fillRect(x - ww / 2, 0, ww, GROUND_Y); ctx.globalAlpha = 1;
      if (!b.safe && b.age < 0.05 && !b.boomed) {
        b.boomed = true;
        sparks(x, GROUND_Y - 2, { n: 16, color: rgbHex(c), speed: 380, life: 0.45, size: 3, gravity: 900, dir: -Math.PI / 2, spread: 2.6 });
        shake(4); hcFx('crack', x);
      }
      return true;
    }
    if (b.punk === 'blast') {
      const y = b.y1, w = b.r * 2, x0 = b.side < 0 ? 96 : W - 96, x1 = b.side < 0 ? W : 0;
      if (b.delay > 0) {
        const p = b.delayMax > 0 ? 1 - b.delay / b.delayMax : 1, on = p > 0.65 || Math.floor(T * 14) % 2 === 0;
        ctx.fillStyle = rgba(c, 0.06 + 0.1 * p); ctx.fillRect(0, y - w / 2, W, w);
        ctx.strokeStyle = rgba(c, on ? 0.85 : 0.3); ctx.lineWidth = 2; ctx.setLineDash([14, 8]); ctx.lineDashOffset = -T * 300 * -b.side;
        ctx.beginPath(); ctx.moveTo(0, y - w / 2); ctx.lineTo(W, y - w / 2); ctx.stroke(); ctx.setLineDash([]);
        ctx.font = '900 18px Impact, "Arial Black", sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillStyle = rgba(c, on ? 1 : 0.4);
        for (const f of [0.3, 0.7]) ctx.fillText('▲ JUMP ▲', W * f, y - 34 - 6 * p);
        return true;
      }
      const fade = b.safe ? clamp01(1 - (b.age - b.hold) / 0.3) : 1;
      const ww = w * (b.safe ? 0.3 + 0.7 * fade : 1);
      ctx.fillStyle = `rgba(0,0,0,${(0.6 * fade).toFixed(3)})`; ctx.fillRect(0, y - ww / 2 - 3, W, ww + 6);
      ctx.fillStyle = rgba(c, fade); ctx.beginPath();                     // ぎざぎざの音の柱
      ctx.moveTo(x0, y - ww / 2);
      for (let i = 0; i <= 20; i++) { const x = x0 + (x1 - x0) * i / 20; ctx.lineTo(x, y - ww / 2 - (i % 2 ? 5 : 0) * Math.sin(T * 50 + i)); }
      for (let i = 20; i >= 0; i--) { const x = x0 + (x1 - x0) * i / 20; ctx.lineTo(x, y + ww / 2 + (i % 2 ? 0 : 4)); }
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = `rgba(255,255,255,${(0.85 * fade).toFixed(3)})`; ctx.fillRect(0, y - 2, W, 4);
      return true;
    }
  }
  function rgbHex(c) { return '#' + c.map(v => (v | 0).toString(16).padStart(2, '0')).join(''); }

  function fire(b) {
    if (b.kind === 'hcLetter' || b.kind === 'hcStick') return true;
    if (b.kind === 'hcDiver') { shockRing(b.x, b.y, { color: '#ff4fa3', size: 60, life: 0.35, width: 3 }); return true; }
    if (b.kind === 'hcPit') { shockRing(b.x, GROUND_Y, { color: '#ff2e3a', size: 80, life: 0.35, width: 3 }); return true; }
  }

  function flash(look) {
    if (st.inv > 0.01) {                                                   // 大きな所だけ一瞬「白黒反転」（コピー機のネガ）
      ctx.globalCompositeOperation = 'difference';
      ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, W, H);
      ctx.globalCompositeOperation = 'source-over';
      return;
    }
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = `rgba(255,250,240,${(0.32 * flashT).toFixed(3)})`; ctx.fillRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'source-over';
  }

  // バナー: 切り抜き文字がたたきつけられる
  function banner() {
    const bn = fx.banner;
    if (!bn) return;
    const e = bn.age, DUR = 2.6;
    if (e > DUR) { fx.banner = null; return; }
    const out = clamp01((DUR - e) / 0.4), name = bn.name, n = name.length, S = n > 9 ? 40 : 48, gap = S * 0.86;
    ctx.save();
    for (let i = 0; i < n; i++) {
      const ch = name[i]; if (ch === ' ') continue;
      const t = e - i * 0.035; if (t < 0) continue;
      const land = easeOut(clamp01(t / 0.12)), sc = 1 + 1.4 * (1 - land);
      const x = W / 2 + (i - (n - 1) / 2) * gap, y = 136 + (hs(i, n) - 0.5) * 10;
      ctx.save(); ctx.globalAlpha = out * (0.3 + 0.7 * land); ctx.translate(x, y); ctx.scale(sc, sc);
      ransomBox(ctx, ch, 0, 0, S, i * 13 + n * 7, (hs(i, n + 1) - 0.5) * 0.35);
      ctx.restore();
    }
    if (bn.sub) {                                                          // 黒いテープに白い字
      const a = clamp01((e - 0.35) / 0.25) * out;
      ctx.save(); ctx.translate(W / 2, 192); ctx.rotate(-0.025); ctx.globalAlpha = a;
      ctx.font = '700 16px "Courier New", monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      const tw = ctx.measureText(bn.sub).width + 30;
      ctx.fillStyle = '#0a0a0a'; ctx.fillRect(-tw / 2, -14, tw, 28);
      ctx.fillStyle = '#f4f4f4'; ctx.fillText(bn.sub, 0, 1);
      ctx.restore();
    }
    ctx.restore();
  }
  // ヒント: 黄色いテープ
  function hint(h, a, T) {
    ctx.save(); ctx.globalAlpha = clamp01(a); ctx.translate(W / 2, H * 0.3); ctx.rotate(-0.03);
    ctx.font = '800 24px "Arial Black", Impact, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const tw = ctx.measureText(h.text).width + 40;
    ctx.fillStyle = '#ffd23f'; ctx.fillRect(-tw / 2, -21, tw, 42);
    ctx.fillStyle = '#111'; for (const s of [-1, 1]) for (let i = 0; i < 3; i++) ctx.fillRect(s * (tw / 2 - 6 - i * 8) - 2, -21, 4, 42);
    ctx.fillText(h.text, 0, 1);
    ctx.restore();
  }

  function title(look, k, bp) {                                     // タイトル画面: 上から見たサークル・ピット（人が輪になって走る）
    const T = titleClock(), cx = W / 2, cy = H * 0.37;
    ctx.strokeStyle = rgba(RED, 0.25 + 0.4 * k); ctx.lineWidth = 3;
    ctx.beginPath(); ctx.ellipse(cx, cy, 150 + 10 * k, 70 + 5 * k, 0, 0, TAU); ctx.stroke();
    for (let i = 0; i < 16; i++) {
      const a = -T * 1.6 + i * TAU / 16, x = cx + Math.cos(a) * 150, y = cy + Math.sin(a) * 70, bob = Math.abs(Math.sin(bp * Math.PI + i)) * 6;
      ctx.fillStyle = '#050505'; ctx.beginPath(); ctx.arc(x, y - bob, 10, 0, TAU); ctx.fill();
      ctx.fillStyle = rgba(i % 3 ? WHITE : RED, 0.85); ctx.beginPath(); ctx.arc(x, y - bob, 6, 0, TAU); ctx.fill();
    }
    stud(cx, cy, 16 + 4 * k, YEL);
  }

  // カメラ: 拍ごとにヘッドバンギング（下にガクッ）＋ 左右に交互にゆさぶる。ブレイクダウンとモッシュは特に重く
  function camera(T, bp, k) {
    const I = inSong() ? intensity() : 0.35;
    const n = Math.floor(bp), f = bp - n, side = n % 2 ? 1 : -1, hit = Math.exp(-f * 5);
    const heavy = st.mode === 'BREAKDOWN' || st.mode === 'MOSH';
    const lo = inSong() ? songEnv(0, T) : 0.4;
    let y = I * (10 * hit + (heavy ? 22 * st.nod : 0) + 14 * st.quake);
    let x = side * I * 7 * hit + (Math.random() * 2 - 1) * I * 3 * lo + Math.sin(T * 41) * 6 * st.quake;
    const rot = side * I * 0.022 * hit + Math.sin(T * 37) * 0.02 * st.quake + (heavy ? side * 0.02 * st.nod : 0);
    return { x, y, rot };
  }

  THEMES.punk = {
    noTrails: true, glow: 1.6, noScanlines: true, noGlow: false,
    clearColors: ['#ff2e3a', '#f4f4f4', '#ffd23f', '#ff4fa3', '#111111'],
    kinds: { hcLetter: letterKind, hcDiver: diverKind, hcPit: pitKind, hcStick: stickKind },
    reset, update, background, floor, platform, bullet, laser, fire, flash, banner, hint, title, camera,
  };
  // 曲が変わったら、この見た目のセットの絵を手放す（次に使うときに作り直す。メモリがふくらんで重くならないように）
  THEMES.punk.release = () => { freeArt(st); st.made = false; beamPool.clear(); freeArt(redEdges); };
})();
