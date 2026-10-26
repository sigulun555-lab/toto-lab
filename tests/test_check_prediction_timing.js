#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const script = path.join(__dirname, '..', 'scripts', 'check_prediction_timing.js');
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'check-prediction-timing-'));

function runCase(name, records, expectedCode, expectedText) {
  const file = path.join(dir, name + '.jsonl');
  fs.writeFileSync(file, records.map((record) => JSON.stringify(record)).join('\n') + '\n');
  const result = spawnSync(process.execPath, [script, file], { encoding: 'utf8' });
  assert.equal(result.status, expectedCode, name + ': ' + result.stdout + '\n' + result.stderr);
  assert.match(result.stdout, expectedText);
}

const base = {
  predictionId: 'test-1',
  predictionConfirmedAt: '2026-10-20T09:00:00Z',
  deadlineAt: '2026-10-20T10:00:00Z',
};

try {
  runCase('valid', [base], 0, /合格1/);
  runCase('missing-confirmed', [{ ...base, predictionConfirmedAt: undefined, predictionCreatedAt: '2026-10-20T09:00:00Z' }], 1, /predictionConfirmedAtなし/);
  runCase('after-deadline', [{ ...base, predictionConfirmedAt: '2026-10-20T10:00:00Z' }], 1, /締切後または締切時刻と同時刻/);
  runCase('offset-timezone', [{ ...base, predictionConfirmedAt: '2026-10-20T09:00:00+09:00' }], 1, /有効なISO 8601 UTC・Z終端/);
  runCase('invalid-calendar-date', [{ ...base, predictionConfirmedAt: '2026-02-30T09:00:00Z' }], 1, /有効なISO 8601 UTC・Z終端/);
  runCase('empty-file', [], 1, /ファイルが空のため不合格/);
  console.log('test_check_prediction_timing.js: all tests passed');
} finally {
  fs.rmSync(dir, { recursive: true, force: true });
}
