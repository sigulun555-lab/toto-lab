const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const readJsonl = file => fs.readFileSync(path.join(root, file), 'utf8').trim().split(/\r?\n/).map(JSON.parse);
const round8 = n => Number(n.toFixed(8));
const sum = obj => Object.values(obj).reduce((a, b) => a + b, 0);

test('round 1670 toto13 V1/V2 snapshots are complete, pre-deadline, append-only, and use the frozen 30/70 blend', () => {
  const v1 = readJsonl('predictions/round_1670_ChatGPT_shared_score_v1.jsonl');
  const v2 = readJsonl('predictions/round_1670_ChatGPT_shared_score_v2.jsonl');
  const marketInitial = JSON.parse(fs.readFileSync(path.join(root, 'reports/round_1670_toto13_official_market_snapshot_20261106T0214JST.json'), 'utf8'));
  const marketRevision = JSON.parse(fs.readFileSync(path.join(root, 'reports/round_1670_toto13_official_market_snapshot_20261106T1145JST.json'), 'utf8'));
  const news = JSON.parse(fs.readFileSync(path.join(root, 'reports/round_1670_toto13_team_news_20261106.json'), 'utf8'));
  const v2Initial = v2.filter(x => x.revisionOf === null);
  const v2Revisions = v2.filter(x => x.revisionOf !== null);

  assert.equal(v1.length, 13);
  assert.equal(v2.length, 26);
  assert.equal(v2Initial.length, 13);
  assert.equal(v2Revisions.length, 13);
  assert.equal(new Set(v1.map(x => x.predictionId)).size, 13);
  assert.equal(new Set(v2.map(x => x.predictionId)).size, 26);
  assert.equal(marketInitial.rows.length, 13);
  assert.equal(marketRevision.rows.length, 13);
  assert.equal(news.teams.length, 26);
  assert.equal(news.modelExecution.modelBlobSha, '20cde0fc85016db3ef7abac7d2bb485510ba4e22');
  assert.equal(news.modelExecution.historyBlobSha, 'ed832e99a3ad7efc6be1e4115f94527263ce4df9');
  assert.equal(news.modelExecution.teamAliasesBlobSha, '5de22584524ff4c07ddac1d27f49afbbbc5f88ab');
  assert.ok(v1.every(x => !x.dataSource.includes('undefined')));
  assert.equal(new Set(news.teams.map(x => x.team)).size, 26);
  assert.equal(marketInitial.overallVotes, 323902);
  assert.equal(marketRevision.overallVotes, 372503);
  assert.equal(marketRevision.officialDisplayAt, '2026-11-06T11:45:00+09:00');
  assert.equal(marketRevision.retrievedAt, '2026-11-06T03:06:31Z');
  assert.equal(marketRevision.rows.every(x => x.totalVotes === 372503), true);
  assert.ok(Date.parse(v1[0].predictionConfirmedAt) < Date.parse('2026-11-06T13:00:00Z'));
  assert.ok(Date.parse(v1[0].predictionConfirmedAt) < Date.parse(v1[0].deadlineAt));

  for (let i = 0; i < 13; i++) {
    const initial = v2Initial[i];
    const revision = v2Revisions[i];
    assert.equal(v1[i].round, 1670);
    assert.equal(initial.round, 1670);
    assert.equal(revision.round, 1670);
    assert.equal(v1[i].matchNumber, i + 1);
    assert.equal(initial.matchNumber, i + 1);
    assert.equal(revision.matchNumber, i + 1);
    assert.equal(v1[i].revisionOf, null);
    assert.equal(initial.revisionOf, null);
    assert.equal(revision.revisionOf, initial.predictionId);
    assert.equal(v1[i].historyMatchesPerTeam, 12);
    assert.equal(initial.historyMatchesPerTeam, 12);
    assert.equal(revision.historyMatchesPerTeam, 12);
    assert.ok(Math.abs(sum(v1[i].outcomeProbabilities) - 1) < 1e-7);
    assert.ok(Math.abs(sum(initial.outcomeProbabilities) - 1) < 1e-7);
    assert.ok(Math.abs(sum(revision.outcomeProbabilities) - 1) < 1e-7);
    assert.deepEqual(initial.baseModelOutcomeProbabilities, v1[i].outcomeProbabilities);
    assert.deepEqual(revision.baseModelOutcomeProbabilities, v1[i].outcomeProbabilities);
    assert.deepEqual(initial.marketVoteShare, marketInitial.rows[i].marketVoteShare);
    assert.deepEqual(revision.marketVoteShare, marketRevision.rows[i].marketVoteShare);
    for (const row of [initial, revision]) {
      assert.equal(row.blendWeights.poissonModel, 0.3);
      assert.equal(row.blendWeights.totoVoteShare, 0.7);
    }
    for (const key of ['0', '1', '2']) {
      const expectedInitial = round8(0.3 * v1[i].outcomeProbabilities[key] + 0.7 * marketInitial.rows[i].marketVoteShare[key]);
      const expectedRevision = round8(0.3 * v1[i].outcomeProbabilities[key] + 0.7 * marketRevision.rows[i].marketVoteShare[key]);
      assert.equal(initial.outcomeProbabilities[key], expectedInitial);
      assert.equal(revision.outcomeProbabilities[key], expectedRevision);
    }
    assert.equal(revision.predictionConfirmedAt, marketRevision.retrievedAt);
    assert.equal(revision.marketOfficialDisplayAt, marketRevision.officialDisplayAt);
    assert.ok(Date.parse(revision.predictionConfirmedAt) < Date.parse(revision.deadlineAt));
  }

  assert.ok(news.officialSuspensionRecords.some(x => x.team === '水戸ホーリーホック' && x.player === '真瀬 拓海'));
  assert.ok(news.officialSuspensionRecords.some(x => x.team === '浦和レッズ' && x.player === '宮本 優太'));
  assert.ok(news.officialInjuryRecords.some(x => x.team === 'カターレ富山' && x.player === 'チョン ウヨン'));
  assert.ok(news.officialInjuryRecords.some(x => x.team === '北海道コンサドーレ札幌' && x.player === '福森 晃斗'));
});
