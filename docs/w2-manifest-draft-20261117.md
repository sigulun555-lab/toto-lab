# T1 W2 凍結manifest（下書き・未凍結）

- 作成日: 2026-11-17（Claude側、自動作業）
- 状態: **DRAFT。凍結ではありません。** W2の最初の対象予測スナップショットより前に、入力を確定してから凍結する予定です。
- 対象: toto13 / T1（k=0/6/10、window12の既存shadowとは別arm）。GOAL3とは別トラック。
- 本番モデル、本番予測、予測ログ、市場重みには変更を加えていません。

## 1. 入力（SHA-256、記録時点）

| 役割 | パス | 参照 | SHA-256 |
|---|---|---|---|
| 予測保存 | scripts/save_prediction.js | main 6ea5d8f | f0ce5f8f0744e8e4ceb9fcc0ee7322ced59da4cc3aea8420afab10171ecac8bc |
| 採点 | scripts/score_predictions.js | main 6ea5d8f | b662143bd0f11cfd6db97cf6b4d4c4431525e870bdb11f301ec1a3e1507f0888 |
| Claude V2ロジック | scripts/claude_v2_logic.js | main 6ea5d8f | 2e24723b63608b2a787e8227980524624cabecef4184f2c2cacab818a8cbd893 |
| nested holdout | scripts/nested/nested_holdout.py | claude/nested-k-holdout-20261113 1ba3733 | 9fea717ebc842e96384109f6d91c58e985cbfa925e5e4d46dc7abee73c1b0c56 |
| rev2コア | scripts/nested/rev2_core.py | 同上 | 1dd99eda563b40e8b8e7ad5fcb971843493234c424eed9ebb841e263bd9c1f08 |
| 履歴（GPT main由来） | scripts/t1_t2/history_gpt_main_45295867.json | 同上 | e194e6000f4b42b304be907284045fa4d673a33afeabcad057eda8ef38654bcd |

未確定の入力: 締切・kickoffの一覧、team aliases、fixture/schedule、実行環境（依存関係のバージョン）、予測snapshotの参照。これらは凍結前に記録します。

## 2. 受入条件の現状（GPT側の6項目に対応）

1. W2の前向き対象の限定（締切前・kickoff前に保存された試合のみ）: 未実装
2. 凍結manifest（上記SHAと、round、試合ID、締切、kickoff、snapshot参照）: 本書は下書き。未凍結
3. 再現CLI（clean checkoutから一意のコマンド、fail-closed検証）: 未実装
4. bootstrap（PCG64、seed=20261115、50,000回、2日付circular block）: 未実装（現行 nested_holdout.py は random.Random(1) / 10,000回のため、感度分析としてのみ扱う）
5. 比較出力（固定k=0/6/10、内側選択k、LogLoss主・Brier副・Accuracy参考、各窓のn・日付数・リーグ別件数）: 未実装
6. テスト/CI（数値再現、窓境界、point-in-time、重複・欠測、出力先）: 未実装

## 3. 次の作業

- 入力の確定（締切・kickoff・aliases・依存関係）を記録し、凍結可能な版にする
- 再現CLIの骨格とbootstrapの実装、テストの追加
- 既存の291試合の数値を再現して照合（LogLoss 1.0572 / k=0 1.1267 が再現されるか）
- ブランチ上のCIを確認し、GPTさんへ独立照合を依頼

## 4. 注意

- 既存shadow（V0=k6/window12、V1候補=k10/window12、baseline=k0/window12）は変更しません。
- 締切を過ぎた回の予測は作り直しません。W1（11/16開始）の最初の対象は、受入条件を満たせないため記述統計のみとする方針です。
