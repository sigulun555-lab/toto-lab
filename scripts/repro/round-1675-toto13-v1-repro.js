'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const root = path.resolve(__dirname, '../..');
const gptRoot = path.join(root, 'gpt-input');
const scheduleRoot = path.join(root, 'schedule-input');
const reportPath = path.join(root, 'reports/round_1675_toto13_v1_manifest_20261126T0155JST.json');
const rowsPath = path.join(root, 'predictions/round_1675_ChatGPT_shared_score_v1.jsonl');
const auditPath = path.join(root, 'reports/round_1675_toto13_team_news_audit_20261126T0155JST.json');
const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
const audit = JSON.parse(fs.readFileSync(auditPath, 'utf8'));
const rows = fs.readFileSync(rowsPath, 'utf8').trim().split(/\r?\n/).map(JSON.parse);
const scheduleManifest = JSON.parse(fs.readFileSync(path.join(scheduleRoot, 'reports/round_1675_schedule_manifest.json'), 'utf8'));
const schedule = JSON.parse(fs.readFileSync(path.join(scheduleRoot, 'data/schedule/round_1675.json'), 'utf8'));
const { predict, canonical } = require(path.join(gptRoot, 'model.js'));
const historyDoc = JSON.parse(fs.readFileSync(path.join(gptRoot, 'data/history.json'), 'utf8'));
const history = historyDoc.history;
const hash = (repo, file) => execFileSync('git', ['-C', repo, 'hash-object', file], {encoding:'utf8'}).trim();
const head = execFileSync('git', ['-C', gptRoot, 'rev-parse', 'HEAD'], {encoding:'utf8'}).trim();
const scheduleHead = execFileSync('git', ['-C', scheduleRoot, 'rev-parse', 'HEAD'], {encoding:'utf8'}).trim();
assert.equal(head, report.model.commit, 'pinned GPT commit');
assert.equal(scheduleHead, report.officialSchedule.snapshotCommit, 'pinned official schedule commit');
assert.equal(hash(gptRoot, 'model.js'), report.model.blobSha, 'model.js blob');
assert.equal(hash(gptRoot, 'data/history.json'), report.input.historyBlobSha, 'history blob');
assert.equal(hash(gptRoot, 'data/team_aliases.json'), report.input.teamAliasesBlobSha, 'team aliases blob');
assert.equal(hash(gptRoot, 'scripts/auto_pipeline.js'), report.input.parserBlobSha, 'parser blob');
assert.equal(hash(scheduleRoot, 'reports/round_1675_schedule_manifest.json'), report.officialSchedule.snapshotManifestBlobSha, 'official schedule manifest blob');
assert.equal(hash(scheduleRoot, 'data/schedule/round_1675.json'), report.officialSchedule.snapshotScheduleBlobSha, 'official schedule JSON blob');
assert.equal(hash(root, 'reports/round_1675_toto13_team_news_audit_20261126T0155JST.json'), report.teamNewsAudit.blobSha, 'team news audit blob');
assert.equal(history.length, report.input.historyRows);
assert.equal(history.length, 512);
assert.equal(history.reduce((m,x)=>x.date>m?x.date:m,''), report.input.latestResultDate);
assert.equal(new Set(history.map(x=>x.fetchedAt)).size, 1);
assert.equal(history[0].fetchedAt, report.input.fetchedAt);
assert.ok(history.every((x,i)=>i===0||history[i-1].date<=x.date), 'history date-sorted');
assert.equal(audit.teams.length, 26, 'all 26 clubs listed');
assert.equal(audit.round, 1675);
assert.equal(audit.coverage.all26AvailabilityFullyVerified, false, 'incomplete availability must remain explicit');
assert.equal(audit.coverage.officialStartingLineupsPublished, false, 'no official lineups at audit time');
assert.equal(report.teamNewsAudit.coverageComplete, false);
assert.equal(report.teamNewsAudit.appliedToV1, false);
assert.equal(report.marketSnapshot.used, false);
assert.equal(report.marketSnapshot.eligibleForV2, false, 'stale market snapshot must not be used for V2');
assert.ok(report.marketSnapshot.ageSeconds > report.marketSnapshot.freshnessThresholdSeconds);
assert.equal(scheduleManifest.round, 1675);
assert.equal(schedule.round, 1675);
assert.equal(scheduleManifest.fixtures.length, 13);
assert.equal(schedule.matches.length, 13);
assert.deepEqual(scheduleManifest.products.toto13.matchNumbers, Array.from({length:13},(_,i)=>i+1));
assert.deepEqual(scheduleManifest.products.miniTotoA.productMatchNumbers, [1,2,3,4,5]);
assert.deepEqual(scheduleManifest.products.miniTotoB.toto13MatchNumbers, [6,7,8,9,10]);
assert.deepEqual(scheduleManifest.products.totoGOAL3.toto13MatchNumbers, [1,3,5]);
assert.equal(scheduleManifest.products.totoGOAL3.teamSideCount, 6);
assert.equal(rows.length, 13, '13 normal toto13 rows only');
assert.equal(new Set(rows.map(x=>x.predictionId)).size, 13, 'predictionIds unique');
assert.deepEqual(rows.map(x=>x.matchNumber).sort((a,b)=>a-b), Array.from({length:13},(_,i)=>i+1));
assert.equal(report.generatedAtUtc, rows[0].predictionConfirmedAt);
assert.equal(report.deadlineAtUtc, '2026-11-28T04:50:00.000Z');
assert.ok(Date.parse(report.generatedAtUtc) < Date.parse(report.deadlineAtUtc), 'generated before deadline');
assert.equal(report.predictionFile.rows, 13);
assert.equal(report.predictionFile.revisionRows, 0);
assert.equal(report.predictionFile.revisionOfLinks, 0);
assert.equal(report.predictionFile.marketBlend, false);
assert.equal(report.teamWindows.length, 13);
const round8 = x => Number(x.toFixed(8));
const close = (a,b,tol=1e-8) => assert.ok(Math.abs(a-b)<=tol, `expected ${a} ~= ${b}`);
for (const fixture of report.officialFixtures) {
  const row = rows.find(x=>x.matchNumber===fixture.number);
  assert.ok(row, `missing match ${fixture.number}`);
  assert.equal(row.round, 1675);
  assert.equal(row.modelName, 'ChatGPT');
  assert.equal(row.modelVersion, report.model.version);
  assert.equal(row.predictionConfirmedAt, report.generatedAtUtc);
  assert.equal(row.deadlineAt, report.deadlineAtUtc);
  assert.equal(row.revisionOf, null);
  assert.equal(row.historyMatchesPerTeam, 12);
  assert.ok(!('marketBlend' in row) && !('marketWeights' in row), 'V1 must not contain market blend');
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
console.log(JSON.stringify({
  round:1675,product:'toto13',rows:rows.length,matchNumbers:rows.map(x=>x.matchNumber),
  gptCommit:head,historyRows:history.length,latestResultDate:report.input.latestResultDate,
  modelBlob:report.model.blobSha,historyBlob:report.input.historyBlobSha,
  scheduleCommit:scheduleHead,teamNewsCoverageComplete:false,
  actualExportParity:'PASS',appendOnly:'PASS',marketBlend:false
}, null, 2));
