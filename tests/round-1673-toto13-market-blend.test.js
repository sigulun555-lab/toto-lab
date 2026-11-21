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
test('round 1673 keeps V1 and appends three complete V2 revisions without replacing prior rows',()=>{
 assert.equal(v1.length,26);
 assert.equal(v2.length,52);
 assert.equal(new Set(v1.map(r=>r.predictionId)).size,26);
 for(let n=1;n<=13;n++){
  const chain=v1.filter(r=>r.matchNumber===n).sort((a,b)=>Date.parse(a.predictionConfirmedAt)-Date.parse(b.predictionConfirmedAt));
  assert.equal(chain.length,2);
  assert.equal(chain[0].revisionOf,null);
  assert.equal(chain[1].revisionOf,chain[0].predictionId);
  assert.equal(chain[1].predictionConfirmedAt,'2026-11-16T09:35:08.000Z');
 }
 assert.equal(new Set(v2.map(r=>r.predictionId)).size,52);
 for(let n=1;n<=13;n++){
  const chain=latestForMatch(n);
  assert.equal(chain.length,4);
  assert.equal(chain[0].revisionOf,null);
  assert.equal(chain[1].revisionOf,chain[0].predictionId);
  assert.equal(chain[2].revisionOf,chain[1].predictionId);
  assert.equal(chain[3].revisionOf,chain[2].predictionId);
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
 assert.equal(v2.length,52,'stale market snapshot must not append a V2 revision');
 for(let n=1;n<=13;n++) assert.equal(latestForMatch(n).length,4);
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
 assert.equal(v2.length,52,'stale/inconsistent market snapshot must not append V2');
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
 assert.equal(v2.length,52,'stale market snapshot must not append a V2 revision');
 for(let n=1;n<=13;n++) assert.equal(latestForMatch(n).length,4);
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
 assert.equal(v2.length,52,'stale market snapshot must not append a V2 revision');
});

const market0132=JSON.parse(fs.readFileSync(path.join(__dirname,'..','reports/round_1673_toto13_official_market_snapshot_20261117T0132JST.json'),'utf8'));
test('01:32 official toto13 snapshot is archived as stale and excluded from V2',()=>{
 assert.equal(market0132.round,1673);assert.equal(market0132.marketType,'toto13');
 assert.equal(market0132.pageDisplayAt,'2026-11-17T01:32:00+09:00');assert.equal(market0132.retrievedAt,'2026-11-17T01:44:22+09:00');
 assert.equal(market0132.displayAgeSeconds,742);assert.equal(market0132.stale,true);assert.equal(market0132.totalVotesPageSummary,126685);
 assert.equal(market0132.matches.length,13);assert.equal(market0132.countConsistency.allPerMatchTotalsMatchPageSummary,true);
 assert.equal(market0132.countConsistency.allDisplayedPercentageTriplesSumTo100,true);assert.equal(market0132.v2Eligibility.eligible,false);
 assert.equal(v2.length,52,'stale market snapshot must not append a V2 revision');
});


const market0856=JSON.parse(fs.readFileSync(path.join(__dirname,'..','reports/round_1673_toto13_official_market_snapshot_20261117T0856JST.json'),'utf8'));
test('08:56 official toto13 snapshot is fresh and reconciled; no V2 is synthesized without a runnable generator',()=>{
 assert.equal(market0856.round,1673);assert.equal(market0856.marketType,'toto13');
 assert.equal(market0856.pageDisplayAt,'2026-11-17T08:56:00+09:00');assert.equal(market0856.retrievedAt,'2026-11-17T08:57:15+09:00');
 assert.equal(market0856.displayAgeSeconds,75);assert.equal(market0856.stale,false);assert.equal(market0856.totalVotesPageSummary,133203);
 assert.equal(market0856.matches.length,13);assert.equal(market0856.countConsistency.allPerMatchTotalsMatchPageSummary,true);
 assert.equal(market0856.countConsistency.allDisplayedPercentageTriplesSumTo100,true);assert.equal(market0856.v2Eligibility.eligible,false);
 assert.match(market0856.v2Eligibility.reason,/V2 revisionは生成せずsnapshotのみ追記/);assert.equal(v2.length,52,'fresh snapshot is archived but no unimplemented V2 is synthesized');
});


const market0947=JSON.parse(fs.readFileSync(path.join(__dirname,'..','reports/round_1673_toto13_official_market_snapshot_20261117T0947JST.json'),'utf8'));
test('09:47 official toto13 snapshot is archived as stale and excluded from V2',()=>{
 assert.equal(market0947.round,1673);assert.equal(market0947.marketType,'toto13');
 assert.equal(market0947.pageDisplayAt,'2026-11-17T09:47:00+09:00');assert.equal(market0947.retrievedAt,'2026-11-17T09:57:13+09:00');
 assert.equal(market0947.displayAgeSeconds,613);assert.equal(market0947.stale,true);assert.equal(market0947.totalVotesPageSummary,135040);
 assert.equal(market0947.matches.length,13);assert.equal(market0947.countConsistency.allPerMatchTotalsMatchPageSummary,true);
 assert.equal(market0947.countConsistency.allDisplayedPercentageTriplesSumTo100,true);assert.equal(market0947.v2Eligibility.eligible,false);
 assert.equal(v2.length,52,'stale 09:47 market snapshot must not append a V2 revision');
});


const market1127=JSON.parse(fs.readFileSync(path.join(__dirname,'..','reports/round_1673_toto13_official_market_snapshot_20261117T1127JST.json'),'utf8'));
test('11:27 official toto13 snapshot is archived as stale and excluded from V2',()=>{
 assert.equal(market1127.round,1673);assert.equal(market1127.marketType,'toto13');
 assert.equal(market1127.pageDisplayAt,'2026-11-17T11:27:00+09:00');assert.equal(market1127.retrievedAt,'2026-11-17T11:39:41+09:00');
 assert.equal(market1127.displayAgeSeconds,761);assert.equal(market1127.stale,true);assert.equal(market1127.totalVotesPageSummary,139374);
 assert.equal(market1127.matches.length,13);assert.deepEqual(market1127.matches.map(m=>m.matchNumber),Array.from({length:13},(_,i)=>i+1));
 assert.equal(market1127.countConsistency.allPerMatchTotalsMatchPageSummary,true);assert.equal(market1127.countConsistency.allDisplayedPercentageTriplesSumTo100,true);
 assert.equal(market1127.v2Eligibility.eligible,false);assert.equal(v2.length,52,'stale 11:27 snapshot must not append V2');
});


const market1323=JSON.parse(fs.readFileSync(path.join(__dirname,'..','reports/round_1673_toto13_official_market_snapshot_20261117T1323JST.json'),'utf8'));
test('13:23 official toto13 snapshot is archived as stale and excluded from V2',()=>{
 assert.equal(market1323.round,1673);assert.equal(market1323.marketType,'toto13');
 assert.equal(market1323.pageDisplayAt,'2026-11-17T13:23:00+09:00');assert.equal(market1323.retrievedAt,'2026-11-17T13:44:16+09:00');
 assert.equal(market1323.displayAgeSeconds,1276);assert.equal(market1323.stale,true);assert.equal(market1323.totalVotesPageSummary,146693);
 assert.equal(market1323.matches.length,13);assert.equal(market1323.countConsistency.allPerMatchTotalsMatchPageSummary,true);
 assert.equal(market1323.countConsistency.allDisplayedPercentageTriplesSumTo100,true);assert.equal(market1323.v2Eligibility.eligible,false);
 assert.equal(v2.length,52,'stale snapshot must not append V2');for(let n=1;n<=13;n++)assert.equal(latestForMatch(n).length,4);
});


const market1936=JSON.parse(fs.readFileSync(path.join(__dirname,'..','reports/round_1673_toto13_official_market_snapshot_20261117T1936JST.json'),'utf8'));
test('19:36 official toto13 snapshot is archived with raw count mismatches and excluded from V2',()=>{
 assert.equal(market1936.round,1673);assert.equal(market1936.marketType,'toto13');
 assert.equal(market1936.pageDisplayAt,'2026-11-17T19:36:00+09:00');assert.equal(market1936.retrievedAt,'2026-11-17T19:45:06+09:00');
 assert.equal(market1936.displayAgeSeconds,546);assert.equal(market1936.stale,true);assert.equal(market1936.totalVotesPageSummary,163822);
 assert.equal(market1936.matches.length,13);assert.deepEqual(market1936.matches.map(m=>m.differenceFromSummaryVotes),[-2,-2,-2,-2,-2,-2,-2,-2,-2,-2,-2,-1,0]);
 assert.equal(market1936.countConsistency.allPerMatchTotalsMatchPageSummary,false);
 assert.equal(market1936.countConsistency.allDisplayedPercentageTriplesSumTo100,true);
 assert.equal(market1936.v2Eligibility.eligible,false);assert.equal(v2.length,52,'stale 19:36 snapshot must not append V2');
});


const market2010=JSON.parse(fs.readFileSync(path.join(__dirname,'..','reports/round_1673_toto13_official_market_snapshot_20261117T2010JST.json'),'utf8'));
test('20:10 official toto13 snapshot is fresh and reconciled; no V2 is synthesized without a runnable generator',()=>{
 assert.equal(market2010.round,1673);assert.equal(market2010.marketType,'toto13');
 assert.equal(market2010.pageDisplayAt,'2026-11-17T20:10:00+09:00');assert.equal(market2010.retrievedAt,'2026-11-17T20:13:02+09:00');
 assert.equal(market2010.displayAgeSeconds,182);assert.equal(market2010.stale,false);assert.equal(market2010.totalVotesPageSummary,166048);
 assert.equal(market2010.matches.length,13);assert.equal(market2010.countConsistency.allThirteenMatchTotalsMatchPageSummary,true);
 assert.equal(market2010.countConsistency.allDisplayedPercentageTriplesSumTo100,true);
 assert.ok(market2010.matches.every(m=>m.sumVotes===166048&&m.differenceFromSummaryVotes===0));
 assert.ok(market2010.matches.every(m=>Math.abs(m.percentages.reduce((a,b)=>a+b,0)-100)<1e-8));
 assert.equal(market2010.v2Eligibility.eligible,false);
 assert.equal(v2.length,52,'fresh snapshot is archived but no unimplemented V2 generator is synthesized');
 for(let n=1;n<=13;n++)assert.equal(latestForMatch(n).length,4);
});


const market2023=JSON.parse(fs.readFileSync(path.join(__dirname,'..','reports/round_1673_toto13_official_market_snapshot_20261117T2023JST.json'),'utf8'));
test('20:23 official toto13 snapshot is fresh and reconciled; no V2 is synthesized without a runnable generator',()=>{
 assert.equal(market2023.round,1673);assert.equal(market2023.marketType,'toto13');
 assert.equal(market2023.pageDisplayAt,'2026-11-17T20:23:00+09:00');assert.equal(market2023.retrievedAt,'2026-11-17T20:23:52+09:00');
 assert.equal(market2023.displayAgeSeconds,52);assert.equal(market2023.stale,false);assert.equal(market2023.totalVotesPageSummary,168608);
 assert.equal(market2023.matches.length,13);assert.equal(market2023.countConsistency.allThirteenMatchTotalsMatchPageSummary,true);
 assert.equal(market2023.countConsistency.allDisplayedPercentageTriplesSumTo100,true);
 assert.ok(market2023.matches.every(m=>m.sumVotes===168608&&m.differenceFromSummaryVotes===0));
 assert.ok(market2023.matches.every(m=>Math.abs(m.percentages.reduce((a,b)=>a+b,0)-100)<1e-8));
 assert.equal(market2023.v2Eligibility.eligible,false);
 assert.equal(v2.length,52,'fresh snapshot is archived but no unimplemented V2 generator is synthesized');
 for(let n=1;n<=13;n++)assert.equal(latestForMatch(n).length,4);
});

 
const market1235=JSON.parse(fs.readFileSync(path.join(__dirname,'..','reports/round_1673_toto13_official_market_snapshot_20261121T1235JST.json'),'utf8'));
test('12:35 official toto13 snapshot preserves all raw count discrepancies and appends a disclosed experimental V2 revision',()=>{
 assert.equal(market1235.round,1673);
 assert.equal(market1235.marketType,'toto13');
 assert.equal(market1235.pageDisplayAt,'2026-11-21T12:35:00+09:00');
 assert.equal(market1235.retrievedAt,'2026-11-21T12:38:00+09:00');
 assert.equal(market1235.displayAgeSeconds,180);
 assert.equal(market1235.stale,false);
 assert.equal(market1235.totalVotesPageSummary,946764);
 assert.equal(market1235.matches.length,13);
 assert.deepEqual(market1235.countConsistency.mismatchedMatchNumbers,Array.from({length:13},(_,i)=>i+1));
 assert.equal(market1235.countConsistency.allPerMatchTotalsMatchPageSummary,false);
 assert.equal(market1235.countConsistency.allDisplayedPercentageTriplesSumTo100,true);
 assert.equal(market1235.v2Eligibility,'eligible_with_disclosed_count_discrepancy');
 for(const m of market1235.matches){
  assert.equal(m.countTotal-market1235.totalVotesPageSummary,m.differenceFromPageSummary);
  assert.ok(Math.abs(m.percentages.reduce((a,b)=>a+b,0)-100)<1e-8);
  assert.equal(m.marketVoteShare['1'],m.percentages[0]/100);
  assert.equal(m.marketVoteShare['0'],m.percentages[1]/100);
  assert.equal(m.marketVoteShare['2'],m.percentages[2]/100);
 }
 assert.equal(v2.length,52);
 assert.equal(new Set(v2.map(r=>r.predictionId)).size,52);
 for(let n=1;n<=13;n++){
  const chain=latestForMatch(n),row=chain[3],base=v1.find(r=>r.matchNumber===n&&!r.revisionOf),m=market1235.matches[n-1];
  assert.equal(chain.length,4);
  assert.equal(row.revisionOf,chain[2].predictionId);
  assert.equal(row.predictionConfirmedAt,'2026-11-21T12:38:00+09:00');
  assert.equal(row.marketOfficialDisplayAt,'2026-11-21T12:35:00+09:00');
  assert.equal(row.marketRetrievedAt,'2026-11-21T12:38:00+09:00');
  assert.equal(row.marketSnapshotPath,'reports/round_1673_toto13_official_market_snapshot_20261121T1235JST.json');
  assert.deepEqual(row.baseModelOutcomeProbabilities,base.outcomeProbabilities);
  assert.deepEqual(row.marketVoteShare,m.marketVoteShare);
  assert.deepEqual(row.blendWeights,{poissonModel:0.3,totoVoteShare:0.7});
  for(const k of ['0','1','2']){
   const expected=0.3*base.outcomeProbabilities[k]+0.7*m.marketVoteShare[k];
   assert.ok(Math.abs(row.outcomeProbabilities[k]-expected)<2e-8);
  }
  assert.ok(Math.abs(Object.values(row.outcomeProbabilities).reduce((a,b)=>a+b,0)-1)<2e-8);
 }
});
