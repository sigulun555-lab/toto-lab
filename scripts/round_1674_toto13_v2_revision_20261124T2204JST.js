'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { blendOutcomeProbabilities, WEIGHTS } = require('./round_1674_toto13_v2_blend');
const ROOT = path.join(__dirname, '..');
const CONFIG = Object.freeze({
  v1Path: 'predictions/round_1674_ChatGPT_shared_score_v1.jsonl',
  previousV2Path: 'predictions/round_1674_ChatGPT_shared_score_v2.jsonl',
  marketPath: 'reports/round_1674_toto13_official_market_snapshot_20261124T2204JST.json',
  outputPath: 'predictions/round_1674_ChatGPT_shared_score_v2_revision_20261124T2204JST.jsonl',
  product: 'toto13',
  marketType: 'toto13',
  idPrefix: 'toto-1674-chatgpt-score-shared',
  timestampTag: '20261124T2204JST',
  generatedAtUtc: '2026-11-24T13:08:37.000Z',
  modelVersion: 'GPT-shared-poisson-score-v2-market-blend-30-70-2026-11-24T2204JST',
  marketSnapshotPath: 'reports/round_1674_toto13_official_market_snapshot_20261124T2204JST.json',
  notes: 'Experimental comparison only. Official vote shares are market choices, not calibrated true outcome probabilities. No injury/suspension/availability/lineup adjustment. Research-only append-only revision of the prior V2; all prior V1 and V2 rows remain unchanged. Not a production model or market-weight change.'
});
function readJsonl(file) {
  return fs.readFileSync(path.join(ROOT, file), 'utf8').trim().split(/\\r?\\n/).filter(Boolean).map(JSON.parse);
}
function latestByMatch(rows) {
  const latest = new Map();
  for (const row of rows) {
    const previous = latest.get(row.matchNumber);
    if (!previous || Date.parse(row.predictionConfirmedAt) > Date.parse(previous.predictionConfirmedAt)) latest.set(row.matchNumber, row);
  }
  return latest;
}
function buildRows(v1Rows, previousV2Rows, marketSnapshot, options = CONFIG) {
  if (v1Rows.length < 13 || previousV2Rows.length !== 13) throw new Error('toto13 requires V1 history and exactly 13 prior V2 rows');
  if (marketSnapshot.product !== 'toto13' || marketSnapshot.round !== 1674 || marketSnapshot.matches.length !== 13) throw new Error('wrong product, round, or market row count');
  if (marketSnapshot.stale || marketSnapshot.displayAgeSeconds > 300) throw new Error('official market snapshot is stale');
  if (marketSnapshot.countConsistency?.allMatchVoteTotalsEqualPageSummary !== true || marketSnapshot.countConsistency?.allDisplayedPercentagesSumTo100 !== true) throw new Error('official market snapshot failed reconciliation');
  const latestV1 = latestByMatch(v1Rows);
  const priorV2 = new Map(previousV2Rows.map(row => [row.matchNumber, row]));
  if (latestV1.size !== 13 || priorV2.size !== 13) throw new Error('toto13 requires 13 unique matches');
  return [...latestV1.values()].sort((a, b) => a.matchNumber - b.matchNumber).map(base => {
    const market = marketSnapshot.matches.find(row => row.matchNumber === base.matchNumber);
    const previous = priorV2.get(base.matchNumber);
    if (!market || !previous) throw new Error('missing market or prior V2 row for match ' + base.matchNumber);
    return {
      ...base,
      product: options.product,
      marketType: options.marketType,
      productMatchNumber: market.productMatchNumber,
      predictionId: options.idPrefix + '-' + String(base.matchNumber).padStart(2, '0') + '-v2-market-' + options.timestampTag,
      predictionConfirmedAt: options.generatedAtUtc,
      revisionOf: previous.predictionId,
      outcomeProbabilities: blendOutcomeProbabilities(base.outcomeProbabilities, market.marketVoteShare),
      modelVersion: options.modelVersion,
      dataSource: 'V2 probability-level blend: 30% latest GPT Poisson V1 + 70% official product-specific toto vote share. Base V1 row ' + base.predictionId + '; prior V2 row ' + previous.predictionId + '; model.js commit 1e10fa09da1a9dc71feb2ab6e4d1f09cf16dfaef. Official market snapshot ' + options.marketSnapshotPath + ' (display 2026-11-24 22:04 JST; retrieved 22:08:37 JST).',
      notes: options.notes,
      baseModelOutcomeProbabilities: base.outcomeProbabilities,
      marketVoteShare: market.marketVoteShare,
      blendWeights: WEIGHTS,
      marketDataSource: marketSnapshot.source,
      marketDataUrl: marketSnapshot.sourceUrl,
      marketOfficialDisplayAt: marketSnapshot.pageDisplayAt,
      marketRetrievedAt: marketSnapshot.retrievedAt,
      marketSnapshotPath: options.marketSnapshotPath
    };
  });
}
function main() {
  const rows = buildRows(
    readJsonl(CONFIG.v1Path),
    readJsonl(CONFIG.previousV2Path),
    JSON.parse(fs.readFileSync(path.join(ROOT, CONFIG.marketPath), 'utf8'))
  );
  fs.writeFileSync(path.join(ROOT, CONFIG.outputPath), rows.map(row => JSON.stringify(row)).join('\\n') + '\\n');
  process.stdout.write(JSON.stringify({ product: CONFIG.product, round: 1674, rows: rows.length, predictionIds: rows.map(row => row.predictionId) }, null, 2) + '\\n');
}
if (require.main === module) main();
module.exports = { CONFIG, buildRows };
