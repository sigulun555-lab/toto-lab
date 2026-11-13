'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const readJsonl=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8').trim().split(/\r?\n/).filter(Boolean).map(JSON.parse);
const snapshotPath='data/goal3_market_snapshots/round_1672_2026-11-12T0517JST_official.jsonl';
const snapshot=JSON.parse(fs.readFileSync(path.join(__dirname,'..',snapshotPath),'utf8').trim());
const oldSnapshot=JSON.parse(fs.readFileSync(path.join(__dirname,'..','data/goal3_market_snapshots/round_1672_2026-11-12T0328JST_official.jsonl'),'utf8').trim());
const attempts=readJsonl('data/goal3_market_snapshot_attempts.jsonl');
test('round 1672 official GOAL3 05:17 snapshot has six complete team-side vectors',()=>{
 assert.equal(snapshot.round,1672);assert.equal(snapshot.marketSnapshotAt,'2026-11-12T05:17:00+09:00');assert.equal(snapshot.retrievedAt,'2026-11-12T05:19:15+09:00');assert.equal(snapshot.deadlineAt,'2026-11-14T13:50:00+09:00');assert.equal(snapshot.teams.length,6);assert.equal(snapshot.captureStatus,'captured');
 assert.equal(new Set(snapshot.teams.map(x=>x.matchNumber+':'+x.side)).size,6);
 for(const row of snapshot.teams){assert.deepEqual(Object.keys(row.voteCounts).sort(),['0','1','2','3+']);assert.deepEqual(Object.keys(row.voteSharePct).sort(),['0','1','2','3+']);assert.equal(Object.values(row.voteCounts).reduce((a,b)=>a+b,0),25734);assert.ok(Math.abs(Object.values(row.voteSharePct).reduce((a,b)=>a+b,0)-100)<1e-8);}
});
test('round 1672 GOAL3 snapshot attempt is recorded exactly once and points to this file',()=>{
 const found=attempts.filter(x=>x.snapshotPath===snapshotPath);assert.equal(found.length,1);assert.equal(found[0].captureStatus,'captured');assert.equal(found[0].retrievedAt,'2026-11-12T05:19:15+09:00');assert.equal(found[0].sourceDisplayedTimestamp,'2026/11/12 05:17 JST');
});
test('previous 03:28 official snapshot is preserved unchanged',()=>{
 assert.equal(oldSnapshot.round,1672);assert.equal(oldSnapshot.marketSnapshotAt,'2026-11-12T03:28:00+09:00');assert.equal(oldSnapshot.teams.length,6);
});

const snapshot0932Path='data/goal3_market_snapshots/round_1672_2026-11-12T0932JST_official.jsonl';
const snapshot0932=JSON.parse(fs.readFileSync(path.join(__dirname,'..',snapshot0932Path),'utf8').trim());
test('round 1672 official GOAL3 09:32 snapshot has six complete team-side vectors',()=>{
 assert.equal(snapshot0932.round,1672);assert.equal(snapshot0932.marketSnapshotAt,'2026-11-12T09:32:00+09:00');assert.equal(snapshot0932.retrievedAt,'2026-11-12T10:08:15.007+09:00');assert.equal(snapshot0932.deadlineAt,'2026-11-14T13:50:00+09:00');assert.equal(snapshot0932.teams.length,6);assert.equal(snapshot0932.captureStatus,'captured');
 assert.equal(new Set(snapshot0932.teams.map(x=>x.matchNumber+':'+x.side)).size,6);
 for(const row of snapshot0932.teams){assert.deepEqual(Object.keys(row.voteCounts).sort(),['0','1','2','3+']);assert.deepEqual(Object.keys(row.voteSharePct).sort(),['0','1','2','3+']);assert.equal(Object.values(row.voteCounts).reduce((a,b)=>a+b,0),27789);assert.ok(Math.abs(Object.values(row.voteSharePct).reduce((a,b)=>a+b,0)-100)<1e-8);}
});
test('round 1672 09:32 GOAL3 snapshot attempt is recorded exactly once and points to this file',()=>{
 const found=attempts.filter(x=>x.snapshotPath===snapshot0932Path);assert.equal(found.length,1);assert.equal(found[0].captureStatus,'captured');assert.equal(found[0].retrievedAt,'2026-11-12T10:08:15.007+09:00');assert.equal(found[0].sourceDisplayedTimestamp,'2026/11/12 09:32 JST');
});

