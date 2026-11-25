'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const market = require('../reports/round_1674_toto13_official_market_snapshot_20261125T1203JST.json');

test('12:03 official toto13 observation is archived stale and inconsistent; no V2 revision is generated', () => {
  assert.equal(market.product, 'toto13');
  assert.equal(market.round, 1674);
  assert.equal(market.pageDisplayAt, '2026-11-25T12:03:00+09:00');
  assert.equal(market.retrievedAt, '2026-11-25T12:11:02+09:00');
  assert.equal(market.displayAgeSeconds, 482);
  assert.equal(market.refreshIntervalSeconds, 300);
  assert.equal(market.stale, true);
  assert.equal(market.totalVotesPageSummary, 493181);
  assert.equal(market.matches.length, 13);
  assert.deepEqual(market.matches.map(x => x.matchNumber), Array.from({length:13},(_,i)=>i+1));
  for (const m of market.matches) {
    assert.equal(m.sumVotes, m.voteCounts.reduce((a,b)=>a+b,0));
    assert.equal(m.sumPercent, 100);
    assert.ok(Math.abs(Object.values(m.marketVoteShare).reduce((a,b)=>a+b,0)-1)<1e-8);
  }
  const mismatches = market.matches.filter(m => m.sumVotes !== market.totalVotesPageSummary);
  assert.deepEqual(mismatches.map(m=>m.matchNumber), [1]);
  assert.equal(mismatches[0].sumVotes, 493180);
  assert.equal(market.countConsistency.allMatchVoteTotalsEqualPageSummary, false);
  assert.equal(market.countConsistency.allDisplayedPercentagesSumTo100, true);
  assert.equal(market.v2Eligibility.predictionGenerationEligible, false);
  assert.match(market.v2Eligibility.reason, /1口不一致/);
});
