"use strict";

/* =========================================================================
   実績とスキン（遊び続ける楽しみ）
   ・プレイの記録（回数・生きのびた時間・かすり・ジャンプなど）を dodge_progress に保存
   ・実績（ACHIEVEMENTS）を解除すると、そのスキン（SKINS）が使えるようになる
   ・タイトルの「🏆 コレクション」で、スキンを選んだり、実績を見たりできる
   ・game.js から呼ばれる: onProgressRunEnd(kind, rec)（1回終わるごと）, onProgressGraze(n)（かするたび）
   ・visuals.js が使う: heroSkin()（今のスキン）
   残機が無限の回など、runCounts() が false の回は記録しない
   ========================================================================= */

const P = (() => {
  let p = {};
  try { p = JSON.parse(store.get('dodge_progress') || '{}') || {}; } catch (e) { p = {}; }
  return Object.assign({ plays: 0, time: 0, grazeTotal: 0, jumps: 0, bestGrazeRun: 0, played: {}, streak: { base: '', n: 0 }, night: false, lastLife: false, unlocked: {}, skin: 'blue', flags: {}, songPlays: {}, lastDay: '', days: 0, bestDays: 0, clearRun: 0, sRun: 0 }, p);
})();
const localDay = d => `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
function saveProgress() { store.set('dodge_progress', JSON.stringify(P)); }

// ---- 曲の記録を数えるための道具 ----------------------------------------------------------------
const diffIdx = d => DIFF_ORDER.indexOf(d);
const allBases = () => [...new Set(SONGS.map(songBase))];
// minD 以上の難易度でクリアした曲（譜面がちがっても同じ曲は 1 曲と数える）
function clearedBases(minD = 'easy') {
  const set = new Set();
  for (const s of SONGS) if (clearsOf(s).some(d => diffIdx(d) >= diffIdx(minD))) set.add(songBase(s));
  return set;
}
// minD 以上の難易度で、S ランク（ノーミス）を取った曲
function fullDodgeBases(minD = 'easy') {
  const set = new Set();
  for (const s of SONGS) for (const d of DIFF_ORDER) if (diffIdx(d) >= diffIdx(minD) && bestRankOf(s, d) === 'S') set.add(songBase(s));
  return set;
}
// A ランク以上を取った「曲×難易度」の数
function rankACount() {
  let n = 0;
  for (const s of SONGS) for (const d of DIFF_ORDER) { const r = bestRankOf(s, d); if (r === 'S' || r === 'A') n++; }
  return n;
}
const clearedSong = (id, minD = 'easy') => SONGS.some(s => (s.id === id || songBase(s) === id) && clearsOf(s).some(d => diffIdx(d) >= diffIdx(minD)));

// 曲（譜面の id でも、曲の id でもよい）を minD 以上の難易度で、ランク rank 以上を取ったか
function rankedSong(id, minD = 'easy', rank = 'S') {
  return SONGS.some(s => (s.id === id || songBase(s) === id) &&
    DIFF_ORDER.some(d => diffIdx(d) >= diffIdx(minD) && RANKS.indexOf(bestRankOf(s, d) || 'Z') !== -1 && RANKS.indexOf(bestRankOf(s, d)) <= RANKS.indexOf(rank)));
}
// 1 回のプレイでの、そのときだけの条件（ジャンプせずにクリア など）は P.flags に覚えておく
const flag = k => !!(P.flags && P.flags[k]);
const skinsOpen = () => SKINS.filter(sk => skinUnlocked(sk)).length;

// ---- 実績 -----------------------------------------------------------------------------------------
//   test() が true になったら解除。progress() は「いまいくつ / いくつで解除」（数える実績だけ）
//   lv = むずかしさ（★1〜5）、secret = 解除するまで名前と条件をかくす
const ACH_GROUPS = [
  ['はじめ・つづける', [
    { id: 'first_clear', lv: 1, name: 'はじめの一歩',     desc: 'どれか 1 曲をクリアする',                   test: () => clearedBases().size >= 1 },
    { id: 'traveler',    lv: 1, name: '旅人',             desc: 'すべての曲を 1 回ずつ遊ぶ',                  progress: () => [allBases().filter(b => P.played[b]).length, allBases().length] },
    { id: 'plays50',     lv: 1, name: '常連さん',         desc: '50 回プレイする',                           progress: () => [P.plays, 50] },
    { id: 'plays200',    lv: 2, name: 'ここに住んでいる',  desc: '200 回プレイする',                          progress: () => [P.plays, 200] },
    { id: 'plays500',    lv: 3, name: '家主',             desc: '500 回プレイする',                          progress: () => [P.plays, 500] },
    { id: 'plays1000',   lv: 4, name: '千本ノック',       desc: '1000 回プレイする',                         progress: () => [P.plays, 1000] },
    { id: 'time1h',      lv: 2, name: 'サバイバー',       desc: '合計 1 時間生きのびる',                      progress: () => [Math.floor(P.time / 60), 60], unit: '分' },
    { id: 'time3h',      lv: 3, name: 'タフガイ',         desc: '合計 3 時間生きのびる',                      progress: () => [Math.floor(P.time / 60), 180], unit: '分' },
    { id: 'time10h',     lv: 4, name: '不死身',           desc: '合計 10 時間生きのびる',                     progress: () => [Math.floor(P.time / 60), 600], unit: '分' },
    { id: 'streak10',    lv: 2, name: 'あきらめない',     desc: '同じ曲を 10 回続けて遊ぶ',                   progress: () => [P.streak.n, 10] },
    { id: 'favorite',    lv: 2, name: 'お気に入り',       desc: '1 つの曲を合計 30 回遊ぶ',                   progress: () => [Math.max(0, ...Object.values(P.songPlays || {})), 30] },
    { id: 'days3',       lv: 1, name: '三日坊主じゃない', desc: '3 日続けて遊ぶ',                             progress: () => [P.bestDays || 0, 3], unit: '日' },
    { id: 'days7',       lv: 2, name: '毎日の習慣',       desc: '7 日続けて遊ぶ',                             progress: () => [P.bestDays || 0, 7], unit: '日' },
    { id: 'days30',      lv: 4, name: '皆勤賞',           desc: '30 日続けて遊ぶ',                            progress: () => [P.bestDays || 0, 30], unit: '日' },
    { id: 'jumps',       lv: 1, name: 'ジャンプ好き',     desc: '合計 1000 回ジャンプする',                   progress: () => [P.jumps, 1000] },
    { id: 'jumps10k',    lv: 3, name: 'トランポリン',     desc: '合計 10000 回ジャンプする',                  progress: () => [P.jumps, 10000] },
  ]],
  ['クリア', [
    { id: 'clear10',     lv: 2, name: 'コレクター',       desc: '10 曲クリアする',                            progress: () => [clearedBases().size, 10] },
    { id: 'clear_all',   lv: 3, name: '全曲制覇',         desc: 'すべての曲をクリアする',                     progress: () => [clearedBases().size, allBases().length] },
    { id: 'charts_all',  lv: 4, name: '譜面マニア',       desc: 'すべての譜面（旧譜面・真もふくむ）をクリアする', progress: () => [SONGS.filter(s => clearsOf(s).length).length, SONGS.length] },
    { id: 'normal5',     lv: 2, name: '腕に覚えあり',     desc: 'NORMAL 以上で 5 曲クリアする',               progress: () => [clearedBases('normal').size, 5] },
    { id: 'normal_all',  lv: 3, name: '一人前',           desc: 'NORMAL 以上で全曲クリアする',                progress: () => [clearedBases('normal').size, allBases().length] },
    { id: 'hard1',       lv: 2, name: '本気モード',       desc: 'HARD 以上でクリアする',                      test: () => clearedBases('hard').size >= 1 },
    { id: 'hard10',      lv: 3, name: '鉄人',             desc: 'HARD 以上で 10 曲クリアする',                progress: () => [clearedBases('hard').size, 10] },
    { id: 'hard_all',    lv: 4, name: '鋼の意志',         desc: 'HARD 以上で全曲クリアする',                  progress: () => [clearedBases('hard').size, allBases().length] },
    { id: 'imp1',        lv: 4, name: '不可能を可能に',   desc: 'IMPOSSIBLE でクリアする',                    test: () => clearedBases('impossible').size >= 1 },
    { id: 'imp5',        lv: 5, name: '伝説',             desc: 'IMPOSSIBLE で 5 曲クリアする',               progress: () => [clearedBases('impossible').size, 5] },
    { id: 'imp10',       lv: 5, name: '神話',             desc: 'IMPOSSIBLE で 10 曲クリアする',              progress: () => [clearedBases('impossible').size, 10] },
    { id: 'imp_all',     lv: 5, name: '神',               desc: 'IMPOSSIBLE で全曲クリアする',                progress: () => [clearedBases('impossible').size, allBases().length] },
    { id: 'four_diff',   lv: 4, name: 'フルコース',       desc: '1 つの譜面を、4 つの難易度すべてでクリアする', test: () => SONGS.some(s => clearsOf(s).length === 4) },
    { id: 'clear_run10', lv: 3, name: '負け知らず',       desc: 'ゲームオーバーにならずに 10 回続けてクリアする', progress: () => [P.clearRun || 0, 10] },
    { id: 'last_life',   lv: 2, name: '首の皮一枚',       desc: '残機 1 でクリアする（EASY〜HARD）',          test: () => P.lastLife },
  ]],
  ['ランク', [
    { id: 'fd1',         lv: 2, name: 'FULL DODGE',       desc: '1 回も当たらずにクリアする（S ランク）',     test: () => fullDodgeBases().size >= 1 },
    { id: 'fd5',         lv: 3, name: '完璧主義',         desc: '5 曲で S ランクを取る',                      progress: () => [fullDodgeBases().size, 5] },
    { id: 'fd10',        lv: 4, name: '無傷の旅',         desc: '10 曲で S ランクを取る',                     progress: () => [fullDodgeBases().size, 10] },
    { id: 'fd_all',      lv: 5, name: 'かすり傷ひとつない', desc: '全曲で S ランクを取る',                    progress: () => [fullDodgeBases().size, allBases().length] },
    { id: 'fd_hard',     lv: 4, name: '無傷の伝説',       desc: 'HARD 以上で S ランクを取る',                 test: () => fullDodgeBases('hard').size >= 1 },
    { id: 'fd_hard5',    lv: 5, name: '影',               desc: 'HARD 以上で 5 曲 S ランクを取る',            progress: () => [fullDodgeBases('hard').size, 5] },
    { id: 'rankA20',     lv: 3, name: '優等生',           desc: 'A ランク以上を 20 個取る（曲×難易度）',      progress: () => [rankACount(), 20] },
    { id: 'rankA50',     lv: 4, name: '首席',             desc: 'A ランク以上を 50 個取る（曲×難易度）',      progress: () => [rankACount(), 50] },
    { id: 's_run3',      lv: 4, name: '三連続 S',         desc: '3 回続けて S ランクでクリアする',            progress: () => [P.sRun || 0, 3] },
  ]],
  ['かすり', [
    { id: 'graze50',     lv: 1, name: 'かすり傷',         desc: '1 回のプレイで 50 回かする',                 progress: () => [P.bestGrazeRun, 50] },
    { id: 'graze200',    lv: 2, name: '紙一重',           desc: '1 回のプレイで 200 回かする',                progress: () => [P.bestGrazeRun, 200] },
    { id: 'graze400',    lv: 4, name: '炎の中を歩く',     desc: '1 回のプレイで 400 回かする',                progress: () => [P.bestGrazeRun, 400] },
    { id: 'graze2000',   lv: 2, name: 'かすりの達人',     desc: '合計 2000 回かする',                         progress: () => [P.grazeTotal, 2000] },
    { id: 'graze10000',  lv: 3, name: 'かすりの鬼',       desc: '合計 10000 回かする',                        progress: () => [P.grazeTotal, 10000] },
    { id: 'graze30000',  lv: 4, name: 'かすりの神',       desc: '合計 30000 回かする',                        progress: () => [P.grazeTotal, 30000] },
    { id: 'tightrope',   lv: 3, name: '綱渡り',           desc: '100 回以上かすって、S ランクでクリアする',    test: () => !!P.tightrope },
    { id: 'tight_hard',  lv: 5, name: '刃の上で踊る',     desc: 'HARD 以上で、150 回以上かすって S ランクでクリアする', test: () => flag('tightHard') },
  ]],
  ['しばり', [
    { id: 'nojump',      lv: 3, name: '地に足をつけて',   desc: 'NORMAL 以上で、1 回もジャンプせずにクリアする',             test: () => flag('noJump') },
    { id: 'nojump_s',    lv: 5, name: '大地の守り人',     desc: 'HARD 以上で、1 回もジャンプせずに S ランクでクリアする',  test: () => flag('noJumpS') },
    { id: 'jumpy',       lv: 2, name: 'ぴょんぴょん',     desc: '1 回のプレイで 300 回ジャンプしてクリアする', test: () => flag('jumpy') },
    { id: 'nopause',     lv: 3, name: '一気通貫',         desc: '3 分ある曲を、HARD 以上でポーズせずにクリアする', test: () => flag('noPauseLong') },
    { id: 'default_s',   lv: 3, name: '初心忘るべからず', desc: '「いつもの」スキンで、HARD 以上の S ランクを取る', test: () => flag('defaultS') },
  ]],
  ['曲ごと', [
    { id: 'fs_s',        lv: 1, name: 'おさらい完了',     desc: 'First Step で S ランクを取る',               test: () => rankedSong('firststep') },
    { id: 'emperor',     lv: 3, name: '皇帝を倒せ',       desc: 'the EmpErroR を HARD 以上でクリアする',      test: () => clearedSong('emperror', 'hard') },
    { id: 'emp_ap',      lv: 4, name: 'ALL PERFECT',      desc: 'the EmpErroR で S ランクを取る',             test: () => rankedSong('emperror') },
    { id: 'unk_hard',    lv: 3, name: 'Spell Card Get!!', desc: 'Re:Unknown X を HARD 以上でクリアする',      test: () => clearedSong('unknown', 'hard') },
    { id: 'mora_hard',   lv: 3, name: '時を止めて',       desc: 'モラトリウムを HARD 以上でクリアする',       test: () => clearedSong('moratorium', 'hard') },
    { id: 'seg_s',       lv: 4, name: '割れないガラス',   desc: 'segment で S ランクを取る',                  test: () => rankedSong('segment') },
    { id: 'vert_hard',   lv: 3, name: 'めまい知らず',     desc: 'Vertigo を HARD 以上でクリアする',           test: () => clearedSong('vertigo', 'hard') },
    { id: 'ex',          lv: 3, name: 'EXTREME',          desc: 'ExtremeEX を NORMAL 以上でクリアする',       test: () => clearedSong('extremeex', 'normal') },
    { id: 'ex_imp',      lv: 5, name: 'EXTREME OVERDRIVE', desc: 'ExtremeEX を IMPOSSIBLE でクリアする',      test: () => clearedSong('extremeex', 'impossible') },
    { id: 'mal_hard',    lv: 3, name: 'デバッグ完了',     desc: 'Malware を HARD 以上でクリアする',           test: () => clearedSong('malware', 'hard') },
    { id: 'abyss',       lv: 2, name: '深淵の底へ',       desc: 'Abyss をクリアする',                         test: () => clearedSong('abyss') },
    { id: 'abyss_s',     lv: 4, name: '深海の静寂',       desc: 'Abyss で S ランクを取る',                    test: () => rankedSong('abyss') },
    { id: 'ward_hard',   lv: 3, name: '生還',             desc: 'Ward 13 を HARD 以上でクリアする',           test: () => clearedSong('ward13', 'hard') },
    { id: 'prism',       lv: 2, name: '光の画家',         desc: 'Prism をクリアする',                         test: () => clearedSong('prism') },
    { id: 'prism_s',     lv: 4, name: '最高傑作',         desc: 'Prism で S ランクを取る',                    test: () => rankedSong('prism') },
    { id: 'shiki',       lv: 2, name: '四季めぐり',       desc: 'Shiki をクリアする',                         test: () => clearedSong('shiki') },
    { id: 'shiki_hard',  lv: 3, name: '一期一会',         desc: 'Shiki を HARD 以上でクリアする',             test: () => clearedSong('shiki', 'hard') },
    { id: 'candy_hard',  lv: 3, name: '甘くない',         desc: 'Candy Pop Parade を HARD 以上でクリアする',  test: () => clearedSong('candy', 'hard') },
    { id: 'tect_hard',   lv: 3, name: '震度 7',           desc: 'TECTONIC を HARD 以上でクリアする',          test: () => clearedSong('tectonic', 'hard') },
    { id: 'ov_s',        lv: 4, name: 'スタンディングオベーション', desc: 'Grand Overture で S ランクを取る', test: () => rankedSong('overture') },
    { id: 'ongeki_hard', lv: 3, name: 'ボコボコにされない', desc: '怨撃を HARD 以上でクリアする',             test: () => clearedSong('ongeki', 'hard') },
    { id: 'onshin',      lv: 3, name: '真・怨撃',         desc: '怨撃の「真」の譜面をクリアする',             test: () => clearedSong('ongeki-shin') },
    { id: 'shin_imp',    lv: 5, name: 'YOU ARE A SUPER SHOOTER!!', desc: '怨撃・真を IMPOSSIBLE でクリアする', test: () => clearedSong('ongeki-shin', 'impossible') },
    { id: 'echo_s',      lv: 4, name: 'こだまの先へ',     desc: 'Echoes で S ランクを取る',                   test: () => rankedSong('echoes') },
    { id: 'pit',         lv: 2, name: 'モッシュの洗礼',   desc: 'Circle Pit をクリアする',                    test: () => clearedSong('circlepit') },
    { id: 'pit_imp',     lv: 5, name: 'サークルの中心で', desc: 'Circle Pit を IMPOSSIBLE でクリアする',      test: () => clearedSong('circlepit', 'impossible') },
    { id: 'phoenix',     lv: 3, name: '不死鳥',           desc: 'And Revive The Melody を HARD 以上でクリアする', test: () => clearedSong('revive', 'hard') },
    { id: 'revive_imp',  lv: 5, name: '旋律よ、よみがえれ', desc: 'And Revive The Melody を IMPOSSIBLE でクリアする', test: () => clearedSong('revive', 'impossible') },
  ]],
  ['ひみつ', [
    { id: 'night',       lv: 1, secret: true, name: '夜ふかし',     desc: '夜中の 0〜4 時に遊ぶ',                     test: () => P.night },
    { id: 'morning',     lv: 1, secret: true, name: '朝活',         desc: '朝の 5〜7 時に遊ぶ',                       test: () => flag('morning') },
    { id: 'oops',        lv: 1, secret: true, name: 'ごめんなさい', desc: '始まって 10 秒以内にゲームオーバーになる',  test: () => flag('oops') },
    { id: 'almost',      lv: 2, secret: true, name: 'あと少しだった', desc: '曲の最後の 5 秒でゲームオーバーになる',  test: () => flag('almost') },
    { id: 'lucky7',      lv: 2, secret: true, name: 'ラッキーセブン', desc: 'ちょうど 7 回当たってクリアする',          test: () => flag('lucky7') },
  ]],
  ['コレクション', [
    { id: 'skins10',     lv: 3, name: 'おしゃれさん',     desc: 'スキンを 10 個使えるようにする',             progress: () => [skinsOpen(), 10] },
    { id: 'skins_all',   lv: 5, name: 'クローゼット満杯', desc: 'スキンをすべて使えるようにする',             progress: () => [skinsOpen(), SKINS.length] },
    { id: 'complete',    lv: 5, name: 'コンプリート',     desc: 'ほかの実績をすべて解除する',                 progress: () => [ACHIEVEMENTS.filter(x => x.id !== 'complete' && P.unlocked[x.id]).length, ACHIEVEMENTS.length - 1] },
  ]],
];
const ACHIEVEMENTS = ACH_GROUPS.flatMap(([g, list]) => list.map(a => Object.assign(a, { g })));
const achDone = a => a.test ? a.test() : (([v, n]) => v >= n)(a.progress());

// ---- スキン（実績で使えるようになる）----------------------------------------------------------------
//   色: body 服 / cap ぼうし / brim つば / skin 顔 / shoe くつ / glow まわりの光
//   acc: 頭の飾り（crown 王冠 / halo 天使の輪 / horns 角 / mohawk モヒカン / phones ヘッドホン / ribbon リボン / ears ねこみみ）
//   trail: 動いた跡（spark 火花 / rainbow 虹 / ember 火の粉 / bubble 泡 / petal 花びら / star 星）
const SKINS = [
  { id: 'blue',    name: 'いつもの',     body: '#3b6cf0', cap: '#e24b4a', brim: '#c43a39', skin: '#f4c9a0', shoe: '#5a3a22', glow: '#7fb4ff' },
  { id: 'red',     name: 'レッド',       body: '#e24b4a', cap: '#3b6cf0', brim: '#2c54c4', skin: '#f4c9a0', shoe: '#3a2a22', glow: '#ff9a8a', need: 'first_clear' },
  { id: 'mint',    name: 'ミント',       body: '#2fc7a0', cap: '#fff3c4', brim: '#e8d890', skin: '#f4d2b0', shoe: '#2e5a50', glow: '#8affd8', need: 'plays50' },
  { id: 'night',   name: 'ナイト',       body: '#2a2350', cap: '#7a5cff', brim: '#5a3fd8', skin: '#e9c4a4', shoe: '#140f28', glow: '#a48cff', need: 'time1h' },
  { id: 'forest',  name: '旅人',         body: '#4f8a3a', cap: '#8a5a2e', brim: '#6a4220', skin: '#f0c49a', shoe: '#4a3020', glow: '#b6ff8a', need: 'traveler' },
  { id: 'spark',   name: 'スパーク',     body: '#ffcf2e', cap: '#222222', brim: '#111111', skin: '#f4c9a0', shoe: '#333333', glow: '#ffe066', trail: 'spark', need: 'graze200' },
  { id: 'neon',    name: 'ネオン',       body: '#ff3ea5', cap: '#22e6ff', brim: '#14b8cc', skin: '#ffe0f0', shoe: '#2a0f30', glow: '#ff7ad0', trail: 'rainbow', need: 'graze2000' },
  { id: 'ghost',   name: 'ゴースト',     body: '#e8eef8', cap: '#c8d4ea', brim: '#a8b8d4', skin: '#ffffff', shoe: '#b8c4dc', glow: '#ffffff', alpha: 0.75, need: 'fd1' },
  { id: 'angel',   name: '天使',         body: '#ffffff', cap: '#ffe9a8', brim: '#f0d080', skin: '#fde3cc', shoe: '#e8dcc0', glow: '#fff4c0', acc: 'halo', trail: 'star', need: 'fd5' },
  { id: 'devil',   name: '悪魔',         body: '#7a0f1e', cap: '#2a0a10', brim: '#1a0508', skin: '#f2b8a0', shoe: '#1a0508', glow: '#ff3b5c', acc: 'horns', trail: 'ember', need: 'imp1' },
  { id: 'king',    name: 'キング',       body: '#d9a520', cap: '#b8282e', brim: '#8e1c22', skin: '#f4c9a0', shoe: '#5a3a10', glow: '#ffe28a', acc: 'crown', need: 'clear_all' },
  { id: 'emperor', name: 'エンペラー',   body: '#4a1a6a', cap: '#d9a520', brim: '#a67c10', skin: '#efc2a2', shoe: '#1e0a2a', glow: '#c77dff', acc: 'crown', need: 'emperor' },
  { id: 'dj',      name: 'DJ',           body: '#1c1c24', cap: '#ff4fa3', brim: '#cc2f80', skin: '#e8b890', shoe: '#ff4fa3', glow: '#ff7ad0', acc: 'phones', need: 'hard10' },
  { id: 'phoenix', name: '不死鳥',       body: '#ff6a1a', cap: '#ffd23f', brim: '#e0a810', skin: '#ffd8b0', shoe: '#7a2a08', glow: '#ffb05c', trail: 'ember', need: 'phoenix' },
  { id: 'punk',    name: 'パンク',       body: '#141414', cap: '#ff2e3a', brim: '#b81e28', skin: '#f0c4a0', shoe: '#ff2e3a', glow: '#ff5c66', acc: 'mohawk', need: 'pit' },
  { id: 'prism',   name: 'プリズム',     body: '#f4efe6', cap: '#9fb4ff', brim: '#7a90e0', skin: '#fde6d0', shoe: '#8a7aa0', glow: '#ffffff', trail: 'rainbow', need: 'prism' },
  { id: 'abyss',   name: '深海',         body: '#0f2a5a', cap: '#2fd0ff', brim: '#1a9cc4', skin: '#d8e8f4', shoe: '#08142a', glow: '#4dd2ff', trail: 'bubble', need: 'abyss' },
  { id: 'cat',     name: 'ねこ',         body: '#f2a65a', cap: '#f2a65a', brim: '#d98a3e', skin: '#fde3cc', shoe: '#8a5a2e', glow: '#ffd2a0', acc: 'ears', need: 'plays500' },
  { id: 'flame',   name: 'ほのお',       body: '#d81e1e', cap: '#ff8a1a', brim: '#e06a00', skin: '#ffd0b0', shoe: '#3a0808', glow: '#ff6a1a', trail: 'ember', need: 'graze400' },
  { id: 'ice',     name: 'こおり',       body: '#bfefff', cap: '#5cc8ff', brim: '#3aa8e0', skin: '#f0f8ff', shoe: '#6a9ac4', glow: '#d8f6ff', trail: 'star', alpha: 0.9, need: 'hard_all' },
  { id: 'shadow',  name: '影',           body: '#0a0a12', cap: '#1a1a26', brim: '#000000', skin: '#2a2a3a', shoe: '#000000', glow: '#8a5cff', alpha: 0.85, need: 'fd_hard5' },
  { id: 'galaxy',  name: '銀河',         body: '#1a1050', cap: '#c77dff', brim: '#8a4cd8', skin: '#e8dcff', shoe: '#0a0828', glow: '#9f8cff', acc: 'halo', trail: 'star', need: 'imp10' },
  { id: 'legend',  name: 'レジェンド',   body: '#ffd23f', cap: '#ffffff', brim: '#e0e0e0', skin: '#fde6d0', shoe: '#c49a10', glow: '#ffffff', acc: 'crown', trail: 'rainbow', need: 'complete' },
  { id: 'sakura',  name: 'さくら',       body: '#ff9fc4', cap: '#ffffff', brim: '#f0d8e0', skin: '#fde3d4', shoe: '#a0506a', glow: '#ffc4dc', acc: 'ribbon', trail: 'petal', need: 'shiki' },
];
const achById = id => ACHIEVEMENTS.find(a => a.id === id);
const skinUnlocked = s => !s.need || !!P.unlocked[s.need];
function heroSkin() {
  const s = SKINS.find(k => k.id === P.skin);
  return s && skinUnlocked(s) ? s : SKINS[0];
}

// ---- 解除の判定 ----------------------------------------------------------------------------------
function checkAchievements() {
  const fresh = [];
  for (let more = true; more;) {                 // 解除したことで、ほかの実績（スキンの数・コンプリート）が解除されることもある
    more = false;
    for (const a of ACHIEVEMENTS) {
      if (P.unlocked[a.id]) continue;
      let ok = false;
      try { ok = achDone(a); } catch (e) { ok = false; }
      if (ok) { P.unlocked[a.id] = Date.now(); fresh.push(a); more = true; }
    }
  }
  if (fresh.length) { saveProgress(); updateCollectionCount(); }
  return fresh;
}
const skinFor = a => SKINS.find(s => s.need === a.id);

// 1 回終わるごと（game.js の endRun から）
function onProgressRunEnd(kind, rec) {
  if (!runCounts()) return [];
  const base = songBase(song);
  P.plays++;
  P.time += elapsed;
  P.grazeTotal += grazes;
  P.jumps += runJumps;
  P.bestGrazeRun = Math.max(P.bestGrazeRun, grazes);
  P.played[base] = 1;
  P.streak = P.streak.base === base ? { base, n: P.streak.n + 1 } : { base, n: 1 };
  P.songPlays[base] = (P.songPlays[base] || 0) + 1;
  const now = new Date(), h = now.getHours(), day = localDay(now);
  if (P.lastDay !== day) {                       // 続けて遊んだ日数
    P.days = P.lastDay === localDay(new Date(now.getTime() - 864e5)) ? P.days + 1 : 1;
    P.lastDay = day; P.bestDays = Math.max(P.bestDays, P.days);
  }
  if (h >= 0 && h < 4) P.night = true;
  const F = P.flags, clear = kind === 'clear', S = rec.rank === 'S', hardUp = diffIdx(difficulty) >= diffIdx('hard');
  if (h >= 5 && h < 7) F.morning = true;
  if (clear && livesLeft === 1 && startLives > 1) P.lastLife = true;
  if (clear && S && grazes >= 100) P.tightrope = true;
  if (clear && S && hardUp && grazes >= 150) F.tightHard = true;
  if (clear && runJumps === 0 && diffIdx(difficulty) >= diffIdx('normal')) F.noJump = true;
  if (clear && S && runJumps === 0 && hardUp) F.noJumpS = true;
  if (clear && runJumps >= 300) F.jumpy = true;
  if (clear && hardUp && runPauses === 0 && SONG_END >= 170) F.noPauseLong = true;
  if (clear && S && hardUp && heroSkin().id === 'blue') F.defaultS = true;
  if (clear && hitsTaken === 7) F.lucky7 = true;
  if (!clear && elapsed < 10) F.oops = true;
  if (!clear && SONG_END - songTime < 5) F.almost = true;
  P.clearRun = clear ? (P.clearRun || 0) + 1 : 0;
  P.sRun = clear && S ? (P.sRun || 0) + 1 : 0;
  saveProgress();
  const fresh = checkAchievements();
  for (const a of fresh) toast(a);
  return fresh;
}
// かするたび（1 回のプレイでの数の実績は、その場で解除）
function onProgressGraze(n) {
  if (!runCounts() || (n !== 50 && n !== 200 && n !== 400)) return;
  if (n > P.bestGrazeRun) P.bestGrazeRun = n;
  for (const a of checkAchievements()) toast(a);
}

// ---- お知らせ（右上に出て、少しして消える）----------------------------------------------------------
const toastStack = document.getElementById('toastStack');
function toast(a) {
  const sk = skinFor(a), el = document.createElement('div');
  while (toastStack.children.length >= 3) toastStack.firstChild.remove();   // 一度にたくさん解除しても、出すのは 3 つまで
  el.className = 'toast';
  el.innerHTML = `<b>🏆 実績解除</b><span>${a.name}</span>` + (sk ? `<small>スキン「${sk.name}」が使えるようになった</small>` : '');
  toastStack.appendChild(el);
  setTimeout(() => el.classList.add('out'), 3600);
  setTimeout(() => el.remove(), 4200);
}
// 結果の画面: この回に解除した実績
const unlockList = document.getElementById('unlockList');
function showUnlocks(list) {
  unlockList.innerHTML = (list || []).map(a => {
    const sk = skinFor(a);
    return `<div class="unlock">🏆 <b>${a.name}</b>${sk ? ` <span>→ スキン「${sk.name}」</span>` : ''}</div>`;
  }).join('');
}

// ---- コレクションの画面 ----------------------------------------------------------------------------
const collectionModal = document.getElementById('collectionModal');
const collectionBody = document.getElementById('collectionBody');
const collectionCount = document.getElementById('collectionCount');
let colTab = 'skins';
function updateCollectionCount() {
  const n = ACHIEVEMENTS.filter(a => P.unlocked[a.id]).length;
  collectionCount.textContent = `${n}/${ACHIEVEMENTS.length}`;
}
function renderCollection() {
  collectionModal.querySelectorAll('.col-tabs .seg-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === colTab));
  if (colTab === 'skins') {
    const cur = heroSkin().id;
    collectionBody.innerHTML = `<div class="skin-grid">${SKINS.map(s => {
      const open = skinUnlocked(s), a = s.need && achById(s.need);
      return `<button class="skin-card${open ? '' : ' locked'}${s.id === cur ? ' equipped' : ''}" data-skin="${s.id}" ${open ? '' : 'disabled'}>
        <canvas width="96" height="96"></canvas>
        <span class="skin-name">${open ? s.name : '？？？'}</span>
        <span class="skin-need">${s.id === cur ? '使用中' : open ? 'タップで着がえる' : '🔒 ' + a.name + '<br>' + a.desc}</span>
      </button>`;
    }).join('')}</div>`;
    collectionBody.querySelectorAll('.skin-card').forEach(card => {
      const s = SKINS.find(k => k.id === card.dataset.skin);
      drawSkinPreview(card.querySelector('canvas'), s, !skinUnlocked(s));
      card.addEventListener('click', () => { if (!skinUnlocked(s)) return; P.skin = s.id; saveProgress(); renderCollection(); });
    });
  } else {
    const done = ACHIEVEMENTS.filter(a => P.unlocked[a.id]).length;
    let lastG = '';
    collectionBody.innerHTML = `<div class="ach-summary">${done} / ${ACHIEVEMENTS.length} 解除</div>` + ACHIEVEMENTS.map(a => {
      const got = !!P.unlocked[a.id], sk = skinFor(a), hide = a.secret && !got;
      const head = a.g !== lastG ? `<div class="ach-group">${a.g}<span>${ACHIEVEMENTS.filter(x => x.g === a.g && P.unlocked[x.id]).length} / ${ACHIEVEMENTS.filter(x => x.g === a.g).length}</span></div>` : '';
      lastG = a.g;
      const stars = `<i class="ach-lv lv${a.lv}">${'★'.repeat(a.lv)}${'☆'.repeat(5 - a.lv)}</i>`;
      if (hide) return head + `<div class="ach secret"><div class="ach-icon">❔</div><div class="ach-text"><b>？？？ ${stars}</b><span>ひみつの実績</span></div></div>`;
      let bar = '';
      if (!got && a.progress) {
        let v = 0, n = 1;
        try { [v, n] = a.progress(); } catch (e) { /* まだ数えられない */ }
        bar = `<div class="ach-bar"><i style="width:${Math.min(100, 100 * v / n).toFixed(1)}%"></i></div><small>${Math.min(v, n)} / ${n}${a.unit || ''}</small>`;
      }
      return head + `<div class="ach${got ? ' got' : ''}"><div class="ach-icon">${got ? '🏆' : '🔒'}</div><div class="ach-text"><b>${a.name} ${stars}</b><span>${a.desc}</span>${bar}${sk ? `<em>ごほうび: スキン「${sk.name}」</em>` : ''}</div></div>`;
    }).join('');
  }
}
// スキンの見本（visuals.js の paintHero で、ゲームと同じ絵を描く）
function drawSkinPreview(cv, s, locked) {
  const g = cv.getContext('2d');
  g.clearRect(0, 0, cv.width, cv.height);
  if (typeof paintHero !== 'function') return;
  g.save();
  if (locked) g.filter = 'brightness(0) opacity(0.35)';
  paintHero(g, 48 - 24, 86 - 55, 48, 55, 1, 86, 0, s);
  g.restore();
}
function openCollection() { checkAchievements(); colTab = 'skins'; renderCollection(); collectionModal.classList.remove('hidden'); collectionBody.scrollTop = 0; }
function closeCollection() { collectionModal.classList.add('hidden'); }
document.getElementById('collectionBtn').addEventListener('click', openCollection);
document.getElementById('collectionClose').addEventListener('click', closeCollection);
collectionModal.addEventListener('click', e => { if (e.target === collectionModal) closeCollection(); });
collectionModal.querySelectorAll('.col-tabs .seg-btn').forEach(b => b.addEventListener('click', () => { colTab = b.dataset.tab; renderCollection(); collectionBody.scrollTop = 0; }));
// 開いている間は、ゲームのキー（Enter でスタート など）を止める。Esc で閉じる
window.addEventListener('keydown', e => {
  if (collectionModal.classList.contains('hidden')) return;
  if (e.key === 'Escape') closeCollection();
  e.stopPropagation();
}, true);
document.addEventListener('DOMContentLoaded', () => { checkAchievements(); updateCollectionCount(); });
