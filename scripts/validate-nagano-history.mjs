#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  ".."
);
const dataFile = path.join(
  projectRoot,
  "data/nagano-history.json"
);

const allowedTags = new Set([
  "creation",
  "line",
  "publishing",
  "chiikawa",
  "milestones"
]);
const errors = [];

function isNonEmptyString(value) {
  return (
    typeof value === "string" &&
    value.trim().length > 0
  );
}

function validateSources(sources, location) {
  if (!Array.isArray(sources) || !sources.length) {
    errors.push(
      `${location}: sources は1件以上必要です`
    );
    return;
  }

  sources.forEach((source, index) => {
    const sourceLocation =
      `${location}.sources[${index}]`;

    if (
      !source ||
      typeof source !== "object" ||
      Array.isArray(source)
    ) {
      errors.push(
        `${sourceLocation}: オブジェクトである必要があります`
      );
      return;
    }

    if (!isNonEmptyString(source.label)) {
      errors.push(
        `${sourceLocation}.label: 空でない文字列が必要です`
      );
    }

    if (
      !isNonEmptyString(source.url) ||
      !source.url.startsWith("https://")
    ) {
      errors.push(
        `${sourceLocation}.url: https URLが必要です`
      );
    }
  });
}

const data = JSON.parse(
  await readFile(dataFile, "utf8")
);

if (
  !/^\d{4}-\d{2}-\d{2}$/.test(
    data.lastReviewed ?? ""
  )
) {
  errors.push(
    "lastReviewed は YYYY-MM-DD 形式にしてください"
  );
}

if (!isNonEmptyString(data.editorialNote)) {
  errors.push(
    "editorialNote は空でない文字列にしてください"
  );
}

if (
  !data.profile ||
  typeof data.profile !== "object" ||
  Array.isArray(data.profile)
) {
  errors.push("profile はオブジェクトにしてください");
} else {
  for (const field of [
    "name",
    "reading",
    "role",
    "summary",
    "activity"
  ]) {
    if (!isNonEmptyString(data.profile[field])) {
      errors.push(
        `profile.${field}: 空でない文字列が必要です`
      );
    }
  }

  if (
    !Array.isArray(data.profile.works) ||
    !data.profile.works.length ||
    data.profile.works.some(
      work => !isNonEmptyString(work)
    )
  ) {
    errors.push(
      "profile.works: 空でない文字列を1件以上指定してください"
    );
  }

  if (
    !Array.isArray(data.profile.interests) ||
    !data.profile.interests.length
  ) {
    errors.push(
      "profile.interests: 1件以上指定してください"
    );
  } else {
    data.profile.interests.forEach(
      (interest, index) => {
        const location =
          `profile.interests[${index}]`;

        for (const field of ["label", "summary"]) {
          if (!isNonEmptyString(interest?.[field])) {
            errors.push(
              `${location}.${field}: 空でない文字列が必要です`
            );
          }
        }
      }
    );
  }

  validateSources(
    data.profile.sources,
    "profile"
  );
  validateSources(
    data.profile.officialLinks,
    "profile.officialLinks"
  );
}

if (!Array.isArray(data.themes)) {
  errors.push("themes は配列にしてください");
} else {
  const themeIds = new Set();

  data.themes.forEach((theme, index) => {
    const location = `themes[${index}]`;

    for (const field of [
      "id",
      "title",
      "summary"
    ]) {
      if (!isNonEmptyString(theme?.[field])) {
        errors.push(
          `${location}.${field}: 空でない文字列が必要です`
        );
      }
    }

    if (themeIds.has(theme?.id)) {
      errors.push(
        `${location}.id: ${theme.id} が重複しています`
      );
    }
    themeIds.add(theme?.id);
    validateSources(
      theme?.sources,
      location
    );
  });
}

if (!Array.isArray(data.entries)) {
  errors.push("entries は配列にしてください");
} else {
  const entryIds = new Set();
  const sortKeys = new Set();
  let previousSortKey = -Infinity;

  data.entries.forEach((entry, index) => {
    const location = `entries[${index}]`;

    for (const field of [
      "id",
      "year",
      "dateLabel",
      "title",
      "summary"
    ]) {
      if (!isNonEmptyString(entry?.[field])) {
        errors.push(
          `${location}.${field}: 空でない文字列が必要です`
        );
      }
    }

    if (!/^H\d+$/.test(entry?.id ?? "")) {
      errors.push(
        `${location}.id: Hと数字の形式にしてください`
      );
    }

    if (entryIds.has(entry?.id)) {
      errors.push(
        `${location}.id: ${entry.id} が重複しています`
      );
    }
    entryIds.add(entry?.id);

    if (
      !Number.isInteger(entry?.sortKey) ||
      entry.sortKey <= previousSortKey
    ) {
      errors.push(
        `${location}.sortKey: 年代順の整数にしてください`
      );
    }

    if (sortKeys.has(entry?.sortKey)) {
      errors.push(
        `${location}.sortKey: ${entry.sortKey} が重複しています`
      );
    }
    sortKeys.add(entry?.sortKey);
    previousSortKey = entry?.sortKey;

    if (typeof entry?.featured !== "boolean") {
      errors.push(
        `${location}.featured: booleanが必要です`
      );
    }

    if (
      !Array.isArray(entry?.tags) ||
      !entry.tags.length
    ) {
      errors.push(
        `${location}.tags: 1件以上必要です`
      );
    } else {
      entry.tags.forEach(tag => {
        if (!allowedTags.has(tag)) {
          errors.push(
            `${location}.tags: ${JSON.stringify(tag)} は未定義です`
          );
        }
      });
    }

    validateSources(
      entry?.sources,
      location
    );
  });
}

if (errors.length) {
  console.error(
    `ナガノ先生の歩みデータに${errors.length}件の問題があります。`
  );
  errors.forEach(error =>
    console.error(`- ${error}`)
  );
  process.exitCode = 1;
} else {
  console.log(
    `ナガノ先生のプロフィール: 1件、歩み: ${data.entries.length}件、創作の軸: ${data.themes.length}件`
  );
}
