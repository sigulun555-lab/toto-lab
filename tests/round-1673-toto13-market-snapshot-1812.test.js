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

const market1716 = JSON.parse(fs.readFileSync(path.join(__dirname,'..','reports/round_1673_toto13_official_market_snapshot_20261120T1716JST.json'),'utf8'));

test('17:16 official toto13 snapshot is fresh but preserves all 13 count mismatches and blocks V2', () => {
  assert.equal(market1716.round,1673);
  assert.equal(market1716.product,'toto13');
  assert.equal(market1716.marketType,'toto13');
  assert.equal(market1716.pageDisplayAt,'2026-11-20T17:16:00+09:00');
  assert.equal(market1716.retrievedAt,'2026-11-20T17:19:50.562+09:00');
  assert.equal(market1716.displayAgeSeconds,230.562);
  assert.equal(market1716.stale,false);
  assert.equal(new URL(market1716.sourceUrl).hostname,'store.toto-dream.com');
  assert.equal(market1716.totalVotesPageSummary,517520);
  assert.equal(market1716.matches.length,13);
  assert.deepEqual(market1716.countConsistency.mismatchedMatchNumbers,Array.from({length:13},(_,i)=>i+1));
  assert.deepEqual(market1716.countConsistency.differenceFromSummaryByMatch,[-11,-11,-11,-11,-11,-11,-11,-11,-11,-11,-11,-6,-1]);
  assert.equal(market1716.countConsistency.perMatchVoteTotalRange.min,517509);
  assert.equal(market1716.countConsistency.perMatchVoteTotalRange.max,517519);
  assert.equal(market1716.countConsistency.perMatchVoteTotalRange.spread,10);
  assert.equal(market1716.countConsistency.allPerMatchTotalsMatchPageSummary,false);
  assert.equal(market1716.countConsistency.allDisplayedPercentageTriplesSumTo100,true);
  assert.equal(market1716.v2Eligibility.eligible,false);
  assert.equal(market1716.v2Eligibility.marketDataFresh,true);
  assert.equal(market1716.v2Eligibility.generatorAvailable,false);
  assert.equal('predictionId' in market1716,false);
  assert.equal('revisionOf' in market1716,false);
  for (const m of market1716.matches) {
    assert.equal(m.sumVotes,m.voteCounts.reduce((a,b)=>a+b,0));
    assert.equal(m.differenceFromSummaryVotes,m.sumVotes-market1716.totalVotesPageSummary);
    assert.ok(Math.abs(m.percentages.reduce((a,b)=>a+b,0)-100)<1e-8);
  }
});
