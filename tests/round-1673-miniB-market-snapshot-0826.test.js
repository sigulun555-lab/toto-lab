'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const market = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'reports/round_1673_miniB_official_market_snapshot_20261118T0826JST.json'), 'utf8'));

test('08:26 official mini toto B snapshot is archived as stale history and excluded from V2', () => {
  assert.equal(market.round, 1673);
  assert.equal(market.product, 'mini toto B');
  assert.equal(market.marketType, 'mini toto B');
  assert.equal(market.pageDisplayAt, '2026-11-18T08:26:00+09:00');
  assert.equal(market.retrievedAt, '2026-11-18T09:39:38+09:00');
  assert.equal(market.displayAgeSeconds, 4418);
  assert.equal(market.stale, true);
  assert.equal(market.totalVotesPageSummary, 19908);
  assert.equal(market.matches.length, 5);
  assert.equal(market.countConsistency.allPerMatchTotalsMatchPageSummary, true);
  assert.equal(market.countConsistency.allDisplayedPercentageTriplesSumTo100, true);
  assert.deepEqual(market.countConsistency.mismatchedMatchNumbers, []);
  assert.equal(market.v2Eligibility.eligible, false);
  assert.deepEqual(market.matches.map(x => x.productMatchNumber), [1,2,3,4,5]);
  assert.deepEqual(market.matches.map(x => x.toto13MatchNumber), [6,7,8,9,10]);
  for (const match of market.matches) {
    assert.equal(match.sumVotes, 19908);
    assert.ok(Math.abs(match.percentages.reduce((a,b)=>a+b,0)-100) < 1e-8);
    assert.equal(match.marketVoteShare['1'], match.percentages[0] / 100);
    assert.equal(match.marketVoteShare['0'], match.percentages[1] / 100);
    assert.equal(match.marketVoteShare['2'], match.percentages[2] / 100);
  }
});
