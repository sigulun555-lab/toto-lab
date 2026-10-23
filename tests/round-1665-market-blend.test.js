'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { outcome, scoreRows, buildReport } = require('../scripts/score_round_1665_market_blend.js');

test('outcome keys map home win, draw and away win correctly', () => {
  assert.equal(outcome({ homeGoals: 2, awayGoals: 1 }), '1');
  assert.equal(outcome({ homeGoals: 1, awayGoals: 1 }), '0');
  assert.equal(outcome({ homeGoals: 0, awayGoals: 3 }), '2');
});

test('scoreRows computes accuracy, mean three-class Brier and log loss', () => {
  const result = scoreRows([{ actual: '1', probabilities: { '1': 0.8, '0': 0.1, '2': 0.1 } }]);
  assert.equal(result.matchesScored, 1);
  assert.equal(result.accuracy, 1);
  assert.ok(Math.abs(result.brierScore - 0.06) < 1e-12);
  assert.ok(Math.abs(result.logLoss - -Math.log(0.8)) < 1e-12);
});

test('comparison scores all models on the same verified subset only', () => {
  const base = [{
    matchNumber: 1, homeTeam: 'Home', awayTeam: 'Away',
    baseModelProbabilities: { '1': 0.7, '0': 0.2, '2': 0.1 },
    marketVoteShare: { '1': 0.2, '0': 0.3, '2': 0.5 },
    probabilities: { '1': 0.45, '0': 0.25, '2': 0.3 },
  }, {
    matchNumber: 2, homeTeam: 'H2', awayTeam: 'A2',
    baseModelProbabilities: { '1': 0.4, '0': 0.3, '2': 0.3 },
    marketVoteShare: { '1': 0.4, '0': 0.3, '2': 0.3 },
    probabilities: { '1': 0.4, '0': 0.3, '2': 0.3 },
  }];
  const report = buildReport(base, [{ round: 1665, matchNumber: 1, homeGoals: 0, awayGoals: 1 }]);
  assert.equal(report.status, 'partial_results');
  assert.deepEqual(report.scoredMatchNumbers, [1]);
  assert.deepEqual(report.missingMatchNumbers, [2]);
  assert.equal(report.comparisons.gptPoisson.matchesScored, 1);
  assert.equal(report.comparisons.marketOnly.matchesScored, 1);
  assert.equal(report.comparisons.marketBlendV2.matchesScored, 1);
  assert.equal(report.comparisons.gptPoisson.accuracy, 0);
  assert.equal(report.comparisons.marketOnly.accuracy, 1);
});

test('append-only revisions score only the latest row for each match', () => {
  const base = [{
    matchNumber: 1, homeTeam: 'Home', awayTeam: 'Away',
    baseModelProbabilities: { '1': 0.7, '0': 0.2, '2': 0.1 },
    marketVoteShare: { '1': 0.2, '0': 0.3, '2': 0.5 },
    probabilities: { '1': 0.45, '0': 0.25, '2': 0.3 },
  }, {
    matchNumber: 1, homeTeam: 'Home', awayTeam: 'Away',
    baseModelProbabilities: { '1': 0.7, '0': 0.2, '2': 0.1 },
    marketVoteShare: { '1': 0.8, '0': 0.1, '2': 0.1 },
    probabilities: { '1': 0.77, '0': 0.13, '2': 0.1 },
  }];
  const report = buildReport(base, [{ round: 1665, matchNumber: 1, homeGoals: 1, awayGoals: 0 }]);
  assert.equal(report.matches.length, 1);
  assert.deepEqual(report.matches[0].modelProbabilities.marketBlendV2, { '1': 0.77, '0': 0.13, '2': 0.1 });
});

