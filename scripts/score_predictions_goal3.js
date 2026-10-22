#!/usr/bin/env node
/**
 * score_predictions_goal3.js
 *
 * predictions/*_goal3.jsonl（totoGOAL3：指定チームごとの得点数0/1/2/3+予測）と
 * 既存の results/*.jsonl（round, matchNumber, homeTeam, awayTeam, homeGoals, awayGoals, competition?）
 * を読み込み、モデル別の Accuracy / Brier score / Log loss を算出する。
 * results/*.jsonl は score_predictions.js（1X2用）と完全に共用する
 * （1試合の結果は homeGoals/awayGoals が分かればどちらの採点にも十分で、
 *  totoGOAL3専用の結果ログを別に持つ必要はない）。
 *
 * 強制ルール（score_predictions.js と同方針）:
 *   1. team/opponent は data/teams.json の canonical に変換できたものだけを採点対象にする
 *      （推測補完なし。変換できないものは unresolvedTeamNames として除外・報告）。
 *   2. isHome のレコードは results の homeTeam と team が、awayTeam と opponent が一致する試合を探す
 *      （isHome=falseならhomeTeam=opponent, awayTeam=team）。round+matchNumberの完全一致も必須。
 *   3. predictionConfirmedAt >= deadlineAt のレコードは採点対象から除外する（二重防御）。
 *   4. 同一 (round, matchNumber, team, modelName, modelVersion) の複数レコード（revisionOf履歴）は
 *      締切前の最終確定予測のみを使う。
 *   5. 実際の得点数は 3点以上をバケット"3"にまとめる（totoGOAL3の当落ルールと同じ）。
 *   6. Brier score は「4クラスの二乗誤差の合計」方式（除算なし）。1X2の
 *      "sum-of-3-squares" とは別物であることを明示するため
 *      "brierConvention": "sum-of-4-squares (no division)" を出力に明記する。
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { resolveTeamName } = require('./validate_prediction_goal3.js');
const { readJsonlDirOrFile } = require('./score_predictions.js');

const GOAL_BUCKET_KEYS = ['0', '1', '2', '3'];

function canonicalizeTeam(rawName) {
    const r = resolveTeamName(rawName);
    return r.resolved ? r.canonicalName : null;
}

function loadAllPredictionsGoal3(predictionsDir) {
    if (!fs.existsSync(predictionsDir)) return [];
    const files = fs.readdirSync(predictionsDir).filter(f => f.endsWith('_goal3.jsonl'));
    let all = [];
    for (const f of files) {
        const full = path.join(predictionsDir, f);
        const lines = fs.readFileSync(full, 'utf8').split('\n').filter(l => l.trim());
        all = all.concat(lines.map((line, idx) => {
            try { return { ...JSON.parse(line), _sourceFile: f }; }
            catch (e) { throw new Error(`${full}:${idx + 1} がJSONとして解析できません: ${line.slice(0, 100)}`); }
        }));
    }
    return all;
}

function matchKey(round, matchNumber, canonicalHome, canonicalAway) {
    return `${round}__${matchNumber}__${canonicalHome}__${canonicalAway}`;
}

/** 実際の得点数を totoGOAL3 のバケット（0/1/2/3+）文字列キーに変換する */
function goalsToBucket(goals) {
    if (!Number.isFinite(goals) || goals < 0) return null;
    return goals >= 3 ? '3' : String(goals);
}

/**
 * predictions: validate_prediction_goal3.js のスキーマに沿った生レコード配列
 * results: [{round, matchNumber, homeTeam, awayTeam, homeGoals, awayGoals, competition?}]
 */
function joinAndFilter(predictions, results) {
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

        const teamResolved = resolveTeamName(p.team);
        const opponentResolved = resolveTeamName(p.opponent);
        if (!teamResolved.resolved || !opponentResolved.resolved) {
            unresolvedTeamNames.push({
                predictionId: p.predictionId, round: p.round, matchNumber: p.matchNumber,
                team: p.team, opponent: p.opponent,
                reason: [
                    !teamResolved.resolved ? `team: ${teamResolved.reason}` : null,
                    !opponentResolved.resolved ? `opponent: ${opponentResolved.reason}` : null,
                ].filter(Boolean).join(' / '),
            });
            continue;
        }

        const canonicalHome = p.isHome ? teamResolved.canonicalName : opponentResolved.canonicalName;
        const canonicalAway = p.isHome ? opponentResolved.canonicalName : teamResolved.canonicalName;
        const key = matchKey(p.round, p.matchNumber, canonicalHome, canonicalAway);
        const result = resultIndex.get(key);
        if (!result) {
            unresolved.push({
                predictionId: p.predictionId, round: p.round, matchNumber: p.matchNumber,
                team: p.team, opponent: p.opponent, isHome: p.isHome,
                canonicalHomeTeam: canonicalHome, canonicalAwayTeam: canonicalAway,
                reason: '正規名称への変換後、round+matchNumber+homeTeam+awayTeam の完全一致が results に無い（推測補完せず除外）',
            });
            continue;
        }
        const actualGoals = p.isHome ? result.homeGoals : result.awayGoals;
        const bucket = goalsToBucket(actualGoals);
        if (bucket === null) {
            unresolved.push({
                predictionId: p.predictionId, round: p.round, matchNumber: p.matchNumber,
                team: p.team, opponent: p.opponent,
                reason: `該当する results の得点が不正（${JSON.stringify(actualGoals)}）`,
            });
            continue;
        }
        valid.push({ prediction: p, result, actualBucket: bucket });
    }

    const groups = new Map();
    for (const v of valid) {
        const gk = `${v.prediction.round}__${v.prediction.matchNumber}__${canonicalizeTeam(v.prediction.team)}__${v.prediction.modelName}__${v.prediction.modelVersion}`;
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
            supersededRecords.push({ predictionId: other.prediction.predictionId, supersededBy: chosen.prediction.predictionId, reason: '同一試合・同一チーム・同一モデルの修正履歴のうち、締切前の最終確定予測ではないため採点から除外' });
        }
    }

    return { usedRecords, unresolved, unresolvedTeamNames, excludedPostDeadline, supersededRecords };
}

