#!/usr/bin/env node
/**
 * validate_prediction.js
 *
 * toto予測ログ（追記専用 / append-only）の検証・追記ユーティリティ。
 * ルート直下の data/teams.json と schemas/prediction.schema.json を正式な基準として使う
 * （toto_compare/ 配下にあった同名スクリプト・team_name_dictionary.json は統合によりこちらに一本化）。
 *
 * 設計上の強制ルール（ユーザー確認済み・変更不可）:
 *   1. 予測レコードは一度書き込んだら絶対に書き換えない。修正が必要な場合は
 *      新しい predictionId を発行し、revisionOf に元の predictionId を入れた
 *      「新しいレコード」として追記する（既存行の上書き・削除は一切行わない）。
 *   2. predictionConfirmedAt（予測確定時刻） < deadlineAt（締切時刻）を必須とする。
 *      これを満たさないレコードは保存時点で拒否する（締切後の確定は記録自体を作らせない）。
 *   3. すべての時刻は ISO 8601 UTC（末尾 "Z"）で統一する。Z 以外の表記は拒否する。
 *   4. predictionId の重複は拒否する（追記専用のため、重複IDは別IDとして再発行する）。
 *   5. schemas/prediction.schema.json の additionalProperties:false / 型 / enum /
 *      最小・最大値をこのファイルで手動検証する（軽量運用のため ajv 等の依存を追加しない）。
 *   6. チーム名は data/teams.json の canonical（Jリーグ公式「2026特別シーズン、2026/27
 *      シーズン クラブ編成」https://www.jleague.jp/news/article/32852/ 基準）に解決できる
 *      ものを正しいデータとして扱う。解決できない場合も「推測で対応づけ」はせず、保存は
 *      ブロックしない代わりに warnings に resolved:false の詳細を記録し、呼び出し側
 *      （score_predictions.js の採点処理）で unresolvedTeamNames として除外・報告する。
 *      これは「書き込み自体は止めない・採点時にのみ除外する」という既存の運用方針に揃えている。
 *   7. 予測結果（スコア・実際の試合結果）はこのファイルでは一切扱わない。
 *      結果は score_predictions.js が別ファイル（results/*.jsonl）から読む。
 *
 * 保存形式: 1行1レコードの JSONL（JSON Lines）。ラウンドごとに
 *   predictions/round_<開催回>_<modelName>.jsonl
 * というファイル名を推奨する（例: predictions/round_1665_ChatGPT.jsonl）。
 * JSONL を選ぶ理由は「末尾に1行 appendFileSync するだけで追記専用が保証できる」ため。
 */

'use strict';
const fs = require('fs');
const path = require('path');

const TEAM_DICT_PATH = path.join(__dirname, '..', 'data', 'teams.json');
let _teamDict = null;
function loadTeamDict() {
    if (_teamDict) return _teamDict;
    _teamDict = JSON.parse(fs.readFileSync(TEAM_DICT_PATH, 'utf8'));
    return _teamDict;
}

const ISO_UTC_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,3})?Z$/;
const MODEL_NAME_ENUM = ['ChatGPT', 'Claude'];
const ALLOWED_FIELDS = new Set([
    'predictionId', 'round', 'matchNumber', 'homeTeam', 'awayTeam',
    'probabilities', 'predictionConfirmedAt', 'deadlineAt',
    'modelName', 'modelVersion', 'revisionOf',
    'sourceRetrievedAt', 'notes', 'corrections', 'dataSource', 'evidence',
]);
const REQUIRED_FIELDS = [
    'predictionId', 'round', 'matchNumber', 'homeTeam', 'awayTeam',
    'probabilities', 'predictionConfirmedAt', 'deadlineAt',
    'modelName', 'modelVersion', 'revisionOf',
];
const ALLOWED_EVIDENCE_FIELDS = new Set([
    'sources', 'homeTeamStatus', 'awayTeamStatus', 'probabilityRationale',
    'quantitativeContribution', 'confidenceLevel', 'unconfirmed', 'modelOrigin',
]);
const ALLOWED_TEAM_STATUS_FIELDS = new Set([
    'standing', 'goalDiff', 'recentFormPeriod', 'recentFormCompetitions', 'homeAwaySplit', 'absences',
]);
const ALLOWED_SOURCE_FIELDS = new Set(['name', 'url', 'retrievedAt']);
const ALLOWED_CORRECTIONS_FIELDS = new Set(['dixonColes', 'drawBoostVariant', 'shrinkageSampleTrust', 'marketBlendWeight']);

