#!/usr/bin/env node
/**
 * test_save_prediction_goal3.js
 *
 * scripts/save_prediction_goal3.js の動作確認テスト（test_save_prediction.jsのtotoGOAL3版）。
 * 本番の predictions/ ディレクトリには一切書き込まない。
 */
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const assert = require('assert');

const tmpRepoDir = fs.mkdtempSync(path.join(os.tmpdir(), 'toto_lab_save_goal3_test_'));
fs.mkdirSync(path.join(tmpRepoDir, 'predictions'));
fs.mkdirSync(path.join(tmpRepoDir, 'scripts'));
fs.mkdirSync(path.join(tmpRepoDir, 'data'));

fs.copyFileSync(path.join(__dirname, '..', 'scripts', 'save_prediction_goal3.js'), path.join(tmpRepoDir, 'scripts', 'save_prediction_goal3.js'));
fs.copyFileSync(path.join(__dirname, '..', 'scripts', 'validate_prediction_goal3.js'), path.join(tmpRepoDir, 'scripts', 'validate_prediction_goal3.js'));
fs.copyFileSync(path.join(__dirname, '..', 'scripts', 'validate_prediction.js'), path.join(tmpRepoDir, 'scripts', 'validate_prediction.js'));
fs.copyFileSync(path.join(__dirname, '..', 'data', 'teams.json'), path.join(tmpRepoDir, 'data', 'teams.json'));

const { savePrediction, predictionLogPath } = require(path.join(tmpRepoDir, 'scripts', 'save_prediction_goal3.js'));
const { ValidationError } = require(path.join(tmpRepoDir, 'scripts', 'validate_prediction_goal3.js'));

let passed = 0, failed = 0;
function check(name, fn) {
    try { fn(); console.log(`OK   - ${name}`); passed++; }
    catch (e) { console.log(`FAIL - ${name}: ${e.message}`); failed++; }
}

const base = {
    predictionId: 'Claude-v1-r12346-m1-hiroshima-20261101T000000Z',
    round: 12346,
    matchNumber: 1,
    marketType: 'totoGOAL3',
    team: 'サンフレッチェ広島',
    opponent: '清水エスパルス',
    isHome: true,
    probabilities: { '0': 0.1, '1': 0.19, '2': 0.21, '3': 0.5 },
    predictionConfirmedAt: '2026-11-01T00:00:00Z',
    deadlineAt: '2026-11-02T00:00:00Z',
    modelName: 'Claude',
    modelVersion: 'v1',
    dataSource: 'unit-test-fixture',
    revisionOf: null,
};

check('1. round/modelNameから保存先パス（_goal3.jsonl）が自動決定される', () => {
    const p = predictionLogPath(12346, 'Claude');
    assert.strictEqual(path.basename(p), 'round_12346_Claude_goal3.jsonl');
});

check('2. savePrediction()で実際に predictions/round_<開催回>_Claude_goal3.jsonl に追記される', () => {
    const r = savePrediction(base);
    assert.strictEqual(r.ok, true);
    const expectedPath = path.join(tmpRepoDir, 'predictions', 'round_12346_Claude_goal3.jsonl');
    assert.strictEqual(r.logPath, expectedPath);
    assert.ok(fs.existsSync(expectedPath));
});

check('3. 通常の（1X2用）round_<N>_<model>.jsonlとはファイルが分かれている', () => {
    const goal3Path = path.join(tmpRepoDir, 'predictions', 'round_12346_Claude_goal3.jsonl');
    const normalPath = path.join(tmpRepoDir, 'predictions', 'round_12346_Claude.jsonl');
    assert.ok(fs.existsSync(goal3Path));
    assert.ok(!fs.existsSync(normalPath), '1X2用ファイルは作られていないはず');
});

check('4. predictionId重複はsave_prediction_goal3.jsを経由してもブロックされる', () => {
    let threw = false;
    try { savePrediction(base); } catch (e) { threw = e instanceof ValidationError; }
    assert.strictEqual(threw, true);
});

check('5. 未知のmodelNameはファイルパス決定自体でエラーになる', () => {
    let threw = false;
    try { predictionLogPath(12346, 'claude'); } catch (e) { threw = true; }
    assert.strictEqual(threw, true);
});

check('6. evidence付きtotoGOAL3レコードがteamStatus/opponentStatusで検証・保存される', () => {
    const withEvidence = {
        ...base,
        predictionId: 'Claude-v1-r12346-m2-EVIDENCE',
        evidence: {
            sources: [{ name: 'Unit test source', url: 'https://example.com/source', retrievedAt: '2026-11-01T00:00:00Z' }],
            teamStatus: { standing: 5, goalDiff: 3, recentFormPeriod: '直近5試合', recentFormCompetitions: 'J1のみ', homeAwaySplit: 'home', absences: '未確認' },
            opponentStatus: { standing: 8, goalDiff: -2, recentFormPeriod: '直近5試合', recentFormCompetitions: 'J1のみ', homeAwaySplit: 'away', absences: '未確認' },
            probabilityRationale: 'テスト用の根拠。確率への寄与は未算出。',
            quantitativeContribution: 'not_quantified',
            confidenceLevel: 'medium',
            unconfirmed: ['先発メンバー'],
            modelOrigin: 'independent_estimate'
        }
    };
    const r = savePrediction(withEvidence);
    assert.strictEqual(r.ok, true);
    const saved = JSON.parse(fs.readFileSync(r.logPath, 'utf8').trim().split('\n').slice(-1)[0]);
    assert.strictEqual(saved.evidence.modelOrigin, 'independent_estimate');
    assert.strictEqual(saved.evidence.teamStatus.homeAwaySplit, 'home');
});

check('7. totoGOAL3で1X2用のhomeTeamStatusキーは拒否される', () => {
    const bad = {
        ...base,
        predictionId: 'Claude-v1-r12346-m3-BAD-EVIDENCE',
        evidence: { homeTeamStatus: { homeAwaySplit: 'home' } }
    };
    let threw = false;
    try { savePrediction(bad); } catch (e) { threw = e instanceof ValidationError && /homeTeamStatus/.test(e.message); }
    assert.strictEqual(threw, true);
});

console.log(`\\n${passed} passed, ${failed} failed`);
fs.rmSync(tmpRepoDir, { recursive: true, force: true });
process.exit(failed ? 1 : 0);
