'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');

const PRODUCT_KEY = "miniB";
const PRODUCT_NAME = "mini toto B";
const PRODUCT_MATCH_NUMBERS = [1,2,3,4,5];
const TOTO13_MATCH_NUMBERS = [6,7,8,9,10];
const ROUND = 1674;
const DRAW_DATE = '2026-11-25';
const DEADLINE_AT = '2026-11-25T09:50:00.000Z';
const GPT_COMMIT = "1e10fa09da1a9dc71feb2ab6e4d1f09cf16dfaef";
const GPT_MODEL_BLOB = "20cde0fc85016db3ef7abac7d2bb485510ba4e22";
const HISTORY_BLOB = "1a6a3230330ef67468755faf8504cac1a9741570";
const ALIAS_BLOB = "5de22584524ff4c07ddac1d27f49afbbbc5f88ab";
const PARSER_BLOB = "ef557e084cab802df7830d949bd1f52ddee5db7c";
const SCHEDULE_COMMIT = "d0af7ae01d66dacf8c1ed124c8edf3a927a29494";
const SCHEDULE_BLOB = "94e9dd375d33c44e26eb2b8098fd54b22f346556";
const TOTO13_REFERENCE_COMMIT = "e5ca5ff2bc08119b9bc591daa282130513d5098b";
const TOTO13_REFERENCE_BLOB = "e9128701e2636f13728b02d14195b20de10c4453";
const OFFICIAL_CARD_URL = "https://store.toto-dream.com/dcs/subos/screen/pi01/spin000/PGSPIN00001DisptotoLotInfo.form?holdCntId=1674";
const OFFICIAL_VOTE_URL = "https://store.toto-dream.com/dcs/subos/screen/pi09/spin003/PGSPIN00301InitVoteRate.form?commodityId=07&holdCntId=1674";
const BRANCH_NAME = "gpt/miniB-round-1674-v1-20261124T0110JST";
const HISTORY_PATH = path.join(process.cwd(), 'gpt-source', 'data', 'history.json');
const ALIASES_PATH = path.join(process.cwd(), 'gpt-source', 'data', 'team_aliases.json');
const MODEL_PATH = path.join(process.cwd(), 'gpt-source', 'model.js');
const PARSER_PATH = path.join(process.cwd(), 'gpt-source', 'scripts', 'auto_pipeline.js');
const SCHEDULE_PATH = path.join(process.cwd(), 'data', 'schedule', 'round_1674.json');
const REFERENCE_PATH = path.join(process.cwd(), 'toto13-source', 'predictions', 'round_1674_ChatGPT_shared_score_v1.jsonl');
const PREDICTION_PATH = path.join(process.cwd(), 'predictions', 'round_1674_ChatGPT_' + PRODUCT_KEY + '.jsonl');
const MANIFEST_PATH = path.join(process.cwd(), 'reports', 'round_1674_' + PRODUCT_KEY + '_v1_manifest.json');
const { predict, canonical } = require(MODEL_PATH);

