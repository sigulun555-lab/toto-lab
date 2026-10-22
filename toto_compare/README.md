# toto_compare — Claude版 / ChatGPT版 toto予測 比較基盤

このディレクトリは、Claude版（totoGOAL Artifact）と ChatGPT版（`sigulun555-lab/gpt`）の
予測を「同じ試合・同じ予測時点・同じ採点方法」で公平に比較するための基盤です。
新規作成された **`sigulun555-lab/toto-lab`**（両モデル側が書き込める共有リポジトリ）への
配置を想定していますが、`sigulun555-lab/gpt` に新規フォルダとして追加する形でも動作します
（詳細は7章）。

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
  - チーム名が `team_name_dictionary.json` の正規名称（canonicalName）に変換できない場合は、
    **保存は拒否しないが**警告として明示する（推測で統合はしない。採点時に除外される）

### `scripts/score_predictions.js`

- `predictions/*.jsonl` を全読み込み、`results/<file>.jsonl` と突き合わせて採点する
- 照合は **まず homeTeam / awayTeam を `team_name_dictionary.json` の正規名称
  （canonicalName）に変換し、そのうえで `round + matchNumber + 正規名称(home) + 正規名称(away)`
  の完全一致のみ**を許可する。正規名称に変換できないチームは `unresolvedTeamNames` に
  理由・件数とともに記録し、採点対象から除外する（推測補完はしない）。正規名称への変換は
  できても一致する結果レコードが無い場合は `unresolved` に記録して除外する
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
一切触れない）。**実行結果：11件すべてpass。**

1. 正常なレコードの追記
2. `predictionId` 重複の拒否
3. 締切後確定の保存拒否
4. 確率合計不正の拒否
5. 存在しない `revisionOf` の拒否
6. 正しい修正レコードの追記
7. 修正履歴のうち締切前の最終確定予測のみが採点に使われること
8. gpt側の略称表記（例「鹿島」）とClaude側の表記（例「鹿島アントラーズ」）が、文字列としては
   異なっていても正規名称への変換を経て同一クラブとして正しく突き合わされること
9. 正規名称に変換できない試合（架空のチーム名）が推測補完されず `unresolvedTeamNames` になること
10. Brier scoreが sum-of-3-squares 方式で正確に算出されること（手計算と照合）
11. リーグ別集計が機能すること

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

## 5. チーム名辞書（`team_name_dictionary.json`）について — 正規名称（canonicalName）方式

