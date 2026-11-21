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
assert.ok(syncWorkflow.includes('git restore --worktree --staged -- predictions/'), 'publisher must restore generated tracked files before branch checkout');
assert.ok(syncWorkflow.includes('git clean -fd -- predictions/'), 'publisher must remove generated untracked files before branch checkout');
assert.ok(syncWorkflow.includes('git merge --no-edit -X theirs origin/main'), 'existing sync branch must merge current main before publishing');
assert.ok(syncWorkflow.includes('git push origin "HEAD:refs/heads/$SYNC_BRANCH"'), 'publishing must push the fetched branch fast-forward only');
assert.ok(!syncWorkflow.includes('force-with-lease'), 'workflow must not use force-with-lease');
assert.ok(!syncWorkflow.includes('peter-evans/create-pull-request'), 'workflow must not use a force-updating PR action');
assert.ok(syncWorkflow.includes('github.rest.pulls.list'), 'workflow must inspect existing sync PRs');
assert.ok(syncWorkflow.includes('if (open.length > 1)'), 'workflow must fail closed on duplicate open sync PRs');
assert.ok(syncWorkflow.includes('github.rest.pulls.create'), 'workflow must create a PR only when no open sync PR exists');
assert.ok(syncWorkflow.includes('github.rest.pulls.update'), 'workflow must update the existing open sync PR');
console.log('OK - no-op guard, checkout cleanup, fast-forward-only publishing, and PR deduplication are present');

const os = require('node:os');
const { execFileSync } = require('node:child_process');

function git(cwd, args, allowFailure = false) {
  try {
    return execFileSync('git', args, {
      cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe']
    }).trim();
  } catch (error) {
    if (allowFailure) {
      return {
        code: error.status ?? 1,
        stdout: error.stdout?.toString() ?? '',
        stderr: error.stderr?.toString() ?? ''
      };
    }
    throw error;
  }
}
function gitConfig(cwd) {
  git(cwd, ['config', 'user.name', 'GOAL3 Sync Integration Test']);
  git(cwd, ['config', 'user.email', 'goal3-sync-test@example.invalid']);
}
function writeText(cwd, file, value) {
  const target = path.join(cwd, file);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, value);
}
function gitLines(cwd, ref, file) {
  return git(cwd, ['show', ref + ':' + file]).split('\n').filter(Boolean);
}

function testFastForwardPublisherAgainstTemporaryRemote() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'goal3-sync-publisher-'));
  const remote = path.join(root, 'remote.git');
  const seed = path.join(root, 'seed');
  const work = path.join(root, 'work');
  const racer = path.join(root, 'racer');
  const file = 'predictions/round_1673_ChatGPT_goal3.jsonl';
  const branch = 'automation/sync-gpt-goal3';

  try {
    git(root, ['init', '--bare', '--initial-branch=main', remote]);
    fs.mkdirSync(seed);
    git(seed, ['init', '--initial-branch=main']);
    gitConfig(seed);
    writeText(seed, file, 'main-old\n');
    git(seed, ['add', '--', file]);
    git(seed, ['commit', '-m', 'initial main']);
    git(seed, ['remote', 'add', 'origin', remote]);
    git(seed, ['push', '-u', 'origin', 'main']);

    git(seed, ['checkout', '-b', branch]);
    writeText(seed, file, 'main-old\nbranch-old\n');
    git(seed, ['add', '--', file]);
    git(seed, ['commit', '-m', 'existing sync snapshot']);
    git(seed, ['push', '-u', 'origin', branch]);

    git(seed, ['checkout', 'main']);
    writeText(seed, file, 'main-old\nmain-new\n');
    writeText(seed, 'data/main-only.txt', 'main-only\n');
    git(seed, ['add', '--', file, 'data/main-only.txt']);
    git(seed, ['commit', '-m', 'main advanced independently']);
    git(seed, ['push', 'origin', 'main']);

    git(root, ['clone', '--branch', 'main', remote, work]);
    gitConfig(work);
    git(work, ['fetch', '--no-tags', 'origin', branch]);

    const existingBranchLines = gitLines(work, 'FETCH_HEAD', file);
    const mainLines = fs.readFileSync(path.join(work, file), 'utf8').split('\n').filter(Boolean);
    const union = [...new Set([...mainLines, ...existingBranchLines, 'source-new'])];
    writeText(work, file, union.join('\n') + '\n');
    const savedUnion = fs.readFileSync(path.join(work, file), 'utf8');

    git(work, ['restore', '--worktree', '--staged', '--', 'predictions/']);
    git(work, ['clean', '-fd', '--', 'predictions/']);
    git(work, ['fetch', '--no-tags', 'origin', 'main']);
    git(work, ['fetch', '--no-tags', 'origin', branch]);
    git(work, ['checkout', '-B', branch, 'FETCH_HEAD']);
    git(work, ['merge', '--no-edit', '-X', 'theirs', 'origin/main']);

    writeText(work, file, savedUnion);
    git(work, ['add', '--', file]);
    git(work, ['commit', '-m', 'publish verified append-only union']);
    git(work, ['push', 'origin', 'HEAD:refs/heads/' + branch]);
    git(work, ['fetch', 'origin', 'main']);

    const published = new Set(gitLines(work, 'origin/' + branch, file));
    for (const line of ['main-old', 'main-new', 'branch-old', 'source-new']) {
      assert.ok(published.has(line), 'published union must retain ' + line);
    }
    assert.ok(!gitLines(work, 'origin/main', file).includes('source-new'), 'publisher must not write source rows to main');
    assert.ok(!gitLines(work, 'origin/main', file).includes('branch-old'), 'sync branch rows must not leak into main');
    assert.ok(fs.existsSync(path.join(work, 'data/main-only.txt')), 'main-only files must survive branch reconciliation');

    writeText(work, file, fs.readFileSync(path.join(work, file), 'utf8') + 'late-local\n');
    git(work, ['add', '--', file]);
    git(work, ['commit', '-m', 'local update prepared']);

    git(root, ['clone', '--branch', branch, remote, racer]);
    gitConfig(racer);
    writeText(racer, file, fs.readFileSync(path.join(racer, file), 'utf8') + 'concurrent-remote\n');
    git(racer, ['add', '--', file]);
    git(racer, ['commit', '-m', 'concurrent remote advance']);
    git(racer, ['push', 'origin', branch]);

    const rejectedPush = git(work, ['push', 'origin', 'HEAD:refs/heads/' + branch], true);
    assert.notEqual(rejectedPush.code, 0, 'ordinary push must reject a concurrent remote advance');
    git(work, ['fetch', 'origin', branch]);
    const remoteAfterRace = new Set(gitLines(work, 'origin/' + branch, file));
    assert.ok(remoteAfterRace.has('concurrent-remote'), 'concurrent remote update must remain on remote');
    assert.ok(!remoteAfterRace.has('late-local'), 'stale local commit must not overwrite the concurrent update');

    console.log('OK - temporary remote test preserves main/PR/source rows, leaves main untouched, and rejects concurrent non-fast-forward push');
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}

testFastForwardPublisherAgainstTemporaryRemote();
