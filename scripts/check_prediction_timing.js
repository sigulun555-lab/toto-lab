#!/usr/bin/env node
// 締切前記録の検証スクリプト（読み取りのみ・既存データは変更しない）
// 使い方: node scripts/check_prediction_timing.js predictions/round_XXXX_*.jsonl ...
// 判定: 各行の predictionConfirmedAt（なければ predictionCreatedAt）が deadlineAt より前であること。
//       空欄・締切後・締切時刻なし・時刻の解析不能は「不合格」として集計する。
// 終了コード: 不合格が1件でもあれば 1、なければ 0。

const fs = require("fs");

function parseUtc(s) {
  if (!s || typeof s !== "string") return null;
  const t = Date.parse(s);
  return Number.isNaN(t) ? null : t;
}

function checkFile(path) {
  const lines = fs.readFileSync(path, "utf8").split("\n").filter((l) => l.trim());
  const counts = { ok: 0, after_deadline: 0, blank_time: 0, no_deadline: 0, bad_time: 0 };
  const failures = [];
  lines.forEach((line, idx) => {
    let r;
    try { r = JSON.parse(line); } catch (e) { counts.bad_time++; failures.push([idx + 1, "JSON解析不可"]); return; }
    const id = r.predictionId || `line${idx + 1}`;
    const deadline = parseUtc(r.deadlineAt);
    if (deadline === null) { counts.no_deadline++; failures.push([id, "締切時刻なし"]); return; }
    const raw = r.predictionConfirmedAt || r.predictionCreatedAt;
    if (!raw) { counts.blank_time++; failures.push([id, "作成時刻が空欄"]); return; }
    const t = parseUtc(raw);
    if (t === null) { counts.bad_time++; failures.push([id, `時刻を解析できない: ${raw}`]); return; }
    if (t < deadline) { counts.ok++; }
    else { counts.after_deadline++; failures.push([id, `締切後: ${raw}`]); }
  });
  return { counts, failures, total: lines.length };
}

const files = process.argv.slice(2);
if (files.length === 0) {
  console.error("使い方: node scripts/check_prediction_timing.js <jsonl> ...");
  process.exit(2);
}
let anyFail = false;
for (const f of files) {
  const { counts, failures, total } = checkFile(f);
  const bad = total - counts.ok;
  if (bad > 0) anyFail = true;
  console.log(`${f}: 全${total}行 / 合格${counts.ok} / 締切後${counts.after_deadline} / 空欄${counts.blank_time} / 締切時刻なし${counts.no_deadline} / 解析不可${counts.bad_time}`);
  failures.slice(0, 5).forEach(([id, msg]) => console.log(`   - ${id}: ${msg}`));
  if (failures.length > 5) console.log(`   ...ほか${failures.length - 5}件`);
}
process.exit(anyFail ? 1 : 0);
