"use strict";

/* =========================================================================
   コイン・デイリーチャレンジ・ガチャ（スキンパーツ）
   ・コインがもらえるのは:
       0) 曲をクリアするたび（難易度・ランク・かすりの数で少しだけ。1 回 10〜80 くらい）
       1) はじめてその難易度をクリアした時 / いちばん良いランクを更新した時
       2) 実績を解除した時（★1 = 50 〜 ★5 = 1000。前に解除した実績も、あとから受けとれる）
       3) デイリーチャレンジ（1 日 3 つ、それぞれ 1 回だけ挑戦できる）と、今日のミッション（「3 回クリア」など。達成したらその場でもらえる）
     First Step と、残機が無限の回はもらえない（実績と同じ）
   ・ガチャ: 1 回 300 / 11 連 3,000 コイン。スキンパーツ（色・頭・顔・背中・跡・光）と、まれにガチャ限定スキン（2%）が出る。
     だぶったら「かけら」になり、交換所で好きなパーツ・スキンと交換できる
   ・パーツは、いま選んでいるスキンの上に重ねて着る（コレクションの「パーツ」）
   ・保存: dodge_economy
   ========================================================================= */

const E = (() => {
  let e = {};
  try { e = JSON.parse(store.get('dodge_economy') || '{}') || {}; } catch (err) { e = {}; }
  return Object.assign({ coins: 0, shards: 0, owned: {}, equip: {}, pity: 0, pulls: 0, achPaid: {}, daily: { day: '', used: {}, result: {} }, dailyStreak: 0, dailyLast: '', skinPity: 0 }, e);
})();
function saveEco() { store.set('dodge_economy', JSON.stringify(E)); updateCoinUI(); }

