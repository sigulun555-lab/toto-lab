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
const round1668Forecasts = predictions.filter(x => x.round === 1668);
assert.ok(round1668Forecasts.length >= 12 && round1668Forecasts.length % 6 === 0,
  'round 1668 must retain complete six-team snapshots for each model');
assert.equal(new Set(round1668Forecasts.map(x => x.predictionId)).size, round1668Forecasts.length,
  'round 1668 prediction IDs must remain unique');

const round1668Models = [...new Set(round1668Forecasts.map(x => x.modelName))].sort();
assert.deepEqual(round1668Models, ['ChatGPT', 'Claude'],
  'round 1668 must keep GPT and Claude as separate model histories');

function assertCompleteModelSnapshots(modelName) {
  const records = round1668Forecasts.filter(x => x.modelName === modelName);
  assert.ok(records.length >= 6 && records.length % 6 === 0,
    modelName + ' must retain complete six-team snapshots');
  const snapshotTimes = [...new Set(records.map(x => x.predictionConfirmedAt))]
    .sort((a, b) => Date.parse(a) - Date.parse(b));
  assert.equal(snapshotTimes.length, records.length / 6,
    modelName + ' snapshot timestamps must each identify one complete six-team snapshot');

  for (const snapshotAt of snapshotTimes) {
    const rows = records.filter(x => x.predictionConfirmedAt === snapshotAt);
    assert.equal(rows.length, 6, modelName + ' snapshot must contain six team targets');
    assert.equal(new Set(rows.map(x => x.matchNumber + ':' + x.isHome)).size, 6,
      modelName + ' snapshot must cover all six distinct team sides exactly once');
  }

  for (const p of records) {
    const previous = records
      .filter(x => x.matchNumber === p.matchNumber && x.isHome === p.isHome &&
        Date.parse(x.predictionConfirmedAt) < Date.parse(p.predictionConfirmedAt))
      .sort((a, b) => Date.parse(b.predictionConfirmedAt) - Date.parse(a.predictionConfirmedAt))[0];
    if (previous) {
      assert.equal(p.revisionOf, previous.predictionId,
        modelName + ' revisionOf must point to the immediately preceding same-side record');
    } else {
      assert.equal(p.revisionOf ?? null, null,
        modelName + ' initial snapshot must not invent a revision target');
    }
  }
  const latestAt = snapshotTimes[snapshotTimes.length - 1];
  return records.filter(x => x.predictionConfirmedAt === latestAt);
}

const latestChatGPT = assertCompleteModelSnapshots('ChatGPT');
const latestClaude = assertCompleteModelSnapshots('Claude');
assert.equal(latestChatGPT.length, 6, 'latest GPT-main snapshot must contain all six team targets');
assert.equal(latestClaude.length, 6, 'latest Claude snapshot must contain all six team targets');

assert.equal(joined.unresolved.length, 12,
  'one active six-team round 1668 snapshot per model should await results');
assert.ok(joined.unresolved.every(x => x.round === 1668),
  'no completed historical round should have unresolved prediction targets');
const expectedActiveIds = new Set([...latestChatGPT, ...latestClaude].map(x => x.predictionId));
assert.deepEqual(new Set(joined.unresolved.map(x => x.predictionId)), expectedActiveIds,
  'only the latest six-team snapshot from each model should remain unresolved');

assert.equal(joined.supersededRecords.filter(x => x.predictionId.includes('r1668-m') && x.predictionId.includes('predeadline')).length, 6,
  'the original round 1668 GPT records must remain superseded by synchronized revisions');
assert.equal(joined.usedRecords.filter(x => x.prediction.round === 1668).length, 0,
  'round 1668 forecasts must remain unscored before results exist');
for (const p of round1668Forecasts) {
  assert.ok(Date.parse(p.predictionConfirmedAt) < Date.parse(p.deadlineAt), 'round 1668 forecast must be pre-deadline');
  assert.ok(Math.abs(Object.values(p.probabilities).reduce((a, b) => a + b, 0) - 1) < 1e-8, 'goal bucket probabilities must sum to one');
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
