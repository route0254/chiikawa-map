import fs from "node:fs";
import path from "node:path";
import {
  fileURLToPath
} from "node:url";

const rootDirectory = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  ".."
);

const files = {
  current: path.join(
    rootDirectory,
    "data",
    "collaborations-current.json"
  ),
  archive: path.join(
    rootDirectory,
    "data",
    "collaborations-archive.json"
  )
};

const validCategories = new Set([
  "experience",
  "food",
  "campaign",
  "collection",
  "media_sports"
]);

const validStatuses = {
  current: new Set([
    "active",
    "upcoming",
    "application_only",
    "while_supplies_last",
    "needs_review"
  ]),
  archive: new Set([
    "ended",
    "past"
  ])
};

const idPattern =
  /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const datePattern = /^\d{4}-\d{2}-\d{2}$/;
const errors = [];

function readJson(filePath) {
  try {
    return JSON.parse(
      fs.readFileSync(filePath, "utf8")
    );
  } catch (error) {
    errors.push(
      `${path.relative(rootDirectory, filePath)}: ${error.message}`
    );
    return [];
  }
}

function addError(type, index, message) {
  errors.push(
    `data/collaborations-${type}.json[${index}]: ${message}`
  );
}

function isNonEmptyString(value) {
  return (
    typeof value === "string" &&
    value.trim().length > 0
  );
}

function isValidDate(value) {
  if (!datePattern.test(value)) {
    return false;
  }

  const date = new Date(
    `${value}T00:00:00Z`
  );

  return (
    !Number.isNaN(date.getTime()) &&
    date.toISOString().slice(0, 10) === value
  );
}

function validateStringArray(
  type,
  index,
  record,
  key,
  allowEmpty = false
) {
  const values = record[key];

  if (
    !Array.isArray(values) ||
    (!allowEmpty && values.length === 0)
  ) {
    addError(
      type,
      index,
      `${key}は${allowEmpty ? "配列" : "空でない配列"}にしてください。`
    );
    return;
  }

  if (
    values.some(value =>
      !isNonEmptyString(value)
    )
  ) {
    addError(
      type,
      index,
      `${key}には空でない文字列だけを指定してください。`
    );
  }

  if (
    new Set(values).size !== values.length
  ) {
    addError(
      type,
      index,
      `${key}に重複があります。`
    );
  }
}

function validatePeriod(
  type,
  recordIndex,
  period,
  periodIndex
) {
  const prefix =
    `periods[${periodIndex}]`;

  if (
    !period ||
    typeof period !== "object" ||
    Array.isArray(period)
  ) {
    addError(
      type,
      recordIndex,
      `${prefix}はオブジェクトにしてください。`
    );
    return;
  }

  if (!isNonEmptyString(period.label)) {
    addError(
      type,
      recordIndex,
      `${prefix}.labelが必要です。`
    );
  }

  if (typeof period.note !== "string") {
    addError(
      type,
      recordIndex,
      `${prefix}.noteは文字列にしてください。`
    );
  }

  for (const key of [
    "startDate",
    "endDate"
  ]) {
    const value = period[key];

    if (
      value !== null &&
      !isValidDate(value)
    ) {
      addError(
        type,
        recordIndex,
        `${prefix}.${key}はYYYY-MM-DDまたはnullにしてください。`
      );
    }
  }

  if (
    period.startDate &&
    period.endDate &&
    period.startDate > period.endDate
  ) {
    addError(
      type,
      recordIndex,
      `${prefix}の終了日が開始日より前です。`
    );
  }
}

const recordsByType = {
  current: readJson(files.current),
  archive: readJson(files.archive)
};

const officialIds = new Set(
  [
    "official-spots.json",
    "official-events-archive.json"
  ].flatMap(fileName => {
    const filePath = path.join(
      rootDirectory,
      "data",
      fileName
    );
    const records = readJson(filePath);

    return Array.isArray(records)
      ? records.map(record => record.id)
      : [];
  })
);

const allIds = new Map();

for (const [type, records] of
  Object.entries(recordsByType)) {
  if (
    !Array.isArray(records) ||
    records.length === 0
  ) {
    errors.push(
      `data/collaborations-${type}.jsonは空でない配列にしてください。`
    );
    continue;
  }

  records.forEach((record, index) => {
    if (
      !record ||
      typeof record !== "object" ||
      Array.isArray(record)
    ) {
      addError(
        type,
        index,
        "レコードはオブジェクトにしてください。"
      );
      return;
    }

    for (const key of [
      "id",
      "title",
      "partner",
      "summary",
      "areaText",
      "sourceUrl",
      "checkedAt"
    ]) {
      if (!isNonEmptyString(record[key])) {
        addError(
          type,
          index,
          `${key}が必要です。`
        );
      }
    }

    if (
      isNonEmptyString(record.id) &&
      !idPattern.test(record.id)
    ) {
      addError(
        type,
        index,
        "idは小文字英数字とハイフンで指定してください。"
      );
    }

    if (allIds.has(record.id)) {
      addError(
        type,
        index,
        `idが重複しています: ${record.id}`
      );
    } else {
      allIds.set(record.id, type);
    }

    if (!validCategories.has(record.category)) {
      addError(
        type,
        index,
        `categoryが不正です: ${record.category}`
      );
    }

    if (!validStatuses[type].has(record.status)) {
      addError(
        type,
        index,
        `statusが不正です: ${record.status}`
      );
    }

    try {
      const sourceUrl = new URL(
        record.sourceUrl
      );

      if (sourceUrl.protocol !== "https:") {
        throw new Error();
      }
    } catch {
      addError(
        type,
        index,
        "sourceUrlはHTTPSのURLにしてください。"
      );
    }

    if (!isValidDate(record.checkedAt)) {
      addError(
        type,
        index,
        "checkedAtはYYYY-MM-DDにしてください。"
      );
    }

    validateStringArray(
      type,
      index,
      record,
      "channels"
    );
    validateStringArray(
      type,
      index,
      record,
      "tags"
    );
    validateStringArray(
      type,
      index,
      record,
      "linkedSpotIds",
      true
    );

    if (
      Array.isArray(record.linkedSpotIds)
    ) {
      record.linkedSpotIds.forEach(id => {
        if (!officialIds.has(id)) {
          addError(
            type,
            index,
            `linkedSpotIdsのIDが公式スポットにありません: ${id}`
          );
        }
      });
    }

    if (
      !Array.isArray(record.periods) ||
      record.periods.length === 0
    ) {
      addError(
        type,
        index,
        "periodsは空でない配列にしてください。"
      );
    } else {
      record.periods.forEach(
        (period, periodIndex) =>
          validatePeriod(
            type,
            index,
            period,
            periodIndex
          )
      );
    }
  });
}

if (errors.length) {
  console.error(
    `コラボデータの検証で${errors.length}件の問題が見つかりました。`
  );
  errors.forEach(error =>
    console.error(`- ${error}`)
  );
  process.exitCode = 1;
} else {
  console.log(
    `コラボデータを検証しました（開催中・予定 ${recordsByType.current.length}件、過去 ${recordsByType.archive.length}件）。`
  );
}
