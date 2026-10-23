// Regression tests for append-only round 1665 ChatGPT main prediction log.
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const readJsonl = (relative) => fs.readFileSync(path.join(root, relative), 'utf8').trim().split(/\r?\n/).filter(Boolean).map(JSON.parse);
const main = readJsonl('predictions/round_1665_ChatGPT.jsonl');
const appended = main.slice(-13);
const previous = main.slice(-26, -13);
const roundRows = main.filter(r => r.round === 1665);
const latestByMatch = new Map();
for (const row of roundRows) latestByMatch.set(row.matchNumber, row);

test('latest round 1665 main-log evidence.confidenceLevel is low for all 13 matches', () => {
  assert.equal(latestByMatch.size, 13);
  assert.deepEqual([...latestByMatch.keys()].sort((a,b)=>a-b), Array.from({length:13},(_,i)=>i+1));
  assert.equal([...latestByMatch.values()].filter(r => r.evidence?.confidenceLevel === 'low').length, 13);
  assert.ok([...latestByMatch.values()].every(r => !Object.hasOwn(r, 'confidenceLevel') && !Object.hasOwn(r, 'confidenceRationale')),
    'confidence fields must use the evidence schema, not root-level extras');
});

test('the 13 appended revisions preserve each immediately preceding 1X2 probability object', () => {
  assert.equal(appended.length, 13);
  assert.equal(previous.length, 13);
  for (let i = 0; i < 13; i++) {
    assert.equal(appended[i].matchNumber, previous[i].matchNumber);
    assert.deepEqual(appended[i].probabilities, previous[i].probabilities, 'probability changed for match ' + appended[i].matchNumber);
    assert.equal(appended[i].evidence?.confidenceLevel, 'low');
  }
});

test('new prediction IDs are unique and do not collide with existing IDs in comparison files', () => {
  const paths = [
    'predictions/round_1665_ChatGPT.jsonl',
    'predictions/round_1665_ChatGPT_evidence_v2.jsonl',
    'predictions/round_1665_ChatGPT_shared_score_v2.jsonl',
    'predictions/round_1665_ChatGPT_shared_score_v3.jsonl',
    'predictions/round_1665_Claude.jsonl'
  ];
  const newIds = appended.map(r => r.predictionId);
  assert.equal(new Set(newIds).size, 13, 'new IDs collide within the appended batch');
  const historicalIds = new Set();
  for (const relative of paths) {
    const rows = readJsonl(relative);
    for (const row of rows) {
      if (relative === 'predictions/round_1665_ChatGPT.jsonl' && newIds.includes(row.predictionId)) continue;
      historicalIds.add(row.predictionId);
    }
  }
  for (const id of newIds) assert.ok(!historicalIds.has(id), 'new ID already exists: ' + id);
});
