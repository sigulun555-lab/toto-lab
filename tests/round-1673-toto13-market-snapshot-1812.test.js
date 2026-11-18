'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const market = JSON.parse(fs.readFileSync(path.join(__dirname,'..','reports/round_1673_toto13_official_market_snapshot_20261118T1812JST.json'),'utf8'));

test('18:12 official toto13 snapshot is stale and preserves one-vote reconciliation gaps', () => {
  assert.equal(market.round,1673);
  assert.equal(market.product,'toto13');
  assert.equal(market.pageDisplayAt,'2026-11-18T18:12:00+09:00');
  assert.equal(market.retrievedAt,'2026-11-18T18:37:00+09:00');
  assert.equal(market.displayAgeSeconds,1500);
  assert.equal(market.stale,true);
  assert.equal(market.totalVotesPageSummary,212981);
  assert.equal(market.matches.length,13);
  assert.deepEqual(market.countConsistency.mismatchedMatchNumbers,[1,2,3,4,5,6]);
  assert.equal(market.countConsistency.allPerMatchTotalsMatchPageSummary,false);
  assert.equal(market.countConsistency.allDisplayedPercentageTriplesSumTo100,true);
  assert.equal(market.v2Eligibility.eligible,false);
  assert.equal(market.v2Eligibility.marketDataFresh,false);
  assert.equal(market.v2Eligibility.generatorAvailable,false);
  for (const m of market.matches) {
    assert.equal(m.sumVotes,m.voteCounts.reduce((a,b)=>a+b,0));
    assert.equal(m.differenceFromSummaryVotes,m.sumVotes-market.totalVotesPageSummary);
    assert.ok(Math.abs(m.percentages.reduce((a,b)=>a+b,0)-100)<1e-8);
  }
});
