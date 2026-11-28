'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { blendOutcomeProbabilities } = require('./round_1675_toto13_v2_blend');
const ROOT = path.join(__dirname, '..');
const V1 = 'predictions/round_1675_ChatGPT_shared_score_v1_revision_20261126T022833JST.jsonl';
const MARKET = 'reports/round_1675_toto13_official_market_snapshot_20261128T1245JST.json';
const OUTPUT = 'predictions/round_1675_ChatGPT_shared_score_v2_market_refresh_20261128T1245JST.jsonl';
function readJsonl(file) {
  return fs.readFileSync(path.join(ROOT, file), 'utf8').trim().split(/\\r?\\n/).filter(Boolean).map(JSON.parse);
}
function buildProvisionalRows(v1Rows, market) {
  if (market.product !== 'toto13' || market.round !== 1675 || market.matches.length !== 13) throw new Error('expected round 1675 toto13 market with 13 matches');
  if (market.voteDataFreshnessVerified !== false || market.voteStatusUpdatedAt !== null) throw new Error('this provisional generator is only for explicitly unverified vote-data freshness');
  if (v1Rows.length !== 13) throw new Error('expected exactly 13 V1 rows');
  return v1Rows.map((base, i) => {
    const m = market.matches.find(x => x.matchNumber === base.matchNumber);
    if (!m || base.homeTeam.normalize('NFKC') !== m.homeTeam.normalize('NFKC') || base.awayTeam.normalize('NFKC') !== m.awayTeam.normalize('NFKC')) throw new Error('team mismatch at match ' + base.matchNumber);
    const p = blendOutcomeProbabilities(base.outcomeProbabilities, m.marketVoteShare);
    return {
      ...base, product:'toto13', marketType:'toto13', productMatchNumber:m.productMatchNumber,
      predictionId:'toto-1675-chatgpt-score-shared-' + String(base.matchNumber).padStart(2,'0') + '-v2-market-refresh-20261128T1245JST',
      predictionConfirmedAt:'2026-11-28T03:56:06.000Z', revisionOf:base.predictionId,
      outcomeProbabilities:p, modelVersion:'GPT-shared-poisson-score-v2-market-blend-30-70-2026-11-28-provisional',
      dataSource:'PROVISIONAL: 30% saved GPT Poisson V1 + 70% official toto13 vote share. V1 ' + base.predictionId + '; market snapshot ' + MARKET + ' (page display 12:45 JST, retrieval 12:56:06 JST).',
      notes:'PROVISIONAL ONLY. Official page-display age is 666 seconds and separate voteStatusUpdatedAt was not exposed. The 300-second vote-data freshness gate is unverified; do not mark as fresh deadline submission or production prediction.',
      baseModelOutcomeProbabilities:base.outcomeProbabilities, marketVoteShare:m.marketVoteShare,
      blendWeights:{poissonModel:0.3,totoVoteShare:0.7},
      marketDataSource:market.source, marketDataUrl:market.sourceUrl,
      marketOfficialDisplayAt:market.pageDisplayAt, marketRetrievedAt:market.retrievedAt, marketSnapshotPath:MARKET
    };
  });
}
function main() {
 const rows = buildProvisionalRows(readJsonl(V1), JSON.parse(fs.readFileSync(path.join(ROOT, MARKET), 'utf8')));
 fs.writeFileSync(path.join(ROOT, OUTPUT), rows.map(x=>JSON.stringify(x)).join('\\n')+'\\n');
 process.stdout.write(JSON.stringify({rows:rows.length, provisional:true, voteDataFreshnessVerified:false, output:OUTPUT}, null, 2)+'\\n');
}
if (require.main === module) main();
module.exports = { buildProvisionalRows };
