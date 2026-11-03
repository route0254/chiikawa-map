import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const read = file => readFileSync(new URL("../../" + file, import.meta.url), "utf8");
const app = read("app.js"), generator = read("scripts/build-spot-pages.mjs"), validator = read("scripts/validate-data.mjs");
const spot = { id: "unannounced", name: "設置場所", periodType: "unannounced", startDate: "2026-11-01", endDate: null };
let today = "2026-11-03";
const map = vm.createContext({ getTodayInJapan: () => today });
vm.runInContext(
  app.match(/function getSpotPeriodStatus[\s\S]*?(?=function parseJapanDateString)/)[0] +
  app.match(/function doesSpotOverlapDateRange[\s\S]*?(?=function getDateQuickLabel)/)[0] +
  app.match(/function getPeriodStatusLabel[\s\S]*?(?=function formatDate)/)[0] +
  app.match(/function getRelationTypeLabel[\s\S]*?(?=\nfunction )/)[0], map);

test("unannounced installation duration has its own status and preserves existing statuses", () => {
  assert.equal(map.getSpotPeriodStatus(spot), "unannounced");
  assert.equal(map.getPeriodStatusLabel("unannounced"), "設置期間未公表");
  assert.equal(map.getSpotPeriodStatus({ ...spot, periodType: "permanent" }), "permanent");
  assert.equal(map.getSpotPeriodStatus({ ...spot, periodType: "limited", endDate: today }), "active");
  assert.equal(map.getSpotPeriodStatus({ ...spot, periodType: "limited", endDate: "2026-11-02" }), "ended");
  assert.equal(map.getSpotPeriodStatus({ ...spot, periodType: "unknown" }), "unknown");
  assert.equal(map.getRelationTypeLabel("official", "official_facility", "unannounced"), "公式施設");
  assert.equal(map.getRelationTypeLabel("official", "official_facility", "permanent"), "公式施設・常設スポット");
});

test("known installation start bounds date candidates without inventing an end", () => {
  assert.equal(map.doesSpotOverlapDateRange(spot, "2026-10-31", "2026-10-31"), false);
  assert.equal(map.doesSpotOverlapDateRange(spot, "2026-11-01", "2026-11-01"), true);
  assert.equal(map.doesSpotOverlapDateRange(spot, today, today), true);
  today = "2026-10-31";
  assert.equal(map.getSpotPeriodStatus(spot), "upcoming");
  today = "2026-11-03";
});

const pages = vm.createContext({ siteOrigin: "https://chiikatsu-map.com" });
vm.runInContext(generator.match(/function formatDate[\s\S]*?(?=const placeTypeLabels)/)[0] +
  generator.match(/function getStatusLabel[\s\S]*?(?=function getDescription)/)[0] +
  generator.match(/function createStructuredData[\s\S]*?(?=function createPage)/)[0], pages);

test("generated duration label and Place data do not create Event fields", () => {
  assert.equal(pages.getStatusLabel(spot), "設置期間未公表");
  assert.match(pages.formatPeriod(spot), /^設置期間未公表.*2026年11月1日設置開始/);
  const data = pages.createStructuredData(spot);
  assert.equal(data["@type"], "Place");
  for (const key of ["startDate", "endDate", "eventStatus"]) assert.equal(key in data, false);
  assert.equal(pages.createStructuredData({ ...spot, periodType: "limited" })["@type"], "Event");
  assert.equal(pages.createStructuredData({ ...spot, periodType: "permanent" })["@type"], "Place");
  assert.equal(pages.formatPeriod({ ...spot, periodType: "permanent" }), "常設");
});

const errors = [], warnings = [];
const validation = vm.createContext({ dateFields: ["startDate", "endDate"], freshnessRules: {},
  isValidDateString: value => /^\d{4}-\d{2}-\d{2}$/.test(value), isNonEmptyString: value => typeof value === "string" && value.length > 0,
  addError: (_location, message) => errors.push(message), addWarning: (_location, message) => warnings.push(message), addNotice: () => {},
  getDaysSince: () => 0, confirmedOpenEndedLimitedSpotIds: new Set(), endingSoonNoticeDays: 7, today: "2026-11-03" });
vm.runInContext(validator.match(/const enumValues = [\s\S]*?(?=const relationTypes)/)[0] +
  "globalThis.acceptedPeriodTypes = enumValues.periodType;" +
  validator.match(/function validateDates[\s\S]*?(?=function validateUrls)/)[0], validation);

test("schema accepts the explicit new enum while rejecting unrelated values", () => {
  assert.equal(validation.acceptedPeriodTypes.has("unannounced"), true);
  assert.equal(validation.acceptedPeriodTypes.has("unknown"), false);
  assert.equal(validation.acceptedPeriodTypes.size, 3);
  errors.length = 0; warnings.length = 0;
  validation.validateDates(spot, "fixture");
  assert.deepEqual(errors, []);
  assert.deepEqual(warnings, []);
});

test("unannounced duration requires null end and cannot enter event archives", () => {
  errors.length = 0;
  validation.validateDates({ ...spot, endDate: "2026-12-31" }, "fixture");
  assert(errors.some(message => message.includes("endDate は null")));
  errors.length = 0;
  validation.validateArchiveStatus({ archive: true }, spot, "fixture");
  assert(errors.some(message => message.includes("期間限定スポットだけ")));
  errors.length = 0; warnings.length = 0;
  validation.validateDates({ ...spot, periodType: "limited" }, "fixture");
  assert(warnings.some(message => message.includes("endDate がありません")));
});

test("official directory classifies the new duration separately", () => {
  const source = read("official.js"), context = vm.createContext({ TODAY_IN_JAPAN: today, formatDate: value => value });
  vm.runInContext(source.match(/const CURRENT_GROUPS = \[[\s\S]*?\n\];/)[0] + "globalThis.groups = CURRENT_GROUPS;" +
    source.match(/function getPeriodStatus[\s\S]*?(?=function isEndingSoon)/)[0] +
    source.match(/function formatPeriod[\s\S]*?(?=function getEntryLabel)/)[0], context);
  assert.deepEqual(Array.from(context.groups.filter(group => group.matches({ ...spot, placeType: "shop" })), group => group.id), ["unannounced"]);
  assert.equal(context.getStatusPresentation(spot).label, "設置期間未公表");
  assert.equal(context.getPeriodStatus({ ...spot, periodType: "permanent" }), "permanent");
});

test("saved-place labels do not turn an unannounced installation into a permanent store", () => {
  const source = read("journal.js"), context = vm.createContext({ getTodayInJapan: () => today, addDays: () => "2026-11-10" });
  vm.runInContext(source.match(/function getPeriodLabel[\s\S]*?(?=function get[A-Z])/)[0] +
    source.match(/function getFavoriteStatus[\s\S]*?(?=function getFavoriteSortRank)/)[0], context);
  assert.equal(context.getPeriodLabel(spot), "設置期間未公表");
  assert.equal(context.getFavoriteStatusLabel(spot, context.getFavoriteStatus(spot)), "設置期間未公表");
  assert.equal(context.getFavoriteStatus({ ...spot, startDate: "2026-11-04" }), "upcoming");
});
