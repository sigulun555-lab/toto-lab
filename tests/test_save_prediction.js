#!/usr/bin/env node
/**
 * test_save_prediction.js
 *
 * scripts/save_prediction.js の動作確認テスト。
 *   1. record.round / record.modelName から predictions/round_<開催回>_<modelName>.jsonl
 *      という保存先パスが正しく自動決定される
 *   2. 実際にそのパスへ追記され、以後の読み込みで内容が確認できる
 *   3. 締切後確定・predictionId重複など、appendPrediction() 側の検証ルールが
 *      save_prediction.js を経由しても同じようにブロックされる（検証をバイパスしない）
 *   4. modelName が "ChatGPT"/"Claude" 以外の場合は、ファイルパスの自動決定自体が
 *      エラーになる（未知のモデル名でファイルを作らない）
 *
 * 本番の predictions/ ディレクトリには一切書き込まない（PREDICTIONS_DIR を
 * 一時ディレクトリに差し替えた上でテストする）。
 */
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const assert = require('assert');
const Module = require('module');

const tmpRepoDir = fs.mkdtempSync(path.join(os.tmpdir(), 'toto_lab_save_test_'));
fs.mkdirSync(path.join(tmpRepoDir, 'predictions'));
fs.mkdirSync(path.join(tmpRepoDir, 'scripts'));
fs.mkdirSync(path.join(tmpRepoDir, 'data'));

// save_prediction.js / validate_prediction.js を一時リポジトリ構成の中にコピーして実行する
// （__dirname 相対で predictions/ ディレクトリを解決するロジックを、本番ディレクトリに
//  触れずに検証するため）。
fs.copyFileSync(path.join(__dirname, '..', 'scripts', 'save_prediction.js'), path.join(tmpRepoDir, 'scripts', 'save_prediction.js'));
fs.copyFileSync(path.join(__dirname, '..', 'scripts', 'validate_prediction.js'), path.join(tmpRepoDir, 'scripts', 'validate_prediction.js'));
fs.copyFileSync(path.join(__dirname, '..', 'data', 'teams.json'), path.join(tmpRepoDir, 'data', 'teams.json'));

const { savePrediction, predictionLogPath } = require(path.join(tmpRepoDir, 'scripts', 'save_prediction.js'));
const { ValidationError } = require(path.join(tmpRepoDir, 'scripts', 'validate_prediction.js'));

let passed = 0, failed = 0;
function check(name, fn) {
    try { fn(); console.log(`OK   - ${name}`); passed++; }
    catch (e) { console.log(`FAIL - ${name}: ${e.message}`); failed++; }
}

const base = {
    predictionId: 'ChatGPT-v1-r12345-m1-20261101T000000Z',
    round: 12345,
    matchNumber: 1,
    homeTeam: '浦和レッズ',
    awayTeam: '柏レイソル',
    probabilities: { '1': 0.4, '0': 0.3, '2': 0.3 },
    predictionConfirmedAt: '2026-11-01T00:00:00Z',
    deadlineAt: '2026-11-02T00:00:00Z',
    modelName: 'ChatGPT',
    modelVersion: 'v1',
    corrections: { dixonColes: false, drawBoostVariant: null, shrinkageSampleTrust: null, marketBlendWeight: null },
    dataSource: 'unit-test-fixture',
    revisionOf: null,
};

check('1. round/modelName から保存先パスが自動決定される', () => {
    const p = predictionLogPath(12345, 'ChatGPT');
    assert.strictEqual(path.basename(p), 'round_12345_ChatGPT.jsonl');
});

check('2. savePrediction() で実際に predictions/round_<開催回>_ChatGPT.jsonl に追記される', () => {
    const r = savePrediction(base);
    assert.strictEqual(r.ok, true);
    const expectedPath = path.join(tmpRepoDir, 'predictions', 'round_12345_ChatGPT.jsonl');
    assert.strictEqual(r.logPath, expectedPath);
    assert.ok(fs.existsSync(expectedPath));
    const saved = JSON.parse(fs.readFileSync(expectedPath, 'utf8').trim());
    assert.strictEqual(saved.predictionId, base.predictionId);
});

check('3. Claudeモデルの予測は別ファイル（round_<開催回>_Claude.jsonl）に保存される', () => {
    const claudeRecord = { ...base, predictionId: 'Claude-v1-r12345-m1-20261101T000000Z', modelName: 'Claude', modelVersion: 'v1' };
    const r = savePrediction(claudeRecord);
    assert.strictEqual(path.basename(r.logPath), 'round_12345_Claude.jsonl');
    // ChatGPT側のファイルは影響を受けていないはず
    const chatgptPath = path.join(tmpRepoDir, 'predictions', 'round_12345_ChatGPT.jsonl');
    assert.strictEqual(fs.readFileSync(chatgptPath, 'utf8').trim().split('\n').length, 1);
});

check('4. predictionId重複は save_prediction.js を経由してもブロックされる（検証をバイパスしない）', () => {
    let threw = false;
    try { savePrediction(base); }
    catch (e) { threw = e instanceof ValidationError; }
    assert.strictEqual(threw, true);
});

check('5. 締切後確定も save_prediction.js を経由してブロックされる', () => {
    const bad = { ...base, predictionId: 'ChatGPT-v1-r12345-m1-POSTDEADLINE', predictionConfirmedAt: '2026-11-03T00:00:00Z' };
    let threw = false;
    try { savePrediction(bad); }
    catch (e) { threw = e instanceof ValidationError && /deadlineAt/.test(e.message); }
    assert.strictEqual(threw, true);
});

check('6. 未知のmodelNameはファイルパス決定自体でエラーになる（推測でファイルを作らない）', () => {
    let threw = false;
    try { predictionLogPath(12345, 'chatgpt'); } // 小文字は不可（enumは"ChatGPT"のみ）
    catch (e) { threw = true; }
    assert.strictEqual(threw, true);
});

console.log(`\n${passed} passed, ${failed} failed`);
fs.rmSync(tmpRepoDir, { recursive: true, force: true });
process.exit(failed ? 1 : 0);
