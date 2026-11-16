'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const readJsonl=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8').trim().split(/\r?\n/).filter(Boolean).map(JSON.parse);
const v1=readJsonl('predictions/round_1673_ChatGPT_goal3.jsonl');
const v2=readJsonl('predictions/round_1673_ChatGPT_goal3_market_blend_v2_0646JST.jsonl');
const market=JSON.parse(fs.readFileSync(path.join(__dirname,'..','reports/round_1673_goal3_official_market_snapshot_20261116T0646JST.json'),'utf8'));
const baselineV1=()=>{const m=new Map();for(const r of v1){if(r.predictionConfirmedAt!=='2026-11-15T18:49:33.391Z')continue;const k=r.matchNumber+'|'+(r.isHome?'home':'away');m.set(k,r);}return m;};
test('round 1673 GOAL3 has six V1 team-side chains and six V2 revisions referencing the frozen 18:49 V1 baseline',()=>{
 assert.equal(v1.length,36);assert.equal(new Set(v1.map(r=>r.predictionId)).size,36);
 const latestSync=v1.filter(r=>r.predictionConfirmedAt==='2026-11-16T06:25:20.060Z');assert.equal(latestSync.length,6);
 assert.equal(v2.length,6);assert.equal(new Set(v2.map(r=>r.predictionId)).size,6);
 const latest=baselineV1();assert.equal(latest.size,6);
 for(const r of v2){const k=r.matchNumber+'|'+(r.isHome?'home':'away');assert.equal(r.revisionOf,latest.get(k).predictionId);assert.equal(r.round,1673);assert.equal(r.marketType,'totoGOAL3');}
});
test('official 06:46 snapshot has three matches, six team-side rows, four categories and reconciled totals',()=>{
 assert.equal(market.round,1673);assert.equal(market.marketType,'totoGOAL3');
 assert.equal(market.pageDisplayAt,'2026-11-16T06:46:00+09:00');assert.equal(market.retrievedAt,'2026-11-16T06:49:34+09:00');
 assert.equal(market.displayAgeSeconds,214);assert.equal(market.stale,false);assert.equal(market.totalVotesPageSummary,14260);
 assert.deepEqual(market.categoryOrder,['0','1','2','3+']);assert.equal(market.matches.length,6);
 assert.equal(market.matches.every(m=>m.sumVotes===14260&&m.sumPercent===100),true);
 assert.deepEqual(market.matches.map(m=>m.toto13MatchNumber),[1,1,2,2,5,5]);
});
test('GOAL3 V2 uses the existing normalized 30/70 blend and preserves four-category distributions',()=>{
 const latest=baselineV1();
 for(const r of v2){
  const base=latest.get(r.matchNumber+'|'+(r.isHome?'home':'away'));
  const marketRow=market.matches.find(m=>m.matchNumber===r.matchNumber&&m.isHome===r.isHome);
  assert.ok(base);assert.ok(marketRow);
  assert.deepEqual(r.baseModelProbabilities,base.probabilities);
  assert.deepEqual(r.marketVoteShare,Object.fromEntries(['0','1','2','3'].map((k,i)=>[k,Number((marketRow.percentages[i]/100).toFixed(4))])));
  assert.deepEqual(r.blendWeights,{poissonModel:0.3,officialTotoGoal3VoteShare:0.7});
  for(const k of ['0','1','2','3'])assert.ok(Math.abs(r.probabilities[k]-(0.3*base.probabilities[k]+0.7*r.marketVoteShare[k]))<2e-8);
  assert.ok(Math.abs(Object.values(r.probabilities).reduce((a,b)=>a+b,0)-1)<2e-8);
  assert.equal(r.predictionConfirmedAt,'2026-11-16T06:49:34+09:00');
  assert.equal(r.marketOfficialDisplayAt,market.pageDisplayAt);assert.equal(r.marketRetrievedAt,market.retrievedAt);
  assert.match(r.notes,/provisional/);
 }
});


