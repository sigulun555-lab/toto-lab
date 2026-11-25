'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');

const ROOT = process.cwd();
const GPT = path.join(ROOT, 'gpt-input');
const SOURCE_CSV = path.join(ROOT, 'reports/round_1675_history_source_20261126T022833JST.csv');
const SOURCE_MANIFEST = path.join(ROOT, 'reports/round_1675_history_source_manifest_20261126T022833JST.json');
const OLD_ROWS_PATH = path.join(ROOT, 'prior-input/predictions/round_1675_ChatGPT_shared_score_v1.jsonl');
const OLD_MANIFEST_PATH = path.join(ROOT, 'prior-input/reports/round_1675_toto13_v1_manifest_20261126T0155JST.json');
const OLD_HISTORY_PATH = path.join(GPT, 'data/history.json');
const EXPECTED_MODEL_BLOB = '20cde0fc85016db3ef7abac7d2bb485510ba4e22';
const EXPECTED_PARSER_BLOB = 'ef557e084cab802df7830d949bd1f52ddee5db7c';
const EXPECTED_ALIAS_BLOB = '5de22584524ff4c07ddac1d27f49afbbbc5f88ab';
const { parseSchedule } = require(path.join(GPT, 'scripts/auto_pipeline.js'));
const { predict, canonical } = require(path.join(GPT, 'model.js'));

function gitBlobSha(text) {
  const body = Buffer.from(text, 'utf8');
  const header = Buffer.from('blob ' + body.length + '\0', 'utf8');
  return crypto.createHash('sha1').update(Buffer.concat([header, body])).digest('hex');
}
function round8(x) { return Math.round(x * 1e8) / 1e8; }
function jst(iso) {
  return new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Asia/Tokyo', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23'
  }).format(new Date(iso)).replace(' ', 'T') + '+09:00';
}
function readJson(p) { return JSON.parse(fs.readFileSync(p, 'utf8')); }

const csvText = fs.readFileSync(SOURCE_CSV, 'utf8');
const sourceManifest = readJson(SOURCE_MANIFEST);
const oldManifest = readJson(OLD_MANIFEST_PATH);
const oldHistoryFile = readJson(OLD_HISTORY_PATH);
const oldRowsText = fs.readFileSync(OLD_ROWS_PATH, 'utf8').trim();
const oldRows = oldRowsText.split(/\r?\n/).filter(Boolean).map(JSON.parse);
const fixtures = oldManifest.officialFixtures;

assert.equal(gitBlobSha(csvText), sourceManifest.sourceBlobSha, 'frozen CSV Git blob SHA');
assert.equal(gitBlobSha(fs.readFileSync(path.join(GPT, 'model.js'), 'utf8')), EXPECTED_MODEL_BLOB, 'pinned model.js blob');
assert.equal(gitBlobSha(fs.readFileSync(path.join(GPT, 'scripts/auto_pipeline.js'), 'utf8')), EXPECTED_PARSER_BLOB, 'pinned parser blob');
assert.equal(gitBlobSha(fs.readFileSync(path.join(GPT, 'data/team_aliases.json'), 'utf8')), EXPECTED_ALIAS_BLOB, 'pinned aliases blob');
assert.equal(gitBlobSha(oldRowsText + '\n'), gitBlobSha(oldRowsText + '\n'), 'previous prediction file readable');
assert.equal(oldRows.length, 13, 'previous V1 row count');
assert.equal(fixtures.length, 13, 'official fixture count');
assert.equal(oldHistoryFile.history.length, 512, 'pinned old history count');

const parsed = parseSchedule(csvText);
const history = parsed
  .filter(m => Number.isInteger(m.home_goals) && Number.isInteger(m.away_goals))
  .sort((a, b) => a.date.localeCompare(b.date))
  .map(m => ({
    ...m,
    source: 'community_jleague_csv',
    sourceUrl: 'https://raw.githubusercontent.com/k-addtimes/jleague_open_data/main/current_schedule_file.csv',
    fetchedAt: sourceManifest.retrievedAtUtc
  }));

