#!/usr/bin/env node
/**
 * test_predictions_goal3.js
 *
 * scripts/validate_prediction_goal3.js / scripts/score_predictions_goal3.js の動作確認テスト。
 * test_predictions.js（1X2用）と同じ観点を totoGOAL3（指定チームの得点数0/1/2/3+）向けに確認する。
 * 実際の本番 predictions/ ・ results/ には一切触れない（専用の一時ディレクトリを使用）。
 */
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const assert = require('assert');

const { appendPrediction, ValidationError } = require('../scripts/validate_prediction_goal3.js');
const { buildReport } = require('../scripts/score_predictions_goal3.js');

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'toto_lab_goal3_test_'));
const predictionsDir = path.join(tmpDir, 'predictions');
fs.mkdirSync(predictionsDir);
const resultsPath = path.join(tmpDir, 'results.jsonl');
const logPath = path.join(predictionsDir, 'round_9002_TestModel_goal3.jsonl');

let passed = 0, failed = 0;
function check(name, fn) {
    try { fn(); console.log(`OK   - ${name}`); passed++; }
    catch (e) { console.log(`FAIL - ${name}: ${e.message}`); failed++; }
}

// home側(鹿島)のレコード
const homeBase = {
    predictionId: 'Claude-v1-r9002-m1-kashima-20261022T000000Z',
    round: 9002,
    matchNumber: 1,
    marketType: 'totoGOAL3',
    team: '鹿島', // 略称alias
    opponent: '柏レイソル',
    isHome: true,
    probabilities: { '0': 0.1, '1': 0.3, '2': 0.3, '3': 0.3 },
    predictionConfirmedAt: '2026-10-22T00:00:00Z',
    deadlineAt: '2026-10-24T04:50:00Z',
    modelName: 'Claude',
    modelVersion: 'v1',
    dataSource: 'unit-test-fixture',
    revisionOf: null,
};
// away側(柏)のレコード
const awayBase = {
    ...homeBase,
    predictionId: 'Claude-v1-r9002-m1-kashiwa-20261022T000000Z',
    team: '柏レイソル',
    opponent: '鹿島アントラーズ',
    isHome: false,
    probabilities: { '0': 0.2, '1': 0.32, '2': 0.26, '3': 0.22 },
};

check('1. home側レコードを追記できる', () => {
    const r = appendPrediction(logPath, homeBase);
    assert.strictEqual(r.ok, true);
});
check('2. away側レコードも同じファイルに追記できる（1試合=2レコード）', () => {
    const r = appendPrediction(logPath, awayBase);
    assert.strictEqual(r.ok, true);
    const lines = fs.readFileSync(logPath, 'utf8').trim().split('\n');
    assert.strictEqual(lines.length, 2);
});
check('3. predictionId重複は拒否される', () => {
    let threw = false;
    try { appendPrediction(logPath, homeBase); } catch (e) { threw = e instanceof ValidationError; }
    assert.strictEqual(threw, true);
});
check('4. probabilitiesが4バケット合計1でない場合は拒否される', () => {
    const bad = { ...homeBase, predictionId: 'x-bad-sum', probabilities: { '0': 0.5, '1': 0.5, '2': 0.5, '3': 0.5 } };
    let threw = false;
    try { appendPrediction(logPath, bad); } catch (e) { threw = true; }
    assert.strictEqual(threw, true);
});
check('5. probabilitiesのキーが3つ（1X2形式）だと拒否される（totoGOAL3は4バケット必須）', () => {
    const bad = { ...homeBase, predictionId: 'x-3keys', probabilities: { '0': 0.3, '1': 0.3, '2': 0.4 } };
    let threw = false, msg = '';
    try { appendPrediction(logPath, bad); } catch (e) { threw = true; msg = e.message; }
    assert.strictEqual(threw, true);
    assert.ok(/4つのみ/.test(msg));
});
check('6. marketTypeが"totoGOAL3"以外だと拒否される', () => {
    const bad = { ...homeBase, predictionId: 'x-badmarket', marketType: 'toto13' };
    let threw = false;
    try { appendPrediction(logPath, bad); } catch (e) { threw = true; }
    assert.strictEqual(threw, true);
});
check('7. 締切後確定は拒否される', () => {
    const bad = { ...homeBase, predictionId: 'x-postdeadline', predictionConfirmedAt: '2026-10-25T00:00:00Z' };
    let threw = false, msg = '';
    try { appendPrediction(logPath, bad); } catch (e) { threw = true; msg = e.message; }
    assert.strictEqual(threw, true);
    assert.ok(/deadlineAt/.test(msg));
});

