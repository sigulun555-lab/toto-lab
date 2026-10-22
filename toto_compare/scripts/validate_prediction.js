#!/usr/bin/env node
/**
 * validate_prediction.js
 *
 * toto予測ログ（追記専用 / append-only）の検証・追記ユーティリティ。
 *
 * 設計上の強制ルール（ユーザー確認済み・変更不可）:
 *   1. 予測レコードは一度書き込んだら絶対に書き換えない。修正が必要な場合は
 *      新しい predictionId を発行し、revisionOf に元の predictionId を入れた
 *      「新しいレコード」として追記する（既存行の上書き・削除は一切行わない）。
 *   2. predictionConfirmedAt（予測確定時刻） < deadlineAt（締切時刻）を必須とする。
 *      これを満たさないレコードは保存時点で拒否する（締切後の確定は記録自体を作らせない）。
 *   3. すべての時刻は ISO 8601 UTC（末尾 "Z"）で統一する。タイムゾーンのばらつきで
 *      誤判定が起きることを防ぐため、Z 以外の表記は拒否する。
 *   4. チーム名は team_name_dictionary.json で解決できるものだけを許可する。
 *      辞書に無い表記は「推測で補完」せず、isUnmappedTeam フラグ付きで明示的に
 *      要確認とする（スコアリング対象には含めない）。
 *   5. 予測結果（スコア・実際の試合結果）はこのファイルでは一切扱わない。
 *      結果は score_predictions.js が別ファイル（results.jsonl）から読む。
 *
 * 保存形式: 1行1レコードの JSONL（JSON Lines）。ラウンドごとに
 *   predictions/round_<N>_<modelName>.jsonl
 * というファイル名を推奨する（例: predictions/round_1665_chatgpt.jsonl）。
 * JSONL を選ぶ理由は「末尾に1行 appendFileSync するだけで追記専用が保証できる」ため。
 * 配列を1個のJSONとして保持する形式（[...]）は、追記のたびに全体を読み直して
 * 書き直す必要があり、「書き換えない」という要件と相性が悪いので採用しない。
 */

'use strict';
const fs = require('fs');
const path = require('path');

const TEAM_DICT_PATH = path.join(__dirname, '..', 'team_name_dictionary.json');
let _teamDict = null;
function loadTeamDict() {
    if (_teamDict) return _teamDict;
    _teamDict = JSON.parse(fs.readFileSync(TEAM_DICT_PATH, 'utf8'));
    return _teamDict;
}

const ISO_UTC_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,3})?Z$/;

class ValidationError extends Error {
    constructor(message, field) {
        super(message);
        this.name = 'ValidationError';
        this.field = field;
    }
}

/**
 * gpt側の生表記（例: "C大阪"）をチーム名辞書で解決する。
 * 戻り値: { resolved: boolean, claudeKey: string|null, claudeFullName: string|null, raw: string }
 * 辞書に無い場合も例外にはせず resolved:false を返す（呼び出し側が isUnmappedTeam として扱う）。
 */
function resolveTeamName(rawName) {
    const dict = loadTeamDict();
    if (dict.mapping[rawName]) {
        return { resolved: true, claudeKey: dict.mapping[rawName].claudeKey, claudeFullName: dict.mapping[rawName].claudeFullName, raw: rawName };
    }
    // 既に正式名称（claudeFullName）そのものが渡された場合もそのまま通す
    for (const [gptName, v] of Object.entries(dict.mapping)) {
        if (v.claudeFullName === rawName || v.claudeKey === rawName) {
            return { resolved: true, claudeKey: v.claudeKey, claudeFullName: v.claudeFullName, raw: rawName };
        }
    }
    if (dict.unmapped[rawName]) {
        return { resolved: false, claudeKey: null, claudeFullName: null, raw: rawName, reason: dict.unmapped[rawName].reason };
    }
    return { resolved: false, claudeKey: null, claudeFullName: null, raw: rawName, reason: 'team_name_dictionary.json に未登録（推測補完は行いません。手動で辞書に追加してください）' };
}

const REQUIRED_FIELDS = [
    'predictionId', 'round', 'matchNumber', 'homeTeam', 'awayTeam',
    'probabilities', 'predictionConfirmedAt', 'deadlineAt',
    'modelName', 'modelVersion', 'corrections', 'dataSource', 'revisionOf'
];

/**
 * 1レコードの構造・ルールを検証する。existingIds は同一ログファイル内の
 * 既存 predictionId の Set（重複検知用）。
 * 戻り値: { ok: boolean, errors: string[], warnings: string[] }
 */
