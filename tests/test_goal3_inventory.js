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


// Round 1673 official totoGOAL3 market snapshot at 15:01 JST (stale at retrieval).
const round1673Goal3Market1501=JSON.parse(fs.readFileSync(path.join(__dirname,'..','reports/round_1673_goal3_official_market_snapshot_20261115T1501JST.json'),'utf8'));
assert.strictEqual(round1673Goal3Market1501.round,1673);
assert.strictEqual(round1673Goal3Market1501.marketType,'totoGOAL3');
assert.strictEqual(round1673Goal3Market1501.pageDisplayAt,'2026-11-15T15:01:00+09:00');
assert.strictEqual(round1673Goal3Market1501.retrievedAt,'2026-11-15T16:14:55+09:00');
assert.strictEqual(round1673Goal3Market1501.displayAgeSeconds,4435);
assert.strictEqual(round1673Goal3Market1501.stale,true);
assert.strictEqual(round1673Goal3Market1501.totalVotesPageSummary,9148);
assert.deepStrictEqual(round1673Goal3Market1501.categoryOrder,['0','1','2','3+']);
assert.strictEqual(round1673Goal3Market1501.matches.length,6);
assert.deepStrictEqual(round1673Goal3Market1501.matches.map(x=>x.toto13MatchNumber),[1,1,2,2,5,5]);
assert.strictEqual(new Set(round1673Goal3Market1501.matches.map(x=>x.matchNumber+':'+x.team)).size,6);
for(const row of round1673Goal3Market1501.matches){
 assert.strictEqual(row.sumVotes,row.voteCounts.reduce((a,b)=>a+b,0));
 assert.strictEqual(row.sumVotes,9148);
 assert.ok(Math.abs(row.percentages.reduce((a,b)=>a+b,0)-100)<1e-8);
}
assert.strictEqual(round1673Goal3Market1501.countConsistency.allSixTeamSideTotalsMatchPageSummary,true);
assert.strictEqual(round1673Goal3Market1501.countConsistency.allSixPercentageVectorsSumTo100,true);
console.log('OK - round 1673 stale official GOAL3 market snapshot (15:01 JST)');


// Round 1673 official totoGOAL3 market snapshot at 16:14 JST (stale at retrieval).
const round1673Goal3Market1614=JSON.parse(fs.readFileSync(path.join(__dirname,'..','reports/round_1673_goal3_official_market_snapshot_20261115T1614JST.json'),'utf8'));
assert.strictEqual(round1673Goal3Market1614.round,1673);
assert.strictEqual(round1673Goal3Market1614.marketType,'totoGOAL3');
assert.strictEqual(round1673Goal3Market1614.pageDisplayAt,'2026-11-15T16:14:00+09:00');
assert.strictEqual(round1673Goal3Market1614.retrievedAt,'2026-11-15T16:53:47+09:00');
assert.strictEqual(round1673Goal3Market1614.displayAgeSeconds,2387);
assert.strictEqual(round1673Goal3Market1614.stale,true);
assert.strictEqual(round1673Goal3Market1614.totalVotesPageSummary,9494);
assert.deepStrictEqual(round1673Goal3Market1614.categoryOrder,['0','1','2','3+']);
assert.strictEqual(round1673Goal3Market1614.matches.length,6);
assert.deepStrictEqual(round1673Goal3Market1614.matches.map(x=>x.toto13MatchNumber),[1,1,2,2,5,5]);
assert.strictEqual(new Set(round1673Goal3Market1614.matches.map(x=>x.matchNumber+':'+x.team)).size,6);
for(const row of round1673Goal3Market1614.matches){
 assert.strictEqual(row.sumVotes,row.voteCounts.reduce((a,b)=>a+b,0));
 assert.strictEqual(row.sumVotes,9494);
 assert.ok(Math.abs(row.percentages.reduce((a,b)=>a+b,0)-100)<1e-8);
}
assert.deepStrictEqual(round1673Goal3Market1614.matches.map(x=>x.voteCounts),[
 [1473,2045,2971,3005],
 [3758,3011,1496,1229],
 [1582,2414,3050,2448],
 [2306,3063,2494,1631],
 [2023,3181,2645,1645],
 [2359,3314,2367,1454]
]);
console.log('OK - round 1673 stale official GOAL3 market snapshot (16:14 JST)');


