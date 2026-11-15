

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
