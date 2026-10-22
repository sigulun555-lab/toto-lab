#!/usr/bin/env node
/**
 * score_predictions.js
 *
 * predictions/*.jsonl （Claude側・ChatGPT側、両モデルの予測ログ）と
 * results.jsonl （試合結果ログ、予測とは完全に別ファイル）を読み込み、
 * モデルごとの Accuracy / Brier score / Log loss を算出する。
 *
 * 強制ルール（ユーザー確認済み・変更不可）:
 *   1. 試合の照合は round + matchNumber + homeTeam + awayTeam の
 *      「文字列完全一致」のみを許可する。表記違い・類似度マッチ等による
 *      推測補完は一切行わない。一致しない場合は unresolved として報告し、
     *      採点対象から除外する（推測で結果を割り当てない）。
 *   2. predictionConfirmedAt >= deadlineAt のレコードは採点対象から除外する
 *      （validate_prediction.js が保存時点で拒否する設計だが、他経路で
 *      紛れ込んだ場合に備えてここでも二重に防御する）。
 *   3. 同じ (round, matchNumber, modelName, modelVersion) に複数の
 *      有効（締切前確定）レコードが存在する場合（=修正・revisionOf履歴がある場合）、
 *      採点には predictionConfirmedAt が最も新しい「締切前の最終確定予測」のみを使う。
 *   4. Brier score は「3クラスの二乗誤差の合計」方式（除算なし、0〜2の範囲）を
 *      採用する。gpt側 model.js の backtest.json もこの方式で計算されている
 *      （n=349, brier=0.7154... として確認済み）ため、比較可能性のためこれに揃える。
 *      ※ 1/3で割る方式（0〜2/3の範囲）と混同しないこと。このスクリプトの出力には
 *      常に "brierConvention": "sum-of-3-squares (no division)" を明記する。
 *   5. 予測レコードと試合結果レコードは常に別ファイルとして扱い、このスクリプトは
 *      結果ファイルを読むだけで、予測ログ（predictions/*.jsonl）には一切書き込まない。
 */

'use strict';
const fs = require('fs');
const path = require('path');

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

function loadAllPredictions(predictionsDir) {
    const files = fs.readdirSync(predictionsDir).filter(f => f.endsWith('.jsonl'));
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
 * 戻り値: { byModel: {...}, unresolved: [...], excludedPostDeadline: [...], usedRecords: [...] }
 */
function joinAndFilter(predictions, results) {
    const resultIndex = new Map();
    for (const r of results) {
        resultIndex.set(matchKey(r.round, r.matchNumber, r.homeTeam, r.awayTeam), r);
    }

    const excludedPostDeadline = [];
    const unresolved = [];
    const valid = [];

    for (const p of predictions) {
        const confirmed = Date.parse(p.predictionConfirmedAt);
        const deadline = Date.parse(p.deadlineAt);
        if (!Number.isFinite(confirmed) || !Number.isFinite(deadline) || confirmed >= deadline) {
            excludedPostDeadline.push({ predictionId: p.predictionId, reason: 'predictionConfirmedAt >= deadlineAt（締切後確定、または時刻不正）' });
            continue;
        }
        const key = matchKey(p.round, p.matchNumber, p.homeTeam, p.awayTeam);
        const result = resultIndex.get(key);
        if (!result) {
            unresolved.push({
                predictionId: p.predictionId, round: p.round, matchNumber: p.matchNumber,
                homeTeam: p.homeTeam, awayTeam: p.awayTeam,
                reason: 'round+matchNumber+homeTeam+awayTeam の完全一致が results.jsonl に無い（推測補完せず除外）',
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

    return { usedRecords, unresolved, excludedPostDeadline, supersededRecords };
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
 * competition（results側にあれば）別に集計する。
 */
function buildReport(predictionsDir, resultsFilePath) {
    const predictions = loadAllPredictions(predictionsDir);
    const results = readJsonl(resultsFilePath);
    const { usedRecords, unresolved, excludedPostDeadline, supersededRecords } = joinAndFilter(predictions, results);

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

module.exports = { buildReport, joinAndFilter, loadAllPredictions, readJsonl, scoreGroup, outcomeOf };

// CLI: node score_predictions.js <predictionsDir> <resultsFile.jsonl> [outputReport.json]
if (require.main === module) {
    const [predictionsDir, resultsFilePath, outPath] = process.argv.slice(2);
    if (!predictionsDir || !resultsFilePath) {
        console.error('使い方: node score_predictions.js <predictions/ディレクトリ> <results.jsonl> [出力レポート.json]');
        process.exit(1);
    }
    const report = buildReport(predictionsDir, resultsFilePath);
    console.log(`入力: 予測 ${report.inputCounts.predictions} 件 / 結果 ${report.inputCounts.results} 件`);
    console.log(`締切後確定で除外: ${report.excludedPostDeadlineCount} 件`);
    console.log(`チーム名・試合不一致で未照合（除外）: ${report.unresolvedCount} 件`);
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
