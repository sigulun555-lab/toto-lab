'use strict';
const test=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');
const market=JSON.parse(fs.readFileSync(path.join(__dirname,'..','reports/round_1673_toto13_official_market_snapshot_20261117T2341JST.json'),'utf8'));
const v2=fs.readFileSync(path.join(__dirname,'..','predictions/round_1673_ChatGPT_shared_score_v2.jsonl'),'utf8').trim().split(/\r?\n/).map(JSON.parse);
test('23:41 official toto13 snapshot excludes V2 and preserves its historical rows after later revisions',()=>{
 assert.equal(market.round,1673);assert.equal(market.marketType,'toto13');assert.equal(market.pageDisplayAt,'2026-11-17T23:41:00+09:00');
 assert.equal(market.retrievedAt,'2026-11-17T23:45:14+09:00');assert.equal(market.displayAgeSeconds,254);assert.equal(market.stale,false);
 assert.equal(market.totalVotesPageSummary,178683);assert.equal(market.matches.length,13);
 assert.equal(market.countConsistency.allThirteenMatchTotalsMatchPageSummary,false);assert.equal(market.countConsistency.allDisplayedPercentageTriplesSumTo100,true);
 assert.deepEqual(market.countConsistency.mismatchedMatchNumbers,[1,2,3,4,5,6,7,8,9,10]);assert.deepEqual(market.matches.map(m=>m.differenceFromSummaryVotes),Array(10).fill(-1).concat([0,0,0]));
 for(const m of market.matches)assert.ok(Math.abs(m.percentages.reduce((a,b)=>a+b,0)-100)<1e-8);
 assert.equal(market.v2Eligibility.eligible,false);const v2At2341=v2.filter(r=>Date.parse(r.predictionConfirmedAt)<=Date.parse('2026-11-17T23:45:14+09:00'));assert.equal(v2At2341.length,39);assert.equal(new Set(v2At2341.map(r=>r.predictionId)).size,39);assert.ok(v2.length>=39);assert.equal(new Set(v2.map(r=>r.predictionId)).size,v2.length);
});
