'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { CONFIG, buildRows } = require('../scripts/round_1675_toto13_v2_generator');
const { blendOutcomeProbabilities, WEIGHTS } = require('../scripts/round_1675_toto13_v2_blend');
const ROOT = path.join(__dirname, '..');
function readJsonl(file) {
  return fs.readFileSync(path.join(ROOT, file), 'utf8').trim().split(/\r?\n/).filter(Boolean).map(JSON.parse);
}
test('round 1675 V2 is exactly reproducible from the pinned V1 revision and official market snapshot', () => {
  const v1 = readJsonl(CONFIG.v1Path);
  const market = JSON.parse(fs.readFileSync(path.join(ROOT, CONFIG.marketPath), 'utf8'));
  const saved = readJsonl(CONFIG.outputPath);
  const regenerated = buildRows(v1, market);
  assert.deepEqual(saved, regenerated);
  assert.equal(saved.length, 13);
  assert.deepEqual(saved.map(x => x.matchNumber), Array.from({length:13}, (_,i)=>i+1));
  assert.equal(new Set(saved.map(x => x.predictionId)).size, 13);
  const baseByMatch = new Map(v1.map(x => [x.matchNumber, x]));
  for (const row of saved) {
    const base = baseByMatch.get(row.matchNumber);
    assert.equal(row.round, 1675);
    assert.equal(row.product, 'toto13');
    assert.equal(row.marketType, 'toto13');
    assert.equal(row.revisionOf, base.predictionId);
    assert.deepEqual(row.baseModelOutcomeProbabilities, base.outcomeProbabilities);
    assert.deepEqual(row.blendWeights, WEIGHTS);
    assert.equal(row.predictionConfirmedAt, CONFIG.generatedAtUtc);
    assert.ok(Math.abs(Object.values(row.outcomeProbabilities).reduce((a,b)=>a+b,0)-1) <= 2e-8);
  }
});
test('official market snapshot is current, product-specific, and internally reconciled', () => {
  const market = JSON.parse(fs.readFileSync(path.join(ROOT, CONFIG.marketPath), 'utf8'));
  assert.equal(market.product, 'toto13');
  assert.equal(market.round, 1675);
  assert.equal(market.marketType, 'toto13');
  assert.equal(market.stale, false);
  assert.ok(market.displayAgeSeconds <= 300);
  assert.equal(market.totalVotesPageSummaryPerMatch, 177968);
  assert.equal(market.matches.length, 13);
  for (const row of market.matches) {
    assert.equal(row.sumVotes, 177968);
    assert.equal(row.sumPercent, 100);
    assert.ok(Math.abs(Object.values(row.marketVoteShare).reduce((a,b)=>a+b,0)-1) <= 1e-9);
  }
});
test('the copied pinned 30/70 helper retains its exact probability-level behavior', () => {
  assert.deepEqual(
    blendOutcomeProbabilities({ '1': 0.6, '0': 0.2, '2': 0.2 }, { '1': 0.4, '0': 0.3, '2': 0.3 }),
    { '1': 0.46, '0': 0.27, '2': 0.27 }
  );
});
