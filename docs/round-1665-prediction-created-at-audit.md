# 第1665回 市場ブレンド予測の作成時刻監査

## 修正内容

- 既存の52行は変更せず、`ChatGPT-shared-xG-Claude-V2-market-blend-30-70` の13行について、確率・期待得点・市場入力を変えない別revisionを13行追記。
- 新revisionの `predictionCreatedAt` は空文字列。実際の作成時刻を裏付ける記録が見つからないため、推定時刻で埋めない。
- 新revisionには `revisionOf`、`revisionReason`、`creationTimeNote` を記録。元の行は監査履歴として保持。
- `marketRetrievedAt` は `null` のまま。
- 画面・ダッシュボード上の表示確認は未実施（`displayVerification: "not_checked"`）。

## 08:00:00Z の根拠確認

### ChatGPT-shared-xG-Claude-V2-market-blend-30-70

13行の `predictionCreatedAt: 2026-10-24T08:00:00Z` は、締切 `2026-10-24T04:50:00Z` より後であり、作成時刻を示す証跡も確認できない。したがって実際の作成時刻としては採用せず、新revisionでは空欄とした。

### ChatGPT-Poisson-plus-toto-vote-blend-v2-30-70

同じ `2026-10-24T08:00:00Z` が付いた以前の13行も確認。各行にある `baseModelGeneratedAt: 2026-10-23T11:36:33.925Z` は元モデルの生成時刻、`marketOfficialDisplayAt: 2026-10-23T03:35:00+09:00` は市場表示の時刻であり、市場ブレンド行そのものの作成時刻を証明しない。別の監査可能な作成ログは見つからなかったため、08:00:00Z の根拠は確認できず、旧13行は変更せずに保持した。

## 確認範囲と制限

- 確率を含む既存データは変更せず、同じ確率を持つrevisionを追記。
- `marketRetrievedAt` は `null`。
- 表示確認は未実施。
- 公式投票率の独立した再取得・検証はこの修正の範囲外。