const v2_0835=readJsonl('predictions/round_1673_ChatGPT_goal3_market_blend_v2_0835JST.jsonl');
const market_0835=JSON.parse(fs.readFileSync(path.join(__dirname,'..','reports/round_1673_goal3_official_market_snapshot_20261116T0835JST.json'),'utf8'));
test('official 08:35 GOAL3 snapshot has six reconciled team-side vectors and is fresh at retrieval',()=>{
 assert.equal(market_0835.round,1673);assert.equal(market_0835.marketType,'totoGOAL3');
 assert.equal(market_0835.pageDisplayAt,'2026-11-16T08:35:00+09:00');assert.equal(market_0835.retrievedAt,'2026-11-16T08:35:21+09:00');
 assert.equal(market_0835.displayAgeSeconds,21);assert.equal(market_0835.stale,false);assert.equal(market_0835.totalVotesPageSummary,14730);
 assert.deepEqual(market_0835.categoryOrder,['0','1','2','3+']);assert.equal(market_0835.matches.length,6);
 assert.equal(market_0835.matches.every(m=>m.sumVotes===14730&&m.sumPercent===100),true);
 assert.deepEqual(market_0835.matches.map(m=>m.toto13MatchNumber),[1,1,2,2,5,5]);
 assert.equal(v2_0835.length,6);assert.equal(new Set(v2_0835.map(r=>r.predictionId)).size,6);
});
test('08:35 GOAL3 V2 revisions append to 06:46 V2, retain the same V1 base and frozen 30/70 method',()=>{
 const latest=baselineV1();const prior=new Map(v2.map(r=>[r.matchNumber+'|'+(r.isHome?'home':'away'),r]));
 for(const r of v2_0835){
  const k=r.matchNumber+'|'+(r.isHome?'home':'away');const base=latest.get(k);const previous=prior.get(k);
  const marketRow=market_0835.matches.find(m=>m.matchNumber===r.matchNumber&&m.isHome===r.isHome);
  assert.ok(base);assert.ok(previous);assert.ok(marketRow);
  assert.equal(r.revisionOf,previous.predictionId);assert.deepEqual(r.baseModelProbabilities,base.probabilities);
  assert.deepEqual(r.marketVoteShare,Object.fromEntries(['0','1','2','3'].map((key,i)=>[key,Number((marketRow.percentages[i]/100).toFixed(4))])));
  assert.deepEqual(r.blendWeights,{poissonModel:0.3,officialTotoGoal3VoteShare:0.7});
  for(const key of ['0','1','2','3'])assert.ok(Math.abs(r.probabilities[key]-(0.3*base.probabilities[key]+0.7*r.marketVoteShare[key]))<2e-8);
  assert.ok(Math.abs(Object.values(r.probabilities).reduce((a,b)=>a+b,0)-1)<2e-8);
  assert.equal(r.predictionConfirmedAt,'2026-11-16T08:35:21+09:00');
  assert.equal(r.marketSnapshotPath,'reports/round_1673_goal3_official_market_snapshot_20261116T0835JST.json');
 }
});

