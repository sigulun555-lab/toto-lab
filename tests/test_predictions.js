#!/usr/bin/env node
/**
 * test_predictions.js
 *
 * scripts/validate_prediction.js / scripts/score_predictions.js の動作確認テスト。
 * 一時ディレクトリにテスト用のログを作り、以下を確認する:
 *   1. 正常なレコードが追記できる
 *   2. predictionId 重複は拒否される
 *   3. predictionConfirmedAt >= deadlineAt（締切後確定）は保存時点で拒否される
 *   4. probabilities の合計が1でない場合は拒否される
 *   5. revisionOf が未知の predictionId を指す場合は拒否される
 *   6. revisionOf を使った修正履歴が追記できる
 *   7. スキーマに無いフィールド（additionalProperties:false）は拒否される
 *   8. modelName が "ChatGPT"/"Claude" 以外の場合は拒否される
 *   9. 修正履歴のうち、締切前の最終確定予測（revision）だけが採点に使われる
 *  10. gpt側の略称表記とClaude側の正式名称表記が、同じクラブとして正規名称に統一され、
 *      正しく突き合わされる（例: "鹿島" と "鹿島アントラーズ"）
 *  11. data/teams.json の canonical に変換できないチーム名（架空のチーム名）は、保存は
 *      ブロックせず warnings に記録され、採点時に推測補完せず unresolvedTeamNames になる
 *  12. Brier score が「sum-of-3-squares」方式で算出される（手計算との一致を確認）
 *  13. モデル×リーグ別の集計が機能する（results側の competition フィールドを使用）
 *
 * 実行方法: node tests/test_predictions.js
 * 既存の本番 predictions/ ・ results/ には一切触れない（専用の一時ディレクトリを使用）。
 */
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const assert = require('assert');

const { appendPrediction, validatePrediction, ValidationError } = require('../scripts/validate_prediction.js');
const { buildReport } = require('../scripts/score_predictions.js');

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'toto_lab_test_'));
const predictionsDir = path.join(tmpDir, 'predictions');
fs.mkdirSync(predictionsDir);
const resultsPath = path.join(tmpDir, 'results.jsonl');
const logPath = path.join(predictionsDir, 'round_9001_TestModel.jsonl');

let passed = 0, failed = 0;
function check(name, fn) {
    try { fn(); console.log(`OK   - ${name}`); passed++; }
    catch (e) { console.log(`FAIL - ${name}: ${e.message}`); failed++; }
}

// ---- fixture: 1 valid prediction record ----
const base = {
    predictionId: 'ChatGPT-v1-r9001-m1-20261020T000000Z',
    round: 9001,
    matchNumber: 1,
    homeTeam: '鹿島', // gpt側の略称表記。正規名称「鹿島アントラーズ」のalias
    awayTeam: '浦和レッズ', // 正規名称そのもの
    probabilities: { '1': 0.5, '0': 0.3, '2': 0.2 },
    predictionConfirmedAt: '2026-10-20T00:00:00Z',
    deadlineAt: '2026-10-21T00:00:00Z',
    modelName: 'ChatGPT',
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
    const bad = { ...base, predictionId: 'ChatGPT-v1-r9001-m1-POSTDEADLINE', predictionConfirmedAt: '2026-10-22T00:00:00Z' };
    let threw = false;
    try { appendPrediction(logPath, bad); }
    catch (e) { threw = e instanceof ValidationError && /deadlineAt/.test(e.message); }
    assert.strictEqual(threw, true);
});

check('4. probabilities の合計が1でない場合は拒否される', () => {
    const bad = { ...base, predictionId: 'ChatGPT-v1-r9001-m1-BADSUM', probabilities: { '1': 0.5, '0': 0.5, '2': 0.5 } };
    let threw = false;
    try { appendPrediction(logPath, bad); } catch (e) { threw = true; }
    assert.strictEqual(threw, true);
});

check('5. revisionOf が未知の predictionId を指す場合は拒否される', () => {
    const bad = { ...base, predictionId: 'ChatGPT-v1-r9001-m1-REV-ORPHAN', revisionOf: 'does-not-exist' };
    let threw = false;
    try { appendPrediction(logPath, bad); } catch (e) { threw = true; }
    assert.strictEqual(threw, true);
});

check('7. スキーマに無いフィールドは additionalProperties:false により拒否される', () => {
    const bad = { ...base, predictionId: 'ChatGPT-v1-r9001-m1-EXTRAFIELD', unexpectedField: 'x' };
    let threw = false, msg = '';
    try { appendPrediction(logPath, bad); } catch (e) { threw = true; msg = e.message; }
    assert.strictEqual(threw, true);
    assert.ok(/未知のフィールド/.test(msg));
});

check('8. modelName が "ChatGPT"/"Claude" 以外は拒否される', () => {
    const bad = { ...base, predictionId: 'ChatGPT-v1-r9001-m1-BADMODEL', modelName: 'chatgpt' };
    let threw = false;
    try { appendPrediction(logPath, bad); } catch (e) { threw = true; }
    assert.strictEqual(threw, true);
});

