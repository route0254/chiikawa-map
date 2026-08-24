# ちいかわ推し活（ちい活）MAP

GitHub Pages向けの静的Webサイトです。

## ファイル構成

- `index.html` : 画面構造
- `style.css` : デザイン / レスポンシブ対応
- `app.js` : 地図 / フィルター / 期間判定 / MarkerCluster / データ読込
- `data/official-spots.json` : ちいかわ公式関連スポット
- `data/nagano-spots.json` : ナガノ先生関連スポット
- `favicon.svg` : ファビコン
- `assets/ogp.png` : X / SNS共有用OGP画像

## 今回の版

- 掲載基準日: 2026-08-24
- 公式関連: 70件
- ナガノ先生関連: 68件（確定 15件 / 推定 53件）
- `spots.json` を公式関連 / ナガノ先生関連の2ファイルへ分割
- 2つのJSONは `app.js` で独立して読み込み、片方が失敗しても読み込めた側で表示を継続
- `OSHIKATSU MAP` → `CHIIKATSU MAP`
- `ちいかわ推し活MAP` → `ちいかわ推し活（ちい活）MAP`
- 「使い方」を「公式関連の使い方」「ナガセン関連の使い方」に分割
- ナガセン関連では `紹介 / 訪問 / ゆかり・関連` に加え、`確定 / 推定` の根拠区分を表示
- ナガセン関連の詳細画面に根拠説明・根拠リンクを追加
- 絞り込みに「ナガセン関連の確度（確定 / 推定）」を追加
- スポット名・住所・説明・シリーズ名を対象にした検索機能を追加
- 検索候補をクリックすると該当スポットへ移動して詳細を表示
- 都道府県フィルターを追加（住所から選択肢を自動生成）
- ナガセンのピンを「確定 / 推定」で見た目から区別
- 日本語対応の `Zen Maru Gothic` を採用し、全体を丸みのある表示へ調整
- X / SNS共有用のOGPメタタグと `assets/ogp.png` を追加

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

ナガセン関連では、根拠の状態も以下のフィールドで管理します。

```json
"evidenceStatus": "confirmed",
"evidenceNote": "確定・推定と判断した理由",
"evidenceUrl": "https://...",
"evidenceCheckedAt": "2026-08-24"
```

- `confirmed` : **確定**。本人SNS、作品内の明示、出版社・店舗・自治体などの公式情報から、その店・場所との関係を直接確認できるもの
- `inferred` : **推定**。作品描写、商品、外観、旅程などとの一致から特定度は高いが、一次情報だけでは店舗名・地点を完全には断定できないもの

「推定」は断定情報ではなく巡礼候補として掲載します。噂だけのものや候補を一つに絞れないものは登録しません。

※ `confirmed / inferred` はナガノ先生との関係性・場所特定の確度です。現在の営業状況や営業時間の確度を表すものではありません。

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
