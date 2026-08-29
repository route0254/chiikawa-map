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
const sourcePath = path.join(
  projectRoot,
  "research",
  "official-special-events-source.json"
);
const currentPath = path.join(
  projectRoot,
  "data",
  "official-spots.json"
);
const archivePath = path.join(
  projectRoot,
  "data",
  "official-events-archive.json"
);
const writeMode =
  process.argv.includes("--write");
const checkMode =
  process.argv.includes("--check");

async function readJson(filePath) {
  return JSON.parse(
    await readFile(filePath, "utf8")
  );
}

function isDate(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(
    String(value || "")
  );
}

function normalize(value) {
  return String(value || "")
    .normalize("NFKC")
    .replace(/\s+/g, "")
    .toLowerCase();
}

function createGoogleMapsUrl(query) {
  return (
    "https://www.google.com/maps/search/?api=1&query=" +
    encodeURIComponent(query)
  );
}

function createCompositeKey(record) {
  return [
    record.brand,
    record.startDate,
    record.endDate,
    normalize(record.address)
  ].join("|");
}

function createRecord(
  series,
  event,
  checkedAt,
  archive
) {
  const cancelled =
    event.eventStatus === "cancelled";
  const venueAddress =
    event.venueSpace
      ? `${event.address}（開催場所：${event.venueSpace}）`
      : event.address;
  const [
    endYear,
    endMonth,
    endDay
  ] = event.endDate.split("-");
  const endLabel =
    `${endYear}年${Number(endMonth)}月${Number(endDay)}日`;
  const record = {
    id: event.id,
    name: event.name,
    category: "official",
    placeType: series.placeType,
    relationType: series.relationType,
    brand: series.brand,
    periodType: "limited",
    startDate: event.startDate,
    endDate: event.endDate,
    hoursText: cancelled
      ? "開催中止"
      : archive
        ? "開催時の会場営業時間に準ずる"
        : "会場営業時間に準ずる",
    closedDaysText: null,
    hoursInfoUrl: event.sourceUrl,
    hoursCheckedAt: checkedAt,
    reservationType:
      event.reservationType ||
      "unknown",
    reservationUrl: null,
    defaultEntryType: cancelled
      ? "other"
      : "walkin",
    crowdControlType: "other",
    crowdControlCondition:
      "announced",
    entryNote: cancelled
      ? "開催予定でしたが中止となり、実際には開催されませんでした。"
      : archive
        ? `開催当時の入店方法は公式イベントページで案内されていました。${endLabel}で終了済みです。`
        : "入店方法・販売方法は公式イベントページをご確認ください。",
    entryInfoUrl: event.sourceUrl,
    entryInfoCheckedAt: checkedAt,
    lat: event.lat,
    lng: event.lng,
    address: venueAddress,
    description: cancelled
      ? `${event.venueName}で開催予定だった${series.label}です。公式発表により開催中止となりました。`
      : archive
        ? `${event.venueName}で開催された期間限定の${series.label}です。`
        : `${event.venueName}で開催される期間限定の${series.label}です。`,
    sourceUrl: event.sourceUrl,
    mapUrl: createGoogleMapsUrl(
      `${event.venueName} ${event.address}`
    )
  };

  if (archive) {
    record.eventStatus =
      event.eventStatus || "held";
  }

  return record;
}

const source =
  await readJson(sourcePath);
const current =
  await readJson(currentPath);
const archive =
  await readJson(archivePath);

if (!isDate(source.checkedAt)) {
  throw new Error(
    "checkedAt はYYYY-MM-DD形式で指定してください。"
  );
}

const sourceEvents =
  source.series.flatMap(
    series =>
      series.events.map(event => ({
        series,
        event
      }))
  );
const managedIds = new Set();

