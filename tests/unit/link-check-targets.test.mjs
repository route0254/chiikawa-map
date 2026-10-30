import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile, readFile, cp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { operationsQueue } from "../../scripts/lib/operations-ledgers.mjs";
import {
  collectLinkCheckTargets, japanToday, protectedLinkUrls
} from "../../scripts/lib/link-check-targets.mjs";

const fields = ["sourceUrl"];
const current = "data/official-spots.json";
const archive = "data/official-events-archive.json";
const today = "2026-10-30";
const row = (id, extra = {}) => ({ id, name: id, sourceUrl: `https://example.test/event/${id}`, ...extra });
const select = datasets => collectLinkCheckTargets(datasets, { today, fields });

test("disabled historical sources retain their records but leave periodic failure reports", () => {
  const sources = [
    { enabled: false, lastResult: "fetch_failed", lastFailure: { httpStatus: 404 } },
    { enabled: true, lastResult: "fetch_failed", lastFailure: { httpStatus: 404 } },
    { enabled: false, lastResult: "not_checked" },
    { enabled: true, lastResult: "not_checked" },
    { enabled: false, lastResult: "success" }
  ];
  const before = JSON.stringify(sources);
  assert.deepEqual(operationsQueue(sources, [], "2026-10-30T01:30:27Z").sources, {
    registered: 5, enabled: 2, withoutRecordedAttempt: 1, latestSuccess: 0, latestFailure: 1
  });
  assert.equal(JSON.stringify(sources), before);
});

test("archive-only event URLs are excluded before any requests", () => {
  const result = select([{ file: archive, records: [row("old")] }]);
  assert.equal(result.targets.length, 0);
  assert.equal(result.excluded.length, 1);
});

test("a current reference retains an archived URL including fragment-only variants", () => {
  const url = "https://example.test/event/shared";
  const result = select([
    { file: archive, records: [row("past", { sourceUrl: url + "#past" })] },
    { file: current, records: [row("future", { sourceUrl: url + "#future", periodType: "limited", endDate: "2026-11-29" })] }
  ]);
  assert.equal(result.targets.length, 1);
  assert.equal(result.targets[0].url, url + "#future");
  assert.deepEqual(result.targets[0].references.map(r => r.spotId), ["future"]);
  assert.equal(result.summary.sharedUrls, 1);
});

test("clearly ended limited rows outside the archive are excluded", () => {
  const result = select([{ file: "data/nagano-spots.json", records: [
    row("festival-2019", { periodType: "limited", endDate: "2019-01-20" })
  ] }]);
  assert.equal(result.targets.length, 0);
  assert.equal(result.summary.excludedRecords, 1);
});

test("ending today, future, permanent and uncertain dates remain in scope", () => {
  const records = [
    row("today", { periodType: "limited", endDate: today }),
    row("future", { periodType: "limited", endDate: "2026-11-29" }),
    row("permanent", { periodType: "permanent", endDate: "2019-01-20" }),
    row("unknown", { periodType: "limited", endDate: null }),
    row("invalid", { periodType: "limited", endDate: "2026-02-30" })
  ];
  assert.deepEqual(select([{ file: current, records }]).targets.map(t => t.references[0].spotId), records.map(r => r.id));
});

test("common indexes and unresolved or current collaboration sources stay protected", () => {
  const protectedUrls = protectedLinkUrls({
    sources: [{ id: "index", kind: "official_index", enabled: true, url: "https://example.test/catalog.html" }],
    candidates: [{ state: "on_hold", sourceIds: [], evidence: [{ url: "https://example.test/event/uncertain" }] }],
    collaborations: [{ officialUrl: "https://example.test/event/current-collab", periods: [
      { endDate: "2026-10-29", sourceUrl: "https://example.test/event/old-period" }
    ] }]
  }, today);
  const urls = ["https://example.test/", "https://example.test/event/", ...protectedUrls, "https://example.test/event/old-period"];
  const result = collectLinkCheckTargets([{ file: archive, records: urls.map((sourceUrl, i) => row(String(i), { sourceUrl })) }], { today, fields, protectedUrls });
  assert.equal(result.targets.length, urls.length - 1);
  assert.equal(result.excluded[0].url, "https://example.test/event/old-period");
});

