'use strict';
const test=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');
const market=JSON.parse(fs.readFileSync(path.join(__dirname,'..','reports/round_1673_goal3_official_market_snapshot_20261117T2341JST.json'),'utf8'));
const attempts=fs.readFileSync(path.join(__dirname,'..','data/goal3_market_snapshot_attempts.jsonl'),'utf8').trim().split(/\r?\n/).map(JSON.parse);
const v2=fs.readFileSync(path.join(__dirname,'..','predictions/round_1673_ChatGPT_goal3_market_blend_v2_1151JST.jsonl'),'utf8').trim().split(/\r?\n/).map(JSON.parse);
const attempt=attempts.find(x=>x.snapshotPath==='reports/round_1673_goal3_official_market_snapshot_20261117T2341JST.json');
test('23:41 official totoGOAL3 snapshot is fresh, complete and reconciled; existing V2 remains unchanged',()=>{
 assert.equal(market.round,1673);assert.equal(market.marketType,'totoGOAL3');assert.equal(market.pageDisplayAt,'2026-11-17T23:41:00+09:00');
 assert.equal(market.retrievedAt,'2026-11-17T23:45:14+09:00');assert.equal(market.displayAgeSeconds,254);assert.equal(market.stale,false);
 assert.equal(market.totalVotesPageSummary,35299);assert.deepEqual(market.categoryOrder,['0','1','2','3+']);assert.equal(market.matches.length,6);
 assert.deepEqual(market.matches.map(m=>m.matchNumber),[1,1,2,2,3,3]);assert.deepEqual(market.matches.map(m=>m.toto13MatchNumber),[1,1,2,2,5,5]);
 assert.equal(market.countConsistency.allSixTeamSideTotalsMatchPageSummary,true);assert.equal(market.countConsistency.allSixPercentageVectorsSumTo100,true);assert.deepEqual(market.countConsistency.mismatchedTeamSides,[]);
 for(const m of market.matches){assert.equal(m.sumVotes,35299);assert.ok(Math.abs(m.sumPercent-100)<1e-8);assert.ok(Math.abs(Object.values(m.marketVoteShare).reduce((a,b)=>a+b,0)-1)<1e-8);}
 assert.ok(attempt);assert.equal(attempt.attemptedAt,'2026-11-17T23:45:14+09:00');assert.equal(attempt.retrievedAt,'2026-11-17T23:45:14+09:00');
 assert.equal(attempt.totalVotesPageSummary,35299);assert.equal(attempt.officialFixtureCount,3);assert.equal(attempt.officialTeamTargetCount,6);assert.match(attempt.voteShareStatus,/fresh/);
 assert.equal(v2.length,24);assert.equal(new Set(v2.map(r=>r.predictionId)).size,24);assert.equal(market.v2Eligibility.eligible,false);
});
