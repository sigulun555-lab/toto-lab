#!/usr/bin/env node
'use strict';
const fs = require('node:fs');
const path = require('node:path');

function parseJsonl(file) {
  if (!fs.existsSync(file)) return [];
  return fs.readFileSync(file, 'utf8').split(/\r?\n/).filter(line => line.trim()).map((line, i) => {
    try { return JSON.parse(line); }
    catch (error) { throw new Error(file + ':' + (i + 1) + ': invalid JSON: ' + error.message); }
  });
}
function goalProbabilities(values, label) {
  if (!Array.isArray(values) || values.length !== 4 || values.some(x => !Number.isFinite(x) || x < 0 || x > 1)) {
    throw new Error(label + ': expected four finite goal-bucket probabilities in [0,1]');
  }
  const sum = values.reduce((a, b) => a + b, 0);
  if (Math.abs(sum - 1) > 0.002) throw new Error(label + ': probability sum is ' + sum + ', not 1');
  return { '0': values[0], '1': values[1], '2': values[2], '3': values[3] };
}
function buildRecords(snapshot, existing) {
  if (!snapshot || !Number.isInteger(snapshot.round) || !Array.isArray(snapshot.predictions)) throw new Error('GPT snapshot must include integer round and predictions array');
  const generatedAt = snapshot.generatedAt;
  const generatedMs = Date.parse(generatedAt);
  if (!Number.isFinite(generatedMs)) throw new Error('GPT snapshot generatedAt is missing or invalid');
  const targets = snapshot.predictions.filter(p => p.marketType === 'totoGOAL3');
  if (targets.length !== 3) throw new Error('Expected 3 totoGOAL3 fixtures; received ' + targets.length);
  const deadlineRaw = snapshot.deadline || (snapshot.totoSource && snapshot.totoSource.deadline);
  const deadlineMs = Date.parse(deadlineRaw);
  if (!Number.isFinite(deadlineMs)) throw new Error('GPT snapshot deadline is missing or invalid');
  if (generatedMs >= deadlineMs) throw new Error('Latest GPT snapshot was generated at/after the sales deadline; refusing to archive it as a pre-deadline prediction');
  const roundRecords = existing.filter(p => p.round === snapshot.round && p.marketType === 'totoGOAL3' && p.modelName === 'ChatGPT');
  const latestExistingMs = roundRecords.reduce((max, p) => Math.max(max, Date.parse(p.predictionConfirmedAt) || 0), 0);
  if (latestExistingMs >= generatedMs) return { records: [], reason: latestExistingMs === generatedMs ? 'snapshot already synchronized' : 'source snapshot is not newer than the archive' };
  const latestByKey = new Map();
  for (const record of roundRecords) {
    const key = record.matchNumber + ':' + (record.isHome ? 'home' : 'away');
    const current = latestByKey.get(key);
    if (!current || Date.parse(record.predictionConfirmedAt) > Date.parse(current.predictionConfirmedAt)) latestByKey.set(key, record);
  }
  const additions = [];
  const seenSides = new Set();
  for (const fixture of targets) {
    if (!Number.isInteger(fixture.number) || fixture.number < 1 || fixture.number > 3) throw new Error('Each fixture must have match number 1..3');
    const pred = fixture.prediction;
    if (!pred || typeof pred.canonicalHome !== 'string' || typeof pred.canonicalAway !== 'string') throw new Error('Fixture ' + fixture.number + ': missing canonical team names');
    for (const side of ['home', 'away']) {
      const isHome = side === 'home';
      const key = fixture.number + ':' + side;
      if (seenSides.has(key)) throw new Error('Duplicate target side ' + key);
      seenSides.add(key);
      const team = isHome ? pred.canonicalHome : pred.canonicalAway;
      const opponent = isHome ? pred.canonicalAway : pred.canonicalHome;
      const values = isHome ? pred.homeGoalProbabilities : pred.awayGoalProbabilities;
      const old = latestByKey.get(key);
      const timestampId = generatedAt.replace(/[-:]/g, '').replace(/\.\d{1,3}Z$/, 'Z');
      additions.push({
        predictionId: 'ChatGPT-gpt-poisson-goal-dist-v1-r' + snapshot.round + '-m' + fixture.number + '-' + side + '-sync-' + timestampId,
        round: snapshot.round, matchNumber: fixture.number, marketType: 'totoGOAL3',
        team, opponent, isHome, probabilities: goalProbabilities(values, key + ' ' + team),
        predictionConfirmedAt: generatedAt, deadlineAt: new Date(deadlineMs).toISOString(),
        modelName: 'ChatGPT', modelVersion: 'gpt-poisson-goal-dist-v1',
        revisionOf: old ? old.predictionId : null, sourceRetrievedAt: generatedAt,
        dataSource: 'Automatically synchronized from sigulun555-lab/gpt main data/predictions.json; original saved probabilities copied without recalculation.',
        notes: 'Append-only automated sync. Previous snapshots are retained. No market blend is inferred or applied by this sync job.'
      });
    }
  }
  if (seenSides.size !== 6) throw new Error('Expected six distinct home/away team targets; got ' + seenSides.size);
  const ids = new Set(existing.map(p => p.predictionId));
  for (const record of additions) if (ids.has(record.predictionId)) throw new Error('Duplicate predictionId: ' + record.predictionId);
  return { records: additions, reason: 'new snapshot synchronized' };
}
function sync(sourcePath, predictionsDir) {
  const snapshot = JSON.parse(fs.readFileSync(sourcePath, 'utf8'));
  const targetPath = path.join(predictionsDir, 'round_' + snapshot.round + '_ChatGPT_goal3.jsonl');
  const existing = parseJsonl(targetPath);
  const result = buildRecords(snapshot, existing);
  if (!result.records.length) {
    console.log(JSON.stringify({ changed: false, round: snapshot.round, generatedAt: snapshot.generatedAt, reason: result.reason }));
    return;
  }
  fs.mkdirSync(predictionsDir, { recursive: true });
  fs.appendFileSync(targetPath, result.records.map(r => JSON.stringify(r)).join('\n') + '\n', 'utf8');
  console.log(JSON.stringify({ changed: true, round: snapshot.round, generatedAt: snapshot.generatedAt, targetPath, appended: result.records.length, teams: result.records.map(r => r.team), revisionCount: result.records.filter(r => r.revisionOf).length }, null, 2));
}
if (require.main === module) {
  const sourcePath = process.argv[2];
  const predictionsDir = process.argv[3] || path.join(process.cwd(), 'predictions');
  if (!sourcePath) { console.error('Usage: node scripts/sync_gpt_goal3.js <gpt-data-predictions.json> [predictions-dir]'); process.exit(2); }
  try { sync(path.resolve(sourcePath), path.resolve(predictionsDir)); }
  catch (error) { console.error(error.message); process.exitCode = 1; }
}
module.exports = { buildRecords, sync };