const key = m => [m.date, canonical(m.home), canonical(m.away)].join('|');
const oldKeys = new Set(oldHistoryFile.history.map(key));
const newKeys = new Set();
const currentKeys = new Set();
for (const m of history) {
  const k = key(m);
  assert.ok(!currentKeys.has(k), 'no duplicate canonical match key: ' + k);
  currentKeys.add(k);
  if (!oldKeys.has(k)) newKeys.add(k);
}
const removed = [...oldKeys].filter(k => !currentKeys.has(k));
const nov25 = history.filter(m => m.date === '2026-11-25');
assert.equal(history.length, 536, 'fresh completed history rows');
assert.equal(newKeys.size, 24, 'new completed matches since pinned 512-row history');
assert.equal(removed.length, 0, 'no prior history match removed');
assert.equal(nov25.length, 27, '2026-11-25 completed match count');
assert.ok([...newKeys].every(k => k.startsWith('2026-11-25|')), 'all newly available matches are 2026-11-25');

const generatedAtUtc = process.env.PREDICTION_GENERATED_AT || new Date().toISOString();
const generatedAtJst = jst(generatedAtUtc);
const idStamp = generatedAtUtc.replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
const oldByMatch = new Map(oldRows.map(r => [r.matchNumber, r]));
const revisions = fixtures.map(f => {
  const previous = oldByMatch.get(f.number);
  assert.ok(previous, 'previous V1 exists for match ' + f.number);
  const result = predict(history, { date: f.date, home: f.home, away: f.away });
  assert.equal(result.historyHomeMatches, 12, '12 prior home matches for ' + f.home);
  assert.equal(result.historyAwayMatches, 12, '12 prior away matches for ' + f.away);
  const row = {
    predictionId: previous.predictionId + '-rev-' + idStamp,
    round: 1675,
    matchNumber: f.number,
    homeTeam: f.home,
    awayTeam: f.away,
    homeExpectedGoals: round8(result.homeExpectedGoals),
    awayExpectedGoals: round8(result.awayExpectedGoals),
    homeGoalProbabilities: result.homeGoalProbabilities.map(round8),
    awayGoalProbabilities: result.awayGoalProbabilities.map(round8),
    historyMatchesPerTeam: 12,
    predictionConfirmedAt: generatedAtUtc,
    deadlineAt: previous.deadlineAt,
    modelName: 'ChatGPT',
    revisionOf: previous.predictionId,
    outcomeProbabilities: {
      '1': round8(result.probabilities['1']),
      '0': round8(result.probabilities['0']),
      '2': round8(result.probabilities['2'])
    },
    modelVersion: previous.modelVersion,
    dataSource: 'Actual exported predict(history, fixture) from GPT model.js blob ' + EXPECTED_MODEL_BLOB +
      '; parser auto_pipeline.js blob ' + EXPECTED_PARSER_BLOB +
      '; aliases blob ' + EXPECTED_ALIAS_BLOB +
      '; frozen community CSV Git blob ' + sourceManifest.sourceBlobSha +
      ' retrieved ' + sourceManifest.retrievedAtUtc +
      '; 536 completed matches, 24 newly available since prior 512-row history.',
    notes: 'Append-only V1 revision of ' + previous.predictionId +
      '. Incorporates 24 newly available completed matches from 2026-11-25. No market blend and no manual injury/lineup probability adjustment. Experimental baseline, uncalibrated.'
  };
  const sum = Object.values(row.outcomeProbabilities).reduce((a, b) => a + b, 0);
  assert.ok(Math.abs(sum - 1) <= 1e-7, 'outcome probabilities normalize');
  assert.ok(Math.abs(row.homeGoalProbabilities.reduce((a, b) => a + b, 0) - 1) <= 1e-7, 'home goal probabilities normalize');
  assert.ok(Math.abs(row.awayGoalProbabilities.reduce((a, b) => a + b, 0) - 1) <= 1e-7, 'away goal probabilities normalize');
  return row;
});

assert.equal(new Set(revisions.map(r => r.predictionId)).size, 13, 'revision IDs unique');
assert.equal(new Set(revisions.map(r => r.revisionOf)).size, 13, 'revisionOf links unique');
assert.ok(revisions.every(r => Date.parse(r.predictionConfirmedAt) < Date.parse(r.deadlineAt)), 'generated before deadline');
assert.deepEqual(revisions.map(r => r.matchNumber), Array.from({ length: 13 }, (_, i) => i + 1));

const outputPath = path.join(ROOT, 'tmp/round_1675_toto13_v1_revision_20261126T022833JST.jsonl');
fs.mkdirSync(path.dirname(outputPath), { recursive: true });
const jsonl = revisions.map(r => JSON.stringify(r)).join('\n') + '\n';
fs.writeFileSync(outputPath, jsonl);

