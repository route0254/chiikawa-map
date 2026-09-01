import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import {
  isDateString
} from "./lib/data-utils.mjs";

const root = process.cwd();
const fileArgument = process.argv.find(
  argument => argument.startsWith("--file=")
);
const datasetArgument = process.argv.find(
  argument => argument.startsWith("--dataset=")
);
const replaceArgument = process.argv.find(
  argument => argument.startsWith("--replace=")
);

const datasetFiles = {
  official: "data/official-spots.json",
  archive: "data/official-events-archive.json",
  nagano: "data/nagano-spots.json"
};

if (!fileArgument || !datasetArgument) {
  console.log(
    "使い方: pnpm run preview:spot -- --file=research/draft.json --dataset=official"
  );
  console.log(
    "更新時は --replace=既存ID を追加してください。公開JSONは変更しません。"
  );
  process.exit(0);
}

const dataset = datasetArgument.split("=")[1];
const targetFile = datasetFiles[dataset];

if (!targetFile) {
  throw new Error(
    "--dataset は official、archive、nagano のいずれかです。"
  );
}

const draftPath = resolve(
  root,
  fileArgument.slice("--file=".length)
);
const parsedDraft = JSON.parse(
  await readFile(draftPath, "utf8")
);
const drafts = Array.isArray(parsedDraft)
  ? parsedDraft
  : [parsedDraft];
const existingSources = await Promise.all(
  Object.entries(datasetFiles).map(
    async ([key, file]) => ({
      dataset: key,
      records: JSON.parse(
        await readFile(
          resolve(root, file),
          "utf8"
        )
      )
    })
  )
);
const existing = existingSources.flatMap(
  source =>
    source.records.map(record => ({
      ...record,
      _dataset: source.dataset
    }))
);
const replaceId = replaceArgument
  ? replaceArgument.slice("--replace=".length)
  : "";

function normalize(value) {
  return String(value || "")
    .normalize("NFKC")
    .replace(/\s+/g, "")
    .toLowerCase();
}

function distanceMeters(first, second) {
  const radius = 6371000;
  const toRadians = value =>
    value * Math.PI / 180;
  const firstLat = toRadians(first.lat);
  const secondLat = toRadians(second.lat);
  const latDiff = toRadians(
    second.lat - first.lat
  );
  const lngDiff = toRadians(
    second.lng - first.lng
  );
  const value =
    Math.sin(latDiff / 2) ** 2 +
    Math.cos(firstLat) *
      Math.cos(secondLat) *
      Math.sin(lngDiff / 2) ** 2;

  return 2 * radius * Math.asin(
    Math.sqrt(value)
  );
}

function validateDraft(draft) {
  const errors = [];
  const warnings = [];
  const requiredStrings = [
    "id",
    "name",
    "category",
    "placeType",
    "relationType",
    "periodType",
    "address",
    "sourceUrl",
    "mapUrl"
  ];

  requiredStrings.forEach(key => {
    if (
      typeof draft[key] !== "string" ||
      !draft[key].trim()
    ) {
      errors.push(`${key}が未入力です。`);
    }
  });

  if (
    draft.id &&
    !/^[a-z0-9][a-z0-9-]*$/.test(draft.id)
  ) {
    errors.push(
      "idは半角英小文字・数字・ハイフンで指定してください。"
    );
  }

  if (
    !Number.isFinite(draft.lat) ||
    !Number.isFinite(draft.lng)
  ) {
    errors.push("緯度・経度が不正です。");
  }

  if (draft.periodType === "limited") {
    if (!isDateString(draft.startDate)) {
      errors.push(
        "期間限定スポットにはstartDateが必要です。"
      );
    }

    if (
      draft.endDate != null &&
      !isDateString(draft.endDate)
    ) {
      errors.push(
        "endDateはYYYY-MM-DD形式またはnullにしてください。"
      );
    }

    if (
      isDateString(draft.startDate) &&
      isDateString(draft.endDate) &&
      draft.startDate > draft.endDate
    ) {
      errors.push(
        "endDateがstartDateより前です。"
      );
    }
  }

  const sameId = existing.find(
    record =>
      record.id === draft.id &&
      record.id !== replaceId
  );
  if (sameId) {
    errors.push(
      `同じIDが${sameId._dataset}にあります。`
    );
  }

  const sameName = existing.filter(
    record =>
      record.id !== replaceId &&
      normalize(record.name) ===
        normalize(draft.name)
  );
  if (sameName.length) {
    warnings.push(
      "同名候補: " +
      sameName.slice(0, 5)
        .map(record => record.id)
        .join(", ")
    );
  }

  if (
    Number.isFinite(draft.lat) &&
    Number.isFinite(draft.lng)
  ) {
    const nearby = existing
      .filter(record =>
        record.id !== replaceId &&
        Number.isFinite(record.lat) &&
        Number.isFinite(record.lng)
      )
      .map(record => ({
        record,
        distance: distanceMeters(
          draft,
          record
        )
      }))
      .filter(item => item.distance <= 75)
      .sort(
        (first, second) =>
          first.distance - second.distance
      );

    if (nearby.length) {
      warnings.push(
        "75m以内: " +
        nearby.slice(0, 8)
          .map(item =>
            `${item.record.id}（${Math.round(item.distance)}m）`
          )
          .join(", ")
      );
    }
  }

  return { errors, warnings };
}

let errorCount = 0;

console.log(
  `追加先: ${targetFile}`
);
drafts.forEach((draft, index) => {
  const result = validateDraft(draft);
  errorCount += result.errors.length;
  console.log(
    `\n[${index + 1}] ${draft.name || draft.id || "名称未入力"}`
  );
  console.log(
    result.errors.length
      ? `エラー: ${result.errors.length}件`
      : "エラーなし"
  );
  result.errors.forEach(
    error => console.log("- " + error)
  );
  result.warnings.forEach(
    warning => console.log("- 要確認: " + warning)
  );
});

console.log(
  "\nプレビューのみです。公開JSONは変更していません。"
);

if (errorCount) {
  process.exitCode = 1;
}
