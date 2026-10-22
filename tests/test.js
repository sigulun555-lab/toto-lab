'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const teams = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'teams.json'), 'utf8'));
assert.equal(teams.clubs.length, 60);
assert.equal(teams.clubs.filter(x => x.league === 'J1').length, 20);
assert.equal(teams.clubs.filter(x => x.league === 'J2').length, 20);
assert.equal(teams.clubs.filter(x => x.league === 'J3').length, 20);
assert.ok(teams.clubs.some(x => x.canonical === 'ギラヴァンツ北九州'));
assert.ok(teams.clubs.some(x => x.canonical === '奈良クラブ'));
assert.ok(teams.clubs.some(x => x.canonical === 'ＦＣ岐阜'));
assert.ok(teams.clubs.some(x => x.canonical === 'ＳＣ相模原'));

// toto_compare/ との統合で追加された項目の確認
const kitakyushu = teams.clubs.find(x => x.canonical === 'ギラヴァンツ北九州');
const nara = teams.clubs.find(x => x.canonical === '奈良クラブ');
const gifu = teams.clubs.find(x => x.canonical === 'ＦＣ岐阜');
const sagamihara = teams.clubs.find(x => x.canonical === 'ＳＣ相模原');
for (const c of [kitakyushu, nara, gifu, sagamihara]) {
  assert.equal(c.claudeAppSupported, false, `${c.canonical} はClaude側アプリのteamDatabase未対応のはず`);
}

const kyoto = teams.clubs.find(x => x.canonical === '京都サンガF.C.');
assert.ok(kyoto.aliases.includes('京都サンガ'), 'Claude側旧表記「京都サンガ」がaliasに統合されているはず');
assert.ok(kyoto.claudeNameDiscrepancyNote, 'Claude側表記との差異ノートがあるはず');

const gunma = teams.clubs.find(x => x.canonical === 'ザスパ群馬');
assert.ok(gunma.aliases.includes('ザスパクサツ群馬'), '旧クラブ名「ザスパクサツ群馬」がaliasに統合されているはず');
assert.ok(gunma.claudeNameDiscrepancyNote, 'Claude側表記との差異ノートがあるはず');

console.log('All tests passed (team dictionary: 15 assertions).');
