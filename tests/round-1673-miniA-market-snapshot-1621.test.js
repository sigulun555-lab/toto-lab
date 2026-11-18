'use strict';
const test=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');
const market=JSON.parse(fs.readFileSync(path.join(__dirname,'..','reports/round_1673_miniA_official_market_snapshot_20261118T1621JST.json'),'utf8'));
test('16:21 official mini toto A snapshot is fresh and raw-count reconciled without V2 synthesis',()=>{
 assert.equal(market.round,1673);assert.equal(market.product,'mini toto A');assert.equal(market.pageDisplayAt,'2026-11-18T16:21:00+09:00');
 assert.equal(market.retrievedAt,'2026-11-18T16:23:36.980+09:00');assert.equal(market.displayAgeSeconds,156);assert.equal(market.stale,false);
 assert.equal(market.totalVotesPageSummary,26342);assert.equal(market.matches.length,5);
 assert.equal(market.countConsistency.allPerMatchTotalsMatchPageSummary,true);assert.equal(market.countConsistency.allDisplayedPercentageTriplesSumTo100,true);
 assert.equal(market.v2Eligibility.eligible,false);assert.equal(market.v2Eligibility.generatorAvailable,false);
 for(const m of market.matches){assert.equal(m.sumVotes,26342);assert.equal(m.sumVotes,m.voteCounts.reduce((a,b)=>a+b,0));assert.ok(Math.abs(m.percentages.reduce((a,b)=>a+b,0)-100)<1e-8);}
});