'use strict';
const test=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');
const report=JSON.parse(fs.readFileSync(path.join(__dirname,'..','reports/round_1673_official_availability_audit_20261118T1236JST.json'),'utf8'));
const ledger=fs.readFileSync(path.join(__dirname,'..','data/injury_status/round_1673.jsonl'),'utf8').trim().split(/\r?\n/).filter(Boolean).map(JSON.parse);
function latest(player,team,match){return ledger.filter(x=>x.player===player&&x.team===team&&x.matchNumber===match).sort((a,b)=>Date.parse(a.recordedAt)-Date.parse(b.recordedAt)).at(-1);}
test('round 1673 official availability audit preserves source publication and retrieval times',()=>{
 assert.equal(report.round,1673);assert.equal(report.product,'toto13');assert.equal(report.retrievedAt,'2026-11-18T12:36:40+09:00');
 assert.equal(report.suspensions.length,8);assert.equal(report.injuries.length,5);
 assert.equal(report.sources[0].sourcePublishedAt,'2026-11-16T19:00:00+09:00');
 assert.equal(report.sources[1].sourcePublishedDate,'2026-11-17');
 assert.equal(report.sources[2].sourcePublishedDate,'2026-11-01');
 for(const x of report.suspensions){assert.equal(x.status,'confirmed_out');const l=latest(x.player,x.team,x.toto13MatchNumber);assert.ok(l);assert.equal(l.status,'confirmed_out');}
 for(const x of report.injuries){const l=latest(x.player,x.team,x.toto13MatchNumber);assert.ok(l);assert.equal(l.status,x.status);}
 assert.equal(report.lineupStatus.officialStartingXI,'未発表・確認できず');
 assert.equal(report.coverage.suspensionPlayersConfirmed,8);
 assert.equal(report.coverage.remainingClubsRequireClubOfficialAvailabilityReview,18);
});
