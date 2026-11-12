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
const marketRevision3=JSON.parse(fs.readFileSync(path.join(__dirname,'..','reports/round_1672_toto13_official_market_snapshot_20261112T0509JST.json'),'utf8'));
const marketRevision4=JSON.parse(fs.readFileSync(path.join(__dirname,'..','reports/round_1672_toto13_official_market_snapshot_20261112T1504JST.json'),'utf8'));
const teams=JSON.parse(fs.readFileSync(path.join(__dirname,'..','data/teams.json'),'utf8')).clubs.map(x=>x.canonical);
const initialV2=v2.filter(x=>x.revisionOf===null);
const revisionsByMatch=Array.from({length:13},(_,i)=>v2.filter(x=>x.matchNumber===i+1&&x.revisionOf!==null).sort((a,b)=>Date.parse(a.predictionConfirmedAt)-Date.parse(b.predictionConfirmedAt)));
const checkBlend=(row,base,market)=>{assert.deepEqual(row.baseModelOutcomeProbabilities,base.outcomeProbabilities);assert.deepEqual(row.marketVoteShare,market.marketVoteShare);assert.deepEqual(row.blendWeights,{poissonModel:0.3,totoVoteShare:0.7});for(const k of ['0','1','2'])assert.ok(Math.abs(row.outcomeProbabilities[k]-(0.3*base.outcomeProbabilities[k]+0.7*market.marketVoteShare[k]))<2e-8);};
const checkMarketSnapshot=(market,display,retrieved,votes)=>{assert.equal(market.rows.length,13);assert.equal(market.officialDisplayAt,display);assert.equal(market.retrievedAt,retrieved);assert.equal(market.overallVotes,votes);for(let i=0;i<13;i++){const m=market.rows[i];assert.equal(m.matchNumber,i+1);assert.equal(m.totalVotes,votes);assert.equal(m.voteCounts.home+m.voteCounts.draw+m.voteCounts.away,votes);assert.ok(Math.abs(m.displayedVoteSharePercent.home+m.displayedVoteSharePercent.draw+m.displayedVoteSharePercent.away-100)<1e-8);}};
test('round 1672 preserves V1 and initial V2 and appends four complete 13-row V2 revisions',()=>{assert.equal(v1.length,13);assert.equal(initialV2.length,13);assert.equal(v2.length,65);assert.equal(new Set(v2.map(x=>x.predictionId)).size,65);for(let i=0;i<13;i++){const chain=v2.filter(x=>x.matchNumber===i+1).sort((a,b)=>Date.parse(a.predictionConfirmedAt)-Date.parse(b.predictionConfirmedAt));assert.equal(chain.length,5);assert.equal(chain[0].revisionOf,null);for(let j=1;j<5;j++)assert.equal(chain[j].revisionOf,chain[j-1].predictionId);}});
test('all V1/V2 outcome and goal bucket distributions are normalized',()=>{for(const row of [...v1,...v2]){assert.ok(Math.abs(Object.values(row.outcomeProbabilities).reduce((a,b)=>a+b,0)-1)<2e-8);assert.ok(Math.abs(row.homeGoalProbabilities.reduce((a,b)=>a+b,0)-1)<2e-8);assert.ok(Math.abs(row.awayGoalProbabilities.reduce((a,b)=>a+b,0)-1)<2e-8);}});
test('initial V2 remains the 02:15 JST official 30/70 snapshot',()=>{checkMarketSnapshot(marketInitial,'2026-11-12T02:15:00+09:00','2026-11-12T02:54:30+09:00',248284);for(let i=0;i<13;i++)checkBlend(initialV2[i],v1[i],marketInitial.rows[i]);});
test('first revision remains the 03:13 JST official snapshot',()=>{checkMarketSnapshot(marketRevision1,'2026-11-12T03:13:00+09:00','2026-11-12T04:12:20+09:00',250174);for(let i=0;i<13;i++){const row=revisionsByMatch[i][0];assert.equal(row.marketOfficialDisplayAt,marketRevision1.officialDisplayAt);assert.equal(row.marketRetrievedAt,marketRevision1.retrievedAt);checkBlend(row,v1[i],marketRevision1.rows[i]);}});
test('second revision remains the 04:14 JST official snapshot',()=>{checkMarketSnapshot(marketRevision2,'2026-11-12T04:14:00+09:00','2026-11-12T05:09:37+09:00',250586);for(let i=0;i<13;i++){const row=revisionsByMatch[i][1];assert.equal(row.revisionOf,revisionsByMatch[i][0].predictionId);assert.equal(row.marketOfficialDisplayAt,marketRevision2.officialDisplayAt);checkBlend(row,v1[i],marketRevision2.rows[i]);}});
test('third revision uses the 05:09 JST official snapshot and links to the 04:14 revision',()=>{checkMarketSnapshot(marketRevision3,'2026-11-12T05:09:00+09:00','2026-11-12T05:15:58+09:00',251157);for(let i=0;i<13;i++){const row=revisionsByMatch[i][2];assert.equal(row.revisionOf,revisionsByMatch[i][1].predictionId);assert.equal(row.marketOfficialDisplayAt,marketRevision3.officialDisplayAt);assert.equal(row.marketRetrievedAt,marketRevision3.retrievedAt);assert.equal(row.predictionConfirmedAt,'2026-11-11T20:17:01.000Z');checkBlend(row,v1[i],marketRevision3.rows[i]);}});
test('all snapshots were generated before the published deadline',()=>{const times=[...new Set(v2.map(x=>x.predictionConfirmedAt))];assert.equal(times.length,5);for(const row of [...v1,...v2])assert.ok(Date.parse(row.predictionConfirmedAt)<Date.parse(row.deadlineAt));});
test('canonical team labels and all revision links remain closed',()=>{const ids=new Set(v2.map(x=>x.predictionId));for(const row of [...v1,...v2]){assert.ok(teams.includes(row.homeTeam),row.homeTeam);assert.ok(teams.includes(row.awayTeam),row.awayTeam);}for(const row of v2.filter(x=>x.revisionOf!==null))assert.ok(ids.has(row.revisionOf),row.revisionOf);});

