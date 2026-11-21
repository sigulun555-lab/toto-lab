'use strict';
const test=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');
const s=JSON.parse(fs.readFileSync(path.join(__dirname,'..','reports/round_1673_toto13_official_market_snapshot_20261117T1704JST.json'),'utf8'));
test('17:04 official round 1673 toto13 snapshot is stale history only and all 13 match totals reconcile',()=>{
 assert.equal(s.round,1673);assert.equal(s.marketType,'toto13');
 assert.equal(s.pageDisplayAt,'2026-11-17T17:04:00+09:00');assert.equal(s.retrievedAt,'2026-11-17T17:39:56+09:00');
 assert.equal(s.displayAgeSeconds,2156);assert.equal(s.stale,true);assert.equal(s.totalVotesPageSummary,158027);
 assert.equal(s.matches.length,13);assert.deepEqual(s.matches.map(m=>m.matchNumber),Array.from({length:13},(_,i)=>i+1));
 assert.equal(s.countConsistency.allPerMatchTotalsMatchPageSummary,true);assert.equal(s.countConsistency.allDisplayedPercentageTriplesSumTo100,true);
 assert.ok(s.matches.every(m=>m.sumVotes===158027&&m.differenceFromSummaryVotes===0));
 assert.ok(s.matches.every(m=>Math.abs(m.percentages.reduce((a,b)=>a+b,0)-100)<1e-8));
 assert.equal(s.v2Eligibility.eligible,false);
});
