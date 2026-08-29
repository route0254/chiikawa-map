# 公式イベント収録漏れ監査（2026-08-29）

## 結論

現在の過去イベントデータは、公式サイト内の次の3一覧だけを収集元にしている。

- `https://chiikawa-info.jp/pus.html`（POP UP STORE、取得元393件中361件）
- `https://chiikawa-info.jp/cafe.html`（カフェ、23件）
- `https://chiikawa-info.jp/tenrankai.html`（展覧会、9件）

`research/official-history-source.json` の母集団は合計393件、`data/official-events-archive.json` の登録数は383件である。一方、ちいかわ公式総合情報サイトには上記3一覧とは別の特設ページが多数あり、シリーズ名による照合では現在の過去イベントJSONに未収録のものが確認できた。

したがって、現在の383件は「公式イベント全体」ではなく「3一覧から収集できたイベント」の件数として扱う必要がある。

## 今回の確認方法

1. 公式総合情報サイト `https://chiikawa-info.jp/` の掲載項目を確認
2. 国内の実会場を持つイベント・期間限定店舗を候補化
3. 現在JSONと過去JSONをシリーズ名で照合
4. 海外会場、オンライン販売だけの企画、常設店での商品取扱いだけの企画は候補から分離

今回は調査だけとし、`data/official-events-archive.json` への追加は行っていない。

## 確認できた主な未収録系列

| 優先度 | 系列 | 公式ページから確認できた国内会場・開催単位 | 現状 | 備考 |
| --- | --- | ---: | --- | --- |
| 最優先 | Chiikawa Baby POP UP SHOP | 少なくとも11会場 | 未収録 | 2026-08-29時点で遠鉄百貨店・羽田空港が開催中、JR大宮駅が開催予定。終了済み会場もある |
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

## Chiikawa Baby の緊急確認対象

2026-08-29時点で、次の国内3会場は公式ページ上で開催中または開催予定だが、`data/official-spots.json` に入っていない。

- 遠鉄百貨店：2026-08-21～2026-08-31
- 羽田空港第1ターミナル：2026-08-18～2026-09-28
- JR大宮駅：2026-09-02～2026-09-09

次回のデータ追加では、この3件を現在JSONへ先に追加し、終了済み会場を過去JSONへ分けるのが安全である。

## 今回は自動登録しないもの

- 海外会場
- 通販だけの企画
- 既存常設店で同じ商品の取扱いが始まっただけで、独立した催事会場・開催期間を持たないもの
- ANAやフェリーなど、地図上の単一地点に置くと実態を誤解させる移動型企画
- 公式ページが画像だけで会場・期間を示しており、文字情報をまだ確認できていない会場

これらは「イベント一覧には載せるが地図ピンは作らない」形式を将来追加する場合、改めて対象にできる。

## 推奨する次の作業順

1. Chiikawa Babyの開催中・開催予定3件を現在JSONへ追加
2. Chiikawa Baby終了分、Sanrio、寿司、てんし♡あくま、ワクワクゆうえんちを過去JSONへ追加
3. 公式画像の目視転記が必要な、ちいかわぽけっと旧弾・ヒロアカ・mini shopを追加
4. 水族館の「イベント会場」と「商品取扱いだけ」を分類してから追加
5. `official-history-source.json` の収集元を3一覧固定から「公式総合ページ＋系列ページ一覧」へ拡張
6. `(系列名・会場名・開始日・終了日)` の正規化キーで重複検査を追加

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
