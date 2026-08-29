# 公式イベント収録漏れ監査（2026-08-29）

## 結論

現在の過去イベントデータは、公式サイト内の次の3一覧だけを収集元にしている。

- `https://chiikawa-info.jp/pus.html`（POP UP STORE、取得元393件中361件）
- `https://chiikawa-info.jp/cafe.html`（カフェ、23件）
- `https://chiikawa-info.jp/tenrankai.html`（展覧会、9件）

`research/official-history-source.json` の母集団は合計393件、3一覧由来の過去イベント登録数は383件である。一方、ちいかわ公式総合情報サイトには上記3一覧とは別の特設ページが多数あり、シリーズ名による照合では未収録のものが確認できた。今回、別管理の確認済み原本からChiikawa Baby終了済み8件を追加したため、`data/official-events-archive.json`の総数は391件となった。

したがって、現在の391件も「確認済みの3一覧＋Chiikawa Baby国内会場」の件数であり、公式イベント全体を網羅した件数とは扱わない。

## 今回の確認方法

1. 公式総合情報サイト `https://chiikawa-info.jp/` の掲載項目を確認
2. 国内の実会場を持つイベント・期間限定店舗を候補化
3. 現在JSONと過去JSONをシリーズ名で照合
4. 海外会場、オンライン販売だけの企画、常設店での商品取扱いだけの企画は候補から分離

監査後の第1弾として、Chiikawa Baby国内11会場を会場別公式ページで確認し、現在JSONへ3件、過去JSONへ8件追加した。

## 確認できた主な未収録系列

| 優先度 | 系列 | 公式ページから確認できた国内会場・開催単位 | 現状 | 備考 |
| --- | --- | ---: | --- | --- |
| 一部対応済み | Chiikawa Baby POP UP SHOP | 2026年国内11会場 | 現在3件・過去8件を登録済み | 2026-08-29基準。海外会場は対象外。2025年第1弾は画像内の会場別情報確認が必要 |
| 最優先 | ちいかわぽけっと POP UP STORE 第1弾・第2弾 | 複数会場 | 未収録 | 第3弾5会場は現在JSONに登録済み。旧弾の会場情報は公式ページ画像の確認・転記が必要 |
| 高 | Chiikawa×Sanrio characters POP-UP SHOP | 4会場 | 未収録 | 北千住・京都・あべの・JR池袋。海外3会場は対象外 |
| 高 | むちゃうま!!ちいかわ寿司 | 少なくとも14会場 | 未収録 | 2024年の13店舗と2026年JR京都。台湾開催は対象外 |
| 高 | 僕のヒーローアカデミア×ちいかわ POP UP STORE | 8会場 | 未収録 | 公式総合ページが全国8か所と明記。会場別日程は画像確認が必要 |
| 高 | ちいかわ mini shop | 21会場 | 未収録 | ロフト21店舗。会場別日程は画像確認が必要 |
| 高 | ちいかわ てんし♡あくま | 5会場 | 未収録 | 東京駅・横浜・あべの・名古屋・福岡 |
| 高 | ちいかわワクワクゆうえんち | 6会場 | 未収録 | 松屋銀座・大丸梅田・名古屋・帯広・静岡・博多 |
| 高 | PARCOとちいかわのG.W. POP UP STORE | 8会場 | 未収録 | 仙台・池袋・浦和・名古屋・静岡・心斎橋・広島・福岡 |
| 中 | 超まじかるちいかわ | 2会場 | 未収録 | 東京駅・キデイランド大阪梅田店 |
| 中 | まじかるちいかわ（2022） | 1会場 | 未収録 | 東京駅一番街 |
| 中 | ちいかわ観光ステーション | 1会場 | 未収録 | 東京駅一番街 |
| 中 | ちいかわ×阪神タイガース POP UP STORE | 1会場 | 未収録 | 心斎橋PARCO |
| 中 | 2021年ちいかわPOP UP SHOP | 2会場 | 未収録 | 東京・大阪。会場別情報の確認が必要 |
| 要判定 | ちいかわ水族館 第1弾・第2弾 | 14会場候補 | 未収録 | 展示・AR企画を伴う会場と商品取扱いのみの会場が混在するため掲載基準を先に確定する |
| 要確認 | ちいかわ 東京みやげPOP UP SHOP | 複数会場 | 未収録 | 公式総合ページ上の開催期間は2024-12-26～2026-01-31。会場別日程の抽出が必要 |

## Chiikawa Baby の対応結果

2026-08-29時点で、次の国内3会場を開催中または開催予定として`data/official-spots.json`へ追加した。

- 遠鉄百貨店：2026-08-21～2026-08-31
- 羽田空港第1ターミナル：2026-08-18～2026-09-28
- JR大宮駅：2026-09-02～2026-09-09

これに加えて、ペリエ千葉・ながの東急・京都高島屋・イオンモール岡山・イオンモール太田・イオンモール白山・キデイランド大阪梅田店・イオンモール沖縄ライカムの終了済み8会場を過去JSONへ追加した。系列原本は`research/official-special-events-source.json`で管理し、再実行時の重複と現在・過去の振り分けを自動検査する。2025年第1弾は会場別情報が公式ページの画像内にあるため、この11件へ混ぜず、目視確認後の次回候補として残す。

## 今回は自動登録しないもの

- 海外会場
- 通販だけの企画
- 既存常設店で同じ商品の取扱いが始まっただけで、独立した催事会場・開催期間を持たないもの
- ANAやフェリーなど、地図上の単一地点に置くと実態を誤解させる移動型企画
- 公式ページが画像だけで会場・期間を示しており、文字情報をまだ確認できていない会場

これらは「イベント一覧には載せるが地図ピンは作らない」形式を将来追加する場合、改めて対象にできる。

## 推奨する次の作業順

1. Sanrio、寿司、てんし♡あくま、ワクワクゆうえんちを系列単位で原本へ追加
2. 公式画像の目視転記が必要な、ちいかわぽけっと旧弾・ヒロアカ・mini shopを追加
3. 水族館の「イベント会場」と「商品取扱いだけ」を分類してから追加
4. `official-history-source.json` の収集元を3一覧固定から「公式総合ページ＋系列ページ一覧」へ拡張
5. 特設ページ系列の追加ごとに、系列・会場・開始日・終了日・住所の正規化キーで重複検査する

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
