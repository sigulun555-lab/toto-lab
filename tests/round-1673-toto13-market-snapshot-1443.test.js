'use strict';
const test=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');
const market=JSON.parse(fs.readFileSync(path.join(__dirname,'..','reports/round_1673_toto13_official_market_snapshot_20261118T1443JST.json'),'utf8'));
const v2=fs.readFileSync(path.join(__dirname,'..','predictions/round_1673_ChatGPT_shared_score_v2.jsonl'),'utf8').trim().split(/\r?\n/).filter(Boolean);
test('14:43 official toto13 snapshot is fresh, raw-count reconciled, and does not synthesize V2',()=>{
 assert.equal(market.round,1673);assert.equal(market.product,'toto13');assert.equal(market.pageDisplayAt,'2026-11-18T14:43:00+09:00');
 assert.equal(market.retrievedAt,'2026-11-18T14:45:10+09:00');assert.equal(market.displayAgeSeconds,130);assert.equal(market.stale,false);
 assert.equal(market.totalVotesPageSummary,203397);assert.equal(market.matches.length,13);
 assert.equal(market.countConsistency.allPerMatchTotalsMatchPageSummary,true);assert.equal(market.countConsistency.allDisplayedPercentageTriplesSumTo100,true);
 assert.deepEqual(market.countConsistency.mismatchedMatchNumbers,[]);assert.equal(market.v2Eligibility.eligible,false);
 assert.equal(market.v2Eligibility.marketDataFresh,true);assert.equal(market.v2Eligibility.generatorAvailable,false);assert.equal(v2.map(JSON.parse).filter(row => Date.parse(row.predictionConfirmedAt) < Date.parse('2026-11-18T00:00:00+09:00')).length,39);
 for(const m of market.matches){assert.equal(m.sumVotes,203397);assert.equal(m.differenceFromSummaryVotes,0);assert.equal(m.sumVotes,m.voteCounts.reduce((a,b)=>a+b,0));assert.ok(Math.abs(m.percentages.reduce((a,b)=>a+b,0)-100)<1e-8);}
});
