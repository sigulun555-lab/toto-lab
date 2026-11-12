#!/usr/bin/env python3
"""試験（shadow）用：欠場・負傷情報の確認状況を回ごとに集計する。

使い方：
  python3 -I scripts/injury_shadow_check.py 1672
  （data/injury_status/round_1672.jsonl を読み、試合ごとの確認状況を表示する）

本番の予想は変更しない。読み取りと集計のみ。
"""
import json
import os
import sys
from collections import defaultdict

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
STATUSES = {"confirmed_out", "confirmed_available", "unknown"}


def load(round_no):
    path = os.path.join(ROOT, "data", "injury_status", f"round_{round_no}.jsonl")
    if not os.path.exists(path):
        return None, []
    rows = []
    with open(path, encoding="utf-8") as f:
        for lineno, line in enumerate(f, 1):
            line = line.strip()
            if not line:
                continue
            r = json.loads(line)
            if r.get("status") not in STATUSES:
                raise SystemExit(f"{path}:{lineno} status が不正: {r.get('status')}")
            if not r.get("sourceUrl") or not r.get("sourceAt"):
                raise SystemExit(f"{path}:{lineno} 出典（sourceUrl / sourceAt）がありません")
            rows.append(r)
    return path, rows


def summarize(rows):
    by_match = defaultdict(lambda: defaultdict(int))
    for r in rows:
        by_match[r["matchNumber"]][r["status"]] += 1
    out = []
    for m in sorted(by_match):
        c = by_match[m]
        flag = "確認不十分" if c.get("unknown", 0) > 0 else "確認済み"
        out.append({
            "matchNumber": m,
            "confirmed_out": c.get("confirmed_out", 0),
            "confirmed_available": c.get("confirmed_available", 0),
            "unknown": c.get("unknown", 0),
            "flag": flag,
        })
    return out


def main():
    if len(sys.argv) != 2:
        raise SystemExit("使い方: injury_shadow_check.py <回番号>")
    round_no = sys.argv[1]
    path, rows = load(round_no)
    if path is None:
        print(f"第{round_no}回：情報ファイルはまだありません（data/injury_status/round_{round_no}.jsonl）")
        return
    if not rows:
        print(f"第{round_no}回：記録が0件です")
        return
    for s in summarize(rows):
        print(f"試合{s['matchNumber']}: 欠場{s['confirmed_out']} / 出場確認{s['confirmed_available']} / 不明{s['unknown']} → {s['flag']}")


if __name__ == "__main__":
    main()
