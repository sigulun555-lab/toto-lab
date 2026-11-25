'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const report = require('../reports/round_1674_toto13_team_news_recheck_20261125T1211JST.json');

test('12:11 toto13 team-news recheck records official suspensions but does not claim complete XI or medical coverage', () => {
  assert.equal(report.product, 'toto13');
  assert.equal(report.round, 1674);
  assert.equal(report.checkedAt, '2026-11-25T12:11:02+09:00');
  assert.equal(report.coverage.fixtures, 13);
  assert.equal(report.coverage.teams, 26);
  assert.equal(report.coverage.clubSpecificSearchQueriesAttempted, 26);
  assert.equal(report.coverage.officialLineupPagesAttempted, 13);
  assert.equal(report.coverage.officialStartingXIsRetrieved, 0);
  assert.equal(report.coverage.officialLineupPagesAccessible, 0);
  assert.equal(report.confirmedSuspensions.length, 3);
  assert.deepEqual(report.confirmedSuspensions.map(x=>x.team).sort(), ['ジュビロ磐田','横浜ＦＣ','ＲＢ大宮アルディージャ'].sort());
  assert.equal(report.outOfCardSuspensions[0].team, 'ヴァンフォーレ甲府');
  assert.equal(report.carriedForwardInjuries[0].player, '松木駿之介');
  assert.match(report.carriedForwardInjuries[0].matchAvailability, /未確定/);
  assert.equal(report.carriedForwardInjuries[1].status, 'unverified_suspension_snippet_carried_forward');
  assert.equal(report.carriedForwardInjuries[1].sourceUrl, null);
  assert.equal(report.carriedForwardInjuries[1].sourceStatus, 'search_snippet_only_not_opened');
  assert.equal(report.lineups.officialStartingXIs, 'not_retrieved');
  assert.equal(report.predictionImpact.modelInputChanged, false);
  assert.equal(report.predictionImpact.probabilitiesChanged, false);
  assert.equal(report.predictionImpact.revisionRequired, false);
});
