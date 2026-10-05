import { readFileSync, writeFileSync } from "node:fs";

const source = JSON.parse(readFileSync(process.env.NAGANO_FIXTURE_PATH, "utf8"));
const series = key => structuredClone(source.series.find(series => series.key === key).events);
const popup = series("nagano-market-popup");
const exhibition = series("nagano-exhibition");
const aquarium = series("nagano-aquarium");
if (process.env.NAGANO_FIXTURE_CHANGE === "endDate") {
  const extended = new Date(popup[0].endDate + "T00:00:00Z");
  extended.setUTCDate(extended.getUTCDate() + 1);
  popup[0].endDate = extended.toISOString().slice(0, 10);
}
if (process.env.NAGANO_FIXTURE_CHANGE === "address") popup[0].address = "神奈川県横浜市西区高島9-9-9 移転先";
if (process.env.NAGANO_FIXTURE_CHANGE === "missing") popup.shift();
const shortenedIds = new Set([
  "nagano-market-popup-2024-11-09-nogata", "nagano-market-popup-2024-09-19-musashimurayama",
  "nagano-market-popup-2024-08-08-shinkomatsu", "nagano-market-popup-2024-07-12-ikebukuro",
  "nagano-exhibition-2023-06-14-fukuoka"
]);
const dateLabel = date => {
  const [year, month, day] = date.split("-");
  return `${year}年${Number(month)}月${Number(day)}日`;
};
const dateRange = event => `${dateLabel(event.startDate)}～${dateLabel(event.endDate)}`;
const article = event => `<article class="col-4 col-12-mobile special"><a href="${event.sourceUrl}"><h3>${event.name}</h3><p class="setumei">${dateRange(event)} | ${event.venueName} にて開催</p></a></article>`;
const pages = new Map([
  ["https://nagano-info.jp/pus.html", [...popup].reverse().map(article).join("")],
  ["https://nagano-info.jp/museum.html", [...exhibition].reverse().map(article).join("")],
  ["https://nagano-info.jp/nagano_aq/index.html", aquarium.map(event => `<p>会場：${event.venueName}<br>会期：${dateRange(event)}<br>営業時間：10:00～19:00</p>`).join("")]
]);
for (const [index, event] of [...popup, ...exhibition].entries()) {
  const address = shortenedIds.has(event.id) ? event.address.replace(/\s(?:1F|本館[^\s]*).*$/, "") : event.address;
  const postalAddress = index % 2 ? `（〒000-0000 ${address}）` : `〒000-0000 （${address}）`;
  pages.set(event.sourceUrl, `<p>${postalAddress}</p>${event.hoursText ? `<span>営業時間：${event.hoursText}</span>` : ""}`);
}
const requests = [];
globalThis.fetch = async input => {
  const url = String(input);
  requests.push(url);
  if (pages.has(url)) return new Response(pages.get(url), { status: 200 });
  if (url.startsWith("https://msearch.gsi.go.jp/")) return new Response(JSON.stringify([{ geometry: { coordinates: [139.75, 35.68] } }]), { status: 200 });
  throw new Error(`Fixtureにない通信は許可しません: ${url}`);
};
process.on("exit", () => writeFileSync(process.env.NAGANO_FIXTURE_LOG, JSON.stringify({ requests, geocodeRequests: requests.filter(url => url.startsWith("https://msearch.gsi.go.jp/")).length })));