test('fourth V2 revision uses the directly retrieved 15:04 JST official toto snapshot and preserves per-match vote totals',()=>{
 const totals=[348003,348003,348003,348003,348003,348003,348004,348009,348011,348011,348011,348015,348017];
 assert.equal(marketRevision4.rows.length,13);
 assert.equal(marketRevision4.officialDisplayAt,'2026-11-12T15:04:00+09:00');
 assert.equal(marketRevision4.retrievedAt,'2026-11-12T15:08:12+09:00');
 assert.deepEqual(marketRevision4.rows.map(x=>x.totalVotes),totals);
 for(let i=0;i<13;i++){
  const m=marketRevision4.rows[i];
  assert.equal(m.matchNumber,i+1);
  assert.equal(m.totalVotes,m.voteCounts.home+m.voteCounts.draw+m.voteCounts.away);
  assert.ok(Math.abs(m.displayedVoteSharePercent.home+m.displayedVoteSharePercent.draw+m.displayedVoteSharePercent.away-100)<1e-8);
  assert.deepEqual(m.marketVoteShare,{'0':Number((m.displayedVoteSharePercent.draw/100).toFixed(4)),'1':Number((m.displayedVoteSharePercent.home/100).toFixed(4)),'2':Number((m.displayedVoteSharePercent.away/100).toFixed(4))});
  const row=revisionsByMatch[i][3];
  assert.equal(row.revisionOf,revisionsByMatch[i][2].predictionId);
  assert.equal(row.predictionConfirmedAt,'2026-11-12T06:09:36.000Z');
  assert.equal(row.marketOfficialDisplayAt,marketRevision4.officialDisplayAt);
  assert.equal(row.marketRetrievedAt,marketRevision4.retrievedAt);
  checkBlend(row,v1[i],m);
 }
});