const injurySources = [
  {
    "name": "ファジアーノ岡山 木村太哉選手の負傷について",
    "url": "https://www.fagiano-okayama.com/news/202611131001/",
    "publishedAt": "2026-11-13T00:00:00+09:00"
  },
  {
    "name": "北海道コンサドーレ札幌 川原颯斗選手の負傷について",
    "url": "https://www.consadole-sapporo.jp/news/2026/11/17363/",
    "publishedAt": "2026-11-21T00:00:00+09:00"
  },
  {
    "name": "北海道コンサドーレ札幌 福森晃斗選手の負傷について",
    "url": "https://www.consadole-sapporo.jp/news/2026/11/15643/",
    "publishedAt": "2026-11-03T00:00:00+09:00"
  },
  {
    "name": "横浜F・マリノス 山根陸選手の負傷について",
    "url": "https://www.f-marinos.com/news/team/10930",
    "publishedAt": "2026-11-19T00:00:00+09:00"
  },
  {
    "name": "横浜F・マリノス ジョルディ クルークス選手の負傷について",
    "url": "https://www.f-marinos.com/news/team/10877",
    "publishedAt": "2026-11-05T00:00:00+09:00"
  }
];
const sourceRows = [
  {
    "name": "スポーツくじ公式 第1674回カード",
    "url": "https://store.toto-dream.com/dcs/subos/screen/pi01/spin000/PGSPIN00001DisptotoLotInfo.form?holdCntId=1674",
    "publishedAt": "2026-11-24T00:44:00+09:00"
  },
  {
    "name": "Jリーグ公式 出場停止選手のお知らせ（2026/11/23）",
    "url": "https://www.jleague.jp/news/article/35431/?navicode=j1",
    "publishedAt": "2026-11-23T18:00:00+09:00"
  },
  {
    "name": "Jリーグ公式 J1第16節プレビュー",
    "url": "https://www.jleague.jp/news/article/35426/",
    "publishedAt": "2026-11-23T17:00:00+09:00"
  },
  {
    "name": "Jリーグ公式 J2第19節プレビュー",
    "url": "https://www.jleague.jp/news/article/35427/?navicode=j2",
    "publishedAt": "2026-11-23T18:00:00+09:00"
  },
  {
    "name": "ファジアーノ岡山 木村太哉選手の負傷について",
    "url": "https://www.fagiano-okayama.com/news/202611131001/",
    "publishedAt": "2026-11-13T00:00:00+09:00"
  },
  {
    "name": "北海道コンサドーレ札幌 川原颯斗選手の負傷について",
    "url": "https://www.consadole-sapporo.jp/news/2026/11/17363/",
    "publishedAt": "2026-11-21T00:00:00+09:00"
  },
  {
    "name": "北海道コンサドーレ札幌 福森晃斗選手の負傷について",
    "url": "https://www.consadole-sapporo.jp/news/2026/11/15643/",
    "publishedAt": "2026-11-03T00:00:00+09:00"
  },
  {
    "name": "横浜F・マリノス 山根陸選手の負傷について",
    "url": "https://www.f-marinos.com/news/team/10930",
    "publishedAt": "2026-11-19T00:00:00+09:00"
  },
  {
    "name": "横浜F・マリノス ジョルディ クルークス選手の負傷について",
    "url": "https://www.f-marinos.com/news/team/10877",
    "publishedAt": "2026-11-05T00:00:00+09:00"
  }
];
const teamNotes = {
  "ファジアーノ岡山": {
    "injury": true,
    "note": "木村太哉：11/13公式発表、左足内果疲労骨折、全治3か月程度。11/25は欠場見込み。"
  },
  "北海道コンサドーレ札幌": {
    "injury": true,
    "note": "川原颯斗（11/21発表、右大腿二頭筋肉離れ）・福森晃斗（11/3発表、右大腿二頭筋肉離れ）。復帰時期は未公表、11/25出場可否は未確定。"
  },
  "横浜Ｆ・マリノス": {
    "injury": true,
    "note": "山根陸（11/19発表、左膝内側側副靱帯損傷）・ジョルディ クルークス（11/5発表、左ハムストリング肉離れ）。復帰時期は未確定。"
  },
  "ジュビロ磐田": {
    "suspension": true,
    "note": "ユーリ ララ：Jリーグ公式11/23発表、累積警告による1試合停止、11/25 J2第19節が対象。"
  },
  "横浜ＦＣ": {
    "suspension": true,
    "note": "ジョアン パウロ：Jリーグ公式11/23発表、累積警告による1試合停止、11/25 J2第19節が対象。"
  },
  "ＲＢ大宮アルディージャ": {
    "suspension": true,
    "note": "関口 凱心：Jリーグ公式11/23発表、累積警告による1試合停止、11/25 J2第19節が対象。"
  },
  "清水エスパルス": {
    "preview": true,
    "note": "Jリーグ公式J1プレビューは北川航也が前節に負傷から復帰し5試合ぶりに得点と記載。11/25の出場可否は未確定。"
  },
  "Ｖ・ファーレン長崎": {
    "preview": true,
    "note": "Jリーグ公式J1プレビューはノーマン キャンベルが前節に復帰と記載。11/25の出場可否は未確定。"
  }
};
const suspensions = [
  {match:9,team:'ジュビロ磐田',player:'ユーリ ララ',competition:'J2',code:'J2(f)',reason:'累積警告による1試合停止',suspendedFixture:'2026-11-25 J2第19節'},
  {match:12,team:'横浜ＦＣ',player:'ジョアン パウロ',competition:'J2',code:'J2(f)',reason:'累積警告による1試合停止',suspendedFixture:'2026-11-25 J2第19節'},
  {match:13,team:'ＲＢ大宮アルディージャ',player:'関口 凱心',competition:'J2',code:'J2(f)',reason:'累積警告による1試合停止',suspendedFixture:'2026-11-25 J2第19節'}
];
const injuryReports = [
  {team:'ファジアーノ岡山',player:'木村太哉',publishedAt:'2026-11-13',injuryDate:'2026-11-10',diagnosis:'左足内果疲労骨折',returnEstimate:'全治3か月程度',availability:'11/25は欠場見込み（診断上の期間内）',sourceUrl:'https://www.fagiano-okayama.com/news/202611131001/'},
  {team:'北海道コンサドーレ札幌',player:'川原颯斗',number:39,position:'DF',publishedAt:'2026-11-21',injuryDate:'2026-11-08',diagnosis:'右大腿二頭筋肉離れ',returnEstimate:'未公表',availability:'不明。復帰発表なし',sourceUrl:'https://www.consadole-sapporo.jp/news/2026/11/17363/'},
  {team:'北海道コンサドーレ札幌',player:'福森晃斗',number:5,position:'DF',publishedAt:'2026-11-03',injuryDate:'2026-10-25',diagnosis:'右大腿二頭筋肉離れ',returnEstimate:'未公表',availability:'不明。復帰発表なし',sourceUrl:'https://www.consadole-sapporo.jp/news/2026/11/15643/'},
  {team:'横浜Ｆ・マリノス',player:'山根陸',position:'MF',publishedAt:'2026-11-19',injuryDate:'2026-11-15',diagnosis:'左膝内側側副靱帯損傷',returnEstimate:'経過を見ながら判断',availability:'不明。復帰時期未定',sourceUrl:'https://www.f-marinos.com/news/team/10930'},
  {team:'横浜Ｆ・マリノス',player:'ジョルディ クルークス',position:'MF',publishedAt:'2026-11-05',injuryDate:'2026-11-01',diagnosis:'左ハムストリング肉離れ',returnEstimate:'経過を見ながら判断',availability:'不明。復帰時期未定',sourceUrl:'https://www.f-marinos.com/news/team/10877'}
];
const j1PreviewNotes = [
  {team:'清水エスパルス',player:'北川 航也',note:'前節に負傷から復帰し、5試合ぶりの得点。11/25の出場可否は未確定。'},
  {team:'Ｖ・ファーレン長崎',player:'ノーマン キャンベル',note:'前節に復帰。11/25の出場可否は未確定。'}
];
const j2PreviewNotes = [
  {match:8,team:'北海道コンサドーレ札幌',note:'前節は横浜FCに2-0。途中出場のヴィニ ペイショット、アマドゥ バカヨコの起用法が焦点。'},
  {match:9,team:'ジュビロ磐田',note:'前節は大宮を下し9試合負けなし。公式プレビューは高強度のプレスとカウンターを記載。'},
  {match:10,team:'サガン鳥栖',note:'前節は仙台と引き分け。途中出場の酒井宣福が今季初ゴール。'},
  {match:10,team:'大分トリニータ',note:'3試合勝利なし。相澤デイビッドが2試合連続得点。'},
  {match:11,team:'いわきＦＣ',note:'前節は宮崎と引き分け、3試合負けなし。桒田大誠がプロ初ゴール。'},
  {match:11,team:'カターレ富山',note:'前節は大分と引き分け、2試合勝利なし。坪井清志郎が先制点。'},
  {match:12,team:'横浜ＦＣ',note:'前節は札幌に敗れ、2試合連続無得点。ジョアン パウロは11/25出場停止。'},
  {match:13,team:'ＲＢ大宮アルディージャ',note:'前節は磐田に敗れ4連勝が止まる。関口凱心は11/25出場停止。'},
  {match:13,team:'徳島ヴォルティス',note:'前節は湘南に競り負け。宮崎純真が今季初ゴール。'}
];

