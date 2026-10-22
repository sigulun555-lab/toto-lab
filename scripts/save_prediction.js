#!/usr/bin/env node
/**
 * save_prediction.js
 *
 * predictions/round_<開催回>_<ChatGPT|Claude>.jsonl という命名規則で、
 * 予測レコードを追記する薄いラッパー。
 *
 * validate_prediction.js の appendPrediction()（スキーマ検証・締切判定・
 * predictionId重複防止・追記専用の強制）はそのまま使い、ここでは
 * 「record の round / modelName から保存先ファイルパスを自動的に決める」ことだけを行う。
 * これにより、呼び出し側（ChatGPT側・Claude側のどちらでも）がファイルパスを手で組み立てる
 * 必要がなくなり、「別ラウンド・別モデルのログファイルに書き込んでしまう」というヒューマン
 * エラー（タイプミス含む）を構造的に防ぐ。
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { appendPrediction, MODEL_NAME_ENUM } = require('./validate_prediction.js');

const PREDICTIONS_DIR = path.join(__dirname, '..', 'predictions');

/**
 * round と modelName（"ChatGPT" | "Claude"）から、保存先の正式なファイルパスを決定する。
 * modelName が未知の場合はエラーにする（推測でファイル名を作らない）。
 */
function predictionLogPath(round, modelName) {
    if (!MODEL_NAME_ENUM.includes(modelName)) {
        throw new Error(`modelName は ${JSON.stringify(MODEL_NAME_ENUM)} のいずれかである必要がある（実際: ${JSON.stringify(modelName)}）`);
    }
    if (!Number.isInteger(round) || round < 1) {
        throw new Error(`round は1以上の整数である必要がある（実際: ${JSON.stringify(round)}）`);
    }
    return path.join(PREDICTIONS_DIR, `round_${round}_${modelName}.jsonl`);
}

/**
 * レコードの round / modelName から保存先パスを決定し、appendPrediction に委譲する。
 * 戻り値・例外は appendPrediction と同じ（ValidationError はそのまま伝播する）。
 */
function savePrediction(record) {
    const logPath = predictionLogPath(record.round, record.modelName);
    const result = appendPrediction(logPath, record);
    return { ...result, logPath };
}

module.exports = { predictionLogPath, savePrediction };

// CLI: node scripts/save_prediction.js <record.json>
if (require.main === module) {
    const [recordJsonFilePath] = process.argv.slice(2);
    if (!recordJsonFilePath) {
        console.error('使い方: node scripts/save_prediction.js <追記したいレコード.json>');
        console.error('（round / modelName から predictions/round_<開催回>_<modelName>.jsonl を自動決定して追記します）');
        process.exit(1);
    }
    const record = JSON.parse(fs.readFileSync(recordJsonFilePath, 'utf8'));
    try {
        const { logPath, warnings } = savePrediction(record);
        console.log(`OK: ${record.predictionId} を ${logPath} に追記しました。`);
        if (warnings.length) console.log('警告:\n - ' + warnings.join('\n - '));
    } catch (e) {
        console.error('失敗: ' + e.message);
        process.exit(1);
    }
}
