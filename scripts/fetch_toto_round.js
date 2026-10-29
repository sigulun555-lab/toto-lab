#!/usr/bin/env node
import fs from "node:fs/promises";

const ROUND = process.env.TOTO_ROUND || process.argv[2] || "";
const OUTPUT = process.env.TOTO_OUTPUT || "artifacts/toto-round.json";
const SOURCE_TEMPLATE = process.env.TOTO_SOURCE_URL_TEMPLATE ||
  "https://toto.rakuten.co.jp/toto/vote/voteTotoChoiceSchedule/{round}/";
const GROUPS = [
  { key: "toto", label: "toto", expected: 13 },
  { key: "miniTotoA", label: "mini toto-A組", expected: 5 },
  { key: "miniTotoB", label: "mini toto-B組", expected: 5 },
  { key: "totoGoal3", label: "totoGOAL3", expected: 3 }
];

function decodeEntities(value) {
  return value
    .replace(/&nbsp;|&#160;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'");
}

function cellText(html) {
  return decodeEntities(html
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<[^>]*>/g, " "))
    .replace(/\s+/g, " ")
    .trim();
}

function parseRows(tableHtml) {
  const matches = [];
  for (const rowMatch of tableHtml.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)) {
    const cells = [...rowMatch[1].matchAll(/<t[dh]\b[^>]*>([\s\S]*?)<\/t[dh]>/gi)]
      .map((m) => cellText(m[1]))
      .filter(Boolean);
    if (cells.length < 2) continue;
    const vsIndex = cells.findIndex((cell) => /^vs\.?$/i.test(cell));
    if (vsIndex > 0 && vsIndex < cells.length - 1) {
      const home = cells[vsIndex - 1];
      const away = cells[vsIndex + 1];
      if (home && away && !/^(ホーム|アウェイ|チーム)$/i.test(home)) {
        matches.push({ home, away });
      }
    }
  }
  return matches;
}

export function parseScheduleHtml(html, round, sourceUrl = "") {
  const groupData = {};
  const tableMatches = [...html.matchAll(/<table\b[^>]*>[\s\S]*?<\/table>/gi)];
  for (const tableMatch of tableMatches) {
    const before = html.slice(0, tableMatch.index);
    let group = null;
    let lastIndex = -1;
    for (const candidate of GROUPS) {
      const idx = before.lastIndexOf(candidate.label);
      if (idx > lastIndex) {
        lastIndex = idx;
        group = candidate;
      }
    }
    if (!group) continue;
    const matches = parseRows(tableMatch[0]);
    if (matches.length >= group.expected && !groupData[group.key]) {
      groupData[group.key] = matches.slice(0, group.expected);
    }
  }

  for (const group of GROUPS) {
    const found = groupData[group.key]?.length ?? 0;
    if (found !== group.expected) {
      throw new Error(`Could not safely parse ${group.label}: expected ${group.expected} matches, found ${found}. Source HTML may have changed; refusing to write output.`);
    }
  }

  return {
    schemaVersion: 1,
    round: Number(round),
    fetchedAt: new Date().toISOString(),
    sourceUrl,
    groups: Object.fromEntries(GROUPS.map((group) => [
      group.key,
      { label: group.label, matches: groupData[group.key] }
    ]))
  };
}

async function main() {
  if (!/^\d{4}$/.test(String(ROUND))) {
    throw new Error("Set TOTO_ROUND to a four-digit round number, e.g. 1668.");
  }
  const sourceUrl = SOURCE_TEMPLATE.replace("{round}", encodeURIComponent(String(ROUND)));
  const response = await fetch(sourceUrl, {
    headers: { "user-agent": "toto-lab-round-data-verifier/1.0 (GitHub Actions)" },
    signal: AbortSignal.timeout(20000)
  });
  if (!response.ok) throw new Error(`Source request failed: HTTP ${response.status} (${sourceUrl})`);
  const html = await response.text();
  if (html.length < 1000) throw new Error("Source response was unexpectedly short; refusing to parse.");

  const data = parseScheduleHtml(html, ROUND, sourceUrl);
  await fs.mkdir("artifacts", { recursive: true });
  await fs.writeFile(OUTPUT, JSON.stringify(data, null, 2) + "\n", "utf8");
  console.log(`Validated round ${ROUND}: toto=13, mini toto A=5, mini toto B=5, totoGOAL3=3`);
  console.log(`JSON written to ${OUTPUT}`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
