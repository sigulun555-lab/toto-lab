import assert from "node:assert/strict";
import { parseScheduleHtml } from "../scripts/fetch_toto_round.js";

function table(rows) {
  return `<table><tr><th>ホーム</th><th></th><th>アウェイ</th></tr>${rows.map(([home, away]) => `<tr><td>${home}</td><td>vs</td><td>${away}</td></tr>`).join("")}</table>`;
}
const pairs = (prefix, count) => Array.from({ length: count }, (_, i) => [`${prefix} Home ${i + 1}`, `${prefix} Away ${i + 1}`]);

const html = [
  "<h2>toto</h2>", table(pairs("toto", 13)),
  "<h2>mini toto-A組</h2>", table(pairs("A", 5)),
  "<h2>mini toto-B組</h2>", table(pairs("B", 5)),
  "<h2>totoGOAL3</h2>", table(pairs("goal", 3))
].join("");

const result = parseScheduleHtml(html, 1668, "https://example.test/1668");
assert.equal(result.round, 1668);
assert.equal(result.groups.toto.matches.length, 13);
assert.equal(result.groups.miniTotoA.matches.length, 5);
assert.equal(result.groups.miniTotoB.matches.length, 5);
assert.equal(result.groups.totoGoal3.matches.length, 3);
assert.equal(result.groups.toto.matches[0].home, "toto Home 1");
assert.throws(() => parseScheduleHtml(html.replace("toto Home 13", "missing"), 1668), /expected 13 matches/);
console.log("toto round parser tests passed");
