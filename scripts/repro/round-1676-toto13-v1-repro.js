'use strict';
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const root = path.resolve(__dirname, '../..');
const gptRoot = path.join(root, 'gpt-input');
const schedulePath = path.join(root, 'data/schedule/round_1676.json');
const scheduleManifestPath = path.join(root, 'reports/round_1676_schedule_manifest.json');
const teamNewsPath = path.join(root, 'reports/round_1676_toto13_team_news_audit_20261128T1905JST.json');
const savedRowsPath = path.join(root, 'predictions/round_1676_ChatGPT_shared_score_v1.jsonl');
const savedManifestPath = path.join(root, 'reports/round_1676_toto13_v1_manifest_20261128T1905JST.json');
const artifactDir = path.join(root, 'artifacts/round_1676_toto13_v1');
const deadlineAt = '2026-12-05T12:50:00+09:00';
const deadlineAtUtc = '2026-12-05T03:50:00.000Z';
const modelVersion = 'GPT-shared-poisson-score-v1-2026-11-28';
const expected = Object.freeze({
  gptCommit: 'c2b3a8e943446d41adb803b918b7a75a36ae982d',
  modelBlob: '20cde0fc85016db3ef7abac7d2bb485510ba4e22',
  historyBlob: 'bfb8bdc2b2a29c828d3a2041ce6e514a8b40ab6f',
  aliasesBlob: '5de22584524ff4c07ddac1d27f49afbbbc5f88ab',
  parserBlob: 'ef557e084cab802df7830d949bd1f52ddee5db7c',
  scheduleBlob: '10327e8e969d057e9a8c2d347a463b20dcb8c06b',
  scheduleManifestBlob: 'f3fe3f834dffea613af966dc0559642278d3716c',
  teamNewsBlob: '043a996dcaa46a565dc70118ea572e90fc3aae71',
  scheduleCommit: '99e727faa68fa74211b1f7f09a7933140b30ccde'
});

