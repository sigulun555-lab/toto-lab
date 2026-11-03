#!/usr/bin/env node
/**
 * Draw-class calibration audit for toto13 1X2 predictions.
 *
 * Uses the same strict fixture matching, pre-deadline filtering, and revision
 * resolution as score_predictions.js. This is descriptive evaluation only:
 * it does not fit or apply a draw boost and never changes prediction logs.
 */
'use strict';

const path = require('path');
const {
  joinAndFilter,
  loadAllPredictions,
  readJsonlDirOrFile,
} = require('./score_predictions.js');

function round(value, digits = 6) {
  return Number(value.toFixed(digits));
}

function summarizeDrawCalibration(records, binWidth = 0.1) {
  if (!Array.isArray(records)) throw new TypeError('records must be an array');
  if (!(binWidth > 0 && binWidth <= 1)) throw new RangeError('binWidth must be in (0, 1]');

  const binCount = Math.ceil(1 / binWidth);
  const bins = Array.from({ length: binCount }, (_, i) => ({
    lower: round(i * binWidth),
    upper: round(Math.min(1, (i + 1) * binWidth)),
    count: 0,
    predictedDrawSum: 0,
    observedDrawSum: 0,
  }));

  let predictedDrawSum = 0;
  let observedDrawSum = 0;
  let drawBrierSum = 0;
  let drawLogLossSum = 0;
  let drawPickCount = 0;
  let drawPickHitCount = 0;

  for (const record of records) {
    const prediction = record.prediction;
    const result = record.result;
    const probabilities = prediction.probabilities || prediction.outcomeProbabilities;
    if (!probabilities || !Number.isFinite(probabilities['0'])) {
      throw new Error(`引き分け確率が不正です: ${prediction.predictionId || 'unknown'}`);
    }

    const pDraw = probabilities['0'];
    if (pDraw < 0 || pDraw > 1) throw new RangeError('draw probability must be within [0, 1]');
    const isDraw = result.homeGoals === result.awayGoals ? 1 : 0;
    const pSafe = Math.min(1 - 1e-12, Math.max(1e-12, pDraw));

    predictedDrawSum += pDraw;
    observedDrawSum += isDraw;
    drawBrierSum += (pDraw - isDraw) ** 2;
    drawLogLossSum += isDraw ? -Math.log(pSafe) : -Math.log(1 - pSafe);

    const keys = ['1', '0', '2'];
    const top = keys.sort((a, b) => probabilities[b] - probabilities[a])[0];
    if (top === '0') {
      drawPickCount++;
      if (isDraw) drawPickHitCount++;
    }

    const binIndex = Math.min(binCount - 1, Math.floor(pDraw / binWidth));
    bins[binIndex].count++;
    bins[binIndex].predictedDrawSum += pDraw;
    bins[binIndex].observedDrawSum += isDraw;
  }

  const n = records.length;
  return {
    n,
    meanPredictedDrawRate: n ? round(predictedDrawSum / n) : null,
    observedDrawRate: n ? round(observedDrawSum / n) : null,
    drawClassBrier: n ? round(drawBrierSum / n) : null,
    drawClassLogLoss: n ? round(drawLogLossSum / n) : null,
    drawPickCount,
    drawPickHitRate: drawPickCount ? round(drawPickHitCount / drawPickCount) : null,
    calibrationBins: bins.map(bin => ({
      lower: bin.lower,
      upper: bin.upper,
      n: bin.count,
      meanPredictedDrawRate: bin.count ? round(bin.predictedDrawSum / bin.count) : null,
      observedDrawRate: bin.count ? round(bin.observedDrawSum / bin.count) : null,
    })),
    warning: n < 100
      ? '小標本の記述値。補正量・閾値・モデル採否の決定には使用しない。'
      : null,
  };
}

function analyzeDrawCalibration(predictions, results, binWidth = 0.1) {
  const joined = joinAndFilter(predictions, results);
  const byModelVersion = new Map();
  const byRoundModelVersion = new Map();

  for (const record of joined.usedRecords) {
    const p = record.prediction;
    const modelVersion = `${p.modelName}@${p.modelVersion}`;
    const roundKey = `${p.round}|${modelVersion}`;
    if (!byModelVersion.has(modelVersion)) byModelVersion.set(modelVersion, []);
    if (!byRoundModelVersion.has(roundKey)) byRoundModelVersion.set(roundKey, []);
    byModelVersion.get(modelVersion).push(record);
    byRoundModelVersion.get(roundKey).push(record);
  }

  return {
    inputCounts: { predictions: predictions.length, results: results.length },
    excludedPostDeadlineCount: joined.excludedPostDeadline.length,
    unresolvedTeamNameCount: joined.unresolvedTeamNames.length,
    unresolvedCount: joined.unresolved.length,
    supersededByRevisionCount: joined.supersededRecords.length,
    usedRecordCount: joined.usedRecords.length,
    byModelVersion: Object.fromEntries(
      [...byModelVersion.entries()].map(([key, rows]) => [key, summarizeDrawCalibration(rows, binWidth)])
    ),
    byRoundModelVersion: Object.fromEntries(
      [...byRoundModelVersion.entries()].map(([key, rows]) => [key, summarizeDrawCalibration(rows, binWidth)])
    ),
  };
}

module.exports = { summarizeDrawCalibration, analyzeDrawCalibration };

if (require.main === module) {
  const predictionsDir = process.argv[2] || path.join(__dirname, '..', 'predictions');
  const resultsDir = process.argv[3] || path.join(__dirname, '..', 'results');
  const outputPath = process.argv[4];
  const predictions = loadAllPredictions(predictionsDir);
  const results = readJsonlDirOrFile(resultsDir);
  const report = analyzeDrawCalibration(predictions, results);
  console.log(JSON.stringify(report, null, 2));
  if (outputPath) {
    const fs = require('fs');
    fs.writeFileSync(outputPath, JSON.stringify(report, null, 2) + '\n');
    console.log(`\nレポート保存: ${outputPath}`);
  }
}
