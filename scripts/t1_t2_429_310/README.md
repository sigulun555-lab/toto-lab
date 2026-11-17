# T1/T2 310試合（429行入力）の成果物（toto13 / 研究専用、GOAL3とは別）

GPT 側コメント（toto-lab PR #81、2026-11-17）の依頼に対応した、再現用の成果物です。
本番モデル・本番予測・予測ログ・市場重み・既存 shadow には触れていません。

## 入力（固定）
- Repository: sigulun555-lab/gpt
- Commit: 2309d08e3a449c9271fa3194ccf3fbc4799f9215（2026-11-04T06:17:34Z）
- Path: data/history.json
- Git blob SHA: fb6f11ec4ceae82c2c610891a1c294f2aa8f38bd
- 件数: 429行、評価対象は 2026-09-01 以降の 310 試合 / 26 日付
- 入力ファイル SHA-256: 29b1cb2110b91a8a8d1f1bc5ced504b3dd8a0e86ee3beddb111a5f2309af4f19

410行の control（blob 45295867…）とは別母集団です。混ぜていません。

## 実行
    python3 -I t1_t2_repro_rev2_0to10.py <history.json のパス>
    # 出力: rev2_0to10_pred_*.csv（8 変種） → pred/ に格納
    python3 -I paired_boot.py <pred/ のパス>   # 日付単位 paired bootstrap（seed 20261117, 10,000 回）

- スクリプトは正本（claude/t1-t2-429-check-20261104 の scripts/t1_t2/t1_t2_repro_rev2_0to10.py、blob 243f7166bcbd579a9133b108e58eec32b863b940）をそのまま使用。
- 正本の内部 bootstrap（boot 2,000 回・seed 1）は k6−k0 と T2 のみ。k10−k6 / k8−k6 の区間は paired_boot.py（seed 20261117、10,000 回）で別途計算。

## 指標（310試合・26日付）
| 変種 | LogLoss | Brier | 的中率 |
|---|---:|---:|---:|
| k=0 / window12（baseline） | 1.1229 | 0.6671 | 0.4419 |
| k=6 / window12（V0） | 1.0552 | 0.6360 | 0.4645 |
| k=8 / window12 | 1.0508 | 0.6334 | 0.4774 |
| k=10 / window12（V1候補） | 1.0486 | 0.6321 | 0.4806 |

## 判定（候補 − 基準、日付単位 paired bootstrap 95%）
- k10 − k6：LogLoss −0.0066 [−0.0161, +0.0021]、Brier −0.0039 [−0.0100, +0.0019] → 区間上限が 0 をまたぐため「改善傾向」止まり
- k8 − k6：LogLoss −0.0044 [−0.0099, +0.0006]、Brier −0.0026 [−0.0060, +0.0007] → 同上
- k6 − k0：LogLoss −0.0676 [−0.1191, −0.0262]、Brier −0.0311 [−0.0525, −0.0127] → 両指標とも上限 0 未満

採用根拠にはしません。前向き shadow で 20 ラウンド以上の確認が必要です（区分C）。

## 出力 SHA-256
- pred/: SHA256SUMS_pred.txt
- scripts: SHA256SUMS_scripts.txt
- 結果全文: paired_bootstrap_result.txt

## 留意点
- 入力の history.json は全行の fetchedAt が共通の過去時刻（2026-11-03T23:21:25Z 付近）であり、各試合の当時の利用可能性は証明されていません。遡及的な参考値です。
- 締切前記録（既存 shadow）との件数照合は本作業では行っていません。
