'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const market = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'reports/round_1673_miniA_official_market_snapshot_20261118T0807JST.json'), 'utf8'));

test('08:07 official mini toto A snapshot preserves the one-vote discrepancy and is V2-ineligible', () => {
  assert.equal(market.round, 1673);
  assert.equal(market.product, 'mini toto A');
  assert.equal(market.marketType, 'mini toto A');
  assert.equal(market.pageDisplayAt, '2026-11-18T08:07:00+09:00');
  assert.equal(market.retrievedAt, '2026-11-18T09:39:38+09:00');
  assert.equal(market.displayAgeSeconds, 5558);
  assert.equal(market.stale, true);
  assert.equal(market.totalVotesPageSummary, 22833);
  assert.equal(market.matches.length, 5);
  assert.equal(market.countConsistency.allPerMatchTotalsMatchPageSummary, false);
  assert.equal(market.countConsistency.allDisplayedPercentageTriplesSumTo100, true);
  assert.deepEqual(market.countConsistency.mismatchedMatchNumbers, [1]);
  assert.equal(market.matches[0].sumVotes, 22832);
  assert.equal(market.matches[0].differenceFromSummaryVotes, -1);
  assert.deepEqual(market.matches[0].voteCounts, [16034,3898,2900]);
  assert.equal(market.v2Eligibility.eligible, false);
  for (const match of market.matches) {
    assert.ok(Math.abs(match.percentages.reduce((a,b)=>a+b,0)-100) < 1e-8);
    assert.equal(match.marketVoteShare['1'], match.percentages[0] / 100);
    assert.equal(match.marketVoteShare['0'], match.percentages[1] / 100);
    assert.equal(match.marketVoteShare['2'], match.percentages[2] / 100);
  }
});
