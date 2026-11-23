'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const root = path.resolve(__dirname, '../..');
const gptRoot = path.join(root, 'gpt-input');
const report = JSON.parse(fs.readFileSync(path.join(root, 'reports/round_1674_toto13_v1_audit_20261121.json'), 'utf8'));
const raw = fs.readFileSync(path.join(root, 'predictions/round_1674_ChatGPT_shared_score_v1.jsonl'), 'utf8');
const lines = raw.trim().split(/\r?\n/);
const rows = lines.map(JSON.parse);
const { predict, canonical } = require(path.join(gptRoot, 'model.js'));
const historyDoc = JSON.parse(fs.readFileSync(path.join(gptRoot, 'data/history.json'), 'utf8'));
const history = historyDoc.history;
const hash = p => execFileSync('git', ['-C', gptRoot, 'hash-object', p], {encoding:'utf8'}).trim();
const head = execFileSync('git', ['-C', gptRoot, 'rev-parse', 'HEAD'], {encoding:'utf8'}).trim();
const latest = report.latestRevision;
assert.ok(latest, 'latest revision manifest exists');
assert.equal(head, latest.model.commit, 'pinned GPT commit');
assert.equal(hash('model.js'), latest.model.blobSha, 'model.js blob');
assert.equal(hash('data/history.json'), latest.input.historyBlobSha, 'history blob');
assert.equal(hash('data/team_aliases.json'), latest.input.teamAliasesBlobSha, 'team aliases blob');
assert.equal(hash('scripts/auto_pipeline.js'), latest.input.parserBlobSha, 'parser blob');
assert.equal(history.length, latest.input.historyRows);
assert.equal(history.reduce((m,x)=>x.date>m?x.date:m,''), latest.input.latestResultDate);
assert.equal(new Set(history.map(x=>x.fetchedAt)).size, 1);
assert.equal(history[0].fetchedAt, latest.input.fetchedAt);
assert.equal(rows.length, 26, '13 original rows plus 13 appended revision rows');
const originalRows = rows.slice(0,13);
const revisionRows = rows.slice(13);
assert.equal(originalRows.length, 13);
assert.equal(revisionRows.length, 13);
assert.equal(new Set(rows.map(x=>x.predictionId)).size, 26, 'all predictionIds unique');
assert.ok(originalRows.every(x=>x.revisionOf===null), 'original frozen rows are unchanged');
assert.deepEqual(originalRows.map(x=>x.matchNumber).sort((a,b)=>a-b), Array.from({length:13},(_,i)=>i+1));
assert.deepEqual(revisionRows.map(x=>x.matchNumber).sort((a,b)=>a-b), Array.from({length:13},(_,i)=>i+1));
const originalByMatch = new Map(originalRows.map(x=>[x.matchNumber,x]));
for (const row of revisionRows) {
  assert.equal(row.revisionOf, originalByMatch.get(row.matchNumber).predictionId, 'revisionOf points to prior V1 row');
  assert.equal(row.round, 1674);
  assert.equal(row.modelName, 'ChatGPT');
  assert.equal(row.modelVersion, latest.model.version);
  assert.equal(row.predictionConfirmedAt, latest.generatedAtUtc);
  assert.equal(row.deadlineAt, '2026-11-25T09:50:00.000Z');
  assert.equal(row.historyMatchesPerTeam, 12);
  assert.ok(!row.marketBlend && !row.marketWeights, 'V1 revision must not contain market blend');
}
const initialBlob = execFileSync('git', ['-C', root, 'hash-object', '--stdin'], {input:lines.slice(0,13).join('\n')+'\n', encoding:'utf8'}).trim();
assert.equal(initialBlob, report.initialSnapshot.predictionFileBlobSha, 'initial 13-row V1 blob preserved byte-for-byte');
assert.equal(report.officialFixtures.length, 13);
assert.equal(latest.predictionFile.appendedRows, 13);
assert.equal(latest.predictionFile.originalRowsRetained, 13);
const round8 = x => Number(x.toFixed(8));
const close = (a,b,tol=1e-8) => assert.ok(Math.abs(a-b)<=tol, `expected ${a} ~= ${b}`);
for (const fixture of report.officialFixtures) {
  const row = revisionRows.find(x=>x.matchNumber===fixture.number);
  assert.ok(row, `missing revision match ${fixture.number}`);
  const p = predict(history, {home:fixture.home, away:fixture.away, date:fixture.date});
  close(row.homeExpectedGoals, round8(p.homeExpectedGoals));
  close(row.awayExpectedGoals, round8(p.awayExpectedGoals));
  for (let i=0;i<4;i++) {
    close(row.homeGoalProbabilities[i], round8(p.homeGoalProbabilities[i]));
    close(row.awayGoalProbabilities[i], round8(p.awayGoalProbabilities[i]));
  }
  for (const outcome of ['0','1','2']) close(row.outcomeProbabilities[outcome], round8(p.probabilities[outcome]));
  close(row.homeGoalProbabilities.reduce((a,b)=>a+b,0), 1, 1e-7);
  close(row.awayGoalProbabilities.reduce((a,b)=>a+b,0), 1, 1e-7);
  close(Object.values(row.outcomeProbabilities).reduce((a,b)=>a+b,0), 1, 1e-7);
  const prior = history.filter(m=>m.date<fixture.date);
  for (const team of [fixture.home,fixture.away]) {
    const target = canonical(team);
    const played = prior.filter(m=>canonical(m.home)===target || canonical(m.away)===target).slice(-12);
    assert.equal(played.length, 12, `12 prior matches for ${team}`);
  }
}
console.log(JSON.stringify({round:1674,product:'toto13',originalRows:13,revisionRows:13,totalRows:26,gptCommit:head,historyRows:history.length,latestResultDate:latest.input.latestResultDate,actualExportParity:'PASS',appendOnly:'PASS'}, null, 2));
