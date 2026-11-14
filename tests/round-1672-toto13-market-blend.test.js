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
const marketRevision5=JSON.parse(fs.readFileSync(path.join(__dirname,'..','reports/round_1672_toto13_official_market_snapshot_20261113T1528JST.json'),'utf8'));
const marketRevision6=JSON.parse(fs.readFileSync(path.join(__dirname,'..','reports/round_1672_toto13_official_market_snapshot_20261113T2222JST.json'),'utf8'));
const marketRevision7=JSON.parse(fs.readFileSync(path.join(__dirname,'..','reports/round_1672_toto13_official_market_snapshot_20261114T1050JST.json'),'utf8'));
const marketRevision8=JSON.parse(fs.readFileSync(path.join(__dirname,'..','reports/round_1672_toto13_market_transcription_20261114T1224JST.json'),'utf8'));
const teams=JSON.parse(fs.readFileSync(path.join(__dirname,'..','data/teams.json'),'utf8')).clubs.map(x=>x.canonical);
const initialV2=v2.filter(x=>x.revisionOf===null);
const revisionsByMatch=Array.from({length:13},(_,i)=>v2.filter(x=>x.matchNumber===i+1&&x.revisionOf!==null).sort((a,b)=>Date.parse(a.predictionConfirmedAt)-Date.parse(b.predictionConfirmedAt)));
const checkBlend=(row,base,market)=>{assert.deepEqual(row.baseModelOutcomeProbabilities,base.outcomeProbabilities);assert.deepEqual(row.marketVoteShare,market.marketVoteShare);assert.deepEqual(row.blendWeights,{poissonModel:0.3,totoVoteShare:0.7});for(const k of ['0','1','2'])assert.ok(Math.abs(row.outcomeProbabilities[k]-(0.3*base.outcomeProbabilities[k]+0.7*market.marketVoteShare[k]))<2e-8);};
const checkMarketSnapshot=(market,display,retrieved,votes)=>{assert.equal(market.rows.length,13);assert.equal(market.officialDisplayAt,display);assert.equal(market.retrievedAt,retrieved);assert.equal(market.overallVotes,votes);for(let i=0;i<13;i++){const m=market.rows[i];assert.equal(m.matchNumber,i+1);assert.equal(m.totalVotes,votes);assert.equal(m.voteCounts.home+m.voteCounts.draw+m.voteCounts.away,votes);assert.ok(Math.abs(m.displayedVoteSharePercent.home+m.displayedVoteSharePercent.draw+m.displayedVoteSharePercent.away-100)<1e-8);}};
test('round 1672 preserves V1 and initial V2 and appends eight complete 13-row V2 revisions',()=>{assert.equal(v1.length,13);assert.equal(initialV2.length,13);assert.equal(v2.length,117);assert.equal(new Set(v2.map(x=>x.predictionId)).size,117);for(let i=0;i<13;i++){const chain=v2.filter(x=>x.matchNumber===i+1).sort((a,b)=>Date.parse(a.predictionConfirmedAt)-Date.parse(b.predictionConfirmedAt));assert.equal(chain.length,9);assert.equal(chain[0].revisionOf,null);for(let j=1;j<9;j++)assert.equal(chain[j].revisionOf,chain[j-1].predictionId);}});
test('all V1/V2 outcome and goal bucket distributions are normalized',()=>{for(const row of [...v1,...v2]){assert.ok(Math.abs(Object.values(row.outcomeProbabilities).reduce((a,b)=>a+b,0)-1)<2e-8);assert.ok(Math.abs(row.homeGoalProbabilities.reduce((a,b)=>a+b,0)-1)<2e-8);assert.ok(Math.abs(row.awayGoalProbabilities.reduce((a,b)=>a+b,0)-1)<2e-8);}});
test('initial V2 remains the 02:15 JST official 30/70 snapshot',()=>{checkMarketSnapshot(marketInitial,'2026-11-12T02:15:00+09:00','2026-11-12T02:54:30+09:00',248284);for(let i=0;i<13;i++)checkBlend(initialV2[i],v1[i],marketInitial.rows[i]);});
test('first revision remains the 03:13 JST official snapshot',()=>{checkMarketSnapshot(marketRevision1,'2026-11-12T03:13:00+09:00','2026-11-12T04:12:20+09:00',250174);for(let i=0;i<13;i++){const row=revisionsByMatch[i][0];assert.equal(row.marketOfficialDisplayAt,marketRevision1.officialDisplayAt);assert.equal(row.marketRetrievedAt,marketRevision1.retrievedAt);checkBlend(row,v1[i],marketRevision1.rows[i]);}});
test('second revision remains the 04:14 JST official snapshot',()=>{checkMarketSnapshot(marketRevision2,'2026-11-12T04:14:00+09:00','2026-11-12T05:09:37+09:00',250586);for(let i=0;i<13;i++){const row=revisionsByMatch[i][1];assert.equal(row.revisionOf,revisionsByMatch[i][0].predictionId);assert.equal(row.marketOfficialDisplayAt,marketRevision2.officialDisplayAt);checkBlend(row,v1[i],marketRevision2.rows[i]);}});
test('third revision uses the 05:09 JST official snapshot and links to the 04:14 revision',()=>{checkMarketSnapshot(marketRevision3,'2026-11-12T05:09:00+09:00','2026-11-12T05:15:58+09:00',251157);for(let i=0;i<13;i++){const row=revisionsByMatch[i][2];assert.equal(row.revisionOf,revisionsByMatch[i][1].predictionId);assert.equal(row.marketOfficialDisplayAt,marketRevision3.officialDisplayAt);assert.equal(row.marketRetrievedAt,marketRevision3.retrievedAt);assert.equal(row.predictionConfirmedAt,'2026-11-11T20:17:01.000Z');checkBlend(row,v1[i],marketRevision3.rows[i]);}});

