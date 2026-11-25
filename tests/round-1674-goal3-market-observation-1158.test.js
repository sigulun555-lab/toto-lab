'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const market = require('../reports/round_1674_totoGOAL3_official_market_snapshot_20261125T1158JST.json');

test('11:58 official totoGOAL3 observation is archived stale; historical V2 prototype is documented but not run', () => {
  assert.equal(market.product, 'totoGOAL3');
  assert.equal(market.marketType, 'totoGOAL3');
  assert.equal(market.round, 1674);
  assert.equal(market.fixtureCount, 3);
  assert.equal(market.teamSideCount, 6);
  assert.deepEqual(market.categoryOrder, ['0','1','2','3+']);
  assert.equal(market.pageDisplayAt, '2026-11-25T11:58:00+09:00');
  assert.equal(market.retrievedAt, '2026-11-25T12:11:02+09:00');
  assert.equal(market.displayAgeSeconds, 782);
  assert.equal(market.staleAfterSeconds, 300);
  assert.equal(market.stale, true);
  assert.equal(market.totalVotesPageSummary, 110882);
  assert.equal(market.teamSides.length, 6);
  assert.equal(market.reconciliation.allTeamSideVoteCountSumsMatchPageTotal, true);
  assert.equal(market.reconciliation.allPercentageTotalsEqual100, true);
  for (const side of market.teamSides) {
    assert.equal(side.sumVotes, side.voteCounts.reduce((a,b)=>a+b,0));
    assert.equal(side.sumVotes, market.totalVotesPageSummary);
    assert.ok(Math.abs(side.percentageTotal-100)<1e-8);
    assert.ok(Math.abs(Object.values(side.marketVoteShare).reduce((a,b)=>a+b,0)-1)<1e-8);
  }
  assert.equal(market.historicalV2Prototype.status, 'hardcoded_round1666_prototype_only');
  assert.equal(market.historicalV2Prototype.marketWeight, 0.7);
  assert.equal(market.historicalV2Prototype.marketWeightStatus, 'provisional_and_not_independently_validated_for_GOAL3');
  assert.equal(market.historicalV2Prototype.sources.length, 4);
  assert.match(market.historicalV2Prototype.limitation, /hardcodes round 1666 inputs/);
  assert.equal(market.v2Eligibility.predictionGenerationEligible, false);
  assert.match(market.v2Eligibility.reason, /0.7はGOAL3で未検証/);
});
