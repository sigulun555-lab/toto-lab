'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const report = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'reports/round_1674_toto13_team_news_refresh_20261124T0133JST.json'), 'utf8'));

test('round-1674 toto13 team-news refresh records all 26 clubs without claiming complete medical coverage', () => {
  assert.equal(report.product, 'toto13');
  assert.equal(report.round, 1674);
  assert.equal(report.matchCount, 13);
  assert.equal(report.teamCount, 26);
  assert.equal(report.teamChecks.length, 26);
  assert.equal(new Set(report.teamChecks.map(x => x.team)).size, 26);
  assert.equal(report.scopeLimitations.all26MedicalStatusFullyVerified, false);
  assert.equal(report.scopeLimitations.officialLineupsAvailable, false);
  assert.equal(report.lineups.officialStartingLineups, 'not_published_at_checkedAt');
  assert.equal(report.scopeLimitations.modelInputChanged, false);
  assert.equal(report.suspensionSummary.length, 3);
  assert.deepEqual(report.suspensionSummary.map(x => x.player).sort(), ['ジョアン パウロ', 'ユーリ ララ', '関口 凱心'].sort());
  assert.ok(report.sources.length >= 10);
  const sourceIds = new Set(report.sources.map(x => x.id));
  for (const team of report.teamChecks) {
    for (const sourceId of team.sourceIds) assert.ok(sourceIds.has(sourceId), sourceId);
    assert.ok(team.note.length > 0);
  }
  for (const source of report.sources) {
    assert.ok(source.url.startsWith('https://'));
    assert.ok(source.retrievedAt);
  }
});
