#!/usr/bin/env node

import {
  readFile,
  writeFile
} from "node:fs/promises";
import path from "node:path";
import {
  fileURLToPath
} from "node:url";

const projectRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  ".."
);

const checkedAt = "2026-08-26";
const selectedYears = new Set([
  "2021",
  "2022"
]);

async function readJson(relativePath) {
  return JSON.parse(
    await readFile(
      path.join(projectRoot, relativePath),
      "utf8"
    )
  );
}

function createId(event) {
  return [
    event.sourceType,
    event.startDate,
    event.venueKey
  ].join("-");
}

function createGoogleMapsUrl(query) {
  return (
    "https://www.google.com/maps/search/?api=1&query=" +
    encodeURIComponent(query)
  );
}

function getSourceTypeLabel(sourceType) {
  const labels = {
    popup: "ちいかわPOP UP STORE",
    cafe: "ちいかわカフェ・レストラン",
    exhibition: "ちいかわの森"
  };

  return labels[sourceType] ||
    "ちいかわ公式イベント";
}

function resolveVenue(event, venues) {
  if (event.venueKey) {
    return venues.find(
      venue =>
        venue.key === event.venueKey
    );
  }

  const matches = [];

  for (const venue of venues) {
    for (const alias of venue.aliases) {
      if (
        event.venueText.includes(alias)
      ) {
        matches.push({
          venue,
          aliasLength: alias.length
        });
      }
    }
  }

  matches.sort(
    (a, b) =>
      b.aliasLength - a.aliasLength
  );

  return matches[0]?.venue || null;
}

function createRecord(event, venue) {
  const cancelled =
    event.eventStatus ===
    "cancelled";
  const year =
    event.startDate.slice(0, 4);
  const sourceTypeLabel =
    getSourceTypeLabel(
      event.sourceType
    );

  return {
    id: createId({
      ...event,
      venueKey: venue.key
    }),
    name: event.name,
    category: "official",
    placeType:
      event.sourceType === "cafe"
        ? "food"
        : event.sourceType ===
            "exhibition"
          ? "spot"
          : "shop",
    relationType:
      event.sourceType === "popup"
        ? "popup"
        : "event",
    brand: "chiikawa",
    periodType: "limited",
    startDate: event.startDate,
    endDate: event.endDate,
    hoursText: cancelled
      ? "開催中止"
      : event.isLoftSeries
        ? "開催時の会場営業時間に準ずる（最終日は18:00閉場）"
        : "開催時の会場営業時間に準ずる",
    closedDaysText: null,
    hoursInfoUrl: event.sourceUrl,
    hoursCheckedAt: checkedAt,
    reservationType: "unknown",
    reservationUrl: null,
    defaultEntryType: cancelled
      ? "other"
      : "walkin",
    crowdControlType: "other",
    crowdControlCondition: "announced",
    entryNote: cancelled
      ? "開催予定でしたが中止となり、実際には開催されませんでした。"
      : "開催当時の入店・予約方法は公式イベントページで案内されていました。" +
        event.endDate +
        "で終了済みです。",
    entryInfoUrl: event.sourceUrl,
    entryInfoCheckedAt: checkedAt,
    lat: venue.lat,
    lng: venue.lng,
    address:
      venue.address +
      "（開催場所：" +
      event.venueText +
      "）",
    description: cancelled
      ? year +
        "年に" +
        venue.name +
        "で開催予定だった" +
        sourceTypeLabel +
        "です。公式発表により開催中止となりました。"
      : year +
        "年に" +
        venue.name +
        "で開催された期間限定の" +
        sourceTypeLabel +
        "です。",
    sourceUrl: event.sourceUrl,
    mapUrl: createGoogleMapsUrl(
      venue.name + " " +
      venue.address
    ),
    eventStatus: event.eventStatus
  };
}

const candidates = await readJson(
  "research/official-history-candidates.json"
);
const venueSeeds = await readJson(
  "research/history-venue-seeds-2021-2022.json"
);
const geocodes = await readJson(
  "research/history-venue-geocodes.json"
);
const extras = await readJson(
  "research/history-extra-events-2021-2022.json"
);
const archive = await readJson(
  "data/official-events-archive.json"
);

