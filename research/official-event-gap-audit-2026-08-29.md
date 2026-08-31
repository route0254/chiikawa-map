# 公式イベント収録漏れ監査（2026-08-29）

## 結論

現在の過去イベントデータは、公式サイト内の次の3一覧だけを収集元にしている。

- `https://chiikawa-info.jp/pus.html`（POP UP STORE、取得元393件中361件）
- `https://chiikawa-info.jp/cafe.html`（カフェ、23件）
- `https://chiikawa-info.jp/tenrankai.html`（展覧会、9件）

`research/official-history-source.json` の母集団は合計393件、3一覧由来の過去イベント登録数は383件である。一方、ちいかわ公式総合情報サイトには上記3一覧とは別の特設ページが多数あり、シリーズ名による照合では未収録のものが確認できた。

2026年8月31日までに、特設ページ系列99件を`research/official-special-events-source.json`へ追加し、公開JSONへ統合した。現在は`data/official-spots.json`73件、`data/official-events-archive.json`481件、`data/nagano-spots.json`91件の合計645件である。特設ページのうち会場・開始日・終了日を確定できた系列は収録済みだが、水族館と東京みやげは掲載単位または開始日を確定できないため保留している。したがって、481件も「確認済みの公式一覧＋会場別日程を確認できた特設ページ系列」の件数であり、公式企画すべてを無条件に地図化した件数とは扱わない。

## 今回の確認方法

1. 公式総合情報サイト `https://chiikawa-info.jp/` の掲載項目を確認
2. 国内の実会場を持つイベント・期間限定店舗を候補化
3. 現在JSONと過去JSONをシリーズ名で照合
4. 海外会場、オンライン販売だけの企画、常設店での商品取扱いだけの企画は候補から分離

監査後、会場別の公式本文・公式画像・公式店舗情報を確認し、特設ページ系列99件を現在・過去JSONへ統合した。国内の実会場のみを対象とし、海外、通販のみ、移動型企画は除外した。

## 確認できた主な未収録系列

| 優先度 | 系列 | 公式ページから確認できた国内会場・開催単位 | 現状 | 備考 |
| --- | --- | ---: | --- | --- |
| 対応済み | Chiikawa Baby POP UP SHOP | 国内16会場 | 現在3件・過去13件 | 2025年第1弾5会場と2026年11会場。海外会場は対象外 |
| 対応済み | ちいかわぽけっと POP UP STORE 第1弾・第2弾 | 10会場 | 過去10件 | 第3弾5会場は現在JSONに登録済み |
| 対応済み | Chiikawa×Sanrio characters POP-UP SHOP | 4会場 | 過去4件 | 海外3会場は対象外 |
| 対応済み | むちゃうま!!ちいかわ寿司 | 14会場 | 過去14件 | 2024年13店舗と2026年JR京都。台湾開催は対象外 |
| 対応済み | 僕のヒーローアカデミア×ちいかわ POP UP STORE | 8会場 | 過去8件 | 公式画像の会場・日程を目視確認 |
| 対応済み | ちいかわ mini shop | 21会場 | 過去21件 | 公式総合ページの21店舗表記、特設ページ、当時のイベント記録を照合 |
| 対応済み | ちいかわ てんし♡あくま | 5会場 | 過去5件 | 東京駅・横浜・あべの・名古屋・福岡 |
| 対応済み | ちいかわワクワクゆうえんち | 6会場 | 過去6件 | 松屋銀座・大丸梅田・名古屋・帯広・静岡・博多 |
| 対応済み | PARCOとちいかわのG.W. POP UP STORE | 8会場 | 過去8件 | 仙台・池袋・浦和・名古屋・静岡・心斎橋・広島・福岡 |
| 対応済み | 超まじかるちいかわ／まじかるちいかわ（2022） | 3会場 | 過去3件 | 東京駅2件・キデイランド大阪梅田店1件 |
| 対応済み | ちいかわ観光ステーション | 1会場 | 過去1件 | 東京駅一番街 |
| 対応済み | ちいかわ×阪神タイガース POP UP STORE | 1会場 | 過去1件 | 心斎橋PARCO |
| 対応済み | 2021年ちいかわPOP UP SHOP | 2会場 | 過去2件 | 東京駅・キデイランド大阪梅田店 |
| 要判定 | ちいかわ水族館 第1弾・第2弾 | 14会場候補 | 未収録 | 展示・AR企画を伴う会場と商品取扱いのみの会場が混在するため掲載基準を先に確定する |
| 保留 | ちいかわ 東京みやげPOP UP SHOP | 期間限定取扱店10会場ほか | 未収録 | 多くの取扱店は終了日のみで開始日がなく、常設店・商品取扱店・催事場が混在するため一律登録しない |

