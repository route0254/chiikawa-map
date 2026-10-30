#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { collectLinkCheckTargets, japanToday, protectedLinkUrls } from "./lib/link-check-targets.mjs";

const projectRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  ".."
);

const datasets = [
  "data/official-spots.json",
  "data/official-events-archive.json",
  "data/nagano-spots.json",
  "data/nagano-unlocated-mentions.json",
  "data/community-spots.json"
];

const standardLinkFields = [
  "hoursInfoUrl",
  "reservationUrl",
  "entryInfoUrl",
  "evidenceUrl",
  "sourceUrl"
];

const args = new Set(process.argv.slice(2));

if (args.has("--help")) {
  console.log(`ちい活マップ 外部リンク確認

使い方:
  node scripts/check-links.mjs [--include-map] [--limit=N]

オプション:
  --include-map  GoogleマップのURLも確認します
  --limit=N      対象選別後の先頭N URLだけ確認します（動作テスト用）

終了済み履歴と、終了日を過ぎた期間限定行だけのURLは取得しません。
終了日当日・終了日不明・常設・共通情報源・現行と共有するURLは維持します。

環境変数:
  LINK_CHECK_CONCURRENCY  同時接続数（既定: 6）
  LINK_CHECK_TIMEOUT_MS   1リクエストの制限時間（既定: 12000）`);
  process.exit(0);
}

function parsePositiveInteger(value, fallback) {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isInteger(parsed) && parsed > 0
    ? parsed
    : fallback;
}

const concurrency = parsePositiveInteger(
  process.env.LINK_CHECK_CONCURRENCY,
  6
);

const timeoutMs = parsePositiveInteger(
  process.env.LINK_CHECK_TIMEOUT_MS,
  12000
);

const limitArgument = [...args].find(
  argument => argument.startsWith("--limit=")
);

const limit = limitArgument
  ? parsePositiveInteger(limitArgument.split("=")[1], Infinity)
  : Infinity;

const linkFields = args.has("--include-map")
  ? [...standardLinkFields, "mapUrl"]
  : standardLinkFields;

function escapeWorkflowCommand(value) {
  return value
    .replaceAll("%", "%25")
    .replaceAll("\r", "%0D")
    .replaceAll("\n", "%0A");
}

function describeReferences(references) {
  const preview = references
    .slice(0, 3)
    .map(
      reference =>
        `${reference.spotName} (${reference.field})`
    )
    .join(" / ");

  return references.length > 3
    ? `${preview} ほか${references.length - 3}件`
    : preview;
}

async function loadOptionalJSON(file, fallback) {
  try { return JSON.parse(await readFile(path.join(projectRoot, file), "utf8")); }
  catch (error) { if (error.code === "ENOENT") return fallback; throw error; }
}

async function loadTargets() {
  const today = japanToday();
  const loaded = await Promise.all(datasets.map(async file => ({
    file, records: JSON.parse(await readFile(path.join(projectRoot, file), "utf8"))
  })));
  const sources = await loadOptionalJSON("research/official-source-ledger.json", { sources: [] });
  const candidates = await loadOptionalJSON("research/publication-candidate-ledger.json", { candidates: [] });
  const collaborations = await loadOptionalJSON("data/collaborations-current.json", []);
  const protectedUrls = protectedLinkUrls({
    sources: sources.sources, candidates: candidates.candidates, collaborations
  }, today);
  return collectLinkCheckTargets(loaded, {
    today, fields: linkFields, protectedUrls: protectedUrls.filter(url => typeof url === "string")
  });
}

async function requestUrl(url, method) {
  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    timeoutMs
  );

  try {
    const headers = {
      Accept: "text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.1",
      "User-Agent":
        "chiikatsu-map-link-check/1.0 (+https://github.com/route0254/chiikawa-map)"
    };

    if (method === "GET") {
      headers.Range = "bytes=0-0";
    }

    const response = await fetch(url, {
      method,
      headers,
      redirect: "follow",
      signal: controller.signal
    });

    if (response.body) {
      await response.body.cancel().catch(() => {});
    }

    return response;
  } finally {
    clearTimeout(timeout);
  }
}

