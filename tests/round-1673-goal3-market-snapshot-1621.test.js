'use strict';
const test=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');
const market=JSON.parse(fs.readFileSync(path.join(__dirname,'..','reports/round_1673_goal3_official_market_snapshot_20261118T1621JST.json'),'utf8'));
test('16:21 official totoGOAL3 snapshot reconciles six team-sides and preserves 0/1/2/3+ without V2 synthesis',()=>{
 assert.equal(market.round,1673);assert.equal(market.marketType,'totoGOAL3');assert.equal(market.pageDisplayAt,'2026-11-18T16:21:00+09:00');
 assert.equal(market.retrievedAt,'2026-11-18T16:23:36.980+09:00');assert.equal(market.displayAgeSeconds,156);assert.equal(market.stale,false);
 assert.equal(market.totalVotesPageSummary,42361);assert.equal(market.matches.length,6);
 assert.deepEqual(market.categories,['0点','1点','2点','3点以上']);
 assert.equal(market.countConsistency.allSixTeamSideTotalsMatchPageSummary,true);assert.equal(market.countConsistency.allSixPercentageVectorsSumTo100,true);
 assert.equal(market.v2Eligibility.eligible,false);assert.equal(market.v2Eligibility.generatorAvailable,false);
 for(const m of market.matches){assert.equal(m.sumVotes,42361);assert.equal(m.sumVotes,m.voteCounts.reduce((a,b)=>a+b,0));assert.ok(Math.abs(m.percentages.reduce((a,b)=>a+b,0)-100)<1e-8);}
});