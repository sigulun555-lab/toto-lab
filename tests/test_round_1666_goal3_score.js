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
assert.equal(joined.unresolved.length, 0, 'all prediction targets in rounds with available results should join exactly');
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
const marketSnapshotPath = path.join(root, 'data', 'goal3_market_snapshots', 'round_1668_2026-10-28T0640JST_secondary.jsonl');
const marketSnapshot = JSON.parse(fs.readFileSync(marketSnapshotPath, 'utf8').trim());
assert.equal(marketSnapshot.round, 1668);
assert.equal(marketSnapshot.teams.length, 6, 'round 1668 market snapshot must contain all six team sides');
assert.equal(marketSnapshot.captureStatus, 'secondary_source_captured_official_source_not_independently_verified', 'do not mislabel a secondary archive as directly verified official data');
assert.ok(Date.parse(marketSnapshot.marketSnapshotAt) < Date.parse(marketSnapshot.deadlineAt), 'market snapshot must precede sales deadline');
for (const team of marketSnapshot.teams) {
  const pctSum = Object.values(team.voteSharePct).reduce((a, b) => a + b, 0);
  assert.ok(Math.abs(pctSum - 100) <= 0.2, team.team + ' vote shares must sum to approximately 100%');
}
console.log('OK - round 1668 secondary market snapshot provenance and six-team coverage');
console.log('OK - round 1666 GOAL3 official 90-minute results join and scoring');