function gitBlobSha(buffer) {
  const header = Buffer.from('blob ' + buffer.length + '\0');
  return crypto.createHash('sha1').update(Buffer.concat([header, buffer])).digest('hex');
}
function readText(file) { return fs.readFileSync(file, 'utf8'); }
function round8(x) { return Number(Number(x).toFixed(8)); }
function maxAbs(a, b) { return Math.max(...['0','1','2'].map(k => Math.abs(a[k] - b[k]))); }

const verifyMode = process.argv.includes('--verify');
const existingManifest = verifyMode ? JSON.parse(readText(MANIFEST_PATH)) : null;
const generatedAt = verifyMode ? existingManifest.generatedAt : new Date().toISOString();
assert.ok(generatedAt && Number.isFinite(Date.parse(generatedAt)), 'generatedAt must be a real ISO timestamp');
const stamp = generatedAt.replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');

const historyDoc = JSON.parse(readText(HISTORY_PATH));
const aliasesDoc = JSON.parse(readText(ALIASES_PATH));
const schedule = JSON.parse(readText(SCHEDULE_PATH));
const history = historyDoc.history;
assert.equal(schedule.round, ROUND);
assert.deepEqual(schedule.holdDates, [DRAW_DATE]);
assert.equal(schedule.matches.length, 13);
assert.deepEqual(schedule.miniTotoA, [1,2,3,4,5]);
assert.deepEqual(schedule.miniTotoB, [6,7,8,9,10]);
assert.equal(history.length, 510);
assert.equal(gitBlobSha(fs.readFileSync(MODEL_PATH)), GPT_MODEL_BLOB);
assert.equal(gitBlobSha(fs.readFileSync(HISTORY_PATH)), HISTORY_BLOB);
assert.equal(gitBlobSha(fs.readFileSync(ALIASES_PATH)), ALIAS_BLOB);
assert.equal(gitBlobSha(fs.readFileSync(PARSER_PATH)), PARSER_BLOB);
assert.equal(gitBlobSha(fs.readFileSync(SCHEDULE_PATH)), SCHEDULE_BLOB);

