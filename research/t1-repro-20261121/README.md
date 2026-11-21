# toto13 / T1 429-row reproduction guard

Research-only wrapper around Claude's unchanged
\`scripts/t1_t2/repro_v1_20261121.py\`.

Pinned input:
- Repository: \`sigulun555-lab/gpt\`
- Commit: \`2309d08e3a449c9271fa3194ccf3fbc4799f9215\`
- File: \`data/history.json\`
- Git blob: \`fb6f11ec4ceae82c2c610891a1c294f2aa8f38bd\`
- SHA-256: \`29b1cb2110b91a8a8d1f1bc5ced504b3dd8a0e86ee3beddb111a5f2309af4f19\`
- Expected rows/dates: 429 / 37
- Observed date range: 2026-08-07 through 2026-11-03
- Single fetchedAt: 2026-11-04T06:17:32.213Z

The wrapper checks the pinned input hash, row count, cutoff, date range,
fetchedAt provenance, duplicate match keys, and the exact Git blob of the
Claude script before executing it. It then checks the four published
k=0/6/8/10 window-12 metrics, all three additional k6 window variants'
cohort sizes, and the 5,000-replicate k10-minus-k6 date-block bootstrap
summary.

This is retrospective ordinary toto13 1X2 T1 research. It is not GOAL3,
mini toto A/B, a current-round forecast, a production model, or a shadow
artifact. It does not write prediction logs or modify model/market weights.
