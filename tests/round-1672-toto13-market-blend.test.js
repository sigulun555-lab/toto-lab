'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const readJsonl=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8').trim().split(/\r?\n/).filter(Boolean).map(JSON.parse);
const v1=readJsonl('predictions/round_1672_ChatGPT_shared_score_v1.jsonl');
const v2=readJsonl('predictions/round_1672_ChatGPT_shared_score_v2.jsonl');
const marketInitial=JSON.parse(fs.readFileSync(path.join(__dirname,'..','reports/round_1672_toto13_official_market_snapshot_20261112T0215JST.json'),'utf8'));
const marketRevision=JSON.parse(fs.readFileSync(path.join(__dirname,'..','reports/round_1672_toto13_official_market_snapshot_20261112T0313JST.json'),'utf8'));
const teams=JSON.parse(fs.readFileSync(path.join(__dirname,'..','data/teams.json'),'utf8')).clubs.map(x=>x.canonical);
const initialV2=v2.filter(x=>x.revisionOf===null);
const revisedV2=v2.filter(x=>x.revisionOf!==null);
const checkBlend=(row,base,market)=>{assert.deepEqual(row.baseModelOutcomeProbabilities,base.outcomeProbabilities);assert.deepEqual(row.marketVoteShare,market.marketVoteShare);assert.deepEqual(row.blendWeights,{poissonModel:0.3,totoVoteShare:0.7});for(const k of ['0','1','2'])assert.ok(Math.abs(row.outcomeProbabilities[k]-(0.3*base.outcomeProbabilities[k]+0.7*market.marketVoteShare[k]))<2e-8);};
test('round 1672 keeps 13 original V1/V2 rows and appends exactly one 13-row V2 revision',()=>{
 assert.equal(v1.length,13);assert.equal(initialV2.length,13);assert.equal(revisedV2.length,13);assert.equal(v2.length,26);
 assert.equal(new Set(v1.map(x=>x.predictionId)).size,13);assert.equal(new Set(v2.map(x=>x.predictionId)).size,26);
 assert.ok(v1.every(x=>x.revisionOf===null&&x.historyMatchesPerTeam===12));
 assert.ok(initialV2.every(x=>x.revisionOf===null&&x.historyMatchesPerTeam===12));
 for(let i=0;i<13;i++){assert.equal(v1[i].matchNumber,i+1);assert.equal(initialV2[i].matchNumber,i+1);assert.equal(revisedV2[i].matchNumber,i+1);assert.equal(revisedV2[i].revisionOf,initialV2[i].predictionId);}
});
test('V1, initial V2 and revised V2 probability distributions and goal buckets are normalized',()=>{
 for(const row of [...v1,...v2]){assert.ok(Math.abs(Object.values(row.outcomeProbabilities).reduce((a,b)=>a+b,0)-1)<2e-8);assert.ok(Math.abs(row.homeGoalProbabilities.reduce((a,b)=>a+b,0)-1)<2e-8);assert.ok(Math.abs(row.awayGoalProbabilities.reduce((a,b)=>a+b,0)-1)<2e-8);}
});
test('initial V2 remains the documented 30/70 blend using the original official snapshot',()=>{
 assert.equal(marketInitial.rows.length,13);
 for(let i=0;i<13;i++){const b=initialV2[i],m=marketInitial.rows[i];assert.equal(m.matchNumber,i+1);checkBlend(b,v1[i],m);assert.equal(m.totalVotes,248284);assert.equal(m.voteCounts.home+m.voteCounts.draw+m.voteCounts.away,248284);assert.ok(Math.abs(m.displayedVoteSharePercent.home+m.displayedVoteSharePercent.draw+m.displayedVoteSharePercent.away-100)<1e-9);}
});
test('V2 revision uses the directly retrieved 03:13 JST official snapshot and links to its prior row',()=>{
 assert.equal(marketRevision.rows.length,13);assert.equal(marketRevision.officialDisplayAt,'2026-11-12T03:13:00+09:00');assert.equal(marketRevision.retrievedAt,'2026-11-12T04:12:20+09:00');
 for(let i=0;i<13;i++){const b=revisedV2[i],m=marketRevision.rows[i];assert.equal(m.matchNumber,i+1);checkBlend(b,v1[i],m);assert.equal(m.totalVotes,250174);assert.equal(m.voteCounts.home+m.voteCounts.draw+m.voteCounts.away,250174);assert.ok(Math.abs(m.displayedVoteSharePercent.home+m.displayedVoteSharePercent.draw+m.displayedVoteSharePercent.away-100)<1e-9);assert.equal(b.marketOfficialDisplayAt,marketRevision.officialDisplayAt);assert.equal(b.marketRetrievedAt,marketRevision.retrievedAt);}
});
test('all snapshots have actual, shared, pre-deadline generation times',()=>{
 const v1Times=new Set(v1.map(x=>x.predictionConfirmedAt));const initialTimes=new Set(initialV2.map(x=>x.predictionConfirmedAt));const revisionTimes=new Set(revisedV2.map(x=>x.predictionConfirmedAt));
 assert.equal(v1Times.size,1);assert.equal(initialTimes.size,1);assert.equal(revisionTimes.size,1);
 assert.equal([...revisionTimes][0],'2026-11-11T19:12:20.000Z');
 for(const row of [...v1,...v2])assert.ok(Date.parse(row.predictionConfirmedAt)<Date.parse(row.deadlineAt));
});
test('all stored team names use toto-lab canonical club labels and revision lineage is closed',()=>{
 const ids=new Set(v2.map(x=>x.predictionId));
 for(const row of [...v1,...v2]){assert.ok(teams.includes(row.homeTeam),row.homeTeam);assert.ok(teams.includes(row.awayTeam),row.awayTeam);}
 for(const row of revisedV2)assert.ok(ids.has(row.revisionOf),row.revisionOf);
});
