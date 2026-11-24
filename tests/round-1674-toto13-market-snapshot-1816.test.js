'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const market = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'reports', 'round_1674_toto13_official_market_snapshot_20261124T1816JST.json'), 'utf8'));

test('18:16 official round-1674 toto13 snapshot is fresh and all 13 match totals reconcile', () => {
  assert.equal(market.schemaVersion, 1);
  assert.equal(market.product, 'toto13');
  assert.equal(market.marketType, 'toto13');
  assert.equal(market.round, 1674);
  assert.equal(market.pageDisplayAt, '2026-11-24T18:16:00+09:00');
  assert.equal(market.retrievedAt, '2026-11-24T18:20:45+09:00');
  assert.equal(market.displayAgeSeconds, 285);
  assert.equal(market.staleAfterSeconds, 300);
  assert.equal(market.stale, false);
  assert.equal(market.deadlineAt, '2026-11-25T18:50:00+09:00');
  assert.equal(market.totalVotesPageSummary, 313982);
  assert.equal(market.matches.length, 13);
  assert.equal(market.countConsistency.allMatchVoteTotalsEqualPageSummary, true);
  assert.equal(market.countConsistency.allDisplayedPercentagesSumTo100, true);
  assert.equal(market.v2Eligibility.eligible, true);
  for (const m of market.matches) {
    assert.equal(m.sumVotes, m.counts['1'] + m.counts['0'] + m.counts['2']);
    assert.equal(m.sumVotes, 313982);
    assert.ok(Math.abs(m.sumPercent - 100) < 1e-8);
    assert.equal(m.marketVoteShare['1'], Number((m.percentages['1'] / 100).toFixed(4)));
    assert.equal(m.marketVoteShare['0'], Number((m.percentages['0'] / 100).toFixed(4)));
    assert.equal(m.marketVoteShare['2'], Number((m.percentages['2'] / 100).toFixed(4)));
  }
});
