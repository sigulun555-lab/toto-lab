'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const market=JSON.parse(fs.readFileSync(path.join(__dirname,'..','reports/round_1673_toto13_official_market_snapshot_20261117T2120JST.json'),'utf8'));

test('21:20 official toto13 snapshot is fresh, complete and reconciled; V2 remains unchanged',()=>{
  assert.equal(market.schemaVersion,1);
  assert.equal(market.round,1673);
  assert.equal(market.marketType,'toto13');
  assert.equal(market.pageDisplayAt,'2026-11-17T21:20:00+09:00');
  assert.equal(market.retrievedAt,'2026-11-17T21:23:25+09:00');
  assert.equal(market.displayAgeSeconds,205);
  assert.equal(market.stale,false);
  assert.equal(market.totalVotesPageSummary,171327);
  assert.deepEqual(market.outcomeOrder,['1','0','2']);
  assert.equal(market.matches.length,13);
  assert.deepEqual(market.matches.map(m=>m.matchNumber),Array.from({length:13},(_,i)=>i+1));
  assert.equal(market.countConsistency.allThirteenMatchTotalsMatchPageSummary,true);
  assert.equal(market.countConsistency.allDisplayedPercentageTriplesSumTo100,true);
  assert.deepEqual(market.countConsistency.mismatchedMatchNumbers,[]);
  assert.equal(market.countConsistency.perMatchVoteTotalRange.spread,0);
  for(const m of market.matches){
    assert.equal(m.sumVotes,171327);
    assert.equal(m.differenceFromSummaryVotes,0);
    assert.ok(Math.abs(m.percentages.reduce((a,b)=>a+b,0)-100)<1e-8);
    assert.equal(m.marketVoteShare['1'],m.percentages[0]/100);
    assert.equal(m.marketVoteShare['0'],m.percentages[1]/100);
    assert.equal(m.marketVoteShare['2'],m.percentages[2]/100);
  }
  assert.equal(market.v2Eligibility.eligible,false);
  assert.match(market.v2Eligibility.reason,/実行可能なV2生成関数/);
});