const historyDates = history.map(m => m.date);
assert.deepEqual(historyDates, [...historyDates].sort());
const canonicalKeys = history.map(m => [m.date, canonical(m.home), canonical(m.away)].join('|'));
assert.equal(new Set(canonicalKeys).size, history.length);
const fetchedAtValues = [...new Set(history.map(m => m.fetchedAt).filter(Boolean))];
const sourceValues = [...new Set(history.map(m => m.source).filter(Boolean))];
const latestResultDate = history.reduce((m,r) => r.date > m ? r.date : m, '');
const uniqueRawNames = [...new Set(history.flatMap(m => [m.home,m.away]))];
const aliasMappedOccurrences = history.reduce((n,m) => n + [m.home,m.away].filter(x => Object.prototype.hasOwnProperty.call(aliasesDoc.aliases,x)).length, 0);
const uniqueAliasKeysUsed = uniqueRawNames.filter(x => Object.prototype.hasOwnProperty.call(aliasesDoc.aliases,x)).length;

const referenceText = readText(REFERENCE_PATH);
assert.equal(gitBlobSha(Buffer.from(referenceText, 'utf8')), TOTO13_REFERENCE_BLOB);
const referenceRows = referenceText.trim().split(/\r?\n/).filter(Boolean).map(JSON.parse);
const referenceRevisionByMatch = new Map(referenceRows.filter(r => r.round === ROUND && r.revisionOf).map(r => [r.matchNumber, r]));
assert.equal(referenceRevisionByMatch.size, 13);