// Round 1673 official totoGOAL3 market snapshot at 19:25 JST (stale at retrieval).
const round1673Goal3Market1925=JSON.parse(fs.readFileSync(path.join(__dirname,'..','reports/round_1673_goal3_official_market_snapshot_20261115T1925JST.json'),'utf8'));
assert.strictEqual(round1673Goal3Market1925.round,1673);
assert.strictEqual(round1673Goal3Market1925.marketType,'totoGOAL3');
assert.strictEqual(round1673Goal3Market1925.pageDisplayAt,'2026-11-15T19:25:00+09:00');
assert.strictEqual(round1673Goal3Market1925.retrievedAt,'2026-11-15T20:36:27+09:00');
assert.strictEqual(round1673Goal3Market1925.displayAgeSeconds,4287);
assert.strictEqual(round1673Goal3Market1925.stale,true);
assert.strictEqual(round1673Goal3Market1925.totalVotesPageSummary,10501);
assert.deepStrictEqual(round1673Goal3Market1925.categoryOrder,['0','1','2','3+']);
assert.strictEqual(round1673Goal3Market1925.matches.length,6);
assert.deepStrictEqual(round1673Goal3Market1925.matches.map(x=>x.toto13MatchNumber),[1,1,2,2,5,5]);
assert.deepStrictEqual(round1673Goal3Market1925.matches.map(x=>x.voteCounts),[
 [1634,2261,3255,3351],
 [4226,3341,1610,1324],
 [1747,2606,3398,2750],
 [2512,3399,2760,1830],
 [2250,3517,2966,1768],
 [2623,3726,2594,1558]
]);
for(const row of round1673Goal3Market1925.matches){
 assert.strictEqual(row.sumVotes,row.voteCounts.reduce((a,b)=>a+b,0));
 assert.strictEqual(row.sumVotes,10501);
 assert.ok(Math.abs(row.percentages.reduce((a,b)=>a+b,0)-100)<1e-8);
}
assert.strictEqual(round1673Goal3Market1925.countConsistency.allSixTeamSideTotalsMatchPageSummary,true);
assert.strictEqual(round1673Goal3Market1925.countConsistency.allSixPercentageVectorsSumTo100,true);
console.log('OK - round 1673 stale official GOAL3 market snapshot (19:25 JST)');

// Round 1673 official totoGOAL3 market snapshot at 20:39 JST (stale at retrieval).
const round1673Goal3Market2039=JSON.parse(fs.readFileSync(path.join(__dirname,'..','reports/round_1673_goal3_official_market_snapshot_20261115T2039JST.json'),'utf8'));
assert.strictEqual(round1673Goal3Market2039.round,1673);
assert.strictEqual(round1673Goal3Market2039.marketType,'totoGOAL3');
assert.strictEqual(round1673Goal3Market2039.pageDisplayAt,'2026-11-15T20:39:00+09:00');
assert.strictEqual(round1673Goal3Market2039.retrievedAt,'2026-11-15T20:50:26+09:00');
assert.strictEqual(round1673Goal3Market2039.displayAgeSeconds,686);
assert.strictEqual(round1673Goal3Market2039.stale,true);
assert.strictEqual(round1673Goal3Market2039.totalVotesPageSummary,11445);
assert.deepStrictEqual(round1673Goal3Market2039.categoryOrder,['0','1','2','3+']);
assert.strictEqual(round1673Goal3Market2039.matches.length,6);
assert.deepStrictEqual(round1673Goal3Market2039.matches.map(x=>x.toto13MatchNumber),[1,1,2,2,5,5]);
assert.deepStrictEqual(round1673Goal3Market2039.matches.map(x=>x.voteCounts),[
 [1677,2397,3579,3792],
 [4610,3691,1762,1382],
 [1834,2786,3730,3095],
 [2699,3727,3042,1977],
 [2427,3851,3259,1908],
 [2817,4127,2833,1668]
]);
for(const row of round1673Goal3Market2039.matches){
 assert.strictEqual(row.sumVotes,row.voteCounts.reduce((a,b)=>a+b,0));
 assert.strictEqual(row.sumVotes,11445);
 assert.ok(Math.abs(row.percentages.reduce((a,b)=>a+b,0)-100)<1e-8);
}
assert.strictEqual(round1673Goal3Market2039.countConsistency.allSixTeamSideTotalsMatchPageSummary,true);
assert.strictEqual(round1673Goal3Market2039.countConsistency.allSixPercentageVectorsSumTo100,true);
console.log('OK - round 1673 stale official GOAL3 market snapshot (20:39 JST)');

 
// Round 1673 official totoGOAL3 market snapshot at 22:51 JST (stale at retrieval).
const round1673Goal3Market2251=JSON.parse(fs.readFileSync(path.join(__dirname,'..','reports/round_1673_goal3_official_market_snapshot_20261115T2251JST.json'),'utf8'));
assert.strictEqual(round1673Goal3Market2251.round,1673);
assert.strictEqual(round1673Goal3Market2251.marketType,'totoGOAL3');
assert.strictEqual(round1673Goal3Market2251.pageDisplayAt,'2026-11-15T22:51:00+09:00');
assert.strictEqual(round1673Goal3Market2251.retrievedAt,'2026-11-15T23:50:06+09:00');
assert.strictEqual(round1673Goal3Market2251.displayAgeSeconds,3546);
assert.strictEqual(round1673Goal3Market2251.stale,true);
assert.strictEqual(round1673Goal3Market2251.totalVotesPageSummary,12962);
assert.deepStrictEqual(round1673Goal3Market2251.categoryOrder,['0','1','2','3+']);
assert.strictEqual(round1673Goal3Market2251.matches.length,6);
assert.deepStrictEqual(round1673Goal3Market2251.matches.map(x=>x.toto13MatchNumber),[1,1,2,2,5,5]);
assert.deepStrictEqual(round1673Goal3Market2251.matches.map(x=>x.voteCounts),[
 [1773,2567,4165,4457],
 [5338,4247,1932,1445],
 [2000,3095,4241,3626],
 [3089,4220,3411,2242],
 [2737,4345,3680,2200],
 [3244,4605,3264,1849]
]);
for(const row of round1673Goal3Market2251.matches){
 assert.strictEqual(row.sumVotes,row.voteCounts.reduce((a,b)=>a+b,0));
 assert.strictEqual(row.sumVotes,12962);
 assert.ok(Math.abs(row.percentages.reduce((a,b)=>a+b,0)-100)<1e-8);
}
assert.strictEqual(round1673Goal3Market2251.countConsistency.allSixTeamSideTotalsMatchPageSummary,true);
assert.strictEqual(round1673Goal3Market2251.countConsistency.allSixPercentageVectorsSumTo100,true);
console.log('OK - round 1673 stale official GOAL3 market snapshot (22:51 JST)');