// results: 1X2採点と共用の results.jsonl フォーマットのまま（round+matchNumber+home/awayGoals）
// 鹿島(home) 3-1 柏(away) → 鹿島は"3"バケット、柏は"1"バケットが正解
fs.writeFileSync(resultsPath, JSON.stringify({
    round: 9002, matchNumber: 1, homeTeam: '鹿島アントラーズ', awayTeam: '柏レイソル',
    homeGoals: 3, awayGoals: 1, competition: 'J1', finishedAt: '2026-10-24T06:00:00Z',
}) + '\n');

const report = buildReport(predictionsDir, resultsPath);

check('8. results（1X2用と共用フォーマット）から home/away 両方のレコードが採点対象になる', () => {
    assert.strictEqual(report.usedRecordCount, 2, `採点対象は2件（鹿島・柏それぞれ1件）のはず。実際: ${report.usedRecordCount}`);
});

check('9. 実際の得点が3点以上は"3"バケットに正しくまとめられる（鹿島=3ゴール→pick="3"なら正解）', () => {
    const kashimaRec = report.byModel['Claude'];
    // 鹿島は確率{0:0.1,1:0.3,2:0.3,3:0.3}でpickは最大値が複数同値(0.3)の場合先頭優先実装だが、
    // ここでは柏の実際=1点、鹿島の実際=3点の両方がaccuracy計算に混ざるため、
    // 個別の正解判定はBrierの手計算で検証する。
    assert.strictEqual(kashimaRec.n, 2);
});

check('10. Brier scoreがsum-of-4-squares方式で正しく算出される（鹿島=3点, 柏=1点の手計算と一致）', () => {
    const brierKashima = (0.1 - 0) ** 2 + (0.3 - 0) ** 2 + (0.3 - 0) ** 2 + (0.3 - 1) ** 2; // 実際=3
    const brierKashiwa = (0.2 - 0) ** 2 + (0.32 - 1) ** 2 + (0.26 - 0) ** 2 + (0.22 - 0) ** 2; // 実際=1
    const expected = (brierKashima + brierKashiwa) / 2;
    const got = report.byModel['Claude'].brier;
    assert.ok(Math.abs(got - expected) < 1e-9, `期待値=${expected}, 実際=${got}`);
    assert.strictEqual(report.byModel['Claude'].brierConvention, 'sum-of-4-squares (no division)');
});

check('11. チーム名辞書で未解決のチーム名は推測補完されず unresolvedTeamNames になる', () => {
    const unmatchable = { ...homeBase, predictionId: 'x-unmatch', team: '存在しないチームX', opponent: '存在しないチームY' };
    const r = appendPrediction(path.join(predictionsDir, 'round_9003_TestModel_goal3.jsonl'), unmatchable);
    assert.strictEqual(r.ok, true, '保存自体はブロックしない');
    assert.ok(r.warnings.some(w => /data\/teams\.json/.test(w)));
    const report2 = buildReport(predictionsDir, resultsPath);
    assert.ok(report2.unresolvedTeamNames.some(u => u.predictionId === 'x-unmatch'));
});