// ---- パーツ -------------------------------------------------------------------------------------------
const RARITY = {
  N:  { w: 60, dup: 1,  cost: 10,  name: 'N' },
  R:  { w: 30, dup: 3,  cost: 30,  name: 'R' },
  SR: { w: 9,  dup: 10, cost: 100, name: 'SR' },
  UR: { w: 1,  dup: 30, cost: 300, name: 'UR' },
};
const RARITY_ORDER = ['UR', 'SR', 'R', 'N'];
const SKIN_RATE = 2, SKIN_PITY = 120, SKIN_DUP = 100, SKIN_COST = 600;   // ガチャ限定スキン: 2%、120 回目までに必ず 1 つ、だぶりは 💎100、交換は 💎600
const PULL_COST = 300, MULTI_COST = 3000, MULTI_N = 11;
const SLOTS = [['color', '色'], ['head', '頭'], ['face', '顔'], ['back', '背中'], ['trail', '跡'], ['aura', '光']];
// 頭・顔・背中のパーツを着ると、スキンにもともとついている同じ場所の飾りは外れる
const SLOT_ACC = {
  head: ['crown', 'halo', 'horns', 'mohawk', 'phones', 'ribbon', 'ears', 'flamehair', 'headband', 'knit', 'party', 'tophat', 'bunny', 'antenna', 'chef', 'propeller', 'witch'],
  face: ['visor', 'mask', 'glasses', 'blush', 'shades', 'eyepatch', 'monocle', 'foxmask'],
  back: ['wings', 'cape', 'katana', 'scarf', 'backpack', 'guitar', 'jetpack'],
};
const PARTS = [
  // 色（服・ぼうし・くつ・光の色）
  { id: 'c_milk',     slot: 'color', r: 'N',  name: 'ミルク',       set: { body: '#f4ecdc', cap: '#c8a882', brim: '#a8885e', shoe: '#8a6a48', glow: '#fff4e0' } },
  { id: 'c_choco',    slot: 'color', r: 'N',  name: 'チョコミント', set: { body: '#6a3a20', cap: '#7fe8c8', brim: '#5ac8a8', shoe: '#3a1a0a', glow: '#9fffe0' } },
  { id: 'c_soda',     slot: 'color', r: 'N',  name: 'ソーダ',       set: { body: '#5cc8ff', cap: '#ffffff', brim: '#d8f0ff', shoe: '#2a6a9a', glow: '#9fe8ff' } },
  { id: 'c_lemon',    slot: 'color', r: 'N',  name: 'レモン',       set: { body: '#ffe066', cap: '#7ac74f', brim: '#5aa030', shoe: '#8a7a20', glow: '#fff4a0' } },
  { id: 'c_lavender', slot: 'color', r: 'N',  name: 'ラベンダー',   set: { body: '#b8a0ff', cap: '#7a5cff', brim: '#5a3fd8', shoe: '#3a2a6a', glow: '#d8c8ff' } },
  { id: 'c_mid',      slot: 'color', r: 'R',  name: 'ミッドナイト', set: { body: '#141a3a', cap: '#ffd23f', brim: '#c4a010', shoe: '#05081a', glow: '#6c7bff' } },
  { id: 'c_tropical', slot: 'color', r: 'R',  name: 'トロピカル',   set: { body: '#ff6a5a', cap: '#2fd0a0', brim: '#1aa080', shoe: '#ffd23f', glow: '#ffb08a' } },
  { id: 'c_metal',    slot: 'color', r: 'R',  name: 'メタル',       set: { body: '#8a94a8', cap: '#4a5468', brim: '#2a3448', shoe: '#2a3448', glow: '#cfe0ff' } },
  { id: 'c_gold',     slot: 'color', r: 'SR', name: 'ゴールド',     set: { body: '#ffcf2e', cap: '#fff0b8', brim: '#c49a10', shoe: '#8a6a10', glow: '#ffe066' } },
  { id: 'c_neon',     slot: 'color', r: 'SR', name: 'ネオン',       set: { body: '#ff3ea5', cap: '#111111', brim: '#000000', shoe: '#22e6ff', glow: '#ff7ad0' } },
  { id: 'c_aurora',   slot: 'color', r: 'UR', name: 'オーロラ',     set: { fx: 'rainbow', cap: '#ffffff', brim: '#e0e0e0', shoe: '#ffffff', glow: '#ffffff' } },
  // 頭
  { id: 'h_knit',     slot: 'head', r: 'N',  name: 'ニット帽',       set: { acc: 'knit', hat: '#d81e1e' } },
  { id: 'h_party',    slot: 'head', r: 'N',  name: 'パーティ帽',     set: { acc: 'party', hat: '#4dd2ff' } },
  { id: 'h_band',     slot: 'head', r: 'N',  name: '白いはちまき',   set: { acc: 'headband', band: '#ffffff' } },
  { id: 'h_tophat',   slot: 'head', r: 'R',  name: 'シルクハット',   set: { acc: 'tophat', hat: '#c8102e' } },
  { id: 'h_bunny',    slot: 'head', r: 'R',  name: 'うさみみ',       set: { acc: 'bunny', hat: '#ffffff' } },
  { id: 'h_antenna',  slot: 'head', r: 'R',  name: 'アンテナ',       set: { acc: 'antenna', hat: '#5cff9d' } },
  { id: 'h_chef',     slot: 'head', r: 'R',  name: 'コック帽',       set: { acc: 'chef' } },
  { id: 'h_prop',     slot: 'head', r: 'R',  name: 'プロペラ帽',     set: { acc: 'propeller', hat: '#3b6cf0' } },
  { id: 'h_witch',    slot: 'head', r: 'SR', name: '魔女の帽子',     set: { acc: 'witch', hat: '#2a1a4a' } },
  { id: 'h_silver',   slot: 'head', r: 'SR', name: '銀の王冠',       set: { acc: 'crown', crownColor: '#e0e8f4' } },
  { id: 'h_oni',      slot: 'head', r: 'SR', name: '鬼の角',         set: { acc: 'horns', hornColor: '#ffe0a0' } },
  { id: 'h_blueflame', slot: 'head', r: 'UR', name: '蒼炎の髪',      set: { acc: 'flamehair', flame: ['#2a6aff', '#bff4ff'] } },
  // 顔
  { id: 'f_glasses',  slot: 'face', r: 'N',  name: 'メガネ',         set: { acc: 'glasses' } },
  { id: 'f_blush',    slot: 'face', r: 'N',  name: 'ほっぺ',         set: { acc: 'blush' } },
  { id: 'f_shades',   slot: 'face', r: 'R',  name: 'サングラス',     set: { acc: 'shades' } },
  { id: 'f_patch',    slot: 'face', r: 'R',  name: '眼帯',           set: { acc: 'eyepatch' } },
  { id: 'f_monocle',  slot: 'face', r: 'R',  name: 'モノクル',       set: { acc: 'monocle' } },
  { id: 'f_ninja',    slot: 'face', r: 'R',  name: '覆面',           set: { acc: 'mask', maskColor: '#2a2a3a' } },
  { id: 'f_cyber',    slot: 'face', r: 'SR', name: 'サイバーバイザー', set: { acc: 'visor', visor: '#5cff9d' } },
  { id: 'f_fox',      slot: 'face', r: 'SR', name: 'きつねのお面',   set: { acc: 'foxmask' } },
  // 背中
  { id: 'b_pack',     slot: 'back', r: 'N',  name: 'リュック',       set: { acc: 'backpack', pack: '#e0a030' } },
  { id: 'b_scarf',    slot: 'back', r: 'N',  name: '青いマフラー',   set: { acc: 'scarf', scarf: '#3b6cf0' } },
  { id: 'b_guitar',   slot: 'back', r: 'R',  name: 'ギター',         set: { acc: 'guitar', guitar: '#d81e1e' } },
  { id: 'b_cape',     slot: 'back', r: 'R',  name: '黒いマント',     set: { acc: 'cape', cape: '#141418' } },
  { id: 'b_butterfly', slot: 'back', r: 'R', name: 'ちょうの羽',     set: { acc: 'wings', wingStyle: 'butterfly', wing: '#ff9fc4' } },
  { id: 'b_bat',      slot: 'back', r: 'SR', name: 'コウモリの羽',   set: { acc: 'wings', wingStyle: 'bat', wing: '#2a1a3a' } },
  { id: 'b_jet',      slot: 'back', r: 'SR', name: 'ジェットパック', set: { acc: 'jetpack' } },
  { id: 'b_katana',   slot: 'back', r: 'SR', name: '黒い刀',         set: { acc: 'katana', blade: '#3a3a48' } },
  { id: 'b_mech',     slot: 'back', r: 'UR', name: '機械の翼',       set: { acc: 'wings', wingStyle: 'mech', wing: '#a8b4c8' } },
  { id: 'b_light',    slot: 'back', r: 'UR', name: '光の翼',         set: { acc: 'wings', wingStyle: 'light', wing: '#9fe8ff' } },
  // 動いた跡
  { id: 't_snow',     slot: 'trail', r: 'N',  name: '雪',            set: { trail: 'snow' } },
  { id: 't_bubble',   slot: 'trail', r: 'N',  name: 'しゃぼん玉',    set: { trail: 'bubble' } },
  { id: 't_heart',    slot: 'trail', r: 'R',  name: 'ハート',        set: { trail: 'heart' } },
  { id: 't_note',     slot: 'trail', r: 'R',  name: '音符',          set: { trail: 'note' } },
  { id: 't_leaf',     slot: 'trail', r: 'R',  name: '木の葉',        set: { trail: 'leaf' } },
  { id: 't_bolt',     slot: 'trail', r: 'SR', name: '稲妻',          set: { trail: 'bolt' } },
  { id: 't_pixel',    slot: 'trail', r: 'SR', name: 'ピクセル',      set: { trail: 'pixel' } },
  { id: 't_comet',    slot: 'trail', r: 'UR', name: '流れ星',        set: { trail: 'comet' } },
  // 光（まわりの光るふち・残像）
  { id: 'a_blue',     slot: 'aura', r: 'R',  name: '青いオーラ',     set: { aura: '#4dd2ff' } },
  { id: 'a_pink',     slot: 'aura', r: 'R',  name: 'ピンクのオーラ', set: { aura: '#ff7ad0' } },
  { id: 'a_gold',     slot: 'aura', r: 'SR', name: '金のオーラ',     set: { aura: '#ffd23f' } },
  { id: 'a_echo',     slot: 'aura', r: 'SR', name: '残像',           set: { fx: 'echo' } },
  { id: 'a_rainbow',  slot: 'aura', r: 'UR', name: '虹のオーラ',     set: { aura: '#ffffff', fx: 'rainbow' } },
];
const PART_BY = Object.fromEntries(PARTS.map(p => [p.id, p]));

