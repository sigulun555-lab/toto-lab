'use strict';
const test=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');
const s=JSON.parse(fs.readFileSync(path.join(__dirname,'..','reports/round_1673_miniB_official_market_snapshot_20261117T1602JST.json'),'utf8'));
test('16:02 official round 1673 mini toto B snapshot is stale history only and all five product matches reconcile',()=>{
 assert.equal(s.round,1673);assert.equal(s.marketType,'mini toto B');
 assert.equal(s.pageDisplayAt,'2026-11-17T16:02:00+09:00');assert.equal(s.retrievedAt,'2026-11-17T17:39:56+09:00');
 assert.equal(s.displayAgeSeconds,5876);assert.equal(s.stale,true);assert.equal(s.totalVotesPageSummary,17125);
 assert.equal(s.matches.length,5);assert.deepEqual(s.matches.map(m=>m.productMatchNumber),[1,2,3,4,5]);
 assert.deepEqual(s.matches.map(m=>m.toto13MatchNumber),[6,7,8,9,10]);
 assert.equal(s.countConsistency.allPerMatchTotalsMatchPageSummary,true);assert.equal(s.countConsistency.allDisplayedPercentageTriplesSumTo100,true);
 assert.ok(s.matches.every(m=>m.sumVotes===17125&&m.differenceFromSummaryVotes===0));
 assert.ok(s.matches.every(m=>Math.abs(m.percentages.reduce((a,b)=>a+b,0)-100)<1e-8));
 assert.ok(s.matches.every(m=>Math.abs(Object.values(m.marketVoteShare).reduce((a,b)=>a+b,0)-1)<1e-8));
 assert.equal(s.v2Eligibility.eligible,false);
});
