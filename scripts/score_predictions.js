#!/usr/bin/env node
/**
 * score_predictions.js
 *
 * predictions/*.jsonl （ChatGPT側・Claude側、両モデルの予測ログ）と
 * results/*.jsonl （試合結果ログ、予測とは完全に別ファイル）を読み込み、
 * モデルごとの Accuracy / Brier score / Log loss を算出する。
 * チーム名の正規化は validate_prediction.js の resolveTeamName（data/teams.json基準）を共用する。
 *
 * 強制ルール（ユーザー確認済み・変更不可）:
 *   1. 試合の照合は、まず homeTeam / awayTeam を data/teams.json の canonical（Jリーグ公式
 *      2026クラブ編成基準）に変換したうえで、round + matchNumber + 正規化後の
 *      homeTeam + awayTeam の「完全一致」のみを許可する。正規名称に変換できないチーム
 *      （辞書に無い表記）は、採点対象外として理由と件数を report.unresolvedTeamNames に
 *      明示する（推測補完は一切行わない）。正規名称への変換ができても、その組み合わせに
 *      一致する結果レコードが無い場合は report.unresolved に理由と共に記録し、採点対象から除外する。
 *   2. predictionConfirmedAt >= deadlineAt のレコードは採点対象から除外する
 *      （validate_prediction.js が保存時点で拒否する設計だが、他経路で
 *      紛れ込んだ場合に備えてここでも二重に防御する）。
 *   3. 同じ (round, matchNumber, modelName, modelVersion) に複数の
 *      有効（締切前確定）レコードが存在する場合（=修正・revisionOf履歴がある場合）、
 *      採点には predictionConfirmedAt が最も新しい「締切前の最終確定予測」のみを使う。
 *   4. Brier score は「3クラスの二乗誤差の合計」方式（除算なし、0〜2の範囲）を採用する
 *      （gpt側 model.js の backtest.json もこの方式。n=349, brier=0.7154... で確認済み）。
 *      出力には常に "brierConvention": "sum-of-3-squares (no division)" を明記する。
 *   5. 予測レコードと試合結果レコードは常に別ファイルとして扱い、このスクリプトは
 *      結果ファイルを読むだけで、予測ログ（predictions/*.jsonl）には一切書き込まない。
 */

'use strict';
const fs = require('fs');
const path = require('path');
const { resolveTeamName } = require('./validate_prediction.js');

/** 正規名称（canonical）に変換できればその文字列、できなければ null を返す（推測補完なし） */
function canonicalizeTeam(rawName) {
    const r = resolveTeamName(rawName);
    return r.resolved ? r.canonicalName : null;
}

function readJsonl(filePath) {
    if (!fs.existsSync(filePath)) return [];
    return fs.readFileSync(filePath, 'utf8')
        .split('\n')
        .filter(l => l.trim())
        .map((line, idx) => {
            try { return JSON.parse(line); }
            catch (e) { throw new Error(`${filePath}:${idx + 1} がJSONとして解析できません: ${line.slice(0, 100)}`); }
        });
}

function readJsonlDirOrFile(target) {
    if (!fs.existsSync(target)) return [];
    const stat = fs.statSync(target);
    if (stat.isFile()) return readJsonl(target);
    const files = fs.readdirSync(target).filter(f => f.endsWith('.jsonl'));
    let all = [];
    for (const f of files) all = all.concat(readJsonl(path.join(target, f)));
    return all;
}

function loadAllPredictions(predictionsDir) {
    if (!fs.existsSync(predictionsDir)) return [];
    // *_goal3.jsonl（totoGOAL3用。homeTeam/awayTeamではなくteam/opponent/isHomeを使うスキーマ）は
    // こちら（1X2用）の対象外。除外しないと、goal3側のレコードがhomeTeam=undefinedとして
    // 読み込まれ、unresolvedTeamNamesに毎回ノイズとして混入してしまう（2026-10-22判明・修正）。
    const files = fs.readdirSync(predictionsDir).filter(f => f.endsWith('.jsonl') && !f.endsWith('_goal3.jsonl'));
    let all = [];
    for (const f of files) {
        all = all.concat(readJsonl(path.join(predictionsDir, f)).map(r => ({ ...r, _sourceFile: f })));
    }
    return all;
}

function matchKey(round, matchNumber, homeTeam, awayTeam) {
    return `${round}__${matchNumber}__${homeTeam}__${awayTeam}`;
}

/**
 * predictions: 生の予測レコード配列（複数モデル混在可）
 * results: 試合結果レコード配列 [{round, matchNumber, homeTeam, awayTeam, homeGoals, awayGoals, competition?, ...}]
 *
 * 戻り値: { usedRecords, unresolved, unresolvedTeamNames, excludedPostDeadline, supersededRecords }
 */
