'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const readJsonl=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8').trim().split(/\r?\n/).filter(Boolean).map(JSON.parse);
const v1=readJsonl('predictions/round_1673_ChatGPT_goal3.jsonl');
const v2=readJsonl('predictions/round_1673_ChatGPT_goal3_market_blend_v2_0646JST.jsonl');
const market=JSON.parse(fs.readFileSync(path.join(__dirname,'..','reports/round_1673_goal3_official_market_snapshot_20261116T0646JST.json'),'utf8'));
const latestV1=()=>{const m=new Map();for(const r of v1){const k=r.matchNumber+'|'+(r.isHome?'home':'away');const old=m.get(k);if(!old||Date.parse(r.predictionConfirmedAt)>Date.parse(old.predictionConfirmedAt))m.set(k,r);}return m;};
test('round 1673 GOAL3 has six V1 team-side chains and six V2 revisions referencing the latest V1 rows',()=>{
 assert.equal(v1.length,30);assert.equal(new Set(v1.map(r=>r.predictionId)).size,30);
 assert.equal(v2.length,6);assert.equal(new Set(v2.map(r=>r.predictionId)).size,6);
 const latest=latestV1();assert.equal(latest.size,6);
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
 const latest=latestV1();
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
