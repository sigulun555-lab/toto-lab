# 第1670回 totoGOAL3 締切メタデータ訂正（append-only）

- 監査確認時刻：2026-11-05 17:38:10 JST
- 公式根拠：https://store.toto-dream.com/dcs/subos/screen/pi01/spin000/PGSPIN00001DisptotoLotInfo.form?holdCntId=1670
- 公式ページでは、第1670回 toto および totoGOAL3 のネット決済販売終了は **2026-11-07 12:50 JST**。mini toto-B組のみ **13:50 JST**。
- 既存ファイル `round_1670_2026-11-05T0944JST_official.jsonl` の6行は `deadlineAt=2026-11-07T13:50:00+09:00` と記録されているが、これは誤り。
- 既存09:44スナップショットは改変・削除しない。本訂正記録により、同スナップショットの正しいGOAL3締切は **12:50 JST** と明示する。
- 14:40 JSTスナップショットおよび17:36 JSTスナップショットは、`deadlineAt=2026-11-07T12:50:00+09:00` で記録。
- 17:36 JSTの公式投票状況ページは同時刻表示の6 team-sideを掲載。各team-sideの投票数合計は37,237口、表示投票率合計は100.00%。取得時刻は2026-11-05 17:38:10 JST。表示時刻と取得時刻を混同しない。

これはメタデータの監査訂正であり、予測値・本番モデル・market weight・main branchは変更しない。
