# 2026-09-04 公式情報の更新確認

公式情報との比較を報告し、承認後に反映。公開JSONと作業ディレクトリのJSONは調査開始時に一致していた。

## 既存情報

| 対象ID | 変更 | 根拠 |
| --- | --- | --- |
| `movie-popup-hawaiians` / `collab-hawaiians-2026` | 終了日を9/6から9/27へ延長。コラボ一覧も同期 | [ハワイアンズ](https://www.hawaiians.co.jp/sys/show-event/28) |
| `chiikawa-park-tokyo` | 9/1から10:00〜19:00、最終入場17:40。グリーティングは9/18まで延長予定 | [営業案内](https://chiikawapark-tokyo.jp/)・[グリーティング](https://chiikawapark-tokyo.jp/news/gajr6iyo5/) |
| `movie-cafe-shibuya` / `movie-cafe-shinsaibashi` / `movie-cafe-nagoya` | 店内・テイクアウトドリンクのL.O.を渋谷20:00、心斎橋・名古屋19:00へ訂正 | [PARCO](https://cafe.parco.jp/event/information/chiikawamovie_cafe) |
| `ramen-buta-nagoya` | 平日は予約不要、土日祝は予約優先と明記 | [PARCO](https://cafe.parco.jp/event/chiikawaramenbuta_nagoya?area=029691) |
| `mogumogu-otaru` | 9/19〜9/23だけ終日予約制。前日20時受付、半径30km以内で申込み。ベビーカステラは原則フリー入場のまま | [9/4告知](https://www.chiikawamogumogu.jp/2026/09/04/post-2390/) |
| コラボ一覧 `movie-chiikawa-cafe-2026` | 誤った公式URLを訂正し、名古屋の「開催予定」を削除 | 上記PARCOページ |

誤った映画カフェURLはHTTP 200でも本文がNOT FOUNDだった。ステータスコードだけでは判断しない。

## 追加

| ID | 期間 | 根拠 |
| --- | --- | --- |
| `popup-2026-09-16-fkd-utsunomiya` | 9/16〜9/28 | [公式](https://chiikawa-info.jp/p26/pus_utnm/index.html) |
| `popup-2026-09-16-yagihashi` | 9/16〜9/28 | [公式](https://chiikawa-info.jp/p26/pus_yghs/index.html) |
| `popup-2026-09-11-aeon-nogata` | 9/11〜9/28 | [公式](https://chiikawa-info.jp/p26/pus_angt/index.html) |
| `popup-2026-09-11-future-city-favore` | 9/11〜9/27 | [公式](https://chiikawa-info.jp/p26/pus_favo/index.html) |
| `chiikawaland-popup-2026-09-11-amu-oita` | 9/11〜10/12 | [公式](https://chiikawa-info.jp/chiikawaland/oita/index.html) |
| `magical-popup-2026-09-11-kochi-tsutaya` | 9/11〜10/5 | [公式](https://chiikawa-info.jp/p26/mg_koch/index.html) |
| `bakery-popup-2026-08-13-kyoto` | 8/13〜9/9 | [公式](https://chiikawabakery.jp/topics/20260804/) |
| `chiikawa-bakery-osaka` | 6/26開店 | [店舗案内](https://chiikawabakery.jp/information-osaka/)・[開店告知](https://chiikawabakery.jp/topics/20260608_01/) |
| `chiikawa-bakery-shop-laforet` | 3/14移転開店 | [店舗案内](https://chiikawabakery.jp/information-popup_01/)・[移転告知](https://chiikawabakery.jp/topics/20260219/) |
| `chiikawaland-popup-2025-12-05-amu-kumamoto` | 2025/12/5〜2026/1/13、過去分 | [公式](https://chiikawa-info.jp/chiikawaland/kumamoto/index.html) |
| `ramen-buta-hiroshima` | 2025/4/18〜2026/8/16、過去分 | [開店告知](https://chiikawa-info.jp/chiikawa_ramenbuta/hiroshima/index.html)・[終了日](https://cafe.parco.jp/event/information/chiikawaramenbuta_hiroshima?area=029690) |

らんど・まじかる・ベーカリー京都の4件は特設イベント原本で管理する。今回確認した系列だけに`checkedAt`を指定し、既存系列の確認日は維持する。

大阪店内の[期間限定物販](https://chiikawabakery.jp/topics/20260608_02/)は同一店舗のため別ピンにせず、終了日未定・営業時間・入場方法を大阪店に併記した。ラフォーレ原宿は施設の[通常ショップ一覧](https://www.laforet.ne.jp/shop_search/shop573)にも掲載され、会期の告知がないため、物販店舗として期間指定なしで掲載する。オモカドのベーカリー本体とは別店舗で、既存ID・所在地は変更しない。

## 住所・座標

FKD宇都宮、直方、ファボーレ、高知、京都駅、アミュプラザくまもと、広島PARCOは既存の同一施設の座標を再利用した。

| 施設 | 座標（緯度・経度） | 確認方法 |
| --- | --- | --- |
| 八木橋百貨店 | 36.145950, 139.381973 | [施設公式住所](https://www.yagihashi.co.jp/access/)「埼玉県熊谷市仲町74」を国土地理院住所検索で確認 |
| アミュプラザおおいた | 33.233311, 131.606415 | [施設公式住所](https://www.jroitacity.jp/access/)「大分県大分市要町1-14」を国土地理院住所検索で確認 |
| KITTE大阪 | 34.7006219, 135.4941733 | ベーカリー公式店舗案内のGoogleマップリンク先の施設座標 |
| ラフォーレ原宿 | 35.6692109, 139.7052614 | ベーカリー公式店舗案内のGoogleマップリンク先の施設座標 |

国土地理院の取得結果は住所レベルの座標。マップの表示中心ではなく、住所検索結果または施設の地点座標を使った。

## 保留・次回確認

- [ちいかわパークストア 大阪](https://chiikawapark-tokyo.jp/news/hsmicx_vflth/)はLUCUA SOUTHに11月開店予定。具体的な日付が未発表のため台帳に保留として残した。
- 小樽の9/19〜9/23予約案内、パークの9/18までのグリーティング、大阪の期間限定物販は、次の依頼時に継続・終了を確認する。
- ラーメン豚の池袋・渋谷・心斎橋は公式も終了日未定。名古屋の10/4終了は登録済み。
- 主要公式ページと施設運営元を確認したもので、全SNS投稿・商品在庫・当日の臨時変更を網羅した記録ではない。

## 検証

- 現在79件、過去486件、ナガノ先生関連91件。既存IDの削除・変更なし。既存の過去データとナガノ先生関連データは変更なし。
- 構文・単体テスト・クラウド統合テスト・データ検証・生成物一致チェックを実施。
- 単体テスト19件、画面・アクセシビリティテスト45件が成功。Windowsでテスト用サーバーの終了待ちが残ったため、当該サーバーだけを停止し、テスト終了コード0を確認した。
- 外部リンク639件の検査は破損0件、正常221件、403や接続失敗による要確認418件。要確認をリンク切れとは扱わず、今回の変更内容は公式本文と照合した。