function validatePrediction(record, existingIds) {
    existingIds = existingIds || new Set();
    const errors = [];
    const warnings = [];

    for (const f of REQUIRED_FIELDS) {
        if (!(f in record)) errors.push(`必須フィールドが欠落: ${f}`);
    }
    if (errors.length) return { ok: false, errors, warnings };

    if (typeof record.predictionId !== 'string' || !record.predictionId) {
        errors.push('predictionId は空でない文字列が必要');
    } else if (existingIds.has(record.predictionId)) {
        errors.push(`predictionId が既存ログ内で重複している: ${record.predictionId}（追記専用のため、別のIDを新規発行してください）`);
    }

    if (record.revisionOf !== null) {
        if (typeof record.revisionOf !== 'string') {
            errors.push('revisionOf は null か、元の predictionId を指す文字列である必要がある');
        } else if (!existingIds.has(record.revisionOf)) {
            errors.push(`revisionOf が参照する predictionId がログ内に存在しない: ${record.revisionOf}（修正対象の元レコードが先に保存されている必要がある）`);
        }
    }

    // 時刻フォーマット・順序チェック（UTC統一・締切前確定の強制）
    for (const f of ['predictionConfirmedAt', 'deadlineAt']) {
        if (typeof record[f] !== 'string' || !ISO_UTC_RE.test(record[f])) {
            errors.push(`${f} は ISO 8601 UTC 形式（例: 2026-10-25T14:00:00Z）である必要がある。実際の値: ${JSON.stringify(record[f])}`);
        }
    }
    if (errors.length === 0 || (ISO_UTC_RE.test(record.predictionConfirmedAt) && ISO_UTC_RE.test(record.deadlineAt))) {
        const confirmed = Date.parse(record.predictionConfirmedAt);
        const deadline = Date.parse(record.deadlineAt);
        if (Number.isFinite(confirmed) && Number.isFinite(deadline) && confirmed >= deadline) {
            errors.push(`predictionConfirmedAt (${record.predictionConfirmedAt}) が deadlineAt (${record.deadlineAt}) 以降になっている。締切後の確定は保存できません（採点対象外ルールではなく、保存自体を拒否します）。`);
        }
    }

    // 確率の検証: キーが厳密に "1","0","2" のみで、合計が1に近いこと
    const p = record.probabilities;
    if (typeof p !== 'object' || p === null) {
        errors.push('probabilities はオブジェクトである必要がある: {"1":x,"0":x,"2":x}');
    } else {
        const keys = Object.keys(p).sort();
        if (keys.join(',') !== '0,1,2') {
            errors.push(`probabilities のキーは "1"(ホーム勝),"0"(ドロー),"2"(アウェイ勝) の3つのみ。実際のキー: ${JSON.stringify(keys)}`);
        } else {
            const sum = p['1'] + p['0'] + p['2'];
            if (Math.abs(sum - 1) > 1e-6) {
                errors.push(`probabilities の合計が1になっていない（合計=${sum}）`);
            }
            for (const k of ['1', '0', '2']) {
                if (typeof p[k] !== 'number' || p[k] < 0 || p[k] > 1 || !Number.isFinite(p[k])) {
                    errors.push(`probabilities["${k}"] は0〜1の数値である必要がある（実際: ${JSON.stringify(p[k])}）`);
                }
            }
        }
    }

    // チーム名解決（推測補完しない。未解決は警告として記録し、isUnmappedTeam を呼び出し側に通知）
    const homeResolved = resolveTeamName(record.homeTeam);
    const awayResolved = resolveTeamName(record.awayTeam);
    if (!homeResolved.resolved) warnings.push(`homeTeam "${record.homeTeam}" はチーム名辞書で未解決: ${homeResolved.reason}`);
    if (!awayResolved.resolved) warnings.push(`awayTeam "${record.awayTeam}" はチーム名辞書で未解決: ${awayResolved.reason}`);

    if (typeof record.round === 'undefined' || record.round === null || record.round === '') {
        errors.push('round は必須（toto開催回）');
    }
    if (typeof record.matchNumber === 'undefined' || record.matchNumber === null || record.matchNumber === '') {
        errors.push('matchNumber は必須（開催回内の試合番号）');
    }

    return { ok: errors.length === 0, errors, warnings, homeResolved, awayResolved };
}

/**
 * ログファイル（JSONL）から既存の predictionId 一覧を読み込む。
 * ファイルが存在しない場合は空集合を返す（初回作成時）。
 */
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

/**
 * レコードを検証し、問題なければログファイルに1行 appendFileSync する。
 * 既存行は絶対に読み直して書き換えない（追記専用の強制）。
 * 検証エラーがある場合は書き込まずに ValidationError を throw する。
 */
function appendPrediction(logFilePath, record) {
    const existingIds = loadExistingIds(logFilePath);
    const result = validatePrediction(record, existingIds);
    if (!result.ok) {
        throw new ValidationError(
            `予測レコードの検証に失敗しました:\n - ${result.errors.join('\n - ')}`,
            null
        );
    }
    // 検証OKのレコードのみ、末尾に1行追記。既存バイトには一切触れない。
    fs.appendFileSync(logFilePath, JSON.stringify(record) + '\n', 'utf8');
    return { ok: true, warnings: result.warnings };
}

module.exports = {
    validatePrediction,
    appendPrediction,
    loadExistingIds,
    resolveTeamName,
    ValidationError,
    REQUIRED_FIELDS,
};

// CLI: node validate_prediction.js <logFilePath> <recordJsonFilePath>
if (require.main === module) {
    const [logFilePath, recordJsonFilePath] = process.argv.slice(2);
    if (!logFilePath || !recordJsonFilePath) {
        console.error('使い方: node validate_prediction.js <ログファイル.jsonl> <追記したいレコード.json>');
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
