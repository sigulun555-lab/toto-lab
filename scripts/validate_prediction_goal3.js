#!/usr/bin/env node
/**
 * validate_prediction_goal3.js
 *
 * totoGOAL3（指定3試合・ホーム/アウェイそれぞれのチームの得点数0/1/2/3+を当てる）用の
 * 予測ログ（追記専用）検証・追記ユーティリティ。
 *
 * 通常toto（13試合・1X2）用の validate_prediction.js とは当たり方そのものが違う
 * （2026-10-22、東海林さんのtotoGOAL3アプリの実コードを確認して判明：toto公式の投票ページも
 *  1試合につきhome/away別の2投票対象として扱っている）ため、別スキーマ
 * （schemas/prediction_goal3.schema.json）・別ログファイルとして運用する。
 * チーム名解決（data/teams.json）・締切判定・predictionId重複防止・追記専用の強制ルールは
 * validate_prediction.js と同じ方針をそのまま適用する（ロジックの二重実装を避けるため
 * resolveTeamName / ValidationError は validate_prediction.js から共用する）。
 *
 * 保存形式: predictions/round_<開催回>_<modelName>_goal3.jsonl
 * （通常の predictions/round_<開催回>_<modelName>.jsonl とは別ファイル。1試合=home/away2レコード）
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { resolveTeamName, ValidationError, validateEvidence, ALLOWED_EVIDENCE_FIELDS } = require('./validate_prediction.js');

const ISO_UTC_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,3})?Z$/;
const MODEL_NAME_ENUM = ['ChatGPT', 'Claude'];
const MARKET_TYPE_ENUM = ['totoGOAL3'];
const ALLOWED_FIELDS = new Set([
    'predictionId', 'round', 'matchNumber', 'marketType', 'team', 'opponent', 'isHome',
    'probabilities', 'predictionConfirmedAt', 'deadlineAt',
    'modelName', 'modelVersion', 'revisionOf',
    'sourceRetrievedAt', 'notes', 'corrections', 'dataSource', 'evidence',
]);
const REQUIRED_FIELDS = [
    'predictionId', 'round', 'matchNumber', 'marketType', 'team', 'opponent', 'isHome',
    'probabilities', 'predictionConfirmedAt', 'deadlineAt',
    'modelName', 'modelVersion', 'revisionOf',
];
const ALLOWED_CORRECTIONS_FIELDS = new Set(['dixonColes', 'drawBoostVariant', 'shrinkageSampleTrust', 'marketBlendWeight']);
const GOAL_BUCKET_KEYS = ['0', '1', '2', '3'];

function validateSchema(record) {
    const errors = [];
    for (const k of Object.keys(record)) {
        if (!ALLOWED_FIELDS.has(k)) errors.push(`未知のフィールド（additionalProperties:false のため拒否）: ${k}`);
    }
    for (const f of REQUIRED_FIELDS) {
        if (!(f in record)) errors.push(`必須フィールドが欠落: ${f}`);
    }
    if (errors.length) return errors;

    if (typeof record.predictionId !== 'string' || !record.predictionId) errors.push('predictionId は空でない文字列が必要');
    if (!Number.isInteger(record.round) || record.round < 1) errors.push('round は1以上の整数（toto開催回）である必要がある');
    if (!Number.isInteger(record.matchNumber) || record.matchNumber < 1 || record.matchNumber > 3) errors.push('matchNumber は1〜3の整数である必要がある（totoGOAL3は常に指定3試合）');
    if (!MARKET_TYPE_ENUM.includes(record.marketType)) errors.push(`marketType は ${JSON.stringify(MARKET_TYPE_ENUM)} のいずれかである必要がある（実際: ${JSON.stringify(record.marketType)}）`);
    if (typeof record.team !== 'string' || !record.team) errors.push('team は空でない文字列が必要');
    if (typeof record.opponent !== 'string' || !record.opponent) errors.push('opponent は空でない文字列が必要');
    if (typeof record.isHome !== 'boolean') errors.push('isHome は boolean である必要がある');
    if (typeof record.modelVersion !== 'string' || !record.modelVersion) errors.push('modelVersion は空でない文字列が必要');
    if (!MODEL_NAME_ENUM.includes(record.modelName)) errors.push(`modelName は ${JSON.stringify(MODEL_NAME_ENUM)} のいずれかである必要がある（実際: ${JSON.stringify(record.modelName)}）`);
    if (record.revisionOf !== null && typeof record.revisionOf !== 'string') errors.push('revisionOf は null か文字列である必要がある');

    for (const f of ['predictionConfirmedAt', 'deadlineAt']) {
        if (typeof record[f] !== 'string' || !ISO_UTC_RE.test(record[f])) {
            errors.push(`${f} は ISO 8601 UTC 形式（例: 2026-10-24T04:50:00Z）である必要がある。実際の値: ${JSON.stringify(record[f])}`);
        }
    }

    const p = record.probabilities;
    if (typeof p !== 'object' || p === null || Array.isArray(p)) {
        errors.push('probabilities はオブジェクトである必要がある: {"0":x,"1":x,"2":x,"3":x}');
    } else {
        const keys = Object.keys(p).sort();
        if (keys.join(',') !== '0,1,2,3') {
            errors.push(`probabilities のキーは "0"(0点),"1"(1点),"2"(2点),"3"(3点以上) の4つのみ（additionalProperties:false）。実際のキー: ${JSON.stringify(keys)}`);
        } else {
            for (const k of GOAL_BUCKET_KEYS) {
                if (typeof p[k] !== 'number' || !Number.isFinite(p[k]) || p[k] < 0 || p[k] > 1) {
                    errors.push(`probabilities["${k}"] は0〜1の数値である必要がある（実際: ${JSON.stringify(p[k])}）`);
                }
            }
            const sum = GOAL_BUCKET_KEYS.reduce((a, k) => a + Number(p[k]), 0);
            if (Math.abs(sum - 1) > 0.002) {
                errors.push(`probabilities の合計が1になっていない（許容誤差0.002、合計=${sum}）`);
            }
        }
    }

    if ('sourceRetrievedAt' in record && (typeof record.sourceRetrievedAt !== 'string' || !ISO_UTC_RE.test(record.sourceRetrievedAt))) {
        errors.push('sourceRetrievedAt を指定する場合は ISO 8601 UTC 形式である必要がある');
    }
    if ('notes' in record && typeof record.notes !== 'string') errors.push('notes は文字列である必要がある');
    if ('dataSource' in record && typeof record.dataSource !== 'string') errors.push('dataSource は文字列である必要がある');

    if ('corrections' in record) {
        const c = record.corrections;
        if (typeof c !== 'object' || c === null || Array.isArray(c)) {
            errors.push('corrections はオブジェクトである必要がある');
        } else {
            for (const k of Object.keys(c)) {
                if (!ALLOWED_CORRECTIONS_FIELDS.has(k)) errors.push(`corrections に未知のフィールド（additionalProperties:false）: ${k}`);
            }
        }
    }

    // evidence（予測根拠）の構造は1X2用と共通（検証ロジックは validate_prediction.js を共有）
    if ('evidence' in record) errors.push(...validateEvidence(record.evidence));

    return errors;
}

function validatePrediction(record, existingIds) {
    existingIds = existingIds || new Set();
    const errors = validateSchema(record);
    const warnings = [];

    if (typeof record.predictionId === 'string' && existingIds.has(record.predictionId)) {
        errors.push(`predictionId が既存ログ内で重複している: ${record.predictionId}（追記専用のため、別のIDを新規発行してください）`);
    }
    if (record.revisionOf !== null && typeof record.revisionOf === 'string' && !existingIds.has(record.revisionOf)) {
        errors.push(`revisionOf が参照する predictionId がログ内に存在しない: ${record.revisionOf}（修正対象の元レコードが先に保存されている必要がある）`);
    }

    if (errors.length === 0 || (typeof record.predictionConfirmedAt === 'string' && ISO_UTC_RE.test(record.predictionConfirmedAt) && typeof record.deadlineAt === 'string' && ISO_UTC_RE.test(record.deadlineAt))) {
        const confirmed = Date.parse(record.predictionConfirmedAt);
        const deadline = Date.parse(record.deadlineAt);
        if (Number.isFinite(confirmed) && Number.isFinite(deadline) && confirmed >= deadline) {
            errors.push(`predictionConfirmedAt (${record.predictionConfirmedAt}) が deadlineAt (${record.deadlineAt}) 以降になっている。締切後の確定は保存できません。`);
        }
    }

    let teamResolved, opponentResolved;
    if (typeof record.team === 'string') {
        teamResolved = resolveTeamName(record.team);
        if (!teamResolved.resolved) warnings.push(`team "${record.team}" はチーム名辞書で未解決: ${teamResolved.reason}`);
    }
    if (typeof record.opponent === 'string') {
        opponentResolved = resolveTeamName(record.opponent);
        if (!opponentResolved.resolved) warnings.push(`opponent "${record.opponent}" はチーム名辞書で未解決: ${opponentResolved.reason}`);
    }

    return { ok: errors.length === 0, errors, warnings, teamResolved, opponentResolved };
}

function loadExistingIds(logFilePath) {
    const ids = new Set();
    if (!fs.existsSync(logFilePath)) return ids;
    const lines = fs.readFileSync(logFilePath, 'utf8').split('\n').filter(l => l.trim());
    for (const line of lines) {
        try {
            const rec = JSON.parse(line);
            if (rec.predictionId) ids.add(rec.predictionId);
        } catch (e) {
            throw new Error(`既存ログの破損を検知: ${logFilePath} の1行がJSONとして解析できない: ${line.slice(0, 100)}`);
        }
    }
    return ids;
}

function appendPrediction(logFilePath, record) {
    const existingIds = loadExistingIds(logFilePath);
    const result = validatePrediction(record, existingIds);
    if (!result.ok) {
        throw new ValidationError(
            `totoGOAL3予測レコードの検証に失敗しました:\n - ${result.errors.join('\n - ')}`,
            null
        );
    }
    fs.mkdirSync(path.dirname(logFilePath), { recursive: true });
    fs.appendFileSync(logFilePath, JSON.stringify(record) + '\n', 'utf8');
    return { ok: true, warnings: result.warnings };
}

module.exports = {
    validatePrediction,
    validateSchema,
    appendPrediction,
    loadExistingIds,
    resolveTeamName,
    ValidationError,
    REQUIRED_FIELDS,
    ALLOWED_FIELDS,
    ALLOWED_EVIDENCE_FIELDS,
    MODEL_NAME_ENUM,
    MARKET_TYPE_ENUM,
    GOAL_BUCKET_KEYS,
};

// CLI: node scripts/validate_prediction_goal3.js <logFilePath> <recordJsonFilePath>
if (require.main === module) {
    const [logFilePath, recordJsonFilePath] = process.argv.slice(2);
    if (!logFilePath || !recordJsonFilePath) {
        console.error('使い方: node scripts/validate_prediction_goal3.js <ログファイル.jsonl> <追記したいレコード.json>');
        process.exit(1);
    }
    const record = JSON.parse(fs.readFileSync(recordJsonFilePath, 'utf8'));
    try {
        const { warnings } = appendPrediction(logFilePath, record);
        console.log(`OK: ${record.predictionId} を ${logFilePath} に追記しました。`);
        if (warnings.length) console.log('警告:\n - ' + warnings.join('\n - '));
    } catch (e) {
        console.error('失敗: ' + e.message);
        process.exit(1);
    }
}
