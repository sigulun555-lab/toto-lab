'use strict';
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { buildInventory, hasMarketVector, validPreDeadline } = require('../scripts/audit_goal3_inventory.js');

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'goal3-inventory-test-'));
const predDir = path.join(tmp, 'predictions');
const resultDir = path.join(tmp, 'results');
fs.mkdirSync(predDir); fs.mkdirSync(resultDir);
const base = {
  round: 7777, matchNumber: 1, team: 'Team A', opponent: 'Team B', isHome: true,
  modelName: 'TestModel', modelVersion: 'v1',
  predictionConfirmedAt: '2026-01-01T00:00:00Z', deadlineAt: '2026-01-02T00:00:00Z',
  probabilities: { '0': 0.1, '1': 0.2, '2': 0.3, '3': 0.4 },
};
fs.writeFileSync(path.join(predDir, 'round_7777_TestModel_goal3.jsonl'), [
  JSON.stringify(base),
  JSON.stringify({ ...base, predictionId: 'revision-2', predictionConfirmedAt: '2026-01-01T01:00:00Z', marketProbabilities: { '0': 0.1, '1': 0.2, '2': 0.3, '3': 0.4 } }),
  JSON.stringify({ ...base, predictionId: 'late', matchNumber: 2, predictionConfirmedAt: '2026-01-03T00:00:00Z' }),
].join('\n') + '\n');
fs.writeFileSync(path.join(resultDir, 'round_7777.jsonl'), JSON.stringify({
  round: 7777, matchNumber: 1, homeTeam: 'Team A', awayTeam: 'Team B', homeGoals: 1, awayGoals: 0, competition: 'TEST',
}) + '\n');

assert.strictEqual(validPreDeadline(base), true);
assert.strictEqual(validPreDeadline({ ...base, predictionConfirmedAt: '2026-01-02T00:00:00Z' }), false);
assert.strictEqual(hasMarketVector({ marketProbabilities: { '0': 1 } }), true);
assert.strictEqual(hasMarketVector({ probabilities: { '0': 1 } }), false);
const report = buildInventory(predDir, resultDir);
assert.strictEqual(report.totals.predictionRows, 3);
assert.strictEqual(report.byRound['7777'].preDeadlineRows, 2);
assert.strictEqual(report.byRound['7777'].invalidOrPostDeadlineRows, 1);
assert.strictEqual(report.byRound['7777'].rowsWithMarketProbabilityVector, 1);
assert.strictEqual(report.byRound['7777'].resultRows, 1);
console.log('OK - GOAL3 inventory audit tests');
