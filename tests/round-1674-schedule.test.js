'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const root = path.resolve(__dirname, '..');
const currentBytes = fs.readFileSync(path.join(root, 'data/schedule/round_1674.json'));
const previousBytes = fs.readFileSync(path.join(root, 'data/schedule/round_1674_20261118_superseded.json'));
const current = JSON.parse(currentBytes.toString('utf8'));
const previous = JSON.parse(previousBytes.toString('utf8'));

function gitBlobSha(bytes) {
  return crypto.createHash('sha1')
    .update(Buffer.concat([Buffer.from(`blob ${bytes.length}\0`), bytes]))
    .digest('hex');
}

test('round 1674 later official observation preserves the same 13 fixture pairs', () => {
  assert.equal(current.round, 1674);
  assert.equal(current.marketType, 'toto');
  assert.equal(current.deadline, '2026-11-25T18:50:00+09:00');
  assert.equal(current.fixtures.length, 13);
  assert.equal(previous.matches.length, 13);

  const oldByNumber = new Map(previous.matches.map(match => [
    match.matchNumber,
    [match.homeTeam, match.awayTeam],
  ]));
  const changed = [];
  const unchanged = [];
  for (const fixture of current.fixtures) {
    const oldPair = oldByNumber.get(fixture.number);
    assert.ok(oldPair, `missing previous match ${fixture.number}`);
    const currentPair = [fixture.officialHome, fixture.officialAway];
    if (oldPair[0] === currentPair[0] && oldPair[1] === currentPair[1]) unchanged.push(fixture.number);
    else changed.push(fixture.number);
  }

  assert.deepEqual(changed, []);
  assert.deepEqual(unchanged, Array.from({ length: 13 }, (_, i) => i + 1));
  assert.deepEqual(current.source.changedMatchNumbers, changed);
  assert.deepEqual(current.source.unchangedMatchNumbers, unchanged);
  assert.match(previous.supersededReason, /fixture pairs are identical/i);
});

test('round 1674 product partitions remain separate and explicit', () => {
  assert.deepEqual(current.productCards.toto13.matchNumbers, Array.from({ length: 13 }, (_, i) => i + 1));
  assert.deepEqual(current.productCards.miniTotoA.matchNumbers, [1, 2, 3, 4, 5]);
  assert.deepEqual(current.productCards.miniTotoB.matchNumbers, [6, 7, 8, 9, 10]);
  assert.deepEqual(current.productCards.totoGOAL3.matchNumbers, [1, 2, 3]);
});

test('snapshot provenance distinguishes original and preserved previous blobs', () => {
  const previousRef = current.source.previousSnapshot;
  assert.equal(previousRef.originalPath, 'data/schedule/round_1674.json');
  assert.equal(previousRef.path, 'data/schedule/round_1674_20261118_superseded.json');
  assert.equal(previousRef.commit, '0749e19b210ea97a612284eb77e233ee385db724');
  assert.equal(previousRef.blobSha, '2d7226d17512b97b07ce630a22212e3bc9d71265');
  assert.equal(previousRef.preservedBlobSha, gitBlobSha(previousBytes));
});
