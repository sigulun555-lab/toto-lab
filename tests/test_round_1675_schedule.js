'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const schedule = JSON.parse(fs.readFileSync(path.join(root, 'data', 'schedule', 'round_1675.json'), 'utf8'));
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'reports', 'round_1675_schedule_manifest.json'), 'utf8'));

assert.equal(schedule.round, 1675);
assert.deepEqual(schedule.matches.map(x => x.matchNumber), Array.from({ length: 13 }, (_, i) => i + 1));
assert.equal(new Set(schedule.matches.flatMap(x => [x.homeTeam, x.awayTeam])).size, 26);
assert.deepEqual(schedule.holdDates, ['2026-11-28', '2026-11-29']);
assert.deepEqual(schedule.miniTotoA, [1, 2, 3, 4, 5]);
assert.deepEqual(schedule.miniTotoB, [6, 7, 8, 9, 10]);
assert.equal(manifest.round, 1675);
assert.equal(manifest.fixtures.length, 13);
assert.equal(manifest.networkDeadlineAt, '2026-11-28T13:50:00+09:00');
assert.deepEqual(manifest.products.miniTotoA.toto13MatchNumbers, [1, 2, 3, 4, 5]);
assert.deepEqual(manifest.products.miniTotoB.toto13MatchNumbers, [6, 7, 8, 9, 10]);
assert.deepEqual(manifest.products.totoGOAL3.toto13MatchNumbers, [1, 3, 5]);
assert.equal(manifest.products.totoGOAL3.teamSideCount, 6);
assert.deepEqual(manifest.products.totoGOAL3.goalCategories, ['0', '1', '2', '3+']);
for (const f of manifest.fixtures) {
  const s = schedule.matches.find(x => x.matchNumber === f.matchNumber);
  assert.ok(s, `missing schedule match ${f.matchNumber}`);
  assert.equal(s.homeTeam, f.homeTeam);
  assert.equal(s.awayTeam, f.awayTeam);
}
assert.equal(manifest.sourceUrl, schedule.sources[0]);
assert.ok(Number.isFinite(Date.parse(manifest.retrievedAt)));
console.log('PASS round 1675 official schedule: 13 fixtures, 26 teams, mini A/B and GOAL3 product mapping, deadline, provenance');
