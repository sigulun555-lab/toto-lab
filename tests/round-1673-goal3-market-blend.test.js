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
test('round 1673 GOAL3 preserves append-only V1 history through the 07:52 source revision and six V2 revisions referencing the frozen 18:49 V1 baseline',()=>{
 assert.equal(v1.length,48);assert.equal(new Set(v1.map(r=>r.predictionId)).size,48);
 const latestSync=v1.filter(r=>r.predictionConfirmedAt==='2026-11-16T06:25:20.060Z');assert.equal(latestSync.length,6);
 const latestByKey=new Map(latestSync.map(r=>[r.matchNumber+'|'+(r.isHome?'home':'away'),r]));
 const refreshed=v1.filter(r=>r.predictionConfirmedAt==='2026-11-16T21:59:16.594Z');assert.equal(refreshed.length,6);
 for(const r of refreshed){
  const k=r.matchNumber+'|'+(r.isHome?'home':'away');
  assert.equal(r.revisionOf,latestByKey.get(k).predictionId);
  assert.equal(r.round,1673);assert.equal(r.marketType,'totoGOAL3');
 }
 const newest=v1.filter(r=>r.predictionConfirmedAt==='2026-11-17T07:52:36.644Z');assert.equal(newest.length,6);
 const refreshedByKey=new Map(refreshed.map(r=>[r.matchNumber+'|'+(r.isHome?'home':'away'),r]));
 for(const r of newest){
  const k=r.matchNumber+'|'+(r.isHome?'home':'away');
  assert.equal(r.revisionOf,refreshedByKey.get(k).predictionId);
  assert.equal(r.round,1673);assert.equal(r.marketType,'totoGOAL3');
 }
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
