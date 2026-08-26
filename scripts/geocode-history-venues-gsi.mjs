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

const sourceUrl =
  "https://msearch.gsi.go.jp/address-search/AddressSearch";
const termsUrl =
  "https://www.gsi.go.jp/kikakuchousei/kikakuchousei40182.html";
const requestDelayMs = 750;
const maximumNewRequests = 50;

function wait(milliseconds) {
  return new Promise(
    resolve =>
      setTimeout(resolve, milliseconds)
  );
}

const seeds = JSON.parse(
  await readFile(seedPath, "utf8")
);

const cache = JSON.parse(
  await readFile(cachePath, "utf8")
);

const seedByKey = new Map(
  seeds.venues.map(
    venue => [venue.key, venue]
  )
);

const missing = cache.venues.filter(
  venue =>
    !venue.found &&
    seedByKey.has(venue.key)
);

if (
  missing.length >
  maximumNewRequests
) {
  throw new Error(
    `新規問い合わせが上限${maximumNewRequests}件を超えています。`
  );
}

let requestedCount = 0;

for (const cachedVenue of missing) {
  if (requestedCount > 0) {
    await wait(requestDelayMs);
  }

  const seed =
    seedByKey.get(cachedVenue.key);
  const url = new URL(sourceUrl);
  url.searchParams.set("q", seed.query);

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(
      `${seed.key}: HTTP ${response.status}`
    );
  }

  const results = await response.json();
  const first = results[0] || null;
  const coordinates =
    first?.geometry?.coordinates;
  const found = Boolean(
    Array.isArray(coordinates) &&
    Number.isFinite(coordinates[0]) &&
    Number.isFinite(coordinates[1])
  );

  Object.assign(
    cachedVenue,
    {
      query: seed.query,
      found,
      lat: found
        ? coordinates[1]
        : null,
      lng: found
        ? coordinates[0]
        : null,
      displayName:
        first?.properties?.title || null,
      provider: "gsi-address-search",
      sourceUrl,
      termsUrl,
      checkedAt:
        new Date().toISOString()
    }
  );

  requestedCount++;
  console.log(
    `- ${seed.key}: ${found ? "取得" : "候補なし"}`
  );
}

cache.generatedAt =
  new Date().toISOString();
cache.gsi = {
  sourceUrl,
  termsUrl,
  requestDelayMs,
  requestedCount
};

await writeFile(
  cachePath,
  JSON.stringify(cache, null, 2) +
    "\n",
  "utf8"
);

console.log(
  "ちい活マップ 国土地理院住所照合"
);
console.log(
  `- 新規問い合わせ: ${requestedCount}件`
);
console.log(
  `- 未解決: ${cache.venues.filter(venue => !venue.found).length}件`
);
console.log(
  "- 出典: 国土地理院ウェブサイト " +
    sourceUrl
);
