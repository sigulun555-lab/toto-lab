'use strict';
const assert = require('node:assert/strict');
const { buildRecords } = require('../scripts/sync_gpt_goal3.js');
const snapshot = {
  generatedAt: '2026-10-29T05:45:17.396Z', round: 1668, deadline: '2026-10-31T13:50:00+09:00',
  predictions: [
    { number: 1, marketType: 'totoGOAL3', prediction: { canonicalHome: '岡山', canonicalAway: 'FC東京', homeGoalProbabilities: [0.5, 0.3, 0.15, 0.05], awayGoalProbabilities: [0.1, 0.2, 0.3, 0.4] } },
    { number: 2, marketType: 'totoGOAL3', prediction: { canonicalHome: '神戸', canonicalAway: '名古屋', homeGoalProbabilities: [0.1, 0.2, 0.3, 0.4], awayGoalProbabilities: [0.4, 0.3, 0.2, 0.1] } },
    { number: 3, marketType: 'totoGOAL3', prediction: { canonicalHome: '柏', canonicalAway: '浦和', homeGoalProbabilities: [0.1, 0.1, 0.2, 0.6], awayGoalProbabilities: [0.2, 0.3, 0.3, 0.2] } }
  ]
};
const original = Array.from({ length: 6 }, (_, i) => ({
  predictionId: 'old-' + i, round: 1668, matchNumber: Math.floor(i / 2) + 1,
  marketType: 'totoGOAL3', modelName: 'ChatGPT', team: 'team-' + i, isHome: i % 2 === 0,
  predictionConfirmedAt: '2026-10-28T22:33:30.811Z', revisionOf: null
}));
const result = buildRecords(snapshot, original);
assert.equal(result.records.length, 6);
assert.equal(result.records.filter(x => x.revisionOf).length, 6);
assert.equal(new Set(result.records.map(x => x.matchNumber + ':' + x.isHome)).size, 6);
assert.ok(result.records.every(x => Math.abs(Object.values(x.probabilities).reduce((a, b) => a + b, 0) - 1) < 1e-8));
assert.equal(result.records[0].probabilities['0'], 0.5, 'probabilities are copied, not recalculated');
assert.equal(buildRecords(snapshot, original.concat(result.records)).records.length, 0, 'same timestamp is idempotent');
assert.throws(() => buildRecords({ ...snapshot, generatedAt: '2026-11-01T00:00:00Z' }, original), /sales deadline/);
assert.throws(() => buildRecords({ ...snapshot, predictions: snapshot.predictions.slice(0, 2) }, original), /Expected 3/);
console.log('OK - GPT GOAL3 sync appends six revisions, preserves probabilities, is idempotent, and rejects post-deadline snapshots');

const fs = require('node:fs');
const path = require('node:path');
const syncWorkflow = fs.readFileSync(path.join(__dirname, '..', '.github/workflows/sync-gpt-goal3.yml'), 'utf8');
assert.ok(syncWorkflow.includes('id: sync_changes'), 'workflow must expose the synchronization change detector');
assert.ok(syncWorkflow.includes('git status --porcelain -- predictions/'), 'workflow must detect tracked and untracked prediction changes');
assert.ok(syncWorkflow.includes("if: steps.sync_changes.outputs.changed == 'true'"), 'no-op runs must skip branch publishing and PR updates');
assert.ok(syncWorkflow.includes('git merge --no-edit -X theirs origin/main'), 'existing sync branch must merge current main before publishing');
assert.ok(syncWorkflow.includes('git push origin "HEAD:refs/heads/$SYNC_BRANCH"'), 'publishing must push the fetched branch fast-forward only');
assert.ok(!syncWorkflow.includes('force-with-lease'), 'workflow must not use force-with-lease');
assert.ok(!syncWorkflow.includes('peter-evans/create-pull-request'), 'workflow must not use a force-updating PR action');
assert.ok(syncWorkflow.includes('github.rest.pulls.create'), 'workflow must create a PR only when no open sync PR exists');
assert.ok(syncWorkflow.includes('github.rest.pulls.update'), 'workflow must update the existing open sync PR');
console.log('OK - no-op runs skip publishing; existing sync branch uses a normal fast-forward-only push and PR deduplication');
