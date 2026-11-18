'use strict';
const test=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');
const market=JSON.parse(fs.readFileSync(path.join(__dirname,'..','reports/round_1673_miniA_official_market_snapshot_20261118T1443JST.json'),'utf8'));
const rows=fs.readFileSync(path.join(__dirname,'..','predictions/round_1673_ChatGPT_miniA.jsonl'),'utf8').trim().split(/\r?\n/).filter(Boolean).map(JSON.parse);
test('mini toto A 14:43 official snapshot is fresh and does not create duplicate prediction rows',()=>{
 assert.equal(market.round,1673);assert.equal(market.product,'mini toto A');assert.equal(market.pageDisplayAt,'2026-11-18T14:43:00+09:00');
 assert.equal(market.retrievedAt,'2026-11-18T14:45:10+09:00');assert.equal(market.displayAgeSeconds,130);assert.equal(market.stale,false);assert.equal(market.totalVotesPageSummary,25755);
 assert.deepEqual(market.matches.map(x=>x.productMatchNumber),[1,2,3,4,5]);assert.deepEqual(market.matches.map(x=>x.toto13MatchNumber),[1,2,3,4,5]);
 assert.equal(market.countConsistency.allPerMatchTotalsMatchPageSummary,true);assert.equal(market.countConsistency.allDisplayedPercentageTriplesSumTo100,true);
 assert.equal(market.v2Eligibility.eligible,false);assert.equal(market.v2Eligibility.marketDataFresh,true);assert.equal(market.v2Eligibility.generatorAvailable,false);
 assert.equal(rows.length,5);assert.ok(rows.every(x=>x.revisionOf===null));
 for(const m of market.matches){assert.equal(m.sumVotes,25755);assert.equal(m.differenceFromSummaryVotes,0);assert.ok(Math.abs(m.percentages.reduce((a,b)=>a+b,0)-100)<1e-8);}
});
