'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {validatePrediction}=require('../scripts/validate_prediction.js');
const rows=fs.readFileSync(path.join(__dirname,'..','predictions/round_1673_ChatGPT_miniA.jsonl'),'utf8').trim().split(/\r?\n/).filter(Boolean).map(JSON.parse);
const manifest=JSON.parse(fs.readFileSync(path.join(__dirname,'..','reports/round_1673_miniA_v1_manifest.json'),'utf8'));
test('mini toto A round 1673 has five product-specific rows and explicit toto13 crosswalk',()=>{
 assert.equal(rows.length,5);assert.equal(new Set(rows.map(r=>r.predictionId)).size,5);
 assert.deepEqual(manifest.productMatchNumbers,[1,2,3,4,5]);
 assert.deepEqual(rows.map(r=>r.matchNumber),manifest.toto13MatchNumbers);
 assert.equal(manifest.matchNumberSpaceInPredictionRecords,'regular-toto13');
 assert.equal(manifest.market.v2Status,'held_stale_official_market');
});
test('mini toto A rows pass the existing 1X2 prediction schema and append-only validator',()=>{
 const ids=new Set();
 for(const r of rows){
  const v=validatePrediction(r,ids);
  assert.equal(v.ok,true,v.errors.join('; '));
  assert.deepEqual(v.warnings,[]);
  ids.add(r.predictionId);
  assert.equal(r.round,1673);assert.equal(r.modelName,'ChatGPT');assert.equal(r.revisionOf,null);
  assert.ok(Date.parse(r.predictionConfirmedAt)<Date.parse(r.deadlineAt));
  assert.ok(Math.abs(Object.values(r.probabilities).reduce((a,b)=>a+b,0)-1)<1e-8);
  assert.ok(r.modelVersion.includes('20cde0fc85016db3ef7abac7d2bb485510ba4e22'));
  assert.ok(r.modelVersion.includes('479d024a8df8903ef210b33240a00d6a24852bcf'));
 }
});

const market2033=JSON.parse(fs.readFileSync(path.join(__dirname,'..','reports/round_1673_miniA_official_market_snapshot_20261116T2033JST.json'),'utf8'));
test('mini toto A 20:33 official snapshot is archived as stale and V2 remains held',()=>{
 assert.equal(market2033.product,'mini toto A');
 assert.equal(market2033.round,1673);
 assert.equal(market2033.pageDisplayAt,'2026-11-16T20:33:00+09:00');
 assert.equal(market2033.retrievedAt,'2026-11-16T20:39:01+09:00');
 assert.equal(market2033.displayAgeSeconds,361);
 assert.equal(market2033.stale,true);
 assert.equal(market2033.totalVotesPageSummary,13961);
 assert.deepEqual(market2033.matches.map(m=>m.productMatchNumber),[1,2,3,4,5]);
 assert.deepEqual(market2033.matches.map(m=>m.toto13MatchNumber),[1,2,3,4,5]);
 assert.equal(market2033.countConsistency.allPerMatchTotalsMatchPageSummary,true);
 assert.equal(market2033.countConsistency.allDisplayedPercentageTriplesSumTo100,true);
 assert.equal(market2033.v2Eligibility.eligible,false);
 assert.equal(manifest.market.v2Status,'held_stale_official_market');
});

const market0039=JSON.parse(fs.readFileSync(path.join(__dirname,'..','reports/round_1673_miniA_official_market_snapshot_20261117T0039JST.json'),'utf8'));
test('mini toto A 00:39 official snapshot is archived as stale and V2 remains held',()=>{
 assert.equal(market0039.product,'mini toto A');
 assert.equal(market0039.round,1673);
 assert.equal(market0039.pageDisplayAt,'2026-11-17T00:39:00+09:00');
 assert.equal(market0039.retrievedAt,'2026-11-17T01:33:22+09:00');
 assert.equal(market0039.displayAgeSeconds,3262);
 assert.equal(market0039.stale,true);
 assert.equal(market0039.totalVotesPageSummary,15262);
 assert.deepEqual(market0039.matches.map(m=>m.productMatchNumber),[1,2,3,4,5]);
 assert.deepEqual(market0039.matches.map(m=>m.toto13MatchNumber),[1,2,3,4,5]);
 assert.equal(market0039.countConsistency.allPerMatchTotalsMatchPageSummary,true);
 assert.equal(market0039.countConsistency.allDisplayedPercentageTriplesSumTo100,true);
 assert.equal(market0039.v2Eligibility.eligible,false);
 assert.equal(manifest.market.v2Status,'held_stale_official_market');
});