for (const { series, event } of sourceEvents) {
  const requiredStrings = [
    series.label,
    series.brand,
    series.placeType,
    series.relationType,
    event.id,
    event.name,
    event.startDate,
    event.endDate,
    event.venueName,
    event.address,
    event.sourceUrl
  ];

  if (
    requiredStrings.some(
      value =>
        typeof value !== "string" ||
        !value.trim()
    )
  ) {
    throw new Error(
      `必須項目が不足しています: ${event.id || event.name}`
    );
  }

  if (
    !isDate(event.startDate) ||
    !isDate(event.endDate) ||
    event.startDate > event.endDate
  ) {
    throw new Error(
      `開催期間が不正です: ${event.id}`
    );
  }

  if (
    !Number.isFinite(event.lat) ||
    !Number.isFinite(event.lng)
  ) {
    throw new Error(
      `座標が不正です: ${event.id}`
    );
  }

  if (managedIds.has(event.id)) {
    throw new Error(
      `ソース内でIDが重複しています: ${event.id}`
    );
  }
  managedIds.add(event.id);
}

const records = sourceEvents.map(
  ({ series, event }) => {
    const archiveEvent =
      event.endDate < source.checkedAt;

    return {
      archive: archiveEvent,
      record: createRecord(
        series,
        event,
        source.checkedAt,
        archiveEvent
      )
    };
  }
);
const currentRecords = records
  .filter(item => !item.archive)
  .map(item => item.record);
const archiveRecords = records
  .filter(item => item.archive)
  .map(item => item.record);
const unmanagedRecords = [
  ...current,
  ...archive
].filter(
  record =>
    !managedIds.has(record.id)
);
const unmanagedIds = new Set(
  unmanagedRecords.map(
    record => record.id
  )
);
const unmanagedCompositeKeys = new Map(
  unmanagedRecords.map(
    record => [
      createCompositeKey(record),
      record.id
    ]
  )
);

for (const { record } of records) {
  if (unmanagedIds.has(record.id)) {
    throw new Error(
      `既存データとIDが衝突しています: ${record.id}`
    );
  }

  const duplicateId =
    unmanagedCompositeKeys.get(
      createCompositeKey(record)
    );

  if (duplicateId) {
    throw new Error(
      `同じブランド・会場・期間のイベントが登録済みです: ${record.id} / ${duplicateId}`
    );
  }
}

const nextCurrent = [
  ...current.filter(
    record =>
      !managedIds.has(record.id)
  ),
  ...currentRecords
];
const nextArchive = [
  ...archive.filter(
    record =>
      !managedIds.has(record.id)
  ),
  ...archiveRecords
];

function assertManagedRecords() {
  const currentById = new Map(
    current.map(record => [record.id, record])
  );
  const archiveById = new Map(
    archive.map(record => [record.id, record])
  );

  for (const item of records) {
    const expected = item.record;
    const target = item.archive
      ? archiveById
      : currentById;
    const other = item.archive
      ? currentById
      : archiveById;
    const actual = target.get(expected.id);

    if (!actual) {
      throw new Error(
        `生成対象が正しいJSONにありません: ${expected.id}`
      );
    }

    if (other.has(expected.id)) {
      throw new Error(
        `生成対象が両方のJSONにあります: ${expected.id}`
      );
    }

    if (
      JSON.stringify(actual) !==
      JSON.stringify(expected)
    ) {
      throw new Error(
        `生成元と公開データが一致しません: ${expected.id}`
      );
    }
  }
}

if (writeMode) {
  await writeFile(
    currentPath,
    JSON.stringify(
      nextCurrent,
      null,
      2
    ) + "\n",
    "utf8"
  );
  await writeFile(
    archivePath,
    JSON.stringify(
      nextArchive,
      null,
      2
    ) + "\n",
    "utf8"
  );
} else if (checkMode) {
  assertManagedRecords();
}

console.log(
  "ちい活マップ 公式系列イベント"
);
console.log(
  `- ソース: ${sourceEvents.length}件`
);
console.log(
  `- 現在・今後: ${currentRecords.length}件`
);
console.log(
  `- 終了・中止: ${archiveRecords.length}件`
);
console.log(
  writeMode
    ? "- 公開JSONへ統合しました。"
    : checkMode
      ? "- 生成元と公開JSONが一致しています。"
      : "- プレビューのみです。"
);
