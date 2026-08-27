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

const batchArgument = process.argv.find(
  argument => argument.startsWith("--batch=")
);
const batchName = batchArgument
  ? batchArgument.slice("--batch=".length)
  : "2021-2022";

const batchConfigs = {
  "2021-2022": {
    label: "2021～2022年",
    checkedAt: "2026-08-26",
    venueSeedFiles: [
      "research/history-venue-seeds-2021-2022.json"
    ],
    outputFile:
      "research/history-batch-2021-2022.json",
    extrasFile:
      "research/history-extra-events-2021-2022.json",
    includes: event =>
      new Set(["2021", "2022"]).has(
        event.startDate?.slice(0, 4)
      ),
    summaryYears: ["2021", "2022"]
  },
  "2023-q4": {
    label: "2023年10～12月",
    checkedAt: "2026-08-27",
    venueSeedFiles: [
      "research/history-venue-seeds-2023-q4.json"
    ],
    outputFile:
      "research/history-batch-2023-q4.json",
    extrasFile: null,
    includes: event =>
      event.startDate >= "2023-10-01" &&
      event.startDate <= "2023-12-31",
    summaryYears: ["2023"]
  },
  "2023-q3": {
    label: "2023年7～9月",
    checkedAt: "2026-08-27",
    venueSeedFiles: [
      "research/history-venue-seeds-2023-q3.json"
    ],
    outputFile:
      "research/history-batch-2023-q3.json",
    extrasFile: null,
    includes: event =>
      event.startDate >= "2023-07-01" &&
      event.startDate <= "2023-09-30",
    summaryYears: ["2023"]
  },
  "2023-q2": {
    label: "2023年4～6月",
    checkedAt: "2026-08-27",
    venueSeedFiles: [
      "research/history-venue-seeds-2023-q2.json"
    ],
    outputFile:
      "research/history-batch-2023-q2.json",
    extrasFile: null,
    includes: event =>
      event.startDate >= "2023-04-01" &&
      event.startDate <= "2023-06-30",
    venueTextOverrides: {
      "https://chiikawa-info.jp/p23/pus_ent/index.html":
        "遠鉄百貨店 本館8階 催会場"
    },
    summaryYears: ["2023"]
  },
  "2023-q1": {
    label: "2023年1～3月",
    checkedAt: "2026-08-27",
    venueSeedFiles: [
      "research/history-venue-seeds-2023-q1.json"
    ],
    outputFile:
      "research/history-batch-2023-q1.json",
    extrasFile: null,
    includes: event =>
      event.startDate >= "2023-01-01" &&
      event.startDate <= "2023-03-31",
    summaryYears: ["2023"]
  },
  "2024-q1": {
    label: "2024年1～3月",
    checkedAt: "2026-08-27",
    venueSeedFiles: [
      "research/history-venue-seeds-2024-q1.json"
    ],
    outputFile:
      "research/history-batch-2024-q1.json",
    extrasFile: null,
    includes: event =>
      event.startDate >= "2024-01-01" &&
      event.startDate <= "2024-03-31",
    summaryYears: ["2024"]
  },
  "2024-q3": {
    label: "2024年7～9月",
    checkedAt: "2026-08-27",
    venueSeedFiles: [
      "research/history-venue-seeds-2024-q3.json",
      "research/history-venue-seeds-2024-q1.json",
      "research/history-venue-seeds-2023-q4.json",
      "research/history-venue-seeds-2023-q3.json",
      "research/history-venue-seeds-2023-q2.json",
      "research/history-venue-seeds-2021-2022.json"
    ],
    outputFile:
      "research/history-batch-2024-q3.json",
    extrasFile: null,
    includes: event =>
      event.startDate >= "2024-07-01" &&
      event.startDate <= "2024-09-30",
    summaryYears: ["2024"]
  },
  "2024-06": {
    label: "2024年6月",
    checkedAt: "2026-08-27",
    venueSeedFiles: [
      "research/history-venue-seeds-2024-06.json"
    ],
    outputFile:
      "research/history-batch-2024-06.json",
    extrasFile: null,
    includes: event =>
      event.startDate >= "2024-06-01" &&
      event.startDate <= "2024-06-30",
    summaryYears: ["2024"]
  },
  "2024-05": {
    label: "2024年5月",
    checkedAt: "2026-08-27",
    venueSeedFiles: [
      "research/history-venue-seeds-2024-05.json"
    ],
    outputFile:
      "research/history-batch-2024-05.json",
    extrasFile: null,
    includes: event =>
      event.startDate >= "2024-05-01" &&
      event.startDate <= "2024-05-31",
    summaryYears: ["2024"]
  },
  "2024-04": {
    label: "2024年4月",
    checkedAt: "2026-08-27",
    venueSeedFiles: [
      "research/history-venue-seeds-2024-04.json"
    ],
    outputFile:
      "research/history-batch-2024-04.json",
    extrasFile: null,
    includes: event =>
      event.startDate >= "2024-04-01" &&
      event.startDate <= "2024-04-30",
    summaryYears: ["2024"]
  }
};

const batchConfig = batchConfigs[batchName];

if (!batchConfig) {
  throw new Error(
    "未定義のバッチです: " + batchName
  );
}

const checkedAt = batchConfig.checkedAt;

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
const venueSeedFiles = await Promise.all(
  batchConfig.venueSeedFiles.map(readJson)
);
const venueSeeds = {
  venues: venueSeedFiles.flatMap(
    seedFile => seedFile.venues
  )
};
const geocodes = await readJson(
  "research/history-venue-geocodes.json"
);
const extras = batchConfig.extrasFile
  ? await readJson(batchConfig.extrasFile)
  : {
      replacesCandidateName: null,
      sourceUrl: null,
      events: []
    };
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
    batchConfig.includes(event) &&
    (
      !extras.replacesCandidateName ||
      event.name !==
        extras.replacesCandidateName
    )
).map(event => ({
  ...event,
  venueText:
    batchConfig.venueTextOverrides?.[
      event.sourceUrl
    ] || event.venueText
}));

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
  path.basename(batchConfig.outputFile)
);

await writeFile(
  outputPath,
  JSON.stringify(
    generatedRecords,
    null,
    2
  ) +
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
  `ちい活マップ ${batchConfig.label}履歴バッチ`
);
console.log(
  `- 一覧由来: ${baseEvents.length}件`
);
console.log(
  `- ロフト会場分割: ${extraEvents.length}件`
);
console.log(
  `- 監査用バッチ: ${generatedRecords.length}件`
);
console.log(
  `- 今回の追加対象: ${records.length}件`
);
console.log(
  `- 登録済みのため除外: ${skippedExistingCount}件`
);
console.log(
  `- 中止: ${generatedRecords.filter(record => record.eventStatus === "cancelled").length}件`
);
for (const year of batchConfig.summaryYears) {
  console.log(
    `- ${year}年: ${generatedRecords.filter(record => record.startDate.startsWith(`${year}-`)).length}件`
  );
}
console.log(
  process.argv.includes("--write")
    ? "- アーカイブへ統合しました。"
    : "- 調査用JSONのみ生成しました。"
);
