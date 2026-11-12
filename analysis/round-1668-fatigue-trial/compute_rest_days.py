#!/usr/bin/env python3
"""
第1668回 疲労/休養日数トライアル用の再現可能な集計スクリプト。

データソース: sigulun555-lab/gpt の data/history.json
  (community_jleague_csv由来、J1/J2/J3、2026-08-07〜10-25、380試合、xGなし)

用語の定義（重要・GPTからの指摘を反映）：
  - calendar_day_gap : 同一チームの前試合日から対象試合日までの「暦日差」。
                        例: 10/21開催 → 10/25開催 なら calendar_day_gap = 4。
  - rest_days_between_matches : サッカーで言う「中N日」。間にある休養日数。
                        rest_days_between_matches = calendar_day_gap - 1。
                        例の場合 "中3日" = 3。

旧集計（このスクリプトの前のバージョン）では calendar_day_gap をそのまま
「中N日」として扱っていたため、1日分ずれていた（GPTの独立検証で指摘）。
本スクリプトでは両方の値を列として保存し、"中N日"の判定は必ず
rest_days_between_matches を使う。
"""
import json
import datetime
import math
import csv
import sys
from collections import defaultdict

GPT_HISTORY_PATH = sys.argv[1] if len(sys.argv) > 1 else "/home/claude/gpt/data/history.json"
OUT_CSV = sys.argv[2] if len(sys.argv) > 2 else "rest_days_table.csv"


def load_rows(history_path):
    h = json.load(open(history_path, encoding="utf-8"))["history"]
    h = [r for r in h if r.get("date") and r.get("home_goals") is not None and r.get("away_goals") is not None]

    team_matches = defaultdict(list)
    for r in h:
        d = datetime.date.fromisoformat(r["date"])
        team_matches[r["home"]].append((d, r["home_goals"], r["away_goals"], r["competition"]))
        team_matches[r["away"]].append((d, r["away_goals"], r["home_goals"], r["competition"]))
    for t in team_matches:
        team_matches[t].sort(key=lambda x: x[0])

    rows = []
    for team, matches in team_matches.items():
        for i in range(1, len(matches)):
            d, gf, ga, comp = matches[i]
            calendar_day_gap = (d - matches[i - 1][0]).days
            rest_days_between_matches = calendar_day_gap - 1
            pts = 3 if gf > ga else (1 if gf == ga else 0)
            rows.append({
                "team": team,
                "date": str(d),
                "calendar_day_gap": calendar_day_gap,
                "rest_days_between_matches": rest_days_between_matches,
                "comp": comp,
                "gf": gf,
                "ga": ga,
                "gd": gf - ga,
                "pts": pts,
            })
    return rows


def mean(xs):
    return sum(xs) / len(xs)


def sd(xs):
    if len(xs) < 2:
        return float("nan")
    m = mean(xs)
    return math.sqrt(sum((x - m) ** 2 for x in xs) / (len(xs) - 1))


def bucket(rest_days_between_matches):
    r = rest_days_between_matches
    if r <= 3:
        return "short(<=3)"
    if r in (4, 5):
        return "mid(4-5)"
    if 6 <= r <= 8:
        return "long_core(6-8)"
    return "long_outlier(9+)"


def pooled_compare(group_a, group_b, key="gd"):
    a = [r[key] for r in group_a]
    b = [r[key] for r in group_b]
    ma, mb = mean(a), mean(b)
    se = math.sqrt(sd(a) ** 2 / len(a) + sd(b) ** 2 / len(b))
    diff = ma - mb
    return {
        "n_a": len(a), "n_b": len(b), "mean_a": ma, "mean_b": mb,
        "diff": diff, "se": se,
        "ci95": (diff - 1.96 * se, diff + 1.96 * se),
    }


def team_paired_compare(rows, bucket_a_name, bucket_b_name, key="gd"):
    """同一チームが両方のバケットを経験している場合だけ使う、チーム内ペア比較。
    チーム力や対戦相手の強さの違いを部分的に打ち消し、同一チームの行が
    複数混ざることによる疑似的な独立性の問題にも、チームごとに1つの差へ
    集約することで一定の対処になる（完全なクラスタ標準誤差ではない点は限界として明記）。
    """
    team_rows = defaultdict(lambda: {"a": [], "b": []})
    for r in rows:
        b = bucket(r["rest_days_between_matches"])
        if b == bucket_a_name:
            team_rows[r["team"]]["a"].append(r[key])
        elif b == bucket_b_name:
            team_rows[r["team"]]["b"].append(r[key])

    diffs = []
    detail = []
    for team, d in team_rows.items():
        if d["a"] and d["b"]:
            ma, mb = mean(d["a"]), mean(d["b"])
            diffs.append(ma - mb)
            detail.append((team, len(d["a"]), len(d["b"]), round(ma, 3), round(mb, 3), round(ma - mb, 3)))

    n = len(diffs)
    m = mean(diffs)
    s = sd(diffs)
    se = s / math.sqrt(n)
    return {
        "n_teams": n, "mean_diff": m, "sd": s, "se": se,
        "ci95": (m - 1.96 * se, m + 1.96 * se),
        "detail": detail,
    }


def main():
    rows = load_rows(GPT_HISTORY_PATH)

    with open(OUT_CSV, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=["team", "date", "calendar_day_gap",
                                           "rest_days_between_matches", "comp", "gf", "ga", "gd", "pts"])
        w.writeheader()
        for r in rows:
            w.writerow(r)

    buckets = defaultdict(list)
    for r in rows:
        buckets[bucket(r["rest_days_between_matches"])].append(r)

    print(f"total rows: {len(rows)}")
    for b in ["short(<=3)", "mid(4-5)", "long_core(6-8)", "long_outlier(9+)"]:
        rs = buckets[b]
        if not rs:
            continue
        print(f"{b}: n={len(rs)} mean_gd={mean([r['gd'] for r in rs]):.4f} mean_pts={mean([r['pts'] for r in rs]):.4f}")

    print("\n[pooled comparison] short(<=3) vs long_core(6-8), key=gd")
    res = pooled_compare(buckets["short(<=3)"], buckets["long_core(6-8)"], key="gd")
    print(res)

    print("\n[team-paired comparison] short(<=3) vs long_core(6-8), key=gd")
    res2 = team_paired_compare(rows, "short(<=3)", "long_core(6-8)", key="gd")
    print({k: v for k, v in res2.items() if k != "detail"})

    print("\n[pooled comparison] short(<=3) vs long_core(6-8), key=pts")
    res_pts = pooled_compare(buckets["short(<=3)"], buckets["long_core(6-8)"], key="pts")
    print(res_pts)

    print("\n[team-paired comparison] short(<=3) vs long_core(6-8), key=pts")
    res2_pts = team_paired_compare(rows, "short(<=3)", "long_core(6-8)", key="pts")
    print({k: v for k, v in res2_pts.items() if k != "detail"})

    # sanity check for round 1668's actual case: calendar_day_gap should be 4 (10/21 -> 10/25)
    example = [r for r in rows if r["team"] in ("水戸", "広島", "名古屋", "C大阪", "横浜FM", "浦和")
               and r["date"] == "2026-10-25"]
    print("\n[round 1668 fatigue-relevant teams, their 10/25 match record]:")
    for r in example:
        print(r)


if __name__ == "__main__":
    main()
