'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const market = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'reports', 'round_1674_toto13_official_market_snapshot_20261124T1742JST.json'), 'utf8'));

test('17:42 official round-1674 toto13 snapshot is stale, reconciled, and excluded from V2', () => {
  assert.equal(market.schemaVersion, 1);
  assert.equal(market.product, 'toto13');
  assert.equal(market.marketType, 'toto13');
  assert.equal(market.round, 1674);
  assert.equal(market.fixtureCount, 13);
  assert.deepEqual(market.outcomeOrder, ['1', '0', '2']);
  assert.equal(market.pageDisplayAt, '2026-11-24T17:42:00+09:00');
  assert.equal(market.retrievedAt, '2026-11-24T18:17:05+09:00');
  assert.equal(market.displayAgeSeconds, 2105);
  assert.equal(market.staleAfterSeconds, 300);
  assert.equal(market.stale, true);
  assert.equal(market.totalVotesPageSummary, 308386);
  assert.equal(market.matches.length, 13);
  assert.equal(market.reconciliation.allMatchVoteCountsEqualPageSummary, true);
  assert.equal(market.reconciliation.allPercentageTotalsEqual100, true);
  assert.equal(market.v2Eligibility.eligible, false);
  assert.match(market.v2Eligibility.reason, /2,105 seconds old/i);
  assert.ok(market.predictionImpact.includes('No V1/V2 prediction row'));
  for (const m of market.matches) {
    assert.equal(m.sumVotes, m.voteCounts.reduce((a, b) => a + b, 0));
    assert.equal(m.sumVotes, market.totalVotesPageSummary);
    assert.equal(m.differenceFromPageSummary, 0);
    assert.ok(Math.abs(m.percentageTotal - 100) < 1e-8);
    assert.ok(Math.abs(m.percentages.reduce((a, b) => a + b, 0) - 100) < 1e-8);
    assert.equal(m.marketVoteShare['1'], Number((m.percentages[0] / 100).toFixed(4)));
    assert.equal(m.marketVoteShare['0'], Number((m.percentages[1] / 100).toFixed(4)));
    assert.equal(m.marketVoteShare['2'], Number((m.percentages[2] / 100).toFixed(4)));
  }
});
