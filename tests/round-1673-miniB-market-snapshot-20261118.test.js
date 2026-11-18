'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const market=JSON.parse(fs.readFileSync(path.join(__dirname,'..','reports/round_1673_miniB_official_market_snapshot_20261118T0941JST.json'),'utf8'));
const rows=fs.readFileSync(path.join(__dirname,'..','predictions/round_1673_ChatGPT_miniB.jsonl'),'utf8').trim().split(/\r?\n/).filter(Boolean).map(JSON.parse);
test('mini toto B 09:41 official snapshot is archived as stale and keeps the separate toto13 crosswalk',()=>{
 assert.equal(market.round,1673);assert.equal(market.product,'mini toto B');assert.equal(market.pageDisplayAt,'2026-11-18T09:41:00+09:00');
 assert.equal(market.retrievedAt,'2026-11-18T09:55:36+09:00');assert.equal(market.displayAgeSeconds,876);assert.equal(market.stale,true);
 assert.equal(market.totalVotesPageSummary,20070);assert.deepEqual(market.matches.map(x=>x.productMatchNumber),[1,2,3,4,5]);
 assert.deepEqual(market.matches.map(x=>x.toto13MatchNumber),[6,7,8,9,10]);assert.equal(market.countConsistency.allPerMatchTotalsMatchPageSummary,true);
 assert.equal(market.countConsistency.allDisplayedPercentageTriplesSumTo100,true);assert.equal(market.v2Eligibility.eligible,false);
 assert.match(market.v2Eligibility.reason,/5分更新案内を超過/);assert.equal(rows.length,5);assert.ok(rows.every(x=>x.revisionOf===null));
 for(const x of market.matches){assert.equal(x.sumVotes,20070);assert.ok(Math.abs(x.percentages.reduce((a,b)=>a+b,0)-100)<1e-8);}
});