// ---- revision: 正しい修正レコードを追記（元の predictionId を参照） ----
const revision = {
    ...base,
    predictionId: 'ChatGPT-v1-r9001-m1-rev1-20261020T120000Z',
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
    predictionId: 'ChatGPT-v1-r9001-m2-20261020T000000Z',
    matchNumber: 2,
    homeTeam: '存在しないチームA',
    awayTeam: '存在しないチームB',
};
check('11a. 正規名称に変換できないチーム名でも保存自体は拒否されない（warningのみ）', () => {
    const r = appendPrediction(logPath, unmatchable);
    assert.strictEqual(r.ok, true);
    assert.ok(r.warnings.some(w => /data\/teams\.json/.test(w)), 'data/teams.jsonを参照した未解決の警告があるはず');
});

// ---- results.jsonl: match 1 の結果のみ記録。home/awayはClaude側の正式名称表記
//      （予測側はgpt側の略称「鹿島」）で、あえて違う表記にして正規名称統一を検証する。
//      match 2 は正規名称に変換できないため照合不可のまま。
fs.writeFileSync(resultsPath, JSON.stringify({
    round: 9001, matchNumber: 1, homeTeam: '鹿島アントラーズ', awayTeam: '浦和レッズ',
    homeGoals: 2, awayGoals: 1, competition: 'J1', finishedAt: '2026-10-20T15:00:00Z',
}) + '\n');

const report = buildReport(predictionsDir, resultsPath);

check('9. 修正履歴のうち、締切前の最終確定予測（revision）だけが採点に使われる', () => {
    assert.strictEqual(report.usedRecordCount, 1, `採点対象は1件のみのはず（match2は未照合）。実際: ${report.usedRecordCount}`);
    assert.strictEqual(report.supersededByRevisionCount, 1, '元レコードは revision に supersede されているはず');
    const used = report.supersededRecords[0];
    assert.strictEqual(used.supersededBy, revision.predictionId);
});

check('10. gpt側の略称「鹿島」とClaude側正式名称「鹿島アントラーズ」が同一クラブの正規名称に統一され、文字列が異なっていても正しく突き合わされる', () => {
    assert.strictEqual(report.unresolvedTeamNameCount, 1, '正規名称に変換できないのは match2 の1件だけのはず');
    assert.strictEqual(report.unresolvedCount, 0, '正規名称に変換できたmatch1は、結果との不一致(unresolved)にはならないはず');
});

check('11b. 正規名称に変換できない試合（架空のチーム名）は推測補完されず unresolvedTeamNames になる', () => {
    assert.strictEqual(report.unresolvedTeamNames[0].homeTeam, '存在しないチームA');
    assert.ok(/data\/teams\.json/.test(report.unresolvedTeamNames[0].reason));
});

check('12. Brier score が sum-of-3-squares 方式で正しく算出される', () => {
    // revision の確率 {1:0.6, 0:0.25, 2:0.15}、実際の結果は home win (y='1')
    const expectedBrier = (0.6 - 1) ** 2 + (0.25 - 0) ** 2 + (0.15 - 0) ** 2;
    const got = report.byModel['ChatGPT'].brier;
    assert.ok(Math.abs(got - expectedBrier) < 1e-9, `期待値=${expectedBrier}, 実際=${got}`);
    assert.strictEqual(report.byModel['ChatGPT'].brierConvention, 'sum-of-3-squares (no division)');
});

check('13. モデル×リーグ別の集計が機能する（results側の competition フィールドを使用）', () => {
    const key = 'ChatGPT__J1';
    assert.ok(report.byModelAndCompetition[key], 'ChatGPT__J1 の集計が存在するはず');
    assert.strictEqual(report.byModelAndCompetition[key].n, 1);
});

// ---- *_goal3.jsonl（totoGOAL3用。team/opponent/isHomeスキーマ、homeTeam/awayTeamが無い）が
//      同じpredictions/ディレクトリに混在していても、1X2用のscore_predictions.jsが
//      誤って読み込まない（homeTeam=undefinedがunresolvedTeamNamesにノイズとして
//      混入しない）ことを確認する（2026-10-22、実データ検証で発覚した不具合の再発防止）。
fs.writeFileSync(path.join(predictionsDir, 'round_9001_TestModel_goal3.jsonl'), JSON.stringify({
    predictionId: 'goal3-dummy', round: 9001, matchNumber: 1, marketType: 'totoGOAL3',
    team: '鹿島アントラーズ', opponent: '浦和レッズ', isHome: true,
    probabilities: { '0': 0.2, '1': 0.3, '2': 0.3, '3': 0.2 },
    predictionConfirmedAt: '2026-10-20T00:00:00Z', deadlineAt: '2026-10-21T00:00:00Z',
    modelName: 'ChatGPT', modelVersion: 'v1', revisionOf: null,
}) + '\n');
check('14. *_goal3.jsonl（totoGOAL3用スキーマ）はscore_predictions.js（1X2用）の読み込み対象外になる', () => {
    const report2 = buildReport(predictionsDir, resultsPath);
    assert.strictEqual(report2.inputCounts.predictions, report.inputCounts.predictions, 'goal3ファイルを追加しても1X2側の予測件数は変化しないはず');
    assert.ok(!report2.unresolvedTeamNames.some(u => u.predictionId === 'goal3-dummy'), 'goal3用レコードがunresolvedTeamNamesにノイズとして混入していないはず');
});

console.log(`\n${passed} passed, ${failed} failed`);
fs.rmSync(tmpDir, { recursive: true, force: true });
process.exit(failed ? 1 : 0);
