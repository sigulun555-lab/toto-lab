'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const market = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'reports/round_1673_toto13_official_market_snapshot_20261118T0900JST.json'), 'utf8'));

test('09:00 official toto13 snapshot is archived as stale percentage-only history', () => {
  assert.equal(market.round, 1673);
  assert.equal(market.product, 'toto13');
  assert.equal(market.marketType, 'toto13');
  assert.equal(market.pageDisplayAt, '2026-11-18T09:00:00+09:00');
  assert.equal(market.retrievedAt, '2026-11-18T09:39:38+09:00');
  assert.equal(market.displayAgeSeconds, 2378);
  assert.equal(market.stale, true);
  assert.equal(market.totalVotesPageSummary, 185593);
  assert.equal(market.matches.length, 13);
  assert.equal(market.countConsistency.perMatchVoteCountsAvailable, false);
  assert.equal(market.countConsistency.allDisplayedPercentageTriplesSumTo100, true);
  assert.deepEqual(market.countConsistency.mismatchedMatchNumbers, []);
  assert.equal(market.v2Eligibility.eligible, false);
  assert.deepEqual(market.matches.map(x => x.matchNumber), Array.from({length:13}, (_,i)=>i+1));
  for (const match of market.matches) {
    assert.ok(Math.abs(match.percentages.reduce((a,b)=>a+b,0)-100) < 1e-8);
    assert.equal(match.marketVoteShare['1'], match.percentages[0] / 100);
    assert.equal(match.marketVoteShare['0'], match.percentages[1] / 100);
    assert.equal(match.marketVoteShare['2'], match.percentages[2] / 100);
    assert.equal(Object.hasOwn(match, 'voteCounts'), false);
  }
  assert.deepEqual(market.matches[0].percentages, [81.24,10.89,7.87]);
  assert.deepEqual(market.matches[12].percentages, [24.10,21.45,54.45]);
});
