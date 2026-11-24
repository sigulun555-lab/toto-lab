'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const market = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'reports', 'round_1674_toto13_official_market_snapshot_20261124T1705JST.json'), 'utf8'));

test('17:05 official round-1674 toto13 snapshot is stale and count-mismatched; excluded from V2', () => {
  assert.equal(market.schemaVersion, 1);
  assert.equal(market.product, 'toto13');
  assert.equal(market.marketType, 'toto13');
  assert.equal(market.round, 1674);
  assert.equal(market.pageDisplayAt, '2026-11-24T17:05:00+09:00');
  assert.equal(market.retrievedAt, '2026-11-24T17:36:37+09:00');
  assert.equal(market.displayAgeSeconds, 1897);
  assert.equal(market.staleAfterSeconds, 300);
  assert.equal(market.stale, true);
  assert.equal(market.totalVotesPageSummary, 303946);
  assert.equal(market.commonMatchVoteCountTotal, 302807);
  assert.equal(market.pageSummaryDifference, -1139);
  assert.equal(market.matches.length, 13);
  assert.deepEqual(market.matches.map(m => m.matchNumber), Array.from({length: 13}, (_, i) => i + 1));
  assert.equal(market.reconciliation.allMatchVoteCountsEqualPageSummary, false);
  assert.equal(market.reconciliation.allMatchVoteCountsEqualEachOther, true);
  assert.equal(market.reconciliation.allPercentageTotalsEqual100, true);
  assert.equal(market.v2Eligibility.eligible, false);
  assert.match(market.v2Eligibility.reason, /difference -1,139/);
  assert.ok(market.predictionImpact.includes('No V1/V2 prediction row'));
  for (const m of market.matches) {
    assert.equal(m.sumVotes, m.voteCounts.reduce((a, b) => a + b, 0));
    assert.equal(m.sumVotes, 302807);
    assert.equal(m.differenceFromPageSummary, -1139);
    assert.equal(m.percentageTotal, 100);
    assert.ok(Math.abs(m.percentages.reduce((a, b) => a + b, 0) - 100) < 1e-8);
    const expectedShares = {
      '0': Number((m.percentages[1] / 100).toFixed(4)),
      '1': Number((m.percentages[0] / 100).toFixed(4)),
      '2': Number((m.percentages[2] / 100).toFixed(4))
    };
    for (const key of ['0', '1', '2']) assert.equal(m.marketVoteShare[key], expectedShares[key]);
  }
});
