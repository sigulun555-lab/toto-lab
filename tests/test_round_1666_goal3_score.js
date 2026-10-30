'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { loadAllPredictionsGoal3, joinAndFilter, scoreGroup } = require('../scripts/score_predictions_goal3.js');
const { readJsonlDirOrFile } = require('../scripts/score_predictions.js');

const root = path.resolve(__dirname, '..');
const predictions = loadAllPredictionsGoal3(path.join(root, 'predictions'));
const results = readJsonlDirOrFile(path.join(root, 'results'));
const joined = joinAndFilter(predictions, results);

assert.equal(joined.excludedPostDeadline.length, 0, 'all stored GOAL3 forecasts must be pre-deadline');
assert.equal(joined.unresolvedTeamNames.length, 0, 'team names should resolve through the canonical alias map');
assert.ok(joined.unresolved.every(x => x.round === 1668), 'no completed historical round should have unresolved prediction targets');

// round 1668はまだ結果が無いため、提出済みの各モデルについて「未確定6件
// （指定3試合×ホーム/アウェイ）」が揃っていることを、モデルごとに検証する。
// 2026-10-30時点でClaude・ChatGPTの両方が第1668回を提出したため、
// 固定値6ではなく「モデル数×6」で検証する（モデルが増えても対応できる形）。
const round1668Forecasts = predictions.filter(x => x.round === 1668);
const modelKey = (p) => `${p.modelName}::${p.modelVersion}`;
const round1668ByModel = new Map();
for (const p of round1668Forecasts) {
  const key = modelKey(p);
  if (!round1668ByModel.has(key)) round1668ByModel.set(key, []);
  round1668ByModel.get(key).push(p);
}
assert.ok(round1668ByModel.size >= 1, 'at least one model must have submitted round 1668 forecasts');

// GOAL3の指定試合番号は、toto公式の指定試合表どおり厳密に1・2・3でなければ
// ならない（「3種類の値があればよい」という緩い検証では、試合番号の取り違え
// （例：1・2・4）を見逃してしまう）。
const EXPECTED_GOAL3_MATCH_NUMBERS = [1, 2, 3];

for (const [key, rowsForModel] of round1668ByModel) {
  assert.ok(rowsForModel.length >= 6 && rowsForModel.length % 6 === 0,
    `${key}: round 1668 must retain complete six-team snapshots as append-only revisions`);
  assert.equal(new Set(rowsForModel.map(x => x.predictionId)).size, rowsForModel.length,
    `${key}: round 1668 prediction IDs must remain unique`);

  const snapshotTimes = [...new Set(rowsForModel.map(x => x.predictionConfirmedAt))]
    .sort((a, b) => Date.parse(a) - Date.parse(b));
  assert.equal(snapshotTimes.length, rowsForModel.length / 6,
    `${key}: each round 1668 snapshot timestamp must contain exactly one complete six-team snapshot`);
  for (const snapshotAt of snapshotTimes) {
    const rows = rowsForModel.filter(x => x.predictionConfirmedAt === snapshotAt);
    assert.equal(rows.length, 6, `${key}: each round 1668 snapshot must contain six team targets`);
    assert.equal(new Set(rows.map(x => x.matchNumber + ':' + x.isHome)).size, 6,
      `${key}: each round 1668 snapshot must cover all six distinct team sides exactly once`);
    const matchNumbersInSnapshot = [...new Set(rows.map(x => x.matchNumber))].sort((a, b) => a - b);
    assert.deepEqual(matchNumbersInSnapshot, EXPECTED_GOAL3_MATCH_NUMBERS,
      `${key}: round 1668 GOAL3 designated match numbers must be exactly 1, 2, 3 (saw ${matchNumbersInSnapshot.join(',')})`);
  }

  const latestSnapshotAt = snapshotTimes[snapshotTimes.length - 1];
  const latestForModel = rowsForModel.filter(x => x.predictionConfirmedAt === latestSnapshotAt);
  assert.equal(latestForModel.length, 6, `${key}: the newest snapshot must contain all six team targets`);

  // revisionOfの連鎖は「最新スナップショットが直前のどこかを指していればよい」
  // ではなく、全履歴の各非初回レコードが、同一モデル・同一試合・同一サイドの
  // 「直前の」スナップショットを正確に指していることを検証する（例：3回目の
  // スナップショットが2回目ではなく1回目や別サイドを指すような取り違えを
  // 検出できるようにする）。
  const bySide = new Map(); // 'matchNumber:isHome' -> rows sorted by predictionConfirmedAt
  for (const p of rowsForModel) {
    const sideKey = `${p.matchNumber}:${p.isHome}`;
    if (!bySide.has(sideKey)) bySide.set(sideKey, []);
    bySide.get(sideKey).push(p);
  }
  for (const [sideKey, sideRows] of bySide) {
    sideRows.sort((a, b) => Date.parse(a.predictionConfirmedAt) - Date.parse(b.predictionConfirmedAt));
    assert.equal(sideRows.length, snapshotTimes.length,
      `${key}/${sideKey}: this team side must appear exactly once per snapshot across the full history`);
    assert.equal(sideRows[0].revisionOf, null,
      `${key}/${sideKey}: the first (initial) snapshot record must not reference a prior record`);
    for (let i = 1; i < sideRows.length; i++) {
      const prev = sideRows[i - 1];
      const curr = sideRows[i];
      assert.equal(curr.revisionOf, prev.predictionId,
        `${key}/${sideKey}: snapshot ${i + 1}'s revisionOf must point to the immediately preceding snapshot's record (snapshot ${i}), not an earlier or later one`);
    }
  }
}

