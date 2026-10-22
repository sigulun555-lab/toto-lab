#!/usr/bin/env node
/**
 * test_toto_compare.js
 *
 * validate_prediction.js / score_predictions.js の動作確認テスト。
 * 一時ディレクトリにテスト用のログを作り、以下を確認する:
 *   1. 正常なレコードが追記できる
 *   2. predictionId 重複は拒否される
 *   3. predictionConfirmedAt >= deadlineAt（締切後確定）は保存時点で拒否される
 *   4. revisionOf を使った修正履歴が、採点時に「締切前の最終確定予測」だけを使う
 *   5. round+matchNumber+home+away が一致しない予測は推測補完されず unresolved になる
 *   6. Brier score が「sum-of-3-squares」方式で算出される（手計算との一致を確認）
 *   7. チーム名が team_name_dictionary.json（Jリーグ公式2026クラブ編成基準）の
 *      正規名称に変換できない場合、推測補完されず unresolvedTeamNames になる
 *   8. gpt側の略称表記とClaude側の正式名称表記が、同じクラブとして正規名称に
 *      統一され、正しく突き合わされる（例: "鹿島" と "鹿島アントラーズ"）
 *
 * 実行方法: node tests/test_toto_compare.js
 * 既存の本番 predictions/ ・ results.jsonl には一切触れない（専用の一時ディレクトリを使用）。
 */
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const assert = require('assert');

const { appendPrediction, validatePrediction, ValidationError } = require('../scripts/validate_prediction.js');
const { buildReport } = require('../scripts/score_predictions.js');

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'toto_compare_test_'));
const predictionsDir = path.join(tmpDir, 'predictions');
fs.mkdirSync(predictionsDir);
const resultsPath = path.join(tmpDir, 'results.jsonl');
const logPath = path.join(predictionsDir, 'round_9001_testmodel.jsonl');

let passed = 0, failed = 0;
function check(name, fn) {
    try { fn(); console.log(`OK   - ${name}`); passed++; }
    catch (e) { console.log(`FAIL - ${name}: ${e.message}`); failed++; }
}

// ---- fixture: 1 valid prediction record ----
const base = {
    predictionId: 'testmodel-v1-r9001-m1-20261020T000000Z',
    round: 9001,
    matchNumber: 1,
    homeTeam: '鹿島', // gpt側の略称表記。正規名称「鹿島アントラーズ」のalias
    awayTeam: '浦和レッズ', // 正規名称そのもの
    probabilities: { '1': 0.5, '0': 0.3, '2': 0.2 },
    predictionConfirmedAt: '2026-10-20T00:00:00Z',
    deadlineAt: '2026-10-21T00:00:00Z',
    modelName: 'testmodel',
    modelVersion: 'v1',
    corrections: { dixonColes: false, drawBoostVariant: null, shrinkageSampleTrust: null, marketBlendWeight: null },
    dataSource: 'unit-test-fixture',
    revisionOf: null,
};

check('1. 正常なレコードを追記できる', () => {
    const r = appendPrediction(logPath, base);
    assert.strictEqual(r.ok, true);
    const lines = fs.readFileSync(logPath, 'utf8').trim().split('\n');
    assert.strictEqual(lines.length, 1);
});

check('2. predictionId 重複は拒否され、ファイルに追記されない', () => {
    let threw = false;
    try { appendPrediction(logPath, base); }
    catch (e) { threw = e instanceof ValidationError; }
    assert.strictEqual(threw, true);
    const lines = fs.readFileSync(logPath, 'utf8').trim().split('\n');
    assert.strictEqual(lines.length, 1, '重複レコードが追記されてはいけない');
});

check('3. 締切後確定（predictionConfirmedAt >= deadlineAt）は保存時点で拒否される', () => {
    const bad = { ...base, predictionId: 'testmodel-v1-r9001-m1-POSTDEADLINE', predictionConfirmedAt: '2026-10-22T00:00:00Z' };
    let threw = false;
    try { appendPrediction(logPath, bad); }
    catch (e) { threw = e instanceof ValidationError && /deadlineAt/.test(e.message); }
    assert.strictEqual(threw, true);
});

check('4. probabilities の合計が1でない場合は拒否される', () => {
    const bad = { ...base, predictionId: 'testmodel-v1-r9001-m1-BADSUM', probabilities: { '1': 0.5, '0': 0.5, '2': 0.5 } };
    let threw = false;
    try { appendPrediction(logPath, bad); } catch (e) { threw = true; }
    assert.strictEqual(threw, true);
});

check('5. revisionOf が未知の predictionId を指す場合は拒否される', () => {
    const bad = { ...base, predictionId: 'testmodel-v1-r9001-m1-REV-ORPHAN', revisionOf: 'does-not-exist' };
    let threw = false;
    try { appendPrediction(logPath, bad); } catch (e) { threw = true; }
    assert.strictEqual(threw, true);
});