function joinAndFilter(predictions, results) {
    // 結果側も homeTeam/awayTeam を正規名称に変換してからインデックス化する。
    // 結果側の表記が辞書で解決できない場合は resultIndex に載せない
    // （参照する側の予測レコードが unresolvedTeamNames または unresolved に落ちる）。
    const resultIndex = new Map();
    for (const r of results) {
        const home = canonicalizeTeam(r.homeTeam);
        const away = canonicalizeTeam(r.awayTeam);
        if (!home || !away) continue;
        resultIndex.set(matchKey(r.round, r.matchNumber, home, away), r);
    }

    const excludedPostDeadline = [];
    const unresolvedTeamNames = [];
    const unresolved = [];
    const valid = [];

    for (const p of predictions) {
        const confirmed = Date.parse(p.predictionConfirmedAt);
        const deadline = Date.parse(p.deadlineAt);
        if (!Number.isFinite(confirmed) || !Number.isFinite(deadline) || confirmed >= deadline) {
            excludedPostDeadline.push({ predictionId: p.predictionId, reason: 'predictionConfirmedAt >= deadlineAt（締切後確定、または時刻不正）' });
            continue;
        }

        const homeResolved = resolveTeamName(p.homeTeam);
        const awayResolved = resolveTeamName(p.awayTeam);
        if (!homeResolved.resolved || !awayResolved.resolved) {
            unresolvedTeamNames.push({
                predictionId: p.predictionId, round: p.round, matchNumber: p.matchNumber,
                homeTeam: p.homeTeam, awayTeam: p.awayTeam,
                reason: [
                    !homeResolved.resolved ? `homeTeam: ${homeResolved.reason}` : null,
                    !awayResolved.resolved ? `awayTeam: ${awayResolved.reason}` : null,
                ].filter(Boolean).join(' / '),
            });
            continue;
        }

        const key = matchKey(p.round, p.matchNumber, homeResolved.canonicalName, awayResolved.canonicalName);
        const result = resultIndex.get(key);
        if (!result) {
            unresolved.push({
                predictionId: p.predictionId, round: p.round, matchNumber: p.matchNumber,
                homeTeam: p.homeTeam, awayTeam: p.awayTeam,
                canonicalHomeTeam: homeResolved.canonicalName, canonicalAwayTeam: awayResolved.canonicalName,
                reason: '正規名称への変換後、round+matchNumber+homeTeam+awayTeam の完全一致が results に無い（推測補完せず除外）',
            });
            continue;
        }
        valid.push({ prediction: p, result });
    }

    // 同一 (round, matchNumber, modelName, modelVersion) につき、締切前確定の中で最新の1件のみ残す
    const groups = new Map();
    for (const v of valid) {
        const gk = `${v.prediction.round}__${v.prediction.matchNumber}__${v.prediction.modelName}__${v.prediction.modelVersion}`;
        if (!groups.has(gk)) groups.set(gk, []);
        groups.get(gk).push(v);
    }
    const usedRecords = [];
    const supersededRecords = [];
    for (const [gk, arr] of groups) {
        arr.sort((a, b) => Date.parse(a.prediction.predictionConfirmedAt) - Date.parse(b.prediction.predictionConfirmedAt));
        const chosen = arr[arr.length - 1];
        usedRecords.push(chosen);
        for (const other of arr.slice(0, -1)) {
            supersededRecords.push({ predictionId: other.prediction.predictionId, supersededBy: chosen.prediction.predictionId, reason: '同一試合・同一モデルの修正履歴のうち、締切前の最終確定予測ではないため採点から除外' });
        }
    }

    return { usedRecords, unresolved, unresolvedTeamNames, excludedPostDeadline, supersededRecords };
}

function outcomeOf(result) {
    if (result.homeGoals > result.awayGoals) return '1';
    if (result.homeGoals === result.awayGoals) return '0';
    return '2';
}

function scoreGroup(records) {
    let brierSum = 0, loglossSum = 0, correct = 0;
    const n = records.length;
    const sumP = { '1': 0, '0': 0, '2': 0 };
    const actualCount = { '1': 0, '0': 0, '2': 0 };
    for (const { prediction, result } of records) {
        const y = outcomeOf(result);
        const p = prediction.probabilities;
        let brier = 0;
        for (const k of ['1', '0', '2']) brier += (p[k] - (k === y ? 1 : 0)) ** 2;
        brierSum += brier;
        loglossSum += -Math.log(Math.max(1e-12, p[y]));
        const pick = Object.keys(p).sort((a, b) => p[b] - p[a])[0];
        if (pick === y) correct++;
        for (const k of ['1', '0', '2']) sumP[k] += p[k];
        actualCount[y]++;
    }
    return {
        n,
        accuracy: n ? correct / n : null,
        brier: n ? brierSum / n : null,
        brierConvention: 'sum-of-3-squares (no division)',
        logloss: n ? loglossSum / n : null,
        avgPredicted: n ? { '1': +(sumP['1'] / n).toFixed(4), '0': +(sumP['0'] / n).toFixed(4), '2': +(sumP['2'] / n).toFixed(4) } : null,
        actualRate: n ? { '1': +(actualCount['1'] / n).toFixed(4), '0': +(actualCount['0'] / n).toFixed(4), '2': +(actualCount['2'] / n).toFixed(4) } : null,
    };
}

