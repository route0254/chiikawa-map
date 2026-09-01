# ちいかわ推し活（ちい活）MAP

ちいかわ公式関連スポットと、ナガノ先生が紹介・訪問した場所を探せる非公式マップです。

公開URL: <https://chiikatsu-map.com/>

## 主な機能

- 地図・一覧・検索・都道府県・カテゴリによるスポット検索
- 開催中・開催予定・終了済みの公式スポット一覧
- ナガノ先生関連スポットの根拠と確度表示
- 「行きたい」「行った！」「今日のプラン」「訪問日・メモ」の端末保存
- 行きたい一覧（現在地からの距離順を含む）、イベントカレンダー、今日のプランのカレンダー登録
- 訪問記録の集計、共有画像の作成
- Googleログインを使った任意のクラウド同期
- スポット個別ページ、共有URL、PWA対応

## ローカル開発

Node.js 22とpnpm 11を使用します。

```bash
pnpm install
pnpm exec playwright install chromium
```

主な確認コマンド:

```bash
pnpm run check
pnpm run test:smoke
pnpm run check:links
pnpm run check:site
```

`pnpm run check:links`は外部サイトへ接続します。`pnpm run check:site`は公開中のサイトを検査します。

## 構成

| パス | 内容 |
| --- | --- |
| `index.html` / `style.css` / `app.js` | 地図ページ |
| `official.html` / `official.css` / `official.js` | 公式スポット一覧 |
| `journal.html` / `journal.css` / `journal.js` | 行きたい一覧、カレンダー、プラン、訪問記録 |
| `privacy.html` / `legal.css` | 保存データとプライバシーの説明 |
| `data/official-spots.json` | 現在・今後の公式スポット |
| `data/official-events-archive.json` | 終了・開催中止となった公式イベント |
| `data/nagano-spots.json` | ナガノ先生関連スポット |
| `spot/` | JSONから生成するスポット個別ページ |
| `cloud-sync-*.js` / `firebase-config.json` | Firebase Authentication、Firestore同期、GA4 |
| `scripts/` | データ検証、掲載件数・個別ページ生成、調査用スクリプト |
| `research/` | 過去イベント調査の作業データ |
| `tests/` | 単体テスト、PlaywrightのUI・アクセシビリティテスト |

データ更新の手順と掲載基準は[DATA-OPERATIONS.md](DATA-OPERATIONS.md)、今後の課題は[ROADMAP.md](ROADMAP.md)にまとめています。Firebaseの設定は[docs/cloud-sync-setup.md](docs/cloud-sync-setup.md)を参照してください。

## データを変更する場合

スポットJSONを変更したら、個別ページとサイトマップを再生成してから検証します。

```bash
pnpm run build:spot-pages
pnpm run check
pnpm run test:smoke
```

URLを変更した場合は`pnpm run check:links`も実行します。`spot/`配下の生成物は直接編集せず、`scripts/build-spot-pages.mjs`、`spot.css`、`spot-page.js`を変更してください。

掲載件数と確認日は、各データの確認日から`data/site-meta.json`へ生成します。データ構造と許容値は`scripts/validate-data.mjs`が検証します。

## 保存データ

ログインなしの場合、記録はブラウザの`localStorage`に保存されます。主なキーは次のとおりです。

- `chiikawa-map-favorites-v1`: 行きたい
- `chiikawa-map-visited-v1`: 行った！
- `chiikawa-map-plan-v1`: 今日のプラン
- `chiikawa-map-visit-details-v1`: 訪問日・メモ

Googleログインを使う場合だけFirestoreへ同期します。「行きたい」「行った！」「訪問日・メモ」はスポット単位で統合し、同じスポットの競合は更新時刻が新しい操作を優先します。「今日のプラン」は最後に編集したリスト全体を採用します。

JSONの書き出し・追加統合読み込みにも対応しています。同期仕様と確認項目は[docs/cloud-sync-setup.md](docs/cloud-sync-setup.md)に記載しています。

## 互換性

- 既存スポットの`id`は変更・再利用しない
- JSONの既存フィールドを削除・改名しない
- `localStorage`のキー名と保存形式を変更しない
- `?spot=<id>`など既存の共有URLを維持する
- 現在データから過去データへ移す場合も同じ`id`を使う
- `CNAME`の`chiikatsu-map.com`を維持する

互換性を変更する場合は、移行処理を含む別作業として扱います。

## 公開と自動チェック

GitHub Pagesは`main`ブランチのルートを公開します。`main`へのプッシュ後に自動でデプロイされます。

GitHub Actionsでは次を実行します。

- プッシュ時: JavaScript・JSON・生成物・主要UIの検証
- 毎日6時23分（日本時間）: データ検証と終了済み候補の確認
- 毎日7時17分（日本時間）: HTTPS、転送、canonical、OGP、公開ファイルの確認
- 毎週月曜日6時41分（日本時間）: 公式情報リンクの確認

Actionsは異常を通知しますが、データの自動修正は行いません。

## テスト用URL

- 通常: <https://chiikatsu-map.com/>
- OSM障害テスト: <https://chiikatsu-map.com/?tileTest=osm-fail>
- 全背景地図障害テスト: <https://chiikatsu-map.com/?tileTest=all-fail>

## 注意

ちい活MAPは、ファンが個人で運営する非公式サイトです。公式各社とは関係ありません。

営業時間、入場方法、予約条件、開催状況は変更される場合があります。訪問前に各公式情報を確認してください。作品名、キャラクター名、企業名などの権利は各権利者に帰属します。
