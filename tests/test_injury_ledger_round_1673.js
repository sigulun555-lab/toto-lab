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
assert.strictEqual(confirmedOut.length, 2, 'preserve the earlier resolution and append the latest official re-confirmation');
const initialResolved = confirmedOut.find((row) => row.sourceUrl === 'https://www.jleague.jp/news/article/35343/');
assert.ok(initialResolved);
assert.ok(Date.parse(initialResolved.recordedAt) > Date.parse(oldUnknown[0].recordedAt));
assert.strictEqual(initialResolved.resolutionSourceUrl, 'https://www.jleague.jp/match/leaguecup/2026/111503/');
assert.strictEqual(initialResolved.resolutionSourceAt, '2026-11-15');
assert.strictEqual(initialResolved.recordedAt, '2026-11-15T20:36:27+09:00');
assert.match(initialResolved.note, /鹿島3-2横浜FM/);
const latestResolved = confirmedOut.find((row) => row.sourceUrl === 'https://www.jleague.jp/news/article/35370/');
assert.ok(latestResolved);
assert.strictEqual(latestResolved.sourceAt, '2026-11-16T19:00:00+09:00');
assert.strictEqual(latestResolved.recordedAt, '2026-11-17T11:39:41+09:00');
assert.strictEqual(latestResolved.resolutionSourceUrl, 'https://www.jleague.jp/match/leaguecup/2026/111503/stats/');
assert.strictEqual(latestResolved.resolutionSourceAt, '2026-11-15T15:00:00+09:00');
assert.match(latestResolved.note, /2戦合計6-4/);


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


const kyotoNov17 = [
  { player: '加藤 蓮', surgery: '2026-11-11', recovery: /6〜8か月/ },
  { player: 'エンリケ・トレヴィザン', surgery: '2026-11-05', recovery: /3か月/ },
  { player: 'ファンティーニ 燦', surgery: '2026-10-21', recovery: /3〜4か月/ },
];
for (const item of kyotoNov17) {
  const matches = rows.filter((row) =>
    row.matchNumber === 3 && row.team === '京都' && row.player === item.player &&
    row.status === 'confirmed_out' && row.sourceUrl === 'https://www.sanga-fc.jp/news/detail/22137' &&
    row.sourceAt === '2026-11-17' && row.recordedAt === '2026-11-17T23:58:09+09:00' &&
    row.retrievedAt === '2026-11-17T23:58:09+09:00' && row.note.includes(item.surgery) && item.recovery.test(row.note)
  );
  assert.strictEqual(matches.length, 1, 'append one official Kyoto injury record for ' + item.player);
}


const hiroshimaNov1 = [
  { player: '川村 拓夢', source: 'https://www.sanfrecce.co.jp/news/team/13024' },
  { player: '加藤 陸次樹', source: 'https://www.sanfrecce.co.jp/news/team/13023' },
];
for (const item of hiroshimaNov1) {
  const matches = rows.filter((row) =>
    row.matchNumber === 2 && row.team === '広島' && row.player === item.player &&
    row.status === 'unknown' && row.sourceUrl === item.source &&
    row.sourceAt === '2026-11-01' && row.recordedAt === '2026-11-17T23:58:09+09:00' && row.retrievedAt === '2026-11-17T23:58:09+09:00'
  );
  assert.strictEqual(matches.length, 1, 'append one official Hiroshima injury record for ' + item.player);
}

const exactKeys = rows.map((row) => [
  row.round, row.matchNumber, row.team, row.player, row.status, row.recordedAt
].join('|'));
assert.strictEqual(new Set(exactKeys).size, exactKeys.length, 'no duplicate ledger event keys');


const nov16Suspensions = [
  { matchNumber: 2, team: '横浜FM', player: '諏訪間 幸成' },
  { matchNumber: 2, team: '横浜FM', player: '宮市 亮' },
  { matchNumber: 7, team: 'FC東京', player: 'ダニ ゴメス' },
  { matchNumber: 7, team: 'Ｃ大阪', player: 'パブロ サバック' },
  { matchNumber: 7, team: 'Ｃ大阪', player: 'ルーカス フェルナンデス' },
  { matchNumber: 5, team: '岡山', player: '鈴木 喜丈' },
  { matchNumber: 13, team: '磐田', player: '金子 大毅' },
  { matchNumber: 11, team: '大分', player: '林田 滉也' },
];
for (const item of nov16Suspensions) {
  const matches = rows.filter((row) =>
    row.matchNumber === item.matchNumber && row.team === item.team && row.player === item.player &&
    row.sourceUrl === 'https://www.jleague.jp/news/article/35370/' &&
    row.sourceAt === '2026-11-16T19:00:00+09:00' && row.recordedAt === '2026-11-17T11:39:41+09:00'
  );
  assert.strictEqual(matches.length, 1, `append exactly one latest official ${item.player} snapshot`);
  assert.strictEqual(matches[0].status, 'confirmed_out');
}
console.log('OK - round 1673 injury ledger append-only Miyachi resolution');
