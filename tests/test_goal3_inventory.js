'use strict';
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { buildInventory, hasMarketVector, validPreDeadline } = require('../scripts/audit_goal3_inventory.js');

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'goal3-inventory-test-'));
const predDir = path.join(tmp, 'predictions');
const resultDir = path.join(tmp, 'results');
fs.mkdirSync(predDir); fs.mkdirSync(resultDir);
const base = {
  round: 7777, matchNumber: 1, team: 'Team A', opponent: 'Team B', isHome: true,
  modelName: 'TestModel', modelVersion: 'v1',
  predictionConfirmedAt: '2026-01-01T00:00:00Z', deadlineAt: '2026-01-02T00:00:00Z',
  probabilities: { '0': 0.1, '1': 0.2, '2': 0.3, '3': 0.4 },
};
fs.writeFileSync(path.join(predDir, 'round_7777_TestModel_goal3.jsonl'), [
  JSON.stringify(base),
  JSON.stringify({ ...base, predictionId: 'revision-2', predictionConfirmedAt: '2026-01-01T01:00:00Z', marketProbabilities: { '0': 0.1, '1': 0.2, '2': 0.3, '3': 0.4 } }),
  JSON.stringify({ ...base, predictionId: 'late', matchNumber: 2, predictionConfirmedAt: '2026-01-03T00:00:00Z' }),
].join('\n') + '\n');
fs.writeFileSync(path.join(resultDir, 'round_7777.jsonl'), JSON.stringify({
  round: 7777, matchNumber: 1, homeTeam: 'Team A', awayTeam: 'Team B', homeGoals: 1, awayGoals: 0, competition: 'TEST',
}) + '\n');

assert.strictEqual(validPreDeadline(base), true);
assert.strictEqual(validPreDeadline({ ...base, predictionConfirmedAt: '2026-01-02T00:00:00Z' }), false);
assert.strictEqual(hasMarketVector({ marketProbabilities: { '0': 1 } }), true);
assert.strictEqual(hasMarketVector({ probabilities: { '0': 1 } }), false);
const report = buildInventory(predDir, resultDir);
assert.strictEqual(report.totals.predictionRows, 3);
assert.strictEqual(report.byRound['7777'].preDeadlineRows, 2);
assert.strictEqual(report.byRound['7777'].invalidOrPostDeadlineRows, 1);
assert.strictEqual(report.byRound['7777'].rowsWithMarketProbabilityVector, 1);
assert.strictEqual(report.byRound['7777'].resultRows, 1);
console.log('OK - GOAL3 inventory audit tests');


// Round 1673 official totoGOAL3 market snapshot (direct official page only).
const round1673Goal3Market=JSON.parse(fs.readFileSync(path.join(__dirname,'..','reports/round_1673_goal3_official_market_snapshot_20261115T0709JST.json'),'utf8'));
assert.strictEqual(round1673Goal3Market.round,1673);
assert.strictEqual(round1673Goal3Market.marketType,'totoGOAL3');
assert.strictEqual(round1673Goal3Market.pageDisplayAt,'2026-11-15T07:09:00+09:00');
assert.strictEqual(round1673Goal3Market.retrievedAt,'2026-11-15T07:11:41+09:00');
assert.strictEqual(round1673Goal3Market.displayAgeSeconds,161);
assert.strictEqual(round1673Goal3Market.stale,false);
assert.strictEqual(round1673Goal3Market.totalVotesPageSummary,6549);
assert.strictEqual(round1673Goal3Market.matches.length,6);
assert.deepStrictEqual(round1673Goal3Market.matches.map(x=>x.toto13MatchNumber),[1,1,2,2,5,5]);
assert.strictEqual(new Set(round1673Goal3Market.matches.map(x=>x.matchNumber+':'+x.team)).size,6);
for(const row of round1673Goal3Market.matches){
 assert.strictEqual(row.sumVotes,row.voteCounts.reduce((a,b)=>a+b,0));
 assert.strictEqual(row.sumVotes,6549);
 assert.ok(Math.abs(row.percentages.reduce((a,b)=>a+b,0)-100)<1e-8);
}
assert.strictEqual(round1673Goal3Market.countConsistency.allSixTeamSideTotalsMatchPageSummary,true);
assert.strictEqual(round1673Goal3Market.countConsistency.allSixPercentageVectorsSumTo100,true);
console.log('OK - round 1673 official GOAL3 market snapshot');


