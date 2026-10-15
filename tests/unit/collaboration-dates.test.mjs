import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import test from "node:test";

const sourcePath = fileURLToPath(new URL("../../collaborations.js", import.meta.url));

// Exercise the production functions without starting the page's DOM/fetch setup.
const probe = `
  const assert = require("node:assert/strict");
  const { readFileSync } = require("node:fs");
  const vm = require("node:vm");
  const source = readFileSync(process.argv[1], "utf8");
  const start = source.indexOf("function parseDate(value)");
  const end = source.indexOf("function getRecordSearchText(record)", start);
  assert.ok(start >= 0 && end > start, "date formatter functions must be present");
  const dates = vm.runInNewContext(source.slice(start, end) +
    "; ({ parseDate, formatDate, formatCheckedDate, formatPeriodDate })");
  console.log(JSON.stringify({
    timezone: new Intl.DateTimeFormat().resolvedOptions().timeZone,
    parsed: dates.parseDate("2026-10-16").toISOString(),
    full: dates.formatDate("2026-10-16"),
    short: dates.formatDate("2026-10-25", false),
    checked: dates.formatCheckedDate("2026-10-15"),
    periods: [
      ["2026-10-23", "2026-10-25"],
      ["2026-12-31", "2027-01-01"],
      ["2026-10-16", "2026-10-16"],
      ["2026-10-16", null],
      [null, "2026-10-25"],
      [null, null]
    ].map(([startDate, endDate]) => dates.formatPeriodDate({ startDate, endDate })),
    missing: dates.formatDate(null),
    invalid: dates.formatDate("未確認"),
    unchecked: dates.formatCheckedDate(null),
    unknown: dates.formatCheckedDate("未確認"),
    unparsed: dates.parseDate(null)
  }));
`;

for (const timezone of ["Asia/Tokyo", "UTC", "America/Los_Angeles"]) {
  test(`collaboration calendar dates stay unchanged in ${timezone}`, () => {
    const result = JSON.parse(execFileSync(process.execPath, ["-e", probe, sourcePath], {
      encoding: "utf8",
      env: { ...process.env, TZ: timezone }
    }));

    assert.deepEqual(result, {
      timezone,
      parsed: "2026-10-15T15:00:00.000Z",
      full: "2026/10/16",
      short: "10/25",
      checked: "2026年10月15日",
      periods: [
        "2026/10/23〜10/25",
        "2026/12/31〜2027/1/1",
        "2026/10/16",
        "2026/10/16〜",
        "〜2026/10/25",
        "日程は公式情報をご確認ください"
      ],
      missing: "",
      invalid: "",
      unchecked: null,
      unknown: "未確認",
      unparsed: null
    });
  });
}
