#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  ".."
);

const commonFields = [
  "id",
  "name",
  "category",
  "placeType",
  "relationType",
  "brand",
  "periodType",
  "startDate",
  "endDate",
  "hoursText",
  "closedDaysText",
  "hoursInfoUrl",
  "hoursCheckedAt",
  "reservationType",
  "reservationUrl",
  "defaultEntryType",
  "crowdControlType",
  "crowdControlCondition",
  "entryNote",
  "entryInfoUrl",
  "entryInfoCheckedAt",
  "lat",
  "lng",
  "address",
  "description",
  "sourceUrl",
  "mapUrl"
];

const naganoEvidenceFields = [
  "evidenceStatus",
  "evidenceNote",
  "evidenceUrl",
  "evidenceCheckedAt"
];

const datasets = [
  {
    file: "data/official-spots.json",
    category: "official",
    fields: commonFields,
    requiredStrings: [
      "id",
      "name",
      "category",
      "placeType",
      "relationType",
      "brand",
      "periodType",
      "reservationType",
      "defaultEntryType",
      "crowdControlType",
      "crowdControlCondition",
      "entryNote",
      "address",
      "description",
      "mapUrl"
    ]
  },
  {
    file: "data/official-events-archive.json",
    category: "official",
    archive: true,
    fields: commonFields,
    requiredStrings: [
      "id",
      "name",
      "category",
      "placeType",
      "relationType",
      "brand",
      "periodType",
      "startDate",
      "endDate",
      "reservationType",
      "defaultEntryType",
      "crowdControlType",
      "crowdControlCondition",
      "entryNote",
      "address",
      "description",
      "sourceUrl",
      "mapUrl"
    ]
  },
  {
    file: "data/nagano-spots.json",
    category: "nagano",
    fields: [
      ...commonFields.slice(0, 6),
      ...naganoEvidenceFields,
      ...commonFields.slice(6)
    ],
    requiredStrings: [
      "id",
      "name",
      "category",
      "placeType",
      "relationType",
      "evidenceStatus",
      "evidenceNote",
      "evidenceUrl",
      "evidenceCheckedAt",
      "periodType",
      "reservationType",
      "defaultEntryType",
      "crowdControlType",
      "crowdControlCondition",
      "entryNote",
      "address",
      "description",
      "mapUrl"
    ]
  }
];

const enumValues = {
  placeType: new Set([
    "shop",
    "food",
    "spot",
    "lodging",
    "other"
  ]),
  periodType: new Set([
    "permanent",
    "limited"
  ]),
  reservationType: new Set([
    "not_available",
    "optional",
    "priority",
    "required",
    "unknown"
  ]),
  defaultEntryType: new Set([
    "walkin",
    "reservation_priority",
    "reservation_required",
    "ticket_required",
    "other"
  ]),
  crowdControlType: new Set([
    "none",
    "numbered_ticket",
    "lottery",
    "timed_entry",
    "admission_ticket",
    "other"
  ]),
  crowdControlCondition: new Set([
    "none",
    "announced",
    "when_crowded",
    "always"
  ])
};

const relationTypes = {
  official: new Set([
    "official_store",
    "official_facility",
    "collaboration",
    "popup",
    "event"
  ]),
  nagano: new Set([
    "introduced",
    "visited",
    "related"
  ])
};

const officialBrands = new Set([
  "chiikawaland",
  "magical_chiikawa",
  "mogumogu",
  "chiikawa_park",
  "chiikawa_restaurant",
  "chiikawa_bakery",
  "ramen_buta",
  "chiikawa_yaki",
  "shisa_store",
  "chiikawa_pocket",
  "nagano_market",
  "chiikawa_movie",
  "tokyo_banana",
  "chiikawa",
  "other"
]);

const evidenceStatuses = new Set([
  "confirmed",
  "inferred"
]);

const confirmedOpenEndedLimitedSpotIds = new Set([
  "ramen-buta-shibuya",
  "ramen-buta-shinsaibashi"
]);

const dateFields = [
  "startDate",
  "endDate",
  "hoursCheckedAt",
  "entryInfoCheckedAt",
  "evidenceCheckedAt"
];

