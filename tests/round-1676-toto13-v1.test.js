'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const artifactDir = path.join(root, 'artifacts/round_1676_toto13_v1');
const schedule = JSON.parse(fs.readFileSync(path.join(root,'data/schedule/round_1676.json'),'utf8'));
const scheduleManifest = JSON.parse(fs.readFileSync(path.join(root,'reports/round_1676_schedule_manifest.json'),'utf8'));
const teamNews = JSON.parse(fs.readFileSync(path.join(root,'reports/round_1676_toto13_team_news_audit_20261128T1905JST.json'),'utf8'));

test('round 1676 official schedule separates toto13, mini A/B and GOAL3',()=>{
  assert.equal(schedule.round,1676);
  assert.equal(schedule.matches.length,13);
  assert.deepEqual(scheduleManifest.products.miniTotoA.toto13MatchNumbers,[1,2,3,4,5]);
  assert.deepEqual(scheduleManifest.products.miniTotoB.toto13MatchNumbers,[6,7,8,9,10]);
  assert.deepEqual(scheduleManifest.products.totoGOAL3.toto13MatchNumbers,[1,4,5]);
  assert.equal(scheduleManifest.products.totoGOAL3.teamSideCount,6);
});

test('round 1676 team-news uncertainty is explicit and not applied to V1',()=>{
  assert.equal(teamNews.teams.length,26);
  assert.equal(teamNews.all26AvailabilityFullyVerified,false);
  assert.equal(teamNews.officialStartingLineupsPublished,false);
  assert.equal(teamNews.appliedToV1,false);
  assert.equal(teamNews.absenceOfNoticeIsNotEvidenceOfAvailability,true);
});

test('generated V1 artifact is 13 distinct normalized toto13 rows with no market blend',()=>{
  const rows=fs.readFileSync(path.join(artifactDir,'predictions.jsonl'),'utf8').trim().split('\n').map(JSON.parse);
  const manifest=JSON.parse(fs.readFileSync(path.join(artifactDir,'manifest.json'),'utf8'));
  assert.equal(rows.length,13);
  assert.equal(manifest.product,'toto13');
  assert.equal(manifest.round,1676);
  assert.equal(manifest.predictionVersion,'V1');
  assert.equal(manifest.predictionFile.marketBlend,false);
  assert.equal(manifest.marketSnapshot.used,false);
  assert.equal(new Set(rows.map(x=>x.predictionId)).size,13);
  assert.deepEqual(rows.map(x=>x.matchNumber),Array.from({length:13},(_,i)=>i+1));
  for(const row of rows){
    assert.equal(row.product,'toto13');
    assert.equal(row.round,1676);
    assert.equal(row.revisionOf,null);
    assert.ok(!('marketBlend' in row));
    assert.ok(!('marketWeights' in row));
    assert.ok(Math.abs(row.homeGoalProbabilities.reduce((a,b)=>a+b,0)-1)<1e-7);
    assert.ok(Math.abs(row.awayGoalProbabilities.reduce((a,b)=>a+b,0)-1)<1e-7);
    assert.ok(Math.abs(Object.values(row.outcomeProbabilities).reduce((a,b)=>a+b,0)-1)<1e-7);
    assert.equal(row.historyHomeMatches,12);
    assert.equal(row.historyAwayMatches,12);
  }
});