test("the end-day boundary follows Japan calendar days and rejects invalid as-of dates", () => {
  assert.equal(japanToday(new Date("2026-10-29T14:59:59Z")), "2026-10-29");
  assert.equal(japanToday(new Date("2026-10-29T15:00:00Z")), "2026-10-30");
  assert.throws(() => collectLinkCheckTargets([], { today: "2026-02-30", fields }));
});

test("CLI never fetches ended-only URLs or warns about them, while current 404 remains an error", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "chiikatsu-link-scope-"));
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
  try {
    await mkdir(path.join(dir, "scripts/lib"), { recursive: true });
    await mkdir(path.join(dir, "data"));
    await cp(path.join(root, "scripts/check-links.mjs"), path.join(dir, "scripts/check-links.mjs"));
    await cp(path.join(root, "scripts/lib/link-check-targets.mjs"), path.join(dir, "scripts/lib/link-check-targets.mjs"));
    const actualToday = japanToday();
    const data = {
      "official-spots": [row("future-404", { periodType: "limited", endDate: "2999-12-31" }), row("today", { periodType: "limited", endDate: actualToday }), row("permanent", { periodType: "permanent" })],
      "official-events-archive": [row("old")],
      "nagano-spots": [row("festival", { periodType: "limited", endDate: "2019-01-20" })],
      "nagano-unlocated-mentions": [], "community-spots": []
    };
    for (const [name, records] of Object.entries(data)) await writeFile(path.join(dir, "data", name + ".json"), JSON.stringify(records));
    await writeFile(path.join(dir, "mock.mjs"), `import fs from 'node:fs'; globalThis.fetch = async (url) => { fs.appendFileSync('requests.jsonl', JSON.stringify(url) + '\\n'); return new Response(null, {status: url.includes('future-404') ? 404 : 200}); };`);
    const result = spawnSync(process.execPath, ["--import", "./mock.mjs", "scripts/check-links.mjs"], { cwd: dir, encoding: "utf8", windowsHide: true });
    assert.equal(result.status, 1);
    const output = result.stdout + result.stderr;
    assert.match(output, /future-404.*HTTP 404/);
    assert.doesNotMatch(output, /https:\/\/example\.test\/event\/(?:old|festival)/);
    const requests = (await readFile(path.join(dir, "requests.jsonl"), "utf8")).trim().split("\n").map(JSON.parse);
    assert.deepEqual(new Set(requests), new Set(data["official-spots"].map(r => r.sourceUrl)));
  } finally {
    assert(path.resolve(dir).startsWith(path.resolve(tmpdir()) + path.sep));
    await rm(dir, { recursive: true, force: true });
  }
});

test("known-case fixtures retain future Tsuchiura and exclude Hiraoka and the 2019 festival", () => {
  const datasets = [
    { file: current, records: [row("chiikawa-muchaphoto-2026-11-28-aeon-tsuchiura", {
      sourceUrl: "https://www.aeon.jp/sc/tsuchiura/event/", periodType: "limited", endDate: "2026-11-29"
    })] },
    { file: archive, records: [row("chiikawa-muchaphoto-aeon-sapporo-hiraoka-2026", {
      sourceUrl: "https://sapporohiraoka.aeonmallhokkaido.com/news/detail/2572", periodType: "limited", endDate: "2026-10-25"
    })] },
    { file: "data/nagano-spots.json", records: [row("nagano-furusato-matsuri-tokyo-2019", {
      periodType: "limited", endDate: "2019-01-20"
    })] }
  ];
  const before = JSON.stringify(datasets);
  const result = select(datasets);
  assert(result.targets.some(t => t.url === "https://www.aeon.jp/sc/tsuchiura/event/"));
  assert(result.excluded.some(t => t.references.some(r => r.spotId === "chiikawa-muchaphoto-aeon-sapporo-hiraoka-2026")));
  assert(result.excluded.some(t => t.references.some(r => r.spotId === "nagano-furusato-matsuri-tokyo-2019")));
  assert.equal(JSON.stringify(datasets), before);
});
