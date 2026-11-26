'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { blendOutcomeProbabilities, WEIGHTS } = require('./round_1675_toto13_v2_blend');
const ROOT = path.join(__dirname, '..');
const CONFIG = Object.freeze({
  v1Path: 'predictions/round_1675_ChatGPT_shared_score_v1_revision_20261126T022833JST.jsonl',
  marketPath: 'reports/round_1675_toto13_official_market_snapshot_20261126T2205JST.json',
  outputPath: 'predictions/round_1675_ChatGPT_shared_score_v2.jsonl',
  product: 'toto13',
  marketType: 'toto13',
  idPrefix: 'toto-1675-chatgpt-score-shared',
  timestampTag: '20261126T2206JST',
  generatedAtUtc: '2026-11-26T13:06:06.000Z',
  modelVersion: 'GPT-shared-poisson-score-v2-market-blend-30-70-2026-11-26',
  marketSnapshotPath: 'reports/round_1675_toto13_official_market_snapshot_20261126T2205JST.json',
  notes: 'Experimental comparison only. Official vote shares are market choices, not calibrated true outcome probabilities. No injury/suspension/availability/lineup adjustment. Research-only; not a production model or market-weight change.'
});
function readJsonl(file) {
  return fs.readFileSync(path.join(ROOT, file), 'utf8').trim().split(/\r?\n/).filter(Boolean).map(JSON.parse);
}
function buildRows(v1Rows, marketSnapshot, options = CONFIG) {
  const latest = new Map();
  for (const row of v1Rows) {
    const previous = latest.get(row.matchNumber);
    if (!previous || Date.parse(row.predictionConfirmedAt) > Date.parse(previous.predictionConfirmedAt)) latest.set(row.matchNumber, row);
  }
  const bases = [...latest.values()].sort((a, b) => a.matchNumber - b.matchNumber);
  if (bases.length !== 13 || marketSnapshot.matches.length !== 13) throw new Error('toto13 requires exactly 13 latest V1 and official market rows');
  return bases.map(base => {
    const market = marketSnapshot.matches.find(row => row.matchNumber === base.matchNumber);
    if (!market) throw new Error('missing official market row for match ' + base.matchNumber);
    if (String(base.homeTeam).normalize('NFKC') !== String(market.homeTeam).normalize('NFKC') ||
        String(base.awayTeam).normalize('NFKC') !== String(market.awayTeam).normalize('NFKC')) {
      throw new Error('team mismatch for match ' + base.matchNumber);
    }
    const outcomeProbabilities = blendOutcomeProbabilities(base.outcomeProbabilities, market.marketVoteShare);
    return {
      ...base,
      product: options.product,
      marketType: options.marketType,
      productMatchNumber: market.productMatchNumber,
      predictionId: options.idPrefix + '-' + String(base.matchNumber).padStart(2, '0') + '-v2-market-' + options.timestampTag,
      predictionConfirmedAt: options.generatedAtUtc,
      revisionOf: base.predictionId,
      outcomeProbabilities,
      modelVersion: options.modelVersion,
      dataSource: 'V2 probability-level blend: 30% latest GPT Poisson V1 revision + 70% official product-specific toto vote share. Base V1 row ' + base.predictionId + '; model.js commit a678a296a13eea4beec142083107e69ffda2fed4; 537 completed J1/J2/J3 matches through 2026-11-25. Official market snapshot ' + options.marketSnapshotPath + ' (display 2026-11-26 22:05 JST; retrieved 22:06:06 JST).',
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
  const rows = buildRows(readJsonl(CONFIG.v1Path), JSON.parse(fs.readFileSync(path.join(ROOT, CONFIG.marketPath), 'utf8')));
  fs.writeFileSync(path.join(ROOT, CONFIG.outputPath), rows.map(row => JSON.stringify(row)).join('\n') + '\n');
  process.stdout.write(JSON.stringify({ product: CONFIG.product, round: 1675, rows: rows.length, predictionIds: rows.map(row => row.predictionId) }, null, 2) + '\n');
}
if (require.main === module) main();
module.exports = { CONFIG, buildRows };
