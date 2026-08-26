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
  "official-history-source.json"
);

const outputPath = path.join(
  projectRoot,
  "research",
  "official-history-candidates.json"
);

const currentDataPaths = [
  "data/official-spots.json",
  "data/official-events-archive.json"
];

const overseasTokens = [
  "TAIPEI",
  "SEOUL",
  "台北",
  "臺北",
  "台湾",
  "臺灣",
  "台中",
  "臺中",
  "高雄",
  "香港",
  "上海",
  "杭州",
  "三亚",
  "三亜",
  "韓国",
  "韩国"
];

function normalizeWhitespace(value) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim();
}

function cleanEventName(value) {
  return normalizeWhitespace(value)
    .replace(/^【(?:終了|中止)】\s*/, "")
    .replace(
      /ちいかわPOP UP STORE\s*/,
      "ちいかわPOP UP STORE "
    )
    .trim();
}

function cleanVenueText(lines) {
  return normalizeWhitespace(
    lines.slice(1).join(" ")
  )
    .replace(/にて開催！?$/u, "")
    .replace(/にて開催$/u, "")
    .trim();
}

function toIsoDate(year, month, day) {
  return [
    String(year).padStart(4, "0"),
    String(month).padStart(2, "0"),
    String(day).padStart(2, "0")
  ].join("-");
}

function parseDateRange(value) {
  const normalized = String(value || "")
    .replace(/\s+/g, "")
    .replace(/[（(][^）)]*[）)]/g, "")
    .replace(/[〜～]/g, "～");

  const match = normalized.match(
    /^(\d{4})年(\d{1,2})月(\d{1,2})日～(?:(\d{4})年)?(\d{1,2})月(\d{1,2})日/
  );

  if (!match) {
    return {
      startDate: null,
      endDate: null
    };
  }

  const startYear = Number(match[1]);
  const startMonth = Number(match[2]);
  const startDay = Number(match[3]);
  const endMonth = Number(match[5]);
  const endDay = Number(match[6]);
  const endYear = match[4]
    ? Number(match[4])
    : endMonth < startMonth
      ? startYear + 1
      : startYear;

  return {
    startDate: toIsoDate(
      startYear,
      startMonth,
      startDay
    ),
    endDate: toIsoDate(
      endYear,
      endMonth,
      endDay
    )
  };
}

function isDomesticEvent(row) {
  const searchable = normalizeWhitespace(
    [
      row.name,
      ...row.detailLines
    ].join(" ")
  ).toUpperCase();

  return !overseasTokens.some(
    token =>
      searchable.includes(
        token.toUpperCase()
      )
  );
}

function createEventKey(event) {
  return [
    event.sourceUrl,
    event.startDate,
    event.endDate,
    event.name
  ].join("|");
}

async function readJson(relativePath) {
  return JSON.parse(
    await readFile(
      path.join(projectRoot, relativePath),
      "utf8"
    )
  );
}

const snapshot = await readJson(
  "research/official-history-source.json"
);

const existingSpots = (
  await Promise.all(
    currentDataPaths.map(readJson)
  )
).flat();

const existingSourceUrls = new Set(
  existingSpots
    .map(spot => spot.sourceUrl)
    .filter(Boolean)
);

const existingKeys = new Set(
  existingSpots.map(createEventKey)
);

const candidates = snapshot.events
  .map(row => {
    const dateLine =
      row.detailLines.find(
        line => /20\d{2}年/.test(line)
      ) || "";
    const dates = parseDateRange(dateLine);
    const eventStatus =
      row.name.includes("【中止】")
        ? "cancelled"
        : "held";
    const normalized = {
      sourceType: row.sourceType,
      name: cleanEventName(row.name),
      eventStatus,
      startDate: dates.startDate,
      endDate: dates.endDate,
      venueText: cleanVenueText(
        row.detailLines
      ),
      sourceUrl: row.sourceUrl,
      sourceListUrl:
        row.sourceListUrl,
      domestic: isDomesticEvent(row)
    };

    const endedBySnapshot = Boolean(
      normalized.endDate &&
      normalized.endDate <
        snapshot.checkedAt
    );

    return {
      ...normalized,
      archiveEligible:
        normalized.domestic &&
        endedBySnapshot,
      alreadyRegistered:
        existingKeys.has(
          createEventKey(normalized)
        ) ||
        (
          Boolean(normalized.sourceUrl) &&
          existingSourceUrls.has(
            normalized.sourceUrl
          )
        ),
      needsVenueReview: true
    };
  })
  .sort((a, b) => {
    return (
      String(b.startDate).localeCompare(
        String(a.startDate)
      ) ||
      a.name.localeCompare(
        b.name,
        "ja"
      )
    );
  });

const summary = {
  sourceCount: candidates.length,
  domesticCount:
    candidates.filter(
      event => event.domestic
    ).length,
  archiveEligibleCount:
    candidates.filter(
      event => event.archiveEligible
    ).length,
  alreadyRegisteredCount:
    candidates.filter(
      event => event.alreadyRegistered
    ).length,
  unregisteredEligibleCount:
    candidates.filter(
      event =>
        event.archiveEligible &&
        !event.alreadyRegistered
    ).length,
  cancelledCount:
    candidates.filter(
      event =>
        event.archiveEligible &&
        event.eventStatus ===
          "cancelled"
    ).length
};

await writeFile(
  outputPath,
  JSON.stringify(
    {
      generatedAt:
        new Date().toISOString(),
      checkedAt: snapshot.checkedAt,
      sourceFile:
        path.relative(
          projectRoot,
          sourcePath
        ).replaceAll("\\", "/"),
      summary,
      events: candidates
    },
    null,
    2
  ) + "\n",
  "utf8"
);

console.log(
  "ちい活マップ 公式履歴候補生成"
);
console.log(
  `- 公式一覧: ${summary.sourceCount}件`
);
console.log(
  `- 国内判定: ${summary.domesticCount}件`
);
console.log(
  `- アーカイブ候補: ${summary.archiveEligibleCount}件`
);
console.log(
  `- 登録済み候補: ${summary.alreadyRegisteredCount}件`
);
console.log(
  `- 未登録候補: ${summary.unregisteredEligibleCount}件`
);
console.log(
  `- 中止: ${summary.cancelledCount}件`
);
console.log(
  "- 出力: " +
    path.relative(
      projectRoot,
      outputPath
    )
);
