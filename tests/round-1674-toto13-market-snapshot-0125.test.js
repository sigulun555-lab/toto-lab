'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const market = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'reports/round_1674_toto13_official_market_snapshot_20261124T0125JST.json'), 'utf8'));

test('01:25 official round-1674 toto13 snapshot is archived as stale and excluded from V2', () => {
  assert.equal(market.schemaVersion, 1);
  assert.equal(market.product, 'toto13');
  assert.equal(market.marketType, 'toto13');
  assert.equal(market.round, 1674);
  assert.equal(market.pageDisplayAt, '2026-11-24T01:25:00+09:00');
  assert.equal(market.retrievedAt, '2026-11-24T01:30:36+09:00');
  assert.equal(market.displayAgeSeconds, 336);
  assert.equal(market.staleAfterSeconds, 300);
  assert.equal(market.stale, true);
  assert.equal(market.totalVotesPageSummary, 228182);
  assert.equal(market.matches.length, 13);
  assert.deepEqual(market.matches.map(m => m.matchNumber), Array.from({length: 13}, (_, i) => i + 1));
  assert.equal(market.reconciliation.allMatchVoteCountsEqualPageSummary, true);
  assert.equal(market.reconciliation.allPercentageTotalsEqual100, true);
  assert.deepEqual(market.matches.map(m => m.differenceFromPageSummary), Array(13).fill(0));
  assert.equal(market.v2Eligibility.eligible, false);
  assert.match(market.v2Eligibility.reason, /stale/i);
  assert.equal(market.predictionImpact, 'None. No V1/V2 prediction row was created or modified.');
  for (const m of market.matches) {
    assert.equal(m.sumVotes, m.voteCounts.reduce((a, b) => a + b, 0));
    assert.equal(m.sumVotes, market.totalVotesPageSummary);
    assert.equal(m.percentageTotal, 100);
    assert.ok(Math.abs(m.percentages.reduce((a, b) => a + b, 0) - 100) < 1e-8);
    const expectedShares = {
      '0': Number((m.percentages[1] / 100).toFixed(4)),
      '1': Number((m.percentages[0] / 100).toFixed(4)),
      '2': Number((m.percentages[2] / 100).toFixed(4))
    };
    for (const key of ['0', '1', '2']) {
      assert.ok(Math.abs(m.marketVoteShare[key] - expectedShares[key]) <= 1e-12);
    }
  }
});

const market0237 = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'reports/round_1674_toto13_official_market_snapshot_20261124T0237JST.json'), 'utf8'));

test('02:37 official round-1674 toto13 snapshot is reconciled and excluded from V2 as stale', () => {
  assert.equal(market0237.schemaVersion, 1);
  assert.equal(market0237.product, 'toto13');
  assert.equal(market0237.marketType, 'toto13');
  assert.equal(market0237.round, 1674);
  assert.equal(market0237.pageDisplayAt, '2026-11-24T02:37:00+09:00');
  assert.equal(market0237.retrievedAt, '2026-11-24T03:04:58+09:00');
  assert.equal(market0237.displayAgeSeconds, 1678);
  assert.equal(market0237.staleAfterSeconds, 300);
  assert.equal(market0237.stale, true);
  assert.equal(market0237.totalVotesPageSummary, 229880);
  assert.equal(market0237.matches.length, 13);
  assert.deepEqual(market0237.matches.map(m => m.matchNumber), Array.from({length: 13}, (_, i) => i + 1));
  assert.equal(market0237.reconciliation.allMatchVoteCountsEqualPageSummary, true);
  assert.equal(market0237.reconciliation.allPercentageTotalsEqual100, true);
  assert.deepEqual(market0237.matches.map(m => m.differenceFromPageSummary), Array(13).fill(0));
  assert.equal(market0237.v2Eligibility.eligible, false);
  assert.match(market0237.v2Eligibility.reason, /stale/i);
  assert.equal(market0237.predictionImpact, 'None. No V1/V2 prediction row was created or modified.');
  for (const m of market0237.matches) {
    assert.equal(m.sumVotes, m.voteCounts.reduce((a, b) => a + b, 0));
    assert.equal(m.sumVotes, market0237.totalVotesPageSummary);
    assert.equal(m.percentageTotal, 100);
    assert.ok(Math.abs(m.percentages.reduce((a, b) => a + b, 0) - 100) < 1e-8);
    const expectedShares = {
      '0': Number((m.percentages[1] / 100).toFixed(4)),
      '1': Number((m.percentages[0] / 100).toFixed(4)),
      '2': Number((m.percentages[2] / 100).toFixed(4))
    };
    for (const key of ['0', '1', '2']) {
      assert.ok(Math.abs(m.marketVoteShare[key] - expectedShares[key]) <= 1e-12);
    }
  }
});
