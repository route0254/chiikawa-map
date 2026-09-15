#!/usr/bin/env node

import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  ".."
);
const sourcePath = path.join(
  projectRoot,
  "research",
  "official-special-events-source.json"
);
const writeMode = process.argv.includes("--write");
const checkMode = process.argv.includes("--check");

function getTodayInJapan() {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(new Date());
  const values = Object.fromEntries(
    parts.map(part => [part.type, part.value])
  );

  return `${values.year}-${values.month}-${values.day}`;
}

const checkedAt = getTodayInJapan();
const indexUrls = {
  popup: "https://nagano-info.jp/pus.html",
  aquarium: "https://nagano-info.jp/nagano_aq/index.html",
  exhibition: "https://nagano-info.jp/museum.html"
};

const aquariumVenues = {
  "新江ノ島水族館": {
    slug: "enosui",
    address: "神奈川県藤沢市片瀬海岸2-19-1 新江ノ島水族館"
  },
  "仙台うみの杜水族館": {
    slug: "sendai-uminomori",
    address: "宮城県仙台市宮城野区中野4-6 仙台うみの杜水族館"
  },
  "0% IKEBUKURO": {
    slug: "zero-percent-ikebukuro",
    address: "東京都豊島区南池袋1-28-2 池袋PARCO 本館6F 0%IKEBUKURO"
  },
  "ハンズ名古屋": {
    slug: "hands-nagoya",
    address: "愛知県名古屋市中村区名駅1-1-4 ハンズ名古屋店"
  },
  "アティ郡山": {
    slug: "ati-koriyama",
    address: "福島県郡山市駅前1-16-7 アティ郡山"
  },
  "イオンモール福岡": {
    slug: "aeon-fukuoka",
    address: "福岡県糟屋郡粕屋町酒殿字老ノ木192-1 イオンモール福岡"
  },
  "MARK IS みなとみらい": {
    slug: "mark-is-minatomirai",
    address: "神奈川県横浜市西区みなとみらい3-5-1 MARK IS みなとみらい"
  },
  "イオンモール和歌山": {
    slug: "aeon-wakayama",
    address: "和歌山県和歌山市ふじと台23番地 イオンモール和歌山"
  },
  "ららぽーとTOKYO-BAY": {
    slug: "lalaport-tokyo-bay",
    address: "千葉県船橋市浜町2-1-1 ららぽーとTOKYO-BAY"
  },
  "イオンモール岡山": {
    slug: "aeon-okayama",
    address: "岡山県岡山市北区下石井1-2-1 イオンモール岡山"
  },
  "イオンモールKYOTO": {
    slug: "aeon-kyoto",
    address: "京都府京都市南区西九条鳥居口町1 イオンモールKYOTO"
  },
  "JR大宮駅": {
    slug: "jr-omiya",
    address: "埼玉県さいたま市大宮区錦町630 JR大宮駅"
  },
  "イオンモール新潟亀田インター": {
    slug: "aeon-niigata-kameda",
    address: "新潟県新潟市江南区下早通柳田1-1-1 イオンモール新潟亀田インター"
  },
  "イオンモール川口": {
    slug: "aeon-kawaguchi",
    address: "埼玉県川口市安行領根岸3180番地 イオンモール川口"
  },
  "イオンモール津南": {
    slug: "aeon-tsuminami",
    address: "三重県津市高茶屋小森町145番地 イオンモール津南"
  },
  "東武宇都宮百貨店 5Fイベントプラザ": {
    slug: "tobu-utsunomiya",
    address: "栃木県宇都宮市宮園町5-4 東武宇都宮百貨店"
  }
};