const freshnessRules = {
  hoursCheckedAt: 90,
  entryInfoCheckedAt: 90,
  evidenceCheckedAt: 365
};

const endingSoonNoticeDays = 14;

const millisecondsPerDay =
  24 * 60 * 60 * 1000;

const today =
  new Date().toISOString().slice(0, 10);

const urlFields = [
  "hoursInfoUrl",
  "reservationUrl",
  "entryInfoUrl",
  "evidenceUrl",
  "sourceUrl",
  "mapUrl"
];

const numericFields = new Set([
  "lat",
  "lng"
]);

const errors = [];
const warnings = [];
const notices = [];
const seenIds = new Map();
const counts = new Map();

function describeSpot(file, index, spot) {
  const id =
    spot && typeof spot.id === "string" && spot.id.trim()
      ? spot.id.trim()
      : `index:${index}`;

  return `${file} [${id}]`;
}

function addError(location, message) {
  errors.push(`${location}: ${message}`);
}

function addWarning(location, message) {
  warnings.push(`${location}: ${message}`);
}

function addNotice(location, message) {
  notices.push(`${location}: ${message}`);
}

function isNonEmptyString(value) {
  return (
    typeof value === "string" &&
    value.trim().length > 0
  );
}

function isValidDateString(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const [year, month, day] =
    value.split("-").map(Number);

  const date = new Date(
    Date.UTC(year, month - 1, day)
  );

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

function getDaysSince(dateString) {
  return Math.floor(
    (
      Date.parse(`${today}T00:00:00Z`) -
      Date.parse(`${dateString}T00:00:00Z`)
    ) /
    millisecondsPerDay
  );
}

function validateShape(dataset, spot, index) {
  const location = describeSpot(
    dataset.file,
    index,
    spot
  );

  if (
    spot === null ||
    typeof spot !== "object" ||
    Array.isArray(spot)
  ) {
    addError(
      location,
      "スポットはオブジェクトである必要があります"
    );
    return false;
  }

  const expectedFields = new Set(dataset.fields);

  for (const field of dataset.fields) {
    if (!Object.hasOwn(spot, field)) {
      addError(
        location,
        `フィールド ${field} がありません`
      );
    }
  }

  for (const field of Object.keys(spot)) {
    if (!expectedFields.has(field)) {
      addWarning(
        location,
        `未定義のフィールド ${field} があります`
      );
    }
  }

  for (const [field, value] of Object.entries(spot)) {
    if (numericFields.has(field)) {
      continue;
    }

    if (
      expectedFields.has(field) &&
      value !== null &&
      typeof value !== "string"
    ) {
      addError(
        location,
        `${field} は文字列または null である必要があります`
      );
    }
  }

  return true;
}

function validateRequiredFields(dataset, spot, location) {
  for (const field of dataset.requiredStrings) {
    if (!isNonEmptyString(spot[field])) {
      addError(
        location,
        `${field} は空でない文字列である必要があります`
      );
    }
  }

  for (const field of numericFields) {
    if (
      typeof spot[field] !== "number" ||
      !Number.isFinite(spot[field])
    ) {
      addError(
        location,
        `${field} は有限の数値である必要があります`
      );
    }
  }
}

function validateId(spot, location) {
  if (!isNonEmptyString(spot.id)) {
    return;
  }

  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(spot.id)) {
    addError(
      location,
      "id は小文字英数字とハイフンのみで指定してください"
    );
  }

  if (seenIds.has(spot.id)) {
    addError(
      location,
      `id が ${seenIds.get(spot.id)} と重複しています`
    );
    return;
  }

  seenIds.set(spot.id, location);
}

