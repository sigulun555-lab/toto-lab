'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { blendGoalExpectancyWithMarket, calculateOutcomeProbabilities, computeMatch, MARKET_WEIGHT } = require('../scripts/claude_v2_logic.js');

const fixture = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures', 'round_1665_claude_v2_reference.json'), 'utf8'));
const TOL = 1e-5;

test('market weight is 0.7 for the official vote and 0.3 for the model', () => {
  assert.equal(MARKET_WEIGHT, 0.7);
});

test('blend keeps total goals and splits by blended edge', () => {
  const b = blendGoalExpectancyWithMarket(2, 1, 0.5, 0.2);
  assert.ok(Math.abs((b.homeGoals + b.awayGoals) - 3) < 1e-12);
});

test('blend clamps each side to at least 0.15 goals', () => {
  const b = blendGoalExpectancyWithMarket(0.2, 0.1, 0, 1);
  assert.equal(b.awayGoals >= 0.15 || b.homeGoals >= 0.15, true);
  assert.ok(b.homeGoals >= 0.15 && b.awayGoals >= 0.15);
});

test('outcome probabilities sum to 1 after normalization and boost', () => {
  const o = calculateOutcomeProbabilities(1.2, 1.1, true);
  const s = o.final.home + o.final.draw + o.final.away;
  assert.ok(Math.abs(s - 1) < 1e-12);
  const p = o.preBoost.home + o.preBoost.draw + o.preBoost.away;
  assert.ok(Math.abs(p - 1) < 1e-12);
});

test('each fixture match reproduces the Claude V2 reference values', () => {
  for (const m of fixture.matches) {
    const c = computeMatch({
      rawHomeGoals: m.input.rawHomeExpGoals,
      rawAwayGoals: m.input.rawAwayExpGoals,
      marketHome: m.input.officialVoteShare['1'],
      marketDraw: m.input.officialVoteShare['0'],
      marketAway: m.input.officialVoteShare['2'],
    });
    assert.ok(Math.abs(c.blend.marketEdge - m.intermediate.marketEdge) < TOL, `edge ${m.matchNumber}`);
    assert.ok(Math.abs(c.v2.final.home - m.v2Blend.final['1']) < TOL, `V2 home ${m.matchNumber}`);
    assert.ok(Math.abs(c.v2.final.draw - m.v2Blend.final['0']) < TOL, `V2 draw ${m.matchNumber}`);
    assert.ok(Math.abs(c.v2.final.away - m.v2Blend.final['2']) < TOL, `V2 away ${m.matchNumber}`);
    assert.ok(Math.abs(c.v2.preBoost.draw - m.v2Blend.preBoost['0']) < TOL, `pre-boost draw ${m.matchNumber}`);
  }
});

test('V1 (no market blend) reproduces the submitted baseline for each fixture match', () => {
  for (const m of fixture.matches) {
    const o = calculateOutcomeProbabilities(m.input.rawHomeExpGoals, m.input.rawAwayExpGoals, true);
    assert.ok(Math.abs(o.final.draw - m.v1NoBlend.final['0']) < TOL, `V1 draw ${m.matchNumber}`);
  }
});


test('latest GPT market-blend revision applies Claude V2 logic to GPT shared xG for all 13 matches', () => {
  const gptRows = fs.readFileSync(path.join(__dirname, '..', 'predictions', 'round_1665_ChatGPT_shared_score_v3.jsonl'), 'utf8').trim().split(/\\r?\\n/).map(JSON.parse);
  const blendRows = fs.readFileSync(path.join(__dirname, '..', 'predictions', 'round_1665_ChatGPT_market_blend_v2.jsonl'), 'utf8').trim().split(/\\r?\\n/).map(JSON.parse);
  const latestByMatch = new Map();
  for (const row of blendRows) latestByMatch.set(row.matchNumber, row);
  assert.equal(gptRows.length, 13);
  for (const g of gptRows) {
    const m = fixture.matches.find(x => x.matchNumber === g.matchNumber);
    const saved = latestByMatch.get(g.matchNumber);
    assert.ok(saved, 'missing aligned revision');
    assert.match(saved.modelVersion, /Claude-V2-market-blend-30-70/);
    const expected = computeMatch({ rawHomeGoals: g.homeExpectedGoals, rawAwayGoals: g.awayExpectedGoals, marketHome: m.input.officialVoteShare['1'], marketDraw: m.input.officialVoteShare['0'], marketAway: m.input.officialVoteShare['2'] });
    assert.ok(Math.abs(saved.blendedExpectedGoals.home - expected.blend.homeGoals) < 1e-10);
    assert.ok(Math.abs(saved.blendedExpectedGoals.away - expected.blend.awayGoals) < 1e-10);
    const keys = { '1': 'home', '0': 'draw', '2': 'away' };
    for (const key of ['1', '0', '2']) assert.ok(Math.abs(saved.probabilities[key] - expected.v2.final[keys[key]]) < 1e-10);
    assert.equal(saved.corrections.dixonColes, true);
    assert.equal(saved.corrections.drawBoostVariant, 'V2');
  }
});
