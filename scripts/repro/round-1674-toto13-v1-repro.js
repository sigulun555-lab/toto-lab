'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const root = path.resolve(__dirname, '../..');
const gptRoot = path.join(root, 'gpt-input');
const report = JSON.parse(fs.readFileSync(path.join(root, 'reports/round_1674_toto13_v1_audit_20261121.json'), 'utf8'));
const rows = fs.readFileSync(path.join(root, 'predictions/round_1674_ChatGPT_shared_score_v1.jsonl'), 'utf8').trim().split(/\r?\n/).map(JSON.parse);
const { predict, canonical } = require(path.join(gptRoot, 'model.js'));
const historyDoc = JSON.parse(fs.readFileSync(path.join(gptRoot, 'data/history.json'), 'utf8'));
const history = historyDoc.history;
const hash = p => execFileSync('git', ['-C', gptRoot, 'hash-object', p], {encoding:'utf8'}).trim();
const head = execFileSync('git', ['-C', gptRoot, 'rev-parse', 'HEAD'], {encoding:'utf8'}).trim();
assert.equal(head, report.model.commit, 'pinned GPT commit');
assert.equal(hash('model.js'), report.model.blobSha, 'model.js blob');
assert.equal(hash('data/history.json'), report.input.historyBlobSha, 'history blob');
assert.equal(hash('data/team_aliases.json'), report.input.teamAliasesBlobSha, 'team aliases blob');
assert.equal(hash('scripts/auto_pipeline.js'), report.input.parserBlobSha, 'parser blob');
assert.equal(history.length, report.input.historyRows);
assert.equal(history.reduce((m,x)=>x.date>m?x.date:m,''), report.input.latestResultDate);
assert.equal(new Set(history.map(x=>x.fetchedAt)).size, 1);
assert.equal(history[0].fetchedAt, report.input.fetchedAt);
assert.equal(rows.length, 13);
assert.equal(new Set(rows.map(x=>x.predictionId)).size, 13);
assert.equal(new Set(rows.map(x=>x.matchNumber)).size, 13);
assert.equal(report.officialFixtures.length, 13);
assert.equal(report.teamNewsAudit.teams.length, 26);
const round8 = x => Number(x.toFixed(8));
const close = (a,b,tol=1e-8) => assert.ok(Math.abs(a-b)<=tol, `expected ${a} ~= ${b}`);
for (const fixture of report.officialFixtures) {
  const row = rows.find(x=>x.matchNumber===fixture.number);
  assert.ok(row, `missing match ${fixture.number}`);
  assert.equal(row.round, 1674);
  assert.equal(row.homeTeam, fixture.home);
  assert.equal(row.awayTeam, fixture.away);
  assert.equal(row.predictionConfirmedAt, report.generatedAtUtc);
  assert.equal(row.deadlineAt, report.deadlineAtUtc);
  assert.equal(row.revisionOf, null);
  assert.equal(row.modelName, 'ChatGPT');
  assert.equal(row.modelVersion, report.model.version);
  assert.equal(row.historyMatchesPerTeam, 12);
  assert.ok(!row.marketBlend && !row.marketWeights, 'V1 must not contain market blend');
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
console.log(JSON.stringify({round:1674,product:'toto13',rows:rows.length,gptCommit:head,historyRows:history.length,latestResultDate:report.input.latestResultDate,actualModelExport:'PASS'}, null, 2));
