# 2026-10-03 掲載情報の修正根拠（公開前の候補）

基準 main: `89e21b6ab569cc9f86ff5cb675ac78d5b5e8b025`。UI候補 `55f981c` と手帳試作 `1065a6a` は含めない。

## 名古屋PARCO

- 対象ID: `ramen-buta-nagoya`。
- [公式入店案内](https://cafe.parco.jp/event/chiikawaramenbuta_nagoya?area=029691) の2026-09-15更新を2026-10-03に確認。
- 9/19以降は平日も含めLivePocketの事前予約優先。受付終了後に残席がある場合だけ店頭当日券を予定。
- 旧「平日は予約不要」を削除。確認日と整理券条件を更新し、10/4終了日・現在掲載・ID・追加日は維持。

## 常滑の2企画

- POP UP ID: `popup-2026-10-16-aeon-tokoname`。
- [主催者一覧](https://chiikawa-info.jp/pus.html)、[主催者個別](https://chiikawa-info.jp/p26/pus_tknm/index.html)、[施設詳細](https://tokoname.aeonmall.jp/event/7b5455d4-7215-4358-94d6-88480fb5a241) を確認。
- 10/16～11/3、10:00～19:00（最終日18:00）、1F ヴィレッジヴァンガード横 特設会場。入場無料。初日9:30からA2 ノースコート東入口で整理券、初日・混雑日は同入口を優先。
- 撮影会ID: `chiikawa-photo-2026-10-18-aeon-tokoname`。
- [施設の撮影会詳細](https://tokoname.aeonmall.jp/event/1174de63-719b-42ed-8d91-7b2785b637bf) を確認。
- 10/18の11時・13時・15時、各約30～40分、1F ノースコート。各50組、当日9:30頃A2入口で合計150枚、1組上限5名に1枚、なくなり次第終了。3枠は1企画1ID。
- 撮影会の参加費は掲載ページに明記がないため無料と推測しない。事前予約の可否も未確認のまま。
- 6月の `popup-2026-06-12-aeon-tokoname` は履歴として保持。旧会場はスターバックス横で別開催。
- 緯度経度 `34.882577, 136.826418` とGoogle Maps URLは、同じ実在施設の旧掲載から再利用。館内の正確な位置を推測した座標ではなく、各会場は住所に明記。

## 川越・小樽の指定日例外

- [川越営業時間](https://www.chiikawamogumogu.jp/2026/10/02/post-2406/)、[川越予約](https://www.chiikawamogumogu.jp/2026/10/02/post-2436/)、[小樽予約](https://www.chiikawamogumogu.jp/2026/10/02/post-2429/) を2026-10-03に原文確認。
- 川越は10/17・18のみ9:30～19:00。通常の `hoursText` 9:30～17:30を維持し、日付付き `importantNotice` に例外を記録。
- 川越は10/10～12・17～18、小樽は10/10～12に終日予約制。各日前夜20時、公式LINE先着。店舗半径30km以内で位置情報ON、申込端末提示が必要。位置情報の条件は外部公式LINEの要件であり、MAPの位置情報・保存機能変更ではない。
- 小樽のベビーカステラはフリー入場予定だが混雑時制限あり。本舗と混同しない説明を付記。
- 日付依存の例外を既存enumで常時予約制/常時フリーと断定しないため、川越は `reservationType: unknown`・`defaultEntryType: other` に変更し、具体的な日付と方法を注意書きで示す。小樽の同enumは従来値を維持。
- 小樽 `entryInfoUrl: null` を今回の有効な公式予約告知URLへ更新。通常営業時間は変更しない。
- 伏見の同題告知は見出しと本文の店舗が矛盾するため保留。伏見やベビーカステラ単独IDなど、依頼外レコードは変更しない。

## コラボ一覧の4修正

- `sunflower-movie-chiikawa-2026`: [公式特設](https://www.sunflower.co.jp/lp/chiikawa/) と[公式フォトラリー案内](https://www.sunflower.co.jp/information/event/20260806.html)に合わせ、大阪～志布志（さつま／きりしま）、大洗～苫小牧夕方便（さっぽろ／ふらの）の4隻へ修正。深夜便は対象外。スタンプラリーをフォトラリーへ修正。8/6～10/31は出港便の日付として保持。
- `tokyo-metro-escape-2026`: [東京メトロ公式](https://www.tokyometro.jp/news/2026/224766.html)の正式名称と専用キットを使う駅・街の謎解きへ修正。7/24～11/3、既存リンク先IDを保持。既存地図スポットは正しいため変更しない。
- `ana-chiikawa-jet-2026`: [ANA公式](https://www.ana.co.jp/ja/jp/domestic/theme/chiikawa-jet/)の機番JA609A・運航候補路線の公表を反映。「運航路線未発表」を削除し、実際の路線は当日まで決まらないと明記。10月末就航予定・具体的開始日nullを保持し、候補路線の10/24・10/25の区切りから就航日を推定しない。
- `suntory-movie-chiikawa-2026`: [メーカー公式発表](https://prtimes.jp/main/html/rd/p/000000846.000027480.html)の「2026年9月上旬」から9/1と断定できないため、ボトル発売開始日はnullへ修正。出荷により前後する旨を付記し、終了済みレシート・応募期間は保持。
- この4件だけ `checkedAt` を2026-10-03に更新。他のコラボ既存レコード、過去コラボは変更しない。

## コレクションの3追加

既存schemaに `collection` と `upcoming` / `while_supplies_last` / `needs_review` があり、nullable期間と組み合わせて表現できる。schemaやアプリコードは変更しない。地域店舗を特定したイベントではないため、地図ピン・座標・linkedSpotIdsを追加しない。

- `gu-chiikawa-winter-2026`: [GU公式FAQ](https://faq.gu-global.com/articles/Knowledge/100015685/)を確認。1st 11/20、2nd 11/27、各日オンライン7:15予定・店舗開店時。全店舗とオンライン、1柄1色2点まで。`upcoming`。終了日未発表でnull。
- `oxiclean-chiikawa-2026`: [メーカー公式発表](https://prtimes.jp/main/html/rd/p/000000322.000009939.html)を確認。1500g限定デザインを10/2発売、全国対象店舗・EC、店舗差あり。`while_supplies_last`。終了日未発表でnull。
- `clasic-chiikawa-scrubs-2026`: [クラシコ商品告知](https://www.clasic.jp/blog/detail?product_id=4176&tp_category_id=31)と[過剰受注対応](https://www.clasic.jp/blog/detail?product_id=4189)を原文確認。10/1発売、実店舗完売、再入荷予定あり・時期未定。オンラインは確保できない注文のキャンセル・返金対応。購入可能と断定せず `needs_review`。再入荷日・終了日を捏造しない。

## ベーカリー説明の補足

- `chiikawa-bakery-shop-laforet` のdescriptionに[公式PHOTO BOOTH告知](https://chiikawabakery.jp/topics/20260928_02/)の10/6稼働予定・本POP UP SHOP限定・終了日未発表を追記。店舗のpermanent区分・元の開店日・入場方法・営業時間・追加日は保持。別の限定ピンは作らない。

## 保存根拠・変更範囲

- 原文HTMLと取得日時・SHA256はローカル `node_modules/.cache/data-audit-20261003-sources/` に保存。主催者一覧・個別は直接HTTP403だがwebの一次情報読み取りで確認し、施設公式でも日付・会場を照合。
- 新着日は既存buildが2新IDに2026-10-03を自動登録。既存IDの確認日更新をNEWにしない。古い追加日、旧会場や日付を推測しない。
- schema/保存データ形式・履歴・既存IDを維持。push・PR・merge・公開は行わない。
- コラボ・ベーカリーの9公式HTMLも同cacheへ保存。`manifest-collabs.json` に取得日時・HTTP200・SHA256を記録。原文は内部確認用で、ユーザー向け成果物には要約とURLだけを掲載する。
- 10/3時点で終了日経過の現在掲載は0件。archive移動は行わない。名古屋は10/4までのため現在掲載を維持。

## 検証

- `build:spot-pages` 終了コード0（808ページ、173 indexable）。
- `test:unit` 27件成功、`check` 成功、`test:smoke` 58件成功。すべて終了コード0。
- 独立データassert成功：対象以外のレコード・全archive・既存追加日・UI/runtimeコードを基準mainとの比較で保持確認。新着日追加は常滑の2新IDだけ。
- 390px／1440pxのブラウザQA成功。新企画詳細、指定日の注意書き、コラボ修正、3コレクションの状態別filter・地図リンクなし・横はみ出しなしを確認。
- smoke/QAは独立ポート4200。既存テストの位置情報許可先固定を検証専用configの権限設定で補正し、リポジトリのテストコードは変更しない。QA画像の地図タイルはローカル代替。
- `git diff --check` の警告は新規2ページ各3行の空白のみ。既存ジェネレーターが空のoptional項目で出力するもので、生成物一致検査を優先し、data-onlyの範囲外となるジェネレーター変更は行わない。