const snapshot1504Path='data/goal3_market_snapshots/round_1672_2026-11-12T1504JST_official.jsonl';
const snapshot1504=JSON.parse(fs.readFileSync(path.join(__dirname,'..',snapshot1504Path),'utf8').trim());
test('round 1672 official GOAL3 15:04 snapshot has six complete team-side vectors',()=>{
 assert.equal(snapshot1504.round,1672);assert.equal(snapshot1504.marketSnapshotAt,'2026-11-12T15:04:00+09:00');assert.equal(snapshot1504.retrievedAt,'2026-11-12T15:08:12+09:00');assert.equal(snapshot1504.deadlineAt,'2026-11-14T13:50:00+09:00');assert.equal(snapshot1504.teams.length,6);assert.equal(snapshot1504.captureStatus,'captured');
 assert.equal(new Set(snapshot1504.teams.map(x=>x.matchNumber+':'+x.side)).size,6);
 for(const row of snapshot1504.teams){assert.deepEqual(Object.keys(row.voteCounts).sort(),['0','1','2','3+']);assert.deepEqual(Object.keys(row.voteSharePct).sort(),['0','1','2','3+']);assert.equal(Object.values(row.voteCounts).reduce((a,b)=>a+b,0),34446);assert.ok(Math.abs(Object.values(row.voteSharePct).reduce((a,b)=>a+b,0)-100)<1e-8);}
});
test('round 1672 15:04 GOAL3 snapshot attempt is recorded exactly once and points to this file',()=>{
 const found=attempts.filter(x=>x.snapshotPath===snapshot1504Path);assert.equal(found.length,1);assert.equal(found[0].captureStatus,'captured');assert.equal(found[0].retrievedAt,'2026-11-12T15:08:12+09:00');assert.equal(found[0].sourceDisplayedTimestamp,'2026/11/12 15:04 JST');
});

const snapshot0854Path='data/goal3_market_snapshots/round_1672_2026-11-13T0854JST_official.jsonl';
const snapshot0854=JSON.parse(fs.readFileSync(path.join(__dirname,'..',snapshot0854Path),'utf8').trim());
test('round 1672 official GOAL3 08:54 snapshot has six complete team-side vectors',()=>{
 assert.equal(snapshot0854.round,1672);assert.equal(snapshot0854.marketSnapshotAt,'2026-11-13T08:54:00+09:00');assert.equal(snapshot0854.retrievedAt,'2026-11-13T13:47:19+09:00');assert.equal(snapshot0854.deadlineAt,'2026-11-14T13:50:00+09:00');assert.equal(snapshot0854.teams.length,6);assert.equal(snapshot0854.captureStatus,'captured');
 assert.equal(new Set(snapshot0854.teams.map(x=>x.matchNumber+':'+x.side)).size,6);
 for(const row of snapshot0854.teams){assert.deepEqual(Object.keys(row.voteCounts).sort(),['0','1','2','3+']);assert.deepEqual(Object.keys(row.voteSharePct).sort(),['0','1','2','3+']);assert.equal(Object.values(row.voteCounts).reduce((a,b)=>a+b,0),49432);assert.ok(Math.abs(Object.values(row.voteSharePct).reduce((a,b)=>a+b,0)-100)<1e-8);}
});
test('round 1672 08:54 GOAL3 snapshot attempt is recorded exactly once and points to this file',()=>{
 const found=attempts.filter(x=>x.snapshotPath===snapshot0854Path);assert.equal(found.length,1);assert.equal(found[0].captureStatus,'captured');assert.equal(found[0].retrievedAt,'2026-11-13T13:47:19+09:00');assert.equal(found[0].sourceDisplayedTimestamp,'2026/11/13 08:54 JST');
});
test('previous 03:50 official snapshot is preserved unchanged',()=>{
 const old=JSON.parse(fs.readFileSync(path.join(__dirname,'..','data/goal3_market_snapshots/round_1672_2026-11-13T0350JST_official.jsonl'),'utf8').trim());
 assert.equal(old.round,1672);assert.equal(old.marketSnapshotAt,'2026-11-13T03:50:00+09:00');assert.equal(old.retrievedAt,'2026-11-13T03:50:40+09:00');assert.equal(old.teams.length,6);
});


const snapshot1400Path='data/goal3_market_snapshots/round_1672_2026-11-13T1400JST_official.jsonl';
const snapshot1400=JSON.parse(fs.readFileSync(path.join(__dirname,'..',snapshot1400Path),'utf8').trim());
test('round 1672 official GOAL3 14:00 snapshot preserves stale display and count discrepancies',()=>{
 assert.equal(snapshot1400.round,1672);assert.equal(snapshot1400.marketSnapshotAt,'2026-11-13T14:00:00+09:00');assert.equal(snapshot1400.retrievedAt,'2026-11-13T15:32:41+09:00');assert.equal(snapshot1400.deadlineAt,'2026-11-14T13:50:00+09:00');assert.equal(snapshot1400.teams.length,6);assert.equal(snapshot1400.captureStatus,'captured');
 assert.equal(snapshot1400.dataQuality.isLive,false);assert.equal(snapshot1400.dataQuality.displayLagSeconds,5561);assert.equal(snapshot1400.pageSummary.voteCount,61943);
 assert.deepEqual(snapshot1400.teams.map(x=>x.displayedCountSum),[61938,61938,61941,61943,61943,61943]);
 assert.deepEqual(snapshot1400.teams.map(x=>x.differenceFromSummaryVotes),[-5,-5,-2,0,0,0]);
 for(const row of snapshot1400.teams){assert.deepEqual(Object.keys(row.voteCounts).sort(),['0','1','2','3+']);assert.deepEqual(Object.keys(row.voteSharePct).sort(),['0','1','2','3+']);assert.ok(Math.abs(Object.values(row.voteSharePct).reduce((a,b)=>a+b,0)-100)<1e-8);}
});
test('round 1672 14:00 GOAL3 stale snapshot attempt is recorded exactly once and points to this file',()=>{
 const found=attempts.filter(x=>x.snapshotPath===snapshot1400Path);assert.equal(found.length,1);assert.equal(found[0].captureStatus,'captured');assert.equal(found[0].retrievedAt,'2026-11-13T15:32:41+09:00');assert.equal(found[0].sourceDisplayedTimestamp,'2026/11/13 14:00 JST');
});


