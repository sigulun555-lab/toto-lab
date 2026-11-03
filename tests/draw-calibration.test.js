'use strict';
const assert = require('node:assert/strict');
const test = require('node:test');
const { summarizeDrawCalibration } = require('../scripts/analyze_draw_calibration.js');

function record(id, pDraw, result) {
  return {
    prediction: {
      predictionId: id,
      probabilities: { '1': 0.5 - pDraw / 2, '0': pDraw, '2': 0.5 - pDraw / 2 },
    },
    result: { homeGoals: result ? 1 : 2, awayGoals: result ? 1 : 0 },
  };
}

test('draw-only Brier, log loss, and calibration bins are computed correctly', () => {
  const report = summarizeDrawCalibration([
    record('draw', 0.4, true),
    record('not-draw', 0.2, false),
  ]);
  assert.equal(report.n, 2);
  assert.equal(report.meanPredictedDrawRate, 0.3);
  assert.equal(report.observedDrawRate, 0.5);
  assert.equal(report.drawClassBrier, 0.2);
  assert.ok(Math.abs(report.drawClassLogLoss - ((-Math.log(0.4) - Math.log(0.8)) / 2)) < 1e-6);
  assert.equal(report.calibrationBins[2].n, 1);
  assert.equal(report.calibrationBins[4].n, 1);
  assert.match(report.warning, /小標本/);
});

test('empty input returns null metrics without throwing', () => {
  const report = summarizeDrawCalibration([]);
  assert.equal(report.n, 0);
  assert.equal(report.meanPredictedDrawRate, null);
  assert.equal(report.drawClassBrier, null);
});

test('invalid bin width is rejected', () => {
  assert.throws(() => summarizeDrawCalibration([], 0), /binWidth/);
});