// ---- revision: 正しい修正レコードを追記（元の predictionId を参照） ----
const revision = {
    ...base,
    predictionId: 'testmodel-v1-r9001-m1-rev1-20261020T120000Z',
    probabilities: { '1': 0.6, '0': 0.25, '2': 0.15 },
    predictionConfirmedAt: '2026-10-20T12:00:00Z', // 締切前、かつ元レコードより後
    revisionOf: base.predictionId,
};
check('6. 正しい修正（revisionOf）レコードは追記できる', () => {
    const r = appendPrediction(logPath, revision);
    assert.strictEqual(r.ok, true);
});

// ---- 2件目の試合（正規名称に変換不能なチーム名のテスト用: 架空のチーム表記） ----
const unmatchable = {
    ...base,
    predictionId: 'testmodel-v1-r9001-m2-20261020T000000Z',
    matchNumber: 2,
    homeTeam: '存在しないチームA',
    awayTeam: '存在しないチームB',
};
appendPrediction(logPath, unmatchable);

// ---- results.jsonl: match 1 の結果のみ記録。home/awayはClaude側の正式名称表記
//      （予測側はgpt側の略称「鹿島」）で、あえて違う表記にして正規名称統一を検証する。
//      match 2 は正規名称に変換できないため照合不可のまま。
fs.writeFileSync(resultsPath, JSON.stringify({
    round: 9001, matchNumber: 1, homeTeam: '鹿島アントラーズ', awayTeam: '浦和レッズ',
    homeGoals: 2, awayGoals: 1, competition: 'J1', finishedAt: '2026-10-20T15:00:00Z',
}) + '\n');

const report = buildReport(predictionsDir, resultsPath);

check('7. 修正履歴のうち、締切前の最終確定予測（revision）だけが採点に使われる', () => {
    assert.strictEqual(report.usedRecordCount, 1, `採点対象は1件のみのはず（match2は未照合）。実際: ${report.usedRecordCount}`);
    assert.strictEqual(report.supersededByRevisionCount, 1, '元レコードは revision に supersede されているはず');
    const used = report.supersededRecords[0];
    assert.strictEqual(used.supersededBy, revision.predictionId);
});

check('8. gpt側の略称「鹿島」とClaude側正式名称「鹿島アントラーズ」が同一クラブの正規名称に統一され、文字列が異なっていても正しく突き合わされる', () => {
    // 予測側 homeTeam="鹿島"、結果側 homeTeam="鹿島アントラーズ" は文字列としては不一致だが、
    // 正規名称(canonicalName)に変換すればどちらも「鹿島アントラーズ」になるため照合が成立する。
    // report.usedRecordCount===1（チェック7）はこの統一が実際に機能した証拠そのもの。
    assert.strictEqual(report.unresolvedTeamNameCount, 1, '正規名称に変換できないのは match2 の1件だけのはず');
    assert.strictEqual(report.unresolvedCount, 0, '正規名称に変換できたmatch1は、結果との不一致(unresolved)にはならないはず');
});

check('9. 正規名称に変換できない試合（架空のチーム名）は推測補完されず unresolvedTeamNames になる', () => {
    assert.strictEqual(report.unresolvedTeamNames[0].homeTeam, '存在しないチームA');
    assert.ok(/team_name_dictionary\.json/.test(report.unresolvedTeamNames[0].reason));
});

check('10. Brier score が sum-of-3-squares 方式で正しく算出される', () => {
    // revision の確率 {1:0.6, 0:0.25, 2:0.15}、実際の結果は home win (y='1')
    // brier = (0.6-1)^2 + (0.25-0)^2 + (0.15-0)^2 = 0.16 + 0.0625 + 0.0225 = 0.245
    const expectedBrier = (0.6 - 1) ** 2 + (0.25 - 0) ** 2 + (0.15 - 0) ** 2;
    const got = report.byModel['testmodel'].brier;
    assert.ok(Math.abs(got - expectedBrier) < 1e-9, `期待値=${expectedBrier}, 実際=${got}`);
    assert.strictEqual(report.byModel['testmodel'].brierConvention, 'sum-of-3-squares (no division)');
});

check('11. モデル×リーグ別の集計が機能する（results側の competition フィールドを使用）', () => {
    const key = 'testmodel__J1';
    assert.ok(report.byModelAndCompetition[key], 'testmodel__J1 の集計が存在するはず');
    assert.strictEqual(report.byModelAndCompetition[key].n, 1);
});

console.log(`\n${passed} passed, ${failed} failed`);
fs.rmSync(tmpDir, { recursive: true, force: true });
process.exit(failed ? 1 : 0);
