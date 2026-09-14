import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  ".."
);
const file = "data/nagano-unlocated-mentions.json";
const records = JSON.parse(
  await readFile(path.join(root, file), "utf8")
);
const requiredStrings = [
  "id",
  "name",
  "mentionDate",
  "items",
  "summary",
  "locationText",
  "sourceType",
  "sourceUrl",
  "checkedAt"
];
const allowedFields = new Set(requiredStrings);
const datePattern = /^\d{4}-\d{2}-\d{2}$/;
const idPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const ids = new Set();
const errors = [];

if (!Array.isArray(records) || records.length === 0) {
  errors.push(`${file}は空でない配列にしてください。`);
} else {
  records.forEach((record, index) => {
    const location = `${file}[${index}]`;

    if (
      !record ||
      typeof record !== "object" ||
      Array.isArray(record)
    ) {
      errors.push(`${location}: オブジェクトにしてください。`);
      return;
    }

    for (const key of requiredStrings) {
      if (
        typeof record[key] !== "string" ||
        !record[key].trim()
      ) {
        errors.push(`${location}: ${key}が必要です。`);
      }
    }

    for (const key of Object.keys(record)) {
      if (!allowedFields.has(key)) {
        errors.push(`${location}: 未定義のフィールド ${key} があります。`);
      }
    }

    if (!idPattern.test(record.id || "")) {
      errors.push(`${location}: idの形式が不正です。`);
    } else if (ids.has(record.id)) {
      errors.push(`${location}: idが重複しています。`);
    }
    ids.add(record.id);

    for (const key of [
      "mentionDate",
      "checkedAt"
    ]) {
      if (!datePattern.test(record[key] || "")) {
        errors.push(`${location}: ${key}はYYYY-MM-DDで指定してください。`);
      }
    }

    try {
      const url = new URL(record.sourceUrl);
      if (url.protocol !== "https:") {
        throw new Error();
      }
    } catch {
      errors.push(`${location}: sourceUrlはHTTPSのURLにしてください。`);
    }
  });
}

if (errors.length) {
  console.error(
    `店舗未特定のナガノ先生関連データに${errors.length}件の問題があります。`
  );
  errors.forEach(error =>
    console.error(`- ${error}`)
  );
  process.exitCode = 1;
} else {
  console.log(
    `店舗未特定のナガノ先生関連データを検証しました（${records.length}件）。`
  );
}
