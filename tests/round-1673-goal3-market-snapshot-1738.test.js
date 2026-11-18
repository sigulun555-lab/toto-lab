'use strict';
const test=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');
const s=JSON.parse(fs.readFileSync(path.join(__dirname,'..','reports/round_1673_goal3_official_market_snapshot_20261117T1738JST.json'),'utf8'));
test('17:38 official GOAL3 snapshot is stale history only and reconciles six four-category team-sides',()=>{
 assert.equal(s.round,1673);assert.equal(s.marketType,'totoGOAL3');assert.equal(s.pageDisplayAt,'2026-11-17T17:38:00+09:00');
 assert.equal(s.retrievedAt,'2026-11-17T17:45:01+09:00');assert.equal(s.displayAgeSeconds,421);assert.equal(s.stale,true);assert.equal(s.totalVotesPageSummary,31448);
 assert.equal(s.matches.length,6);assert.deepEqual(s.categoryOrder,['0','1','2','3+']);assert.deepEqual(s.matches.map(m=>m.toto13MatchNumber),[1,1,2,2,5,5]);
 assert.deepEqual(s.matches.map(m=>m.team),['町田','長崎','広島','横浜FM','Ｇ大阪','岡山']);
 assert.equal(s.countConsistency.allSixTeamSideTotalsMatchPageSummary,true);assert.equal(s.countConsistency.allSixPercentageVectorsSumTo100,true);
 assert.ok(s.matches.every(m=>m.sumVotes===31448&&m.sumPercent===100));assert.ok(s.matches.every(m=>m.voteCounts.reduce((a,b)=>a+b,0)===31448));
 assert.ok(s.matches.every(m=>Math.abs(m.percentages.reduce((a,b)=>a+b,0)-100)<1e-8));assert.equal(s.v2Eligibility.eligible,false);
});
