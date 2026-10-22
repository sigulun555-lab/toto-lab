# examples/

このフォルダのファイルは、スキーマ・採点ロジックの使い方を示すための**サンプル（架空のテストデータ）**です。
実際の予測ログ・結果ログは `predictions/` と `results/` に保存してください（このフォルダは
`scripts/score_predictions.js` の既定の読み込み対象から外れています）。

予測と結果は本番と同じく別ディレクトリに分けています（同じディレクトリに混在させると、
結果ファイルが予測ログとして誤って読み込まれるため）。

- `predictions/example_ChatGPT.jsonl` / `predictions/example_Claude.jsonl` — 予測レコードのサンプル（revisionOfによる修正履歴の例を含む）
- `results/example_results.jsonl` — 試合結果レコードのサンプル

実データを使った動作確認は以下のコマンドで行えます。

```sh
node scripts/score_predictions.js examples/predictions examples/results
```
