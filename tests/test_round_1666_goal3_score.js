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
// Each submitted model/version must retain exactly six active team-side records.
// Count both unresolved and already-scored active records so this remains valid after
// official round 1668 results are appended. At present the active versions are GPT V1,
// GPT V2 market-blend, and Claude V1 (18 team-side records in total).
assert.ok(joined.unresolved.every(x => x.round === 1668), 'no completed historical round should have unresolved prediction targets');
const round1668Forecasts = predictions.filter(x => x.round === 1668);
const modelKey = p => `${p.modelName}::${p.modelVersion}`;
const round1668ModelKeys = new Set(round1668Forecasts.map(modelKey));
const activeRound1668Ids = new Set([
  ...joined.usedRecords.filter(x => x.prediction.round === 1668).map(x => x.prediction.predictionId),
  ...joined.unresolved.filter(x => x.round === 1668).map(x => x.predictionId)
]);
const activeRound1668 = round1668Forecasts.filter(p => activeRound1668Ids.has(p.predictionId));
assert.equal(activeRound1668.length, round1668ModelKeys.size * 6,
  'round 1668 must have exactly six active team-side forecasts per submitted model/version');
for (const key of round1668ModelKeys) {
  const rows = activeRound1668.filter(p => modelKey(p) === key);
  assert.equal(rows.length, 6, `${key}: exactly six active team-side forecasts are required`);
  assert.equal(new Set(rows.map(p => `${p.matchNumber}:${p.isHome}`)).size, 6,
    `${key}: active forecasts must cover all six match-side combinations exactly once`);
}
const unresolved1668Count = joined.unresolved.filter(x => x.round === 1668).length;
const scored1668Count = joined.usedRecords.filter(x => x.prediction.round === 1668).length;
assert.equal(unresolved1668Count + scored1668Count, round1668ModelKeys.size * 6,
  'round 1668 active forecasts must be fully accounted for as unresolved or scored');
assert.ok(round1668Forecasts.length >= 12 && round1668Forecasts.length % 6 === 0,
  'round 1668 must retain complete six-team snapshots as append-only revisions');
assert.equal(new Set(round1668Forecasts.map(x => x.predictionId)).size, round1668Forecasts.length,
  'round 1668 prediction IDs must remain unique');
// Validate the GPT Poisson V1 append-only revision chain separately from Claude's independent first snapshot and the distinct V2 model version.
const round1668GptV1 = round1668Forecasts.filter(x =>
  x.modelName === 'ChatGPT' && x.modelVersion === 'gpt-poisson-goal-dist-v1');
const round1668SnapshotTimes = [...new Set(round1668GptV1.map(x => x.predictionConfirmedAt))]
  .sort((a, b) => Date.parse(a) - Date.parse(b));
assert.ok(round1668SnapshotTimes.length >= 1, 'GPT V1 must retain at least one complete round 1668 snapshot');
for (const snapshotAt of round1668SnapshotTimes) {
  const rows = round1668GptV1.filter(x => x.predictionConfirmedAt === snapshotAt);
  assert.equal(rows.length, 6, 'each GPT V1 round 1668 snapshot must contain six team targets');
  assert.equal(new Set(rows.map(x => x.matchNumber + ':' + x.isHome)).size, 6,
    'each GPT V1 snapshot must cover all six distinct team sides exactly once');
}
const latestSnapshotAt = round1668SnapshotTimes[round1668SnapshotTimes.length - 1];
const latestRound1668 = round1668GptV1.filter(x => x.predictionConfirmedAt === latestSnapshotAt);
assert.equal(latestRound1668.length, 6, 'the newest GPT V1 snapshot must contain all six team targets');
if (round1668SnapshotTimes.length > 1) {
  for (const p of latestRound1668) {
    assert.ok(p.revisionOf, 'every non-initial GPT V1 snapshot record must reference the prior V1 record');
    assert.ok(round1668GptV1.some(prev =>
      prev.predictionId === p.revisionOf &&
      prev.matchNumber === p.matchNumber &&
      prev.isHome === p.isHome &&
      Date.parse(prev.predictionConfirmedAt) < Date.parse(p.predictionConfirmedAt)),
    'revisionOf must reference an earlier GPT V1 record for the same team side');
  }
}
assert.equal(joined.supersededRecords.filter(x => x.predictionId.includes('r1668-m') && x.predictionId.includes('predeadline')).length, 6,
  'the original round 1668 records must remain superseded by synchronized revisions');
assert.equal(joined.usedRecords.filter(x => x.prediction.round === 1668).length, 0, 'round 1668 forecasts must remain unscored before results exist');
for (const p of round1668Forecasts) {
  assert.ok(Date.parse(p.predictionConfirmedAt) < Date.parse(p.deadlineAt), 'round 1668 forecast must be pre-deadline');
  const probabilitySum = Object.values(p.probabilities).reduce((a, b) => a + b, 0);
  // Claude's independent baseline is stored to four decimal places; allow only its corresponding rounding tolerance.
  const sumTolerance = p.modelName === 'Claude' ? 0.0002 : 1e-8;
  assert.ok(Math.abs(probabilitySum - 1) <= sumTolerance,
    'goal bucket probabilities must sum to one within the source precision');
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
