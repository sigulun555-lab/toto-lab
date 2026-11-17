'use strict';const test=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');const s=JSON.parse(fs.readFileSync(path.join(__dirname,'..','reports/round_1673_goal3_official_market_snapshot_20261117T1458JST.json'),'utf8'));test('round 1673 GOAL3 14:58 snapshot is stale history only',()=>{assert.equal(s.round,1673);assert.equal(s.marketType,'totoGOAL3');assert.equal(s.pageDisplayAt,'2026-11-17T14:58:00+09:00');assert.equal(s.retrievedAt,'2026-11-17T15:10:50.228+09:00');assert.equal(s.displayAgeSeconds,770);assert.equal(s.stale,true);assert.equal(s.totalVotesPageSummary,29527);assert.equal(s.matches.length,6);assert.deepEqual(s.categoryOrder,['0','1','2','3+']);assert.deepEqual(s.matches.map(m=>m.toto13MatchNumber),[1,1,2,2,5,5]);assert.deepEqual(s.matches.map(m=>m.team),['町田','長崎','広島','横浜FM','Ｇ大阪','岡山']);assert.equal(s.countConsistency.allSixTeamSideTotalsMatchPageSummary,true);assert.equal(s.countConsistency.allSixPercentageVectorsSumTo100,true);assert.ok(s.matches.every(m=>m.sumVotes===29527&&m.sumPercent===100));assert.ok(s.matches.every(m=>m.voteCounts.reduce((a,b)=>a+b,0)===29527));assert.ok(s.matches.every(m=>Math.abs(m.percentages.reduce((a,b)=>a+b,0)-100)<1e-8));assert.equal(s.v2Eligibility.eligible,false);});

const round1673Goal3Market1810=JSON.parse(fs.readFileSync(path.join(__dirname,'..','reports/round_1673_goal3_official_market_snapshot_20261117T1810JST.json'),'utf8'));
assert.strictEqual(round1673Goal3Market1810.round,1673);
assert.strictEqual(round1673Goal3Market1810.marketType,'totoGOAL3');
assert.strictEqual(round1673Goal3Market1810.pageDisplayAt,'2026-11-17T18:10:00+09:00');
assert.strictEqual(round1673Goal3Market1810.retrievedAt,'2026-11-17T19:45:06+09:00');
assert.strictEqual(round1673Goal3Market1810.displayAgeSeconds,5706);
assert.strictEqual(round1673Goal3Market1810.stale,true);
assert.strictEqual(round1673Goal3Market1810.totalVotesPageSummary,31790);
assert.deepStrictEqual(round1673Goal3Market1810.categoryOrder,['0','1','2','3+']);
assert.strictEqual(round1673Goal3Market1810.matches.length,6);
assert.deepStrictEqual(round1673Goal3Market1810.matches.map(x=>x.toto13MatchNumber),[1,1,2,2,5,5]);
assert.strictEqual(round1673Goal3Market1810.matches.every(x=>x.sumVotes===31790&&x.sumPercent===100),true);
assert.strictEqual(round1673Goal3Market1810.countConsistency.allSixTeamSideTotalsMatchPageSummary,true);
assert.strictEqual(round1673Goal3Market1810.countConsistency.allSixPercentageVectorsSumTo100,true);
const attempt1810=fs.readFileSync(path.join(__dirname,'..','data/goal3_market_snapshot_attempts.jsonl'),'utf8').trim().split(/\r?\n/).filter(Boolean).map(JSON.parse).find(a=>a.snapshotPath==='reports/round_1673_goal3_official_market_snapshot_20261117T1810JST.json');
assert.ok(attempt1810);
assert.strictEqual(attempt1810.attemptedAt,'2026-11-17T19:45:06+09:00');
assert.strictEqual(attempt1810.captureStatus,'captured');
assert.strictEqual(attempt1810.officialFixtureCount,3);
assert.strictEqual(attempt1810.officialTeamTargetCount,6);
assert.strictEqual(attempt1810.totalVotesPageSummary,31790);
assert.strictEqual(round1673Goal3Market1810.v2Eligibility.eligible,false);
const v2After1810=fs.readFileSync(path.join(__dirname,'..','predictions/round_1673_ChatGPT_goal3_market_blend_v2_1151JST.jsonl'),'utf8').trim().split(/\r?\n/).filter(Boolean);
assert.strictEqual(v2After1810.length,6,'stale 18:10 snapshot must not create a V2 revision');
console.log('OK - round 1673 stale official GOAL3 market snapshot (18:10 JST), no V2 revision');


const goal3Market1943=JSON.parse(fs.readFileSync(path.join(__dirname,'..','reports/round_1673_goal3_official_market_snapshot_20261117T1943JST.json'),'utf8'));
test('19:43 official GOAL3 snapshot is stale history only and reconciles six four-category team-sides',()=>{
 assert.equal(goal3Market1943.round,1673);assert.equal(goal3Market1943.marketType,'totoGOAL3');
 assert.equal(goal3Market1943.pageDisplayAt,'2026-11-17T19:43:00+09:00');assert.equal(goal3Market1943.retrievedAt,'2026-11-17T20:13:02+09:00');
 assert.equal(goal3Market1943.displayAgeSeconds,1802);assert.equal(goal3Market1943.stale,true);assert.equal(goal3Market1943.totalVotesPageSummary,32833);
 assert.equal(goal3Market1943.matches.length,6);assert.deepEqual(goal3Market1943.categoryOrder,['0','1','2','3+']);
 assert.deepEqual(goal3Market1943.matches.map(m=>m.toto13MatchNumber),[1,1,2,2,5,5]);
 assert.deepEqual(goal3Market1943.matches.map(m=>m.team),['町田','長崎','広島','横浜FM','Ｇ大阪','岡山']);
 assert.equal(goal3Market1943.countConsistency.allSixTeamSideTotalsMatchPageSummary,true);
 assert.equal(goal3Market1943.countConsistency.allSixPercentageVectorsSumTo100,true);
 assert.ok(goal3Market1943.matches.every(m=>m.sumVotes===32833&&Math.abs(m.sumPercent-100)<1e-8));
 assert.ok(goal3Market1943.matches.every(m=>m.voteCounts.reduce((a,b)=>a+b,0)===32833));
 assert.ok(goal3Market1943.matches.every(m=>Math.abs(m.percentages.reduce((a,b)=>a+b,0)-100)<1e-8));
 assert.equal(goal3Market1943.v2Eligibility.eligible,false);
});