class ValidationError extends Error {
    constructor(message, field) {
        super(message);
        this.name = 'ValidationError';
        this.field = field;
    }
}

function nfkc(s) { return String(s).normalize('NFKC'); }

/**
 * data/teams.json の clubs[] から「あらゆる既知の表記 -> クラブ情報」の
 * 検索テーブルを構築する。canonical / aliases[] の文字列と、それぞれの
 * NFKC正規化形の両方をキーとして登録する（NFKCは全角↔半角の一意な機械的変換であり、
 * 推測によるマッチングではない。照合時の内部処理に限り、canonical自体は変更しない）。
 */
let _lookup = null;
function buildLookup() {
    if (_lookup) return _lookup;
    const dict = loadTeamDict();
    const map = new Map();
    for (const club of dict.clubs) {
        const variants = new Set([club.canonical, ...(club.aliases || [])]);
        for (const v of variants) {
            map.set(v, club);
            map.set(nfkc(v), club);
        }
    }
    _lookup = map;
    return map;
}

/**
 * 任意の表記を data/teams.json の正規名称（canonical、Jリーグ公式2026クラブ編成基準）に変換する。
 * 戻り値: { resolved: boolean, canonicalName: string|null, club: object|null, raw: string, reason?: string }
 * 辞書で解決できない場合も例外にはせず resolved:false を返す（推測補完はしない）。
 */
function resolveTeamName(rawName) {
    const map = buildLookup();
    const club = map.get(rawName) || map.get(nfkc(rawName));
    if (club) {
        return { resolved: true, canonicalName: club.canonical, club, raw: rawName };
    }
    return {
        resolved: false, canonicalName: null, club: null, raw: rawName,
        reason: `data/teams.json（Jリーグ公式2026クラブ編成基準、全60クラブ）で正規名称に変換できない表記です（推測補完は行いません。クラブを一意に確認できた場合のみ data/teams.json の aliases に追加してください）: ${JSON.stringify(rawName)}`,
    };
}

function isPlainObject(x) {
    return typeof x === 'object' && x !== null && !Array.isArray(x);
}

function isUri(x) {
    if (typeof x !== 'string') return false;
    try { new URL(x); return true; } catch (e) { return false; }
}

