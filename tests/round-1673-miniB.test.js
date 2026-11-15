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
