'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {validatePrediction}=require('../scripts/validate_prediction.js');
const rows=fs.readFileSync(path.join(__dirname,'..','predictions/round_1673_ChatGPT_miniB.jsonl'),'utf8').trim().split(/\r?\n/).filter(Boolean).map(JSON.parse);
const manifest=JSON.parse(fs.readFileSync(path.join(__dirname,'..','reports/round_1673_miniB_v1_manifest.json'),'utf8'));
test('mini toto B round 1673 has five product-specific rows and explicit toto13 crosswalk',()=>{
 assert.equal(rows.length,5);assert.equal(new Set(rows.map(r=>r.predictionId)).size,5);
 assert.deepEqual(manifest.productMatchNumbers,[1,2,3,4,5]);
 assert.deepEqual(rows.map(r=>r.matchNumber),manifest.toto13MatchNumbers);
 assert.equal(manifest.matchNumberSpaceInPredictionRecords,'regular-toto13');
 assert.equal(manifest.market.v2Status,'held_stale_official_market');
});
test('mini toto B rows pass the existing 1X2 prediction schema and append-only validator',()=>{
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

const market2033=JSON.parse(fs.readFileSync(path.join(__dirname,'..','reports/round_1673_miniB_official_market_snapshot_20261116T2033JST.json'),'utf8'));
test('mini toto B 20:33 official snapshot is archived as stale and V2 remains held',()=>{
 assert.equal(market2033.product,'mini toto B');
 assert.equal(market2033.round,1673);
 assert.equal(market2033.pageDisplayAt,'2026-11-16T20:33:00+09:00');
 assert.equal(market2033.retrievedAt,'2026-11-16T20:39:01+09:00');
 assert.equal(market2033.displayAgeSeconds,361);
 assert.equal(market2033.stale,true);
 assert.equal(market2033.totalVotesPageSummary,12297);
 assert.deepEqual(market2033.matches.map(m=>m.productMatchNumber),[1,2,3,4,5]);
 assert.deepEqual(market2033.matches.map(m=>m.toto13MatchNumber),[6,7,8,9,10]);
 assert.equal(market2033.countConsistency.allPerMatchTotalsMatchPageSummary,true);
 assert.equal(market2033.countConsistency.allDisplayedPercentageTriplesSumTo100,true);
 assert.equal(market2033.v2Eligibility.eligible,false);
 assert.equal(manifest.market.v2Status,'held_stale_official_market');
});

const market0039=JSON.parse(fs.readFileSync(path.join(__dirname,'..','reports/round_1673_miniB_official_market_snapshot_20261117T0039JST.json'),'utf8'));
test('mini toto B 00:39 official snapshot is archived as stale and V2 remains held',()=>{
 assert.equal(market0039.product,'mini toto B');
 assert.equal(market0039.round,1673);
 assert.equal(market0039.pageDisplayAt,'2026-11-17T00:39:00+09:00');
 assert.equal(market0039.retrievedAt,'2026-11-17T01:33:22+09:00');
 assert.equal(market0039.displayAgeSeconds,3262);
 assert.equal(market0039.stale,true);
 assert.equal(market0039.totalVotesPageSummary,13265);
 assert.deepEqual(market0039.matches.map(m=>m.productMatchNumber),[1,2,3,4,5]);
 assert.deepEqual(market0039.matches.map(m=>m.toto13MatchNumber),[6,7,8,9,10]);
 assert.equal(market0039.countConsistency.allPerMatchTotalsMatchPageSummary,true);
 assert.equal(market0039.countConsistency.allDisplayedPercentageTriplesSumTo100,true);
 assert.equal(market0039.v2Eligibility.eligible,false);
 assert.equal(manifest.market.v2Status,'held_stale_official_market');
});
