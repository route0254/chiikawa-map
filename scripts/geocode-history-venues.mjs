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

const seedPath = path.join(
  projectRoot,
  "research",
  "history-venue-seeds-2021-2022.json"
);

const cachePath = path.join(
  projectRoot,
  "research",
  "history-venue-geocodes.json"
);

const policyUrl =
  "https://operations.osmfoundation.org/policies/nominatim/";

const requestDelayMs = 1200;
const maximumNewRequests = 50;

function wait(milliseconds) {
  return new Promise(
    resolve =>
      setTimeout(resolve, milliseconds)
  );
}

async function readJson(filePath, fallback) {
  try {
    return JSON.parse(
      await readFile(filePath, "utf8")
    );
  } catch (error) {
    if (error?.code === "ENOENT") {
      return fallback;
    }
    throw error;
  }
}

const seeds = await readJson(
  seedPath,
  null
);

if (!seeds || !Array.isArray(seeds.venues)) {
  throw new Error(
    "会場シードJSONを読み込めませんでした。"
  );
}

const existingCache = await readJson(
  cachePath,
  {
    generatedAt: null,
    policyUrl,
    venues: []
  }
);

const cachedByKey = new Map(
  existingCache.venues.map(
    venue => [venue.key, venue]
  )
);

const missingSeeds = seeds.venues.filter(
  venue => {
    const cached =
      cachedByKey.get(venue.key);

    return (
      !Number.isFinite(venue.lat) &&
      !Number.isFinite(venue.lng) &&
      (
        !cached ||
        cached.query !== venue.query
      )
    );
  }
);

if (
  missingSeeds.length >
  maximumNewRequests
) {
  throw new Error(
    `新規問い合わせが上限${maximumNewRequests}件を超えています。`
  );
}

let requestedCount = 0;

for (const venue of missingSeeds) {
  if (requestedCount > 0) {
    await wait(requestDelayMs);
  }

  const url = new URL(
    "https://nominatim.openstreetmap.org/search"
  );
  url.searchParams.set("q", venue.query);
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("limit", "1");
  url.searchParams.set("countrycodes", "jp");
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("accept-language", "ja");

  const response = await fetch(url, {
    headers: {
      "User-Agent":
        "chiikatsu-map-research/1.0 (https://chiikatsu-map.com/)"
    }
  });

  if (!response.ok) {
    throw new Error(
      `${venue.key}: HTTP ${response.status}`
    );
  }

  const results = await response.json();
  const first = results[0] || null;

  cachedByKey.set(
    venue.key,
    {
      key: venue.key,
      query: venue.query,
      found: Boolean(first),
      lat: first
        ? Number(first.lat)
        : null,
      lng: first
        ? Number(first.lon)
        : null,
      displayName:
        first?.display_name || null,
      osmType:
        first?.osm_type || null,
      osmId:
        first?.osm_id || null,
      checkedAt:
        new Date().toISOString()
    }
  );

  requestedCount++;
  console.log(
    `- ${venue.key}: ${first ? "取得" : "候補なし"}`
  );
}

const venues = seeds.venues.map(
  venue => {
    if (
      Number.isFinite(venue.lat) &&
      Number.isFinite(venue.lng)
    ) {
      return {
        key: venue.key,
        query: venue.query,
        found: true,
        lat: venue.lat,
        lng: venue.lng,
        displayName:
          "既存のちい活マップ確認済み座標を再利用",
        osmType: null,
        osmId: null,
        checkedAt: seeds.checkedAt
      };
    }

    return cachedByKey.get(venue.key);
  }
);

await writeFile(
  cachePath,
  JSON.stringify(
    {
      generatedAt:
        new Date().toISOString(),
      policyUrl,
      requestDelayMs,
      requestedCount,
      venues
    },
    null,
    2
  ) + "\n",
  "utf8"
);

console.log(
  "ちい活マップ 会場座標候補"
);
console.log(
  `- 会場: ${venues.length}件`
);
console.log(
  `- 新規問い合わせ: ${requestedCount}件`
);
console.log(
  `- 候補なし: ${venues.filter(venue => !venue?.found).length}件`
);
console.log(
  "- 利用方針: " + policyUrl
);
