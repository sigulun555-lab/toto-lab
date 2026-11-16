'use strict';
const fs=require('node:fs');
const path=require('node:path');
const test=require('node:test');
const assert=require('node:assert/strict');
const root=path.join(__dirname,'..');
const rows=fs.readFileSync(path.join(root,'predictions/round_1673_ChatGPT_shared_score_v1.jsonl'),'utf8').trim().split(/\\r?\\n/).map(JSON.parse);
const report=JSON.parse(fs.readFileSync(path.join(root,'reports/round_1673_toto13_v1_revision_20261116T183508JST.json'),'utf8'));
const closeToOne=a=>Math.abs(a.reduce((s,v)=>s+v,0)-1)<1e-7;
test('round 1673 toto13 V1 history-480 revision is append-only and linked',()=>{
 assert.equal(rows.length,26);assert.equal(new Set(rows.map(r=>r.predictionId)).size,26);
 for(let n=1;n<=13;n++){
  const pair=rows.filter(r=>r.matchNumber===n);assert.equal(pair.length,2);
  const prior=pair.find(r=>r.revisionOf===null);const next=pair.find(r=>r.revisionOf===prior.predictionId);
  assert.ok(prior);assert.ok(next);assert.equal(next.historyMatchesPerTeam,12);
  assert.equal(next.predictionConfirmedAt,report.generatedAt);assert.equal(next.modelVersion,prior.modelVersion);
  assert.ok(closeToOne(Object.values(next.outcomeProbabilities)));
  assert.ok(closeToOne(next.homeGoalProbabilities));assert.ok(closeToOne(next.awayGoalProbabilities));
  assert.ok(next.dataSource.includes('480 completed J1/J2/J3 matches'));
 }
 assert.equal(report.history.rows,480);assert.equal(report.history.blobSha,'e7b6a068e4fc459642b7c07e46f6fd211d256329');
 assert.equal(report.model.blobSha,'20cde0fc85016db3ef7abac7d2bb485510ba4e22');
 assert.equal(report.revision.appendedRows,13);assert.equal(report.revision.revisionOfLinks,13);
 assert.equal(report.parity.maxAbsDifference,0);assert.equal(report.validation.eachWindowMatches,12);
});