function validateEnums(dataset, spot, location) {
  if (spot.category !== dataset.category) {
    addError(
      location,
      `category は ${dataset.category} である必要があります`
    );
  }

  for (const [field, allowedValues] of Object.entries(enumValues)) {
    if (!allowedValues.has(spot[field])) {
      addError(
        location,
        `${field} の値 ${JSON.stringify(spot[field])} は未定義です`
      );
    }
  }

  if (!relationTypes[dataset.category].has(spot.relationType)) {
    addError(
      location,
      `relationType の値 ${JSON.stringify(spot.relationType)} は ${dataset.category} では使用できません`
    );
  }

  if (
    dataset.category === "official" &&
    !officialBrands.has(spot.brand)
  ) {
    addError(
      location,
      `brand の値 ${JSON.stringify(spot.brand)} は app.js のブランド一覧にありません`
    );
  }

  if (
    dataset.category === "nagano" &&
    spot.brand !== null
  ) {
    addWarning(
      location,
      "ナガノ先生関連スポットの brand は通常 null です"
    );
  }

  if (
    dataset.category === "nagano" &&
    !evidenceStatuses.has(spot.evidenceStatus)
  ) {
    addError(
      location,
      `evidenceStatus の値 ${JSON.stringify(spot.evidenceStatus)} は未定義です`
    );
  }
}

function validateCoordinates(spot, location) {
  if (
    typeof spot.lat === "number" &&
    Number.isFinite(spot.lat) &&
    (spot.lat < -90 || spot.lat > 90)
  ) {
    addError(
      location,
      "lat は -90 から 90 の範囲で指定してください"
    );
  }

  if (
    typeof spot.lng === "number" &&
    Number.isFinite(spot.lng) &&
    (spot.lng < -180 || spot.lng > 180)
  ) {
    addError(
      location,
      "lng は -180 から 180 の範囲で指定してください"
    );
  }
}

function validateDates(spot, location) {
  for (const field of dateFields) {
    const value = spot[field];

    if (value === undefined || value === null) {
      continue;
    }

    if (
      typeof value !== "string" ||
      !isValidDateString(value)
    ) {
      addError(
        location,
        `${field} は YYYY-MM-DD 形式の実在する日付にしてください`
      );
    }
  }

  for (const [field, maxAgeDays] of Object.entries(freshnessRules)) {
    const value = spot[field];

    if (!isValidDateString(value ?? "")) {
      continue;
    }

    const ageDays = getDaysSince(value);

    if (ageDays < 0) {
      addError(
        location,
        `${field} が未来の日付になっています`
      );
    } else if (ageDays > maxAgeDays) {
      addWarning(
        location,
        `${field} の確認から ${ageDays}日経過しています。${maxAgeDays}日以内を目安に再確認してください`
      );
    }
  }

  if (
    isValidDateString(spot.startDate ?? "") &&
    isValidDateString(spot.endDate ?? "") &&
    spot.startDate > spot.endDate
  ) {
    addError(
      location,
      "startDate が endDate より後になっています"
    );
  }

  if (
    spot.periodType === "limited" &&
    !isNonEmptyString(spot.startDate)
  ) {
    addWarning(
      location,
      "期間限定スポットですが startDate がありません"
    );
  }

  if (
    spot.periodType === "limited" &&
    !isNonEmptyString(spot.endDate)
  ) {
    if (
      confirmedOpenEndedLimitedSpotIds.has(spot.id)
    ) {
      addNotice(
        location,
        "公式情報で終了日未定と確認済みです。終了日発表時に endDate を更新してください"
      );
    } else {
      addWarning(
        location,
        "期間限定スポットですが endDate がありません。終了済み自動非表示の対象になりません"
      );
    }
  }

  if (
    spot.periodType === "limited" &&
    isValidDateString(spot.endDate ?? "")
  ) {
    const daysUntilEnd = -getDaysSince(spot.endDate);

    if (
      daysUntilEnd >= 0 &&
      daysUntilEnd <= endingSoonNoticeDays
    ) {
      addNotice(
        location,
        daysUntilEnd === 0
          ? "期間限定スポットの終了日当日です"
          : `期間限定スポットの終了まで残り${daysUntilEnd}日です`
      );
    }
  }
}

function validateArchiveStatus(
  dataset,
  spot,
  location
) {
  if (!dataset.archive) {
    return;
  }

  if (
    spot.periodType !== "limited" ||
    !isValidDateString(
      spot.endDate ?? ""
    ) ||
    spot.endDate >= today
  ) {
    addError(
      location,
      "過去イベントJSONには終了日が今日より前の期間限定スポットだけを登録してください"
    );
  }
}

