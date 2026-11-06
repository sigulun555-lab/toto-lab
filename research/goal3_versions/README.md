# GOAL3 版定義 v0 / v0.5 / v1 / v2（研究用・本番非接続）

| 版 | 定義 | 状態 |
|---|---|---|
| v0 | 共通ベースライン：shrinkage-Poisson, λ=10, 2026年のみ | v1 と同一仕様（テストで完全一致） |
| v0.5 | shrinkage-Poisson, λ=6（k=6） | 本番導入前のテスト検証用。未採用 |
| v1 | Claude 既存 GOAL3 モデル（goal3.py、round 1666 で使用）, λ=10, 2026年のみ | 既存。変更なし |
| v2 | v1 と toto ONE 購入割合の市場ブレンド（MARKET_WEIGHT=0.7） | 研究試算のみ。0.7 は GOAL3 で未検証 |

v0 と v1 の差分：なし（計算式・特徴量・学習データ・学習期間すべて同一）。統合して 1 本として評価することを推奨。

## 入力条件
- 履歴：J1/J2/J3 かつ 2026 年のみ（script 内で明示フィルタ）。日付は対象日より前のみ（同日は含めない）。
- 入力ファイルの SHA-256 を結果 JSON に記録する。

## 検証（test_versions.py, ALL PASS）
1. v1 が round 1666 の保存済み予測（6 行）を再現：最大差 4.6e-5（4 桁丸め内）
2. v0 と v1 が完全一致：差 0.0
3. v0.5（k=6）が GPT の all-k 明細（472 対象行、k=6）と一致：最大差 2.0e-12、目的変数の一致 472/472
4. v2 のブレンド式が round 1666 の試算結果と一致：最大差 4.6e-5

## 実行例
    python3 goal3_versions.py --history <history.json> --target-date 2026-11-07 \
        --fixtures fixtures.json [--market market.json] --out out.json
- v2 は市場スナップショット（toto ONE 購入割合）が必要。無い場合は not_run と記録。
