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
 assert.equal(v1.length,26);
 assert.equal(v2.length,39);
 assert.equal(new Set(v1.map(r=>r.predictionId)).size,26);
 for(let n=1;n<=13;n++){
  const chain=v1.filter(r=>r.matchNumber===n).sort((a,b)=>Date.parse(a.predictionConfirmedAt)-Date.parse(b.predictionConfirmedAt));
  assert.equal(chain.length,2);
  assert.equal(chain[0].revisionOf,null);
  assert.equal(chain[1].revisionOf,chain[0].predictionId);
  assert.equal(chain[1].predictionConfirmedAt,'2026-11-16T09:35:08.000Z');
 }
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


const market1355=JSON.parse(fs.readFileSync(path.join(__dirname,'..','reports/round_1673_toto13_official_market_snapshot_20261116T1355JST.json'),'utf8'));
test('13:55 official toto13 snapshot is archived as stale and excluded from V2',()=>{
 assert.equal(market1355.round,1673);
 assert.equal(market1355.marketType,'toto13');
 assert.equal(market1355.pageDisplayAt,'2026-11-16T13:55:00+09:00');
 assert.equal(market1355.retrievedAt,'2026-11-16T14:02:50+09:00');
 assert.equal(market1355.displayAgeSeconds,470);
 assert.equal(market1355.stale,true);
 assert.equal(market1355.totalVotesPageSummary,94552);
 assert.equal(market1355.matches.length,13);
 assert.equal(market1355.matches.every(m=>m.sumVotes===94552&&m.differenceFromSummaryVotes===0),true);
 assert.equal(market1355.matches.every(m=>Math.abs(m.percentages.reduce((a,b)=>a+b,0)-100)<1e-8),true);
 assert.equal(market1355.v2Eligibility.eligible,false);
 assert.equal(v2.length,39,'stale market snapshot must not append a V2 revision');
 for(let n=1;n<=13;n++) assert.equal(latestForMatch(n).length,3);
});

const market2033=JSON.parse(fs.readFileSync(path.join(__dirname,'..','reports/round_1673_toto13_official_market_snapshot_20261116T2033JST.json'),'utf8'));
test('20:33 official toto13 snapshot is archived as stale/inconsistent and excluded from V2',()=>{
 assert.equal(market2033.round,1673);
 assert.equal(market2033.pageDisplayAt,'2026-11-16T20:33:00+09:00');
 assert.equal(market2033.retrievedAt,'2026-11-16T20:39:01+09:00');
 assert.equal(market2033.displayAgeSeconds,361);
 assert.equal(market2033.stale,true);
 assert.equal(market2033.totalVotesPageSummary,112871);
 assert.deepEqual(market2033.matches.map(m=>m.differenceFromSummaryVotes),[-10,-10,-10,-10,-10,0,0,0,0,0,0,0,0]);
 assert.equal(market2033.countConsistency.allPerMatchTotalsMatchPageSummary,false);
 assert.equal(market2033.countConsistency.allDisplayedPercentageTriplesSumTo100,true);
 assert.equal(market2033.v2Eligibility.eligible,false);
 assert.equal(v2.length,39,'stale/inconsistent market snapshot must not append V2');
});


const market2145=JSON.parse(fs.readFileSync(path.join(__dirname,'..','reports/round_1673_toto13_official_market_snapshot_20261116T2145JST.json'),'utf8'));
test('21:45 official toto13 snapshot is archived as stale and excluded from V2',()=>{
 assert.equal(market2145.round,1673);
 assert.equal(market2145.marketType,'toto13');
 assert.equal(market2145.pageDisplayAt,'2026-11-16T21:45:00+09:00');
 assert.equal(market2145.retrievedAt,'2026-11-16T22:33:00+09:00');
 assert.equal(market2145.displayAgeSeconds,2880);
 assert.equal(market2145.stale,true);
 assert.equal(market2145.totalVotesPageSummary,117206);
 assert.equal(market2145.matches.length,13);
 assert.equal(market2145.countConsistency.allPerMatchTotalsMatchPageSummary,true);
 assert.equal(market2145.countConsistency.allDisplayedPercentageTriplesSumTo100,true);
 assert.equal(market2145.countConsistency.perMatchVoteTotalRange.spread,0);
 assert.equal(market2145.v2Eligibility.eligible,false);
 assert.equal(v2.length,39,'stale market snapshot must not append a V2 revision');
 for(let n=1;n<=13;n++) assert.equal(latestForMatch(n).length,3);
});

