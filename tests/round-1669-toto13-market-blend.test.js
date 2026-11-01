'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const logPath = path.join(__dirname, '..', 'predictions', 'round_1669_ChatGPT_shared_score_v2.jsonl');
const snapshotPath = path.join(__dirname, '..', 'reports', 'round_1669_toto13_official_market_snapshot_20261102T0508JST.json');
const rows = fs.readFileSync(logPath, 'utf8').trim().split(/\\r?\\n/).map(JSON.parse);
const snapshot = JSON.parse(fs.readFileSync(snapshotPath, 'utf8'));

test('round 1669 V2 uses official market outcome keys 0=draw, 1=home, 2=away', () => {
  assert.equal(snapshot.round, 1669);
  assert.deepEqual(snapshot.outcomeKeyOrder, { '0': 'draw', '1': 'home_win', '2': 'away_win' });
  assert.equal(snapshot.rows.length, 13);
  assert.equal(snapshot.totalVotes, 177130);

  const latestByMatch = new Map();
  for (const row of rows) latestByMatch.set(row.matchNumber, row);
  assert.equal(latestByMatch.size, 13);

  for (const market of snapshot.rows) {
    const row = latestByMatch.get(market.matchNumber);
    assert.ok(row, `missing V2 row for match ${market.matchNumber}`);
    assert.deepEqual(row.marketVoteShare, market.marketVoteShare);
    assert.equal(row.marketVoteShare['0'], market.displayedVoteSharePercent.draw / 100);
    assert.equal(row.marketVoteShare['1'], market.displayedVoteSharePercent.home / 100);
    assert.equal(row.marketVoteShare['2'], market.displayedVoteSharePercent.away / 100);
    assert.equal(market.voteCounts.home + market.voteCounts.draw + market.voteCounts.away, market.voteCounts.total);
    assert.equal(market.voteCounts.total, snapshot.totalVotes);

    const previous = rows.find(x => x.predictionId === row.revisionOf);
    assert.ok(previous, `missing revisionOf target for match ${market.matchNumber}`);
    assert.equal(previous.matchNumber, row.matchNumber);
    assert.equal(previous.modelVersion, row.modelVersion);

    for (const key of ['0', '1', '2']) {
      const expected = Number((0.3 * row.baseModelOutcomeProbabilities[key] + 0.7 * row.marketVoteShare[key]).toFixed(8));
      assert.equal(row.outcomeProbabilities[key], expected);
    }
    const sum = Object.values(row.outcomeProbabilities).reduce((a, b) => a + b, 0);
    assert.ok(Math.abs(sum - 1) <= 2e-8);
    assert.equal(row.marketOfficialDisplayAt, snapshot.sourceDisplayedAt);
    assert.ok(Date.parse(row.predictionConfirmedAt) < Date.parse(row.deadlineAt));
  }
});