**正規名称の基準**: Jリーグ公式サイト「[2026特別シーズン、2026/27シーズン クラブ編成](https://www.jleague.jp/news/article/32852/)」
（2025/12/19掲載）に掲載された、2026年J1（20）・J2（20）・J3（20）全60クラブの名称。
この公式資料を全文取得し、記載の60クラブすべてを `clubs[]` の `canonicalName` として採用した
（推測統合なし。全60クラブの出典URL付きリストは本ファイル末尾の「全60クラブ一覧」を参照）。

スキーマ（1クラブ1エントリ）：
```jsonc
{
  "canonicalName": "鹿島アントラーズ",      // 正規名称（NFKC正規化で半角統一）
  "officialPageText": "鹿島アントラーズ",    // Jリーグ公式ページの表示そのまま（全角英数字含む場合あり）
  "jleagueUrlSlug": "kashima",
  "jleagueUrl": "https://www.jleague.jp/club/kashima",
  "league2026": "J1",
  "aliases": {
    "gptHistoryJson": "鹿島",                      // sigulun555-lab/gpt data/history.json での表記
    "claudeTeamDatabaseKey": "kashima",            // Claude側teamDatabaseのキー
    "claudeTeamDatabaseName": "鹿島アントラーズ"    // Claude側teamDatabaseの表記
  },
  "claudeAppSupported": true   // Claude側teamDatabaseにエントリがあるか（predictScore()で予測可能か）
}
```

**正規化について**: 公式ページ本文は全角英数字（ＦＣ・ＳＣ等）で表示されているが、これはページ
全体で日本語文中の英数字を全角に統一する表示上の処理であり、クラブの正式表記が全角という
意味ではない（toto公式データ・gpt側データ・Claude側データのいずれも半角表記）。`canonicalName`
はUnicode正規化（NFKC）で半角化した表記を採用し、公式ページそのままの表示は `officialPageText`
に別途保持する。NFKCは一意な機械的文字変換であり、推測によるマッチングではない。

**照合できたもの**:
- gpt側 `history.json` に実際に出現する60表記すべてが、`aliases.gptHistoryJson` として
  全60クラブに登録できた（60/60、実データから直接確認。推測統合なし）
- Claude側Artifactの `teamDatabase`（56のJリーグチーム、欧州クラブ26件は対象外）のうち
  **54チームは正規名称と文字列が完全一致**、**2チームは表記が異なるが同一クラブと確認できた**
  （`jleagueUrlSlug` とClaude側のキー名が一致することで確認。推測ではない）:
  - `京都サンガF.C.`（公式正規名称） ⇔ Claude側表記「京都サンガ」（F.C.が付かない旧称/略称）
  - `ザスパ群馬`（公式正規名称・2026年時点） ⇔ Claude側表記「ザスパクサツ群馬」（旧クラブ名。
    「クサツ」が外れて改称されている）
  これら2件は `claudeNameDiscrepancyNote` に根拠を明記した上で `aliases` に確認済みの別名として登録した

**Claude側アプリが未対応の4クラブ**: `ギラヴァンツ北九州`、`奈良クラブ`、`FC岐阜`、`SC相模原` は、
Jリーグ公式資料上は2026年J3の正規クラブとして一意に存在が確認できる（＝比較基盤での正規名称への
変換・採点は可能）が、Claude側Artifactの `teamDatabase` にはエントリが無いため、
**Claude側の `predictScore()` で予測を生成することはできない**（`claudeAppSupported: false`）。
これは「チーム名が解決できない」という問題ではなく、「Claude側アプリの対応クラブ範囲の問題」
であり、両者は別の課題として扱う。ChatGPT側の予測はこれら4クラブが絡む試合でも正規名称に変換でき、
採点対象になる。

**過去シーズンのデータに適用する際の注意**: この60クラブは『2026特別シーズン、2026/27シーズン
クラブ編成』時点のものである。過去シーズンの試合データには、改称前の旧クラブ名や、当時は異なる
リーグ（J1/J2/J3）に所属していたクラブが含まれる場合がある。本辞書は「名称が同一クラブを指すか」
だけを確認済みのエイリアスとして保証するものであり、「そのクラブが当時どのリーグに所属していたか」
は保証しない。過去データに対して正規名称へ変換する場合も、改称履行や昇降格を考慮せず機械的に
現行名へ置換することは誤照合の原因になるため行わない（例：旧名で記録された試合は、まずそのクラブが
現在のどのクラブと同一かを本辞書のエイリアスで確認したうえで変換するが、「2026年にJ1/J2/J3のどこに
いたか」という `league2026` フィールドを過去の試合の所属リーグとして転用しない）。

## 6. 全60クラブ一覧（2026年J1/J2/J3、出典: Jリーグ公式サイト）

出典: https://www.jleague.jp/news/article/32852/ （2025/12/19掲載）

### J1（20クラブ）

| 正規名称 | gpt側表記 | Claude側アプリ対応 | 備考 |
|---|---|---|---|
| [FC町田ゼルビア](https://www.jleague.jp/club/machida) | 町田 | 対応 |  |
| [FC東京](https://www.jleague.jp/club/ftokyo) | FC東京 | 対応 |  |
| [V・ファーレン長崎](https://www.jleague.jp/club/nagasaki) | 長崎 | 対応 |  |
| [アビスパ福岡](https://www.jleague.jp/club/fukuoka) | 福岡 | 対応 |  |
| [ヴィッセル神戸](https://www.jleague.jp/club/kobe) | 神戸 | 対応 |  |
| [ガンバ大阪](https://www.jleague.jp/club/gosaka) | G大阪 | 対応 |  |
| [サンフレッチェ広島](https://www.jleague.jp/club/hiroshima) | 広島 | 対応 |  |
| [ジェフユナイテッド千葉](https://www.jleague.jp/club/chiba) | 千葉 | 対応 |  |
| [セレッソ大阪](https://www.jleague.jp/club/cosaka) | C大阪 | 対応 |  |
| [ファジアーノ岡山](https://www.jleague.jp/club/okayama) | 岡山 | 対応 |  |
| [浦和レッズ](https://www.jleague.jp/club/urawa) | 浦和 | 対応 |  |
| [横浜F・マリノス](https://www.jleague.jp/club/yokohamafm) | 横浜FM | 対応 |  |
| [京都サンガF.C.](https://www.jleague.jp/club/kyoto) | 京都 | 対応 | 旧名/表記差あり（本文参照） |
| [鹿島アントラーズ](https://www.jleague.jp/club/kashima) | 鹿島 | 対応 |  |
| [水戸ホーリーホック](https://www.jleague.jp/club/mito) | 水戸 | 対応 |  |
| [清水エスパルス](https://www.jleague.jp/club/shimizu) | 清水 | 対応 |  |
| [川崎フロンターレ](https://www.jleague.jp/club/kawasakif) | 川崎F | 対応 |  |
| [東京ヴェルディ](https://www.jleague.jp/club/tokyov) | 東京V | 対応 |  |
| [柏レイソル](https://www.jleague.jp/club/kashiwa) | 柏 | 対応 |  |
| [名古屋グランパス](https://www.jleague.jp/club/nagoya) | 名古屋 | 対応 |  |

### J2（20クラブ）

| 正規名称 | gpt側表記 | Claude側アプリ対応 | 備考 |
|---|---|---|---|
| [FC今治](https://www.jleague.jp/club/imabari) | 今治 | 対応 |  |
| [RB大宮アルディージャ](https://www.jleague.jp/club/omiya) | 大宮 | 対応 |  |
| [アルビレックス新潟](https://www.jleague.jp/club/niigata) | 新潟 | 対応 |  |
| [いわきFC](https://www.jleague.jp/club/iwaki) | いわき | 対応 |  |
| [ヴァンフォーレ甲府](https://www.jleague.jp/club/kofu) | 甲府 | 対応 |  |
| [ヴァンラーレ八戸](https://www.jleague.jp/club/hachinohe) | 八戸 | 対応 |  |
| [カターレ富山](https://www.jleague.jp/club/toyama) | 富山 | 対応 |  |
| [サガン鳥栖](https://www.jleague.jp/club/tosu) | 鳥栖 | 対応 |  |
| [ジュビロ磐田](https://www.jleague.jp/club/iwata) | 磐田 | 対応 |  |
| [テゲバジャーロ宮崎](https://www.jleague.jp/club/miyazaki) | 宮崎 | 対応 |  |
| [ブラウブリッツ秋田](https://www.jleague.jp/club/akita) | 秋田 | 対応 |  |
| [ベガルタ仙台](https://www.jleague.jp/club/sendai) | 仙台 | 対応 |  |
| [モンテディオ山形](https://www.jleague.jp/club/yamagata) | 山形 | 対応 |  |
| [横浜FC](https://www.jleague.jp/club/yokohamafc) | 横浜FC | 対応 |  |
| [湘南ベルマーレ](https://www.jleague.jp/club/shonan) | 湘南 | 対応 |  |
| [大分トリニータ](https://www.jleague.jp/club/oita) | 大分 | 対応 |  |
| [藤枝MYFC](https://www.jleague.jp/club/fujieda) | 藤枝 | 対応 |  |
| [徳島ヴォルティス](https://www.jleague.jp/club/tokushima) | 徳島 | 対応 |  |
| [栃木シティ](https://www.jleague.jp/club/tochigic) | 栃木C | 対応 |  |
| [北海道コンサドーレ札幌](https://www.jleague.jp/club/sapporo) | 札幌 | 対応 |  |

### J3（20クラブ）

| 正規名称 | gpt側表記 | Claude側アプリ対応 | 備考 |
|---|---|---|---|
| [AC長野パルセイロ](https://www.jleague.jp/club/nagano) | 長野 | 対応 |  |
| [FC岐阜](https://www.jleague.jp/club/gifu) | 岐阜 | **未対応** |  |
| [FC大阪](https://www.jleague.jp/club/fosaka) | FC大阪 | 対応 |  |
| [FC琉球](https://www.jleague.jp/club/ryukyu) | 琉球 | 対応 |  |
| [SC相模原](https://www.jleague.jp/club/sagamihara) | 相模原 | **未対応** |  |
| [ガイナーレ鳥取](https://www.jleague.jp/club/tottori) | 鳥取 | 対応 |  |
| [カマタマーレ讃岐](https://www.jleague.jp/club/sanuki) | 讃岐 | 対応 |  |
| [ギラヴァンツ北九州](https://www.jleague.jp/club/kitakyushu) | 北九州 | **未対応** |  |
| [ザスパ群馬](https://www.jleague.jp/club/gunma) | 群馬 | 対応 | 旧名/表記差あり（本文参照） |
| [ツエーゲン金沢](https://www.jleague.jp/club/kanazawa) | 金沢 | 対応 |  |
| [レイラック滋賀FC](https://www.jleague.jp/club/shiga) | 滋賀 | 対応 |  |
| [レノファ山口FC](https://www.jleague.jp/club/yamaguchi) | 山口 | 対応 |  |
| [ロアッソ熊本](https://www.jleague.jp/club/kumamoto) | 熊本 | 対応 |  |
| [愛媛FC](https://www.jleague.jp/club/ehime) | 愛媛 | 対応 |  |
| [高知ユナイテッドSC](https://www.jleague.jp/club/kochi) | 高知 | 対応 |  |
| [鹿児島ユナイテッドFC](https://www.jleague.jp/club/kagoshima) | 鹿児島 | 対応 |  |
| [松本山雅FC](https://www.jleague.jp/club/matsumoto) | 松本 | 対応 |  |
| [栃木SC](https://www.jleague.jp/club/tochigi) | 栃木SC | 対応 |  |
| [奈良クラブ](https://www.jleague.jp/club/nara) | 奈良 | **未対応** |  |
| [福島ユナイテッドFC](https://www.jleague.jp/club/fukushima) | 福島 | 対応 |  |


## 7. GitHubへの実装に必要な操作（重要な制約）

**このセッション（Claude Cowork）からは、ユーザー様のどのリポジトリにもpushできません。**
`sigulun555-lab/gpt` `sigulun555-lab/claude` に加えて、新規作成された
**`sigulun555-lab/toto-lab`（空リポジトリ、確認済み）に対しても同じ制約が適用されます**。
新しいリポジトリを作成しても、このセッションが使えるリポジトリの範囲（Anthropic側の
セッション権限）には追加されないため、以下のエラーで拒否されます：

```
HTTP 403: sessions are bound to their configured repositories.
```

これはGitHub側の公開/非公開設定や、どちらのアカウントがリポジトリを作成したかとは無関係の、
Anthropic側セッションの権限の問題で、このセッション内から回避する方法はありません。
したがって、以下のいずれかの方法で人間側（またはChatGPT側の実装担当）が実際のpushを
行う必要があります。

**方法A（推奨・最も確実）: GitHub Web UIから手動アップロード**（`claude`リポジトリの
`toto/`フォルダで既に2回成功している方法と同じ）
1. `https://github.com/sigulun555-lab/toto-lab` を開く
2. 以下のURLを直接開くと、ドラッグ&ドロップのアップロード画面が開きます：
   `https://github.com/sigulun555-lab/toto-lab/upload/main/`
   （リポジトリが空のため、ルート直下にこの `toto_compare/` フォルダ構造ごとアップロードする
   か、`toto_compare/` というフォルダ名を付けずにこのディレクトリの内容をそのままルートに
   置いても構いません。ChatGPT側と共有する前提であれば、`toto_compare/` を付けずに
   ルート直下に置く方がシンプルです）
3. このディレクトリ内の全ファイル（`README.md`, `team_name_dictionary.json`,
   `scripts/validate_prediction.js`, `scripts/score_predictions.js`,
   `predictions/example_claude.jsonl`, `predictions/example_chatgpt.jsonl`,
   `results/example_results.jsonl`, `tests/test_toto_compare.js`）をアップロード
   （サブフォルダごとアップロードする場合は、`scripts`, `predictions`, `results`, `tests`
   を一旦ローカルでzip解凍した状態のフォルダをまとめてドラッグすれば、GitHubのWeb UIが
   フォルダ構造を保持してアップロードします）
4. コミットメッセージ例：`Add toto_compare: Claude/ChatGPT prediction comparison infra (no production logic changed)`

**方法B: ChatGPT側の実装担当に直接渡す**
`toto-lab` はまだ空のリポジトリなので、どちらが先にpushしても問題ありません。ChatGPT側の
実装担当（`gpt` リポジトリで既に `github-actions[bot]` の自動更新を動かしている＝書き込み
権限を持っている側）にこのディレクトリをそのまま渡し、`toto-lab` にpushしてもらうのが
最短です。

**どちらの方法でも、production の `model.js` / `sigulun555-lab/gpt` の既存ファイル /
Claude側Artifactのロジックには一切触れません。** `toto-lab` は比較基盤専用の新規リポジトリ
なので、既存の `gpt` リポジトリの自動更新ワークフロー（`.github/workflows/update-predictions.yml`）
とは物理的に別リポジトリであり、影響のしようがありません。

## 8. 今後の運用イメージ（このラウンドから始める場合）

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

## 9. このラウンドで「まだやらないこと」の確認

- 本番の `model.js` / Claude側Artifactの予測ロジック・補正値は変更しない
- シュリンケージ・Dixon-Coles・マーケットブレンド等の採用判断はまだ行わない
- 比較基盤（このディレクトリ）がpushされ、実際に数ラウンド分のログが蓄積されてから、
  次のステップ（未使用データでの採用判断）に進む
