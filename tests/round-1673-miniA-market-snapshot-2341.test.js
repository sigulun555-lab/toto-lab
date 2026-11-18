'use strict';
const test=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');
const market=JSON.parse(fs.readFileSync(path.join(__dirname,'..','reports/round_1673_miniA_official_market_snapshot_20261117T2341JST.json'),'utf8'));
const rows=fs.readFileSync(path.join(__dirname,'..','predictions/round_1673_ChatGPT_miniA.jsonl'),'utf8').trim().split(/\r?\n/).map(JSON.parse);
test('23:41 official mini toto A snapshot is fresh, complete and reconciled; V1 remains unchanged',()=>{
 assert.equal(market.round,1673);assert.equal(market.marketType,'mini toto A');assert.equal(market.pageDisplayAt,'2026-11-17T23:41:00+09:00');
 assert.equal(market.retrievedAt,'2026-11-17T23:45:14+09:00');assert.equal(market.displayAgeSeconds,254);assert.equal(market.stale,false);
 assert.equal(market.totalVotesPageSummary,22427);assert.deepEqual(market.outcomeOrder,['1','0','2']);assert.equal(market.matches.length,5);
 assert.deepEqual(market.matches.map(m=>m.productMatchNumber),[1,2,3,4,5]);assert.deepEqual(market.matches.map(m=>m.toto13MatchNumber),[1,2,3,4,5]);
 assert.equal(market.countConsistency.allPerMatchTotalsMatchPageSummary,true);assert.equal(market.countConsistency.allDisplayedPercentageTriplesSumTo100,true);assert.deepEqual(market.countConsistency.mismatchedMatchNumbers,[]);
 for(const m of market.matches){assert.equal(m.sumVotes,22427);assert.equal(m.differenceFromSummaryVotes,0);assert.ok(Math.abs(m.percentages.reduce((a,b)=>a+b,0)-100)<1e-8);}
 assert.equal(rows.length,5);assert.equal(new Set(rows.map(r=>r.predictionId)).size,5);assert.equal(market.v2Eligibility.eligible,false);
});
