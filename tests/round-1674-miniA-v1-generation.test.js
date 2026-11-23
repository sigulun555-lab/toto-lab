'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {validatePrediction} = require('../scripts/validate_prediction.js');
const rows = fs.readFileSync(path.join(__dirname,'..','predictions/round_1674_ChatGPT_miniA.jsonl'),'utf8').trim().split(/\r?\n/).filter(Boolean).map(JSON.parse);
const manifest = JSON.parse(fs.readFileSync(path.join(__dirname,'..','reports/round_1674_miniA_v1_manifest.json'),'utf8'));
test('miniA round 1674 is product-specific and keeps regular-toto13 matchNumber crosswalk',()=>{
  assert.equal(rows.length,5);
  assert.equal(new Set(rows.map(r=>r.predictionId)).size,5);
  assert.equal(manifest.round,1674);
  assert.equal(manifest.product,'mini toto A');
  assert.deepEqual(manifest.productMatchNumbers,[1,2,3,4,5]);
  assert.deepEqual(manifest.toto13MatchNumbers,[1,2,3,4,5]);
  assert.deepEqual(rows.map(r=>r.matchNumber),[1,2,3,4,5]);
  assert.equal(manifest.matchNumberSpaceInPredictionRecords,'regular-toto13');
});
test('miniA rows pass existing schema, exact pinned-source cross-check, and no-market safeguards',()=>{
  const ids=new Set();
  for(const row of rows){
    const result=validatePrediction(row,ids);
    assert.equal(result.ok,true,result.errors.join('; '));
    assert.deepEqual(result.warnings,[]);
    ids.add(row.predictionId);
    assert.equal(row.round,1674);
    assert.equal(row.modelName,'ChatGPT');
    assert.equal(row.revisionOf,null);
    assert.equal(row.predictionConfirmedAt,manifest.generatedAt);
    assert.equal(row.deadlineAt,'2026-11-25T09:50:00.000Z');
    assert.ok(Math.abs(Object.values(row.probabilities).reduce((a,b)=>a+b,0)-1)<=1e-7);
    assert.ok(Object.values(row.probabilities).every(x=>Number.isFinite(x)&&x>=0&&x<=1));
    assert.ok(row.modelVersion.includes('20cde0fc85016db3ef7abac7d2bb485510ba4e22'));
    assert.ok(row.modelVersion.includes('1a6a3230330ef67468755faf8504cac1a9741570'));
  }
  assert.equal(manifest.crossCheckAgainstToto13V1Revision.matchesCompared,5);
  assert.ok(manifest.crossCheckAgainstToto13V1Revision.maxAbsProbabilityDelta<=1e-8);
  assert.equal(manifest.market.v2Status,'held_no_fresh_product_specific_official_vote_snapshot');
  assert.equal(manifest.teamNewsAudit.coverage.all26ClubInjuryAndAvailabilityStatusesFullyVerified,false);
  assert.equal(manifest.teamNewsAudit.coverage.officialStartingLineupsPublished,false);
  assert.equal(manifest.safety.productionModelChanged,false);
  assert.equal(manifest.safety.mainChanged,false);
});
