import {
  readFile,
  writeFile
} from "node:fs/promises";
import { resolve } from "node:path";
import {
  createSiteMeta
} from "./lib/site-meta.mjs";

const root = process.cwd();
const writeMode =
  process.argv.includes("--write");
const checkMode =
  process.argv.includes("--check");

if (!writeMode && !checkMode) {
  console.log(
    "Use --write to update site metadata or --check to verify it."
  );
  process.exit(0);
}

function formatDateJapanese(value) {
  const [year, month, day] =
    value.split("-");
  return (
    `${year}年${Number(month)}月` +
    `${Number(day)}日`
  );
}

function replaceElementText(
  html,
  id,
  value
) {
  const pattern = new RegExp(
    `(<[^>]+id=["']${id}["'][^>]*>)[\\s\\S]*?(</[^>]+>)`
  );

  if (!pattern.test(html)) {
    throw new Error(
      `${id} がHTML内に見つかりません。`
    );
  }

  return html.replace(
    pattern,
    `$1${value}$2`
  );
}

const meta = await createSiteMeta(root);
const expectedMeta =
  JSON.stringify(meta, null, 2) + "\n";
const metaPath = resolve(
  root,
  "data/site-meta.json"
);
const indexPath = resolve(root, "index.html");
const officialPath = resolve(
  root,
  "official.html"
);
const currentIndex = await readFile(
  indexPath,
  "utf8"
);
const currentOfficial = await readFile(
  officialPath,
  "utf8"
);
const expectedIndex = replaceElementText(
  currentIndex,
  "data-as-of",
  formatDateJapanese(meta.dataAsOf)
);
const expectedOfficial = replaceElementText(
  replaceElementText(
    currentOfficial,
    "past-total-count",
    String(meta.counts.officialArchive)
  ),
  "official-data-as-of",
  formatDateJapanese(meta.dataAsOf)
);

if (writeMode) {
  await writeFile(
    metaPath,
    expectedMeta,
    "utf8"
  );
  await writeFile(
    indexPath,
    expectedIndex,
    "utf8"
  );
  await writeFile(
    officialPath,
    expectedOfficial,
    "utf8"
  );
  console.log(
    `サイト情報を更新しました（全${meta.counts.total}件、${meta.dataAsOf}時点）。`
  );
}

if (checkMode) {
  const mismatches = [];

  try {
    if (
      await readFile(metaPath, "utf8") !==
      expectedMeta
    ) {
      mismatches.push("data/site-meta.json");
    }
  } catch {
    mismatches.push("data/site-meta.json");
  }

  if (currentIndex !== expectedIndex) {
    mismatches.push("index.html");
  }

  if (currentOfficial !== expectedOfficial) {
    mismatches.push("official.html");
  }

  if (mismatches.length) {
    console.error(
      "サイト情報が古くなっています。pnpm run build:site-meta を実行してください。"
    );
    mismatches.forEach(
      file => console.error("- " + file)
    );
    process.exit(1);
  }

  console.log(
    `サイト情報を確認しました（全${meta.counts.total}件、${meta.dataAsOf}時点）。`
  );
}
