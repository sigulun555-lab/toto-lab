# 第1665回 Claude V2（市場ブレンド版）の計算ロジック

参照実装: `scripts/claude_v2_logic.js` ／ 固定値: `tests/fixtures/round_1665_claude_v2_reference.json` ／ テスト: `tests/round-1665-claude-v2-logic.test.js`

記号: 1=ホーム勝ち、0=引き分け、2=アウェイ勝ち。配合は **モデル30% / 公式投票率70%**（MARKET_WEIGHT = 0.7）。

## 1. 期待得点のブレンド（blendGoalExpectancyWithMarket）

入力: 自前モデルの期待得点 `rawHome`, `rawAway`（シュリンケージ・ブースト・クランプ適用後）、公式投票率 `marketHome`（1）, `marketAway`（2）。引き分け率はブレンドには使わない。

```js
const MARKET_WEIGHT = 0.7;
const marketEdge = (marketHome - marketAway) * 1.6;
const rawEdge = rawHome - rawAway;
const blendedEdge = marketEdge * MARKET_WEIGHT + rawEdge * (1 - MARKET_WEIGHT);
const totalGoals = rawHome + rawAway;
const homeGoals = Math.max(0.15, (totalGoals + blendedEdge) / 2);
const awayGoals = Math.max(0.15, (totalGoals - blendedEdge) / 2);
```

合計得点は自前モデルの水準のまま、差だけを公式投票側へ寄せる。

## 2. 期待得点 → 1/0/2 確率

- 0〜8点まで、ホーム・アウェイを独立ポアソン分布とみなして同時確率を積む（`poissonProbability(λ, k) = e^-λ λ^k / k!`）。
- 各セル `(h, a)` の確率 = `P(h) × P(a) × τ(h, a)`（τは次項）。
- `h > a` をホーム勝ち、`h == a` を引き分け、`h < a` をアウェイ勝ちに加算。

## 3. Dixon–Coles 補正（V2のみ）

- ρ = −0.10、適用対象は 0-0, 0-1, 1-0, 1-1 の4セルのみ。
  - τ(0,0) = 1 − λh·λa·ρ
  - τ(0,1) = 1 + λh·ρ
  - τ(1,0) = 1 + λa·ρ
  - τ(1,1) = 1 − ρ
  - それ以外は τ = 1
- 順序: 独立ポアソン × τ → 次の正規化。

## 4. 正規化（補正前）

積み上げた H, D, A を合計で割る（打ち切り 8点までの誤差吸収）。ここで得た値が「補正前確率」。

## 5. 引き分け上乗せ（V2）

- gap = |H − A|（正規化後の値）
- gap < 0.30 のときのみ適用。
  - strength = 1 − gap / 0.30
  - boost = 0.20 × strength
  - homeShare = H / (H + A)、awayShare = A / (H + A)
  - D += boost、H −= boost × homeShare、A −= boost × awayShare
- V1（旧版・submitted）は Dixon–Coles なし、しきい値 0.08、上乗せ幅 0.10。

## 6. シュリンケージ・サンプル信頼度（期待得点の段階）

Claudeアプリの `predictScore` 内で、ブレンド**前**に入る。
- LEAGUE_AVG_GOALS = 1.35、SAMPLE_TRUST = 6
- `avg = (rawAvg × 試合数 + 1.35 × 6) / (試合数 + 6)`
- その後ブースト（ホーム −0.45〜+0.75、アウェイ −0.45〜+0.65 にクランプ）→ 期待得点のクランプ（ホーム 0.2〜3.4、アウェイ 0.15〜3.0）→ 市場ブレンド（上記1）→ 本ファイルの確率計算。
- 確率計算の内部には、シュリンケージ・ブーストに相当する補正はない。

## 7. 正規化のタイミング

1. ポアソン×DC の積み上げ後に1回（補正前確率）。
2. 引き分け上乗せ後は合計が1のまま（上乗せ分を勝ち側から按分で減らすため、再正規化は不要）。
3. カップ戦上乗せ（+0.10）は第1665回では使用せず（`isCupMatch = false` として扱う）。

## 8. 第1665回 13試合の実例

`tests/fixtures/round_1665_claude_v2_reference.json` に、入力・ブレンド後の期待得点・補正前確率・最終確率（小数6桁）を格納。
ChatGPT側の移植では、同じ **Claudeの生期待得点** を入力にして一致を確認すること（ChatGPT自前のxGとは入力が違う）。

## 9. 手法の違い（注意）

- Claude V2 は **期待得点レベルでブレンド**してから確率を計算する。
- ChatGPT V2 は **確率レベルで線形ブレンド**している。
- そのため同じ公式投票率でも結果は一致しない。3, 6, 7, 8, 11, 13 の引き分け差はこの構造差（DC・引き分け上乗せ・シュリンケージ）による。

## 10. 未確認事項

- 表示（ダッシュボード）の実際の見え方は未確認。
- 公式投票率は取得時点（2026-10-24 00:59 JST 時点の表示）の値。
