import { expect, test } from "@playwright/test";

// Fixed fixtures keep this regression independent of future listing updates.
const datedRecord = {
  id: "date-rendering-regression",
  title: "日付表示の回帰テスト",
  partner: "テスト",
  category: "experience",
  status: "upcoming",
  summary: "端末のタイムゾーンによらず掲載日付を表示します。",
  areaText: "オンライン",
  channels: ["オンライン"],
  periods: [
    { label: "予約受付", startDate: "2026-10-16", endDate: null },
    { label: "入店期間", startDate: "2026-10-23", endDate: "2026-10-25" },
    { label: "年越し", startDate: "2026-12-31", endDate: "2027-01-01" },
    { label: "単日", startDate: "2026-10-16", endDate: "2026-10-16" },
    { label: "終了日だけ", startDate: null, endDate: "2026-10-25" }
  ],
  tags: [],
  sourceUrl: "https://example.com/",
  linkedSpotIds: [],
  checkedAt: "2026-10-15"
};

const unknownRecord = {
  ...datedRecord,
  id: "unknown-date-regression",
  title: "日程未確認",
  periods: [{ label: "実施期間", startDate: null, endDate: null }],
  checkedAt: null
};

for (const timezoneId of ["Asia/Tokyo", "UTC", "America/Los_Angeles"]) {
  test.describe(`collaboration dates in ${timezoneId}`, () => {
    test.use({ timezoneId });

    test("periods and page/record checked dates preserve their calendar day", async ({ page }) => {
      await page.clock.setFixedTime(new Date("2026-10-15T03:00:00Z"));
      await page.route("**/data/collaborations-current.json", route => route.fulfill({
        contentType: "application/json",
        body: JSON.stringify([datedRecord, unknownRecord])
      }));
      await page.goto("/collaborations.html");

      expect(await page.evaluate(() => Intl.DateTimeFormat().resolvedOptions().timeZone)).toBe(timezoneId);
      const card = page.locator('[data-record-id="date-rendering-regression"]');
      await expect(card.locator(".collaboration-periods li")).toHaveText([
        "予約受付：2026/10/16〜",
        "入店期間：2026/10/23〜10/25",
        "年越し：2026/12/31〜2027/1/1",
        "単日：2026/10/16",
        "終了日だけ：〜2026/10/25"
      ]);
      await expect(card.locator(".collaboration-detail-list > div").filter({
        has: page.locator("dt", { hasText: "情報確認日" })
      }).locator("dd")).toHaveText("2026/10/15");
      await expect(page.locator("#collaboration-data-as-of")).toHaveText("2026年10月15日");

      const unknown = page.locator('[data-record-id="unknown-date-regression"]');
      await expect(unknown.locator(".collaboration-periods li")).toHaveText([
        "実施期間：日程は公式情報をご確認ください"
      ]);
      await expect(unknown.locator("dt", { hasText: "情報確認日" })).toHaveCount(0);
    });
  });
}
