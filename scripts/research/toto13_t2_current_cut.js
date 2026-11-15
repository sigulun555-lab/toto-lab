'use strict';

const fs = require('node:fs');

function createPythonRandom(seed) {
  const mt = new Uint32Array(624);
  let index = 624;

  function initGenrand(value) {
    mt[0] = value >>> 0;
    for (let i = 1; i < 624; i += 1) {
      const previous = mt[i - 1] ^ (mt[i - 1] >>> 30);
      mt[i] = (Math.imul(1812433253, previous) + i) >>> 0;
    }
    index = 624;
  }

  function initByArray(key) {
    initGenrand(19650218);
    let i = 1;
    let j = 0;
    let remaining = Math.max(624, key.length);
    for (; remaining > 0; remaining -= 1) {
      const previous = mt[i - 1] ^ (mt[i - 1] >>> 30);
      mt[i] = (mt[i] ^ Math.imul(previous, 1664525)) >>> 0;
      mt[i] = (mt[i] + key[j] + j) >>> 0;
      i += 1;
      j += 1;
      if (i >= 624) {
        mt[0] = mt[623];
        i = 1;
      }
      if (j >= key.length) j = 0;
    }
    for (remaining = 623; remaining > 0; remaining -= 1) {
      const previous = mt[i - 1] ^ (mt[i - 1] >>> 30);
      mt[i] = (mt[i] ^ Math.imul(previous, 1566083941)) >>> 0;
      mt[i] = (mt[i] - i) >>> 0;
      i += 1;
      if (i >= 624) {
        mt[0] = mt[623];
        i = 1;
      }
    }
    mt[0] = 0x80000000;
    index = 624;
  }

  function uint32() {
    if (index >= 624) {
      for (let i = 0; i < 624; i += 1) {
        const y = (mt[i] & 0x80000000) | (mt[(i + 1) % 624] & 0x7fffffff);
        mt[i] = (
          mt[(i + 397) % 624] ^
          (y >>> 1) ^
          ((y & 1) ? 0x9908b0df : 0)
        ) >>> 0;
      }
      index = 0;
    }
    let y = mt[index];
    index += 1;
    y ^= y >>> 11;
    y ^= (y << 7) & 0x9d2c5680;
    y ^= (y << 15) & 0xefc60000;
    y ^= y >>> 18;
    return y >>> 0;
  }

  function getrandbits(bits) {
    if (!Number.isInteger(bits) || bits < 1 || bits > 32) {
      throw new RangeError('getrandbits supports integer bit counts from 1 to 32');
    }
    return uint32() >>> (32 - bits);
  }

  function randBelow(limit) {
    if (!Number.isInteger(limit) || limit < 1) throw new RangeError('limit must be a positive integer');
    const bits = Math.floor(Math.log2(limit)) + 1;
    let value = getrandbits(bits);
    while (value >= limit) value = getrandbits(bits);
    return value;
  }

  initByArray([seed >>> 0]);
  return { uint32, getrandbits, randBelow };
}

function lexicalCompare(a, b) {
  return a < b ? -1 : (a > b ? 1 : 0);
}

function prepareHistory(history) {
  return history
    .filter((row) => Number.isInteger(row.home_goals) && Number.isInteger(row.away_goals))
    .slice()
    .sort((a, b) =>
      lexicalCompare(a.date, b.date) ||
      lexicalCompare(a.competition, b.competition) ||
      lexicalCompare(a.home, b.home) ||
      lexicalCompare(a.away, b.away)
    )
    .map((row) => ({
      ...row,
      matchId: [row.date, row.competition, row.home, row.away].join('|')
    }));
}

function poisson(lambda, goals) {
  let factorial = 1;
  for (let i = 2; i <= goals; i += 1) factorial *= i;
  return Math.exp(-lambda) * Math.pow(lambda, goals) / factorial;
}