function validateUrls(spot, location) {
  for (const field of urlFields) {
    const value = spot[field];

    if (value === undefined || value === null) {
      continue;
    }

    if (!isNonEmptyString(value)) {
      addError(
        location,
        `${field} は URL 文字列または null にしてください`
      );
      continue;
    }

    let url;

    try {
      url = new URL(value);
    } catch {
      addError(
        location,
        `${field} は有効な絶対URLではありません`
      );
      continue;
    }

    if (
      url.protocol !== "https:" &&
      url.protocol !== "http:"
    ) {
      addError(
        location,
        `${field} は http または https URL にしてください`
      );
    }

    if (url.protocol === "http:") {
      addWarning(
        location,
        `${field} が暗号化されていない HTTP URL です: ${value}`
      );
    }
  }
}

async function loadDataset(dataset) {
  const absolutePath = path.join(
    projectRoot,
    dataset.file
  );

  let text;

  try {
    text = await readFile(absolutePath, "utf8");
  } catch (error) {
    addError(
      dataset.file,
      `ファイルを読み込めません: ${error.message}`
    );
    return [];
  }

  let spots;

  try {
    spots = JSON.parse(text);
  } catch (error) {
    addError(
      dataset.file,
      `JSONを解析できません: ${error.message}`
    );
    return [];
  }

  if (!Array.isArray(spots)) {
    addError(
      dataset.file,
      "最上位は配列である必要があります"
    );
    return [];
  }

  counts.set(dataset.file, spots.length);
  return spots;
}

for (const dataset of datasets) {
  const spots = await loadDataset(dataset);

  spots.forEach((spot, index) => {
    if (!validateShape(dataset, spot, index)) {
      return;
    }

    const location = describeSpot(
      dataset.file,
      index,
      spot
    );

    validateRequiredFields(dataset, spot, location);
    validateId(spot, location);
    validateEnums(dataset, spot, location);
    validateCoordinates(spot, location);
    validateDates(spot, location);
    validateArchiveStatus(
      dataset,
      spot,
      location
    );
    validateUrls(spot, location);
  });
}

const total = [...counts.values()].reduce(
  (sum, count) => sum + count,
  0
);

console.log("ちい活マップ データ検証");

for (const dataset of datasets) {
  const count = counts.get(dataset.file);
  console.log(
    `- ${dataset.file}: ${count ?? "読込失敗"}件`
  );
}

console.log(`- 合計: ${total}件`);
console.log(`- エラー: ${errors.length}件`);
console.log(`- 警告: ${warnings.length}件`);
console.log(`- 確認情報: ${notices.length}件`);

if (notices.length > 0) {
  console.log("\n確認情報:");

  for (const notice of notices) {
    console.log(`- ${notice}`);
  }
}

if (warnings.length > 0) {
  console.log("\n警告:");

  for (const warning of warnings) {
    console.log(`- ${warning}`);
  }
}

if (process.env.GITHUB_ACTIONS === "true") {
  for (const notice of notices) {
    const escapedNotice = notice
      .replaceAll("%", "%25")
      .replaceAll("\r", "%0D")
      .replaceAll("\n", "%0A");

    console.log(
      `::notice title=スポットデータ確認情報::${escapedNotice}`
    );
  }

  for (const warning of warnings) {
    const escapedWarning = warning
      .replaceAll("%", "%25")
      .replaceAll("\r", "%0D")
      .replaceAll("\n", "%0A");

    console.log(
      `::warning title=スポットデータ要確認::${escapedWarning}`
    );
  }

  for (const error of errors) {
    const escapedError = error
      .replaceAll("%", "%25")
      .replaceAll("\r", "%0D")
      .replaceAll("\n", "%0A");

    console.log(
      `::error title=スポットデータ検証エラー::${escapedError}`
    );
  }
}

if (errors.length > 0) {
  console.error("\nエラー:");

  for (const error of errors) {
    console.error(`- ${error}`);
  }

  process.exitCode = 1;
} else {
  console.log("\n検証に合格しました。");
}
