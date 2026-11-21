'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const market = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'reports/round_1673_toto13_official_market_snapshot_20261118T0741JST.json'), 'utf8'));
const v2 = fs.readFileSync(path.join(__dirname, '..', 'predictions/round_1673_ChatGPT_shared_score_v2.jsonl'), 'utf8').trim().split(/\r?\n/).map(JSON.parse);

test('07:41 official toto13 snapshot is archived as stale history and excluded from V2', () => {
  assert.equal(market.round, 1673);
  assert.equal(market.product, 'toto13');
  assert.equal(market.marketType, 'toto13');
  assert.equal(market.pageDisplayAt, '2026-11-18T07:41:00+09:00');
  assert.equal(market.retrievedAt, '2026-11-18T07:59:06+09:00');
  assert.equal(market.displayAgeSeconds, 1086);
  assert.equal(market.stale, true);
  assert.equal(market.totalVotesPageSummary, 183258);
  assert.equal(market.matches.length, 13);
  assert.equal(market.countConsistency.allThirteenMatchTotalsMatchPageSummary, true);
  assert.equal(market.countConsistency.allDisplayedPercentageTriplesSumTo100, true);
  assert.deepEqual(market.countConsistency.mismatchedMatchNumbers, []);
  assert.deepEqual(market.matches.map(match => match.differenceFromSummaryVotes), Array(13).fill(0));
  for (const match of market.matches) {
    assert.equal(match.sumVotes, 183258);
    assert.ok(Math.abs(match.percentages.reduce((sum, value) => sum + value, 0) - 100) < 1e-8);
    assert.equal(match.marketVoteShare['1'], match.percentages[0] / 100);
    assert.equal(match.marketVoteShare['0'], match.percentages[1] / 100);
    assert.equal(match.marketVoteShare['2'], match.percentages[2] / 100);
  }
  assert.equal(market.v2Eligibility.eligible, false);
  const v2AtSnapshot = v2.filter(row => Date.parse(row.predictionConfirmedAt) < Date.parse('2026-11-18T00:00:00+09:00'));
  assert.equal(v2AtSnapshot.length, 39);
  assert.equal(new Set(v2AtSnapshot.map(row => row.predictionId)).size, 39);
  assert.equal(new Set(v2.map(row => row.predictionId)).size, v2.length);
});
