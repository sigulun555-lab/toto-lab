# toto_compare — Claude版 / ChatGPT版 toto予測 比較基盤

このディレクトリは、Claude版（totoGOAL Artifact）と ChatGPT版（`sigulun555-lab/gpt`）の
予測を「同じ試合・同じ予測時点・同じ採点方法」で公平に比較するための基盤です。

**本番の予測ロジック・補正値（Dixon-Coles、ドロー補正、シュリンケージ、マーケットブレンド等）には
一切変更を加えていません。** この比較基盤は既存の予測生成処理の外側に完全に独立して置かれており、
`sigulun555-lab/gpt` の既存の自動更新ワークフロー（`.github/workflows/update-predictions.yml`、
`scripts/**` `tests/**` `model.js` `app.js` `index.html` `styles.css` `package.json` `data/**` のみを
監視）には一切触れないため、既存のtoto予測アプリの動作に影響しません。

## 1. ディレクトリ構成と各ファイルの役割

```
toto_compare/
├── README.md                          このファイル
├── team_name_dictionary.json          チーム名辞書（検証済み・推測統合なし）
├── scripts/
│   ├── validate_prediction.js         予測レコードの検証 + 追記専用ログへの保存
│   └── score_predictions.js           予測ログ + 結果ログ → 採点レポート生成
├── predictions/
│   ├── example_claude.jsonl           実データによる記入例（Claude側）
│   └── example_chatgpt.jsonl          実データによる記入例（ChatGPT側、修正履歴あり）
├── results/
│   └── example_results.jsonl          実データによる記入例（試合結果、予測とは別ファイル）
└── tests/
    └── test_toto_compare.js           ユニットテスト（10件、すべてpass確認済み）
```

本番で使う際は、ラウンドごとに以下のようなファイルを追加していく想定です（ファイル名は一例、
重要なのは「予測ログと結果ログを物理的に別ファイルにする」ことです）：

```
predictions/round_1665_claude.jsonl
predictions/round_1665_chatgpt.jsonl
results/round_1665_results.jsonl
```

## 2. 予測ログのスキーマ（追記専用 / JSONL）

1行1レコードのJSON Lines形式。**既存の行は一切書き換えない。修正が必要な場合は
新しい `predictionId` を発行し、`revisionOf` に元の `predictionId` を入れた新しいレコードを
末尾に追記する。**

```jsonc
{
  "predictionId": "claude-totoGOAL-v96-r1665-m1-20261023T050000Z", // 一意。重複は保存時に拒否される
  "round": 1665,              // toto開催回
  "matchNumber": 1,           // 開催回内の試合番号
  "homeTeam": "広島",         // ホーム（表記はどちらの生データのものでもよいが、
  "awayTeam": "清水",         //   採点時はround+matchNumber+home+awayの完全一致でのみ照合する）
  "probabilities": {"1": 0.76, "0": 0.13, "2": 0.10}, // "1"=ホーム勝 "0"=ドロー "2"=アウェイ勝。合計=1必須
  "predictionConfirmedAt": "2026-10-23T05:00:00Z",  // 確定時刻。ISO8601 UTC（Z）に統一
  "deadlineAt": "2026-10-24T04:50:00Z",             // 締切時刻。同じくUTC。confirmedAt < deadlineAt必須
  "modelName": "claude",                 // "claude" | "chatgpt" など
  "modelVersion": "totoGOAL-v96",         // 本番採用中の設定を変更したら必ずversion文字列を変える
  "corrections": {                       // その予測を生成した際の補正設定を厳密に記録（監査用）
    "dixonColes": false,
    "drawBoostVariant": "V2",
    "shrinkageSampleTrust": null,
    "marketBlendWeight": null
  },
  "dataSource": "Claude totoGOAL Artifact v96 predictScore()",
  "revisionOf": null          // 修正レコードの場合のみ、元のpredictionIdを入れる。それ以外はnull
}
```

実データでの記入例は `predictions/example_claude.jsonl` / `predictions/example_chatgpt.jsonl` を
参照してください（2026-10-21の実際のJ3公開データ「鹿児島 3-1 高知」に対する、Claude側・ChatGPT側
それぞれの実際のモデル出力を使用した実例です。ChatGPT側は `revisionOf` を使った修正履歴も含みます）。

### なぜJSONLか

配列1個のJSON（`[...]`）にすると、追記のたびにファイル全体を読み直して書き直す必要があり、
「既存の行を絶対に書き換えない」という要件と相性が悪くなります。JSONLなら
`fs.appendFileSync` で末尾に1行足すだけで追記専用が機械的に保証できます。

## 3. 結果ログのスキーマ（予測ログとは別ファイル）

