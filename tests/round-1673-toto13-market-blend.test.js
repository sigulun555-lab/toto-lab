'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const readJsonl=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8').trim().split(/\r?\n/).filter(Boolean).map(JSON.parse);
const v1=readJsonl('predictions/round_1673_ChatGPT_shared_score_v1.jsonl');
const v2=readJsonl('predictions/round_1673_ChatGPT_shared_score_v2.jsonl');
const market=JSON.parse(fs.readFileSync(path.join(__dirname,'..','reports/round_1673_toto13_official_market_snapshot_20261116T0643JST.json'),'utf8'));
const latestForMatch=n=>v2.filter(r=>r.matchNumber===n).sort((a,b)=>Date.parse(a.predictionConfirmedAt)-Date.parse(b.predictionConfirmedAt));
test('round 1673 keeps V1 and appends two complete V2 revisions without replacing prior rows',()=>{
 assert.equal(v1.length,13);
 assert.equal(v2.length,39);
 assert.equal(new Set(v1.map(r=>r.predictionId)).size,13);
 assert.equal(new Set(v2.map(r=>r.predictionId)).size,39);
 for(let n=1;n<=13;n++){
  const chain=latestForMatch(n);
  assert.equal(chain.length,3);
  assert.equal(chain[0].revisionOf,null);
  assert.equal(chain[1].revisionOf,chain[0].predictionId);
  assert.equal(chain[2].revisionOf,chain[1].predictionId);
 }
});
test('06:43 official toto13 snapshot is fresh and all 13 vote rows reconcile',()=>{
 assert.equal(market.round,1673);
 assert.equal(market.marketType,'toto13');
 assert.equal(market.pageDisplayAt,'2026-11-16T06:43:00+09:00');
 assert.equal(market.retrievedAt,'2026-11-16T06:46:28+09:00');
 assert.equal(market.displayAgeSeconds,208);
 assert.equal(market.stale,false);
 assert.equal(market.totalVotesPageSummary,71853);
 assert.equal(market.matches.length,13);
 assert.equal(market.matches.every(m=>m.sumVotes===71853&&m.differenceFromSummaryVotes===0),true);
 assert.equal(market.matches.every(m=>Math.abs(m.percentages.reduce((a,b)=>a+b,0)-100)<1e-8),true);
 assert.deepEqual(market.v2Blend.weights,{poissonModel:0.3,totoVoteShare:0.7});
 assert.equal(market.v2Blend.predictionRows,39);
 assert.equal(market.v2Blend.uniquePredictionIds,39);
 assert.equal(market.v2Blend.previousRowsPreserved,26);
 assert.equal(market.v2Blend.revisionRowsAppended,13);
});
test('new V2 rows use the unchanged 30/70 blend and preserve V1 score distributions',()=>{
 for(let n=1;n<=13;n++){
  const base=v1.find(r=>r.matchNumber===n);
  const chain=latestForMatch(n);
  const row=chain[2], m=market.matches[n-1];
  assert.equal(row.predictionConfirmedAt,'2026-11-16T06:46:28+09:00');
  assert.equal(row.revisionOf,chain[1].predictionId);
  assert.deepEqual(row.baseModelOutcomeProbabilities,base.outcomeProbabilities);
  assert.deepEqual(row.marketVoteShare,m.marketVoteShare);
  assert.deepEqual(row.blendWeights,{poissonModel:0.3,totoVoteShare:0.7});
  assert.deepEqual(row.homeGoalProbabilities,base.homeGoalProbabilities);
  assert.deepEqual(row.awayGoalProbabilities,base.awayGoalProbabilities);
  for(const k of ['0','1','2']){
   const expected=0.3*base.outcomeProbabilities[k]+0.7*m.marketVoteShare[k];
   assert.ok(Math.abs(row.outcomeProbabilities[k]-expected)<2e-8);
  }
  assert.ok(Math.abs(Object.values(row.outcomeProbabilities).reduce((a,b)=>a+b,0)-1)<2e-8);
 }
});
