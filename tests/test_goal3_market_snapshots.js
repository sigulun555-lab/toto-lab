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
