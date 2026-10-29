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
assert.equal(joined.unresolved.length, 0, 'all prediction targets with available results should join exactly');
assert.equal(joined.supersededRecords.length, 18, 'Claude round-1665 revisions should be deduplicated to the latest pre-deadline row');

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
