"use strict";

/* =========================================================================
   見た目のセット「exr」  —  曲⑥「ExtremeEX」のリメイク版（3分のメドレー）用
   背景・床・場面の名前・叩きつけの「EX」などは「ex」（visuals-ex.js）をそのまま使う。
   そのうえで、場面ごとに「その曲の見た目のセット」に衣がえする（場面の guest に書いたセット）:
     弾の形・ビームの飾り・発射の瞬間の演出・カメラの中の演出（暗闇など）は、その曲のセットが描く。
   弾の形（style）や、ビームの印（foot / fw / glitch …）で持ち主がはっきりしているものは、
   どの場面でも持ち主のセットが描く（最後の「全部入り」の場面で、いろいろな曲の弾がまざっても大丈夫）。
   その曲のセットだけが描く形（kinds: 鯉・波・グミのクマ・ストーカー …）は、全部のセットから集めておく。
   ========================================================================= */

(function () {
  const EX = THEMES.ex;
  // 弾の形 → それを描く見た目のセット
  const STYLE_OWNER = {
    frog: 'touhou', ironring: 'touhou', amulet: 'touhou', rice: 'touhou', big: 'touhou',
    'mai-tap': 'emperror', 'mai-each': 'emperror', 'mai-break': 'emperror', 'mai-break-big': 'emperror', 'mai-star': 'emperror', 'mai-touch': 'emperror', knife: 'emperror', doll: 'emperror',
    leaf: 'shiki', note: 'dusk', shard: 'glass', roller: 'gyro', rev: 'ex', spore: 'virus',
    eye: 'horror', blood: 'horror', crawler: 'horror',
    heart: 'candy', sprinkle: 'candy', gumdrop: 'candy', bubble: 'candy',
  };
  // ビームの印 → それを描く見た目のセット
  const laserOwner = b => b.foot ? 'touhou' : (b.glitch || b.bolt || b.crown) ? 'emperror' : (b.fw || (b.label && b.label.includes('❄'))) ? 'shiki' : b.lolli ? 'candy' : null;
  const fireOwner = b => b.foot ? 'touhou' : (b.fw || ['ink', 'aurora', 'shell', 'koi', 'wave'].includes(b.kind)) ? 'shiki' : b.lolli ? 'candy' : null;

  // いまの場面の衣がえ先（場面の guest）。プレイ中だけ
  function guestName() {
    if (scene !== 'play' || !Array.isArray(SECTIONS)) return null;
    let g = null;
    for (const s of SECTIONS) if (s.t <= songTime) g = s.guest || null; else break;
    return g;
  }
  const guest = () => { const g = guestName(); return g && THEMES[g] && g !== 'exr' ? THEMES[g] : null; };

  // ほかのセットの関数を呼ぶ（万一エラーが出ても、ゲームは止めない。コンソールに1回だけ出す）
  const warned = new Set();
  function call(th, fn, ...args) {
    if (!th || !th[fn]) return undefined;
    try { return th[fn](...args); }
    catch (e) { const key = fn + ':' + e.message; if (!warned.has(key)) { warned.add(key); console.warn('exr:', fn, e); } return undefined; }
  }

  let kinds = null;
  function allKinds() {
    if (kinds) return kinds;
    kinds = {};
    for (const [name, th] of Object.entries(THEMES)) if (name !== 'exr' && th.kinds) Object.assign(kinds, th.kinds);
    return kinds;
  }

  let lastGuest = null;
  function reset() {
    EX.reset();
    lastGuest = null;
    for (const [name, th] of Object.entries(THEMES)) if (name !== 'exr' && name !== 'ex') call(th, 'reset');
  }
  function update(dt, T, look) {
    EX.update(dt, T, look);
    const g = guest();
    if (g !== lastGuest) { lastGuest = g; }
    if (g) call(g, 'update', dt, T, look);
  }
  function bullet(b, c, k) {
    const o = STYLE_OWNER[b.style];
    const th = o ? THEMES[o] : guest();
    if (th && th.bullet && th !== THEMES.exr) { call(th, 'bullet', b, c, k); return; }
    EX.bullet(b, c, k);
  }
  function laser(b, c, T, k) {
    const o = laserOwner(b);
    if (o) return call(THEMES[o], 'laser', b, c, T, k) === true;
    const g = guest();
    return g ? call(g, 'laser', b, c, T, k) === true : false;
  }
  function fire(b) {
    const o = fireOwner(b);
    if (o) return call(THEMES[o], 'fire', b) === true;
    const g = guest();
    return g ? call(g, 'fire', b) === true : false;
  }
  function world(T, look, k) { const g = guest(); if (g) call(g, 'world', T, look, k); }
  // Malware のウイルス・ワーム・ポップアップ・天井は、いつでも Malware の見た目で
  const V = () => THEMES.virus;
  function infect(...a) { call(V(), 'infect', ...a); }
  function worm(...a) { call(V(), 'worm', ...a); }
  function popup(...a) { call(V(), 'popup', ...a); }
  function ceiling(...a) { call(V(), 'ceiling', ...a); }
  // Vertigo の場面だけは、流れる床の矢印と水準器の足場（遊ぶのに役立つ）
  function floor(look, k, bp) { const g = guestName(); if (g === 'gyro') call(THEMES.gyro, 'floor', look, k, bp); else EX.floor(look, k, bp); }
  function platform(p, look, k) { const g = guestName(); if (g === 'gyro') call(THEMES.gyro, 'platform', p, look, k); else EX.platform(p, look, k); }

  THEMES.exr = {
    noTrails: true, noScanlines: false, glow: 1.6,
    clearColors: EX.clearColors,
    get kinds() { return allKinds(); },
    reset, update, background: EX.background, floor, platform, bullet, laser, fire, world, infect, worm, popup, ceiling,
    flash: EX.flash, banner: EX.banner, title: EX.title,
  };
})();