const matchMap = new Map(schedule.matches.map(m => [m.matchNumber, m]));
const diagnostics = [];
const rows = PRODUCT_MATCH_NUMBERS.map((productMatchNumber, index) => {
  const matchNumber = TOTO13_MATCH_NUMBERS[index];
  assert.equal(productMatchNumber, index + 1);
  const fixture = matchMap.get(matchNumber);
  assert.ok(fixture, 'missing official fixture ' + matchNumber);
  const prediction = predict(history, {date:DRAW_DATE, home:fixture.homeTeam, away:fixture.awayTeam});
  assert.equal(prediction.historyHomeMatches, 12, 'home window must be 12 for match ' + matchNumber);
  assert.equal(prediction.historyAwayMatches, 12, 'away window must be 12 for match ' + matchNumber);
  const probabilities = {
    '0': round8(prediction.probabilities['0']),
    '1': round8(prediction.probabilities['1']),
    '2': round8(prediction.probabilities['2'])
  };
  const probabilitySum = probabilities['0'] + probabilities['1'] + probabilities['2'];
  assert.ok(Math.abs(probabilitySum - 1) <= 1e-7, 'probability simplex failed for match ' + matchNumber);
  const reference = referenceRevisionByMatch.get(matchNumber);
  assert.ok(reference, 'missing matching toto13 V1 revision row ' + matchNumber);
  const delta = maxAbs(probabilities, reference.outcomeProbabilities);
  diagnostics.push({
    productMatchNumber,
    toto13MatchNumber:matchNumber,
    homeExpectedGoals:prediction.homeExpectedGoals,
    awayExpectedGoals:prediction.awayExpectedGoals,
    historyHomeMatches:prediction.historyHomeMatches,
    historyAwayMatches:prediction.historyAwayMatches,
    maxAbsDifferenceVsToto13V1Revision:delta
  });
  return {
    predictionId:PRODUCT_KEY + '-1674-ChatGPT-v1-' + String(productMatchNumber).padStart(2,'0') + '-' + stamp,
    round:ROUND,
    matchNumber,
    homeTeam:fixture.homeTeam,
    awayTeam:fixture.awayTeam,
    probabilities,
    predictionConfirmedAt:generatedAt,
    deadlineAt:DEADLINE_AT,
    modelName:'ChatGPT',
    revisionOf:null,
    sourceRetrievedAt:historyDoc.updatedAt,
    modelVersion:'GPT-shared-poisson-score-v1-2026-11-23-revision1; model.js:' + GPT_MODEL_BLOB + '; history.json:' + HISTORY_BLOB + '; team_aliases.json:' + ALIAS_BLOB,
    dataSource:'Actual execution of sigulun555-lab/gpt model.js exported predict(history, fixture) at commit ' + GPT_COMMIT + '; input history.json blob ' + HISTORY_BLOB + ' (' + history.length + ' completed matches through ' + latestResultDate + ', fetchedAt ' + historyDoc.updatedAt + '); team_aliases.json blob ' + ALIAS_BLOB + '. No market blend or player-availability adjustment.',
    notes:'Independent product-specific ' + PRODUCT_NAME + ' V1. Product match ' + productMatchNumber + ' maps to regular toto13 matchNumber ' + matchNumber + '; matchNumber remains in regular-toto13 space for result-key compatibility. Historical-results-only Poisson baseline; no injury, suspension, availability, predicted-lineup, or official-lineup adjustment. V2 is withheld because a fresh product-specific official vote snapshot was not retrieved.',
    evidence:{
      sources:sourceRows.map(s => ({name:s.name,url:s.url,retrievedAt:generatedAt})),
      homeTeamStatus:{
        homeAwaySplit:'home',
        recentFormPeriod:'J.League official preview published 2026-11-23; pre-match check',
        recentFormCompetitions:matchNumber <= 7 ? '2026/27 J1 第16節' : '2026/27 J2 第19節',
        absences:teamNotes[fixture.homeTeam]?.note || '今回確認した公式資料の範囲で11/25の個別出場可否を確定する情報は未確認。'
      },
      awayTeamStatus:{
        homeAwaySplit:'away',
        recentFormPeriod:'J.League official preview published 2026-11-23; pre-match check',
        recentFormCompetitions:matchNumber <= 7 ? '2026/27 J1 第16節' : '2026/27 J2 第19節',
        absences:teamNotes[fixture.awayTeam]?.note || '今回確認した公式資料の範囲で11/25の個別出場可否を確定する情報は未確認。'
      },
      probabilityRationale:'Probabilities are the unadjusted output of the pinned exported predict(history, fixture) function using the last 12 completed matches per team. Team news is recorded separately and was not quantitatively applied.',
      quantitativeContribution:'not_quantified',
      confidenceLevel:'low',
      unconfirmed:[
        'Official starting lineups have not been published at this pre-match check.',
        'No official predicted starting XI was verified in the retrieved official sources.',
        'Injury and availability status across all 26 clubs is not fully verified.',
        'No fresh product-specific official vote-rate snapshot was retrieved; no V2 market blend.'
      ],
      modelOrigin:'production_model_output'
    }
  };
});
const maxReferenceDelta = Math.max(...diagnostics.map(d => d.maxAbsDifferenceVsToto13V1Revision));
assert.ok(maxReferenceDelta <= 1e-8, 'mini product output differs from matching toto13 V1 revision: ' + maxReferenceDelta);

