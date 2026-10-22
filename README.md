# toto-lab

ChatGPT / Claude の toto 予測を、同じ試合・締切・採点基準で比較する共有基盤。

## 現在の段階
- 公式クラブ名称の基準リストを `data/teams.json` に保存（60クラブ、別名辞書を統合済み）。
- 予測ログの保存（`scripts/validate_prediction.js`）・採点（`scripts/score_predictions.js`）を実装済み。
- API予測生成・試合結果取得は、データ源とSecretsの設定が完了するまで有効化しない。
- モデルの補正（例：シュリンケージ）は比較結果が蓄積するまで本番採用しない。

## 統合について（2026-10-22）
以前、`toto_compare/` 配下に別系統の実装（チーム名辞書・検証スクリプト・採点スクリプト）が
並行して存在していましたが、ルート直下を正式な基盤として一本化しました。
`toto_compare/` で検証済みだった機能（全60クラブの照合、正規名称統一ロジック、
revisionOfによる修正履歴、採点ロジック）はすべてこのルート直下の実装に統合されています。
`toto_compare/` は重複のため削除対象です（詳細は本READMEの末尾「移行・重複ファイルについて」を参照）。

## 正式名称の根拠
Jリーグ公式「2026特別シーズン、2026/27シーズン クラブ編成」
https://www.jleague.jp/news/article/32852/

`data/teams.json` の `canonical` は公式資料の表記をそのまま採用します（全角・半角も公式表記通り）。
NFKC正規化（全角→半角などの一意な機械的変換）は `aliases` との照合処理の内部処理に限り、
`canonical` 自体を書き換えることはありません。曖昧な略称や辞書に無い表記は推測で対応づけず、
`unresolved`/`unresolvedTeamNames` として明示的に報告します（詳細は「チーム名解決の方針」参照）。

## チーム名解決の方針
- `data/teams.json` の `clubs[].canonical` と `clubs[].aliases[]`（NFKC正規化した形も含む）に
  完全一致する表記のみを、そのクラブへの変換として認めます。
- 一意に確認できていない短縮名（例：「栃木」「横浜」のように複数クラブに当てはまりうる表記）は
  `aliases` に登録しません。登録済みの `aliases` は、gpt側 `history.json` の実データ表記、または
  Claude側アプリ `teamDatabase` の表記（旧クラブ名を含む）を、`jleague.jp` の個別クラブURLスラッグで
  同一クラブであることを確認した上で登録したものです（推測統合はしていません）。
- `claudeAppSupported: false` の4クラブ（ギラヴァンツ北九州・奈良クラブ・ＦＣ岐阜・ＳＣ相模原）は、
  正規名称への変換自体は可能ですが、Claude側アプリの `teamDatabase` に対応エントリが無いため
  Claude側の予測を生成できません（名称解決の問題ではなくアプリの対応クラブ範囲の問題です）。
- `claudeNameDiscrepancyNote` がある2クラブ（京都サンガF.C.／ザスパ群馬）は、Claude側アプリの
  表記が公式の現行名と異なっていた（旧称・略称）ことを、`jleague.jp` のURLスラッグ一致で確認済みの
  ものです。
- 過去シーズンのデータに適用する場合、この60クラブ一覧は「2026特別シーズン、2026/27シーズン
  クラブ編成」時点のものである点に注意してください。改称・昇降格によって当時の所属リーグ・
  クラブ名が異なる場合があるため、機械的な現行名への置換は行っていません。本辞書は
  「表記が同一クラブを指すかどうか」のみを保証します。

## totoGOAL3（指定3試合・チーム別得点バケット方式）について（2026-10-22）
`schemas/prediction.schema.json`（上記の確率キー1/0/2）は、通常toto（13試合、ホーム勝ち/
引き分け/アウェイ勝ちの「1X2」で当落が決まる）を前提に設計したものでした。しかし
東海林さんのtotoGOAL3アプリ（本番モデル）の実コードとtoto公式投票ページ（toto-dream.com）を
確認したところ、**totoGOAL3は1X2ではなく「指定された試合ごとに、ホーム・アウェイそれぞれの
チームの自チーム得点数（0点/1点/2点/3点以上の4択）を当てる」商品**であることが判明しました
（toto公式サイトも1試合をhome/away別の2投票対象として扱っています）。

