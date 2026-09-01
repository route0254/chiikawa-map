import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import {
  getLatestCheckedDate
} from "./data-utils.mjs";

const sourceDefinitions = [
  {
    key: "officialCurrent",
    file: "data/official-spots.json"
  },
  {
    key: "officialArchive",
    file: "data/official-events-archive.json"
  },
  {
    key: "nagano",
    file: "data/nagano-spots.json"
  }
];

export async function createSiteMeta(root) {
  const datasets = {};

  for (const source of sourceDefinitions) {
    datasets[source.key] = JSON.parse(
      await readFile(
        resolve(root, source.file),
        "utf8"
      )
    );
  }

  const specialEvents = JSON.parse(
    await readFile(
      resolve(
        root,
        "research/official-special-events-source.json"
      ),
      "utf8"
    )
  );
  const dataAsOf = getLatestCheckedDate(
    [
      ...Object.values(datasets),
      specialEvents
    ]
  );

  if (!dataAsOf) {
    throw new Error(
      "データ確認日を取得できませんでした。"
    );
  }

  const counts = Object.fromEntries(
    Object.entries(datasets).map(
      ([key, records]) => [key, records.length]
    )
  );

  return {
    dataAsOf,
    counts: {
      ...counts,
      current:
        counts.officialCurrent +
        counts.nagano,
      total:
        counts.officialCurrent +
        counts.officialArchive +
        counts.nagano
    }
  };
}