const uniqueMatchDates = [...new Set(history.map(m => m.date))].sort();
const targetTeams = [...new Set(schedule.matches.flatMap(m => [m.homeTeam,m.awayTeam]))].sort();
const teamAudit = targetTeams.map(team => {
  const note = teamNotes[team] || {};
  return {
    team,
    officialInjuryNoticeFound: note.injury ? true : null,
    currentRoundSuspensionFound: !!note.suspension,
    availabilityStatus:note.note || note.preview || '今回確認した公式資料の範囲で11/25の個別出場可否を確定する情報は未確認。'
  };
});
const manifest = {
  schemaVersion:1,
  product:PRODUCT_NAME,
  round:ROUND,
  drawDate:DRAW_DATE,
  predictionVersion:'V1',
  productMatchNumbers:PRODUCT_MATCH_NUMBERS,
  toto13MatchNumbers:TOTO13_MATCH_NUMBERS,
  matchNumberSpaceInPredictionRecords:'regular-toto13',
  predictionFile:'predictions/round_1674_ChatGPT_' + PRODUCT_KEY + '.jsonl',
  generatedAt,
  sourceRetrievedAt:historyDoc.updatedAt,
  deadlineAt:DEADLINE_AT,
  model:{
    repository:'sigulun555-lab/gpt',
    commit:GPT_COMMIT,
    path:'model.js',
    blobSha:GPT_MODEL_BLOB,
    function:'predict(history, fixture)',
    version:'GPT-shared-poisson-score-v1-2026-11-23-revision1',
    execution:'Actual exported function loaded from a clean checkout pinned to the exact GPT commit; no reimplementation or probability post-processing beyond 8-decimal serialization.'
  },
  input:{
    repository:'sigulun555-lab/gpt',
    historyPath:'data/history.json',
    historyBlobSha:HISTORY_BLOB,
    historyRows:history.length,
    latestResultDate,
    fetchedAt:historyDoc.updatedAt,
    fetchedAtUniqueCount:fetchedAtValues.length,
    fetchedAtValues,
    sourceValues,
    sourceUrl:history[0]?.sourceUrl || historyDoc.source?.url || null,
    sourceCommitSha:null,
    sourceCommitNote:'Community mirror CSV source commit was not separately pinned; exact derived history blob is pinned.',
    teamAliasesPath:'data/team_aliases.json',
    teamAliasesBlobSha:ALIAS_BLOB,
    teamAliasCount:Object.keys(aliasesDoc.aliases).length,
    aliasMapUpdatedAt:aliasesDoc.updatedAt,
    parserPath:'scripts/auto_pipeline.js',
    parserBlobSha:PARSER_BLOB,
    dateSorted:true,
    uniqueCanonicalMatchKeys:new Set(canonicalKeys).size,
    duplicateCanonicalMatchKeys:history.length-new Set(canonicalKeys).size,
    historyDistinctDates:uniqueMatchDates.length,
    historyTeamNameOccurrences:history.length*2,
    aliasMappedOccurrences,
    uniqueAliasKeysUsed,
    targetDatesBeforeAliasMapUpdate:0,
    historicalAliasMapNotAsOf:true
  },
  officialSchedule:{
    repository:'sigulun555-lab/toto-lab',
    pr:133,
    branch:'data/round-1674-schedule',
    headSha:SCHEDULE_COMMIT,
    path:'data/schedule/round_1674.json',
    blobSha:SCHEDULE_BLOB,
    sourceUrl:OFFICIAL_CARD_URL,
    pageDisplayAt:'2026-11-24T00:44:00+09:00',
    checkedAt:generatedAt,
    refreshNotice:'5分毎',
    fixtureCount:13,
    products:{
      toto13:{matches:13,matchNumbers:[1,2,3,4,5,6,7,8,9,10,11,12,13]},
      miniTotoA:{matches:5,matchNumbers:[1,2,3,4,5]},
      miniTotoB:{matches:5,matchNumbers:[6,7,8,9,10]},
      totoGOAL3:{matches:3,matchNumbers:[1,2,3],teamSides:6,categories:['0','1','2','3+']}
    },
    saleDeadlineAt:DEADLINE_AT,
    fixtureListVerifiedAgainstOfficialPage:true
  },
  diagnostics,
  crossCheckAgainstToto13V1Revision:{
    repository:'sigulun555-lab/toto-lab',
    commit:TOTO13_REFERENCE_COMMIT,
    file:'predictions/round_1674_ChatGPT_shared_score_v1.jsonl',
    fileBlobSha:TOTO13_REFERENCE_BLOB,
    matchesCompared:diagnostics.length,
    maxAbsProbabilityDelta:maxReferenceDelta,
    interpretation:'Same pinned model and history produce the same 1X2 vector for these fixtures. This mini product file is separate and uses the official mini product mapping.'
  },
  teamNewsAudit:{
    checkedAt:generatedAt,
    checkedScope:'J.League official suspension list, J1/J2 official previews, and targeted official club injury notices. This is not a complete 26-club medical/availability audit.',
    sources:sourceRows.map(s => ({...s,retrievedAt:generatedAt})),
    relevantSuspensions:suspensions.filter(s => TOTO13_MATCH_NUMBERS.includes(s.match)),
    injuryReports:injuryReports.filter(r => targetTeams.includes(r.team)),
    j1PreviewNotes:j1PreviewNotes.filter(n => targetTeams.includes(n.team)),
    j2PreviewNotes:j2PreviewNotes.filter(n => targetTeams.includes(n.team)),
    teams:teamAudit,
    coverage:{
      officialSuspensionListChecked:true,
      officialJ1PreviewChecked:true,
      officialJ2PreviewChecked:true,
      targetedClubInjuryNoticesChecked:true,
      officialStartingLineupsPublished:false,
      officialPredictedLineupsFound:false,
      all26ClubInjuryAndAvailabilityStatusesFullyVerified:false,
      note:'Official lineups are not yet available at this pre-match time. Team-news coverage is partial; no availability adjustment was applied.'
    },
    predictionTreatment:{
      appliedToV1:false,
      reason:'Pinned model.js predict(history, fixture) has no injury/suspension/lineup covariates. No manual probability adjustment was applied.',
      note:'This is a history-only baseline; team news is preserved as evidence, not injected into probabilities.'
    }
  },
  market:{
    v2Status:'held_no_fresh_product_specific_official_vote_snapshot',
    officialVotePage:OFFICIAL_VOTE_URL,
    attemptedAt:generatedAt,
    retrievalStatus:'not_accessible',
    pageDisplayAt:null,
    reason:'The product-specific official mini toto vote-rate page could not be retrieved in this check. No stale or unrelated toto13 market percentages were substituted; no V2 market blend was created.'
  },
  safety:{
    productionModelChanged:false,
    marketWeightChanged:false,
    mainChanged:false,
    existingPredictionRowsChanged:false,
    existingShadowArtifactChanged:false,
    shadowGenerated:false,
    researchOnly:true
  }
};

const rowsText = rows.map(r => JSON.stringify(r)).join('\n') + '\n';
const manifestText = JSON.stringify(manifest, null, 2) + '\n';
if (verifyMode) {
  assert.equal(readText(PREDICTION_PATH), rowsText, 'committed prediction JSONL does not reproduce from pinned model/input');
  assert.equal(readText(MANIFEST_PATH), manifestText, 'committed manifest does not reproduce from pinned model/input');
  console.log('VERIFY_OK', JSON.stringify({product:PRODUCT_NAME,round:ROUND,rows:rows.length,generatedAt,maxReferenceDelta,historyRows:history.length}));
} else {
  fs.mkdirSync(path.dirname(PREDICTION_PATH), {recursive:true});
  fs.mkdirSync(path.dirname(MANIFEST_PATH), {recursive:true});
  fs.writeFileSync(PREDICTION_PATH, rowsText);
  fs.writeFileSync(MANIFEST_PATH, manifestText);
  console.log('GENERATED', JSON.stringify({product:PRODUCT_NAME,round:ROUND,rows:rows.length,generatedAt,maxReferenceDelta,historyRows:history.length,historyBlob:HISTORY_BLOB,modelBlob:GPT_MODEL_BLOB}));
}
