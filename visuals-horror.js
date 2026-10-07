"use strict";

/* =========================================================================
   見た目のセット「horror」  —  曲⑩「Ward 13」用（ホラーゲームの怖さ）
   廃病院の長い廊下（奥に「13」の扉、チカチカする蛍光灯、両側の病室の扉）。
     懐中電灯     … stage.dark のとき真っ暗になり、向いている方だけ円すい形に照らされる
                    （照らされていない所の化け物は、光る目だけが見える）
     ノイズ       … ストーカーが近づくほど、画面の砂嵐と「ザー」という音が強くなる（ホラーゲームのラジオ）
     明かりが消える … horrorBlink(): 一瞬真っ暗 → チカチカ。その間にストーカーが近づく
     裏の世界     … サイレンのあと、壁がさびた金網と血に変わっていく（まん中から燃え広がるように）
     監視カメラ   … stage.cctv: 白黒の映像・REC・時刻・カメラ番号。horrorCut() で砂嵐をはさんで切りかわる
     ジャンプスケア … 曲のおどかしの音（SCORE_WARD13.scare）と同時に、顔が画面いっぱいに迫る
     血の手形     … 金属音で画面に血の手形がバンとつく / 上から血がたれる / 壁の落書き
     体力が少ない … 残機 1 のとき、画面のふちが赤く脈打ち「DANGER」
   もっと怖く:
     うしろ       … 同じ向きを見つづけていると、背後の暗やみに何かが立つ（ふり向くと消える）
     暗やみの腕   … 画面のはしから青白い腕がのびてくる（懐中電灯を向けると引っこむ）
     自分の影     … 奥の壁にうつる自分の影が少し遅れて動き、ときどきこちらに顔を向ける
     ささやき     … 「うしろ」「みてる」「behind you」… 自分のすぐそばに文字が浮かぶ（ささやく音つき）
     一瞬の顔     … 明かりが消えた一瞬に、顔が1コマだけ見える
     息をする廊下 … 廊下が心臓の音に合わせてふくらみ、サイレンでは奥へ引きのばされる
     せまくなる視界 … ストーカーが近いほど懐中電灯の光がせまくなり、近づくとストーカーの顔が見える
     にせのフリーズ … 最後のおどかしの直前、ゲームが固まったふりをする（「応答していません」）
     タイトル     … この曲のタイトル画面に来るたびに、廊下の奥の人影が少しずつ近づいてくる
   ========================================================================= */