const closedStores = [
  {
    id: "nagano-market-shibuya-closed",
    name: "ナガノマーケット SHIBUYA店",
    startDate: "2022-03-12",
    endDate: "2024-05-12",
    venueName: "渋谷PARCO",
    address: "東京都渋谷区宇田川町15-1 渋谷PARCO",
    lat: 35.662,
    lng: 139.6988,
    sourceUrl: "https://nagano-info.jp/tenpo_nm/shibuya/",
    hoursText: "閉店済み",
    entryNote: "2024年5月12日に営業を終了しました。",
    description: "渋谷PARCOで営業していたナガノマーケットの公式店舗です。"
  },
  {
    id: "nagano-market-nagoya-closed",
    name: "ナガノマーケット NAGOYA店",
    startDate: "2022-03-12",
    endDate: "2024-02-04",
    venueName: "名古屋PARCO",
    address: "愛知県名古屋市中区栄3-29-1 名古屋PARCO",
    lat: 35.1636,
    lng: 136.9074,
    sourceUrl: "https://nagano-info.jp/tenpo_nm/nagoya/",
    hoursText: "閉店済み",
    entryNote: "2024年2月4日に営業を終了しました。",
    description: "名古屋PARCOで営業していたナガノマーケットの公式店舗です。"
  },
  {
    id: "nagano-market-okinawa-closed",
    name: "ナガノマーケット OKINAWA Limited Store",
    startDate: "2024-12-07",
    endDate: "2026-01-08",
    venueName: "サンエー浦添西海岸 PARCO CITY",
    address: "沖縄県浦添市西洲3-1-1 サンエー浦添西海岸 PARCO CITY 3F",
    lat: 26.2613,
    lng: 127.699,
    sourceUrl: "https://nagano-info.jp/tenpo_nm/okinawa/",
    hoursText: "閉店済み",
    entryNote: "2026年1月8日に営業を終了しました。",
    description: "サンエー浦添西海岸 PARCO CITYで営業していたナガノマーケットの期間限定公式店舗です。"
  }
];

const venueAddresses = {
  "タオル美術館": "愛媛県今治市朝倉上甲2930 タオル美術館",
  "富山大和": "富山県富山市総曲輪3-8-6 富山大和",
  "仙台フォーラス": "宮城県仙台市青葉区一番町3-11-15 仙台フォーラス",
  "大丸京都": "京都府京都市下京区四条通高倉西入立売西町79 大丸京都店",
  "大丸札幌": "北海道札幌市中央区北5条西4丁目7 大丸札幌店",
  "大丸梅田": "大阪府大阪市北区梅田3-1-1 大丸梅田店",
  "大丸梅田店": "大阪府大阪市北区梅田3-1-1 大丸梅田店",
  "金沢エムザ": "石川県金沢市武蔵町15-1 金沢エムザ",
  "イオンモール大和郡山": "奈良県大和郡山市下三橋町741 イオンモール大和郡山",
  "イオンモールつがる柏": "青森県つがる市柏稲盛幾世41 イオンモールつがる柏",
  "イオンモール千葉ニュータウン": "千葉県印西市中央北3-2 イオンモール千葉ニュータウン",
  "イオンモールとなみ": "富山県砺波市中神1-174 イオンモールとなみ",
  "イオンモール大垣": "岐阜県大垣市外野2-100 イオンモール大垣",
  "ライカ南国ホール": "鹿児島県鹿児島市中央町19-40 Li-Ka1920",
  "松坂屋名古屋店": "愛知県名古屋市中区栄3-16-1 松坂屋名古屋店"
};

const venueCoordinates = {
  "大丸京都": { lat: 35.004287, lng: 135.762009 }
};

function cleanText(value) {
  return String(value || "")
    .replace(/<br\s*\/?[^>]*>/gi, " | ")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&#x?[0-9a-f]+;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalize(value) {
  return String(value || "")
    .normalize("NFKC")
    .replace(/[\s（）()・.,，．-]/g, "")
    .toLowerCase();
}

function toDate(year, month, day) {
  return [year, month, day]
    .map((part, index) => index === 0 ? part : String(part).padStart(2, "0"))
    .join("-");
}

function parseDateRanges(value) {
  const ranges = [];
  const pattern = /(\d{4})年(\d{1,2})月(\d{1,2})日[^～|]*～\s*(?:(\d{4})年)?(\d{1,2})月(\d{1,2})日/g;

  for (const match of value.matchAll(pattern)) {
    const startYear = Number(match[1]);
    const startMonth = Number(match[2]);
    const endMonth = Number(match[5]);
    const endYear = match[4]
      ? Number(match[4])
      : endMonth < startMonth
        ? startYear + 1
        : startYear;

    ranges.push({
      startDate: toDate(startYear, startMonth, match[3]),
      endDate: toDate(endYear, endMonth, match[6])
    });
  }

  if (!ranges.length) return null;

  return {
    startDate: ranges[0].startDate,
    endDate: ranges.at(-1).endDate
  };
}

