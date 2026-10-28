#!/usr/bin/env node
/**
 * Reproducible, read-only inventory for totoGOAL3 historical data.
 *
 * Usage:
 *   node scripts/audit_goal3_inventory.js [predictionsDir] [resultsDir] [output.json]
 *
 * This inventories data coverage; it does not replace score_predictions_goal3.js.
 * It does not infer missing values or mix competitions into a single score.
 */
'use strict';

const fs = require('fs');
const path = require('path');

function readJsonlFiles(target, predicate = () => true) {
  if (!fs.existsSync(target)) return [];
  const stat = fs.statSync(target);
  const files = stat.isDirectory()
    ? fs.readdirSync(target).filter(predicate).sort().map(name => path.join(target, name))
    : [target];
  const rows = [];
  for (const file of files) {
    const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);
    lines.forEach((line, index) => {
      if (!line.trim()) return;
      try {
        rows.push({ ...JSON.parse(line), _sourceFile: path.basename(file), _line: index + 1 });
      } catch {
        throw new Error(`Invalid JSON: ${file}:${index + 1}`);
      }
    });
  }
  return rows;
}

function validPreDeadline(p) {
  const confirmed = Date.parse(p.predictionConfirmedAt);
  const deadline = Date.parse(p.deadlineAt);
  return Number.isFinite(confirmed) && Number.isFinite(deadline) && confirmed < deadline;
}

function roundFromFile(name) {
  const match = name.match(/round[_-]?(\d+)/i);
  return match ? Number(match[1]) : null;
}

function hasMarketVector(p) {
  const candidates = [
    p.marketProbabilities, p.marketProbability, p.market, p.marketVector,
    p.marketSnapshot?.probabilities, p.marketSnapshot?.marketProbabilities,
  ];
  return candidates.some(v => v && typeof v === 'object' && !Array.isArray(v) && Object.keys(v).length > 0);
}

function buildInventory(predictionsDir, resultsDir) {
  const predictions = readJsonlFiles(predictionsDir, name => name.endsWith('_goal3.jsonl'));
  const results = readJsonlFiles(resultsDir, name => name.endsWith('.jsonl'));
  const resultKeys = new Set(results.map(r => `${r.round}|${r.matchNumber}`));
  const predictionGroups = new Map();
  const resultRounds = new Map();

  for (const p of predictions) {
    const round = Number(p.round) || roundFromFile(p._sourceFile) || 'unknown';
    const key = String(round);
    if (!predictionGroups.has(key)) predictionGroups.set(key, []);
    predictionGroups.get(key).push(p);
  }
  for (const r of results) {
    const round = String(Number(r.round) || roundFromFile(r._sourceFile) || 'unknown');
    if (!resultRounds.has(round)) resultRounds.set(round, { rows: 0, competitions: {}, matchNumbers: new Set() });
    const entry = resultRounds.get(round);
    entry.rows++;
    const competition = r.competition || 'unspecified';
    entry.competitions[competition] = (entry.competitions[competition] || 0) + 1;
    entry.matchNumbers.add(String(r.matchNumber));
  }

  const rounds = {};
  const modelTotals = {};
  for (const [round, rows] of [...predictionGroups.entries()].sort((a,b) => Number(a[0])-Number(b[0]))) {
    const targets = new Set();
    const groups = new Map();
    let preDeadline = 0, invalidOrPostDeadline = 0, marketVectorRows = 0, missingResultRoundMatch = 0;
    for (const p of rows) {
      const target = [p.round ?? round, p.matchNumber, p.team, p.modelName, p.modelVersion].join('|');
      targets.add(target);
      const groupKey = [p.modelName || 'unknown', p.modelVersion || 'unknown'].join('@');
      if (!groups.has(groupKey)) groups.set(groupKey, { rows: 0, uniqueTargets: new Set(), preDeadline: 0, invalidOrPostDeadline: 0, marketVectorRows: 0 });
      const g = groups.get(groupKey);
      g.rows++;
      g.uniqueTargets.add([p.round ?? round, p.matchNumber, p.team].join('|'));
      if (validPreDeadline(p)) { preDeadline++; g.preDeadline++; }
      else { invalidOrPostDeadline++; g.invalidOrPostDeadline++; }
      if (hasMarketVector(p)) { marketVectorRows++; g.marketVectorRows++; }
      if (!resultKeys.has(`${p.round ?? round}|${p.matchNumber}`)) missingResultRoundMatch++;
    }
    const modelVersions = {};
    for (const [name, g] of groups) {
      modelVersions[name] = {
        rows: g.rows,
        uniqueTargets: g.uniqueTargets.size,
        revisionOrDuplicateRows: g.rows - g.uniqueTargets.size,
        preDeadlineRows: g.preDeadline,
        invalidOrPostDeadlineRows: g.invalidOrPostDeadline,
        rowsWithMarketProbabilityVector: g.marketVectorRows,
      };
      const t = modelTotals[name] ||= { rows: 0, uniqueTargets: 0, preDeadlineRows: 0, invalidOrPostDeadlineRows: 0, rowsWithMarketProbabilityVector: 0 };
      t.rows += g.rows;
      t.uniqueTargets += g.uniqueTargets.size;
      t.preDeadlineRows += g.preDeadline;
      t.invalidOrPostDeadlineRows += g.invalidOrPostDeadline;
      t.rowsWithMarketProbabilityVector += g.marketVectorRows;
    }
    const result = resultRounds.get(round);
    rounds[round] = {
      predictionRows: rows.length,
      uniqueModelVersionTargets: targets.size,
      duplicateOrRevisionRowsApprox: rows.length - targets.size,
      preDeadlineRows: preDeadline,
      invalidOrPostDeadlineRows: invalidOrPostDeadline,
      rowsWithMarketProbabilityVector: marketVectorRows,
      rowsWithoutRoundMatchResult: missingResultRoundMatch,
      resultRows: result?.rows || 0,
      resultCompetitions: result?.competitions || {},
      modelVersions,
    };
  }

  return {
    generatedAt: new Date().toISOString(),
    reportType: 'totoGOAL3-data-inventory',
    readOnly: true,
    inputs: { predictionsDir, resultsDir },
    totals: {
      predictionRows: predictions.length,
      resultRows: results.length,
      predictionRounds: Object.keys(rounds).length,
      resultRounds: resultRounds.size,
      rowsWithMarketProbabilityVector: predictions.filter(hasMarketVector).length,
      note: 'Result joins here check round+matchNumber only; use score_predictions_goal3.js for canonical team/side matching and metrics.',
    },
    byRound: rounds,
    byModelVersion: modelTotals,
    resultCoverageByRound: Object.fromEntries([...resultRounds.entries()].sort((a,b) => Number(a[0])-Number(b[0])).map(([round, v]) => [round, {
      rows: v.rows, matchNumbers: v.matchNumbers.size, competitions: v.competitions,
    }])),
  };
}

if (require.main === module) {
  const predictionsDir = process.argv[2] || path.join(__dirname, '..', 'predictions');
  const resultsDir = process.argv[3] || path.join(__dirname, '..', 'results');
  const outputPath = process.argv[4];
  const report = buildInventory(predictionsDir, resultsDir);
  console.log(JSON.stringify(report, null, 2));
  if (outputPath) fs.writeFileSync(outputPath, JSON.stringify(report, null, 2) + '\n');
}

module.exports = { buildInventory, hasMarketVector, validPreDeadline, readJsonlFiles };