このため、totoGOAL3用に別スキーマ・別スクリプト群を追加し、既存の1X2用スキーマ・スクリプトは
変更せずそのまま並存させています（一方を他方に無理に合わせていません）。

- `schemas/prediction_goal3.schema.json`：1レコード＝1試合の片側チーム
  （`team`/`opponent`/`isHome` + `probabilities`は`"0"/"1"/"2"/"3"`の4キー、合計1）。
  1試合につきhome側・away側の2レコードを保存する。
- `scripts/validate_prediction_goal3.js` / `scripts/save_prediction_goal3.js`：
  保存先は `predictions/round_<開催回>_<ChatGPT|Claude>_goal3.jsonl`
  （1X2用の`round_<開催回>_<model>.jsonl`とは別ファイル）。検証ルール
  （締切判定・predictionId重複防止・追記専用・チーム名解決の方針）は1X2用と同じ。
- `scripts/score_predictions_goal3.js`：採点は1X2用と**同じ`results/*.jsonl`を共用**する
  （1試合の結果はhomeGoals/awayGoalsが分かればどちらの採点にも十分なため、totoGOAL3専用の
  結果ログは別に持たない）。実際の得点は3点以上を"3"バケットにまとめて判定する。
  Brier scoreは「4クラスの二乗誤差の合計」方式で、1X2の`"sum-of-3-squares"`とは別物であることを
  明示するため`"brierConvention": "sum-of-4-squares (no division)"`を出力に明記する。

本番アプリ側の`predictScore()`は内部でシミュレートした期待得点（`finalHomeGoals`/
`finalAwayGoals`）から`calculateScoreProbabilities()`（totoGOAL3用）と`calculateOutcomeProbabilitiesV2()`
（1X2用、`outcomeV2`）の両方を導出できる設計のため、将来通常toto（13試合）の回を比較する場合は
既存の1X2スキーマを、totoGOAL3の回を比較する場合はこちらを使う。

## 予測レコードの原則（`schemas/prediction.schema.json`）
- 確率キー: `1`=ホーム勝ち、`0`=引き分け、`2`=アウェイ勝ち。確率は0〜1、合計は許容誤差0.002以内で1。
- `predictionConfirmedAt` と `deadlineAt` はUTC ISO8601（Z終端）。`predictionConfirmedAt >= deadlineAt`
  は保存時点で拒否する（締切後確定を記録自体させない）。
- `predictionId` の重複は拒否する。
- 予測ログは追記専用（`fs.appendFileSync` のみ使用）。修正時は新しい `predictionId` を発行し、
  `revisionOf` に元の `predictionId` を設定した**新しいレコード**として追記する
  （既存レコードは一切書き換えない）。
- `modelName` は `"ChatGPT"` または `"Claude"` に統一する。
- `corrections`（本番モデルの補正値スナップショット）・`dataSource`（予測値の出典）は任意フィールド。
  スキーマは `additionalProperties: false` のため、未定義のフィールドは拒否される。
- 結果（`results/*.jsonl`）は予測ログとは別ファイルに保存する。

## スクリプト

### `scripts/save_prediction.js`（運用時はこちらを使う）
予測レコード（JSON）1件から `round` と `modelName` を読み取り、保存先ファイルパス
`predictions/round_<開催回>_<ChatGPT|Claude>.jsonl` を自動的に決定して追記する。
内部で `validate_prediction.js` の `appendPrediction()` を呼ぶため、検証ルール
（スキーマ・締切・重複防止・追記専用）はすべてそのまま適用される。

```sh
node scripts/save_prediction.js new_record.json
# => record.round=1665, record.modelName="ChatGPT" なら
#    predictions/round_1665_ChatGPT.jsonl に自動で追記される
```

ファイルパスを手で組み立てる必要がなくなるため、「別ラウンド・別モデルのログに
間違って書き込む」というヒューマンエラーを構造的に防ぐ。`modelName` が
`"ChatGPT"`/`"Claude"` 以外の場合は、ファイルパスの決定自体がエラーになる
（推測でファイル名を作らない）。

### `scripts/validate_prediction.js`
予測レコードをスキーマ・締切・重複・チーム名解決の観点で検証し、問題なければJSONLログに1行追記する。
`save_prediction.js` が内部で使う下位レイヤーだが、ファイルパスを直接指定したい場合はこちらも使える。

