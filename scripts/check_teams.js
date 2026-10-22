'use strict';
const fs = require('node:fs');
const path = require('node:path');
const data = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'teams.json'), 'utf8'));
const errors = [];
if (!Array.isArray(data.clubs) || data.clubs.length !== 60) errors.push(`Expected 60 clubs, got ${data.clubs?.length}`);
const seen = new Map();
for (const club of data.clubs || []) {
  if (!club.league || !club.canonical || !Array.isArray(club.aliases)) errors.push(`Invalid club record: ${JSON.stringify(club)}`);
  for (const alias of [club.canonical, ...(club.aliases || [])]) {
    const key = alias.normalize('NFKC').replace(/[\\s　]/g, '').toLowerCase();
    if (seen.has(key) && seen.get(key) !== club.canonical) {
      // Short names can collide across divisions; keep the ambiguity explicit instead of guessing.
      if (alias.length > 2) errors.push(`Alias collision: ${alias} => ${seen.get(key)} / ${club.canonical}`);
    } else seen.set(key, club.canonical);
  }
}
if (errors.length) { console.error(errors.join('\\n')); process.exit(1); }
console.log(`Team dictionary basic check passed: ${data.clubs.length} clubs.`);