function extractArticles(html, baseUrl, pathPart) {
  const rows = [];

  for (const match of html.matchAll(/<article class="col-4 col-12-mobile special">([\s\S]*?)<\/article>/g)) {
    const block = match[1];
    const href = (block.match(/<a href="([^"]+)"/) || [])[1];
    const heading = (block.match(/<h3[^>]*>([\s\S]*?)<\/h3>/) || [])[1];
    const details = (block.match(/<p class="setumei">([\s\S]*?)<\/p>/) || [])[1];

    if (!href || !heading || !details) continue;

    const sourceUrl = new URL(href, baseUrl).href;
    if (!sourceUrl.includes(pathPart)) continue;

    rows.push({
      sourceUrl,
      heading: cleanText(heading),
      details: cleanText(details)
    });
  }

  return rows;
}

function extractPostalAddress(html) {
  const fragments = [
    ...html.matchAll(/<(?:span|p)[^>]*>([\s\S]*?〒\s*\d{3}-?\d{4}[\s\S]*?)<\/(?:span|p)>/gi)
  ];

  for (const match of fragments) {
    const text = cleanText(match[1]);
    const postalIndex = text.indexOf("〒");
    if (postalIndex < 0) continue;

    const address = text
      .slice(postalIndex)
      .replace(/^〒\s*\d{3}-?\d{4}\s*/, "")
      .replace(/^[（(]/, "")
      .replace(/[）)]$/, "")
      .trim();

    if (/[都道府県]/.test(address)) return address;
  }

  return null;
}

function isForeignEvent(article) {
  return /(?:新世界百貨店|現代百貨店|0%SEOUL|ソウル|大田新世界|ウルサン|新村店|新光三越|台中|大邱|高雄|華山|台北|釜山|聖水|韓国|台湾)/i
    .test(`${article.heading} ${article.details}`);
}

function extractHours(html) {
  const match = html.match(/営業時間：([\s\S]*?)<\/span>/);
  return match
    ? cleanText(match[1]).replace(/^\s*\|\s*/, "")
    : undefined;
}

function slugFromUrl(url) {
  const parts = new URL(url).pathname.split("/").filter(Boolean);
  const slug = parts.at(-1) === "index.html" ? parts.at(-2) : parts.at(-1);

  return slug
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function popupVenueLabel(heading) {
  return heading
    .replace(/^【終了】/, "")
    .replace(/^ナガノマーケット POP UP SHOP\s*\|?\s*/, "")
    .trim();
}

function exhibitionVenueLabel(heading) {
  return heading
    .replace(/^【終了】/, "")
    .replace(/^ナガノ展\s*/, "")
    .trim();
}

function venueHintFromDetails(details) {
  const part = details
    .split("|")
    .map(value => value.trim())
    .slice(1)
    .find(value => value && !/^\d{4}年/.test(value));

  return (part || "")
    .replace(/にて開催.*$/, "")
    .split(/\s+/)[0];
}

async function fetchText(url) {
  const response = await fetch(url, {
    headers: {
      "User-Agent": "chiikatsu-map-maintenance/1.0 (https://chiikatsu-map.com/)"
    }
  });

  if (!response.ok) {
    throw new Error(`${url}: HTTP ${response.status}`);
  }

  return response.text();
}

async function mapLimit(items, limit, callback) {
  const results = new Array(items.length);
  let cursor = 0;

  async function worker() {
    while (cursor < items.length) {
      const index = cursor++;
      results[index] = await callback(items[index], index);
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, worker)
  );
  return results;
}

function knownSpotRecords(source) {
  return ["official-spots.json", "official-events-archive.json"]
    .flatMap(fileName => source[fileName] || [])
    .filter(record => !/^(?:nagano-market-popup|nagano-aquarium|nagano-exhibition)-/.test(record.id));
}

function coordinateFromKnown(address, venueName, knownRecords) {
  const addressKey = normalize(address).replace(/開催場所.*$/, "");
  const venueKey = normalize(venueName);

  return knownRecords.find(record => {
    const recordAddress = normalize(record.address).replace(/開催場所.*$/, "");
    const recordText = normalize(`${record.name} ${record.address}`);
    return (
      (addressKey.length >= 8 && (
        recordAddress.includes(addressKey) || addressKey.includes(recordAddress)
      )) ||
      (venueKey.length >= 5 && recordText.includes(venueKey))
    );
  }) || null;
}

function baseAddress(address) {
  return String(address || "")
    .replace(/（開催場所：.*$/, "")
    .trim();
}

function locationFromKnownEvent(event, knownRecords) {
  const venueKeys = [event.venueName, event.venueHint]
    .map(normalize)
    .filter(key => key.length >= 4)
    .sort((left, right) => right.length - left.length);
  let best = null;

  for (const record of knownRecords) {
    const recordText = normalize(`${record.name} ${record.address}`);
    const score = venueKeys.find(key => recordText.includes(key))?.length || 0;

    if (score && (!best || score > best.score)) {
      best = { record, score };
    }
  }

  return best?.record || null;
}

const geocodeCache = new Map();

async function geocodeAddress(address) {
  const query = address
    .replace(/（.*$/, "")
    .replace(/\s+(?:イオンモール|PARCO|百貨店|水族館|ハンズ|MARK IS|JR).*/, "")
    .trim();

  if (geocodeCache.has(query)) return geocodeCache.get(query);

  const url = new URL("https://msearch.gsi.go.jp/address-search/AddressSearch");
  url.searchParams.set("q", query);
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`国土地理院住所検索: HTTP ${response.status}`);
  }

  const [first] = await response.json();
  const coordinates = first?.geometry?.coordinates;
  const result = Array.isArray(coordinates)
    ? { lat: coordinates[1], lng: coordinates[0] }
    : null;
  geocodeCache.set(query, result);
  return result;
}

