# 公式イベント履歴の調査データ

過去の国内公式イベントを追加するための作業データです。公開サイトが直接読み込むデータではありません。公開用データは`data/official-events-archive.json`です。

## ファイル

- `official-history-source.json`: 公式のPOP UP STORE・カフェ・展覧会履歴の確認済みスナップショット
- `official-history-candidates.json`: 国内・終了済み・登録済みの判定を加えた候補一覧
- `official-special-events-source.json`: 上記3一覧に含まれない特設ページ系列の確認済み原本
- `official-special-series-catalog.json`: 公式総合ページで確認した特設系列の対応状況
- `history-venue-seeds-*.json`: 会場名、住所、座標確認用の検索語
- `history-venue-geocodes.json`: 会場座標と取得元のキャッシュ
- `history-extra-events-2021-2022.json`: 公式画像にだけ日程が掲載されたロフト10会場の転記
- `history-batch-*.json`: 公開JSONへ追加した期間別バッチ

期間別ファイルは、`2021-2022`、`2023-q1`〜`2023-q4`、`2024-q1`、`2024-04`〜`2024-06`、`2024-q3`〜`2026-q2`を管理しています。

## コマンド

候補一覧の再生成:

```text
pnpm run build:history-candidates
```

2021〜2022年分のバッチ生成と公開JSONへの統合:

```text
pnpm run build:history-batch
pnpm run import:history-batch
```

期間別バッチは、`package.json`に定義した接尾辞付きコマンドを使います。

```text
pnpm run build:history-batch:2025-q4
pnpm run import:history-batch:2025-q4
```

座標が不足している場合だけ、次のコマンドを使います。

```text
pnpm run geocode:history-venues
pnpm run geocode:history-venues:gsi
```

`build:history-candidates`は公式スナップショットから候補一覧を再生成します。監査用バッチは再生成でき、公開JSONへの統合時に登録済みIDを除外します。2026年4〜6月分は、先行登録済み2件のIDを維持するため公式URL単位で生成対象から除外します。

Nominatimは1.2秒間隔、国土地理院住所検索は0.75秒間隔で実行し、結果をキャッシュします。自動取得した座標は、住所・都道府県・国内座標の範囲を確認してから採用します。

特設系列の確認後は`official-special-series-catalog.json`を更新し、`pnpm run audit:special-series`で原本との対応を確認します。保留項目も削除せず、未掲載の理由を台帳に残します。

## 公開基準

- 国内会場だけを公開する
- 公式または主催施設の一次情報でイベント名・会場・期間を確認する
- 公式に中止が明記されたイベントは削除せず、`eventStatus: "cancelled"`で区別する
- 日付、会場、座標を推測で補完しない
- 既存ID・共有URL・localStorageとの互換性を維持する

2026年8月28日時点の公式履歴スナップショットは393件で、国内のアーカイブ候補372件は登録済みです。公式履歴上の最古は2021年4月で、2020年の掲載記録は確認できませんでした。