const market0132=JSON.parse(fs.readFileSync(path.join(__dirname,'..','reports/round_1673_miniA_official_market_snapshot_20261117T0132JST.json'),'utf8'));
test('mini toto A 01:32 official snapshot is archived as stale and V2 remains held',()=>{
 assert.equal(market0132.product,'mini toto A');assert.equal(market0132.round,1673);
 assert.equal(market0132.pageDisplayAt,'2026-11-17T01:32:00+09:00');assert.equal(market0132.retrievedAt,'2026-11-17T01:44:22+09:00');
 assert.equal(market0132.displayAgeSeconds,742);assert.equal(market0132.stale,true);assert.equal(market0132.totalVotesPageSummary,15501);
 assert.deepEqual(market0132.matches.map(m=>m.productMatchNumber),[1,2,3,4,5]);
 assert.deepEqual(market0132.matches.map(m=>m.toto13MatchNumber),[1,2,3,4,5]);
 assert.equal(market0132.countConsistency.allPerMatchTotalsMatchPageSummary,true);
 assert.equal(market0132.countConsistency.allDisplayedPercentageTriplesSumTo100,true);
 assert.equal(market0132.v2Eligibility.eligible,false);assert.equal(manifest.market.v2Status,'held_stale_official_market');
});

const market0636=JSON.parse(fs.readFileSync(path.join(__dirname,'..','reports/round_1673_miniA_official_market_snapshot_20261117T0636JST.json'),'utf8'));
test('mini toto A 06:36 official snapshot is archived as stale and V2 remains held',()=>{
 assert.equal(market0636.product,'mini toto A');
 assert.equal(market0636.round,1673);
 assert.equal(market0636.pageDisplayAt,'2026-11-17T06:36:00+09:00');
 assert.equal(market0636.retrievedAt,'2026-11-17T06:43:24+09:00');
 assert.equal(market0636.displayAgeSeconds,444);
 assert.equal(market0636.stale,true);
 assert.equal(market0636.totalVotesPageSummary,15675);
 assert.deepEqual(market0636.matches.map(m=>m.productMatchNumber),[1,2,3,4,5]);
 assert.deepEqual(market0636.matches.map(m=>m.toto13MatchNumber),[1,2,3,4,5]);
 assert.equal(market0636.countConsistency.allPerMatchTotalsMatchPageSummary,true);
 assert.equal(market0636.countConsistency.allDisplayedPercentageTriplesSumTo100,true);
 assert.ok(market0636.matches.every(m=>m.sumVotes===15675 && m.differenceFromSummaryVotes===0));
 assert.equal(market0636.v2Eligibility.eligible,false);
 assert.equal(manifest.market.v2Status,'held_stale_official_market');
});


const market0856=JSON.parse(fs.readFileSync(path.join(__dirname,'..','reports/round_1673_miniA_official_market_snapshot_20261117T0856JST.json'),'utf8'));
test('08:56 official mini toto A snapshot is fresh and reconciled; V2 remains withheld without a product generator',()=>{
 assert.equal(market0856.product,'mini toto A');assert.equal(market0856.round,1673);
 assert.equal(market0856.pageDisplayAt,'2026-11-17T08:56:00+09:00');assert.equal(market0856.retrievedAt,'2026-11-17T08:57:15+09:00');
 assert.equal(market0856.displayAgeSeconds,75);assert.equal(market0856.stale,false);assert.equal(market0856.totalVotesPageSummary,16049);
 assert.deepEqual(market0856.matches.map(m=>m.productMatchNumber),[1,2,3,4,5]);assert.deepEqual(market0856.matches.map(m=>m.toto13MatchNumber),[1,2,3,4,5]);
 assert.equal(market0856.countConsistency.allPerMatchTotalsMatchPageSummary,true);assert.equal(market0856.countConsistency.allDisplayedPercentageTriplesSumTo100,true);
 assert.equal(market0856.v2Eligibility.eligible,false);assert.match(market0856.v2Eligibility.reason,/V2 revisionは生成せずsnapshotのみ追記/);assert.equal(rows.length,5);
});