// スキン（base）に、パーツ（equip = { 場所: パーツの id }）を重ねる
function composeWith(base, equip) {
  const s = Object.assign({}, base, { acc: [].concat(base.acc || []) });
  for (const [slot] of SLOTS) {
    const p = PART_BY[equip[slot]];
    if (!p || !E.owned[p.id]) continue;
    const set = Object.assign({}, p.set);
    if (SLOT_ACC[slot]) {
      s.acc = s.acc.filter(a => !SLOT_ACC[slot].includes(a));
      if (set.acc) s.acc.push(set.acc);
      delete set.acc;
    }
    if (slot === 'color' && s.hair && set.cap) s.hair = set.cap;      // 髪のスキンは、ぼうしの色を髪の色に
    if (slot === 'trail') delete s.trailColor;
    Object.assign(s, set);
  }
  return s;
}
let composeCache = { key: '', val: null };
function composeSkin(base) {
  const key = base.id + '|' + JSON.stringify(E.equip);
  if (composeCache.key !== key) composeCache = { key, val: composeWith(base, E.equip) };
  return composeCache.val;
}

// ---- コイン -----------------------------------------------------------------------------------------
const CLEAR_COIN = { easy: 30, normal: 60, hard: 120, impossible: 250 };       // はじめてその難易度をクリア
const RANK_COIN = { C: 20, B: 40, A: 80, S: 150 };                             // ランク（更新した分だけ）
const RANK_MULT = { easy: 1, normal: 1.5, hard: 2, impossible: 3 };
const ACH_COIN = [0, 50, 100, 200, 500, 1000];
const PLAY_COIN = { easy: 8, normal: 15, hard: 25, impossible: 40 };            // クリアするたび（ランクで × S 2 / A 1.5 / B 1.2 / C 1）
const PLAY_RANK = { S: 2, A: 1.5, B: 1.2, C: 1 };
const grazeCoin = n => Math.min(20, Math.floor(n / 25));                       // かすり 25 回ごとに +1（最大 +20）                                  // 実績の ★ ごと
const fmt = n => n.toLocaleString('ja-JP');
const counted = () => !NOT_COUNTED.has(songBase(song));

// 解除したのに、まだ受けとっていない実績のコイン
function payAchievements() {
  let gain = 0; const names = [];
  for (const a of ACHIEVEMENTS) {
    if (!P.unlocked[a.id] || E.achPaid[a.id]) continue;
    E.achPaid[a.id] = 1; gain += ACH_COIN[a.lv] || 50; names.push(a.name);
  }
  E.coins += gain;
  return { gain, names };
}

