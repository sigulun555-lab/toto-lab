'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const file = path.join(__dirname, '..', 'data', 'injury_status', 'round_1673.jsonl');
const rows = fs.readFileSync(file, 'utf8').trim().split(/\r?\n/).map((line) => JSON.parse(line));
assert.ok(rows.length >= 17);
assert.ok(rows.every((row) => row.round === 1673));
assert.ok(rows.every((row) => ['confirmed_out', 'unknown'].includes(row.status)));

const miyachi = rows.filter((row) =>
  row.matchNumber === 2 && row.team === '横浜FM' && row.player === '宮市 亮'
);
const oldUnknown = miyachi.filter((row) => row.status === 'unknown');
const confirmedOut = miyachi.filter((row) => row.status === 'confirmed_out');
assert.strictEqual(oldUnknown.length, 1, 'preserve the earlier conditional unknown snapshot');
assert.strictEqual(confirmedOut.length, 1, 'append one resolved confirmed-out snapshot');
assert.ok(Date.parse(confirmedOut[0].recordedAt) > Date.parse(oldUnknown[0].recordedAt));
assert.strictEqual(confirmedOut[0].sourceUrl, 'https://www.jleague.jp/news/article/35343/');
assert.strictEqual(confirmedOut[0].resolutionSourceUrl, 'https://www.jleague.jp/match/leaguecup/2026/111503/');
assert.strictEqual(confirmedOut[0].resolutionSourceAt, '2026-11-15');
assert.strictEqual(confirmedOut[0].recordedAt, '2026-11-15T20:36:27+09:00');
assert.match(confirmedOut[0].note, /鹿島3-2横浜FM/);


const verdyPlayers = new Set(['宮原 和也', '森田 晃樹', '寺沼 星文']);
const verdyRows = rows.filter((row) =>
  row.matchNumber === 6 && row.team === '東京Ｖ' && verdyPlayers.has(row.player)
);
assert.strictEqual(verdyRows.length, 3, 'record all three officially reported Tokyo Verdy injuries');
assert.ok(verdyRows.every((row) => row.status === 'unknown'), 'do not infer match availability from an old recovery estimate');
assert.ok(verdyRows.every((row) => row.sourceUrl === 'https://www.verdy.co.jp/news/15208'));
assert.ok(verdyRows.every((row) => row.sourceAt === '2026-09-10'));


const mihira = rows.filter((row) =>
  row.matchNumber === 10 && row.team === '甲府' && row.player === '三平 和司'
);
assert.strictEqual(mihira.length, 1, 'record Kofu official injury update');
assert.strictEqual(mihira[0].status, 'unknown', 'do not infer 11/21 availability from 11/02 injury notice');
assert.strictEqual(mihira[0].sourceUrl, 'https://www.ventforet.jp/sp/news/mobile_presents/525697');
assert.strictEqual(mihira[0].sourceAt, '2026-11-02');

const exactKeys = rows.map((row) => [
  row.round, row.matchNumber, row.team, row.player, row.status, row.recordedAt
].join('|'));
assert.strictEqual(new Set(exactKeys).size, exactKeys.length, 'no duplicate ledger event keys');
console.log('OK - round 1673 injury ledger append-only Miyachi resolution');
