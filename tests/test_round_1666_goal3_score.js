'use strict';
const assert = require('node:assert/strict');
const path = require('node:path');
const { loadAllPredictionsGoal3, joinAndFilter, scoreGroup } = require('../scripts/score_predictions_goal3.js');
const { readJsonlDirOrFile } = require('../scripts/score_predictions.js');

const root = path.resolve(__dirname, '..');
const predictions = loadAllPredictionsGoal3(path.join(root, 'predictions'));
const results = readJsonlDirOrFile(path.join(root, 'results'));
const joined = joinAndFilter(predictions, results);

assert.equal(joined.excludedPostDeadline.length, 0, 'all stored GOAL3 forecasts must be pre-deadline');
assert.equal(joined.unresolvedTeamNames.length, 0, 'team names should resolve through the canonical alias map');
assert.equal(joined.unresolvedTeamNames.length, 0, 'team names should resolve through the canonical alias map');
const unresolvedRound1668 = joined.unresolved.filter(x => x.round === 1668);
assert.equal(unresolvedRound1668.length, 6, 'round 1668 V1 forecasts should remain unscored until official results exist');
assert.equal(joined.unresolved.filter(x => x.round !== 1668).length, 0, 'completed rounds should join exactly');
const round1668Forecasts = predictions.filter(x => x.round === 1668);
assert.equal(round1668Forecasts.length, 6, 'round 1668 must archive all six pre-deadline team targets');
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
console.log('OK - round 1666 GOAL3 official 90-minute results join and scoring');
