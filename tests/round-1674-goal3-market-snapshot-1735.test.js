'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const market = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'reports', 'round_1674_totoGOAL3_official_market_snapshot_20261124T1735JST.json'), 'utf8'));

test('round-1674 official totoGOAL3 market snapshot is fresh, reconciled, and does not create V2', () => {
  assert.equal(market.schemaVersion, 1);
  assert.equal(market.product, 'totoGOAL3');
  assert.equal(market.marketType, 'totoGOAL3');
  assert.equal(market.round, 1674);
  assert.equal(market.fixtureCount, 3);
  assert.equal(market.teamSideCount, 6);
  assert.deepEqual(market.categoryOrder, ['0', '1', '2', '3+']);
  assert.equal(market.pageDisplayAt, '2026-11-24T17:35:00+09:00');
  assert.equal(market.retrievedAt, '2026-11-24T17:36:37+09:00');
  assert.equal(market.displayAgeSeconds, 97);
  assert.equal(market.staleAfterSeconds, 300);
  assert.equal(market.stale, false);
  assert.equal(market.totalVotesPageSummary, 60304);
  assert.equal(market.teamSides.length, 6);
  assert.deepEqual(market.teamSides.map(x => x.teamSideNumber), [1, 2, 3, 4, 5, 6]);
  assert.equal(market.reconciliation.allTeamSideVoteCountsEqualPageSummary, true);
  assert.equal(market.reconciliation.allPercentageTotalsEqual100, true);
  assert.equal(market.v2Eligibility.marketInputFresh, true);
  assert.equal(market.v2Eligibility.predictionGenerationEligible, false);
  assert.match(market.v2Eligibility.reason, /No executable/i);
  assert.ok(market.predictionImpact.includes('No V1/V2 prediction row'));
  for (const side of market.teamSides) {
    assert.equal(side.voteCounts.length, 4);
    assert.equal(side.percentages.length, 4);
    assert.equal(side.sumVotes, side.voteCounts.reduce((a, b) => a + b, 0));
    assert.equal(side.sumVotes, market.totalVotesPageSummary);
    // Decimal percentages are stored as binary floats; compare with a small tolerance.
    assert.ok(Math.abs(side.percentageTotal - 100) < 1e-8, `percentageTotal=${side.percentageTotal}`);
    assert.ok(Math.abs(side.percentages.reduce((a, b) => a + b, 0) - 100) < 1e-8);
    for (let i = 0; i < 4; i++) {
      const key = market.categoryOrder[i];
      assert.equal(side.marketVoteShare[key], Number((side.percentages[i] / 100).toFixed(4)));
    }
  }
});