const market0947=JSON.parse(fs.readFileSync(path.join(__dirname,'..','reports/round_1673_miniA_official_market_snapshot_20261117T0947JST.json'),'utf8'));
test('09:47 official mini toto A snapshot is archived as stale and V2 remains held',()=>{
 assert.equal(market0947.product,'mini toto A');assert.equal(market0947.round,1673);
 assert.equal(market0947.pageDisplayAt,'2026-11-17T09:47:00+09:00');assert.equal(market0947.retrievedAt,'2026-11-17T09:57:13+09:00');
 assert.equal(market0947.displayAgeSeconds,613);assert.equal(market0947.stale,true);assert.equal(market0947.totalVotesPageSummary,16500);
 assert.deepEqual(market0947.matches.map(m=>m.productMatchNumber),[1,2,3,4,5]);assert.deepEqual(market0947.matches.map(m=>m.toto13MatchNumber),[1,2,3,4,5]);
 assert.equal(market0947.countConsistency.allPerMatchTotalsMatchPageSummary,true);assert.equal(market0947.countConsistency.allDisplayedPercentageTriplesSumTo100,true);
 assert.equal(market0947.v2Eligibility.eligible,false);assert.equal(rows.length,5);assert.equal(manifest.market.v2Status,'held_stale_official_market');
});


const market1101=JSON.parse(fs.readFileSync(path.join(__dirname,'..','reports/round_1673_miniA_official_market_snapshot_20261117T1101JST.json'),'utf8'));
test('11:01 official mini toto A snapshot is archived as stale and V2 remains held',()=>{
 assert.equal(market1101.product,'mini toto A');assert.equal(market1101.round,1673);
 assert.equal(market1101.pageDisplayAt,'2026-11-17T11:01:00+09:00');assert.equal(market1101.retrievedAt,'2026-11-17T11:39:41+09:00');
 assert.equal(market1101.displayAgeSeconds,2321);assert.equal(market1101.stale,true);assert.equal(market1101.totalVotesPageSummary,17251);
 assert.deepEqual(market1101.matches.map(m=>m.productMatchNumber),[1,2,3,4,5]);assert.deepEqual(market1101.matches.map(m=>m.toto13MatchNumber),[1,2,3,4,5]);
 assert.equal(market1101.countConsistency.allPerMatchTotalsMatchPageSummary,true);assert.equal(market1101.countConsistency.allDisplayedPercentageTriplesSumTo100,true);
 assert.equal(market1101.v2Eligibility.eligible,false);assert.equal(rows.length,5);assert.equal(manifest.market.v2Status,'held_stale_official_market');
});


const market1254=JSON.parse(fs.readFileSync(path.join(__dirname,'..','reports/round_1673_miniA_official_market_snapshot_20261117T1254JST.json'),'utf8'));
test('12:54 official mini toto A snapshot is archived as stale and V2 remains held',()=>{
 assert.equal(market1254.product,'mini toto A');assert.equal(market1254.round,1673);
 assert.equal(market1254.pageDisplayAt,'2026-11-17T12:54:00+09:00');assert.equal(market1254.retrievedAt,'2026-11-17T13:44:16+09:00');
 assert.equal(market1254.displayAgeSeconds,3016);assert.equal(market1254.stale,true);assert.equal(market1254.totalVotesPageSummary,18187);
 assert.deepEqual(market1254.matches.map(m=>m.productMatchNumber),[1,2,3,4,5]);assert.deepEqual(market1254.matches.map(m=>m.toto13MatchNumber),[1,2,3,4,5]);
 assert.equal(market1254.countConsistency.allPerMatchTotalsMatchPageSummary,true);assert.equal(market1254.countConsistency.allDisplayedPercentageTriplesSumTo100,true);
 assert.equal(market1254.v2Eligibility.eligible,false);assert.equal(rows.length,5);
});


