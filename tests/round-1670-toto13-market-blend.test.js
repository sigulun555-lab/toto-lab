const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const readJsonl = file => fs.readFileSync(path.join(root, file), 'utf8').trim().split(/\\r?\\n/).map(JSON.parse);
const round8 = n => Number(n.toFixed(8));
const sum = obj => Object.values(obj).reduce((a, b) => a + b, 0);

test('round 1670 toto13 V1/V2 are complete, pre-deadline, and use the frozen 30/70 blend', () => {
  const v1 = readJsonl('predictions/round_1670_ChatGPT_shared_score_v1.jsonl');
  const v2 = readJsonl('predictions/round_1670_ChatGPT_shared_score_v2.jsonl');
  const market = JSON.parse(fs.readFileSync(path.join(root, 'reports/round_1670_toto13_official_market_snapshot_20261106T0214JST.json'), 'utf8'));
  const news = JSON.parse(fs.readFileSync(path.join(root, 'reports/round_1670_toto13_team_news_20261106.json'), 'utf8'));

  assert.equal(v1.length, 13);
  assert.equal(v2.length, 13);
  assert.equal(new Set(v1.map(x => x.predictionId)).size, 13);
  assert.equal(new Set(v2.map(x => x.predictionId)).size, 13);
  assert.equal(market.rows.length, 13);
  assert.equal(news.teams.length, 26);
  assert.equal(news.modelExecution.modelBlobSha, '20cde0fc85016db3ef7abac7d2bb485510ba4e22');
  assert.equal(news.modelExecution.historyBlobSha, 'ed832e99a3ad7efc6be1e4115f94527263ce4df9');
  assert.equal(news.modelExecution.teamAliasesBlobSha, '5de22584524ff4c07ddac1d27f49afbbbc5f88ab');
  assert.ok(v1.every(x => !x.dataSource.includes('undefined')));
  assert.equal(new Set(news.teams.map(x => x.team)).size, 26);
  assert.equal(market.overallVotes, 323902);
  assert.ok(Date.parse(v1[0].predictionConfirmedAt) < Date.parse('2026-11-06T13:00:00Z'));
  assert.ok(Date.parse(v1[0].predictionConfirmedAt) < Date.parse(v1[0].deadlineAt));

  for (let i = 0; i < 13; i++) {
    assert.equal(v1[i].round, 1670);
    assert.equal(v2[i].round, 1670);
    assert.equal(v1[i].matchNumber, i + 1);
    assert.equal(v2[i].matchNumber, i + 1);
    assert.equal(v1[i].revisionOf, null);
    assert.equal(v2[i].revisionOf, null);
    assert.equal(v1[i].historyMatchesPerTeam, 12);
    assert.equal(v2[i].historyMatchesPerTeam, 12);
    assert.ok(Math.abs(sum(v1[i].outcomeProbabilities) - 1) < 1e-7);
    assert.ok(Math.abs(sum(v2[i].outcomeProbabilities) - 1) < 1e-7);
    assert.deepEqual(v2[i].baseModelOutcomeProbabilities, v1[i].outcomeProbabilities);
    assert.deepEqual(v2[i].marketVoteShare, market.rows[i].marketVoteShare);
    assert.equal(v2[i].blendWeights.poissonModel, 0.3);
    assert.equal(v2[i].blendWeights.totoVoteShare, 0.7);
    for (const key of ['0', '1', '2']) {
      const expected = round8(0.3 * v1[i].outcomeProbabilities[key] + 0.7 * market.rows[i].marketVoteShare[key]);
      assert.ok(Math.abs(expected - v2[i].outcomeProbabilities[key]) <= 1e-8);
    }
  }

  assert.ok(news.officialSuspensionRecords.some(x => x.team === '水戸ホーリーホック' && x.player === '真瀬 拓海'));
  assert.ok(news.officialSuspensionRecords.some(x => x.team === '浦和レッズ' && x.player === '宮本 優太'));
  assert.ok(news.officialInjuryRecords.some(x => x.team === 'カターレ富山' && x.player === 'チョン ウヨン'));
  assert.ok(news.officialInjuryRecords.some(x => x.team === '北海道コンサドーレ札幌' && x.player === '福森 晃斗'));
});