test('sixth V2 revision uses the directly retrieved 22:22 JST official toto snapshot and preserves per-match vote totals',()=>{
 const totals=Array(13).fill(712700);
 assert.equal(marketRevision6.rows.length,13);
 assert.equal(marketRevision6.officialDisplayAt,'2026-11-13T22:22:00+09:00');
 assert.equal(marketRevision6.retrievedAt,'2026-11-13T22:23:22+09:00');
 assert.deepEqual(marketRevision6.rows.map(x=>x.totalVotes),totals);
 for(let i=0;i<13;i++){
  const m=marketRevision6.rows[i];
  assert.equal(m.matchNumber,i+1);
  assert.equal(m.totalVotes,m.voteCounts.home+m.voteCounts.draw+m.voteCounts.away);
  assert.ok(Math.abs(m.displayedVoteSharePercent.home+m.displayedVoteSharePercent.draw+m.displayedVoteSharePercent.away-100)<1e-8);
  assert.deepEqual(m.marketVoteShare,{'0':Number((m.displayedVoteSharePercent.draw/100).toFixed(4)),'1':Number((m.displayedVoteSharePercent.home/100).toFixed(4)),'2':Number((m.displayedVoteSharePercent.away/100).toFixed(4))});
  const row=revisionsByMatch[i][5];
  assert.equal(row.revisionOf,revisionsByMatch[i][4].predictionId);
  assert.equal(row.predictionConfirmedAt,'2026-11-13T13:23:22.000Z');
  assert.equal(row.marketOfficialDisplayAt,marketRevision6.officialDisplayAt);
  assert.equal(row.marketRetrievedAt,marketRevision6.retrievedAt);
  assert.equal(row.modelVersion,'GPT-shared-poisson-score-v2-market-blend-30-70-2026-11-14');
  checkBlend(row,v1[i],m);
 }
});


test('seventh V2 revision uses the fresh 10:50 JST official toto13 snapshot and preserves raw counts',()=>{
 assert.equal(marketRevision7.round,1672);
 assert.equal(marketRevision7.marketType,'toto13');
 assert.equal(marketRevision7.pageDisplayAt,'2026-11-14T10:50:00+09:00');
 assert.equal(marketRevision7.retrievedAt,'2026-11-14T10:50:31+09:00');
 assert.equal(marketRevision7.displayAgeSeconds,31);
 assert.equal(marketRevision7.stale,false);
 assert.equal(marketRevision7.totalVotesPageSummary,1085879);
 assert.equal(marketRevision7.matches.length,13);
 for(let i=0;i<13;i++){
  const m=marketRevision7.matches[i];
  assert.equal(m.matchNumber,i+1);
  assert.equal(m.sumVotes,m.voteCounts.reduce((a,b)=>a+b,0));
  assert.equal(m.sumPercent,100);
  const expected={'0':m.percentages[1]/100,'1':m.percentages[0]/100,'2':m.percentages[2]/100};
  const row=revisionsByMatch[i][6];
  assert.equal(row.revisionOf,revisionsByMatch[i][5].predictionId);
  assert.equal(row.predictionConfirmedAt,'2026-11-14T01:50:31.000Z');
  assert.equal(row.marketOfficialDisplayAt,marketRevision7.pageDisplayAt);
  assert.equal(row.marketRetrievedAt,marketRevision7.retrievedAt);
  assert.deepEqual(row.marketVoteShare,expected);
  checkBlend(row,v1[i],{marketVoteShare:expected});
 }
});