const hash = (repo, file) => execFileSync('git', ['-C', repo, 'hash-object', file], { encoding: 'utf8' }).trim();
const gptHead = execFileSync('git', ['-C', gptRoot, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
assert.equal(gptHead, expected.gptCommit, 'pinned GPT commit');
assert.equal(hash(gptRoot, 'model.js'), expected.modelBlob, 'model.js blob');
assert.equal(hash(gptRoot, 'data/history.json'), expected.historyBlob, 'history blob');
assert.equal(hash(gptRoot, 'data/team_aliases.json'), expected.aliasesBlob, 'team aliases blob');
assert.equal(hash(gptRoot, 'scripts/auto_pipeline.js'), expected.parserBlob, 'history parser blob');
assert.equal(hash(root, 'data/schedule/round_1676.json'), expected.scheduleBlob, 'official schedule JSON blob');
assert.equal(hash(root, 'reports/round_1676_schedule_manifest.json'), expected.scheduleManifestBlob, 'official schedule manifest blob');
assert.equal(hash(root, 'reports/round_1676_toto13_team_news_audit_20261128T1905JST.json'), expected.teamNewsBlob, 'team news audit blob');

const schedule = JSON.parse(fs.readFileSync(schedulePath, 'utf8'));
const scheduleManifest = JSON.parse(fs.readFileSync(scheduleManifestPath, 'utf8'));
const teamNews = JSON.parse(fs.readFileSync(teamNewsPath, 'utf8'));
const historyDoc = JSON.parse(fs.readFileSync(path.join(gptRoot, 'data/history.json'), 'utf8'));
const history = historyDoc.history;
const { predict, canonical } = require(path.join(gptRoot, 'model.js'));

assert.equal(schedule.round, 1676);
assert.equal(scheduleManifest.round, 1676);
assert.equal(schedule.matches.length, 13);
assert.equal(scheduleManifest.fixtureCount, 13);
assert.equal(scheduleManifest.snapshotCommit, expected.scheduleCommit);
assert.equal(scheduleManifest.snapshotScheduleBlobSha, expected.scheduleBlob);
assert.deepEqual(schedule.matches.map(x => x.matchNumber).sort((a,b)=>a-b), Array.from({length:13},(_,i)=>i+1));
assert.deepEqual(scheduleManifest.products.toto13.matchNumbers, Array.from({length:13},(_,i)=>i+1));
assert.deepEqual(scheduleManifest.products.miniTotoA.toto13MatchNumbers, [1,2,3,4,5]);
assert.deepEqual(scheduleManifest.products.miniTotoB.toto13MatchNumbers, [6,7,8,9,10]);
assert.deepEqual(scheduleManifest.products.totoGOAL3.toto13MatchNumbers, [1,4,5]);
assert.equal(scheduleManifest.products.totoGOAL3.teamSideCount, 6);
assert.deepEqual(schedule.totoGOAL3, [1,4,5]);
assert.equal(scheduleManifest.networkDeadlineAt, deadlineAt);
assert.equal(scheduleManifest.miniTotoBNetworkDeadlineAt, '2026-12-05T13:50:00+09:00');
assert.equal(teamNews.round, 1676);
assert.equal(teamNews.teams.length, 26);
assert.equal(teamNews.all26AvailabilityFullyVerified, false);
assert.equal(teamNews.officialStartingLineupsPublished, false);
assert.equal(teamNews.appliedToV1, false);
assert.equal(history.length, 540);
assert.equal(new Set(history.map(x=>x.fetchedAt)).size, 1);
assert.equal(history.reduce((m,x)=>x.date>m?x.date:m,''), '2026-11-28');
assert.ok(history.every((x,i)=>i===0||history[i-1].date<=x.date), 'history must be date sorted');

const existingManifest = fs.existsSync(savedManifestPath) ? JSON.parse(fs.readFileSync(savedManifestPath,'utf8')) : null;
const generatedAtUtc = existingManifest?.generatedAtUtc || new Date().toISOString();
const generatedDate = new Date(Date.parse(generatedAtUtc) + 9*60*60*1000);
const generatedAtJst = generatedDate.toISOString().replace('Z', '+09:00');
const timestampTag = generatedAtJst.slice(0,19).replace(/[-:T]/g,'') + 'JST';
const round8 = x => Number(x.toFixed(8));
const close = (a,b,tol=1e-8) => assert.ok(Math.abs(a-b)<=tol, 'probability mismatch: '+a+' vs '+b);
const fixtures = [...schedule.matches].sort((a,b)=>a.matchNumber-b.matchNumber);
const { source } = historyDoc;

const rows = fixtures.map(fixture => {
  const p = predict(history, { home: fixture.homeTeam, away: fixture.awayTeam, date: fixture.date });
  const homeTarget = canonical(fixture.homeTeam);
  const awayTarget = canonical(fixture.awayTeam);
  const prior = history.filter(m => m.date < fixture.date && Number.isFinite(m.home_goals) && Number.isFinite(m.away_goals));
  const homePrior = prior.filter(m => canonical(m.home)===homeTarget || canonical(m.away)===homeTarget).slice(-12);
  const awayPrior = prior.filter(m => canonical(m.home)===awayTarget || canonical(m.away)===awayTarget).slice(-12);
  assert.equal(homePrior.length, 12, '12 prior matches required for '+fixture.homeTeam);
  assert.equal(awayPrior.length, 12, '12 prior matches required for '+fixture.awayTeam);
  assert.equal(p.historyHomeMatches, 12);
  assert.equal(p.historyAwayMatches, 12);
  return {
    schemaVersion: 1,
    product: 'toto13',
    round: 1676,
    matchNumber: fixture.matchNumber,
    predictionId: 'toto-1676-chatgpt-score-shared-'+String(fixture.matchNumber).padStart(2,'0')+'-v1-'+timestampTag,
    modelName: 'ChatGPT',
    modelVersion,
    predictionConfirmedAt: generatedAtUtc,
    deadlineAt,
    homeTeam: fixture.homeTeam,
    awayTeam: fixture.awayTeam,
    homeExpectedGoals: round8(p.homeExpectedGoals),
    awayExpectedGoals: round8(p.awayExpectedGoals),
    homeGoalProbabilities: p.homeGoalProbabilities.map(round8),
    awayGoalProbabilities: p.awayGoalProbabilities.map(round8),
    outcomeProbabilities: {
      '1': round8(p.probabilities['1']),
      '0': round8(p.probabilities['0']),
      '2': round8(p.probabilities['2'])
    },
    historyHomeMatches: p.historyHomeMatches,
    historyAwayMatches: p.historyAwayMatches,
    historyMatchesPerTeam: 12,
    revisionOf: null,
    dataSource: 'GPT model.js predict(history, fixture); history from '+source.name+' ('+source.url+'), fetchedAt '+historyDoc.updatedAt+'. Community mirror, not official J.League publication-time feed.',
    notes: 'V1 independent Poisson baseline only. No market blend, no injury/suspension/availability/lineup adjustment. Team-news audit is incomplete and explicitly not applied.'
  };
});

assert.equal(rows.length, 13);
assert.equal(new Set(rows.map(x=>x.predictionId)).size, 13);
assert.deepEqual(rows.map(x=>x.matchNumber), Array.from({length:13},(_,i)=>i+1));
assert.ok(rows.every(x=>x.product==='toto13' && x.round===1676 && x.revisionOf===null));
assert.ok(rows.every(x=>!('marketBlend' in x) && !('marketWeights' in x)));
for (const row of rows) {
  close(row.homeGoalProbabilities.reduce((a,b)=>a+b,0),1,1e-7);
  close(row.awayGoalProbabilities.reduce((a,b)=>a+b,0),1,1e-7);
  close(Object.values(row.outcomeProbabilities).reduce((a,b)=>a+b,0),1,1e-7);
  assert.equal(row.predictionConfirmedAt, generatedAtUtc);
  assert.equal(row.deadlineAt, deadlineAt);
}
assert.ok(Date.parse(generatedAtUtc) < Date.parse(deadlineAtUtc), 'generation must be before deadline');

const rowsText = rows.map(x=>JSON.stringify(x)).join('\n')+'\n';
const rowsSha256 = crypto.createHash('sha256').update(rowsText).digest('hex');
const manifest = {
  schemaVersion: 1,
  product: 'toto13',
  round: 1676,
  predictionVersion: 'V1',
  status: 'generated_by_pinned_gpt_model_pending_saved_pr_ci',
  generatedAtJst,
  generatedAtUtc,
  deadlineAt,
  deadlineAtUtc,
  model: {
    repository: 'sigulun555-lab/gpt',
    commit: gptHead,
    path: 'model.js',
    blobSha: expected.modelBlob,
    function: 'predict(history, fixture)',
    version: modelVersion
  },
  input: {
    repository: 'sigulun555-lab/gpt',
    commit: gptHead,
    historyPath: 'data/history.json',
    historyBlobSha: expected.historyBlob,
    historyRows: history.length,
    latestResultDate: '2026-11-28',
    fetchedAt: historyDoc.updatedAt,
    sourceUrl: source.url,
    sourceName: source.name,
    sourceKind: source.kind,
    teamAliasesPath: 'data/team_aliases.json',
    teamAliasesBlobSha: expected.aliasesBlob,
    parserPath: 'scripts/auto_pipeline.js',
    parserBlobSha: expected.parserBlob,
    dateSorted: true
  },
  officialSchedule: {
    sourceUrl: scheduleManifest.sourceUrl,
    pageDisplayedAt: scheduleManifest.pageDisplayedAt,
    retrievedAt: scheduleManifest.retrievedAt,
    snapshotBranch: scheduleManifest.snapshotBranch,
    snapshotCommit: scheduleManifest.snapshotCommit,
    snapshotManifestPath: 'reports/round_1676_schedule_manifest.json',
    snapshotManifestBlobSha: expected.scheduleManifestBlob,
    snapshotSchedulePath: 'data/schedule/round_1676.json',
    snapshotScheduleBlobSha: expected.scheduleBlob,
    fixtureCount: 13
  },
  officialFixtures: scheduleManifest.fixtures,
  teamNewsAudit: {
    path: 'reports/round_1676_toto13_team_news_audit_20261128T1905JST.json',
    blobSha: expected.teamNewsBlob,
    checkedAt: teamNews.checkedAt,
    teamsQueried: teamNews.teamsQueried,
    coverageComplete: teamNews.all26AvailabilityFullyVerified,
    officialStartingLineupsPublished: teamNews.officialStartingLineupsPublished,
    appliedToV1: teamNews.appliedToV1
  },
  marketSnapshot: {
    used: false,
    eligibleForV2: false,
    freshnessGateSeconds: 300,
    note: 'V2 requires a separate official toto13 vote-share capture with voteStatusUpdatedAt age <=300 seconds; current page display time is not sufficient.'
  },
  predictionFile: {
    path: 'predictions/round_1676_ChatGPT_shared_score_v1.jsonl',
    rows: rows.length,
    revisionRows: 0,
    revisionOfLinks: 0,
    marketBlend: false,
    sha256: rowsSha256
  },
  teamWindows: fixtures.map(f => {
    const row = rows.find(x=>x.matchNumber===f.matchNumber);
    return {matchNumber:f.matchNumber,homeTeam:f.homeTeam,awayTeam:f.awayTeam,homePriorMatches:row.historyHomeMatches,awayPriorMatches:row.historyAwayMatches,historyCutoffExclusive:f.date};
  }),
  limitations: [
    'history.json is a community mirror snapshot, not an official J.League publication-time feed.',
    'All 540 history rows share one fetchedAt timestamp; first-known historical availability is not proven.',
    'Team-news audit is incomplete: absence of a found notice is not evidence of full availability.',
    'Official starting lineups were not published/found at the audit time; no injury or lineup adjustment was applied.',
    'Cerezo club schedule page conflicts with the official toto/J.League 12/5 date; official lottery card and J.League schedule were used.'
  ]
};

fs.mkdirSync(artifactDir,{recursive:true});
fs.writeFileSync(path.join(artifactDir,'predictions.jsonl'),rowsText);
fs.writeFileSync(path.join(artifactDir,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');

const savedRowsExists=fs.existsSync(savedRowsPath);
const savedManifestExists=fs.existsSync(savedManifestPath);
if (savedRowsExists || savedManifestExists) {
  assert.ok(savedRowsExists && savedManifestExists, 'saved V1 rows and manifest must appear together');
  const savedRows=fs.readFileSync(savedRowsPath,'utf8');
  const savedManifest=JSON.parse(fs.readFileSync(savedManifestPath,'utf8'));
  assert.equal(savedRows,rowsText,'saved V1 rows must reproduce exactly from pinned model and inputs');
  assert.deepEqual(savedManifest,manifest,'saved V1 manifest must reproduce exactly');
}
process.stdout.write(JSON.stringify({
  product:'toto13',round:1676,rows:rows.length,generatedAtUtc,deadlineAt,
  gptCommit:gptHead,historyRows:history.length,latestResultDate:'2026-11-28',
  modelBlob:expected.modelBlob,historyBlob:expected.historyBlob,
  scheduleBlob:expected.scheduleBlob,teamNewsCoverageComplete:false,
  savedV1Verified:savedRowsExists&&savedManifestExists,
  marketBlend:false,miniTotoPredictionsGenerated:false,totoGOAL3PredictionsGenerated:false
},null,2)+'\n');
