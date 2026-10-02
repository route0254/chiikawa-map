import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const source = readFileSync(new URL("../../app.js", import.meta.url), "utf8");
const context = vm.createContext({ getTodayInJapan: () => "2026-10-02" });
vm.runInContext(
  source.match(/function getSpotPeriodStatus[\s\S]*?(?=function parseJapanDateString)/)[0] +
  source.match(/function isCancelledEvent[\s\S]*?(?=function addDaysToDateString)/)[0], context
);
const unavailable = context.isSpotUnavailableForVisit;
const permanent = { periodType: "permanent", name: "営業中の店舗", hoursText: "10:00〜20:00" };

test("explicit closed/historical places and cancelled/ended events are not visit suggestions", () => {
  for (const label of ["閉店", "閉店済み", "営業終了", "閉業", "跡地"]) {
    assert.equal(unavailable({ ...permanent, name: `店舗（${label}）` }), true);
    assert.equal(unavailable({ ...permanent, hoursText: label }), true);
  }
  assert.equal(unavailable({ ...permanent, hoursText: "2022年8月22日閉店" }), true);
  assert.equal(unavailable({ ...permanent, eventStatus: "cancelled" }), true);
  assert.equal(unavailable({ periodType: "limited", endDate: "2026-10-01" }), true);
});

test("active, ending today, upcoming and unknown-date records retain their existing semantics", () => {
  for (const spot of [permanent, { ...permanent, hoursText: "閉店時間は20時" },
    { periodType: "limited", startDate: "2026-10-01", endDate: "2026-10-02" },
    { periodType: "limited", startDate: "2026-10-03", endDate: "2026-10-10" },
    { periodType: "limited", startDate: null, endDate: null },
    { periodType: "unknown" }]) assert.equal(unavailable(spot), false);
});

test("all seven currently explicit closed shops are excluded without editing historical data", () => {
  const spots = JSON.parse(readFileSync(new URL("../../data/nagano-spots.json", import.meta.url)));
  const closed = spots.filter(spot => /（閉店）|（営業終了）/.test(spot.name));
  assert.ok(closed.length >= 7);
  closed.forEach(spot => assert.equal(unavailable(spot), true, spot.id));
  assert.equal(unavailable(spots.find(spot => spot.id === "nagano-recipe-market-midtown")), true);
});