async function addCoordinates(events, knownRecords) {
  const unresolved = [];

  for (const event of events) {
    if (!event.address && venueAddresses[event.venueName]) {
      event.address = venueAddresses[event.venueName];
    }

    const known = event.address
      ? coordinateFromKnown(event.address, event.venueName, knownRecords)
      : locationFromKnownEvent(event, knownRecords);

    if (!event.address && known) {
      event.address = baseAddress(known.address);
    }

    const coordinates = known || venueCoordinates[event.venueName] ||
      (event.address ? await geocodeAddress(event.address) : null);

    if (!coordinates || !Number.isFinite(coordinates.lat) || !Number.isFinite(coordinates.lng)) {
      unresolved.push(`${event.name}: ${event.address}`);
      continue;
    }

    event.lat = Number(coordinates.lat);
    event.lng = Number(coordinates.lng);
    delete event.venueHint;
  }

  if (unresolved.length) {
    throw new Error(`座標を確認できない会場があります:\n${unresolved.join("\n")}`);
  }
}

async function buildArticleEvents(indexUrl, pathPart, type) {
  const html = await fetchText(indexUrl);
  const articles = extractArticles(html, indexUrl, pathPart)
    .filter(article => parseDateRanges(article.details));
  const details = await mapLimit(articles, 5, async article => ({
    ...article,
    html: await fetchText(article.sourceUrl)
  }));
  const events = [];

  for (const article of details) {
    const address = extractPostalAddress(article.html);
    if (!address && isForeignEvent(article)) continue;

    const dates = parseDateRanges(article.details);
    const isPopup = type === "popup";
    const venueName = isPopup
      ? popupVenueLabel(article.heading)
      : exhibitionVenueLabel(article.heading);
    const slug = slugFromUrl(article.sourceUrl);
    const prefix = isPopup ? "nagano-market-popup" : "nagano-exhibition";
    const label = isPopup ? "ナガノマーケット POP UP SHOP" : "ナガノ展";

    events.push({
      id: `${prefix}-${dates.startDate}-${slug}`,
      name: `${label} ${venueName}`,
      ...dates,
      venueName,
      address: address || "",
      venueHint: venueHintFromDetails(article.details),
      sourceUrl: article.sourceUrl,
      hoursText: extractHours(article.html)
    });
  }

  return events;
}

async function buildAquariumEvents() {
  const html = (await fetchText(indexUrls.aquarium))
    .replace(/<!--[\s\S]*?-->/g, "");
  const plainText = cleanText(html).replace(/\s*\|\s*/g, " ");
  const events = [];

  for (const match of plainText.matchAll(/会場：\s*(.*?)\s*会期：\s*(.*?)(?=\s*営業時間：)/g)) {
    const venueName = match[1].trim();
    const dates = parseDateRanges(match[2]);
    const venue = aquariumVenues[venueName];

    if (!dates || !venue) continue;

    events.push({
      id: `nagano-aquarium-${dates.startDate}-${venue.slug}`,
      name: `ナガノの水族館 ${venueName}`,
      ...dates,
      venueName,
      address: venue.address,
      sourceUrl: indexUrls.aquarium
    });
  }

  return events;
}

