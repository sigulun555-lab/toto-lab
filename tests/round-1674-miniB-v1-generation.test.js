'use strict';
const test = require('node:test');
const before = require('node:test').before;
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {execFileSync} = require('node:child_process');
const {validatePrediction} = require('../scripts/validate_prediction.js');
const root = path.resolve(__dirname, '..');
const gptDir = path.join(root, 'gpt-source');
const toto13Dir = path.join(root, 'toto13-source');
const gptCommit = '1e10fa09da1a9dc71feb2ab6e4d1f09cf16dfaef';
const toto13Commit = 'e5ca5ff2bc08119b9bc591daa282130513d5098b';
const predictionPath = path.join(root, 'predictions/round_1674_ChatGPT_miniB.jsonl');
const manifestPath = path.join(root, 'reports/round_1674_miniB_v1_manifest.json');
let rows = [];
let manifest = null;
function ensureCheckout(repo, dir, sha) {
  if (!fs.existsSync(path.join(dir, '.git'))) {
    execFileSync('git', ['clone', '--filter=blob:none', '--no-checkout', 'https://github.com/' + repo + '.git', dir], {cwd:root, stdio:'inherit'});
  }
  execFileSync('git', ['-C', dir, 'fetch', '--depth=1', 'origin', sha], {cwd:root, stdio:'inherit'});
  execFileSync('git', ['-C', dir, 'checkout', '--detach', sha], {cwd:root, stdio:'inherit'});
}
before(() => {
  ensureCheckout('sigulun555-lab/gpt', gptDir, gptCommit);
  ensureCheckout('sigulun555-lab/toto-lab', toto13Dir, toto13Commit);
  const hasPrediction = fs.existsSync(predictionPath);
  const hasManifest = fs.existsSync(manifestPath);
  assert.equal(hasPrediction, hasManifest, 'prediction and manifest must be committed together');
  const generator = path.join(root, 'tools/generate_round_1674_miniB_v1.js');
  execFileSync(process.execPath, [generator, ...(hasPrediction ? ['--verify'] : [])], {cwd:root, stdio:'inherit'});
  rows = fs.readFileSync(predictionPath, 'utf8').trim().split(/\r?\n/).filter(Boolean).map(JSON.parse);
  manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  console.log('BEGIN_PREDICTION_JSONL');
  process.stdout.write(fs.readFileSync(predictionPath, 'utf8'));
  console.log('END_PREDICTION_JSONL');
  console.log('BEGIN_MANIFEST_JSON');
  process.stdout.write(fs.readFileSync(manifestPath, 'utf8'));
  console.log('END_MANIFEST_JSON');
});
test('mini toto B round 1674 uses a separate five-match product file and correct toto13 crosswalk', () => {
  assert.equal(rows.length, 5);
  assert.equal(new Set(rows.map(r => r.predictionId)).size, 5);
  assert.equal(manifest.round, 1674);
  assert.equal(manifest.product, 'mini toto B');
  assert.deepEqual(manifest.productMatchNumbers, [1,2,3,4,5]);
  assert.deepEqual(manifest.toto13MatchNumbers, [6,7,8,9,10]);
  assert.deepEqual(rows.map(r => r.matchNumber), [6,7,8,9,10]);
  assert.equal(manifest.matchNumberSpaceInPredictionRecords, 'regular-toto13');
});
test('mini toto B rows pass the existing schema and pinned-source reproducibility checks', () => {
  const seen = new Set();
  for (const row of rows) {
    const result = validatePrediction(row, seen);
    assert.equal(result.ok, true, result.errors.join('; '));
    assert.deepEqual(result.warnings, []);
    seen.add(row.predictionId);
    assert.equal(row.round, 1674);
    assert.equal(row.modelName, 'ChatGPT');
    assert.equal(row.revisionOf, null);
    assert.equal(row.predictionConfirmedAt, manifest.generatedAt);
    assert.equal(row.deadlineAt, '2026-11-25T09:50:00.000Z');
    assert.ok(Math.abs(Object.values(row.probabilities).reduce((a,b)=>a+b,0)-1) <= 1e-7);
    assert.ok(Object.values(row.probabilities).every(x => Number.isFinite(x) && x >= 0 && x <= 1));
  }
  assert.equal(manifest.officialSchedule.sourceFileTimestampValid, false);
  assert.equal(manifest.officialSchedule.sourceFileFutureOffsetSeconds, 29538);
  assert.equal(manifest.model.commit, gptCommit);
  assert.equal(manifest.model.blobSha, '20cde0fc85016db3ef7abac7d2bb485510ba4e22');
  assert.equal(manifest.input.historyBlobSha, '1a6a3230330ef67468755faf8504cac1a9741570');
  assert.equal(manifest.crossCheckAgainstToto13V1Revision.matchesCompared, 5);
  assert.ok(manifest.crossCheckAgainstToto13V1Revision.maxAbsProbabilityDelta <= 1e-8);
  assert.equal(manifest.market.v2Status, 'held_no_fresh_product_specific_official_vote_snapshot');
  assert.equal(manifest.teamNewsAudit.coverage.all26ClubInjuryAndAvailabilityStatusesFullyVerified, false);
  assert.equal(manifest.safety.mainChanged, false);
});