/**
 * メイン集計: usedRecords を modelName 別、(modelName,modelVersion) 別、
 * competition（results側にあれば、リーグ別集計）別に集計する。
 * resultsTarget は results/*.jsonl を含むディレクトリか、単一ファイルのどちらでもよい。
 */
function buildReport(predictionsDir, resultsTarget) {
    const predictions = loadAllPredictions(predictionsDir);
    const results = readJsonlDirOrFile(resultsTarget);
    const { usedRecords, unresolved, unresolvedTeamNames, excludedPostDeadline, supersededRecords } = joinAndFilter(predictions, results);

    const byModel = {};
    const byModelVersion = {};
    const byModelAndCompetition = {};

    for (const rec of usedRecords) {
        const m = rec.prediction.modelName;
        const mv = `${rec.prediction.modelName}@${rec.prediction.modelVersion}`;
        const comp = rec.result.competition || 'unknown';
        (byModel[m] = byModel[m] || []).push(rec);
        (byModelVersion[mv] = byModelVersion[mv] || []).push(rec);
        const ck = `${m}__${comp}`;
        (byModelAndCompetition[ck] = byModelAndCompetition[ck] || []).push(rec);
    }

    const report = {
        generatedAt: new Date().toISOString(),
        inputCounts: { predictions: predictions.length, results: results.length },
        excludedPostDeadlineCount: excludedPostDeadline.length,
        excludedPostDeadline,
        unresolvedTeamNameCount: unresolvedTeamNames.length,
        unresolvedTeamNames,
        unresolvedCount: unresolved.length,
        unresolved,
        supersededByRevisionCount: supersededRecords.length,
        supersededRecords,
        usedRecordCount: usedRecords.length,
        byModel: Object.fromEntries(Object.entries(byModel).map(([k, v]) => [k, scoreGroup(v)])),
        byModelVersion: Object.fromEntries(Object.entries(byModelVersion).map(([k, v]) => [k, scoreGroup(v)])),
        byModelAndCompetition: Object.fromEntries(Object.entries(byModelAndCompetition).map(([k, v]) => [k, scoreGroup(v)])),
    };
    return report;
}

module.exports = { buildReport, joinAndFilter, loadAllPredictions, readJsonl, readJsonlDirOrFile, scoreGroup, outcomeOf };

// CLI: node scripts/score_predictions.js [predictionsDir] [resultsDirOrFile] [outputReport.json]
if (require.main === module) {
    const predictionsDir = process.argv[2] || path.join(__dirname, '..', 'predictions');
    const resultsTarget = process.argv[3] || path.join(__dirname, '..', 'results');
    const outPath = process.argv[4];

    const report = buildReport(predictionsDir, resultsTarget);
    console.log(`入力: 予測 ${report.inputCounts.predictions} 件 / 結果 ${report.inputCounts.results} 件`);
    console.log(`締切後確定で除外: ${report.excludedPostDeadlineCount} 件`);
    console.log(`正規名称に変換できないチーム名で除外: ${report.unresolvedTeamNameCount} 件`);
    if (report.unresolvedTeamNameCount) {
        console.log('  -> 詳細は出力JSONの unresolvedTeamNames を確認してください（推測補完はしていません）');
    }
    console.log(`正規名称への変換後も試合が一致せず未照合（除外）: ${report.unresolvedCount} 件`);
    if (report.unresolvedCount) {
        console.log('  -> 詳細は出力JSONの unresolved を確認してください（推測補完はしていません）');
    }
    console.log(`修正履歴により旧版として除外（revision supersede）: ${report.supersededByRevisionCount} 件`);
    console.log(`採点対象（締切前の最終確定予測のみ）: ${report.usedRecordCount} 件`);
    console.log('\n--- モデル別 ---');
    for (const [k, v] of Object.entries(report.byModel)) {
        console.log(`${k}: n=${v.n} accuracy=${v.accuracy?.toFixed(4)} brier=${v.brier?.toFixed(4)}(${v.brierConvention}) logloss=${v.logloss?.toFixed(4)}`);
    }
    console.log('\n--- モデル×バージョン別 ---');
    for (const [k, v] of Object.entries(report.byModelVersion)) {
        console.log(`${k}: n=${v.n} accuracy=${v.accuracy?.toFixed(4)} brier=${v.brier?.toFixed(4)} logloss=${v.logloss?.toFixed(4)}`);
    }
    console.log('\n--- モデル×リーグ別 ---');
    for (const [k, v] of Object.entries(report.byModelAndCompetition)) {
        console.log(`${k}: n=${v.n} accuracy=${v.accuracy?.toFixed(4)} brier=${v.brier?.toFixed(4)} logloss=${v.logloss?.toFixed(4)}`);
    }
    if (outPath) {
        fs.writeFileSync(outPath, JSON.stringify(report, null, 2));
        console.log(`\n詳細レポートを書き出しました: ${outPath}`);
    }
}
