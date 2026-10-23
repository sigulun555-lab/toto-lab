// Regression tests for corrected round 1665 shared score snapshot.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const file = path.join(__dirname, '..', 'predictions', 'round_1665_ChatGPT_shared_score_v2.jsonl');
const rows = fs.readFileSync(file, 'utf8').trim().split(/\r?\n/).map(JSON.parse);
test('corrected alias-normalized snapshot has 13 unique matches', () => {
 assert.equal(rows.length,13);
 assert.deepEqual(rows.map(r=>r.matchNumber),Array.from({length:13},(_,i)=>i+1));
 assert.equal(new Set(rows.map(r=>r.predictionId)).size,13);
});
test('all expected goals and probabilities are valid and normalized',()=>{
 for(const r of rows){
  assert.ok(r.homeExpectedGoals>0&&r.awayExpectedGoals>0);
  for(const key of ['homeGoalProbabilities','awayGoalProbabilities']){
   assert.equal(r[key].length,4);assert.ok(r[key].every(x=>Number.isFinite(x)&&x>=0&&x<=1));
   assert.ok(Math.abs(r[key].reduce((a,b)=>a+b,0)-1)<1e-6);
  }
  assert.deepEqual(Object.keys(r.outcomeProbabilities).sort(),['0','1','2']);
  assert.ok(Object.values(r.outcomeProbabilities).every(x=>x>=0&&x<=1));
  assert.ok(Math.abs(Object.values(r.outcomeProbabilities).reduce((a,b)=>a+b,0)-1)<1e-6);
  assert.ok(r.canonicalHome&&r.canonicalAway);
  assert.ok(r.historyMatchesHome>0&&r.historyMatchesAway>0, 'alias-normalized team history missing for match '+r.matchNumber);
  assert.equal(r.modelVersion,'GPT-shared-poisson-score-v2-alias-normalized-2026-10-23');
 }
});