const snapshot1531Path='data/goal3_market_snapshots/round_1672_2026-11-13T1531JST_official.jsonl';
const snapshot1531=JSON.parse(fs.readFileSync(path.join(__dirname,'..',snapshot1531Path),'utf8').trim());
test('round 1672 official GOAL3 15:31 snapshot preserves stale display with consistent counts',()=>{
 assert.equal(snapshot1531.round,1672);assert.equal(snapshot1531.marketSnapshotAt,'2026-11-13T15:31:00+09:00');assert.equal(snapshot1531.retrievedAt,'2026-11-13T15:42:02+09:00');assert.equal(snapshot1531.deadlineAt,'2026-11-14T13:50:00+09:00');assert.equal(snapshot1531.teams.length,6);assert.equal(snapshot1531.captureStatus,'captured');
 assert.equal(snapshot1531.dataQuality.isLive,false);assert.equal(snapshot1531.dataQuality.displayLagSeconds,662);assert.equal(snapshot1531.pageSummary.voteCount,66856);
 assert.deepEqual(snapshot1531.teams.map(x=>x.displayedCountSum),Array(6).fill(66856));assert.deepEqual(snapshot1531.teams.map(x=>x.differenceFromSummaryVotes),Array(6).fill(0));
 for(const row of snapshot1531.teams){assert.deepEqual(Object.keys(row.voteCounts).sort(),['0','1','2','3+']);assert.deepEqual(Object.keys(row.voteSharePct).sort(),['0','1','2','3+']);assert.ok(Math.abs(Object.values(row.voteSharePct).reduce((a,b)=>a+b,0)-100)<1e-8);}
});
test('round 1672 15:31 GOAL3 snapshot attempt is recorded exactly once',()=>{
 const found=attempts.filter(x=>x.snapshotPath===snapshot1531Path);assert.equal(found.length,1);assert.equal(found[0].retrievedAt,'2026-11-13T15:42:02+09:00');assert.equal(found[0].sourceDisplayedTimestamp,'2026/11/13 15:31 JST');
});


const snapshot0621Path='data/goal3_market_snapshots/round_1672_2026-11-14T0621JST_official.jsonl';
const snapshot0621=JSON.parse(fs.readFileSync(path.join(__dirname,'..',snapshot0621Path),'utf8').trim());
test('round 1672 official GOAL3 06:21 snapshot preserves stale display and six team-side vectors',()=>{
 assert.equal(snapshot0621.round,1672);assert.equal(snapshot0621.marketSnapshotAt,'2026-11-14T06:21:00+09:00');assert.equal(snapshot0621.retrievedAt,'2026-11-14T06:40:38+09:00');assert.equal(snapshot0621.deadlineAt,'2026-11-14T13:50:00+09:00');assert.equal(snapshot0621.teams.length,6);assert.equal(snapshot0621.captureStatus,'captured');
 assert.equal(snapshot0621.dataQuality.isLive,false);assert.equal(snapshot0621.dataQuality.displayLagSeconds,1178);assert.equal(snapshot0621.pageSummary.voteCount,104454);
 assert.deepEqual(snapshot0621.teams.map(x=>x.officialGoal3MatchNumber),[1,1,2,2,3,3]);assert.deepEqual(snapshot0621.teams.map(x=>x.toto13MatchNumber),[2,2,4,4,5,5]);
 assert.deepEqual(snapshot0621.teams.map(x=>x.displayedCountSum),Array(6).fill(104454));assert.deepEqual(snapshot0621.teams.map(x=>x.differenceFromSummaryVotes),Array(6).fill(0));
 for(const row of snapshot0621.teams){assert.deepEqual(Object.keys(row.voteCounts).sort(),['0','1','2','3+']);assert.deepEqual(Object.keys(row.voteSharePct).sort(),['0','1','2','3+']);assert.ok(Math.abs(Object.values(row.voteSharePct).reduce((a,b)=>a+b,0)-100)<1e-8);}
});
test('round 1672 06:21 GOAL3 stale snapshot attempt is recorded exactly once',()=>{
 const found=attempts.filter(x=>x.snapshotPath===snapshot0621Path);assert.equal(found.length,1);assert.equal(found[0].captureStatus,'captured');assert.equal(found[0].retrievedAt,'2026-11-14T06:40:38+09:00');assert.equal(found[0].sourceDisplayedTimestamp,'2026/11/14 06:21 JST');
});