const market0039=JSON.parse(fs.readFileSync(path.join(__dirname,'..','reports/round_1673_toto13_official_market_snapshot_20261117T0039JST.json'),'utf8'));
test('00:39 official toto13 snapshot is archived as stale and excluded from V2',()=>{
 assert.equal(market0039.round,1673);
 assert.equal(market0039.marketType,'toto13');
 assert.equal(market0039.pageDisplayAt,'2026-11-17T00:39:00+09:00');
 assert.equal(market0039.retrievedAt,'2026-11-17T01:33:22+09:00');
 assert.equal(market0039.displayAgeSeconds,3262);
 assert.equal(market0039.stale,true);
 assert.equal(market0039.totalVotesPageSummary,123609);
 assert.equal(market0039.matches.length,13);
 assert.equal(market0039.countConsistency.allPerMatchTotalsMatchPageSummary,true);
 assert.equal(market0039.countConsistency.allDisplayedPercentageTriplesSumTo100,true);
 assert.equal(market0039.v2Eligibility.eligible,false);
 assert.equal(v2.length,39,'stale market snapshot must not append a V2 revision');
});

const market0132=JSON.parse(fs.readFileSync(path.join(__dirname,'..','reports/round_1673_toto13_official_market_snapshot_20261117T0132JST.json'),'utf8'));
test('01:32 official toto13 snapshot is archived as stale and excluded from V2',()=>{
 assert.equal(market0132.round,1673);assert.equal(market0132.marketType,'toto13');
 assert.equal(market0132.pageDisplayAt,'2026-11-17T01:32:00+09:00');assert.equal(market0132.retrievedAt,'2026-11-17T01:44:22+09:00');
 assert.equal(market0132.displayAgeSeconds,742);assert.equal(market0132.stale,true);assert.equal(market0132.totalVotesPageSummary,126685);
 assert.equal(market0132.matches.length,13);assert.equal(market0132.countConsistency.allPerMatchTotalsMatchPageSummary,true);
 assert.equal(market0132.countConsistency.allDisplayedPercentageTriplesSumTo100,true);assert.equal(market0132.v2Eligibility.eligible,false);
 assert.equal(v2.length,39,'stale market snapshot must not append a V2 revision');
});


const market0856=JSON.parse(fs.readFileSync(path.join(__dirname,'..','reports/round_1673_toto13_official_market_snapshot_20261117T0856JST.json'),'utf8'));
test('08:56 official toto13 snapshot is fresh and reconciled; no V2 is synthesized without a runnable generator',()=>{
 assert.equal(market0856.round,1673);assert.equal(market0856.marketType,'toto13');
 assert.equal(market0856.pageDisplayAt,'2026-11-17T08:56:00+09:00');assert.equal(market0856.retrievedAt,'2026-11-17T08:57:15+09:00');
 assert.equal(market0856.displayAgeSeconds,75);assert.equal(market0856.stale,false);assert.equal(market0856.totalVotesPageSummary,133203);
 assert.equal(market0856.matches.length,13);assert.equal(market0856.countConsistency.allPerMatchTotalsMatchPageSummary,true);
 assert.equal(market0856.countConsistency.allDisplayedPercentageTriplesSumTo100,true);assert.equal(market0856.v2Eligibility.eligible,false);
 assert.match(market0856.v2Eligibility.reason,/V2 revisionは生成せずsnapshotのみ追記/);assert.equal(v2.length,39,'fresh snapshot is archived but no unimplemented V2 is synthesized');
});