// Round 1673 official totoGOAL3 market snapshot at 23:52 JST (stale at retrieval).
const round1673Goal3Market2352=JSON.parse(fs.readFileSync(path.join(__dirname,'..','reports/round_1673_goal3_official_market_snapshot_20261115T2352JST.json'),'utf8'));
assert.strictEqual(round1673Goal3Market2352.round,1673);
assert.strictEqual(round1673Goal3Market2352.marketType,'totoGOAL3');
assert.strictEqual(round1673Goal3Market2352.pageDisplayAt,'2026-11-15T23:52:00+09:00');
assert.strictEqual(round1673Goal3Market2352.retrievedAt,'2026-11-16T02:13:14+09:00');
assert.strictEqual(round1673Goal3Market2352.displayAgeSeconds,8474);
assert.strictEqual(round1673Goal3Market2352.stale,true);
assert.strictEqual(round1673Goal3Market2352.totalVotesPageSummary,13197);
assert.deepStrictEqual(round1673Goal3Market2352.categoryOrder,['0','1','2','3+']);
assert.strictEqual(round1673Goal3Market2352.matches.length,6);
assert.deepStrictEqual(round1673Goal3Market2352.matches.map(x=>x.toto13MatchNumber),[1,1,2,2,5,5]);
assert.deepStrictEqual(round1673Goal3Market2352.matches.map(x=>x.voteCounts),[
 [1787,2615,4257,4538],
 [5441,4346,1962,1448],
 [2011,3169,4328,3689],
 [3126,4327,3477,2267],
 [2792,4424,3750,2231],
 [3266,4705,3352,1874]
]);
for(const row of round1673Goal3Market2352.matches){
 assert.strictEqual(row.sumVotes,row.voteCounts.reduce((a,b)=>a+b,0));
 assert.strictEqual(row.sumVotes,13197);
 assert.ok(Math.abs(row.percentages.reduce((a,b)=>a+b,0)-100)<1e-8);
}
assert.strictEqual(round1673Goal3Market2352.countConsistency.allSixTeamSideTotalsMatchPageSummary,true);
assert.strictEqual(round1673Goal3Market2352.countConsistency.allSixPercentageVectorsSumTo100,true);
console.log('OK - round 1673 stale official GOAL3 market snapshot (23:52 JST)');