// 1 回終わるごと（game.js の endRun から）。結果の画面に出す行を返す
function onEconomyRunEnd(kind, rec) {
  if (!runCounts() || !counted()) { if (runMods.daily) dailyFinish(kind, null); return null; }
  const lines = []; let gain = 0;
  const add = (n, text) => { n = Math.round(n); if (n > 0) { gain += n; lines.push(`${text} <b>+${fmt(n)}</b>`); } };
  if (runMods.daily) dailyFinish(kind, add);
  else {
    if (kind === 'clear' && rec.newClear) add(CLEAR_COIN[difficulty], `はじめての ${DIFFS[difficulty].label} クリア`);
    if (rec.newRank) add((RANK_COIN[rec.rank] - (rec.oldRank ? RANK_COIN[rec.oldRank] : 0)) * RANK_MULT[difficulty], `ランク ${rec.rank} を更新`);
  }
  if (kind === 'clear') {
    const r = rankOf(hitsTaken);
    add(PLAY_COIN[difficulty] * (PLAY_RANK[r] || 1), `クリア（${DIFFS[difficulty].label} · ランク ${r}）`);
    add(grazeCoin(grazes), `かすり ${grazes} 回`);
  }
  questProgress(kind, add);
  const ach = payAchievements();
  if (ach.gain) { gain += ach.gain; lines.push(`実績 ${ach.names.length} 個 <b>+${fmt(ach.gain)}</b>`); }
  E.coins += gain - ach.gain;
  saveEco();
  return gain ? { gain, lines } : null;
}
const coinGain = document.getElementById('coinGain');
function showCoinGain(c) {
  coinGain.innerHTML = (dailyResultText ? `<div class="daily-res">${dailyResultText}</div>` : '') +
    (c ? `<div class="coin-total">🪙 +${fmt(c.gain)}</div>${c.lines.map(l => `<div>${l}</div>`).join('')}` : '');
  dailyResultText = '';
}
function updateCoinUI() {
  const el = document.getElementById('coinCount');
  if (el) el.textContent = fmt(E.coins);
  document.querySelectorAll('.eco-coins').forEach(x => x.textContent = fmt(E.coins));
  document.querySelectorAll('.eco-shards').forEach(x => x.textContent = fmt(E.shards));
  const left = dailyList().filter((d, i) => !E.daily.used[i]).length, badge = document.getElementById('dailyBadge');
  if (badge) { badge.textContent = left; badge.hidden = !left; }
}

// ---- デイリーチャレンジ -------------------------------------------------------------------------------
//   日付から決まる 3 つのチャレンジ（同じ日なら、いつ開いても同じ）。それぞれ 1 回だけ挑戦できる
const TWISTS = [
  { id: 'speed',  icon: '⏩', name: '1.2 倍速',           desc: '曲も弾も 1.2 倍の速さ',               mods: { speed: 1.2 } },
  { id: 'mirror', icon: '🪞', name: '鏡の世界',           desc: '画面が左右反転（操作はそのまま）',     mods: { mirror: true } },
  { id: 'one',    icon: '💀', name: '残機 1',             desc: '1 回当たったら終わり',                 mods: { oneLife: true } },
  { id: 'dark',   icon: '🌑', name: '暗やみ',             desc: '自分のまわりしか見えない',             mods: { dark: true } },
  { id: 'big',    icon: '🎯', name: '大きな当たり判定',   desc: '当たり判定が少し大きい',               mods: { big: true } },
];
function seeded(str) {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) { h = Math.imul(h ^ str.charCodeAt(i), 3432918353); h = h << 13 | h >>> 19; }
  return () => { h = Math.imul(h ^ h >>> 16, 2246822507); h = Math.imul(h ^ h >>> 13, 3266489909); h ^= h >>> 16; return (h >>> 0) / 4294967296; };
}
const todayKey = () => localDay(new Date());
function dailyList(day = todayKey()) {
  const rnd = seeded('dodge-daily-' + day), pick = a => a[Math.floor(rnd() * a.length)];
  const pool = SONGS.filter(s => !s.variantOf && !NOT_COUNTED.has(songBase(s)));
  const songs = [];
  while (songs.length < 3 && songs.length < pool.length) { const s = pick(pool); if (!songs.includes(s)) songs.push(s); }
  const tw = TWISTS.slice().sort(() => rnd() - 0.5);
  const goal3 = pick([{ type: 'hits', n: 2 }, { type: 'graze', n: 60 }, { type: 'clear' }]);
  return [
    { stars: 1, song: songs[0], diff: 'normal', twist: null, goal: { type: 'clear' }, reward: 150 },
    { stars: 2, song: songs[1], diff: 'normal', twist: tw[0], goal: pick([{ type: 'clear' }, { type: 'hits', n: 5 }]), reward: 300 },
    { stars: 3, song: songs[2], diff: 'hard', twist: tw[1], goal: goal3, reward: 600 },
  ];
}
const goalText = g => g.type === 'hits' ? `クリア ＋ 当たり ${g.n} 回以下` : g.type === 'graze' ? `クリア ＋ かすり ${g.n} 回以上` : 'クリアする';
function dailyToday() {
  if (E.daily.day !== todayKey()) E.daily = { day: todayKey(), used: {}, result: {} };
  return E.daily;
}
const streakBonus = () => Math.min(5, Math.max(0, E.dailyStreak - 1)) * 0.1;   // 続けた日数で +10%（最大 +50%）
let dailyNow = null;                             // 挑戦中のデイリー（番号）
// 残機が無限の時は挑戦できない（使った回数も減らさない）
function dailyBlocked(i) {
  const c = dailyList()[i], keepDiff = difficulty, keepMods = runMods;
  runMods = Object.assign({ daily: true }, c.twist ? c.twist.mods : {});
  difficulty = c.diff;
  const inf = livesForRun() === Infinity;
  runMods = keepMods; difficulty = keepDiff;
  return inf;
}
function startDaily(i) {
  const D = dailyToday(), c = dailyList()[i];
  if (D.used[i] || dailyBlocked(i)) return;
  const keepDiff = difficulty;
  D.used[i] = true; dailyNow = { i }; saveEco();
  closeDaily();
  runMods = {}; difficulty = keepDiff;
  selectSong(SONGS.indexOf(c.song));
  if (typeof afterSongChange === 'function') afterSongChange();
  runMods = Object.assign({ daily: true, keepDiff }, c.twist ? c.twist.mods : {});
  difficulty = c.diff;
  start(true);
}
// デイリーの回が終わった（add は、コインを足す関数。記録しない回は null）
function dailyFinish(kind, add) {
  if (!dailyNow) return;
  const D = dailyToday(), c = dailyList()[dailyNow.i], g = c.goal;
  const win = kind === 'clear' && (g.type !== 'hits' || hitsTaken <= g.n) && (g.type !== 'graze' || grazes >= g.n);
  D.result[dailyNow.i] = win ? 'win' : 'lose';
  if (win && add) {
    const today = todayKey(), yest = localDay(new Date(Date.now() - 864e5));
    if (E.dailyLast !== today) { E.dailyStreak = E.dailyLast === yest ? E.dailyStreak + 1 : 1; E.dailyLast = today; }
    const b = streakBonus();
    add(c.reward * (1 + b), `デイリー ${'★'.repeat(c.stars)} 成功${b ? `（${E.dailyStreak} 日連続 +${Math.round(b * 100)}%）` : ''}`);
    if ([0, 1, 2].every(k => D.result[k] === 'win')) add(300, '今日のデイリーを全部達成');
  }
  dailyResultText = win ? `📅 デイリー ${'★'.repeat(c.stars)} 成功！` : `📅 デイリー ${'★'.repeat(c.stars)} 失敗…（また明日）`;
  dailyNow = null; saveEco();
}
let dailyResultText = '';
// 途中でタイトルにもどった（デイリーは失敗あつかい）
const baseShowTitle = showTitle;
showTitle = function () {
  if (dailyNow && running) { dailyToday().result[dailyNow.i] = 'lose'; dailyNow = null; saveEco(); }
  baseShowTitle();
  updateDiffUI();
};

