# Otaru entry source status — 2026-10-01

- Record: `mogumogu-otaru` in `data/official-spots.json`.
- Previously linked official free-entry notice: https://www.chiikawamogumogu.jp/2026/08/03/post-2293/ — both HEAD and GET returned HTTP 404 on 2026-10-01. Its search result remains indexed, but the live page is gone.
- Earlier special-reservation notice for September 19–23: https://www.chiikawamogumogu.jp/2026/09/04/post-2390/ — both HEAD and GET returned HTTP 404 on 2026-10-01. This time-limited notice does not establish today's entry method.
- Live official store page: https://www.chiikawamogumogu.jp/stores/otaru/ — HTTP 200 and confirms the store, address, and hours, but does not state the current default entry method.
- Live generic reservation instructions: https://www.chiikawamogumogu.jp/yoyaku/ — explain the process when reservations apply, but do not establish whether they apply to Otaru now.
- Data decision: keep the store record and its store source, mark the current entry method as unconfirmed, remove the broken optional `entryInfoUrl` from the live click path, and retain the URLs here as source history. Check for a new official entry announcement before asserting free entry or a reservation rule again.
