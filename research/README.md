# 公式イベント履歴の調査データ

このディレクトリは、過去の国内公式イベントを効率よく追加するための調査用ファイルを保存します。公開サイトが直接読み込むデータではありません。公開用の確定データは`data/official-events-archive.json`です。

## ファイル

- `official-history-source.json`: 公式POP UP STORE・カフェ・展覧会履歴の確認済みスナップショット
- `official-history-candidates.json`: 国内判定、終了判定、登録済み判定を付けた候補一覧
- `history-venue-seeds-2021-2022.json`: 2021～2022年会場の表記揺れ、住所、検索語
- `history-venue-seeds-2024-q1.json`: 2024年1～3月会場の住所、座標、確認元
- `history-venue-seeds-2024-q3.json`: 2024年7～9月会場の住所、座標、確認元
- `history-venue-seeds-2024-q4.json`: 2024年10～12月会場の住所、座標、確認元
- `history-venue-seeds-2025-q1.json`: 2025年1～3月の新規会場の住所、座標、確認元
- `history-venue-seeds-2025-q2.json`: 2025年4～6月の新規会場の住所、座標、確認元
- `history-venue-seeds-2025-q3.json`: 2025年7～9月の新規会場の住所、座標、確認元
- `history-venue-seeds-2025-q4.json`: 2025年10～12月の新規会場の住所、座標、確認元
- `history-venue-seeds-2026-q1.json`: 2026年1～3月の新規会場の住所、座標、確認元
- `history-venue-seeds-2026-q2.json`: 2026年4～6月の新規会場の住所、座標、確認元
- `history-venue-seeds-2024-06.json`: 2024年6月開始分会場の住所、座標、確認元
- `history-venue-seeds-2024-05.json`: 2024年5月開始分会場の住所、座標、確認元
- `history-venue-seeds-2024-04.json`: 2024年4月開始分会場の住所、座標、確認元
- `history-venue-seeds-2023-q4.json`: 2023年10～12月会場の住所、座標、確認元
- `history-venue-seeds-2023-q3.json`: 2023年7～9月会場の住所、座標、確認元
- `history-venue-seeds-2023-q2.json`: 2023年4～6月会場の住所、座標、確認元
- `history-venue-seeds-2023-q1.json`: 2023年1～3月会場の住所、座標、確認元
- `history-venue-geocodes.json`: 会場座標のキャッシュと取得元
- `history-extra-events-2021-2022.json`: 公式画像にだけ個別日程が掲載されたロフト10会場の転記
- `history-batch-2021-2022.json`: 公開JSONへ追加した61件の監査用バッチ
- `history-batch-2024-q1.json`: 公開JSONへ追加した2024年1～3月13件の監査用バッチ
- `history-batch-2024-q3.json`: 公開JSONへ追加した2024年7～9月33件の監査用バッチ
- `history-batch-2024-q4.json`: 公開JSONへ追加した2024年10～12月32件の監査用バッチ
- `history-batch-2025-q1.json`: 公開JSONへ追加した2025年1～3月27件の監査用バッチ
- `history-batch-2025-q2.json`: 公開JSONへ追加した2025年4～6月28件の監査用バッチ
- `history-batch-2025-q3.json`: 公開JSONへ追加した2025年7～9月28件の監査用バッチ
- `history-batch-2025-q4.json`: 公開JSONへ追加した2025年10～12月21件の監査用バッチ
- `history-batch-2026-q1.json`: 公開JSONへ追加した2026年1～3月14件の監査用バッチ
- `history-batch-2026-q2.json`: 公開JSONへ追加した2026年4～6月28件の監査用バッチ
- `history-batch-2024-06.json`: 公開JSONへ追加した2024年6月開始分8件の監査用バッチ
- `history-batch-2024-05.json`: 公開JSONへ追加した2024年5月開始分9件の監査用バッチ
- `history-batch-2024-04.json`: 公開JSONへ追加した2024年4月開始分8件の監査用バッチ
- `history-batch-2023-q4.json`: 公開JSONへ追加した2023年10～12月13件の監査用バッチ
- `history-batch-2023-q3.json`: 公開JSONへ追加した2023年7～9月11件の監査用バッチ
- `history-batch-2023-q2.json`: 公開JSONへ追加した2023年4～6月14件の監査用バッチ
- `history-batch-2023-q1.json`: 公開JSONへ追加した2023年1～3月13件の監査用バッチ

## コマンド

```text
pnpm run build:history-candidates
pnpm run build:history-batch
pnpm run import:history-batch
pnpm run build:history-batch:2024-q1
pnpm run import:history-batch:2024-q1
pnpm run build:history-batch:2024-q3
pnpm run import:history-batch:2024-q3
pnpm run build:history-batch:2024-q4
pnpm run import:history-batch:2024-q4
pnpm run build:history-batch:2025-q1
pnpm run import:history-batch:2025-q1
pnpm run build:history-batch:2025-q2
pnpm run import:history-batch:2025-q2
pnpm run build:history-batch:2025-q3
pnpm run import:history-batch:2025-q3
pnpm run build:history-batch:2025-q4
pnpm run import:history-batch:2025-q4
pnpm run build:history-batch:2026-q1
pnpm run import:history-batch:2026-q1
pnpm run build:history-batch:2026-q2
pnpm run import:history-batch:2026-q2
pnpm run build:history-batch:2024-06
pnpm run import:history-batch:2024-06
pnpm run build:history-batch:2024-05
pnpm run import:history-batch:2024-05
pnpm run build:history-batch:2024-04
pnpm run import:history-batch:2024-04
pnpm run build:history-batch:2023-q4
pnpm run import:history-batch:2023-q4
pnpm run build:history-batch:2023-q3
pnpm run import:history-batch:2023-q3
pnpm run build:history-batch:2023-q2
pnpm run import:history-batch:2023-q2
pnpm run build:history-batch:2023-q1
pnpm run import:history-batch:2023-q1
pnpm run geocode:history-venues
pnpm run geocode:history-venues:gsi
```

`build:history-candidates`は公式スナップショットから候補一覧を再生成します。引数なしの`build:history-batch`と`import:history-batch`は2021～2022年用、末尾が`:2023-q4`、`:2023-q3`、`:2023-q2`、`:2023-q1`、`:2024-q1`、`:2024-q3`、`:2024-q4`、`:2025-q1`、`:2025-q2`、`:2025-q3`、`:2025-q4`、`:2026-q1`、`:2026-q2`、`:2024-06`、`:2024-05`、`:2024-04`のコマンドは対応する期間用です。監査用バッチは再生成でき、公開JSONへの統合時は登録済みIDを除外します。2026年4～6月用バッチは先行登録済み2件を既存IDのまま維持するため、公式URL単位で生成対象から除外します。

座標取得コマンドは不足座標がある場合だけ使用します。Nominatimは単一リクエスト・1.2秒間隔、国土地理院住所検索は0.75秒間隔で実行し、結果をキャッシュします。自動取得結果は住所・都道府県・日本国内の座標範囲を目視確認してから採用します。

## 公開判断

- 国内会場だけを公開する
- 公式または主催施設の一次情報でイベント名・会場・期間を確認する
- 公式に中止が明記されたイベントは削除せず、`eventStatus: "cancelled"`で開催されなかった履歴として区別する
- 日付、会場、座標を推測で補完しない
- 既存ID・共有URL・localStorageとの互換性を壊さない

2026年8月28日時点の公式履歴スナップショットは393件で、国内のアーカイブ候補372件はすべて登録済みです。公式履歴上の最古は2021年4月で、2020年の掲載記録は確認できませんでした。