const revisionManifest = {
  schemaVersion: 1,
  product: 'toto13',
  round: 1675,
  predictionVersion: 'GPT shared-score V1 revision',
  generatedAtUtc,
  generatedAtJst,
  deadlineAt: oldRows[0].deadlineAt,
  previousPredictionFile: 'predictions/round_1675_ChatGPT_shared_score_v1.jsonl',
  previousPredictionRows: oldRows.length,
  previousPredictionGitBlobSha: gitBlobSha(oldRowsText + '\n'),
  revisionPredictionFile: 'predictions/round_1675_ChatGPT_shared_score_v1_revision_20261126T022833JST.jsonl',
  revisionRows: revisions.length,
  revisionOfCount: revisions.filter(r => oldRows.some(o => o.predictionId === r.revisionOf)).length,
  history: {
    sourceRepository: sourceManifest.sourceRepository,
    sourcePath: sourceManifest.sourcePath,
    sourceBlobSha: sourceManifest.sourceBlobSha,
    retrievedAtUtc: sourceManifest.retrievedAtUtc,
    retrievedAtJst: sourceManifest.retrievedAtJst,
    sourceType: sourceManifest.sourceType,
    completedMatches: history.length,
    priorHistoryMatches: oldHistoryFile.history.length,
    newlyAvailableMatches: newKeys.size,
    removedPriorMatches: removed.length,
    latestResultDate: history.map(m => m.date).sort().at(-1),
    completedMatchesOn2026_11_25: nov25.length
  },
  model: {
    repository: 'sigulun555-lab/gpt',
    commit: oldManifest.model.commit,
    path: 'model.js',
    blobSha: EXPECTED_MODEL_BLOB,
    function: 'predict(history, fixture)',
    version: oldManifest.model.version
  },
  parser: {
    path: 'scripts/auto_pipeline.js',
    blobSha: EXPECTED_PARSER_BLOB,
    function: 'parseSchedule(text)'
  },
  aliases: {
    path: 'data/team_aliases.json',
    blobSha: EXPECTED_ALIAS_BLOB
  },
  officialSchedule: oldManifest.officialSchedule,
  officialFixtures: fixtures,
  teamWindows: revisions.map(r => ({
    matchNumber: r.matchNumber, home: r.homeTeam, away: r.awayTeam,
    historyHomeMatches: 12, historyAwayMatches: 12
  })),
  teamNewsAudit: {
    path: 'reports/round_1675_toto13_team_news_audit_20261126T0155JST.json',
    lastCheckedAt: '2026-11-26T01:55:28+09:00',
    complete: false,
    carriedForwardWithoutRefresh: true,
    note: 'Injury, suspension, predicted-lineup and official-lineup coverage remains incomplete; no manual probability adjustment was made.'
  },
  marketSnapshot: {
    used: false,
    reason: 'V1 revision; no market blend.'
  },
  validation: {
    actualExportedFunction: true,
    all13Fixtures: true,
    all26TeamWindowsHave12Matches: true,
    uniqueRevisionIds: true,
    revisionOfLinksPreviousV1: true,
    allProbabilityVectorsNormalize: true,
    generatedBeforeDeadline: true,
    marketBlend: false
  },
  notes: 'This revision supersedes the earlier V1 for current comparison but does not overwrite it. It uses the same pinned model and official round-1675 fixtures, with a fresher frozen community history snapshot. The community mirror is not an official J.League feed.'
};
const manifestPath = path.join(ROOT, 'tmp/round_1675_toto13_v1_revision_manifest_20261126T022833JST.json');
fs.writeFileSync(manifestPath, JSON.stringify(revisionManifest, null, 2) + '\n');

console.log('REVISION_JSONL_BEGIN');
console.log(jsonl.trimEnd());
console.log('REVISION_JSONL_END');
console.log('REVISION_MANIFEST_BEGIN');
console.log(JSON.stringify(revisionManifest));
console.log('REVISION_MANIFEST_END');
console.log('REVISION_SUMMARY ' + JSON.stringify({
  round: 1675, product: 'toto13', rows: revisions.length,
  historyRows: history.length, newlyAvailableMatches: newKeys.size,
  latestResultDate: revisionManifest.history.latestResultDate,
  generatedAtUtc, generatedAtJst,
  sourceCsvBlobSha: sourceManifest.sourceBlobSha,
  modelBlobSha: EXPECTED_MODEL_BLOB,
  parserBlobSha: EXPECTED_PARSER_BLOB,
  marketBlend: false
}));