async function checkTarget(target) {
  let headResponse = null;
  let headError = null;

  try {
    headResponse = await requestUrl(target.url, "HEAD");
  } catch (error) {
    headError = error;
  }

  if (
    headResponse &&
    headResponse.status >= 200 &&
    headResponse.status < 400
  ) {
    return classifyResponse(target, headResponse);
  }

  try {
    const getResponse = await requestUrl(target.url, "GET");
    return classifyResponse(target, getResponse);
  } catch (getError) {
    if (headResponse) {
      return classifyResponse(target, headResponse);
    }

    const error = getError ?? headError;

    return {
      kind: "warning",
      target,
      message:
        `接続できません (${error?.name || "Error"}: ` +
        `${error?.message || "不明なエラー"})`
    };
  }
}

function classifyResponse(target, response) {
  const status = response.status;
  const finalUrl = response.url || target.url;

  if (status === 404 || status === 410) {
    return { kind: "broken", target, message: "HTTP " + status };
  }

  if (status < 200 || status >= 400) {
    return {
      kind: "warning",
      target,
      message:
        `HTTP ${status}（アクセス制限または一時的な応答の可能性）`
    };
  }

  if (new URL(finalUrl).protocol === "http:") {
    return {
      kind: "warning",
      target,
      message: "HTTPSへ移行されていないHTTPリンク"
    };
  }

  if (
    new URL(target.url).protocol === "http:" &&
    new URL(finalUrl).protocol === "https:"
  ) {
    return {
      kind: "redirect",
      target,
      message: `HTTPSへ転送: ${finalUrl}`
    };
  }

  return {
    kind: "ok",
    target,
    message: `HTTP ${status}`
  };
}

async function runWithConcurrency(items, worker, count) {
  const results = new Array(items.length);
  let nextIndex = 0;

  async function runWorker() {
    while (nextIndex < items.length) {
      const index = nextIndex;
      nextIndex += 1;
      results[index] = await worker(items[index]);
    }
  }

  await Promise.all(
    Array.from(
      { length: Math.min(count, items.length) },
      runWorker
    )
  );

  return results;
}

const { targets: allTargets, summary } = await loadTargets();
const targets = allTargets.slice(0, limit);

console.log("ちい活マップ 外部リンク確認");
console.log(`- 対象URL: ${targets.length}件`);
console.log("- 終了済みのみのURLを除外: " + summary.excludedUrls + "件");
console.log("- 現行と共有するURLを維持: " + summary.sharedUrls + "件");
console.log("- 共通情報源として維持: " + summary.commonUrls + "件");
console.log(`- 同時接続数: ${concurrency}`);
console.log(`- タイムアウト: ${timeoutMs}ms`);

const results = await runWithConcurrency(
  targets,
  checkTarget,
  concurrency
);

const counts = {
  ok: 0,
  redirect: 0,
  warning: 0,
  broken: 0
};

for (const result of results) {
  counts[result.kind] += 1;

  if (result.kind === "ok") {
    continue;
  }

  const references = describeReferences(
    result.target.references
  );

  const line =
    `${result.target.url} - ${result.message} - ${references}`;

  if (result.kind === "broken") {
    console.error(`- [破損] ${line}`);
  } else if (result.kind === "warning") {
    console.warn(`- [要確認] ${line}`);
  } else {
    console.log(`- [転送] ${line}`);
  }

  if (process.env.GITHUB_ACTIONS === "true") {
    const command = result.kind === "broken"
      ? "error"
      : result.kind === "warning"
        ? "warning"
        : "notice";

    console.log(
      `::${command} title=外部リンク${result.kind === "broken" ? "破損" : "確認"}::` +
      escapeWorkflowCommand(line)
    );
  }
}

console.log("\n確認結果");
console.log(`- 正常: ${counts.ok}件`);
console.log(`- HTTPS転送: ${counts.redirect}件`);
console.log(`- 要確認: ${counts.warning}件`);
console.log(`- 破損: ${counts.broken}件`);

if (counts.broken > 0) {
  console.error(
    "\n404/410のリンクがあります。掲載データの公式URLを確認してください。"
  );
  process.exitCode = 1;
} else {
  console.log(
    "\n明確に破損しているリンクは見つかりませんでした。"
  );
}