function scoreGroup(records) {
    let brierSum = 0, loglossSum = 0, correct = 0;
    const n = records.length;
    const sumP = { '0': 0, '1': 0, '2': 0, '3': 0 };
    const actualCount = { '0': 0, '1': 0, '2': 0, '3': 0 };
    for (const { prediction, actualBucket } of records) {
        const p = prediction.probabilities;
        let brier = 0;
        for (const k of GOAL_BUCKET_KEYS) brier += (p[k] - (k === actualBucket ? 1 : 0)) ** 2;
        brierSum += brier;
        loglossSum += -Math.log(Math.max(1e-12, p[actualBucket]));
        const pick = GOAL_BUCKET_KEYS.slice().sort((a, b) => p[b] - p[a])[0];
        if (pick === actualBucket) correct++;
        for (const k of GOAL_BUCKET_KEYS) sumP[k] += p[k];
        actualCount[actualBucket]++;
    }
    return {
        n,
        accuracy: n ? correct / n : null,
        brier: n ? brierSum / n : null,
        brierConvention: 'sum-of-4-squares (no division)',
        logloss: n ? loglossSum / n : null,
        avgPredicted: n ? Object.fromEntries(GOAL_BUCKET_KEYS.map(k => [k, +(sumP[k] / n).toFixed(4)])) : null,
        actualRate: n ? Object.fromEntries(GOAL_BUCKET_KEYS.map(k => [k, +(actualCount[k] / n).toFixed(4)])) : null,
    };
}

function buildReport(predictionsDir, resultsTarget) {
    const predictions = loadAllPredictionsGoal3(predictionsDir);
    const results = readJsonlDirOrFile(resultsTarget);
    const { usedRecords, unresolved, unresolvedTeamNames, excludedPostDeadline, supersededRecords } = joinAndFilter(predictions, results);

    const byModel = {};
    const byModelVersion = {};

    for (const rec of usedRecords) {
        const m = rec.prediction.modelName;
        const mv = `${rec.prediction.modelName}@${rec.prediction.modelVersion}`;
        (byModel[m] = byModel[m] || []).push(rec);
        (byModelVersion[mv] = byModelVersion[mv] || []).push(rec);
    }

    return {
        generatedAt: new Date().toISOString(),
        marketType: 'totoGOAL3',
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
    };
}

module.exports = { buildReport, joinAndFilter, loadAllPredictionsGoal3, scoreGroup, goalsToBucket };

// CLI: node scripts/score_predictions_goal3.js [predictionsDir] [resultsDirOrFile] [outputReport.json]
if (require.main === module) {
    const predictionsDir = process.argv[2] || path.join(__dirname, '..', 'predictions');
    const resultsTarget = process.argv[3] || path.join(__dirname, '..', 'results');
    const outPath = process.argv[4];

    const report = buildReport(predictionsDir, resultsTarget);
    console.log(`[totoGOAL3] 入力: 予測 ${report.inputCounts.predictions} 件 / 結果 ${report.inputCounts.results} 件`);
    console.log(`締切後確定で除外: ${report.excludedPostDeadlineCount} 件`);
    console.log(`正規名称に変換できないチーム名で除外: ${report.unresolvedTeamNameCount} 件`);
    console.log(`正規名称への変換後も試合が一致せず未照合（除外）: ${report.unresolvedCount} 件`);
    console.log(`修正履歴により旧版として除外（revision supersede）: ${report.supersededByRevisionCount} 件`);
    console.log(`採点対象（締切前の最終確定予測のみ）: ${report.usedRecordCount} 件`);
    console.log('\n--- モデル別 ---');
    for (const [k, v] of Object.entries(report.byModel)) {
        console.log(`${k}: n=${v.n} accuracy=${v.accuracy?.toFixed(4)} brier=${v.brier?.toFixed(4)}(${v.brierConvention}) logloss=${v.logloss?.toFixed(4)}`);
    }
    if (outPath) {
        fs.writeFileSync(outPath, JSON.stringify(report, null, 2));
        console.log(`\n詳細レポートを書き出しました: ${outPath}`);
    }
}