const v2_0938=readJsonl('predictions/round_1673_ChatGPT_goal3_market_blend_v2_0938JST.jsonl');
const market_0938=JSON.parse(fs.readFileSync(path.join(__dirname,'..','reports/round_1673_goal3_official_market_snapshot_20261116T0938JST.json'),'utf8'));
test('official 09:38 GOAL3 snapshot has six reconciled team-side vectors and is fresh at retrieval',()=>{
 assert.equal(market_0938.round,1673);assert.equal(market_0938.marketType,'totoGOAL3');
 assert.equal(market_0938.pageDisplayAt,'2026-11-16T09:38:00+09:00');assert.equal(market_0938.retrievedAt,'2026-11-16T09:39:16+09:00');
 assert.equal(market_0938.displayAgeSeconds,76);assert.equal(market_0938.stale,false);assert.equal(market_0938.totalVotesPageSummary,15219);
 assert.deepEqual(market_0938.categoryOrder,['0','1','2','3+']);assert.equal(market_0938.matches.length,6);
 assert.equal(market_0938.matches.every(m=>m.sumVotes===15219&&m.sumPercent===100),true);
 assert.deepEqual(market_0938.matches.map(m=>m.toto13MatchNumber),[1,1,2,2,5,5]);
 assert.equal(v2_0938.length,6);assert.equal(new Set(v2_0938.map(r=>r.predictionId)).size,6);
});
test('09:38 GOAL3 V2 revisions append to 08:35 V2 and retain the same V1 base and frozen 30/70 method',()=>{
 const latest=baselineV1();const prior=new Map(v2_0835.map(r=>[r.matchNumber+'|'+(r.isHome?'home':'away'),r]));
 for(const r of v2_0938){
  const k=r.matchNumber+'|'+(r.isHome?'home':'away');const base=latest.get(k);const previous=prior.get(k);
  const marketRow=market_0938.matches.find(m=>m.matchNumber===r.matchNumber&&m.isHome===r.isHome);
  assert.ok(base);assert.ok(previous);assert.ok(marketRow);
  assert.equal(r.revisionOf,previous.predictionId);assert.deepEqual(r.baseModelProbabilities,base.probabilities);
  assert.deepEqual(r.marketVoteShare,Object.fromEntries(['0','1','2','3'].map((key,i)=>[key,Number((marketRow.percentages[i]/100).toFixed(4))])));
  assert.deepEqual(r.blendWeights,{poissonModel:0.3,officialTotoGoal3VoteShare:0.7});
  for(const key of ['0','1','2','3'])assert.ok(Math.abs(r.probabilities[key]-(0.3*base.probabilities[key]+0.7*r.marketVoteShare[key]))<2e-8);
  assert.ok(Math.abs(Object.values(r.probabilities).reduce((a,b)=>a+b,0)-1)<2e-8);
  assert.equal(r.predictionConfirmedAt,market_0938.retrievedAt);
  assert.equal(r.marketSnapshotPath,'reports/round_1673_goal3_official_market_snapshot_20261116T0938JST.json');
 }
});


const v2_1151=readJsonl('predictions/round_1673_ChatGPT_goal3_market_blend_v2_1151JST.jsonl');
const market_1151=JSON.parse(fs.readFileSync(path.join(__dirname,'..','reports/round_1673_goal3_official_market_snapshot_20261116T1151JST.json'),'utf8'));
const attemptLog1151=readJsonl('data/goal3_market_snapshot_attempts.jsonl');
test('official 11:51 GOAL3 snapshot has six reconciled team-side vectors and is fresh at retrieval',()=>{
 assert.equal(market_1151.round,1673);assert.equal(market_1151.marketType,'totoGOAL3');
 assert.equal(market_1151.pageDisplayAt,'2026-11-16T11:51:00+09:00');assert.equal(market_1151.retrievedAt,'2026-11-16T11:55:17+09:00');
 assert.equal(market_1151.displayAgeSeconds,257);assert.equal(market_1151.stale,false);assert.equal(market_1151.totalVotesPageSummary,17340);
 assert.deepEqual(market_1151.categoryOrder,['0','1','2','3+']);assert.equal(market_1151.matches.length,6);
 assert.equal(market_1151.matches.every(m=>m.sumVotes===17340&&m.sumPercent===100),true);
 assert.deepEqual(market_1151.matches.map(m=>m.toto13MatchNumber),[1,1,2,2,5,5]);
 assert.deepEqual(market_1151.matches.map(m=>m.voteCounts),[
  [2350,3498,5560,5932],[7228,5717,2557,1838],[2570,4191,5793,4786],
  [4124,5810,4558,2848],[3492,5863,5074,2911],[4169,6362,4428,2381]
 ]);
 const attempt=attemptLog1151.find(a=>a.snapshotPath==='reports/round_1673_goal3_official_market_snapshot_20261116T1151JST.json');
 assert.ok(attempt);assert.equal(attempt.attemptedAt,market_1151.retrievedAt);assert.equal(attempt.captureStatus,'captured');
 assert.equal(attempt.officialFixtureCount,3);assert.equal(attempt.officialTeamTargetCount,6);
 assert.equal(new Set(attemptLog1151.map(a=>a.attemptedAt)).size,attemptLog1151.length);
});
test('11:51 GOAL3 V2 revisions append to 09:38 V2 and retain latest V1 base and frozen normalized 30/70 method',()=>{
 assert.equal(v2_1151.length,6);assert.equal(new Set(v2_1151.map(r=>r.predictionId)).size,6);
 const latest=baselineV1();const prior=new Map(v2_0938.map(r=>[r.matchNumber+'|'+(r.isHome?'home':'away'),r]));
 for(const r of v2_1151){
  const k=r.matchNumber+'|'+(r.isHome?'home':'away');const base=latest.get(k);const previous=prior.get(k);
  const marketRow=market_1151.matches.find(m=>m.matchNumber===r.matchNumber&&m.isHome===r.isHome);
  assert.ok(base);assert.ok(previous);assert.ok(marketRow);
  assert.equal(r.revisionOf,previous.predictionId);assert.deepEqual(r.baseModelProbabilities,base.probabilities);
  assert.deepEqual(r.marketVoteShare,Object.fromEntries(['0','1','2','3'].map((key,i)=>[key,Number((marketRow.percentages[i]/100).toFixed(4))])));
  assert.deepEqual(r.blendWeights,{poissonModel:0.3,officialTotoGoal3VoteShare:0.7});
  for(const key of ['0','1','2','3'])assert.ok(Math.abs(r.probabilities[key]-(0.3*base.probabilities[key]+0.7*r.marketVoteShare[key]))<2e-8);
  assert.ok(Math.abs(Object.values(r.probabilities).reduce((a,b)=>a+b,0)-1)<2e-8);
  assert.equal(r.predictionConfirmedAt,market_1151.retrievedAt);
  assert.equal(r.marketOfficialDisplayAt,market_1151.pageDisplayAt);
  assert.equal(r.marketRetrievedAt,market_1151.retrievedAt);
  assert.equal(r.deadlineAt,'2026-11-21T04:50:00.000Z');
  assert.equal(r.marketSnapshotPath,'reports/round_1673_goal3_official_market_snapshot_20261116T1151JST.json');
 }
});