test('all snapshots were generated before the published deadline',()=>{const times=[...new Set(v2.map(x=>x.predictionConfirmedAt))];assert.equal(times.length,9);for(const row of [...v1,...v2])assert.ok(Date.parse(row.predictionConfirmedAt)<Date.parse(row.deadlineAt));});
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


test('fifth V2 revision uses the directly retrieved 15:28 JST official snapshot and correct V2 modelVersion',()=>{
 const totals=Array(13).fill(552683);
 assert.equal(marketRevision5.rows.length,13);
 assert.equal(marketRevision5.officialDisplayAt,'2026-11-13T15:28:00+09:00');
 assert.equal(marketRevision5.retrievedAt,'2026-11-13T15:32:41+09:00');
 assert.deepEqual(marketRevision5.rows.map(x=>x.totalVotes),totals);
 for(let i=0;i<13;i++){
  const m=marketRevision5.rows[i];
  assert.equal(m.matchNumber,i+1);
  assert.equal(m.totalVotes,m.voteCounts.home+m.voteCounts.draw+m.voteCounts.away);
  assert.ok(Math.abs(m.displayedVoteSharePercent.home+m.displayedVoteSharePercent.draw+m.displayedVoteSharePercent.away-100)<1e-8);
  assert.deepEqual(m.marketVoteShare,{'0':Number((m.displayedVoteSharePercent.draw/100).toFixed(4)),'1':Number((m.displayedVoteSharePercent.home/100).toFixed(4)),'2':Number((m.displayedVoteSharePercent.away/100).toFixed(4))});
  const row=revisionsByMatch[i][4];
  assert.equal(row.revisionOf,revisionsByMatch[i][3].predictionId);
  assert.equal(row.predictionConfirmedAt,'2026-11-13T06:35:23.000Z');
  assert.equal(row.marketOfficialDisplayAt,marketRevision5.officialDisplayAt);
  assert.equal(row.marketRetrievedAt,marketRevision5.retrievedAt);
  assert.equal(row.modelVersion,'GPT-shared-poisson-score-v2-market-blend-30-70-2026-11-14');
  checkBlend(row,v1[i],m);
 }
});


const staleMarket0616=JSON.parse(fs.readFileSync(path.join(__dirname,'..','reports/round_1672_toto13_official_market_stale_20261114T0616JST.json'),'utf8'));
test('round 1672 official toto13 06:16 stale market display is archived but excluded from V2',()=>{
 assert.equal(staleMarket0616.round,1672);assert.equal(staleMarket0616.product,'toto13');assert.equal(staleMarket0616.officialDisplayAt,'2026-11-14T06:16:00+09:00');assert.equal(staleMarket0616.retrievedAt,'2026-11-14T06:40:38+09:00');assert.equal(staleMarket0616.displayLagSeconds,1478);assert.equal(staleMarket0616.status,'stale_display');assert.equal(staleMarket0616.usedForPrediction,false);
 assert.equal(staleMarket0616.rows.length,13);assert.deepEqual(staleMarket0616.rows.map(x=>x.matchNumber),Array.from({length:13},(_,i)=>i+1));
 for(const row of staleMarket0616.rows){assert.equal(row.totalVotes,876082);assert.equal(row.voteCounts.home+row.voteCounts.draw+row.voteCounts.away,876082);assert.ok(Math.abs(row.displayedVoteSharePercent.home+row.displayedVoteSharePercent.draw+row.displayedVoteSharePercent.away-100)<1e-8);}
 assert.equal(v2.length,117);assert.equal(v2[v2.length-1].marketOfficialDisplayAt,'2026-11-14T12:24:00+09:00');
});