// モデル識別子（modelName/modelVersion）の重複・不正な登録を検出できることを
// 確認する：(a) predictionIdは全予測（全ラウンド・全マーケット・全モデル）を
// 通じて一意でなければならない、(b) modelName/modelVersionは空文字・前後空白
// つきの文字列であってはならない（表記ゆれによる意図しない別モデル化を防ぐ）、
// (c) 大文字小文字や空白だけが異なる実質同一のmodelKeyが複数登録されていないか
// （意図しない重複登録の典型例）を検出する。
const allPredictions = predictions;
assert.equal(new Set(allPredictions.map(x => x.predictionId)).size, allPredictions.length,
  'predictionId must be globally unique across all stored predictions, not just within one round/model');
for (const p of allPredictions) {
  assert.ok(typeof p.modelName === 'string' && p.modelName === p.modelName.trim() && p.modelName.length > 0,
    `prediction ${p.predictionId}: modelName must be a non-empty, non-whitespace-padded string (saw ${JSON.stringify(p.modelName)})`);
  assert.ok(typeof p.modelVersion === 'string' && p.modelVersion === p.modelVersion.trim() && p.modelVersion.length > 0,
    `prediction ${p.predictionId}: modelVersion must be a non-empty, non-whitespace-padded string (saw ${JSON.stringify(p.modelVersion)})`);
}
const normalizedModelKeyToActualKeys = new Map();
for (const p of allPredictions) {
  const actualKey = modelKey(p);
  const normalizedKey = actualKey.toLowerCase().replace(/\s+/g, '');
  if (!normalizedModelKeyToActualKeys.has(normalizedKey)) normalizedModelKeyToActualKeys.set(normalizedKey, new Set());
  normalizedModelKeyToActualKeys.get(normalizedKey).add(actualKey);
}
for (const [normalizedKey, actualKeys] of normalizedModelKeyToActualKeys) {
  assert.equal(actualKeys.size, 1,
    `model identifier collision: ${[...actualKeys].join(' vs ')} normalize to the same key (${normalizedKey}) but are registered as distinct modelName::modelVersion pairs`);
}

// 未確定（unresolved）件数は「提出済みモデル数×6」と厳密に一致しなければならない
// （6の倍数であればOKという緩い検証ではなく、モデルごとの最新スナップショットの
// 合計と一致することを確認する。モデルの重複や対象試合の欠落・余分があれば、
// 上のループまたはここで検出されて失敗する）。
const expectedUnresolved = round1668ByModel.size * 6;
assert.equal(joined.unresolved.length, expectedUnresolved,
  `unresolved round 1668 forecasts must equal (model count × 6); saw ${round1668ByModel.size} model(s)`);
assert.equal(joined.supersededRecords.filter(x => x.predictionId.includes('r1668-m') && x.predictionId.includes('predeadline')).length, 6,
  'the original round 1668 records must remain superseded by synchronized revisions');