const market_1540=JSON.parse(fs.readFileSync(path.join(__dirname,'..','reports/round_1673_goal3_official_market_snapshot_20261116T1540JST.json'),'utf8'));
const attemptLog1540=readJsonl('data/goal3_market_snapshot_attempts.jsonl');
test('official 15:40 GOAL3 snapshot is archived as stale and excluded from V2',()=>{
 assert.equal(market_1540.round,1673);assert.equal(market_1540.marketType,'totoGOAL3');
 assert.equal(market_1540.pageDisplayAt,'2026-11-16T15:40:00+09:00');
 assert.equal(market_1540.retrievedAt,'2026-11-16T18:12:05+09:00');
 assert.equal(market_1540.displayAgeSeconds,9125);assert.equal(market_1540.stale,true);
 assert.equal(market_1540.totalVotesPageSummary,19503);assert.equal(market_1540.matches.length,6);
 assert.deepEqual(market_1540.categoryOrder,['0','1','2','3+']);
 assert.deepEqual(market_1540.matches.map(m=>m.toto13MatchNumber),[1,1,2,2,5,5]);
 assert.equal(market_1540.matches.every(m=>m.sumVotes===19503&&m.sumPercent===100),true);
 const attempt=attemptLog1540.find(a=>a.snapshotPath==='reports/round_1673_goal3_official_market_snapshot_20261116T1540JST.json');
 assert.ok(attempt);assert.equal(attempt.attemptedAt,market_1540.retrievedAt);
 assert.equal(attempt.captureStatus,'captured');assert.match(attempt.voteShareStatus,/stale/);
 assert.equal(new Set(attemptLog1540.map(a=>a.attemptedAt)).size,attemptLog1540.length);
 assert.equal(v2_1151.length,6,'no stale 15:40 V2 revision was added');
 assert.equal(market_1540.v2Eligibility.eligible,false);
});