// ---- 画面（デイリー・ガチャ・パーツ）------------------------------------------------------------------
const dailyModal = document.getElementById('dailyModal'), dailyBody = document.getElementById('dailyBody');
function openDaily() { renderDaily(); dailyModal.classList.remove('hidden'); }
function closeDaily() { dailyModal.classList.add('hidden'); }
function renderDaily() {
  const D = dailyToday(), list = dailyList(), b = streakBonus();
  const now = new Date(), next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1), mins = Math.ceil((next - now) / 60000);
  dailyBody.innerHTML = `<div class="daily-head">今日の 3 つのチャレンジ（それぞれ 1 回だけ）<br><small>のこり ${Math.floor(mins / 60)} 時間 ${mins % 60} 分で入れかわる · 連続 ${E.dailyStreak || 0} 日${b ? `（ごほうび +${Math.round(b * 100)}%）` : ''} · 3 つとも成功で +300</small></div>` +
    list.map((c, i) => {
      const res = D.result[i], used = D.used[i];
      const state = res === 'win' ? '<span class="d-win">成功 ✓</span>' : res === 'lose' || used ? '<span class="d-lose">失敗</span>' : '';
      return `<div class="daily-card${used ? ' used' : ''}">
        <div class="d-top"><span class="d-stars">${'★'.repeat(c.stars)}${'☆'.repeat(3 - c.stars)}</span><span class="d-reward">🪙 ${fmt(Math.round(c.reward * (1 + b)))}</span></div>
        <div class="d-song">♪ ${c.song.title} <span class="d-diff d-${c.diff}">${DIFFS[c.diff].label}</span></div>
        ${c.twist ? `<div class="d-twist">${c.twist.icon} <b>${c.twist.name}</b> ─ ${c.twist.desc}</div>` : '<div class="d-twist">ひねりなし</div>'}
        <div class="d-goal">目標: ${goalText(c.goal)}</div>
        ${used ? `<div class="d-state">${state}</div>` : `<button class="d-go" data-i="${i}">挑戦する（1 回だけ）</button>`}
      </div>`;
    }).join('');
  dailyBody.insertAdjacentHTML('beforeend', renderQuests());
  // 確かめは、ページの中に出す（Claude アプリなどでは confirm() が使えないので）
  dailyBody.querySelectorAll('.d-go').forEach(btn => btn.addEventListener('click', () => {
    const i = +btn.dataset.i, card = btn.parentElement;
    if (dailyBlocked(i)) { btn.outerHTML = '<div class="d-ask">残機が無限の間は挑戦できません。設定で OFF にしてください。</div>'; return; }
    btn.outerHTML = `<div class="d-ask">挑戦できるのは 1 回だけです。始めますか？<div class="d-ask-btns"><button class="d-yes">始める</button><button class="d-no">やめる</button></div></div>`;
    card.querySelector('.d-yes').addEventListener('click', () => startDaily(i));
    card.querySelector('.d-no').addEventListener('click', renderDaily);
  }));
}

