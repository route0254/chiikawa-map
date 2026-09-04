import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

test("系列ごとの確認日と会場案内を保持し、未指定の系列は従来どおり生成する", async t => {
  const root = await mkdtemp(path.join(os.tmpdir(), "chiikatsu-special-events-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  await mkdir(path.join(root, "scripts", "lib"), { recursive: true });
  await mkdir(path.join(root, "research"));
  await mkdir(path.join(root, "data"));
  await cp(new URL("../../scripts/build-special-events.mjs", import.meta.url), path.join(root, "scripts", "build-special-events.mjs"));
  await cp(new URL("../../scripts/lib/data-utils.mjs", import.meta.url), path.join(root, "scripts", "lib", "data-utils.mjs"));

  const event = {
    id: "new-event", name: "新しい会場", startDate: "2026-09-01", endDate: "2026-09-09",
    venueName: "会場", address: "東京都新宿区", lat: 35.69, lng: 139.70,
    sourceUrl: "https://example.com/event",
    hoursText: "10:00～21:00（最終日16:00まで）", entryNote: "フリー入場です。"
  };
  const series = { key: "new", label: "POP UP SHOP", brand: "chiikawa", placeType: "shop", relationType: "popup" };
  const source = {
    checkedAt: "2026-08-29", statusAsOf: "2026-09-04",
    series: [
      { ...series, checkedAt: "2026-09-04", events: [event] },
      { ...series, key: "old", events: [{ ...event, id: "old-event", startDate: "2026-08-01", endDate: "2026-08-31" }] }
    ]
  };
  const sourcePath = path.join(root, "research", "official-special-events-source.json");
  await writeFile(sourcePath, JSON.stringify(source));
  for (const name of ["official-spots.json", "official-events-archive.json"]) {
    await writeFile(path.join(root, "data", name), "[]");
  }
  const script = path.join(root, "scripts", "build-special-events.mjs");
  execFileSync(process.execPath, [script, "--write"]);
  execFileSync(process.execPath, [script, "--check"]);
  const current = JSON.parse(await readFile(path.join(root, "data", "official-spots.json")));
  const archive = JSON.parse(await readFile(path.join(root, "data", "official-events-archive.json")));
  assert.equal(current[0].hoursCheckedAt, "2026-09-04");
  assert.equal(current[0].entryInfoCheckedAt, "2026-09-04");
  assert.equal(current[0].hoursText, event.hoursText);
  assert.equal(current[0].entryNote, event.entryNote);
  assert.equal(archive[0].hoursCheckedAt, "2026-08-29");
  assert.equal(archive[0].entryInfoCheckedAt, "2026-08-29");
  assert.equal(archive[0].hoursText, "開催時の会場営業時間に準ずる");
  assert.match(archive[0].entryNote, /終了済み/);

  delete source.series[0].checkedAt;
  delete event.hoursText;
  delete event.entryNote;
  await writeFile(sourcePath, JSON.stringify(source));
  execFileSync(process.execPath, [script, "--write"]);
  const defaults = JSON.parse(await readFile(path.join(root, "data", "official-spots.json")));
  assert.equal(defaults[0].hoursCheckedAt, "2026-08-29");
  assert.equal(defaults[0].hoursText, "会場営業時間に準ずる");
  assert.match(defaults[0].entryNote, /公式イベントページをご確認/);

  source.series[0].checkedAt = "invalid";
  await writeFile(sourcePath, JSON.stringify(source));
  assert.throws(() => execFileSync(process.execPath, [script, "--check"], { stdio: "pipe" }), /系列のcheckedAtが不正/);
});
