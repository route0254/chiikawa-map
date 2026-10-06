# 公式情報巡回・掲載判断・イベント履歴の調査データ

公式情報源の巡回、期限付き掲載候補・保留、過去の国内公式イベントを扱う調査データです。公開サイトが直接読み込むデータではありません。頻度・期限・指標の方針は`DATA-OPERATIONS.md`を正とします。

## ファイル

- `official-source-ledger.json`: 公式情報源の朝夕/週次巡回と最終成功・取得失敗。初期URL登録は取得成功の記録ではありません。
- `publication-candidate-ledger.json`: 発表・発見・開催・発売・予約開始・反映期限・公開、既存ID照合、根拠・保留・次の確認・再確認期限。不明な日時を補完しません。
- `schemas/*-ledger.schema.json`: 2つの台帳のJSON Schema。`check:operations`で検査し、`report:operations`で既知値だけの指標・期限・相談対象を確認します。
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

## 広い漏れ調査の実施記録

- 最終実施日: 2026-10-06（日本時間）。次回の目安: 2026-10-13
- 公式総合・系列一覧に加え、施設・店舗・企業の一次告知、終了候補、入場案内、保留と取得失敗を確認しました。前回の実施日は既存記録から確定できないため不明とします
- 確認範囲と未解決事項は `listings-2026-10-06-evidence.json` に記録しています。取得できなかった情報は確認済みとせず、候補台帳の再確認期限に従います
