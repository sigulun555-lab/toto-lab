# 母集団 (b) の出力ファイル（2026-11-06 再生成）

- 入力：GPT main `data/history.json`、blob `b36927fa70fac0cea8fa8411698ff2d0cf04df88`（gpt commit `28b3613bdda051bbc1bac0637cbb72f0b4f0083a` で確認、430行）。
- スクリプト：`../repro_rev2.py`（blob `243f7166bcbd579a9133b108e58eec32b863b940`、一致確認済み）。
- 実行：`python3 -I repro_rev2.py <history.json>`（既定 2,000回・seed 1）。
- 同コマンドで再生成した全出力の SHA-256 が manifest.json の `outputs_sha256` と一致（8 CSV と run_log_default_reps.txt）。

この出力は、GPT さんの依頼（CSV と実行ログの保存、manifest との紐付け）に対応するためのものです。
10,000回の区間は、この出力とは別のインライン実行の値です。
本番・予測ログ・既存 shadow は変更していません。採用判断は保留で、ユーザー判断事項です。
