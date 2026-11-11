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
