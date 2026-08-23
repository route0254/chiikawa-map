# ちいかわ推し活MAP

GitHub Pages向けの静的Webサイトです。

## ファイル構成

- `index.html` : 画面構造
- `style.css` : デザイン / レスポンシブ対応
- `app.js` : 地図 / フィルター / 期間判定 / MarkerCluster
- `data/spots.json` : スポットデータ
- `favicon.svg` : ファビコン

## 今回の版

- 掲載基準日: 2026-08-24
- `spots.json`: 70件
- ちいかわらんどを `brand: "chiikawaland"` として独立
- シリーズ・施設フィルターを `spots.json` から自動生成
- 「使い方・掲載基準」パネルを追加
- 上部に掲載基準日 / 非公式 / 最新公式情報確認の注意書きを追加
- GitHub Issuesへの「掲載内容について連絡」リンクを追加
- MarkerCluster対応
- MarkerClusterが読み込めない場合は通常マーカーへ自動フォールバック
- OSM障害時はStadia Mapsへ自動フォールバック
- 終了済み期間限定スポットは日本時間基準で自動非表示
- PCは詳細を右側、スマホは地図下へ表示
- ピン選択時に地図やページを強制スクロールしない

## データ更新時

### 1. `data/spots.json`
スポット情報を更新します。

### 2. 掲載基準日
`app.js` 冒頭の以下を変更してください。

```js
const DATA_AS_OF = "2026-08-24";
```

### 3. 新しいシリーズ・施設を追加した場合
`app.js` の `BRAND_LABELS` に表示名を追加すると、
「シリーズ・施設」フィルターへ自動的に表示されます。

例:

```js
new_brand:
  "新しいシリーズ名",
```

## テストURL

通常:
`https://route0254.github.io/chiikawa-map/`

OSM障害テスト:
`https://route0254.github.io/chiikawa-map/?tileTest=osm-fail`

全背景地図障害テスト:
`https://route0254.github.io/chiikawa-map/?tileTest=all-fail`

## 注意

本サイトは非公式の個人的なファンまとめを想定しています。
営業時間・入場方法・予約条件・開催状況は変更される場合があるため、
訪問前に各公式情報も確認してください。