```jsonc
{
  "round": 1665, "matchNumber": 1, "homeTeam": "広島", "awayTeam": "清水",
  "homeGoals": 2, "awayGoals": 1,
  "competition": "J1",                 // J1/J2/J3別の集計に使用
  "finishedAt": "2026-10-24T08:00:00Z",
  "scoredAt": null,                    // 採点を実行した時刻（任意、記録用）
  "source": "..."
}
```

結果レコードは予測レコードを一切参照せず、試合の客観的な結果のみを持ちます。これにより、
予測レコード自体が構造的に「後から結果を知った上で書き換えられる」ことがありません。

## 4. 実装済みスクリプトの挙動

### `scripts/validate_prediction.js`

- `validatePrediction(record, existingIds)` — 構造・時刻・確率・チーム名を検証する純粋関数
- `appendPrediction(logFilePath, record)` — 検証OKの場合のみ1行追記。検証NGなら
  **ファイルには一切書き込まず** `ValidationError` を投げる
- 強制される主なルール：
  - `predictionId` の重複拒否（追記専用ログ内）
  - `predictionConfirmedAt < deadlineAt` を満たさない場合は保存自体を拒否（締切後確定は記録を作らせない）
  - 時刻はISO8601 UTC（`Z`終端）以外を拒否
  - `probabilities` のキーは `"1","0","2"` のみ、合計は1（許容誤差1e-6）
  - `revisionOf` が指す `predictionId` が未知の場合は拒否
  - チーム名が `team_name_dictionary.json` で解決できない場合は、**保存は拒否しないが**
    警告として明示する（`isUnmappedTeam` 的な扱い。推測で統合はしない）

### `scripts/score_predictions.js`

- `predictions/*.jsonl` を全読み込み、`results/<file>.jsonl` と突き合わせて採点する
- 照合キーは **`round + matchNumber + homeTeam + awayTeam` の文字列完全一致のみ**。
  一致しない予測は `unresolved` に明示され、採点対象から除外される（推測補完はしない）
- `predictionConfirmedAt >= deadlineAt` のレコードは二重に防御され、採点対象から除外される
- 同一 `(round, matchNumber, modelName, modelVersion)` に複数の有効レコードがある場合
  （= `revisionOf` による修正履歴がある場合）、**締切前に確定した中で最も新しい1件のみ**を採点に使う
  （古いレコードは `supersededRecords` として報告される）
- Brier scoreは **「3クラスの二乗誤差の合計」方式（0〜2の範囲、1/3で割らない）** を採用。
  これは `sigulun555-lab/gpt` の `data/backtest.json`（`brier=0.7154...`）と同じ方式であり、
  出力には常に `"brierConvention": "sum-of-3-squares (no division)"` を明記する
- モデル別 / モデル×バージョン別 / モデル×リーグ(J1/J2/J3)別 の集計を一度に出力する

### `tests/test_toto_compare.js`

一時ディレクトリ内で以下を実データに近い形で確認する（本番の `predictions/` `results/` には
一切触れない）。**実行結果：10件すべてpass。**

1. 正常なレコードの追記
2. `predictionId` 重複の拒否
3. 締切後確定の保存拒否
4. 確率合計不正の拒否
5. 存在しない `revisionOf` の拒否
6. 正しい修正レコードの追記
7. 修正履歴のうち締切前の最終確定予測のみが採点に使われること
8. チーム名・試合不一致が推測補完されず `unresolved` になること
9. Brier scoreが sum-of-3-squares 方式で正確に算出されること（手計算と照合）
10. リーグ別集計が機能すること

実行方法：
```
node tests/test_toto_compare.js
```

付属の実データ記入例（鹿児島 3-1 高知、2026-10-21）で `score_predictions.js` を実際に動かした
結果も確認済みです：

```
node scripts/score_predictions.js predictions results/example_results.jsonl
```
```
採点対象（締切前の最終確定予測のみ）: 2 件
chatgpt: n=1 accuracy=1.0000 brier=0.0067 logloss=0.0650
claude : n=1 accuracy=1.0000 brier=0.1325 logloss=0.3491
```
（この1試合ではどちらも「ホーム勝」を正しく当てているが、確率の確信度がChatGPT側の方が
結果に近かった、という例。n=1なので何かを結論づけるものではなく、動作確認のための実例）

## 5. チーム名辞書（`team_name_dictionary.json`）について

- `sigulun555-lab/gpt` の `data/history.json` に実際に出現する60チームの表記と、
  Claude側Artifactの `teamDatabase`（56のJリーグチーム、欧州クラブ26は対象外）を
  実データから直接突き合わせて作成（推測統合なし）
