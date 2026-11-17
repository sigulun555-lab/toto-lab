'use strict';
const test=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');
const s=JSON.parse(fs.readFileSync(path.join(__dirname,'..','reports/round_1673_miniA_official_market_snapshot_20261117T1738JST.json'),'utf8'));
test('mini toto A 17:38 official snapshot is stale history only and reconciles',()=>{
 assert.equal(s.round,1673);assert.equal(s.marketType,'mini toto A');
 assert.equal(s.pageDisplayAt,'2026-11-17T17:38:00+09:00');assert.equal(s.retrievedAt,'2026-11-17T17:45:01+09:00');
 assert.equal(s.displayAgeSeconds,421);assert.equal(s.stale,true);assert.equal(s.totalVotesPageSummary,20223);
 assert.equal(s.matches.length,5);assert.deepEqual(s.matches.map(m=>m.productMatchNumber),[1,2,3,4,5]);
 assert.deepEqual(s.matches.map(m=>m.toto13MatchNumber),[1,2,3,4,5]);
 assert.equal(s.countConsistency.allPerMatchTotalsMatchPageSummary,true);assert.equal(s.countConsistency.allDisplayedPercentageTriplesSumTo100,true);
 assert.ok(s.matches.every(m=>m.sumVotes===20223&&m.differenceFromSummaryVotes===0));
 assert.ok(s.matches.every(m=>Math.abs(m.percentages.reduce((a,b)=>a+b,0)-100)<1e-8));
 assert.equal(s.v2Eligibility.eligible,false);
});


const miniA1943=JSON.parse(fs.readFileSync(path.join(__dirname,'..','reports/round_1673_miniA_official_market_snapshot_20261117T1943JST.json'),'utf8'));
test('mini toto A 19:43 official snapshot is stale history only and reconciles',()=>{
 assert.equal(miniA1943.round,1673);assert.equal(miniA1943.marketType,'mini toto A');
 assert.equal(miniA1943.pageDisplayAt,'2026-11-17T19:43:00+09:00');assert.equal(miniA1943.retrievedAt,'2026-11-17T20:03:37+09:00');
 assert.equal(miniA1943.displayAgeSeconds,1237);assert.equal(miniA1943.stale,true);assert.equal(miniA1943.totalVotesPageSummary,20906);
 assert.equal(miniA1943.matches.length,5);assert.deepEqual(miniA1943.matches.map(m=>m.toto13MatchNumber),[1,2,3,4,5]);
 assert.equal(miniA1943.countConsistency.allPerMatchTotalsMatchPageSummary,true);
 assert.equal(miniA1943.countConsistency.allDisplayedPercentageTriplesSumTo100,true);
 assert.ok(miniA1943.matches.every(m=>m.sumVotes===20906&&m.differenceFromSummaryVotes===0));
 assert.ok(miniA1943.matches.every(m=>Math.abs(m.percentages.reduce((a,b)=>a+b,0)-100)<1e-8));
 assert.equal(miniA1943.v2Eligibility.eligible,false);
});
