'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { CONFIG, buildRows } = require('../scripts/round_1674_toto13_v2_generator');
const { blendOutcomeProbabilities } = require('../scripts/round_1674_toto13_v2_blend');
const root = path.join(__dirname, '..');
const readJsonl = p => fs.readFileSync(path.join(root, p), 'utf8').trim().split(/\r?\n/).filter(Boolean).map(JSON.parse);
const v1 = readJsonl(CONFIG.v1Path);
const v2 = readJsonl(CONFIG.outputPath);
const market = JSON.parse(fs.readFileSync(path.join(root, CONFIG.marketPath), 'utf8'));
const teamNewsPath = 'reports/round_1674_toto13_team_news_recheck_20261124T1327JST.json';
const teamNews = JSON.parse(fs.readFileSync(path.join(root, teamNewsPath), 'utf8'));

test('round 1674 toto13 V2 appends 13 rows against the latest V1 revisions without replacing V1 history', () => {
  assert.equal(v1.length, 26);
  assert.equal(new Set(v1.map(r => r.predictionId)).size, 26);
  assert.equal(v2.length, 13);
  assert.equal(new Set(v2.map(r => r.predictionId)).size, 13);
  const latest = new Map();
  for (const r of v1) {
    const old = latest.get(r.matchNumber);
    if (!old || Date.parse(r.predictionConfirmedAt) > Date.parse(old.predictionConfirmedAt)) latest.set(r.matchNumber, r);
  }
  assert.equal(latest.size, 13);
  for (const row of v2) {
    const base = latest.get(row.matchNumber);
    assert.ok(base);
    assert.equal(row.revisionOf, base.predictionId);
    assert.deepEqual(row.baseModelOutcomeProbabilities, base.outcomeProbabilities);
    assert.deepEqual(row.homeGoalProbabilities, base.homeGoalProbabilities);
    assert.deepEqual(row.awayGoalProbabilities, base.awayGoalProbabilities);
    assert.equal(row.predictionConfirmedAt, CONFIG.generatedAtUtc);
    assert.equal(row.deadlineAt, base.deadlineAt);
  }
  assert.equal(v2.filter(r => r.revisionOf).length, 13);
});
test('13:26 official toto13 snapshot reconciles every match total and percentage triple', () => {
  assert.equal(market.round, 1674);
  assert.equal(market.product, 'toto13');
  assert.equal(market.pageDisplayAt, '2026-11-24T13:26:00+09:00');
  assert.equal(market.retrievedAt, '2026-11-24T13:27:36+09:00');
  assert.equal(market.displayAgeSeconds, 96);
  assert.equal(market.stale, false);
  assert.equal(market.totalVotesPageSummary, 269910);
  assert.equal(market.matches.length, 13);
  assert.equal(market.matches.every(m => m.sumVotes === 269910 && m.sumPercent === 100), true);
  assert.equal(market.countConsistency.allMatchVoteTotalsEqualPageSummary, true);
  assert.equal(market.countConsistency.allDisplayedPercentagesSumTo100, true);
});
test('V2 uses the exact saved round-1673 probability-level 30/70 formula, not the different expected-goals helper', () => {
  const result = blendOutcomeProbabilities(
    { '1': 0.16069252, '0': 0.75792761, '2': 0.08137986 },
    { '1': 0.1789, '0': 0.6447, '2': 0.1764 }
  );
  assert.deepEqual(result, { '1': 0.17343776, '0': 0.67866828, '2': 0.14789396 });
});
test('saved V2 rows are exactly reproducible from latest V1 rows and the official snapshot', () => {
  const expected = buildRows(v1, market, CONFIG);
  assert.deepEqual(v2, expected);
  for (const row of v2) {
    const sum = Object.values(row.outcomeProbabilities).reduce((a, b) => a + b, 0);
    assert.ok(Math.abs(sum - 1) < 2e-8);
    assert.equal(row.blendWeights.poissonModel, 0.3);
    assert.equal(row.blendWeights.totoVoteShare, 0.7);
  }
});

test('team-news recheck timestamp and source provenance are internally consistent', () => {
  assert.equal(teamNews.checkedAt, '2026-11-24T13:27:36+09:00');
  assert.equal(teamNews.scopeLimitations.latestRecheckAt, teamNews.checkedAt);
  const manifest = JSON.parse(fs.readFileSync(path.join(root, 'reports/round_1674_toto13_v2_manifest_20261124T1327JST.json'), 'utf8'));
  assert.equal(manifest.teamNews.recheckPath, teamNewsPath);
  assert.equal(manifest.teamNews.checkedAt, teamNews.checkedAt);
  const ids = teamNews.sources.map(source => source.id);
  assert.equal(new Set(ids).size, ids.length);
  for (const source of teamNews.sources) {
    assert.ok(Date.parse(source.retrievedAt) <= Date.parse(teamNews.checkedAt));
  }
});
