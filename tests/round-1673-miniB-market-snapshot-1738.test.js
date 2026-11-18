'use strict';
const test=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');
const s=JSON.parse(fs.readFileSync(path.join(__dirname,'..','reports/round_1673_miniB_official_market_snapshot_20261117T1738JST.json'),'utf8'));
test('mini toto B 17:38 official snapshot is stale history only and reconciles',()=>{
 assert.equal(s.round,1673);assert.equal(s.marketType,'mini toto B');
 assert.equal(s.pageDisplayAt,'2026-11-17T17:38:00+09:00');assert.equal(s.retrievedAt,'2026-11-17T17:45:01+09:00');
 assert.equal(s.displayAgeSeconds,421);assert.equal(s.stale,true);assert.equal(s.totalVotesPageSummary,17950);
 assert.equal(s.matches.length,5);assert.deepEqual(s.matches.map(m=>m.productMatchNumber),[1,2,3,4,5]);
 assert.deepEqual(s.matches.map(m=>m.toto13MatchNumber),[6,7,8,9,10]);
 assert.equal(s.countConsistency.allPerMatchTotalsMatchPageSummary,true);assert.equal(s.countConsistency.allDisplayedPercentageTriplesSumTo100,true);
 assert.ok(s.matches.every(m=>m.sumVotes===17950&&m.differenceFromSummaryVotes===0));
 assert.ok(s.matches.every(m=>Math.abs(m.percentages.reduce((a,b)=>a+b,0)-100)<1e-8));
 assert.equal(s.v2Eligibility.eligible,false);
});


const miniB1943=JSON.parse(fs.readFileSync(path.join(__dirname,'..','reports/round_1673_miniB_official_market_snapshot_20261117T1943JST.json'),'utf8'));
test('mini toto B 19:43 official snapshot is stale history only and reconciles',()=>{
 assert.equal(miniB1943.round,1673);assert.equal(miniB1943.marketType,'mini toto B');
 assert.equal(miniB1943.pageDisplayAt,'2026-11-17T19:43:00+09:00');assert.equal(miniB1943.retrievedAt,'2026-11-17T20:13:02+09:00');
 assert.equal(miniB1943.displayAgeSeconds,1802);assert.equal(miniB1943.stale,true);assert.equal(miniB1943.totalVotesPageSummary,18541);
 assert.equal(miniB1943.matches.length,5);assert.deepEqual(miniB1943.matches.map(m=>m.productMatchNumber),[1,2,3,4,5]);
 assert.deepEqual(miniB1943.matches.map(m=>m.toto13MatchNumber),[6,7,8,9,10]);
 assert.equal(miniB1943.countConsistency.allPerMatchTotalsMatchPageSummary,true);
 assert.equal(miniB1943.countConsistency.allDisplayedPercentageTriplesSumTo100,true);
 assert.ok(miniB1943.matches.every(m=>m.sumVotes===18541&&m.differenceFromSummaryVotes===0));
 assert.ok(miniB1943.matches.every(m=>Math.abs(m.percentages.reduce((a,b)=>a+b,0)-100)<1e-8));
 assert.equal(miniB1943.v2Eligibility.eligible,false);
});