/** evidence（予測根拠）の検証。schemas/prediction.schema.json の properties.evidence に対応。 */
function validateEvidence(ev) {
    const errors = [];
    if (!isPlainObject(ev)) return ['evidence はオブジェクトである必要がある'];
    for (const k of Object.keys(ev)) {
        if (!ALLOWED_EVIDENCE_FIELDS.has(k)) errors.push(`evidence に未知のフィールド（additionalProperties:false）: ${k}`);
    }
    if ('sources' in ev) {
        if (!Array.isArray(ev.sources)) errors.push('evidence.sources は配列である必要がある');
        else ev.sources.forEach((s, i) => {
            if (!isPlainObject(s)) { errors.push(`evidence.sources[${i}] はオブジェクトである必要がある`); return; }
            for (const k of Object.keys(s)) {
                if (!ALLOWED_SOURCE_FIELDS.has(k)) errors.push(`evidence.sources[${i}] に未知のフィールド（additionalProperties:false）: ${k}`);
            }
            for (const k of ['name', 'url', 'retrievedAt']) {
                if (!(k in s)) errors.push(`evidence.sources[${i}] の必須フィールドが欠落: ${k}`);
            }
            if ('name' in s && typeof s.name !== 'string') errors.push(`evidence.sources[${i}].name は文字列`);
            if ('url' in s && !isUri(s.url)) errors.push(`evidence.sources[${i}].url は URI 形式の文字列`);
            if ('retrievedAt' in s && (typeof s.retrievedAt !== 'string' || !ISO_UTC_RE.test(s.retrievedAt))) {
                errors.push(`evidence.sources[${i}].retrievedAt は ISO 8601 UTC 形式`);
            }
        });
    }
    for (const side of ['homeTeamStatus', 'awayTeamStatus']) {
        if (!(side in ev)) continue;
        const st = ev[side];
        if (!isPlainObject(st)) { errors.push(`evidence.${side} はオブジェクトである必要がある`); continue; }
        for (const k of Object.keys(st)) {
            if (!ALLOWED_TEAM_STATUS_FIELDS.has(k)) errors.push(`evidence.${side} に未知のフィールド（additionalProperties:false）: ${k}`);
        }
        for (const k of ['standing', 'goalDiff']) {
            if (k in st && st[k] !== null && !Number.isInteger(st[k])) errors.push(`evidence.${side}.${k} は整数か null`);
        }
        for (const k of ['recentFormPeriod', 'recentFormCompetitions', 'absences']) {
            if (k in st && typeof st[k] !== 'string') errors.push(`evidence.${side}.${k} は文字列`);
        }
        if ('homeAwaySplit' in st && !['home', 'away'].includes(st.homeAwaySplit)) errors.push(`evidence.${side}.homeAwaySplit は "home" か "away"`);
    }
    if ('probabilityRationale' in ev && typeof ev.probabilityRationale !== 'string') errors.push('evidence.probabilityRationale は文字列');
    if ('quantitativeContribution' in ev && !['quantified', 'not_quantified'].includes(ev.quantitativeContribution)) errors.push('evidence.quantitativeContribution は "quantified" か "not_quantified"');
    if ('confidenceLevel' in ev && !['high', 'medium', 'low'].includes(ev.confidenceLevel)) errors.push('evidence.confidenceLevel は "high"/"medium"/"low"');
    if ('unconfirmed' in ev && (!Array.isArray(ev.unconfirmed) || ev.unconfirmed.some(x => typeof x !== 'string'))) errors.push('evidence.unconfirmed は文字列の配列');
    if ('modelOrigin' in ev && !['production_model_output', 'independent_estimate'].includes(ev.modelOrigin)) errors.push('evidence.modelOrigin は "production_model_output" か "independent_estimate"');
    return errors;
}

/**
 * schemas/prediction.schema.json のルールを手動で検証する
 * （additionalProperties:false / 型 / enum / 範囲 / 必須フィールド）。
 */