function replaceSeries(source, series) {
  const index = source.series.findIndex(item => item.key === series.key);
  if (index >= 0) source.series[index] = series;
  else source.series.push(series);
}

const source = JSON.parse(await readFile(sourcePath, "utf8"));
const originalSeries = new Map(
  source.series.map(series => [series.key, series])
);
const data = {};

for (const fileName of ["official-spots.json", "official-events-archive.json"]) {
  data[fileName] = JSON.parse(
    await readFile(path.join(projectRoot, "data", fileName), "utf8")
  );
}

const popupEvents = await buildArticleEvents(indexUrls.popup, "/popupshop/", "popup");
const exhibitionEvents = await buildArticleEvents(indexUrls.exhibition, "/naganoten/", "exhibition");
const aquariumEvents = await buildAquariumEvents();
const generatedEvents = [...popupEvents, ...exhibitionEvents, ...aquariumEvents];

const minimumCounts = [
  ["POP UP SHOP", popupEvents.length, 80],
  ["ナガノの水族館", aquariumEvents.length, 15],
  ["ナガノ展", exhibitionEvents.length, 13]
];
const incompleteSeries = minimumCounts
  .filter(([, count, minimum]) => count < minimum)
  .map(([label, count, minimum]) => `${label}: ${count}件（最低${minimum}件）`);

if (incompleteSeries.length) {
  throw new Error(
    `公式ページの取得結果が少なすぎます。HTML構造または通信状況を確認してください:\n${incompleteSeries.join("\n")}`
  );
}

await addCoordinates(generatedEvents, knownSpotRecords(data));

replaceSeries(source, {
  key: "nagano-market-popup",
  label: "ナガノマーケット POP UP SHOP",
  brand: "nagano_market",
  placeType: "shop",
  relationType: "popup",
  checkedAt,
  events: popupEvents
});
replaceSeries(source, {
  key: "nagano-aquarium",
  label: "ナガノの水族館",
  brand: "nagano_market",
  placeType: "spot",
  relationType: "event",
  checkedAt,
  events: aquariumEvents
});
replaceSeries(source, {
  key: "nagano-exhibition",
  label: "ナガノ展",
  brand: "nagano_market",
  placeType: "spot",
  relationType: "event",
  checkedAt,
  events: exhibitionEvents
});
replaceSeries(source, {
  key: "nagano-market-closed-stores",
  label: "ナガノマーケット 公式店舗",
  brand: "nagano_market",
  placeType: "shop",
  relationType: "official_store",
  checkedAt,
  events: closedStores
});

source.checkedAt = checkedAt;
source.statusAsOf = checkedAt;

const managedKeys = [
  "nagano-market-popup",
  "nagano-aquarium",
  "nagano-exhibition",
  "nagano-market-closed-stores"
];

function comparableEvents(series) {
  return (series?.events || []).map(event => ({
    id: event.id,
    name: event.name,
    startDate: event.startDate,
    endDate: event.endDate,
    venueName: event.venueName,
    address: event.address,
    sourceUrl: event.sourceUrl
  }));
}

if (checkMode) {
  const changed = managedKeys.filter(key => {
    const current = source.series.find(series => series.key === key);
    return JSON.stringify(comparableEvents(originalSeries.get(key))) !==
      JSON.stringify(comparableEvents(current));
  });

  if (changed.length) {
    throw new Error(
      `ナガノ公式一覧との差分があります: ${changed.join(", ")}\n` +
      "pnpm run import:nagano-official-series で内容を確認・反映してください。"
    );
  }
}

console.log("ナガノ公式イベント取り込み");
console.log(`- POP UP SHOP: ${popupEvents.length}件`);
console.log(`- ナガノの水族館: ${aquariumEvents.length}件`);
console.log(`- ナガノ展: ${exhibitionEvents.length}件`);
console.log(`- 閉店済み公式店: ${closedStores.length}件`);
console.log(`- 国土地理院への新規住所照合: ${geocodeCache.size}件`);

if (writeMode) {
  await writeFile(sourcePath, `${JSON.stringify(source, null, 2)}\n`, "utf8");
  console.log("- 生成元JSONを更新しました。");
} else if (checkMode) {
  console.log("- 登録済みの生成元JSONと一致しています。");
} else {
  console.log("- プレビューのみです。反映する場合は --write を指定してください。");
}
