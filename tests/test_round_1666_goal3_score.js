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
  }

  const latestSnapshotAt = snapshotTimes[snapshotTimes.length - 1];
  const latestForModel = rowsForModel.filter(x => x.predictionConfirmedAt === latestSnapshotAt);
  assert.equal(latestForModel.length, 6, `${key}: the newest snapshot must contain all six team targets`);
  if (snapshotTimes.length > 1) {
    for (const p of latestForModel) {
      assert.ok(p.revisionOf, `${key}: every non-initial snapshot record must reference the prior record`);
      assert.ok(rowsForModel.some(prev =>
        prev.predictionId === p.revisionOf &&
        prev.matchNumber === p.matchNumber &&
        prev.isHome === p.isHome &&
        Date.parse(prev.predictionConfirmedAt) < Date.parse(p.predictionConfirmedAt)),
      `${key}: revisionOf must reference an earlier record from the same model for the same team side`);
    }
  }
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
