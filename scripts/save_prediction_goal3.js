#!/usr/bin/env node
/**
 * save_prediction_goal3.js
 *
 * totoGOAL3用レコード（record.round / record.modelName）から
 * predictions/round_<開催回>_<ChatGPT|Claude>_goal3.jsonl という保存先パスを自動決定して追記する
 * 薄いラッパー（save_prediction.js のtotoGOAL3版）。
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { appendPrediction, MODEL_NAME_ENUM } = require('./validate_prediction_goal3.js');

const PREDICTIONS_DIR = path.join(__dirname, '..', 'predictions');

function predictionLogPath(round, modelName) {
    if (!MODEL_NAME_ENUM.includes(modelName)) {
        throw new Error(`modelName は ${JSON.stringify(MODEL_NAME_ENUM)} のいずれかである必要がある（実際: ${JSON.stringify(modelName)}）`);
    }
    if (!Number.isInteger(round) || round < 1) {
        throw new Error(`round は1以上の整数である必要がある（実際: ${JSON.stringify(round)}）`);
    }
    return path.join(PREDICTIONS_DIR, `round_${round}_${modelName}_goal3.jsonl`);
}

function savePrediction(record) {
    const logPath = predictionLogPath(record.round, record.modelName);
    const result = appendPrediction(logPath, record);
    return { ...result, logPath };
}

module.exports = { predictionLogPath, savePrediction };

// CLI: node scripts/save_prediction_goal3.js <record.json>
if (require.main === module) {
    const [recordJsonFilePath] = process.argv.slice(2);
    if (!recordJsonFilePath) {
        console.error('使い方: node scripts/save_prediction_goal3.js <追記したいレコード.json>');
        console.error('（round / modelName から predictions/round_<開催回>_<modelName>_goal3.jsonl を自動決定して追記します）');
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