function dixonColesTau(homeGoals, awayGoals, homeLambda, awayLambda, rho) {
  if (homeGoals === 0 && awayGoals === 0) return 1 - homeLambda * awayLambda * rho;
  if (homeGoals === 0 && awayGoals === 1) return 1 + homeLambda * rho;
  if (homeGoals === 1 && awayGoals === 0) return 1 + awayLambda * rho;
  if (homeGoals === 1 && awayGoals === 1) return 1 - rho;
  return 1;
}

function teamRates(prior, team, window, shrink) {
  const matches = prior.filter((row) => row.home === team || row.away === team).slice(-window);
  const n = matches.length;
  if (n === 0) return [1, 1];
  const goalsFor = matches.map((row) => row.home === team ? row.home_goals : row.away_goals);
  const goalsAgainst = matches.map((row) => row.home === team ? row.away_goals : row.home_goals);
  const baseHome = prior.reduce((sum, row) => sum + row.home_goals, 0) / prior.length;
  const baseAway = prior.reduce((sum, row) => sum + row.away_goals, 0) / prior.length;
  const base = (baseHome + baseAway) / 2;
  let attack = (goalsFor.reduce((sum, value) => sum + value, 0) / n) / base;
  let defence = (goalsAgainst.reduce((sum, value) => sum + value, 0) / n) / base;
  const weight = n / (n + shrink);
  attack = 1 + (attack - 1) * weight;
  defence = 1 + (defence - 1) * weight;
  return [attack, defence];
}

function predictT2(prior, home, away, applyBoost) {
  if (!prior.length) throw new Error('T2 prediction requires prior history');
  const homeAverage = prior.reduce((sum, row) => sum + row.home_goals, 0) / prior.length;
  const awayAverage = prior.reduce((sum, row) => sum + row.away_goals, 0) / prior.length;
  const base = (homeAverage + awayAverage) / 2;
  const [homeAttack, homeDefence] = teamRates(prior, home, 12, 6);
  const [awayAttack, awayDefence] = teamRates(prior, away, 12, 6);
  const homeLambda = Math.max(0.15, Math.min(3.5, homeAverage * homeAttack * awayDefence));
  const awayLambda = Math.max(0.15, Math.min(3.5, awayAverage * awayAttack * homeDefence));
  let pHome = 0;
  let pDraw = 0;
  let pAway = 0;

  for (let homeGoals = 0; homeGoals <= 10; homeGoals += 1) {
    for (let awayGoals = 0; awayGoals <= 10; awayGoals += 1) {
      const probability =
        poisson(homeLambda, homeGoals) *
        poisson(awayLambda, awayGoals) *
        dixonColesTau(homeGoals, awayGoals, homeLambda, awayLambda, -0.10);
      if (homeGoals > awayGoals) pHome += probability;
      else if (homeGoals === awayGoals) pDraw += probability;
      else pAway += probability;
    }
  }

  const total = pHome + pDraw + pAway;
  pHome /= total;
  pDraw /= total;
  pAway /= total;

  if (applyBoost) {
    const gap = Math.abs(pHome - pAway);
    if (gap < 0.30) {
      const boost = 0.20 * (1 - gap / 0.30);
      const homeShare = pHome / (pHome + pAway);
      const awayShare = pAway / (pHome + pAway);
      pDraw += boost;
      pHome -= boost * homeShare;
      pAway -= boost * awayShare;
    }
  }

  return { '1': pHome, '0': pDraw, '2': pAway };
}

function outcome(row) {
  if (row.home_goals > row.away_goals) return '1';
  if (row.home_goals === row.away_goals) return '0';
  return '2';
}

function runVariant(history, applyBoost) {
  const rows = [];
  for (let i = 0; i < history.length; i += 1) {
    const match = history[i];
    if (match.date < '2026-09-01') continue;
    const prior = history.slice(0, i).filter((row) => row.date < match.date);
    if (!prior.length) continue;
    const probabilities = predictT2(prior, match.home, match.away, applyBoost);
    rows.push({
      matchId: match.matchId,
      date: match.date,
      competition: match.competition,
      actual: outcome(match),
      pH: probabilities['1'],
      pD: probabilities['0'],
      pA: probabilities['2']
    });
  }
  return rows;
}

