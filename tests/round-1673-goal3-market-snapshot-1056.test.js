'use strict';
const test=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');
const market=JSON.parse(fs.readFileSync(path.join(__dirname,'..','reports/round_1673_goal3_official_market_snapshot_20261118T1056JST.json'),'utf8'));
const attempts=fs.readFileSync(path.join(__dirname,'..','data/goal3_market_snapshot_attempts.jsonl'),'utf8').trim().split(/\r?\n/).filter(Boolean).map(JSON.parse);
const suffixes=['0646','0835','0938','1151'];
const v2Files=suffixes.map(t=>path.join(__dirname,'..','predictions','round_1673_ChatGPT_goal3_market_blend_v2_'+t+'JST.jsonl'));
const v2=v2Files.flatMap(p=>fs.readFileSync(p,'utf8').trim().split(/\r?\n/).filter(Boolean).map(JSON.parse));
const v1=fs.readFileSync(path.join(__dirname,'..','predictions/round_1673_ChatGPT_goal3.jsonl'),'utf8').trim().split(/\r?\n/).filter(Boolean).map(JSON.parse);
const allIds=new Set([...v1,...v2].map(x=>x.predictionId));
const attempt=attempts.find(x=>x.snapshotPath==='reports/round_1673_goal3_official_market_snapshot_20261118T1056JST.json');
test('10:56 official totoGOAL3 snapshot is archived stale and preserves four-category history',()=>{
 assert.equal(market.round,1673);assert.equal(market.marketType,'totoGOAL3');assert.equal(market.pageDisplayAt,'2026-11-18T10:56:00+09:00');
 assert.equal(market.retrievedAt,'2026-11-18T12:24:05+09:00');assert.equal(market.displayAgeSeconds,5285);assert.equal(market.stale,true);
 assert.equal(market.totalVotesPageSummary,37861);assert.deepEqual(market.categoryOrder,['0','1','2','3+']);assert.equal(market.matches.length,6);
 assert.deepEqual(market.matches.map(m=>m.matchNumber),[1,1,2,2,3,3]);assert.deepEqual(market.matches.map(m=>m.toto13MatchNumber),[1,1,2,2,5,5]);
 assert.equal(market.countConsistency.allSixTeamSideTotalsMatchPageSummary,true);assert.equal(market.countConsistency.allSixPercentageVectorsSumTo100,true);
 for(const m of market.matches){assert.equal(m.sumVotes,37861);assert.ok(Math.abs(m.sumPercent-100)<1e-8);assert.ok(Math.abs(Object.values(m.marketVoteShare).reduce((a,b)=>a+b,0)-1)<1e-8);}
 assert.ok(attempt);assert.equal(attempt.round,1673);assert.equal(attempt.marketType,'totoGOAL3');assert.equal(attempt.attemptedAt,'2026-11-18T12:24:05+09:00');
 assert.equal(attempt.retrievedAt,'2026-11-18T12:24:05+09:00');assert.equal(attempt.totalVotesPageSummary,37861);assert.equal(attempt.officialFixtureCount,3);assert.equal(attempt.officialTeamTargetCount,6);assert.match(attempt.voteShareStatus,/stale/);
 assert.equal(v1.length,48);assert.equal(v2.length,24);assert.equal(allIds.size,72);assert.equal([...v1,...v2].length,72);
 assert.equal(v2.filter(x=>x.revisionOf&&!allIds.has(x.revisionOf)).length,0);
});
