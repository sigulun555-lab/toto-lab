#!/usr/bin/env node
// 締切前予測の事前検証（読み取りのみ・予測ファイルは変更しない）
// 使い方: node scripts/check_prediction_timing.js <jsonl> [...]
// 必須: predictionConfirmedAt と deadlineAt の両方が ISO 8601 UTC（Z終端）であること。
// 合格条件: predictionConfirmedAt < deadlineAt。
// 終了コード: 全行合格なら 0、不合格が1件以上なら 1、引数なしなら 2。

'use strict';
const fs = require('fs');

const ISO_UTC_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,3})?Z$/;

function parseUtc(value) {
  if (typeof value !== 'string' || !ISO_UTC_RE.test(value)) return null;
  const time = Date.parse(value);
  return Number.isNaN(time) ? null : time;
}

function checkFile(filePath) {
  const lines = fs.readFileSync(filePath, 'utf8').split('\n').filter((line) => line.trim());
  const counts = {
    ok: 0,
    after_deadline: 0,
    missing_confirmed_at: 0,
    missing_deadline: 0,
    invalid_utc_time: 0,
    invalid_json: 0,
  };
  const rows = [];

  lines.forEach((line, index) => {
    const lineNumber = index + 1;
    let record;
    try {
      record = JSON.parse(line);
    } catch {
      counts.invalid_json++;
      rows.push({ lineNumber, id: 'line' + lineNumber, confirmedAt: '-', deadlineAt: '-', status: '不合格', reason: 'JSON解析不可' });
      return;
    }

    const id = record.predictionId || ('line' + lineNumber);
    const confirmedAt = record.predictionConfirmedAt;
    const deadlineAt = record.deadlineAt;

    if (!confirmedAt) {
      counts.missing_confirmed_at++;
      rows.push({ lineNumber, id, confirmedAt: confirmedAt || '-', deadlineAt: deadlineAt || '-', status: '不合格', reason: 'predictionConfirmedAtなし（predictionCreatedAtで代用しない）' });
      return;
    }
    if (!deadlineAt) {
      counts.missing_deadline++;
      rows.push({ lineNumber, id, confirmedAt, deadlineAt: deadlineAt || '-', status: '不合格', reason: 'deadlineAtなし' });
      return;
    }

    const confirmedMs = parseUtc(confirmedAt);
    const deadlineMs = parseUtc(deadlineAt);
    if (confirmedMs === null || deadlineMs === null) {
      counts.invalid_utc_time++;
      rows.push({ lineNumber, id, confirmedAt, deadlineAt, status: '不合格', reason: '時刻形式不正（ISO 8601 UTC・Z終端が必要）' });
      return;
    }

    if (confirmedMs < deadlineMs) {
      counts.ok++;
      rows.push({ lineNumber, id, confirmedAt, deadlineAt, status: '合格', reason: '' });
    } else {
      counts.after_deadline++;
      rows.push({ lineNumber, id, confirmedAt, deadlineAt, status: '不合格', reason: '締切後または締切時刻と同時刻' });
    }
  });

  return { counts, rows, total: lines.length };
}

const files = process.argv.slice(2);
if (files.length === 0) {
  console.error('使い方: node scripts/check_prediction_timing.js <jsonl> [...]');
  process.exit(2);
}

let anyFail = false;
for (const filePath of files) {
  let result;
  try {
    result = checkFile(filePath);
  } catch (error) {
    console.error(filePath + ': ファイル読込失敗: ' + error.message);
    anyFail = true;
    continue;
  }

  const counts = result.counts;
  const rows = result.rows;
  const total = result.total;
  const failed = total - counts.ok;
  if (failed > 0) anyFail = true;

  console.log('\n' + filePath + ': 全' + total + '行 / 合格' + counts.ok + ' / 不合格' + failed + ' / 締切後' + counts.after_deadline + ' / 確定時刻なし' + counts.missing_confirmed_at + ' / 締切時刻なし' + counts.missing_deadline + ' / UTC形式不正' + counts.invalid_utc_time + ' / JSON解析不可' + counts.invalid_json);
  for (const row of rows) {
    console.log('  [' + row.status + '] 行' + row.lineNumber + ' ' + row.id + ' | predictionConfirmedAt=' + row.confirmedAt + ' | deadlineAt=' + row.deadlineAt + (row.reason ? ' | ' + row.reason : ''));
  }
}

process.exit(anyFail ? 1 : 0);
