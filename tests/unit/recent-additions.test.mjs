import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import recent from "../../recent-utils.js";
import { registerAdditions, registerCollaborations } from "../../scripts/lib/added-dates.mjs";

test("NEW lasts 14 Japan calendar days; unknown, invalid and future dates stay quiet", () => {
  assert.equal(recent.isNew("2026-10-01", "2026-10-01"), true);
  assert.equal(recent.isNew("2026-10-01", "2026-10-14"), true);
  assert.equal(recent.isNew("2026-10-01", "2026-10-15"), false);
  for (const value of [null, undefined, "2026-02-30", "2026-10-02"]) {
    assert.equal(recent.isNew(value, "2026-10-01"), false);
  }
  assert.equal(recent.japanToday(new Date("2026-09-30T15:00:00Z")), "2026-10-01");
});

test("updates, archival moves and reintroductions retain original dates; historical imports stay unknown", () => {
  const existing = { old: null, known: "2026-09-20", removed: "2026-09-01" };
  const result = registerAdditions(existing, [
    { id: "old", hoursCheckedAt: "2026-10-01" }, { id: "known" },
    { id: "new", startDate: "2026-12-01" }, { id: "historical", endDate: "2020-01-01" }
  ], "2026-10-01");
  assert.deepEqual(result, { ...existing, new: "2026-10-01", historical: null });
  assert.deepEqual(registerAdditions(result, [{ id: "removed" }, { id: "new" }], "2026-10-05"), result);
  assert.deepEqual(existing, { old: null, known: "2026-09-20", removed: "2026-09-01" });
});

test("exactly the six October additions are new, independently of event dates", () => {
  const spots = JSON.parse(readFileSync(new URL("../../data/official-spots.json", import.meta.url)));
  const registry = JSON.parse(readFileSync(new URL("../../data/added-dates.json", import.meta.url)));
  const result = recent.selectRecent(spots, registry.firstAdded, "2026-10-01");
  assert.equal(result.length, 6);
  for (const fragment of ["machida", "mito", "tsudanuma", "fukuoka", "solamachi", "yokohama"]) {
    assert.equal(result.some(spot => spot.id.includes(fragment)), true);
  }
  assert.equal(recent.selectRecent([{ id: "ended", endDate: "2026-09-30" }], { ended: "2026-10-01" }, "2026-10-01").length, 0);
});

test("collaboration additions preserve first publication across updates and archival moves", () => {
  const dates = { old: null, moved: "2026-09-25" };
  const next = registerCollaborations(dates,
    [{ id: "old", checkedAt: "2026-10-03" }, { id: "new", status: "upcoming" }, { id: "cancelled", status: "cancelled" }],
    [{ id: "moved", status: "ended" }, { id: "imported", status: "past" }], "2026-10-03");
  assert.deepEqual(next, { ...dates, imported: null, new: "2026-10-03", cancelled: null });
  assert.deepEqual(registerCollaborations(next, [{ id: "moved", status: "active" }], [], "2026-10-04"), next);
  assert.equal(recent.isRecentCollaboration({ id: "moved", status: "ended" }, next, "2026-10-03"), false);
  assert.equal(recent.isRecentCollaboration({ id: "old", status: "active", checkedAt: "2026-10-03" }, next, "2026-10-03"), false);
  assert.deepEqual(registerCollaborations({}, [{ id: "historical-current", status: "needs_review", periods: [{ endDate: "2020-01-01" }] }], [], "2026-10-03"), { "historical-current": null });
  assert.equal(recent.isRecentCollaboration({ id: "new", status: "active", periods: [{ endDate: "2026-10-02" }] }, next, "2026-10-03"), false);
});

test("collaboration NEW uses verified introduction dates instead of recent checks", () => {
  const rows = JSON.parse(readFileSync(new URL("../../data/collaborations-current.json", import.meta.url)));
  const registry = JSON.parse(readFileSync(new URL("../../data/added-dates.json", import.meta.url)));
  assert.deepEqual(rows.filter(row => recent.isRecentCollaboration(row, registry.collaborationFirstAdded, "2026-10-03")).map(row => row.id).sort(),
    ["waon-point-chiikawa-line-emoji-2026", "gu-chiikawa-winter-2026", "oxiclean-chiikawa-2026", "clasic-chiikawa-scrubs-2026"].sort());
  assert.equal(registry.collaborationFirstAdded["ana-chiikawa-jet-2026"], null);
});
