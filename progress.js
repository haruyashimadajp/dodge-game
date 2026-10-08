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
// First Step は練習用の曲なので、チャレンジ（実績）には一切数えない（遊んだ記録も、クリアも、ランクも）
const NOT_COUNTED = new Set(['firststep']);
const countedSongs = () => SONGS.filter(s => !NOT_COUNTED.has(songBase(s)));
const allBases = () => [...new Set(countedSongs().map(songBase))];
// minD 以上の難易度でクリアした曲（譜面がちがっても同じ曲は 1 曲と数える）
function clearedBases(minD = 'easy') {
  const set = new Set();
  for (const s of countedSongs()) if (clearsOf(s).some(d => diffIdx(d) >= diffIdx(minD))) set.add(songBase(s));
  return set;
}
// minD 以上の難易度で、S ランク（ノーミス）を取った曲
function fullDodgeBases(minD = 'easy') {
  const set = new Set();
  for (const s of countedSongs()) for (const d of DIFF_ORDER) if (diffIdx(d) >= diffIdx(minD) && bestRankOf(s, d) === 'S') set.add(songBase(s));
  return set;
}
// A ランク以上を取った「曲×難易度」の数
function rankACount() {
  let n = 0;
  for (const s of countedSongs()) for (const d of DIFF_ORDER) { const r = bestRankOf(s, d); if (r === 'S' || r === 'A') n++; }
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
// コイン・デイリー・ガチャの記録（economy.js の E）
const eco = k => (typeof E !== 'undefined' ? E[k] || 0 : 0);
// スキンの数（「全部集める」「コンプリート」のごほうびのスキンは、数に入れない）
const collectable = () => SKINS.filter(sk => !sk.gacha && sk.need !== 'skins_all' && sk.need !== 'complete');   // ガチャ限定のスキンも数えない
const skinsOpen = () => collectable().filter(sk => skinUnlocked(sk)).length;

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
    { id: 'plays2000',   lv: 5, name: '二千回の夜',       desc: '2000 回プレイする',                         progress: () => [P.plays, 2000] },
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
    { id: 'charts_all',  lv: 4, name: '譜面マニア',       desc: 'すべての譜面（旧譜面・真もふくむ）をクリアする', progress: () => [countedSongs().filter(s => clearsOf(s).length).length, countedSongs().length] },
    { id: 'normal5',     lv: 2, name: '腕に覚えあり',     desc: 'NORMAL 以上で 5 曲クリアする',               progress: () => [clearedBases('normal').size, 5] },
    { id: 'normal_all',  lv: 3, name: '一人前',           desc: 'NORMAL 以上で全曲クリアする',                progress: () => [clearedBases('normal').size, allBases().length] },
    { id: 'hard1',       lv: 2, name: '本気モード',       desc: 'HARD 以上でクリアする',                      test: () => clearedBases('hard').size >= 1 },
    { id: 'hard10',      lv: 3, name: '鉄人',             desc: 'HARD 以上で 10 曲クリアする',                progress: () => [clearedBases('hard').size, 10] },
    { id: 'hard_all',    lv: 4, name: '鋼の意志',         desc: 'HARD 以上で全曲クリアする',                  progress: () => [clearedBases('hard').size, allBases().length] },
    { id: 'imp1',        lv: 4, name: '不可能を可能に',   desc: 'IMPOSSIBLE でクリアする',                    test: () => clearedBases('impossible').size >= 1 },
    { id: 'imp5',        lv: 5, name: '伝説',             desc: 'IMPOSSIBLE で 5 曲クリアする',               progress: () => [clearedBases('impossible').size, 5] },
    { id: 'imp10',       lv: 5, name: '神話',             desc: 'IMPOSSIBLE で 10 曲クリアする',              progress: () => [clearedBases('impossible').size, 10] },
    { id: 'imp_all',     lv: 5, name: '神',               desc: 'IMPOSSIBLE で全曲クリアする',                progress: () => [clearedBases('impossible').size, allBases().length] },
    { id: 'four_diff',   lv: 4, name: 'フルコース',       desc: '1 つの譜面を、4 つの難易度すべてでクリアする', test: () => countedSongs().some(s => clearsOf(s).length === 4) },
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
    { id: 'fd_imp',      lv: 5, name: '無敵',             desc: 'IMPOSSIBLE で S ランクを取る',               test: () => fullDodgeBases('impossible').size >= 1 },
    { id: 's_run3',      lv: 4, name: '三連続 S',         desc: '3 回続けて S ランクでクリアする',            progress: () => [P.sRun || 0, 3] },
  ]],
  ['かすり', [
    { id: 'graze50',     lv: 1, name: 'かすり傷',         desc: '1 回のプレイで 50 回かする',                 progress: () => [P.bestGrazeRun, 50] },
    { id: 'graze200',    lv: 2, name: '紙一重',           desc: '1 回のプレイで 200 回かする',                progress: () => [P.bestGrazeRun, 200] },
    { id: 'graze400',    lv: 4, name: '炎の中を歩く',     desc: '1 回のプレイで 400 回かする',                progress: () => [P.bestGrazeRun, 400] },
    { id: 'graze2000',   lv: 2, name: 'かすりの達人',     desc: '合計 2000 回かする',                         progress: () => [P.grazeTotal, 2000] },
    { id: 'graze10000',  lv: 3, name: 'かすりの鬼',       desc: '合計 10000 回かする',                        progress: () => [P.grazeTotal, 10000] },
    { id: 'graze30000',  lv: 4, name: 'かすりの神',       desc: '合計 30000 回かする',                        progress: () => [P.grazeTotal, 30000] },
    { id: 'graze100k',   lv: 5, name: 'かすりの極み',     desc: '合計 100000 回かする',                       progress: () => [P.grazeTotal, 100000] },
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
    { id: 'unk_s',       lv: 4, name: 'ノーミスでスペルブレイク', desc: 'Re:Unknown X で S ランクを取る',     test: () => rankedSong('unknown') },
    { id: 'mora_s',      lv: 4, name: '止まった時の中で', desc: 'モラトリウムで S ランクを取る',             test: () => rankedSong('moratorium') },
    { id: 'vert_s',      lv: 4, name: '無重力',           desc: 'Vertigo で S ランクを取る',                  test: () => rankedSong('vertigo') },
    { id: 'mal_s',       lv: 4, name: 'ファイアウォール', desc: 'Malware で S ランクを取る',                  test: () => rankedSong('malware') },
    { id: 'ward_s',      lv: 4, name: '悪夢の向こう',     desc: 'Ward 13 で S ランクを取る',                  test: () => rankedSong('ward13') },
    { id: 'candy_s',     lv: 4, name: 'シュガーラッシュ', desc: 'Candy Pop Parade で S ランクを取る',         test: () => rankedSong('candy') },
    { id: 'tect_s',      lv: 4, name: '地殻変動',         desc: 'TECTONIC で S ランクを取る',                 test: () => rankedSong('tectonic') },
    { id: 'ov_s',        lv: 4, name: 'スタンディングオベーション', desc: 'Grand Overture で S ランクを取る', test: () => rankedSong('overture') },
    { id: 'ongeki_hard', lv: 3, name: 'ボコボコにされない', desc: '怨撃を HARD 以上でクリアする',             test: () => clearedSong('ongeki', 'hard') },
    { id: 'onshin',      lv: 3, name: '真・怨撃',         desc: '怨撃の「真」の譜面をクリアする',             test: () => clearedSong('ongeki-shin') },
    { id: 'shin_imp',    lv: 5, name: 'YOU ARE A SUPER SHOOTER!!', desc: '怨撃・真を IMPOSSIBLE でクリアする', test: () => clearedSong('ongeki-shin', 'impossible') },
    { id: 'echo_s',      lv: 4, name: 'こだまの先へ',     desc: 'Echoes で S ランクを取る',                   test: () => rankedSong('echoes') },
    { id: 'pit',         lv: 2, name: 'モッシュの洗礼',   desc: 'Circle Pit をクリアする',                    test: () => clearedSong('circlepit') },
    { id: 'pit_imp',     lv: 5, name: 'サークルの中心で', desc: 'Circle Pit を IMPOSSIBLE でクリアする',      test: () => clearedSong('circlepit', 'impossible') },
    { id: 'phoenix',     lv: 3, name: '不死鳥',           desc: 'And Revive The Melody を HARD 以上でクリアする', test: () => clearedSong('revive', 'hard') },
    { id: 'baile',       lv: 2, name: 'バイレへようこそ', desc: 'NEON BAILE をクリアする',                    test: () => clearedSong('baile') },
    { id: 'baile_hard',  lv: 3, name: 'カウベル職人',     desc: 'NEON BAILE を HARD 以上でクリアする',        test: () => clearedSong('baile', 'hard') },
    { id: 'baile_s',     lv: 4, name: 'バイレの女王',     desc: 'NEON BAILE で S ランクを取る',               test: () => rankedSong('baile') },
    { id: 'revive_imp',  lv: 5, name: '旋律よ、よみがえれ', desc: 'And Revive The Melody を IMPOSSIBLE でクリアする', test: () => clearedSong('revive', 'impossible') },
  ]],
  ['デイリー・ガチャ', [
    { id: 'quest10',     lv: 2, name: 'がんばり屋',       desc: '今日のミッションを合計 10 個達成する',       progress: () => [eco('questTotal'), 10] },
    { id: 'quest50',     lv: 4, name: 'ミッションマスター', desc: '今日のミッションを合計 50 個達成する',     progress: () => [eco('questTotal'), 50] },
    { id: 'daily10',     lv: 3, name: '挑戦者',           desc: 'デイリーチャレンジを合計 10 回成功する',     progress: () => [eco('dailyWins'), 10] },
    { id: 'daily_streak7', lv: 4, name: '毎日が挑戦',     desc: 'デイリーチャレンジを 7 日続けて成功する',    progress: () => [eco('dailyStreak'), 7], unit: '日' },
    { id: 'gacha100',    lv: 2, name: 'ガチャ好き',       desc: 'ガチャを合計 100 回引く',                    progress: () => [eco('pulls'), 100] },
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
    { id: 'skins_all',   lv: 5, name: 'クローゼット満杯', desc: 'スキンをすべて使えるようにする',             progress: () => [skinsOpen(), collectable().length] },
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
  { id: 'devil',   name: '悪魔',         body: '#7a0f1e', skin: '#f2b8a0', shoe: '#1a0508', glow: '#ff3b5c', hair: '#1a0508', hairStyle: 'spiky', eyes: 'sharp', eyeColor: '#ff3b5c', armor: '#2a0a10', trim: '#ff3b5c', acc: ['wings', 'horns', 'tails', 'cape'], wingStyle: 'bat', wing: '#2a0a10', hornColor: '#1a0508', cape: '#1a0508', tails: 1, tailColor: '#2a0a10', tailTip: '#ff3b5c', aura: '#ff3b5c', sig: 'smoke', sigColor: '#ff3b5c', trail: 'ember', need: 'imp1' },
  { id: 'king',    name: 'キング',       body: '#d9a520', cap: '#b8282e', brim: '#8e1c22', skin: '#f4c9a0', shoe: '#5a3a10', glow: '#ffe28a', acc: 'crown', need: 'clear_all' },
  { id: 'emperor', name: 'エンペラー',   body: '#4a1a6a', cap: '#d9a520', brim: '#a67c10', skin: '#efc2a2', shoe: '#1e0a2a', glow: '#c77dff', acc: 'crown', need: 'emperor' },
  { id: 'dj',      name: 'DJ',           body: '#1c1c24', cap: '#ff4fa3', brim: '#cc2f80', skin: '#e8b890', shoe: '#ff4fa3', glow: '#ff7ad0', acc: 'phones', need: 'hard10' },
  { id: 'phoenix', name: '不死鳥',       body: '#ff6a1a', cap: '#ffd23f', brim: '#e0a810', skin: '#ffd8b0', shoe: '#7a2a08', glow: '#ffb05c', trail: 'ember', need: 'phoenix' },
  { id: 'punk',    name: 'パンク',       body: '#141414', cap: '#ff2e3a', brim: '#b81e28', skin: '#f0c4a0', shoe: '#ff2e3a', glow: '#ff5c66', acc: 'mohawk', need: 'pit' },
  { id: 'prism',   name: 'プリズム',     body: '#f4efe6', cap: '#9fb4ff', brim: '#7a90e0', skin: '#fde6d0', shoe: '#8a7aa0', glow: '#ffffff', trail: 'rainbow', need: 'prism' },
  { id: 'abyss',   name: '深海',         body: '#0f2a5a', cap: '#2fd0ff', brim: '#1a9cc4', skin: '#d8e8f4', shoe: '#08142a', glow: '#4dd2ff', trail: 'bubble', need: 'abyss' },
  { id: 'cat',     name: 'ねこ',         body: '#f2a65a', cap: '#f2a65a', brim: '#d98a3e', skin: '#fde3cc', shoe: '#8a5a2e', glow: '#ffd2a0', acc: 'ears', need: 'plays500' },
  { id: 'flame',   name: 'ほのお',       body: '#d81e1e', skin: '#ffd0b0', shoe: '#3a0808', glow: '#ff6a1a', eyes: 'sharp', eyeColor: '#ffd23f', armor: '#7a1a08', trim: '#ffb05c', acc: ['flamehair', 'scarf', 'wings'], wingStyle: 'flame', scarf: '#ff3b1a', sparkle: '#ffb05c', aura: '#ff6a1a', sig: 'flames', sigColor: '#ff6a1a', trail: 'ember', need: 'graze400' },
  { id: 'ice',     name: '氷の騎士',     body: '#bfefff', cap: '#e8faff', brim: '#3aa8e0', skin: '#f0f8ff', shoe: '#6a9ac4', glow: '#d8f6ff', armor: '#9fdcf4', trim: '#ffffff', acc: ['visor', 'cape', 'wings', 'katana'], visor: '#7fe3ff', cape: '#5cc8ff', wingStyle: 'crystal', wing: '#bfefff', blade: '#e0f8ff', sparkle: '#ffffff', aura: '#bfefff', sig: 'snowflakes', sigColor: '#e0f8ff', trail: 'snow', need: 'hard_all' },
  { id: 'shadow',  name: '影',           body: '#0a0a12', skin: '#2a2a3a', shoe: '#000000', glow: '#8a5cff', hair: '#05050a', hairStyle: 'long', eyes: 'sharp', eyeColor: '#a48cff', acc: ['mask', 'scarf', 'katana', 'wings'], maskColor: '#0a0a12', scarf: '#2a1a4a', blade: '#a48cff', wingStyle: 'bat', wing: '#0a0a12', aura: '#8a5cff', fx: 'echo', alpha: 0.9, sig: 'smoke', sigColor: '#8a5cff', trail: 'galaxy', need: 'fd_hard5' },
  { id: 'galaxy',  name: '銀河',         body: '#1a1050', skin: '#e8dcff', shoe: '#0a0828', glow: '#9f8cff', hair: '#c7b8ff', hairStyle: 'long', eyes: 'cute', eyeColor: '#7a2aff', gown: '#1a1050', gownTrim: '#c77dff', acc: ['wings', 'halo', 'cape', 'tiara'], wingStyle: 'light', wing: '#9f8cff', cape: '#2a1a6a', haloColor: '#c77dff', tiaraColor: '#ffe066', orbs: ['#4dd2ff', '#ffe066', '#ff7ad0', '#5cff9d'], sparkle: '#ffffff', aura: '#9f8cff', sig: 'stars', sigColor: '#c7b8ff', trail: 'galaxy', need: 'imp10' },
  { id: 'legend',  name: 'レジェンド',   body: '#ffd23f', skin: '#fde6d0', shoe: '#c49a10', glow: '#ffffff', hair: '#ffe066', hairStyle: 'spiky', eyes: 'sharp', eyeColor: '#ffd23f', armor: '#ffd23f', trim: '#ffffff', acc: ['wings', 'crown', 'cape', 'halo'], wingStyle: 'seraph', wing: '#ffffff', cape: '#c8102e', haloColor: '#ffe066', sparkle: '#ffffff', aura: '#ffe066', fx: 'rainbow', sig: 'rays', sigColor: '#ffe066', trail: 'rainbow', need: 'complete' },
  // ---- むずかしいチャレンジ（★4〜5）のごほうび ----
  { id: 'veteran', name: '歴戦',         body: '#4a5a32', skin: '#e8b890', shoe: '#2a2a1a', glow: '#b6d48a', hair: '#3a2a1a', hairStyle: 'spiky', eyes: 'sharp', eyeColor: '#b6d48a', armor: '#3a4a28', trim: '#b6d48a', acc: ['headband', 'scarf', 'eyepatch', 'katana', 'cape'], band: '#2a2a2a', scarf: '#6a5a3a', cape: '#2a2a1a', blade: '#c8c8c8', aura: '#b6d48a', sig: 'medals', trail: 'spark', trailColor: '#b6d48a', need: 'plays1000' },
  { id: 'immortal', name: '不死身',      body: '#5a0a14', skin: '#f0c4a8', shoe: '#140306', glow: '#ff3b5c', hair: '#120306', hairStyle: 'long', eyes: 'sharp', eyeColor: '#ff3b5c', armor: '#2a0508', trim: '#ff3b5c', acc: ['cape', 'halo', 'wings'], wingStyle: 'flame', cape: '#140306', haloColor: '#ff3b5c', aura: '#ff3b5c', fx: 'echo', sig: 'ecg', sigColor: '#ff3b5c', trail: 'ember', need: 'time10h' },
  { id: 'sunrise', name: '日の出',       body: '#ff8a1a', skin: '#ffe0c0', shoe: '#7a3a08', glow: '#ffd23f', hair: '#ffd23f', hairStyle: 'long', eyes: 'cute', eyeColor: '#ff8a1a', dress: '#ff8a1a', frill: '#ffd23f', bow: '#ff3b1a', acc: ['halo', 'wings'], wingStyle: 'light', wing: '#ffd23f', haloColor: '#ffe066', sparkle: '#ffe066', aura: '#ffd23f', sig: 'rays', sigColor: '#ffb05c', trail: 'gold', need: 'days30' },
  { id: 'ninja',   name: '忍者',         body: '#1c1c2a', skin: '#e8c0a0', shoe: '#0a0a12', glow: '#8888ff', hair: '#0a0a12', hairStyle: 'pony', tie: '#d81e1e', eyes: 'sharp', eyeColor: '#8888ff', sleeves: '#1c1c2a', sleeveTrim: '#3a3a5a', obi: '#d81e1e', acc: ['mask', 'headband', 'scarf', 'katana'], band: '#2a2a3a', scarf: '#d81e1e', blade: '#c8d0ff', fx: 'echo', sig: 'shuriken', sigColor: '#c8d0ff', trail: 'leaf', need: 'fd10' },
  { id: 'void',    name: '虚無',         body: '#06060a', skin: '#1a1a24', shoe: '#000000', glow: '#22e6ff', hair: '#06060a', hairStyle: 'long', eyes: 'sharp', eyeColor: '#22e6ff', gown: '#06060a', gownTrim: '#22e6ff', acc: ['visor', 'wings', 'halo'], visor: '#22e6ff', wingStyle: 'crystal', wing: '#0a2a3a', haloColor: '#22e6ff', aura: '#22e6ff', fx: 'echo', alpha: 0.92, sig: 'glitch', sigColor: '#22e6ff', trail: 'spark', trailColor: '#22e6ff', need: 'fd_all' },
  { id: 'knight',  name: '騎士',         body: '#9aa4b8', cap: '#c8d0de', brim: '#8a94a8', skin: '#e8c8b0', shoe: '#4a5468', glow: '#cfe0ff', armor: '#b8c2d4', trim: '#ffd23f', acc: ['visor', 'cape', 'katana'], visor: '#ffffff', cape: '#2c54c4', blade: '#e8f0ff', sparkle: '#cfe0ff', aura: '#cfe0ff', sig: 'shield', sigColor: '#2c54c4', trail: 'star', trailColor: '#cfe0ff', need: 'fd_hard' },
  { id: 'captain', name: '隊長',         body: '#1e2e5a', cap: '#1e2e5a', brim: '#0a0a14', skin: '#f0c8a8', shoe: '#0a0a14', glow: '#ffd23f', eyes: 'sharp', eyeColor: '#ffd23f', armor: '#1e2e5a', trim: '#ffd23f', acc: ['cape', 'monocle'], cape: '#ffd23f', sparkle: '#ffd23f', aura: '#ffd23f', sig: 'flag', sigColor: '#1e2e5a', trail: 'star', trailColor: '#ffd23f', need: 'rankA50' },
  { id: 'triple',  name: '三冠王',       body: '#5a2a8a', skin: '#f0c8a8', shoe: '#2a0a3a', glow: '#c77dff', hair: '#ffd23f', hairStyle: 'spiky', eyes: 'sharp', eyeColor: '#ffd23f', armor: '#5a2a8a', trim: '#ffd23f', acc: ['crown', 'cape'], cape: '#c8102e', orbs: ['#ffd23f', '#e0e0e8', '#d08a4a'], sparkle: '#ffd23f', aura: '#ffd23f', trail: 'gold', need: 's_run3' },
  { id: 'raijin',  name: '雷神',         body: '#ffd23f', skin: '#f4d0b0', shoe: '#2a2a2a', glow: '#4dd2ff', eyes: 'sharp', eyeColor: '#4dd2ff', armor: '#2a2a2a', trim: '#ffd23f', acc: ['flamehair', 'scarf', 'horns'], flame: ['#2a6aff', '#bff4ff'], hornColor: '#ffd23f', scarf: '#2a2a2a', orbs: ['#ffd23f', '#ffd23f', '#ffd23f', '#ffd23f', '#ffd23f', '#ffd23f'], aura: '#4dd2ff', sig: 'bolts', sigColor: '#9fe8ff', trail: 'bolt', trailColor: '#9fe8ff', need: 'graze30000' },
  { id: 'kenbu',   name: '剣舞',         body: '#f4f4f4', skin: '#f4d0b8', shoe: '#2a2a2a', glow: '#ff4d6d', hair: '#111111', hairStyle: 'pony', tie: '#ff4d6d', eyes: 'sharp', eyeColor: '#ff4d6d', sleeves: '#f4f4f4', sleeveTrim: '#ff4d6d', obi: '#d81e1e', acc: ['headband', 'katana'], band: '#d81e1e', blade: '#ffd0dc', sparkle: '#ff4d6d', aura: '#ff4d6d', fx: 'echo', sig: 'petals', sigColor: '#ff8aa0', trail: 'petal', trailColor: '#ff4d6d', need: 'tight_hard' },
  { id: 'golem',   name: '大地の守り人', body: '#6a6460', cap: '#4a4440', brim: '#3a3430', skin: '#a8a098', shoe: '#2a2420', glow: '#ff8a1a', armor: '#5a5450', trim: '#ff8a1a', acc: ['visor', 'horns'], visor: '#ff8a1a', hornColor: '#3a3430', orbs: ['#7a746c', '#5a5450', '#7a746c', '#5a5450'], aura: '#ff8a1a', trail: 'gem', trailColor: '#ff8a1a', need: 'nojump_s' },
  { id: 'ronin',   name: '浪人',         body: '#1a1420', skin: '#ecc4a4', shoe: '#0a0808', glow: '#ff4060', hair: '#111111', hairStyle: 'pony', tie: '#c8102e', eyes: 'sharp', eyeColor: '#ff4060', sleeves: '#1a1420', sleeveTrim: '#c8102e', obi: '#c8102e', acc: ['katana', 'scarf'], scarf: '#c8102e', blade: '#ff8aa0', sparkle: '#ff6a8a', aura: '#ff4060', fx: 'echo', sig: 'moon', sigColor: '#fff4d8', trail: 'petal', trailColor: '#ff6a8a', need: 'imp5' },
  { id: 'deity',   name: '神',           body: '#fff8e0', skin: '#fff0e0', shoe: '#e0c070', glow: '#fff4c0', hair: '#fff4c0', hairStyle: 'long', eyes: 'sharp', eyeColor: '#ffd23f', gown: '#fff8e0', gownTrim: '#ffd23f', acc: ['wings', 'halo', 'crown'], wingStyle: 'seraph', wing: '#ffffff', haloColor: '#ffe066', sparkle: '#ffffff', aura: '#ffe066', sig: 'feathers', sigColor: '#ffffff', trail: 'feather', need: 'imp_all' },
  { id: 'empap',   name: '皇帝の正装',   body: '#3a0a5a', skin: '#efc2a2', shoe: '#1a0428', glow: '#c77dff', hair: '#1a0428', hairStyle: 'spiky', eyes: 'sharp', eyeColor: '#c77dff', gown: '#3a0a5a', gownTrim: '#d9a520', acc: ['crown', 'cape'], cape: '#d9a520', sparkle: '#ffd23f', aura: '#c77dff', sig: 'rays', sigColor: '#c77dff', trail: 'gold', need: 'emp_ap' },
  { id: 'crystal', name: '水晶',         body: '#d8f4ff', skin: '#f4fcff', shoe: '#8ab8d4', glow: '#ffffff', hair: '#e0f8ff', hairStyle: 'long', eyes: 'cute', eyeColor: '#4dd2ff', gown: '#d8f4ff', gownTrim: '#ffffff', acc: ['wings', 'tiara'], wingStyle: 'crystal', wing: '#bfefff', tiaraColor: '#bfefff', sparkle: '#ffffff', aura: '#ffffff', alpha: 0.88, sig: 'shards', sigColor: '#bfefff', trail: 'gem', trailColor: '#e0f8ff', need: 'seg_s' },
  { id: 'overdrive', name: 'OVERDRIVE',  body: '#140608', skin: '#e8b8a0', shoe: '#ff2a3a', glow: '#ff2a3a', hair: '#ff2a3a', hairStyle: 'spiky', eyes: 'sharp', eyeColor: '#ff2a3a', armor: '#140608', trim: '#ff2a3a', acc: ['visor', 'scarf', 'wings'], visor: '#ff2a3a', scarf: '#ff2a3a', wingStyle: 'mech', wing: '#ff2a3a', aura: '#ff2a3a', fx: 'echo', sig: 'speed', sigColor: '#ff2a3a', trail: 'comet', trailColor: '#ff2a3a', need: 'ex_imp' },
  { id: 'leviathan', name: '海の王',     body: '#0a3a4a', skin: '#c8e0e8', shoe: '#04141a', glow: '#4dd2ff', hair: '#2fd0ff', hairStyle: 'long', eyes: 'sharp', eyeColor: '#4dd2ff', armor: '#0a3a4a', trim: '#2fd0ff', acc: ['horns', 'cape', 'crown', 'tails'], hornColor: '#2fd0ff', cape: '#08506a', crownColor: '#2fd0ff', tails: 1, tailColor: '#0a5a6a', tailTip: '#2fd0ff', aura: '#4dd2ff', sig: 'bubbles', sigColor: '#9fe8ff', trail: 'bubble', need: 'abyss_s' },
  { id: 'spectrum', name: 'スペクトル',  body: '#ffffff', skin: '#fde6d0', shoe: '#6a5a8a', glow: '#ffffff', hair: '#ffffff', hairStyle: 'long', eyes: 'cute', eyeColor: '#6c7bff', dress: '#ffffff', frill: '#c77dff', bow: '#4dd2ff', acc: ['visor', 'wings'], visor: '#ffffff', wingStyle: 'butterfly', wing: '#ffffff', sparkle: '#ffffff', fx: 'rainbow', aura: '#ffffff', sig: 'prism', trail: 'rainbow', need: 'prism_s' },
  { id: 'maestro', name: 'マエストロ',   body: '#111111', skin: '#f0d0b8', shoe: '#000000', glow: '#ffe28a', hair: '#e8e8e8', hairStyle: 'long', eyes: 'sharp', eyeColor: '#ffe28a', armor: '#111111', trim: '#ffe28a', acc: ['cape', 'monocle'], cape: '#7a0f1e', sparkle: '#ffe28a', aura: '#ffe28a', sig: 'notes', sigColor: '#ffe28a', trail: 'note', trailColor: '#ffe28a', need: 'ov_s' },
  { id: 'echo',    name: '残響',         body: '#4dd2ff', skin: '#e0f4ff', shoe: '#0e3a5c', glow: '#9fe8ff', hair: '#9fe8ff', hairStyle: 'long', eyes: 'cute', eyeColor: '#1a5a8a', dress: '#4dd2ff', frill: '#ffffff', bow: '#1a5a8a', acc: ['phones', 'wings'], wingStyle: 'light', wing: '#9fe8ff', sparkle: '#ffffff', fx: 'echo', aura: '#9fe8ff', sig: 'waves', sigColor: '#9fe8ff', trail: 'note', trailColor: '#9fe8ff', need: 'echo_s' },
  { id: 'konjiki', name: 'こんじき',     body: '#ffcf2e', skin: '#fff0d0', shoe: '#a67c10', glow: '#ffe066', hair: '#ffcf2e', hairStyle: 'twin', tie: '#ff3b5c', eyes: 'cute', eyeColor: '#ff8a1a', dress: '#ffcf2e', frill: '#ffffff', bow: '#ff3b5c', acc: ['ears', 'crown', 'tails'], tails: 2, tailColor: '#ffcf2e', tailTip: '#ffffff', orbs: ['#ffe066', '#ffe066'], sparkle: '#ffe066', aura: '#ffd23f', trail: 'gold', need: 'shin_imp' },
  { id: 'mosh',    name: 'モッシュ',     body: '#141414', cap: '#ff2e3a', skin: '#f0c4a0', shoe: '#ff2e3a', glow: '#ff5c66', eyes: 'sharp', eyeColor: '#ff2e3a', armor: '#1e1e1e', trim: '#ff2e3a', acc: ['mohawk', 'shades', 'guitar', 'scarf', 'wings'], guitar: '#ff2e3a', scarf: '#ff2e3a', wingStyle: 'flame', sparkle: '#ff5c66', aura: '#ff2e3a', sig: 'shout', sigColor: '#ff5c66', trail: 'spark', trailColor: '#ff5c66', need: 'pit_imp' },
  { id: 'truephoenix', name: '真・不死鳥', body: '#ff6a1a', skin: '#ffd8b0', shoe: '#7a2a08', glow: '#ffb05c', eyes: 'sharp', eyeColor: '#ffe066', gown: '#ff6a1a', gownTrim: '#ffe066', acc: ['wings', 'flamehair', 'halo', 'tails'], wingStyle: 'flame', wing: '#ff9a2e', flame: ['#ff4a1a', '#ffe066'], haloColor: '#ffe066', tails: 3, tailColor: '#ff9a2e', tailTip: '#ffe066', sparkle: '#ffe066', aura: '#ffb05c', sig: 'feathers', sigColor: '#ff9a2e', trail: 'ember', need: 'revive_imp' },
  { id: 'prismatic', name: '虹色',       body: '#ffffff', skin: '#fde6d0', shoe: '#ffffff', glow: '#ffffff', hair: '#ffffff', hairStyle: 'long', eyes: 'cute', eyeColor: '#c77dff', gown: '#ffffff', gownTrim: '#c77dff', acc: ['wings', 'crown', 'halo'], wingStyle: 'butterfly', wing: '#ffffff', haloColor: '#ffffff', orbs: ['#ff4d4d', '#ffe66d', '#5cff9d', '#4dd2ff', '#6c7bff', '#c77dff'], sparkle: '#ffffff', fx: 'rainbow', aura: '#ffffff', sig: 'prism', trail: 'rainbow', need: 'skins_all' },
  { id: 'sakura',  name: 'さくら',       body: '#ff9fc4', cap: '#ffffff', brim: '#f0d8e0', skin: '#fde3d4', shoe: '#a0506a', glow: '#ffc4dc', acc: 'ribbon', trail: 'petal', need: 'shiki' },
  // ---- 曲のスキン（その曲の実績で手に入る）----
  { id: 'spell',    name: 'スペルカード', body: '#2a1a4a', skin: '#fde6da', shoe: '#141418', glow: '#ffe066', hair: '#ffe066', hairStyle: 'long', eyes: 'cute', eyeColor: '#d9a520', dress: '#141418', frill: '#ffffff', bow: '#d81e1e', acc: ['witch'], hat: '#141418', orbs: ['#ffe066', '#ff5c8a', '#4dd2ff'], trail: 'star', need: 'unk_hard' },
  { id: 'chrono',   name: '時の番人',     body: '#3a4a7a', skin: '#f0dcd0', shoe: '#1e2e5a', glow: '#9fdcff', hair: '#c8d0e8', hairStyle: 'pony', tie: '#4dd2ff', eyes: 'sharp', eyeColor: '#4dd2ff', sleeves: '#1e2e5a', sleeveTrim: '#c8d0e8', obi: '#4dd2ff', fx: 'echo', trail: 'star', trailColor: '#9fdcff', need: 'mora_hard' },
  { id: 'vertigo',  name: 'めまい',       body: '#7a2aff', cap: '#ff3ea5', brim: '#c21a74', skin: '#f4d0c0', shoe: '#3a0a7a', glow: '#ff7ad0', acc: ['propeller'], hat: '#7a2aff', eyes: 'cute', eyeColor: '#7a2aff', magicCircle: '#ff3ea5', trail: 'galaxy', need: 'vert_hard' },
  { id: 'extreme',  name: 'エクストリーム', body: '#c8102e', skin: '#f0c8a8', shoe: '#141418', glow: '#ff2a3a', hair: '#141418', hairStyle: 'spiky', eyes: 'sharp', eyeColor: '#ffd23f', acc: ['scarf'], scarf: '#ffd23f', aura: '#ff2a3a', trail: 'bolt', need: 'ex' },
  { id: 'hacker',   name: 'ハッカー',     body: '#0a140a', skin: '#d8c8b8', shoe: '#0a140a', glow: '#5cff9d', hair: '#5cff9d', hairStyle: 'spiky', acc: ['visor'], visor: '#5cff9d', armor: '#142814', trim: '#5cff9d', trail: 'pixel', need: 'mal_hard' },
  { id: 'survivor', name: '生還者',       body: '#e8e4d8', skin: '#e0d0c8', shoe: '#3a2a20', glow: '#ff3b3b', hair: '#3a2a20', hairStyle: 'long', eyes: 'sharp', eyeColor: '#ff3b3b', acc: ['scarf'], scarf: '#8a0f1e', trail: 'ember', trailColor: '#8a0f1e', need: 'ward_hard' },
  { id: 'momiji',   name: '紅葉',         body: '#c8401e', skin: '#fde6da', shoe: '#7a1a10', glow: '#ff8a3a', hair: '#141018', hairStyle: 'long', eyes: 'cute', eyeColor: '#c8401e', sleeves: '#ff8a3a', sleeveTrim: '#ffe066', obi: '#7a1a10', dress: '#7a1a10', frill: '#ffe066', bow: '#ffe066', trail: 'leaf', need: 'shiki_hard' },
  { id: 'candy',    name: 'キャンディ',   body: '#ff9fd0', skin: '#fde6da', shoe: '#ffffff', glow: '#ffb3e6', hair: '#7fe8c8', hairStyle: 'twin', tie: '#ff5c8a', eyes: 'cute', eyeColor: '#ff3ea5', dress: '#ff9fd0', frill: '#ffffff', bow: '#7fe8c8', acc: ['bigbow'], bigbow: '#ff5c8a', trail: 'heart', need: 'candy_hard' },
  { id: 'magma',    name: 'マグマ',       body: '#3a2418', skin: '#e8b890', shoe: '#1a0a05', glow: '#ff6a1a', hair: '#ff6a1a', hairStyle: 'spiky', eyes: 'sharp', eyeColor: '#ff8a1a', armor: '#5a4030', trim: '#ff6a1a', acc: ['horns'], hornColor: '#2a1a10', aura: '#ff6a1a', trail: 'ember', need: 'tect_hard' },
  { id: 'akanyan',  name: 'あかニャン',   body: '#d81e1e', cap: '#d81e1e', brim: '#a01010', skin: '#ffe0d0', shoe: '#5a0a0a', glow: '#ff5c5c', acc: ['ears'], eyes: 'cute', eyeColor: '#d9a520', trail: 'heart', trailColor: '#ff5c5c', need: 'ongeki_hard' },
  { id: 'archmage', name: '大魔法使い',   body: '#141418', skin: '#fde6da', shoe: '#141418', glow: '#ffe066', hair: '#ffe066', hairStyle: 'long', eyes: 'cute', eyeColor: '#d9a520', gown: '#141418', gownTrim: '#ffe066', acc: ['witch', 'cape'], hat: '#141418', magicCircle: '#ffe066', orbs: ['#ffe066', '#ff5c8a', '#4dd2ff', '#5cff9d'], sparkle: '#ffe066', cape: '#2a1a40', trail: 'star', need: 'unk_s' },
  { id: 'timelord', name: '時の支配者',   body: '#1e2e5a', skin: '#f0dcd0', shoe: '#0a0e28', glow: '#4dd2ff', hair: '#e8f0ff', hairStyle: 'long', eyes: 'sharp', eyeColor: '#4dd2ff', gown: '#1e2e5a', gownTrim: '#c8d0e8', acc: ['cape', 'tiara'], tiaraColor: '#c8d0e8', cape: '#0a0e28', fx: 'echo', sparkle: '#c8d0e8', sig: 'clock', sigColor: '#c8d0e8', trail: 'galaxy', need: 'mora_s' },
  { id: 'zerog',    name: '無重力',       body: '#ffffff', skin: '#fde6da', shoe: '#c77dff', glow: '#e0c8ff', hair: '#c77dff', hairStyle: 'twin', tie: '#ffffff', eyes: 'cute', eyeColor: '#7a2aff', dress: '#e0c8ff', frill: '#ffffff', bow: '#7a2aff', acc: ['wings', 'halo'], wingStyle: 'light', wing: '#c77dff', orbs: ['#c77dff', '#ff7ad0'], sparkle: '#ffffff', haloColor: '#ffffff', sig: 'ring', sigColor: '#e0c8ff', trail: 'galaxy', need: 'vert_s' },
  { id: 'firewall', name: 'ファイアウォール', body: '#0a140a', skin: '#d8c8b8', shoe: '#5cff9d', glow: '#5cff9d', hair: '#5cff9d', hairStyle: 'spiky', acc: ['visor', 'wings'], visor: '#5cff9d', wingStyle: 'crystal', wing: '#5cff9d', armor: '#142814', trim: '#5cff9d', aura: '#5cff9d', sig: 'code', sigColor: '#5cff9d', trail: 'pixel', need: 'mal_s' },
  { id: 'nightmare', name: 'ナイトメア',  body: '#1a0a0a', skin: '#e8d8d8', shoe: '#0a0202', glow: '#ff3b3b', hair: '#e8e4d8', hairStyle: 'long', eyes: 'sharp', eyeColor: '#ff3b3b', gown: '#2a0a0a', gownTrim: '#8a0f1e', acc: ['wings', 'horns'], wingStyle: 'bat', wing: '#2a0505', fx: 'echo', aura: '#ff3b3b', hornColor: '#2a0505', sig: 'eyes', sigColor: '#ff3b3b', trail: 'ember', trailColor: '#8a0f1e', need: 'ward_s' },
  { id: 'sugar',    name: 'シュガープリンセス', body: '#ff9fd0', skin: '#fde6da', shoe: '#ffffff', glow: '#ffb3e6', hair: '#ffb3e6', hairStyle: 'drill', eyes: 'cute', eyeColor: '#ff3ea5', gown: '#ff9fd0', gownTrim: '#ffffff', acc: ['tiara', 'bigbow', 'wings'], bigbow: '#7fe8c8', orbs: ['#7fe8c8', '#ffe066', '#ffffff'], sparkle: '#ffffff', wingStyle: 'butterfly', wing: '#ffb3e6', trail: 'heart', need: 'candy_s' },
  { id: 'earthking', name: '大地の王',    body: '#3a2418', skin: '#e8b890', shoe: '#1a0a05', glow: '#ff6a1a', hair: '#ff6a1a', hairStyle: 'spiky', eyes: 'sharp', eyeColor: '#ffd23f', armor: '#6a5040', trim: '#ffd23f', acc: ['horns', 'wings', 'crown', 'cape'], hornColor: '#2a1a10', wingStyle: 'flame', magicCircle: '#ff6a1a', aura: '#ff6a1a', cape: '#3a2418', orbs: ['#6a5040', '#ff6a1a', '#6a5040'], trail: 'ember', need: 'tect_s' },
  { id: 'funkeiro', name: 'フンケイロ',   body: '#ff3ea5', cap: '#141418', brim: '#ff3ea5', skin: '#e8b890', shoe: '#ffffff', glow: '#ff3ea5', acc: ['shades', 'scarf'], scarf: '#ffe066', sig: 'waves', sigColor: '#ff3ea5', trail: 'note', trailColor: '#ff3ea5', need: 'baile' },
  { id: 'cowbell',  name: 'カウベル',     body: '#ffd23f', cap: '#22e6ff', brim: '#0a8aa8', skin: '#f0c8a8', shoe: '#141418', glow: '#ffe066', eyes: 'sharp', eyeColor: '#22e6ff', acc: ['phones', 'shades', 'scarf'], scarf: '#ff3ea5', sig: 'shout', sigColor: '#ffe066', aura: '#ffe066', trail: 'spark', trailColor: '#ffe066', need: 'baile_hard' },
  { id: 'rainha',   name: 'バイレの女王', body: '#ff3ea5', skin: '#e8b890', shoe: '#ffe066', glow: '#ff7ad0', hair: '#2a1018', hairStyle: 'long', eyes: 'cute', eyeColor: '#ff3ea5', dress: '#ff3ea5', frill: '#ffe066', bow: '#22e6ff', acc: ['tiara', 'wings'], tiaraColor: '#ffe066', wingStyle: 'butterfly', wing: '#22e6ff', sig: 'disco', sigColor: '#ff7ad0', sparkle: '#ffe066', aura: '#ff3ea5', trail: 'gold', need: 'baile_s' },
  // ---- 実績のスキン（追加）----
  { id: 'adventurer', name: '冒険者',     body: '#6a4a2a', skin: '#f0c49a', shoe: '#3a2418', glow: '#b6ff8a', hair: '#8a5a2e', hairStyle: 'pony', tie: '#2f6a3a', acc: ['cape', 'backpack'], cape: '#2f6a3a', pack: '#a0602a', trail: 'leaf', need: 'time3h' },
  { id: 'kamaitachi', name: 'かまいたち', body: '#e8f8f0', skin: '#f4e0d0', shoe: '#2a5a4a', glow: '#9fffe0', hair: '#5ac8a0', hairStyle: 'spiky', eyes: 'sharp', eyeColor: '#5cff9d', acc: ['scarf'], scarf: '#5ac8a0', fx: 'echo', trail: 'leaf', trailColor: '#9fffe0', need: 'graze10000' },
  { id: 'bunny',    name: 'うさぎ',       body: '#ffffff', cap: '#ffffff', brim: '#f0e0e8', skin: '#fde6da', shoe: '#ffb3c4', glow: '#ffd0e0', acc: ['bunny'], hat: '#ffffff', eyes: 'cute', eyeColor: '#ff5c8a', trail: 'heart', need: 'jumps10k' },
  { id: 'chick',    name: 'ひよこ',       body: '#ffe066', cap: '#ffcf2e', brim: '#ff9a1a', skin: '#fff0c0', shoe: '#ff9a1a', glow: '#fff4a0', eyes: 'cute', eyeColor: '#3a2418', trail: 'gold', need: 'days7' },
  { id: 'honor',    name: '優等生',       body: '#1e2e5a', skin: '#f4d0b8', shoe: '#141418', glow: '#9fb4ff', hair: '#3a2418', hairStyle: 'pony', tie: '#d81e1e', eyes: 'cute', eyeColor: '#3a2418', acc: ['glasses'], dress: '#1e2e5a', frill: '#ffffff', bow: '#d81e1e', need: 'rankA20' },
  { id: 'acrobat',  name: '綱渡り師',     body: '#c8102e', skin: '#f4c9a0', shoe: '#141418', glow: '#ffd23f', acc: ['tophat', 'cape'], hat: '#ffd23f', cape: '#141418', trail: 'star', need: 'tightrope' },
  { id: 'focus',    name: '集中',         body: '#f4f4f4', skin: '#f0c8a8', shoe: '#141418', glow: '#4d8aff', hair: '#141418', hairStyle: 'spiky', eyes: 'sharp', eyeColor: '#4d8aff', acc: ['headband'], band: '#3b6cf0', need: 'nopause' },
  { id: 'champion', name: 'チャンピオン', body: '#c8102e', skin: '#f4c9a0', shoe: '#5a0610', glow: '#ffd23f', armor: '#ffd23f', trim: '#ffffff', acc: ['cape', 'crown'], cape: '#c8102e', aura: '#ffd23f', trail: 'gold', need: 'clear_run10' },
  { id: 'chef',     name: 'シェフ',       body: '#ffffff', cap: '#ffffff', brim: '#e0e0e0', skin: '#f4c9a0', shoe: '#141418', glow: '#ffe0a0', eyes: 'sharp', eyeColor: '#7a3a08', dress: '#ffffff', frill: '#d81e1e', bow: '#d81e1e', acc: ['chef', 'scarf', 'katana'], scarf: '#d81e1e', blade: '#e8e8e8', orbs: ['#ffd23f', '#ff6a1a', '#5cff9d', '#ff4d6d'], sparkle: '#ffe0a0', aura: '#ffe0a0', sig: 'steam', sigColor: '#ffffff', trail: 'star', trailColor: '#ffe0a0', need: 'four_diff' },
  { id: 'otaku',    name: '譜面マニア',   body: '#2a2a3a', cap: '#3b6cf0', brim: '#2c54c4', skin: '#f4d0b8', shoe: '#141418', glow: '#9fb4ff', acc: ['glasses', 'phones'], sparkle: '#9fb4ff', aura: '#9fb4ff', sig: 'arrows', sigColors: ['#3b6cf0', '#ff5c8a', '#ffe066', '#5cff9d'], trail: 'note', trailColor: '#9fb4ff', need: 'charts_all' },
  { id: 'pajama',   name: 'パジャマ',     body: '#6c7bff', cap: '#6c7bff', brim: '#4a5ad8', skin: '#fde6da', shoe: '#ffffff', glow: '#c8d0ff', acc: ['knit', 'blush'], hat: '#ffe066', trail: 'star', need: 'night' },
  { id: 'clover',   name: 'クローバー',   body: '#2fa04a', cap: '#ffffff', brim: '#e0e0e0', skin: '#f4d0b8', shoe: '#1a5a2a', glow: '#9fff9f', acc: ['party'], hat: '#5cff9d', trail: 'leaf', need: 'lucky7' },
  { id: 'fan',      name: 'ファン',       body: '#ff4fa3', skin: '#fde6da', shoe: '#ffffff', glow: '#ff9fd0', hair: '#ffe066', hairStyle: 'twin', tie: '#ff4fa3', eyes: 'cute', eyeColor: '#ff4fa3', acc: ['phones'], trail: 'note', need: 'favorite' },
  { id: 'kishin',   name: '鬼神',         body: '#7a0f1e', skin: '#f0c4a8', shoe: '#140306', glow: '#ff3b5c', acc: ['horns', 'flamehair', 'katana'], flame: ['#d81e1e', '#ff8a1a'], hornColor: '#ffe0a0', eyes: 'sharp', eyeColor: '#ff3b3b', armor: '#2a0a10', trim: '#ff3b5c', aura: '#ff3b5c', blade: '#ff3b5c', sig: 'flames', sigColor: '#ff3b5c', trail: 'ember', need: 'plays2000' },
  { id: 'fujin',    name: '風神',         body: '#e0fff4', skin: '#f4e8e0', shoe: '#2a5a4a', glow: '#9fffe0', hair: '#9fffe0', hairStyle: 'long', eyes: 'sharp', eyeColor: '#5cff9d', acc: ['wings', 'scarf'], wing: '#ffffff', scarf: '#5ac8a0', sparkle: '#9fffe0', aura: '#9fffe0', sig: 'wind', sigColor: '#9fffe0', trail: 'feather', need: 'graze100k' },
  { id: 'invincible', name: '無敵',       body: '#ffffff', cap: '#ffffff', brim: '#e0e0e0', skin: '#fff4ec', shoe: '#ffffff', glow: '#ffffff', eyes: 'sharp', eyeColor: '#ffd23f', acc: ['wings', 'halo', 'crown'], wingStyle: 'crystal', wing: '#ffffff', haloColor: '#ffe066', fx: 'rainbow', aura: '#ffffff', sparkle: '#ffffff', sig: 'barrier', sigColor: '#ffe066', trail: 'rainbow', need: 'fd_imp' },
  { id: 'hardworker', name: 'がんばり屋', body: '#ff8a1a', skin: '#f4c9a0', shoe: '#3a2418', glow: '#ffd23f', hair: '#3a2418', hairStyle: 'pony', tie: '#ffffff', eyes: 'cute', eyeColor: '#3a2418', acc: ['headband'], band: '#ffffff', trail: 'gold', need: 'quest10' },
  { id: 'missionmaster', name: '司令官',  body: '#2a3a2a', cap: '#2a3a2a', brim: '#141a14', skin: '#f0c8a8', shoe: '#141414', glow: '#ffd23f', eyes: 'sharp', eyeColor: '#ffd23f', armor: '#3a4a3a', trim: '#ffd23f', acc: ['cape', 'monocle'], cape: '#141a14', sparkle: '#ffd23f', aura: '#ffd23f', sig: 'radar', sigColor: '#5cff9d', trail: 'star', trailColor: '#ffd23f', need: 'quest50' },
  { id: 'challenger', name: '挑戦者',     body: '#3b6cf0', skin: '#f4c9a0', shoe: '#141a3a', glow: '#9fb4ff', hair: '#ffffff', hairStyle: 'spiky', eyes: 'sharp', eyeColor: '#4dd2ff', armor: '#2c54c4', trim: '#ffffff', acc: ['scarf'], scarf: '#ffd23f', trail: 'bolt', need: 'daily10' },
  { id: 'sunbeam',  name: '日々の光',     body: '#ffd23f', skin: '#fff0d8', shoe: '#c49a10', glow: '#ffe066', hair: '#ffe8a0', hairStyle: 'long', eyes: 'cute', eyeColor: '#d09010', dress: '#ffffff', frill: '#ffd23f', bow: '#ff8a1a', acc: ['halo', 'wings'], sparkle: '#ffe066', aura: '#ffe066', wingStyle: 'light', wing: '#ffe066', sig: 'motes', sigColor: '#ffe066', trail: 'gold', need: 'daily_streak7' },
  { id: 'luckystar', name: 'ラッキースター', body: '#ffd23f', cap: '#ff5c8a', brim: '#c21a74', skin: '#fde6da', shoe: '#c49a10', glow: '#ffe066', eyes: 'cute', eyeColor: '#ff5c8a', orbs: ['#ffe066', '#ff5c8a', '#4dd2ff'], sparkle: '#ffe066', trail: 'gold', need: 'gacha100' },
  // ---- ガチャ限定（economy.js のガチャからだけ出る。実績では手に入らない）----
  //   hairStyle: long 長い髪 / twin ツインテール / pony ポニーテール / spiky つんつん   eyes: cute 大きな目 / sharp するどい光る目
  //   dress スカート / armor よろい / sparkle まわりできらきら
  { id: 'g_idol',   gacha: true, name: '星屑アイドル', body: '#ff7ab8', skin: '#fde6da', shoe: '#ffffff', glow: '#ffb3da', hair: '#ff9fd0', hairStyle: 'twin', tie: '#ffe066', eyes: 'cute', eyeColor: '#c0307a', dress: '#ffffff', frill: '#ff7ab8', bow: '#ffe066', acc: ['ribbon'], ribbonColor: '#ffe066', sparkle: '#ffe066', aura: '#ff9fd0', sig: 'spotlight', sigColor: '#ff9fd0', trail: 'star', trailColor: '#ffb3da' },
  { id: 'g_miko',   gacha: true, name: '巫女',         body: '#ffffff', skin: '#fde3d0', shoe: '#c8102e', glow: '#ff6a6a', hair: '#141018', hairStyle: 'long', tie: '#ffffff', eyes: 'cute', eyeColor: '#8a1020', dress: '#d81e1e', frill: '#ffffff', bow: '#d81e1e', acc: ['ribbon'], ribbonColor: '#d81e1e', sig: 'ofuda', sigColor: '#d81e1e', trail: 'petal', trailColor: '#ff8aa8' },
  { id: 'g_magical', gacha: true, name: '魔法少女',    body: '#7a5cff', skin: '#fde6da', shoe: '#5a3fd8', glow: '#c8b4ff', hair: '#c8b4ff', hairStyle: 'pony', tie: '#ff5c8a', eyes: 'cute', eyeColor: '#5a3fd8', dress: '#9f8cff', frill: '#ffffff', bow: '#ff5c8a', acc: ['wings'], wingStyle: 'butterfly', wing: '#ffb3e6', sparkle: '#ffffff', aura: '#c8b4ff', sig: 'hearts', sigColor: '#ff7ad0', trail: 'heart' },
  { id: 'g_snow',   gacha: true, name: '雪の姫',       body: '#bfe6ff', skin: '#fff4f8', shoe: '#8ab8e0', glow: '#e0f6ff', hair: '#e8f4ff', hairStyle: 'long', tie: '#9fdcff', eyes: 'cute', eyeColor: '#3a8ad8', dress: '#e0f4ff', frill: '#9fdcff', bow: '#9fdcff', acc: ['crown'], crownColor: '#e0f0ff', sparkle: '#d8f6ff', aura: '#bfefff', alpha: 0.95, sig: 'aurora', sigColor: '#7fffd8', trail: 'snow' },
  { id: 'g_neko',   gacha: true, name: 'ねこメイド',   body: '#141418', skin: '#fde6da', shoe: '#141418', glow: '#ffd2a0', hair: '#f2a65a', hairStyle: 'twin', tie: '#ffffff', eyes: 'cute', eyeColor: '#2a8a4a', dress: '#141418', frill: '#ffffff', bow: '#ffffff', acc: ['ears'], cap: '#f2a65a', sig: 'paws', sigColor: '#ffc4dc', trail: 'heart', trailColor: '#ffc4dc' },
  { id: 'g_knight', gacha: true, name: '黒騎士',       body: '#1a1a22', skin: '#e8c8b0', shoe: '#0a0a10', glow: '#ff3b3b', hair: '#d8dce8', hairStyle: 'spiky', eyes: 'sharp', eyeColor: '#ff3b3b', armor: '#2a2a36', trim: '#d9a520', acc: ['cape'], cape: '#7a0f1e', aura: '#ff3b3b', sig: 'swords', sigColor: '#ff6a6a', trail: 'ember' },
  { id: 'g_cyber',  gacha: true, name: 'サイバー忍',   body: '#0c1018', skin: '#d8c0b0', shoe: '#22e6ff', glow: '#22e6ff', hair: '#22e6ff', hairStyle: 'spiky', eyes: 'sharp', eyeColor: '#22e6ff', armor: '#1a2230', trim: '#22e6ff', acc: ['scarf', 'katana'], scarf: '#ff2e88', blade: '#9fe8ff', fx: 'echo', sig: 'hud', sigColor: '#22e6ff', trail: 'pixel', trailColor: '#22e6ff' },
  { id: 'g_dragon', gacha: true, name: '竜騎士',       body: '#6a0a0a', skin: '#f0c8a8', shoe: '#2a0505', glow: '#ff8a1a', hair: '#ff6a1a', hairStyle: 'spiky', eyes: 'sharp', eyeColor: '#ffd23f', armor: '#8a1a10', trim: '#ffd23f', acc: ['wings', 'horns'], wingStyle: 'bat', wing: '#8a1a10', hornColor: '#ffd23f', aura: '#ff8a1a', sig: 'fireball', sigColor: '#ff6a1a', trail: 'ember' },
  { id: 'g_star',   gacha: true, name: '星の王',       body: '#141a4a', skin: '#f4e0d0', shoe: '#0a0e28', glow: '#ffe066', hair: '#ffffff', hairStyle: 'long', eyes: 'sharp', eyeColor: '#ffe066', armor: '#2a3478', trim: '#ffe066', acc: ['wings', 'crown', 'cape'], wingStyle: 'light', wing: '#ffe066', cape: '#0a0e28', sparkle: '#ffe066', aura: '#ffe066', sig: 'shooting', sigColor: '#ffe066', trail: 'star', trailColor: '#ffe066' },
  // ---- ガチャ限定（豪華版）: gown ロングドレス / sleeves 着物の袖 / magicCircle 魔法陣 / orbs 回る光の玉 / tails きつねのしっぽ / tiara / bigbow 背中のリボン
  { id: 'g_seraph', gacha: true, name: '天使長',       body: '#ffffff', skin: '#fff0e4', shoe: '#ffe9a8', glow: '#fff4c0', hair: '#ffe8a0', hairStyle: 'long', eyes: 'cute', eyeColor: '#d09010', gown: '#ffffff', gownTrim: '#ffd23f', acc: ['wings', 'halo', 'tiara'], wingStyle: 'seraph', wing: '#ffffff', haloColor: '#ffe066', tiaraColor: '#ffe9a8', sparkle: '#fff4c0', aura: '#ffe066', sig: 'pillar', sigColor: '#fff4c0', trail: 'feather' },
  { id: 'g_ojou',   gacha: true, name: 'お嬢様',       body: '#ff5c8a', skin: '#fde6da', shoe: '#ffffff', glow: '#ffb3cf', hair: '#ffd23f', hairStyle: 'drill', eyes: 'cute', eyeColor: '#c0307a', gown: '#ff5c8a', gownTrim: '#ffffff', acc: ['tiara', 'bigbow'], bigbow: '#ffffff', orbs: ['#ff9fd0', '#ffe066', '#ffffff'], sparkle: '#ffe066', sig: 'roses', sigColor: '#ff3b6a', trail: 'gem' },
  { id: 'g_kyubi',  gacha: true, name: '九尾の巫女',   body: '#ffffff', skin: '#fff0e8', shoe: '#d81e1e', glow: '#9fe8ff', hair: '#f4f0ff', hairStyle: 'long', eyes: 'cute', eyeColor: '#d81e1e', dress: '#d81e1e', frill: '#ffffff', bow: '#d81e1e', sleeves: '#ffffff', sleeveTrim: '#d81e1e', obi: '#d81e1e', acc: ['ears', 'tails'], cap: '#f4f0ff', tails: 9, tailColor: '#fff4e0', tailTip: '#9fe8ff', orbs: ['#4d8aff', '#9fe8ff', '#4d8aff'], aura: '#9fe8ff', sig: 'foxfire', sigColor: '#7fd8ff', trail: 'firefly', trailColor: '#9fe8ff' },
  { id: 'g_diva',   gacha: true, name: '電子の歌姫',   body: '#2a2a3a', skin: '#fde6da', shoe: '#2a2a3a', glow: '#3fd8c8', hair: '#3fd8c8', hairStyle: 'twin', tie: '#ff3ea5', eyes: 'cute', eyeColor: '#1a8a8a', dress: '#2a2a3a', frill: '#3fd8c8', bow: '#ff3ea5', acc: ['phones'], sparkle: '#3fd8c8', aura: '#3fd8c8', sig: 'eq', sigColor: '#3fd8c8', sigColor2: '#ff3ea5', trail: 'note', trailColor: '#3fd8c8' },
  { id: 'g_sakura', gacha: true, name: '桜姫',         body: '#ff9fc4', skin: '#fff0ec', shoe: '#a0506a', glow: '#ffc4dc', hair: '#141018', hairStyle: 'long', eyes: 'cute', eyeColor: '#d84a8a', gown: '#ff9fc4', gownTrim: '#ffffff', sleeves: '#ffb3cf', sleeveTrim: '#ffffff', obi: '#c8102e', acc: ['ribbon', 'tiara'], ribbonColor: '#ff5c8a', tiaraColor: '#ffd23f', sparkle: '#ffc4dc', sig: 'petals', sigColor: '#ffb3cf', trail: 'petal' },
  { id: 'g_maou',   gacha: true, name: '魔王',         body: '#1a0528', skin: '#e8d0d8', shoe: '#0a0210', glow: '#c77dff', hair: '#c8c8d8', hairStyle: 'long', eyes: 'sharp', eyeColor: '#c77dff', armor: '#2a0a3a', trim: '#c77dff', acc: ['horns', 'cape', 'wings'], hornColor: '#e0d0ff', wingStyle: 'bat', wing: '#1a0528', cape: '#3a0a5a', magicCircle: '#c77dff', orbs: ['#8a2aff', '#c77dff', '#8a2aff'], aura: '#c77dff', fx: 'echo', sig: 'vortex', sigColor: '#8a2aff', trail: 'galaxy' },
  { id: 'g_kensei', gacha: true, name: '炎の剣聖',     body: '#3a0a05', skin: '#f0c8a8', shoe: '#2a0505', glow: '#ff8a1a', hair: '#ff3b1a', hairStyle: 'spiky', eyes: 'sharp', eyeColor: '#ffd23f', armor: '#d9a520', trim: '#ff3b1a', acc: ['wings', 'katana', 'scarf'], wingStyle: 'flame', scarf: '#ff3b1a', blade: '#ffb05c', aura: '#ff6a1a', sig: 'slash', sigColor: '#ffb05c', trail: 'ember' },
  { id: 'g_crystal', gacha: true, name: '水晶竜',      body: '#2a5a7a', skin: '#e8f4ff', shoe: '#1a3a5a', glow: '#9fe8ff', hair: '#bfefff', hairStyle: 'spiky', eyes: 'sharp', eyeColor: '#22e6ff', armor: '#5ab0d8', trim: '#ffffff', acc: ['wings', 'horns'], wingStyle: 'crystal', wing: '#9fe8ff', hornColor: '#e0f8ff', sparkle: '#bfefff', aura: '#9fe8ff', sig: 'spikes', sigColor: '#9fe8ff', trail: 'gem' },
  { id: 'g_chrono', gacha: true, name: '時の魔術師',   body: '#1a1a4a', skin: '#f0dcd0', shoe: '#0a0a28', glow: '#ffd23f', hair: '#e0e4f0', hairStyle: 'long', eyes: 'sharp', eyeColor: '#ffd23f', gown: '#1a1a4a', gownTrim: '#ffd23f', acc: ['cape', 'crown'], cape: '#0a0a28', crownColor: '#ffd23f', sparkle: '#ffe066', sig: 'gears', sigColor: '#ffd23f', trail: 'galaxy' },
];
const GACHA_SKINS = SKINS.filter(s => s.gacha);
const achById = id => ACHIEVEMENTS.find(a => a.id === id);
const skinUnlocked = s => s.gacha ? !!(typeof E !== 'undefined' && E.owned['skin_' + s.id]) : !s.need || !!P.unlocked[s.need];
// えらんだスキン（パーツを重ねる前）
function baseSkin() {
  const s = SKINS.find(k => k.id === P.skin);
  return s && skinUnlocked(s) ? s : SKINS[0];
}
// 実際に描くスキン = えらんだスキン ＋ ガチャのパーツ（economy.js の composeSkin）
function heroSkin() { return typeof composeSkin === 'function' ? composeSkin(baseSkin()) : baseSkin(); }

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
  const base = songBase(song);
  if (!runCounts() || NOT_COUNTED.has(base)) return [];
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
  if (!runCounts() || NOT_COUNTED.has(songBase(song)) || (n !== 50 && n !== 200 && n !== 400)) return;
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
  if (colTab === 'parts') { renderParts(collectionBody); return; }
  if (colTab === 'skins') {
    const cur = baseSkin().id;
    collectionBody.innerHTML = `<div class="skin-grid">${SKINS.map(s => {
      const open = skinUnlocked(s), a = s.need && achById(s.need);
      return `<button class="skin-card${open ? '' : ' locked'}${s.id === cur ? ' equipped' : ''}${s.gacha ? ' gacha' : ''}" data-skin="${s.id}" ${open ? '' : 'disabled'}>
        <canvas width="128" height="112"></canvas>
        <span class="skin-name">${open ? s.name : '？？？'}</span>${a ? `<i class="ach-lv lv${a.lv}">${'★'.repeat(a.lv)}</i>` : s.gacha ? '<i class="g-tag">ガチャ限定</i>' : ''}
        <span class="skin-need">${s.id === cur ? '使用中' : open ? 'タップで着がえる' : s.gacha ? '🎰 ガチャで出ることがある' : '🔒 ' + a.name + '<br>' + a.desc}</span>
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
    collectionBody.innerHTML = `<div class="ach-summary">${done} / ${ACHIEVEMENTS.length} 解除</div><div class="ach-note">First Step は練習用の曲なので、チャレンジには数えません</div>` + ACHIEVEMENTS.map(a => {
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
//   画面に見えている見本だけを描き、見えている間はアニメーションさせる（羽・しっぽ・光などが動く）。
//   見えていない見本は描かないので、コレクションがすぐ開く
function paintPreview(cv, s, locked) {
  const g = cv.getContext('2d');
  g.clearRect(0, 0, cv.width, cv.height);
  if (typeof paintHero !== 'function') return;
  g.save();
  paintHero(g, 64 - 22, 100 - 50, 44, 50, 1, 100, 0, s);
  g.restore();
  if (locked) {                                                    // まだ持っていない: 黒いかげ（filter を使うより、ずっと速い）
    g.save(); g.globalCompositeOperation = 'source-in'; g.fillStyle = 'rgba(0,0,0,0.35)'; g.fillRect(0, 0, cv.width, cv.height); g.restore();
  }
}
const previewLive = new Set();                                     // 見えていて、動かす見本
const previewIO = typeof IntersectionObserver === 'function' ? new IntersectionObserver(es => {
  for (const e of es) {
    const cv = e.target, d = cv._pv;
    if (!d) continue;
    if (e.isIntersecting) { if (!d.drawn) { paintPreview(cv, d.s, d.locked); d.drawn = true; } if (!d.locked) previewLive.add(cv); }
    else previewLive.delete(cv);
  }
  if (previewLive.size) previewLoop();
}) : null;
let previewRaf = 0, previewLast = 0;
function previewLoop() {
  if (previewRaf) return;
  const step = now => {
    previewRaf = 0;
    for (const cv of previewLive) if (!cv.isConnected) { previewLive.delete(cv); previewIO.unobserve(cv); }
    if (!previewLive.size) return;
    if (now - previewLast > 30) {                                  // 1秒に 30 回くらい描き直す（スマホでも重くならないように）
      previewLast = now;
      for (const cv of previewLive) paintPreview(cv, cv._pv.s, false);
    }
    previewRaf = requestAnimationFrame(step);
  };
  previewRaf = requestAnimationFrame(step);
}
function drawSkinPreview(cv, s, locked) {
  if (!previewIO) { paintPreview(cv, s, locked); return; }
  if (cv._pv) { cv._pv.s = s; cv._pv.locked = locked; cv._pv.drawn = false; previewLive.delete(cv); previewIO.unobserve(cv); }
  else cv._pv = { s, locked, drawn: false };
  previewIO.observe(cv);                                           // 見えたときに描く
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
// 記録（クリア・ランク）から決まる実績は、First Step を数えなくなったので、1 回だけ確かめ直す
// （First Step だけで解除されていたものは、もどす。プレイ回数などの合計の記録は、そのまま）
const RECHECK = new Set(['クリア', 'ランク', '曲ごと', 'コレクション']), KEEP = new Set(['last_life', 'clear_run10', 's_run3']);
function recheckOnce() {
  if ((P.ver || 1) >= 2) return;
  for (let pass = 0; pass < 2; pass++) for (const a of ACHIEVEMENTS) {
    if (!P.unlocked[a.id] || !(RECHECK.has(a.g) || a.id === 'first_clear') || KEEP.has(a.id)) continue;
    let ok = true;
    try { ok = achDone(a); } catch (e) { ok = true; }
    if (!ok) delete P.unlocked[a.id];
  }
  delete P.unlocked.fs_s;
  P.ver = 2; saveProgress();
}
document.addEventListener('DOMContentLoaded', () => { recheckOnce(); checkAchievements(); updateCollectionCount(); });