function predictedOutcome(row) {
  if (row.pH >= row.pD && row.pH >= row.pA) return '1';
  if (row.pD >= row.pH && row.pD >= row.pA) return '0';
  return '2';
}

function metrics(rows) {
  if (!rows.length) throw new Error('cannot score an empty cohort');
  let logLoss = 0;
  let brier = 0;
  let correct = 0;
  let meanDrawP = 0;
  let drawCount = 0;
  const bins = Array.from({ length: 10 }, () => ({ n: 0, p: 0, y: 0 }));

  for (const row of rows) {
    const actualP = row.actual === '1' ? row.pH : (row.actual === '0' ? row.pD : row.pA);
    logLoss -= Math.log(Math.max(actualP, 1e-12));
    brier +=
      Math.pow(row.pH - (row.actual === '1' ? 1 : 0), 2) +
      Math.pow(row.pD - (row.actual === '0' ? 1 : 0), 2) +
      Math.pow(row.pA - (row.actual === '2' ? 1 : 0), 2);
    if (predictedOutcome(row) === row.actual) correct += 1;
    meanDrawP += row.pD;
    const draw = row.actual === '0' ? 1 : 0;
    drawCount += draw;
    const bin = Math.min(9, Math.floor(row.pD * 10));
    bins[bin].n += 1;
    bins[bin].p += row.pD;
    bins[bin].y += draw;
  }

  const n = rows.length;
  const drawEce10 = bins.reduce((sum, bin) => sum + (bin.n ? (bin.n / n) * Math.abs(bin.p / bin.n - bin.y / bin.n) : 0), 0);
  return {
    n,
    logLoss: logLoss / n,
    brier: brier / n,
    accuracy: correct / n,
    meanDrawProbability: meanDrawP / n,
    observedDrawRate: drawCount / n,
    drawEce10,
    drawBins10: bins.map((bin, index) => ({
      lower: index / 10,
      upper: (index + 1) / 10,
      n: bin.n,
      meanPredicted: bin.n ? bin.p / bin.n : null,
      observedRate: bin.n ? bin.y / bin.n : null
    }))
  };
}

function pairedDateBlockBootstrap(withBoostRows, withoutBoostRows, reps = 10000, seed = 7) {
  if (withBoostRows.length !== withoutBoostRows.length) throw new Error('paired row count mismatch');
  const byIdWith = new Map(withBoostRows.map((row) => [row.matchId, row]));
  const byIdWithout = new Map(withoutBoostRows.map((row) => [row.matchId, row]));
  if (byIdWith.size !== withBoostRows.length || byIdWithout.size !== withoutBoostRows.length) {
    throw new Error('duplicate matchId in paired cohort');
  }
  const dates = [...new Set(withBoostRows.map((row) => row.date))].sort(lexicalCompare);
  const byDate = new Map(dates.map((date) => [date, []]));

  for (const withRow of withBoostRows) {
    const withoutRow = byIdWithout.get(withRow.matchId);
    if (!withoutRow || withoutRow.actual !== withRow.actual) throw new Error('paired fixture/actual mismatch');
    const loss = (row) => {
      const p = row.actual === '1' ? row.pH : (row.actual === '0' ? row.pD : row.pA);
      return -Math.log(Math.max(p, 1e-12));
    };
    const brier = (row) =>
      Math.pow(row.pH - (row.actual === '1' ? 1 : 0), 2) +
      Math.pow(row.pD - (row.actual === '0' ? 1 : 0), 2) +
      Math.pow(row.pA - (row.actual === '2' ? 1 : 0), 2);
    byDate.get(withRow.date).push({
      logLoss: loss(withoutRow) - loss(withRow),
      brier: brier(withoutRow) - brier(withRow),
      accuracy: (predictedOutcome(withoutRow) === withoutRow.actual ? 1 : 0) -
        (predictedOutcome(withRow) === withRow.actual ? 1 : 0)
    });
  }

  const rng = createPythonRandom(seed);
  const samples = { logLoss: [], brier: [], accuracy: [] };
  for (let rep = 0; rep < reps; rep += 1) {
    let ll = 0;
    let br = 0;
    let acc = 0;
    let n = 0;
    for (let draw = 0; draw < dates.length; draw += 1) {
      const selected = dates[rng.randBelow(dates.length)];
      for (const value of byDate.get(selected)) {
        ll += value.logLoss;
        br += value.brier;
        acc += value.accuracy;
        n += 1;
      }
    }
    samples.logLoss.push(ll / n);
    samples.brier.push(br / n);
    samples.accuracy.push(acc / n);
  }

  const ci = {};
  for (const key of Object.keys(samples)) {
    samples[key].sort((a, b) => a - b);
    ci[key] = [samples[key][Math.floor(0.025 * reps)], samples[key][Math.floor(0.975 * reps)]];
  }
  return { reps, seed, dateClusters: dates.length, quantileIndices: [Math.floor(0.025 * reps), Math.floor(0.975 * reps)], ci };
}

