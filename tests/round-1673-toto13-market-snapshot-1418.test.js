'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const snapshot = JSON.parse(fs.readFileSync(
  path.join(__dirname, '..', 'reports/round_1673_toto13_official_market_snapshot_20261117T1418JST.json'),
  'utf8'
));

test('14:18 official round 1673 toto13 snapshot is archived as stale and excluded from V2', () => {
  assert.equal(snapshot.round, 1673);
  assert.equal(snapshot.marketType, 'toto13');
  assert.equal(snapshot.pageDisplayAt, '2026-11-17T14:18:00+09:00');
  assert.equal(snapshot.retrievedAt, '2026-11-17T14:53:25+09:00');
  assert.equal(snapshot.displayAgeSeconds, 2125);
  assert.equal(snapshot.stale, true);
  assert.equal(snapshot.totalVotesPageSummary, 150321);
  assert.equal(snapshot.matches.length, 13);
  assert.deepEqual(snapshot.matches.map(m => m.matchNumber), Array.from({length: 13}, (_, i) => i + 1));
  assert.equal(snapshot.countConsistency.allPerMatchTotalsMatchPageSummary, true);
  assert.equal(snapshot.countConsistency.allDisplayedPercentageTriplesSumTo100, true);
  assert.equal(snapshot.matches.every(m => m.sumVotes === 150321 && m.differenceFromSummaryVotes === 0), true);
  assert.equal(snapshot.matches.every(m => Math.abs(m.percentages.reduce((a,b) => a+b,0)-100) < 1e-8), true);
  assert.equal(snapshot.v2Eligibility.eligible, false);
});
