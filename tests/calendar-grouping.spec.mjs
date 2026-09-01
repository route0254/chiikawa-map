import {
  expect,
  test
} from "@playwright/test";
import {
  readFile
} from "node:fs/promises";
import {
  dirname,
  resolve
} from "node:path";
import {
  fileURLToPath
} from "node:url";
import calendarUtils from "../calendar-utils.js";

const root = resolve(
  dirname(fileURLToPath(import.meta.url)),
  ".."
);
const selectedDate = "2026-09-01";

test(
  "月間カレンダーを会場名ではなくイベント系列でまとめる",
  async ({ page }) => {
    const datasets = await Promise.all(
      [
        "official-spots.json",
        "official-events-archive.json",
        "nagano-spots.json"
      ].map(async file =>
        JSON.parse(
          await readFile(
            resolve(root, "data", file),
            "utf8"
          )
        )
      )
    );
    const events = datasets
      .flat()
      .filter(spot =>
        spot.periodType === "limited" &&
        spot.startDate <= selectedDate &&
        (
          !spot.endDate ||
          spot.endDate >= selectedDate
        )
      );
    const groups =
      calendarUtils.groupCalendarEvents(
        events
      );
    const expectedRows = groups
      .slice(0, 3)
      .map(
        group =>
          group.label + group.count + "件"
      );

    await page.goto(
      `/journal.html?view=calendar&date=${selectedDate}`
    );

    const selectedDay = page.locator(
      "#calendar-grid .calendar-day.is-selected"
    );
    await expect(selectedDay).toBeVisible();
    await expect(
      selectedDay.locator(
        ".calendar-day-group"
      )
    ).toHaveText(expectedRows);
    await expect(
      page.locator("#calendar-day-count")
    ).toHaveText(events.length + "件");

    if (groups.length > 3) {
      await expect(
        selectedDay.locator(
          ".calendar-day-group-more"
        )
      ).toHaveText(
        `ほか${groups.length - 3}種類`
      );
    }
  }
);
