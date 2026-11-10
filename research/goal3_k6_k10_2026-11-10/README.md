# GOAL3 k=6 vs k=10 (research only)

Reproduces the 17-date outer evaluation of PR #19 (2026-only training, fixed k=6 and k=10)
and computes the date-block bootstrap (10,000 resamples, seed 1, percentile 95%).
Input: PR #19 snapshot of verification/goal3_independent and data/history.json (sha256 efca00ea...), data/team_aliases.json (sha256 92e63770...).
Run: python3 -I analysis.py (expects PR #19 files at a local path; see MOD_DIR in the script).
Results: 472 team-side targets / 236 matches / 17 dates.
D = score(k6) - score(k10); D < 0 means k=6 better. Research only: no production change.