function computeT2(history, options = {}) {
  const reps = options.reps ?? 10000;
  const seed = options.seed ?? 7;
  const scored = prepareHistory(history);
  const withBoostRows = runVariant(scored, true);
  const withoutBoostRows = runVariant(scored, false);
  const withBoost = metrics(withBoostRows);
  const withoutBoost = metrics(withoutBoostRows);
  const fetchedAtCounts = {};
  for (const row of scored) {
    const key = row.fetchedAt || 'missing';
    fetchedAtCounts[key] = (fetchedAtCounts[key] || 0) + 1;
  }
  const maxSimplexError = Math.max(...withBoostRows.concat(withoutBoostRows).map((row) =>
    Math.abs(row.pH + row.pD + row.pA - 1)
  ));
  const leagues = {};
  for (const league of ['J1', 'J2', 'J3']) {
    const withLeague = withBoostRows.filter((row) => row.competition === league);
    const withoutLeague = withoutBoostRows.filter((row) => row.competition === league);
    leagues[league] = {
      withBoost: withLeague.length ? metrics(withLeague) : null,
      withoutBoost: withoutLeague.length ? metrics(withoutLeague) : null
    };
  }
  return {
    cohort: {
      totalHistoryRows: history.length,
      validScoredRows: scored.length,
      evaluationRows: withBoostRows.length,
      evaluationDates: new Set(withBoostRows.map((row) => row.date)).size,
      firstEvaluationDate: withBoostRows[0]?.date || null,
      lastEvaluationDate: withBoostRows.at(-1)?.date || null,
      uniqueMatchIds: new Set(withBoostRows.map((row) => row.matchId)).size,
      pairedCohortExact: withBoostRows.length === withoutBoostRows.length &&
        withBoostRows.every((row, index) => row.matchId === withoutBoostRows[index].matchId && row.actual === withoutBoostRows[index].actual),
      fetchedAtCounts,
      maxProbabilitySimplexError: maxSimplexError
    },
    withBoost,
    withoutBoost,
    withoutMinusWith: {
      logLoss: withoutBoost.logLoss - withBoost.logLoss,
      brier: withoutBoost.brier - withBoost.brier,
      accuracy: withoutBoost.accuracy - withBoost.accuracy
    },
    bootstrap: pairedDateBlockBootstrap(withBoostRows, withoutBoostRows, reps, seed),
    leagues
  };
}

function main() {
  const inputPath = process.argv[2];
  if (!inputPath) {
    throw new Error('usage: node scripts/research/toto13_t2_current_cut.js <path-to-gpt-data-history.json> [reps] [seed]');
  }
  const reps = process.argv[3] ? Number(process.argv[3]) : 10000;
  const seed = process.argv[4] ? Number(process.argv[4]) : 7;
  const parsed = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
  const result = computeT2(parsed.history, { reps, seed });
  result.input = { path: inputPath, reps, seed };
  process.stdout.write(JSON.stringify(result, null, 2) + '\n');
}

if (require.main === module) main();

module.exports = {
  createPythonRandom,
  prepareHistory,
  predictT2,
  runVariant,
  metrics,
  pairedDateBlockBootstrap,
  computeT2
};
