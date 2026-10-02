import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const source = readFileSync(new URL("../../app.js", import.meta.url), "utf8");
const stores = JSON.parse(readFileSync(new URL("../../data/official-spots.json", import.meta.url)))
  .filter(spot => ["chiikawa-park-store-osaka", "nagano-market-umeda"].includes(spot.id));
let today = "2026-10-02";
const openStore = { id: "open-store", name: "Open", periodType: "permanent", lat: 34.7, lng: 135.5 };
const context = vm.createContext({
  getTodayInJapan: () => today,
  getDistanceMeters: () => 1,
  spotRecords: [...stores, openStore].map(spot => ({ spot }))
});
vm.runInContext(
  source.match(/function getSpotPeriodStatus[\s\S]*?(?=function parseJapanDateString)/)[0] +
  source.match(/function isCancelledEvent[\s\S]*?(?=function addDaysToDateString)/)[0] +
  source.match(/function doesSpotOverlapDateRange[\s\S]*?(?=function getDateQuickLabel)/)[0] +
  source.match(/function getNearbySpotRecords[\s\S]*?(?=function createNearbySpotsCard)/)[0], context
);

test("new permanent stores become today candidates on their explicit opening date", () => {
  assert.equal(stores.length, 2);
  for (const spot of stores) {
    assert.equal(context.doesSpotOverlapDateRange(spot, "2026-10-02", "2026-10-02"), false);
    assert.equal(context.doesSpotOverlapDateRange(spot, "2026-11-23", "2026-11-23"), false);
    assert.equal(context.doesSpotOverlapDateRange(spot, "2026-11-24", "2026-11-24"), true);
    assert.equal(context.doesSpotOverlapDateRange(spot, "2026-11-25", "2026-11-25"), true);
  }
  assert.equal(context.doesSpotOverlapDateRange(openStore, "2026-10-02", "2026-10-02"), true);
  assert.equal(context.doesSpotOverlapDateRange({ ...openStore, startDate: "2026-10-04" }, "2026-10-03", "2026-10-04"), true);
});

test("nearby suggestions omit unopened permanent stores and include them on opening day", () => {
  const origin = { id: "origin", lat: 34.7, lng: 135.5 };
  today = "2026-10-02";
  assert.deepEqual(Array.from(context.getNearbySpotRecords(origin), item => item.record.spot.id), ["open-store"]);
  today = "2026-11-24";
  const ids = Array.from(context.getNearbySpotRecords(origin), item => item.record.spot.id);
  assert.equal(ids.length, 3);
  stores.forEach(spot => assert.ok(ids.includes(spot.id)));
  today = "2026-10-02";
});