// Round 1673 official totoGOAL3 market snapshot at 02:15 JST (stale at retrieval).
const round1673Goal3Market0215=JSON.parse(fs.readFileSync(path.join(__dirname,'..','reports/round_1673_goal3_official_market_snapshot_20261116T0215JST.json'),'utf8'));
assert.strictEqual(round1673Goal3Market0215.round,1673);
assert.strictEqual(round1673Goal3Market0215.marketType,'totoGOAL3');
assert.strictEqual(round1673Goal3Market0215.pageDisplayAt,'2026-11-16T02:15:00+09:00');
assert.strictEqual(round1673Goal3Market0215.retrievedAt,'2026-11-16T02:50:55+09:00');
assert.strictEqual(round1673Goal3Market0215.displayAgeSeconds,2155);
assert.strictEqual(round1673Goal3Market0215.stale,true);
assert.strictEqual(round1673Goal3Market0215.totalVotesPageSummary,13745);
assert.deepStrictEqual(round1673Goal3Market0215.categoryOrder,['0','1','2','3+']);
assert.strictEqual(round1673Goal3Market0215.matches.length,6);
assert.deepStrictEqual(round1673Goal3Market0215.matches.map(x=>x.toto13MatchNumber),[1,1,2,2,5,5]);
assert.deepStrictEqual(round1673Goal3Market0215.matches.map(x=>x.voteCounts),[
 [1878,2758,4436,4673],
 [5685,4458,2073,1529],
 [2098,3309,4516,3822],
 [3254,4508,3612,2371],
 [2925,4618,3883,2319],
 [3358,4951,3468,1968]
]);
for(const row of round1673Goal3Market0215.matches){
 assert.strictEqual(row.sumVotes,row.voteCounts.reduce((a,b)=>a+b,0));
 assert.strictEqual(row.sumVotes,13745);
 assert.ok(Math.abs(row.percentages.reduce((a,b)=>a+b,0)-100)<1e-8);
}
assert.strictEqual(round1673Goal3Market0215.countConsistency.allSixTeamSideTotalsMatchPageSummary,true);
assert.strictEqual(round1673Goal3Market0215.countConsistency.allSixPercentageVectorsSumTo100,true);
console.log('OK - round 1673 stale official GOAL3 market snapshot (02:15 JST)');



// Round 1673 official totoGOAL3 market snapshot at 05:23 JST (fresh at retrieval).
const round1673Goal3Market0523=JSON.parse(fs.readFileSync(path.join(__dirname,'..','reports/round_1673_goal3_official_market_snapshot_20261116T0523JST.json'),'utf8'));
assert.strictEqual(round1673Goal3Market0523.round,1673);
assert.strictEqual(round1673Goal3Market0523.marketType,'totoGOAL3');
assert.strictEqual(round1673Goal3Market0523.pageDisplayAt,'2026-11-16T05:23:00+09:00');
assert.strictEqual(round1673Goal3Market0523.retrievedAt,'2026-11-16T05:24:01+09:00');
assert.strictEqual(round1673Goal3Market0523.displayAgeSeconds,61);
assert.strictEqual(round1673Goal3Market0523.stale,false);
assert.strictEqual(round1673Goal3Market0523.totalVotesPageSummary,14073);
assert.deepStrictEqual(round1673Goal3Market0523.categoryOrder,['0','1','2','3+']);
assert.strictEqual(round1673Goal3Market0523.matches.length,6);
assert.deepStrictEqual(round1673Goal3Market0523.matches.map(x=>x.toto13MatchNumber),[1,1,2,2,5,5]);
assert.deepStrictEqual(round1673Goal3Market0523.matches.map(x=>x.voteCounts),[
 [1898,2808,4548,4819],
 [5887,4558,2081,1547],
 [2155,3345,4636,3937],
 [3336,4598,3692,2447],
 [2991,4766,3958,2358],
 [3413,5085,3581,1994]
]);
for(const row of round1673Goal3Market0523.matches){
 assert.strictEqual(row.sumVotes,row.voteCounts.reduce((a,b)=>a+b,0));
 assert.strictEqual(row.sumVotes,14073);
 assert.ok(Math.abs(row.percentages.reduce((a,b)=>a+b,0)-100)<1e-8);
}
assert.strictEqual(round1673Goal3Market0523.countConsistency.allSixTeamSideTotalsMatchPageSummary,true);
assert.strictEqual(round1673Goal3Market0523.countConsistency.allSixPercentageVectorsSumTo100,true);
console.log('OK - round 1673 fresh official GOAL3 market snapshot (05:23 JST)');
