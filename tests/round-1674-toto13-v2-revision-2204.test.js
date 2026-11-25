'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { CONFIG, buildRows } = require('../scripts/round_1674_toto13_v2_revision_20261124T2204JST');
const root = path.join(__dirname, '..');
const readJsonl = p => fs.readFileSync(path.join(root, p), 'utf8').trim().split(/\r?\n/).filter(Boolean).map(JSON.parse);
const v1 = readJsonl(CONFIG.v1Path);
const priorV2 = readJsonl(CONFIG.previousV2Path);
const revision = readJsonl(CONFIG.outputPath);
const market = JSON.parse(fs.readFileSync(path.join(root, CONFIG.marketPath), 'utf8'));

test('round 1674 toto13 market-refresh V2 appends 13 rows and preserves the prior V2 chain', () => {
  assert.equal(v1.length, 26);
  assert.equal(new Set(v1.map(r => r.predictionId)).size, 26);
  assert.equal(priorV2.length, 13);
  assert.equal(new Set(priorV2.map(r => r.predictionId)).size, 13);
  assert.equal(revision.length, 13);
  assert.equal(new Set(revision.map(r => r.predictionId)).size, 13);
  const latestV1 = new Map();
  for (const row of v1) {
    const old = latestV1.get(row.matchNumber);
    if (!old || Date.parse(row.predictionConfirmedAt) > Date.parse(old.predictionConfirmedAt)) latestV1.set(row.matchNumber, row);
  }
  const previous = new Map(priorV2.map(row => [row.matchNumber, row]));
  for (const row of revision) {
    const base = latestV1.get(row.matchNumber);
    const parent = previous.get(row.matchNumber);
    assert.ok(base && parent);
    assert.equal(row.revisionOf, parent.predictionId);
    assert.deepEqual(row.baseModelOutcomeProbabilities, base.outcomeProbabilities);
    assert.deepEqual(row.homeGoalProbabilities, base.homeGoalProbabilities);
    assert.deepEqual(row.awayGoalProbabilities, base.awayGoalProbabilities);
    assert.equal(row.predictionConfirmedAt, CONFIG.generatedAtUtc);
    assert.equal(row.marketSnapshotPath, CONFIG.marketSnapshotPath);
    assert.ok(Math.abs(Object.values(row.outcomeProbabilities).reduce((a,b)=>a+b,0)-1)<2e-8);
  }
  assert.deepEqual(revision, buildRows(v1, priorV2, market, CONFIG));
});

test('official 22:04 toto13 snapshot is fresh and all 13 vote rows reconcile', () => {
  assert.equal(market.product, 'toto13');
  assert.equal(market.round, 1674);
  assert.equal(market.pageDisplayAt, '2026-11-24T22:04:00+09:00');
  assert.equal(market.retrievedAt, '2026-11-24T22:08:37+09:00');
  assert.equal(market.displayAgeSeconds, 277);
  assert.equal(market.stale, false);
  assert.equal(market.totalVotesPageSummary, 353626);
  assert.equal(market.matches.length, 13);
  assert.equal(market.countConsistency.allMatchVoteTotalsEqualPageSummary, true);
  assert.equal(market.countConsistency.allDisplayedPercentagesSumTo100, true);
  assert.equal(market.matches.every(m => m.sumVotes === 353626 && m.sumPercent === 100), true);
});

test('market refresh uses the exact pinned 30/70 probability-level blend helper', () => {
  const { blendOutcomeProbabilities } = require('../scripts/round_1674_toto13_v2_blend');
  for (const row of revision) {
    assert.equal(row.blendWeights.poissonModel, 0.3);
    assert.equal(row.blendWeights.totoVoteShare, 0.7);
    assert.deepEqual(row.outcomeProbabilities, blendOutcomeProbabilities(row.baseModelOutcomeProbabilities, row.marketVoteShare));
  }
});


const teamNews2212 = JSON.parse(fs.readFileSync(path.join(root, 'reports/round_1674_toto13_team_news_recheck_20261124T2212JST.json'), 'utf8'));

test('22:12 official team-news audit covers all 26 round-1674 toto13 teams without overstating availability', () => {
  assert.equal(teamNews2212.product, 'toto13');
  assert.equal(teamNews2212.round, 1674);
  assert.equal(teamNews2212.checkedAt, '2026-11-24T22:12:47+09:00');
  assert.equal(teamNews2212.matchNotes.length, 13);
  assert.equal(teamNews2212.teamCoverage.teamCount, 26);
  assert.equal(teamNews2212.teamCoverage.all26TeamsMapped, true);
  assert.equal(teamNews2212.suspensions.length, 3);
  assert.deepEqual(teamNews2212.suspensions.map(x => x.matchNumber).sort((a,b)=>a-b), [9,12,13]);
  assert.equal(teamNews2212.knownInjuries.length, 10);
  assert.equal(teamNews2212.scopeLimitations.all26MedicalStatusFullyVerified, false);
  assert.equal(teamNews2212.scopeLimitations.officialLineupsAvailable, false);
  assert.equal(teamNews2212.scopeLimitations.predictedStartingLineupsConfirmed, false);
  assert.equal(teamNews2212.modelImpact.probabilityAdjustmentApplied, false);
  assert.equal(teamNews2212.modelImpact.existingV1RowsChanged, false);
  assert.equal(teamNews2212.modelImpact.existingV2RowsChanged, false);
  for (const source of teamNews2212.sources) {
    assert.ok(source.url.startsWith('https://'));
    assert.equal(source.retrievedAt, teamNews2212.checkedAt);
  }
});