// ---- 今日のミッション（かんたんな実績。1 日 3 つ、達成したらその場でコイン）------------------------------
//   数えるのは、記録する回だけ（残機が無限の回・First Step は数えない）。デイリーチャレンジの回も数える
const QUESTS = [
  { id: 'play5',   tier: 0, text: '5 回遊ぶ',                       n: 5,   key: 'plays',  reward: 60 },
  { id: 'clear3',  tier: 0, text: '曲を 3 回クリアする',            n: 3,   key: 'clears', reward: 100 },
  { id: 'graze150', tier: 0, text: 'かすりを合わせて 150 回',       n: 150, key: 'grazes', reward: 80 },
  { id: 'clear5',  tier: 1, text: '曲を 5 回クリアする',            n: 5,   key: 'clears', reward: 180 },
  { id: 'songs3',  tier: 1, text: 'ちがう曲を 3 曲クリアする',      n: 3,   key: 'songs',  reward: 160 },
  { id: 'rankA2',  tier: 1, text: 'ランク A 以上で 2 回クリア',     n: 2,   key: 'rankA',  reward: 160 },
  { id: 'graze500', tier: 1, text: 'かすりを合わせて 500 回',       n: 500, key: 'grazes', reward: 180 },
  { id: 'hard2',   tier: 2, text: 'HARD 以上で 2 回クリア',         n: 2,   key: 'hard',   reward: 250 },
  { id: 'rankS1',  tier: 2, text: 'ランク S（ノーミス）でクリア',   n: 1,   key: 'rankS',  reward: 300 },
  { id: 'clear10', tier: 2, text: '曲を 10 回クリアする',           n: 10,  key: 'clears', reward: 300 },
];
function questList(day = todayKey()) {
  const rnd = seeded('dodge-quest-' + day);
  return [0, 1, 2].map(t => { const pool = QUESTS.filter(q => q.tier === t); return pool[Math.floor(rnd() * pool.length)]; });
}
function questStats() {
  const D = dailyToday();
  if (!D.stats) D.stats = { plays: 0, clears: 0, grazes: 0, rankA: 0, rankS: 0, hard: 0, songs: {} };
  if (!D.quest) D.quest = {};
  return D.stats;
}
const questVal = (q, st) => q.key === 'songs' ? Object.keys(st.songs).length : st[q.key];
function questProgress(kind, add) {
  const st = questStats(), D = dailyToday(), clear = kind === 'clear', r = clear ? rankOf(hitsTaken) : null;
  st.plays++; st.grazes += grazes;
  if (clear) {
    st.clears++; st.songs[songBase(song)] = 1;
    if (r === 'S' || r === 'A') st.rankA++;
    if (r === 'S') st.rankS++;
    if (diffIdx(difficulty) >= diffIdx('hard')) st.hard++;
  }
  for (const q of questList()) {
    if (D.quest[q.id] || questVal(q, st) < q.n) continue;
    D.quest[q.id] = 1; add(q.reward, `ミッション「${q.text}」達成`);
  }
}
function renderQuests() {
  const st = questStats(), D = dailyToday();
  return `<div class="daily-head q-head">🎯 今日のミッション<br><small>達成したら、その場でコインがもらえる（記録する回だけ数える）</small></div>` +
    questList().map(q => {
      const v = Math.min(q.n, questVal(q, st)), done = !!D.quest[q.id];
      return `<div class="quest${done ? ' done' : ''}"><div class="q-top"><span>${done ? '✅' : '⬜'} ${q.text}</span><span class="d-reward">🪙 ${fmt(q.reward)}</span></div>
        <div class="ach-bar"><i style="width:${(100 * v / q.n).toFixed(1)}%"></i></div><small>${v} / ${q.n}</small></div>`;
    }).join('');
}

