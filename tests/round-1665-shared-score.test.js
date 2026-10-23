// Node.js built-in tests for round 1665 shared score distribution snapshot.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const file = path.join(__dirname, '..', 'predictions', 'round_1665_ChatGPT_shared_score_v1.jsonl');
const rows = fs.readFileSync(file, 'utf8').trim().split('\n').map((line) => JSON.parse(line));

test('contains exactly 13 unique fixtures for round 1665', () => {
  assert.equal(rows.length, 13);
  assert.deepEqual(rows.map(r => r.matchNumber), Array.from({length:13}, (_, i) => i + 1));
  assert.equal(new Set(rows.map(r => r.predictionId)).size, 13);
  assert.ok(rows.every(r => r.round === 1665));
});

test('goal buckets are valid, finite, and sum to one within rounding tolerance', () => {
  for (const row of rows) for (const key of ['homeGoalProbabilities', 'awayGoalProbabilities']) {
    const p = row[key];
    assert.equal(p.length, 4, key + ' must be [0,1,2,3+]');
    assert.ok(p.every(x => Number.isFinite(x) && x >= 0 && x <= 1));
    assert.ok(Math.abs(p.reduce((a,b) => a+b, 0) - 1) <= 0.00001, key + ' sum for match ' + row.matchNumber);
  }
});

test('1X2 probabilities are valid and sum to one', () => {
  for (const row of rows) {
    const p = row.outcomeProbabilities;
    assert.deepEqual(Object.keys(p).sort(), ['0','1','2']);
    assert.ok(Object.values(p).every(x => Number.isFinite(x) && x >= 0 && x <= 1));
    assert.ok(Math.abs(Object.values(p).reduce((a,b) => a+b, 0) - 1) <= 0.00001);
  }
});

test('all rows carry rates and provenance for the same shared model version', () => {
  for (const row of rows) {
    assert.ok(row.homeExpectedGoals > 0 && row.awayExpectedGoals > 0);
    assert.equal(row.modelVersion, 'GPT-shared-poisson-score-v1-2026-10-23');
    assert.ok(row.dataSource.includes('same lambdas'));
  }
});
