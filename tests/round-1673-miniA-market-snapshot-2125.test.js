'use strict';
const test=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');
const market=JSON.parse(fs.readFileSync(path.join(__dirname,'..','reports/round_1673_miniA_official_market_snapshot_20261117T2125JST.json'),'utf8'));
test('21:25 official mini toto A snapshot is archived as stale history and excluded from V2',()=>{
 assert.equal(market.round,1673);assert.equal(market.product,'mini toto A');assert.equal(market.marketType,'mini toto A');
 assert.equal(market.pageDisplayAt,'2026-11-17T21:25:00+09:00');assert.equal(market.retrievedAt,'2026-11-17T21:31:43.414+09:00');
 assert.equal(market.displayAgeSeconds,403);assert.equal(market.stale,true);assert.equal(market.totalVotesPageSummary,21543);
 assert.equal(market.matches.length,5);assert.deepEqual(market.matches.map(m=>m.matchNumber),[1,2,3,4,5]);assert.deepEqual(market.matches.map(m=>m.toto13MatchNumber),[1,2,3,4,5]);
 assert.equal(market.countConsistency.allPerMatchTotalsMatchPageSummary,true);assert.equal(market.countConsistency.allDisplayedPercentageTriplesSumTo100,true);
 assert.deepEqual(market.countConsistency.mismatchedMatchNumbers,[]);assert.equal(market.v2Eligibility.eligible,false);
 for(const m of market.matches){assert.equal(m.sumVotes,21543);assert.equal(m.differenceFromSummaryVotes,0);assert.ok(Math.abs(m.percentages.reduce((x,y)=>x+y,0)-100)<1e-8);}
});
