'use strict';
// 簡易テスト：rest_days_table.csv がこのディレクトリの compute_rest_days.py から
// 再現可能であることだけを確認する（モデル予測やスコアリングには影響しない、
// 分析専用ファイルのための軽量チェック）。
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const csvPath = path.join(__dirname, 'rest_days_table.csv');

test('rest_days_table.csv exists and has the expected columns', () => {
    const text = fs.readFileSync(csvPath, 'utf8').trim();
    const lines = text.split('\n').map(l => l.replace(/\r$/, ''));
    const header = lines[0].split(',');
    assert.deepEqual(header, ['team', 'date', 'calendar_day_gap', 'rest_days_between_matches', 'comp', 'gf', 'ga', 'gd', 'pts']);
    // ヘッダーを除いた行数は、history.jsonの380試合×2チーム分から各チームの初戦を除いた件数で
    // 固定値になる（history.jsonが変わらない限り700件）。
    assert.equal(lines.length - 1, 700);
});

test('rest_days_between_matches is always calendar_day_gap - 1', () => {
    const text = fs.readFileSync(csvPath, 'utf8').trim();
    const [headerLine, ...rows] = text.split('\n').map(l => l.replace(/\r$/, ''));
    const header = headerLine.split(',');
    const gapIdx = header.indexOf('calendar_day_gap');
    const restIdx = header.indexOf('rest_days_between_matches');
    for (const line of rows) {
        const cols = line.split(',');
        const gap = Number(cols[gapIdx]);
        const rest = Number(cols[restIdx]);
        assert.equal(rest, gap - 1, `row mismatch: ${line}`);
    }
});

test('short(<=3) and long_core(6-8) buckets reproduce the documented counts', () => {
    const text = fs.readFileSync(csvPath, 'utf8').trim();
    const [headerLine, ...rows] = text.split('\n').map(l => l.replace(/\r$/, ''));
    const header = headerLine.split(',');
    const restIdx = header.indexOf('rest_days_between_matches');
    let shortN = 0, longCoreN = 0;
    for (const line of rows) {
        const rest = Number(line.split(',')[restIdx]);
        if (rest <= 3) shortN++;
        else if (rest >= 6 && rest <= 8) longCoreN++;
    }
    // READMEに記載の訂正後の件数（rest_days_between_matches基準）。
    assert.equal(shortN, 165);
    assert.equal(longCoreN, 387);
});

test('pts column is a correct 3/1/0 result derived from gf/ga, and bucket means match README', () => {
    const text = fs.readFileSync(csvPath, 'utf8').trim();
    const [headerLine, ...rows] = text.split('\n').map(l => l.replace(/\r$/, ''));
    const header = headerLine.split(',');
    const gfIdx = header.indexOf('gf');
    const gaIdx = header.indexOf('ga');
    const ptsIdx = header.indexOf('pts');
    const restIdx = header.indexOf('rest_days_between_matches');
    let shortPts = [], longCorePts = [];
    for (const line of rows) {
        const cols = line.split(',');
        const gf = Number(cols[gfIdx]);
        const ga = Number(cols[gaIdx]);
        const pts = Number(cols[ptsIdx]);
        const expectedPts = gf > ga ? 3 : (gf === ga ? 1 : 0);
        assert.equal(pts, expectedPts, `pts mismatch: ${line}`);
        const rest = Number(cols[restIdx]);
        if (rest <= 3) shortPts.push(pts);
        else if (rest >= 6 && rest <= 8) longCorePts.push(pts);
    }
    const mean = (xs) => xs.reduce((a, b) => a + b, 0) / xs.length;
    // READMEに記載の平均勝点（short(<=3)=1.3818, long_core(6-8)=1.3928）を再現する。
    assert.ok(Math.abs(mean(shortPts) - 1.3818) < 1e-3, `short mean pts was ${mean(shortPts)}`);
    assert.ok(Math.abs(mean(longCorePts) - 1.3928) < 1e-3, `long_core mean pts was ${mean(longCorePts)}`);
});