function validateSchema(record) {
    const errors = [];

    for (const k of Object.keys(record)) {
        if (!ALLOWED_FIELDS.has(k)) errors.push(`未知のフィールド（additionalProperties:false のため拒否）: ${k}`);
    }
    for (const f of REQUIRED_FIELDS) {
        if (!(f in record)) errors.push(`必須フィールドが欠落: ${f}`);
    }
    if (errors.length) return errors; // 必須フィールドが無い状態でこれ以上の型チェックは無意味

    if (typeof record.predictionId !== 'string' || !record.predictionId) errors.push('predictionId は空でない文字列が必要');
    if (!Number.isInteger(record.round) || record.round < 1) errors.push('round は1以上の整数（toto開催回）である必要がある');
    if (!Number.isInteger(record.matchNumber) || record.matchNumber < 1 || record.matchNumber > 13) errors.push('matchNumber は1〜13の整数である必要がある');
    if (typeof record.homeTeam !== 'string' || !record.homeTeam) errors.push('homeTeam は空でない文字列が必要');
    if (typeof record.awayTeam !== 'string' || !record.awayTeam) errors.push('awayTeam は空でない文字列が必要');
    if (typeof record.modelVersion !== 'string' || !record.modelVersion) errors.push('modelVersion は空でない文字列が必要');
    if (!MODEL_NAME_ENUM.includes(record.modelName)) errors.push(`modelName は ${JSON.stringify(MODEL_NAME_ENUM)} のいずれかである必要がある（実際: ${JSON.stringify(record.modelName)}）`);
    if (record.revisionOf !== null && typeof record.revisionOf !== 'string') errors.push('revisionOf は null か文字列である必要がある');

    for (const f of ['predictionConfirmedAt', 'deadlineAt']) {
        if (typeof record[f] !== 'string' || !ISO_UTC_RE.test(record[f])) {
            errors.push(`${f} は ISO 8601 UTC 形式（例: 2026-10-25T14:00:00Z）である必要がある。実際の値: ${JSON.stringify(record[f])}`);
        }
    }

    const p = record.probabilities;
    if (typeof p !== 'object' || p === null || Array.isArray(p)) {
        errors.push('probabilities はオブジェクトである必要がある: {"1":x,"0":x,"2":x}');
    } else {
        const keys = Object.keys(p).sort();
        if (keys.join(',') !== '0,1,2') {
            errors.push(`probabilities のキーは "1"(ホーム勝),"0"(ドロー),"2"(アウェイ勝) の3つのみ（additionalProperties:false）。実際のキー: ${JSON.stringify(keys)}`);
        } else {
            for (const k of ['1', '0', '2']) {
                if (typeof p[k] !== 'number' || !Number.isFinite(p[k]) || p[k] < 0 || p[k] > 1) {
                    errors.push(`probabilities["${k}"] は0〜1の数値である必要がある（実際: ${JSON.stringify(p[k])}）`);
                }
            }
            const sum = Number(p['1']) + Number(p['0']) + Number(p['2']);
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
            if ('dixonColes' in c && c.dixonColes !== null && typeof c.dixonColes !== 'boolean') errors.push('corrections.dixonColes は boolean か null');
            if ('drawBoostVariant' in c && c.drawBoostVariant !== null && typeof c.drawBoostVariant !== 'string') errors.push('corrections.drawBoostVariant は文字列か null');
            if ('shrinkageSampleTrust' in c && c.shrinkageSampleTrust !== null && typeof c.shrinkageSampleTrust !== 'number') errors.push('corrections.shrinkageSampleTrust は数値か null');
            if ('marketBlendWeight' in c && c.marketBlendWeight !== null && typeof c.marketBlendWeight !== 'number') errors.push('corrections.marketBlendWeight は数値か null');
        }
    }

    if ('evidence' in record) errors.push(...validateEvidence(record.evidence));

    return errors;
}

/**
 * 1レコードを検証する。existingIds は同一ログファイル内の既存 predictionId の Set（重複検知用）。
 * 戻り値: { ok: boolean, errors: string[], warnings: string[] }
 */
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

    // チーム名解決（推測補完しない。未解決は保存はブロックせず warning のみ。採点時に除外される）
    let homeResolved, awayResolved;
    if (typeof record.homeTeam === 'string') {
        homeResolved = resolveTeamName(record.homeTeam);
        if (!homeResolved.resolved) warnings.push(`homeTeam "${record.homeTeam}" はチーム名辞書で未解決: ${homeResolved.reason}`);
    }
    if (typeof record.awayTeam === 'string') {
        awayResolved = resolveTeamName(record.awayTeam);
        if (!awayResolved.resolved) warnings.push(`awayTeam "${record.awayTeam}" はチーム名辞書で未解決: ${awayResolved.reason}`);
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
    fs.mkdirSync(path.dirname(logFilePath), { recursive: true });
    // 検証OKのレコードのみ、末尾に1行追記。既存バイトには一切触れない。
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
    validateEvidence,
    MODEL_NAME_ENUM,
};

// CLI: node scripts/validate_prediction.js <logFilePath> <recordJsonFilePath>
if (require.main === module) {
    const [logFilePath, recordJsonFilePath] = process.argv.slice(2);
    if (!logFilePath || !recordJsonFilePath) {
        console.error('使い方: node scripts/validate_prediction.js <ログファイル.jsonl> <追記したいレコード.json>');
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