// ガチャ
const gachaModal = document.getElementById('gachaModal'), gachaBody = document.getElementById('gachaBody');
let gachaTab = 'gacha', lastPull = [];
function openGacha() { gachaTab = 'gacha'; lastPull = []; renderGacha(); gachaModal.classList.remove('hidden'); }
function closeGacha() { gachaModal.classList.add('hidden'); }
function rollRarity() {
  let x = Math.random() * 100;
  for (const r of RARITY_ORDER) { x -= RARITY[r].w; if (x < 0) return r; }
  return 'N';
}
function pullOne(minR) {
  E.pity++; E.pulls++; E.skinPity = (E.skinPity || 0) + 1;
  if (!minR && (E.skinPity >= SKIN_PITY || Math.random() * 100 < SKIN_RATE)) {        // ガチャ限定スキン
    E.skinPity = 0;
    const sk = GACHA_SKINS[Math.floor(Math.random() * GACHA_SKINS.length)], k = 'skin_' + sk.id;
    const dup = !!E.owned[k];
    E.owned[k] = (E.owned[k] || 0) + 1;
    if (dup) E.shards += SKIN_DUP;
    return { sk, dup };
  }
  let r = E.pity >= 100 ? 'UR' : rollRarity();
  if (minR && RARITY_ORDER.indexOf(r) > RARITY_ORDER.indexOf(minR)) r = minR;
  if (r === 'UR') E.pity = 0;
  const pool = PARTS.filter(p => p.r === r), p = pool[Math.floor(Math.random() * pool.length)];
  const dup = !!E.owned[p.id];
  E.owned[p.id] = (E.owned[p.id] || 0) + 1;
  if (dup) E.shards += RARITY[r].dup;
  return { p, dup };
}
function pull(n) {
  const cost = n === MULTI_N ? MULTI_COST : PULL_COST;
  if (E.coins < cost) return;
  E.coins -= cost;
  const res = [];
  for (let i = 0; i < n; i++) res.push(pullOne(n === MULTI_N && i === n - 1 && !res.some(x => x.sk || x.p.r === 'SR' || x.p.r === 'UR') ? 'SR' : null));
  saveEco();
  lastPull = res;
  const m = gachaBody.querySelector('.machine');
  if (m) { m.classList.remove('spin'); void m.offsetWidth; m.classList.add('spin'); }
  setTimeout(renderGacha, 900);
}
function partCard(p, opts = {}) {
  const own = !!E.owned[p.id];
  return `<div class="part-card r-${p.r}${own || opts.show ? '' : ' locked'}${opts.cls || ''}" data-part="${p.id}" style="${opts.delay != null ? `animation-delay:${opts.delay}s` : ''}">
    <canvas width="112" height="104"></canvas>
    <span class="p-r">${p.r}</span><span class="p-name">${own || opts.show ? p.name : '？？？'}</span>${opts.extra || ''}</div>`;
}
// ガチャ限定スキンのカード（ガチャの結果・ラインナップ・交換所）
function skinCard(sk, opts = {}) {
  return `<div class="part-card r-SKIN${opts.cls || ''}" data-gskin="${sk.id}" style="${opts.delay != null ? `animation-delay:${opts.delay}s` : ''}">
    <canvas width="112" height="104"></canvas><span class="p-r">SKIN</span><span class="p-name">${sk.name}</span>${opts.extra || ''}</div>`;
}
function drawPartCards(root, base) {
  root.querySelectorAll('[data-gskin]').forEach(el => {
    const sk = SKINS.find(k => k.id === el.dataset.gskin), cv = el.querySelector('canvas');
    if (sk && cv) drawSkinPreview(cv, sk, false);
  });
  root.querySelectorAll('.part-card').forEach(el => {
    const p = PART_BY[el.dataset.part], cv = el.querySelector('canvas');
    if (!p || !cv) return;
    const owned = E.owned[p.id]; E.owned[p.id] = owned || 1;           // 見本は、持っていなくても着せて描く
    const sk = composeWith(base || SKINS[0], { [p.slot]: p.id });
    E.owned[p.id] = owned; if (!owned) delete E.owned[p.id];
    drawSkinPreview(cv, sk, el.classList.contains('locked'));
  });
}
function renderGacha() {
  gachaModal.querySelectorAll('.col-tabs .seg-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === gachaTab));
  const head = `<div class="eco-bar">🪙 <b class="eco-coins">${fmt(E.coins)}</b> <span>💎 かけら <b class="eco-shards">${fmt(E.shards)}</b></span></div>`;
  if (gachaTab === 'gacha') {
    const owned = PARTS.filter(p => E.owned[p.id]).length;
    gachaBody.innerHTML = head + `
      <div class="machine"><div class="dome">${Array.from({ length: 14 }, (_, i) => `<i style="--h:${i * 47 % 360};--x:${(i * 37) % 80 + 6}%;--y:${(i * 53) % 60 + 25}%"></i>`).join('')}</div><div class="m-base"><div class="m-knob"></div><div class="m-slot"></div></div></div>
      <div class="g-rates">✨ ガチャ限定スキン ${SKIN_RATE}% · UR 1% · SR 9% · R 30% · N 58%<br>スキンまであと <b>${SKIN_PITY - (E.skinPity || 0)}</b> 回 · UR まであと <b>${100 - E.pity}</b> 回（必ず出る）<br>11 連は SR 以上が 1 つ必ず出る · だぶったら 💎 かけらに（N1 / R3 / SR10 / UR30 / スキン${SKIN_DUP}）</div>
      <div class="g-btns"><button class="g-pull" data-n="1" ${E.coins < PULL_COST ? 'disabled' : ''}>1 回<br><small>🪙 ${fmt(PULL_COST)}</small></button><button class="g-pull ten" data-n="${MULTI_N}" ${E.coins < MULTI_COST ? 'disabled' : ''}>${MULTI_N} 連<br><small>🪙 ${fmt(MULTI_COST)}</small></button></div>
      <div class="g-owned">パーツ ${owned} / ${PARTS.length} · 限定スキン ${GACHA_SKINS.filter(k => E.owned['skin_' + k.id]).length} / ${GACHA_SKINS.length}</div>
      ${lastPull.length ? `<div class="pull-grid">${lastPull.map((x, i) => {
        const extra = x.dup ? `<span class="p-dup">だぶり 💎+${x.sk ? SKIN_DUP : RARITY[x.p.r].dup}</span>` : '<span class="p-new">NEW</span>';
        return x.sk ? skinCard(x.sk, { delay: i * 0.12, cls: ' reveal', extra }) : partCard(x.p, { show: true, delay: i * 0.12, cls: ' reveal', extra });
      }).join('')}</div>` : ''}
      <div class="ach-group">✨ ガチャ限定スキン（コレクションの「スキン」で着がえる）</div>
      <div class="part-grid">${GACHA_SKINS.map(k => skinCard(k, { cls: E.owned['skin_' + k.id] ? '' : ' unowned', extra: E.owned['skin_' + k.id] ? '<span class="p-have">持っている</span>' : '' })).join('')}</div>`;
    gachaBody.querySelectorAll('.g-pull').forEach(b => b.addEventListener('click', () => pull(+b.dataset.n)));
    drawPartCards(gachaBody, heroSkinBase());
  } else {
    gachaBody.innerHTML = head + `<div class="g-rates">💎 かけらで、好きなパーツ・スキンと交換できます（N 10 / R 30 / SR 100 / UR 300 / スキン ${SKIN_COST}）</div>` +
      `<div class="ach-group">✨ ガチャ限定スキン</div><div class="part-grid">${GACHA_SKINS.map(k => skinCard(k, { extra: E.owned['skin_' + k.id] ? '<span class="p-have">持っている</span>' : `<button class="p-buy" data-skin="${k.id}" ${E.shards < SKIN_COST ? 'disabled' : ''}>💎 ${SKIN_COST}</button>` })).join('')}</div>` +
      SLOTS.map(([slot, label]) => `<div class="ach-group">${label}</div><div class="part-grid">${PARTS.filter(p => p.slot === slot).map(p =>
        partCard(p, { show: true, extra: E.owned[p.id] ? '<span class="p-have">持っている</span>' : `<button class="p-buy" data-id="${p.id}" ${E.shards < RARITY[p.r].cost ? 'disabled' : ''}>💎 ${RARITY[p.r].cost}</button>` })).join('')}</div>`).join('');
    gachaBody.querySelectorAll('.p-buy').forEach(b => b.addEventListener('click', () => {
      if (b.dataset.skin) {
        const k = 'skin_' + b.dataset.skin;
        if (E.shards < SKIN_COST || E.owned[k]) return;
        E.shards -= SKIN_COST; E.owned[k] = 1; saveEco(); renderGacha(); return;
      }
      const p = PART_BY[b.dataset.id], cost = RARITY[p.r].cost;
      if (E.shards < cost || E.owned[p.id]) return;
      E.shards -= cost; E.owned[p.id] = 1; saveEco(); renderGacha();
    }));
    drawPartCards(gachaBody, heroSkinBase());
  }
}

// コレクションの「パーツ」: いまのスキンに重ねるパーツを選ぶ
let partSlot = 'color';
function heroSkinBase() { return typeof baseSkin === 'function' ? baseSkin() : SKINS[0]; }
function renderParts(root) {
  const base = heroSkinBase();
  root.innerHTML = `<div class="parts-top"><canvas class="parts-preview" width="160" height="140"></canvas>
      <div class="parts-info">スキン「${base.name}」の上に、パーツを重ねて着られます。<br>パーツはガチャで手に入ります。<button class="link-btn parts-reset">パーツを全部外す</button></div></div>
    <div class="slot-tabs">${SLOTS.map(([s, l]) => `<button class="seg-btn${s === partSlot ? ' active' : ''}" data-slot="${s}">${l}${E.equip[s] && E.owned[E.equip[s]] ? ' ●' : ''}</button>`).join('')}</div>
    <div class="part-grid">
      <div class="part-card none${!E.equip[partSlot] ? ' equipped' : ''}" data-none="1"><span class="p-name">なし<br><small>スキンのまま</small></span></div>
      ${PARTS.filter(p => p.slot === partSlot).sort((a, b) => !!E.owned[b.id] - !!E.owned[a.id]).map(p => partCard(p, { cls: E.equip[partSlot] === p.id ? ' equipped' : '' })).join('')}
    </div>`;
  drawSkinPreview(root.querySelector('.parts-preview'), composeSkin(base), false);
  drawPartCards(root, base);
  root.querySelectorAll('.slot-tabs .seg-btn').forEach(b => b.addEventListener('click', () => { partSlot = b.dataset.slot; renderParts(root); }));
  root.querySelector('.parts-reset').addEventListener('click', () => { E.equip = {}; saveEco(); renderParts(root); });
  root.querySelectorAll('.part-grid .part-card').forEach(el => el.addEventListener('click', () => {
    if (el.dataset.none) delete E.equip[partSlot];
    else if (E.owned[el.dataset.part]) E.equip[partSlot] = el.dataset.part;
    else return;
    saveEco(); renderParts(root);
  }));
}

document.getElementById('dailyBtn').addEventListener('click', openDaily);
document.getElementById('dailyClose').addEventListener('click', closeDaily);
document.getElementById('gachaBtn').addEventListener('click', openGacha);
document.getElementById('gachaClose').addEventListener('click', closeGacha);
gachaModal.querySelectorAll('.col-tabs .seg-btn').forEach(b => b.addEventListener('click', () => { gachaTab = b.dataset.tab; renderGacha(); }));
for (const m of [dailyModal, gachaModal]) m.addEventListener('click', e => { if (e.target === m) m.classList.add('hidden'); });
// 開いている間は、ゲームのキー（Enter でスタート など）を止める。Esc で閉じる
window.addEventListener('keydown', e => {
  const open = [dailyModal, gachaModal].find(m => !m.classList.contains('hidden'));
  if (!open) return;
  if (e.key === 'Escape') open.classList.add('hidden');
  e.stopPropagation();
}, true);
// 前に解除した実績のコインを受けとる（はじめて開いた時など）
document.addEventListener('DOMContentLoaded', () => {
  const ach = payAchievements();
  saveEco();
  if (ach.gain) setTimeout(() => {
    const el = document.createElement('div'); el.className = 'toast';
    el.innerHTML = `<b>🪙 実績のごほうび</b><span>+${fmt(ach.gain)} コイン</span><small>解除ずみの実績 ${ach.names.length} 個ぶん</small>`;
    toastStack.appendChild(el); setTimeout(() => el.classList.add('out'), 4200); setTimeout(() => el.remove(), 4800);
  }, 600);
});
