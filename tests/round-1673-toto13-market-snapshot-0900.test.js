'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const market = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'reports/round_1673_toto13_official_market_snapshot_20261118T0900JST.json'), 'utf8'));

test('09:00 official toto13 snapshot is archived as stale percentage-only history', () => {
  assert.equal(market.round, 1673);
  assert.equal(market.product, 'toto13');
  assert.equal(market.marketType, 'toto13');
  assert.equal(market.pageDisplayAt, '2026-11-18T09:00:00+09:00');
  assert.equal(market.retrievedAt, '2026-11-18T09:39:38+09:00');
  assert.equal(market.displayAgeSeconds, 2378);
  assert.equal(market.stale, true);
  assert.equal(market.totalVotesPageSummary, 185593);
  assert.equal(market.matches.length, 13);
  assert.equal(market.countConsistency.perMatchVoteCountsAvailable, false);
  assert.equal(market.countConsistency.allDisplayedPercentageTriplesSumTo100, true);
  assert.deepEqual(market.countConsistency.mismatchedMatchNumbers, []);
  assert.equal(market.v2Eligibility.eligible, false);
  assert.deepEqual(market.matches.map(x => x.matchNumber), Array.from({length:13}, (_,i)=>i+1));
  for (const match of market.matches) {
    assert.ok(Math.abs(match.percentages.reduce((a,b)=>a+b,0)-100) < 1e-8);
    assert.equal(match.marketVoteShare['1'], match.percentages[0] / 100);
    assert.equal(match.marketVoteShare['0'], match.percentages[1] / 100);
    assert.equal(match.marketVoteShare['2'], match.percentages[2] / 100);
    assert.equal(Object.hasOwn(match, 'voteCounts'), false);
  }
  assert.deepEqual(market.matches[0].percentages, [81.24,10.89,7.87]);
  assert.deepEqual(market.matches[12].percentages, [24.10,21.45,54.45]);
});


const market0958=JSON.parse(fs.readFileSync(path.join(__dirname,'..','reports/round_1673_toto13_official_market_snapshot_20261118T0958JST.json'),'utf8'));
test('09:58 official toto13 snapshot is fresh percentage/count history with preserved page-total mismatches; no V2 generator used',()=>{
 assert.equal(market0958.round,1673);assert.equal(market0958.product,'toto13');assert.equal(market0958.marketType,'toto13');
 assert.equal(market0958.pageDisplayAt,'2026-11-18T09:58:00+09:00');assert.equal(market0958.retrievedAt,'2026-11-18T10:00:51+09:00');
 assert.equal(market0958.displayAgeSeconds,171);assert.equal(market0958.stale,false);assert.equal(market0958.totalVotesPageSummary,187328);
 assert.equal(market0958.matches.length,13);assert.deepEqual(market0958.matches.map(x=>x.matchNumber),Array.from({length:13},(_,i)=>i+1));
 assert.deepEqual(market0958.countConsistency.mismatchedMatchNumbers,[1,2,3,4,5,6,7,8,9,10,11,12,13]);
 assert.deepEqual(market0958.countConsistency.perMatchVoteTotalRange,{min:187307,max:187316,spread:9});
 assert.equal(market0958.countConsistency.allPerMatchTotalsMatchPageSummary,false);
 assert.equal(market0958.countConsistency.allDisplayedPercentageTriplesSumTo100,true);
 assert.equal(market0958.v2Eligibility.eligible,false);
 assert.match(market0958.v2Eligibility.reason,/実行可能なproduct-specific generator/);
 for(const m of market0958.matches){
  assert.equal(m.sumVotes,m.voteCounts.reduce((a,b)=>a+b,0));
  assert.equal(m.differenceFromSummaryVotes,m.sumVotes-187328);
  assert.ok(Math.abs(m.percentages.reduce((a,b)=>a+b,0)-100)<1e-8);
  assert.equal(m.marketVoteShare['1'],m.percentages[0]/100);
  assert.equal(m.marketVoteShare['0'],m.percentages[1]/100);
  assert.equal(m.marketVoteShare['2'],m.percentages[2]/100);
 }
 const v2=fs.readFileSync(path.join(__dirname,'..','predictions/round_1673_ChatGPT_shared_score_v2.jsonl'),'utf8').trim().split(/\r?\n/).filter(Boolean);
 assert.equal(v2.map(JSON.parse).filter(row => Date.parse(row.predictionConfirmedAt) < Date.parse('2026-11-18T00:00:00+09:00')).length,39,'snapshot-only append must not create a V2 revision');
});
