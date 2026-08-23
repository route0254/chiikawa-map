# ちいかわ推し活（ちい活）MAP

GitHub Pages向けの静的Webサイトです。

## ファイル構成

- `index.html` : 画面構造
- `style.css` : デザイン / レスポンシブ対応
- `app.js` : 地図 / フィルター / 期間判定 / MarkerCluster / データ読込
- `data/official-spots.json` : ちいかわ公式関連スポット
- `data/nagano-spots.json` : ナガノ先生関連スポット
- `favicon.svg` : ファビコン

## 今回の版

- 掲載基準日: 2026-08-24
- 公式関連: 70件
- ナガノ先生関連: 0件（候補精査後に追加予定）
- `spots.json` を公式関連 / ナガノ先生関連の2ファイルへ分割
- 2つのJSONは `app.js` で独立して読み込み、片方が失敗しても読み込めた側で表示を継続
- `OSHIKATSU MAP` → `CHIIKATSU MAP`
- `ちいかわ推し活MAP` → `ちいかわ推し活（ちい活）MAP`
- 「使い方」を「公式関連の使い方」「ナガセン関連の使い方」に分割
- ナガセン関連では `紹介 / 訪問 / ゆかり・関連` の掲載基準と、情報源の確認方針を案内

## データ更新時

### 1. 公式関連
`data/official-spots.json` を更新します。

### 2. ナガノ先生関連
`data/nagano-spots.json` を更新します。

`category` は以下を使用します。

```json
"category": "nagano"
```

`relationType` は以下です。

- `introduced` : ナガノ先生が紹介
- `visited` : ナガノ先生が訪問
- `related` : ナガノ先生ゆかり・関連

### 3. 掲載基準日
`app.js` 冒頭の以下を変更してください。

```js
const DATA_AS_OF = "2026-08-24";
```

### 4. 新しいシリーズ・施設を追加した場合
`app.js` の `BRAND_LABELS` に表示名を追加すると、「シリーズ・施設」フィルターへ自動表示されます。

## テストURL

通常:
`https://route0254.github.io/chiikawa-map/`

OSM障害テスト:
`https://route0254.github.io/chiikawa-map/?tileTest=osm-fail`

全背景地図障害テスト:
`https://route0254.github.io/chiikawa-map/?tileTest=all-fail`

## 注意

本サイトは非公式の個人的なファンまとめを想定しています。
営業時間・入場方法・予約条件・開催状況は変更される場合があるため、訪問前に各公式情報も確認してください。
