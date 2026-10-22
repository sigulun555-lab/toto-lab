'use strict';
const fs = require('node:fs');
const path = require('node:path');
const file = process.argv[2];
if (!file) {
  console.error('Usage: node scripts/validate_prediction.js <prediction.jsonl>');
  process.exit(2);
}
const teams = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'teams.json'), 'utf8'));
const aliases = new Map();
for (const club of teams.clubs) {
  for (const alias of [club.canonical, ...club.aliases]) {
    const key = alias.normalize('NFKC').replace(/[\\s　]/g, '').toLowerCase();
    const existing = aliases.get(key);
    if (!existing) aliases.set(key, new Set([club.canonical]));
    else existing.add(club.canonical);
  }
}
function canonicalize(name) {
  const key = name.normalize('NFKC').replace(/[\\s　]/g, '').toLowerCase();
  const candidates = aliases.get(key);
  return candidates && candidates.size === 1 ? [...candidates][0] : null;
}
const ids = new Set();
const lines = fs.readFileSync(file, 'utf8').split(/\\r?\\n/).filter(Boolean);
let errors = 0;
for (let i = 0; i < lines.length; i++) {
  let p;
  try { p = JSON.parse(lines[i]); } catch { console.error(`Line ${i+1}: invalid JSON`); errors++; continue; }
  const required = ['predictionId','round','matchNumber','homeTeam','awayTeam','probabilities','predictionConfirmedAt','deadlineAt','modelName','modelVersion','revisionOf'];
  for (const k of required) if (!(k in p)) { console.error(`Line ${i+1}: missing ${k}`); errors++; }
  if (ids.has(p.predictionId)) { console.error(`Line ${i+1}: duplicate predictionId ${p.predictionId}`); errors++; }
  ids.add(p.predictionId);
  const confirmed = Date.parse(p.predictionConfirmedAt);
  const deadline = Date.parse(p.deadlineAt);
  if (!p.predictionConfirmedAt?.endsWith('Z') || !Number.isFinite(confirmed)) { console.error(`Line ${i+1}: predictionConfirmedAt must be valid UTC ISO8601 ending Z`); errors++; }
  if (!p.deadlineAt?.endsWith('Z') || !Number.isFinite(deadline)) { console.error(`Line ${i+1}: deadlineAt must be valid UTC ISO8601 ending Z`); errors++; }
  if (Number.isFinite(confirmed) && Number.isFinite(deadline) && confirmed >= deadline) { console.error(`Line ${i+1}: prediction is not before deadline`); errors++; }
  const probs = p.probabilities || {};
  for (const k of ['1','0','2']) if (!Number.isFinite(probs[k]) || probs[k] < 0 || probs[k] > 1) { console.error(`Line ${i+1}: invalid probability ${k}`); errors++; }
  const sum = Number(probs['1']) + Number(probs['0']) + Number(probs['2']);
  if (Math.abs(sum - 1) > 0.002) { console.error(`Line ${i+1}: probabilities sum to ${sum}, expected 1`); errors++; }
  if (!canonicalize(p.homeTeam)) { console.error(`Line ${i+1}: unresolved home team: ${p.homeTeam}`); errors++; }
  if (!canonicalize(p.awayTeam)) { console.error(`Line ${i+1}: unresolved away team: ${p.awayTeam}`); errors++; }
  if (p.homeTeam === p.awayTeam) { console.error(`Line ${i+1}: home and away team are identical`); errors++; }
}
if (errors) { console.error(`Validation failed: ${errors} error(s)`); process.exit(1); }
console.log(`Validated ${lines.length} prediction record(s).`);