// Round 1673 official totoGOAL3 market snapshot at 10:26 JST (stale at retrieval).
const round1673Goal3Market1026=JSON.parse(fs.readFileSync(path.join(__dirname,'..','reports/round_1673_goal3_official_market_snapshot_20261115T1026JST.json'),'utf8'));
assert.strictEqual(round1673Goal3Market1026.round,1673);
assert.strictEqual(round1673Goal3Market1026.marketType,'totoGOAL3');
assert.strictEqual(round1673Goal3Market1026.pageDisplayAt,'2026-11-15T10:26:00+09:00');
assert.strictEqual(round1673Goal3Market1026.retrievedAt,'2026-11-15T10:49:41+09:00');
assert.strictEqual(round1673Goal3Market1026.displayAgeSeconds,1421);
assert.strictEqual(round1673Goal3Market1026.stale,true);
assert.strictEqual(round1673Goal3Market1026.totalVotesPageSummary,7054);
assert.deepStrictEqual(round1673Goal3Market1026.categoryOrder,['0','1','2','3+']);
assert.strictEqual(round1673Goal3Market1026.matches.length,6);
assert.deepStrictEqual(round1673Goal3Market1026.matches.map(x=>x.toto13MatchNumber),[1,1,2,2,5,5]);
assert.strictEqual(new Set(round1673Goal3Market1026.matches.map(x=>x.matchNumber+':'+x.team)).size,6);
for(const row of round1673Goal3Market1026.matches){
 assert.strictEqual(row.sumVotes,row.voteCounts.reduce((a,b)=>a+b,0));
 assert.strictEqual(row.sumVotes,7054);
 assert.ok(Math.abs(row.percentages.reduce((a,b)=>a+b,0)-100)<1e-8);
}
assert.strictEqual(round1673Goal3Market1026.countConsistency.allSixTeamSideTotalsMatchPageSummary,true);
assert.strictEqual(round1673Goal3Market1026.countConsistency.allSixPercentageVectorsSumTo100,true);
console.log('OK - round 1673 stale official GOAL3 market snapshot (10:26 JST)');


// Round 1673 official totoGOAL3 market snapshot at 12:57 JST (stale at retrieval).
const round1673Goal3Market1257=JSON.parse(fs.readFileSync(path.join(__dirname,'..','reports/round_1673_goal3_official_market_snapshot_20261115T1257JST.json'),'utf8'));
assert.strictEqual(round1673Goal3Market1257.round,1673);
assert.strictEqual(round1673Goal3Market1257.marketType,'totoGOAL3');
assert.strictEqual(round1673Goal3Market1257.pageDisplayAt,'2026-11-15T12:57:00+09:00');
assert.strictEqual(round1673Goal3Market1257.retrievedAt,'2026-11-15T14:02:49+09:00');
assert.strictEqual(round1673Goal3Market1257.displayAgeSeconds,3949);
assert.strictEqual(round1673Goal3Market1257.stale,true);
assert.strictEqual(round1673Goal3Market1257.totalVotesPageSummary,8426);
assert.deepStrictEqual(round1673Goal3Market1257.categoryOrder,['0','1','2','3+']);
assert.strictEqual(round1673Goal3Market1257.matches.length,6);
assert.deepStrictEqual(round1673Goal3Market1257.matches.map(x=>x.toto13MatchNumber),[1,1,2,2,5,5]);
assert.strictEqual(new Set(round1673Goal3Market1257.matches.map(x=>x.matchNumber+':'+x.team)).size,6);
for(const row of round1673Goal3Market1257.matches){
 assert.strictEqual(row.sumVotes,row.voteCounts.reduce((a,b)=>a+b,0));
 assert.strictEqual(row.sumVotes,8426);
 assert.ok(Math.abs(row.percentages.reduce((a,b)=>a+b,0)-100)<1e-8);
}
assert.strictEqual(round1673Goal3Market1257.countConsistency.allSixTeamSideTotalsMatchPageSummary,true);
assert.strictEqual(round1673Goal3Market1257.countConsistency.allSixPercentageVectorsSumTo100,true);
console.log('OK - round 1673 stale official GOAL3 market snapshot (12:57 JST)');


// Round 1673 official totoGOAL3 market snapshot at 14:05 JST (stale at retrieval).
const round1673Goal3Market1405=JSON.parse(fs.readFileSync(path.join(__dirname,'..','reports/round_1673_goal3_official_market_snapshot_20261115T1405JST.json'),'utf8'));
assert.strictEqual(round1673Goal3Market1405.round,1673);
assert.strictEqual(round1673Goal3Market1405.marketType,'totoGOAL3');
assert.strictEqual(round1673Goal3Market1405.pageDisplayAt,'2026-11-15T14:05:00+09:00');
assert.strictEqual(round1673Goal3Market1405.retrievedAt,'2026-11-15T14:17:52+09:00');
assert.strictEqual(round1673Goal3Market1405.displayAgeSeconds,772);
assert.strictEqual(round1673Goal3Market1405.stale,true);
assert.strictEqual(round1673Goal3Market1405.totalVotesPageSummary,8842);
assert.deepStrictEqual(round1673Goal3Market1405.categoryOrder,['0','1','2','3+']);
assert.strictEqual(round1673Goal3Market1405.matches.length,6);
assert.deepStrictEqual(round1673Goal3Market1405.matches.map(x=>x.toto13MatchNumber),[1,1,2,2,5,5]);
assert.strictEqual(new Set(round1673Goal3Market1405.matches.map(x=>x.matchNumber+':'+x.team)).size,6);
for(const row of round1673Goal3Market1405.matches){
 assert.strictEqual(row.sumVotes,row.voteCounts.reduce((a,b)=>a+b,0));
 assert.strictEqual(row.sumVotes,8842);
 assert.ok(Math.abs(row.percentages.reduce((a,b)=>a+b,0)-100)<1e-8);
}
assert.strictEqual(round1673Goal3Market1405.countConsistency.allSixTeamSideTotalsMatchPageSummary,true);
assert.strictEqual(round1673Goal3Market1405.countConsistency.allSixPercentageVectorsSumTo100,true);
console.log('OK - round 1673 stale official GOAL3 market snapshot (14:05 JST)');
