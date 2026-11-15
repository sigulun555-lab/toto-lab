'use strict';

const assert = require('node:assert/strict');
const {
  createPythonRandom,
  computeT2,
  predictT2
} = require('../scripts/research/toto13_t2_current_cut.js');

{
  const rng = createPythonRandom(7);
  assert.equal(rng.getrandbits(32), 1390851128, 'Python random.Random(7) getrandbits(32) compatibility');
}
{
  const rng = createPythonRandom(7);
  assert.deepEqual(
    Array.from({ length: 10 }, () => rng.randBelow(30)),
    [10, 4, 12, 20, 1, 2, 26, 17, 3, 11],
    'Python random.Random(7).randrange(30) sequence compatibility'
  );
}

const history = [];
for (let i = 0; i < 12; i += 1) {
  history.push({
    date: '2026-08-' + String(i + 1).padStart(2, '0'),
    competition: 'J1',
    home: i % 2 ? 'B' : 'A',
    away: i % 2 ? 'A' : 'B',
    home_goals: i % 3,
    away_goals: (i + 1) % 3,
    fetchedAt: '2026-11-14T22:22:01.917Z'
  });
}
history.push({
  date: '2026-09-01', competition: 'J1', home: 'A', away: 'B',
  home_goals: 1, away_goals: 0, fetchedAt: '2026-11-14T22:22:01.917Z'
});
history.push({
  date: '2026-09-02', competition: 'J1', home: 'B', away: 'A',
  home_goals: 0, away_goals: 0, fetchedAt: '2026-11-14T22:22:01.917Z'
});

const prior = history.slice(0, 12);
const withBoostPrediction = predictT2(prior, 'A', 'B', true);
const withoutBoostPrediction = predictT2(prior, 'A', 'B', false);
for (const prediction of [withBoostPrediction, withoutBoostPrediction]) {
  const sum = prediction['1'] + prediction['0'] + prediction['2'];
  assert.ok(Math.abs(sum - 1) < 1e-12, '1/X/2 probability vector must sum to one');
  assert.ok(Object.values(prediction).every((value) => Number.isFinite(value) && value >= 0 && value <= 1));
}

const result = computeT2(history, { reps: 100, seed: 7 });
assert.equal(result.cohort.evaluationRows, 2);
assert.equal(result.cohort.evaluationDates, 2);
assert.equal(result.cohort.pairedCohortExact, true);
assert.equal(result.bootstrap.reps, 100);
assert.equal(result.bootstrap.seed, 7);
assert.ok(Number.isFinite(result.withoutMinusWith.logLoss));
assert.ok(Number.isFinite(result.withoutMinusWith.brier));
console.log('OK - toto13 T2 current-cut research tests');
