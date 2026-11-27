# 第1675回 toto13 V1 revision review

- Original V1 in PR #139 was generated at 2026-11-26 02:13 JST from the pinned GPT history snapshot fetched at 2026-11-25 17:29 JST.
- The official round-1674 fixtures kicked off at 2026-11-25 19:00 JST; therefore that input snapshot preceded those results.
- Frozen community mirror snapshot retrieved at 2026-11-26 02:28:54 JST parses through the existing pinned parser into 537 completed matches, including 27 on 2026-11-25 and 25 matches newly available versus the prior 512-row history.
- The mirror is not an official J.League feed. Its blob SHA-1 is `3ddebaf4eeef4195ae89e942974bc3c505aa3235`.
- This PR creates a separate 13-row append-only V1 revision with `revisionOf` links to PR #139. The original V1 file is not modified.
- The revision calls the actual exported `predict(history, fixture)` from GPT commit `a678a296a13eea4beec142083107e69ffda2fed4`; no market blend is used.
- Team availability audit from 01:55 JST is carried forward and remains incomplete. No manual injury or lineup probability adjustment is applied.
- The V1 remains an experimental, uncalibrated baseline; no adoption decision follows from this revision.