## 特設ページ系列の対応結果

2026-08-29時点で、次の国内3会場を開催中または開催予定として`data/official-spots.json`へ追加した。

- 遠鉄百貨店：2026-08-21～2026-08-31
- 羽田空港第1ターミナル：2026-08-18～2026-09-28
- JR大宮駅：2026-09-02～2026-09-09

これに加えて、Chiikawa Baby終了済み13会場と、上表の12系列83件を過去JSONへ追加した。系列原本は`research/official-special-events-source.json`で管理し、再実行時のID重複、現在・過去の振り分け、公開JSON内の必須項目を自動検査する。

`ちいかわ mini shop`は、現行特設ページの画像には最後の2会場だけが残っていた。公式総合ページの「ロフト21店舗」表記、現行画像2会場、当時のイベント記録に残る公式特設ページ参照19会場を照合し、全21会場を復元した。店舗住所はロフト公式店舗情報、閉店した青森ロフトは当時のロフト発表、座標は既存データと国土地理院住所検索で確認した。

## 今回は自動登録しないもの

- 海外会場
- 通販だけの企画
- 既存常設店で同じ商品の取扱いが始まっただけで、独立した催事会場・開催期間を持たないもの
- ANAやフェリーなど、地図上の単一地点に置くと実態を誤解させる移動型企画
- 開始日または終了日を会場単位で確定できない取扱店
- 商品取扱いのみか、独立した催事会場かを判定できない会場

これらは「イベント一覧には載せるが地図ピンは作らない」形式を将来追加する場合、改めて対象にできる。

## 推奨する次の作業順

1. 水族館の「体験企画あり」と「商品取扱いだけ」を分類し、終了日を確定できる会場だけ追加する
2. 東京みやげは、会場別開始日を一次資料で確認できた場合だけ追加する
3. `official-history-source.json` の収集元を3一覧固定から「公式総合ページ＋系列ページ台帳」へ拡張する
4. 特設ページ系列の追加ごとに、系列・会場・開始日・終了日・住所の正規化キーで重複検査する
5. 公式総合ページに新しい特設系列が追加された際に差分検出できる監査フローを検討する

## 参照した公式ページ

- https://chiikawa-info.jp/
- https://chiikawa-info.jp/ckbaby.html
- https://chiikawa-info.jp/ck_pocket.html
- https://chiikawa-info.jp/p25/ck_sanrio/index.html
- https://chiikawa-info.jp/ck_sushi.html
- https://chiikawa-info.jp/heroaca_chiikawa.html
- https://chiikawa-info.jp/ck_minishop/index.html
- https://chiikawa-info.jp/tenshi_akuma.html
- https://chiikawa-info.jp/wakuwaku.html
- https://chiikawa-info.jp/p23/ck_aquarium/index.html
- https://chiikawa-info.jp/p23/ck_aquarium2/index.html
- https://chiikawa-info.jp/p22/chiikawa_camp/index.html
- https://chiikawa-info.jp/p22/magical/index.html
- https://chiikawa-info.jp/p22/kankou_station/index.html
- https://art.parco.jp/shinsaibashi/detail/?id=897
- https://chiikawa-info.jp/p21/t_o/index.html
- https://chiikawa-info.jp/p24/tokyo_miyage/index.html
- https://www.loft.co.jp/shop_list/index.php
- https://evolves.co.jp/chiikawa/