const market2033=JSON.parse(fs.readFileSync(path.join(__dirname,'..','reports/round_1673_goal3_official_market_snapshot_20261116T2033JST.json'),'utf8'));
const v2_0938_staleCheck=readJsonl('predictions/round_1673_ChatGPT_goal3_market_blend_v2_0938JST.jsonl');
test('20:33 official GOAL3 snapshot is archived as stale and excluded from the exploratory V2 chain',()=>{
 assert.equal(market2033.round,1673);
 assert.equal(market2033.marketType,'totoGOAL3');
 assert.equal(market2033.pageDisplayAt,'2026-11-16T20:33:00+09:00');
 assert.equal(market2033.retrievedAt,'2026-11-16T20:39:01+09:00');
 assert.equal(market2033.displayAgeSeconds,361);
 assert.equal(market2033.stale,true);
 assert.equal(market2033.totalVotesPageSummary,22706);
 assert.equal(market2033.matches.length,6);
 assert.equal(market2033.matches.every(m=>m.sumVotes===22706&&Math.abs(m.sumPercent-100)<1e-8),true);
 assert.deepEqual(market2033.matches.map(m=>m.toto13MatchNumber),[1,1,2,2,5,5]);
 assert.equal(market2033.v2Eligibility.eligible,false);
 assert.equal(v2_0938_staleCheck.length,6,'no V2 revision is created from a stale official display');
});

const market_0132=JSON.parse(fs.readFileSync(path.join(__dirname,'..','reports/round_1673_goal3_official_market_snapshot_20261117T0132JST.json'),'utf8'));
const attempts_0132=readJsonl('data/goal3_market_snapshot_attempts.jsonl');
test('01:32 official GOAL3 snapshot is archived as stale and excluded from exploratory V2',()=>{
 assert.equal(market_0132.round,1673);assert.equal(market_0132.marketType,'totoGOAL3');
 assert.equal(market_0132.pageDisplayAt,'2026-11-17T01:32:00+09:00');assert.equal(market_0132.retrievedAt,'2026-11-17T01:44:22+09:00');
 assert.equal(market_0132.displayAgeSeconds,742);assert.equal(market_0132.stale,true);assert.equal(market_0132.totalVotesPageSummary,24677);
 assert.equal(market_0132.matches.length,6);assert.equal(market_0132.countConsistency.allSixTeamSideTotalsMatchPageSummary,true);
 assert.equal(market_0132.countConsistency.allSixPercentageVectorsSumTo100,true);assert.equal(market_0132.v2Eligibility.eligible,false);
 const attempt=attempts_0132.find(a=>a.snapshotPath==='reports/round_1673_goal3_official_market_snapshot_20261117T0132JST.json');
 assert.ok(attempt);assert.equal(attempt.attemptedAt,market_0132.retrievedAt);assert.equal(attempt.captureStatus,'captured');
 assert.equal(v2_1151.length,6,'stale 01:32 snapshot must not create a V2 revision');
});


const market_0856=JSON.parse(fs.readFileSync(path.join(__dirname,'..','reports/round_1673_goal3_official_market_snapshot_20261117T0856JST.json'),'utf8'));
test('08:56 official GOAL3 snapshot is fresh, six-team-side complete, and archived without a new V2',()=>{
 assert.equal(market_0856.round,1673);assert.equal(market_0856.marketType,'totoGOAL3');
 assert.equal(market_0856.pageDisplayAt,'2026-11-17T08:56:00+09:00');assert.equal(market_0856.retrievedAt,'2026-11-17T08:57:15+09:00');
 assert.equal(market_0856.displayAgeSeconds,75);assert.equal(market_0856.stale,false);assert.equal(market_0856.totalVotesPageSummary,25880);
 assert.deepEqual(market_0856.categoryOrder,['0','1','2','3+']);assert.equal(market_0856.matches.length,6);
 assert.equal(market_0856.countConsistency.allSixTeamSideTotalsMatchPageSummary,true);assert.equal(market_0856.countConsistency.allSixPercentageVectorsSumTo100,true);
 assert.deepEqual(market_0856.matches.map(m=>m.toto13MatchNumber),[1,1,2,2,5,5]);assert.equal(market_0856.v2Eligibility.eligible,false);
 assert.match(market_0856.v2Eligibility.reason,/no runnable.*V2 generator/i);
 const attempts=readJsonl('data/goal3_market_snapshot_attempts.jsonl');const a=attempts.find(x=>x.snapshotPath==='reports/round_1673_goal3_official_market_snapshot_20261117T0856JST.json');
 assert.ok(a);assert.equal(a.attemptedAt,market_0856.retrievedAt);assert.equal(a.captureStatus,'captured');
 assert.equal(readJsonl('predictions/round_1673_ChatGPT_goal3_market_blend_v2_1151JST.jsonl').length,6,'no V2 revision was synthesized');
});
