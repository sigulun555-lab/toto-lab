# 第1675回 toto13 初回V1 PRの範囲

- このPRは初回V1の13行、初回manifest、01:55 JST team-news audit、および実際のGPT exported model reproductionのみを保持する。
- 初回V1は2026-11-25 17:29 JST取得の512件historyに基づく。第1674回の11/25 19:00 JST開始試合の完了結果は含まれない。
- そのため、最新historyを反映した13行のappend-only revisionは別PR #140に分離した。
- このPRの初回V1 JSONLは変更していない。refresh用CSV/script/workflowはこのPRから除去済み。
- PR #140はこのPRのprediction IDsをrevisionOf参照元としているため、#140を先にマージしないこと。
- cleanup後のこのPRのCIは今回の新しいrunで再確認する。過去の探索run #13 failureは履歴に残り、成功扱いしない。