const geocodeByKey = new Map(
  geocodes.venues.map(
    venue => [venue.key, venue]
  )
);

const venues = venueSeeds.venues.map(
  venue => {
    const geocode =
      geocodeByKey.get(venue.key);

    return {
      ...venue,
      lat: Number.isFinite(venue.lat)
        ? venue.lat
        : geocode?.lat,
      lng: Number.isFinite(venue.lng)
        ? venue.lng
        : geocode?.lng
    };
  }
);

const unresolvedVenues = venues.filter(
  venue =>
    !Number.isFinite(venue.lat) ||
    !Number.isFinite(venue.lng)
);

if (unresolvedVenues.length > 0) {
  throw new Error(
    "未解決会場があります: " +
    unresolvedVenues
      .map(venue => venue.key)
      .join(", ")
  );
}

const baseEvents = candidates.events.filter(
  event =>
    event.archiveEligible &&
    !event.alreadyRegistered &&
    selectedYears.has(
      event.startDate?.slice(0, 4)
    ) &&
    event.name !==
      extras.replacesCandidateName
);

const extraEvents = extras.events.map(
  event => ({
    ...event,
    sourceType: "popup",
    sourceUrl: extras.sourceUrl,
    eventStatus: "held",
    isLoftSeries: true
  })
);

const events = [
  ...baseEvents,
  ...extraEvents
];

const unresolvedEvents = [];
const generatedRecords = events.map(event => {
  const venue = resolveVenue(
    event,
    venues
  );

  if (!venue) {
    unresolvedEvents.push(event);
    return null;
  }

  return createRecord(event, venue);
}).filter(Boolean);

if (unresolvedEvents.length > 0) {
  throw new Error(
    "会場を割り当てられないイベントがあります: " +
    unresolvedEvents
      .map(event => event.name)
      .join(", ")
  );
}

generatedRecords.sort((a, b) => {
  return (
    b.startDate.localeCompare(
      a.startDate
    ) ||
    a.id.localeCompare(b.id)
  );
});

const existingIds = new Set(
  archive.map(spot => spot.id)
);
const records = generatedRecords.filter(
  record => !existingIds.has(record.id)
);
const skippedExistingCount =
  generatedRecords.length - records.length;
const batchIds = new Set();

for (const record of records) {
  if (
    batchIds.has(record.id)
  ) {
    throw new Error(
      "IDが重複しています: " +
      record.id
    );
  }
  batchIds.add(record.id);
}

const outputPath = path.join(
  projectRoot,
  "research",
  "history-batch-2021-2022.json"
);

await writeFile(
  outputPath,
  JSON.stringify(records, null, 2) +
    "\n",
  "utf8"
);

if (process.argv.includes("--write")) {
  const archivePath = path.join(
    projectRoot,
    "data",
    "official-events-archive.json"
  );

  await writeFile(
    archivePath,
    JSON.stringify(
      [
        ...archive,
        ...records
      ],
      null,
      2
    ) + "\n",
    "utf8"
  );
}

console.log(
  "ちい活マップ 2021～2022年履歴バッチ"
);
console.log(
  `- 一覧由来: ${baseEvents.length}件`
);
console.log(
  `- ロフト会場分割: ${extraEvents.length}件`
);
console.log(
  `- 合計: ${records.length}件`
);
console.log(
  `- 登録済みのため除外: ${skippedExistingCount}件`
);
console.log(
  `- 中止: ${records.filter(record => record.eventStatus === "cancelled").length}件`
);
console.log(
  `- 2021年: ${records.filter(record => record.startDate.startsWith("2021-")).length}件`
);
console.log(
  `- 2022年: ${records.filter(record => record.startDate.startsWith("2022-")).length}件`
);
console.log(
  process.argv.includes("--write")
    ? "- アーカイブへ統合しました。"
    : "- 調査用JSONのみ生成しました。"
);