const staleMarket1157Path='reports/round_1672_toto13_official_market_snapshot_20261114T1157JST.json';
const staleMarket1157=JSON.parse(fs.readFileSync(path.join(__dirname,'..',staleMarket1157Path),'utf8'));
test('round 1672 toto13 11:57 official snapshot is archived as stale and excluded from V2',()=>{
 assert.equal(staleMarket1157.round,1672);assert.equal(staleMarket1157.marketType,'toto13');
 assert.equal(staleMarket1157.pageDisplayAt,'2026-11-14T11:57:00+09:00');assert.equal(staleMarket1157.retrievedAt,'2026-11-14T12:08:43+09:00');
 assert.equal(staleMarket1157.displayAgeSeconds,703);assert.equal(staleMarket1157.stale,true);
 assert.equal(staleMarket1157.totalVotesPageSummary,1206686);assert.equal(staleMarket1157.matches.length,13);
 assert.deepEqual(staleMarket1157.matches.map(x=>x.matchNumber),Array.from({length:13},(_,i)=>i+1));
 for(const row of staleMarket1157.matches){assert.equal(row.sumVotes,row.voteCounts.reduce((a,b)=>a+b,0));assert.ok(Math.abs(row.percentages.reduce((a,b)=>a+b,0)-100)<1e-8);assert.equal(row.differenceFromSummaryVotes,row.sumVotes-1206686);}
 assert.deepEqual(staleMarket1157.matches.map(x=>x.differenceFromSummaryVotes),[-117,-117,-117,-117,-117,-117,-117,-117,-117,-110,-70,-39,0]);
 assert.equal(v2.length,117);assert.equal(v2[v2.length-1].marketOfficialDisplayAt,'2026-11-14T12:24:00+09:00');
});

test('eighth V2 revision uses the 12:24 Claude-transcribed market snapshot with explicit unverified provenance',()=>{
 assert.equal(marketRevision8.round,1672);assert.equal(marketRevision8.product,'toto13');
 assert.equal(marketRevision8.pageDisplayAt,'2026-11-14T12:24:00+09:00');
 assert.equal(marketRevision8.retrievedAt,null);assert.equal(marketRevision8.displayAgeSeconds,null);
 assert.equal(marketRevision8.stale,null);assert.equal(marketRevision8.usedForPrediction,true);
 assert.match(marketRevision8.provenance,/did not independently retrieve/i);
 assert.equal(marketRevision8.rows.length,13);
 for(let i=0;i<13;i++){
  const m=marketRevision8.rows[i],row=revisionsByMatch[i][7];
  assert.equal(m.matchNumber,i+1);
  assert.equal(row.revisionOf,revisionsByMatch[i][6].predictionId);
  assert.equal(row.predictionConfirmedAt,'2026-11-14T12:26:00+09:00');
  assert.equal(row.marketOfficialDisplayAt,marketRevision8.pageDisplayAt);
  assert.equal(row.marketRetrievedAt,null);
  assert.deepEqual(row.marketVoteShare,m.marketVoteShare);
  checkBlend(row,v1[i],m);
 }
});

const staleMarket1227=JSON.parse(fs.readFileSync(path.join(__dirname,'..','reports/round_1672_toto13_official_market_snapshot_20261114T1227JST.json'),'utf8'));
test('round 1672 official toto13 12:27 market display is preserved as stale and excluded from V2',()=>{
 assert.equal(staleMarket1227.round,1672);assert.equal(staleMarket1227.marketType,'toto13');
 assert.equal(staleMarket1227.pageDisplayAt,'2026-11-14T12:27:00+09:00');assert.equal(staleMarket1227.retrievedAt,'2026-11-14T12:54:30+09:00');
 assert.equal(staleMarket1227.displayAgeSeconds,1650);assert.equal(staleMarket1227.stale,true);
 assert.equal(staleMarket1227.totalVotesPageSummary,1269935);assert.equal(staleMarket1227.matches.length,13);
 assert.deepEqual(staleMarket1227.matches.map(x=>x.matchNumber),Array.from({length:13},(_,i)=>i+1));
 assert.deepEqual(staleMarket1227.matches.map(x=>x.differenceFromSummaryVotes),[-10,-10,-7,-6,-2,-1,0,0,0,0,0,0,0]);
 assert.equal(staleMarket1227.countConsistency.allThirteenDisplayedPercentageVectorsSumTo100,true);
 assert.equal(staleMarket1227.countConsistency.allMatchVoteTotalsEqualPageSummary,false);
 for(const row of staleMarket1227.matches)assert.ok(Math.abs(row.percentages.reduce((a,b)=>a+b,0)-100)<1e-8);
 assert.match(staleMarket1227.interpretation,/stale/);assert.match(staleMarket1227.interpretation,/not be treated as live market data/);
});
