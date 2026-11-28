'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { buildProvisionalRows } = require('../scripts/round_1675_toto13_v2_market_refresh_20261128T1245JST');
const root = path.join(__dirname, '..');
const v1 = fs.readFileSync(path.join(root,'predictions/round_1675_ChatGPT_shared_score_v1_revision_20261126T022833JST.jsonl'),'utf8').trim().split(/\\r?\\n/).map(JSON.parse);
const market = JSON.parse(fs.readFileSync(path.join(root,'reports/round_1675_toto13_official_market_snapshot_20261128T1245JST.json'),'utf8'));
test('round 1675 provisional market refresh has 13 normalized, correctly matched rows and explicit freshness caveat',()=>{
 const rows=buildProvisionalRows(v1,market);
 assert.equal(rows.length,13);
 assert.deepEqual(rows.map(x=>x.matchNumber),Array.from({length:13},(_,i)=>i+1));
 for(const r of rows){
  assert.equal(r.product,'toto13');
  assert.equal(r.round,1675);
  assert.equal(r.notes.includes('PROVISIONAL ONLY'),true);
  assert.ok(Math.abs(Object.values(r.outcomeProbabilities).reduce((a,b)=>a+b,0)-1)<=2e-8);
 }
 assert.equal(market.voteDataFreshnessVerified,false);
 assert.equal(market.voteStatusUpdatedAt,null);
});
