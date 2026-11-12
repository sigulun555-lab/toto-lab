// Revision lineage is append-only: each new official market snapshot points to the immediately preceding V2 row for that match.
'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const readJsonl=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8').trim().split(/\r?\n/).filter(Boolean).map(JSON.parse);
const v1=readJsonl('predictions/round_1672_ChatGPT_shared_score_v1.jsonl');
const v2=readJsonl('predictions/round_1672_ChatGPT_shared_score_v2.jsonl');
const marketInitial=JSON.parse(fs.readFileSync(path.join(__dirname,'..','reports/round_1672_toto13_official_market_snapshot_20261112T0215JST.json'),'utf8'));
const marketRevision1=JSON.parse(fs.readFileSync(path.join(__dirname,'..','reports/round_1672_toto13_official_market_snapshot_20261112T0313JST.json'),'utf8'));
const marketRevision2=JSON.parse(fs.readFileSync(path.join(__dirname,'..','reports/round_1672_toto13_official_market_snapshot_20261112T0414JST.json'),'utf8'));
const teams=JSON.parse(fs.readFileSync(path.join(__dirname,'..','data/teams.json'),'utf8')).clubs.map(x=>x.canonical);
const initialV2=v2.filter(x=>x.revisionOf===null);
const revisionsByMatch=Array.from({length:13},(_,i)=>v2.filter(x=>x.matchNumber===i+1&&x.revisionOf!==null).sort((a,b)=>Date.parse(a.predictionConfirmedAt)-Date.parse(b.predictionConfirmedAt)));
const checkBlend=(row,base,market)=>{assert.deepEqual(row.baseModelOutcomeProbabilities,base.outcomeProbabilities);assert.deepEqual(row.marketVoteShare,market.marketVoteShare);assert.deepEqual(row.blendWeights,{poissonModel:0.3,totoVoteShare:0.7});for(const k of ['0','1','2'])assert.ok(Math.abs(row.outcomeProbabilities[k]-(0.3*base.outcomeProbabilities[k]+0.7*market.marketVoteShare[k]))<2e-8);};
const checkMarketSnapshot=(market,expectedDisplay,expectedRetrieved,expectedVotes)=>{
 assert.equal(market.rows.length,13);assert.equal(market.officialDisplayAt,expectedDisplay);assert.equal(market.retrievedAt,expectedRetrieved);assert.equal(market.overallVotes,expectedVotes);
 for(let i=0;i<13;i++){const m=market.rows[i];assert.equal(m.matchNumber,i+1);assert.equal(m.totalVotes,expectedVotes);assert.equal(m.voteCounts.home+m.voteCounts.draw+m.voteCounts.away,expectedVotes);assert.ok(Math.abs(m.displayedVoteSharePercent.home+m.displayedVoteSharePercent.draw+m.displayedVoteSharePercent.away-100)<1e-8);}
};
test('round 1672 preserves original V1/V2 and appends two complete 13-row V2 revisions',()=>{
 assert.equal(v1.length,13);assert.equal(initialV2.length,13);assert.equal(v2.length,39);assert.equal(new Set(v1.map(x=>x.predictionId)).size,13);assert.equal(new Set(v2.map(x=>x.predictionId)).size,39);
 for(let i=0;i<13;i++){assert.equal(v1[i].matchNumber,i+1);assert.equal(initialV2[i].matchNumber,i+1);const chain=v2.filter(x=>x.matchNumber===i+1).sort((a,b)=>Date.parse(a.predictionConfirmedAt)-Date.parse(b.predictionConfirmedAt));assert.equal(chain.length,3);assert.equal(chain[0].predictionId,initialV2[i].predictionId);assert.equal(chain[0].revisionOf,null);assert.equal(chain[1].revisionOf,chain[0].predictionId);assert.equal(chain[2].revisionOf,chain[1].predictionId);}
});
test('V1, initial V2 and all revisions have normalized outcome and goal-bucket distributions',()=>{
 for(const row of [...v1,...v2]){assert.ok(Math.abs(Object.values(row.outcomeProbabilities).reduce((a,b)=>a+b,0)-1)<2e-8);assert.ok(Math.abs(row.homeGoalProbabilities.reduce((a,b)=>a+b,0)-1)<2e-8);assert.ok(Math.abs(row.awayGoalProbabilities.reduce((a,b)=>a+b,0)-1)<2e-8);}
});
test('initial V2 remains the documented 30/70 blend using the original 02:15 JST official snapshot',()=>{
 checkMarketSnapshot(marketInitial,'2026-11-12T02:15:00+09:00','2026-11-12T02:54:30+09:00',248284);
 for(let i=0;i<13;i++)checkBlend(initialV2[i],v1[i],marketInitial.rows[i]);
});
test('first V2 revision uses the directly retrieved 03:13 JST official snapshot',()=>{
 checkMarketSnapshot(marketRevision1,'2026-11-12T03:13:00+09:00','2026-11-12T04:12:20+09:00',250174);
 for(let i=0;i<13;i++){const row=revisionsByMatch[i][0];assert.equal(row.marketOfficialDisplayAt,marketRevision1.officialDisplayAt);assert.equal(row.marketRetrievedAt,marketRevision1.retrievedAt);checkBlend(row,v1[i],marketRevision1.rows[i]);}
});
test('second V2 revision uses the directly retrieved 04:14 JST official snapshot and links to the immediately prior revision',()=>{
 checkMarketSnapshot(marketRevision2,'2026-11-12T04:14:00+09:00','2026-11-12T05:09:37+09:00',250586);
 for(let i=0;i<13;i++){const row=revisionsByMatch[i][1];assert.equal(row.revisionOf,revisionsByMatch[i][0].predictionId);assert.equal(row.marketOfficialDisplayAt,marketRevision2.officialDisplayAt);assert.equal(row.marketRetrievedAt,marketRevision2.retrievedAt);assert.equal(row.predictionConfirmedAt,'2026-11-11T20:13:32.000Z');checkBlend(row,v1[i],marketRevision2.rows[i]);}
});
test('all stored snapshots have shared actual pre-deadline generation times',()=>{
 const v1Times=new Set(v1.map(x=>x.predictionConfirmedAt));const initialTimes=new Set(initialV2.map(x=>x.predictionConfirmedAt));const revisionTimes=[...new Set(v2.filter(x=>x.revisionOf!==null).map(x=>x.predictionConfirmedAt))].sort();
 assert.equal(v1Times.size,1);assert.equal(initialTimes.size,1);assert.deepEqual(revisionTimes,['2026-11-11T19:12:20.000Z','2026-11-11T20:13:32.000Z']);
 for(const row of [...v1,...v2])assert.ok(Date.parse(row.predictionConfirmedAt)<Date.parse(row.deadlineAt));
});
test('all snapshots use canonical team labels and have a closed per-match revision chain',()=>{
 const ids=new Set(v2.map(x=>x.predictionId));for(const row of [...v1,...v2]){assert.ok(teams.includes(row.homeTeam),row.homeTeam);assert.ok(teams.includes(row.awayTeam),row.awayTeam);}
 for(const row of v2.filter(x=>x.revisionOf!==null))assert.ok(ids.has(row.revisionOf),row.revisionOf);
});