const market1343=JSON.parse(fs.readFileSync(path.join(__dirname,'..','reports/round_1673_miniA_official_market_snapshot_20261117T1343JST.json'),'utf8'));
test('13:43 official mini toto A snapshot is archived as stale and V2 remains held',()=>{
 assert.equal(market1343.product,'mini toto A');assert.equal(market1343.round,1673);
 assert.equal(market1343.pageDisplayAt,'2026-11-17T13:43:00+09:00');assert.equal(market1343.retrievedAt,'2026-11-17T13:50:54+09:00');
 assert.equal(market1343.displayAgeSeconds,474);assert.equal(market1343.stale,true);assert.equal(market1343.totalVotesPageSummary,18808);
 assert.deepEqual(market1343.matches.map(m=>m.productMatchNumber),[1,2,3,4,5]);assert.deepEqual(market1343.matches.map(m=>m.toto13MatchNumber),[1,2,3,4,5]);
 assert.equal(market1343.countConsistency.allPerMatchTotalsMatchPageSummary,true);assert.equal(market1343.countConsistency.allDisplayedPercentageTriplesSumTo100,true);
 assert.equal(market1343.v2Eligibility.eligible,false);assert.equal(rows.length,5);
});


const market1810A=JSON.parse(fs.readFileSync(path.join(__dirname,'..','reports/round_1673_miniA_official_market_snapshot_20261117T1810JST.json'),'utf8'));
test('18:10 official mini toto A snapshot is archived as stale and V2 remains held',()=>{
 assert.equal(market1810A.round,1673);assert.equal(market1810A.product,'mini toto A');
 assert.equal(market1810A.pageDisplayAt,'2026-11-17T18:10:00+09:00');assert.equal(market1810A.retrievedAt,'2026-11-17T19:45:06+09:00');
 assert.equal(market1810A.displayAgeSeconds,5706);assert.equal(market1810A.stale,true);assert.equal(market1810A.totalVotesPageSummary,20417);
 assert.deepEqual(market1810A.matches.map(m=>m.productMatchNumber),[1,2,3,4,5]);assert.deepEqual(market1810A.matches.map(m=>m.toto13MatchNumber),[1,2,3,4,5]);
 assert.equal(market1810A.countConsistency.allPerMatchTotalsMatchPageSummary,true);assert.equal(market1810A.countConsistency.allDisplayedPercentageTriplesSumTo100,true);
 assert.equal(market1810A.v2Eligibility.eligible,false);assert.equal(rows.length,5);assert.equal(manifest.market.v2Status,'held_stale_official_market');
});


const market1943=JSON.parse(fs.readFileSync(path.join(__dirname,'..','reports/round_1673_miniA_official_market_snapshot_20261117T1943JST.json'),'utf8'));
test('19:43 official mini toto A snapshot is archived as stale and V2 remains held',()=>{
 assert.equal(market1943.round,1673);assert.equal(market1943.pageDisplayAt,'2026-11-17T19:43:00+09:00');assert.equal(market1943.retrievedAt,'2026-11-17T20:03:37+09:00');
 assert.equal(market1943.displayAgeSeconds,1237);assert.equal(market1943.stale,true);assert.equal(market1943.totalVotesPageSummary,20906);
 assert.deepEqual(market1943.matches.map(m=>m.productMatchNumber),[1,2,3,4,5]);assert.deepEqual(market1943.matches.map(m=>m.toto13MatchNumber),[1,2,3,4,5]);
 assert.equal(market1943.countConsistency.allPerMatchTotalsMatchPageSummary,true);assert.equal(market1943.countConsistency.allDisplayedPercentageTriplesSumTo100,true);
 assert.equal(market1943.v2Eligibility.eligible,false);assert.equal(rows.length,5);assert.equal(manifest.market.v2Status,'held_stale_official_market');
});
