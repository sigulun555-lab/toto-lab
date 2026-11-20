'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
const rows = fs.readFileSync(path.join(root, 'data/injury_status/round_1673.jsonl'), 'utf8').trim().split(/\r?\n/).map((line) => JSON.parse(line));
const report = JSON.parse(fs.readFileSync(path.join(root, 'reports/round_1673_official_availability_audit_20261120T1459JST.json'), 'utf8'));
const at = '2026-11-20T14:59:18+09:00';
for (const player of ['イッサム ジェバリ', 'イーライ アダムス']) {
  const matches = rows.filter((row) => row.round === 1673 && row.matchNumber === 5 && row.team === 'Ｇ大阪' && row.player === player && row.status === 'unknown' && row.reason === 'injury' && row.sourceUrl === 'https://www.jleague.jp/match/j1/2026/112106/' && row.sourceAt === null && row.recordedAt === at);
  assert.strictEqual(matches.length, 1, 'append exactly one unconfirmed injury-availability record for ' + player);
}
const keys = rows.map((row) => [row.round,row.matchNumber,row.team,row.player,row.status,row.recordedAt].join('|'));
assert.strictEqual(new Set(keys).size, keys.length, 'no duplicate injury ledger event keys');
assert.strictEqual(report.round, 1673);
assert.strictEqual(report.product, 'toto13');
assert.strictEqual(report.retrievedAt, at);
assert.strictEqual(report.matchPreviewsChecked.length, 13);
assert.deepStrictEqual(report.matchPreviewsChecked.map((x) => x.matchNumber), Array.from({length:13}, (_,i)=>i+1));
assert.strictEqual(report.suspensions.length, 8);
assert.strictEqual(report.injuries.length, 2);
assert.strictEqual(report.coverage.remainingClubCount, 17);
assert.strictEqual(report.coverage.remainingClubsRequireClubOfficialAvailabilityReview.length, 17);
assert.strictEqual(report.lineupStatus.officialStartingXI.status, 'not_published_as_of_retrieval');
assert.strictEqual(report.lineupStatus.officialStartingXI.confirmedMatches, 0);
assert.ok(report.availabilityNotes.some((x) => x.player === '角田 涼太朗' && x.status === 'likely_out_not_confirmed'));
assert.ok(report.availabilityNotes.some((x) => x.player === 'キム・ジュソン' && x.status === 'returning_not_start_confirmed'));
assert.ok(report.availabilityNotes.some((x) => x.player === '本間 至恩' && x.status === 'returned_substitute'));
console.log('OK - round 1673 official match-preview availability audit');
