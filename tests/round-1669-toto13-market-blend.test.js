'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const dir = path.join(__dirname, '..');
const logPath = path.join(dir, 'predictions', 'round_1669_ChatGPT_shared_score_v2.jsonl');
const oldSnapshotPath = path.join(dir, 'reports', 'round_1669_toto13_official_market_snapshot_20261102T0508JST.json');
const snapshotPath = path.join(dir, 'reports', 'round_1669_toto13_official_market_snapshot_20261102T1548JST.json');
const latestSnapshotPath = path.join(dir, 'reports', 'round_1669_toto13_official_market_snapshot_20261102T2040JST.json');
const originalReportPath = path.join(dir, 'reports', 'round_1669_toto13_team_news_20261102.json');
const rows = fs.readFileSync(logPath, 'utf8').trim().split(/\r?\n/).map(JSON.parse);
const oldSnapshot = JSON.parse(fs.readFileSync(oldSnapshotPath, 'utf8'));
const snapshot = JSON.parse(fs.readFileSync(snapshotPath, 'utf8'));
const latestSnapshot = JSON.parse(fs.readFileSync(latestSnapshotPath, 'utf8'));
const originalReport = JSON.parse(fs.readFileSync(originalReportPath, 'utf8'));
const near = (actual, expected, tolerance = 1e-12) => assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} differs from ${expected}`);

function assertRevisionAgainstSnapshot(revisions, marketSnapshot) {
  assert.equal(revisions.length, 13);
  assert.equal(marketSnapshot.rows.length, 13);
  const latestByMatch = new Map(revisions.map(row => [row.matchNumber, row]));
  assert.equal(latestByMatch.size, 13);
  for (const market of marketSnapshot.rows) {
    const row = latestByMatch.get(market.matchNumber);
    assert.ok(row, `missing V2 row for match ${market.matchNumber}`);
    assert.deepEqual(row.marketVoteShare, market.marketVoteShare);
    near(row.marketVoteShare['0'], market.displayedVoteSharePercent.draw / 100);
    near(row.marketVoteShare['1'], market.displayedVoteSharePercent.home / 100);
    near(row.marketVoteShare['2'], market.displayedVoteSharePercent.away / 100);
    assert.equal(market.voteCounts.home + market.voteCounts.draw + market.voteCounts.away, market.voteCounts.total);
    assert.equal(market.voteCounts.total, marketSnapshot.totalVotes);
    const previous = rows.find(x => x.predictionId === row.revisionOf);
    assert.ok(previous, `missing revisionOf target for match ${market.matchNumber}`);
    assert.equal(previous.matchNumber, row.matchNumber);
    assert.equal(previous.modelVersion, row.modelVersion);
    assert.deepEqual(row.baseModelOutcomeProbabilities, previous.baseModelOutcomeProbabilities || previous.outcomeProbabilities);
    assert.deepEqual(row.homeGoalProbabilities, previous.homeGoalProbabilities);
    assert.deepEqual(row.awayGoalProbabilities, previous.awayGoalProbabilities);
    for (const key of ['0', '1', '2']) {
      const expected = Number((0.3 * row.baseModelOutcomeProbabilities[key] + 0.7 * row.marketVoteShare[key]).toFixed(8));
      assert.equal(row.outcomeProbabilities[key], expected);
    }
    const sum = Object.values(row.outcomeProbabilities).reduce((a, b) => a + b, 0);
    assert.ok(Math.abs(sum - 1) <= 2e-8);
    assert.equal(Date.parse(row.marketOfficialDisplayAt), Date.parse(marketSnapshot.sourceDisplayedAt));
    assert.equal(Date.parse(row.marketRetrievedAt), Date.parse(marketSnapshot.retrievedAt));
    assert.ok(Date.parse(row.predictionConfirmedAt) < Date.parse(row.deadlineAt));
  }
}

test('the original 00:17 market snapshot remains preserved', () => {
  const originalRows = rows.slice(0, 13);
  const sourceRows = originalReport.officialVoteSnapshot.rows;
  assert.equal(originalRows.length, 13);
  assert.equal(sourceRows.length, 13);
  for (let i = 0; i < 13; i++) {
    assert.deepEqual(originalRows[i].marketVoteShare, sourceRows[i].voteShare);
  }
});

test('the 05:08 official market snapshot and its 13 V2 revisions remain preserved', () => {
  assert.equal(oldSnapshot.round, 1669);
  assert.equal(oldSnapshot.totalVotes, 177130);
  assertRevisionAgainstSnapshot(rows.slice(13, 26), oldSnapshot);
});

test('the 15:48 official market snapshot and its 13 V2 revisions remain preserved', () => {
  assert.equal(snapshot.round, 1669);
  assert.equal(snapshot.totalVotes, 248628);
  assert.deepEqual(snapshot.outcomeKeyOrder, { '0': 'draw', '1': 'home_win', '2': 'away_win' });
  assert.equal(rows.length, 52);
  assertRevisionAgainstSnapshot(rows.slice(26, 39), snapshot);
});

test('the 20:40 official market snapshot is used by the latest 13 V2 revisions', () => {
  assert.equal(latestSnapshot.round, 1669);
  assert.equal(latestSnapshot.totalVotes, 310144);
  assert.deepEqual(latestSnapshot.outcomeKeyOrder, { '0': 'draw', '1': 'home_win', '2': 'away_win' });
  assertRevisionAgainstSnapshot(rows.slice(39, 52), latestSnapshot);
});
