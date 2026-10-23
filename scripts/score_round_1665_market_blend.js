#!/usr/bin/env node
'use strict';

// Compare GPT's saved Poisson probabilities, market vote-share probabilities,
// and the separately stored 30/70 market-blend V2 on the same completed fixtures.
// Results are read from results/round_1665.jsonl; this script never edits predictions.
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const readJsonl = (file) => {
  if (!fs.existsSync(file)) return [];
  return fs.readFileSync(file, 'utf8').split(/\r?\n/).filter(Boolean).map((line, i) => {
    try { return JSON.parse(line); }
    catch (error) { throw new Error(file + ':' + (i + 1) + ' is not valid JSON: ' + error.message); }
  });
};
const outcome = (r) => r.homeGoals > r.awayGoals ? '1' : r.homeGoals === r.awayGoals ? '0' : '2';
const argmax = (p) => ['1', '0', '2'].reduce((best, k) => p[k] > p[best] ? k : best, '1');
function scoreRows(rows) {
  if (!rows.length) return { matchesScored: 0, accuracy: null, brierScore: null, logLoss: null };
  let correct = 0, brierTotal = 0, logLossTotal = 0;
  for (const row of rows) {
    const actual = row.actual;
    if (argmax(row.probabilities) === actual) correct++;
    for (const key of ['1', '0', '2']) {
      const target = key === actual ? 1 : 0;
      brierTotal += (row.probabilities[key] - target) ** 2;
    }
    logLossTotal -= Math.log(Math.max(1e-15, row.probabilities[actual]));
  }
  return {
    matchesScored: rows.length,
    accuracy: correct / rows.length,
    brierScore: brierTotal / rows.length,
    logLoss: logLossTotal / rows.length,
  };
}
function buildReport(baseRows, resultRows) {
  const resultByMatch = new Map();
  for (const r of resultRows) {
    if (r.round !== 1665 || !Number.isInteger(r.matchNumber)) continue;
    if (!Number.isFinite(r.homeGoals) || !Number.isFinite(r.awayGoals)) continue;
    resultByMatch.set(r.matchNumber, r);
  }
  // Append-only prediction logs may contain multiple revisions per fixture.
  // Use the last record for each match number (latest appended revision).
  const latestByMatch = new Map();
  for (const row of baseRows) latestByMatch.set(row.matchNumber, row);
  const predictionRows = [...latestByMatch.values()].sort((a, b) => a.matchNumber - b.matchNumber);
  const models = [
    { key: 'gptPoisson', label: 'GPT Poisson only', probabilities: r => r.baseModelProbabilities },
    { key: 'marketOnly', label: 'Toto vote share only (not true outcome probabilities)', probabilities: r => r.marketVoteShare },
    { key: 'marketBlendV2', label: 'GPT + market blend V2 (30% model / 70% market)', probabilities: r => r.probabilities },
  ];
  const scored = [];
  for (const p of predictionRows) {
    const result = resultByMatch.get(p.matchNumber);
    if (!result) continue;
    scored.push({
      matchNumber: p.matchNumber,
      homeTeam: p.homeTeam,
      awayTeam: p.awayTeam,
      actual: outcome(result),
      result: { homeGoals: result.homeGoals, awayGoals: result.awayGoals },
      modelProbabilities: Object.fromEntries(models.map(m => [m.key, m.probabilities(p)])),
    });
  }
  const comparisons = {};
  for (const m of models) {
    comparisons[m.key] = {
      label: m.label,
      ...scoreRows(scored.map(s => ({ actual: s.actual, probabilities: m.probabilities(predictionRows.find(p => p.matchNumber === s.matchNumber)) }))),
    };
  }
  return {
    round: 1665,
    status: scored.length === 13 ? 'complete' : scored.length > 0 ? 'partial_results' : 'awaiting_results',
    scoredMatchNumbers: scored.map(s => s.matchNumber).sort((a, b) => a - b),
    missingMatchNumbers: predictionRows.map(r => r.matchNumber).filter(n => !resultByMatch.has(n)).sort((a, b) => a - b),
    metricDefinitions: {
      accuracy: 'argmax probability equals actual 1X2 outcome',
      brierScore: 'mean per-match sum of three squared errors; lower is better',
      logLoss: 'mean negative log probability assigned to actual outcome; lower is better',
      outcomeKeys: { '1': 'home win', '0': 'draw', '2': 'away win' },
    },
    comparisons,
    matches: scored.map(s => ({
      matchNumber: s.matchNumber, homeTeam: s.homeTeam, awayTeam: s.awayTeam,
      result: s.result, actual: s.actual, modelProbabilities: s.modelProbabilities,
    })),
    source: 'predictions/round_1665_ChatGPT_market_blend_v2.jsonl + results/round_1665.jsonl',
    note: scored.length < 13 ? 'Only matches with verified final scores are scored. Missing results are not treated as misses.' : 'All 13 fixtures have verified scores.',
  };
}
function main() {
  const predictions = readJsonl(path.join(root, 'predictions', 'round_1665_ChatGPT_market_blend_v2.jsonl'));
  const results = readJsonl(path.join(root, 'results', 'round_1665.jsonl'));
  const report = buildReport(predictions, results);
  const outPath = path.join(root, 'reports', 'round_1665_market_blend_comparison.json');
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify({ reportPath: 'reports/round_1665_market_blend_comparison.json', status: report.status, scoredMatches: report.scoredMatchNumbers.length, missingMatchNumbers: report.missingMatchNumbers, comparisons: report.comparisons }, null, 2));
}
if (require.main === module) main();
module.exports = { outcome, scoreRows, buildReport };
