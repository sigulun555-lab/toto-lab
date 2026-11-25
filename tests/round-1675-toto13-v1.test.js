'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const rows = fs.readFileSync('predictions/round_1675_ChatGPT_shared_score_v1.jsonl','utf8').trim().split(/\r?\n/).map(JSON.parse);
const report = JSON.parse(fs.readFileSync('reports/round_1675_toto13_v1_manifest_20261126T0155JST.json','utf8'));
const audit = JSON.parse(fs.readFileSync('reports/round_1675_toto13_team_news_audit_20261126T0155JST.json','utf8'));
test('round 1675 is normal toto13 only: 13 matches, 1/X/2',()=>{
  assert.equal(report.product,'toto13');
  assert.equal(rows.length,13);
  assert.deepEqual(rows.map(x=>x.matchNumber).sort((a,b)=>a-b),Array.from({length:13},(_,i)=>i+1));
  assert.ok(rows.every(x=>x.round===1675 && x.revisionOf===null));
});
test('all IDs are unique and probability vectors normalize',()=>{
  assert.equal(new Set(rows.map(x=>x.predictionId)).size,13);
  for(const r of rows){
    assert.ok(Math.abs(Object.values(r.outcomeProbabilities).reduce((a,b)=>a+b,0)-1)<1e-7);
    assert.ok(Math.abs(r.homeGoalProbabilities.reduce((a,b)=>a+b,0)-1)<1e-7);
    assert.ok(Math.abs(r.awayGoalProbabilities.reduce((a,b)=>a+b,0)-1)<1e-7);
  }
});
test('V1 has no market blend and team news limitations are explicit',()=>{
  assert.equal(report.marketSnapshot.used,false);
  assert.equal(report.predictionFile.marketBlend,false);
  assert.equal(audit.teams.length,26);
  assert.equal(audit.coverage.all26AvailabilityFullyVerified,false);
  assert.equal(audit.coverage.officialStartingLineupsPublished,false);
});