- 56チームは `mapping` に `{claudeKey, claudeFullName}` として登録
- **4チームは明示的に未対応（`unmapped`）**: `北九州`（ギラヴァンツ北九州）、`奈良`（奈良クラブ）、
  `岐阜`（FC岐阜）、`相模原`（SC相模原）— いずれもClaude側 `teamDatabase` に未登録であることを
  実際のソースコードを読んで確認済み。これらのチームが絡む試合は、辞書を更新するまで
  比較対象外として扱われる（類似文字列での自動統合は行わない）

## 6. GitHubへの実装に必要な操作（重要な制約）

**このセッション（Claude Cowork）からは `sigulun555-lab/gpt` にも `sigulun555-lab/claude` にも
pushできません。** 今回、`gpt` リポジトリに対しても実際に試験的な `git push` を実行して
再確認しましたが、以下のエラーで拒否されました：

```
remote: access denied by the git proxy: sigulun555-lab/gpt is not in this session's
authorized repository set, so the proxy will not inject a credential for it.
```

これはGitHub側の公開/非公開設定とは無関係の、Anthropic側セッションの権限の問題で、
このセッション内から回避する方法はありません。したがって、以下のいずれかの方法で
人間側（またはChatGPT側の実装担当）が実際のpushを行う必要があります。

**方法A（推奨・最も確実）: GitHub Web UIから手動アップロード**（`claude`リポジトリの
`toto/`フォルダで既に2回成功している方法と同じ）
1. `https://github.com/sigulun555-lab/gpt` を開く
2. 新規ディレクトリとして `toto_compare/` を作る必要があるため、以下のURLを直接開くと
   ドラッグ&ドロップのアップロード画面が `toto_compare/` 配下を対象にして開きます：
   `https://github.com/sigulun555-lab/gpt/upload/main/toto_compare`
3. このディレクトリ内の全ファイル（`README.md`, `team_name_dictionary.json`,
   `scripts/validate_prediction.js`, `scripts/score_predictions.js`,
   `predictions/example_claude.jsonl`, `predictions/example_chatgpt.jsonl`,
   `results/example_results.jsonl`, `tests/test_toto_compare.js`）をアップロード
   （サブフォルダごとアップロードする場合は、`scripts`, `predictions`, `results`, `tests`
   を一旦ローカルでzip解凍した状態のフォルダをまとめてドラッグすれば、GitHubのWeb UIが
   フォルダ構造を保持してアップロードします）
4. コミットメッセージ例：`Add toto_compare: Claude/ChatGPT prediction comparison infra (no production logic changed)`

**方法B: ChatGPT側の実装担当に直接渡す**
`gpt` リポジトリには既に `github-actions[bot]` によるコミットがある（`.github/workflows/update-predictions.yml`
による自動更新）ため、ChatGPT側の実装担当は明らかに書き込み権限を持っています。このディレクトリを
そのまま渡し、`toto_compare/` という新規トップレベルフォルダとして追加してもらうのが最短です。
**既存の `scripts/`, `tests/`, `data/`, `model.js`, `app.js` 等は一切変更不要・変更しないでください**
——このフォルダは既存ファイルと名前が衝突せず、既存の自動更新ワークフローの監視パス
（`scripts/**` `tests/**` `model.js` `app.js` `index.html` `styles.css` `package.json` `data/**`）にも
含まれないため、追加するだけで既存のtotoアプリの動作に一切影響しません。

**方法Aでも方法Bでも、どちらの場合も production の `model.js` / Claude側Artifactのロジックには
一切触れません。** このディレクトリは「比較基盤」のみを追加するものです。

## 7. 今後の運用イメージ（このラウンドから始める場合）

1. 各ラウンドの締切前に、Claude側・ChatGPT側それぞれが自分の予測を
   `predictions/round_<N>_<model>.jsonl` に `validate_prediction.js` 経由で追記する
   （締切後は保存自体が拒否されるので、"締切後に慌てて確定" は構造的に不可能）
2. 試合終了後、結果を `results/round_<N>_results.jsonl` に追記する（予測ファイルには触れない）
3. `node scripts/score_predictions.js predictions results/round_<N>_results.jsonl report_round<N>.json`
   を実行し、モデル別・リーグ別の採点結果を確認する
4. ラウンドを重ねてデータが蓄積してから、今回のレビューで議論した
   シュリンケージ（SAMPLE_TRUST）やDixon-Colesなどの補正の採用判断を、
   **このログに基づく「未使用データでの事前登録済み評価」** として行う
   （チューニングに使ったデータと最終評価データを混同しない、という元の方針どおり）

## 8. このラウンドで「まだやらないこと」の確認

- 本番の `model.js` / Claude側Artifactの予測ロジック・補正値は変更しない
- シュリンケージ・Dixon-Coles・マーケットブレンド等の採用判断はまだ行わない
- 比較基盤（このディレクトリ）がpushされ、実際に数ラウンド分のログが蓄積されてから、
  次のステップ（未使用データでの採用判断）に進む