assert.equal(joined.usedRecords.filter(x => x.prediction.round === 1668).length, 0, 'round 1668 forecasts must remain unscored before results exist');
for (const p of round1668Forecasts) {
  assert.ok(Date.parse(p.predictionConfirmedAt) < Date.parse(p.deadlineAt), 'round 1668 forecast must be pre-deadline');
  // 4桁に丸めた確率4つの合計は、丸め誤差だけで最大約0.0002ずれ得る
  // （例：0.9999や1.0001）。実際に過去の確定済みレコード（round 1665/1666の
  // Claude・ChatGPT双方）でもこの範囲のずれが広く見られるため、1e-8という
  // 非現実的に厳しい許容値ではなく、丸め誤差を許容する5e-4を使う。
  assert.ok(Math.abs(Object.values(p.probabilities).reduce((a, b) => a + b, 0) - 1) < 5e-4, 'goal bucket probabilities must sum to one (within 4-decimal rounding tolerance)');
}
assert.ok(joined.supersededRecords.length >= 18, 'Claude round-1665 revision history should exclude superseded pre-deadline rows');

const round1666 = joined.usedRecords.filter(x => x.prediction.round === 1666);
assert.equal(round1666.length, 12, 'round 1666 should score 6 targets per model/version');

const cases = [
  {
    version: 'gpt-poisson-goal-dist-v1',
    expected: { n: 6, accuracy: 0.5, brier: 0.8260656687725119, logloss: 1.6533149956306354 }
  },
  {
    version: 'shrinkage-poisson-lambda10-2026only-v1',
    expected: { n: 6, accuracy: 0.5, brier: 0.7929294583333334, logloss: 1.533323409593429 }
  }
];
for (const item of cases) {
  const scored = scoreGroup(round1666.filter(x => x.prediction.modelVersion === item.version));
  assert.equal(scored.n, item.expected.n, item.version + ' target count');
  assert.equal(scored.accuracy, item.expected.accuracy, item.version + ' accuracy');
  assert.ok(Math.abs(scored.brier - item.expected.brier) < 1e-10, item.version + ' Brier');
  assert.ok(Math.abs(scored.logloss - item.expected.logloss) < 1e-10, item.version + ' LogLoss');
}
const snapshotFiles = [
  'round_1668_2026-10-28T0640JST_secondary.jsonl',
  'round_1668_2026-10-29T1435JST_secondary.jsonl'
];
const snapshots = snapshotFiles.map(name => JSON.parse(fs.readFileSync(path.join(root, 'data', 'goal3_market_snapshots', name), 'utf8').trim()));
for (const marketSnapshot of snapshots) {
  assert.equal(marketSnapshot.round, 1668);
  assert.equal(marketSnapshot.teams.length, 6, 'round 1668 market snapshot must contain all six team sides');
  assert.equal(marketSnapshot.captureStatus, 'secondary_source_captured_official_source_not_independently_verified', 'do not mislabel a secondary archive as directly verified official data');
  assert.ok(Date.parse(marketSnapshot.marketSnapshotAt) < Date.parse(marketSnapshot.deadlineAt), 'market snapshot must precede sales deadline');
  for (const team of marketSnapshot.teams) {
    const pctSum = Object.values(team.voteSharePct).reduce((a, b) => a + b, 0);
    assert.ok(Math.abs(pctSum - 100) <= 0.2, team.team + ' vote shares must sum to approximately 100%');
  }
}
const laterSnapshot = snapshots.find(x => x.sourceDisplayedTimestamp === '2026-10-29 14:35 JST');
assert.ok(laterSnapshot, 'later secondary snapshot should preserve its displayed timestamp');
assert.ok(Date.parse(laterSnapshot.marketSnapshotAt) > Date.parse(predictions.find(x => x.round === 1668).predictionConfirmedAt),
  'later market snapshot must be flagged as post-forecast, not used as forecast-time market data');
const laterComparison = JSON.parse(fs.readFileSync(path.join(root, 'reports', 'round_1668_goal3_v1_market_snapshot_comparison_2026-10-29T1435JST.json'), 'utf8'));
assert.ok(laterComparison.minutesMarketAfterForecast > 0, 'post-forecast market comparison must retain timing direction');
console.log('OK - round 1668 secondary snapshots, provenance, six-team coverage, and temporal leakage guard');
console.log('OK - round 1666 GOAL3 official 90-minute results join and scoring');
