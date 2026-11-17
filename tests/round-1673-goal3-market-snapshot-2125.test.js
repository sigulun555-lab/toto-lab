'use strict';
const test=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');
const market=JSON.parse(fs.readFileSync(path.join(__dirname,'..','reports/round_1673_goal3_official_market_snapshot_20261117T2125JST.json'),'utf8'));
test('21:25 official totoGOAL3 snapshot is archived as stale history and excluded from V2',()=>{
 assert.equal(market.round,1673);assert.equal(market.marketType,'totoGOAL3');assert.equal(market.pageDisplayAt,'2026-11-17T21:25:00+09:00');
 assert.equal(market.retrievedAt,'2026-11-17T21:31:43.414+09:00');assert.equal(market.displayAgeSeconds,403);assert.equal(market.stale,true);
 assert.equal(market.totalVotesPageSummary,34422);assert.deepEqual(market.categoryOrder,['0','1','2','3+']);assert.equal(market.matches.length,6);
 assert.deepEqual(market.matches.map(m=>m.matchNumber),[1,1,2,2,3,3]);assert.deepEqual(market.matches.map(m=>m.toto13MatchNumber),[1,1,2,2,5,5]);
 assert.equal(market.countConsistency.allSixTeamSideTotalsMatchPageSummary,true);assert.equal(market.countConsistency.allSixPercentageVectorsSumTo100,true);
 assert.deepEqual(market.countConsistency.mismatchedTeamSides,[]);assert.equal(market.v2Eligibility.eligible,false);
 for(const m of market.matches){assert.equal(m.sumVotes,34422);assert.ok(Math.abs(m.sumPercent-100)<1e-8);assert.ok(Math.abs(m.marketVoteShare['0']+m.marketVoteShare['1']+m.marketVoteShare['2']+m.marketVoteShare['3']-1)<1e-8);}
});
