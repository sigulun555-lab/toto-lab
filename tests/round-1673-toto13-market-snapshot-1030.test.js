'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const market = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'reports/round_1673_toto13_official_market_snapshot_20261118T1030JST.json'), 'utf8'));

test('10:30 official toto13 snapshot is archived as stale append-only market history', () => {
  assert.equal(market.round, 1673);
  assert.equal(market.product, 'toto13');
  assert.equal(market.marketType, 'toto13');
  assert.equal(market.pageDisplayAt, '2026-11-18T10:30:00+09:00');
  assert.equal(market.retrievedAt, '2026-11-18T10:53:57+09:00');
  assert.equal(market.displayAgeSeconds, 1437);
  assert.equal(market.stale, true);
  assert.equal(market.totalVotesPageSummary, 188662);
  assert.equal(market.matches.length, 13);
  assert.deepEqual(market.countConsistency.mismatchedMatchNumbers, []);
  assert.equal(market.countConsistency.allPerMatchTotalsMatchPageSummary, true);
  assert.equal(market.countConsistency.allDisplayedPercentageTriplesSumTo100, true);
  assert.deepEqual(market.countConsistency.perMatchVoteTotalRange, { min: 188662, max: 188662, spread: 0 });
  assert.equal(market.v2Eligibility.eligible, false);
  assert.deepEqual(market.matches.map(x => x.matchNumber), Array.from({length: 13}, (_, i) => i + 1));
  for (const match of market.matches) {
    assert.equal(match.sumVotes, 188662);
    assert.equal(match.differenceFromSummaryVotes, 0);
    assert.equal(match.sumVotes, match.voteCounts.reduce((a, b) => a + b, 0));
    assert.ok(Math.abs(match.percentages.reduce((a, b) => a + b, 0) - 100) < 1e-8);
    assert.equal(match.marketVoteShare['1'], match.percentages[0] / 100);
    assert.equal(match.marketVoteShare['0'], match.percentages[1] / 100);
    assert.equal(match.marketVoteShare['2'], match.percentages[2] / 100);
  }
  const v2 = fs.readFileSync(path.join(__dirname, '..', 'predictions/round_1673_ChatGPT_shared_score_v2.jsonl'), 'utf8').trim().split(/\\r?\\n/).filter(Boolean);
  assert.equal(v2.length, 39, 'snapshot-only append must not create or rewrite a V2 revision');
});
