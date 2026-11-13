'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const expectedGoal3Toto13Matches = { 1672: [2, 4, 5], 1673: [1, 2, 5] };
const presentRounds = [];
for (const round of [1672, 1673]) {
  const file = path.join(__dirname, '..', 'data', 'schedule', `round_${round}.json`);
  if (!fs.existsSync(file)) continue;
  presentRounds.push(round);
  const schedule = JSON.parse(fs.readFileSync(file, 'utf8'));
  test(`round ${round} mini/GOAL3 product numbering is distinct from toto13 numbering`, () => {
    assert.deepEqual(schedule.miniTotoA, [1, 2, 3, 4, 5]);
    assert.deepEqual(schedule.miniTotoB, [6, 7, 8, 9, 10]);
    assert.deepEqual(schedule.totoGoal3Matches, expectedGoal3Toto13Matches[round]);
    assert.deepEqual(schedule.productNumbering.miniTotoA.productMatchNumbers, [1, 2, 3, 4, 5]);
    assert.deepEqual(schedule.productNumbering.miniTotoA.toto13MatchNumbers, schedule.miniTotoA);
    assert.deepEqual(schedule.productNumbering.miniTotoB.productMatchNumbers, [1, 2, 3, 4, 5]);
    assert.deepEqual(schedule.productNumbering.miniTotoB.toto13MatchNumbers, schedule.miniTotoB);
    assert.deepEqual(schedule.productNumbering.totoGOAL3.productMatchNumbers, [1, 2, 3]);
    assert.deepEqual(schedule.productNumbering.totoGOAL3.toto13MatchNumbers, schedule.totoGoal3Matches);
  });
}
test('at least one round schedule is present in this PR branch', () => {
  assert.ok(presentRounds.length >= 1);
});