(function () {
  const VP = { x: W / 2, y: 300 };                          // 廊下の消失点
  const WHITE = [255, 255, 255], RED = rgb('#c0101a'), PALE = rgb('#d8e0d0');
  const SERIF = '"Times New Roman", "Hiragino Mincho ProN", serif';
  const st = { lastBeat: -99, flick: 0, scare: null, hands: [], cut: 0, cam: 1, mask: null, grain: null, prox: 0, ac: null, eyes: [], ow: 0, beacon: 0, drips: null,
    behind: null, faceT: 0, arms: [], whispers: [], shadowX: W / 2, shadowLook: 0, sub: 0, frozen: null, freeze: -1, titleSeen: false };
  const WHISPER = ['うしろ', 'みてる', 'にげて', 'ここにいる', 'behind you', "it's here", "don't turn around", 'みつけた'];
  const FREEZE0 = 184.5, FREEZE1 = 185.95;                 // にせのフリーズ（拍）
  let SCARES = null, BANGS = null;
  const OW = [[80, 128], [144, 184]];                     // 裏の世界の区間（拍）
  const inside = (b, list) => list.some(([a, z]) => b >= a && b < z);
  const WRITE = [['RUN', 120, 230, -0.2], ['IT SEES YOU', 600, 180, 0.12], ["DON'T LOOK BACK", 640, 420, -0.08], ['13', 200, 440, 0.3]];

  function reset() {
    Object.assign(st, { lastBeat: -99, flick: 0, scare: null, hands: [], cut: 0, cam: 1, prox: 0, eyes: [], ow: 0, beacon: 0,
      behind: null, faceT: 0, arms: [], whispers: [], shadowX: W / 2, shadowLook: 0, sub: 0, frozen: null, freeze: -1 });
    st.drips = Array.from({ length: 26 }, (_, i) => ({ x: i * 31 + Math.random() * 20, len: 0, max: 30 + Math.random() * 110, v: 6 + Math.random() * 18, w: 2 + Math.random() * 4 }));
  }
  window.horrorBlink = () => { st.flick = 1; if (Math.random() < 0.5) st.subAt = songTime + 0.03 + Math.random() * 0.08; };   // 消えた一瞬に顔
  window.horrorCut = () => { st.cut = 0.18; st.cam = 1 + ((st.cam + 1 + (Math.random() * 3 | 0)) % 6); };

  // ---- ザー（ストーカーが近いほど強い）: WebAudio のノイズ ----
  function staticAudio(level) {
    if (!st.ac) {
      if (scene !== 'play' || level <= 0) return;
      try {
        const ac = new (window.AudioContext || window.webkitAudioContext)();
        const buf = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate), d = buf.getChannelData(0);
        for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (Math.random() < 0.02 ? 1 : 0.5);
        const src = ac.createBufferSource(); src.buffer = buf; src.loop = true;
        const filt = ac.createBiquadFilter(); filt.type = 'bandpass'; filt.frequency.value = 2200; filt.Q.value = 0.6;
        const gain = ac.createGain(); gain.gain.value = 0;
        src.connect(filt); filt.connect(gain); gain.connect(ac.destination); src.start();
        st.ac = { ac, gain };
      } catch (e) { st.ac = { gain: null }; }
    }
    if (st.ac.gain) st.ac.gain.gain.setTargetAtTime(level * masterVol * 0.22, st.ac.ac.currentTime, 0.05);
  }
  // ささやく音: こすれるような息の音（短いノイズを声の高さの帯でしぼる）
  function whisperSound(pan) {
    if (!st.ac || !st.ac.gain) return;
    const ac = st.ac.ac, n = ac.sampleRate * 0.9, buf = ac.createBuffer(1, n, ac.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) { const t = i / n; d[i] = (Math.random() * 2 - 1) * Math.sin(Math.PI * t) * (0.6 + 0.4 * Math.sin(t * 40)); }
    const src = ac.createBufferSource(); src.buffer = buf;
    const f = ac.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 1800 + Math.random() * 1500; f.Q.value = 2.5;
    const g = ac.createGain(); g.gain.value = masterVol * 0.5;
    const pn = ac.createStereoPanner ? ac.createStereoPanner() : null;
    src.connect(f); f.connect(g);
    if (pn) { pn.pan.value = pan; g.connect(pn); pn.connect(ac.destination); } else g.connect(ac.destination);
    src.start();
  }
  setInterval(() => {                                        // 一時停止中・ほかの曲・タイトルでは止める
    if (st.ac && st.ac.gain && (paused || scene !== 'play' || !song || song.theme !== 'horror')) st.ac.gain.gain.setTargetAtTime(0, st.ac.ac.currentTime, 0.03);
  }, 150);

  function onBeat(b) {
    if (!SCARES) { SCARES = new Set(SCORE_WARD13.scare); BANGS = new Set(SCORE_WARD13.bang); }
    if (SCARES.has(b)) { st.scare = { t: 0, seed: Math.random() }; window.flash(1); shake(26); glitch(1); }
    if (BANGS.has(b) && inside(b, OW) && st.hands.length < 5) {   // 血の手形
      const left = Math.random() < 0.5;
      st.hands.push({ t: 0, x: left ? 40 + Math.random() * 150 : W - 40 - Math.random() * 150, y: 80 + Math.random() * 380, a: (Math.random() - 0.5) * 0.9, s: 0.8 + Math.random() * 0.5, flip: left ? 1 : -1 });
      shake(6);
    }
  }

  function update(dt, T, look) {
    if (!st.drips) reset();
    if (scene !== 'title') st.titleSeen = false;             // タイトルにもどるたびに数える
    st.flick = Math.max(0, st.flick - dt * 2.2);
    st.cut = Math.max(0, st.cut - dt);
    if (st.scare) { st.scare.t += dt; if (st.scare.t > 0.75) st.scare = null; }
    for (const h of st.hands) h.t += dt;
    st.hands = st.hands.filter(h => h.t < 4);
    if (scene !== 'play') { staticAudio(0); return; }
    const bp = beatPos(T), b = Math.floor(bp + 0.02);
    if (b !== st.lastBeat) { if (b === st.lastBeat + 1) onBeat(b); st.lastBeat = b; }
    st.ow += ((inside(bp, OW) ? 1 : 0) - st.ow) * Math.min(1, dt * (inside(bp, OW) ? 0.9 : 2));
    st.beacon += dt * 3.2;
    if (st.ow > 0.5) for (const d of st.drips) d.len = Math.min(d.max, d.len + d.v * dt);
    else for (const d of st.drips) d.len = Math.max(0, d.len - 60 * dt);
    // ストーカーとの近さ（画面の砂嵐と音）
    let near = 1e9;
    const p = playerXY();
    for (const q of bullets) if (q.kind === 'stalker' && q.delay <= 0 && !q.safe) near = Math.min(near, Math.abs(q.x - p.x));
    const target = clamp01((300 - near) / 240);
    st.prox += (target - st.prox) * Math.min(1, dt * 5);
    staticAudio(st.prox);
    // 暗やみの目（ときどき開いて、まばたきして、消える）
    if (stage.dark > 0.5 && Math.random() < dt * 0.8 && st.eyes.length < 6) st.eyes.push({ t: 0, x: 40 + Math.random() * (W - 80), y: 60 + Math.random() * 500, s: 0.6 + Math.random() * 0.8 });
    for (const e of st.eyes) e.t += dt;
    st.eyes = st.eyes.filter(e => e.t < 3);
    const dark = stage.dark > 0.5;
    // うしろ: 同じ向きを 1.5 秒見つづけると、背後に立つ。ふり向くと消える
    if (player.facing !== st.lastFacing) { st.lastFacing = player.facing; st.faceT = 0; if (st.behind) { st.behind = null; st.flick = Math.max(st.flick, 0.3); } }
    st.faceT += dt;
    if (dark && !st.behind && st.faceT > 1.5 && Math.random() < dt * 0.5) st.behind = { t: 0, side: -player.facing, d: 120 + Math.random() * 80 };
    if (st.behind) { st.behind.t += dt; if (st.behind.t > 6) st.behind = null; }
    // 暗やみの腕: 画面のはしからのびる。懐中電灯を向けられると引っこむ
    if (dark && st.arms.length < 3 && Math.random() < dt * 0.35) st.arms.push({ side: Math.random() < 0.5 ? -1 : 1, y: GROUND_Y - 30 - Math.random() * 380, len: 0, v: 40 + Math.random() * 50, ph: Math.random() * 6 });
    for (const a of st.arms) {
      const lit = player.facing === a.side;                  // 腕のある側を向く = 懐中電灯で照らす
      a.len = Math.min(330, a.len + (lit ? -900 : a.v) * dt - (dark ? 0 : 300 * dt));
    }
    st.arms = st.arms.filter(a => a.len >= 0);
    // ささやき
    if ((dark || st.ow > 0.5) && Math.random() < dt * 0.22 && st.whispers.length < 2) {
      const side = Math.random() < 0.5 ? -1 : 1;
      st.whispers.push({ t: 0, text: WHISPER[(Math.random() * WHISPER.length) | 0], dx: side * (40 + Math.random() * 60), dy: -40 - Math.random() * 60 });
      whisperSound(side * 0.8);
    }
    for (const w of st.whispers) w.t += dt;
    st.whispers = st.whispers.filter(w => w.t < 2.2);
    // 奥の壁の影: 少し遅れてついてくる。ときどきこちらを向く
    st.shadowX += (p.x - st.shadowX) * Math.min(1, dt * 1.4);
    st.shadowLook = (bp % 16 > 13.5 && bp > 32) ? Math.min(1, st.shadowLook + dt * 3) : Math.max(0, st.shadowLook - dt * 2);
    // にせのフリーズ: 固まる直前の画面を取っておく（弾もぜんぶ消える）
    if (bp >= FREEZE0 && bp < FREEZE1 && st.freeze < 0) {
      st.freeze = 0;
      st.frozen = document.createElement('canvas'); st.frozen.width = cv.width; st.frozen.height = cv.height;
      st.frozen.getContext('2d').drawImage(cv, 0, 0);
      bullets = [];
    }
    if (st.freeze >= 0) st.freeze += dt;
    if (bp >= FREEZE1) st.frozen = null;
    if (st.subAt && songTime >= st.subAt) { st.sub = 0.05; st.subAt = 0; }
    else if (dark && Math.random() < dt * 0.04) st.sub = 0.05;
    st.sub = Math.max(0, st.sub - dt);
  }

  // ---- 背景: 病院の廊下（ふつうの世界 / 裏の世界）----
  function corridor(T, look, k, other) {
    const wallC = other ? '#2a0d08' : '#1d211f', floorC = other ? '#1a0806' : '#151816', ceilC = other ? '#120504' : '#121413';
    const bpN = scene === 'title' ? 0 : beatPos(T);
    const stretch = bpN >= 64 && bpN < 80 ? 1 - 0.55 * Math.sin(Math.PI * (bpN - 64) / 16) : 1;   // サイレン: 廊下が奥へ引きのばされる
    const breath = 1 + 0.06 * kickOf(bpN) * (scene === 'play' ? 1 : 0);                            // 心臓の音で、廊下がふくらむ
    const L = 0, R = W, TOP = 0, BOT = GROUND_Y, fw = 70 * stretch * breath, fh = 52 * stretch * breath;   // 奥の扉の大きさ（半分）
    const quad = (pts, c) => { ctx.fillStyle = c; ctx.beginPath(); pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.closePath(); ctx.fill(); };
    quad([[L, TOP], [R, TOP], [VP.x + fw, VP.y - fh], [VP.x - fw, VP.y - fh]], ceilC);
    quad([[L, BOT], [R, BOT], [VP.x + fw, VP.y + fh], [VP.x - fw, VP.y + fh]], floorC);
    quad([[L, TOP], [VP.x - fw, VP.y - fh], [VP.x - fw, VP.y + fh], [L, BOT]], wallC);
    quad([[R, TOP], [VP.x + fw, VP.y - fh], [VP.x + fw, VP.y + fh], [R, BOT]], wallC);
    // 床のタイル（奥へ）
    ctx.strokeStyle = other ? 'rgba(120,30,20,0.35)' : 'rgba(150,170,150,0.12)'; ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = -6; i <= 6; i++) { ctx.moveTo(VP.x + i * fw / 6, VP.y + fh); ctx.lineTo(W / 2 + i * 140, BOT); }
    for (let j = 1; j < 8; j++) { const p = Math.pow(j / 8, 2), y = VP.y + fh + (BOT - VP.y - fh) * p, x = fw + (W / 2 - fw) * p; ctx.moveTo(VP.x - x, y); ctx.lineTo(VP.x + x, y); }
    ctx.stroke();
    // 両側の病室の扉
    for (let j = 1; j <= 3; j++) {
      const p = Math.pow(j / 4, 1.6);
      for (const side of [-1, 1]) {
        const x0 = side < 0 ? L + (VP.x - fw - L) * p : R - (R - VP.x - fw) * p, w = 70 * (1 - p) + 8;
        const yt = TOP + (VP.y - fh - TOP) * p + 60 * (1 - p), yb = BOT + (VP.y + fh - BOT) * p;
        ctx.fillStyle = other ? 'rgba(10,2,2,0.8)' : 'rgba(8,10,9,0.75)';
        ctx.fillRect(side < 0 ? x0 : x0 - w, yt, w, yb - yt);
        ctx.strokeStyle = other ? 'rgba(160,50,30,0.4)' : 'rgba(150,170,150,0.15)';
        ctx.strokeRect(side < 0 ? x0 : x0 - w, yt, w, yb - yt);
      }
    }
    // 奥の扉と「13」
    ctx.fillStyle = '#050505'; ctx.fillRect(VP.x - 34, VP.y - 30, 68, 30 + fh);
    ctx.fillStyle = other ? 'rgba(255,60,40,0.8)' : 'rgba(200,220,200,0.5)';
    ctx.font = `700 16px ${SERIF}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('WARD 13', VP.x, VP.y - 42);
    if (other) {
      // さびた金網（ななめの格子）＋ 血のしみ
      ctx.strokeStyle = 'rgba(90,30,15,0.55)'; ctx.lineWidth = 2;
      ctx.beginPath();
      for (let x = -700; x < W + 700; x += 34) { ctx.moveTo(x, 0); ctx.lineTo(x + 700, 700); ctx.moveTo(x, 0); ctx.lineTo(x - 700, 700); }
      ctx.stroke();
      ctx.fillStyle = 'rgba(110,0,8,0.45)';
      for (const [x, y, r] of [[90, 380, 60], [700, 260, 45], [260, 620, 70], [560, 560, 40]]) { ctx.beginPath(); ctx.ellipse(x, y, r, r * 0.6, 0.4, 0, TAU); ctx.fill(); }
      ctx.save();                                            // 壁の落書き
      for (const [text, x, y, a] of WRITE) {
        ctx.translate(x, y); ctx.rotate(a);
        ctx.font = `900 ${text.length < 4 ? 64 : 30}px ${SERIF}`;
        ctx.fillStyle = 'rgba(150,0,10,0.75)'; ctx.fillText(text, (Math.random() - 0.5) * 1.5, 0);
        ctx.rotate(-a); ctx.translate(-x, -y);
      }
      ctx.restore();
    }
    // 天井の蛍光灯（ときどきチカチカ）
    const on = other ? 0.25 : (Math.sin(T * 13) > -0.9 && Math.random() > 0.03 ? 1 : 0.1);
    ctx.fillStyle = other ? `rgba(255,60,40,${0.5 * on})` : `rgba(220,255,230,${0.7 * on})`;
    ctx.fillRect(VP.x - 90, 40, 180, 8);
    // 蛍光灯の光のにじみ: 前もって描いた絵を、明るさ（on）だけ変えて貼る（毎コマ大きなグラデーションで塗るより軽い。見た目は同じ）
    const key = other ? 'lampO' : 'lamp';
    if (!st[key]) {
      const c = document.createElement('canvas'); c.width = 760; c.height = 430;
      const z = c.getContext('2d'), gr = z.createRadialGradient(380, 50, 10, 380, 50, 380);
      gr.addColorStop(0, other ? 'rgba(255,40,20,0.18)' : 'rgba(200,255,220,0.12)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
      z.fillStyle = gr; z.fillRect(0, 0, 760, 430);
      st[key] = c;
    }
    ctx.globalAlpha = on; ctx.drawImage(st[key], VP.x - 380, 0); ctx.globalAlpha = 1;
  }

  function background(T, look, k, bk, bp) {
    corridor(T, look, k, false);
    if (scene === 'play') {                                   // 奥の壁にうつる自分の影（少し遅れて動く。ときどきこちらを向く）
      const x = VP.x + (st.shadowX - W / 2) * 0.35, base = VP.y + 52, hh = 120;
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      ctx.beginPath(); ctx.ellipse(x, base - hh * 0.82, 13, 17, 0, 0, TAU); ctx.fill();
      ctx.beginPath(); ctx.moveTo(x - 20, base - hh * 0.68); ctx.lineTo(x + 20, base - hh * 0.68); ctx.lineTo(x + 14, base); ctx.lineTo(x - 14, base); ctx.closePath(); ctx.fill();
      if (st.shadowLook > 0.05) {
        ctx.fillStyle = `rgba(255,255,255,${(0.85 * st.shadowLook).toFixed(3)})`;
        ctx.fillRect(x - 6, base - hh * 0.84, 3, 2); ctx.fillRect(x + 3, base - hh * 0.84, 3, 2);
        ctx.strokeStyle = `rgba(255,255,255,${(0.5 * st.shadowLook).toFixed(3)})`; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(x, base - hh * 0.77, 5, 0.15 * Math.PI, 0.85 * Math.PI); ctx.stroke();   // にやり
      }
    }
    if (st.ow > 0.01) {                                      // 裏の世界: まん中から燃え広がるように変わる
      ctx.save();
      ctx.beginPath();
      const R = st.ow * 900;
      for (let i = 0; i <= 40; i++) { const a = i / 40 * TAU, r = R * (0.85 + 0.15 * Math.sin(a * 7 + T * 3) + 0.08 * Math.sin(a * 13 - T * 5)); ctx.lineTo(VP.x + Math.cos(a) * r, VP.y + Math.sin(a) * r); }
      ctx.clip();
      corridor(T, look, k, true);
      ctx.restore();
      if (st.ow < 0.98) {                                    // 燃えている境目
        ctx.strokeStyle = 'rgba(255,120,40,0.5)'; ctx.lineWidth = 4;
        ctx.beginPath();
        const R = st.ow * 900;
        for (let i = 0; i <= 40; i++) { const a = i / 40 * TAU, r = R * (0.85 + 0.15 * Math.sin(a * 7 + T * 3) + 0.08 * Math.sin(a * 13 - T * 5)); ctx.lineTo(VP.x + Math.cos(a) * r, VP.y + Math.sin(a) * r); }
        ctx.stroke();
      }
    }
    // サイレンの赤い回転灯
    if (scene === 'play' && bp >= 64 && bp < 80) {
      const a = st.beacon;
      ctx.globalCompositeOperation = 'lighter';
      for (const o of [0, Math.PI]) {
        ctx.fillStyle = 'rgba(255,20,20,0.12)';
        ctx.beginPath(); ctx.moveTo(VP.x, 30);
        ctx.arc(VP.x, 30, 900, a + o - 0.25, a + o + 0.25); ctx.closePath(); ctx.fill();
      }
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = `rgba(255,30,30,${(0.5 + 0.5 * Math.sin(a * 2)).toFixed(3)})`;
      ctx.beginPath(); ctx.arc(VP.x, 30, 10, 0, TAU); ctx.fill();
    }
  }

  function floor(look, k) {
    ctx.fillStyle = st.ow > 0.5 ? '#170604' : '#101210';
    ctx.fillRect(-400, GROUND_Y, W + 800, H - GROUND_Y + 400);
    ctx.strokeStyle = st.ow > 0.5 ? 'rgba(150,40,20,0.5)' : 'rgba(160,180,160,0.25)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(-400, GROUND_Y); ctx.lineTo(W + 400, GROUND_Y); ctx.stroke();
  }
  function platform(p, look, k) {                            // 病院のベッド（金属の台）
    ctx.fillStyle = st.ow > 0.5 ? '#2a1410' : '#2a2e2c';
    ctx.fillRect(p.x, p.y, p.w, p.h);
    ctx.fillStyle = st.ow > 0.5 ? '#5a2a20' : '#cfd6cf';
    ctx.fillRect(p.x + 4, p.y - 4, p.w - 8, 5);
    ctx.fillStyle = '#111';
    ctx.fillRect(p.x + 6, p.y + p.h, 4, 10); ctx.fillRect(p.x + p.w - 10, p.y + p.h, 4, 10);
  }

  // ---- 弾 ----
  function bullet(b, c, k) {
    if (b.style === 'eye') {                                 // 目玉: 白目 ＋ プレイヤーを見る赤い瞳
      const p = playerXY(), a = Math.atan2(p.y - b.y, p.x - b.x);
      ctx.fillStyle = '#e8e2d8'; ctx.beginPath(); ctx.arc(b.x, b.y, b.r + 1, 0, TAU); ctx.fill();
      ctx.strokeStyle = 'rgba(150,0,0,0.7)'; ctx.lineWidth = 1; ctx.stroke();
      ctx.fillStyle = '#c0101a'; ctx.beginPath(); ctx.arc(b.x + Math.cos(a) * b.r * 0.35, b.y + Math.sin(a) * b.r * 0.35, b.r * 0.55, 0, TAU); ctx.fill();
      ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(b.x + Math.cos(a) * b.r * 0.45, b.y + Math.sin(a) * b.r * 0.45, b.r * 0.25, 0, TAU); ctx.fill();
      return;
    }
    if (b.style === 'blood') {                               // 血のしずく
      ctx.fillStyle = '#b0101a';
      ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, Math.PI); ctx.lineTo(b.x, b.y - b.r * 2.6); ctx.closePath(); ctx.fill();
      ctx.fillStyle = 'rgba(255,120,120,0.6)'; ctx.beginPath(); ctx.arc(b.x - b.r * 0.3, b.y, b.r * 0.25, 0, TAU); ctx.fill();
      return;
    }
    if (b.style === 'crawler') {                             // はうもの: 低い体 ＋ たくさんの足 ＋ 赤い目
      const d = Math.sign(b.vx) || 1, t = b.age * 30;
      ctx.strokeStyle = '#0a0a0a'; ctx.lineWidth = 2.5;
      ctx.beginPath();
      for (let i = 0; i < 4; i++) {
        const x = b.x - d * (i * 7 - 8), up = Math.sin(t + i * 1.7) * 4;
        ctx.moveTo(x, b.y); ctx.lineTo(x - d * 6, b.y - 8 + up); ctx.lineTo(x - d * 10, b.y + b.r);
      }
      ctx.stroke();
      ctx.fillStyle = '#141414'; ctx.beginPath(); ctx.ellipse(b.x, b.y, b.r * 1.4, b.r * 0.75, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = 'rgba(200,200,190,0.35)'; ctx.beginPath(); ctx.ellipse(b.x + d * b.r * 1.1, b.y - 2, b.r * 0.6, b.r * 0.55, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = '#ff2020'; ctx.fillRect(b.x + d * b.r * 1.2 - 1, b.y - 4, 3, 3); ctx.fillRect(b.x + d * b.r * 1.2 + d * 4 - 1, b.y - 3, 3, 3);
      return;
    }
    if (b.style === 'snow') {                                // 灰（サイレンのあと降ってくる）
      ctx.fillStyle = 'rgba(180,180,175,0.9)';
      ctx.fillRect(b.x - b.r, b.y - b.r * 0.6, b.r * 2, b.r * 1.2);
      return;
    }
    ctx.fillStyle = rgba(c, 1); ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, TAU); ctx.fill();
  }

  // ストーカー: 背の高い黒い影。長い腕、かたむいた頭、白く光る目。ピクッとふるえる
  function stalkerKind(b, T, k) {
    const c = bulletColor(b);
    const a = b.delay > 0 ? 1 - b.delay / b.delayMax : 1 - (b.fade || 0) / 0.6;
    const tw = Math.random() < 0.06 ? (Math.random() - 0.5) * 10 : 0, x = b.x + tw, top = GROUND_Y - b.h;
    if (b.blinkT != null && songTime - b.blinkT < 0.5) {     // ワープした跡
      ctx.fillStyle = `rgba(0,0,0,${(0.4 * (1 - (songTime - b.blinkT) / 0.5)).toFixed(3)})`;
      ctx.fillRect(x - b.w / 2 - 20 * b.dir, top, b.w, b.h);
    }
    ctx.save();
    ctx.globalAlpha = clamp01(a);
    const sw = Math.sin((b.step || 0) * 6) * 6;
    ctx.fillStyle = '#060606';
    ctx.beginPath();                                          // 体（細長い）
    ctx.moveTo(x - 9, GROUND_Y); ctx.lineTo(x - 5, top + 30); ctx.lineTo(x - 13, top + 22); ctx.lineTo(x + 13, top + 22); ctx.lineTo(x + 5, top + 30); ctx.lineTo(x + 9, GROUND_Y); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#060606'; ctx.lineWidth = 3; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x - 12, top + 24); ctx.lineTo(x - 16 + sw, top + 60); ctx.lineTo(x - 14 + sw, top + 82);   // 長い腕
    ctx.moveTo(x + 12, top + 24); ctx.lineTo(x + 16 - sw, top + 60); ctx.lineTo(x + 15 - sw, top + 82); ctx.stroke();
    ctx.lineWidth = 1.5;
    for (const s of [-1, 1]) for (let f = -1; f <= 1; f++) { ctx.beginPath(); ctx.moveTo(x + s * 15 - s * sw, top + 82); ctx.lineTo(x + s * 15 - s * sw + f * 3, top + 92); ctx.stroke(); }
    ctx.save(); ctx.translate(x, top + 12); ctx.rotate(0.35 * b.dir + Math.sin(T * 2) * 0.05);   // かたむいた頭
    ctx.beginPath(); ctx.ellipse(0, 0, 9, 13, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = rgba(c, 0.95);
    ctx.fillRect(-5 + b.dir * 2, -3, 3, 2); ctx.fillRect(2 + b.dir * 2, -3, 3, 2);
    if (st.prox > 0.55) {                                     // 近づくと顔が見える: 青白い顔、黒い目、開いた口
      const fa = (st.prox - 0.55) / 0.45;
      ctx.fillStyle = `rgba(200,205,195,${(0.9 * fa).toFixed(3)})`; ctx.beginPath(); ctx.ellipse(0, 1, 7, 11, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = `rgba(0,0,0,${fa.toFixed(3)})`;
      ctx.beginPath(); ctx.ellipse(-3, -2, 2.2, 3, 0, 0, TAU); ctx.ellipse(3, -2, 2.2, 3, 0, 0, TAU); ctx.fill();
      ctx.beginPath(); ctx.ellipse(0, 6, 2, 3.5 + 1.5 * Math.abs(Math.sin(T * 9)), 0, 0, TAU); ctx.fill();
    }
    ctx.restore();
    ctx.restore();
  }

  // 扉: 予告 = 上のわくがガタガタ ＋ 床に影 → バタン（上から一気に閉まる）
  function doorKind(b, T, k) {
    const c = bulletColor(b), x = b.x - b.w / 2;
    if (b.delay > 0) {
      const p = 1 - b.delay / b.delayMax, on = p > 0.6 || Math.floor(T * 12) % 2 === 0, j = (Math.random() - 0.5) * 4 * p;
      ctx.strokeStyle = rgba(c, on ? 0.8 : 0.3); ctx.lineWidth = 2; ctx.setLineDash([8, 6]);
      ctx.strokeRect(x + j, 0, b.w, GROUND_Y); ctx.setLineDash([]);
      ctx.fillStyle = `rgba(0,0,0,${(0.2 + 0.3 * p).toFixed(3)})`; ctx.fillRect(x, GROUND_Y - 6, b.w, 6);
      ctx.fillStyle = rgba(c, 0.8); ctx.font = `700 18px ${SERIF}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('▼', b.x + j, 20);
      return;
    }
    const drop = clamp01(b.age / 0.06), fade = b.safe ? 1 - (b.age - b.hold) / 0.3 : 1;
    const h = GROUND_Y * drop;
    ctx.globalAlpha = clamp01(fade);
    ctx.fillStyle = st.ow > 0.5 ? '#2a0f0a' : '#2b2f2c'; ctx.fillRect(x, GROUND_Y - h, b.w, h);
    ctx.strokeStyle = st.ow > 0.5 ? '#6a2a18' : '#5a605c'; ctx.lineWidth = 3; ctx.strokeRect(x + 2, GROUND_Y - h + 2, b.w - 4, h - 4);
    ctx.fillStyle = 'rgba(180,200,190,0.25)'; ctx.fillRect(x + 10, GROUND_Y - h + 40, b.w - 20, 60);   // のぞき窓
    ctx.fillStyle = '#888'; ctx.fillRect(x + b.w - 14, GROUND_Y - h * 0.45, 6, 14);
    ctx.globalAlpha = 1;
  }

  // ---- 懐中電灯（カメラの中に描く）----
  function world(T) {
    if (scene !== 'play') return;
    worldDark(T);
    whispers(T);
  }
  function worldDark(T) {
    const d = stage.dark;
    if (d > 0.01 || st.flick > 0) {
      const p = playerXY(), M = 2, PAD = 120;
      if (!st.mask) { st.mask = document.createElement('canvas'); st.mask.width = (W + PAD * 2) / M; st.mask.height = (H + PAD * 2) / M; }
      const m = st.mask.getContext('2d');
      m.setTransform(1 / M, 0, 0, 1 / M, PAD / M, PAD / M);
      m.globalCompositeOperation = 'source-over';
      m.clearRect(-PAD, -PAD, W + PAD * 2, H + PAD * 2);
      const blackout = st.flick > 0.75 || (st.flick > 0 && Math.random() < st.flick * 0.6);
      m.fillStyle = `rgba(0,0,0,${blackout ? 1 : (0.96 * d).toFixed(3)})`;
      m.fillRect(-PAD, -PAD, W + PAD * 2, H + PAD * 2);
      if (!blackout) {
        m.globalCompositeOperation = 'destination-out';
        const f = player.facing, a0 = f > 0 ? 0 : Math.PI, wob = Math.sin(T * 1.7) * 0.03;
        const LR = 520 - 220 * st.prox, sp = 0.42 - 0.14 * st.prox;   // ストーカーが近いほど、光がせまくなる
        const g = m.createRadialGradient(p.x, p.y, 20, p.x, p.y, LR);
        g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(0.75, 'rgba(0,0,0,0.85)'); g.addColorStop(1, 'rgba(0,0,0,0)');
        m.fillStyle = g;
        m.beginPath(); m.moveTo(p.x, p.y); m.arc(p.x, p.y, LR, a0 - sp + wob, a0 + sp + wob); m.closePath(); m.fill();
        const g2 = m.createRadialGradient(p.x, p.y, 10, p.x, p.y, 95);
        g2.addColorStop(0, 'rgba(0,0,0,1)'); g2.addColorStop(1, 'rgba(0,0,0,0)');
        m.fillStyle = g2; m.beginPath(); m.arc(p.x, p.y, 95, 0, TAU); m.fill();
      }
      ctx.drawImage(st.mask, -PAD, -PAD, W + PAD * 2, H + PAD * 2);
      if (st.behind) {                                         // うしろに立つもの（うっすら見える輪郭 ＋ 目）
        const bx = p.x + st.behind.side * st.behind.d, a = Math.min(1, st.behind.t / 1.2) * d;
        ctx.fillStyle = `rgba(28,28,26,${(0.85 * a).toFixed(3)})`;
        ctx.beginPath(); ctx.ellipse(bx, GROUND_Y - 100, 10, 14, 0.2, 0, TAU); ctx.fill();
        ctx.fillRect(bx - 9, GROUND_Y - 88, 18, 88);
        ctx.fillStyle = `rgba(235,235,225,${(0.9 * a).toFixed(3)})`;
        ctx.fillRect(bx - 5, GROUND_Y - 103, 3, 2); ctx.fillRect(bx + 2, GROUND_Y - 103, 3, 2);
      }
      for (const arm of st.arms) {                             // 暗やみからのびる腕（長い指）
        if (arm.len < 2) continue;
        const x0 = arm.side < 0 ? -10 : W + 10, dir = -arm.side, x1 = x0 + dir * arm.len, y = arm.y + Math.sin(T * 1.3 + arm.ph) * 6;
        ctx.strokeStyle = `rgba(150,150,140,${(0.35 * d).toFixed(3)})`; ctx.lineWidth = 7; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(x0, y); ctx.quadraticCurveTo((x0 + x1) / 2, y - 18, x1, y); ctx.stroke();
        ctx.lineWidth = 2;
        for (let f = -2; f <= 2; f++) { const cl = Math.sin(T * 4 + f + arm.ph) * 4; ctx.beginPath(); ctx.moveTo(x1, y); ctx.lineTo(x1 + dir * (18 + Math.abs(f) * -2), y + f * 6 + cl); ctx.lineTo(x1 + dir * 28, y + f * 8 + cl + 4); ctx.stroke(); }
      }
      // 照らされていない所の化け物と弾: 光る目・うっすらした点だけ見える
      ctx.globalCompositeOperation = 'lighter';
      for (const b of bullets) {
        if (b.delay > 0 && b.kind !== 'door') continue;
        if (b.kind === 'stalker') { ctx.fillStyle = 'rgba(255,255,255,0.85)'; ctx.fillRect(b.x - 4, GROUND_Y - b.h + 9, 3, 2); ctx.fillRect(b.x + 2, GROUND_Y - b.h + 9, 3, 2); }
        else if (b.style === 'crawler') { ctx.fillStyle = 'rgba(255,40,40,0.9)'; ctx.fillRect(b.x - 3, b.y - 4, 6, 3); }
        else if (!b.kind) { ctx.fillStyle = 'rgba(200,60,60,0.35)'; ctx.beginPath(); ctx.arc(b.x, b.y, b.r * 0.7, 0, TAU); ctx.fill(); }
      }
      ctx.globalCompositeOperation = 'source-over';
      if (!(st.flick > 0.75)) {                              // 懐中電灯の光（あたたかい色で、照らされた所を明るく）
        const f = player.facing, a0 = f > 0 ? 0 : Math.PI;
        const g = ctx.createRadialGradient(p.x, p.y, 10, p.x, p.y, 500);
        g.addColorStop(0, `rgba(255,240,200,${(0.22 * d).toFixed(3)})`); g.addColorStop(1, 'rgba(255,240,200,0)');
        ctx.globalCompositeOperation = 'lighter';
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.arc(p.x, p.y, 500, a0 - 0.4, a0 + 0.4); ctx.closePath(); ctx.fill();
        ctx.globalCompositeOperation = 'source-over';
      }
    }
  }

  // ささやき: 自分のすぐそばに浮かぶ赤い文字（カメラの中）
  function whispers(T) {
    if (scene !== 'play' || !st.whispers.length) return;
    const p = playerXY();
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    for (const w of st.whispers) {
      const a = w.t < 0.4 ? w.t / 0.4 : w.t > 1.5 ? 1 - (w.t - 1.5) / 0.7 : 1;
      ctx.font = `400 ${16 + w.t * 3}px ${SERIF}`;
      ctx.fillStyle = `rgba(190,20,30,${(0.85 * clamp01(a)).toFixed(3)})`;
      const j = () => (Math.random() - 0.5) * 2;
      ctx.fillText(w.text, p.x + w.dx + j(), p.y + w.dy - w.t * 8 + j());
    }
  }

  function flash(look) {
    ctx.fillStyle = `rgba(255,255,255,${(0.45 * flashT).toFixed(3)})`;
    ctx.fillRect(0, 0, W, H);
  }

  // 砂嵐を画面に重ねる（小さな絵をタイルのようにしきつめるだけ。位置を毎回ずらす）
  // 砂嵐・フィルムの粒: 200×200 の粒の絵を、前もって画面より大きく引きのばした絵にしておき、ずらして貼るだけにする
  // （毎コマ引きのばすのは重い。粒の見た目は同じ）
  function grainFill(a) {
    if (!st.grain) {
      const small = makeGrain(), c = document.createElement('canvas'); c.width = W + 400; c.height = H + 400;
      c.getContext('2d').drawImage(small, 0, 0, W + 400, H + 400);
      st.grain = c;
    }
    ctx.globalAlpha = a;
    ctx.drawImage(st.grain, -Math.round(Math.random() * 200), -Math.round(Math.random() * 200));
    ctx.globalAlpha = 1;
  }
  function makeGrain() {
    const c = document.createElement('canvas'); c.width = c.height = 200;
    const g = c.getContext('2d'), img = g.createImageData(200, 200);
    for (let i = 0; i < img.data.length; i += 4) { const v = Math.random() * 255; img.data[i] = img.data[i + 1] = img.data[i + 2] = v; img.data[i + 3] = 255; }
    g.putImageData(img, 0, 0);
    return c;
  }

  // ジャンプスケアの顔: 灰色にくすんだ細長い顔、底なしの目、裂けたように開いた口、顔にかかる黒髪。
  // 0.05秒ごとにガクガクとずれ、ときどき白黒が反転する
  function makeFace(seed) {
    let r = seed * 1e4;
    const rnd = () => ((r = (r * 16807) % 2147483647) / 2147483647);
    return {
      hair: Array.from({ length: 46 }, () => ({ x: (rnd() - 0.5) * 300, c1: (rnd() - 0.5) * 120, c2: (rnd() - 0.5) * 160, end: 80 + rnd() * 200, w: 1 + rnd() * 3 })),
      teeth: Array.from({ length: 9 }, (_, i) => ({ x: -30 + i * 7.5 + (rnd() - 0.5) * 3, h: 6 + rnd() * 10 })),
      eyeX: [(rnd() - 0.5) * 6, (rnd() - 0.5) * 6],
    };
  }
  function scareFace(t, seed) {
    if (!st.face || st.face.seed !== seed) st.face = Object.assign(makeFace(seed), { seed });
    const F = st.face, frame = Math.floor(t / 0.05);
    const p = clamp01(t / 0.3), s = 0.75 + 0.85 * easeOut(p) + (frame % 2) * 0.04, a = t < 0.5 ? 1 : 1 - (t - 0.5) / 0.25;
    ctx.save();
    ctx.globalAlpha = clamp01(a);
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
    const jx = ((frame * 37) % 7 - 3) * 6, jy = ((frame * 53) % 5 - 2) * 6;
    ctx.translate(W / 2 + jx, H * 0.46 + jy); ctx.scale(s, s * (1 + (frame % 3 === 0 ? 0.05 : 0)));
    // 顔（あごが細い、いびつな形）
    ctx.beginPath();
    ctx.moveTo(0, -175); ctx.bezierCurveTo(110, -170, 130, -40, 100, 60); ctx.bezierCurveTo(80, 140, 30, 200, 0, 205);
    ctx.bezierCurveTo(-35, 200, -85, 135, -102, 55); ctx.bezierCurveTo(-128, -45, -105, -172, 0, -175); ctx.closePath();
    const g = ctx.createRadialGradient(0, -20, 10, 0, 10, 210);
    g.addColorStop(0, '#a3a89a'); g.addColorStop(0.6, '#6b7064'); g.addColorStop(1, '#23261f');
    ctx.fillStyle = g; ctx.fill();
    ctx.save(); ctx.clip();
    grainFill(0.25);                                          // 肌のざらつき
    ctx.strokeStyle = 'rgba(40,10,20,0.35)'; ctx.lineWidth = 1;   // 浮き出た血管
    for (let i = 0; i < 10; i++) { ctx.beginPath(); ctx.moveTo((i - 5) * 22, -150); ctx.quadraticCurveTo((i - 5) * 30 + 15, -80, (i - 5) * 18, -20); ctx.stroke(); }
    ctx.restore();
    for (const sx of [-1, 1]) {                                // 目: 大きな黒い穴、まわりのくま、小さな白い点（左右で違う方を見る）
      const ex = sx * 44, ey = -35;
      const sg = ctx.createRadialGradient(ex, ey, 18, ex, ey, 52);
      sg.addColorStop(0, 'rgba(0,0,0,1)'); sg.addColorStop(1, 'rgba(20,0,10,0)');
      ctx.fillStyle = sg; ctx.beginPath(); ctx.ellipse(ex, ey, 52, 56, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = '#000'; ctx.beginPath(); ctx.ellipse(ex, ey + 2, 26, 33, sx * 0.25, 0, TAU); ctx.fill();
      ctx.fillStyle = '#f4f4f0'; ctx.beginPath(); ctx.arc(ex + F.eyeX[(sx + 1) / 2], ey + 2, 2.2, 0, TAU); ctx.fill();
      ctx.fillStyle = 'rgba(100,0,8,0.9)';                     // 血の涙
      ctx.fillRect(ex - 2 + sx * 4, ey + 30, 4, 60 * Math.min(1, t * 3)); ctx.beginPath(); ctx.arc(ex + sx * 4, ey + 30 + 60 * Math.min(1, t * 3), 4, 0, TAU); ctx.fill();
    }
    // 口: 下へ裂けるように開く ＋ 不ぞろいな歯
    const mo = 0.5 + 0.5 * p;
    ctx.fillStyle = '#050000';
    ctx.beginPath(); ctx.moveTo(-38, 70); ctx.quadraticCurveTo(0, 55, 38, 70); ctx.quadraticCurveTo(28, 70 + 110 * mo, 0, 80 + 120 * mo); ctx.quadraticCurveTo(-28, 70 + 110 * mo, -38, 70); ctx.fill();
    ctx.fillStyle = '#c9c4b0';
    for (const th of F.teeth) { ctx.beginPath(); ctx.moveTo(th.x, 66); ctx.lineTo(th.x + 3.5, 66 + th.h); ctx.lineTo(th.x + 7, 66); ctx.fill(); }
    // 顔にかかる長い黒髪
    ctx.strokeStyle = '#030303'; ctx.lineCap = 'round';
    for (const h of F.hair) {
      ctx.lineWidth = h.w;
      ctx.beginPath(); ctx.moveTo(h.x * 0.6, -190); ctx.bezierCurveTo(h.x + h.c1, -100, h.x + h.c2, 0, h.x * 1.25, h.end + Math.sin(t * 9 + h.x) * 4); ctx.stroke();
    }
    ctx.restore();
    if (frame % 4 === 1 && t < 0.4) {                         // 白黒反転のコマ
      ctx.globalCompositeOperation = 'difference'; ctx.fillStyle = 'rgba(255,255,255,0.9)'; ctx.fillRect(0, 0, W, H);
      ctx.globalCompositeOperation = 'source-over';
    }
    ctx.globalCompositeOperation = 'multiply'; ctx.fillStyle = `rgba(255,80,80,${(0.9 * clamp01(a)).toFixed(3)})`; ctx.fillRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'source-over';
    if (gfx > 0) {                                             // 横に裂けるずれ
      const R = renderScale;
      for (let i = 0; i < 5; i++) { const y = Math.random() * H, hh = 6 + Math.random() * 30; ctx.drawImage(cv, 0, y * R, W * R, hh * R, (Math.random() - 0.5) * 60, y, W, hh); }
    }
  }

  function hand(h) {                                         // 血の手形
    const a = h.t < 0.05 ? 1 : 1 - Math.max(0, h.t - 2) / 2;
    ctx.save(); ctx.translate(h.x, h.y); ctx.rotate(h.a); ctx.scale(h.s * h.flip, h.s);
    ctx.fillStyle = `rgba(120,0,6,${(0.75 * a).toFixed(3)})`;
    ctx.beginPath(); ctx.ellipse(0, 10, 26, 30, 0, 0, TAU); ctx.fill();
    for (const [x, y, l, r] of [[-22, -12, 26, -0.5], [-9, -26, 34, -0.15], [5, -28, 36, 0.05], [18, -22, 30, 0.25], [30, 8, 22, 1.1]]) {
      ctx.save(); ctx.translate(x, y); ctx.rotate(r); ctx.beginPath(); ctx.ellipse(0, -l / 2, 6, l / 2, 0, 0, TAU); ctx.fill(); ctx.restore();
    }
    ctx.fillRect(-4, 38, 4, 30 * Math.min(1, h.t)); ctx.fillRect(12, 30, 3, 20 * Math.min(1, h.t));   // たれる血
    ctx.restore();
  }

  // ---- 画面全体の演出（カメラの外）----
  function overlay() {
    const T = songTime, bp = beatPos(T);
    if (scene === 'play') {
      for (const e of st.eyes) {                              // 暗やみの目
        const open = e.t < 0.3 ? e.t / 0.3 : e.t > 2.6 ? (3 - e.t) / 0.4 : Math.abs(Math.sin(e.t * 1.3)) > 0.08 ? 1 : 0.1;
        ctx.fillStyle = `rgba(255,30,20,${(0.8 * stage.dark).toFixed(3)})`;
        for (const sx of [-1, 1]) { ctx.beginPath(); ctx.ellipse(e.x + sx * 10 * e.s, e.y, 4 * e.s, 2.5 * e.s * open, 0, 0, TAU); ctx.fill(); }
      }
      for (const d of st.drips || []) if (d.len > 1) {               // 上からたれる血（裏の世界）
        ctx.fillStyle = 'rgba(110,0,6,0.85)';
        ctx.fillRect(d.x, 0, d.w, d.len); ctx.beginPath(); ctx.arc(d.x + d.w / 2, d.len, d.w * 0.9, 0, TAU); ctx.fill();
      }
      for (const h of st.hands) hand(h);
      if (st.prox > 0.05 && gfx > 0) {                       // 近いほど砂嵐 ＋ 横のずれ
        grainFill(0.16 * st.prox * st.prox);
        const R = renderScale;
        for (let i = 0; i < Math.floor(st.prox * 4); i++) { const y = Math.random() * H, hh = 4 + Math.random() * 18; ctx.drawImage(cv, 0, y * R, W * R, hh * R, (Math.random() - 0.5) * 30 * st.prox, y, W, hh); }
      }
      if (livesLeft === 1 && running) {                       // 体力が少ない: 赤いふち ＋ DANGER
        const k2 = kickOf(bp * 2);
        const g = ctx.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, H * 0.75);
        g.addColorStop(0, 'rgba(160,0,0,0)'); g.addColorStop(1, `rgba(160,0,0,${(0.3 + 0.3 * k2).toFixed(3)})`);
        ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
        ctx.font = `700 20px ${SERIF}`; ctx.textAlign = 'left'; ctx.textBaseline = 'bottom';
        ctx.fillStyle = `rgba(255,40,40,${(0.6 + 0.4 * k2).toFixed(3)})`; ctx.fillText('DANGER', 18, H - 14);
      }
    }
    if (stage.cctv > 0.5 && scene === 'play') {               // 監視カメラ
      ctx.globalCompositeOperation = 'saturation'; ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
      ctx.globalCompositeOperation = 'multiply'; ctx.fillStyle = '#b8ffb8'; ctx.fillRect(0, 0, W, H);
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = 'rgba(0,0,0,0.25)'; for (let y = 0; y < H; y += 4) ctx.fillRect(0, y, W, 1.5);
      grainFill(0.1);
      ctx.strokeStyle = 'rgba(220,255,220,0.8)'; ctx.lineWidth = 3;
      for (const [x, y, dx, dy] of [[20, 20, 1, 1], [W - 20, 20, -1, 1], [20, H - 20, 1, -1], [W - 20, H - 20, -1, -1]]) { ctx.beginPath(); ctx.moveTo(x, y + dy * 30); ctx.lineTo(x, y); ctx.lineTo(x + dx * 30, y); ctx.stroke(); }
      ctx.font = '600 16px ui-monospace, Menlo, monospace'; ctx.textBaseline = 'top';
      ctx.fillStyle = 'rgba(220,255,220,0.9)'; ctx.textAlign = 'left';
      ctx.fillText(`CAM 0${st.cam}   WARD 13 - CORRIDOR`, 40, 36);
      const s = Math.floor(T), tm = `03:13:${String(s % 60).padStart(2, '0')} AM`;
      ctx.textAlign = 'right'; ctx.fillText(tm, W - 40, 36);
      if (Math.floor(T * 2) % 2) { ctx.fillStyle = '#ff2020'; ctx.beginPath(); ctx.arc(W - 70, H - 46, 7, 0, TAU); ctx.fill(); ctx.fillStyle = 'rgba(220,255,220,0.9)'; ctx.fillText('REC', W - 40, H - 54); }
    }
    if (st.cut > 0) grainFill(0.9);                          // カメラの切りかえ: 砂嵐
    if (gfx === 2 && scene === 'play') {                     // フィルムの粒 ＋ 下へ流れるビデオの線（画質「高」だけ）
      grainFill(0.045);
      const y = (T * 60) % (H + 80) - 40;
      ctx.fillStyle = 'rgba(255,255,255,0.03)'; ctx.fillRect(0, y, W, 22);
    }
    if (st.frozen && scene === 'play') {                     // にせのフリーズ: 固まった画面 ＋「応答していません」
      const R = renderScale;
      ctx.drawImage(st.frozen, 0, 0, st.frozen.width, st.frozen.height, 0, 0, W, H);
      ctx.fillStyle = `rgba(255,255,255,${(0.25 * clamp01(st.freeze / 0.4)).toFixed(3)})`; ctx.fillRect(0, 0, W, H);
      if (st.freeze > 0.35) {
        const x = W / 2 - 190, y = H / 2 - 70, glitchT = st.freeze > 1.05;
        ctx.fillStyle = '#f0f0f0'; ctx.fillRect(x, y, 380, 140);
        ctx.strokeStyle = '#888'; ctx.lineWidth = 1; ctx.strokeRect(x + 0.5, y + 0.5, 379, 139);
        ctx.fillStyle = '#222'; ctx.font = '600 15px system-ui, sans-serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
        ctx.fillText(glitchT ? 'Ward 13 は応答して い ま す' : 'Ward 13 は応答していません', x + 20, y + 22);
        ctx.font = '13px system-ui, sans-serif'; ctx.fillStyle = glitchT ? '#a00' : '#444';
        ctx.fillText(glitchT ? 'うしろを見て' : 'プログラムが応答するのを待っています…', x + 20, y + 54);
        ctx.fillStyle = '#e2e2e2'; ctx.fillRect(x + 260, y + 96, 100, 28); ctx.strokeRect(x + 260.5, y + 96.5, 99, 27);
        ctx.fillStyle = '#222'; ctx.textAlign = 'center'; ctx.fillText('閉じる', x + 310, y + 103);
        const a = st.freeze * 6;                                // くるくる回る読みこみ中の輪
        ctx.strokeStyle = '#3a7bd5'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(x + 40, y + 108, 10, a, a + 4.5); ctx.stroke();
      }
    }
    if (st.sub > 0 && !st.scare) {                            // 一瞬だけ見える顔（1〜3コマ）
      ctx.save(); ctx.globalAlpha = 0.6;
      scareFace(0.22, 0.37);
      ctx.restore();
    }
    if (st.scare) scareFace(st.scare.t, st.scare.seed);
  }

  // 場面の名前: 古いビデオの文字のように、ちらつきながら出る
  function banner() {
    overlay();
    const bn = fx.banner;
    if (!bn || !bn.name) { if (bn && bn.age > 3) fx.banner = null; return; }
    const e = bn.age, DUR = 3.2;
    if (e > DUR) { fx.banner = null; return; }
    const on = e > 0.5 || Math.random() < 0.5;
    const a = (e < 0.5 ? e / 0.5 : e > DUR - 0.8 ? (DUR - e) / 0.8 : 1) * (on ? 1 : 0.2);
    ctx.save();
    ctx.globalAlpha = clamp01(a);
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = `400 46px ${SERIF}`;
    if ('letterSpacing' in ctx) ctx.letterSpacing = '8px';
    ctx.fillStyle = rgba(bn.c, 0.9);
    ctx.fillText(bn.name, W / 2 + (Math.random() < 0.1 ? (Math.random() - 0.5) * 12 : 0), 130);
    if ('letterSpacing' in ctx) ctx.letterSpacing = '2px';
    ctx.font = `400 15px ${SERIF}`;
    ctx.fillStyle = 'rgba(220,220,210,0.75)';
    ctx.fillText(bn.sub, W / 2, 168);
    if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';
    ctx.restore();
  }

  // タイトル: 廊下の奥に、だれかが立っている
  // タイトル: 廊下の奥に、だれかが立っている。この画面に来るたびに、少しずつ近づいてくる
  function title(look, k, bp) {
    if (!st.titleSeen) {
      st.titleSeen = true;
      st.visits = Math.min(12, (parseInt(store.get('dodge_w13_visits') || '0', 10) || 0) + 1);
      store.set('dodge_w13_visits', String(st.visits));
    }
    const on = Math.random() > 0.04;
    if (!on) { ctx.fillStyle = 'rgba(0,0,0,0.85)'; ctx.fillRect(0, 0, W, H); }
    const n = clamp01(((st.visits || 1) - 1) / 10), s = 1 + n * 4.5;   // 1回目は奥、10回くらいで目の前
    const x = VP.x + 20 + n * 150, y = VP.y + 52 + n * (GROUND_Y - VP.y - 52);
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    ctx.fillStyle = '#000';
    ctx.fillRect(-4, -50, 8, 50);
    ctx.beginPath(); ctx.ellipse(0, -56, 5, 7, 0.3, 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    if (Math.floor(bp * 2) % 7) { ctx.fillRect(-3, -58, 2, 1.5); ctx.fillRect(1, -58, 2, 1.5); }
    ctx.restore();
  }

  THEMES.horror = {
    noTrails: true, noScanlines: true, glow: 0.8,
    clearColors: ['#d8e0d0', '#c0101a', '#888888', '#ffffff'],
    kinds: { stalker: stalkerKind, door: doorKind },
    reset, update, background, floor, platform, bullet, world, flash, banner, title,
  };
  // 曲が変わったら、この見た目のセットの絵を手放す（次に使うときに作り直す。メモリがふくらんで重くならないように）
  THEMES.horror.release = () => { freeArt(st); };
})();
