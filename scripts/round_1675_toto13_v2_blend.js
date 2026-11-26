'use strict';
// Exact probability-level 30/70 formula used by the saved round-1673 V2 artifact
// and tests/round-1673-toto13-market-blend.test.js.
// Do not substitute scripts/claude_v2_logic.js: that file implements a different
// expected-goals/DC/draw-boost algorithm and does not reproduce the historical V2 rows.
const KEYS = ['1', '0', '2'];
const WEIGHTS = Object.freeze({ poissonModel: 0.3, totoVoteShare: 0.7 });
function blendOutcomeProbabilities(base, market) {
  if (!base || !market) throw new Error('base and market probability maps are required');
  for (const key of KEYS) {
    if (!Number.isFinite(base[key]) || !Number.isFinite(market[key]) || base[key] < 0 || market[key] < 0) {
      throw new Error('invalid probability for outcome ' + key);
    }
  }
  const baseSum = KEYS.reduce((sum, key) => sum + base[key], 0);
  const marketSum = KEYS.reduce((sum, key) => sum + market[key], 0);
  if (Math.abs(baseSum - 1) > 1e-6 || Math.abs(marketSum - 1) > 1e-6) {
    throw new Error('base and market vectors must each sum to 1');
  }
  const out = {};
  for (const key of KEYS) out[key] = Number((WEIGHTS.poissonModel * base[key] + WEIGHTS.totoVoteShare * market[key]).toFixed(8));
  const outSum = KEYS.reduce((sum, key) => sum + out[key], 0);
  if (Math.abs(outSum - 1) > 2e-8) throw new Error('blended vector is not normalized');
  return out;
}
module.exports = { KEYS, WEIGHTS, blendOutcomeProbabilities };