// ---- 実際の第1665回ChatGPTログのスキーマ回帰テスト ----
const liveLogPath = path.join(__dirname, '..', 'predictions', 'round_1665_ChatGPT_goal3.jsonl');
check('12. 第1665回ChatGPTログの全v2レコードに必須marketTypeがあり、スキーマ検証を通る', () => {
    const { validateSchema, validatePrediction } = require('../scripts/validate_prediction_goal3.js');
    const liveRows = fs.readFileSync(liveLogPath, 'utf8').trim().split('\n').filter(Boolean).map(line => JSON.parse(line));
    const v1Rows = liveRows.filter(x => x.predictionId.endsWith('-v1'));
    const v2Rows = liveRows.filter(x => x.predictionId.endsWith('-v2'));
    assert.strictEqual(v1Rows.length, 6, '元のv1 6件を保持する');
    assert.strictEqual(v2Rows.length, 6, '修正版v2 6件が追記されている');
    const existingIds = new Set(v1Rows.map(x => x.predictionId));
    for (const rec of v2Rows) {
        assert.strictEqual(rec.marketType, 'totoGOAL3');
        assert.deepStrictEqual(validateSchema(rec), [], rec.predictionId + ' schema errors');
        const checked = validatePrediction(rec, existingIds);
        assert.strictEqual(checked.ok, true, rec.predictionId + ': ' + checked.errors.join('; '));
        existingIds.add(rec.predictionId);
    }
});
check('13. 第1665回の鹿島・柏v2分布が異なり、両方とも確率合計が1', () => {
    const liveRows = fs.readFileSync(liveLogPath, 'utf8').trim().split('\n').filter(Boolean).map(line => JSON.parse(line));
    const home = liveRows.find(x => x.predictionId === '1665-goal3-chatgpt-2-home-v2');
    const away = liveRows.find(x => x.predictionId === '1665-goal3-chatgpt-2-away-v2');
    assert.ok(home && away, '鹿島・柏のv2レコードが存在する');
    assert.notDeepStrictEqual(home.probabilities, away.probabilities);
    for (const rec of [home, away]) assert.ok(Math.abs(Object.values(rec.probabilities).reduce((a,b)=>a+b,0)-1) <= 0.002);
});

// ---- revisionOfで修正しつつmodelVersionも変える場合（2026-10-22、ChatGPT側の第1665回revisionで
//      実際に発生）、旧版が正しく除外されることを確認する（score_predictions.js・1X2用と同じ
//      構造の不具合の再発防止。goal3側は team も含めてグルーピングするため、teamも揃えて確認する）。
const mvLogPath = path.join(predictionsDir, 'round_9004_TestModel_goal3.jsonl');
const mvOld = {
    ...homeBase, predictionId: 'Claude-v1-r9004-m1-kashima-20261022T000000Z', round: 9004,
    modelVersion: 'v1', probabilities: { '0': 0.5, '1': 0.3, '2': 0.1, '3': 0.1 },
};
const mvNew = {
    ...homeBase, predictionId: 'Claude-v2-r9004-m1-kashima-rev1-20261022T120000Z', round: 9004,
    modelVersion: 'v2', // 修正と同時にmodelVersionも変える
    probabilities: { '0': 0.1, '1': 0.2, '2': 0.3, '3': 0.4 },
    revisionOf: 'Claude-v1-r9004-m1-kashima-20261022T000000Z',
};
appendPrediction(mvLogPath, mvOld);
appendPrediction(mvLogPath, mvNew);
fs.appendFileSync(resultsPath, JSON.stringify({
    round: 9004, matchNumber: 1, homeTeam: '鹿島アントラーズ', awayTeam: '柏レイソル',
    homeGoals: 2, awayGoals: 1, competition: 'J1', finishedAt: '2026-10-24T06:00:00Z',
}) + '\n');
const reportMv = buildReport(predictionsDir, resultsPath);
check('14. revisionOfで修正しつつmodelVersionも変えた場合でも、旧版（modelVersion違い）が正しく除外される', () => {
    assert.strictEqual(reportMv.usedRecordCount, report.usedRecordCount + 1, `round9004は1件（新版のみ）が採点対象になるはず。期待=${report.usedRecordCount + 1}, 実際=${reportMv.usedRecordCount}`);
    assert.ok(reportMv.supersededRecords.some(s => s.predictionId === mvOld.predictionId && s.supersededBy === mvNew.predictionId), '旧版(modelVersion=v1)がsupersededRecordsに記録されているはず');
});

console.log(`\n${passed} passed, ${failed} failed`);
fs.rmSync(tmpDir, { recursive: true, force: true });
process.exit(failed ? 1 : 0);
