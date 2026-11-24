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

const market1816 = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'reports', 'round_1674_totoGOAL3_official_market_snapshot_20261124T1816JST.json'), 'utf8'));

test('18:16 official round-1674 totoGOAL3 market snapshot is fresh, reconciled, and forecast-ineligible', () => {
  assert.equal(market1816.schemaVersion, 1);
  assert.equal(market1816.product, 'totoGOAL3');
  assert.equal(market1816.marketType, 'totoGOAL3');
  assert.equal(market1816.round, 1674);
  assert.equal(market1816.fixtureCount, 3);
  assert.equal(market1816.teamSideCount, 6);
  assert.deepEqual(market1816.categoryOrder, ['0', '1', '2', '3+']);
  assert.equal(market1816.pageDisplayAt, '2026-11-24T18:16:00+09:00');
  assert.equal(market1816.retrievedAt, '2026-11-24T18:20:45+09:00');
  assert.equal(market1816.displayAgeSeconds, 285);
  assert.equal(market1816.staleAfterSeconds, 300);
  assert.equal(market1816.stale, false);
  assert.equal(market1816.totalVotesPageSummary, 62956);
  assert.equal(market1816.teamSides.length, 6);
  assert.equal(market1816.reconciliation.allTeamSideVoteCountsEqualPageSummary, true);
  assert.equal(market1816.reconciliation.allPercentageTotalsEqual100, true);
  assert.equal(market1816.v2Eligibility.marketInputFresh, true);
  assert.equal(market1816.v2Eligibility.predictionGenerationEligible, false);
  assert.match(market1816.v2Eligibility.reason, /no executable GOAL3 V2/i);
  for (const side of market1816.teamSides) {
    assert.equal(side.voteCounts.length, 4);
    assert.equal(side.percentages.length, 4);
    assert.equal(side.sumVotes, side.voteCounts.reduce((a, b) => a + b, 0));
    assert.equal(side.sumVotes, market1816.totalVotesPageSummary);
    assert.ok(Math.abs(side.percentageTotal - 100) < 1e-8);
    assert.ok(Math.abs(side.percentages.reduce((a, b) => a + b, 0) - 100) < 1e-8);
    for (let i = 0; i < 4; i++) {
      const key = market1816.categoryOrder[i];
      assert.equal(side.marketVoteShare[key], Number((side.percentages[i] / 100).toFixed(4)));
    }
  }
});


const market2203 = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'reports/round_1674_totoGOAL3_official_market_snapshot_20261124T2203JST.json'), 'utf8'));

test('22:03 official round-1674 totoGOAL3 market observation is reconciled but stale and forecast-ineligible', () => {
  assert.equal(market2203.schemaVersion, 1);
  assert.equal(market2203.product, 'totoGOAL3');
  assert.equal(market2203.marketType, 'totoGOAL3');
  assert.equal(market2203.round, 1674);
  assert.equal(market2203.fixtureCount, 3);
  assert.equal(market2203.teamSideCount, 6);
  assert.deepEqual(market2203.categoryOrder, ['0', '1', '2', '3+']);
  assert.equal(market2203.pageDisplayAt, '2026-11-24T22:03:00+09:00');
  assert.equal(market2203.retrievedAt, '2026-11-24T22:11:52+09:00');
  assert.equal(market2203.displayAgeSeconds, 532);
  assert.equal(market2203.staleAfterSeconds, 300);
  assert.equal(market2203.stale, true);
  assert.equal(market2203.totalVotesPageSummary, 73951);
  assert.equal(market2203.teamSides.length, 6);
  assert.equal(market2203.reconciliation.allTeamSideVoteCountsEqualPageSummary, true);
  assert.equal(market2203.reconciliation.allPercentageTotalsEqual100, true);
  assert.equal(market2203.v2Eligibility.marketInputFresh, false);
  assert.equal(market2203.v2Eligibility.predictionGenerationEligible, false);
  for (const side of market2203.teamSides) {
    assert.equal(side.voteCounts.length, 4);
    assert.equal(side.percentages.length, 4);
    assert.equal(side.sumVotes, side.voteCounts.reduce((a, b) => a + b, 0));
    assert.equal(side.sumVotes, market2203.totalVotesPageSummary);
    assert.ok(Math.abs(side.percentageTotal - 100) < 1e-8);
    for (let i = 0; i < 4; i++) {
      const key = market2203.categoryOrder[i];
      assert.equal(side.marketVoteShare[key], Number((side.percentages[i] / 100).toFixed(4)));
    }
  }
});


const market0214 = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'reports/round_1674_totoGOAL3_official_market_snapshot_20261125T0214JST.json'), 'utf8'));

test('02:14 official round-1674 totoGOAL3 market observation is reconciled but stale and forecast-ineligible', () => {
  assert.equal(market0214.schemaVersion, 1);
  assert.equal(market0214.product, 'totoGOAL3');
  assert.equal(market0214.marketType, 'totoGOAL3');
  assert.equal(market0214.round, 1674);
  assert.equal(market0214.fixtureCount, 3);
  assert.equal(market0214.teamSideCount, 6);
  assert.deepEqual(market0214.categoryOrder, ['0', '1', '2', '3+']);
  assert.equal(market0214.pageDisplayAt, '2026-11-25T02:14:00+09:00');
  assert.equal(market0214.retrievedAt, '2026-11-25T02:33:38.078+09:00');
  assert.equal(market0214.displayAgeSeconds, 1178);
  assert.equal(market0214.staleAfterSeconds, 300);
  assert.equal(market0214.stale, true);
  assert.equal(market0214.totalVotesPageSummary, 81987);
  assert.equal(market0214.teamSides.length, 6);
  assert.deepEqual(market0214.teamSides.map(x => x.teamSideNumber), [1, 2, 3, 4, 5, 6]);
  assert.equal(market0214.reconciliation.allTeamSideVoteCountsEqualPageSummary, true);
  assert.equal(market0214.reconciliation.allPercentageTotalsEqual100, true);
  assert.equal(market0214.v2Eligibility.marketInputFresh, false);
  assert.equal(market0214.v2Eligibility.predictionGenerationEligible, false);
  assert.match(market0214.v2Eligibility.reason, /1,178 seconds old/);
  assert.ok(market0214.predictionImpact.includes('No GOAL3 V1/V2 prediction row'));
  for (const side of market0214.teamSides) {
    assert.equal(side.voteCounts.length, 4);
    assert.equal(side.percentages.length, 4);
    assert.equal(side.sumVotes, side.voteCounts.reduce((a, b) => a + b, 0));
    assert.equal(side.sumVotes, market0214.totalVotesPageSummary);
    assert.ok(Math.abs(side.percentageTotal - 100) < 1e-8);
    assert.ok(Math.abs(side.percentages.reduce((a, b) => a + b, 0) - 100) < 1e-8);
    for (let i = 0; i < 4; i++) {
      const key = market0214.categoryOrder[i];
      assert.equal(side.marketVoteShare[key], Number((side.percentages[i] / 100).toFixed(4)));
    }
  }
});