```sh
node scripts/validate_prediction.js predictions/round_<開催回>_ChatGPT.jsonl new_record.json
```

チーム名が `data/teams.json` で解決できない場合も**保存自体は拒否しません**（warningのみ）。
解決できなかった予測は、採点時に `score_predictions.js` が推測補完せず除外し、理由を報告します。
これは「予測ログの保存」と「採点対象にするかどうかの判断」を分離するための設計です。

### `scripts/score_predictions.js`
`predictions/*.jsonl` と `results/*.jsonl`（またはファイル1本）を読み込み、モデル別・
モデル×バージョン別・モデル×リーグ別に Accuracy / Brier score / Log loss を集計する。

```sh
node scripts/score_predictions.js predictions results report.json
```

- 試合の照合は、`homeTeam`/`awayTeam` をまず `data/teams.json` の正規名称に変換したうえで、
  `round + matchNumber + 正規化後のhomeTeam + awayTeam` の完全一致でのみ行う。
- 正規名称に変換できないチームが絡む予測は `unresolvedTeamNames` に理由・件数とともに記録し、
  採点対象から除外する（推測補完なし）。
- 正規名称への変換はできても一致する結果レコードが無い場合は `unresolved` に記録して除外する。
- 同一試合・同一モデルに複数の修正履歴（`revisionOf`）がある場合、締切前の最終確定予測のみを使う。
- Brier score は「3クラスの二乗誤差の合計」方式（除算なし）。出力に
  `"brierConvention": "sum-of-3-squares (no division)"` を明記する
  （`sigulun555-lab/gpt` の `data/backtest.json` と同じ方式で、比較可能性のために揃えている）。

### `scripts/check_teams.js`
`data/teams.json` の構造チェック（60クラブ・J1/J2/J3各20・短縮名の衝突検知）。

### totoGOAL3用（`scripts/save_prediction_goal3.js` / `validate_prediction_goal3.js` / `score_predictions_goal3.js`)
上記「totoGOAL3について」の節を参照。使い方は1X2用と同じ形：

```sh
node scripts/save_prediction_goal3.js new_record.json
# => predictions/round_<開催回>_<ChatGPT|Claude>_goal3.jsonl に自動で追記される

node scripts/score_predictions_goal3.js predictions results report_goal3.json
```

## テスト
```sh
npm test            # tests/test.js + tests/test_predictions.js + tests/test_save_prediction.js
                     # + tests/test_predictions_goal3.js + tests/test_save_prediction_goal3.js
npm run check:teams # scripts/check_teams.js
```
GitHub Actions（`.github/workflows/validate.yml`）が `main` への push / PR で自動実行する。

## examples/
`examples/predictions/` と `examples/results/` はスキーマ・採点ロジックの使い方を示すサンプル
（架空のテストデータ、`round: 9999` は実在しない開催回）。実データは、このリポジトリ直下の
`predictions/` と `results/` に保存する。

## Secrets（後で設定）
- `OPENAI_API_KEY`
- `ANTHROPIC_API_KEY`

このリポジトリは公開設定で作られているため、個人情報、トークン、APIキーを絶対にコミットしないこと。

## 変更していないもの
- ChatGPT側・Claude側の本番予測モデル・補正ロジック（Dixon-Coles、ドロー補正、シュリンケージ等）
- Claude側アプリの画面・UI、ChatGPT側 `model.js` / `app.js` 等の既存ファイル

## 移行・重複ファイルについて（2026-10-22）
`toto_compare/` 配下のファイルは、このルート直下の実装に機能を統合した結果、重複となっています。
このリポジトリのどのファイルも `toto_compare/` を参照していないことを確認した上で、
次のファイルの削除を提案します（本READMEをコミットする変更とは別のコミットで削除してください）。

- `toto_compare/team_name_dictionary.json` → `data/teams.json` に統合済み
- `toto_compare/scripts/validate_prediction.js` → `scripts/validate_prediction.js` に統合済み
- `toto_compare/scripts/score_predictions.js` → `scripts/score_predictions.js` に統合済み
- `toto_compare/tests/test_toto_compare.js` → `tests/test_predictions.js` に統合済み
- `toto_compare/predictions/`, `toto_compare/results/` → `examples/` のサンプルに置き換え済み
- `toto_compare/README.md` → 本READMEに統合済み
